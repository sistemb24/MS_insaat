import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  WorkplaceSafetyDomainError,
  assertSafetyTransition,
  canTransitionSafetyFindingStatus,
  canTransitionSafetyInspectionStatus,
  canTransitionSafetyPpeIssuanceStatus,
  canTransitionSafetyTrainingStatus,
  canTransitionSafetyWorkAccidentStatus,
  createSafetyFindingDraft,
  createSafetyInspectionDraft,
  createSafetyTrainingDraft,
  createSafetyWorkAccidentDraft,
  getSafetyTrainingAttendanceKey,
  getWorkplaceSafetyPermission,
  validateSafetyPpeIssuance,
  type SafetyFindingDraftInput,
  type SafetyInspectionDraftInput,
  type SafetyPpeIssuanceInput,
  type SafetyTrainingDraftInput,
  type SafetyTrainingAttendanceInput,
  type SafetyWorkAccidentDraftInput,
} from "./workplace-safety";
import {
  type SafetyFindingRow,
  type SafetyInspectionRow,
  type SafetyPpeIssuanceRow,
  type SafetyTrainingAttendanceRow,
  type SafetyTrainingRow,
  type SafetyWorkAccidentRow,
  type WorkplaceSafetyOverview,
  type WorkplaceSafetyRepository,
} from "./workplace-safety-prisma-repository";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type WorkplaceSafetyService = ReturnType<typeof createWorkplaceSafetyService>;

