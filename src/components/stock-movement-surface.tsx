"use client";

import { useMemo, useState, useTransition } from "react";

import type { AuditLogEntry } from "@/lib/audit-log";
import type { DeliveryNoteRow } from "@/lib/delivery-note-service";
import type { EntityRow } from "@/lib/entities";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import { summarizeStockDepotFromInvoices } from "@/lib/stock-depot-service";
import type { StockMovementCreateValues, StockMovementRow, StockMovementType } from "@/lib/stock-movement-service";

type Result = { data: StockMovementRow; ok: true } | { errors: string[]; ok: false };

export function StockMovementSurface({
  auditLogsByEntityId = {},
  canMutate,
  deliveryNotes,
  persistence,
  purchaseInvoices,
  rows,
  siteRows,
  stockCardRows,
  today = new Date().toISOString().slice(0, 10),
}: {
  auditLogsByEntityId?: Record<string, AuditLogEntry[]>;
  canMutate: boolean;
  deliveryNotes: DeliveryNoteRow[];
  persistence: {
    cancel(id: string): Promise<Result>;
    create(values: StockMovementCreateValues): Promise<Result>;
    post(id: string): Promise<Result>;
  };
  purchaseInvoices: PurchaseInvoiceRow[];
  rows: StockMovementRow[];
  siteRows: EntityRow[];
  stockCardRows: EntityRow[];
  today?: string;
}) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [form, setForm] = useState<StockMovementCreateValues | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const readModel = useMemo(
    () => summarizeStockDepotFromInvoices(purchaseInvoices, deliveryNotes, displayRows),
    [deliveryNotes, displayRows, purchaseInvoices],
  );
  const warehouseOptions = [...new Set(readModel.summaryRows.map((row) => row.warehouse))].sort((a, b) => a.localeCompare(b, "tr"));
  const selectedStockSummary = readModel.summaryRows.find((row) => row.warehouse === form?.sourceWarehouse && (form?.stockCode ? row.stockCode === form.stockCode : row.stockName === form?.stockName));

  function startCreate(type: StockMovementType) {
    if (!canMutate) return;
    setErrors([]);
    setNotice("");
    setForm({ description: "", documentNo: "", movementDate: today, movementType: type, quantity: 1, siteCode: "", siteName: "", sourceWarehouse: "", stockCode: "", stockName: "", targetWarehouse: "", unit: "Adet", unitCost: 0 });
  }

  function selectStock(code: string) {
    const card = stockCardRows.find((row) => row.code === code);
    const unit = card?.unit || "Adet";
    const defaultWarehouse = card?.defaultWarehouse || "";
    const summary = readModel.summaryRows.find((row) => row.stockCode === code && (!defaultWarehouse || row.warehouse === defaultWarehouse));
    const averageCost = summary && summary.balanceQuantity > 0 ? Math.max(0, summary.netTotal / summary.balanceQuantity) : 0;
    setForm((current) => current ? { ...current, sourceWarehouse: summary?.warehouse ?? defaultWarehouse, stockCode: card?.code ?? "", stockName: card?.name ?? "", unit, unitCost: roundMoney(averageCost) } : current);
  }

  function selectSite(code: string) {
    const site = siteRows.find((row) => row.code === code);
    setForm((current) => current ? { ...current, siteCode: site?.code ?? "", siteName: site?.name ?? "" } : current);
  }

  function create() {
    if (!form) return;
    setErrors([]);
    startTransition(async () => {
      const result = await persistence.create(form);
      if (!result.ok) return setErrors(result.errors);
      setDisplayRows((current) => [result.data, ...current]);
      setForm(null);
      setNotice("Stok hareketi taslak olarak oluşturuldu.");
    });
  }

  function transition(row: StockMovementRow, action: "cancel" | "post") {
    setProcessingId(row.id);
    setErrors([]);
    startTransition(async () => {
      const result = action === "post" ? await persistence.post(row.id) : await persistence.cancel(row.id);
      setProcessingId(null);
      if (!result.ok) return setErrors(result.errors);
      setDisplayRows((current) => current.map((item) => item.id === row.id ? result.data : item));
      setNotice(action === "post" ? "Stok hareketi kesinleşti ve bakiyelere yansıdı." : "Stok hareketi iptal edildi.");
    });
  }

  return (
    <section className="mx-auto mb-4 grid max-w-7xl gap-4">
      <header className="rounded-ui-panel border border-divider bg-surface-raised p-5"><p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Normalize stok hareketi</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Depo ve Şantiye Hareketleri</h2><p className="mt-1 text-sm text-content-subtle">Depolar arası transfer ve stok kontrollü şantiye çıkışı; taslak, kesinleştirme, iptal ve audit yaşam döngüsü.</p></div><div className="flex gap-2"><button className={buttonClass} disabled={!canMutate} onClick={() => startCreate("Depo Transferi")} type="button">Yeni Transfer</button><button className={buttonClass} disabled={!canMutate} onClick={() => startCreate("Şantiye Çıkışı")} type="button">Yeni Şantiye Çıkışı</button></div></div></header>
      {errors.length > 0 ? <div className="rounded-ui-panel border border-[var(--ds-danger)] p-3 text-sm text-[var(--ds-danger)]"><p className="font-semibold">Stok hareketi tamamlanamadı</p><ul className="mt-2 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      {notice ? <div className="rounded-ui-panel border border-[var(--ds-success)] p-3 text-sm font-semibold text-[var(--ds-success)]" role="status">{notice}</div> : null}
      {form ? <article className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h3 className="text-sm font-semibold">{form.movementType}</h3><div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Hareket No"><input className={inputClass} onChange={(event) => setForm({ ...form, documentNo: event.target.value })} value={form.documentNo} /></Field>
        <Field label="Hareket Tarihi"><input className={inputClass} onChange={(event) => setForm({ ...form, movementDate: event.target.value })} type="date" value={form.movementDate} /></Field>
        <Field label="Stok Kartı"><select className={inputClass} onChange={(event) => selectStock(event.target.value)} value={form.stockCode}><option value="">Stok seç</option>{stockCardRows.filter((row) => row.status !== "Pasif").map((row) => <option key={row.code} value={row.code}>{row.code} - {row.name}</option>)}</select></Field>
        <Field label="Kaynak Depo"><select className={inputClass} onChange={(event) => setForm({ ...form, sourceWarehouse: event.target.value })} value={form.sourceWarehouse}><option value="">Depo seç</option>{warehouseOptions.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}</select></Field>
        {form.movementType === "Depo Transferi" ? <Field label="Hedef Depo"><input aria-label="Hedef Depo" className={inputClass} list="warehouse-options" onChange={(event) => setForm({ ...form, targetWarehouse: event.target.value })} value={form.targetWarehouse} /><datalist id="warehouse-options">{warehouseOptions.map((warehouse) => <option key={warehouse}>{warehouse}</option>)}</datalist></Field> : <Field label="Şantiye"><select className={inputClass} onChange={(event) => selectSite(event.target.value)} value={form.siteCode}><option value="">Şantiye seç</option>{siteRows.filter((row) => row.status !== "Pasif").map((row) => <option key={row.code} value={row.code}>{row.name}</option>)}</select></Field>}
        <Field label="Miktar"><input className={inputClass} min="0" onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} type="number" value={form.quantity} /></Field>
        <Field label="Birim"><input className={inputClass} onChange={(event) => setForm({ ...form, unit: event.target.value })} value={form.unit} /></Field>
        <Field label="Birim Maliyet"><input className={inputClass} min="0" onChange={(event) => setForm({ ...form, unitCost: Number(event.target.value) })} step="0.01" type="number" value={form.unitCost} /></Field>
        <Field label="Açıklama"><input className={inputClass} onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} /></Field>
      </div><p className="mt-3 text-sm font-semibold text-content-subtle">Kullanılabilir: {formatQuantity(selectedStockSummary?.balanceQuantity ?? 0)} {form.unit}</p><div className="mt-4 flex gap-2"><button className={buttonClass} disabled={isPending} onClick={create} type="button">{isPending ? "Kaydediliyor" : "Taslak Oluştur"}</button><button className={buttonClass} onClick={() => setForm(null)} type="button">Vazgeç</button></div></article> : null}
      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"><div className="border-b border-divider p-3"><h3 className="text-sm font-semibold">Transfer ve Çıkış Kayıtları</h3></div><div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-surface-muted"><tr><th className="p-3">Belge</th><th className="p-3">Tür</th><th className="p-3">Stok</th><th className="p-3">Kaynak</th><th className="p-3">Hedef/Şantiye</th><th className="p-3 text-right">Miktar</th><th className="p-3 text-right">Değer</th><th className="p-3">Durum</th><th className="p-3">İşlem</th></tr></thead><tbody className="divide-y divide-divider">{displayRows.length === 0 ? <tr><td className="p-8 text-center" colSpan={9}>Henüz transfer veya şantiye çıkışı yok.</td></tr> : displayRows.map((row) => <tr key={row.id}><td className="p-3"><p className="font-mono text-xs">{row.documentNo}</p><p className="text-xs">{formatDate(row.movementDate)}</p></td><td className="p-3">{row.movementType}</td><td className="p-3"><p className="font-semibold">{row.stockName}</p><p className="font-mono text-xs">{row.stockCode}</p></td><td className="p-3">{row.sourceWarehouse}</td><td className="p-3">{row.movementType === "Depo Transferi" ? row.targetWarehouse : row.siteName}</td><td className="p-3 text-right font-mono">{formatQuantity(row.quantity)} {row.unit}</td><td className="p-3 text-right font-mono">{formatMoney(row.quantity * row.unitCost)}</td><td className="p-3">{row.status}</td><td className="p-3"><div className="flex gap-1"><button aria-label={`Kesinleştir ${row.documentNo}`} className={buttonClass} disabled={!canMutate || row.status !== "Taslak" || processingId === row.id} onClick={() => transition(row, "post")} type="button">Kesinleştir</button><button aria-label={`İptal ${row.documentNo}`} className={buttonClass} disabled={!canMutate || row.status === "İptal" || processingId === row.id} onClick={() => transition(row, "cancel")} type="button">İptal Et</button></div></td></tr>)}</tbody></table></div></article>
      <AuditHistory logs={auditLogsByEntityId} rows={displayRows} />
    </section>
  );
}

