import type { PrismaClient } from "@prisma/client";

import {
  buildPartyBackfillPlan,
  type ExistingPartyRole,
  type LegacyPartyRecord,
  type PartyBackfillIssue,
  type PartyBackfillPlan,
} from "./party-backfill";
import {
  PartyBackfillExecutionError,
  type PartyBackfillApplyCommand,
  type PartyBackfillApplySummary,
  type PartyBackfillExecutionRepository,
} from "./party-backfill-apply-service";
import type { PartyKind, PartySlug } from "./party-read-model";

type PartyRoleRecord = Omit<ExistingPartyRole, "kind" | "legacySlug"> & {
  kind: string;
  legacySlug: string;
};

type PartyBackfillRunRecord = {
  candidateCount: number;
  id: string;
  issueCount: number;
  sourceChecksum: string;
  sourceCount: number;
  status: string;
  version: string;
};

type TransactionClient = {
  appUserScopeAccess: {
    findFirst(input: unknown): Promise<{ id: string } | null>;
  };
  auditLog: {
    create(input: { data: Record<string, unknown> }): Promise<unknown>;
  };
  entityRecord: {
    findMany(input: unknown): Promise<LegacyPartyRecord[]>;
  };
  party: {
    createMany(input: { data: unknown[] }): Promise<{ count: number }>;
  };
  partyBackfillIssue: {
    createMany(input: { data: unknown[] }): Promise<{ count: number }>;
  };
  partyBackfillRun: {
    create(input: { data: Record<string, unknown> }): Promise<PartyBackfillRunRecord>;
    findFirst(input: unknown): Promise<PartyBackfillRunRecord | null>;
    updateMany(input: unknown): Promise<{ count: number }>;
  };
  partyRole: {
    createMany(input: { data: unknown[] }): Promise<{ count: number }>;
    findMany(input: unknown): Promise<PartyRoleRecord[]>;
  };
  period: {
    findFirst(input: unknown): Promise<{ id: string; isClosed: boolean } | null>;
  };
};

export type PartyBackfillApplyPrismaClientLike = TransactionClient & {
  $transaction<T>(
    callback: (transaction: TransactionClient) => Promise<T>,
    options: { isolationLevel: "Serializable" },
  ): Promise<T>;
};

export function asPartyBackfillApplyPrismaClient(
  prisma: PrismaClient,
): PartyBackfillApplyPrismaClientLike {
  return prisma as unknown as PartyBackfillApplyPrismaClientLike;
}

const partySlugs: PartySlug[] = ["musteriler", "taseronlar", "tedarikciler"];

export function createPartyBackfillApplyPrismaRepository(
  prisma: PartyBackfillApplyPrismaClientLike,
  now: () => Date = () => new Date(),
): PartyBackfillExecutionRepository {
  return {
    async previewConsistently({ scope, version }) {
      return prisma.$transaction(
        async (transaction) => buildPlan(transaction, scope, version),
        { isolationLevel: "Serializable" },
      );
    },

    async applyAtomically(command) {
      return prisma.$transaction(
        (transaction) => applyInTransaction(transaction, command, now()),
        { isolationLevel: "Serializable" },
      );
    },
  };
}

