import { describe, expect, it } from "vitest";

import { createUserScopeAccessPrismaRepository } from "./user-scope-access-prisma-repository";

describe("user scope access prisma repository", () => {
  it("lists active company/period access rows for a single user", async () => {
    const calls: unknown[] = [];
    const repository = createUserScopeAccessPrismaRepository({
      appUserScopeAccess: {
        async findMany(input) {
          calls.push(input);

          return [
            {
              id: "access-demo-viewer",
              role: "viewer",
              licenseLabel: "Pilot P0",
              isDefault: true,
              tenant: {
                id: "tenant-noa-demo",
                name: "NOA Demo Tenant",
              },
              company: {
                id: "company-demo-insaat",
                name: "DEMO İNŞAAT",
              },
              period: {
                id: "period-2026",
                label: "2026",
              },
              user: {
                id: "user-viewer",
                name: "Salt Okur",
              },
            },
          ];
        },
      },
    });

    await expect(
      repository.listActiveForUser({ userId: "user-viewer" }),
    ).resolves.toEqual([
      {
        id: "access-demo-viewer",
        tenantId: "tenant-noa-demo",
        tenantName: "NOA Demo Tenant",
        companyId: "company-demo-insaat",
        companyName: "DEMO İNŞAAT",
        periodId: "period-2026",
        periodLabel: "2026",
        userId: "user-viewer",
        userName: "Salt Okur",
        userRole: "viewer",
        licenseLabel: "Pilot P0",
        isDefault: true,
      },
    ]);
    expect(calls).toEqual([
      {
        where: {
          isActive: true,
          userId: "user-viewer",
        },
        include: {
          company: true,
          period: true,
          tenant: true,
          user: true,
        },
        orderBy: [
          { isDefault: "desc" },
          { company: { name: "asc" } },
          { period: { label: "desc" } },
        ],
      },
    ]);
  });

  it("normalizes unexpected roles to viewer", async () => {
    const repository = createUserScopeAccessPrismaRepository({
      appUserScopeAccess: {
        async findMany() {
          return [
            {
              id: "access-legacy",
              role: "legacy-role",
              licenseLabel: "Pilot P0",
              isDefault: false,
              tenant: {
                id: "tenant-noa-demo",
                name: "NOA Demo Tenant",
              },
              company: {
                id: "company-demo-insaat",
                name: "DEMO İNŞAAT",
              },
              period: {
                id: "period-2026",
                label: "2026",
              },
              user: {
                id: "user-viewer",
                name: "Salt Okur",
              },
            },
          ];
        },
      },
    });

    await expect(
      repository.listActiveForUser({ userId: "user-viewer" }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "access-legacy",
        userRole: "viewer",
      }),
    ]);
  });
});