function AuditHistory({ logs, rows }: { logs: Record<string, AuditLogEntry[]>; rows: StockMovementRow[] }) { const entries = rows.flatMap((row) => (logs[row.id] ?? []).map((log) => ({ log, row }))); return entries.length ? <article className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h3 className="text-sm font-semibold">Stok Hareketi Audit Geçmişi</h3><ul className="mt-3 grid gap-2">{entries.map(({ log, row }) => <li className="flex justify-between rounded border border-divider p-2 text-sm" key={log.id}><span>{row.documentNo} · {auditLabel(log.action)}</span><time className="font-mono text-xs">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.occurredAt))}</time></li>)}</ul></article> : null; }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-sm font-semibold">{label}{children}</label>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`)); }
function formatQuantity(value: number) { return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(value); }
function formatMoney(value: number) { return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)} TL`; }
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function auditLabel(action: string) { return ({ "stock-movement.cancel": "İptal edildi", "stock-movement.create": "Oluşturuldu", "stock-movement.post": "Kesinleştirildi" } as Record<string, string>)[action] ?? action; }
const inputClass = "h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm";
const buttonClass = "rounded-ui-control border border-divider bg-surface-muted px-2.5 py-2 text-xs font-semibold transition hover:bg-brand-primary-subtle disabled:opacity-50";
