import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  EmployeeLeaveDomainError,
  assertEmployeeLeaveTransition,
  assertNoEmployeeLeaveOverlap,
  calculateLeaveBalance,
  createEmployeeLeaveDraft,
  getEmployeeLeaveBalanceMutationRequestKey,
  getEmployeeLeaveMutationRequestKey,
  getEmployeeLeavePermission,
  normalizeEmployeeLeaveDraftUpdate,
  normalizeLeaveBalanceInput,
  type EmployeeLeaveDraftInput,
  type EmployeeLeaveOperation,
  type EmployeeLeaveStatus,
} from "./employee-leave";
import {
  EmployeeLeaveRepositoryError,
  type EmployeeLeaveBalanceRow,
  type EmployeeLeaveRepository,
  type EmployeeLeaveRow,
} from "./employee-leave-prisma-repository";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type EmployeeLeaveBalanceInput = {
  adjustmentDays: number;
  openingDays: number;
  personnelCode: string;
  personnelName: string;
  requestKey: string;
  year: number;
};

export type EmployeeLeaveDraftUpdateInput = EmployeeLeaveDraftInput & {
  expectedRevisionNo: number;
  leaveId: string;
};

export function createEmployeeLeaveService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (scope: TenantScope, entity: "balance" | "leave") => string;
  now: () => string;
  repository: EmployeeLeaveRepository;
}) {
  return {
    async list(input: { scope: TenantScope }): Promise<Result<{
      balances: EmployeeLeaveBalanceRow[];
      leaves: EmployeeLeaveRow[];
    }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const [balances, leaves] = await Promise.all([
        repository.listBalances({ scope: input.scope }),
        repository.listLeaves({ scope: input.scope }),
      ]);
      return { data: { balances, leaves }, ok: true };
    },

    async get(input: {
      leaveId: string;
      scope: TenantScope;
    }): Promise<Result<{ leave: EmployeeLeaveRow }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const leave = await repository.findLeaveById({
        id: String(input.leaveId ?? "").trim(),
        scope: input.scope,
      });
      return leave ? { data: { leave }, ok: true } : missing();
    },

    async create(input: {
      scope: TenantScope;
      values: EmployeeLeaveDraftInput;
    }): Promise<Result<{ idempotent: boolean; leave: EmployeeLeaveRow }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "create");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const draft = createEmployeeLeaveDraft({
          ...input.values,
          actorUserId: input.scope.userId,
        });
        const existing = await repository.findLeaveByCreateKey({
          createRequestKey: draft.createRequestKey,
          scope: input.scope,
        });
        if (existing) return success(existing, true);
        const timestamp = now();
        const leave = await repository.createLeave({
          ...scopeFields(input.scope),
          ...draft,
          approveRequestKey: null,
          approvedAt: null,
          cancelRequestKey: null,
          cancelledAt: null,
          createdAt: timestamp,
          createdBy: input.scope.userId,
          id: createId(input.scope, "leave"),
          lastUpdateKey: null,
          rejectRequestKey: null,
          rejectedAt: null,
          submitRequestKey: null,
          submittedAt: null,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, leave, {
          action: "employee-leave.create",
          statusTo: leave.status,
        }, timestamp);
        return success(leave, false);
      } catch (error) {
        return failure(error);
      }
    },

    async updateDraft(input: {
      scope: TenantScope;
      values: EmployeeLeaveDraftUpdateInput;
    }): Promise<Result<{ idempotent: boolean; leave: EmployeeLeaveRow }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "edit");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const values = normalizeEmployeeLeaveDraftUpdate(input.values);
        const existing = await repository.findLeaveById({
          id: values.leaveId,
          scope: input.scope,
        });
        if (!existing) return missing();
        const mutationKey = getEmployeeLeaveMutationRequestKey({
          actorUserId: input.scope.userId,
          leaveId: existing.id,
          operation: "edit",
          requestKey: values.mutationRequestKey,
        });
        if (existing.lastUpdateKey === mutationKey) return success(existing, true);
        if (existing.status !== "DRAFT") return invalid("Yalnız taslak izin düzenlenebilir.");
        if (existing.revisionNo !== values.expectedRevisionNo) {
          return invalid("İzin kaydı başka bir işlemle güncellendi; güncel kaydı yeniden açın.");
        }
        const timestamp = now();
        const leave = await repository.updateDraft({
          expectedRevisionNo: existing.revisionNo,
          row: {
            ...existing,
            chargeableDays: values.chargeableDays,
            documentFileId: values.documentFileId,
            endDate: values.endDate,
            lastUpdateKey: mutationKey,
            leaveType: values.leaveType,
            note: values.note,
            personnelCode: values.personnelCode,
            personnelName: values.personnelName,
            revisionNo: existing.revisionNo + 1,
            startDate: values.startDate,
            updatedAt: timestamp,
            updatedBy: input.scope.userId,
          },
        });
        await audit(auditLogRepository, input.scope, leave, {
          action: "employee-leave.update",
          revisionFrom: existing.revisionNo,
          revisionTo: leave.revisionNo,
          status: leave.status,
        }, timestamp);
        return success(leave, false);
      } catch (error) {
        return failure(error);
      }
    },

    async saveBalance(input: {
      scope: TenantScope;
      values: EmployeeLeaveBalanceInput;
    }): Promise<Result<{ balance: EmployeeLeaveBalanceRow; idempotent: boolean }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "balance");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const values = normalizeLeaveBalanceInput(input.values);
        const mutationKey = getEmployeeLeaveBalanceMutationRequestKey({
          actorUserId: input.scope.userId,
          personnelCode: values.personnelCode,
          requestKey: values.mutationRequestKey,
          year: values.year,
        });
        const existing = await repository.findBalance({
          personnelCode: values.personnelCode,
          scope: input.scope,
          year: values.year,
        });
        if (existing?.lastMutationKey === mutationKey) {
          return { data: { balance: existing, idempotent: true }, ok: true };
        }
        const next = calculateLeaveBalance({
          adjustmentDays: values.adjustmentDays,
          openingDays: values.openingDays,
          usedDays: existing?.usedDays ?? 0,
        });
        if (next.remainingDays < 0) {
          return invalid("Yeni izin bakiyesi kullanılan günlerin altına düşemez.");
        }
        const timestamp = now();
        const balance = await repository.saveBalance({
          ...(existing ? { expectedRevisionNo: existing.revisionNo } : {}),
          row: {
            ...scopeFields(input.scope),
            adjustmentDays: values.adjustmentDays,
            createdAt: existing?.createdAt ?? timestamp,
            createdBy: existing?.createdBy ?? input.scope.userId,
            id: existing?.id ?? createId(input.scope, "balance"),
            lastMutationKey: mutationKey,
            openingDays: values.openingDays,
            personnelCode: values.personnelCode,
            personnelName: values.personnelName,
            revisionNo: (existing?.revisionNo ?? 0) + 1,
            updatedAt: timestamp,
            updatedBy: input.scope.userId,
            usedDays: existing?.usedDays ?? 0,
            year: values.year,
          },
        });
        await auditBalance(auditLogRepository, input.scope, balance, timestamp);
        return { data: { balance, idempotent: false }, ok: true };
      } catch (error) {
        return failure(error);
      }
    },

    async submit(input: TransitionInput) {
      return transition(input, "submit", "SUBMITTED");
    },
    async approve(input: TransitionInput) {
      return transition(input, "approve", "APPROVED");
    },
    async reject(input: TransitionInput) {
      return transition(input, "reject", "REJECTED");
    },
    async cancel(input: TransitionInput) {
      return transition(input, "cancel", "CANCELLED");
    },
  };

  async function transition(
    input: TransitionInput,
    operation: "approve" | "cancel" | "reject" | "submit",
    toStatus: Extract<EmployeeLeaveStatus, "APPROVED" | "CANCELLED" | "REJECTED" | "SUBMITTED">,
  ): Promise<Result<{
    balance?: EmployeeLeaveBalanceRow;
    idempotent: boolean;
    leave: EmployeeLeaveRow;
  }>> {
    const valid = validateScope(input.scope);
    if (!valid.ok) return valid;
    const permission = can(input.scope, operation);
    if (!permission.allowed) return invalid(permission.reason);
    try {
      const leave = await repository.findLeaveById({
        id: String(input.leaveId ?? "").trim(),
        scope: input.scope,
      });
      if (!leave) return missing();
      const mutationKey = getEmployeeLeaveMutationRequestKey({
        actorUserId: input.scope.userId,
        leaveId: leave.id,
        operation,
        requestKey: input.requestKey,
      });
      const storedKey = operation === "submit"
        ? leave.submitRequestKey
        : operation === "approve"
          ? leave.approveRequestKey
          : operation === "reject"
            ? leave.rejectRequestKey
            : leave.cancelRequestKey;
      if (storedKey === mutationKey) {
        return { data: { idempotent: true, leave }, ok: true };
      }
      assertEmployeeLeaveTransition(leave.status, toStatus);
      if (operation === "submit" || operation === "approve") {
        assertNoEmployeeLeaveOverlap({
          candidateEndDate: leave.endDate,
          candidateStartDate: leave.startDate,
          existing: await repository.listPersonnelLeaves({
            personnelCode: leave.personnelCode,
            scope: input.scope,
          }),
          ignoreId: leave.id,
        });
      }
      const timestamp = now();
      const balanceInput = await nextAnnualBalance({
        leave,
        operation,
        scope: input.scope,
        timestamp,
      });
      if (!balanceInput.ok) return balanceInput;
      const result = await repository.transition({
        ...(balanceInput.data ? { balance: balanceInput.data } : {}),
        expectedRevisionNo: leave.revisionNo,
        fromStatus: leave.status,
        row: {
          ...leave,
          ...(operation === "submit"
            ? { submitRequestKey: mutationKey, submittedAt: timestamp }
            : operation === "approve"
              ? { approveRequestKey: mutationKey, approvedAt: timestamp }
              : operation === "reject"
                ? { rejectRequestKey: mutationKey, rejectedAt: timestamp }
                : { cancelRequestKey: mutationKey, cancelledAt: timestamp }),
          revisionNo: leave.revisionNo + 1,
          status: toStatus,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        },
      });
      await audit(auditLogRepository, input.scope, result.leave, {
        action: `employee-leave.${operation}`,
        revisionFrom: leave.revisionNo,
        revisionTo: result.leave.revisionNo,
        statusFrom: leave.status,
        statusTo: result.leave.status,
      }, timestamp);
      return {
        data: {
          ...(result.balance ? { balance: result.balance } : {}),
          idempotent: false,
          leave: result.leave,
        },
        ok: true,
      };
    } catch (error) {
      return failure(error);
    }
  }

  async function nextAnnualBalance(input: {
    leave: EmployeeLeaveRow;
    operation: "approve" | "cancel" | "reject" | "submit";
    scope: TenantScope;
    timestamp: string;
  }): Promise<Result<{
    expectedRevisionNo: number;
    row: EmployeeLeaveBalanceRow;
  } | undefined>> {
    if (input.leave.leaveType !== "ANNUAL"
      || (input.operation !== "approve" && input.operation !== "cancel")) {
      return { data: undefined, ok: true };
    }
    const year = Number(input.leave.startDate.slice(0, 4));
    const balance = await repository.findBalance({
      personnelCode: input.leave.personnelCode,
      scope: input.scope,
      year,
    });
    if (!balance) return invalid("Personelin izin yılı için yıllık bakiye kaydı bulunamadı.");
    const nextUsedDays = input.operation === "approve"
      ? balance.usedDays + input.leave.chargeableDays
      : balance.usedDays - input.leave.chargeableDays;
    const summary = calculateLeaveBalance({
      adjustmentDays: balance.adjustmentDays,
      openingDays: balance.openingDays,
      usedDays: nextUsedDays,
    });
    if (summary.usedDays < 0 || summary.remainingDays < 0) {
      return invalid(
        input.operation === "approve"
          ? "Personelin yıllık izin bakiyesi yetersizdir."
          : "İzin iptali yıllık bakiye kullanılan gününü sıfırın altına düşüremez.",
      );
    }
    return {
      data: {
        expectedRevisionNo: balance.revisionNo,
        row: {
          ...balance,
          revisionNo: balance.revisionNo + 1,
          updatedAt: input.timestamp,
          updatedBy: input.scope.userId,
          usedDays: summary.usedDays,
        },
      },
      ok: true,
    };
  }
}

