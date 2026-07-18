import {
  createAuditLogEntry,
  type AuditLogEntryInput,
} from "./audit-log";
import {
  type LedgerJournalRow,
  type LedgerLineDraft,
  validateLedgerJournalDraft,
} from "./ledger-service";
import { hasRbacPermission } from "./rbac";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import { validateTenantScope, type TenantScope } from "./tenant-scope";

export const PURCHASE_INVOICE_LEDGER_SOURCE_TYPE = "purchase-invoice";
export const SALES_INVOICE_LEDGER_SOURCE_TYPE = "sales-invoice";
export type InvoiceLedgerPostingKind = "purchase" | "sales";
type InvoiceLedgerPostingSourceType =
  | typeof PURCHASE_INVOICE_LEDGER_SOURCE_TYPE
  | typeof SALES_INVOICE_LEDGER_SOURCE_TYPE;

export type PurchaseInvoiceLedgerPostingReasonCode =
  | "concurrent-modification"
  | "invalid-invoice"
  | "invalid-ledger"
  | "invalid-status"
  | "invalid-total"
  | "invoice-not-found"
  | "legacy-posted-without-ledger"
  | "period-closed"
  | "permission-denied"
  | "persistence-failed"
  | "scope-invalid"
  | "scope-mismatch"
  | "source-conflict"
  | "unsupported-withholding";

export type PurchaseInvoiceLedgerPostingSuccess = {
  ok: true;
  data: {
    invoice: PurchaseInvoiceRow;
    ledgerEntry: LedgerJournalRow;
    created: boolean;
  };
};

export type PurchaseInvoiceLedgerPostingFailure = {
  ok: false;
  errors: string[];
  reasonCode: PurchaseInvoiceLedgerPostingReasonCode;
};

export type PurchaseInvoiceLedgerPostingResult =
  | PurchaseInvoiceLedgerPostingSuccess
  | PurchaseInvoiceLedgerPostingFailure;

export type PurchaseInvoiceSourceLinkedLedgerEntry = LedgerJournalRow & {
  sourceType: InvoiceLedgerPostingSourceType;
  sourceId: string;
};

export type PurchaseInvoiceLedgerPostingCommand = {
  scope: TenantScope;
  sourceType: InvoiceLedgerPostingSourceType;
  invoiceKind: InvoiceLedgerPostingKind;
  sourceId: string;
  originalInvoiceStatus: PurchaseInvoiceRow["status"];
  originalInvoiceUpdatedAt: string;
  invoice: PurchaseInvoiceRow;
  ledgerEntry: PurchaseInvoiceSourceLinkedLedgerEntry;
  successAudits: readonly [AuditLogEntryInput, AuditLogEntryInput];
};

export type PurchaseInvoiceLedgerPostingRepository = {
  commit(
    command: PurchaseInvoiceLedgerPostingCommand,
  ): Promise<PurchaseInvoiceLedgerPostingResult>;
};

export type PurchaseInvoiceLedgerPostingService = {
  post(input: {
    invoice: PurchaseInvoiceRow;
    scope: TenantScope;
  }): Promise<PurchaseInvoiceLedgerPostingResult>;
};

export function createPurchaseInvoiceLedgerPostingService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: PurchaseInvoiceLedgerPostingRepository;
}): PurchaseInvoiceLedgerPostingService {
  return createInvoiceLedgerPostingService({ now, repository, kind: "purchase" });
}

export function createSalesInvoiceLedgerPostingService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: PurchaseInvoiceLedgerPostingRepository;
}): PurchaseInvoiceLedgerPostingService {
  return createInvoiceLedgerPostingService({ now, repository, kind: "sales" });
}

export function createInvoiceLedgerPostingService({
  now = () => new Date().toISOString(),
  repository,
  kind,
}: {
  now?: () => string;
  repository: PurchaseInvoiceLedgerPostingRepository;
  kind: InvoiceLedgerPostingKind;
}): PurchaseInvoiceLedgerPostingService {
  return {
    async post({ invoice, scope }) {
      const commandResult = buildPurchaseInvoiceLedgerPostingCommand({
        invoice,
        scope,
        timestamp: now(),
        kind,
      });

      if (!commandResult.ok) {
        return commandResult;
      }

      try {
        return await repository.commit(commandResult.data);
      } catch {
        return failure(
          "persistence-failed",
          `${kind === "sales" ? "Satış" : "Alış"} faturası muhasebe fişi kalıcı olarak oluşturulamadı.`,
        );
      }
    },
  };
}

