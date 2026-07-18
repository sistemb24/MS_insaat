import {
  resolveApiKeyStatus,
  type ApiKeyAuthRow,
  type ApiKeyRecord,
  type ApiKeyRepository,
  type ApiKeyRow,
  type ApiKeyScope,
} from "./api-key-service";

type ApiKeyPrismaRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: unknown;
  rateLimitPerSecond: number;
  rateLimitWindowStartedAt: Date | string | null;
  rateLimitWindowCount: number;
  expiresAt: Date | string | null;
  lastUsedAt: Date | string | null;
  revokedAt: Date | string | null;
  revokedBy: string | null;
  createdBy: string;
  createdAt: Date | string;
};

type ApiKeyClient = {
  create(input: { data: ReturnType<typeof recordToCreateData> }): Promise<ApiKeyPrismaRecord>;
  findMany(input: {
    orderBy: Array<{ createdAt: "asc" | "desc" }>;
    where: { tenantId: string; companyId: string; periodId: string };
  }): Promise<ApiKeyPrismaRecord[]>;
  findFirst(input: {
    where: {
      id?: string;
      keyHash?: string;
      tenantId?: string;
      companyId?: string;
      periodId?: string;
      revokedAt?: null;
    };
  }): Promise<ApiKeyPrismaRecord | null>;
  update(input: {
    data: { lastUsedAt?: Date; revokedAt?: Date; revokedBy?: string };
    where: { id: string };
  }): Promise<ApiKeyPrismaRecord>;
  updateMany(input: {
    data: {
      lastUsedAt?: Date;
      rateLimitWindowCount?: { increment: number } | number;
      rateLimitWindowStartedAt?: Date | null;
    };
    where: {
      id?: string;
      keyHash?: string;
      periodId?: string;
      rateLimitWindowCount?: number | { lt?: number; gte?: number };
      rateLimitWindowStartedAt?: Date | null | { lt?: Date; lte?: Date; gt?: Date; gte?: Date };
      revokedAt?: null;
      tenantId?: string;
      companyId?: string;
    };
  }): Promise<{ count: number }>;
};

export type ApiKeyPrismaClientLike = { apiKey: ApiKeyClient };

export type ApiKeyAuthRepository = {
  findByKeyHash(input: { keyHash: string; today: string }): Promise<ApiKeyAuthRow | null>;
  touchLastUsed(input: { id: string; nowIso: string; today: string }): Promise<ApiKeyAuthRow | null>;
  consumeUsage?(input: {
    key: ApiKeyAuthRow;
    nowIso: string;
    today: string;
  }): Promise<ApiKeyAuthRow | null>;
};