type TransitionInput = {
  leaveId: string;
  requestKey: string;
  scope: TenantScope;
};

function can(scope: TenantScope, operation: EmployeeLeaveOperation) {
  return getEmployeeLeavePermission({
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
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}
function success(leave: EmployeeLeaveRow, idempotent: boolean) {
  return { data: { idempotent, leave }, ok: true as const };
}
function invalid(message: string): Result<never> {
  return { errors: [message], ok: false };
}
function missing(): Result<never> {
  return { errors: ["Personel izin kaydı aktif kapsamda bulunamadı."], ok: false };
}
function failure(error: unknown): Result<never> {
  return error instanceof EmployeeLeaveDomainError
    || error instanceof EmployeeLeaveRepositoryError
    ? { errors: [error.message], ok: false }
    : { errors: ["Personel izin işlemi tamamlanamadı."], ok: false };
}
async function audit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  leave: EmployeeLeaveRow,
  metadata: Record<string, unknown> & { action: string },
  occurredAt: string,
) {
  if (!repository) return;
  const { action, ...safeMetadata } = metadata;
  await repository.record(createAuditLogEntry(scope, {
    action,
    entityId: leave.id,
    entityLabel: leave.id,
    entityType: "employee-leave",
    metadata: {
      chargeableDays: leave.chargeableDays,
      leaveType: leave.leaveType,
      personnelCode: leave.personnelCode,
      ...safeMetadata,
    },
    occurredAt,
  }));
}
async function auditBalance(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  balance: EmployeeLeaveBalanceRow,
  occurredAt: string,
) {
  if (!repository) return;
  await repository.record(createAuditLogEntry(scope, {
    action: "employee-leave.balance.save",
    entityId: balance.id,
    entityLabel: balance.id,
    entityType: "employee-leave-balance",
    metadata: {
      personnelCode: balance.personnelCode,
      revisionTo: balance.revisionNo,
      year: balance.year,
    },
    occurredAt,
  }));
}
function defaultCreateId(scope: TenantScope, entity: "balance" | "leave") {
  return `${buildTenantScopeKey(scope)}::employee-leave-${entity}::${Date.now()}-${Math.random()}`;
}
