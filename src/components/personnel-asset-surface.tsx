"use client";

import { useState, useTransition } from "react";

import type { AuditLogEntry } from "@/lib/audit-log";
import type { EntityRow } from "@/lib/entities";
import type { PersonnelAssetCreateValues, PersonnelAssetRow, PersonnelAssetStatus } from "@/lib/personnel-asset-service";

type Result = { data: PersonnelAssetRow; ok: true } | { errors: string[]; ok: false };

const categories = ["KKD", "Ekipman", "Elektronik", "Demirbaş", "Araç/Gereç"];

export function PersonnelAssetSurface({
  auditLogsByEntityId = {},
  canMutate,
  persistence,
  personnelRows,
  rows,
  siteRows = [],
  today = new Date().toISOString().slice(0, 10),
}: {
  auditLogsByEntityId?: Record<string, AuditLogEntry[]>;
  canMutate: boolean;
  persistence: {
    assign(values: PersonnelAssetCreateValues): Promise<Result>;
    markLost(id: string): Promise<Result>;
    markUnusable(id: string): Promise<Result>;
    returnAsset(id: string): Promise<Result>;
  };
  personnelRows: EntityRow[];
  rows: PersonnelAssetRow[];
  siteRows?: EntityRow[];
  today?: string;
}) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [form, setForm] = useState<PersonnelAssetCreateValues | null>(null);
  const [statusFilter, setStatusFilter] = useState<"Tümü" | PersonnelAssetStatus>("Tümü");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleRows = statusFilter === "Tümü" ? displayRows : displayRows.filter((row) => row.status === statusFilter);
  const activeRows = displayRows.filter((row) => row.status === "Zimmetli");
  const overdueRows = activeRows.filter((row) => Boolean(row.dueAt && row.dueAt < today));

  function startAssign() {
    if (!canMutate) return;
    setErrors([]);
    setNotice("");
    setForm({ assetCategory: "KKD", assetCode: "", assetName: "", assignedAt: today, dueAt: "", notes: "", personnelCode: "", personnelName: "", quantity: 1, serialNo: "", siteCode: "", siteName: "" });
  }

  function selectPersonnel(code: string) {
    const row = personnelRows.find((item) => item.code === code);
    setForm((current) => current ? { ...current, personnelCode: row?.code ?? "", personnelName: row?.name ?? "" } : current);
  }

  function selectSite(code: string) {
    const row = siteRows.find((item) => item.code === code);
    setForm((current) => current ? { ...current, siteCode: row?.code ?? "", siteName: row?.name ?? "" } : current);
  }

  function assign() {
    if (!form) return;
    setErrors([]);
    startTransition(async () => {
      const result = await persistence.assign(form);
      if (!result.ok) return setErrors(result.errors);
      setDisplayRows((current) => [result.data, ...current]);
      setForm(null);
      setNotice("Zimmet kaydı oluşturuldu.");
    });
  }

  function transition(row: PersonnelAssetRow, action: "lost" | "return" | "unusable") {
    setProcessingId(row.id);
    setErrors([]);
    startTransition(async () => {
      const result = action === "return" ? await persistence.returnAsset(row.id) : action === "lost" ? await persistence.markLost(row.id) : await persistence.markUnusable(row.id);
      setProcessingId(null);
      if (!result.ok) return setErrors(result.errors);
      setDisplayRows((current) => current.map((item) => item.id === row.id ? result.data : item));
      setNotice(action === "return" ? "Varlık iade alındı." : action === "lost" ? "Varlık kayıp olarak işaretlendi." : "Varlık kullanılamaz olarak işaretlendi.");
    });
  }

  return (
    <section className="mx-auto mt-4 grid max-w-7xl gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Ekipman ve KKD takibi</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Personel Zimmetleri</h2><p className="mt-1 text-sm text-[var(--on-surface-variant)]">Personel bazında ekipman, elektronik, demirbaş ve KKD teslim/iade yaşam döngüsü.</p></div><button className={buttonClass} disabled={!canMutate} onClick={startAssign} type="button">Yeni Zimmet</button></div>
      </header>
      {errors.length > 0 ? <div className="rounded-[var(--radius-panel)] border border-[var(--status-cancelled)] p-3 text-sm text-[var(--status-cancelled)]"><p className="font-semibold">Zimmet işlemi tamamlanamadı</p><ul className="mt-2 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      {notice ? <div className="rounded-[var(--radius-panel)] border border-[var(--status-posted)] p-3 text-sm font-semibold text-[var(--status-posted)]" role="status">{notice}</div> : null}
      {form ? <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"><h3 className="text-sm font-semibold">Yeni Personel Zimmeti</h3><div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Personel"><select className={inputClass} onChange={(event) => selectPersonnel(event.target.value)} value={form.personnelCode}><option value="">Personel seç</option>{personnelRows.filter((row) => row.status !== "Pasif").map((row) => <option key={row.code} value={row.code}>{row.code} - {row.name}</option>)}</select></Field>
        <Field label="Şantiye"><select className={inputClass} onChange={(event) => selectSite(event.target.value)} value={form.siteCode}><option value="">Şantiye seçilmedi</option>{siteRows.filter((row) => row.status !== "Pasif").map((row) => <option key={row.code} value={row.code}>{row.name}</option>)}</select></Field>
        <Field label="Kategori"><select className={inputClass} onChange={(event) => setForm({ ...form, assetCategory: event.target.value })} value={form.assetCategory}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
        <Field label="Varlık Kodu"><input className={inputClass} onChange={(event) => setForm({ ...form, assetCode: event.target.value })} value={form.assetCode} /></Field>
        <Field label="Varlık Adı"><input className={inputClass} onChange={(event) => setForm({ ...form, assetName: event.target.value })} value={form.assetName} /></Field>
        <Field label="Seri No"><input className={inputClass} onChange={(event) => setForm({ ...form, serialNo: event.target.value })} value={form.serialNo} /></Field>
        <Field label="Miktar"><input className={inputClass} min="0" onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} type="number" value={form.quantity} /></Field>
        <Field label="Zimmet Tarihi"><input className={inputClass} onChange={(event) => setForm({ ...form, assignedAt: event.target.value })} type="date" value={form.assignedAt} /></Field>
        <Field label="İade Hedef Tarihi"><input className={inputClass} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} type="date" value={form.dueAt} /></Field>
        <Field label="Not"><input className={inputClass} onChange={(event) => setForm({ ...form, notes: event.target.value })} value={form.notes} /></Field>
      </div><div className="mt-4 flex gap-2"><button className={buttonClass} disabled={isPending} onClick={assign} type="button">{isPending ? "Kaydediliyor" : "Zimmetle"}</button><button className={buttonClass} onClick={() => setForm(null)} type="button">Vazgeç</button></div></article> : null}
      <div className="grid gap-3 sm:grid-cols-3"><Metric label="Aktif Zimmet" value={String(activeRows.length)} /><Metric label="İade Süresi Geçen" value={String(overdueRows.length)} /><Metric label="Toplam Kayıt" value={String(displayRows.length)} /></div>
      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--grid-border)] p-3"><h3 className="text-sm font-semibold">Zimmet Hareketleri</h3><label className="text-sm font-semibold">Durum <select className="ml-2 h-9 rounded border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-2" onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}><option>Tümü</option><option>Zimmetli</option><option>İade Edildi</option><option>Kayıp</option><option>Kullanılamaz</option></select></label></div><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-[var(--surface-container-low)]"><tr><th className="p-3">Personel</th><th className="p-3">Varlık</th><th className="p-3">Kategori</th><th className="p-3">Seri No</th><th className="p-3">Şantiye</th><th className="p-3">Zimmet</th><th className="p-3">İade Hedefi</th><th className="p-3">Durum</th><th className="p-3">İşlem</th></tr></thead><tbody className="divide-y divide-[var(--grid-border)]">{visibleRows.length === 0 ? <tr><td className="p-8 text-center" colSpan={9}>Bu durumda zimmet kaydı yok.</td></tr> : visibleRows.map((row) => <tr key={row.id}><td className="p-3"><p className="font-semibold">{row.personnelName}</p><p className="font-mono text-xs">{row.personnelCode}</p></td><td className="p-3"><p className="font-semibold">{row.assetName}</p><p className="font-mono text-xs">{row.assetCode} · {formatQuantity(row.quantity)}</p></td><td className="p-3">{row.assetCategory}</td><td className="p-3">{row.serialNo || "-"}</td><td className="p-3">{row.siteName || "-"}</td><td className="p-3">{formatDate(row.assignedAt)}</td><td className="p-3">{row.dueAt ? formatDate(row.dueAt) : "-"}</td><td className="p-3"><span className={row.status === "Zimmetli" ? "font-semibold text-[var(--status-posted)]" : "font-semibold text-[var(--on-surface-variant)]"}>{row.status}</span></td><td className="p-3"><div className="flex gap-1"><button aria-label={`İade Al ${row.assetCode}`} className={buttonClass} disabled={!canMutate || row.status !== "Zimmetli" || processingId === row.id} onClick={() => transition(row, "return")} type="button">İade Al</button><button aria-label={`Kayıp ${row.assetCode}`} className={buttonClass} disabled={!canMutate || row.status !== "Zimmetli" || processingId === row.id} onClick={() => transition(row, "lost")} type="button">Kayıp</button><button aria-label={`Kullanılamaz ${row.assetCode}`} className={buttonClass} disabled={!canMutate || row.status !== "Zimmetli" || processingId === row.id} onClick={() => transition(row, "unusable")} type="button">Kullanılamaz</button></div></td></tr>)}</tbody></table></div></article>
      <AssetAuditHistory logs={auditLogsByEntityId} rows={displayRows} />
    </section>
  );
}

