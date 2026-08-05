"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import {
  cancelVehicleFuelRecordAction,
  completeVehicleAssignmentAction,
  completeVehicleMaintenancePlanAction,
  completeVehicleMaintenanceRecordAction,
  createVehicleAssignmentAction,
  createVehicleFuelRecordAction,
  createVehicleMaintenancePlanAction,
  createVehicleMaintenanceRecordAction,
  transferVehicleAssignmentAction,
} from "@/app/actions/vehicle-fleet-actions";
import type { AuditLogEntry } from "@/lib/audit-log";
import type { VehicleFleetOverview } from "@/lib/vehicle-fleet-prisma-repository";

type CreateKind = "assignment" | "fuel" | "maintenance-plan" | "maintenance-record";
type FleetItem = {
  detail: string;
  id: string;
  kind: CreateKind;
  occurredOn: string;
  status: string;
  title: string;
  vehicleId: string;
};
type Lookups = {
  personnel: Array<{ code: string; name: string }>;
  projects: Array<{ code: string; id: string; name: string }>;
  vehicles: Array<{ entryOdometerKm: number | null; id: string; plate: string }>;
};

export function VehicleFleetOperationsSurface({
  auditRows = [],
  canMutate,
  lookups,
  overview,
}: {
  auditRows?: AuditLogEntry[];
  canMutate: boolean;
  lookups: Lookups | null;
  overview: VehicleFleetOverview | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CreateKind | "all">("all");
  const selectedId = searchParams.get("fleet");
  const items = useMemo(() => toItems(overview, lookups), [lookups, overview]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const visibleItems = items.filter((item) => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return (filter === "all" || item.kind === filter) && (!normalized || `${item.title} ${item.detail} ${item.status}`.toLocaleLowerCase("tr-TR").includes(normalized));
  });

  function select(item: FleetItem) { router.replace(`/araclar?fleet=${encodeURIComponent(item.id)}`, { scroll: false }); }
  function close() { router.replace("/araclar", { scroll: false }); }
  function mutate(action: () => Promise<unknown>, success: string) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await action();
      if (isSuccess(result)) { setNotice(success); router.refresh(); } else setError(readErrors(result));
    });
  }
  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kind = createKind;
    if (!kind) return;
    const value = (name: string) => String(form.get(name) ?? "");
    const optional = (name: string) => value(name).trim() || undefined;
    const number = (name: string) => Number(value(name));
    if (kind === "assignment") mutate(() => createVehicleAssignmentAction({ assignedOn: value("assignedOn"), assignmentNote: optional("assignmentNote"), driverPersonnelId: optional("driverPersonnelId"), projectId: optional("projectId"), vehicleId: value("vehicleId") }), "Araç ataması kaydedildi.");
    if (kind === "fuel") mutate(() => createVehicleFuelRecordAction({ fueledOn: value("fueledOn"), liters: number("liters"), odometerKm: number("odometerKm"), stationName: optional("stationName"), unitPrice: number("unitPrice"), vehicleId: value("vehicleId") }), "Yakıt kaydı kaydedildi.");
    if (kind === "maintenance-plan") mutate(() => createVehicleMaintenancePlanAction({ intervalDays: optional("intervalDays") ? number("intervalDays") : undefined, intervalKm: optional("intervalKm") ? number("intervalKm") : undefined, maintenanceType: value("maintenanceType"), nextDueKm: optional("nextDueKm") ? number("nextDueKm") : undefined, nextDueOn: optional("nextDueOn"), vehicleId: value("vehicleId") }), "Bakım planı kaydedildi.");
    if (kind === "maintenance-record") mutate(() => createVehicleMaintenanceRecordAction({ costAmount: number("costAmount"), maintenanceOn: value("maintenanceOn"), maintenanceType: value("maintenanceType"), note: optional("note"), odometerKm: number("odometerKm"), planId: optional("planId"), providerName: optional("providerName"), vehicleId: value("vehicleId") }), "Bakım kaydı oluşturuldu.");
    setCreateKind(null);
  }

  return <section aria-labelledby="fleet-operations-title" className="mt-6 space-y-4">
    <header className="flex flex-col justify-between gap-4 rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm print:shadow-none lg:flex-row lg:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Faz 15 · Manuel operasyon</p><h2 className="mt-1 text-2xl font-bold text-content" id="fleet-operations-title">Filo Operasyon Merkezi</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">Atama, yakıt ve bakım kayıtları aynı kapsamta izlenir. Finansal hareket, stok düşümü veya otomatik telemetri üretilmez.</p></div>
      <dl className="grid grid-cols-3 gap-2"><Metric label="Atama" value={overview?.assignments.length ?? 0} /><Metric label="Yakıt" value={overview?.fuelRecords.length ?? 0} /><Metric label="Bakım" value={(overview?.maintenancePlans.length ?? 0) + (overview?.maintenanceRecords.length ?? 0)} /></dl>
    </header>

    <div aria-atomic="true" aria-live="polite">{notice ? <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success">{notice}</p> : null}{error ? <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{error}</p> : null}</div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <article className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
        <div className="flex flex-wrap items-center gap-2 border-b border-divider bg-surface-subtle p-3 print:hidden"><input aria-label="Filo operasyonlarında ara" className={inputClass} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Araç, durum veya kayıt ara" value={query} /><select aria-label="Filo kayıt türü filtresi" className={inputClass} onChange={(event) => setFilter(event.currentTarget.value as CreateKind | "all")} value={filter}><option value="all">Tüm kayıtlar</option><option value="assignment">Araç ataması</option><option value="fuel">Yakıt</option><option value="maintenance-plan">Bakım planı</option><option value="maintenance-record">Bakım kaydı</option></select>{canMutate ? <select aria-label="Yeni filo kayıt türü" className={inputClass} onChange={(event) => setCreateKind(event.currentTarget.value as CreateKind)} value={createKind ?? ""}><option disabled value="">Yeni kayıt</option><option value="assignment">Araç ataması</option><option value="fuel">Yakıt kaydı</option><option value="maintenance-plan">Bakım planı</option><option value="maintenance-record">Bakım kaydı</option></select> : null}</div>
        <div className="overflow-x-auto"><table aria-label="Filo operasyon kayıt listesi" className="min-w-[760px] w-full text-left text-sm"><thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-3 py-3">Tür</th><th className="px-3 py-3">Kayıt</th><th className="px-3 py-3">Tarih</th><th className="px-3 py-3">Durum</th><th className="px-3 py-3 print:hidden">Detay</th></tr></thead><tbody className="divide-y divide-divider">{!overview ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>Filo operasyon kayıtları yükleniyor…</td></tr> : null}{overview && !visibleItems.length ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>Bu filtrede filo operasyon kaydı bulunmuyor.</td></tr> : null}{visibleItems.map((item) => <tr className={selected?.id === item.id ? "bg-brand-primary/5" : ""} key={`${item.kind}-${item.id}`}><td className="px-3 py-3 text-xs font-semibold text-content-muted">{kindLabel(item.kind)}</td><td className="px-3 py-3"><strong className="block text-content">{item.title}</strong><span className="block max-w-md truncate text-xs text-content-muted">{item.detail}</span></td><td className="px-3 py-3 font-mono text-xs text-content">{formatDate(item.occurredOn)}</td><td className="px-3 py-3"><StatusBadge status={item.status} /></td><td className="px-3 py-3 print:hidden"><button className={secondaryButton} onClick={() => select(item)} type="button">Aç</button></td></tr>)}</tbody></table></div>
      </article>
      <aside aria-label="Filo operasyon sınırları" className="space-y-3 print:hidden"><section className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h3 className="text-sm font-bold text-content">Güvenli işlem sınırı</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-content-muted"><li>Her yazma isteğinde oturum, rol ve dönem yeniden denetlenir.</li><li>Audit kaydı işlem/durum bilgisini taşır; not ve servis ayrıntısı taşımaz.</li><li>Yakıt/bakım tutarı muhasebe, stok veya bordro hareketi üretmez.</li></ul></section><section className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h3 className="text-sm font-bold text-content">Görünür durumlar</h3><p className="mt-2 text-sm leading-6 text-content-muted">Renk yanında metin kullanılır. Tablo yazdırılabilir; mobilde yatay kaydırma kabı vardır.</p></section></aside>
    </div>
    {selected ? <DetailDrawer auditRows={auditRows.filter((row) => row.entityId === selected.id)} canMutate={canMutate} item={selected} lookups={lookups} onClose={close} onMutate={mutate} pending={pending} /> : null}
    {createKind ? <CreateDialog kind={createKind} lookups={lookups} overview={overview} onCancel={() => setCreateKind(null)} onSubmit={submitCreate} pending={pending} /> : null}
  </section>;
}

