import { randomUUID } from "node:crypto";

import type {
  ConstructionSimulationInputMode,
  ConstructionSimulationRevisionSnapshot,
  ConstructionSimulationScenarioMetadata,
  ConstructionSimulationScenarioSnapshot,
  ConstructionSimulationStatus,
} from "./construction-simulation-scenario";
import { canTransitionConstructionSimulationStatus } from "./construction-simulation-scenario";
import type { TenantScope } from "./tenant-scope";

type DecimalLike = number | string | { toNumber(): number };
type DateLike = Date | string;

type ConstructionSimulationLineRecord = {
  id: string;
  revisionId: string;
  lineNo: number;
  contractItemId: string;
  itemCode: string;
  description: string;
  unit: string;
  contractItemRevisionNo: number;
  inputMode: string;
  currentCumulative: DecimalLike;
  contractQuantity: DecimalLike;
  unitPrice: DecimalLike;
  directQuantity: DecimalLike | null;
  length: DecimalLike | null;
  width: DecimalLike | null;
  height: DecimalLike | null;
  multiplier: DecimalLike | null;
  proposedQuantity: DecimalLike;
  projectedCumulative: DecimalLike;
  projectedRemaining: DecimalLike;
  projectedAmount: DecimalLike;
  isOverrun: boolean;
};

type ConstructionSimulationRevisionRecord = {
  id: string;
  scenarioId: string;
  revisionNo: number;
  revisionNote: string | null;
  sourceProgressPaymentUpdatedAt: DateLike;
  sourceSnapshotAt: DateLike;
  lineCount: number;
  proposedQuantityTotal: DecimalLike;
  projectedAmountTotal: DecimalLike;
  overrunLineCount: number;
  inputHash: string;
  createdBy: string;
  createdAt: DateLike;
  lines?: ConstructionSimulationLineRecord[];
};

type ConstructionSimulationScenarioRecord = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  projectId: string;
  sourceProgressPaymentId: string;
  scenarioNo: string;
  name: string;
  description: string | null;
  status: string;
  currentRevisionNo: number;
  createdBy: string;
  updatedBy: string;
  createdAt: DateLike;
  updatedAt: DateLike;
  approvedBy: string | null;
  approvedAt: DateLike | null;
  archivedBy: string | null;
  archivedAt: DateLike | null;
  revisions: ConstructionSimulationRevisionRecord[];
};