async function applyInTransaction(
  transaction: TransactionClient,
  command: PartyBackfillApplyCommand,
  occurredAt: Date,
): Promise<PartyBackfillApplySummary> {
  const period = await transaction.period.findFirst({
    select: { id: true, isClosed: true },
    where: {
      companyId: command.scope.companyId,
      id: command.scope.periodId,
      tenantId: command.scope.tenantId,
    },
  });
  const access = await transaction.appUserScopeAccess.findFirst({
    select: { id: true },
    where: {
      ...scopeFields(command.scope),
      isActive: true,
      role: "admin",
      userId: command.actorUserId,
    },
  });
  if (!period) {
    throw new PartyBackfillExecutionError("Party backfill hedef dönemi bulunamadı.");
  }
  if (!access) {
    throw new PartyBackfillExecutionError(
      "Party backfill için exact kapsamda aktif admin yetkisi zorunludur.",
    );
  }

  const plan = await buildPlan(transaction, command.scope, command.version);
  if (plan.run.sourceChecksum !== command.expectedSourceChecksum) {
    throw new PartyBackfillExecutionError(
      "Party backfill kaynağı preview sonrasında değişti; yeni preview zorunludur.",
    );
  }
  if (plan.run.sourceCount > command.approvedSourceCountLimit) {
    throw new PartyBackfillExecutionError(
      "Party backfill kaynak satır sayısı onaylı limiti aşıyor.",
    );
  }

  const existingRun = await transaction.partyBackfillRun.findFirst({
    where: {
      ...scopeFields(command.scope),
      sourceChecksum: plan.run.sourceChecksum,
      version: plan.run.version,
    },
  });
  if (existingRun) {
    assertCompatibleRun(existingRun, plan);
    if (existingRun.status !== "BLOCKED" && existingRun.status !== "VERIFIED") {
      throw new PartyBackfillExecutionError(
        "Party backfill run tamamlanmış güvenli bir durumda değil.",
      );
    }
    return summary(
      existingRun.status,
      plan,
      true,
      existingRun.status === "VERIFIED" ? existingRun.candidateCount : 0,
    );
  }

  const blockingIssueCount = countIssues(plan, "BLOCKING");
  const warningIssueCount = countIssues(plan, "WARNING");
  const status = blockingIssueCount > 0 ? "BLOCKED" : "APPLYING";
  await transaction.partyBackfillRun.create({
    data: {
      ...scopeFields(command.scope),
      candidateCount: plan.run.candidateCount,
      completedAt: status === "BLOCKED" ? occurredAt : null,
      createdAt: occurredAt,
      createdBy: command.actorUserId,
      id: plan.run.id,
      issueCount: plan.run.issueCount,
      sourceChecksum: plan.run.sourceChecksum,
      sourceCount: plan.run.sourceCount,
      startedAt: occurredAt,
      status,
      version: plan.run.version,
    },
  });
  await createIssues(transaction, command, plan, occurredAt);

  if (status === "BLOCKED") {
    await createAudit(transaction, {
      action: "party.backfill.blocked",
      command,
      occurredAt,
      periodClosed: period.isClosed,
      plan,
      status,
    });
    return {
      ...summary("BLOCKED", plan, false, 0),
      blockingIssueCount,
      warningIssueCount,
    };
  }

  const partyWrite = plan.candidates.length > 0
    ? await transaction.party.createMany({
      data: plan.candidates.map((candidate) => candidate.party),
    })
    : { count: 0 };
  const roleWrite = plan.candidates.length > 0
    ? await transaction.partyRole.createMany({
      data: plan.candidates.map((candidate) => candidate.role),
    })
    : { count: 0 };
  if (
    partyWrite.count !== plan.run.candidateCount
    || roleWrite.count !== plan.run.candidateCount
  ) {
    throw new PartyBackfillExecutionError(
      "Party backfill yazım sayıları aday sayısıyla eşleşmedi.",
    );
  }

  const verification = await buildPlan(transaction, command.scope, command.version);
  assertVerified(plan, verification);
  const updated = await transaction.partyBackfillRun.updateMany({
    data: { completedAt: occurredAt, status: "VERIFIED" },
    where: {
      ...scopeFields(command.scope),
      id: plan.run.id,
      status: "APPLYING",
    },
  });
  if (updated.count !== 1) {
    throw new PartyBackfillExecutionError(
      "Party backfill run doğrulama durumuna geçirilemedi.",
    );
  }
  await createAudit(transaction, {
    action: "party.backfill.verified",
    command,
    occurredAt,
    periodClosed: period.isClosed,
    plan,
    status: "VERIFIED",
  });

  return {
    ...summary("VERIFIED", plan, false, plan.run.candidateCount),
    blockingIssueCount,
    warningIssueCount,
  };
}

async function buildPlan(
  transaction: TransactionClient,
  scope: PartyBackfillApplyCommand["scope"],
  version: string,
) {
  const records = await transaction.entityRecord.findMany({
    orderBy: [{ slug: "asc" }, { code: "asc" }],
    where: { ...scopeFields(scope), slug: { in: partySlugs } },
  });
  const roleRecords = await transaction.partyRole.findMany({
    include: { party: true },
    orderBy: [{ kind: "asc" }, { normalizedCode: "asc" }],
    where: scopeFields(scope),
  });
  return buildPartyBackfillPlan({
    existingRoles: toExistingRoles(roleRecords),
    records,
    scope,
    version,
  });
}

