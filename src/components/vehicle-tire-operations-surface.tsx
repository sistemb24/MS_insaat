"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import {
  createVehicleTireMountAction,
  removeVehicleTireRecordAction,
} from "@/app/actions/vehicle-tire-actions";
import type { AuditLogEntry } from "@/lib/audit-log";
import type { VehicleTireRecordRow } from "@/lib/vehicle-tire-prisma-repository";

type VehicleLookup = { id: string; plate: string };

export function VehicleTireOperationsSurface({
  auditRows = [],
  canMutate,
  records,
  vehicles,
}: {
  auditRows?: AuditLogEntry[];
  canMutate: boolean;
  records: VehicleTireRecordRow[] | null;
  vehicles: VehicleLookup[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "ACTIVE" | "REMOVED">("all");
  const selectedId = searchParams.get("tire");
  const selected = records?.find((record) => record.id === selectedId) ?? null;
  const visible = useMemo(() => (records ?? []).filter((record) => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return (status === "all" || record.status === status) && (!normalized || `${vehicleLabel(record.vehicleId, vehicles)} ${record.tirePosition} ${record.brandModel} ${seasonLabel(record.season)} ${statusLabel(record.status)}`.toLocaleLowerCase("tr-TR").includes(normalized));
  }), [query, records, status, vehicles]);

  function select(record: VehicleTireRecordRow) { router.replace(`/araclar?tire=${encodeURIComponent(record.id)}`, { scroll: false }); }
  function close() { router.replace("/araclar", { scroll: false }); }
  function mutate(action: () => Promise<unknown>, success: string) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await action();
      if (isSuccess(result)) { setNotice(success); setCreateOpen(false); router.refresh(); } else setError(readErrors(result));
    });
  }
  function submitMount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    mutate(() => createVehicleTireMountAction({
      brandModel: value("brandModel"),
      mountedOdometerKm: Number(value("mountedOdometerKm")),
      mountedOn: value("mountedOn"),
      season: value("season") as "SUMMER" | "WINTER" | "ALL_SEASON",
      tirePosition: value("tirePosition"),
      treadWearPercent: Number(value("treadWearPercent")),
      vehicleId: value("vehicleId"),
    }), "Lastik montajı kaydedildi.");
  }
  function submitRemoval(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    mutate(() => removeVehicleTireRecordAction({
      id: selected.id,
      removedOdometerKm: Number(String(form.get("removedOdometerKm") ?? "")),
      removedOn: String(form.get("removedOn") ?? ""),
    }), "Lastik sökümü kaydedildi.");
  }

  const activeCount = records?.filter((record) => record.status === "ACTIVE").length ?? 0;
  return <section aria-labelledby="vehicle-tire-operations-title" className="mt-6 space-y-4">
    <header className="flex flex-col justify-between gap-4 rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm print:shadow-none lg:flex-row lg:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Faz 16 · Manuel operasyon</p><h2 className="mt-1 text-2xl font-bold text-content" id="vehicle-tire-operations-title">Filo Lastik Yönetimi</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">Araç konumlarındaki montaj ve söküm geçmişi izlenir. Stok, satın alma, finansal hareket ve telemetri üretilmez.</p></div>
      <dl className="grid grid-cols-3 gap-2"><Metric label="Aktif montaj" value={activeCount} /><Metric label="Geçmiş" value={(records?.length ?? 0) - activeCount} /><Metric label="Audit" value={auditRows.length} /></dl>
    </header>

    <div aria-atomic="true" aria-live="polite">{notice ? <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success">{notice}</p> : null}{error ? <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{error}</p> : null}</div>

    <article className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
      <div className="flex flex-wrap items-center gap-2 border-b border-divider bg-surface-subtle p-3 print:hidden">
        <input aria-label="Lastik kayıtlarında ara" className={inputClass} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Araç, konum veya marka/model ara" value={query} />
        <select aria-label="Lastik durum filtresi" className={inputClass} onChange={(event) => setStatus(event.currentTarget.value as "all" | "ACTIVE" | "REMOVED")} value={status}><option value="all">Tüm durumlar</option><option value="ACTIVE">Aktif montaj</option><option value="REMOVED">Sökülmüş</option></select>
        {canMutate ? <button className={primaryButton} onClick={() => setCreateOpen(true)} type="button">Yeni lastik montajı</button> : null}
      </div>
      <div className="overflow-x-auto"><table aria-label="Lastik kayıt listesi" className="min-w-[760px] w-full text-left text-sm"><thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-3 py-3">Araç / konum</th><th className="px-3 py-3">Lastik</th><th className="px-3 py-3">Montaj</th><th className="px-3 py-3">Durum</th><th className="px-3 py-3 print:hidden">Detay</th></tr></thead><tbody className="divide-y divide-divider">{records === null ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>Lastik kayıtları yükleniyor…</td></tr> : null}{records !== null && !visible.length ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>Bu filtrede lastik kaydı bulunmuyor.</td></tr> : null}{visible.map((record) => <tr className={selected?.id === record.id ? "bg-brand-primary/5" : ""} key={record.id}><td className="px-3 py-3"><strong className="block text-content">{vehicleLabel(record.vehicleId, vehicles)}</strong><span className="text-xs text-content-muted">{record.tirePosition}</span></td><td className="px-3 py-3"><strong className="block text-content">{record.brandModel}</strong><span className="text-xs text-content-muted">{seasonLabel(record.season)} · %{record.treadWearPercent} aşınma</span></td><td className="px-3 py-3"><span className="block font-mono text-xs text-content">{formatDate(record.mountedOn)}</span><span className="text-xs text-content-muted">{record.mountedOdometerKm.toLocaleString("tr-TR")} km</span></td><td className="px-3 py-3"><StatusBadge status={record.status} /></td><td className="px-3 py-3 print:hidden"><button className={secondaryButton} onClick={() => select(record)} type="button">Aç</button></td></tr>)}</tbody></table></div>
    </article>

    {createOpen ? <Modal onClose={() => setCreateOpen(false)} title="Lastik montajı oluştur"><form aria-label="Lastik montajı oluştur" className="grid gap-3 sm:grid-cols-2" onSubmit={submitMount}><Field label="Araç"><select className={inputClass} name="vehicleId" required><option value="">Araç seçin</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>)}</select></Field><Field label="Konum"><input className={inputClass} name="tirePosition" placeholder="Sol ön" required /></Field><Field label="Montaj tarihi"><input className={inputClass} defaultValue={today()} name="mountedOn" required type="date" /></Field><Field label="Montaj kilometresi"><input className={inputClass} min="0" name="mountedOdometerKm" required step="1" type="number" /></Field><Field label="Sezon"><select className={inputClass} name="season" required><option value="SUMMER">Yaz</option><option value="WINTER">Kış</option><option value="ALL_SEASON">Dört mevsim</option></select></Field><Field label="Aşınma yüzdesi"><input className={inputClass} max="100" min="0" name="treadWearPercent" required step="1" type="number" /></Field><Field full label="Marka / model"><input className={inputClass} name="brandModel" placeholder="315/80 R22.5" required /></Field><div className="flex justify-end gap-2 sm:col-span-2"><button className={secondaryButton} onClick={() => setCreateOpen(false)} type="button">Vazgeç</button><button className={primaryButton} disabled={pending} type="submit">Kaydet</button></div></form></Modal> : null}
    {selected ? <Modal onClose={close} title={`${vehicleLabel(selected.vehicleId, vehicles)} · ${selected.tirePosition}`}><div className="space-y-4"><dl className="grid gap-3 sm:grid-cols-2"><Detail label="Lastik" value={selected.brandModel} /><Detail label="Sezon" value={seasonLabel(selected.season)} /><Detail label="Montaj" value={`${formatDate(selected.mountedOn)} · ${selected.mountedOdometerKm.toLocaleString("tr-TR")} km`} /><Detail label="Aşınma" value={`%${selected.treadWearPercent}`} /><Detail label="Durum" value={statusLabel(selected.status)} />{selected.removedOn ? <Detail label="Söküm" value={`${formatDate(selected.removedOn)} · ${(selected.removedOdometerKm ?? 0).toLocaleString("tr-TR")} km`} /> : null}</dl>{canMutate && selected.status === "ACTIVE" ? <form aria-label="Lastik sökümü kaydı" className="grid gap-3 border-t border-divider pt-4 sm:grid-cols-2" onSubmit={submitRemoval}><Field label="Söküm tarihi"><input className={inputClass} defaultValue={today()} name="removedOn" required type="date" /></Field><Field label="Söküm kilometresi"><input className={inputClass} min={selected.mountedOdometerKm} name="removedOdometerKm" required step="1" type="number" /></Field><div className="flex justify-end sm:col-span-2"><button className={primaryButton} disabled={pending} type="submit">Sökümü kaydet</button></div></form> : null}</div></Modal> : null}
  </section>;
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) { const dialogRef = useRef<HTMLDivElement>(null); useEffect(() => { dialogRef.current?.focus(); }, []); return <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 print:hidden"><div aria-labelledby="vehicle-tire-dialog-title" aria-modal="true" className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl" ref={dialogRef} role="dialog" tabIndex={-1}><div className="mb-4 flex items-start justify-between gap-4"><h3 className="text-lg font-bold text-content" id="vehicle-tire-dialog-title">{title}</h3><button aria-label="Pencereyi kapat" className={secondaryButton} onClick={onClose} type="button">Kapat</button></div>{children}</div></div>; }
function Field({ children, full = false, label }: { children: React.ReactNode; full?: boolean; label: string }) { return <label className={full ? "grid gap-1 text-sm font-semibold text-content sm:col-span-2" : "grid gap-1 text-sm font-semibold text-content"}>{label}{children}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-content-muted">{label}</dt><dd className="mt-1 text-sm text-content">{value}</dd></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-ui-control border border-divider bg-surface-subtle p-3"><dt className="text-xs font-semibold text-content-muted">{label}</dt><dd className="mt-1 font-mono text-lg font-bold text-content">{value}</dd></div>; }
function StatusBadge({ status }: { status: string }) { return <span className={status === "ACTIVE" ? "rounded-full bg-warning-subtle px-2 py-1 text-xs font-semibold text-warning" : "rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success"}>{statusLabel(status)}</span>; }
function vehicleLabel(vehicleId: string, vehicles: VehicleLookup[]) { return vehicles.find((vehicle) => vehicle.id === vehicleId)?.plate ?? vehicleId; }
function seasonLabel(season: string) { return ({ SUMMER: "Yaz", WINTER: "Kış", ALL_SEASON: "Dört mevsim" } as Record<string, string>)[season] ?? season; }
function statusLabel(status: string) { return ({ ACTIVE: "Aktif", REMOVED: "Söküldü" } as Record<string, string>)[status] ?? status; }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)); }
function today() { return new Date().toISOString().slice(0, 10); }
function isSuccess(value: unknown): value is { ok: true } { return typeof value === "object" && value !== null && "ok" in value && value.ok === true; }
function readErrors(value: unknown) { return typeof value === "object" && value !== null && "errors" in value && Array.isArray(value.errors) ? value.errors.join(" ") : "İşlem tamamlanamadı."; }
const inputClass = "min-w-[10rem] rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";
const primaryButton = "rounded-ui-control bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60";
