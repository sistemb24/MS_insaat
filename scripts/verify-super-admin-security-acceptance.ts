import "dotenv/config";

import { createHash } from "node:crypto";
import { createPasswordHash } from "../src/lib/password-hash";
import { prisma } from "../src/lib/prisma";
import { createSuperAdminAuthChallengeRepository } from "../src/lib/super-admin-auth-challenge";
import { createSuperAdminPasswordResetService } from "../src/lib/super-admin-password-reset-service";
import { createSuperAdminRateLimiter } from "../src/lib/super-admin-rate-limiter";
import { createSuperAdminTotpService } from "../src/lib/super-admin-totp-service";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

async function main() {
  const tenantBefore = await tenantCounts();
  let credential = await prisma.superAdminCredential.findFirst();
  let createdCredential = false;
  const challengeIds: string[] = [];
  const rateBucketIds: string[] = [];

  try {
    if (!credential) {
      credential = await prisma.superAdminCredential.create({
        data: { singletonKey: "platform", email: "f34-acceptance@noa.test", name: "F34 Kabul", passwordHash: createPasswordHash("F34-Kabul-Guv3nli!") },
      });
      createdCredential = true;
    }

    const challenges = createSuperAdminAuthChallengeRepository(prisma);
    const now = new Date();
    const created = await challenges.create({ credentialId: credential.id, purpose: "TOTP_LOGIN", now });
    const challengeRecord = await prisma.superAdminAuthChallenge.findUnique({ where: { tokenHash: digest(created.plaintext) } });
    assert(challengeRecord && challengeRecord.tokenHash !== created.plaintext, "Challenge plaintext DB'de saklanmamalıdır.");
    challengeIds.push(challengeRecord.id);
    assert((await challenges.validate({ plaintext: created.plaintext, purpose: "ACCOUNT_LOCK", now })).valid === false, "Yanlış challenge amacı reddedilmelidir.");
    assert(await challenges.consume({ plaintext: created.plaintext, purpose: "TOTP_LOGIN", now }), "İlk challenge tüketimi kabul edilmelidir.");
    assert(!(await challenges.consume({ plaintext: created.plaintext, purpose: "TOTP_LOGIN", now })), "Challenge replay reddedilmelidir.");

    const expired = await challenges.create({ credentialId: credential.id, purpose: "TOTP_LOGIN", now: new Date(now.getTime() - 10 * 60_000) });
    const expiredRecord = await prisma.superAdminAuthChallenge.findUnique({ where: { tokenHash: digest(expired.plaintext) } });
    if (expiredRecord) challengeIds.push(expiredRecord.id);
    const expiryResult = await challenges.validate({ plaintext: expired.plaintext, purpose: "TOTP_LOGIN", now });
    assert(!expiryResult.valid && expiryResult.reason === "expired", "Süresi dolmuş challenge reddedilmelidir.");

    const resetCount = await prisma.superAdminPasswordResetToken.count({ where: { credentialId: credential.id } });
    const reset = createSuperAdminPasswordResetService(prisma);
    assert((await reset.requestReset({ email: credential.email, now })).status === "unavailable", "Adapter yokken reset unavailable olmalıdır.");
    assert((await prisma.superAdminPasswordResetToken.count({ where: { credentialId: credential.id } })) === resetCount, "Adapter yokken token üretilmemelidir.");

    const totpCount = await prisma.superAdminTotpSecret.count({ where: { credentialId: credential.id } });
    const totp = createSuperAdminTotpService(prisma, "invalid-key");
    assert(!(await totp.beginEnrollment({ credentialId: credential.id, now })).available, "Geçerli crypto key olmadan TOTP fail-closed kalmalıdır.");
    assert((await prisma.superAdminTotpSecret.count({ where: { credentialId: credential.id } })) === totpCount, "Crypto key yokken TOTP secret yazılmamalıdır.");

    const scope = `f34-${crypto.randomUUID()}`;
    const limiter = createSuperAdminRateLimiter(prisma);
    for (let index = 0; index < 5; index++) assert((await limiter.checkPasswordReset({ ipAddress: scope, now })).allowed, "İlk beş istek kabul edilmelidir.");
    assert(!(await limiter.checkPasswordReset({ ipAddress: scope, now })).allowed, "Altıncı istek DB rate-limit ile reddedilmelidir.");
    const scopeHash = digest(scope);
    const buckets = await prisma.superAdminRateLimitBucket.findMany({ where: { purpose: "PASSWORD_RESET", scopeHash } });
    rateBucketIds.push(...buckets.map((bucket) => bucket.id));

    assert(JSON.stringify(await tenantCounts()) === JSON.stringify(tenantBefore), "Tenant verileri değişmemelidir.");
    console.log(JSON.stringify({ challengeExpiry: true, challengeReplay: true, dbRateLimit: true, deliveryFailClosed: true, secretPersistence: "hashed/encrypted only", status: "PASS", tenantIsolation: true, totpFailClosed: true }, null, 2));
  } finally {
    if (challengeIds.length) await prisma.superAdminAuthChallenge.deleteMany({ where: { id: { in: challengeIds } } });
    if (rateBucketIds.length) await prisma.superAdminRateLimitBucket.deleteMany({ where: { id: { in: rateBucketIds } } });
    if (createdCredential && credential) await prisma.superAdminCredential.deleteMany({ where: { id: credential.id } });
    await prisma.$disconnect();
  }
}

async function tenantCounts() {
  const [credentials, sessions, documents, ledgerEntries] = await Promise.all([
    prisma.appCredential.count(), prisma.appSession.count(), prisma.documentFile.count(), prisma.ledgerEntry.count(),
  ]);
  return { credentials, documents, ledgerEntries, sessions };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Faz 34 kabulü başarısız."); process.exitCode = 1; });
