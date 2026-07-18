import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import { createLedgerService, type LedgerJournalRow, type LedgerRepository } from "./ledger-service";
import type { AuditLogRepository } from "./audit-log";
import type { CashBankMovementRepository } from "./cash-bank-movement-service";
import type { TenantScope } from "./tenant-scope";

export type InvoiceLedgerReversalService = {
  reverse(input: { invoice: PurchaseInvoiceRow; scope: TenantScope }): Promise<
    | { ok: true; data: { ledgerEntry: LedgerJournalRow; created: boolean } }
    | { ok: false; errors: string[] }
  >;
};

export function createInvoiceLedgerReversalService({
  kind,
  now = () => new Date().toISOString(),
  repository,
  cashBankMovementRepository,
  auditLogRepository,
}: {
  kind: "purchase" | "sales";
  now?: () => string;
  repository: LedgerRepository;
  cashBankMovementRepository?: Pick<CashBankMovementRepository, "list" | "create">;
  auditLogRepository?: AuditLogRepository;
}): InvoiceLedgerReversalService {
  const ledgerService = createLedgerService({ now, repository, auditLogRepository });

  return {
    async reverse({ invoice, scope }) {
      const sourceType = kind === "sales" ? "sales-invoice" : "purchase-invoice";
      const ledgerEntries = await repository.list({ scope });
      const source = ledgerEntries.find(
        (entry) => entry.sourceType === sourceType && entry.sourceId === invoice.id,
      );
      if (!source) {
        return { ok: false, errors: [`Kesinleşmiş ${kind === "sales" ? "satış" : "alış"} faturası için kaynak muhasebe fişi bulunamadı.`] };
      }
      if (cashBankMovementRepository) {
        const linkedMovements = await cashBankMovementRepository.list({ scope });
        const invoiceMovements = linkedMovements.filter(
          (movement) => movement.sourceType === sourceType && movement.sourceId === invoice.id,
        );
        if (invoiceMovements.length > 0 && !cashBankMovementRepository.create) {
          return {
            ok: false,
            errors: [
              `Bu ${kind === "sales" ? "satış" : "alış"} faturaya bağlı kasa/banka hareketi için ters hareket kalıcılığı bağlı değil.`,
            ],
          };
        }
        for (const movement of invoiceMovements) {
          const movementSource = ledgerEntries.find(
            (entry) => entry.sourceType === "cash-bank-movement" && entry.sourceId === movement.id,
          );
          if (!movementSource) {
            return {
              ok: false,
              errors: [
                `Bu ${kind === "sales" ? "satış" : "alış"} faturaya bağlı ${movement.documentNo} hareketinin kaynak muhasebe fişi bulunamadı.`,
              ],
            };
          }
          const movementReversal = await ledgerService.post({
            scope,
            draft: {
              currency: movementSource.currency,
              documentNo: `YVM-IA-${movementSource.documentNo}`,
              entryDate: movement.movementDate,
              description: `${movement.documentNo} kasa/banka hareketi ters kayıt fişi`,
              sourceType: "cash-bank-movement-reversal",
              sourceId: movement.id,
              lines: movementSource.lines.map((line) => ({
                ...line,
                direction: line.direction === "debit" ? "credit" as const : "debit" as const,
                description: `${movement.documentNo} ters kayıt`,
              })),
            },
          });
          if (!movementReversal.ok) {
            const existingMovementReversal = (await repository.list({ scope })).find(
              (entry) => entry.sourceType === "cash-bank-movement-reversal" && entry.sourceId === movement.id,
            );
            if (!existingMovementReversal) return movementReversal;
          }
          const existingMovementReversal = linkedMovements.find(
            (entry) => entry.sourceType === "cash-bank-movement-reversal" && entry.sourceId === movement.id,
          );
          if (!existingMovementReversal) {
            try {
              await cashBankMovementRepository.create({
                ...movement,
                id: `${movement.id}::reversal`,
                direction: movement.direction === "Giriş" ? "Çıkış" : "Giriş",
                documentNo: `YVM-IA-${movement.documentNo}`,
                description: `${movement.documentNo} kasa/banka ters hareketi`,
                sourceType: "cash-bank-movement-reversal",
                sourceId: movement.id,
                sourceLabel: `${movement.sourceLabel} ters kayıt`,
                createdBy: scope.userId,
                updatedBy: scope.userId,
                createdAt: now(),
                updatedAt: now(),
              });
            } catch {
              return {
                ok: false,
                errors: [`${movement.documentNo} kasa/banka ters hareketi kalıcılaştırılamadı.`],
              };
            }
          }
        }
      }
      const documentNo = `YVM-IA-${source.documentNo}`;
      const result = await ledgerService.post({
        scope,
        draft: {
          currency: source.currency,
          documentNo,
          entryDate: invoice.invoiceDate,
          description: `${invoice.documentNo} ${kind === "sales" ? "satış" : "alış"} faturası ters kayıt fişi`,
          sourceType: `${sourceType}-reversal`,
          sourceId: invoice.id,
          lines: source.lines.map((line) => ({
            ...line,
            direction: line.direction === "debit" ? "credit" as const : "debit" as const,
            description: `${invoice.documentNo} ters kayıt`,
          })),
        },
      });
      if (result.ok) return { ok: true, data: { ledgerEntry: result.data, created: true } };
      const existing = (await repository.list({ scope })).find(
        (entry) => entry.sourceType === `${sourceType}-reversal` && entry.sourceId === invoice.id,
      );
      if (existing) return { ok: true, data: { ledgerEntry: existing, created: false } };
      return result;
    },
  };
}
