import { createHash, randomBytes, randomUUID } from "node:crypto";

import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  API_KEY_SCOPES,
  type ApiKeyOverview,
  type ApiKeyRow,
  type ApiKeyScope,
  type ApiKeyStatus,
  type CreateApiKeyValues,
} from "./api-key-contract";
import type { TenantScope } from "./tenant-scope";

export { API_KEY_SCOPES } from "./api-key-contract";
export type {
  ApiKeyOverview,
  ApiKeyRow,
  ApiKeyScope,
  ApiKeyStatus,
  CreateApiKeyValues,
} from "./api-key-contract";

export type ApiKeyRecord = Omit<ApiKeyRow, "status"> & {
  tenantId: string;
  companyId: string;
  periodId: string;
  keyHash: string;
};

export type ApiKeyAuthRow = ApiKeyRow & {
  tenantId: string;
  companyId: string;
  periodId: string;
  rateLimitWindowCount: number;
  rateLimitWindowStartedAt: string;
};

export type ApiKeyRepository = {
  list(input: { scope: TenantScope; today: string }): Promise<ApiKeyRow[]>;
  create(input: { record: ApiKeyRecord; today: string }): Promise<ApiKeyRow>;
  revoke(input: {
    id: string;
    nowIso: string;
    scope: TenantScope;
  }): Promise<ApiKeyRow | null>;
  findByKeyHash?(input: { keyHash: string; today: string }): Promise<ApiKeyAuthRow | null>;
  consumeUsage?(
    input: {
      key: ApiKeyAuthRow;
      nowIso: string;
      today: string;
    },
  ): Promise<ApiKeyAuthRow | null>;
};

type ApiKeyServiceDependencies = {
  auditLogRepository: AuditLogRepository;
  repository: ApiKeyRepository;
  generateSecret?: () => string;
  generateId?: () => string;
  now?: () => Date;
};

const allowedScopeKeys = new Set<string>(API_KEY_SCOPES.map((scope) => scope.key));

export function createApiKeyService({
  auditLogRepository,
  repository,
  generateSecret = generateApiKeySecret,
  generateId = randomUUID,
  now = () => new Date(),
}: ApiKeyServiceDependencies) {
  return {
    async listOverview(input: { scope: TenantScope }) {
      const today = toDateKey(now());
      const rows = await repository.list({ scope: input.scope, today });

      return {
        ok: true as const,
        data: { overview: buildApiKeyOverview(rows) },
      };
    },

    async createKey(input: { scope: TenantScope; values: CreateApiKeyValues }) {
      if (input.scope.userRole !== "admin") {
        return {
          ok: false as const,
          errors: ["API anahtarı oluşturma yetkisi yalnız admin rolündedir."],
        };
      }

      const invalidScopes = input.values.scopes.filter(
        (scope) => !allowedScopeKeys.has(scope),
      );
      const normalized = normalizeCreateApiKeyValues(input.values);
      const nowDate = now();
      const errors = validateCreateApiKeyValues(normalized, toDateKey(nowDate));

      if (invalidScopes.length > 0) {
        errors.push("Geçersiz API kapsamı seçildi.");
      }

      if (errors.length > 0) {
        return { ok: false as const, errors };
      }

      const secret = generateSecret();
      const nowIso = nowDate.toISOString();
      const row = await repository.create({
        record: {
          companyId: input.scope.companyId,
          createdAt: nowIso,
          createdBy: input.scope.userId,
          expiresAt: normalized.expiresAt,
          id: generateId(),
          keyHash: hashApiKeySecret(secret),
          keyPrefix: getApiKeyPrefix(secret),
          lastUsedAt: "",
          name: normalized.name,
          periodId: input.scope.periodId,
          rateLimitPerSecond: normalized.rateLimitPerSecond,
          revokedAt: "",
          revokedBy: "",
          scopes: normalized.scopes,
          tenantId: input.scope.tenantId,
        },
        today: toDateKey(nowDate),
      });

      await auditLogRepository.record(
        createAuditLogEntry(input.scope, {
          action: "api-key.create",
          entityId: row.id,
          entityLabel: row.name,
          entityType: "api-key",
          metadata: {
            expiresAt: row.expiresAt || null,
            keyPrefix: row.keyPrefix,
            rateLimitPerSecond: row.rateLimitPerSecond,
            scopes: row.scopes,
            status: row.status,
          },
          occurredAt: nowIso,
        }),
      );

      return {
        ok: true as const,
        data: { row, secret },
      };
    },

    async revokeKey(input: { id: string; scope: TenantScope }) {
      if (input.scope.userRole !== "admin") {
        return {
          ok: false as const,
          errors: ["API anahtarı iptal etme yetkisi yalnız admin rolündedir."],
        };
      }

      const id = input.id.trim();

      if (!id) {
        return { ok: false as const, errors: ["API anahtarı kimliği zorunludur."] };
      }

      const nowIso = now().toISOString();
      const row = await repository.revoke({ id, nowIso, scope: input.scope });

      if (!row) {
        return {
          ok: false as const,
          errors: ["Aktif API anahtarı bulunamadı."],
        };
      }

      await auditLogRepository.record(
        createAuditLogEntry(input.scope, {
          action: "api-key.revoke",
          entityId: row.id,
          entityLabel: row.name,
          entityType: "api-key",
          metadata: {
            keyPrefix: row.keyPrefix,
            status: row.status,
          },
          occurredAt: nowIso,
        }),
      );

      return { ok: true as const, data: { row } };
    },
  };
}

