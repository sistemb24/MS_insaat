import { describe, expect, it, vi } from "vitest";
import { createSuperAdminPasswordResetService } from "./super-admin-password-reset-service";

describe("Super Admin password reset quarantine", () => {
  it("delivery adapter yokken secret üretmez ve DB'ye erişmez", async () => {
    const findUnique = vi.fn();
    const create = vi.fn();
    const service = createSuperAdminPasswordResetService({
      superAdminCredential: { findUnique },
      superAdminPasswordResetToken: { create },
    } as never);
    await expect(service.requestReset({ email: "admin@example.com", now: new Date() }))
      .resolves.toEqual({ status: "unavailable" });
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
