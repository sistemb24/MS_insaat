import { calculateInvoiceTotals } from "./invoices";
import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import type { DeliveryNoteRow } from "./delivery-note-service";
import type { StockMovementRow } from "./stock-movement-service";

export type StockDepotSummaryRow = {
  incomingQuantity: number;
  outgoingQuantity: number;
  balanceQuantity: number;
  netTotal: number;
  stockCode: string;
  stockName: string;
  unit: string;
  warehouse: string;
};

export type StockDepotMovementRow = StockDepotSummaryRow & {
  documentNo: string;
  invoiceDate: string;
  siteName: string;
  sourceId: string;
  sourceType: "delivery-note" | "purchase-invoice" | "stock-movement";
  supplierName: string;
};

export type StockDepotReadModel = {
  movementRows: StockDepotMovementRow[];
  summaryRows: StockDepotSummaryRow[];
};

export function summarizeStockDepotFromInvoices(
  invoices: PurchaseInvoiceRow[],
  deliveryNotes: DeliveryNoteRow[] = [],
  stockMovements: StockMovementRow[] = [],
): StockDepotReadModel {
  const postedDeliveryNotes = deliveryNotes.filter((note) => note.status === "Kaydedildi");
  const linkedInvoiceIds = new Set(postedDeliveryNotes.map((note) => note.linkedPurchaseInvoiceId).filter(Boolean));
  const invoiceMovementRows = invoices.flatMap((invoice) =>
    invoice.status === "Kaydedildi" && !linkedInvoiceIds.has(invoice.id)
      ? invoice.lines.flatMap((line, index) => {
          const warehouse = line.warehouse?.trim() ?? "";
          const stockName = line.stockName.trim();

          if (!warehouse || !stockName) {
            return [];
          }

          const totals = calculateInvoiceTotals({
            ...invoice,
            lines: [line],
          });

          return [
            {
              documentNo: invoice.documentNo,
              incomingQuantity: line.quantity,
              outgoingQuantity: 0,
              balanceQuantity: line.quantity,
              invoiceDate: invoice.invoiceDate,
              netTotal: totals.lines[0]?.netTotal ?? 0,
              siteName: line.siteName || invoice.siteName,
              sourceId: `${invoice.id}::line-${index + 1}`,
              sourceType: "purchase-invoice" as const,
              stockCode: line.stockCode?.trim() ?? "",
              stockName,
              supplierName: invoice.counterpartyName,
              unit: line.unit.trim() || "Adet",
              warehouse,
            },
          ];
        })
      : [],
  );
  const deliveryMovementRows = postedDeliveryNotes.flatMap((note) => {
    const linkedInvoice = invoices.find((invoice) => invoice.id === note.linkedPurchaseInvoiceId);
    return note.lines.map((line, index) => {
      const invoiceLine = linkedInvoice?.lines.find((candidate) =>
        (line.stockCode && candidate.stockCode === line.stockCode) ||
        (!line.stockCode && candidate.stockName === line.stockName),
      );
      const invoiceLineNet = invoiceLine
        ? calculateInvoiceTotals({ ...linkedInvoice!, lines: [invoiceLine] }).lines[0]?.netTotal ?? 0
        : 0;
      const unitNet = invoiceLine && invoiceLine.quantity > 0 ? invoiceLineNet / invoiceLine.quantity : 0;
      return {
        documentNo: note.documentNo,
        incomingQuantity: line.quantity,
        outgoingQuantity: 0,
        balanceQuantity: line.quantity,
        invoiceDate: note.deliveryDate,
        netTotal: roundMoney(unitNet * line.quantity),
        siteName: note.siteName,
        sourceId: `${note.id}::line-${index + 1}`,
        sourceType: "delivery-note" as const,
        stockCode: line.stockCode?.trim() ?? "",
        stockName: line.stockName,
        supplierName: note.supplierName,
        unit: line.unit,
        warehouse: line.warehouse,
      };
    });
  });
  const manualMovementRows = stockMovements.flatMap((movement) => {
    if (movement.status !== "Kaydedildi") return [];
    const value = roundMoney(movement.quantity * movement.unitCost);
    const sourceRow: StockDepotMovementRow = {
      balanceQuantity: -movement.quantity,
      documentNo: movement.documentNo,
      incomingQuantity: 0,
      invoiceDate: movement.movementDate,
      netTotal: -value,
      outgoingQuantity: movement.quantity,
      siteName: movement.siteName ?? "",
      sourceId: `${movement.id}::source`,
      sourceType: "stock-movement",
      stockCode: movement.stockCode,
      stockName: movement.stockName,
      supplierName: movement.movementType,
      unit: movement.unit,
      warehouse: movement.sourceWarehouse,
    };
    if (movement.movementType === "Şantiye Çıkışı" || !movement.targetWarehouse) return [sourceRow];
    return [
      sourceRow,
      {
        ...sourceRow,
        balanceQuantity: movement.quantity,
        incomingQuantity: movement.quantity,
        netTotal: value,
        outgoingQuantity: 0,
        sourceId: `${movement.id}::target`,
        warehouse: movement.targetWarehouse,
      },
    ];
  });
  const movementRows = [...invoiceMovementRows, ...deliveryMovementRows, ...manualMovementRows];

  return {
    movementRows,
    summaryRows: summarizeMovementRows(movementRows),
  };
}

function summarizeMovementRows(
  movementRows: StockDepotMovementRow[],
): StockDepotSummaryRow[] {
  const grouped = new Map<string, StockDepotSummaryRow>();

  for (const row of movementRows) {
    const key = [
      row.warehouse,
      row.stockCode || row.stockName,
      row.stockName,
      row.unit,
    ].join("::");
    const current =
      grouped.get(key) ??
      {
        incomingQuantity: 0,
        outgoingQuantity: 0,
        balanceQuantity: 0,
        netTotal: 0,
        stockCode: row.stockCode,
        stockName: row.stockName,
        unit: row.unit,
        warehouse: row.warehouse,
      };

    current.incomingQuantity += row.incomingQuantity;
    current.outgoingQuantity += row.outgoingQuantity;
    current.balanceQuantity += row.balanceQuantity;
    current.incomingQuantity = roundQuantity(current.incomingQuantity);
    current.outgoingQuantity = roundQuantity(current.outgoingQuantity);
    current.balanceQuantity = roundQuantity(current.balanceQuantity);
    current.netTotal = roundMoney(current.netTotal + row.netTotal);
    grouped.set(key, current);
  }

  return Array.from(grouped.values());
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
