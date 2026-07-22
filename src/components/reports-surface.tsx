"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon, type IconName } from "@/components/ui";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { ChequeRow } from "@/lib/cheque-service";
import type { ExpenseRow } from "@/lib/expense-service";
import type { DeliveryNoteRow } from "@/lib/delivery-note-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { ProgressPaymentRow } from "@/lib/progress-payment-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { SalesInvoiceRow } from "@/lib/sales-invoice-service";
import {
  buildActivityRowsCsv,
  buildCounterpartyBalanceCsv,
  buildCounterpartyStatementCsvFileName,
  buildCounterpartyStatementCsvHref,
  buildCsvHref,
  buildSiteProfitCsv,
} from "@/lib/report-export";
import type { TimesheetRow } from "@/lib/timesheet-service";
import {
  type OperationalReportSourceFilter,
  summarizeOperationalReports,
} from "@/lib/reports-service";

type ReportsSurfaceProps = {
  cashBankMovements: CashBankMovementRow[];
  cheques: ChequeRow[];
  expenses?: ExpenseRow[];
  deliveryNotes?: DeliveryNoteRow[];
  payrollAccruals: PayrollAccrualRow[];
  progressPayments: ProgressPaymentRow[];
  purchaseInvoices: PurchaseInvoiceRow[];
  salesInvoices?: SalesInvoiceRow[];
  timesheets: TimesheetRow[];
  today?: string;
};

