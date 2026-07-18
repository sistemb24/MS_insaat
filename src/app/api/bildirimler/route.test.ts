import { describe, expect, test, vi } from "vitest";

const authenticateBearerApiKeyMock = vi.hoisted(() => vi.fn());
const buildTenantScopeFromApiKeyMock = vi.hoisted(() => vi.fn());
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const notificationRepositoryMock = vi.hoisted(() => ({
  kind: "notification-repo",
  listNotifications: vi.fn(),
  listPreferences: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/notification-center-prisma-repository", () => ({
  createNotificationCenterPrismaRepository: vi.fn(() => notificationRepositoryMock),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateBearerApiKeyMock,
  buildTenantScopeFromApiKey: buildTenantScopeFromApiKeyMock,
}));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));

import { GET } from "./route";

describe("notification api route", () => {
  test("lists scoped notifications with unread summary", async () => {
    const apiKey = {
      companyId: "company-demo-insaat",
      createdBy: "user-main",
      periodId: "period-2026",
      tenantId: "tenant-noa-demo",
    };
    const scope = {
      companyId: "company-demo-insaat",
      companyName: "API Company",
      licenseLabel: "API",
      periodId: "period-2026",
      periodLabel: "API",
      tenantId: "tenant-noa-demo",
      tenantName: "API Tenant",
      userId: "user-main",
      userName: "API Kullanıcısı",
      userRole: "viewer" as const,
    };
    const rows = [
      {
        id: "notification-1",
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        userId: scope.userId,
        categoryKey: "masraf-yonetimi",
        priority: "Yüksek",
        title: "Ödeme bekliyor",
        body: "API okuma testi",
        targetHref: "/giderler",
        targetLabel: "Gider",
        readAt: null,
        createdAt: "2026-07-13T08:00:00.000Z",
      },
    ];
    const preferences: unknown[] = [];

    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: true,
      data: { apiKey, bearerToken: "noa_live_test" },
    });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    notificationRepositoryMock.listNotifications.mockResolvedValue(rows);
    notificationRepositoryMock.listPreferences.mockResolvedValue(preferences);

    const response = await GET(
      new Request("http://localhost/api/bildirimler", {
        headers: { Authorization: "Bearer noa_live_test" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        count: 1,
        unreadCount: 1,
        rows,
        model: expect.objectContaining({
          summary: expect.objectContaining({ unreadCount: 1 }),
        }),
        preferences,
      },
    });
    expect(authenticateBearerApiKeyMock).toHaveBeenCalledWith({
      authorizationHeader: "Bearer noa_live_test",
      requiredScopes: ["notifications"],
      repository: apiKeyRepositoryMock,
    });
  });

  test("returns a bearer challenge when authorization is missing", async () => {
    authenticateBearerApiKeyMock.mockResolvedValue({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });

    const response = await GET(new Request("http://localhost/api/bildirimler"));

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  test("filters notifications by category, priority and unread state", async () => {
    const scope = { companyId: "company-1", companyName: "API", licenseLabel: "API", periodId: "period-1", periodLabel: "API", tenantId: "tenant-1", tenantName: "API", userId: "user-1", userName: "API", userRole: "viewer" as const };
    authenticateBearerApiKeyMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", periodId: "period-1", tenantId: "tenant-1" } } });
    buildTenantScopeFromApiKeyMock.mockReturnValue(scope);
    notificationRepositoryMock.listNotifications.mockResolvedValue([{ id: "match", categoryKey: "masraf-yonetimi", priority: "Yüksek", title: "", body: "", targetHref: "", targetLabel: "", readAt: null, createdAt: "2026-07-13T08:00:00.000Z" }, { id: "other", categoryKey: "stok", priority: "Düşük", title: "", body: "", targetHref: "", targetLabel: "", readAt: null, createdAt: "2026-07-13T08:00:00.000Z" }]);
    notificationRepositoryMock.listPreferences.mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/bildirimler?category=masraf-yonetimi&priority=Yüksek&unread=true", { headers: { Authorization: "Bearer test" } }));
    const body = await response.json();
    expect(body.data.count).toBe(1);
    expect(body.data.rows.map((row: { id: string }) => row.id)).toEqual(["match"]);
    expect(body.data.unreadCount).toBe(1);
  });
});
