"use client";

import { useState, useTransition } from "react";

import type { AuditLogEntry } from "@/lib/audit-log";
import type {
  DeliveryNoteCreateValues,
  DeliveryNoteLineDraft,
  DeliveryNoteRow,
} from "@/lib/delivery-note-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import type {
  InvoiceLookupOption,
  StockCardLookupOption,
} from "@/components/purchase-invoice-surface";

type Persistence = {
  cancelNote(id: string): Promise<Result<DeliveryNoteRow>>;
  createNote(values: DeliveryNoteCreateValues): Promise<Result<DeliveryNoteRow>>;
  postNote(id: string): Promise<Result<DeliveryNoteRow>>;
  updateNote(id: string, values: DeliveryNoteCreateValues): Promise<Result<DeliveryNoteRow>>;
};

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

type FormState = {
  deliveryDate: string;
  description: string;
  documentNo: string;
  id?: string;
  lines: Array<DeliveryNoteLineDraft & { id: string }>;
  linkedPurchaseInvoiceId: string;
  mode: "create" | "edit";
  siteCode: string;
  siteName: string;
  supplierCode: string;
  supplierName: string;
};

export function DeliveryNoteSurface({
  auditLogsByEntityId = {},
  canMutate,
  persistence,
  purchaseInvoices,
  rows,
  sites,
  stockCards,
  suppliers,
  today = new Date().toISOString().slice(0, 10),
}: {
  auditLogsByEntityId?: Record<string, AuditLogEntry[]>;
  canMutate: boolean;
  persistence: Persistence;
  purchaseInvoices: PurchaseInvoiceRow[];
  rows: DeliveryNoteRow[];
  sites: InvoiceLookupOption[];
  stockCards: StockCardLookupOption[];
  suppliers: InvoiceLookupOption[];
  today?: string;
}) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const postedRows = displayRows.filter((row) => row.status === "Kaydedildi");

  function startCreate() {
    if (!canMutate) return;
    setErrors([]);
    setNotice("");
    setForm({
      deliveryDate: today,
      description: "",
      documentNo: "",
      lines: [emptyLine()],
      linkedPurchaseInvoiceId: "",
      mode: "create",
      siteCode: "",
      siteName: "",
      supplierCode: "",
      supplierName: "",
    });
  }

  function startEdit(row: DeliveryNoteRow) {
    if (!canMutate || row.status !== "Taslak") return;
    setErrors([]);
    setForm({
      deliveryDate: row.deliveryDate,
      description: row.description ?? "",
      documentNo: row.documentNo,
      id: row.id,
      lines: row.lines.map((line) => ({ ...line, id: newLineId() })),
      linkedPurchaseInvoiceId: row.linkedPurchaseInvoiceId ?? "",
      mode: "edit",
      siteCode: row.siteCode,
      siteName: row.siteName,
      supplierCode: row.supplierCode,
      supplierName: row.supplierName,
    });
  }

  function selectInvoice(id: string) {
    const invoice = purchaseInvoices.find((row) => row.id === id);
    setForm((current) => {
      if (!current) return current;
      if (!invoice) {
        return { ...current, linkedPurchaseInvoiceId: "" };
      }
      return {
        ...current,
        lines: invoice.lines.map((line) => ({
          id: newLineId(),
          quantity: line.quantity,
          stockCode: line.stockCode ?? "",
          stockName: line.stockName,
          unit: line.unit,
          warehouse: line.warehouse ?? "",
        })),
        linkedPurchaseInvoiceId: invoice.id,
        siteCode: invoice.siteCode,
        siteName: invoice.siteName,
        supplierCode: invoice.counterpartyCode,
        supplierName: invoice.counterpartyName,
      };
    });
  }

  function selectLookup(kind: "site" | "supplier", code: string) {
    const option = (kind === "site" ? sites : suppliers).find((item) => item.code === code);
    setForm((current) => current ? {
      ...current,
      ...(kind === "site"
        ? { siteCode: option?.code ?? "", siteName: option?.name ?? "" }
        : { supplierCode: option?.code ?? "", supplierName: option?.name ?? "" }),
    } : current);
  }

  function updateLine(id: string, key: keyof DeliveryNoteLineDraft, value: string) {
    setForm((current) => current ? {
      ...current,
      lines: current.lines.map((line) => line.id === id
        ? { ...line, [key]: key === "quantity" ? Number(value) : value }
        : line),
    } : current);
  }

  function selectStock(id: string, code: string) {
    const stock = stockCards.find((item) => item.code === code);
    setForm((current) => current ? {
      ...current,
      lines: current.lines.map((line) => line.id === id ? {
        ...line,
        stockCode: stock?.code ?? "",
        stockName: stock?.name ?? line.stockName,
        unit: stock?.unit || line.unit,
        warehouse: stock?.defaultWarehouse || line.warehouse,
      } : line),
    } : current);
  }

  function save() {
    if (!form || !canMutate) return;
    const linkedInvoice = purchaseInvoices.find((row) => row.id === form.linkedPurchaseInvoiceId);
    const values: DeliveryNoteCreateValues = {
      deliveryDate: form.deliveryDate,
      description: form.description,
      documentNo: form.documentNo,
      lines: form.lines.map((line) => ({
        quantity: line.quantity,
        stockCode: line.stockCode,
        stockName: line.stockName,
        unit: line.unit,
        warehouse: line.warehouse,
      })),
      linkedPurchaseInvoiceDocumentNo: linkedInvoice?.documentNo ?? "",
      linkedPurchaseInvoiceId: form.linkedPurchaseInvoiceId,
      siteCode: form.siteCode,
      siteName: form.siteName,
      supplierCode: form.supplierCode,
      supplierName: form.supplierName,
    };
    setErrors([]);
    setNotice("");
    startTransition(async () => {
      const result = form.mode === "edit" && form.id
        ? await persistence.updateNote(form.id, values)
        : await persistence.createNote(values);
      if (!result.ok) return setErrors(result.errors);
      setDisplayRows((current) => form.mode === "edit"
        ? current.map((row) => row.id === result.data.id ? result.data : row)
        : [result.data, ...current]);
      setForm(null);
      setNotice("Alış irsaliyesi taslak olarak kaydedildi.");
    });
  }

  function transition(row: DeliveryNoteRow, action: "cancel" | "post") {
    setErrors([]);
    setProcessingId(row.id);
    startTransition(async () => {
      const result = action === "post"
        ? await persistence.postNote(row.id)
        : await persistence.cancelNote(row.id);
      setProcessingId(null);
      if (!result.ok) return setErrors(result.errors);
      setDisplayRows((current) => current.map((item) => item.id === row.id ? result.data : item));
      setNotice(action === "post" ? "İrsaliye kesinleşti ve depo girişine yansıdı." : "İrsaliye iptal edildi.");
    });
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Stok giriş belgesi</p>
        <h1 className="mt-2 text-2xl font-semibold">Alış İrsaliyeleri</h1>
        <p className="mt-2 text-sm text-[var(--on-surface-variant)]">Tedarikçi sevk belgesini şantiye ve depoya bağlayın; alış faturasından satırları devralın ve kesinleştirildiğinde stok girişini oluşturun.</p>
      </header>

      <div className="flex flex-wrap gap-2 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-2">
        <button className={buttonClass} disabled={!canMutate} onClick={startCreate} type="button">Yeni İrsaliye</button>
        <button className={buttonClass} disabled={!form || isPending} onClick={save} type="button">{isPending ? "Kaydediliyor" : "Kaydet"}</button>
        <button className={buttonClass} onClick={() => window.print()} type="button">Yazdır</button>
      </div>

      {errors.length > 0 ? <div className="rounded-[var(--radius-panel)] border border-[var(--status-cancelled)] p-3 text-sm text-[var(--status-cancelled)]"><p className="font-semibold">İrsaliye kaydedilemedi</p><ul className="mt-2 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      {notice ? <div className="rounded-[var(--radius-panel)] border border-[var(--status-posted)] p-3 text-sm font-semibold text-[var(--status-posted)]" role="status">{notice}</div> : null}

      {form ? (
        <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
          <h2 className="text-sm font-semibold">Alış İrsaliyesi Ekle/Düzelt</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="İrsaliye No"><input className={inputClass} onChange={(event) => setForm({ ...form, documentNo: event.target.value })} value={form.documentNo} /></Field>
            <Field label="İrsaliye Tarihi"><input className={inputClass} onChange={(event) => setForm({ ...form, deliveryDate: event.target.value })} type="date" value={form.deliveryDate} /></Field>
            <Field label="Bağlı Alış Faturası"><select className={inputClass} onChange={(event) => selectInvoice(event.target.value)} value={form.linkedPurchaseInvoiceId}><option value="">Bağlantısız</option>{purchaseInvoices.filter((row) => row.status !== "İptal").map((row) => <option key={row.id} value={row.id}>{row.documentNo} - {row.counterpartyName}</option>)}</select></Field>
            <Field label="Tedarikçi"><select className={inputClass} disabled={Boolean(form.linkedPurchaseInvoiceId)} onChange={(event) => selectLookup("supplier", event.target.value)} value={form.supplierCode}><option value="">Tedarikçi seç</option>{suppliers.map((row) => <option key={row.code} value={row.code}>{row.name}</option>)}</select></Field>
            <Field label="Şantiye"><select className={inputClass} disabled={Boolean(form.linkedPurchaseInvoiceId)} onChange={(event) => selectLookup("site", event.target.value)} value={form.siteCode}><option value="">Şantiye seç</option>{sites.map((row) => <option key={row.code} value={row.code}>{row.name}</option>)}</select></Field>
            <Field label="Açıklama"><input className={inputClass} onChange={(event) => setForm({ ...form, description: event.target.value })} value={form.description} /></Field>
          </div>
          <div className="mt-4 overflow-x-auto rounded-[var(--radius-panel)] border border-[var(--grid-border)]">
            <table className="min-w-[850px] w-full text-left text-sm"><thead className="bg-[var(--surface-container-low)]"><tr><th className="p-2">Stok Kartı</th><th className="p-2">Stok/Hizmet</th><th className="p-2">Depo</th><th className="p-2">Birim</th><th className="p-2 text-right">Miktar</th><th className="p-2">İşlem</th></tr></thead><tbody>{form.lines.map((line, index) => <tr key={line.id}><td className="p-2"><select aria-label={`Stok Kartı satır ${index + 1}`} className={inputClass} onChange={(event) => selectStock(line.id, event.target.value)} value={line.stockCode ?? ""}><option value="">Serbest giriş</option>{stockCards.map((stock) => <option key={stock.code} value={stock.code}>{stock.code} - {stock.name}</option>)}</select></td><td className="p-2"><input aria-label={`Stok/Hizmet satır ${index + 1}`} className={inputClass} onChange={(event) => updateLine(line.id, "stockName", event.target.value)} value={line.stockName} /></td><td className="p-2"><input aria-label={`Depo satır ${index + 1}`} className={inputClass} onChange={(event) => updateLine(line.id, "warehouse", event.target.value)} value={line.warehouse} /></td><td className="p-2"><input aria-label={`Birim satır ${index + 1}`} className={inputClass} onChange={(event) => updateLine(line.id, "unit", event.target.value)} value={line.unit} /></td><td className="p-2"><input aria-label={`Miktar satır ${index + 1}`} className={`${inputClass} text-right`} min="0" onChange={(event) => updateLine(line.id, "quantity", event.target.value)} type="number" value={line.quantity} /></td><td className="p-2"><button className={buttonClass} onClick={() => setForm({ ...form, lines: form.lines.filter((item) => item.id !== line.id) })} type="button">Sil</button></td></tr>)}</tbody></table>
          </div>
          <button className={`${buttonClass} mt-3`} onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })} type="button">Satır Ekle</button>
        </article>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3"><Metric label="Toplam İrsaliye" value={String(displayRows.length)} /><Metric label="Kesinleşen" value={String(postedRows.length)} /><Metric label="Depoya Giren Miktar" value={formatQuantity(postedRows.reduce((sum, row) => sum + row.totalQuantity, 0))} /></div>
      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]"><div className="border-b border-[var(--grid-border)] px-4 py-3"><h2 className="text-sm font-semibold">İrsaliye Hareketleri</h2></div><div className="overflow-x-auto"><table className="min-w-[950px] w-full text-left text-sm"><thead className="bg-[var(--surface-container-low)]"><tr><th className="p-3">İrsaliye</th><th className="p-3">Tarih</th><th className="p-3">Tedarikçi</th><th className="p-3">Şantiye</th><th className="p-3">Bağlı Fatura</th><th className="p-3 text-right">Miktar</th><th className="p-3">Durum</th><th className="p-3">İşlem</th></tr></thead><tbody className="divide-y divide-[var(--grid-border)]">{displayRows.length === 0 ? <tr><td className="p-8 text-center" colSpan={8}>Henüz alış irsaliyesi yok.</td></tr> : displayRows.map((row) => <tr key={row.id}><td className="p-3 font-mono text-xs">{row.documentNo}</td><td className="p-3">{formatDate(row.deliveryDate)}</td><td className="p-3">{row.supplierName}</td><td className="p-3">{row.siteName}</td><td className="p-3">{row.linkedPurchaseInvoiceDocumentNo || "-"}</td><td className="p-3 text-right font-mono">{formatQuantity(row.totalQuantity)}</td><td className="p-3">{row.status}</td><td className="p-3"><div className="flex gap-2"><button aria-label={`Düzenle ${row.documentNo}`} className={buttonClass} disabled={!canMutate || row.status !== "Taslak" || processingId === row.id} onClick={() => startEdit(row)} type="button">Düzenle</button><button aria-label={`Kesinleştir ${row.documentNo}`} className={buttonClass} disabled={!canMutate || row.status !== "Taslak" || processingId === row.id} onClick={() => transition(row, "post")} type="button">Kesinleştir</button><button aria-label={`İptal ${row.documentNo}`} className={buttonClass} disabled={!canMutate || row.status === "İptal" || processingId === row.id} onClick={() => transition(row, "cancel")} type="button">İptal Et</button></div></td></tr>)}</tbody></table></div></article>
      <AuditHistory logs={auditLogsByEntityId} rows={displayRows} />
    </section>
  );
}