async function createIssues(
  transaction: TransactionClient,
  command: PartyBackfillApplyCommand,
  plan: PartyBackfillPlan,
  occurredAt: Date,
) {
  if (plan.issues.length === 0) return;
  const result = await transaction.partyBackfillIssue.createMany({
    data: plan.issues.map((issue) => ({
      ...scopeFields(command.scope),
      checksum: issue.checksum,
      createdAt: occurredAt,
      details: issue.details,
      id: issue.id,
      issueCode: issue.issueCode,
      issueKey: issue.issueKey,
      runId: plan.run.id,
      severity: issue.severity,
      sourceRefs: issue.sourceRefs,
      status: "OPEN",
      updatedAt: occurredAt,
    })),
  });
  if (result.count !== plan.issues.length) {
    throw new PartyBackfillExecutionError(
      "Party backfill karantina kayıt sayısı beklenenle eşleşmedi.",
    );
  }
}

async function createAudit(
  transaction: TransactionClient,
  input: {
    action: string;
    command: PartyBackfillApplyCommand;
    occurredAt: Date;
    periodClosed: boolean;
    plan: PartyBackfillPlan;
    status: "BLOCKED" | "VERIFIED";
  },
) {
  await transaction.auditLog.create({
    data: {
      ...scopeFields(input.command.scope),
      action: input.action,
      actorUserId: input.command.actorUserId,
      entityId: input.plan.run.id,
      entityLabel: input.plan.run.version,
      entityType: "party-backfill-run",
      metadata: {
        blockingIssueCount: countIssues(input.plan, "BLOCKING"),
        candidateCount: input.plan.run.candidateCount,
        issueCount: input.plan.run.issueCount,
        periodClosed: input.periodClosed,
        sourceChecksum: input.plan.run.sourceChecksum,
        sourceCount: input.plan.run.sourceCount,
        status: input.status,
        warningIssueCount: countIssues(input.plan, "WARNING"),
      },
      occurredAt: input.occurredAt,
    },
  });
}

function assertVerified(initial: PartyBackfillPlan, verification: PartyBackfillPlan) {
  const expectedUnchanged = initial.run.unchangedCount + initial.run.candidateCount;
  if (
    verification.run.sourceChecksum !== initial.run.sourceChecksum
    || verification.run.sourceCount !== initial.run.sourceCount
    || verification.run.candidateCount !== 0
    || verification.run.unchangedCount !== expectedUnchanged
    || countIssues(verification, "BLOCKING") !== 0
  ) {
    throw new PartyBackfillExecutionError(
      "Party backfill transaction içi mutabakatı başarısız oldu.",
    );
  }
}

function assertCompatibleRun(run: PartyBackfillRunRecord, plan: PartyBackfillPlan) {
  if (
    run.id !== plan.run.id
    || run.version !== plan.run.version
    || run.sourceChecksum !== plan.run.sourceChecksum
    || run.sourceCount !== plan.run.sourceCount
    || run.issueCount !== plan.run.issueCount
  ) {
    throw new PartyBackfillExecutionError(
      "Mevcut Party backfill run beklenen kaynak mutabakatıyla eşleşmiyor.",
    );
  }
}

function summary(
  status: "BLOCKED" | "VERIFIED",
  plan: PartyBackfillPlan,
  reused: boolean,
  candidateCount: number,
): PartyBackfillApplySummary {
  return {
    blockingIssueCount: countIssues(plan, "BLOCKING"),
    candidateCount,
    issueCount: plan.run.issueCount,
    reused,
    runId: plan.run.id,
    sourceChecksum: plan.run.sourceChecksum,
    sourceCount: plan.run.sourceCount,
    status,
    warningIssueCount: countIssues(plan, "WARNING"),
  };
}

function countIssues(plan: PartyBackfillPlan, severity: PartyBackfillIssue["severity"]) {
  return plan.issues.filter((issue) => issue.severity === severity).length;
}

function toExistingRoles(rows: PartyRoleRecord[]): ExistingPartyRole[] {
  return rows.flatMap((row) => {
    if (!isPartyKind(row.kind) || !isPartySlug(row.legacySlug)) return [];
    return [{ ...row, kind: row.kind, legacySlug: row.legacySlug }];
  });
}

function scopeFields(scope: PartyBackfillApplyCommand["scope"]) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}

function isPartyKind(value: string): value is PartyKind {
  return value === "customer" || value === "subcontractor" || value === "supplier";
}

function isPartySlug(value: string): value is PartySlug {
  return value === "musteriler" || value === "taseronlar" || value === "tedarikciler";
}
