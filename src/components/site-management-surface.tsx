import { EntityListSurface, type EntityListSurfaceProps } from "@/components/entity-list-surface";
import type { ExpenseRow } from "@/lib/expense-service";
import type { ProgressPaymentRow } from "@/lib/progress-payment-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type { SalesInvoiceRow } from "@/lib/sales-invoice-service";
import { buildSiteFinanceSummary } from "@/lib/site-finance-summary";

type SiteManagementSurfaceProps = EntityListSurfaceProps & {
  expenses: ExpenseRow[];
  progressPayments: ProgressPaymentRow[];
  purchaseInvoices: PurchaseInvoiceRow[];
  salesInvoices?: SalesInvoiceRow[];
};

export function SiteManagementSurface({ expenses, progressPayments, purchaseInvoices, salesInvoices = [], ...entityProps }: SiteManagementSurfaceProps) {
  const summaries = buildSiteFinanceSummary({ expenses, progressPayments, purchaseInvoices, salesInvoices });
  const totals = summaries.reduce((value, row) => ({ income: value.income + row.incomeTotal, cost: value.cost + row.expenseTotal + row.purchaseTotal + row.subcontractorTotal, net: value.net + row.netTotal }), { income: 0, cost: 0, net: 0 });
  return <div className="grid gap-4">
    <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[var(--primary)]">P0 şantiye analizi</p><h1 className="mt-1 text-xl font-semibold">Şantiye gelir / gider özeti</h1></div><span className="text-xs text-[var(--on-surface-variant)]">{summaries.length} hareketli şantiye</span></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label="Toplam gelir" value={totals.income} /><Metric label="Toplam maliyet" value={totals.cost} /><Metric label="Net sonuç" value={totals.net} /></div>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[var(--grid-border)]"><th className="px-2 py-2">Şantiye</th><th className="px-2 py-2 text-right">Gelir</th><th className="px-2 py-2 text-right">Gider</th><th className="px-2 py-2 text-right">Alış</th><th className="px-2 py-2 text-right">Hakediş maliyeti</th><th className="px-2 py-2 text-right">Net</th></tr></thead><tbody>{summaries.map((row) => <tr className="border-b border-[var(--grid-border)] last:border-0" key={row.siteCode}><td className="px-2 py-2 font-semibold">{row.siteCode} · {row.siteName}</td><Money value={row.incomeTotal} /><Money value={row.expenseTotal} /><Money value={row.purchaseTotal} /><Money value={row.subcontractorTotal} /><Money value={row.netTotal} strong /></tr>)}</tbody></table>{!summaries.length ? <p className="py-3 text-xs text-[var(--on-surface-variant)]">Henüz şantiye finans hareketi yok.</p> : null}</div>
    </section>
    <EntityListSurface {...entityProps} />
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded border border-[var(--grid-border)] p-3"><p className="text-xs text-[var(--on-surface-variant)]">{label}</p><p className="mt-1 text-lg font-semibold">{value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</p></div>; }
function Money({ value, strong = false }: { value: number; strong?: boolean }) { return <td className={`px-2 py-2 text-right ${strong ? "font-semibold" : ""}`}>{value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>; }
