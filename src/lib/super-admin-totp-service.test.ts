import { describe, expect, it, vi } from "vitest";
import { createSuperAdminTotpService } from "./super-admin-totp-service";

describe("Super Admin encrypted TOTP enrollment", () => {
  it("geçerli key yokken fail-closed kalır", async () => {
    const findUnique = vi.fn();
    const service = createSuperAdminTotpService({ superAdminCredential: { findUnique } } as never, "invalid");
    expect(service.isAvailable).toBe(false);
    await expect(service.beginEnrollment({ credentialId: "credential-1", now: new Date() })).resolves.toEqual({ available: false });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("enrollment secret'ını yalnız AES-GCM ciphertext olarak yazar", async () => {
    let data: Record<string, unknown> | undefined;
    const upsert = vi.fn(async (input: { create: Record<string, unknown>; data?: never }) => {
      data = input.create;
      return input.create;
    });
    const service = createSuperAdminTotpService({
      superAdminCredential: { findUnique: vi.fn().mockResolvedValue({ id: "credential-1", email: "admin@noa.test" }) },
      superAdminTotpSecret: { upsert },
    } as never, Buffer.alloc(32, 7).toString("base64"));
    const result = await service.beginEnrollment({ credentialId: "credential-1", now: new Date("2026-08-03T10:00:00Z") });
    expect(result.available).toBe(true);
    if (!result.available) throw new Error("Enrollment unavailable");
    expect(data?.secretBase32).toBeNull();
    expect(data?.secretCiphertext).toMatch(/^v1:/);
    expect(String(data?.secretCiphertext)).not.toContain(result.secretBase32);
    expect(data?.backupCodes).toEqual([]);
  });
});
