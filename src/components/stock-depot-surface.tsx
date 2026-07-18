"use client";

import { useMemo, useState } from "react";

import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { DeliveryNoteRow } from "@/lib/delivery-note-service";
import type { StockMovementRow } from "@/lib/stock-movement-service";
import type { EntityRow } from "@/lib/entities";
import {
  buildStockDepotCsvHref,
  buildStockDepotMovementCsv,
  buildStockDepotSummaryCsv,
} from "@/lib/stock-depot-export";
import {
  type StockDepotMovementRow,
  type StockDepotSummaryRow,
  summarizeStockDepotFromInvoices,
} from "@/lib/stock-depot-service";
import type {
  StockMinimumSettingResult,
  StockMinimumSettingRow,
  StockMinimumSettingSaveValues,
} from "@/lib/stock-minimum-setting-service";

type StockDepotSurfaceProps = {
  persistence?: {
    saveMinimumSetting?: (
      values: StockMinimumSettingSaveValues,
    ) => Promise<StockMinimumSettingResult<{ row: StockMinimumSettingRow }>>;
  };
  purchaseInvoices: PurchaseInvoiceRow[];
  deliveryNotes?: DeliveryNoteRow[];
  stockCardRows?: EntityRow[];
  stockMinimumSettings?: StockMinimumSettingRow[];
  stockMovements?: StockMovementRow[];
};

