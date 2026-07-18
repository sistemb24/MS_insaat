import { describe, expect, it } from "vitest";

import { seedDemoUserScopeAccesses } from "./user-scope-access-seed";

const demoAccessIds = [
  "access-demo-accounting",
  "access-demo-viewer",
  "access-demo-ahmet",
  "access-demo-ayse",
  "access-demo-mehmet",
  "access-demo-akdeniz-admin",
  "access-demo-akdeniz-muhasebe",
  "access-demo-akdeniz-saha",
  "access-demo-anadolu-admin",
  "access-demo-anadolu-muhasebe",
  "access-demo-anadolu-saha",
];

describe("user scope access seed", () => {
  it("upserts demo company/period access rows for all seeded users", async () => {
    const calls: unknown[] = [];

    const result = await seedDemoUserScopeAccesses({
      prisma: {
        appUserScopeAccess: {
          async upsert(input) {
            calls.push(input);
          },
        },
      },
    });

    expect(result).toEqual({
      accessIds: demoAccessIds,
      seeded: demoAccessIds.length,
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          where: { id: "access-demo-accounting" },
          create: expect.objectContaining({
            id: "access-demo-accounting",
            userId: "user-main",
            role: "accounting",
            isDefault: true,
            isActive: true,
          }),
        }),
        expect.objectContaining({
          where: { id: "access-demo-viewer" },
          create: expect.objectContaining({
            id: "access-demo-viewer",
            userId: "user-viewer",
            role: "viewer",
            isDefault: true,
            isActive: true,
          }),
        }),
        expect.objectContaining({
          where: { id: "access-demo-ahmet" },
          create: expect.objectContaining({
            id: "access-demo-ahmet",
            userId: "user-ahmet",
            role: "admin",
            isDefault: true,
            isActive: true,
          }),
        }),
      ]),
    );
    expect(calls).toHaveLength(demoAccessIds.length);
  });
});
