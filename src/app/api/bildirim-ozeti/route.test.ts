import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const notificationRepositoryMock = vi.hoisted(() => ({ kind: "notification-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/notification-center-prisma-repository", () => ({ createNotificationCenterPrismaRepository: vi.fn(() => notificationRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/notification-center-service", () => ({ createNotificationCenterService: vi.fn(() => ({ list: listMock })) }));
import { GET } from "./route";
describe("GET /api/bildirim-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped notification summary", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listMock.mockResolvedValue({ ok: true, data: { model: { summary: { totalCount: 2, unreadCount: 1 }, categoryStats: [{ label: "Masraf", count: 1 }], priorityStats: [{ label: "Yüksek", count: 1 }] } } });
    const response = await GET(new Request("http://localhost/api/bildirim-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { summary: { totalCount: 2, unreadCount: 1 }, categoryStats: [{ label: "Masraf", count: 1 }], priorityStats: [{ label: "Yüksek", count: 1 }] } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["notifications"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/bildirim-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
