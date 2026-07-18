import type {
  StockDepotMovementRow,
  StockDepotSummaryRow,
} from "./stock-depot-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

const stockDepotSummaryCsvHeaders = [
  "Depo",
  "Stok Kodu",
  "Stok/Hizmet",
  "Giriş",
  "Çıkış",
  "Bakiye",
  "Birim",
  "Net Değer",
  "Para Birimi",
];

const stockDepotMovementCsvHeaders = [
  "Tarih",
  "Evrak No",
  "Depo",
  "Stok Kodu",
  "Stok/Hizmet",
  "Şantiye",
  "Tedarikçi",
  "Kaynak Türü",
  "Giriş",
  "Çıkış",
  "Bakiye Etkisi",
  "Birim",
  "Net",
  "Para Birimi",
];

export function buildStockDepotSummaryCsv(rows: StockDepotSummaryRow[]) {
  return buildCsv(
    stockDepotSummaryCsvHeaders,
    rows.map((row) => [
      row.warehouse,
      row.stockCode,
      row.stockName,
      formatCsvQuantity(row.incomingQuantity),
      formatCsvQuantity(row.outgoingQuantity),
      formatCsvQuantity(row.balanceQuantity),
      row.unit,
      formatCsvAmount(row.netTotal),
      formatCsvCurrency(),
    ]),
  );
}

export function buildStockDepotMovementCsv(rows: StockDepotMovementRow[]) {
  return buildCsv(
    stockDepotMovementCsvHeaders,
    rows.map((row) => [
      row.invoiceDate,
      row.documentNo,
      row.warehouse,
      row.stockCode,
      row.stockName,
      row.siteName,
      row.supplierName,
      formatSourceType(row.sourceType),
      formatCsvQuantity(row.incomingQuantity),
      formatCsvQuantity(row.outgoingQuantity),
      formatCsvQuantity(row.balanceQuantity),
      row.unit,
      formatCsvAmount(row.netTotal),
      formatCsvCurrency(),
    ]),
  );
}

export function buildStockDepotCsvHref(csv: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
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

function formatCsvQuantity(value: number) {
  return value.toFixed(3);
}

function formatCsvCurrency() {
  return getP0BaseCurrencyTransactionValue();
}

function formatSourceType(sourceType: StockDepotMovementRow["sourceType"]) {
  if (sourceType === "delivery-note") return "İrsaliye";
  if (sourceType === "stock-movement") return "Stok Hareketi";
  return "Alış Faturası";
}
