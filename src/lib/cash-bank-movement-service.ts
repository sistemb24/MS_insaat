import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";
import type { PayrollAccrualRow } from "./payroll-accrual-service";
import type { ProgressPaymentRow } from "./progress-payment-service";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import { hasRbacPermission } from "./rbac";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

export type CashBankMovementDirection = "Giriş" | "Çıkış";
export type CashBankMovementType =
  | "Avans Ödemesi"
  | "Çek Tahsilatı"
  | "Fatura Ödemesi"
  | "Gider Ödemesi"
  | "Hakediş Ödemesi"
  | "Hakediş Tahsilatı"
  | "Maaş Ödemesi"
  | "Tahsilat"
  | "Ödeme"
  | "Virman";
export type CashBankMovementCurrency = "TL" | "USD" | "EUR";
export type ManualCashBankMovementType = "Tahsilat" | "Ödeme";

export type CashBankAccountOption = {
  code: string;
  name: string;
};

export type CashBankAccountBalanceInput = CashBankAccountOption & {
  currency?: CashBankMovementCurrency;
  openingBalance?: string;
  type?: string;
};

export type CashBankAccountBalanceRow = {
  accountCode: string;
  accountName: string;
  currency: CashBankMovementCurrency;
  currentBalance: number;
  incomingTotal: number;
  openingBalance: number;
  outgoingTotal: number;
  type: string;
};

export type CashBankMovementRow = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  accountCode: string;
  accountName: string;
  movementDate: string;
  movementType: CashBankMovementType;
  direction: CashBankMovementDirection;
  documentNo: string;
  counterpartyName: string;
  amount: number;
  currency: CashBankMovementCurrency;
  description: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  ledgerEntryId?: string;
  ledgerDocumentNo?: string;
};

export type CashBankMovementCreateValues = {
  accountCode: string;
  accountName: string;
  amount: number;
  counterAccountCode?: string;
  counterAccountName?: string;
  counterpartyName: string;
  currency: CashBankMovementCurrency;
  description?: string;
  documentNo: string;
  movementDate: string;
  movementType: ManualCashBankMovementType;
  sourceId?: string;
  sourceLabel?: string;
  sourceType?: string;
};

export type CounterpartyCashBankMovementCreateValues = {
  accountCode: string;
  amount: number;
  counterpartyCode: string;
  counterpartySlug: "musteriler" | "tedarikciler" | "taseronlar";
  description?: string;
  documentNo: string;
  movementDate: string;
  movementType: ManualCashBankMovementType;
};

export type CashBankTransferValues = {
  amount: number;
  currency: CashBankMovementCurrency;
  description?: string;
  documentNo: string;
  fromAccountCode: string;
  fromAccountName: string;
  movementDate: string;
  toAccountCode: string;
  toAccountName: string;
};

export type CashBankMovementRepository = {
  list(input: CashBankMovementRepositoryListInput): Promise<CashBankMovementRow[]>;
  create(input: CashBankMovementRow): Promise<CashBankMovementRow>;
};

export type CashBankMovementRepositoryListInput = {
  scope: TenantScope;
};

export type CashBankMovementService = {
  list(
    input: CashBankMovementListInput,
  ): Promise<CashBankMovementServiceResult<CashBankMovementListData>>;
  createPayrollAccrualPayment(
    input: CashBankPayrollAccrualPaymentInput,
  ): Promise<CashBankMovementServiceResult<CashBankMovementRow>>;
  createPurchaseInvoicePayment(
    input: CashBankPurchaseInvoicePaymentInput,
  ): Promise<CashBankMovementServiceResult<CashBankMovementRow>>;
  createSalesInvoiceCollection(
    input: CashBankSalesInvoiceCollectionInput,
  ): Promise<CashBankMovementServiceResult<CashBankMovementRow>>;
  createProgressPaymentPayment(
    input: CashBankProgressPaymentPaymentInput,
  ): Promise<CashBankMovementServiceResult<CashBankMovementRow>>;
  createProgressPaymentCollection(
    input: CashBankProgressPaymentCollectionInput,
  ): Promise<CashBankMovementServiceResult<CashBankMovementRow>>;
  createManual(
    input: CashBankMovementCreateInput,
  ): Promise<CashBankMovementServiceResult<CashBankMovementRow>>;
  createTransfer(
    input: CashBankTransferInput,
  ): Promise<CashBankMovementServiceResult<CashBankTransferData>>;
};

