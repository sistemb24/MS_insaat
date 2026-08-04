import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  EmployeeAdvanceDomainError,
  assertEmployeeAdvanceSettlementCapacity,
  assertEmployeeAdvanceTransition,
  createEmployeeAdvanceDraft,
  getEmployeeAdvanceMutationRequestKey,
  getEmployeeAdvancePermission,
  normalizeEmployeeAdvanceApproval,
  normalizeEmployeeAdvanceDraftUpdate,
  normalizeEmployeeAdvancePayment,
  normalizeEmployeeAdvanceSettlement,
  type EmployeeAdvanceDraftInput,
  type EmployeeAdvanceOperation,
  type EmployeeAdvanceStatus,
} from "./employee-advance";
import {
  EmployeeAdvanceRepositoryError,
  type EmployeeAdvanceRepository,
  type EmployeeAdvanceRow,
  type EmployeeAdvanceSettlementRow,
} from "./employee-advance-prisma-repository";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type EmployeeAdvanceDraftUpdateInput = EmployeeAdvanceDraftInput & {
  advanceId: string;
  expectedRevisionNo: number;
};

export type EmployeeAdvanceFinanceApprovalInput = {
  advanceId: string;
  approvedAmount: number;
  expectedRevisionNo: number;
  requestKey: string;
};

export type EmployeeAdvancePaymentInput = {
  accountCode: string;
  accountName: string;
  advanceId: string;
  expectedRevisionNo: number;
  paymentDate: string;
  requestKey: string;
};

export type EmployeeAdvanceSettlementInput = {
  advanceId: string;
  amount: number;
  payrollAccrualId: string;
  payrollLinePersonCode: string;
  requestKey: string;
  settlementDate: string;
};