export function normalizeCreateApiKeyValues(
  values: CreateApiKeyValues,
): CreateApiKeyValues & { scopes: ApiKeyScope[]; expiresAt: string } {
  return {
    expiresAt: values.expiresAt?.trim() ?? "",
    name: values.name.trim().replace(/\s+/g, " "),
    rateLimitPerSecond: Number(values.rateLimitPerSecond),
    scopes: API_KEY_SCOPES.map((scope) => scope.key).filter((scope) =>
      new Set(values.scopes).has(scope),
    ),
  };
}

export function validateCreateApiKeyValues(
  values: ReturnType<typeof normalizeCreateApiKeyValues>,
  today: string,
) {
  const errors: string[] = [];

  if (values.name.length < 3 || values.name.length > 80) {
    errors.push("Anahtar adı 3 ile 80 karakter arasında olmalıdır.");
  }

  if (values.scopes.length === 0) {
    errors.push("En az bir API kapsamı seçilmelidir.");
  }

  if (values.scopes.some((scope) => !allowedScopeKeys.has(scope))) {
    errors.push("Geçersiz API kapsamı seçildi.");
  }

  if (
    !Number.isInteger(values.rateLimitPerSecond) ||
    values.rateLimitPerSecond < 1 ||
    values.rateLimitPerSecond > 100
  ) {
    errors.push("Hız limiti saniyede 1 ile 100 istek arasında olmalıdır.");
  }

  if (values.expiresAt) {
    if (!isValidDateKey(values.expiresAt)) {
      errors.push("Son kullanım tarihi geçerli bir tarih olmalıdır.");
    } else if (values.expiresAt <= today) {
      errors.push("Son kullanım tarihi bugünden sonra olmalıdır.");
    }
  }

  return errors;
}

export function buildApiKeyOverview(rows: ApiKeyRow[]): ApiKeyOverview {
  return {
    rows,
    summary: {
      activeCount: rows.filter((row) => row.status === "active").length,
      expiredCount: rows.filter((row) => row.status === "expired").length,
      revokedCount: rows.filter((row) => row.status === "revoked").length,
      totalCount: rows.length,
    },
  };
}

export function resolveApiKeyStatus(
  row: Pick<ApiKeyRecord, "expiresAt" | "revokedAt">,
  today: string,
): ApiKeyStatus {
  if (row.revokedAt) return "revoked";
  if (row.expiresAt && row.expiresAt < today) return "expired";
  return "active";
}

export function generateApiKeySecret() {
  return `noa_live_${randomBytes(24).toString("base64url")}`;
}

export function hashApiKeySecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function getApiKeyPrefix(secret: string) {
  return secret.slice(0, 17);
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
