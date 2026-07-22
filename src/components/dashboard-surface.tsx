import Link from "next/link";
import type { CashBankMovementRow } from "@/lib/cash-bank-movement-service";
import type { ChequeRow } from "@/lib/cheque-service";
import type { EntityRow } from "@/lib/entities";
import type { ExpenseRow } from "@/lib/expense-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { ProgressPaymentRow } from "@/lib/progress-payment-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { TimesheetRow } from "@/lib/timesheet-service";
import { Icon, Panel, StatusBadge, type IconName } from "@/components/ui";
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
const companyChartColors = ["var(--ds-primary)", "var(--ds-success)", "var(--ds-warning)"];
type DashboardMetricTone = "danger" | "neutral" | "success" | "warning";
type DashboardFlowRow = {
  label: string;
  tone: Exclude<DashboardMetricTone, "neutral">;
  value: number;
};

const dashboardMetricToneClasses: Record<
  DashboardMetricTone,
  { accent: string; icon: string }
> = {
  danger: {
    accent: "bg-danger",
    icon: "bg-danger-subtle text-danger",
  },
  neutral: {
    accent: "bg-brand-primary",
    icon: "bg-brand-primary-subtle text-brand-primary",
  },
  success: {
    accent: "bg-success",
    icon: "bg-success-subtle text-success",
  },
  warning: {
    accent: "bg-warning",
    icon: "bg-warning-subtle text-warning",
  },
};

