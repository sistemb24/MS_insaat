import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const tenderRepositoryMock = vi.hoisted(() => ({ kind: "tender-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
const summarizeMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/tender-prisma-repository", () => ({ createTenderPrismaRepository: vi.fn(() => tenderRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/tender-service", () => ({ createTenderService: vi.fn(() => ({ list: listMock })), summarizeTenders: summarizeMock }));
import { GET } from "./route";
describe("GET /api/ihale-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped tender summary", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listMock.mockResolvedValue({ ok: true, data: { rows: [{ id: "tender-1" }] } });
    summarizeMock.mockReturnValue({ totalCount: 1, statusCounts: { Kazanıldı: 1 } });
    const response = await GET(new Request("http://localhost/api/ihale-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { totalCount: 1, statusCounts: { Kazanıldı: 1 } } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["tenders"] }));
    expect(summarizeMock).toHaveBeenCalledWith([{ id: "tender-1" }]);
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/ihale-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