type ScenarioClient = {
  create(input: {
    data: Record<string, unknown>;
    include: Record<string, unknown>;
  }): Promise<ConstructionSimulationScenarioRecord>;
  findFirst(input: {
    where: Record<string, unknown>;
    include: Record<string, unknown>;
  }): Promise<ConstructionSimulationScenarioRecord | null>;
  findMany(input: {
    where: Record<string, unknown>;
    orderBy: Array<Record<string, "asc" | "desc">>;
    include: Record<string, unknown>;
  }): Promise<ConstructionSimulationScenarioRecord[]>;
  updateMany(input: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

type RevisionClient = {
  create(input: {
    data: Record<string, unknown>;
    include: Record<string, unknown>;
  }): Promise<ConstructionSimulationRevisionRecord>;
};

type ReferenceClient = {
  findFirst(input: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
  }): Promise<Record<string, unknown> | null>;
};

type ContractItemClient = {
  count(input: { where: Record<string, unknown> }): Promise<number>;
};

type PeriodClient = {
  findFirst(input: {
    where: Record<string, unknown>;
    select: { isClosed: true };
  }): Promise<{ isClosed: boolean } | null>;
};

type AuditLogClient = {
  create(input: { data: Record<string, unknown> }): Promise<unknown>;
};

type ConstructionSimulationTransactionClient = {
  constructionSimulationScenario: ScenarioClient;
  constructionSimulationRevision: RevisionClient;
  constructionProject: ReferenceClient;
  constructionProgressPayment: ReferenceClient;
  constructionContractItem: ContractItemClient;
  period: PeriodClient;
  auditLog: AuditLogClient;
};

export type ConstructionSimulationPrismaClientLike =
  ConstructionSimulationTransactionClient & {
    $transaction<T>(
      callback: (transaction: ConstructionSimulationTransactionClient) => Promise<T>,
    ): Promise<T>;
  };

export type ConstructionSimulationScenarioSummary = Omit<
  ConstructionSimulationScenarioSnapshot,
  "currentRevision"
> & {
  currentRevision: Omit<ConstructionSimulationRevisionSnapshot, "lines">;
};

export type ConstructionSimulationCreateInput = {
  scope: TenantScope;
  projectId: string;
  sourceProgressPaymentId: string;
  scenarioNo: string;
  metadata: ConstructionSimulationScenarioMetadata;
  revision: ConstructionSimulationRevisionSnapshot;
  nowIso: string;
  auditAction?: "construction-simulation.create" | "construction-simulation.clone";
  sourceScenarioId?: string;
};

export type ConstructionSimulationAppendRevisionInput = {
  scope: TenantScope;
  scenarioId: string;
  expectedCurrentRevisionNo: number;
  revision: ConstructionSimulationRevisionSnapshot;
  nowIso: string;
};

export type ConstructionSimulationWriteResult = {
  kind: "created" | "updated" | "idempotent";
  scenario: ConstructionSimulationScenarioSnapshot;
};

export class ConstructionSimulationRepositoryError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "SCOPE_MISMATCH"
      | "INVALID_STATUS"
      | "REVISION_CONFLICT"
      | "PERSISTENCE_INVARIANT",
    message: string,
  ) {
    super(message);
    this.name = "ConstructionSimulationRepositoryError";
  }
}