export function createWorkplaceSafetyService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (input: { kind: string; scope: TenantScope; stableKey?: string }) => string;
  now: () => string;
  repository: WorkplaceSafetyRepository;
}) {
  async function resolve(scope: TenantScope): Promise<Result<WorkplaceSafetyOverview>> {
    const errors = validateTenantScope(scope);
    if (errors.length > 0) return { errors, ok: false };
    return { data: await repository.listOverview({ scope }), ok: true };
  }

  function canMutate(scope: TenantScope): Result<null> {
    const permission = getWorkplaceSafetyPermission({
      operation: "create",
      periodClosed: scope.periodClosed,
      role: scope.userRole,
    });
    return permission.allowed ? { data: null, ok: true } : { errors: [permission.reason], ok: false };
  }

  return {
    async list({ scope }: { scope: TenantScope }): Promise<Result<WorkplaceSafetyOverview>> {
      return resolve(scope);
    },

    async createWorkAccident(input: {
      scope: TenantScope;
      values: SafetyWorkAccidentDraftInput;
    }): Promise<Result<SafetyWorkAccidentRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      try {
        const draft = createSafetyWorkAccidentDraft(input.values);
        const timestamp = now();
        const row: SafetyWorkAccidentRow = {
          ...scopeFields(input.scope), ...draft, id: createId({ kind: "work-accident", scope: input.scope }),
          closedAt: null, createdAt: timestamp, createdBy: input.scope.userId, recordedAt: null,
          updatedAt: timestamp, updatedBy: input.scope.userId,
        };
        const created = await repository.createWorkAccident(row);
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.work-accident.create", entityId: created.id, entityLabel: created.classification,
          entityType: "workplace-safety-work-accident", occurredAt: timestamp,
          metadata: { classification: created.classification, statusTo: created.status },
        });
        return { data: created, ok: true };
      } catch (error) { return failure(error); }
    },

    async recordWorkAccident(input: { id: string; scope: TenantScope }): Promise<Result<SafetyWorkAccidentRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      const existing = resolved.data.workAccidents.find((row) => row.id === input.id);
      if (!existing) return missing("İş kazası kaydı");
      try {
        assertSafetyTransition(canTransitionSafetyWorkAccidentStatus(existing.status, "RECORDED"), "İş kazası kaydı");
        const timestamp = now();
        const updated = await repository.updateWorkAccident({ ...existing, recordedAt: timestamp.slice(0, 10), status: "RECORDED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.work-accident.record", entityId: updated.id, entityLabel: updated.classification,
          entityType: "workplace-safety-work-accident", occurredAt: timestamp,
          metadata: { statusFrom: existing.status, statusTo: updated.status },
        });
        return { data: updated, ok: true };
      } catch (error) { return failure(error); }
    },

    async closeWorkAccident(input: { id: string; scope: TenantScope }): Promise<Result<SafetyWorkAccidentRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      const existing = resolved.data.workAccidents.find((row) => row.id === input.id);
      if (!existing) return missing("İş kazası kaydı");
      try {
        assertSafetyTransition(canTransitionSafetyWorkAccidentStatus(existing.status, "CLOSED"), "İş kazası kaydı");
        const timestamp = now();
        const updated = await repository.updateWorkAccident({ ...existing, closedAt: timestamp.slice(0, 10), status: "CLOSED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.work-accident.close", entityId: updated.id, entityLabel: updated.classification,
          entityType: "workplace-safety-work-accident", occurredAt: timestamp,
          metadata: { statusFrom: existing.status, statusTo: updated.status },
        });
        return { data: updated, ok: true };
      } catch (error) { return failure(error); }
    },

    async createTraining(input: { scope: TenantScope; values: SafetyTrainingDraftInput }): Promise<Result<SafetyTrainingRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      try {
        const draft = createSafetyTrainingDraft(input.values);
        const timestamp = now();
        const row: SafetyTrainingRow = {
          ...scopeFields(input.scope), ...draft, id: createId({ kind: "training", scope: input.scope }),
          createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId,
        };
        const created = await repository.createTraining(row);
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.training.create", entityId: created.id, entityLabel: created.name,
          entityType: "workplace-safety-training", occurredAt: timestamp,
          metadata: { durationMinutes: created.durationMinutes, statusTo: created.status, type: created.type },
        });
        return { data: created, ok: true };
      } catch (error) { return failure(error); }
    },

    async planTraining(input: { id: string; scope: TenantScope }): Promise<Result<SafetyTrainingRow>> {
      return transitionTraining(input, "PLANNED");
    },
    async completeTraining(input: { id: string; scope: TenantScope }): Promise<Result<SafetyTrainingRow>> {
      return transitionTraining(input, "COMPLETED");
    },

    async recordTrainingAttendance(input: { scope: TenantScope; values: SafetyTrainingAttendanceInput }): Promise<Result<{ idempotent: boolean; row: SafetyTrainingAttendanceRow }>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      try {
        const key = getSafetyTrainingAttendanceKey(input.values);
        const existing = resolved.data.trainingAttendances.find(
          (row) => getSafetyTrainingAttendanceKey(row) === key,
        );
        if (existing) return { data: { idempotent: true, row: existing }, ok: true };
        if (!resolved.data.trainings.some((row) => row.id === input.values.trainingId.trim())) {
          return missing("İSG eğitim kaydı");
        }
        const timestamp = now();
        const row: SafetyTrainingAttendanceRow = {
          ...scopeFields(input.scope), id: createId({ kind: "training-attendance", scope: input.scope, stableKey: key }),
          personnelId: input.values.personnelId.trim(), status: "ATTENDED", trainingId: input.values.trainingId.trim(),
          createdAt: timestamp, createdBy: input.scope.userId,
        };
        const created = await repository.createTrainingAttendance(row);
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.training-attendance.create", entityId: created.id, entityLabel: created.trainingId,
          entityType: "workplace-safety-training-attendance", occurredAt: timestamp,
          metadata: { trainingId: created.trainingId, statusTo: created.status },
        });
        return { data: { idempotent: false, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async createInspection(input: { scope: TenantScope; values: SafetyInspectionDraftInput }): Promise<Result<SafetyInspectionRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      try {
        const draft = createSafetyInspectionDraft(input.values);
        const timestamp = now();
        const row: SafetyInspectionRow = {
          ...scopeFields(input.scope), ...draft, id: createId({ kind: "inspection", scope: input.scope }),
          createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId,
        };
        const created = await repository.createInspection(row);
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.inspection.create", entityId: created.id, entityLabel: created.inspectorName,
          entityType: "workplace-safety-inspection", occurredAt: timestamp,
          metadata: { projectId: created.projectId, statusTo: created.status },
        });
        return { data: created, ok: true };
      } catch (error) { return failure(error); }
    },

    async completeInspection(input: { id: string; scope: TenantScope }): Promise<Result<SafetyInspectionRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      const existing = resolved.data.inspections.find((row) => row.id === input.id);
      if (!existing) return missing("Saha denetimi");
      try {
        assertSafetyTransition(canTransitionSafetyInspectionStatus(existing.status, "COMPLETED"), "Saha denetimi");
        const timestamp = now();
        const updated = await repository.updateInspection({ ...existing, status: "COMPLETED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.inspection.complete", entityId: updated.id, entityLabel: updated.inspectorName,
          entityType: "workplace-safety-inspection", occurredAt: timestamp,
          metadata: { projectId: updated.projectId, statusFrom: existing.status, statusTo: updated.status },
        });
        return { data: updated, ok: true };
      } catch (error) { return failure(error); }
    },

    async createFinding(input: { scope: TenantScope; values: SafetyFindingDraftInput }): Promise<Result<SafetyFindingRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      try {
        const draft = createSafetyFindingDraft(input.values);
        if (!resolved.data.inspections.some((row) => row.id === draft.inspectionId)) return missing("Saha denetimi");
        const timestamp = now();
        const row: SafetyFindingRow = {
          ...scopeFields(input.scope), ...draft, id: createId({ kind: "finding", scope: input.scope }),
          createdAt: timestamp, createdBy: input.scope.userId, resolvedAt: null, updatedAt: timestamp, updatedBy: input.scope.userId,
        };
        const created = await repository.createFinding(row);
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.finding.create", entityId: created.id, entityLabel: created.category,
          entityType: "workplace-safety-finding", occurredAt: timestamp,
          metadata: { inspectionId: created.inspectionId, riskLevel: created.riskLevel, statusTo: created.status },
        });
        return { data: created, ok: true };
      } catch (error) { return failure(error); }
    },

    async resolveFinding(input: { id: string; scope: TenantScope }): Promise<Result<SafetyFindingRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      const existing = resolved.data.findings.find((row) => row.id === input.id);
      if (!existing) return missing("İSG bulgusu");
      try {
        assertSafetyTransition(canTransitionSafetyFindingStatus(existing.status, "RESOLVED"), "İSG bulgusu");
        const timestamp = now();
        const updated = await repository.updateFinding({ ...existing, resolvedAt: timestamp.slice(0, 10), status: "RESOLVED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.finding.resolve", entityId: updated.id, entityLabel: updated.category,
          entityType: "workplace-safety-finding", occurredAt: timestamp,
          metadata: { riskLevel: updated.riskLevel, statusFrom: existing.status, statusTo: updated.status },
        });
        return { data: updated, ok: true };
      } catch (error) { return failure(error); }
    },

    async createPpeIssuance(input: { scope: TenantScope; values: SafetyPpeIssuanceInput }): Promise<Result<{ idempotent: boolean; row: SafetyPpeIssuanceRow }>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      try {
        const draft = validateSafetyPpeIssuance(input.values);
        const existing = resolved.data.ppeIssuances.find((row) => row.issuanceKey === draft.key);
        if (existing) return { data: { idempotent: true, row: existing }, ok: true };
        const timestamp = now();
        const row: SafetyPpeIssuanceRow = {
          ...scopeFields(input.scope), id: createId({ kind: "ppe-issuance", scope: input.scope, stableKey: draft.key }),
          issuanceKey: draft.key, issuedOn: draft.issuedOn, personnelId: draft.personnelId, ppeCode: draft.ppeCode,
          ppeType: draft.ppeType, quantity: draft.quantity, returnedOn: null, status: draft.status,
          createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId,
        };
        const created = await repository.createPpeIssuance(row);
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.ppe-issuance.create", entityId: created.id, entityLabel: created.ppeCode,
          entityType: "workplace-safety-ppe-issuance", occurredAt: timestamp,
          metadata: { issuanceKey: created.issuanceKey, quantity: created.quantity, statusTo: created.status },
        });
        return { data: { idempotent: false, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async returnPpeIssuance(input: { id: string; scope: TenantScope }): Promise<Result<SafetyPpeIssuanceRow>> {
      const allowed = canMutate(input.scope);
      if (!allowed.ok) return allowed;
      const resolved = await resolve(input.scope);
      if (!resolved.ok) return resolved;
      const existing = resolved.data.ppeIssuances.find((row) => row.id === input.id);
      if (!existing) return missing("KKD zimmeti");
      try {
        assertSafetyTransition(canTransitionSafetyPpeIssuanceStatus(existing.status, "RETURNED"), "KKD zimmeti");
        const timestamp = now();
        const updated = await repository.updatePpeIssuance({ ...existing, returnedOn: timestamp.slice(0, 10), status: "RETURNED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, {
          action: "workplace-safety.ppe-issuance.return", entityId: updated.id, entityLabel: updated.ppeCode,
          entityType: "workplace-safety-ppe-issuance", occurredAt: timestamp,
          metadata: { issuanceKey: updated.issuanceKey, statusFrom: existing.status, statusTo: updated.status },
        });
        return { data: updated, ok: true };
      } catch (error) { return failure(error); }
    },
  };

  async function transitionTraining(input: { id: string; scope: TenantScope }, nextStatus: "PLANNED" | "COMPLETED"): Promise<Result<SafetyTrainingRow>> {
    const allowed = canMutate(input.scope);
    if (!allowed.ok) return allowed;
    const resolved = await resolve(input.scope);
    if (!resolved.ok) return resolved;
    const existing = resolved.data.trainings.find((row) => row.id === input.id);
    if (!existing) return missing("İSG eğitim kaydı");
    try {
      assertSafetyTransition(canTransitionSafetyTrainingStatus(existing.status, nextStatus), "İSG eğitim kaydı");
      const timestamp = now();
      const updated = await repository.updateTraining({ ...existing, status: nextStatus, updatedAt: timestamp, updatedBy: input.scope.userId });
      await audit(auditLogRepository, input.scope, {
        action: nextStatus === "PLANNED" ? "workplace-safety.training.plan" : "workplace-safety.training.complete",
        entityId: updated.id, entityLabel: updated.name, entityType: "workplace-safety-training", occurredAt: timestamp,
        metadata: { statusFrom: existing.status, statusTo: updated.status },
      });
      return { data: updated, ok: true };
    } catch (error) { return failure(error); }
  }
}

function scopeFields(scope: TenantScope) {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}

async function audit(repository: AuditLogRepository | undefined, scope: TenantScope, input: Parameters<typeof createAuditLogEntry>[1]) {
  if (!repository) return;
  await repository.record(createAuditLogEntry(scope, input));
}

function defaultCreateId(input: { kind: string; scope: TenantScope; stableKey?: string }) {
  const suffix = (input.stableKey ?? `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${buildTenantScopeKey(input.scope)}::workplace-safety::${input.kind}::${suffix}`;
}

function missing(label: string): Result<never> { return { errors: [`${label} aktif kapsamda bulunamadı.`], ok: false }; }
function failure(error: unknown): Result<never> {
  if (error instanceof WorkplaceSafetyDomainError) return { errors: [error.message], ok: false };
  return { errors: ["İSG işlemi tamamlanamadı."], ok: false };
}
