import { describe, expect, it } from "vitest";

import {
  resolveTenantScopeFromCookieStore,
  resolveTenantScopeFromSessionId,
  resolveTenantScopeFromSessionStore,
  SESSION_COOKIE_NAME,
  type SessionScopeRecord,
  type SessionScopeRepository,
} from "./session-scope";

describe("session scope resolver", () => {
  it("falls back to the default accounting scope without a known session id", () => {
    expect(resolveTenantScopeFromSessionId()).toMatchObject({
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      userId: "user-main",
      userRole: "accounting",
    });

    expect(resolveTenantScopeFromSessionId("unknown-session")).toMatchObject({
      userId: "user-main",
      userRole: "accounting",
    });
  });

  it("maps an opaque viewer session id to a read-only tenant scope", () => {
    expect(resolveTenantScopeFromSessionId("demo-viewer")).toMatchObject({
      tenantId: "tenant-noa-demo",
      companyId: "company-demo-insaat",
      periodId: "period-2026",
      userId: "user-viewer",
      userName: "Salt Okur",
      userRole: "viewer",
    });
  });

  it("shows the demo accounting credential as the accounting user", () => {
    expect(resolveTenantScopeFromSessionId("demo-accounting")).toMatchObject({
      userId: "user-main",
      userName: "Muhasebe Kullanıcısı",
      userRole: "accounting",
    });
  });

  it("reads the active scope from a cookie store", () => {
    const scope = resolveTenantScopeFromCookieStore({
      get(name: string) {
        return name === SESSION_COOKIE_NAME
          ? { name, value: "demo-viewer" }
          : undefined;
      },
    });

    expect(scope.userRole).toBe("viewer");
  });

  it("returns a defensive copy of the resolved scope", () => {
    const scope = resolveTenantScopeFromSessionId("demo-viewer");
    scope.userName = "Changed";

    expect(resolveTenantScopeFromSessionId("demo-viewer").userName).toBe(
      "Salt Okur",
    );
  });

  it("resolves tenant scope from a persisted active session record", async () => {
    const repository = createSessionRepository({
      id: "session-admin",
      tenantId: "tenant-real",
      tenantName: "Gercek Tenant",
      companyId: "company-real",
      companyName: "GERCEK INSAAT",
      periodId: "period-2027",
      periodLabel: "2027",
      userId: "user-admin",
      userName: "Yetkili Kullanici",
      userRole: "admin",
      licenseLabel: "Canli Lisans",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    await expect(
      resolveTenantScopeFromSessionStore({
        now: new Date("2026-01-01T00:00:00.000Z"),
        repository,
        sessionId: "session-admin",
      }),
    ).resolves.toEqual({
      tenantId: "tenant-real",
      tenantName: "Gercek Tenant",
      companyId: "company-real",
      companyName: "GERCEK INSAAT",
      periodId: "period-2027",
      periodLabel: "2027",
      userId: "user-admin",
      userName: "Yetkili Kullanici",
      userRole: "admin",
      licenseLabel: "Canli Lisans",
    });
  });

  it("falls back when the persisted session is missing or expired", async () => {
    const repository = createSessionRepository({
      id: "expired-session",
      tenantId: "tenant-real",
      tenantName: "Gercek Tenant",
      companyId: "company-real",
      companyName: "GERCEK INSAAT",
      periodId: "period-2027",
      periodLabel: "2027",
      userId: "user-viewer",
      userName: "Eski Kullanici",
      userRole: "viewer",
      licenseLabel: "Canli Lisans",
      expiresAt: new Date("2025-12-31T23:59:59.000Z"),
    });

    await expect(
      resolveTenantScopeFromSessionStore({
        now: new Date("2026-01-01T00:00:00.000Z"),
        repository,
        sessionId: "expired-session",
      }),
    ).resolves.toMatchObject({
      userId: "user-main",
      userRole: "accounting",
    });

    await expect(
      resolveTenantScopeFromSessionStore({
        now: new Date("2026-01-01T00:00:00.000Z"),
        repository,
        sessionId: "missing-session",
      }),
    ).resolves.toMatchObject({
      userId: "user-main",
      userRole: "accounting",
    });
  });
});

function createSessionRepository(
  record: SessionScopeRecord,
): SessionScopeRepository {
  return {
    async findById(sessionId: string) {
      return sessionId === record.id ? record : null;
    },
  };
}