export function createConstructionSimulationScenarioPrismaRepository(
  prisma: ConstructionSimulationPrismaClientLike,
  options: { createId?: () => string } = {},
) {
  const createId = options.createId ?? randomUUID;

  return {
    async listProjectScenarios(input: {
      scope: TenantScope;
      projectId: string;
      statuses?: ConstructionSimulationStatus[];
    }): Promise<ConstructionSimulationScenarioSummary[]> {
      const records = await prisma.constructionSimulationScenario.findMany({
        where: scopedScenarioWhere(input.scope, {
          projectId: input.projectId,
          ...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
        }),
        orderBy: [{ updatedAt: "desc" }, { scenarioNo: "asc" }],
        include: currentRevisionInclude(),
      });

      return records.map(scenarioRecordToSummary);
    },

    async findScenario(input: {
      scope: TenantScope;
      scenarioId: string;
    }): Promise<ConstructionSimulationScenarioSnapshot | null> {
      const record = await prisma.constructionSimulationScenario.findFirst({
        where: scopedScenarioWhere(input.scope, { id: input.scenarioId }),
        include: allRevisionsInclude(),
      });
      return record ? scenarioRecordToSnapshot(record) : null;
    },

    async findScenarioHistory(input: {
      scope: TenantScope;
      scenarioId: string;
    }): Promise<{
      scenario: ConstructionSimulationScenarioSnapshot;
      revisions: ConstructionSimulationRevisionSnapshot[];
    } | null> {
      const record = await prisma.constructionSimulationScenario.findFirst({
        where: scopedScenarioWhere(input.scope, { id: input.scenarioId }),
        include: allRevisionsInclude(),
      });
      if (!record) return null;
      return {
        scenario: scenarioRecordToSnapshot(record),
        revisions: record.revisions.map(revisionRecordToSnapshot),
      };
    },

    async createScenario(
      input: ConstructionSimulationCreateInput,
    ): Promise<ConstructionSimulationWriteResult> {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.constructionSimulationScenario.findFirst({
          where: scopedScenarioWhere(input.scope, {
            projectId: input.projectId,
            scenarioNo: input.scenarioNo,
          }),
          include: allRevisionsInclude(),
        });
        if (existing) {
          const snapshot = scenarioRecordToSnapshot(existing);
          if (
            existing.sourceProgressPaymentId === input.sourceProgressPaymentId
            && snapshot.currentRevision.inputHash === input.revision.inputHash
          ) {
            return { kind: "idempotent", scenario: snapshot };
          }
          throw new ConstructionSimulationRepositoryError(
            "REVISION_CONFLICT",
            "Aynı senaryo numarası farklı bir simülasyon girdisiyle kullanılıyor.",
          );
        }

        await ensureOpenPeriod(transaction, input.scope);
        await validateReferences(transaction, {
          scope: input.scope,
          projectId: input.projectId,
          sourceProgressPaymentId: input.sourceProgressPaymentId,
          contractItemIds: input.revision.lines.map((line) => line.contractItemId),
        });

        const now = new Date(input.nowIso);
        const record = await transaction.constructionSimulationScenario.create({
          data: {
            id: createId(),
            tenantId: input.scope.tenantId,
            companyId: input.scope.companyId,
            periodId: input.scope.periodId,
            projectId: input.projectId,
            sourceProgressPaymentId: input.sourceProgressPaymentId,
            scenarioNo: input.scenarioNo,
            name: input.metadata.name,
            description: input.metadata.description,
            status: "DRAFT",
            currentRevisionNo: 1,
            createdBy: input.scope.userId,
            updatedBy: input.scope.userId,
            createdAt: now,
            updatedAt: now,
            approvedBy: null,
            approvedAt: null,
            archivedBy: null,
            archivedAt: null,
            revisions: {
              create: revisionCreateData({
                createId,
                revision: input.revision,
                actorUserId: input.scope.userId,
              }),
            },
          },
          include: allRevisionsInclude(),
        });
        await transaction.auditLog.create({
          data: auditCreateData({
            scope: input.scope,
            action: input.auditAction ?? "construction-simulation.create",
            scenarioId: record.id,
            scenarioNo: record.scenarioNo,
            occurredAt: now,
            metadata: input.auditAction === "construction-simulation.clone"
              ? {
                  sourceScenarioId: input.sourceScenarioId,
                  newScenarioNo: record.scenarioNo,
                  projectId: record.projectId,
                  revisionNo: 1,
                  lineCount: input.revision.lineCount,
                }
              : {
                  scenarioNo: record.scenarioNo,
                  projectId: record.projectId,
                  revisionNo: 1,
                  lineCount: input.revision.lineCount,
                },
          }),
        });

        return { kind: "created", scenario: scenarioRecordToSnapshot(record) };
      });
    },

    async appendRevision(
      input: ConstructionSimulationAppendRevisionInput,
    ): Promise<ConstructionSimulationWriteResult> {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.constructionSimulationScenario.findFirst({
          where: scopedScenarioWhere(input.scope, { id: input.scenarioId }),
          include: allRevisionsInclude(),
        });
        if (!existing) {
          throw new ConstructionSimulationRepositoryError(
            "NOT_FOUND",
            "Simülasyon senaryosu aktif kapsamda bulunamadı.",
          );
        }
        const snapshot = scenarioRecordToSnapshot(existing);
        const sameInput = existing.revisions.find(
          (revision) => revision.inputHash === input.revision.inputHash,
        );
        if (sameInput) {
          return { kind: "idempotent", scenario: snapshot };
        }
        if (existing.status !== "DRAFT") {
          throw new ConstructionSimulationRepositoryError(
            "INVALID_STATUS",
            "Yalnız taslak senaryoya yeni revizyon eklenebilir.",
          );
        }
        if (
          existing.currentRevisionNo !== input.expectedCurrentRevisionNo
          || input.revision.revisionNo !== input.expectedCurrentRevisionNo + 1
        ) {
          throw new ConstructionSimulationRepositoryError(
            "REVISION_CONFLICT",
            "Senaryo başka bir işlemle değiştirildi; güncel revizyonu yeniden yükleyin.",
          );
        }

        await ensureOpenPeriod(transaction, input.scope);
        await validateReferences(transaction, {
          scope: input.scope,
          projectId: existing.projectId,
          sourceProgressPaymentId: existing.sourceProgressPaymentId,
          contractItemIds: input.revision.lines.map((line) => line.contractItemId),
        });

        const now = new Date(input.nowIso);
        const updated = await transaction.constructionSimulationScenario.updateMany({
          where: scopedScenarioWhere(input.scope, {
            id: input.scenarioId,
            projectId: existing.projectId,
            status: "DRAFT",
            currentRevisionNo: input.expectedCurrentRevisionNo,
          }),
          data: {
            currentRevisionNo: input.revision.revisionNo,
            updatedBy: input.scope.userId,
            updatedAt: now,
          },
        });
        if (updated.count !== 1) {
          throw new ConstructionSimulationRepositoryError(
            "REVISION_CONFLICT",
            "Senaryo başka bir işlemle değiştirildi; güncel revizyonu yeniden yükleyin.",
          );
        }

        const createdRevision = await transaction.constructionSimulationRevision.create({
          data: revisionCreateData({
            createId,
            revision: input.revision,
            actorUserId: input.scope.userId,
            scenarioId: input.scenarioId,
          }),
          include: revisionLinesInclude(),
        });
        await transaction.auditLog.create({
          data: auditCreateData({
            scope: input.scope,
            action: "construction-simulation.revise",
            scenarioId: existing.id,
            scenarioNo: existing.scenarioNo,
            occurredAt: now,
            metadata: {
              scenarioNo: existing.scenarioNo,
              fromRevisionNo: input.expectedCurrentRevisionNo,
              toRevisionNo: input.revision.revisionNo,
              inputHash: input.revision.inputHash,
            },
          }),
        });

        const nextRecord: ConstructionSimulationScenarioRecord = {
          ...existing,
          currentRevisionNo: input.revision.revisionNo,
          updatedBy: input.scope.userId,
          updatedAt: now,
          revisions: [createdRevision, ...existing.revisions],
        };
        return { kind: "created", scenario: scenarioRecordToSnapshot(nextRecord) };
      });
    },

    async transitionStatus(input: {
      scope: TenantScope;
      scenarioId: string;
      expectedStatus: ConstructionSimulationStatus;
      nextStatus: Extract<ConstructionSimulationStatus, "APPROVED" | "ARCHIVED">;
      nowIso: string;
    }): Promise<ConstructionSimulationWriteResult> {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.constructionSimulationScenario.findFirst({
          where: scopedScenarioWhere(input.scope, { id: input.scenarioId }),
          include: allRevisionsInclude(),
        });
        if (!existing) {
          throw new ConstructionSimulationRepositoryError(
            "NOT_FOUND",
            "Simülasyon senaryosu aktif kapsamda bulunamadı.",
          );
        }
        const snapshot = scenarioRecordToSnapshot(existing);
        if (existing.status === input.nextStatus) {
          return { kind: "idempotent", scenario: snapshot };
        }
        if (
          existing.status !== input.expectedStatus
          || !canTransitionConstructionSimulationStatus(
            input.expectedStatus,
            input.nextStatus,
          )
        ) {
          throw new ConstructionSimulationRepositoryError(
            "INVALID_STATUS",
            "Simülasyon senaryosu istenen durum geçişine uygun değil.",
          );
        }

        await ensureOpenPeriod(transaction, input.scope);
        const now = new Date(input.nowIso);
        const actorFields = input.nextStatus === "APPROVED"
          ? { approvedBy: input.scope.userId, approvedAt: now }
          : { archivedBy: input.scope.userId, archivedAt: now };
        const updated = await transaction.constructionSimulationScenario.updateMany({
          where: scopedScenarioWhere(input.scope, {
            id: input.scenarioId,
            projectId: existing.projectId,
            status: input.expectedStatus,
            currentRevisionNo: existing.currentRevisionNo,
          }),
          data: {
            status: input.nextStatus,
            updatedBy: input.scope.userId,
            updatedAt: now,
            ...actorFields,
          },
        });
        if (updated.count !== 1) {
          throw new ConstructionSimulationRepositoryError(
            "REVISION_CONFLICT",
            "Senaryo başka bir işlemle değiştirildi; güncel durumu yeniden yükleyin.",
          );
        }
        const action = input.nextStatus === "APPROVED"
          ? "construction-simulation.approve"
          : "construction-simulation.archive";
        await transaction.auditLog.create({
          data: auditCreateData({
            scope: input.scope,
            action,
            scenarioId: existing.id,
            scenarioNo: existing.scenarioNo,
            occurredAt: now,
            metadata: input.nextStatus === "APPROVED"
              ? {
                  scenarioNo: existing.scenarioNo,
                  revisionNo: existing.currentRevisionNo,
                }
              : {
                  scenarioNo: existing.scenarioNo,
                  previousStatus: input.expectedStatus,
                },
          }),
        });

        const nextRecord: ConstructionSimulationScenarioRecord = {
          ...existing,
          status: input.nextStatus,
          updatedBy: input.scope.userId,
          updatedAt: now,
          ...actorFields,
        };
        return { kind: "updated", scenario: scenarioRecordToSnapshot(nextRecord) };
      });
    },
  };
}

