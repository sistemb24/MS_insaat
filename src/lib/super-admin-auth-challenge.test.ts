import { describe, expect, it, vi } from "vitest";
import { createSuperAdminAuthChallengeRepository } from "./super-admin-auth-challenge";

describe("Super Admin opaque challenge", () => {
  it("plaintext'i saklamaz ve tüketimi koşullu tek kullanımlı yapar", async () => {
    let stored: Record<string, unknown> | undefined;
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => { stored = data; return data; });
    const findUnique = vi.fn(async () => ({ ...stored, consumedAt: null, attemptCount: 0 }));
    const updateMany = vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const repository = createSuperAdminAuthChallengeRepository({ superAdminAuthChallenge: { create, findUnique, updateMany } } as never);
    const now = new Date("2026-08-03T10:00:00.000Z");
    const challenge = await repository.create({ credentialId: "credential-1", purpose: "TOTP_LOGIN", now });
    expect(stored?.tokenHash).not.toBe(challenge.plaintext);
    await expect(repository.validate({ plaintext: challenge.plaintext, purpose: "TOTP_LOGIN", now })).resolves.toMatchObject({ valid: true });
    await expect(repository.consume({ plaintext: challenge.plaintext, purpose: "TOTP_LOGIN", now })).resolves.toBe(true);
    await expect(repository.consume({ plaintext: challenge.plaintext, purpose: "TOTP_LOGIN", now })).resolves.toBe(false);
  });
});
