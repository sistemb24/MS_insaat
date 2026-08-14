import type { CashBankMovementRow } from "./cash-bank-movement-service";
import {
  createLedgerService,
  type LedgerJournalDraft,
  type LedgerRepository,
  type LedgerJournalRow,
} from "./ledger-service";
import type { AuditLogRepository } from "./audit-log";
import { type TenantScope, validateTenantScope } from "./tenant-scope";

export type InvoiceCashBankLedgerPostingResult =
  | { ok: true; data: { ledgerEntry: LedgerJournalRow; created: boolean } }
  | { ok: false; errors: string[] };

export type InvoiceCashBankLedgerPostingService = {
  post(input: {
    movement: CashBankMovementRow;
    scope: TenantScope;
  }): Promise<InvoiceCashBankLedgerPostingResult>;
};

export function createInvoiceCashBankLedgerPostingService({
  now = () => new Date().toISOString(),
  repository,
  auditLogRepository,
}: {
  now?: () => string;
  repository: LedgerRepository;
  auditLogRepository?: AuditLogRepository;
}): InvoiceCashBankLedgerPostingService {
  return {
    async post({ movement, scope }) {
      const scopeErrors = validateTenantScope(scope);
      if (scopeErrors.length > 0) return { ok: false, errors: scopeErrors };
      if (
        movement.tenantId !== scope.tenantId ||
        movement.companyId !== scope.companyId ||
        movement.periodId !== scope.periodId
      ) {
        return { ok: false, errors: ["Kasa/banka hareketi aktif tenant, firma ve dönem kapsamına ait değil."] };
      }

      const draft = buildCashBankMovementLedgerDraft(movement);
      if (!draft) {
        return { ok: false, errors: ["Bu kasa/banka hareket türü için muhasebe eşlemesi tanımlı değil."] };
      }

      const ledgerService = createLedgerService({ now, repository, auditLogRepository });
      const result = await ledgerService.post({
        scope,
        draft,
      });
      if (!result.ok) {
        const existing = await repository.findByDocumentNo({ documentNo: draft.documentNo, scope });
        if (existing?.sourceType === "cash-bank-movement" && existing.sourceId === movement.id) {
          return { ok: true, data: { ledgerEntry: existing, created: false } };
        }
        return { ok: false, errors: result.errors };
      }
      return { ok: true, data: { ledgerEntry: result.data, created: true } };
    },
  };
}

export function buildCashBankMovementLedgerDraft(
  movement: CashBankMovementRow,
): LedgerJournalDraft | undefined {
  const mapping = getMapping(movement);

  if (!mapping) {
    return undefined;
  }

  return {
    currency: movement.currency,
    documentNo: mapping.documentNo,
    entryDate: movement.movementDate,
    description: mapping.description,
    sourceType: "cash-bank-movement",
    sourceId: movement.id,
    lines: mapping.lines,
  };
}

function getMapping(movement: CashBankMovementRow) {
  const cashAccount = resolveCashLedgerAccount(movement);
  if (movement.sourceType === "sales-invoice" && movement.movementType === "Tahsilat") {
    return {
      documentNo: `YVM-THS-${movement.documentNo}`,
      description: `${movement.documentNo} satış faturası tahsilat muhasebe fişi`,
      lines: [
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: "120", accountName: "Alıcılar", amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  if (movement.sourceType === "purchase-invoice" && movement.movementType === "Fatura Ödemesi") {
    return {
      documentNo: `YVM-ODM-${movement.documentNo}`,
      description: `${movement.documentNo} alış faturası ödeme muhasebe fişi`,
      lines: [
        { accountCode: "320", accountName: "Satıcılar", amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  if (movement.sourceType === "payroll-accrual" && movement.movementType === "Maaş Ödemesi") {
    return {
      documentNo: `YVM-ODM-${movement.documentNo}`,
      description: `${movement.documentNo} maaş ödeme muhasebe fişi`,
      lines: [
        { accountCode: "335", accountName: "Personele Borçlar", amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  if (movement.sourceType === "progress-payment" && movement.movementType === "Hakediş Ödemesi") {
    return {
      documentNo: `YVM-ODM-${movement.documentNo}`,
      description: `${movement.documentNo} hakediş ödeme muhasebe fişi`,
      lines: [
        { accountCode: "320", accountName: "Satıcılar", amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  if (movement.sourceType === "progress-payment" && movement.movementType === "Hakediş Tahsilatı") {
    return {
      documentNo: `YVM-THS-${movement.documentNo}`,
      description: `${movement.documentNo} hakediş tahsilat muhasebe fişi`,
      lines: [
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: "120", accountName: "Alıcılar", amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  if (movement.sourceType === "cheque" && movement.movementType === "Çek Tahsilatı") {
    return {
      documentNo: `YVM-THS-${movement.documentNo}`,
      description: `${movement.documentNo} çek tahsilat muhasebe fişi`,
      lines: [
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: "101", accountName: "Alınan Çekler", amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  if (movement.sourceType === "counterparty-musteriler" && movement.movementType === "Tahsilat") {
    return {
      documentNo: `YVM-THS-CARI-${movement.documentNo}`,
      description: `${movement.documentNo} müşteri cari tahsilat muhasebe fişi`,
      lines: [
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: "120", accountName: "Alıcılar", amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  if (
    (movement.sourceType === "counterparty-tedarikciler" || movement.sourceType === "counterparty-taseronlar") &&
    movement.movementType === "Ödeme"
  ) {
    return {
      documentNo: `YVM-ODM-CARI-${movement.documentNo}`,
      description: `${movement.documentNo} cari ödeme muhasebe fişi`,
      lines: [
        { accountCode: "320", accountName: "Satıcılar", amount: movement.amount, direction: "debit" as const, description: movement.description },
        { accountCode: cashAccount.code, accountName: cashAccount.name, amount: movement.amount, direction: "credit" as const, description: movement.description },
      ],
    };
  }
  return undefined;
}

function resolveCashLedgerAccount(movement: CashBankMovementRow) {
  if (movement.accountCode === "102" || movement.accountCode.toLocaleUpperCase("tr-TR").startsWith("BANKA")) {
    return { code: "102", name: "Bankalar" };
  }
  return { code: "100", name: "Kasa" };
}