export function createApiKeyPrismaRepository(
  prisma: ApiKeyPrismaClientLike,
): ApiKeyRepository & ApiKeyAuthRepository {
  return {
    async list({ scope, today }) {
      const records = await prisma.apiKey.findMany({
        orderBy: [{ createdAt: "desc" }],
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return records.map((record) => recordToRow(record, today));
    },

    async create({ record, today }) {
      const created = await prisma.apiKey.create({ data: recordToCreateData(record) });
      return recordToRow(created, today);
    },

    async revoke({ id, nowIso, scope }) {
      const existing = await prisma.apiKey.findFirst({
        where: {
          companyId: scope.companyId,
          id,
          periodId: scope.periodId,
          revokedAt: null,
          tenantId: scope.tenantId,
        },
      });

      if (!existing) return null;

      const updated = await prisma.apiKey.update({
        data: { revokedAt: new Date(nowIso), revokedBy: scope.userId },
        where: { id: existing.id },
      });

      return recordToRow(updated, nowIso.slice(0, 10));
    },

    async findByKeyHash({ keyHash, today }) {
      const record = await prisma.apiKey.findFirst({
        where: {
          keyHash,
        },
      });

      return record ? recordToAuthRow(record, today) : null;
    },

    async touchLastUsed({ id, nowIso, today }) {
      const record = await prisma.apiKey.findFirst({
        where: {
          id,
        },
      });

      if (!record) return null;

      const updated = await prisma.apiKey.update({
        data: { lastUsedAt: new Date(nowIso) },
        where: { id },
      });

      return recordToAuthRow(updated, today);
    },

    async consumeUsage({ key, nowIso, today }) {
      const currentWindowStart = toSecondIso(nowIso);
      const limit = key.rateLimitPerSecond;
      const nowDate = new Date(nowIso);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const record = await prisma.apiKey.findFirst({
          where: {
            id: key.id,
          },
        });

        if (!record) return null;

        const recordWindowStart = toSecondIso(record.rateLimitWindowStartedAt);
        const recordWindowCount = record.rateLimitWindowCount ?? 0;

        if (recordWindowStart === currentWindowStart) {
          if (recordWindowCount >= limit) return null;

          const incremented = await prisma.apiKey.updateMany({
            data: {
              lastUsedAt: nowDate,
              rateLimitWindowCount: { increment: 1 },
            },
            where: {
              id: key.id,
              rateLimitWindowCount: recordWindowCount,
              rateLimitWindowStartedAt: new Date(currentWindowStart),
              revokedAt: null,
            },
          });

          if (incremented.count > 0) {
            const updated = await prisma.apiKey.findFirst({
              where: {
                id: key.id,
              },
            });

            return updated ? recordToAuthRow(updated, today) : null;
          }
        } else {
          const reset = await prisma.apiKey.updateMany({
            data: {
              lastUsedAt: nowDate,
              rateLimitWindowCount: 1,
              rateLimitWindowStartedAt: new Date(currentWindowStart),
            },
            where: {
              id: key.id,
              rateLimitWindowCount: recordWindowCount,
              rateLimitWindowStartedAt: record.rateLimitWindowStartedAt
                ? new Date(record.rateLimitWindowStartedAt)
                : null,
              revokedAt: null,
            },
          });

          if (reset.count > 0) {
            const updated = await prisma.apiKey.findFirst({
              where: {
                id: key.id,
              },
            });

            return updated ? recordToAuthRow(updated, today) : null;
          }
        }
      }

      return null;
    },
  };
}

function recordToCreateData(record: ApiKeyRecord) {
  return {
    companyId: record.companyId,
    createdAt: new Date(record.createdAt),
    createdBy: record.createdBy,
    expiresAt: record.expiresAt
      ? new Date(`${record.expiresAt}T00:00:00.000Z`)
      : null,
    id: record.id,
    keyHash: record.keyHash,
    keyPrefix: record.keyPrefix,
    lastUsedAt: null,
    name: record.name,
    periodId: record.periodId,
    rateLimitPerSecond: record.rateLimitPerSecond,
    rateLimitWindowCount: 0,
    rateLimitWindowStartedAt: null,
    revokedAt: null,
    revokedBy: null,
    scopes: record.scopes,
    tenantId: record.tenantId,
  };
}

function recordToRow(record: ApiKeyPrismaRecord, today: string): ApiKeyRow {
  const dateFields = {
    expiresAt: record.expiresAt ? formatDateOnly(record.expiresAt) : "",
    revokedAt: record.revokedAt ? formatIso(record.revokedAt) : "",
  };

  return {
    createdAt: formatIso(record.createdAt),
    createdBy: record.createdBy,
    expiresAt: dateFields.expiresAt,
    id: record.id,
    keyPrefix: record.keyPrefix,
    lastUsedAt: record.lastUsedAt ? formatIso(record.lastUsedAt) : "",
    name: record.name,
    rateLimitPerSecond: record.rateLimitPerSecond,
    revokedAt: dateFields.revokedAt,
    revokedBy: record.revokedBy ?? "",
    scopes: normalizeScopes(record.scopes),
    status: resolveApiKeyStatus(dateFields, today),
  };
}

function recordToAuthRow(
  record: ApiKeyPrismaRecord,
  today: string,
): ApiKeyAuthRow {
  return {
    ...recordToRow(record, today),
    companyId: record.companyId,
    rateLimitWindowCount: record.rateLimitWindowCount ?? 0,
    rateLimitWindowStartedAt: record.rateLimitWindowStartedAt
      ? formatIso(record.rateLimitWindowStartedAt)
      : "",
    periodId: record.periodId,
    tenantId: record.tenantId,
  };
}

function normalizeScopes(value: unknown): ApiKeyScope[] {
  return Array.isArray(value)
    ? value.filter((scope): scope is ApiKeyScope => typeof scope === "string")
    : [];
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function formatDateOnly(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function toSecondIso(value: Date | string | null) {
  if (!value) return "";

  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 19) + ".000Z";
}
