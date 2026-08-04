import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const ENROLLMENT_TTL_MS = 10 * 60 * 1000;
const KEY_VERSION = "v1";

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "", bits = 0, value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { result += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes: number[] = [];
  let bits = 0, value = 0;
  for (const char of encoded.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

function totp(secret: string, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1]! & 15;
  const number = ((hmac[offset]! & 127) << 24) | (hmac[offset + 1]! << 16) | (hmac[offset + 2]! << 8) | hmac[offset + 3]!;
  return String(number % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

const hashBackupCode = (value: string) => createHash("sha256").update(value.trim().toUpperCase()).digest("hex");

function parseKey(value: string | undefined): Buffer | null {
  if (!value) return null;
  const key = Buffer.from(value, "base64");
  return key.length === 32 ? key : null;
}

function encrypt(secret: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [KEY_VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(":");
}

function decrypt(ciphertext: string, key: Buffer): string | null {
  const [version, iv, tag, data] = ciphertext.split(":");
  if (version !== KEY_VERSION || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch { return null; }
}

function codesEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected), b = Buffer.from(actual.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createSuperAdminTotpService(prisma: PrismaClient, encryptionKey = process.env.SUPER_ADMIN_TOTP_ENCRYPTION_KEY) {
  const key = parseKey(encryptionKey);

  async function readSecret(credentialId: string, now: Date, requireVerified: boolean): Promise<string | null> {
    if (!key) return null;
    const record = await prisma.superAdminTotpSecret.findUnique({ where: { credentialId } });
    if (!record?.secretCiphertext || record.secretKeyVersion !== KEY_VERSION) return null;
    if (requireVerified && !record.verifiedAt) return null;
    if (!requireVerified && (!record.enrollmentExpiresAt || record.enrollmentExpiresAt <= now)) return null;
    return decrypt(record.secretCiphertext, key);
  }

  return {
    isAvailable: Boolean(key),

    async beginEnrollment(input: { credentialId: string; now: Date }) {
      if (!key) return { available: false as const };
      const credential = await prisma.superAdminCredential.findUnique({ where: { id: input.credentialId } });
      if (!credential) return { available: false as const };
      const secret = base32Encode(randomBytes(20));
      const issuer = encodeURIComponent("NOA İnşaat");
      const label = encodeURIComponent(credential.email);
      const expiresAt = new Date(input.now.getTime() + ENROLLMENT_TTL_MS);
      await prisma.superAdminTotpSecret.upsert({
        where: { credentialId: input.credentialId },
        create: { credentialId: input.credentialId, secretCiphertext: encrypt(secret, key), secretKeyVersion: KEY_VERSION, secretBase32: null, backupCodes: [], enrollmentExpiresAt: expiresAt },
        update: { secretCiphertext: encrypt(secret, key), secretKeyVersion: KEY_VERSION, secretBase32: null, backupCodes: [], enrollmentExpiresAt: expiresAt, verifiedAt: null },
      });
      return { available: true as const, secretBase32: secret, otpauthUrl: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`, expiresAt };
    },

    async activateEnrollment(input: { credentialId: string; code: string; now: Date }) {
      const secret = await readSecret(input.credentialId, input.now, false);
      if (!secret) return { ok: false as const };
      const counter = Math.floor(input.now.getTime() / 1000 / TOTP_STEP_SECONDS);
      if (![-1, 0, 1].some((delta) => codesEqual(totp(secret, counter + delta), input.code))) return { ok: false as const };
      const plaintextCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => randomBytes(BACKUP_CODE_LENGTH).toString("hex").slice(0, BACKUP_CODE_LENGTH).toUpperCase());
      await prisma.$transaction([
        prisma.superAdminTotpSecret.update({ where: { credentialId: input.credentialId }, data: { verifiedAt: input.now, enrollmentExpiresAt: null, backupCodes: plaintextCodes.map(hashBackupCode) } }),
        prisma.superAdminCredential.update({ where: { id: input.credentialId }, data: { is2FAEnabled: true } }),
      ]);
      return { ok: true as const, backupCodes: plaintextCodes };
    },

    async verifyCode(input: { credentialId: string; code: string; now: Date; windowSize?: number }) {
      const secret = await readSecret(input.credentialId, input.now, true);
      if (!secret) return false;
      const counter = Math.floor(input.now.getTime() / 1000 / TOTP_STEP_SECONDS);
      const windowSize = input.windowSize ?? 1;
      return Array.from({ length: windowSize * 2 + 1 }, (_, index) => index - windowSize)
        .some((delta) => codesEqual(totp(secret, counter + delta), input.code));
    },

    async verifyBackupCode(input: { credentialId: string; inputCode: string }) {
      const wanted = hashBackupCode(input.inputCode);
      return prisma.$transaction(async (tx) => {
        const record = await tx.superAdminTotpSecret.findUnique({ where: { credentialId: input.credentialId } });
        if (!record?.verifiedAt || !record.backupCodes.includes(wanted)) return false;
        await tx.superAdminTotpSecret.update({ where: { credentialId: input.credentialId }, data: { backupCodes: record.backupCodes.filter((code) => code !== wanted) } });
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    },
  };
}