function scopedScenarioWhere(
  scope: TenantScope,
  where: Record<string, unknown> = {},
) {
  return {
    ...where,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
  };
}

async function ensureOpenPeriod(
  transaction: ConstructionSimulationTransactionClient,
  scope: TenantScope,
) {
  const period = await transaction.period.findFirst({
    where: {
      id: scope.periodId,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
    },
    select: { isClosed: true },
  });
  if (!period || period.isClosed) {
    throw new ConstructionSimulationRepositoryError(
      "SCOPE_MISMATCH",
      "Kapalı veya geçersiz mali dönemde simülasyon değiştirilemez.",
    );
  }
}

async function validateReferences(
  transaction: ConstructionSimulationTransactionClient,
  input: {
    scope: TenantScope;
    projectId: string;
    sourceProgressPaymentId: string;
    contractItemIds: string[];
  },
) {
  const scopeWhere = {
    tenantId: input.scope.tenantId,
    companyId: input.scope.companyId,
    periodId: input.scope.periodId,
  };
  const [project, progressPayment, contractItemCount] = await Promise.all([
    transaction.constructionProject.findFirst({
      where: { id: input.projectId, ...scopeWhere },
      select: { id: true },
    }),
    transaction.constructionProgressPayment.findFirst({
      where: {
        id: input.sourceProgressPaymentId,
        projectId: input.projectId,
        ...scopeWhere,
      },
      select: { id: true, projectId: true, updatedAt: true },
    }),
    transaction.constructionContractItem.count({
      where: {
        id: { in: [...new Set(input.contractItemIds)] },
        projectId: input.projectId,
        isActive: true,
        ...scopeWhere,
      },
    }),
  ]);

  if (
    !project
    || !progressPayment
    || contractItemCount !== new Set(input.contractItemIds).size
  ) {
    throw new ConstructionSimulationRepositoryError(
      "SCOPE_MISMATCH",
      "Proje, kaynak hakediş veya sözleşme pozları aktif kapsamla eşleşmiyor.",
    );
  }
}

