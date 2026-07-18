import { describe, expect, it } from "vitest";

import { createCredentialPrismaRepository } from "./credential-prisma-repository";

describe("credential prisma repository", () => {
  it("loads credential by normalized email", async () => {
    const calls: unknown[] = [];
    const repository = createCredentialPrismaRepository({
      appCredential: {
        async findUnique(input) {
          calls.push(input);

          return {
            defaultSessionId: "demo-accounting",
            email: "muhasebe@noa.local",
            passwordHash: "hash-value",
            userId: "user-main",
          };
        },
      },
    });

    await expect(
      repository.findByEmail(" MUHASEBE@NOA.LOCAL "),
    ).resolves.toEqual({
      defaultSessionId: "demo-accounting",
      email: "muhasebe@noa.local",
      passwordHash: "hash-value",
      userId: "user-main",
    });
    expect(calls).toEqual([
      {
        select: {
          defaultSessionId: true,
          email: true,
          passwordHash: true,
          userId: true,
        },
        where: {
          email: "muhasebe@noa.local",
        },
      },
    ]);
  });

  it("returns null for unknown email", async () => {
    const repository = createCredentialPrismaRepository({
      appCredential: {
        async findUnique() {
          return null;
        },
      },
    });

    await expect(
      repository.findByEmail("missing@noa.local"),
    ).resolves.toBeNull();
  });
});