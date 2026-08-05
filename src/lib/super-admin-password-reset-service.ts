import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { createPasswordHash } from "./password-hash";

const RESET_TOKEN_DURATION_MS = 30 * 60 * 1000;
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export type PasswordResetDelivery = {
  deliver(input: { email: string; token: string; expiresAt: Date }): Promise<void>;
};

export type ResetTokenValidateResult =
  | { valid: true; credentialId: string }
  | { valid: false; reason: "not_found" | "expired" | "already_used" };

class ResetRaceError extends Error {}

export function createSuperAdminPasswordResetService(
  prisma: PrismaClient,
  delivery?: PasswordResetDelivery,
) {
  return {
    async requestReset(input: { email: string; now: Date }): Promise<{ status: "accepted" | "unavailable" }> {
      // No adapter means no token is generated or persisted.
      if (!delivery) return { status: "unavailable" };
      const email = input.email.trim().toLowerCase();
      const credential = await prisma.superAdminCredential.findUnique({ where: { email } });
      // Same response for an unknown email prevents account enumeration.
      if (!credential) return { status: "accepted" };
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(input.now.getTime() + RESET_TOKEN_DURATION_MS);
      await prisma.superAdminPasswordResetToken.create({
        data: { credentialId: credential.id, tokenHash: hashToken(token), expiresAt, createdAt: input.now },
      });
      await delivery.deliver({ email, token, expiresAt });
      return { status: "accepted" };
    },

    async validateToken(input: { tokenPlaintext: string; now: Date }): Promise<ResetTokenValidateResult> {
      const record = await prisma.superAdminPasswordResetToken.findUnique({
        where: { tokenHash: hashToken(input.tokenPlaintext) },
      });
      if (!record) return { valid: false, reason: "not_found" };
      if (record.usedAt) return { valid: false, reason: "already_used" };
      if (record.expiresAt <= input.now) return { valid: false, reason: "expired" };
      return { valid: true, credentialId: record.credentialId };
    },

    async applyReset(input: { tokenPlaintext: string; newPassword: string; now: Date }): Promise<{ ok: boolean }> {
      const tokenHash = hashToken(input.tokenPlaintext);
      try {
        await prisma.$transaction(async (tx) => {
          const token = await tx.superAdminPasswordResetToken.findUnique({ where: { tokenHash } });
          if (!token || token.usedAt || token.expiresAt <= input.now) throw new ResetRaceError();
          const consumed = await tx.superAdminPasswordResetToken.updateMany({
            where: { id: token.id, usedAt: null, expiresAt: { gt: input.now } },
            data: { usedAt: input.now },
          });
          if (consumed.count !== 1) throw new ResetRaceError();
          await tx.superAdminCredential.update({
            where: { id: token.credentialId },
            data: { passwordHash: createPasswordHash(input.newPassword) },
          });
          await tx.superAdminSession.deleteMany({ where: { credentialId: token.credentialId } });
        });
        return { ok: true };
      } catch (error) {
        if (error instanceof ResetRaceError) return { ok: false };
        throw error;
      }
    },
  };
}

/** Process-local fake for tests; never logs delivered secrets. */
export function createPasswordResetDeliveryFake() {
  const deliveries: Array<{ email: string; token: string; expiresAt: Date }> = [];
  return {
    deliveries,
    async deliver(input: { email: string; token: string; expiresAt: Date }) {
      deliveries.push(input);
    },
  } satisfies PasswordResetDelivery & { deliveries: typeof deliveries };
}