function revisionCreateData(input: {
  createId: () => string;
  revision: ConstructionSimulationRevisionSnapshot;
  actorUserId: string;
  scenarioId?: string;
}) {
  return {
    id: input.createId(),
    ...(input.scenarioId ? { scenarioId: input.scenarioId } : {}),
    revisionNo: input.revision.revisionNo,
    revisionNote: input.revision.revisionNote,
    sourceProgressPaymentUpdatedAt: new Date(
      input.revision.sourceProgressPaymentUpdatedAt,
    ),
    sourceSnapshotAt: new Date(input.revision.sourceSnapshotAt),
    lineCount: input.revision.lineCount,
    proposedQuantityTotal: input.revision.proposedQuantityTotal,
    projectedAmountTotal: input.revision.projectedAmountTotal,
    overrunLineCount: input.revision.overrunLineCount,
    inputHash: input.revision.inputHash,
    createdBy: input.actorUserId,
    createdAt: new Date(input.revision.sourceSnapshotAt),
    lines: {
      createMany: {
        data: input.revision.lines.map((line) => ({
          id: input.createId(),
          lineNo: line.lineNo,
          contractItemId: line.contractItemId,
          itemCode: line.itemCode,
          description: line.description,
          unit: line.unit,
          contractItemRevisionNo: line.contractItemRevisionNo,
          inputMode: line.inputMode,
          currentCumulative: line.currentCumulative,
          contractQuantity: line.contractQuantity,
          unitPrice: line.unitPrice,
          directQuantity: line.directQuantity,
          length: line.length,
          width: line.width,
          height: line.height,
          multiplier: line.multiplier,
          proposedQuantity: line.proposedQuantity,
          projectedCumulative: line.projectedCumulative,
          projectedRemaining: line.projectedRemaining,
          projectedAmount: line.projectedAmount,
          isOverrun: line.isOverrun,
        })),
      },
    },
  };
}

