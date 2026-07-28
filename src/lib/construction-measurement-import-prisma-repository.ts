/* eslint-disable @typescript-eslint/no-explicit-any -- narrow Prisma client contract for transaction tests */

import { randomUUID } from "node:crypto";

import {
  CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION,
  CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES,
  CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS,
  type ConstructionMeasurementImportParseResult,
  type ConstructionMeasurementImportRow,
  type ConstructionMeasurementImportStatus,
} from "./construction-measurement-import";
import { recalculateConstructionMeasurementSnapshots } from "./construction-progress-payment-recalculation-prisma";
import type { TenantScope } from "./tenant-scope";

type ImportClient = {
  constructionMeasurementImportBatch: {
    create(input: any): Promise<any>;
    findFirst(input: any): Promise<any | null>;
    findMany(input: any): Promise<any[]>;
    updateMany(input: any): Promise<{ count: number }>;
  };
  constructionMeasurementImportRow: {
    updateMany(input: any): Promise<{ count: number }>;
  };
  constructionMeasurementImportEvent: {
    create(input: any): Promise<any>;
  };
  constructionProject: {
    findFirst(input: any): Promise<any | null>;
  };
  constructionProgressPayment: {
    findFirst(input: any): Promise<any | null>;
    update(input: any): Promise<any>;
  };
  constructionContractItem: {
    count(input: any): Promise<number>;
  };
  constructionMeasurementSheet: {
    create(input: any): Promise<any>;
  };
  constructionMeasurementLine: {
    createMany(input: any): Promise<{ count: number }>;
  };
  constructionPaymentItemSnapshot: {
    deleteMany(input: any): Promise<{ count: number }>;
  };
  period: {
    findFirst(input: any): Promise<{ isClosed: boolean } | null>;
  };
  auditLog: {
    create(input: any): Promise<any>;
  };
};

export type ConstructionMeasurementImportPrismaClientLike = ImportClient & {
  $transaction<T>(callback: (transaction: ImportClient) => Promise<T>): Promise<T>;
};

export type ConstructionMeasurementImportBatchSnapshot = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  projectId: string;
  sourceProgressPaymentId: string;
  batchNo: number;
  status: ConstructionMeasurementImportStatus;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  fileSha256: string;
  mappingVersion: string;
  delimiter: ";" | ",";
  totalRowCount: number;
  validRowCount: number;
  errorRowCount: number;
  sourceProgressPaymentUpdatedAt: string;
  sourceSnapshotAt: string;
  targetSheetId: string | null;
  failureCode: string | null;
  createdBy: string;
  validatedBy: string | null;
  appliedBy: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
  validatedAt: string | null;
  appliedAt: string | null;
  cancelledAt: string | null;
  rows: Array<ConstructionMeasurementImportRow & {
    id: string;
    appliedMeasurementLineId: string | null;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    eventType: "CREATED" | "VALIDATED" | "APPLIED" | "CANCELLED" | "FAILED";
    actorUserId: string;
    metadata: unknown;
    createdAt: string;
  }>;
};

export type ConstructionMeasurementImportBatchSummary = Omit<
  ConstructionMeasurementImportBatchSnapshot,
  "rows" | "events"
>;

export type ConstructionMeasurementImportWriteResult = {
  kind: "created" | "updated" | "idempotent";
  batch: ConstructionMeasurementImportBatchSnapshot;
};

export class ConstructionMeasurementImportRepositoryError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "SCOPE_MISMATCH"
      | "PERIOD_CLOSED"
      | "INVALID_STATUS"
      | "INVALID_STAGING_DATA"
      | "SOURCE_STALE"
      | "CONCURRENCY_CONFLICT"
      | "PERSISTENCE_INVARIANT",
    message: string,
  ) {
    super(message);
    this.name = "ConstructionMeasurementImportRepositoryError";
  }
}

