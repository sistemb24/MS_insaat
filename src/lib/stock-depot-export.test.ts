import { describe, expect, test } from "vitest";

import type {
  StockDepotMovementRow,
  StockDepotSummaryRow,
} from "./stock-depot-service";
import {
  buildStockDepotMovementCsv,
  buildStockDepotSummaryCsv,
} from "./stock-depot-export";

describe("stock depot export helpers", () => {
  test("builds stock depot summary csv with escaped values and P0 currency", () => {
    const rows: StockDepotSummaryRow[] = [
      {
        balanceQuantity: 125,
        incomingQuantity: 125,
        outgoingQuantity: 0,
        netTotal: 17550,
        stockCode: "STK-0001",
        stockName: "Çimento; Torba",
        unit: "Adet",
        warehouse: "Merkez Depo",
      },
    ];

    expect(buildStockDepotSummaryCsv(rows)).toBe(
      [
        "Depo;Stok Kodu;Stok/Hizmet;Giriş;Çıkış;Bakiye;Birim;Net Değer;Para Birimi",
        'Merkez Depo;STK-0001;"Çimento; Torba";125.000;0.000;125.000;Adet;17550.00;TL',
      ].join("\r\n"),
    );
  });

  test("builds stock depot movement csv from filtered invoice movements", () => {
    const rows: StockDepotMovementRow[] = [
      {
        balanceQuantity: 100,
        documentNo: "FAT-1001",
        incomingQuantity: 100,
        outgoingQuantity: 0,
        invoiceDate: "2026-06-27",
        netTotal: 13500,
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        sourceId: "invoice-1::line-1",
        sourceType: "purchase-invoice",
        stockCode: "STK-0001",
        stockName: "Çimento Torba",
        supplierName: "ÖRNEK TEDARİKÇİ",
        unit: "Adet",
        warehouse: "Merkez Depo",
      },
    ];

    expect(buildStockDepotMovementCsv(rows)).toBe(
      [
        "Tarih;Evrak No;Depo;Stok Kodu;Stok/Hizmet;Şantiye;Tedarikçi;Kaynak Türü;Giriş;Çıkış;Bakiye Etkisi;Birim;Net;Para Birimi",
        "2026-06-27;FAT-1001;Merkez Depo;STK-0001;Çimento Torba;ŞİRKET MERKEZ ŞANTİYESİ;ÖRNEK TEDARİKÇİ;Alış Faturası;100.000;0.000;100.000;Adet;13500.00;TL",
      ].join("\r\n"),
    );
  });
});