function auditCreateData(input: {
  scope: TenantScope;
  action: string;
  scenarioId: string;
  scenarioNo: string;
  occurredAt: Date;
  metadata: Record<string, unknown>;
}) {
  return {
    tenantId: input.scope.tenantId,
    companyId: input.scope.companyId,
    periodId: input.scope.periodId,
    actorUserId: input.scope.userId,
    action: input.action,
    entityType: "construction-simulation",
    entityId: input.scenarioId,
    entityLabel: input.scenarioNo,
    occurredAt: input.occurredAt,
    metadata: input.metadata,
  };
}

function scenarioRecordToSnapshot(
  record: ConstructionSimulationScenarioRecord,
): ConstructionSimulationScenarioSnapshot {
  const currentRevision = record.revisions.find(
    (revision) => revision.revisionNo === record.currentRevisionNo,
  );
  if (!currentRevision) {
    throw new ConstructionSimulationRepositoryError(
      "PERSISTENCE_INVARIANT",
      "Senaryonun güncel revizyon snapshot'ı bulunamadı.",
    );
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    projectId: record.projectId,
    sourceProgressPaymentId: record.sourceProgressPaymentId,
    scenarioNo: record.scenarioNo,
    name: record.name,
    description: record.description,
    status: readStatus(record.status),
    currentRevisionNo: record.currentRevisionNo,
    currentRevision: revisionRecordToSnapshot(currentRevision),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt ? iso(record.approvedAt) : null,
    archivedBy: record.archivedBy,
    archivedAt: record.archivedAt ? iso(record.archivedAt) : null,
  };
}

function scenarioRecordToSummary(
  record: ConstructionSimulationScenarioRecord,
): ConstructionSimulationScenarioSummary {
  const current = record.revisions.find(
    (revision) => revision.revisionNo === record.currentRevisionNo,
  );
  if (!current) {
    throw new ConstructionSimulationRepositoryError(
      "PERSISTENCE_INVARIANT",
      "Senaryonun güncel revizyon özeti bulunamadı.",
    );
  }
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    projectId: record.projectId,
    sourceProgressPaymentId: record.sourceProgressPaymentId,
    scenarioNo: record.scenarioNo,
    name: record.name,
    description: record.description,
    status: readStatus(record.status),
    currentRevisionNo: record.currentRevisionNo,
    currentRevision: revisionRecordToSummary(current),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
    approvedBy: record.approvedBy,
    approvedAt: record.approvedAt ? iso(record.approvedAt) : null,
    archivedBy: record.archivedBy,
    archivedAt: record.archivedAt ? iso(record.archivedAt) : null,
  };
}

