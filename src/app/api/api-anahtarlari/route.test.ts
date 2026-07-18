import { beforeEach, describe, expect, test, vi } from "vitest";

const apiKeyRepositoryMock = vi.hoisted(() => ({ kind: "api-key-repo" }));
const auditRepositoryMock = vi.hoisted(() => ({ kind: "audit-repo" }));
const listOverviewMock = vi.hoisted(() => vi.fn());
const authenticateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/api-key-prisma-repository", () => ({
  createApiKeyPrismaRepository: vi.fn(() => apiKeyRepositoryMock),
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: vi.fn(() => auditRepositoryMock),
}));
vi.mock("@/lib/api-key-auth", () => ({
  authenticateBearerApiKey: authenticateMock,
  buildTenantScopeFromApiKey: vi.fn((apiKey) => ({
    companyId: apiKey.companyId,
    periodId: apiKey.periodId,
    tenantId: apiKey.tenantId,
    userId: apiKey.createdBy,
    userRole: "admin",
  })),
}));
vi.mock("@/lib/api-key-service", () => ({
  createApiKeyService: vi.fn(() => ({ listOverview: listOverviewMock })),
}));

import { GET } from "./route";

describe("GET /api/api-anahtarlari", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns scoped safe API key metadata", async () => {
    const apiKey = {
      companyId: "company-1",
      createdBy: "user-1",
      id: "key-1",
      periodId: "period-1",
      tenantId: "tenant-1",
    };
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey } });
    listOverviewMock.mockResolvedValue({
      ok: true,
      data: {
        overview: {
          rows: [],
          summary: { totalCount: 1, activeCount: 1, expiredCount: 0, revokedCount: 0 },
        },
      },
    });

    const response = await GET(
      new Request("http://localhost/api/api-anahtarlari", {
        headers: { authorization: "Bearer noa_live_test" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: {
        rows: [],
        summary: { totalCount: 1, activeCount: 1, expiredCount: 0, revokedCount: 0 },
      },
    });
    expect(authenticateMock).toHaveBeenCalledWith(
      expect.objectContaining({ requiredScopes: ["api-keys"] }),
    );
    expect(listOverviewMock).toHaveBeenCalledWith({
      scope: expect.objectContaining({ companyId: "company-1", tenantId: "tenant-1" }),
    });
  });

  test("challenges missing bearer token", async () => {
    authenticateMock.mockResolvedValue({
      ok: false,
      status: 401,
      errors: ["Bearer API anahtarı zorunludur."],
    });

    const response = await GET(new Request("http://localhost/api/api-anahtarlari"));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe("Bearer");
    expect(listOverviewMock).not.toHaveBeenCalled();
  });

  test("filters metadata rows by status and usage", async () => {
    authenticateMock.mockResolvedValue({ ok: true, data: { apiKey: { companyId: "company-1", createdBy: "user-1", periodId: "period-1", tenantId: "tenant-1" } } });
    listOverviewMock.mockResolvedValue({ ok: true, data: { overview: { rows: [{ id: "used-active", status: "active", lastUsedAt: "2026-07-01" }, { id: "unused-active", status: "active", lastUsedAt: "" }, { id: "used-revoked", status: "revoked", lastUsedAt: "2026-07-01" }], summary: { totalCount: 3, activeCount: 2, expiredCount: 0, revokedCount: 1 } } } });
    const response = await GET(new Request("http://localhost/api/api-anahtarlari?status=active&used=true", { headers: { authorization: "Bearer test" } }));
    expect(await response.json()).toEqual({ ok: true, data: { rows: [{ id: "used-active", status: "active", lastUsedAt: "2026-07-01" }], summary: { totalCount: 1, activeCount: 1, expiredCount: 0, revokedCount: 0 } } });
  });
});
