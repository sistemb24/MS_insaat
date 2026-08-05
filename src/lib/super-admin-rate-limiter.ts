import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };
export type SuperAdminRateLimitPurpose = "PASSWORD_RESET" | "OTP_RESEND" | "SECOND_FACTOR_VERIFY";
type RateLimitPrisma = Pick<PrismaClient, "superAdminRateLimitBucket">;

const LIMITS: Record<SuperAdminRateLimitPurpose, { max: number; windowMs: number }> = {
  PASSWORD_RESET: { max: 5, windowMs: 15 * 60 * 1000 },
  OTP_RESEND: { max: 3, windowMs: 10 * 60 * 1000 },
  SECOND_FACTOR_VERIFY: { max: 5, windowMs: 10 * 60 * 1000 },
};

const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export function createSuperAdminRateLimiter(prisma: RateLimitPrisma) {
  async function check(input: { purpose: SuperAdminRateLimitPurpose; scope: string; now: Date }): Promise<RateLimitResult> {
    const config = LIMITS[input.purpose];
    const windowStartedMs = Math.floor(input.now.getTime() / config.windowMs) * config.windowMs;
    const windowStartedAt = new Date(windowStartedMs);
    const windowEndsAt = new Date(windowStartedMs + config.windowMs);
    const scopeHash = digest(input.scope);
    const id = digest(`${input.purpose}:${scopeHash}:${windowStartedAt.toISOString()}`);
    const bucket = await prisma.superAdminRateLimitBucket.upsert({
      where: { id },
      create: { id, purpose: input.purpose, scopeHash, windowStartedAt, windowEndsAt, requestCount: 1 },
      update: { requestCount: { increment: 1 } },
    });
    if (bucket.requestCount > config.max) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowEndsAt.getTime() - input.now.getTime()) / 1000)) };
    }
    return { allowed: true, remaining: config.max - bucket.requestCount };
  }
  return {
    check,
    checkPasswordReset: (input: { ipAddress: string; now: Date }) => check({ purpose: "PASSWORD_RESET", scope: input.ipAddress, now: input.now }),
    checkOtpResend: (input: { sessionIdentifier: string; now: Date }) => check({ purpose: "OTP_RESEND", scope: input.sessionIdentifier, now: input.now }),
  };
}

/** Unit-test-only fake; production code must use the Prisma-backed limiter. */
export function createInMemorySuperAdminRateLimiterForTests() {
  const counters = new Map<string, number>();
  return {
    async checkPasswordReset(input: { ipAddress: string; now: Date }): Promise<RateLimitResult> {
      const key = `${input.ipAddress}:${Math.floor(input.now.getTime() / LIMITS.PASSWORD_RESET.windowMs)}`;
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      return count <= LIMITS.PASSWORD_RESET.max
        ? { allowed: true, remaining: LIMITS.PASSWORD_RESET.max - count }
        : { allowed: false, retryAfterSeconds: 1 };
    },
  };
}
