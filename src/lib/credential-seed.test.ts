import { describe, expect, it } from "vitest";

import { seedDemoCredentials } from "./credential-seed";

const demoCredentialEmails = [
  "muhasebe@noa.local",
  "viewer@noa.local",
  "ahmet.yilmaz@noa.local",
  "ayse.demir@noa.local",
  "mehmet.kaya@noa.local",
  "admin@akdeniz-insaat.local",
  "muhasebe@akdeniz-insaat.local",
  "saha@akdeniz-insaat.local",
  "admin@anadolu-yapi.local",
  "muhasebe@anadolu-yapi.local",
  "saha@anadolu-yapi.local",
];

describe("credential seed", () => {
  it("upserts demo credentials for seeded sessions", async () => {
    const calls: unknown[] = [];

    const result = await seedDemoCredentials({
      hashOptions: {
        iterations: 1000,
        saltPrefix: "test",
      },
      prisma: {
        appCredential: {
          async upsert(input) {
            calls.push(input);
          },
        },
      },
    });

    expect(result).toEqual({
      emails: demoCredentialEmails,
      seeded: demoCredentialEmails.length,
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          where: { email: "muhasebe@noa.local" },
          create: expect.objectContaining({
            defaultSessionId: "demo-accounting",
            email: "muhasebe@noa.local",
            userId: "user-main",
          }),
        }),
        expect.objectContaining({
          where: { email: "viewer@noa.local" },
          create: expect.objectContaining({
            defaultSessionId: "demo-viewer",
            email: "viewer@noa.local",
            userId: "user-viewer",
          }),
        }),
        expect.objectContaining({
          where: { email: "ahmet.yilmaz@noa.local" },
          create: expect.objectContaining({
            defaultSessionId: "demo-ahmet",
            email: "ahmet.yilmaz@noa.local",
            userId: "user-ahmet",
          }),
        }),
      ]),
    );
    expect(calls).toHaveLength(demoCredentialEmails.length);
  });
});
