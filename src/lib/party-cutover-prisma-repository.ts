import { Prisma, type PrismaClient } from "@prisma/client";

import {
  PartyCutoverError,
  normalizePartyCutoverMode,
  partyCutoverIdentifiers,
  partyCutoverScopeFingerprint,
  resolvePartyCutoverAction,
  samePartyCutoverEvidence,
  validatePartyCutoverCommand,
  type PartyCutoverEvidence,
  type PartyCutoverMode,
  type PartyCutoverRepository,
  type PartyCutoverTransitionCommand,
  type PartyCutoverTransitionResult,
} from "./party-cutover";
import { buildPartyParityReadModel } from "./party-parity-read-model";
import {
  readPartyParitySnapshotFromClient,
  type PartyParitySnapshotPrismaClient,
} from "./party-parity-snapshot-prisma";

type PartyCutoverStateRecord = PartyCutoverEvidence & {
  companyId: string;
  createdBy: string;
  id: string;
  lastVerifiedAt: Date;
  mode: string;
  periodId: string;
  releaseId: string;
  revisionNo: number;
  tenantId: string;
  updatedBy: string;
};

type PartyCutoverEventRecord = PartyCutoverEvidence & {
  action: string;
  actorUserId: string;
  companyId: string;
  fromMode: string;
  operationId: string;
  periodId: string;
  reasonCode: string;
  releaseId: string;
  stateId: string;
  stateRevisionNo: number;
  tenantId: string;
  toMode: string;
};

type PartyCutoverTransaction = PartyParitySnapshotPrismaClient & {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
  appUserScopeAccess: {
    findFirst(input: unknown): Promise<{ id: string } | null>;
  };
  auditLog: {
    create(input: unknown): Promise<unknown>;
  };
  company: {
    findFirst(input: unknown): Promise<{ id: string } | null>;
  };
  partyCutoverEvent: {
    create(input: unknown): Promise<PartyCutoverEventRecord>;
    findUnique(input: unknown): Promise<PartyCutoverEventRecord | null>;
  };
  partyCutoverState: {
    create(input: unknown): Promise<PartyCutoverStateRecord>;
    findFirst(input: unknown): Promise<PartyCutoverStateRecord | null>;
    updateMany(input: unknown): Promise<{ count: number }>;
  };
  period: {
    findFirst(input: unknown): Promise<{ id: string; isClosed: boolean } | null>;
  };
  tenant: {
    findUnique(input: unknown): Promise<{ lifecycleStatus: string } | null>;
  };
};

export type PartyCutoverPrismaClientLike = {
  $transaction<T>(
    callback: (transaction: PartyCutoverTransaction) => Promise<T>,
    options: {
      isolationLevel: "Serializable";
      maxWait: number;
      timeout: number;
    },
  ): Promise<T>;
};

export function createPartyCutoverPrismaRepository(
  prisma: PartyCutoverPrismaClientLike,
  now: () => Date = () => new Date(),
): PartyCutoverRepository {
  return {
    transition(command) {
      validatePartyCutoverCommand(command);
      return prisma.$transaction(
        (transaction) => executeTransition(transaction, command, now()),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10_000,
          timeout: 30_000,
        },
      );
    },
  };
}

