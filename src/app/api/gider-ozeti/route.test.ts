import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const expenseRepositoryMock = vi.hoisted(() => ({ kind: "expense-repo" }));
const cashBankRepositoryMock = vi.hoisted(() => ({ kind: "cash-bank-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/expense-prisma-repository", () => ({ createExpensePrismaRepository: vi.fn(() => expenseRepositoryMock) }));
vi.mock("@/lib/cash-bank-movement-prisma-repository", () => ({ createCashBankMovementPrismaRepository: vi.fn(() => cashBankRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/expense-service", () => ({ createExpenseService: vi.fn(() => ({ list: listMock })) }));
import { GET } from "./route";
describe("GET /api/gider-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped expense summary", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listMock.mockResolvedValue({ ok: true, data: { rows: [{ status: "Kaydedildi", currency: "TL", grandTotal: 100 }, { status: "İptal", currency: "TL", grandTotal: 40 }, { status: "Kaydedildi", currency: "USD", grandTotal: 10 }] } });
    const response = await GET(new Request("http://localhost/api/gider-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { totalCount: 3, statusCounts: { Kaydedildi: 2, "İptal": 1 }, currencyTotals: { TL: 140, USD: 10 } } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["expenses"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/gider-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
