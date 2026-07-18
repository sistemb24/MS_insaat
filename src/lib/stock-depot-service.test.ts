import { describe, expect, test } from "vitest";

import type { PurchaseInvoiceRow } from "./purchase-invoice-service";
import type { DeliveryNoteRow } from "./delivery-note-service";
import { summarizeStockDepotFromInvoices } from "./stock-depot-service";

const postedInvoice = createInvoice({
  documentNo: "FAT-1001",
  status: "Kaydedildi",
});
const draftInvoice = createInvoice({
  documentNo: "FAT-1002",
  status: "Taslak",
});

describe("summarizeStockDepotFromInvoices", () => {
  test("builds warehouse stock summary from posted purchase invoice lines", () => {
    const result = summarizeStockDepotFromInvoices([
      postedInvoice,
      draftInvoice,
      {
        ...postedInvoice,
        id: "invoice-3",
        documentNo: "FAT-1003",
        lines: [
          {
            ...postedInvoice.lines[0],
            quantity: 25,
            unitPrice: 180,
          },
        ],
      },
    ]);

    expect(result.summaryRows).toEqual([
      {
        balanceQuantity: 125,
        incomingQuantity: 125,
        outgoingQuantity: 0,
        netTotal: 17550,
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        unit: "Adet",
        warehouse: "Merkez Depo",
      },
    ]);
    expect(result.movementRows).toEqual([
      expect.objectContaining({
        documentNo: "FAT-1001",
        incomingQuantity: 100,
        netTotal: 13500,
        sourceType: "purchase-invoice",
        stockName: "Çimento Torba",
        warehouse: "Merkez Depo",
      }),
      expect.objectContaining({
        documentNo: "FAT-1003",
        incomingQuantity: 25,
        netTotal: 4050,
        sourceType: "purchase-invoice",
        stockName: "Çimento Torba",
        warehouse: "Merkez Depo",
      }),
    ]);
  });

  test("uses a linked delivery note as the single stock source without double counting its invoice", () => {
    const deliveryNote = {
      companyId: postedInvoice.companyId,
      createdAt: postedInvoice.createdAt,
      createdBy: postedInvoice.createdBy,
      deliveryDate: "2026-06-28",
      documentNo: "IRS-1001",
      id: "delivery-note-1",
      lineCount: 1,
      lines: [{ quantity: 40, stockCode: "STK-0001", stockName: "Çimento Torba", unit: "Adet", warehouse: "Merkez Depo" }],
      linkedPurchaseInvoiceDocumentNo: postedInvoice.documentNo,
      linkedPurchaseInvoiceId: postedInvoice.id,
      periodId: postedInvoice.periodId,
      siteCode: postedInvoice.siteCode,
      siteName: postedInvoice.siteName,
      status: "Kaydedildi",
      supplierCode: postedInvoice.counterpartyCode,
      supplierName: postedInvoice.counterpartyName,
      tenantId: postedInvoice.tenantId,
      totalQuantity: 40,
      updatedAt: postedInvoice.updatedAt,
      updatedBy: postedInvoice.updatedBy,
    } as DeliveryNoteRow;

    const result = summarizeStockDepotFromInvoices([postedInvoice], [deliveryNote]);

    expect(result.movementRows).toEqual([
      expect.objectContaining({
        documentNo: "IRS-1001",
        incomingQuantity: 40,
        netTotal: 5400,
        sourceType: "delivery-note",
      }),
    ]);
    expect(result.summaryRows[0]).toEqual(expect.objectContaining({ balanceQuantity: 40, incomingQuantity: 40, netTotal: 5400, outgoingQuantity: 0 }));
  });

  test("applies posted transfers as balanced warehouse movements and site issues as outgoing stock", () => {
    const movements = [
      {
        documentNo: "STR-1",
        id: "movement-1",
        movementDate: "2026-06-28",
        movementType: "Depo Transferi",
        quantity: 30,
        sourceWarehouse: "Merkez Depo",
        status: "Kaydedildi",
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        targetWarehouse: "Şantiye Depo",
        unit: "Adet",
        unitCost: 135,
      },
      {
        documentNo: "SC-1",
        id: "movement-2",
        movementDate: "2026-06-29",
        movementType: "Şantiye Çıkışı",
        quantity: 10,
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        sourceWarehouse: "Şantiye Depo",
        status: "Kaydedildi",
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        unit: "Adet",
        unitCost: 135,
      },
    ] as never;
    const result = summarizeStockDepotFromInvoices([postedInvoice], [], movements);
    expect(result.summaryRows).toEqual([
      expect.objectContaining({ balanceQuantity: 70, incomingQuantity: 100, outgoingQuantity: 30, warehouse: "Merkez Depo" }),
      expect.objectContaining({ balanceQuantity: 20, incomingQuantity: 30, outgoingQuantity: 10, warehouse: "Şantiye Depo" }),
    ]);
  });
});

function createInvoice({
  documentNo,
  status,
}: {
  documentNo: string;
  status: PurchaseInvoiceRow["status"];
}): PurchaseInvoiceRow {
  return {
    id: `invoice-${documentNo}`,
    tenantId: "tenant-noa-demo",
    companyId: "company-demo-insaat",
    periodId: "period-2026",
    createdBy: "user-main",
    updatedBy: "user-main",
    createdAt: "2026-06-27T09:00:00.000Z",
    updatedAt: "2026-06-27T09:00:00.000Z",
    counterpartyCode: "TED-0001",
    counterpartyName: "ÖRNEK TEDARİKÇİ",
    currency: "TL",
    description: "",
    discountTotal: 1500,
    documentNo,
    dueDate: "2026-07-27",
    exchangeRate: 1,
    grandTotal: 16200,
    invoiceDate: "2026-06-27",
    isOfficial: false,
    lineCount: 2,
    movementGroup: "Malzeme Alımı",
    netTotal: 13500,
    siteCode: "SANT-0001",
    siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
    status,
    subtotal: 15000,
    vatTotal: 2700,
    withholdingTotal: 0,
    lines: [
      {
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Adet",
        description: "50kg Portland",
        warehouse: "Merkez Depo",
        quantity: 100,
        unitPrice: 150,
        discountRate1: 10,
        discountRate2: 0,
        vatRate: 20,
      },
      {
        stockCode: "HIZ-0001",
        stockName: "Nakliye Hizmeti",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        unit: "Sefer",
        description: "Şantiye teslim nakliye",
        warehouse: "",
        quantity: 2,
        unitPrice: 2500,
        discountRate1: 0,
        discountRate2: 5,
        vatRate: 10,
      },
    ],
  };
}