export type CashBankMovementListInput = {
  scope: TenantScope;
};

export type CashBankMovementCreateInput = CashBankMovementListInput & {
  values: CashBankMovementCreateValues;
};

export type CashBankTransferInput = CashBankMovementListInput & {
  values: CashBankTransferValues;
};

export type CashBankPayrollAccrualPaymentInput = CashBankMovementListInput & {
  account?: CashBankAccountOption;
  movementDate?: string;
  payrollAccrual: PayrollAccrualRow;
};

export type CashBankPurchaseInvoicePaymentInput = CashBankMovementListInput & {
  account?: CashBankAccountOption;
  amount?: number;
  movementDate?: string;
  purchaseInvoice: PurchaseInvoiceRow;
};

export type CashBankSalesInvoiceCollectionInput = CashBankMovementListInput & {
  account?: CashBankAccountOption;
  amount?: number;
  movementDate?: string;
  salesInvoice: PurchaseInvoiceRow;
};

export type CashBankProgressPaymentPaymentInput = CashBankMovementListInput & {
  account?: CashBankAccountOption;
  movementDate?: string;
  progressPayment: ProgressPaymentRow;
};

export type CashBankProgressPaymentCollectionInput = CashBankMovementListInput & {
  account?: CashBankAccountOption;
  movementDate?: string;
  progressPayment: ProgressPaymentRow;
};

export type CashBankMovementListData = {
  rows: CashBankMovementRow[];
};

export type CashBankTransferData = {
  rows: CashBankMovementRow[];
};

export type CashBankMovementServiceResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type CashBankMovementServiceOptions = {
  now: () => string;
  repository: CashBankMovementRepository;
};

const cashBankMovementPermissionError =
  "Kasa/banka hareketi için muhasebe yetkisi gereklidir.";