export function ReportsSurface({
  cashBankMovements,
  cheques,
  expenses = [],
  deliveryNotes = [],
  payrollAccruals,
  progressPayments,
  purchaseInvoices,
  salesInvoices = [],
  timesheets,
  today = new Date().toISOString().slice(0, 10),
}: ReportsSurfaceProps) {
  const [sourceFilter, setSourceFilter] =
    useState<OperationalReportSourceFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCounterparty, setSelectedCounterparty] = useState("all");
  const [printNotice, setPrintNotice] = useState("");
  const report = summarizeOperationalReports({
    cashBankMovements,
    cheques,
    expenses,
    deliveryNotes,
    filters: {
      endDate,
      source: sourceFilter,
      startDate,
    },
    payrollAccruals,
    progressPayments,
    purchaseInvoices,
    salesInvoices,
    timesheets,
    today,
  });
  const selectedCounterpartyValue = report.counterpartyStatementRows.some(
    (row) => row.counterpartyName === selectedCounterparty,
  )
    ? selectedCounterparty
    : "all";
  const counterpartyStatementDetailRows =
    selectedCounterpartyValue === "all"
      ? report.counterpartyStatementDetailRows
      : report.counterpartyStatementDetailRows.filter(
          (row) => row.counterpartyName === selectedCounterpartyValue,
        );
  const counterpartyStatementCsvHref = buildCounterpartyStatementCsvHref(
    counterpartyStatementDetailRows,
  );
  const counterpartyStatementCsvFileName =
    buildCounterpartyStatementCsvFileName(selectedCounterpartyValue);
  const siteProfitCsvHref = buildCsvHref(
    buildSiteProfitCsv(report.siteProfitRows),
  );
  const counterpartyBalanceCsvHref = buildCsvHref(
    buildCounterpartyBalanceCsv(report.counterpartyStatementRows),
  );
  const activityRowsCsvHref = buildCsvHref(
    buildActivityRowsCsv(report.activityRows),
  );

  function printReport() {
    setPrintNotice(
      `Yazdırma kapsamı hazır: ${report.activityRows.length} hareket.`,
    );
    window.print();
  }

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-5">
      <header className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">
              Finans ve operasyon analizi
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-content sm:text-3xl">
              Rapor Merkezi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
              Kesinleşmiş finansal ve operasyonel kayıtları aynı filtre bağlamında
              inceleyin, CSV olarak dışa aktarın veya görünür kapsamı yazdırın.
            </p>
          </div>
          <button
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition hover:bg-brand-primary/5"
            onClick={printReport}
            type="button"
          >
            <Icon name="file" size={16} /> Yazdır
          </button>
        </div>
        {printNotice ? (
          <p
            className="mt-4 rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm font-semibold text-content-subtle"
            role="status"
          >
            {printNotice}
          </p>
        ) : null}
      </header>

      <section aria-label="Rapor filtreleri" className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-content">Rapor çalışma alanı</h2>
            <p className="text-sm text-content-muted">Filtreler tüm özet, tablo ve CSV çıktısına uygulanır.</p>
          </div>
          <span className="font-mono text-xs font-semibold text-content-muted">{report.activityRows.length} hareket</span>
        </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Rapor kaynağı</span>
          <select
            className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 font-normal outline-none focus:border-brand-primary"
            onChange={(event) =>
              setSourceFilter(
                event.target.value as OperationalReportSourceFilter,
              )
            }
            value={sourceFilter}
          >
            <option value="all">Tüm kaynaklar</option>
            <option value="Fatura">Fatura</option>
            <option value="İrsaliye">İrsaliye</option>
            <option value="Gider">Gider</option>
            <option value="Kasa/Banka">Kasa/Banka</option>
            <option value="Çek">Çek</option>
            <option value="Hakediş">Hakediş</option>
            <option value="Puantaj">Puantaj</option>
            <option value="Maaş">Maaş</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Başlangıç tarihi</span>
          <input
            className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 font-normal outline-none focus:border-brand-primary"
            onChange={(event) => setStartDate(event.target.value)}
            type="date"
            value={startDate}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Bitiş tarihi</span>
          <input
            className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 font-normal outline-none focus:border-brand-primary"
            onChange={(event) => setEndDate(event.target.value)}
            type="date"
            value={endDate}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          <span>Cari ekstresi</span>
          <select
            className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 font-normal outline-none focus:border-brand-primary"
            onChange={(event) => setSelectedCounterparty(event.target.value)}
            value={selectedCounterpartyValue}
          >
            <option value="all">Tüm cariler</option>
            {report.counterpartyStatementRows.map((row) => (
              <option key={row.counterpartyName} value={row.counterpartyName}>
                {row.counterpartyName}
              </option>
            ))}
          </select>
        </label>
      </div>
      </section>

      <section aria-labelledby="rapor-kisayollari" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="col-span-full flex items-center justify-between">
          <h2 className="text-base font-semibold text-content" id="rapor-kisayollari">Hazır raporlar</h2>
          <p className="text-sm text-content-muted">Her kart mevcut canlı rapor bölümüne gider.</p>
        </div>
        <ReportShortcut description="Gelir, maliyet ve net sonucu şantiye bazında karşılaştırın." href="#santiye-karlilik" icon="chart" title="Şantiye Kârlılık Analizi" />
        <ReportShortcut description="Mevcut kasa/banka net hareketini ve portföy çeklerini görün." href="#operasyon-ozeti" icon="wallet" title="Nakit Akış Özeti" />
        <ReportShortcut description="Cari hareketleri ve yürüyen bakiyeyi filtre bağlamında inceleyin." href="#cari-ekstre" icon="users" title="Cari Ekstre Raporu" />
        <ReportShortcut description="Kesinleşmiş hakediş, puantaj ve maaş özetlerini aynı görünümde takip edin." href="#operasyon-ozeti" icon="receipt" title="Hakediş ve İşçilik Özeti" />
      </section>

      <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm" id="operasyon-ozeti">
        <h2 className="text-base font-semibold text-content">Operasyon Özeti</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Rapor Para Birimi" value={report.currency} />
          <Metric
            label="Alış Fatura Borcu"
            value={formatMoney(report.purchaseInvoiceDebt)}
          />
          <Metric
            label="Ödenen Fatura"
            value={formatMoney(report.purchaseInvoicePaidTotal)}
          />
          <Metric
            label="Ödeme Bekleyen Fatura"
            value={formatMoney(report.purchaseInvoicePaymentWaitingTotal)}
          />
          <Metric
            label="Gider Toplamı"
            value={formatMoney(report.expenseTotal)}
          />
          <Metric
            label="Hakediş Toplamı"
            value={formatMoney(report.progressPaymentTotal)}
          />
          <Metric
            label="Ödenen Hakediş"
            value={formatMoney(report.progressPaymentPaidTotal)}
          />
          <Metric
            label="Ödeme Bekleyen Hakediş"
            value={formatMoney(report.progressPaymentPaymentWaitingTotal)}
          />
          <Metric
            label="Tahsil Edilen Hakediş Geliri"
            value={formatMoney(report.progressPaymentCollectedTotal)}
          />
          <Metric
            label="Tahsilat Bekleyen Hakediş Geliri"
            value={formatMoney(report.progressPaymentCollectionWaitingTotal)}
          />
          <Metric
            label="Puantaj Net"
            value={formatMoney(report.timesheetNetTotal)}
          />
          <Metric
            label="Maaş Tahakkuku"
            value={formatMoney(report.payrollAccrualNetTotal)}
          />
          <Metric
            label="Ödenen Maaş"
            value={formatMoney(report.payrollPaidTotal)}
          />
          <Metric
            label="Ödeme Bekleyen Maaş"
            value={formatMoney(report.payrollPaymentWaitingTotal)}
          />
          <Metric
            label="Kasa/Banka Net"
            value={formatMoney(report.cashNetTotal)}
          />
          <Metric
            label="Portföy Çek"
            value={formatMoney(report.portfolioChequeTotal)}
          />
          <Metric
            label="Kasa Giriş"
            value={formatMoney(report.cashIncomingTotal)}
          />
          <Metric
            label="Kasa Çıkış"
            value={formatMoney(report.cashOutgoingTotal)}
          />
          <Metric
            label="Vadesi Geçen Çek"
            value={formatMoney(report.overdueChequeTotal)}
          />
        </div>
      </article>

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised" id="cari-ekstre">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Cari Hareket Ekstresi</h2>
          {counterpartyStatementDetailRows.length > 0 ? (
            <a
              aria-label="Cari ekstresi CSV indir"
              className="inline-flex h-9 items-center justify-center rounded-ui-control border border-divider bg-surface-muted px-3 text-xs font-semibold text-content transition hover:bg-brand-primary-subtle"
              download={counterpartyStatementCsvFileName}
              href={counterpartyStatementCsvHref}
            >
              CSV
            </a>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table
            aria-label="Cari hareket ekstresi tablosu"
            className="min-w-[980px] w-full text-left text-sm"
          >
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Cari</th>
                <th className="px-4 py-3 font-semibold">Kaynak</th>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">İşlem</th>
                <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Yürüyen Bakiye
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {counterpartyStatementDetailRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">Henüz cari hareketi yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Seçili filtrelere uygun fatura, hakediş, maaş veya
                      kasa/banka hareketi oluştuğunda bu tablo dolacaktır.
                    </p>
                  </td>
                </tr>
              ) : (
                counterpartyStatementDetailRows.map((row, idx) => (
                  <tr
                    className="hover:bg-brand-primary-subtle"
                    key={`${row.counterpartyName}-${row.source}-${row.documentNo}-${row.date}-${idx}`}
                  >
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 font-semibold">
                      {row.counterpartyName}
                    </td>
                    <td className="px-4 py-3">{row.source}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        aria-label={`${row.documentNo} evrakına git`}
                        className="font-semibold text-brand-primary underline-offset-2 hover:underline"
                        href={row.targetHref}
                      >
                        {row.documentNo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.effect}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold ${
                        row.amount >= 0
                          ? "text-[var(--ds-success)]"
                          : "text-[var(--ds-danger)]"
                      }`}
                    >
                      {formatMoney(row.amount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold ${
                        row.balanceAfter >= 0
                          ? "text-[var(--ds-success)]"
                          : "text-[var(--ds-danger)]"
                      }`}
                    >
                      {formatMoney(row.balanceAfter)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised" id="santiye-karlilik">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Şantiye Kârlılık Özeti</h2>
          {report.siteProfitRows.length > 0 ? (
            <CsvDownloadLink
              ariaLabel="Şantiye kârlılık CSV indir"
              fileName="rapor-santiye-karlilik.csv"
              href={siteProfitCsvHref}
            />
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Şantiye</th>
                <th className="px-4 py-3 text-right font-semibold">Gelir</th>
                <th className="px-4 py-3 text-right font-semibold">Alış Maliyeti</th>
                <th className="px-4 py-3 text-right font-semibold">Gider Maliyeti</th>
                <th className="px-4 py-3 text-right font-semibold">Hakediş Maliyeti</th>
                <th className="px-4 py-3 text-right font-semibold">İşçilik</th>
                <th className="px-4 py-3 text-right font-semibold">Toplam Maliyet</th>
                <th className="px-4 py-3 text-right font-semibold">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {report.siteProfitRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">Henüz şantiye kârlılık verisi yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Kesinleşmiş gelir hakedişi, alış faturası, gider, taşeron hakedişi
                      veya işçilik hareketleri oluştuğunda bu tablo dolacaktır.
                    </p>
                  </td>
                </tr>
              ) : (
                report.siteProfitRows.map((row) => (
                  <tr className="hover:bg-brand-primary-subtle" key={row.siteCode || row.siteName}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{row.siteName}</p>
                      <p className="mt-1 font-mono text-xs text-content-subtle">
                        {row.siteCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.incomeTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.purchaseCostTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.expenseCostTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.progressPaymentCostTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.laborCostTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatMoney(row.totalCost)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold ${
                        row.netProfit >= 0
                          ? "text-[var(--ds-success)]"
                          : "text-[var(--ds-danger)]"
                      }`}
                    >
                      {formatMoney(row.netProfit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised" id="cari-bakiye">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Cari Bakiye Özeti</h2>
          {report.counterpartyStatementRows.length > 0 ? (
            <CsvDownloadLink
              ariaLabel="Cari bakiye CSV indir"
              fileName="rapor-cari-bakiye.csv"
              href={counterpartyBalanceCsvHref}
            />
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Cari</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Borç Belgesi
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Alacak Belgesi
                </th>
                <th className="px-4 py-3 text-right font-semibold">Ödenen</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Tahsil Edilen
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Net Bakiye
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {report.counterpartyStatementRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={6}>
                    <p className="font-semibold">Henüz cari bakiye verisi yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Fatura, gider, hakediş, maaş veya kasa/banka hareketleri
                      oluştuğunda bu tablo dolacaktır.
                    </p>
                  </td>
                </tr>
              ) : (
                report.counterpartyStatementRows.map((row, idx) => (
                  <tr
                    className="hover:bg-brand-primary-subtle"
                    key={`${row.counterpartyName}-${idx}`}
                  >
                    <td className="px-4 py-3 font-semibold">
                      {row.counterpartyName}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.payableTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.receivableTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.cashPaidTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.cashReceivedTotal)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold ${
                        row.netBalance >= 0
                          ? "text-[var(--ds-success)]"
                          : "text-[var(--ds-danger)]"
                      }`}
                    >
                      {formatMoney(row.netBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised" id="son-hareketler">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Son Hareketler</h2>
          {report.activityRows.length > 0 ? (
            <CsvDownloadLink
              ariaLabel="Son hareketler CSV indir"
              fileName="rapor-son-hareketler.csv"
              href={activityRowsCsvHref}
            />
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Kaynak</th>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">Cari</th>
                <th className="px-4 py-3 text-right font-semibold">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {report.activityRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={5}>
                    <p className="font-semibold">Henüz rapor hareketi yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Fatura, gider, hakediş, puantaj, kasa/banka veya çek hareketleri
                      oluştuğunda bu liste dolacaktır.
                    </p>
                  </td>
                </tr>
              ) : (
                report.activityRows.map((row) => (
                  <tr
                    className="hover:bg-brand-primary-subtle"
                    key={row.id}
                  >
                    <td className="px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">{row.source}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.documentNo}
                    </td>
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatMoney(row.amount)}
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
      className="inline-flex h-9 items-center justify-center rounded-ui-control border border-divider bg-surface-muted px-3 text-xs font-semibold text-content transition hover:bg-brand-primary-subtle"
      download={fileName}
      href={href}
    >
      CSV
    </a>
  );
}

function ReportShortcut({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: IconName;
  title: string;
}) {
  return (
    <article className="flex min-h-52 flex-col rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm transition hover:border-brand-primary/40 hover:shadow-md">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-ui-control bg-brand-primary/10 text-brand-primary">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-content">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-content-muted">{description}</p>
      <a className="mt-5 inline-flex h-10 items-center justify-center rounded-ui-control border border-brand-primary px-3 text-sm font-semibold text-brand-primary transition hover:bg-brand-primary hover:text-on-brand" href={href}>
        Raporu görüntüle
      </a>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
      <p className="text-sm font-semibold text-content-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-content">{value}</p>
    </article>
  );
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}