async function executeTransition(
  transaction: PartyCutoverTransaction,
  command: PartyCutoverTransitionCommand,
  occurredAt: Date,
): Promise<PartyCutoverTransitionResult> {
  await assertWritable(transaction);
  await lockScope(transaction, command);
  await assertAuthorizedScope(transaction, command);

  const state = await transaction.partyCutoverState.findFirst({
    where: scopeFields(command),
  });
  const currentMode = state
    ? normalizePartyCutoverMode(state.mode)
    : "LEGACY_ONLY";
  const currentRevisionNo = state?.revisionNo ?? 0;
  const replay = await transaction.partyCutoverEvent.findUnique({
    where: { operationId: command.operationId },
  });
  if (replay) {
    assertReplay({ command, currentMode, currentRevisionNo, replay, state });
    return transitionResult({
      mode: currentMode,
      parityChecksum: replay.parityChecksum,
      replayed: true,
      revisionNo: currentRevisionNo,
      scope: command.scope,
      status: "UNCHANGED",
    });
  }

  if (currentRevisionNo !== command.expectedRevisionNo) {
    throw new PartyCutoverError(
      "REVISION_CONFLICT",
      "Party cutover kaydı beklenen revizyonda değil.",
    );
  }
  const action = resolvePartyCutoverAction(currentMode, command.targetMode);
  const evidence = action === "ACTIVATE_SHADOW"
    ? await readAndVerifyParity(transaction, command)
    : requireStoredEvidence(state);
  const nextRevisionNo = currentRevisionNo + 1;
  const { eventId, stateId } = partyCutoverIdentifiers(command);

  if (!state) {
    await transaction.partyCutoverState.create({
      data: {
        ...command.scope,
        ...evidence,
        createdBy: command.actorUserId,
        id: stateId,
        lastVerifiedAt: occurredAt,
        mode: command.targetMode,
        releaseId: command.releaseId,
        revisionNo: nextRevisionNo,
        updatedBy: command.actorUserId,
      },
    });
  } else {
    const updated = await transaction.partyCutoverState.updateMany({
      data: {
        ...(action === "ACTIVATE_SHADOW" ? {
          ...evidence,
          lastVerifiedAt: occurredAt,
        } : {}),
        mode: command.targetMode,
        releaseId: command.releaseId,
        revisionNo: nextRevisionNo,
        updatedBy: command.actorUserId,
      },
      where: {
        ...scopeFields(command),
        id: state.id,
        mode: currentMode,
        revisionNo: currentRevisionNo,
      },
    });
    if (updated.count !== 1) {
      throw new PartyCutoverError(
        "REVISION_CONFLICT",
        "Party cutover eşzamanlı değişiklik nedeniyle durdu.",
      );
    }
  }

  try {
    await transaction.partyCutoverEvent.create({
      data: {
        ...command.scope,
        ...evidence,
        action,
        actorUserId: command.actorUserId,
        fromMode: currentMode,
        id: eventId,
        occurredAt,
        operationId: command.operationId,
        reasonCode: command.reasonCode,
        releaseId: command.releaseId,
        stateId: state?.id ?? stateId,
        stateRevisionNo: nextRevisionNo,
        toMode: command.targetMode,
      },
    });
  } catch {
    throw new PartyCutoverError(
      "EVENT_WRITE_FAILED",
      "Party cutover event kaydı yazılamadı.",
    );
  }

  try {
    await transaction.auditLog.create({
      data: {
        ...command.scope,
        action: action === "ACTIVATE_SHADOW"
          ? "party-cutover.shadow-activated"
          : "party-cutover.legacy-restored",
        actorUserId: command.actorUserId,
        entityId: state?.id ?? stateId,
        entityLabel: "Party Cutover State",
        entityType: "party-cutover-state",
        metadata: {
          action,
          counts: {
            legacy: evidence.legacyCount,
            matched: evidence.matchedCount,
            party: evidence.partyCount,
            role: evidence.roleCount,
          },
          fromMode: currentMode,
          operationFingerprint: eventId.slice(-12),
          parityChecksum: evidence.parityChecksum,
          reasonCode: command.reasonCode,
          releaseId: command.releaseId,
          revisionFrom: currentRevisionNo,
          revisionTo: nextRevisionNo,
          scopeFingerprint: partyCutoverScopeFingerprint(command.scope),
          toMode: command.targetMode,
        },
        occurredAt,
      },
    });
  } catch {
    throw new PartyCutoverError(
      "AUDIT_WRITE_FAILED",
      "Party cutover audit kaydı yazılamadı.",
    );
  }

  return transitionResult({
    mode: command.targetMode,
    parityChecksum: evidence.parityChecksum,
    replayed: false,
    revisionNo: nextRevisionNo,
    scope: command.scope,
    status: action === "ACTIVATE_SHADOW" ? "ACTIVATED" : "ROLLED_BACK",
  });
}

async function assertWritable(transaction: PartyCutoverTransaction) {
  const rows = await transaction.$queryRaw<Array<{ read_only: string }>>(
    Prisma.sql`
      SELECT current_setting('transaction_read_only')::text AS read_only
    `,
  );
  if (rows.length !== 1 || rows[0]?.read_only !== "off") {
    throw new PartyCutoverError(
      "DATABASE_NOT_WRITABLE",
      "Party cutover DB transaction yazılabilir değil.",
    );
  }
}

