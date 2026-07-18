import {
  createInvoicePrismaRepository,
  type InvoicePrismaDelegate,
} from "./purchase-invoice-prisma-repository";
import type { SalesInvoiceRepository } from "./sales-invoice-service";

export type SalesInvoicePrismaClientLike = {
  salesInvoice: InvoicePrismaDelegate;
};

export function createSalesInvoicePrismaRepository(
  prisma: SalesInvoicePrismaClientLike,
): SalesInvoiceRepository {
  return createInvoicePrismaRepository(prisma.salesInvoice);
}
