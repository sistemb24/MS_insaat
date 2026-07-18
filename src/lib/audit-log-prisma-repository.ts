import type {
  AuditLogEntry,
  AuditLogEntryInput,
  AuditLogListByEntityTypeInput,
  AuditLogReadRepository,
  AuditLogRepository,
} from "./audit-log";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

type AuditLogRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  occurredAt: Date | string;
  createdAt: Date | string;
  metadata: unknown;
};

type AuditLogClient = {
  create(input: {
    data: {
      tenantId: string;
      companyId: string;
      periodId: string;
      actorUserId: string;
      action: string;
      entityType: string;
      entityId: string;
      entityLabel: string;
      occurredAt: Date;
      metadata: Record<string, unknown>;
    };
  }): Promise<unknown>;
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
      entityType: string;
    };
    orderBy: Array<{ occurredAt: "desc" } | { createdAt: "desc" }>;
    take: number;
  }): Promise<AuditLogRecord[]>;
};

export type AuditLogPrismaClientLike = {
  auditLog: AuditLogClient;
};

export function createAuditLogPrismaRepository(
  prisma: AuditLogPrismaClientLike,
): AuditLogRepository & AuditLogReadRepository {
  return {
    async record(entry: AuditLogEntryInput) {
      await prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          companyId: entry.companyId,
          periodId: entry.periodId,
          actorUserId: entry.actorUserId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityLabel: entry.entityLabel,
          occurredAt: new Date(entry.occurredAt),
          metadata: normalizeMetadata(entry.metadata),
        },
      });
    },

    async listByEntityType({
      entityType,
      limit = 50,
      scope,
    }: AuditLogListByEntityTypeInput) {
      const rows = await prisma.auditLog.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
          entityType,
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: limit,
      });

      return rows.map(recordToEntry);
    },
  };
}

function recordToEntry(record: AuditLogRecord): AuditLogEntry {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    actorUserId: record.actorUserId,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    entityLabel: record.entityLabel,
    occurredAt: formatIso(record.occurredAt),
    createdAt: formatIso(record.createdAt),
    metadata: normalizeMetadata(readMetadata(record.metadata)),
  };
}

function normalizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  if (!Object.hasOwn(metadata, "currency")) {
    return metadata;
  }

  return {
    ...metadata,
    currency: getP0BaseCurrencyTransactionValue(),
  };
}

function readMetadata(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

