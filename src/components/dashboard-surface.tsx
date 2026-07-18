import Link from "next/link";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { ChequeRow } from "@/lib/cheque-service";
import type { EntityRow } from "@/lib/entities";
import type { ExpenseRow } from "@/lib/expense-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { ProgressPaymentRow } from "@/lib/progress-payment-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { TimesheetRow } from "@/lib/timesheet-service";
import {
  isTenderDeadlineOverdue,
  summarizeTenderDashboardAlerts,
  type TenderRow,
} from "@/lib/tender-service";
import { summarizeOperationalReports } from "@/lib/reports-service";

import { DashboardPrintAction } from "./dashboard-print-action";

export type DashboardCompanyPeriodFilter = "day" | "week" | "month" | "year";

type DashboardSurfaceProps = {
  cashBankMovements: CashBankMovementRow[];
  cheques: ChequeRow[];
  companyPeriodFilter?: DashboardCompanyPeriodFilter;
  customerRows?: EntityRow[];
  expenses?: ExpenseRow[];
  payrollAccruals: PayrollAccrualRow[];
  progressPayments: ProgressPaymentRow[];
  purchaseInvoices: PurchaseInvoiceRow[];
  subcontractorRows?: EntityRow[];
  supplierRows?: EntityRow[];
  tenders?: TenderRow[];
  timesheets: TimesheetRow[];
  today?: string;
};

const companyPeriodOptions: Array<{
  label: string;
  value: DashboardCompanyPeriodFilter;
}> = [
  { label: "Bugün", value: "day" },
  { label: "Bu Hafta", value: "week" },
  { label: "Bu Ay", value: "month" },
  { label: "Bu Yıl", value: "year" },
];

export function normalizeDashboardCompanyPeriodFilter(
  value: string | string[] | undefined,
): DashboardCompanyPeriodFilter {
  const period = Array.isArray(value) ? value[0] : value;

  if (
    period === "day" ||
    period === "week" ||
    period === "month" ||
    period === "year"
  ) {
    return period;
  }

  return "month";
}

const monthLabels = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];
const companyChartColors = ["var(--primary)", "#0f766e", "#b45309"];
const quickLinks = [
  { href: "/faturalar", label: "Faturalar" },
  { href: "/giderler", label: "Giderler" },
  { href: "/kasa-banka", label: "Kasa/Banka" },
  { href: "/cek", label: "Çek" },
  { href: "/stok-depo", label: "Stok/Depo" },
  { href: "/raporlar", label: "Raporlar" },
];

