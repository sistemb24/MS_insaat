import { describe, expect, it } from "vitest";

import { createSessionScopePrismaRepository } from "./session-scope-prisma-repository";

describe("session scope prisma repository", () => {
  it("loads an active session with tenant, company, period, and user context", async () => {
    const calls: unknown[] = [];
    const repository = createSessionScopePrismaRepository({
      appSession: {
        async findUnique(input) {
          calls.push(input);

          return {
            id: "demo-viewer",
            role: "viewer",
            licenseLabel: "Pilot P0",
            expiresAt: new Date("2030-01-01T00:00:00.000Z"),
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
          };
        },
        async findMany() {
          return [];
        },
      },
    });

    await expect(repository.findById("demo-viewer")).resolves.toEqual({
      id: "demo-viewer",
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
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    expect(calls).toEqual([
      {
        where: { id: "demo-viewer" },
        include: {
          company: true,
          period: true,
          tenant: true,
          user: true,
        },
      },
    ]);
  });

  it("returns null for an unknown session", async () => {
    const repository = createSessionScopePrismaRepository({
      appSession: {
        async findUnique() {
          return null;
        },
        async findMany() {
          return [];
        },
      },
    });

    await expect(repository.findById("missing-session")).resolves.toBeNull();
  });

  it("lists active session options ordered by user name", async () => {
    const calls: unknown[] = [];
    const repository = createSessionScopePrismaRepository({
      appSession: {
        async findUnique() {
          return null;
        },
        async findMany(input) {
          calls.push(input);

          return [
            {
              id: "demo-accounting",
              role: "accounting",
              licenseLabel: "Pilot P0",
              expiresAt: null,
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
                id: "user-main",
                name: "Ana Kullanıcı",
              },
            },
          ];
        },
      },
    });

    const listActive = repository.listActive;

    expect(listActive).toBeDefined();
    await expect(
      listActive!({
        now: new Date("2026-06-25T00:00:00.000Z"),
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "demo-accounting",
        userName: "Ana Kullanıcı",
        userRole: "accounting",
        companyName: "DEMO İNŞAAT",
        periodLabel: "2026",
      }),
    ]);
    expect(calls).toEqual([
      {
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date("2026-06-25T00:00:00.000Z") } },
          ],
        },
        include: {
          company: true,
          period: true,
          tenant: true,
          user: true,
        },
        orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
      },
    ]);
  });

  it("lists active session options for a single user", async () => {
    const calls: unknown[] = [];
    const repository = createSessionScopePrismaRepository({
      appSession: {
        async findUnique() {
          return null;
        },
        async findMany(input) {
          calls.push(input);

          return [
            {
              id: "demo-viewer",
              role: "viewer",
              licenseLabel: "Pilot P0",
              expiresAt: null,
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

    const listActiveForUser = repository.listActiveForUser;

    expect(listActiveForUser).toBeDefined();
    await expect(
      listActiveForUser!({
        now: new Date("2026-06-25T00:00:00.000Z"),
        userId: "user-viewer",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "demo-viewer",
        userId: "user-viewer",
        userName: "Salt Okur",
        userRole: "viewer",
      }),
    ]);
    expect(calls).toEqual([
      {
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date("2026-06-25T00:00:00.000Z") } },
          ],
          userId: "user-viewer",
        },
        include: {
          company: true,
          period: true,
          tenant: true,
          user: true,
        },
        orderBy: [{ company: { name: "asc" } }, { period: { label: "desc" } }],
      },
    ]);
  });
});