export function createCashBankMovementService({
  now,
  repository,
}: CashBankMovementServiceOptions): CashBankMovementService {
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

      return {
        ok: true,
        data: {
          rows: resolved.rows,
        },
      };
    },

    async createPayrollAccrualPayment({
      account,
      movementDate,
      payrollAccrual,
      scope,
    }) {
      const permissionErrors = validateCashBankMovementMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const errors = validatePayrollAccrualPayment(payrollAccrual);
      const duplicatePayment = resolved.rows.find(
        (row) =>
          row.sourceType === "payroll-accrual" &&
          row.sourceId === payrollAccrual.id &&
          row.movementType === "Maaş Ödemesi",
      );

      if (duplicatePayment) {
        if (errors.length === 0) {
          return { ok: true, data: duplicatePayment };
        }
        errors.push(
          `Bu maaş tahakkuku için ödeme hareketi zaten oluşturulmuş: ${payrollAccrual.documentNo}`,
        );
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const created = await repository.create(
        createPayrollAccrualPaymentMovement({
          account,
          movementDate: movementDate ?? createdAt.slice(0, 10),
          nowIso: createdAt,
          payrollAccrual,
          scope,
        }),
      );

      return {
        ok: true,
        data: created,
      };
    },

    async createPurchaseInvoicePayment({
      account,
      amount,
      movementDate,
      purchaseInvoice,
      scope,
    }) {
      const permissionErrors = validateCashBankMovementMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const paymentRows = resolved.rows.filter(
        (row) => row.sourceType === "purchase-invoice" && row.sourceId === purchaseInvoice.id && row.movementType === "Fatura Ödemesi",
      );
      const paidTotal = roundMoney(paymentRows.reduce((total, row) => total + row.amount, 0));
      const remainingTotal = roundMoney(purchaseInvoice.grandTotal - paidTotal);
      const errors = validatePurchaseInvoicePayment(purchaseInvoice, amount, remainingTotal);

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const created = await repository.create(
        createPurchaseInvoicePaymentMovement({
          account,
          amount: amount ?? remainingTotal,
          movementDate: movementDate ?? createdAt.slice(0, 10),
          nowIso: createdAt,
          purchaseInvoice,
          sequence: paymentRows.length + 1,
          scope,
        }),
      );

      return {
        ok: true,
        data: created,
      };
    },

    async createSalesInvoiceCollection({
      account,
      amount,
      movementDate,
      salesInvoice,
      scope,
    }) {
      const permissionErrors = validateCashBankMovementMutationPermission(scope);
      if (permissionErrors.length > 0) return { ok: false, errors: permissionErrors };

      const resolved = await resolveRows(scope);
      if (!resolved.ok) return resolved;

      const collectionRows = resolved.rows.filter(
        (row) => row.sourceType === "sales-invoice" && row.sourceId === salesInvoice.id && row.movementType === "Tahsilat",
      );
      const collectedTotal = roundMoney(collectionRows.reduce((total, row) => total + row.amount, 0));
      const remainingTotal = roundMoney(salesInvoice.grandTotal - collectedTotal);
      const errors = validateSalesInvoiceCollection(salesInvoice, amount, remainingTotal);
      if (errors.length > 0) return { ok: false, errors };

      const createdAt = now();
      const created = await repository.create(
        createSalesInvoiceCollectionMovement({
          account,
          amount: amount ?? remainingTotal,
          movementDate: movementDate ?? createdAt.slice(0, 10),
          nowIso: createdAt,
          salesInvoice,
          sequence: collectionRows.length + 1,
          scope,
        }),
      );
      return { ok: true, data: created };
    },

    async createProgressPaymentPayment({
      account,
      movementDate,
      progressPayment,
      scope,
    }) {
      const permissionErrors = validateCashBankMovementMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const errors = validateProgressPaymentPayment(progressPayment);
      const duplicatePayment = resolved.rows.find(
        (row) =>
          row.sourceType === "progress-payment" &&
          row.sourceId === progressPayment.id &&
          row.movementType === "Hakediş Ödemesi",
      );

      if (duplicatePayment) {
        if (errors.length === 0) {
          return { ok: true, data: duplicatePayment };
        }
        errors.push(
          `Bu hakediş için ödeme hareketi zaten oluşturulmuş: ${progressPayment.documentNo}`,
        );
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const created = await repository.create(
        createProgressPaymentPaymentMovement({
          account,
          movementDate: movementDate ?? createdAt.slice(0, 10),
          nowIso: createdAt,
          progressPayment,
          scope,
        }),
      );

      return {
        ok: true,
        data: created,
      };
    },

    async createProgressPaymentCollection({
      account,
      movementDate,
      progressPayment,
      scope,
    }) {
      const permissionErrors = validateCashBankMovementMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const errors = validateProgressPaymentCollection(progressPayment);
      const duplicateCollection = resolved.rows.find(
        (row) =>
          row.sourceType === "progress-payment" &&
          row.sourceId === progressPayment.id &&
          row.movementType === "Hakediş Tahsilatı",
      );

      if (duplicateCollection) {
        if (errors.length === 0) {
          return { ok: true, data: duplicateCollection };
        }
        errors.push(
          `Bu hakediş için tahsilat hareketi zaten oluşturulmuş: ${progressPayment.documentNo}`,
        );
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const created = await repository.create(
        createProgressPaymentCollectionMovement({
          account,
          movementDate: movementDate ?? createdAt.slice(0, 10),
          nowIso: createdAt,
          progressPayment,
          scope,
        }),
      );

      return {
        ok: true,
        data: created,
      };
    },
    async createManual({ scope, values }) {
      const permissionErrors = validateCashBankMovementMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = normalizeManualMovementValues(values);
      const errors = validateManualMovementDraft(draft);
      const sourceType = draft.sourceType ?? "manual";
      const duplicateDocument = resolved.rows.find(
        (row) =>
          row.sourceType === sourceType &&
          row.documentNo === draft.documentNo &&
          row.movementType === draft.movementType,
      );

      if (duplicateDocument) {
        if (
          (sourceType === "manual" || sourceType.startsWith("counterparty-")) &&
          errors.length === 0
        ) {
          return { ok: true, data: duplicateDocument };
        }
        errors.push(`Evrak no bu hareket tipi için zaten kullanılıyor: ${draft.documentNo}`);
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const created = await repository.create(
        createManualCashBankMovement({
          nowIso: createdAt,
          scope,
          values: draft,
        }),
      );

      return {
        ok: true,
        data: created,
      };
    },

    async createTransfer({ scope, values }) {
      const permissionErrors = validateCashBankMovementMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolved = await resolveRows(scope);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = normalizeTransferValues(values);
      const errors = validateTransferDraft(draft);
      const duplicateTransfers = resolved.rows.filter(
        (row) =>
          row.sourceType === "transfer" &&
          row.documentNo === draft.documentNo &&
          row.movementType === "Virman",
      );

      if (duplicateTransfers.length >= 2 && errors.length === 0) {
        return {
          ok: true,
          data: {
            rows: duplicateTransfers.sort((left, right) => Number(left.direction === "Giriş") - Number(right.direction === "Giriş")),
          },
        };
      }

      if (duplicateTransfers.length > 0) {
        errors.push(`Virman evrak no bu dönem için zaten kullanılıyor: ${draft.documentNo}`);
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const createdAt = now();
      const [outgoing, incoming] = createTransferCashBankMovements({
        nowIso: createdAt,
        scope,
        values: draft,
      });
      const createdOutgoing = await repository.create(outgoing);
      const createdIncoming = await repository.create(incoming);

      return {
        ok: true,
        data: {
          rows: [createdOutgoing, createdIncoming],
        },
      };
    },
  };
}

export function createChequeCollectionMovement({
  amount,
  counterpartyName,
  documentNo,
  movementDate,
  nowIso,
  account = {
    code: "KASA-0001",
    name: "MERKEZ KASA",
  },
  scope,
  sourceId,
  sourceLabel,
}: {
  account?: CashBankAccountOption;
  amount: number;
  counterpartyName: string;
  currency: CashBankMovementCurrency;
  documentNo: string;
  movementDate: string;
  nowIso: string;
  scope: TenantScope;
  sourceId: string;
  sourceLabel: string;
}): CashBankMovementRow {
  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::cheque-collection::${sourceId}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: account.code,
    accountName: account.name,
    movementDate,
    movementType: "Çek Tahsilatı",
    direction: "Giriş",
    documentNo,
    counterpartyName,
    amount,
    currency: getP0BaseCurrencyTransactionValue(),
    description: `${sourceLabel} çek tahsilatı`,
    sourceType: "cheque",
    sourceId,
    sourceLabel,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function createPayrollAccrualPaymentMovement({
  account = {
    code: "KASA-0001",
    name: "MERKEZ KASA",
  },
  movementDate,
  nowIso,
  payrollAccrual,
  scope,
}: {
  account?: CashBankAccountOption;
  movementDate: string;
  nowIso: string;
  payrollAccrual: PayrollAccrualRow;
  scope: TenantScope;
}): CashBankMovementRow {
  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::payroll-accrual-payment::${normalizeIdentifier(
      payrollAccrual.id,
    )}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: account.code,
    accountName: account.name,
    movementDate,
    movementType: "Maaş Ödemesi",
    direction: "Çıkış",
    documentNo: `ODM-${payrollAccrual.documentNo}`,
    counterpartyName:
      payrollAccrual.contractorName || "Personel Maaş Tahakkuku",
    amount: payrollAccrual.netTotal,
    currency: "TL",
    description: `${payrollAccrual.documentNo} maaş ödemesi`,
    sourceType: "payroll-accrual",
    sourceId: payrollAccrual.id,
    sourceLabel: payrollAccrual.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function createPurchaseInvoicePaymentMovement({
  account = {
    code: "KASA-0001",
    name: "MERKEZ KASA",
  },
  amount,
  movementDate,
  nowIso,
  purchaseInvoice,
  sequence = 1,
  scope,
}: {
  account?: CashBankAccountOption;
  amount: number;
  movementDate: string;
  nowIso: string;
  purchaseInvoice: PurchaseInvoiceRow;
  sequence?: number;
  scope: TenantScope;
}): CashBankMovementRow {
  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::purchase-invoice-payment::${normalizeIdentifier(purchaseInvoice.id)}::${sequence}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: account.code,
    accountName: account.name,
    movementDate,
    movementType: "Fatura Ödemesi",
    direction: "Çıkış",
    documentNo: `ODM-${purchaseInvoice.documentNo}${sequence > 1 ? `-${sequence}` : ""}`,
    counterpartyName: purchaseInvoice.counterpartyName,
    amount,
    currency: getP0BaseCurrencyTransactionValue(),
    description: `${purchaseInvoice.documentNo} alış faturası ödemesi`,
    sourceType: "purchase-invoice",
    sourceId: purchaseInvoice.id,
    sourceLabel: purchaseInvoice.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function createSalesInvoiceCollectionMovement({
  account = { code: "KASA-0001", name: "MERKEZ KASA" },
  amount,
  movementDate,
  nowIso,
  salesInvoice,
  sequence = 1,
  scope,
}: {
  account?: CashBankAccountOption;
  amount: number;
  movementDate: string;
  nowIso: string;
  salesInvoice: PurchaseInvoiceRow;
  sequence?: number;
  scope: TenantScope;
}): CashBankMovementRow {
  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::sales-invoice-collection::${normalizeIdentifier(salesInvoice.id)}::${sequence}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: account.code,
    accountName: account.name,
    movementDate,
    movementType: "Tahsilat",
    direction: "Giriş",
    documentNo: `THS-${salesInvoice.documentNo}${sequence > 1 ? `-${sequence}` : ""}`,
    counterpartyName: salesInvoice.counterpartyName,
    amount,
    currency: getP0BaseCurrencyTransactionValue(),
    description: `${salesInvoice.documentNo} satış faturası tahsilatı`,
    sourceType: "sales-invoice",
    sourceId: salesInvoice.id,
    sourceLabel: salesInvoice.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function createProgressPaymentPaymentMovement({
  account = {
    code: "KASA-0001",
    name: "MERKEZ KASA",
  },
  movementDate,
  nowIso,
  progressPayment,
  scope,
}: {
  account?: CashBankAccountOption;
  movementDate: string;
  nowIso: string;
  progressPayment: ProgressPaymentRow;
  scope: TenantScope;
}): CashBankMovementRow {
  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::progress-payment-payment::${normalizeIdentifier(
      progressPayment.id,
    )}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: account.code,
    accountName: account.name,
    movementDate,
    movementType: "Hakediş Ödemesi",
    direction: "Çıkış",
    documentNo: `ODM-${progressPayment.documentNo}`,
    counterpartyName: progressPayment.counterpartyName,
    amount: progressPayment.grandTotal,
    currency: getP0BaseCurrencyTransactionValue(),
    description: `${progressPayment.documentNo} hakediş ödemesi`,
    sourceType: "progress-payment",
    sourceId: progressPayment.id,
    sourceLabel: progressPayment.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function createProgressPaymentCollectionMovement({
  account = {
    code: "KASA-0001",
    name: "MERKEZ KASA",
  },
  movementDate,
  nowIso,
  progressPayment,
  scope,
}: {
  account?: CashBankAccountOption;
  movementDate: string;
  nowIso: string;
  progressPayment: ProgressPaymentRow;
  scope: TenantScope;
}): CashBankMovementRow {
  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::progress-payment-collection::${normalizeIdentifier(
      progressPayment.id,
    )}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: account.code,
    accountName: account.name,
    movementDate,
    movementType: "Hakediş Tahsilatı",
    direction: "Giriş",
    documentNo: `THS-${progressPayment.documentNo}`,
    counterpartyName: progressPayment.counterpartyName,
    amount: progressPayment.grandTotal,
    currency: getP0BaseCurrencyTransactionValue(),
    description: `${progressPayment.documentNo} hakediş tahsilatı`,
    sourceType: "progress-payment",
    sourceId: progressPayment.id,
    sourceLabel: progressPayment.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
export function createManualCashBankMovement({
  nowIso,
  scope,
  values,
}: {
  nowIso: string;
  scope: TenantScope;
  values: CashBankMovementCreateValues;
}): CashBankMovementRow {
  const sourceType = values.sourceType ?? "manual";
  const sourceId = normalizeIdentifier(values.sourceId ?? values.documentNo);

  return {
    id: `${buildTenantScopeKey(scope)}::cash-bank-movement::${sourceType}::${sourceId}::${values.movementType}`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    accountCode: values.accountCode,
    accountName: values.accountName,
    movementDate: values.movementDate,
    movementType: values.movementType,
    direction: values.movementType === "Tahsilat" ? "Giriş" : "Çıkış",
    documentNo: values.documentNo,
    counterpartyName: values.counterpartyName,
    amount: values.amount,
    currency: values.currency,
    description: values.description ?? "",
    sourceType,
    sourceId,
    sourceLabel: values.sourceLabel ?? values.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function createTransferCashBankMovements({
  nowIso,
  scope,
  values,
}: {
  nowIso: string;
  scope: TenantScope;
  values: CashBankTransferValues;
}): [CashBankMovementRow, CashBankMovementRow] {
  const sourceId = normalizeIdentifier(values.documentNo);
  const base = {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    movementDate: values.movementDate,
    movementType: "Virman" as const,
    documentNo: values.documentNo,
    amount: values.amount,
    currency: values.currency,
    description: values.description ?? "",
    sourceType: "transfer",
    sourceLabel: values.documentNo,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return [
    {
      ...base,
      id: `${buildTenantScopeKey(scope)}::cash-bank-movement::transfer::${sourceId}::out`,
      accountCode: values.fromAccountCode,
      accountName: values.fromAccountName,
      direction: "Çıkış",
      counterpartyName: values.toAccountName,
      sourceId: `${sourceId}-cikis`,
    },
    {
      ...base,
      id: `${buildTenantScopeKey(scope)}::cash-bank-movement::transfer::${sourceId}::in`,
      accountCode: values.toAccountCode,
      accountName: values.toAccountName,
      direction: "Giriş",
      counterpartyName: values.fromAccountName,
      sourceId: `${sourceId}-giris`,
    },
  ];
}

export function summarizeCashBankAccounts({
  accounts,
  movements,
}: {
  accounts: CashBankAccountBalanceInput[];
  movements: CashBankMovementRow[];
}): CashBankAccountBalanceRow[] {
  const summaries = new Map<string, CashBankAccountBalanceRow>();

  for (const account of accounts) {
    summaries.set(account.code, {
      accountCode: account.code,
      accountName: account.name,
      currency: account.currency ?? "TL",
      currentBalance: parseMoneyText(account.openingBalance),
      incomingTotal: 0,
      openingBalance: parseMoneyText(account.openingBalance),
      outgoingTotal: 0,
      type: account.type ?? "-",
    });
  }

  for (const movement of movements) {
    const existing =
      summaries.get(movement.accountCode) ??
      createMovementOnlySummary(movement);

    if (movement.direction === "Giriş") {
      existing.incomingTotal += movement.amount;
      existing.currentBalance += movement.amount;
    } else {
      existing.outgoingTotal += movement.amount;
      existing.currentBalance -= movement.amount;
    }

    summaries.set(movement.accountCode, existing);
  }

  return Array.from(summaries.values());
}

function createMovementOnlySummary(
  movement: CashBankMovementRow,
): CashBankAccountBalanceRow {
  return {
    accountCode: movement.accountCode,
    accountName: movement.accountName,
    currency: movement.currency,
    currentBalance: 0,
    incomingTotal: 0,
    openingBalance: 0,
    outgoingTotal: 0,
    type: "-",
  };
}

function parseMoneyText(value?: string): number {
  if (!value) {
    return 0;
  }

  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeManualMovementValues(
  values: CashBankMovementCreateValues,
): CashBankMovementCreateValues {
  return {
    accountCode: values.accountCode.trim(),
    accountName: values.accountName.trim(),
    amount: Number(values.amount ?? 0),
    counterpartyName: values.counterpartyName.trim(),
    currency: readCurrency(values.currency),
    description: (values.description ?? "").trim(),
    documentNo: values.documentNo.trim(),
    movementDate: values.movementDate.trim(),
    movementType: values.movementType === "Ödeme" ? "Ödeme" : "Tahsilat",
    sourceId: values.sourceId?.trim(),
    sourceLabel: values.sourceLabel?.trim(),
    sourceType: values.sourceType?.trim(),
  };
}

function validateManualMovementDraft(draft: CashBankMovementCreateValues) {
  const errors: string[] = [];

  if (!draft.accountCode || !draft.accountName) {
    errors.push("Hesap seçimi zorunludur.");
  }

  if (!draft.documentNo) {
    errors.push("Evrak no zorunludur.");
  }

  if (!draft.counterpartyName) {
    errors.push("Cari adı zorunludur.");
  }

  if (!isDateOnly(draft.movementDate)) {
    errors.push("Hareket tarihi geçerli olmalıdır.");
  }

  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    errors.push("Hareket tutarı sıfırdan büyük olmalıdır.");
  }

  return errors;
}

function normalizeTransferValues(
  values: CashBankTransferValues,
): CashBankTransferValues {
  return {
    amount: Number(values.amount ?? 0),
    currency: readCurrency(values.currency),
    description: (values.description ?? "").trim(),
    documentNo: values.documentNo.trim(),
    fromAccountCode: values.fromAccountCode.trim(),
    fromAccountName: values.fromAccountName.trim(),
    movementDate: values.movementDate.trim(),
    toAccountCode: values.toAccountCode.trim(),
    toAccountName: values.toAccountName.trim(),
  };
}

function validateTransferDraft(draft: CashBankTransferValues) {
  const errors: string[] = [];

  if (!draft.fromAccountCode || !draft.fromAccountName) {
    errors.push("Çıkış hesabı zorunludur.");
  }

  if (!draft.toAccountCode || !draft.toAccountName) {
    errors.push("Giriş hesabı zorunludur.");
  }

  if (
    draft.fromAccountCode &&
    draft.toAccountCode &&
    draft.fromAccountCode === draft.toAccountCode
  ) {
    errors.push("Virman için çıkış ve giriş hesapları farklı olmalıdır.");
  }

  if (!draft.documentNo) {
    errors.push("Evrak no zorunludur.");
  }

  if (!isDateOnly(draft.movementDate)) {
    errors.push("Hareket tarihi geçerli olmalıdır.");
  }

  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    errors.push("Virman tutarı sıfırdan büyük olmalıdır.");
  }

  return errors;
}

export function validatePayrollAccrualPayment(
  payrollAccrual: Pick<PayrollAccrualRow, "netTotal" | "status">,
) {
  const errors: string[] = [];

  if (payrollAccrual.status !== "Kaydedildi") {
    errors.push("Yalnız kesinleşmiş maaş tahakkuku ödenebilir.");
  }

  if (!Number.isFinite(payrollAccrual.netTotal) || payrollAccrual.netTotal <= 0) {
    errors.push("Maaş tahakkuku ödeme tutarı sıfırdan büyük olmalıdır.");
  }

  return errors;
}

function validatePurchaseInvoicePayment(
  purchaseInvoice: PurchaseInvoiceRow,
  requestedAmount: number | undefined,
  remainingTotal: number,
) {
  const errors: string[] = [];

  if (purchaseInvoice.status !== "Kaydedildi") {
    errors.push("Yalnız kesinleşmiş alış faturası ödenebilir.");
  }

  if (!Number.isFinite(purchaseInvoice.grandTotal) || purchaseInvoice.grandTotal <= 0) {
    errors.push("Alış faturası ödeme tutarı sıfırdan büyük olmalıdır.");
  }
  if (remainingTotal <= 0) {
    errors.push(`Bu alış faturası tamamen ödendi: ${purchaseInvoice.documentNo}`);
  }
  const amount = requestedAmount ?? remainingTotal;
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Alış faturası ödeme tutarı sıfırdan büyük olmalıdır.");
  } else if (amount > remainingTotal) {
    errors.push(`Ödeme tutarı kalan bakiyeyi aşamaz: ${remainingTotal.toFixed(2)}`);
  }

  return errors;
}

function validateSalesInvoiceCollection(
  salesInvoice: PurchaseInvoiceRow,
  requestedAmount: number | undefined,
  remainingTotal: number,
) {
  const errors: string[] = [];
  if (salesInvoice.status !== "Kaydedildi") {
    errors.push("Yalnız kesinleşmiş satış faturası tahsil edilebilir.");
  }
  if (!Number.isFinite(salesInvoice.grandTotal) || salesInvoice.grandTotal <= 0) {
    errors.push("Satış faturası tahsilat tutarı sıfırdan büyük olmalıdır.");
  }
  if (remainingTotal <= 0) {
    errors.push(`Bu satış faturası tamamen tahsil edildi: ${salesInvoice.documentNo}`);
  }
  const amount = requestedAmount ?? remainingTotal;
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push("Satış faturası tahsilat tutarı sıfırdan büyük olmalıdır.");
  } else if (amount > remainingTotal) {
    errors.push(`Tahsilat tutarı kalan bakiyeyi aşamaz: ${remainingTotal.toFixed(2)}`);
  }
  return errors;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateProgressPaymentPayment(progressPayment: ProgressPaymentRow) {
  const errors: string[] = [];

  if (progressPayment.status !== "Kaydedildi") {
    errors.push("Yalnız kesinleşmiş hakediş ödenebilir.");
  }

  if (progressPayment.paymentType === "Şantiye Geliri") {
    errors.push("Şantiye geliri hakedişi ödeme hareketi olarak kapatılamaz.");
  }

  if (!Number.isFinite(progressPayment.grandTotal) || progressPayment.grandTotal <= 0) {
    errors.push("Hakediş ödeme tutarı sıfırdan büyük olmalıdır.");
  }

  return errors;
}

function validateProgressPaymentCollection(progressPayment: ProgressPaymentRow) {
  const errors: string[] = [];

  if (progressPayment.status !== "Kaydedildi") {
    errors.push("Yalnız kesinleşmiş hakediş tahsil edilebilir.");
  }

  if (progressPayment.paymentType !== "Şantiye Geliri") {
    errors.push("Yalnız şantiye geliri hakedişi tahsilat hareketi olarak kapatılabilir.");
  }

  if (!Number.isFinite(progressPayment.grandTotal) || progressPayment.grandTotal <= 0) {
    errors.push("Hakediş tahsilat tutarı sıfırdan büyük olmalıdır.");
  }

  return errors;
}
function validateCashBankMovementMutationPermission(scope: TenantScope) {
  if (canMutateCashBankMovements(scope)) {
    return [];
  }

  return [cashBankMovementPermissionError];
}

export function canMutateCashBankMovements(scope: TenantScope) {
  return hasRbacPermission(scope.userRole, "cash-bank.manage");
}

function readCurrency(value: CashBankMovementCreateValues["currency"]) {
  void value;

  return getP0BaseCurrencyTransactionValue();
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function normalizeIdentifier(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


