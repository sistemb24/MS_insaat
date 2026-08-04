import { createHash } from "node:crypto";
import { isIP } from "node:net";

import type { PrismaClient } from "@prisma/client";

export const TENANT_LOGIN_RATE_LIMIT_POLICY = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
} as const;

type TenantLoginRateLimitPrisma = Pick<
  PrismaClient,
  "tenantLoginRateLimitBucket"
>;

export type TenantLoginRateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

export type TenantLoginRateLimiter = {
  check(input: {
    clientAddress?: string | null;
    email: string;
    now: Date;
  }): Promise<TenantLoginRateLimitResult>;
};

export function createTenantLoginRateLimiter(
  prisma: TenantLoginRateLimitPrisma,
): TenantLoginRateLimiter {
  return {
    async check({ clientAddress, email, now }) {
      const scopes = [
        { kind: "IDENTITY", value: email.trim().toLowerCase() },
        ...(clientAddress ? [{ kind: "IP", value: clientAddress }] : []),
      ];
      const windowStartedMs =
        Math.floor(now.getTime() / TENANT_LOGIN_RATE_LIMIT_POLICY.windowMs) *
        TENANT_LOGIN_RATE_LIMIT_POLICY.windowMs;
      const windowStartedAt = new Date(windowStartedMs);
      const windowEndsAt = new Date(
        windowStartedMs + TENANT_LOGIN_RATE_LIMIT_POLICY.windowMs,
      );
      const buckets = await Promise.all(
        scopes.map(({ kind, value }) => {
          const scopeHash = digest(value);
          const id = digest(
            `${kind}:${scopeHash}:${windowStartedAt.toISOString()}`,
          );

          return prisma.tenantLoginRateLimitBucket.upsert({
            where: { id },
            create: {
              id,
              requestCount: 1,
              scopeHash,
              scopeKind: kind,
              windowEndsAt,
              windowStartedAt,
            },
            update: { requestCount: { increment: 1 } },
          });
        }),
      );
      const denied = buckets.some(
        (bucket) =>
          bucket.requestCount > TENANT_LOGIN_RATE_LIMIT_POLICY.maxAttempts,
      );

      if (denied) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((windowEndsAt.getTime() - now.getTime()) / 1000),
          ),
        };
      }

      return {
        allowed: true,
        remaining:
          TENANT_LOGIN_RATE_LIMIT_POLICY.maxAttempts -
          Math.max(...buckets.map((bucket) => bucket.requestCount)),
      };
    },
  };
}

export function resolveTenantLoginClientAddress(
  requestHeaders: Pick<Headers, "get">,
  trustProxy: boolean,
) {
  if (!trustProxy) return null;

  const forwarded = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const candidate = forwarded || requestHeaders.get("x-real-ip")?.trim();

  return candidate && isIP(candidate) ? candidate : null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
