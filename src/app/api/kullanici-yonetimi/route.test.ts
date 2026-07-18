import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const userRepositoryMock = vi.hoisted(() => ({ kind: "user-repo" }));
const auditRepositoryMock = vi.hoisted(() => ({ kind: "audit-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listOverviewMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/user-management-prisma-repository", () => ({ createUserManagementPrismaRepository: vi.fn(() => userRepositoryMock) }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: vi.fn(() => auditRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/user-management-service", () => ({ createUserManagementService: vi.fn(() => ({ listOverview: listOverviewMock })) }));
import { GET } from "./route";
describe("GET /api/kullanici-yonetimi", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped user management overview", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listOverviewMock.mockResolvedValue({ ok: true, data: { overview: { activeUsers: [], invitations: [], auditLogs: [], summary: { activeUserCount: 0, acceptedInvitationCount: 0, pendingInvitationCount: 0 } } } });
    const response = await GET(new Request("http://localhost/api/kullanici-yonetimi", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { activeUsers: [], invitations: [], auditLogs: [], summary: { activeUserCount: 0, acceptedInvitationCount: 0, pendingInvitationCount: 0 } } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["user-management"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/kullanici-yonetimi"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listOverviewMock).not.toHaveBeenCalled();
  });
});
