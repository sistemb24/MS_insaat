import { describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  API_KEY_SCOPES,
  buildApiKeyOverview,
  createApiKeyService,
  hashApiKeySecret,
  resolveApiKeyStatus,
  type ApiKeyRepository,
  type ApiKeyRow,
} from "./api-key-service";

const adminScope = { ...defaultTenantScope, userRole: "admin" as const };
const fixedNow = new Date("2026-07-11T10:00:00.000Z");

function createDependencies() {
  const record = vi.fn();
    const create = vi.fn(async ({ record: input, today }) => ({
      createdAt: input.createdAt,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt,
      id: input.id,
      keyPrefix: input.keyPrefix,
      lastUsedAt: input.lastUsedAt,
      name: input.name,
      rateLimitPerSecond: input.rateLimitPerSecond,
      revokedAt: input.revokedAt,
      revokedBy: input.revokedBy,
      scopes: input.scopes,
      status: resolveApiKeyStatus(input, today),
  } satisfies ApiKeyRow));
  const list = vi.fn(async () => [] as ApiKeyRow[]);
  const revoke = vi.fn(async () => null as ApiKeyRow | null);
  const repository = { create, list, revoke } satisfies ApiKeyRepository;

  return {
    create,
    list,
    record,
    repository,
    revoke,
    service: createApiKeyService({
      auditLogRepository: { record },
      generateId: () => "api-key-1",
      generateSecret: () => "noa_live_1234567890abcdefghijklmnop",
      now: () => fixedNow,
      repository,
    }),
  };
}

describe("api key service", () => {
  test("keeps API scope keys unique and exposes integration diagnostics", () => {
    const keys = API_KEY_SCOPES.map((scope) => scope.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("integration");
  });
  test("creates a scoped key, persists only its hash and audits without the secret", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.createKey({
      scope: adminScope,
      values: {
        expiresAt: "2026-12-31",
        name: "  ERP Entegrasyonu  ",
        rateLimitPerSecond: 20,
        scopes: ["invoices", "projects"],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.secret).toBe("noa_live_1234567890abcdefghijklmnop");
    expect(dependencies.create).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({
          companyId: adminScope.companyId,
          keyHash: hashApiKeySecret(result.data.secret),
          name: "ERP Entegrasyonu",
          periodId: adminScope.periodId,
          scopes: ["invoices", "projects"],
          tenantId: adminScope.tenantId,
        }),
      }),
    );
    expect(JSON.stringify(dependencies.record.mock.calls)).not.toContain(result.data.secret);
    expect(dependencies.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "api-key.create",
        entityType: "api-key",
        metadata: expect.objectContaining({ keyPrefix: "noa_live_12345678" }),
      }),
    );
  });

  test("rejects invalid values before persistence", async () => {
    const dependencies = createDependencies();
    const result = await dependencies.service.createKey({
      scope: adminScope,
      values: {
        expiresAt: "2026-02-29",
        name: "x",
        rateLimitPerSecond: 101,
        scopes: ["unknown"],
      },
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Anahtar adı 3 ile 80 karakter arasında olmalıdır.",
        "En az bir API kapsamı seçilmelidir.",
        "Hız limiti saniyede 1 ile 100 istek arasında olmalıdır.",
        "Son kullanım tarihi geçerli bir tarih olmalıdır.",
        "Geçersiz API kapsamı seçildi.",
      ],
    });
    expect(dependencies.create).not.toHaveBeenCalled();
    expect(dependencies.record).not.toHaveBeenCalled();
  });

  test("allows only admins to create and revoke keys", async () => {
    const dependencies = createDependencies();
    const accountingScope = { ...adminScope, userRole: "accounting" as const };

    expect(
      await dependencies.service.createKey({
        scope: accountingScope,
        values: { name: "ERP", rateLimitPerSecond: 10, scopes: ["invoices"] },
      }),
    ).toEqual({
      ok: false,
      errors: ["API anahtarı oluşturma yetkisi yalnız admin rolündedir."],
    });
    expect(await dependencies.service.revokeKey({ id: "api-key-1", scope: accountingScope })).toEqual({
      ok: false,
      errors: ["API anahtarı iptal etme yetkisi yalnız admin rolündedir."],
    });
  });

  test("revokes a scoped active key and writes the lifecycle audit event", async () => {
    const dependencies = createDependencies();
    const revokedRow: ApiKeyRow = {
      createdAt: fixedNow.toISOString(),
      createdBy: adminScope.userId,
      expiresAt: "",
      id: "api-key-1",
      keyPrefix: "noa_live_1234567",
      lastUsedAt: "",
      name: "ERP",
      rateLimitPerSecond: 10,
      revokedAt: fixedNow.toISOString(),
      revokedBy: adminScope.userId,
      scopes: ["invoices"],
      status: "revoked",
    };
    dependencies.revoke.mockResolvedValue(revokedRow);

    const result = await dependencies.service.revokeKey({ id: " api-key-1 ", scope: adminScope });

    expect(result).toEqual({ ok: true, data: { row: revokedRow } });
    expect(dependencies.revoke).toHaveBeenCalledWith({
      id: "api-key-1",
      nowIso: fixedNow.toISOString(),
      scope: adminScope,
    });
    expect(dependencies.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "api-key.revoke", entityId: "api-key-1" }),
    );
  });

  test("summarizes active, expired and revoked key states", () => {
    const base = {
      createdAt: fixedNow.toISOString(), createdBy: "user", expiresAt: "", id: "1",
      keyPrefix: "noa_live_a", lastUsedAt: "", name: "Key", rateLimitPerSecond: 10,
      rateLimitWindowCount: 0, rateLimitWindowStartedAt: "",
      revokedAt: "", revokedBy: "", scopes: ["invoices" as const],
    };
    const overview = buildApiKeyOverview([
      { ...base, status: "active" },
      { ...base, id: "2", status: "expired" },
      { ...base, id: "3", status: "revoked" },
    ]);

    expect(overview.summary).toEqual({
      activeCount: 1,
      expiredCount: 1,
      revokedCount: 1,
      totalCount: 3,
    });
  });
});
