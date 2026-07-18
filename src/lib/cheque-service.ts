import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import type { LedgerRepository } from "./ledger-service";
import type {
  CashBankAccountOption,
  CashBankMovementRepository,
} from "./cash-bank-movement-service";
import { createChequeCollectionMovement } from "./cash-bank-movement-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

export type ChequeStatus = "Portföyde" | "Tahsil Edildi" | "İptal";
export type ChequeDirection = "Gelen" | "Firma";
export type ChequeCurrency = "TL" | "USD" | "EUR";

export type ChequeRow = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  direction: ChequeDirection;
  documentNo: string;
  checkNo: string;
  bankName: string;
  branchName: string;
  drawerName: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  currency: ChequeCurrency;
  status: ChequeStatus;
  description: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  ledgerDocumentNo?: string;
};

export type ChequeCreateValues = Partial<
  Pick<
    ChequeRow,
    | "amount"
    | "bankName"
    | "branchName"
    | "checkNo"
    | "currency"
    | "description"
    | "direction"
    | "documentNo"
    | "drawerName"
    | "dueDate"
    | "issueDate"
  >
>;

export type ChequeRepository = {
  list(input: ChequeRepositoryListInput): Promise<ChequeRow[]>;
  create(input: ChequeRow): Promise<ChequeRow>;
  update(input: ChequeRow): Promise<ChequeRow>;
};

export type ChequeRepositoryListInput = {
  scope: TenantScope;
};

export type ChequeService = {
  list(input: ChequeListInput): Promise<ChequeServiceResult<ChequeListData>>;
  create(input: ChequeCreateInput): Promise<ChequeServiceResult<ChequeRow>>;
  collect(input: ChequeCollectInput): Promise<ChequeServiceResult<ChequeRow>>;
};

export type ChequeListInput = {
  scope: TenantScope;
};

export type ChequeCreateInput = ChequeListInput & {
  values: ChequeCreateValues;
};

export type ChequeCollectInput = ChequeListInput & {
  collectionAccount?: CashBankAccountOption;
  id: string;
};

export type ChequeListData = {
  rows: ChequeRow[];
};

export type ChequeServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type ChequeServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  cashBankMovementRepository?: CashBankMovementRepository;
  ledgerRepository?: LedgerRepository;
  now: () => string;
  repository: ChequeRepository;
};

const chequeMutationPermissionError =
  "Çek işlemi için muhasebe yetkisi gereklidir.";

export function createChequeService({
  auditLogRepository,
  cashBankMovementRepository,
  ledgerRepository,
  now,
  repository,
}: ChequeServiceOptions): ChequeService {
  async function resolveRows(scope: TenantScope) {
    const errors = validateTenantScope(scope);

    if (errors.length > 0) {
      return { ok: false as const, errors };
    }

    const rows = await repository.list({ scope });

    return { ok: true as const, rows };
  }

  return {
    async list({ scope }) {
      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const rows = await hydrateLedgerReferences(resolved.rows, scope);

      return {
        ok: true,
        data: {
          rows,
        },
      };
    },

    async create({ scope, values }) {
      const permissionErrors = validateChequeMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = normalizeChequeCreateValues(values);
      const errors = validateChequeDraft(draft);
      const duplicateDocument = resolved.rows.find(
        (row) => row.documentNo === draft.documentNo,
      );
      const duplicateCheckNo = resolved.rows.find(
        (row) => row.checkNo === draft.checkNo,
      );

      if (duplicateDocument) {
        errors.push(`Evrak no bu dönem için zaten kullanılıyor: ${draft.documentNo}`);
      }

      if (duplicateCheckNo) {
        errors.push(`Çek no bu dönem için zaten kullanılıyor: ${draft.checkNo}`);
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const row: ChequeRow = {
        ...draft,
        id: createChequeId(scope, draft.documentNo),
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        status: "Portföyde",
        createdBy: scope.userId,
        updatedBy: scope.userId,
        createdAt,
        updatedAt: createdAt,
      };

      const created = await repository.create(row);

      await recordChequeAudit(auditLogRepository, {
        action: "cheque.create",
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

    async collect({ collectionAccount, scope, id }) {
      const permissionErrors = validateChequeMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const existing = resolved.rows.find((row) => row.id === id);

      if (!existing) {
        return { ok: false, errors: ["Çek kaydı bulunamadı."] };
      }

      if (existing.status === "İptal") {
        return { ok: false, errors: ["İptal edilmiş çek tahsil edilemez."] };
      }

      if (existing.status === "Tahsil Edildi") {
        return { ok: true, data: existing };
      }

      const updatedAt = now();
      const collected = await repository.update({
        ...existing,
        status: "Tahsil Edildi",
        updatedBy: scope.userId,
        updatedAt,
      });

      if (cashBankMovementRepository) {
        await cashBankMovementRepository.create(
          createChequeCollectionMovement({
            account: collectionAccount,
            amount: collected.amount,
            counterpartyName: collected.drawerName,
            currency: collected.currency,
            documentNo: collected.documentNo,
            movementDate: collected.updatedAt.slice(0, 10),
            nowIso: collected.updatedAt,
            scope,
            sourceId: collected.id,
            sourceLabel: `${collected.documentNo} / ${collected.checkNo}`,
          }),
        );
      }

      await recordChequeAudit(auditLogRepository, {
        action: "cheque.collect",
        occurredAt: collected.updatedAt,
        row: collected,
        scope,
        statusFrom: existing.status,
        statusTo: collected.status,
      });

      return {
        ok: true,
        data: collected,
      };
    },
  };

  async function hydrateLedgerReferences(rows: ChequeRow[], scope: TenantScope) {
    if (!ledgerRepository) {
      return rows;
    }

    const entries = await ledgerRepository.list({ scope });
    const sourceEntries = new Map(
      entries
        .filter((entry) => entry.sourceType === "cheque" && entry.sourceId)
        .map((entry) => [entry.sourceId!, entry.documentNo]),
    );

    return rows.map((row) => {
      const ledgerDocumentNo = sourceEntries.get(row.id);
      return ledgerDocumentNo ? { ...row, ledgerDocumentNo } : row;
    });
  }
}

type NormalizedChequeCreateValues = Required<
  Pick<
    ChequeRow,
    | "amount"
    | "bankName"
    | "branchName"
    | "checkNo"
    | "currency"
    | "description"
    | "direction"
    | "documentNo"
    | "drawerName"
    | "dueDate"
    | "issueDate"
  >
>;

type ChequeAuditInput = {
  action: "cheque.create" | "cheque.collect";
  occurredAt: string;
  row: ChequeRow;
  scope: TenantScope;
  statusFrom?: ChequeStatus;
  statusTo: ChequeStatus;
};

async function recordChequeAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: ChequeAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: input.action,
      entityType: "cheque",
      entityId: input.row.id,
      entityLabel: `${input.row.documentNo} / ${input.row.checkNo}`,
      occurredAt: input.occurredAt,
      metadata: {
        amount: input.row.amount,
        bankName: input.row.bankName,
        checkNo: input.row.checkNo,
        currency: getP0BaseCurrencyTransactionValue(),
        direction: input.row.direction,
        documentNo: input.row.documentNo,
        drawerName: input.row.drawerName,
        dueDate: input.row.dueDate,
        statusFrom: input.statusFrom,
        statusTo: input.statusTo,
      },
    }),
  );
}