const dashboardFlowToneClasses: Record<DashboardFlowRow["tone"], string> = {
  danger: "bg-danger",
  success: "bg-success",
  warning: "bg-warning",
};
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
  const dashboardKpis: Array<{
    icon: IconName;
    label: string;
    tone: DashboardMetricTone;
    value: string;
  }> = [
    {
      icon: "wallet",
      label: "Kasa/Banka Net",
      tone: companyReport.cashNetTotal < 0 ? "danger" : "success",
      value: formatMoney(companyReport.cashNetTotal),
    },
    {
      icon: "chart",
      label: "Tahsil Edilen Hakediş Geliri",
      tone: "success",
      value: formatMoney(companyReport.progressPaymentCollectedTotal),
    },
    {
      icon: "receipt",
      label: "Ödeme Bekleyen Fatura",
      tone: "warning",
      value: formatMoney(companyReport.purchaseInvoicePaymentWaitingTotal),
    },
    {
      icon: "warning",
      label: "Vadesi Geçen Çek",
      tone: companyReport.overdueChequeTotal > 0 ? "danger" : "neutral",
      value: formatMoney(companyReport.overdueChequeTotal),
    },
  ];
  const financialFlowRows: DashboardFlowRow[] = [
    {
      label: "Müşteri tahsilatı",
      tone: "success",
      value: companyReport.progressPaymentCollectedTotal,
    },
    {
      label: "Kasa/banka girişi",
      tone: "success",
      value: companyReport.cashIncomingTotal,
    },
    {
      label: "Tedarikçi ödemesi",
      tone: "danger",
      value: companyReport.purchaseInvoicePaidTotal,
    },
    {
      label: "Taşeron ödemesi",
      tone: "warning",
      value: companyReport.progressPaymentPaidTotal,
    },
    {
      label: "Maaş ödemesi",
      tone: "warning",
      value: companyReport.payrollPaidTotal,
    },
    {
      label: "Gider",
      tone: "danger",
      value: companyReport.expenseTotal,
    },
  ];
  const operationalMetrics = [
    { label: "Rapor Para Birimi", value: report.currency },
    { label: "Alış Fatura Borcu", value: formatMoney(report.purchaseInvoiceDebt) },
    { label: "Ödenen Fatura", value: formatMoney(report.purchaseInvoicePaidTotal) },
    { label: "Gider Toplamı", value: formatMoney(report.expenseTotal) },
    { label: "Hakediş Toplamı", value: formatMoney(report.progressPaymentTotal) },
    { label: "Ödenen Hakediş", value: formatMoney(report.progressPaymentPaidTotal) },
    {
      label: "Ödeme Bekleyen Hakediş",
      value: formatMoney(report.progressPaymentPaymentWaitingTotal),
    },
    {
      label: "Tahsilat Bekleyen Hakediş Geliri",
      value: formatMoney(report.progressPaymentCollectionWaitingTotal),
    },
    { label: "Puantaj Net", value: formatMoney(report.timesheetNetTotal) },
    { label: "Maaş Tahakkuku", value: formatMoney(report.payrollAccrualNetTotal) },
    { label: "Ödenen Maaş", value: formatMoney(report.payrollPaidTotal) },
    {
      label: "Ödeme Bekleyen Maaş",
      value: formatMoney(report.payrollPaymentWaitingTotal),
    },
    { label: "Portföy Çek", value: formatMoney(report.portfolioChequeTotal) },
  ];

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">
            Yönetici özeti
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-[2.375rem] tracking-[-0.02em] text-content">
            Dashboard
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-content-subtle">
            <Icon name="calendar" size={18} />
            {formatDate(today)} · {selectedCompanyPeriod.label} dönem görünümü
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-content-subtle">
            Kesinleşmiş finansal hareketler, firma portföyü ve ihale uyarıları tek
            operasyon görünümünde.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-4 py-2 text-sm font-semibold text-content transition-colors hover:border-outline-strong hover:bg-surface-muted"
            href="/raporlar"
          >
            <Icon name="file" size={18} />
            Rapor Merkezi
          </Link>
          <DashboardPrintAction activityCount={recentActivity.length} />
        </div>
      </header>

      <nav
        aria-label="Firma dönem filtresi"
        className="flex flex-col gap-3 rounded-ui-panel border border-divider bg-surface-raised p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-sm font-semibold text-content">Dashboard dönemi</p>
          <p className="mt-0.5 text-xs text-content-subtle">
            Finansal akış ve firma hareketleri seçili dönemle hesaplanır.
          </p>
        </div>
        <div className="grid grid-cols-2 overflow-hidden rounded-ui-control border border-divider bg-surface-muted sm:inline-flex">
          {companyPeriodOptions.map((option) => {
            const isActive = option.value === companyPeriodFilter;

            return (
              <Link
                aria-current={isActive ? "true" : undefined}
                className={
                  "inline-flex min-h-10 items-center justify-center px-3 text-sm font-semibold transition-colors " +
                  (isActive
                    ? "bg-brand-primary text-on-brand"
                    : "text-content-subtle hover:bg-brand-primary-subtle hover:text-content")
                }
                href={"/?period=" + option.value}
                key={option.value}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div
        aria-label="Dashboard özet metrikleri"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {dashboardKpis.map((metric) => (
          <DashboardSummaryCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Panel
          description={
            selectedCompanyPeriod.label +
            " için yalnız kesinleşmiş hareketler; sahte projeksiyon içermez."
          }
          padding="none"
          title="Dönemsel Finansal Akış"
        >
          <DashboardFlowChart rows={financialFlowRows} />
        </Panel>

        <Panel
          actions={
            <Link
              className="inline-flex min-h-9 items-center justify-center rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content hover:border-outline-strong hover:bg-surface-muted"
              href="/ihale-yonetimi"
            >
              İhale Yönetimine Git
            </Link>
          }
          aria-label="İhale dashboard uyarıları"
          description="Yaklaşan son teklifler ve sonuç bekleyen ihaleler."
          padding="sm"
          title="İhale Uyarıları"
        >
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
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
              value={"%" + tenderAlerts.currentMonthWinRate}
            />
          </div>
          <div className="mt-3 grid gap-3">
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
        </Panel>
      </div>

      <Panel
        actions={
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content hover:border-outline-strong hover:bg-surface-muted"
            href="/musteriler"
          >
            Cari Kartlar
          </Link>
        }
        aria-label="Firmalar dashboard sayaçları"
        description={
          <>
            Müşteri, tedarikçi ve taşeronların birleşik görünümü.{" "}
            <span className="font-mono font-semibold text-brand-primary">
              Dönem: {selectedCompanyPeriod.label}
            </span>
          </>
        }
        title="Firmalar Dashboard"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {companyFinancialMetrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-ui-panel border border-divider bg-surface-muted p-4">
            <h3 className="text-sm font-semibold">Firma Tipi Dağılımı</h3>
            <CompanyTypeDonutChart
              rows={companyTypeDistribution}
              total={totalCompanyCount}
            />
            <div className="mt-4 grid gap-3">
              {companyTypeDistribution.map((metric, index) => (
                <div key={metric.href}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-content-subtle">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: companyChartColors[index] }}
                      />
                      {metric.label}
                    </span>
                    <span className="font-mono font-semibold">%{metric.percent}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-ui-panel border border-divider bg-surface-muted p-4">
            <h3 className="text-sm font-semibold">En Aktif Firmalar</h3>
            <CompanySummaryList
              emptyText="Henüz işlem hacmi yok"
              rows={activeCompanyRows.map((row) => ({
                href: row.href,
                meta: row.activityCount + " işlem",
                name: row.name,
                type: row.type,
              }))}
            />
          </article>

          <article className="rounded-ui-panel border border-divider bg-surface-muted p-4">
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

          <article className="rounded-ui-panel border border-divider bg-surface-muted p-4">
            <h3 className="text-sm font-semibold">Aylık Yeni Firma Trendi</h3>
            <MonthlyTrendColumnChart rows={monthlyNewCompanyTrend} />
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {monthlyNewCompanyTrend.map((row) => (
                <div
                  className="flex items-center justify-between gap-2"
                  key={row.monthKey}
                >
                  <span className="text-content-subtle">{row.label}</span>
                  <span className="font-mono font-semibold">
                    {row.count} yeni firma
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </Panel>

      <Panel
        description={
          "Raporlar modülündeki hesaplama modeli · " + formatDate(today)
        }
        title="Bugünkü Operasyon Özeti"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {operationalMetrics.map((metric) => (
            <Metric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </div>
      </Panel>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel padding="none" title="Son Hareketler">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Dashboard son hareketleri</caption>
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-subtle">
                <tr>
                  <th className="h-10 px-4 py-2 font-semibold">Tarih</th>
                  <th className="h-10 px-4 py-2 font-semibold">Kaynak</th>
                  <th className="h-10 px-4 py-2 font-semibold">Evrak No</th>
                  <th className="h-10 px-4 py-2 font-semibold">Cari</th>
                  <th className="h-10 px-4 py-2 text-right font-semibold">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider bg-surface-raised">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={5}>
                      <p className="font-semibold">Henüz dashboard hareketi yok</p>
                      <p className="mt-1 text-sm text-content-subtle">
                        Kesinleşmiş operasyon hareketleri oluştuğunda bu alan dolacaktır.
                      </p>
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((row) => (
                    <tr className="hover:bg-surface-muted" key={row.id}>
                      <td className="h-10 px-4 py-2">{formatDate(row.date)}</td>
                      <td className="h-10 px-4 py-2">{row.source}</td>
                      <td className="h-10 px-4 py-2 font-mono text-xs">
                        {row.documentNo}
                      </td>
                      <td className="h-10 px-4 py-2">{row.label}</td>
                      <td className="h-10 px-4 py-2 text-right font-mono font-semibold tabular-nums">
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="self-start" title="Hızlı Modül Geçişleri">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {quickLinks.map((link) => (
              <Link
                className="flex min-h-11 items-center justify-between rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-semibold text-content transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle"
                href={link.href}
                key={link.href}
              >
                <span>{link.label}</span>
                <span aria-hidden="true" className="text-brand-primary">
                  →
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function DashboardSummaryCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: IconName;
  label: string;
  tone: DashboardMetricTone;
  value: string;
}) {
  const toneClasses = dashboardMetricToneClasses[tone];

  return (
    <article className="group relative overflow-hidden rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <span
        aria-hidden="true"
        className={"absolute inset-x-0 top-0 h-1 " + toneClasses.accent}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-subtle">
          {label}
        </p>
        <span
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-control " +
            toneClasses.icon
          }
        >
          <Icon name={icon} size={19} />
        </span>
      </div>
      <p
        className={
          "mt-5 font-mono font-semibold leading-tight tabular-nums text-content " +
          (value.length > 18 ? "text-base" : "text-2xl")
        }
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-content-subtle">Seçili dönem kesinleşen verisi</p>
    </article>
  );
}

function DashboardFlowChart({ rows }: { rows: DashboardFlowRow[] }) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <figure
      aria-label="Seçili dönem tahsilat ve ödeme akış grafiği"
      className="p-4 sm:p-6"
      role="img"
    >
      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wide text-content-subtle">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-success" />
          Giriş
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-warning" />
          Planlı çıkış
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-danger" />
          Finansal çıkış
        </span>
      </div>
      <div className="grid gap-4">
        {rows.map((row) => {
          const width = row.value === 0 ? 0 : Math.max(4, (row.value / maxValue) * 100);

          return (
            <div key={row.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-content">{row.label}</span>
                <span className="font-mono font-semibold tabular-nums text-content">
                  {formatMoney(row.value)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-selected">
                <div
                  className={"h-full rounded-full " + dashboardFlowToneClasses[row.tone]}
                  style={{ width: width + "%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-5 border-t border-divider pt-4 text-xs leading-5 text-content-subtle">
        Karşılaştırma ölçeği seçili dönemdeki en yüksek tutara göre normalize edilir;
        tutarlar Raporlar servisindeki gerçek kayıt toplamlarıdır.
      </figcaption>
    </figure>
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
    <article className="rounded-ui-panel border border-divider bg-surface-muted p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-content-subtle">
          {emptyText}
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <Link
              className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle"
              href="/ihale-yonetimi"
              key={row.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold">{row.title}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {isTenderDeadlineOverdue(row, today) ? (
                    <StatusBadge tone="danger">
                      Süre doldu
                    </StatusBadge>
                  ) : null}
                  <StatusBadge tone="info">{row.status}</StatusBadge>
                </div>
              </div>
              <p className="mt-1 font-mono text-xs font-semibold text-content-subtle">
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
    <article className="rounded-ui-panel border border-divider bg-surface-muted p-4">
      <p className="text-sm font-semibold text-content-subtle">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-content">
        {value}
      </p>
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
      <p className="text-sm font-semibold text-content-subtle">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-content">
        {value}
      </p>
    </>
  );
  const className =
    "rounded-ui-panel border border-divider bg-surface-muted p-4";

  if (href) {
    return (
      <Link
        className={
          className +
          " transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle"
        }
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
      <p className="mt-4 text-sm text-content-subtle">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {rows.map((row) => (
        <Link
          className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle"
          href={row.href}
          key={`${row.type}-${row.name}-${row.meta}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold">{row.name}</p>
            <span className="shrink-0 text-xs font-semibold text-brand-primary">
              {row.type}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-content-subtle">
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
          className="fill-content font-mono text-[0.34rem] font-semibold"
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
                fill="var(--ds-primary)"
                height={barHeight}
                rx="2"
                width="16"
                x={x}
                y={y}
              />
              <text
                className="fill-content-subtle text-[0.24rem] font-semibold"
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