function AssetAuditHistory({ logs, rows }: { logs: Record<string, AuditLogEntry[]>; rows: PersonnelAssetRow[] }) { const entries = rows.flatMap((row) => (logs[row.id] ?? []).map((log) => ({ log, row }))); return entries.length > 0 ? <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"><h3 className="text-sm font-semibold">Zimmet Audit Geçmişi</h3><ul className="mt-3 grid gap-2">{entries.map(({ log, row }) => <li className="flex justify-between rounded border border-[var(--grid-border)] p-2 text-sm" key={log.id}><span>{row.assetCode} · {row.personnelName} · {auditLabel(log.action)}</span><time className="font-mono text-xs">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.occurredAt))}</time></li>)}</ul></article> : null; }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-sm font-semibold">{label}{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"><p className="text-sm text-[var(--on-surface-variant)]">{label}</p><p className="mt-2 font-mono text-2xl font-semibold">{value}</p></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`)); }
function formatQuantity(value: number) { return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(value); }
function auditLabel(action: string) { return ({ "personnel-asset.assign": "Zimmetlendi", "personnel-asset.lost": "Kayıp", "personnel-asset.return": "İade alındı", "personnel-asset.unusable": "Kullanılamaz" } as Record<string, string>)[action] ?? action; }
const inputClass = "h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm";
const buttonClass = "rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2.5 py-2 text-xs font-semibold transition hover:bg-[var(--primary-fixed)] disabled:opacity-50";