export function createConstructionMeasurementImportPrismaRepository(
  prisma: ConstructionMeasurementImportPrismaClientLike,
  options: {
    createId?: () => string;
    recalculateSnapshots?: typeof recalculateConstructionMeasurementSnapshots;
  } = {},
) {
  const createId = options.createId ?? randomUUID;
  const recalculateSnapshots =
    options.recalculateSnapshots ?? recalculateConstructionMeasurementSnapshots;

  return {
    async listProjectBatches(input: {
      scope: TenantScope;
      projectId: string;
      statuses?: ConstructionMeasurementImportStatus[];
    }): Promise<ConstructionMeasurementImportBatchSummary[]> {
      const records = await prisma.constructionMeasurementImportBatch.findMany({
        where: scopedBatchWhere(input.scope, {
          projectId: input.projectId,
          ...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
        }),
        orderBy: [{ createdAt: "desc" }, { batchNo: "desc" }],
      });
      return records.map(batchRecordToSummary);
    },

    async findBatch(input: {
      scope: TenantScope;
      batchId: string;
    }): Promise<ConstructionMeasurementImportBatchSnapshot | null> {
      const record = await prisma.constructionMeasurementImportBatch.findFirst({
        where: scopedBatchWhere(input.scope, { id: input.batchId }),
        include: batchDetailInclude(),
      });
      return record ? batchRecordToSnapshot(record) : null;
    },

    async createBatch(input: {
      scope: TenantScope;
      projectId: string;
      sourceProgressPaymentId: string;
      parseResult: ConstructionMeasurementImportParseResult;
      nowIso: string;
    }): Promise<ConstructionMeasurementImportWriteResult> {
      validateParseResult(input.parseResult);
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.constructionMeasurementImportBatch.findFirst({
          where: scopedBatchWhere(input.scope, {
            projectId: input.projectId,
            sourceProgressPaymentId: input.sourceProgressPaymentId,
            fileSha256: input.parseResult.fileSha256,
            mappingVersion: input.parseResult.mappingVersion,
          }),
          include: batchDetailInclude(),
        });
        if (existing) {
          return { kind: "idempotent", batch: batchRecordToSnapshot(existing) };
        }

        await ensureOpenPeriod(transaction, input.scope);
        const source = await readSourceVersion(transaction, {
          scope: input.scope,
          projectId: input.projectId,
          sourceProgressPaymentId: input.sourceProgressPaymentId,
        });
        await validateRowReferences(transaction, {
          scope: input.scope,
          projectId: input.projectId,
          rows: input.parseResult.rows,
          activeOnly: false,
        });
        const latest = await transaction.constructionMeasurementImportBatch.findFirst({
          where: scopedBatchWhere(input.scope, { projectId: input.projectId }),
          orderBy: { batchNo: "desc" },
          select: { batchNo: true },
        });
        const now = validDate(input.nowIso);
        const batchId = createId();
        const batchNo = Number(latest?.batchNo ?? 0) + 1;
        const rowData = input.parseResult.rows.map((row) => ({
          id: createId(),
          rowNo: row.rowNo,
          sourceItemCode: row.sourceItemCode,
          contractItemId: row.contractItemId,
          description: row.description,
          sourceUnit: row.sourceUnit,
          resolvedUnit: row.resolvedUnit,
          quantity: row.quantity,
          status: row.status,
          errorCode: row.errorCode,
          createdAt: now,
        }));
        const record = await transaction.constructionMeasurementImportBatch.create({
          data: {
            id: batchId,
            tenantId: input.scope.tenantId,
            companyId: input.scope.companyId,
            periodId: input.scope.periodId,
            projectId: input.projectId,
            sourceProgressPaymentId: input.sourceProgressPaymentId,
            batchNo,
            status: "DRAFT",
            originalFileName: input.parseResult.originalFileName,
            contentType: input.parseResult.contentType,
            fileSize: input.parseResult.fileSize,
            fileSha256: input.parseResult.fileSha256,
            mappingVersion: input.parseResult.mappingVersion,
            delimiter: input.parseResult.delimiter,
            totalRowCount: input.parseResult.summary.totalRowCount,
            validRowCount: input.parseResult.summary.validRowCount,
            errorRowCount: input.parseResult.summary.errorRowCount,
            sourceProgressPaymentUpdatedAt: source.paymentUpdatedAt,
            sourceSnapshotAt: source.snapshotAt,
            createdBy: input.scope.userId,
            createdAt: now,
            updatedAt: now,
            rows: { createMany: { data: rowData } },
            events: {
              create: {
                id: createId(),
                eventType: "CREATED",
                actorUserId: input.scope.userId,
                metadata: safeEventMetadata(input.parseResult),
                createdAt: now,
              },
            },
          },
          include: batchDetailInclude(),
        });
        await createAudit(transaction, {
          scope: input.scope,
          action: "CONSTRUCTION_MEASUREMENT_IMPORT_CREATED",
          batchId: record.id,
          batchNo: record.batchNo,
          projectId: input.projectId,
          sourceProgressPaymentId: input.sourceProgressPaymentId,
          metadata: {
            ...safeEventMetadata(input.parseResult),
            statusFrom: null,
            statusTo: "DRAFT",
          },
          occurredAt: now,
        });
        return { kind: "created", batch: batchRecordToSnapshot(record) };
      });
    },

    async validateBatch(input: {
      scope: TenantScope;
      batchId: string;
      nowIso: string;
    }): Promise<ConstructionMeasurementImportWriteResult> {
      return prisma.$transaction(async (transaction) => {
        const existing = await findScopedBatchOrThrow(
          transaction,
          input.scope,
          input.batchId,
        );
        if (existing.status === "VALIDATED") {
          return { kind: "idempotent", batch: batchRecordToSnapshot(existing) };
        }
        if (existing.status !== "DRAFT") {
          throw repositoryError("INVALID_STATUS", "Yalnız taslak import doğrulanabilir.");
        }
        assertBatchRowsReady(existing);
        await ensureOpenPeriod(transaction, input.scope);
        await ensureSourceCurrent(transaction, input.scope, existing);
        await validateRowReferences(transaction, {
          scope: input.scope,
          projectId: existing.projectId,
          rows: existing.rows,
          activeOnly: true,
        });
        const now = validDate(input.nowIso);
        const updated = await transaction.constructionMeasurementImportBatch.updateMany({
          where: scopedBatchWhere(input.scope, {
            id: existing.id,
            status: "DRAFT",
          }),
          data: {
            status: "VALIDATED",
            validatedBy: input.scope.userId,
            validatedAt: now,
            updatedAt: now,
          },
        });
        if (updated.count !== 1) throw concurrencyError();
        await createEvent(transaction, {
          batchId: existing.id,
          eventType: "VALIDATED",
          actorUserId: input.scope.userId,
          metadata: countMetadata(existing),
          createdAt: now,
          createId,
        });
        await createAudit(transaction, {
          scope: input.scope,
          action: "CONSTRUCTION_MEASUREMENT_IMPORT_VALIDATED",
          batchId: existing.id,
          batchNo: existing.batchNo,
          projectId: existing.projectId,
          sourceProgressPaymentId: existing.sourceProgressPaymentId,
          metadata: {
            ...countMetadata(existing),
            statusFrom: "DRAFT",
            statusTo: "VALIDATED",
          },
          occurredAt: now,
        });
        return {
          kind: "updated",
          batch: await reloadBatch(transaction, input.scope, existing.id),
        };
      });
    },

    async applyBatch(input: {
      scope: TenantScope;
      batchId: string;
      nowIso: string;
    }): Promise<ConstructionMeasurementImportWriteResult> {
      return prisma.$transaction(async (transaction) => {
        const existing = await findScopedBatchOrThrow(
          transaction,
          input.scope,
          input.batchId,
        );
        if (existing.status === "APPLIED") {
          return { kind: "idempotent", batch: batchRecordToSnapshot(existing) };
        }
        if (existing.status !== "VALIDATED") {
          throw repositoryError(
            "INVALID_STATUS",
            "Yalnız doğrulanmış import uygulanabilir.",
          );
        }
        assertBatchRowsReady(existing);
        await ensureOpenPeriod(transaction, input.scope);
        const source = await ensureSourceCurrent(transaction, input.scope, existing);
        if (!["DRAFT", "RETURNED"].includes(source.paymentStatus)) {
          throw repositoryError(
            "INVALID_STATUS",
            "Yalnız taslak veya iade edilmiş hakedişe import uygulanabilir.",
          );
        }
        await validateRowReferences(transaction, {
          scope: input.scope,
          projectId: existing.projectId,
          rows: existing.rows,
          activeOnly: true,
        });

        const now = validDate(input.nowIso);
        const sheetId = createId();
        const sheetNo = `IMP-${String(existing.batchNo).padStart(4, "0")}`;
        await transaction.constructionMeasurementSheet.create({
          data: {
            id: sheetId,
            tenantId: input.scope.tenantId,
            companyId: input.scope.companyId,
            periodId: input.scope.periodId,
            progressPaymentId: existing.sourceProgressPaymentId,
            sheetNo,
            sheetType: "GENERAL",
            title: `CSV Metraj Importu ${existing.batchNo}`,
            status: "DRAFT",
            createdBy: input.scope.userId,
            updatedBy: input.scope.userId,
            createdAt: now,
            updatedAt: now,
          },
        });
        const orderedRows = [...existing.rows].sort((left, right) =>
          left.rowNo - right.rowNo);
        const lines = orderedRows.map((row, index) => ({
          importRowId: row.id,
          data: {
            id: createId(),
            tenantId: input.scope.tenantId,
            companyId: input.scope.companyId,
            periodId: input.scope.periodId,
            progressPaymentId: existing.sourceProgressPaymentId,
            measurementSheetId: sheetId,
            contractItemId: row.contractItemId,
            lineNo: index + 1,
            measurementType: "GENERAL",
            description: row.description || `CSV ${row.sourceItemCode}`,
            unit: row.resolvedUnit,
            quantity: decimalNumber(row.quantity),
            length: null,
            width: null,
            height: null,
            multiplier: 1,
            createdBy: input.scope.userId,
            updatedBy: input.scope.userId,
            createdAt: now,
            updatedAt: now,
          },
        }));
        const createdLines = await transaction.constructionMeasurementLine.createMany({
          data: lines.map((line) => line.data),
        });
        if (createdLines.count !== lines.length) {
          throw repositoryError(
            "PERSISTENCE_INVARIANT",
            "Import metraj satırlarının tamamı oluşturulamadı.",
          );
        }
        for (const line of lines) {
          const rowUpdate = await transaction.constructionMeasurementImportRow.updateMany({
            where: {
              id: line.importRowId,
              batchId: existing.id,
              appliedMeasurementLineId: null,
            },
            data: { appliedMeasurementLineId: line.data.id },
          });
          if (rowUpdate.count !== 1) throw concurrencyError();
        }

        await recalculateSnapshots(
          transaction,
          existing.sourceProgressPaymentId,
          input.scope,
        );
        const updated = await transaction.constructionMeasurementImportBatch.updateMany({
          where: scopedBatchWhere(input.scope, {
            id: existing.id,
            status: "VALIDATED",
            targetSheetId: null,
          }),
          data: {
            status: "APPLIED",
            targetSheetId: sheetId,
            appliedBy: input.scope.userId,
            appliedAt: now,
            updatedAt: now,
          },
        });
        if (updated.count !== 1) throw concurrencyError();
        await createEvent(transaction, {
          batchId: existing.id,
          eventType: "APPLIED",
          actorUserId: input.scope.userId,
          metadata: {
            ...countMetadata(existing),
            targetSheetId: sheetId,
            sheetNo,
          },
          createdAt: now,
          createId,
        });
        await createAudit(transaction, {
          scope: input.scope,
          action: "CONSTRUCTION_MEASUREMENT_IMPORT_APPLIED",
          batchId: existing.id,
          batchNo: existing.batchNo,
          projectId: existing.projectId,
          sourceProgressPaymentId: existing.sourceProgressPaymentId,
          metadata: {
            ...countMetadata(existing),
            statusFrom: "VALIDATED",
            statusTo: "APPLIED",
            targetSheetId: sheetId,
          },
          occurredAt: now,
        });
        return {
          kind: "updated",
          batch: await reloadBatch(transaction, input.scope, existing.id),
        };
      });
    },

    async cancelBatch(input: {
      scope: TenantScope;
      batchId: string;
      nowIso: string;
    }): Promise<ConstructionMeasurementImportWriteResult> {
      return prisma.$transaction(async (transaction) => {
        const existing = await findScopedBatchOrThrow(
          transaction,
          input.scope,
          input.batchId,
        );
        if (existing.status === "CANCELLED") {
          return { kind: "idempotent", batch: batchRecordToSnapshot(existing) };
        }
        if (!["DRAFT", "VALIDATED"].includes(existing.status)) {
          throw repositoryError(
            "INVALID_STATUS",
            "Yalnız uygulanmamış import iptal edilebilir.",
          );
        }
        await ensureOpenPeriod(transaction, input.scope);
        const now = validDate(input.nowIso);
        const updated = await transaction.constructionMeasurementImportBatch.updateMany({
          where: scopedBatchWhere(input.scope, {
            id: existing.id,
            status: existing.status,
          }),
          data: {
            status: "CANCELLED",
            cancelledBy: input.scope.userId,
            cancelledAt: now,
            updatedAt: now,
          },
        });
        if (updated.count !== 1) throw concurrencyError();
        await createEvent(transaction, {
          batchId: existing.id,
          eventType: "CANCELLED",
          actorUserId: input.scope.userId,
          metadata: { previousStatus: existing.status },
          createdAt: now,
          createId,
        });
        await createAudit(transaction, {
          scope: input.scope,
          action: "CONSTRUCTION_MEASUREMENT_IMPORT_CANCELLED",
          batchId: existing.id,
          batchNo: existing.batchNo,
          projectId: existing.projectId,
          sourceProgressPaymentId: existing.sourceProgressPaymentId,
          metadata: {
            statusFrom: existing.status,
            statusTo: "CANCELLED",
          },
          occurredAt: now,
        });
        return {
          kind: "updated",
          batch: await reloadBatch(transaction, input.scope, existing.id),
        };
      });
    },
  };
}

