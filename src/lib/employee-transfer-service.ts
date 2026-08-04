import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  EmployeeTransferDomainError,
  assertEmployeeTransferEffectiveDate,
  assertEmployeeTransferSourceContinuity,
  assertEmployeeTransferTransition,
  assertNoPendingEmployeeTransfer,
  createEmployeeTransferDraft,
  getEmployeeTransferMutationRequestKey,
  getEmployeeTransferPermission,
  normalizeEmployeeTransferDraftUpdate,
  type EmployeeTransferDraftInput,
  type EmployeeTransferOperation,
  type EmployeeTransferStatus,
} from "./employee-transfer";
import {
  EmployeeTransferRepositoryError,
  type EmployeeTransferRepository,
  type EmployeeTransferRow,
} from "./employee-transfer-prisma-repository";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type EmployeeTransferDraftUpdateInput = EmployeeTransferDraftInput & {
  expectedRevisionNo: number;
  transferId: string;
};

type DraftContext = {
  currentPersonnelSiteName: string;
  scope: TenantScope;
};

type TransitionInput = {
  requestKey: string;
  scope: TenantScope;
  transferId: string;
};

export function createEmployeeTransferService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (scope: TenantScope) => string;
  now: () => string;
  repository: EmployeeTransferRepository;
}) {
  return {
    async list(input: { scope: TenantScope }): Promise<Result<{
      transfers: EmployeeTransferRow[];
    }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      return {
        data: { transfers: await repository.list({ scope: input.scope }) },
        ok: true,
      };
    },

    async get(input: {
      scope: TenantScope;
      transferId: string;
    }): Promise<Result<{ transfer: EmployeeTransferRow }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const transfer = await repository.findById({
        id: String(input.transferId ?? "").trim(),
        scope: input.scope,
      });
      return transfer ? { data: { transfer }, ok: true } : missing();
    },

    async create(input: DraftContext & {
      values: EmployeeTransferDraftInput;
    }): Promise<Result<{ idempotent: boolean; transfer: EmployeeTransferRow }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "create");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const draft = createEmployeeTransferDraft({
          ...input.values,
          actorUserId: input.scope.userId,
        });
        const existing = await repository.findByCreateKey({
          createRequestKey: draft.createRequestKey,
          scope: input.scope,
        });
        if (existing) return success(existing, true);
        await assertDraftContext({
          currentPersonnelSiteName: input.currentPersonnelSiteName,
          personnelCode: draft.personnelCode,
          scope: input.scope,
          sourceSiteCode: draft.sourceSiteCode,
          sourceSiteName: draft.sourceSiteName,
        });
        const timestamp = now();
        const transfer = await repository.create({
          ...scopeFields(input.scope),
          ...draft,
          approveRequestKey: null,
          approvedAt: null,
          createdAt: timestamp,
          createdBy: input.scope.userId,
          id: createId(input.scope),
          lastUpdateKey: null,
          rejectRequestKey: null,
          rejectedAt: null,
          submitRequestKey: null,
          submittedAt: null,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, transfer, {
          action: "employee-transfer.create",
          statusTo: transfer.status,
        }, timestamp);
        return success(transfer, false);
      } catch (error) {
        return failure(error);
      }
    },

    async updateDraft(input: DraftContext & {
      values: EmployeeTransferDraftUpdateInput;
    }): Promise<Result<{ idempotent: boolean; transfer: EmployeeTransferRow }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "edit");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const values = normalizeEmployeeTransferDraftUpdate(input.values);
        const existing = await repository.findById({
          id: values.transferId,
          scope: input.scope,
        });
        if (!existing) return missing();
        const mutationKey = getEmployeeTransferMutationRequestKey({
          actorUserId: input.scope.userId,
          operation: "edit",
          requestKey: values.mutationRequestKey,
          transferId: existing.id,
        });
        if (existing.lastUpdateKey === mutationKey) return success(existing, true);
        if (existing.status !== "DRAFT") {
          return invalid("Yalnız taslak personel transferi düzenlenebilir.");
        }
        if (existing.revisionNo !== values.expectedRevisionNo) return stale();
        await assertDraftContext({
          currentPersonnelSiteName: input.currentPersonnelSiteName,
          ignoreId: existing.id,
          personnelCode: values.personnelCode,
          scope: input.scope,
          sourceSiteCode: values.sourceSiteCode,
          sourceSiteName: values.sourceSiteName,
        });
        const timestamp = now();
        const transfer = await repository.updateDraft({
          expectedRevisionNo: existing.revisionNo,
          row: {
            ...existing,
            effectiveDate: values.effectiveDate,
            lastUpdateKey: mutationKey,
            note: values.note,
            personnelCode: values.personnelCode,
            personnelName: values.personnelName,
            revisionNo: existing.revisionNo + 1,
            sourceSiteCode: values.sourceSiteCode,
            sourceSiteName: values.sourceSiteName,
            targetSiteCode: values.targetSiteCode,
            targetSiteName: values.targetSiteName,
            updatedAt: timestamp,
            updatedBy: input.scope.userId,
          },
        });
        await audit(auditLogRepository, input.scope, transfer, {
          action: "employee-transfer.update",
          revisionFrom: existing.revisionNo,
          revisionTo: transfer.revisionNo,
          status: transfer.status,
        }, timestamp);
        return success(transfer, false);
      } catch (error) {
        return failure(error);
      }
    },

    async submit(input: TransitionInput & {
      currentPersonnelSiteName: string;
    }) {
      return transition(input, "submit", "SUBMITTED");
    },

    async approve(input: TransitionInput & {
      currentPersonnelSiteName: string;
      expectedPersonnelUpdatedAt: string;
      today: string;
    }) {
      return transition(input, "approve", "APPROVED");
    },

    async reject(input: TransitionInput) {
      return transition(input, "reject", "REJECTED");
    },
  };

  async function transition(
    input: TransitionInput & {
      currentPersonnelSiteName?: string;
      expectedPersonnelUpdatedAt?: string;
      today?: string;
    },
    operation: "approve" | "reject" | "submit",
    toStatus: Extract<EmployeeTransferStatus, "APPROVED" | "REJECTED" | "SUBMITTED">,
  ): Promise<Result<{ idempotent: boolean; transfer: EmployeeTransferRow }>> {
    const valid = validateScope(input.scope);
    if (!valid.ok) return valid;
    const permission = can(input.scope, operation);
    if (!permission.allowed) return invalid(permission.reason);
    try {
      const transfer = await repository.findById({
        id: String(input.transferId ?? "").trim(),
        scope: input.scope,
      });
      if (!transfer) return missing();
      const mutationKey = getEmployeeTransferMutationRequestKey({
        actorUserId: input.scope.userId,
        operation,
        requestKey: input.requestKey,
        transferId: transfer.id,
      });
      const storedKey = operation === "submit"
        ? transfer.submitRequestKey
        : operation === "approve"
          ? transfer.approveRequestKey
          : transfer.rejectRequestKey;
      if (storedKey === mutationKey) return success(transfer, true);
      assertEmployeeTransferTransition(transfer.status, toStatus);

      if (operation === "submit" || operation === "approve") {
        await assertDraftContext({
          currentPersonnelSiteName: required(
            input.currentPersonnelSiteName,
            "Personelin güncel şantiyesi",
          ),
          ignoreId: transfer.id,
          personnelCode: transfer.personnelCode,
          scope: input.scope,
          sourceSiteCode: transfer.sourceSiteCode,
          sourceSiteName: transfer.sourceSiteName,
        });
      }
      if (operation === "approve") {
        assertEmployeeTransferEffectiveDate({
          effectiveDate: transfer.effectiveDate,
          today: required(input.today, "Aktif şirket tarihi"),
        });
      }

      const timestamp = now();
      const next: EmployeeTransferRow = {
        ...transfer,
        ...(operation === "submit"
          ? { submitRequestKey: mutationKey, submittedAt: timestamp }
          : operation === "approve"
            ? { approveRequestKey: mutationKey, approvedAt: timestamp }
            : { rejectRequestKey: mutationKey, rejectedAt: timestamp }),
        revisionNo: transfer.revisionNo + 1,
        status: toStatus,
        updatedAt: timestamp,
        updatedBy: input.scope.userId,
      };
      const saved = operation === "approve"
        ? (await repository.approve({
            expectedPersonnelUpdatedAt: required(
              input.expectedPersonnelUpdatedAt,
              "Personel kartı sürümü",
            ),
            expectedRevisionNo: transfer.revisionNo,
            row: next,
          })).transfer
        : await repository.transition({
            expectedRevisionNo: transfer.revisionNo,
            fromStatus: transfer.status,
            row: next,
          });
      await audit(auditLogRepository, input.scope, saved, {
        action: `employee-transfer.${operation}`,
        revisionFrom: transfer.revisionNo,
        revisionTo: saved.revisionNo,
        statusFrom: transfer.status,
        statusTo: saved.status,
      }, timestamp);
      return success(saved, false);
    } catch (error) {
      return failure(error);
    }
  }

  async function assertDraftContext(input: {
    currentPersonnelSiteName: string;
    ignoreId?: string;
    personnelCode: string;
    scope: TenantScope;
    sourceSiteCode: string;
    sourceSiteName: string;
  }) {
    const existing = await repository.listPersonnelTransfers({
      personnelCode: input.personnelCode,
      scope: input.scope,
    });
    const latestApproved = existing.find((row) =>
      row.id !== input.ignoreId && row.status === "APPROVED");
    assertEmployeeTransferSourceContinuity({
      currentPersonnelSiteName: input.currentPersonnelSiteName,
      latestApprovedTargetSiteCode: latestApproved?.targetSiteCode,
      sourceSiteCode: input.sourceSiteCode,
      sourceSiteName: input.sourceSiteName,
    });
    assertNoPendingEmployeeTransfer({
      existing,
      ignoreId: input.ignoreId,
      personnelCode: input.personnelCode,
    });
  }
}