function DetailDrawer({ auditRows, canMutate, item, lookups, onClose, onMutate, pending }: { auditRows: AuditLogEntry[]; canMutate: boolean; item: FleetItem; lookups: Lookups | null; onClose: () => void; onMutate: (action: () => Promise<unknown>, success: string) => void; pending: boolean }) {
  const closeRef = useRef<HTMLButtonElement | null>(null); useEffect(() => { closeRef.current?.focus(); }, []);
  const action = nextAction(item);
  return <div aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-content/45 p-0 sm:p-4 print:static print:bg-transparent" onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }} role="dialog"><article aria-labelledby="fleet-drawer-title" className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-xl sm:rounded-ui-panel sm:border sm:border-divider sm:p-5 print:max-w-none print:shadow-none"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">{kindLabel(item.kind)}</p><h2 className="mt-1 text-xl font-bold text-content" id="fleet-drawer-title">{item.title}</h2><p className="mt-2 text-sm leading-6 text-content-muted">{item.detail}</p></div><button aria-label="Filo operasyon detayını kapat" className={`${secondaryButton} print:hidden`} disabled={pending} onClick={onClose} ref={closeRef} type="button">Kapat</button></div><dl className="mt-5 grid gap-2 sm:grid-cols-2"><Metric label="Tarih" value={formatDate(item.occurredOn)} /><Metric label="Durum" value={statusLabel(item.status)} /></dl>{canMutate && action ? <div className="mt-5 print:hidden"><button className={primaryButton} disabled={pending} onClick={() => onMutate(action.run, action.label)} type="button">{pending ? "İşleniyor…" : action.label}</button></div> : null}{canMutate && item.kind === "assignment" && item.status === "ACTIVE" ? <TransferForm item={item} lookups={lookups} onMutate={onMutate} pending={pending} /> : null}<section className="mt-5"><h3 className="text-sm font-bold text-content">Audit geçmişi</h3>{auditRows.length ? <ol className="mt-3 space-y-2">{auditRows.map((row) => <li className="flex flex-wrap justify-between gap-2 rounded-ui-control border border-divider p-3 text-xs" key={row.id}><span className="font-semibold text-content">{auditLabel(row.action)}</span><time className="font-mono text-content-muted">{formatDateTime(row.occurredAt)}</time></li>)}</ol> : <p className="mt-2 rounded-ui-control border border-dashed border-divider p-3 text-sm text-content-muted">Bu kayıt için görünür audit olayı yok.</p>}</section></article></div>;
}

