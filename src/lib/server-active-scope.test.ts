import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultTenantScope } from "./tenant-scope";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  findActiveById: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookieGet })),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("./prisma", () => ({ prisma: {} }));

vi.mock("./session-scope-prisma-repository", () => ({
  createSessionScopePrismaRepository: vi.fn(() => ({})),
}));

vi.mock("./user-scope-access-prisma-repository", () => ({
  createUserScopeAccessPrismaRepository: vi.fn(() => ({})),
}));

vi.mock("./tenant-auth-session-prisma-repository", () => ({
  createTenantAuthSessionPrismaRepository: vi.fn(() => ({
    findActiveById: mocks.findActiveById,
  })),
}));

import { getActiveTenantScope } from "./server-active-scope";

describe("server active scope", () => {
  beforeEach(() => {
    mocks.cookieGet.mockReset();
    mocks.findActiveById.mockReset();
    mocks.redirect.mockClear();
  });

  it("fails closed when the tenant auth cookie is missing", async () => {
    mocks.cookieGet.mockReturnValue(undefined);

    await expect(getActiveTenantScope()).rejects.toThrow("redirect:/giris");
    expect(mocks.findActiveById).not.toHaveBeenCalled();
  });

  it("does not accept a predictable scope session id as authentication", async () => {
    mocks.cookieGet.mockReturnValue({ value: "demo-accounting" });
    mocks.findActiveById.mockResolvedValue(null);

    await expect(getActiveTenantScope()).rejects.toThrow("redirect:/giris");
    expect(mocks.findActiveById).toHaveBeenCalledWith({
      id: "demo-accounting",
      now: expect.any(Date),
    });
  });

  it("returns only the scope carried by an active opaque auth session", async () => {
    const scope = { ...defaultTenantScope };
    mocks.cookieGet.mockReturnValue({ value: "opaque-auth-session" });
    mocks.findActiveById.mockResolvedValue({
      expiresAt: new Date("2026-08-04T17:00:00.000Z"),
      id: "opaque-auth-session",
      revokedAt: null,
      scope,
      scopeSessionId: "demo-accounting",
      userId: scope.userId,
    });

    await expect(getActiveTenantScope()).resolves.toEqual(scope);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
