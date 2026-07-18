import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const auditRepositoryMock = vi.hoisted(() => ({ listByEntityType: vi.fn() }));
const authenticateMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => auditRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
import { GET } from "./route";
describe("GET /api/audit-kayitlari", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped, bounded entity audit rows", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    auditRepositoryMock.listByEntityType.mockResolvedValue([{ id: "audit-1", entityType: "user-access" }]);
    const response = await GET(new Request("http://localhost/api/audit-kayitlari?entityType=user-access&limit=1000", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { entityType: "user-access", count: 1, rows: [{ id: "audit-1", entityType: "user-access" }] } });
    expect(auditRepositoryMock.listByEntityType).toHaveBeenCalledWith(expect.objectContaining({ entityType: "user-access", limit: 100 }));
  });
  test("rejects missing entity type without reading audit data", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    const response = await GET(new Request("http://localhost/api/audit-kayitlari", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(400);
    expect(auditRepositoryMock.listByEntityType).not.toHaveBeenCalled();
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/audit-kayitlari"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
  });
});