function scopedBatchWhere(
  scope: TenantScope,
  extra: Record<string, unknown> = {},
) {
  return {
    ...extra,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
  };
}

function batchDetailInclude() {
  return {
    rows: { orderBy: { rowNo: "asc" } },
    events: { orderBy: { createdAt: "asc" } },
  };
}

async function findScopedBatchOrThrow(
  transaction: ImportClient,
  scope: TenantScope,
  batchId: string,
) {
  const record = await transaction.constructionMeasurementImportBatch.findFirst({
    where: scopedBatchWhere(scope, { id: batchId }),
    include: batchDetailInclude(),
  });
  if (!record) {
    throw repositoryError(
      "NOT_FOUND",
      "Import batch'i aktif kapsamda bulunamadı.",
    );
  }
  return record;
}

async function reloadBatch(
  transaction: ImportClient,
  scope: TenantScope,
  batchId: string,
) {
  const record = await transaction.constructionMeasurementImportBatch.findFirst({
    where: scopedBatchWhere(scope, { id: batchId }),
    include: batchDetailInclude(),
  });
  if (!record) {
    throw repositoryError(
      "PERSISTENCE_INVARIANT",
      "Import batch'i mutation sonrasında yüklenemedi.",
    );
  }
  return batchRecordToSnapshot(record);
}

