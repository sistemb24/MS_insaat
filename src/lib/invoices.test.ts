import { describe, expect, test } from "vitest";

import {
  calculateInvoiceTotals,
  createPurchaseInvoiceDraft,
  validatePurchaseInvoiceDraft,
} from "./invoices";

describe("purchase invoice domain", () => {
  test("calculates invoice line and footer totals from NOA purchase invoice flow", () => {
    const draft = createPurchaseInvoiceDraft({
      documentNo: "FAT-0006",
      invoiceDate: "2026-06-23",
      dueDate: "2026-07-23",
      counterpartyCode: "TED-0001",
      counterpartyName: "ÖRNEK TEDARİKÇİ",
      siteCode: "SANT-0001",
      siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
      lines: [
        {
          stockCode: "STK-0001",
          stockName: "Çimento Torba",
          unit: "Adet",
          quantity: 100,
          unitPrice: 150,
          discountRate1: 10,
          discountRate2: 0,
          vatRate: 20,
        },
        {
          stockCode: "HIZ-0001",
          stockName: "Nakliye Hizmeti",
          unit: "Sefer",
          quantity: 2,
          unitPrice: 2500,
          discountRate1: 0,
          discountRate2: 5,
          vatRate: 10,
        },
      ],
    });

    expect(calculateInvoiceTotals(draft)).toEqual({
      subtotal: 20000,
      discountTotal: 1750,
      netTotal: 18250,
      vatTotal: 3175,
      withholdingTotal: 0,
      grandTotal: 21425,
      lines: [
        {
          lineNo: 1,
          grossTotal: 15000,
          discountTotal: 1500,
          netTotal: 13500,
          vatTotal: 2700,
          grandTotal: 16200,
        },
        {
          lineNo: 2,
          grossTotal: 5000,
          discountTotal: 250,
          netTotal: 4750,
          vatTotal: 475,
          grandTotal: 5225,
        },
      ],
    });
  });

  test("normalizes purchase invoice currency to the P0 base transaction currency", () => {
    const draft = createPurchaseInvoiceDraft({
      currency: "USD",
      documentNo: "FAT-P0-001",
      invoiceDate: "2026-06-23",
      counterpartyCode: "TED-0001",
      counterpartyName: "ÖRNEK TEDARİKÇİ",
      siteCode: "SANT-0001",
      siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
      lines: [
        {
          stockName: "Çimento Torba",
          unit: "Adet",
          quantity: 1,
          unitPrice: 100,
          vatRate: 20,
        },
      ],
    });

    expect(draft.currency).toBe("TL");
  });

  test("validates required header fields and at least one usable line", () => {
    const draft = createPurchaseInvoiceDraft({
      documentNo: " ",
      invoiceDate: "",
      dueDate: "",
      counterpartyCode: "",
      counterpartyName: "",
      siteCode: "",
      siteName: "",
      lines: [
        {
          stockCode: "",
          stockName: "",
          unit: "",
          quantity: 0,
          unitPrice: -10,
          vatRate: -1,
        },
      ],
    });

    expect(validatePurchaseInvoiceDraft(draft)).toEqual([
      "Evrak no zorunludur.",
      "Fatura tarihi zorunludur.",
      "Tedarikçi zorunludur.",
      "Şantiye zorunludur.",
      "En az bir fatura satırı stok/hizmet adı içermelidir.",
      "1. satır miktarı 0'dan büyük olmalıdır.",
      "1. satır birim fiyatı negatif olamaz.",
      "1. satır KDV oranı 0 ile 100 arasında olmalıdır.",
    ]);
  });
});