function can(scope: TenantScope, operation: EmployeeTransferOperation) {
  return getEmployeeTransferPermission({
    operation,
    periodClosed: Boolean(scope.periodClosed),
    role: scope.userRole,
  });
}
function validateScope(scope: TenantScope): Result<null> {
  const errors = validateTenantScope(scope);
  return errors.length ? { errors, ok: false } : { data: null, ok: true };
}
function scopeFields(scope: TenantScope) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}
function success(transfer: EmployeeTransferRow, idempotent: boolean) {
  return { data: { idempotent, transfer }, ok: true as const };
}
function invalid(message: string): Result<never> {
  return { errors: [message], ok: false };
}
function stale(): Result<never> {
  return {
    errors: ["Personel transferi başka bir işlemle güncellendi; güncel kaydı yeniden açın."],
    ok: false,
  };
}
function missing(): Result<never> {
  return {
    errors: ["Personel transferi aktif kapsamda bulunamadı."],
    ok: false,
  };
}
function failure(error: unknown): Result<never> {
  return error instanceof EmployeeTransferDomainError
    || error instanceof EmployeeTransferRepositoryError
    ? { errors: [error.message], ok: false }
    : { errors: ["Personel transfer işlemi tamamlanamadı."], ok: false };
}
function required(value: string | undefined, label: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new EmployeeTransferDomainError("INVALID_INPUT", `${label} zorunludur.`);
  }
  return normalized;
}
async function audit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  transfer: EmployeeTransferRow,
  metadata: Record<string, unknown> & { action: string },
  occurredAt: string,
) {
  if (!repository) return;
  const { action, ...safeMetadata } = metadata;
  await repository.record(createAuditLogEntry(scope, {
    action,
    entityId: transfer.id,
    entityLabel: transfer.id,
    entityType: "employee-transfer",
    metadata: {
      personnelCode: transfer.personnelCode,
      sourceSiteCode: transfer.sourceSiteCode,
      targetSiteCode: transfer.targetSiteCode,
      ...safeMetadata,
    },
    occurredAt,
  }));
}
function defaultCreateId(scope: TenantScope) {
  return `${buildTenantScopeKey(scope)}::employee-transfer::${Date.now()}-${Math.random()}`;
}
