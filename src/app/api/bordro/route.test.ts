import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const payrollRepositoryMock = vi.hoisted(() => ({ kind: "payroll-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/payroll-accrual-prisma-repository", () => ({ createPayrollAccrualPrismaRepository: vi.fn(() => payrollRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((apiKey) => ({ tenantId: apiKey.tenantId, companyId: apiKey.companyId, periodId: apiKey.periodId, userId: apiKey.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/payroll-accrual-service", () => ({ createPayrollAccrualService: vi.fn(() => ({ list: listMock })) }));
import { GET } from "./route";
describe("GET /api/bordro", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped payroll rows", async () => {
    const apiKey = { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" };
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey } });
    listMock.mockResolvedValue({ ok: true, data: { rows: [{ id: "payroll-1" }] } });
    const response = await GET(new Request("http://localhost/api/bordro", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { count: 1, rows: [{ id: "payroll-1" }] } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["payroll"] }));
    expect(listMock).toHaveBeenCalledWith({ scope: expect.objectContaining({ companyId: "company-1" }) });
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/bordro"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
