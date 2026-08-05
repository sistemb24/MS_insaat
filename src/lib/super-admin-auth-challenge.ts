import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const SUPER_ADMIN_CHALLENGE_COOKIE = "noa-super-admin-challenge";
export const SUPER_ADMIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type SuperAdminChallengePurpose = "TOTP_LOGIN" | "ACCOUNT_LOCK";

export type ChallengeResult =
  | { valid: true; credentialId: string; returnTo: string | null }
  | { valid: false; reason: "missing" | "expired" | "consumed" | "attempts" | "purpose" };

type ChallengePrisma = Pick<PrismaClient, "superAdminAuthChallenge">;

function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createSuperAdminAuthChallengeRepository(prisma: ChallengePrisma) {
  return {
    async create(input: {
      credentialId: string;
      purpose: SuperAdminChallengePurpose;
      now: Date;
      returnTo?: string | null;
      maxAttempts?: number;
    }) {
      const plaintext = randomBytes(32).toString("base64url");
      await prisma.superAdminAuthChallenge.create({
        data: {
          credentialId: input.credentialId,
          purpose: input.purpose,
          tokenHash: hashSecret(plaintext),
          returnTo: input.returnTo ?? null,
          expiresAt: new Date(input.now.getTime() + SUPER_ADMIN_CHALLENGE_TTL_MS),
          maxAttempts: input.maxAttempts ?? 5,
        },
      });
      return { plaintext };
    },

    async validate(input: {
      plaintext: string | undefined;
      purpose: SuperAdminChallengePurpose;
      now: Date;
    }): Promise<ChallengeResult> {
      if (!input.plaintext) return { valid: false, reason: "missing" };
      const record = await prisma.superAdminAuthChallenge.findUnique({
        where: { tokenHash: hashSecret(input.plaintext) },
      });
      if (!record) return { valid: false, reason: "missing" };
      if (record.purpose !== input.purpose) return { valid: false, reason: "purpose" };
      if (record.consumedAt) return { valid: false, reason: "consumed" };
      if (record.expiresAt <= input.now) return { valid: false, reason: "expired" };
      if (record.attemptCount >= record.maxAttempts) return { valid: false, reason: "attempts" };
      return { valid: true, credentialId: record.credentialId, returnTo: record.returnTo };
    },

    async recordFailure(plaintext: string): Promise<void> {
      await prisma.superAdminAuthChallenge.updateMany({
        where: { tokenHash: hashSecret(plaintext), consumedAt: null },
        data: { attemptCount: { increment: 1 } },
      });
    },

    async consume(input: { plaintext: string; purpose: SuperAdminChallengePurpose; now: Date }) {
      const result = await prisma.superAdminAuthChallenge.updateMany({
        where: {
          tokenHash: hashSecret(input.plaintext),
          purpose: input.purpose,
          consumedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { consumedAt: input.now },
      });
      return result.count === 1;
    },
  };
}