export function createEmployeeAdvanceService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (
    scope: TenantScope,
    entity: "advance" | "ledger" | "movement" | "settlement",
  ) => string;
  now: () => string;
  repository: EmployeeAdvanceRepository;
}) {
  return {
    async list(input: { scope: TenantScope }) {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const data = await repository.list({ scope: input.scope });
      return { data, ok: true as const };
    },

    async listPayrollDeductions(input: {
      personnelCode?: string;
      scope: TenantScope;
    }) {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const rows = await repository.listPayrollDeductions(input);
      return { data: { rows }, ok: true as const };
    },

    async get(input: { advanceId: string; scope: TenantScope }) {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const advance = await repository.findById({
        id: String(input.advanceId ?? "").trim(),
        scope: input.scope,
      });
      return advance ? { data: { advance }, ok: true as const } : missing();
    },

    async create(input: {
      scope: TenantScope;
      values: EmployeeAdvanceDraftInput;
    }): Promise<Result<{ advance: EmployeeAdvanceRow; idempotent: boolean }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "create");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const draft = createEmployeeAdvanceDraft({
          ...input.values,
          actorUserId: input.scope.userId,
        });
        const existing = await repository.findByCreateKey({
          createRequestKey: draft.createRequestKey,
          scope: input.scope,
        });
        if (existing) return success(existing, true);
        const timestamp = now();
        const advance = await repository.create({
          ...scopeFields(input.scope),
          ...draft,
          cancelRequestKey: null,
          cancelledAt: null,
          createdAt: timestamp,
          createdBy: input.scope.userId,
          financeApproveRequestKey: null,
          financeApprovedAt: null,
          financeRejectRequestKey: null,
          financeRejectedAt: null,
          id: createId(input.scope, "advance"),
          lastUpdateKey: null,
          managerApproveRequestKey: null,
          managerApprovedAt: null,
          managerRejectRequestKey: null,
          managerRejectedAt: null,
          paidAt: null,
          paymentAccountCode: null,
          paymentAccountName: null,
          paymentDate: null,
          paymentLedgerEntryId: null,
          paymentMovementId: null,
          paymentRequestKey: null,
          settledAmount: 0,
          submitRequestKey: null,
          submittedAt: null,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, advance, {
          action: "employee-advance.create",
          statusTo: advance.status,
        }, timestamp);
        return success(advance, false);
      } catch (error) {
        return failure(error);
      }
    },

    async updateDraft(input: {
      scope: TenantScope;
      values: EmployeeAdvanceDraftUpdateInput;
    }): Promise<Result<{ advance: EmployeeAdvanceRow; idempotent: boolean }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "edit");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const values = normalizeEmployeeAdvanceDraftUpdate(input.values);
        const existing = await repository.findById({
          id: values.advanceId,
          scope: input.scope,
        });
        if (!existing) return missing();
        const mutationKey = getEmployeeAdvanceMutationRequestKey({
          actorUserId: input.scope.userId,
          advanceId: existing.id,
          operation: "edit",
          requestKey: values.mutationRequestKey,
        });
        if (existing.lastUpdateKey === mutationKey) return success(existing, true);
        if (existing.status !== "DRAFT") {
          return invalid("Yalnız taslak avans talebi düzenlenebilir.");
        }
        if (existing.revisionNo !== values.expectedRevisionNo) return stale();
        const timestamp = now();
        const advance = await repository.updateDraft({
          expectedRevisionNo: existing.revisionNo,
          row: {
            ...existing,
            lastUpdateKey: mutationKey,
            note: values.note,
            personnelCode: values.personnelCode,
            personnelName: values.personnelName,
            requestDate: values.requestDate,
            requestedAmount: values.requestedAmount,
            revisionNo: existing.revisionNo + 1,
            updatedAt: timestamp,
            updatedBy: input.scope.userId,
          },
        });
        await audit(auditLogRepository, input.scope, advance, {
          action: "employee-advance.update",
          revisionFrom: existing.revisionNo,
          revisionTo: advance.revisionNo,
          status: advance.status,
        }, timestamp);
        return success(advance, false);
      } catch (error) {
        return failure(error);
      }
    },

    async submit(input: TransitionInput) {
      return transition(input, "submit", "SUBMITTED");
    },
    async managerApprove(input: TransitionInput) {
      return transition(input, "manager-approve", "MANAGER_APPROVED");
    },
    async managerReject(input: TransitionInput) {
      return transition(input, "manager-reject", "REJECTED");
    },
    async financeReject(input: TransitionInput) {
      return transition(input, "finance-reject", "REJECTED");
    },
    async cancel(input: TransitionInput) {
      return transition(input, "cancel", "CANCELLED");
    },

    async financeApprove(input: {
      scope: TenantScope;
      values: EmployeeAdvanceFinanceApprovalInput;
    }): Promise<Result<{ advance: EmployeeAdvanceRow; idempotent: boolean }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "finance-approve");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const existing = await repository.findById({
          id: input.values.advanceId,
          scope: input.scope,
        });
        if (!existing) return missing();
        const values = normalizeEmployeeAdvanceApproval({
          ...input.values,
          requestedAmount: existing.requestedAmount,
        });
        const mutationKey = getEmployeeAdvanceMutationRequestKey({
          actorUserId: input.scope.userId,
          advanceId: existing.id,
          operation: "finance-approve",
          requestKey: values.mutationRequestKey,
        });
        if (existing.financeApproveRequestKey === mutationKey) {
          return success(existing, true);
        }
        if (existing.revisionNo !== values.expectedRevisionNo) return stale();
        assertEmployeeAdvanceTransition(existing.status, "FINANCE_APPROVED");
        const timestamp = now();
        const advance = await repository.transition({
          expectedRevisionNo: existing.revisionNo,
          fromStatus: existing.status,
          row: {
            ...existing,
            approvedAmount: values.approvedAmount,
            financeApproveRequestKey: mutationKey,
            financeApprovedAt: timestamp,
            revisionNo: existing.revisionNo + 1,
            status: "FINANCE_APPROVED",
            updatedAt: timestamp,
            updatedBy: input.scope.userId,
          },
        });
        await auditTransition(
          auditLogRepository,
          input.scope,
          existing,
          advance,
          "finance-approve",
          timestamp,
        );
        return success(advance, false);
      } catch (error) {
        return failure(error);
      }
    },

    async pay(input: {
      scope: TenantScope;
      values: EmployeeAdvancePaymentInput;
    }): Promise<Result<{ advance: EmployeeAdvanceRow; idempotent: boolean }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "pay");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const values = normalizeEmployeeAdvancePayment(input.values);
        const existing = await repository.findById({
          id: values.advanceId,
          scope: input.scope,
        });
        if (!existing) return missing();
        const mutationKey = getEmployeeAdvanceMutationRequestKey({
          actorUserId: input.scope.userId,
          advanceId: existing.id,
          operation: "pay",
          requestKey: values.mutationRequestKey,
        });
        if (
          existing.paymentRequestKey === mutationKey
          && existing.paymentMovementId
          && existing.paymentLedgerEntryId
        ) {
          return success(existing, true);
        }
        if (existing.revisionNo !== values.expectedRevisionNo) return stale();
        assertEmployeeAdvanceTransition(existing.status, "PAID");
        if (!existing.approvedAmount) {
          return invalid("Ödeme için finans onay tutarı bulunamadı.");
        }
        const timestamp = now();
        const row: EmployeeAdvanceRow = {
          ...existing,
          paidAt: timestamp,
          paymentAccountCode: values.accountCode,
          paymentAccountName: values.accountName,
          paymentDate: values.paymentDate,
          paymentRequestKey: mutationKey,
          revisionNo: existing.revisionNo + 1,
          status: "PAID",
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        };
        const advance = await repository.pay({
          expectedRevisionNo: existing.revisionNo,
          ledgerDocumentNo: documentNo("YVM-AVN", existing.id),
          ledgerEntryId: createId(input.scope, "ledger"),
          movementDocumentNo: documentNo("AVN", existing.id),
          movementId: createId(input.scope, "movement"),
          row,
        });
        await auditTransition(
          auditLogRepository,
          input.scope,
          existing,
          advance,
          "pay",
          timestamp,
        );
        return success(advance, false);
      } catch (error) {
        return failure(error);
      }
    },

    async settle(input: {
      scope: TenantScope;
      values: EmployeeAdvanceSettlementInput;
    }): Promise<Result<{
      advance: EmployeeAdvanceRow;
      idempotent: boolean;
      settlement: EmployeeAdvanceSettlementRow;
    }>> {
      const valid = validateScope(input.scope);
      if (!valid.ok) return valid;
      const permission = can(input.scope, "settle");
      if (!permission.allowed) return invalid(permission.reason);
      try {
        const values = normalizeEmployeeAdvanceSettlement(input.values);
        const existing = await repository.findById({
          id: values.advanceId,
          scope: input.scope,
        });
        if (!existing) return missing();
        const mutationKey = getEmployeeAdvanceMutationRequestKey({
          actorUserId: input.scope.userId,
          advanceId: existing.id,
          operation: "settle",
          requestKey: values.mutationRequestKey,
        });
        const duplicate = await repository.findSettlementByKey({
          mutationRequestKey: mutationKey,
          scope: input.scope,
        });
        if (duplicate) {
          return {
            data: { advance: existing, idempotent: true, settlement: duplicate },
            ok: true,
          };
        }
        if (existing.status !== "PAID" || !existing.approvedAmount) {
          return invalid("Yalnız ödenmiş ve açık bakiyesi bulunan avans mahsup edilebilir.");
        }
        if (values.payrollLinePersonCode !== existing.personnelCode) {
          return invalid("Bordro satırı ile avans personeli eşleşmiyor.");
        }
        const payrollRows = await repository.listPayrollDeductions({
          personnelCode: existing.personnelCode,
          scope: input.scope,
        });
        const payroll = payrollRows.find(
          (row) => row.payrollAccrualId === values.payrollAccrualId,
        );
        if (!payroll) {
          return invalid(
            "Kesinleşmiş ve tahsis edilebilir avans kesintili bordro satırı bulunamadı.",
          );
        }
        const capacity = assertEmployeeAdvanceSettlementCapacity({
          advanceRemainingAmount:
            existing.approvedAmount - existing.settledAmount,
          amount: values.amount,
          payrollAlreadyAllocated: payroll.allocatedAmount,
          payrollDeduction: payroll.allocatedAmount + payroll.availableAmount,
        });
        const timestamp = now();
        const nextStatus: EmployeeAdvanceStatus =
          capacity.remainingAfter === 0 ? "SETTLED" : "PAID";
        if (nextStatus === "SETTLED") {
          assertEmployeeAdvanceTransition(existing.status, nextStatus);
        }
        const settlement: EmployeeAdvanceSettlementRow = {
          ...scopeFields(input.scope),
          advanceId: existing.id,
          amount: values.amount,
          createdAt: timestamp,
          createdBy: input.scope.userId,
          id: createId(input.scope, "settlement"),
          mutationRequestKey: mutationKey,
          payrollAccrualId: values.payrollAccrualId,
          payrollLinePersonCode: values.payrollLinePersonCode,
          settlementDate: values.settlementDate,
        };
        const result = await repository.settle({
          expectedRevisionNo: existing.revisionNo,
          row: {
            ...existing,
            revisionNo: existing.revisionNo + 1,
            settledAmount: existing.settledAmount + values.amount,
            status: nextStatus,
            updatedAt: timestamp,
            updatedBy: input.scope.userId,
          },
          settlement,
        });
        await audit(auditLogRepository, input.scope, result.advance, {
          action: "employee-advance.settle",
          payrollAccrualId: values.payrollAccrualId,
          revisionFrom: existing.revisionNo,
          revisionTo: result.advance.revisionNo,
          settlementAmount: values.amount,
          statusFrom: existing.status,
          statusTo: result.advance.status,
        }, timestamp);
        return {
          data: {
            advance: result.advance,
            idempotent: false,
            settlement: result.settlement,
          },
          ok: true,
        };
      } catch (error) {
        return failure(error);
      }
    },
  };

  async function transition(
    input: TransitionInput,
    operation:
      | "cancel"
      | "finance-reject"
      | "manager-approve"
      | "manager-reject"
      | "submit",
    toStatus: Extract<
      EmployeeAdvanceStatus,
      "CANCELLED" | "MANAGER_APPROVED" | "REJECTED" | "SUBMITTED"
    >,
  ): Promise<Result<{ advance: EmployeeAdvanceRow; idempotent: boolean }>> {
    const valid = validateScope(input.scope);
    if (!valid.ok) return valid;
    const permission = can(input.scope, operation);
    if (!permission.allowed) return invalid(permission.reason);
    try {
      const existing = await repository.findById({
        id: String(input.advanceId ?? "").trim(),
        scope: input.scope,
      });
      if (!existing) return missing();
      const mutationKey = getEmployeeAdvanceMutationRequestKey({
        actorUserId: input.scope.userId,
        advanceId: existing.id,
        operation,
        requestKey: input.requestKey,
      });
      const storedKey = operation === "submit"
        ? existing.submitRequestKey
        : operation === "manager-approve"
          ? existing.managerApproveRequestKey
          : operation === "manager-reject"
            ? existing.managerRejectRequestKey
            : operation === "finance-reject"
              ? existing.financeRejectRequestKey
              : existing.cancelRequestKey;
      if (storedKey === mutationKey) return success(existing, true);
      assertEmployeeAdvanceTransition(existing.status, toStatus);
      const timestamp = now();
      const advance = await repository.transition({
        expectedRevisionNo: existing.revisionNo,
        fromStatus: existing.status,
        row: {
          ...existing,
          ...(operation === "submit"
            ? { submitRequestKey: mutationKey, submittedAt: timestamp }
            : operation === "manager-approve"
              ? {
                  managerApproveRequestKey: mutationKey,
                  managerApprovedAt: timestamp,
                }
              : operation === "manager-reject"
                ? {
                    managerRejectRequestKey: mutationKey,
                    managerRejectedAt: timestamp,
                  }
                : operation === "finance-reject"
                  ? {
                      financeRejectRequestKey: mutationKey,
                      financeRejectedAt: timestamp,
                    }
                  : {
                      cancelRequestKey: mutationKey,
                      cancelledAt: timestamp,
                    }),
          revisionNo: existing.revisionNo + 1,
          status: toStatus,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        },
      });
      await auditTransition(
        auditLogRepository,
        input.scope,
        existing,
        advance,
        operation,
        timestamp,
      );
      return success(advance, false);
    } catch (error) {
      return failure(error);
    }
  }
}

