import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const paymentRepositoryMock = vi.hoisted(() => ({ kind: "progress-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/progress-payment-prisma-repository", () => ({ createProgressPaymentPrismaRepository: vi.fn(() => paymentRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/progress-payment-service", () => ({ createProgressPaymentService: vi.fn(() => ({ list: listMock })) }));
import { GET } from "./route";
describe("GET /api/hakedis-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped progress payment summary", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listMock.mockResolvedValue({ ok: true, data: { rows: [{ status: "Taslak", grandTotal: 120 }, { status: "Kaydedildi", grandTotal: 80 }] } });
    const response = await GET(new Request("http://localhost/api/hakedis-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { totalCount: 2, statusCounts: { Taslak: 1, Kaydedildi: 1 }, grandTotal: 200 } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["progress-payments"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/hakedis-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
