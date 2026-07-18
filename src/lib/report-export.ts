import type {
  OperationalReportActivityRow,
  OperationalReportCounterpartyStatementDetailRow,
  OperationalReportCounterpartyStatementRow,
  OperationalReportSiteProfitRow,
} from "./reports-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

const counterpartyStatementCsvHeaders = [
  "Tarih",
  "Cari",
  "Kaynak",
  "Evrak No",
  "İşlem",
  "Muhasebe Fişi",
  "Tutar",
  "Yürüyen Bakiye",
  "Para Birimi",
];

const siteProfitCsvHeaders = [
  "Şantiye Kodu",
  "Şantiye",
  "Gelir",
  "Alış Maliyeti",
  "Gider Maliyeti",
  "Hakediş Maliyeti",
  "İşçilik",
  "Toplam Maliyet",
  "Net",
  "Para Birimi",
];

const counterpartyBalanceCsvHeaders = [
  "Cari",
  "Borç Belgesi",
  "Alacak Belgesi",
  "Ödenen",
  "Tahsil Edilen",
  "Net Bakiye",
  "Para Birimi",
];

const activityRowsCsvHeaders = [
  "Tarih",
  "Kaynak",
  "Evrak No",
  "Cari",
  "Tutar",
  "Para Birimi",
];

export function buildCounterpartyStatementCsv(
  rows: OperationalReportCounterpartyStatementDetailRow[],
) {
  return buildCsv(
    counterpartyStatementCsvHeaders,
    rows.map((row) =>
      [
        row.date,
        row.counterpartyName,
        row.source,
        row.documentNo,
        row.effect,
        row.ledgerDocumentNo ?? "-",
        formatCsvAmount(row.amount),
        formatCsvAmount(row.balanceAfter),
        formatCsvCurrency(),
      ],
    ),
  );
}

export function buildSiteProfitCsv(rows: OperationalReportSiteProfitRow[]) {
  return buildCsv(
    siteProfitCsvHeaders,
    rows.map((row) => [
      row.siteCode,
      row.siteName,
      formatCsvAmount(row.incomeTotal),
      formatCsvAmount(row.purchaseCostTotal),
      formatCsvAmount(row.expenseCostTotal),
      formatCsvAmount(row.progressPaymentCostTotal),
      formatCsvAmount(row.laborCostTotal),
      formatCsvAmount(row.totalCost),
      formatCsvAmount(row.netProfit),
      formatCsvCurrency(),
    ]),
  );
}

export function buildCounterpartyBalanceCsv(
  rows: OperationalReportCounterpartyStatementRow[],
) {
  return buildCsv(
    counterpartyBalanceCsvHeaders,
    rows.map((row) => [
      row.counterpartyName,
      formatCsvAmount(row.payableTotal),
      formatCsvAmount(row.receivableTotal),
      formatCsvAmount(row.cashPaidTotal),
      formatCsvAmount(row.cashReceivedTotal),
      formatCsvAmount(row.netBalance),
      formatCsvCurrency(),
    ]),
  );
}

export function buildActivityRowsCsv(rows: OperationalReportActivityRow[]) {
  return buildCsv(
    activityRowsCsvHeaders,
    rows.map((row) => [
      row.date,
      row.source,
      row.documentNo,
      row.label,
      formatCsvAmount(row.amount),
      formatCsvCurrency(),
    ]),
  );
}

export function buildCounterpartyStatementCsvHref(
  rows: OperationalReportCounterpartyStatementDetailRow[],
) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(
    buildCounterpartyStatementCsv(rows),
  )}`;
}

export function buildCsvHref(csv: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export function buildCounterpartyStatementCsvFileName(counterpartyName: string) {
  return `cari-ekstresi-${slugifyCounterpartyName(counterpartyName)}.csv`;
}

function buildCsv(headers: string[], rows: string[][]) {
  return [
    headers.join(";"),
    ...rows.map((row) => row.map(escapeCsvCell).join(";")),
  ].join("\r\n");
}

function escapeCsvCell(value: string) {
  if (/[;"\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function formatCsvAmount(value: number) {
  return value.toFixed(2);
}

function formatCsvCurrency() {
  return getP0BaseCurrencyTransactionValue();
}

function slugifyCounterpartyName(value: string) {
  const slug = value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "tum-cariler";
}
