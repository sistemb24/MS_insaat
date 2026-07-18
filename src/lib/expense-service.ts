import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import type {
  CashBankMovementRepository,
  CashBankMovementRow,
} from "./cash-bank-movement-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";
import type { LedgerRepository } from "./ledger-service";
import type { ExpenseLedgerPostingService } from "./expense-ledger-posting-service";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

export type ExpenseStatus = "Kaydedildi" | "İptal";

export type ExpenseCreateValues = {
  accountCode: string;
  accountName: string;
  amount: number;
  counterpartyName: string;
  description?: string;
  documentNo: string;
  expenseDate: string;
  movementGroup: string;
  siteCode: string;
  siteName: string;
  vatRate?: number;
};

export type ExpenseRow = ExpenseCreateValues & {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  currency: "TL" | "USD" | "EUR";
  status: ExpenseStatus;
  vatTotal: number;
  grandTotal: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  ledgerDocumentNo?: string;
};

export type ExpenseRepositoryListInput = {
  scope: TenantScope;
};

export type ExpenseRepository = {
  create(input: ExpenseRow): Promise<ExpenseRow>;
  list(input: ExpenseRepositoryListInput): Promise<ExpenseRow[]>;
};

export type ExpenseServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type ExpenseListData = {
  rows: ExpenseRow[];
};

export type ExpenseCreateInput = {
  scope: TenantScope;
  values: ExpenseCreateValues;
};

export type ExpenseService = {
  create(input: ExpenseCreateInput): Promise<ExpenseServiceResult<ExpenseRow>>;
  list(input: { scope: TenantScope }): Promise<ExpenseServiceResult<ExpenseListData>>;
};

export type ExpenseServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  cashBankMovementRepository: CashBankMovementRepository;
  ledgerPostingService?: ExpenseLedgerPostingService;
  ledgerRepository?: Pick<LedgerRepository, "list">;
  now: () => string;
  repository: ExpenseRepository;
};

const expenseMutationPermissionError =
  "Gider işlemi için muhasebe yetkisi gereklidir.";

export function createExpenseService({
  auditLogRepository,
  cashBankMovementRepository,
  ledgerPostingService,
  ledgerRepository,
  now,
  repository,
}: ExpenseServiceOptions): ExpenseService {
  async function resolveRows(scope: TenantScope) {
    const errors = validateTenantScope(scope);

    if (errors.length > 0) {
      return { ok: false as const, errors };
    }

    const rows = await repository.list({ scope });
    if (!ledgerRepository) return { ok: true as const, rows };
    const entries = await ledgerRepository.list({ scope });
    const sourceEntries = new Map(entries.filter((entry) => entry.sourceType === "expense" && entry.sourceId).map((entry) => [entry.sourceId as string, entry]));
    return { ok: true as const, rows: rows.map((row) => ({ ...row, ...(sourceEntries.get(row.id) ? { ledgerDocumentNo: sourceEntries.get(row.id)?.documentNo } : {}) })) };
  }

  return {
    async list({ scope }) {
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      return {
        ok: true,
        data: {
          rows: resolved.rows,
        },
      };
    },

    async create({ scope, values }) {
      const permissionErrors = validateExpenseMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = normalizeExpenseValues(values);
      const errors = validateExpenseDraft(draft);
      const duplicateDocument = resolved.rows.find(
        (row) => row.documentNo === draft.documentNo,
      );

      if (duplicateDocument) {
        if (ledgerPostingService && !duplicateDocument.ledgerDocumentNo) {
          const repaired = await ledgerPostingService.post({ expense: duplicateDocument, scope });
          if (repaired.ok) {
            const movements = await cashBankMovementRepository.list({ scope });
            const movementExists = movements.some((movement) => movement.sourceType === "expense" && movement.sourceId === duplicateDocument.id && movement.movementType === "Gider Ödemesi");
            if (!movementExists) await cashBankMovementRepository.create(createExpensePaymentMovement({ expense: repaired.data.expense, nowIso: repaired.data.expense.updatedAt, scope }));
            return { ok: true, data: repaired.data.expense };
          }
        }
        errors.push(
          `Gider evrak no bu dönem için zaten kullanılıyor: ${draft.documentNo}`,
        );
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const vatTotal = roundMoney(draft.amount * percent(draft.vatRate));
      const row: ExpenseRow = {
        ...draft,
        id: createExpenseId(scope, draft.documentNo),
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        currency: getP0BaseCurrencyTransactionValue(),
        status: "Kaydedildi",
        vatTotal,
        grandTotal: roundMoney(draft.amount + vatTotal),
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt,
        updatedAt: createdAt,
      };

      let created = await repository.create(row);
      if (ledgerPostingService) {
        const ledgerResult = await ledgerPostingService.post({ expense: created, scope });
        if (!ledgerResult.ok) return { ok: false, errors: ledgerResult.errors };
        created = ledgerResult.data.expense;
      }
      await cashBankMovementRepository.create(
        createExpensePaymentMovement({
          expense: created,
          nowIso: created.updatedAt,
          scope,
        }),
      );

      await recordExpenseAudit(auditLogRepository, {
        occurredAt: created.updatedAt,
        row: created,
        scope,
        statusTo: created.status,
      });

      return {
        ok: true,
        data: created,
      };
    },
  };
}

export function createExpensePaymentMovement({
  expense,
  nowIso,
  scope,
}: {
  expense: ExpenseRow;
  nowIso: string;
  scope: TenantScope;
}): CashBankMovementRow {
  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::expense-payment::${normalizeIdentifier(
      expense.id,
    )}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: expense.accountCode,
    accountName: expense.accountName,
    movementDate: expense.expenseDate,
    movementType: "Gider Ödemesi",
    direction: "Çıkış",
    documentNo: `ODM-${expense.documentNo}`,
    counterpartyName: expense.counterpartyName,
    amount: expense.grandTotal,
    currency: getP0BaseCurrencyTransactionValue(),
    description: `${expense.documentNo} gider ödemesi`,
    sourceType: "expense",
    sourceId: expense.id,
    sourceLabel: expense.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function canMutateExpenses(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededExpenseMemoryRepository(): ExpenseRepository {
  const store = new Map<string, ExpenseRow[]>();

  return {
    async create(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const rows = store.get(key) ?? [];
      const persisted = { ...row };

      store.set(key, [persisted, ...rows]);

      return persisted;
    },
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map((row) => ({
        ...row,
      }));
    },
  };
}

type ExpenseAuditInput = {
  occurredAt: string;
  row: ExpenseRow;
  scope: TenantScope;
  statusTo: ExpenseStatus;
};

async function recordExpenseAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: ExpenseAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: "expense.create",
      entityType: "expense",
      entityId: input.row.id,
      entityLabel: input.row.documentNo,
      occurredAt: input.occurredAt,
      metadata: {
        accountCode: input.row.accountCode,
        accountName: input.row.accountName,
        documentNo: input.row.documentNo,
        grandTotal: input.row.grandTotal,
        movementGroup: input.row.movementGroup,
        siteCode: input.row.siteCode,
        siteName: input.row.siteName,
        statusTo: input.statusTo,
        vatTotal: input.row.vatTotal,
      },
    }),
  );
}