type TransitionInput = {
  advanceId: string;
  requestKey: string;
  scope: TenantScope;
};

function can(scope: TenantScope, operation: EmployeeAdvanceOperation) {
  return getEmployeeAdvancePermission({
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
function success(advance: EmployeeAdvanceRow, idempotent: boolean) {
  return { data: { advance, idempotent }, ok: true as const };
}
function invalid(message: string): Result<never> {
  return { errors: [message], ok: false };
}
function missing(): Result<never> {
  return {
    errors: ["Personel avans kaydı aktif kapsamda bulunamadı."],
    ok: false,
  };
}
function stale(): Result<never> {
  return {
    errors: ["Avans kaydı başka bir işlemle güncellendi; güncel kaydı yeniden açın."],
    ok: false,
  };
}
function failure(error: unknown): Result<never> {
  return error instanceof EmployeeAdvanceDomainError
    || error instanceof EmployeeAdvanceRepositoryError
    ? { errors: [error.message], ok: false }
    : { errors: ["Personel avans işlemi tamamlanamadı."], ok: false };
}
async function auditTransition(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  before: EmployeeAdvanceRow,
  after: EmployeeAdvanceRow,
  operation: string,
  occurredAt: string,
) {
  return audit(repository, scope, after, {
    action: `employee-advance.${operation}`,
    revisionFrom: before.revisionNo,
    revisionTo: after.revisionNo,
    statusFrom: before.status,
    statusTo: after.status,
  }, occurredAt);
}
async function audit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  advance: EmployeeAdvanceRow,
  metadata: Record<string, unknown> & { action: string },
  occurredAt: string,
) {
  if (!repository) return;
  const { action, ...safeMetadata } = metadata;
  await repository.record(createAuditLogEntry(scope, {
    action,
    entityId: advance.id,
    entityLabel: advance.id,
    entityType: "employee-advance",
    metadata: {
      approvedAmount: advance.approvedAmount,
      personnelCode: advance.personnelCode,
      requestedAmount: advance.requestedAmount,
      ...safeMetadata,
    },
    occurredAt,
  }));
}
function documentNo(prefix: string, id: string) {
  const suffix = id.replace(/[^a-z0-9]/gi, "").slice(-12).toUpperCase() || "ADVANCE";
  return `${prefix}-${suffix}`.slice(0, 40);
}
function defaultCreateId(
  scope: TenantScope,
  entity: "advance" | "ledger" | "movement" | "settlement",
) {
  return `${buildTenantScopeKey(scope)}::employee-advance-${entity}::${Date.now()}-${Math.random()}`;
}
