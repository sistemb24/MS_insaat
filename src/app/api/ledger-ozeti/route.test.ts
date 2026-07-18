import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/ledger-prisma-repository", () => ({ createLedgerPrismaRepository: vi.fn(() => ({})) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authMock, buildTenantScopeFromApiKey: vi.fn(() => ({ tenantId: "t", companyId: "c", periodId: "p", userId: "u", userRole: "admin" })) }));
vi.mock("@/lib/ledger-service", () => ({ createLedgerService: vi.fn(() => ({ list: listMock })) }));
import { GET } from "./route";

describe("GET /api/ledger-ozeti", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped currency totals", async () => {
    authMock.mockResolvedValue({ ok: true, data: { apiKey: {} } });
    listMock.mockResolvedValue([
      { currency: "TL", debitTotal: 100, creditTotal: 100 },
      { currency: "USD", debitTotal: 10, creditTotal: 8 },
    ]);
    const response = await GET(new Request("http://localhost/api/ledger-ozeti", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { totalCount: 2, totalsByCurrency: { TL: { debitTotal: 100, creditTotal: 100, entryCount: 1 }, USD: { debitTotal: 10, creditTotal: 8, entryCount: 1 } } } });
    expect(authMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["ledger"] }));
  });
  test("challenges missing bearer", async () => {
    authMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/ledger-ozeti"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listMock).not.toHaveBeenCalled();
  });
});