function validateExpenseMutationPermission(scope: TenantScope) {
  return canMutateExpenses(scope) ? [] : [expenseMutationPermissionError];
}

function normalizeExpenseValues(values: ExpenseCreateValues): ExpenseCreateValues {
  return {
    accountCode: values.accountCode.trim(),
    accountName: values.accountName.trim(),
    amount: Number(values.amount ?? 0),
    counterpartyName: values.counterpartyName.trim(),
    description: values.description?.trim() ?? "",
    documentNo: values.documentNo.trim(),
    expenseDate: values.expenseDate.trim(),
    movementGroup: values.movementGroup.trim(),
    siteCode: values.siteCode.trim(),
    siteName: values.siteName.trim(),
    vatRate: normalizeRate(values.vatRate),
  };
}

function validateExpenseDraft(draft: ExpenseCreateValues) {
  const errors: string[] = [];

  if (!draft.documentNo) {
    errors.push("Gider evrak no zorunludur.");
  }

  if (!isDateOnly(draft.expenseDate)) {
    errors.push("Gider tarihi geçerli olmalıdır.");
  }

  if (!draft.siteCode || !draft.siteName) {
    errors.push("Şantiye zorunludur.");
  }

  if (!draft.movementGroup) {
    errors.push("Gider hareket grubu zorunludur.");
  }

  if (!draft.accountCode || !draft.accountName) {
    errors.push("Ödeme hesabı zorunludur.");
  }

  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    errors.push("Gider tutarı sıfırdan büyük olmalıdır.");
  }

  if (!draft.counterpartyName) {
    errors.push("Cari adı zorunludur.");
  }

  if ((draft.vatRate ?? 0) < 0 || (draft.vatRate ?? 0) > 100) {
    errors.push("KDV oranı 0 ile 100 arasında olmalıdır.");
  }

  return errors;
}

function createExpenseId(scope: TenantScope, documentNo: string) {
  return `${buildTenantScopeKey(scope)}::expense::${normalizeIdentifier(documentNo)}`;
}

function normalizeIdentifier(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeRate(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Number(value);
}

function percent(value: number | undefined) {
  return normalizeRate(value) / 100;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
