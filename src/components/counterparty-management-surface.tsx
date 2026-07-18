import Link from "next/link";
import { EntityListSurface, type EntityListSurfaceProps } from "@/components/entity-list-surface";
import { buildCounterpartyOverview } from "@/lib/counterparty-overview";

export function CounterpartyManagementSurface(props: EntityListSurfaceProps) {
  const overview = buildCounterpartyOverview(props.statementRows ?? []);
  const workflow = getWorkflow(props.definition.slug);
  return <div className="grid gap-4">
    <section className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-[var(--primary)]">Cari yönetim özeti</p><h1 className="mt-1 text-xl font-semibold">{props.definition.title} hareket görünümü</h1></div>{workflow ? <Link className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 py-2 text-xs font-semibold" href={workflow.href}>{workflow.label}</Link> : null}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric label="Toplam alacak" value={overview.receivableTotal} /><Metric label="Toplam borç" value={overview.payableTotal} /><div className="rounded border border-[var(--grid-border)] p-3"><p className="text-xs text-[var(--on-surface-variant)]">Cari hareket</p><p className="mt-1 text-lg font-semibold">{overview.movementCount}</p></div></div>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[var(--grid-border)]"><th className="px-2 py-2">Cari</th><th className="px-2 py-2 text-right">Hareket</th><th className="px-2 py-2 text-right">Bakiye</th><th className="px-2 py-2">Durum</th></tr></thead><tbody>{overview.counterparties.map((row) => <tr className="border-b border-[var(--grid-border)] last:border-0" key={row.counterpartyName}><td className="px-2 py-2 font-semibold">{row.counterpartyName}</td><td className="px-2 py-2 text-right">{row.movementCount}</td><td className="px-2 py-2 text-right font-semibold">{Math.abs(row.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</td><td className="px-2 py-2">{row.balance > 0 ? "Alacak" : row.balance < 0 ? "Borç" : "Kapalı"}</td></tr>)}</tbody></table>{!overview.counterparties.length ? <p className="py-3 text-xs text-[var(--on-surface-variant)]">Henüz cari hareket yok.</p> : null}</div>
    </section>
    <EntityListSurface {...props} />
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded border border-[var(--grid-border)] p-3"><p className="text-xs text-[var(--on-surface-variant)]">{label}</p><p className="mt-1 text-lg font-semibold">{value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL</p></div>; }
function getWorkflow(slug: string) { if (slug === "tedarikciler") return { href: "/faturalar", label: "Alış faturalarına git" }; if (slug === "taseronlar") return { href: "/hakedis", label: "Hakedişlere git" }; return undefined; }
