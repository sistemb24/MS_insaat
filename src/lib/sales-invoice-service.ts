import { validateSalesInvoiceDraft } from "./invoices";
import {
  canMutatePurchaseInvoices,
  createInvoiceService,
  createSeededPurchaseInvoiceMemoryRepository,
  validatePurchaseInvoiceStockCodes,
  type PurchaseInvoiceCreateValues,
  type PurchaseInvoiceRepository,
  type PurchaseInvoiceRow,
  type PurchaseInvoiceService,
  type PurchaseInvoiceServiceOptions,
} from "./purchase-invoice-service";

export type SalesInvoiceCreateValues = PurchaseInvoiceCreateValues;
export type SalesInvoiceRepository = PurchaseInvoiceRepository;
export type SalesInvoiceRow = PurchaseInvoiceRow;
export type SalesInvoiceService = PurchaseInvoiceService;

export const canMutateSalesInvoices = canMutatePurchaseInvoices;
export const validateSalesInvoiceStockCodes = validatePurchaseInvoiceStockCodes;

export function createSalesInvoiceService(
  options: PurchaseInvoiceServiceOptions,
): SalesInvoiceService {
  return createInvoiceService(options, {
    auditActionPrefix: "sales-invoice",
    auditEntityType: "sales-invoice",
    idSegment: "sales-invoice",
    enforceLedgerLifecycle: true,
    invoiceNoun: "satış",
    ledgerPostingService: options.ledgerPostingService,
    ledgerReversalService: options.ledgerReversalService,
    ledgerRepository: options.ledgerRepository,
    validateDraft: validateSalesInvoiceDraft,
  });
}

export function createSeededSalesInvoiceMemoryRepository(): SalesInvoiceRepository {
  return createSeededPurchaseInvoiceMemoryRepository();
}
