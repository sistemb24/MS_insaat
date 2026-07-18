import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const vehicleRepositoryMock = vi.hoisted(() => ({ list: vi.fn() }));
const authenticateMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/vehicle-prisma-repository", () => ({ createVehiclePrismaRepository: vi.fn(() => vehicleRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
import { GET } from "./route";
describe("GET /api/arac-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped vehicle status and date summary", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    vehicleRepositoryMock.list.mockResolvedValue([{ status: "Aktif", insuranceEndDate: "2020-01-01", inspectionEndDate: "", maintenanceDueDate: "2099-01-01" }, { status: "Pasif", insuranceEndDate: "", inspectionEndDate: "2020-01-01", maintenanceDueDate: "" }]);
    const response = await GET(new Request("http://localhost/api/arac-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.totalCount).toBe(2);
    expect(body.data.activeCount).toBe(1);
    expect(body.data.dateSummary.insuranceEndDate.overdueCount).toBe(1);
    expect(body.data.dateSummary.inspectionEndDate.overdueCount).toBe(1);
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["vehicles"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/arac-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(vehicleRepositoryMock.list).not.toHaveBeenCalled();
  });
});