function AuditHistory({ logs, rows }: { logs: Record<string, AuditLogEntry[]>; rows: DeliveryNoteRow[] }) {
  const visible = rows.flatMap((row) => (logs[row.id] ?? []).map((log) => ({ log, row })));
  return visible.length > 0 ? <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"><h2 className="text-sm font-semibold">İşlem Geçmişi</h2><ul className="mt-3 grid gap-2">{visible.map(({ log, row }) => <li className="flex justify-between gap-3 rounded border border-[var(--grid-border)] p-2 text-sm" key={log.id}><span>{row.documentNo} · {auditLabel(log.action)}</span><time className="font-mono text-xs">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.occurredAt))}</time></li>)}</ul></article> : null;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-1 text-sm font-semibold">{label}{children}</label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4"><p className="text-sm text-[var(--on-surface-variant)]">{label}</p><p className="mt-2 font-mono text-2xl font-semibold">{value}</p></div>; }
function emptyLine(): FormState["lines"][number] { return { id: newLineId(), quantity: 1, stockCode: "", stockName: "", unit: "Adet", warehouse: "" }; }
function newLineId() { return `delivery-line-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`)); }
function formatQuantity(value: number) { return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 4 }).format(value); }
function auditLabel(action: string) { return ({ "delivery-note.cancel": "İptal edildi", "delivery-note.create": "Oluşturuldu", "delivery-note.post": "Kesinleştirildi", "delivery-note.update": "Güncellendi" } as Record<string, string>)[action] ?? action; }
const inputClass = "h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm";
const buttonClass = "rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--primary-fixed)] disabled:opacity-50";