async function lockScope(
  transaction: PartyCutoverTransaction,
  command: PartyCutoverTransitionCommand,
) {
  const scopeKey = [
    command.scope.tenantId,
    command.scope.companyId,
    command.scope.periodId,
  ].join("::");
  await transaction.$queryRaw<Array<{ lock_result: string }>>(
    Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${scopeKey}, 0))::text
        AS lock_result
    `,
  );
}

async function assertAuthorizedScope(
  transaction: PartyCutoverTransaction,
  command: PartyCutoverTransitionCommand,
) {
  const tenant = await transaction.tenant.findUnique({
    select: { lifecycleStatus: true },
    where: { id: command.scope.tenantId },
  });
  if (!tenant || tenant.lifecycleStatus !== "ACTIVE") {
    throw new PartyCutoverError(
      "ACTIVE_TENANT_REQUIRED",
      "Party cutover için aktif tenant bulunamadı.",
    );
  }
  const company = await transaction.company.findFirst({
    select: { id: true },
    where: { id: command.scope.companyId, tenantId: command.scope.tenantId },
  });
  const period = await transaction.period.findFirst({
    select: { id: true, isClosed: true },
    where: {
      companyId: command.scope.companyId,
      id: command.scope.periodId,
      tenantId: command.scope.tenantId,
    },
  });
  if (!company || !period) {
    throw new PartyCutoverError(
      "SCOPE_NOT_FOUND",
      "Party cutover tenant/şirket/dönem kapsamı bulunamadı.",
    );
  }
  const access = await transaction.appUserScopeAccess.findFirst({
    select: { id: true },
    where: {
      ...command.scope,
      isActive: true,
      role: "admin",
      userId: command.actorUserId,
    },
  });
  if (!access) {
    throw new PartyCutoverError(
      "ACTIVE_ADMIN_REQUIRED",
      "Party cutover için exact scope aktif admin erişimi zorunludur.",
    );
  }
}

async function readAndVerifyParity(
  transaction: PartyCutoverTransaction,
  command: PartyCutoverTransitionCommand,
) {
  const model = buildPartyParityReadModel({
    scope: command.scope,
    snapshot: await readPartyParitySnapshotFromClient(transaction, command.scope),
  });
  if (!model.ready) {
    throw new PartyCutoverError(
      "PARITY_NOT_READY",
      "Party cutover parity blocker bulundu; SHADOW_READ açılmadı.",
    );
  }
  const evidence = evidenceFromModel(model);
  if (
    !command.expectedParity
    || !samePartyCutoverEvidence(evidence, command.expectedParity)
  ) {
    throw new PartyCutoverError(
      "PARITY_DRIFT",
      "Party cutover parity kanıtı güncel snapshot ile eşleşmiyor.",
    );
  }
  return evidence;
}

function assertReplay(input: {
  command: PartyCutoverTransitionCommand;
  currentMode: PartyCutoverMode;
  currentRevisionNo: number;
  replay: PartyCutoverEventRecord;
  state: PartyCutoverStateRecord | null;
}) {
  const { command, replay } = input;
  const expectedAction = command.targetMode === "SHADOW_READ"
    ? "ACTIVATE_SHADOW"
    : "ROLLBACK_LEGACY";
  const expectedFromMode = command.targetMode === "SHADOW_READ"
    ? "LEGACY_ONLY"
    : "SHADOW_READ";
  const exact = replay.tenantId === command.scope.tenantId
    && replay.companyId === command.scope.companyId
    && replay.periodId === command.scope.periodId
    && replay.actorUserId === command.actorUserId
    && replay.operationId === command.operationId
    && replay.reasonCode === command.reasonCode
    && replay.releaseId === command.releaseId
    && replay.action === expectedAction
    && replay.fromMode === expectedFromMode
    && replay.toMode === command.targetMode
    && command.expectedRevisionNo === replay.stateRevisionNo - 1
    && (
      command.targetMode === "LEGACY_ONLY"
      || Boolean(command.expectedParity
        && samePartyCutoverEvidence(eventEvidence(replay), command.expectedParity))
    );
  if (!exact) {
    throw new PartyCutoverError(
      "OPERATION_CONFLICT",
      "Party cutover işlem kimliği farklı bir komutla kullanılmış.",
    );
  }
  if (
    !input.state
    || input.currentMode !== replay.toMode
    || input.currentRevisionNo !== replay.stateRevisionNo
    || input.state.parityChecksum !== replay.parityChecksum
  ) {
    throw new PartyCutoverError(
      "OPERATION_STALE",
      "Party cutover retry işleminden sonra kapsam yeniden değiştirilmiş.",
    );
  }
}

function requireStoredEvidence(state: PartyCutoverStateRecord | null) {
  if (!state) {
    throw new PartyCutoverError(
      "TRANSITION_NOT_ALLOWED",
      "Party cutover rollback için kayıtlı SHADOW_READ durumu bulunamadı.",
    );
  }
  return stateEvidence(state);
}

function evidenceFromModel(model: ReturnType<typeof buildPartyParityReadModel>) {
  return {
    issueChecksum: model.issueChecksum,
    legacyChecksum: model.legacyChecksum,
    legacyCount: model.legacyCount,
    matchedCount: model.matchedCount,
    parityChecksum: model.parityChecksum,
    partyChecksum: model.partyChecksum,
    partyCount: model.partyCount,
    roleCount: model.roleCount,
  };
}

function stateEvidence(state: PartyCutoverEvidence): PartyCutoverEvidence {
  return {
    issueChecksum: state.issueChecksum,
    legacyChecksum: state.legacyChecksum,
    legacyCount: state.legacyCount,
    matchedCount: state.matchedCount,
    parityChecksum: state.parityChecksum,
    partyChecksum: state.partyChecksum,
    partyCount: state.partyCount,
    roleCount: state.roleCount,
  };
}

function eventEvidence(event: PartyCutoverEventRecord): PartyCutoverEvidence {
  return stateEvidence(event);
}

function scopeFields(command: PartyCutoverTransitionCommand) {
  return { ...command.scope };
}

function transitionResult(input: {
  mode: PartyCutoverMode;
  parityChecksum: string;
  replayed: boolean;
  revisionNo: number;
  scope: PartyCutoverTransitionCommand["scope"];
  status: PartyCutoverTransitionResult["status"];
}): PartyCutoverTransitionResult {
  return {
    mode: input.mode,
    parityChecksum: input.parityChecksum,
    replayed: input.replayed,
    revisionNo: input.revisionNo,
    scopeFingerprint: partyCutoverScopeFingerprint(input.scope),
    status: input.status,
  };
}

export function asPartyCutoverPrismaClient(
  prisma: PrismaClient,
): PartyCutoverPrismaClientLike {
  return prisma as unknown as PartyCutoverPrismaClientLike;
}
