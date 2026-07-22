import Link from "next/link";

import {
  EntityListSurface,
  type EntityListSurfaceProps,
} from "@/components/entity-list-surface";
import { Icon, StatusBadge, type IconName } from "@/components/ui";
import type { ExpenseRow } from "@/lib/expense-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { ProgressPaymentRow } from "@/lib/progress-payment-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { SalesInvoiceRow } from "@/lib/sales-invoice-service";
import { buildSiteFinanceSummary } from "@/lib/site-finance-summary";
import type { TimesheetRow } from "@/lib/timesheet-service";

type SiteManagementSurfaceProps = EntityListSurfaceProps & {
  expenses: ExpenseRow[];
  payrollAccruals?: PayrollAccrualRow[];
  progressPayments: ProgressPaymentRow[];
  purchaseInvoices: PurchaseInvoiceRow[];
  salesInvoices?: SalesInvoiceRow[];
  timesheets?: TimesheetRow[];
};

export function SiteManagementSurface({
  expenses,
  payrollAccruals = [],
  progressPayments,
  purchaseInvoices,
  salesInvoices = [],
  timesheets = [],
  ...entityProps
}: SiteManagementSurfaceProps) {
  const summaries = buildSiteFinanceSummary({
    expenses,
    payrollAccruals,
    progressPayments,
    purchaseInvoices,
    salesInvoices,
    timesheets,
  });
  const totals = summaries.reduce(
    (value, row) => ({
      cost:
        value.cost +
        row.expenseTotal +
        row.laborTotal +
        row.purchaseTotal +
        row.subcontractorTotal,
      income: value.income + row.incomeTotal,
      net: value.net + row.netTotal,
    }),
    { cost: 0, income: 0, net: 0 },
  );
  const siteRows = entityProps.initialRows ?? entityProps.definition.sampleRows;
  const activeSiteCount = siteRows.filter((row) => row.status === "Aktif").length;

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="İçerik yolu" className="text-xs font-semibold text-content-muted">
            Operasyon / Şantiyeler
          </nav>
          <h1 className="mt-2 text-3xl font-bold leading-[2.375rem] tracking-[-0.02em] text-content">
            Şantiyeler
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
            Aktif ve geçmiş proje sahalarını; şantiye kartları, gelir, maliyet ve net sonuç görünümüyle aynı çalışma alanında yönetin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-xs font-semibold text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
            href="/hakedis"
          >
            <Icon name="chart" size={17} />
            Hakedişlere git
          </Link>
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-xs font-semibold text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
            href="/giderler"
          >
            <Icon name="receipt" size={17} />
            Giderlere git
          </Link>
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-xs font-semibold text-content transition-colors hover:border-brand-primary hover:text-brand-primary"
            href="/raporlar#santiye-karlilik"
          >
            <Icon name="chart" size={17} />
            Kârlılık raporu
          </Link>
          <div className="inline-flex items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-subtle shadow-sm">
            <Icon name="building" size={18} />
            {siteRows.length} kayıtlı şantiye
          </div>
        </div>
      </header>

      <div aria-label="Şantiye özet metrikleri" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SiteSummaryCard
          icon="building"
          label="Aktif Şantiye"
          value={String(activeSiteCount)}
        />
        <SiteSummaryCard
          compact
          icon="chart"
          label="Toplam Gelir"
          tone="success"
          value={formatMoney(totals.income)}
        />
        <SiteSummaryCard
          compact
          icon="wallet"
          label="Toplam Maliyet"
          tone="warning"
          value={formatMoney(totals.cost)}
        />
        <SiteSummaryCard
          compact
          icon={totals.net < 0 ? "warning" : "check"}
          label="Net Sonuç"
          tone={totals.net < 0 ? "danger" : "brand"}
          value={formatMoney(totals.net)}
        />
      </div>

      <section className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="flex flex-col gap-2 border-b border-divider px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">
              Finansal analiz
            </p>
            <h2 className="mt-1 text-xl font-semibold text-content">Şantiye gelir / gider özeti</h2>
            <p className="mt-1 text-sm text-content-subtle">
              Kesinleşmiş fatura, gider, hakediş, bordro ve puantaj hareketlerinden hesaplanır; bordroya kaynak olan puantaj ikinci kez sayılmaz.
            </p>
          </div>
          <span className="rounded-ui-control bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle">
            {summaries.length} hareketli şantiye
          </span>
        </div>
        <div className="overflow-x-auto">
          <table
            aria-label="Şantiye finans özeti tablosu"
            className="w-full min-w-[1060px] border-collapse text-sm text-content"
          >
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-content-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Şantiye</th>
                <th className="px-4 py-3 text-right font-semibold">Gelir</th>
                <th className="px-4 py-3 text-right font-semibold">Gider</th>
                <th className="px-4 py-3 text-right font-semibold">Alış</th>
                <th className="px-4 py-3 text-right font-semibold">Hakediş maliyeti</th>
                <th className="px-4 py-3 text-right font-semibold">İşçilik</th>
                <th className="px-4 py-3 text-right font-semibold">Net</th>
                <th className="px-4 py-3 text-center font-semibold">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {summaries.map((row) => (
                <tr className="hover:bg-surface-muted" key={row.siteCode}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold text-brand-primary">{row.siteCode}</p>
                    <p className="mt-1 font-semibold">{row.siteName}</p>
                  </td>
                  <Money value={row.incomeTotal} />
                  <Money value={row.expenseTotal} />
                  <Money value={row.purchaseTotal} />
                  <Money value={row.subcontractorTotal} />
                  <Money value={row.laborTotal} />
                  <Money strong value={row.netTotal} />
                  <td className="px-4 py-3 text-center">
                    <StatusBadge tone={row.netTotal < 0 ? "warning" : "success"}>
                      {row.netTotal < 0
                        ? "Maliyet yüksek"
                        : row.netTotal === 0
                          ? "Başa baş"
                          : "Pozitif"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {summaries.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">Henüz şantiye finans hareketi yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Fatura, gider veya hakediş oluştuğunda bu tablo otomatik dolacaktır.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <EntityListSurface {...entityProps} visualVariant="site" />
    </section>
  );
}

function SiteSummaryCard({
  compact = false,
  icon,
  label,
  tone = "brand",
  value,
}: {
  compact?: boolean;
  icon: IconName;
  label: string;
  tone?: "brand" | "danger" | "success" | "warning";
  value: string;
}) {
  const toneClasses = {
    brand: "bg-brand-primary-subtle text-brand-primary",
    danger: "bg-danger-subtle text-danger",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
  }[tone];

  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-subtle">
          {label}
        </p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-control ${toneClasses}`}>
          <Icon name={icon} size={19} />
        </span>
      </div>
      <p className={`mt-5 font-mono font-semibold tabular-nums text-content ${compact ? "text-lg leading-7" : "text-2xl"}`}>
        {value}
      </p>
    </article>
  );
}

function Money({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <td
      className={`px-4 py-3 text-right font-mono tabular-nums ${strong ? "font-semibold" : ""} ${strong && value < 0 ? "text-danger" : ""}`}
    >
      {formatMoney(value)}
    </td>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL";
}
