import { describe, expect, it, vi } from "vitest";

import {
  createSuperAdminPlatformReadModel,
  maskEmail,
  redactSensitiveText,
} from "./super-admin-platform-read-model";

describe("super admin platform read model", () => {
  it("uses bounded pagination and explicit tenant selects", async () => {
    const findMany = vi.fn(async (input: unknown) => {
      void input;
      return [{
        _count: { companies: 1, legalHolds: 1, sessions: 2, tenantSubscriptions: 1, users: 3 },
        companies: [{ name: "NOA İnşaat" }],
        createdAt: new Date("2026-08-04T00:00:00.000Z"),
        frozenAt: new Date("2026-08-09T12:00:00.000Z"),
        id: "tenant-1",
        lifecycleStatus: "FROZEN",
        lifecycleVersion: 2,
        name: "NOA",
      }];
    });
    const readModel = createSuperAdminPlatformReadModel({
      tenant: { count: vi.fn(async () => 26), findMany },
    } as never);

    const result = await readModel.listTenants({
      page: "2",
      query: "NOA",
      sort: "name-asc",
    });

    expect(result).toMatchObject({ page: 2, pageSize: 25, total: 26, totalPages: 2 });
    expect(result.rows[0]).toMatchObject({
      activeLegalHoldCount: 1,
      lifecycleStatus: "FROZEN",
      lifecycleVersion: 2,
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25, select: expect.any(Object) }),
    );
    expect(findMany.mock.calls[0]?.[0]).not.toHaveProperty("include");
  });

  it("measures database health and leaves external monitoring unavailable", async () => {
    const readModel = createSuperAdminPlatformReadModel({
      $queryRawUnsafe: vi.fn(async () => [{ connected: 1 }]),
    } as never);

    await expect(readModel.getHealth()).resolves.toMatchObject({
      application: { status: "available" },
      database: { status: "available" },
      externalMonitoring: { status: "unavailable" },
    });
  });

  it("minimizes email and IP values in platform DTOs", () => {
    expect(maskEmail("person@example.com")).toBe("p***@example.com");
    expect(
      redactSensitiveText("person@example.com 203.0.113.9 güncellendi"),
    ).toBe("[e-posta gizlendi] [IP gizlendi] güncellendi");
  });
});
