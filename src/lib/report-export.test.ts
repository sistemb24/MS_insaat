import { describe, expect, test } from "vitest";

import type {
  OperationalReportActivityRow,
  OperationalReportCounterpartyStatementDetailRow,
  OperationalReportCounterpartyStatementRow,
  OperationalReportSiteProfitRow,
} from "./reports-service";
import {
  buildActivityRowsCsv,
  buildCounterpartyBalanceCsv,
  buildCounterpartyStatementCsv,
  buildSiteProfitCsv,
} from "./report-export";

describe("report export helpers", () => {
  test("builds a semicolon separated counterparty statement csv with escaped values", () => {
    const rows: OperationalReportCounterpartyStatementDetailRow[] = [
      createStatementRow({
        amount: -12000,
        balanceAfter: -12000,
        counterpartyName: "ABC Beton; Şantiye",
        documentNo: "FAT-0001",
        effect: "Borç",
      }),
      createStatementRow({
        amount: 5000,
        balanceAfter: -7000,
        documentNo: "ODM-FAT-0001",
        effect: "Ödeme",
        source: "Kasa/Banka",
      }),
    ];

    expect(buildCounterpartyStatementCsv(rows)).toBe(
      [
        "Tarih;Cari;Kaynak;Evrak No;İşlem;Muhasebe Fişi;Tutar;Yürüyen Bakiye;Para Birimi",
        '2026-06-20;"ABC Beton; Şantiye";Fatura;FAT-0001;Borç;-;-12000.00;-12000.00;TL',
        "2026-06-20;ABC Beton;Kasa/Banka;ODM-FAT-0001;Ödeme;-;5000.00;-7000.00;TL",
      ].join("\r\n"),
    );
  });

  test("builds site profitability csv rows", () => {
    const rows: OperationalReportSiteProfitRow[] = [
      {
        expenseCostTotal: 7000,
        incomeTotal: 90000,
        laborCostTotal: 31500,
        netProfit: 21500,
        progressPaymentCostTotal: 18000,
        purchaseCostTotal: 12000,
        siteCode: "SANT-0001",
        siteName: "ŞİRKET MERKEZ ŞANTİYESİ",
        totalCost: 68500,
      },
    ];

    expect(buildSiteProfitCsv(rows)).toBe(
      [
        "Şantiye Kodu;Şantiye;Gelir;Alış Maliyeti;Gider Maliyeti;Hakediş Maliyeti;İşçilik;Toplam Maliyet;Net;Para Birimi",
        "SANT-0001;ŞİRKET MERKEZ ŞANTİYESİ;90000.00;12000.00;7000.00;18000.00;31500.00;68500.00;21500.00;TL",
      ].join("\r\n"),
    );
  });

  test("builds counterparty balance csv rows", () => {
    const rows: OperationalReportCounterpartyStatementRow[] = [
      {
        cashPaidTotal: 5000,
        cashReceivedTotal: 0,
        counterpartyName: "ABC Beton",
        netBalance: -7000,
        payableTotal: 12000,
        receivableTotal: 0,
      },
    ];

    expect(buildCounterpartyBalanceCsv(rows)).toBe(
      [
        "Cari;Borç Belgesi;Alacak Belgesi;Ödenen;Tahsil Edilen;Net Bakiye;Para Birimi",
        "ABC Beton;12000.00;0.00;5000.00;0.00;-7000.00;TL",
      ].join("\r\n"),
    );
  });

  test("builds recent activity csv rows", () => {
    const rows: OperationalReportActivityRow[] = [
      {
        amount: -5000,
        date: "2026-06-30",
        documentNo: "ODM-FAT-0001",
        id: "cash-bank-movement:movement-1",
        label: "ABC Beton",
        source: "Kasa/Banka",
      },
    ];

    expect(buildActivityRowsCsv(rows)).toBe(
      [
        "Tarih;Kaynak;Evrak No;Cari;Tutar;Para Birimi",
        "2026-06-30;Kasa/Banka;ODM-FAT-0001;ABC Beton;-5000.00;TL",
      ].join("\r\n"),
    );
  });
});

function createStatementRow(
  overrides: Partial<OperationalReportCounterpartyStatementDetailRow> = {},
): OperationalReportCounterpartyStatementDetailRow {
  return {
    amount: -12000,
    balanceAfter: -12000,
    counterpartyName: "ABC Beton",
    date: "2026-06-20",
    documentNo: "FAT-0001",
    effect: "Borç",
    source: "Fatura",
    targetHref: "/faturalar?evrak=FAT-0001",
    ...overrides,
  };
}

