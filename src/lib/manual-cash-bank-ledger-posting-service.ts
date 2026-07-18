import type { AuditLogRepository } from "./audit-log";
import type { CashBankMovementRow } from "./cash-bank-movement-service";
import {
  createLedgerService,
  type LedgerRepository,
} from "./ledger-service";
import { type TenantScope, validateTenantScope } from "./tenant-scope";

export type ManualCashBankCounterAccount = {
  code: string;
  name: string;
};

export const manualCashBankCounterAccounts = {
  Tahsilat: [
    { code: "120", name: "Alıcılar" },
    { code: "649", name: "Diğer Olağan Gelir ve Kârlar" },
  ],
  Ödeme: [
    { code: "320", name: "Satıcılar" },
    { code: "770", name: "Genel Yönetim Giderleri" },
  ],
} as const;

export function createManualCashBankLedgerPostingService({
  auditLogRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  repository: LedgerRepository;
}) {
  return {
    async post({
      counterAccount,
      movement,
      scope,
    }: {
      counterAccount: ManualCashBankCounterAccount;
      movement: CashBankMovementRow;
      scope: TenantScope;
    }) {
      const errors = validateTenantScope(scope);
      if (
        movement.tenantId !== scope.tenantId ||
        movement.companyId !== scope.companyId ||
        movement.periodId !== scope.periodId
      ) {
        errors.push(
          "Kasa/banka hareketi aktif tenant, firma ve dönem kapsamına ait değil.",
        );
      }
      if (movement.sourceType !== "manual") {
        errors.push("Yalnız manuel kasa/banka hareketleri bu fişle kaydedilebilir.");
      }
      if (!counterAccount.code.trim() || !counterAccount.name.trim()) {
        errors.push("Karşı muhasebe hesabı zorunludur.");
      }
      if (errors.length > 0) return { ok: false as const, errors };

      const cashAccount = resolveCashLedgerAccount(movement);
      const isCollection = movement.movementType === "Tahsilat";
      const documentNo = `${isCollection ? "YVM-THS-MAN" : "YVM-ODM-MAN"}-${movement.documentNo}`;
      const lines = isCollection
        ? [
            ledgerLine(cashAccount, movement.amount, "debit", movement.description),
            ledgerLine(counterAccount, movement.amount, "credit", movement.description),
          ]
        : [
            ledgerLine(counterAccount, movement.amount, "debit", movement.description),
            ledgerLine(cashAccount, movement.amount, "credit", movement.description),
          ];
      const ledgerService = createLedgerService({
        auditLogRepository,
        now,
        repository,
      });
      const result = await ledgerService.post({
        draft: {
          currency: movement.currency,
          description: `${movement.documentNo} manuel ${movement.movementType.toLocaleLowerCase("tr-TR")} muhasebe fişi`,
          documentNo,
          entryDate: movement.movementDate,
          lines,
          sourceId: movement.id,
          sourceType: "cash-bank-movement",
        },
        scope,
      });

      if (!result.ok) {
        const existing = await repository.findByDocumentNo({ documentNo, scope });
        if (
          existing?.sourceType === "cash-bank-movement" &&
          existing.sourceId === movement.id
        ) {
          return {
            ok: true as const,
            data: { created: false, ledgerEntry: existing },
          };
        }
        return result;
      }

      return {
        ok: true as const,
        data: { created: true, ledgerEntry: result.data },
      };
    },
  };
}

function resolveCashLedgerAccount(movement: CashBankMovementRow) {
  const normalized = movement.accountCode.toLocaleUpperCase("tr-TR");
  return normalized === "102" || normalized.startsWith("BANKA")
    ? { code: "102", name: "Bankalar" }
    : { code: "100", name: "Kasa" };
}

function ledgerLine(
  account: ManualCashBankCounterAccount,
  amount: number,
  direction: "credit" | "debit",
  description: string,
) {
  return {
    accountCode: account.code.trim(),
    accountName: account.name.trim(),
    amount,
    description,
    direction,
  };
}
