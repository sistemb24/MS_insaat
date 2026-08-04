import { describe, expect, it, vi } from "vitest";

import {
  createTenantLoginRateLimiter,
  resolveTenantLoginClientAddress,
} from "./tenant-login-rate-limiter";

describe("tenant login rate limiter", () => {
  it("atomically limits both hashed identity and trusted client address", async () => {
    const counts = new Map<string, number>();
    const upsert = vi.fn(
      async ({ where }: { where: { id: string } }) => {
        const requestCount = (counts.get(where.id) ?? 0) + 1;
        counts.set(where.id, requestCount);
        return { requestCount };
      },
    );
    const limiter = createTenantLoginRateLimiter({
      tenantLoginRateLimitBucket: { upsert },
    } as never);
    const input = {
      clientAddress: "203.0.113.10",
      email: "user@example.com",
      now: new Date("2026-08-04T10:00:00.000Z"),
    };

    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(limiter.check(input)).resolves.toMatchObject({ allowed: true });
    }
    await expect(limiter.check(input)).resolves.toMatchObject({ allowed: false });
    expect(upsert).toHaveBeenCalledTimes(12);
    expect(JSON.stringify(upsert.mock.calls)).not.toContain(input.email);
    expect(JSON.stringify(upsert.mock.calls)).not.toContain(input.clientAddress);
  });

  it("only trusts a syntactically valid proxy address when explicitly enabled", () => {
    const requestHeaders = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.2",
    });

    expect(resolveTenantLoginClientAddress(requestHeaders, false)).toBeNull();
    expect(resolveTenantLoginClientAddress(requestHeaders, true)).toBe(
      "203.0.113.10",
    );
    expect(
      resolveTenantLoginClientAddress(
        new Headers({ "x-forwarded-for": "not-an-ip" }),
        true,
      ),
    ).toBeNull();
  });
});