export function buildPurchaseInvoiceLedgerPostingCommand({
  invoice,
  scope,
  timestamp,
  kind = "purchase",
}: {
  invoice: PurchaseInvoiceRow;
  scope: TenantScope;
  timestamp: string;
  kind?: InvoiceLedgerPostingKind;
}):
  | { ok: true; data: PurchaseInvoiceLedgerPostingCommand }
  | PurchaseInvoiceLedgerPostingFailure {
  const scopeErrors = validateTenantScope(scope);

  if (scopeErrors.length > 0) {
    return {
      ok: false,
      errors: scopeErrors,
      reasonCode: "scope-invalid",
    };
  }

  const labels: {
    sourceType: InvoiceLedgerPostingSourceType;
    prefix: string;
    noun: "alış" | "satış";
    title: "Alış" | "Satış";
    entityType: "purchase-invoice" | "sales-invoice";
  } = kind === "sales"
    ? { sourceType: SALES_INVOICE_LEDGER_SOURCE_TYPE, prefix: "YVM-SF", noun: "satış", title: "Satış", entityType: "sales-invoice" as const }
    : { sourceType: PURCHASE_INVOICE_LEDGER_SOURCE_TYPE, prefix: "YVM-AF", noun: "alış", title: "Alış", entityType: "purchase-invoice" as const };

  if (!invoiceBelongsToScope(invoice, scope)) {
    return failure(
      "scope-mismatch",
      `${labels.title} faturası aktif tenant, firma ve dönem kapsamına ait değil.`,
    );
  }

  if (!hasRbacPermission(scope.userRole, "ledger.post")) {
    return failure(
      "permission-denied",
      `${labels.title} faturasını muhasebeleştirmek için muhasebe yetkisi gereklidir.`,
    );
  }

  if (scope.periodClosed) {
    return failure(
      "period-closed",
      `Kapalı dönemde ${labels.noun} faturası muhasebe fişi oluşturulamaz.`,
    );
  }

  if (invoice.status !== "Taslak") {
    return failure(
      "invalid-status",
      `Yalnız taslak ${labels.noun} faturası muhasebeleştirilebilir.`,
    );
  }

  if (!invoice.id.trim() || !invoice.documentNo.trim()) {
    return failure(
      "invalid-invoice",
      `${labels.title} faturası kimliği ve evrak numarası zorunludur.`,
    );
  }

  const netTotal = roundMoney(invoice.netTotal);
  const vatTotal = roundMoney(invoice.vatTotal);
  const withholdingTotal = roundMoney(invoice.withholdingTotal);
  const grandTotal = roundMoney(invoice.grandTotal);

  if (
    ![netTotal, vatTotal, withholdingTotal, grandTotal].every(Number.isFinite) ||
    netTotal <= 0 ||
    vatTotal < 0 ||
    grandTotal <= 0
  ) {
    return failure(
      "invalid-total",
      `${labels.title} faturası muhasebe toplamları geçerli ve sıfırdan büyük olmalıdır.`,
    );
  }

  if (withholdingTotal !== 0) {
    return failure(
      "unsupported-withholding",
      `Tevkifatlı ${labels.noun} faturalarının otomatik muhasebeleştirmesi bu ilk dilimde desteklenmiyor.`,
    );
  }

  if (roundMoney(netTotal + vatTotal) !== grandTotal) {
    return failure(
      "invalid-total",
      `${labels.title} faturası net, KDV ve genel toplamları birbiriyle uyumlu değil.`,
    );
  }

  const sourceId = invoice.id;
  const sourceType = labels.sourceType;
  const description = `${labels.title} faturası ${invoice.documentNo.trim()} - ${invoice.counterpartyName.trim()}`;
  const lines: LedgerLineDraft[] = kind === "sales"
    ? [
        { accountCode: "120", accountName: "Alıcılar", amount: grandTotal, direction: "debit", description },
        { accountCode: "600", accountName: "Yurtiçi Satışlar", amount: netTotal, direction: "credit", description },
        ...(vatTotal > 0 ? [{ accountCode: "391", accountName: "Hesaplanan KDV", amount: vatTotal, direction: "credit" as const, description }] : []),
      ]
    : [
        { accountCode: "153", accountName: "Ticari Mallar", amount: netTotal, direction: "debit", description },
        ...(vatTotal > 0 ? [{ accountCode: "191", accountName: "İndirilecek KDV", amount: vatTotal, direction: "debit" as const, description }] : []),
        { accountCode: "320", accountName: "Satıcılar", amount: grandTotal, direction: "credit", description },
      ];
  const debitTotal = kind === "sales" ? grandTotal : roundMoney(netTotal + vatTotal);
  const ledgerEntry: PurchaseInvoiceSourceLinkedLedgerEntry = {
    id: `${invoice.id}::ledger-entry`,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    sourceType,
    sourceId,
    currency: invoice.currency,
    documentNo: `${labels.prefix}-${invoice.documentNo.trim()}`,
    entryDate: invoice.invoiceDate,
    description,
    lines,
    status: "posted",
    debitTotal,
    creditTotal: grandTotal,
    createdBy: scope.userId,
    updatedBy: scope.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const ledgerValidation = validateLedgerJournalDraft(scope, ledgerEntry);

  if (!ledgerValidation.ok) {
    return {
      ok: false,
      errors: ledgerValidation.errors,
      reasonCode: "invalid-ledger",
    };
  }

  const postedInvoice: PurchaseInvoiceRow = {
    ...invoice,
    status: "Kaydedildi",
    updatedBy: scope.userId,
    updatedAt: timestamp,
  };
  const purchaseInvoiceAudit = createAuditLogEntry(scope, {
    action: `${labels.entityType}.post`,
    entityType: labels.entityType,
    entityId: invoice.id,
    entityLabel: invoice.documentNo,
    occurredAt: timestamp,
    metadata: {
      documentNo: invoice.documentNo,
      statusFrom: invoice.status,
      statusTo: postedInvoice.status,
      counterpartyCode: invoice.counterpartyCode,
      counterpartyName: invoice.counterpartyName,
      siteCode: invoice.siteCode,
      siteName: invoice.siteName,
      grandTotal,
      lineCount: invoice.lineCount,
      ledgerEntryId: ledgerEntry.id,
      ledgerDocumentNo: ledgerEntry.documentNo,
      sourceType,
      sourceId,
    },
  });
  const ledgerAudit = createAuditLogEntry(scope, {
    action: "ledger.entry.post",
    entityType: "ledger-entry",
    entityId: ledgerEntry.id,
    entityLabel: ledgerEntry.documentNo,
    occurredAt: timestamp,
    metadata: {
      status: ledgerEntry.status,
      currency: ledgerEntry.currency,
      debitTotal: ledgerEntry.debitTotal,
      creditTotal: ledgerEntry.creditTotal,
      lineCount: ledgerEntry.lines.length,
      sourceType,
      sourceId,
      sourceDocumentNo: invoice.documentNo,
    },
  });

  return {
    ok: true,
    data: {
      scope,
      sourceType,
      sourceId,
      invoiceKind: kind,
      originalInvoiceStatus: invoice.status,
      originalInvoiceUpdatedAt: invoice.updatedAt,
      invoice: postedInvoice,
      ledgerEntry,
      successAudits: [purchaseInvoiceAudit, ledgerAudit],
    },
  };
}

function invoiceBelongsToScope(invoice: PurchaseInvoiceRow, scope: TenantScope) {
  return (
    invoice.tenantId === scope.tenantId &&
    invoice.companyId === scope.companyId &&
    invoice.periodId === scope.periodId
  );
}

function failure(
  reasonCode: PurchaseInvoiceLedgerPostingReasonCode,
  error: string,
): PurchaseInvoiceLedgerPostingFailure {
  return {
    ok: false,
    errors: [error],
    reasonCode,
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