function revisionRecordToSnapshot(
  record: ConstructionSimulationRevisionRecord,
): ConstructionSimulationRevisionSnapshot {
  if (!record.lines) {
    throw new ConstructionSimulationRepositoryError(
      "PERSISTENCE_INVARIANT",
      "Revizyon satır snapshot'ları yüklenmedi.",
    );
  }
  return {
    revisionNo: record.revisionNo,
    revisionNote: record.revisionNote,
    sourceProgressPaymentUpdatedAt: iso(record.sourceProgressPaymentUpdatedAt),
    sourceSnapshotAt: iso(record.sourceSnapshotAt),
    lineCount: record.lineCount,
    proposedQuantityTotal: numberValue(record.proposedQuantityTotal),
    projectedAmountTotal: numberValue(record.projectedAmountTotal),
    overrunLineCount: record.overrunLineCount,
    inputHash: record.inputHash,
    lines: record.lines.map((line) => ({
      lineNo: line.lineNo,
      contractItemId: line.contractItemId,
      itemCode: line.itemCode,
      description: line.description,
      unit: line.unit,
      contractItemRevisionNo: line.contractItemRevisionNo,
      inputMode: line.inputMode as ConstructionSimulationInputMode,
      currentCumulative: numberValue(line.currentCumulative),
      contractQuantity: numberValue(line.contractQuantity),
      unitPrice: numberValue(line.unitPrice),
      directQuantity: nullableNumber(line.directQuantity),
      length: nullableNumber(line.length),
      width: nullableNumber(line.width),
      height: nullableNumber(line.height),
      multiplier: nullableNumber(line.multiplier),
      proposedQuantity: numberValue(line.proposedQuantity),
      projectedCumulative: numberValue(line.projectedCumulative),
      projectedRemaining: numberValue(line.projectedRemaining),
      projectedAmount: numberValue(line.projectedAmount),
      isOverrun: line.isOverrun,
    })),
  };
}

function revisionRecordToSummary(
  record: ConstructionSimulationRevisionRecord,
): Omit<ConstructionSimulationRevisionSnapshot, "lines"> {
  return {
    revisionNo: record.revisionNo,
    revisionNote: record.revisionNote,
    sourceProgressPaymentUpdatedAt: iso(record.sourceProgressPaymentUpdatedAt),
    sourceSnapshotAt: iso(record.sourceSnapshotAt),
    lineCount: record.lineCount,
    proposedQuantityTotal: numberValue(record.proposedQuantityTotal),
    projectedAmountTotal: numberValue(record.projectedAmountTotal),
    overrunLineCount: record.overrunLineCount,
    inputHash: record.inputHash,
  };
}

function currentRevisionInclude() {
  return {
    revisions: {
      orderBy: { revisionNo: "desc" as const },
      take: 1,
    },
  };
}

function allRevisionsInclude() {
  return {
    revisions: {
      orderBy: { revisionNo: "desc" as const },
      include: revisionLinesInclude(),
    },
  };
}

function revisionLinesInclude() {
  return {
    lines: {
      orderBy: { lineNo: "asc" as const },
    },
  };
}

function readStatus(value: string): ConstructionSimulationStatus {
  if (value === "APPROVED" || value === "ARCHIVED") return value;
  return "DRAFT";
}

function nullableNumber(value: DecimalLike | null) {
  return value === null ? null : numberValue(value);
}

function numberValue(value: DecimalLike) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

function iso(value: DateLike) {
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}
