import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const timesheetRepositoryMock = vi.hoisted(() => ({ kind: "timesheet-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/timesheet-prisma-repository", () => ({ createTimesheetPrismaRepository: vi.fn(() => timesheetRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/timesheet-service", () => ({ createTimesheetService: vi.fn(() => ({ list: listMock })) }));
import { GET } from "./route";
describe("GET /api/puantaj-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped timesheet summary", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listMock.mockResolvedValue({ ok: true, data: { rows: [{ status: "Taslak", totalWorkedDays: 10, totalOvertimeHours: 2 }, { status: "Kaydedildi", totalWorkedDays: 8, totalOvertimeHours: 1 }] } });
    const response = await GET(new Request("http://localhost/api/puantaj-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { totalCount: 2, statusCounts: { Taslak: 1, Kaydedildi: 1 }, totalWorkedDays: 18, totalOvertimeHours: 3 } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["timesheets"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/puantaj-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