function TransferForm({ item, lookups, onMutate, pending }: { item: FleetItem; lookups: Lookups | null; onMutate: (action: () => Promise<unknown>, success: string) => void; pending: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  return <form aria-label="Araç ataması transferi" className="mt-5 rounded-ui-control border border-divider bg-surface-subtle p-3 print:hidden" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const value = (name: string) => String(form.get(name) ?? ""); onMutate(() => transferVehicleAssignmentAction(item.id, { assignedOn: value("assignedOn"), driverPersonnelId: value("driverPersonnelId") || undefined, projectId: value("projectId") || undefined, vehicleId: item.vehicleId }), "Araç ataması transfer edildi."); }}><h3 className="text-sm font-bold text-content">Atamayı transfer et</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-content">Transfer tarihi<input className={inputClass} defaultValue={today} name="assignedOn" required type="date" /></label><label className="grid gap-1 text-xs font-semibold text-content">Proje<select className={inputClass} name="projectId"><option value="">Proje seçilmedi</option>{lookups?.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></label><label className="grid gap-1 text-xs font-semibold text-content">Sürücü<select className={inputClass} name="driverPersonnelId"><option value="">Sürücü seçilmedi</option>{lookups?.personnel.map((row) => <option key={row.code} value={row.code}>{row.code} · {row.name}</option>)}</select></label></div><button className={`${secondaryButton} mt-3`} disabled={pending} type="submit">Transferi kaydet</button></form>;
}

