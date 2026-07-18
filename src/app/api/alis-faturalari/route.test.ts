import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const invoiceRepositoryMock = vi.hoisted(() => ({ kind: "purchase-invoice-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/purchase-invoice-prisma-repository", () => ({ createPurchaseInvoicePrismaRepository: vi.fn(() => invoiceRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/purchase-invoice-service", () => ({ createPurchaseInvoiceService: vi.fn(() => ({ list: listMock })) }));
import { GET } from "./route";
describe("GET /api/alis-faturalari", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped purchase invoices", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listMock.mockResolvedValue({ ok: true, data: { rows: [{ id: "purchase-1" }] } });
    const response = await GET(new Request("http://localhost/api/alis-faturalari", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { count: 1, rows: [{ id: "purchase-1" }] } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["purchase-invoices"] }));
    expect(listMock).toHaveBeenCalledWith({ scope: expect.objectContaining({ companyId: "company-1" }) });
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/alis-faturalari"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
