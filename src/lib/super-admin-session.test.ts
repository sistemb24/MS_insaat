import { describe, expect, it, vi } from "vitest";

import { resolveSuperAdminSession, SUPER_ADMIN_SESSION_DURATION_MS, type SuperAdminSessionRepository } from "./super-admin-session-repository";

const base = new Date("2026-08-02T12:00:00.000Z");

function repository(expiresAt: Date): SuperAdminSessionRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue({
      id: "session-1", credentialId: "admin-1", createdAt: base, expiresAt,
      lastActiveAt: base, ipAddress: null, userAgent: null,
      credential: { id: "admin-1", email: "admin@noa.test", name: "NOA Admin" },
    }),
    deleteById: vi.fn().mockResolvedValue(undefined),
    deleteAllForCredential: vi.fn(),
    touch: vi.fn().mockResolvedValue({
      id: "session-1", credentialId: "admin-1", createdAt: base,
      expiresAt: new Date(base.getTime() + SUPER_ADMIN_SESSION_DURATION_MS),
      lastActiveAt: base, ipAddress: null, userAgent: null,
    }),
    deleteExpired: vi.fn(),
  };
}

describe("super admin session guard", () => {
  it("rejects and deletes an expired session", async () => {
    const repo = repository(base);
    await expect(resolveSuperAdminSession("session-1", repo, base)).resolves.toBeNull();
    expect(repo.deleteById).toHaveBeenCalledWith("session-1");
    expect(repo.touch).not.toHaveBeenCalled();
  });

  it("touches a valid session and returns only safe identity data", async () => {
    const repo = repository(new Date(base.getTime() + 1));
    await expect(resolveSuperAdminSession("session-1", repo, base)).resolves.toEqual({
      credentialId: "admin-1", email: "admin@noa.test", name: "NOA Admin",
      expiresAt: new Date(base.getTime() + SUPER_ADMIN_SESSION_DURATION_MS),
    });
    expect(repo.touch).toHaveBeenCalledWith("session-1", base);
  });
});
