import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const entityRepositoryMock = vi.hoisted(() => ({ kind: "entity-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/entity-prisma-repository", () => ({ createEntityPrismaRepository: vi.fn(() => entityRepositoryMock) }));
vi.mock("@/lib/entity-crud-service", () => ({ createEntityCrudService: vi.fn(() => ({ list: listMock })) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
import { GET } from "./route";
describe("GET /api/fatura-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped invoice status and amount summary", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listMock.mockResolvedValue({ ok: true, data: { rows: [{ Durum: "Kaydedildi", "Genel Toplam": "1.250,50" }, { status: "Taslak", grandTotal: "100" }] } });
    const response = await GET(new Request("http://localhost/api/fatura-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { totalCount: 2, statusCounts: { Kaydedildi: 1, Taslak: 1 }, totalAmount: 1350.5 } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["invoices"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/fatura-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