async function ensureOpenPeriod(transaction: ImportClient, scope: TenantScope) {
  const period = await transaction.period.findFirst({
    where: {
      id: scope.periodId,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
    },
    select: { isClosed: true },
  });
  if (!period) {
    throw repositoryError("SCOPE_MISMATCH", "Aktif dönem kapsamı bulunamadı.");
  }
  if (period.isClosed) {
    throw repositoryError("PERIOD_CLOSED", "Kapalı dönemde import değiştirilemez.");
  }
}

async function readSourceVersion(
  transaction: ImportClient,
  input: {
    scope: TenantScope;
    projectId: string;
    sourceProgressPaymentId: string;
  },
) {
  const project = await transaction.constructionProject.findFirst({
    where: {
      id: input.projectId,
      tenantId: input.scope.tenantId,
      companyId: input.scope.companyId,
      periodId: input.scope.periodId,
    },
    select: { id: true },
  });
  const payment = await transaction.constructionProgressPayment.findFirst({
    where: {
      id: input.sourceProgressPaymentId,
      projectId: input.projectId,
      tenantId: input.scope.tenantId,
      companyId: input.scope.companyId,
      periodId: input.scope.periodId,
    },
    select: {
      id: true,
      projectId: true,
      status: true,
      updatedAt: true,
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  if (!project || !payment || !payment.snapshots?.[0]) {
    throw repositoryError(
      "SCOPE_MISMATCH",
      "Proje, kaynak hakediş veya snapshot aktif kapsamda bulunamadı.",
    );
  }
  return {
    paymentUpdatedAt: validDate(payment.updatedAt),
    snapshotAt: validDate(payment.snapshots[0].createdAt),
    paymentStatus: String(payment.status),
  };
}

async function ensureSourceCurrent(
  transaction: ImportClient,
  scope: TenantScope,
  batch: any,
) {
  const current = await readSourceVersion(transaction, {
    scope,
    projectId: batch.projectId,
    sourceProgressPaymentId: batch.sourceProgressPaymentId,
  });
  if (
    current.paymentUpdatedAt.getTime()
      !== validDate(batch.sourceProgressPaymentUpdatedAt).getTime()
    || current.snapshotAt.getTime() !== validDate(batch.sourceSnapshotAt).getTime()
  ) {
    throw repositoryError(
      "SOURCE_STALE",
      "Kaynak hakediş veya snapshot değişti; yeni import batch'i oluşturun.",
    );
  }
  return current;
}

async function validateRowReferences(
  transaction: ImportClient,
  input: {
    scope: TenantScope;
    projectId: string;
    rows: ConstructionMeasurementImportRow[];
    activeOnly: boolean;
  },
) {
  const contractItemIds = [
    ...new Set(
      input.rows
        .map((row) => row.contractItemId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (!contractItemIds.length) return;
  const count = await transaction.constructionContractItem.count({
    where: {
      id: { in: contractItemIds },
      projectId: input.projectId,
      ...(input.activeOnly ? { isActive: true } : {}),
      tenantId: input.scope.tenantId,
      companyId: input.scope.companyId,
      periodId: input.scope.periodId,
    },
  });
  if (count !== contractItemIds.length) {
    throw repositoryError(
      "SCOPE_MISMATCH",
      "Import satırlarındaki sözleşme pozları aktif proje kapsamıyla uyuşmuyor.",
    );
  }
}

function validateParseResult(result: ConstructionMeasurementImportParseResult) {
  const uniqueRowNumbers = new Set(result.rows.map((row) => row.rowNo));
  const rowContractsValid = result.rows.every((row) =>
    Number.isInteger(row.rowNo)
    && row.rowNo >= 2
    && (
      row.status === "READY"
        ? (
            row.errorCode === null
            && Boolean(row.contractItemId)
            && row.quantity !== null
            && Number.isFinite(row.quantity)
            && row.quantity > 0
          )
        : row.status === "ERROR" && row.errorCode !== null
    ));
  const summaryMatches =
    result.summary.totalRowCount === result.rows.length
    && result.summary.validRowCount
      === result.rows.filter((row) => row.status === "READY").length
    && result.summary.errorRowCount
      === result.rows.filter((row) => row.status === "ERROR").length;
  if (
    result.fileErrors.length
    || !result.delimiter
    || !result.rows.length
    || result.mappingVersion !== CONSTRUCTION_MEASUREMENT_IMPORT_MAPPING_VERSION
    || result.fileSize < 1
    || result.rows.length > CONSTRUCTION_MEASUREMENT_IMPORT_MAX_ROWS
    || result.fileSize > CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES
    || !/^[a-f0-9]{64}$/.test(result.fileSha256)
    || uniqueRowNumbers.size !== result.rows.length
    || !rowContractsValid
    || result.canValidate !== (result.summary.errorRowCount === 0)
    || !summaryMatches
  ) {
    throw repositoryError(
      "INVALID_STAGING_DATA",
      "Import staging sonucu kalıcılaştırma sözleşmesiyle uyuşmuyor.",
    );
  }
}

function assertBatchRowsReady(batch: any) {
  const rows = Array.isArray(batch.rows) ? batch.rows : [];
  if (
    !rows.length
    || batch.errorRowCount !== 0
    || batch.validRowCount !== rows.length
    || rows.some((row: any) =>
      row.status !== "READY"
      || row.errorCode
      || !row.contractItemId
      || decimalNumber(row.quantity) <= 0)
  ) {
    throw repositoryError(
      "INVALID_STAGING_DATA",
      "Hatalı veya eksik satır içeren import doğrulanamaz.",
    );
  }
}

async function createEvent(
  transaction: ImportClient,
  input: {
    batchId: string;
    eventType: string;
    actorUserId: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    createId: () => string;
  },
) {
  await transaction.constructionMeasurementImportEvent.create({
    data: {
      id: input.createId(),
      batchId: input.batchId,
      eventType: input.eventType,
      actorUserId: input.actorUserId,
      metadata: input.metadata,
      createdAt: input.createdAt,
    },
  });
}

async function createAudit(
  transaction: ImportClient,
  input: {
    scope: TenantScope;
    action:
      | "CONSTRUCTION_MEASUREMENT_IMPORT_CREATED"
      | "CONSTRUCTION_MEASUREMENT_IMPORT_VALIDATED"
      | "CONSTRUCTION_MEASUREMENT_IMPORT_APPLIED"
      | "CONSTRUCTION_MEASUREMENT_IMPORT_CANCELLED";
    batchId: string;
    batchNo: number;
    projectId: string;
    sourceProgressPaymentId: string;
    metadata: Record<string, unknown>;
    occurredAt: Date;
  },
) {
  await transaction.auditLog.create({
    data: {
      tenantId: input.scope.tenantId,
      companyId: input.scope.companyId,
      periodId: input.scope.periodId,
      actorUserId: input.scope.userId,
      action: input.action,
      entityType: "construction-measurement-import",
      entityId: input.batchId,
      entityLabel: `IMP-${String(input.batchNo).padStart(4, "0")}`,
      occurredAt: input.occurredAt,
      metadata: {
        batchId: input.batchId,
        projectId: input.projectId,
        sourceProgressPaymentId: input.sourceProgressPaymentId,
        ...input.metadata,
      },
    },
  });
}

function safeEventMetadata(result: ConstructionMeasurementImportParseResult) {
  return {
    mappingVersion: result.mappingVersion,
    totalRowCount: result.summary.totalRowCount,
    validRowCount: result.summary.validRowCount,
    errorRowCount: result.summary.errorRowCount,
  };
}

function countMetadata(batch: any) {
  return {
    totalRowCount: Number(batch.totalRowCount),
    validRowCount: Number(batch.validRowCount),
    errorRowCount: Number(batch.errorRowCount),
    mappingVersion: String(batch.mappingVersion),
  };
}

function batchRecordToSummary(record: any): ConstructionMeasurementImportBatchSummary {
  const { rows: _rows, events: _events, ...summary } = batchRecordToSnapshot({
    ...record,
    rows: [],
    events: [],
  });
  void _rows;
  void _events;
  return summary;
}

function batchRecordToSnapshot(record: any): ConstructionMeasurementImportBatchSnapshot {
  const status = importStatus(record.status);
  const delimiter = record.delimiter;
  if (delimiter !== ";" && delimiter !== ",") {
    throw repositoryError(
      "PERSISTENCE_INVARIANT",
      "Import batch ayraç kaydı geçersiz.",
    );
  }
  if (!Array.isArray(record.rows) || !Array.isArray(record.events)) {
    throw repositoryError(
      "PERSISTENCE_INVARIANT",
      "Import batch detay ilişkileri yüklenmedi.",
    );
  }
  return {
    id: String(record.id),
    tenantId: String(record.tenantId),
    companyId: String(record.companyId),
    periodId: String(record.periodId),
    projectId: String(record.projectId),
    sourceProgressPaymentId: String(record.sourceProgressPaymentId),
    batchNo: Number(record.batchNo),
    status,
    originalFileName: String(record.originalFileName),
    contentType: String(record.contentType),
    fileSize: Number(record.fileSize),
    fileSha256: String(record.fileSha256),
    mappingVersion: String(record.mappingVersion),
    delimiter,
    totalRowCount: Number(record.totalRowCount),
    validRowCount: Number(record.validRowCount),
    errorRowCount: Number(record.errorRowCount),
    sourceProgressPaymentUpdatedAt: iso(record.sourceProgressPaymentUpdatedAt),
    sourceSnapshotAt: iso(record.sourceSnapshotAt),
    targetSheetId: nullableString(record.targetSheetId),
    failureCode: nullableString(record.failureCode),
    createdBy: String(record.createdBy),
    validatedBy: nullableString(record.validatedBy),
    appliedBy: nullableString(record.appliedBy),
    cancelledBy: nullableString(record.cancelledBy),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
    validatedAt: nullableIso(record.validatedAt),
    appliedAt: nullableIso(record.appliedAt),
    cancelledAt: nullableIso(record.cancelledAt),
    rows: record.rows.map(rowRecordToSnapshot),
    events: record.events.map(eventRecordToSnapshot),
  };
}

function rowRecordToSnapshot(record: any) {
  const status = record.status;
  if (status !== "READY" && status !== "ERROR") {
    throw repositoryError(
      "PERSISTENCE_INVARIANT",
      "Import satır durum kaydı geçersiz.",
    );
  }
  return {
    id: String(record.id),
    rowNo: Number(record.rowNo),
    sourceItemCode: String(record.sourceItemCode),
    contractItemId: nullableString(record.contractItemId),
    description: String(record.description),
    sourceUnit: String(record.sourceUnit),
    resolvedUnit: String(record.resolvedUnit),
    quantity: record.quantity === null ? null : decimalNumber(record.quantity),
    status,
    errorCode: record.errorCode ?? null,
    appliedMeasurementLineId: nullableString(record.appliedMeasurementLineId),
    createdAt: iso(record.createdAt),
  };
}

function eventRecordToSnapshot(record: any) {
  const allowed = ["CREATED", "VALIDATED", "APPLIED", "CANCELLED", "FAILED"];
  if (!allowed.includes(record.eventType)) {
    throw repositoryError(
      "PERSISTENCE_INVARIANT",
      "Import event türü geçersiz.",
    );
  }
  return {
    id: String(record.id),
    eventType: record.eventType,
    actorUserId: String(record.actorUserId),
    metadata: record.metadata ?? null,
    createdAt: iso(record.createdAt),
  };
}

function importStatus(value: unknown): ConstructionMeasurementImportStatus {
  if (
    value === "DRAFT"
    || value === "VALIDATED"
    || value === "APPLIED"
    || value === "CANCELLED"
    || value === "FAILED"
  ) {
    return value;
  }
  throw repositoryError(
    "PERSISTENCE_INVARIANT",
    "Import batch durum kaydı geçersiz.",
  );
}

function decimalNumber(value: unknown) {
  const number = typeof value === "object"
    && value !== null
    && "toNumber" in value
    && typeof value.toNumber === "function"
    ? value.toNumber()
    : Number(value);
  if (!Number.isFinite(number)) {
    throw repositoryError(
      "PERSISTENCE_INVARIANT",
      "Import satır miktarı geçersiz.",
    );
  }
  return number;
}

function validDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(date.getTime())) {
    throw repositoryError(
      "PERSISTENCE_INVARIANT",
      "Import tarih kaydı geçersiz.",
    );
  }
  return date;
}

function iso(value: unknown) {
  return validDate(value).toISOString();
}

function nullableIso(value: unknown) {
  return value === null || value === undefined ? null : iso(value);
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function concurrencyError() {
  return repositoryError(
    "CONCURRENCY_CONFLICT",
    "Import batch durumu eşzamanlı olarak değişti.",
  );
}

function repositoryError(
  code: ConstructionMeasurementImportRepositoryError["code"],
  message: string,
) {
  return new ConstructionMeasurementImportRepositoryError(code, message);
}