function normalizeChequeCreateValues(
  values: ChequeCreateValues,
): NormalizedChequeCreateValues {
  return {
    amount: Number(values.amount ?? 0),
    bankName: (values.bankName ?? "").trim(),
    branchName: (values.branchName ?? "").trim(),
    checkNo: (values.checkNo ?? "").trim(),
    currency: readCurrency(values.currency),
    description: (values.description ?? "").trim(),
    direction: values.direction === "Firma" ? "Firma" : "Gelen",
    documentNo: (values.documentNo ?? "").trim(),
    drawerName: (values.drawerName ?? "").trim(),
    dueDate: (values.dueDate ?? "").trim(),
    issueDate: (values.issueDate ?? "").trim(),
  };
}

function validateChequeDraft(draft: NormalizedChequeCreateValues) {
  const errors: string[] = [];

  if (!draft.documentNo) {
    errors.push("Evrak no zorunludur.");
  }

  if (!draft.checkNo) {
    errors.push("Çek no zorunludur.");
  }

  if (!draft.bankName) {
    errors.push("Banka adı zorunludur.");
  }

  if (!draft.drawerName) {
    errors.push("Keşideci/cari adı zorunludur.");
  }

  if (!isDateOnly(draft.issueDate)) {
    errors.push("Düzenleme tarihi geçerli olmalıdır.");
  }

  if (!isDateOnly(draft.dueDate)) {
    errors.push("Vade tarihi geçerli olmalıdır.");
  }

  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    errors.push("Çek tutarı sıfırdan büyük olmalıdır.");
  }

  return errors;
}

function validateChequeMutationPermission(scope: TenantScope) {
  if (canMutateCheques(scope)) {
    return [];
  }

  return [chequeMutationPermissionError];
}

export function canMutateCheques(scope: TenantScope) {
  return scope.userRole === "admin" || scope.userRole === "accounting";
}

export function createSeededChequeMemoryRepository(): ChequeRepository {
  const store = new Map<string, ChequeRow[]>();

  return {
    async list({ scope }) {
      return (store.get(buildTenantScopeKey(scope)) ?? []).map(cloneChequeRow);
    },

    async create(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const rows = store.get(key) ?? [];
      const persisted = cloneChequeRow(row);

      store.set(key, [...rows, persisted]);

      return cloneChequeRow(persisted);
    },

    async update(row) {
      const key = `${row.tenantId}::${row.companyId}::${row.periodId}`;
      const rows = store.get(key) ?? [];
      const persisted = cloneChequeRow(row);

      store.set(
        key,
        rows.map((current) => (current.id === row.id ? persisted : current)),
      );

      return cloneChequeRow(persisted);
    },
  };
}

function cloneChequeRow(row: ChequeRow): ChequeRow {
  return { ...row };
}

function createChequeId(scope: TenantScope, documentNo: string) {
  const normalizedDocumentNo = documentNo
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${buildTenantScopeKey(scope)}::cheque::${normalizedDocumentNo}`;
}

function readCurrency(value: ChequeCreateValues["currency"]): ChequeCurrency {
  void value;

  return getP0BaseCurrencyTransactionValue();
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
