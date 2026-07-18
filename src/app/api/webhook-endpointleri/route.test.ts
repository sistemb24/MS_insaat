import { beforeEach, describe, expect, test, vi } from "vitest";
const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const endpointRepositoryMock = vi.hoisted(() => ({ kind: "endpoint-repo" }));
const authenticateMock = vi.hoisted(() => vi.fn());
const listOverviewMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({ createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock) }));
vi.mock("@/lib/webhook-endpoint-prisma-repository", () => ({ createWebhookEndpointPrismaRepository: vi.fn(() => endpointRepositoryMock) }));
vi.mock("@/lib/api-key-auth", () => ({ authenticateBearerApiKey: authenticateMock, buildTenantScopeFromApiKey: vi.fn((key) => ({ tenantId: key.tenantId, companyId: key.companyId, periodId: key.periodId, userId: key.createdBy, userRole: "admin" })) }));
vi.mock("@/lib/webhook-endpoint-service", () => ({ createWebhookEndpointService: vi.fn(() => ({ listOverview: listOverviewMock })) }));
import { GET } from "./route";
describe("GET /api/webhook-endpointleri", () => {
  beforeEach(() => vi.clearAllMocks());
  test("returns scoped endpoint overview without secrets", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listOverviewMock.mockResolvedValue({ ok: true, data: { overview: { rows: [{ id: "endpoint-1", secretPrefix: "noa_wh_" }], summary: { activeCount: 1, inactiveCount: 0, totalCount: 1 } } } });
    const response = await GET(new Request("http://localhost/api/webhook-endpointleri", { headers: { authorization: "Bearer test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { rows: [{ id: "endpoint-1", secretPrefix: "noa_wh_" }], summary: { activeCount: 1, inactiveCount: 0, totalCount: 1 } } });
    expect(authenticateMock).toHaveBeenCalledWith(expect.objectContaining({ requiredScopes: ["webhooks"] }));
  });
  test("challenges missing bearer", async () => {
    authenticateMock.mockResolvedValue({ ok: false, status: 401, errors: ["Bearer API anahtarı zorunludur."] });
    const response = await GET(new Request("http://localhost/api/webhook-endpointleri"));
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listOverviewMock).not.toHaveBeenCalled();
  });

  test("filters scoped rows by active state and event type", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listOverviewMock.mockResolvedValue({ ok: true, data: { overview: { rows: [{ id: "active-match", isActive: true, eventTypes: ["invoice.created"] }, { id: "active-other", isActive: true, eventTypes: ["bank.transaction.matched"] }, { id: "inactive-match", isActive: false, eventTypes: ["invoice.created"] }], summary: { activeCount: 2, inactiveCount: 1, totalCount: 3 } } } });
    const response = await GET(new Request("http://localhost/api/webhook-endpointleri?active=true&eventType=invoice.created", { headers: { authorization: "Bearer test" } }));
    expect(await response.json()).toEqual({ ok: true, data: { rows: [{ id: "active-match", isActive: true, eventTypes: ["invoice.created"] }], summary: { activeCount: 1, inactiveCount: 0, totalCount: 1 } } });
  });
});
