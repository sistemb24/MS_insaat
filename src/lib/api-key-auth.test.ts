import { describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  hashApiKeySecret,
  type ApiKeyAuthRow,
  type ApiKeyScope,
} from "./api-key-service";
import {
  authenticateBearerApiKey,
  hasRequiredApiKeyScopes,
  parseBearerToken,
} from "./api-key-auth";

const fixedNow = new Date("2026-07-11T10:00:00.000Z");

type ApiKeyAuthRecord = ApiKeyAuthRow & { keyHash: string };

function createRepositoryMock(apiKey?: ApiKeyAuthRecord | null) {
  const key = apiKey ?? createActiveKey();
  return {
    consumeUsage: vi.fn(async ({ key: apiKeyRow }: { key: ApiKeyAuthRow }) =>
      key && key.id === apiKeyRow.id
        ? stripKeyHash({
            ...key,
            lastUsedAt: fixedNow.toISOString(),
            rateLimitWindowCount: (key.rateLimitWindowCount ?? 0) + 1,
            rateLimitWindowStartedAt: fixedNow.toISOString(),
          })
        : null,
    ),
    findByKeyHash: vi.fn(async ({ keyHash }: { keyHash: string }) =>
      key && key.keyHash === keyHash ? stripKeyHash(key) : null,
    ),
    touchLastUsed: vi.fn(async ({ id }: { id: string }) =>
      key && key.id === id
        ? stripKeyHash({ ...key, lastUsedAt: fixedNow.toISOString() })
        : null,
    ),
  };
}

function createActiveKey(
  overrides: Partial<ApiKeyAuthRecord> = {},
  bearerToken = "noa_live_1234567890abcdefghijklmnop",
) {
  return {
    companyId: defaultTenantScope.companyId,
    createdAt: fixedNow.toISOString(),
    createdBy: defaultTenantScope.userId,
    expiresAt: "",
    id: "api-key-1",
    keyHash: overrides.keyHash ?? hashApiKeySecret(bearerToken),
    keyPrefix: "noa_live_12345678",
    lastUsedAt: "",
    name: "ERP",
    periodId: defaultTenantScope.periodId,
    rateLimitPerSecond: 20,
    rateLimitWindowCount: 0,
    rateLimitWindowStartedAt: "",
    revokedAt: "",
    revokedBy: "",
    scopes: ["invoices", "webhooks"] as ApiKeyScope[],
    status: "active",
    tenantId: defaultTenantScope.tenantId,
    ...overrides,
  } satisfies ApiKeyAuthRecord;
}

function stripKeyHash(record: ApiKeyAuthRecord): ApiKeyAuthRow {
  void record.keyHash;
  const { keyHash, ...rest } = record;
  void keyHash;
  return rest;
}

describe("api key auth", () => {
  test("parses bearer tokens without leaking the scheme", () => {
    expect(parseBearerToken("Bearer noa_live_123")).toBe("noa_live_123");
    expect(parseBearerToken("bearer   noa_live_123   ")).toBe("noa_live_123");
    expect(parseBearerToken("Basic abc")).toBe("");
  });

  test("authenticates an active bearer key and consumes a rate limit slot", async () => {
    const bearerToken = "noa_live_1234567890abcdefghijklmnop";
    const apiKey = createActiveKey({}, bearerToken);
    const repository = createRepositoryMock(apiKey);

    const result = await authenticateBearerApiKey({
      authorizationHeader: `Bearer ${bearerToken}`,
      now: () => fixedNow,
      repository,
      requiredScopes: ["invoices"],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        apiKey: {
          ...stripKeyHash(apiKey),
          lastUsedAt: fixedNow.toISOString(),
          rateLimitWindowCount: 1,
          rateLimitWindowStartedAt: fixedNow.toISOString(),
        },
        bearerToken: "noa_live_1234567890abcdefghijklmnop",
      },
    });
    expect(repository.findByKeyHash).toHaveBeenCalledWith({
      keyHash: hashApiKeySecret(bearerToken),
      today: "2026-07-11",
    });
    expect(repository.consumeUsage).toHaveBeenCalledWith({
      key: expect.objectContaining({ id: apiKey.id }),
      nowIso: fixedNow.toISOString(),
      today: "2026-07-11",
    });
    expect(repository.touchLastUsed).not.toHaveBeenCalled();
  });

  test("rejects missing authorization headers", async () => {
    const repository = createRepositoryMock();

    expect(
      await authenticateBearerApiKey({
        authorizationHeader: null,
        repository,
      }),
    ).toEqual({
      ok: false,
      errors: ["Bearer API anahtarı zorunludur."],
      status: 401,
    });
    expect(repository.findByKeyHash).not.toHaveBeenCalled();
    expect(repository.consumeUsage).not.toHaveBeenCalled();
    expect(repository.touchLastUsed).not.toHaveBeenCalled();
  });

  test("rejects expired keys before touching lastUsedAt", async () => {
    const apiKey = createActiveKey(
      {
        expiresAt: "2026-07-10",
        status: "expired",
      },
      "noa_live_1234567890abcdefghijklmnop",
    );
    const repository = createRepositoryMock(apiKey);

    const result = await authenticateBearerApiKey({
      authorizationHeader: `Bearer ${"noa_live_1234567890abcdefghijklmnop"}`,
      now: () => fixedNow,
      repository,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["API anahtarı geçersiz, süresi dolmuş veya iptal edilmiş."],
      status: 401,
    });
    expect(repository.consumeUsage).not.toHaveBeenCalled();
    expect(repository.touchLastUsed).not.toHaveBeenCalled();
  });

  test("enforces required API scopes for future route handlers", async () => {
    const apiKey = createActiveKey(
      { scopes: ["webhooks"] },
      "noa_live_1234567890abcdefghijklmnop",
    );
    const repository = createRepositoryMock(apiKey);

    const result = await authenticateBearerApiKey({
      authorizationHeader: `Bearer ${"noa_live_1234567890abcdefghijklmnop"}`,
      now: () => fixedNow,
      repository,
      requiredScopes: ["invoices"],
    });

    expect(result).toEqual({
      ok: false,
      errors: ["API anahtarı bu kaynak için gerekli kapsamları içermiyor."],
      status: 403,
    });
    expect(repository.consumeUsage).not.toHaveBeenCalled();
    expect(repository.touchLastUsed).not.toHaveBeenCalled();
    expect(hasRequiredApiKeyScopes(apiKey, ["webhooks"])).toBe(true);
  });

  test("returns a rate limit error when the usage slot cannot be consumed", async () => {
    const bearerToken = "noa_live_1234567890abcdefghijklmnop";
    const apiKey = createActiveKey({}, bearerToken);
    const repository = createRepositoryMock(apiKey);
    repository.consumeUsage.mockResolvedValueOnce(null);

    const result = await authenticateBearerApiKey({
      authorizationHeader: `Bearer ${bearerToken}`,
      now: () => fixedNow,
      repository,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["API anahtarı hız limitini aştı."],
      status: 429,
    });
    expect(repository.consumeUsage).toHaveBeenCalledTimes(1);
  });
});