function CreateDialog({ kind, lookups, onCancel, onSubmit, overview, pending }: { kind: CreateKind; lookups: Lookups | null; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; overview: VehicleFleetOverview | null; pending: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-content/45 p-4 print:hidden" role="dialog"><form aria-labelledby="fleet-create-title" className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl" onSubmit={onSubmit}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Yeni kayıt</p><h2 className="mt-1 text-lg font-bold text-content" id="fleet-create-title">{kindLabel(kind)} oluştur</h2></div><button aria-label="Filo kayıt formunu kapat" className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Kapat</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Fields kind={kind} lookups={lookups} plans={overview?.maintenancePlans ?? []} today={today} /></div><div className="mt-5 flex justify-end gap-2"><button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Vazgeç</button><button className={primaryButton} disabled={pending} type="submit">{pending ? "Kaydediliyor…" : "Kaydı oluştur"}</button></div></form></div>;
}

function Fields({ kind, lookups, plans, today }: { kind: CreateKind; lookups: Lookups | null; plans: VehicleFleetOverview["maintenancePlans"]; today: string }) {
  const vehicle = <Field label="Araç"><select className={inputClass} name="vehicleId" required><option value="">Araç seçin</option>{lookups?.vehicles.map((row) => <option key={row.id} value={row.id}>{row.plate} · {row.entryOdometerKm ?? 0} km</option>)}</select></Field>;
  if (kind === "assignment") return <>{vehicle}<Field label="Atama tarihi"><input className={inputClass} defaultValue={today} name="assignedOn" required type="date" /></Field><Field label="Proje / şantiye"><select className={inputClass} name="projectId"><option value="">Proje seçilmedi</option>{lookups?.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></Field><Field label="Sürücü"><select className={inputClass} name="driverPersonnelId"><option value="">Sürücü seçilmedi</option>{lookups?.personnel.map((row) => <option key={row.code} value={row.code}>{row.code} · {row.name}</option>)}</select></Field><Field full label="Atama notu"><textarea className={inputClass} name="assignmentNote" rows={3} /></Field></>;
  if (kind === "fuel") return <>{vehicle}<Field label="Yakıt tarihi"><input className={inputClass} defaultValue={today} name="fueledOn" required type="date" /></Field><Field label="Litre"><input className={inputClass} min="0.001" name="liters" required step="0.001" type="number" /></Field><Field label="Birim fiyat"><input className={inputClass} min="0.01" name="unitPrice" required step="0.01" type="number" /></Field><Field label="Kilometre"><input className={inputClass} min="0" name="odometerKm" required step="1" type="number" /></Field><Field label="İstasyon"><input className={inputClass} name="stationName" /></Field></>;
  if (kind === "maintenance-plan") return <>{vehicle}<Field label="Bakım türü"><input className={inputClass} name="maintenanceType" placeholder="Periyodik / arıza" required /></Field><Field label="Sonraki hedef km"><input className={inputClass} min="0" name="nextDueKm" step="1" type="number" /></Field><Field label="Sonraki hedef tarih"><input className={inputClass} name="nextDueOn" type="date" /></Field><Field label="KM aralığı"><input className={inputClass} min="1" name="intervalKm" step="1" type="number" /></Field><Field label="Gün aralığı"><input className={inputClass} min="1" name="intervalDays" step="1" type="number" /></Field></>;
  return <>{vehicle}<Field label="Bakım türü"><input className={inputClass} name="maintenanceType" required /></Field><Field label="Bakım tarihi"><input className={inputClass} defaultValue={today} name="maintenanceOn" required type="date" /></Field><Field label="Kilometre"><input className={inputClass} min="0" name="odometerKm" required step="1" type="number" /></Field><Field label="Maliyet"><input className={inputClass} min="0" name="costAmount" required step="0.01" type="number" /></Field><Field label="Bakım planı"><select className={inputClass} name="planId"><option value="">Plan seçilmedi</option>{plans.filter((plan) => plan.status === "ACTIVE").map((plan) => <option key={plan.id} value={plan.id}>{plan.maintenanceType} · {lookups?.vehicles.find((vehicle) => vehicle.id === plan.vehicleId)?.plate ?? plan.vehicleId}</option>)}</select></Field><Field label="Servis"><input className={inputClass} name="providerName" /></Field><Field full label="Bakım notu"><textarea className={inputClass} name="note" rows={3} /></Field></>;
}

function Field({ children, full = false, label }: { children: React.ReactNode; full?: boolean; label: string }) { return <label className={full ? "grid gap-1 text-sm font-semibold text-content sm:col-span-2" : "grid gap-1 text-sm font-semibold text-content"}>{label}{children}</label>; }
function Metric({ label, value }: { label: string; value: number | string }) { return <div className="rounded-ui-control border border-divider bg-surface-subtle p-3"><dt className="text-xs font-semibold text-content-muted">{label}</dt><dd className="mt-1 font-mono text-lg font-bold text-content">{value}</dd></div>; }
function StatusBadge({ status }: { status: string }) { const positive = ["COMPLETED", "TRANSFERRED"].includes(status); const neutral = ["ACTIVE", "DRAFT", "RECORDED"].includes(status); return <span className={positive ? "rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success" : neutral ? "rounded-full bg-warning-subtle px-2 py-1 text-xs font-semibold text-warning" : "rounded-full bg-danger-subtle px-2 py-1 text-xs font-semibold text-danger"}>{statusLabel(status)}</span>; }
function toItems(overview: VehicleFleetOverview | null, lookups: Lookups | null): FleetItem[] { if (!overview) return []; const vehicleLabel = (vehicleId: string) => lookups?.vehicles.find((vehicle) => vehicle.id === vehicleId)?.plate ?? vehicleId; const projectLabel = (projectId: string | null) => { const project = lookups?.projects.find((row) => row.id === projectId); return project ? `${project.code} · ${project.name}` : "Proje yok"; }; const personnelLabel = (personnelCode: string | null) => { const personnel = lookups?.personnel.find((row) => row.code === personnelCode); return personnel ? `${personnel.code} · ${personnel.name}` : "Sürücü yok"; }; return [
  ...overview.assignments.map((row) => ({ id: row.id, kind: "assignment" as const, title: `Atama · ${vehicleLabel(row.vehicleId)}`, detail: `${projectLabel(row.projectId)} · ${personnelLabel(row.driverPersonnelId)}`, occurredOn: row.assignedOn, status: row.status, vehicleId: row.vehicleId })),
  ...overview.fuelRecords.map((row) => ({ id: row.id, kind: "fuel" as const, title: `Yakıt · ${vehicleLabel(row.vehicleId)}`, detail: `${row.liters.toLocaleString("tr-TR")} L · ${row.totalAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`, occurredOn: row.fueledOn, status: row.status, vehicleId: row.vehicleId })),
  ...overview.maintenancePlans.map((row) => ({ id: row.id, kind: "maintenance-plan" as const, title: `Bakım planı · ${row.maintenanceType}`, detail: `${row.nextDueKm ? `${row.nextDueKm} km` : ""}${row.nextDueOn ? ` · ${row.nextDueOn}` : ""}`, occurredOn: row.nextDueOn ?? row.createdAt, status: row.status, vehicleId: row.vehicleId })),
  ...overview.maintenanceRecords.map((row) => ({ id: row.id, kind: "maintenance-record" as const, title: `Bakım · ${row.maintenanceType}`, detail: `${row.odometerKm} km · ${row.costAmount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`, occurredOn: row.maintenanceOn, status: row.status, vehicleId: row.vehicleId })),
].sort((left, right) => right.occurredOn.localeCompare(left.occurredOn)); }
function nextAction(item: FleetItem) { if (item.kind === "assignment" && item.status === "ACTIVE") return { label: "Atamayı tamamla", run: () => completeVehicleAssignmentAction(item.id) }; if (item.kind === "fuel" && item.status === "RECORDED") return { label: "Yakıt kaydını iptal et", run: () => cancelVehicleFuelRecordAction(item.id) }; if (item.kind === "maintenance-plan" && item.status === "ACTIVE") return { label: "Bakım planını tamamla", run: () => completeVehicleMaintenancePlanAction(item.id) }; if (item.kind === "maintenance-record" && item.status === "DRAFT") return { label: "Bakımı tamamla", run: () => completeVehicleMaintenanceRecordAction(item.id) }; return null; }
function kindLabel(kind: CreateKind) { return ({ assignment: "Araç ataması", fuel: "Yakıt kaydı", "maintenance-plan": "Bakım planı", "maintenance-record": "Bakım kaydı" })[kind]; }
function statusLabel(status: string) { return ({ ACTIVE: "Aktif", CANCELLED: "İptal", COMPLETED: "Tamamlandı", DRAFT: "Taslak", RECORDED: "Kaydedildi", TRANSFERRED: "Transfer edildi" } as Record<string, string>)[status] ?? status; }
function auditLabel(action: string) { return ({ "vehicle-fleet.assignment.create": "Araç ataması oluşturuldu", "vehicle-fleet.assignment.complete": "Araç ataması tamamlandı", "vehicle-fleet.assignment.transfer": "Araç ataması transfer edildi", "vehicle-fleet.fuel.create": "Yakıt kaydı oluşturuldu", "vehicle-fleet.fuel.cancel": "Yakıt kaydı iptal edildi", "vehicle-fleet.maintenance-plan.create": "Bakım planı oluşturuldu", "vehicle-fleet.maintenance-plan.complete": "Bakım planı tamamlandı", "vehicle-fleet.maintenance-plan.cancel": "Bakım planı iptal edildi", "vehicle-fleet.maintenance-record.create": "Bakım kaydı oluşturuldu", "vehicle-fleet.maintenance-record.complete": "Bakım kaydı tamamlandı" } as Record<string, string>)[action] ?? action; }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function isSuccess(value: unknown): value is { ok: true } { return typeof value === "object" && value !== null && "ok" in value && value.ok === true; }
function readErrors(value: unknown) { return typeof value === "object" && value !== null && "errors" in value && Array.isArray(value.errors) ? value.errors.join(" ") : "İşlem tamamlanamadı."; }
const inputClass = "min-w-[10rem] rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";
const primaryButton = "rounded-ui-control bg-brand-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60";
