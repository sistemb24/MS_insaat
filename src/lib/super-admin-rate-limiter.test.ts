import { describe, expect, it, vi } from "vitest";
import { createSuperAdminRateLimiter } from "./super-admin-rate-limiter";

describe("Prisma-backed SuperAdmin rate limiter", () => {
  it("fixed window sayacını DB upsert ile atomik artırır", async () => {
    const counts = new Map<string, number>();
    const upsert = vi.fn(async ({ where, create }: { where: { id: string }; create: { windowEndsAt: Date } }) => {
      const requestCount = (counts.get(where.id) ?? 0) + 1;
      counts.set(where.id, requestCount);
      return { requestCount, windowEndsAt: create.windowEndsAt };
    });
    const limiter = createSuperAdminRateLimiter({ superAdminRateLimitBucket: { upsert } } as never);
    const now = new Date("2026-08-03T10:00:00.000Z");
    for (let index = 0; index < 5; index++) {
      await expect(limiter.checkPasswordReset({ ipAddress: "203.0.113.4", now })).resolves.toMatchObject({ allowed: true });
    }
    await expect(limiter.checkPasswordReset({ ipAddress: "203.0.113.4", now })).resolves.toMatchObject({ allowed: false });
    expect(upsert).toHaveBeenCalledTimes(6);
  });
});