export function StockDepotSurface({
  deliveryNotes = [],
  persistence,
  purchaseInvoices,
  stockCardRows = [],
  stockMinimumSettings = [],
  stockMovements = [],
}: StockDepotSurfaceProps) {
  const readModel = summarizeStockDepotFromInvoices(purchaseInvoices, deliveryNotes, stockMovements);
  const initialMinimumInputs = useMemo(
    () => createInitialMinimumInputs({ settings: stockMinimumSettings, stockCards: stockCardRows }),
    [stockCardRows, stockMinimumSettings],
  );
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [printNotice, setPrintNotice] = useState("");
  const [minimumInputs, setMinimumInputs] =
    useState<Record<string, string>>(initialMinimumInputs);
  const [minimumNotice, setMinimumNotice] = useState("");
  const warehouseOptions = useMemo(
    () =>
      Array.from(
        new Set(readModel.movementRows.map((row) => row.warehouse)),
      ).sort((first, second) => first.localeCompare(second, "tr")),
    [readModel.movementRows],
  );
  const filteredMovementRows = readModel.movementRows.filter((row) =>
    matchesStockDepotFilter(row, {
      endDate,
      searchText,
      startDate,
      warehouseFilter,
    }),
  );
  const filteredSummaryRows = summarizeFilteredMovementRows(
    filteredMovementRows,
  );
  const isFiltered =
    warehouseFilter !== "all" ||
    searchText.trim() !== "" ||
    startDate !== "" ||
    endDate !== "";
  const totalQuantity = filteredSummaryRows.reduce(
    (total, row) => total + row.balanceQuantity,
    0,
  );
  const totalValue = filteredSummaryRows.reduce(
    (total, row) => total + row.netTotal,
    0,
  );
  const summaryCsvHref = buildStockDepotCsvHref(
    buildStockDepotSummaryCsv(filteredSummaryRows),
  );
  const movementCsvHref = buildStockDepotCsvHref(
    buildStockDepotMovementCsv(filteredMovementRows),
  );

  function handlePrint() {
    setPrintNotice(
      `Yazdırma kapsamı hazır: ${filteredMovementRows.length} depo girişi.`,
    );
    window.print();
  }

  async function handleSaveMinimumSetting(row: StockDepotSummaryRow) {
    const rowKey = createStockMinimumRowKey(row);
    const minimumQuantity = Number(minimumInputs[rowKey] ?? "");

    if (!Number.isFinite(minimumQuantity) || minimumQuantity <= 0) {
      setMinimumNotice("Minimum miktar sıfırdan büyük olmalıdır.");

      return;
    }

    const result = await persistence?.saveMinimumSetting?.({
      minimumQuantity,
      stockCode: row.stockCode,
      stockName: row.stockName,
      unit: row.unit,
      warehouse: row.warehouse,
    });

    if (!result || result.ok) {
      setMinimumNotice("Minimum stok ayarı kaydedildi.");

      return;
    }

    setMinimumNotice(result.errors.join(" "));
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Malzeme ve depo takip
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Stok/Depo
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
          Fatura ve irsaliye girişleri ile kesinleşmiş depo transferi ve şantiye
          çıkışları tek hareket modelinde birleşir.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric
          label="Depolu Kalem"
          value={String(filteredSummaryRows.length)}
        />
        <Metric label="Mevcut Miktar" value={formatQuantity(totalQuantity)} />
        <Metric label="Stok Değeri" value={formatMoney(totalValue)} />
      </div>

      <div className="grid gap-3 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4 md:grid-cols-[minmax(0,1fr)_170px_170px_240px]">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Stok veya evrak ara</span>
          <input
            className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Stok adı, kod, evrak no, tedarikçi..."
            type="search"
            value={searchText}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Başlangıç tarihi</span>
          <input
            className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Bitiş tarihi</span>
          <input
            className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Depo filtresi</span>
          <select
            className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
            onChange={(event) => setWarehouseFilter(event.target.value)}
            value={warehouseFilter}
          >
            <option value="all">Tüm depolar</option>
            {warehouseOptions.map((warehouse) => (
              <option key={warehouse} value={warehouse}>
                {warehouse}
              </option>
            ))}
          </select>
        </label>
      </div>

      {printNotice ? (
        <p
          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold"
          role="status"
        >
          {printNotice}
        </p>
      ) : null}
      {minimumNotice ? (
        <p
          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold"
          role="status"
        >
          {minimumNotice}
        </p>
      ) : null}

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Depo Stok Özeti</h2>
          {filteredSummaryRows.length > 0 ? (
            <CsvDownloadLink
              ariaLabel="Depo stok özeti CSV indir"
              fileName="stok-depo-ozet.csv"
              href={summaryCsvHref}
            />
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Depo</th>
                <th className="px-4 py-3 font-semibold">Stok/Hizmet</th>
                <th className="px-4 py-3 font-semibold">Kod</th>
                <th className="px-4 py-3 text-right font-semibold">Giriş</th>
                <th className="px-4 py-3 text-right font-semibold">Çıkış</th>
                <th className="px-4 py-3 text-right font-semibold">Bakiye</th>
                <th className="px-4 py-3 text-right font-semibold">Net Değer</th>
                <th className="px-4 py-3 text-right font-semibold">Minimum</th>
                <th className="px-4 py-3 text-right font-semibold">Ayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {filteredSummaryRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={9}>
                    <p className="font-semibold">
                      {isFiltered
                        ? "Filtreye uyan depo bakiyesi yok"
                        : "Henüz depo hareketi yok"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      {isFiltered
                        ? "Arama veya depo filtresini değiştirerek tekrar deneyin."
                        : "Kesinleşmiş giriş, transfer ve şantiye çıkışları bu özeti oluşturur."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSummaryRows.map((row) => {
                  const rowKey = createStockMinimumRowKey(row);

                  return (
                    <tr
                      className="hover:bg-[var(--primary-fixed)]"
                      key={rowKey}
                    >
                      <td className="px-4 py-3">{row.warehouse}</td>
                      <td className="px-4 py-3">{row.stockName}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.stockCode || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatQuantity(row.incomingQuantity, row.unit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatQuantity(row.outgoingQuantity, row.unit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatQuantity(row.balanceQuantity, row.unit)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatMoney(row.netTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          aria-label={`${row.stockCode || row.stockName} minimum miktar`}
                          className="ml-auto block h-9 w-28 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-2 text-right font-mono text-sm outline-none focus:border-[var(--primary)]"
                          min="0"
                          onChange={(event) =>
                            setMinimumInputs((current) => ({
                              ...current,
                              [rowKey]: event.target.value,
                            }))
                          }
                          placeholder="0"
                          step="0.001"
                          type="number"
                          value={minimumInputs[rowKey] ?? ""}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-xs font-semibold transition hover:bg-[var(--primary-fixed)]"
                          onClick={() => void handleSaveMinimumSetting(row)}
                          type="button"
                        >
                          Minimumu Kaydet
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Depo Hareketleri</h2>
          <div className="flex flex-wrap gap-2">
            {filteredMovementRows.length > 0 ? (
              <CsvDownloadLink
                ariaLabel="Depo girişleri CSV indir"
                fileName="stok-depo-hareketleri.csv"
                href={movementCsvHref}
              />
            ) : null}
            <button
              className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold disabled:opacity-50"
              disabled={filteredMovementRows.length === 0}
              onClick={handlePrint}
              type="button"
            >
              Depo Girişlerini Yazdır
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">Kaynak</th>
                <th className="px-4 py-3 font-semibold">Depo</th>
                <th className="px-4 py-3 font-semibold">Stok/Hizmet</th>
                <th className="px-4 py-3 font-semibold">Şantiye</th>
                <th className="px-4 py-3 font-semibold">Tedarikçi</th>
                <th className="px-4 py-3 text-right font-semibold">Miktar</th>
                <th className="px-4 py-3 text-right font-semibold">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {filteredMovementRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={9}>
                    <p className="font-semibold">
                      {isFiltered
                        ? "Filtreye uyan depo hareketi yok"
                        : "Fatura veya irsaliye kaynaklı depo hareketi yok"}
                    </p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      {isFiltered
                        ? "Arama metni stok, evrak, şantiye ve tedarikçi alanlarında aranır."
                        : "Alış faturası veya alış irsaliyesi kesinleştiğinde burada görünür."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMovementRows.map((row) => (
                  <tr className="hover:bg-[var(--primary-fixed)]" key={row.sourceId}>
                    <td className="px-4 py-3">{formatDate(row.invoiceDate)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.documentNo}
                    </td>
                    <td className="px-4 py-3">
                      {row.sourceType === "delivery-note" ? "Alış İrsaliyesi" : row.sourceType === "stock-movement" ? row.supplierName : "Alış Faturası"}
                    </td>
                    <td className="px-4 py-3">{row.warehouse}</td>
                    <td className="px-4 py-3">{row.stockName}</td>
                    <td className="px-4 py-3">{row.siteName}</td>
                    <td className="px-4 py-3">{row.supplierName}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatQuantity(row.balanceQuantity, row.unit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatMoney(row.netTotal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function CsvDownloadLink({
  ariaLabel,
  fileName,
  href,
}: {
  ariaLabel: string;
  fileName: string;
  href: string;
}) {
  return (
    <a
      aria-label={ariaLabel}
      className="inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-xs font-semibold text-[var(--on-surface)] transition hover:bg-[var(--primary-fixed)]"
      download={fileName}
      href={href}
    >
      CSV
    </a>
  );
}

function matchesStockDepotFilter(
  row: StockDepotMovementRow,
  filters: {
    endDate: string;
    searchText: string;
    startDate: string;
    warehouseFilter: string;
  },
) {
  if (
    filters.warehouseFilter !== "all" &&
    row.warehouse !== filters.warehouseFilter
  ) {
    return false;
  }

  if (filters.startDate && row.invoiceDate < filters.startDate) {
    return false;
  }

  if (filters.endDate && row.invoiceDate > filters.endDate) {
    return false;
  }

  const query = normalizeSearch(filters.searchText);

  if (!query) {
    return true;
  }

  const searchableValues = [
    row.warehouse,
    row.stockCode,
    row.stockName,
    "documentNo" in row ? row.documentNo : "",
    "siteName" in row ? row.siteName : "",
    "supplierName" in row ? row.supplierName : "",
  ];

  return searchableValues.some((value) =>
    normalizeSearch(value).includes(query),
  );
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("tr").trim();
}

function summarizeFilteredMovementRows(
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
        balanceQuantity: 0,
        incomingQuantity: 0,
        outgoingQuantity: 0,
        netTotal: 0,
        stockCode: row.stockCode,
        stockName: row.stockName,
        unit: row.unit,
        warehouse: row.warehouse,
      };

    current.incomingQuantity += row.incomingQuantity;
    current.outgoingQuantity += row.outgoingQuantity;
    current.balanceQuantity += row.balanceQuantity;
    current.netTotal = roundMoney(current.netTotal + row.netTotal);
    grouped.set(key, current);
  }

  return Array.from(grouped.values());
}

function createInitialMinimumInputs({
  settings,
  stockCards,
}: {
  settings: StockMinimumSettingRow[];
  stockCards: EntityRow[];
}) {
  const entries = stockCards
    .filter((row) => row.status !== "Pasif")
    .filter((row) => row.defaultWarehouse?.trim() && row.minimumQuantity?.trim())
    .map((row) => [
      createStockMinimumRowKey({
        stockCode: row.code,
        stockName: row.name,
        warehouse: row.defaultWarehouse,
      }),
      row.minimumQuantity.trim(),
    ]);

  for (const setting of settings) {
    entries.push([
      createStockMinimumRowKey(setting),
      String(setting.minimumQuantity),
    ]);
  }

  return Object.fromEntries(entries);
}

function createStockMinimumRowKey(
  row: Pick<StockDepotSummaryRow, "stockCode" | "stockName" | "warehouse">,
) {
  return [row.warehouse, row.stockCode || row.stockName].join("::");
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <p className="text-sm font-semibold text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </article>
  );
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatQuantity(value: number, unit = "") {
  const formatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}
