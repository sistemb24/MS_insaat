import { describe, expect, it } from "vitest";

import { seedDemoAppSessions } from "./session-seed";

const demoSessionIds = [
  "demo-accounting",
  "demo-viewer",
  "demo-ahmet",
  "demo-ayse",
  "demo-mehmet",
  "demo-akdeniz-admin",
  "demo-akdeniz-muhasebe",
  "demo-akdeniz-saha",
  "demo-anadolu-admin",
  "demo-anadolu-muhasebe",
  "demo-anadolu-saha",
];

describe("session seed", () => {
  it("upserts all demo app sessions", async () => {
    const calls: unknown[] = [];

    const result = await seedDemoAppSessions({
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      prisma: {
        appSession: {
          async upsert(input) {
            calls.push(input);
          },
        },
      },
    });

    expect(result).toEqual({
      seeded: demoSessionIds.length,
      sessionIds: demoSessionIds,
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          where: { id: "demo-accounting" },
          create: expect.objectContaining({
            id: "demo-accounting",
            userId: "user-main",
            role: "accounting",
          }),
        }),
        expect.objectContaining({
          where: { id: "demo-viewer" },
          create: expect.objectContaining({
            id: "demo-viewer",
            userId: "user-viewer",
            role: "viewer",
          }),
        }),
        expect.objectContaining({
          where: { id: "demo-ahmet" },
          create: expect.objectContaining({
            id: "demo-ahmet",
            userId: "user-ahmet",
            role: "admin",
          }),
        }),
      ]),
    );
    expect(calls).toHaveLength(demoSessionIds.length);
  });
});