export function DashboardSurface({
  cashBankMovements,
  cheques,
  companyPeriodFilter = "month",
  customerRows = [],
  expenses = [],
  payrollAccruals,
  progressPayments,
  purchaseInvoices,
  subcontractorRows = [],
  supplierRows = [],
  tenders = [],
  timesheets,
  today = new Date().toISOString().slice(0, 10),
}: DashboardSurfaceProps) {
  const report = summarizeOperationalReports({
    cashBankMovements,
    cheques,
    expenses,
    payrollAccruals,
    progressPayments,
    purchaseInvoices,
    timesheets,
    today,
  });
  const companyReport = summarizeOperationalReports({
    cashBankMovements,
    cheques,
    expenses,
    filters: buildCompanyPeriodReportFilters(companyPeriodFilter, today),
    payrollAccruals,
    progressPayments,
    purchaseInvoices,
    timesheets,
    today,
  });
  const selectedCompanyPeriod = getCompanyPeriodOption(companyPeriodFilter);
  const recentActivity = report.activityRows.slice(0, 6);
  const companyMetrics = [
    { href: "/musteriler", label: "Müşteriler", value: customerRows.length },
    { href: "/tedarikciler", label: "Tedarikçiler", value: supplierRows.length },
    { href: "/taseronlar", label: "Taşeronlar", value: subcontractorRows.length },
  ];
  const totalCompanyCount = companyMetrics.reduce(
    (total, metric) => total + metric.value,
    0,
  );
  const companyFinancialMetrics = [
    {
      label: "Müşteri Tahsilatı",
      value: formatMoney(companyReport.progressPaymentCollectedTotal),
    },
    {
      label: "Tedarikçi Ödemeleri",
      value: formatMoney(companyReport.purchaseInvoicePaidTotal),
    },
    {
      label: "Taşeron Ödemeleri",
      value: formatMoney(companyReport.progressPaymentPaidTotal),
    },
    { label: "Net Nakit Akışı", value: formatMoney(companyReport.cashNetTotal) },
  ];
  const companyTypeDistribution = companyMetrics.map((metric) => ({
    ...metric,
    percent:
      totalCompanyCount === 0
        ? 0
        : Math.round((metric.value / totalCompanyCount) * 100),
  }));
  const companyRows = [
    ...customerRows.map((row) => ({
      code: row.code,
      createdAt: row.createdAt,
      href: "/musteriler",
      name: row.name,
      type: "Müşteri",
    })),
    ...supplierRows.map((row) => ({
      code: row.code,
      createdAt: row.createdAt,
      href: "/tedarikciler",
      name: row.name,
      type: "Tedarikçi",
    })),
    ...subcontractorRows.map((row) => ({
      code: row.code,
      createdAt: row.createdAt,
      href: "/taseronlar",
      name: row.name,
      type: "Taşeron",
    })),
  ];
  const activeCompanyRows = companyRows
    .map((company) => ({
      ...company,
      activityCount: companyReport.counterpartyStatementDetailRows.filter(
        (detail) =>
          normalizeCompanyName(detail.counterpartyName) ===
          normalizeCompanyName(company.name),
      ).length,
    }))
    .filter((row) => row.activityCount > 0)
    .sort((first, second) => {
      const countComparison = second.activityCount - first.activityCount;

      if (countComparison !== 0) {
        return countComparison;
      }

      return first.name.localeCompare(second.name, "tr");
    })
    .slice(0, 3);
  const recentCompanyRows = companyRows
    .filter((row) => row.createdAt)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 3);
  const monthlyNewCompanyTrend = buildMonthlyCompanyTrend(companyRows, today);
  const tenderAlerts = summarizeTenderDashboardAlerts(tenders, today);

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Yönetici özeti
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Dashboard
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
          Firma ve dönem bağlamındaki kesinleşmiş fatura, gider, hakediş, puantaj, maaş
          tahakkuku, kasa/banka ve çek hareketlerinden günlük operasyon
          görünümü.
        </p>
      </header>
      <article
        aria-label="İhale dashboard uyarıları"
        className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold">İhale Uyarıları</h2>
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
              Son teklif tarihi yaklaşan ve sonucu bekleyen ihaleler için açılış
              kontrol bandı.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold hover:border-[var(--primary)] hover:bg-[var(--primary-fixed)]"
            href="/ihale-yonetimi"
          >
            İhale Yönetimine Git
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric
            label="Yaklaşan Son Teklif"
            value={String(tenderAlerts.upcomingDeadlineRows.length)}
          />
          <Metric
            label="Sonuç Bekleyen"
            value={String(tenderAlerts.resultWaitingRows.length)}
          />
          <Metric
            label="Bu Ay Kazanma Oranı"
            value={`%${tenderAlerts.currentMonthWinRate}`}
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <TenderAlertList
            emptyText="7 gün içinde son teklif tarihi olan açık ihale yok"
            rows={tenderAlerts.upcomingDeadlineRows.slice(0, 3)}
            title="Yaklaşan son teklifler"
            today={today}
          />
          <TenderAlertList
            emptyText="Sonucu bekleyen süresi dolmuş teklif yok"
            rows={tenderAlerts.resultWaitingRows.slice(0, 3)}
            title="Sonuç bekleyen ihaleler"
            today={today}
          />
        </div>
      </article>
      <article
        aria-label="Firmalar dashboard sayaçları"
        className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Firmalar Dashboard</h2>
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
              Müşteri, tedarikçi ve taşeron kartlarının dönem/firma
              bağlamındaki birleşik görünümü.
            </p>
            <p className="mt-2 font-mono text-xs font-semibold text-[var(--primary)]">
              Dönem: {selectedCompanyPeriod.label}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div
              aria-label="Firma dönem filtresi"
              className="inline-flex h-10 overflow-hidden rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)]"
            >
              {companyPeriodOptions.map((option) => {
                const isActive = option.value === companyPeriodFilter;

                return (
                  <Link
                    aria-current={isActive ? "true" : undefined}
                    className={`inline-flex items-center justify-center px-3 text-sm font-semibold ${
                      isActive
                        ? "bg-[var(--primary)] text-[var(--on-primary)]"
                        : "text-[var(--on-surface-variant)] hover:bg-[var(--primary-fixed)] hover:text-[var(--on-surface)]"
                    }`}
                    href={`/?period=${option.value}`}
                    key={option.value}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold hover:border-[var(--primary)] hover:bg-[var(--primary-fixed)]"
              href="/musteriler"
            >
              Cari Kartlar
            </Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CompanyMetric label="Toplam Firma" value={totalCompanyCount} />
          {companyMetrics.map((metric) => (
            <CompanyMetric
              href={metric.href}
              key={metric.href}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {companyFinancialMetrics.map((metric) => (
            <Metric
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
            <h3 className="text-sm font-semibold">Firma Tipi Dağılımı</h3>
            <CompanyTypeDonutChart
              rows={companyTypeDistribution}
              total={totalCompanyCount}
            />
            <div className="mt-4 grid gap-3">
              {companyTypeDistribution.map((metric) => (
                <div key={metric.href}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[var(--on-surface-variant)]">
                      {metric.label}
                    </span>
                    <span className="font-mono font-semibold">%{metric.percent}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-container-high)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${metric.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
            <h3 className="text-sm font-semibold">En Aktif Firmalar</h3>
            <CompanySummaryList
              emptyText="Henüz işlem hacmi yok"
              rows={activeCompanyRows.map((row) => ({
                href: row.href,
                meta: `${row.activityCount} işlem`,
                name: row.name,
                type: row.type,
              }))}
            />
          </article>

          <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
            <h3 className="text-sm font-semibold">Son Eklenen Firmalar</h3>
            <CompanySummaryList
              emptyText="Henüz firma kaydı yok"
              rows={recentCompanyRows.map((row) => ({
                href: row.href,
                meta: formatCompanyDate(row.createdAt),
                name: row.name,
                type: row.type,
              }))}
            />
          </article>

          <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
            <h3 className="text-sm font-semibold">Aylık Yeni Firma Trendi</h3>
            <MonthlyTrendColumnChart rows={monthlyNewCompanyTrend} />
            <div className="mt-4 grid gap-3">
              {monthlyNewCompanyTrend.map((row) => (
                <div key={row.monthKey}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[var(--on-surface-variant)]">
                      {row.label}
                    </span>
                    <span className="font-mono font-semibold">
                      {row.count} yeni firma
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-container-high)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </article>

      <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Bugünkü Operasyon Özeti
            </h2>
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
              Raporlar modülündeki aynı hesaplama modeli kullanılır.
            </p>
          </div>
          <p className="font-mono text-xs font-semibold text-[var(--on-surface-variant)]">
            {formatDate(today)}
          </p>
          <DashboardPrintAction activityCount={recentActivity.length} />
        </div>

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
            label="Vadesi Geçen Çek"
            value={formatMoney(report.overdueChequeTotal)}
          />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Son Hareketler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tarih</th>
                  <th className="px-4 py-3 font-semibold">Kaynak</th>
                  <th className="px-4 py-3 font-semibold">Evrak No</th>
                  <th className="px-4 py-3 font-semibold">Cari</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--grid-border)]">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={5}>
                      <p className="font-semibold">
                        Henüz dashboard hareketi yok
                      </p>
                      <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                        Kesinleşmiş fatura, gider, hakediş, puantaj, kasa/banka veya
                        portföy çek hareketleri oluştuğunda bu alan dolacaktır.
                      </p>
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((row) => (
                    <tr
                      className="hover:bg-[var(--primary-fixed)]"
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

        <aside className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
          <h2 className="text-sm font-semibold">Hızlı Modül Geçişleri</h2>
          <div className="mt-4 grid gap-2">
            {quickLinks.map((link) => (
              <a
                className="flex h-11 items-center justify-between rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold hover:border-[var(--primary)] hover:bg-[var(--primary-fixed)]"
                href={link.href}
                key={link.href}
              >
                <span>{link.label}</span>
                <span aria-hidden="true" className="text-[var(--primary)]">
                  →
                </span>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function TenderAlertList({
  emptyText,
  rows,
  title,
  today,
}: {
  emptyText: string;
  rows: TenderRow[];
  title: string;
  today: string;
}) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--on-surface-variant)]">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 grid gap-2">
          {rows.map((row) => (
            <Link
              className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 hover:border-[var(--primary)] hover:bg-[var(--primary-fixed)]"
              href="/ihale-yonetimi"
              key={row.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{row.title}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {isTenderDeadlineOverdue(row, today) ? (
                    <span className="inline-flex rounded-[var(--radius-control)] bg-[var(--status-cancelled)] px-2 py-0.5 text-xs font-semibold text-white">
                      Süre doldu
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold text-[var(--primary)]">
                    {row.status}
                  </span>
                </div>
              </div>
              <p className="mt-1 font-mono text-xs font-semibold text-[var(--on-surface-variant)]">
                {row.tenderNo} · {formatDate(row.submissionDeadline.slice(0, 10))}
              </p>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
      <p className="text-sm font-semibold text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </article>
  );
}

function CompanyMetric({
  href,
  label,
  value,
}: {
  href?: string;
  label: string;
  value: number;
}) {
  const content = (
    <>
      <p className="text-sm font-semibold text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </>
  );
  const className =
    "rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4";

  if (href) {
    return (
      <Link
        className={`${className} hover:border-[var(--primary)] hover:bg-[var(--primary-fixed)]`}
        href={href}
      >
        {content}
      </Link>
    );
  }

  return <article className={className}>{content}</article>;
}

function CompanySummaryList({
  emptyText,
  rows,
}: {
  emptyText: string;
  rows: Array<{
    href: string;
    meta: string;
    name: string;
    type: string;
  }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--on-surface-variant)]">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {rows.map((row) => (
        <Link
          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 py-2 hover:border-[var(--primary)] hover:bg-[var(--primary-fixed)]"
          href={row.href}
          key={`${row.type}-${row.name}-${row.meta}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold">{row.name}</p>
            <span className="shrink-0 text-xs font-semibold text-[var(--primary)]">
              {row.type}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-[var(--on-surface-variant)]">
            {row.meta}
          </p>
        </Link>
      ))}
    </div>
  );
}

function CompanyTypeDonutChart({
  rows,
  total,
}: {
  rows: Array<{
    label: string;
    percent: number;
    value: number;
  }>;
  total: number;
}) {
  let accumulatedPercent = 0;

  return (
    <div className="mt-4 flex items-center justify-center">
      <svg
        aria-label="Firma tipi dağılım grafiği"
        className="h-28 w-28"
        role="img"
        viewBox="0 0 36 36"
      >
        <title>Firma tipi dağılım grafiği</title>
        <circle
          cx="18"
          cy="18"
          fill="none"
          r="15.9155"
          stroke="var(--surface-container-high)"
          strokeWidth="4"
        />
        {total > 0
          ? rows.map((row, index) => {
              const strokeDashoffset = -accumulatedPercent;
              accumulatedPercent += row.percent;

              return (
                <circle
                  cx="18"
                  cy="18"
                  fill="none"
                  key={row.label}
                  r="15.9155"
                  stroke={companyChartColors[index % companyChartColors.length]}
                  strokeDasharray={`${row.percent} ${100 - row.percent}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="4"
                  transform="rotate(-90 18 18)"
                />
              );
            })
          : null}
        <text
          aria-hidden="true"
          className="fill-[var(--on-surface)] font-mono text-[0.34rem] font-semibold"
          textAnchor="middle"
          x="18"
          y="18"
        >
          {total} firma
        </text>
      </svg>
      <div className="sr-only">
        {rows.map((row) => (
          <span key={row.label}>
            {row.label} %{row.percent}
          </span>
        ))}
      </div>
    </div>
  );
}

function MonthlyTrendColumnChart({
  rows,
}: {
  rows: Array<{
    count: number;
    label: string;
    monthKey: string;
    percent: number;
  }>;
}) {
  return (
    <div className="mt-4">
      <svg
        aria-label="Aylık yeni firma trend grafiği"
        className="h-28 w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 180 72"
      >
        <title>Aylık yeni firma trend grafiği</title>
        <line
          stroke="var(--grid-border)"
          strokeWidth="1"
          x1="6"
          x2="174"
          y1="60"
          y2="60"
        />
        {rows.map((row, index) => {
          const barHeight = Math.max(3, Math.round(row.percent * 0.48));
          const x = 9 + index * 28;
          const y = 60 - barHeight;

          return (
            <g key={row.monthKey}>
              <rect
                fill="var(--primary)"
                height={barHeight}
                rx="2"
                width="16"
                x={x}
                y={y}
              />
              <text
                className="fill-[var(--on-surface-variant)] text-[0.24rem] font-semibold"
                textAnchor="middle"
                x={x + 8}
                y="68"
              >
                {row.label.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="sr-only">
        {rows.map((row) => (
          <span key={row.monthKey}>
            {row.label} {row.count} yeni firma
          </span>
        ))}
      </div>
    </div>
  );
}

function buildCompanyPeriodReportFilters(
  period: DashboardCompanyPeriodFilter,
  today: string,
) {
  const { endDate, startDate } = getCompanyPeriodRange(period, today);

  return { endDate, startDate };
}

function getCompanyPeriodRange(
  period: DashboardCompanyPeriodFilter,
  today: string,
) {
  const normalizedToday = today.slice(0, 10);
  const date = parseDate(normalizedToday);

  if (period === "day") {
    return { endDate: normalizedToday, startDate: normalizedToday };
  }

  if (period === "week") {
    const weekDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    const startDate = new Date(date);
    startDate.setUTCDate(date.getUTCDate() - weekDay + 1);

    return { endDate: normalizedToday, startDate: formatDateKey(startDate) };
  }

  if (period === "year") {
    return {
      endDate: normalizedToday,
      startDate: `${date.getUTCFullYear()}-01-01`,
    };
  }

  return {
    endDate: normalizedToday,
    startDate: `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}-01`,
  };
}

function getCompanyPeriodOption(period: DashboardCompanyPeriodFilter) {
  return (
    companyPeriodOptions.find((option) => option.value === period) ??
    companyPeriodOptions[2]
  );
}

function parseDate(value: string) {
  const [year = "0", month = "1", day = "1"] = value.split("-");

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function formatDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function buildMonthlyCompanyTrend(
  companyRows: Array<{ createdAt?: string }>,
  today: string,
) {
  const monthKeys = getLastMonthKeys(today, 6);
  const countsByMonth = new Map(monthKeys.map((monthKey) => [monthKey, 0]));

  for (const row of companyRows) {
    const monthKey = getMonthKey(row.createdAt);

    if (countsByMonth.has(monthKey)) {
      countsByMonth.set(monthKey, (countsByMonth.get(monthKey) ?? 0) + 1);
    }
  }

  const maxCount = Math.max(1, ...Array.from(countsByMonth.values()));

  return monthKeys.map((monthKey) => {
    const count = countsByMonth.get(monthKey) ?? 0;

    return {
      count,
      label: formatMonthKey(monthKey),
      monthKey,
      percent: Math.round((count / maxCount) * 100),
    };
  });
}

function getLastMonthKeys(today: string, monthCount: number) {
  const [year = "0", month = "1"] = today.slice(0, 10).split("-");
  const baseDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(
      Date.UTC(
        baseDate.getUTCFullYear(),
        baseDate.getUTCMonth() - (monthCount - 1 - index),
        1,
      ),
    );

    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function getMonthKey(value?: string) {
  return value?.slice(0, 7) ?? "";
}

function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthLabel = monthLabels[Number(month) - 1] ?? month;

  return `${monthLabel} ${year}`;
}

function normalizeCompanyName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function formatCompanyDate(value: string) {
  return formatDate(value.slice(0, 10));
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




