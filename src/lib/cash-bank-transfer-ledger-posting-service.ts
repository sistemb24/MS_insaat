import type { AuditLogRepository } from "./audit-log";
import type { CashBankMovementRow } from "./cash-bank-movement-service";
import { createLedgerService, type LedgerRepository, type LedgerJournalRow } from "./ledger-service";
import { type TenantScope, validateTenantScope } from "./tenant-scope";

export type CashBankTransferLedgerPostingResult =
  | { ok: true; data: { ledgerEntry: LedgerJournalRow; created: boolean } }
  | { ok: false; errors: string[] };

export type CashBankTransferLedgerPostingService = {
  post(input: {
    movements: CashBankMovementRow[];
    scope: TenantScope;
  }): Promise<CashBankTransferLedgerPostingResult>;
};

export function createCashBankTransferLedgerPostingService({
  now = () => new Date().toISOString(),
  repository,
  auditLogRepository,
}: {
  now?: () => string;
  repository: LedgerRepository;
  auditLogRepository?: AuditLogRepository;
}): CashBankTransferLedgerPostingService {
  return {
    async post({ movements, scope }) {
      const scopeErrors = validateTenantScope(scope);
      if (scopeErrors.length > 0) return { ok: false, errors: scopeErrors };

      const errors = validateTransferMovements(movements, scope);
      if (errors.length > 0) return { ok: false, errors };

      const outgoing = movements.find((movement) => movement.direction === "Çıkış")!;
      const incoming = movements.find((movement) => movement.direction === "Giriş")!;
      const documentNo = `YVM-VRM-${outgoing.documentNo}`;
      const ledgerService = createLedgerService({ now, repository, auditLogRepository });
      const result = await ledgerService.post({
        scope,
        draft: {
          currency: outgoing.currency,
          documentNo,
          entryDate: outgoing.movementDate,
          description: `${outgoing.documentNo} kasa/banka virman muhasebe fişi`,
          sourceType: "cash-bank-transfer",
          sourceId: outgoing.documentNo,
          lines: [
            {
              accountCode: resolveCashLedgerAccount(incoming).code,
              accountName: resolveCashLedgerAccount(incoming).name,
              amount: incoming.amount,
              direction: "debit",
              description: incoming.description,
            },
            {
              accountCode: resolveCashLedgerAccount(outgoing).code,
              accountName: resolveCashLedgerAccount(outgoing).name,
              amount: outgoing.amount,
              direction: "credit",
              description: outgoing.description,
            },
          ],
        },
      });
      if (!result.ok) {
        const existing = await repository.findByDocumentNo({ documentNo, scope });
        if (existing?.sourceType === "cash-bank-transfer" && existing.sourceId === outgoing.documentNo) {
          return { ok: true, data: { ledgerEntry: existing, created: false } };
        }
        return { ok: false, errors: result.errors };
      }

      return { ok: true, data: { ledgerEntry: result.data, created: true } };
    },
  };
}

function validateTransferMovements(movements: CashBankMovementRow[], scope: TenantScope) {
  const errors: string[] = [];
  if (scope.periodClosed) errors.push("Kapalı dönemde kasa/banka virman fişi oluşturulamaz.");
  if (movements.length !== 2) errors.push("Virman için bir çıkış ve bir giriş hareketi gereklidir.");

  for (const movement of movements) {
    if (movement.tenantId !== scope.tenantId || movement.companyId !== scope.companyId || movement.periodId !== scope.periodId) {
      errors.push("Virman hareketi aktif tenant, firma ve dönem kapsamına ait değil.");
      break;
    }
    if (movement.sourceType !== "transfer" || movement.movementType !== "Virman") {
      errors.push("Yalnız transfer kaynaklı virman hareketleri muhasebeleştirilebilir.");
      break;
    }
  }

  if (movements.length === 2) {
    const outgoing = movements.find((movement) => movement.direction === "Çıkış");
    const incoming = movements.find((movement) => movement.direction === "Giriş");
    if (!outgoing || !incoming) errors.push("Virman için bir çıkış ve bir giriş hareketi gereklidir.");
    else {
      if (outgoing.documentNo !== incoming.documentNo || outgoing.sourceLabel !== incoming.sourceLabel) errors.push("Virman hareket çifti aynı belge numarasına ait olmalıdır.");
      if (outgoing.amount !== incoming.amount || outgoing.currency !== incoming.currency) errors.push("Virman hareket çifti aynı tutar ve para birimine sahip olmalıdır.");
      if (outgoing.accountCode === incoming.accountCode) errors.push("Virman hesapları birbirinden farklı olmalıdır.");
    }
  }

  return [...new Set(errors)];
}

function resolveCashLedgerAccount(movement: CashBankMovementRow) {
  if (movement.accountCode === "102" || movement.accountCode.toLocaleUpperCase("tr-TR").startsWith("BANKA")) return { code: "102", name: "Bankalar" };
  return { code: "100", name: "Kasa" };
}
