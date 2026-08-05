"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import {
  closeSafetyWorkAccidentAction,
  completeSafetyInspectionAction,
  completeSafetyTrainingAction,
  createSafetyFindingAction,
  createSafetyInspectionAction,
  createSafetyPpeIssuanceAction,
  createSafetyTrainingAction,
  createSafetyWorkAccidentAction,
  listWorkplaceSafetyAuditLogsAction,
  listWorkplaceSafetyLookupsAction,
  listWorkplaceSafetyOverviewAction,
  planSafetyTrainingAction,
  recordSafetyTrainingAttendanceAction,
  recordSafetyWorkAccidentAction,
  resolveSafetyFindingAction,
  returnSafetyPpeIssuanceAction,
} from "@/app/actions/workplace-safety-actions";
import type { AuditLogEntry } from "@/lib/audit-log";
import type { SafetyInspectionRow } from "@/lib/workplace-safety-prisma-repository";

type Overview = Extract<Awaited<ReturnType<typeof listWorkplaceSafetyOverviewAction>>, { ok: true }> ["data"];
type Lookups = Extract<Awaited<ReturnType<typeof listWorkplaceSafetyLookupsAction>>, { ok: true }> ["data"];
type Kind = "accident" | "training" | "inspection" | "finding" | "ppe";
type CreateKind = Kind;
type SafetyItem = { detail: string; id: string; kind: Kind; occurredOn: string; status: string; summary?: string; title: string };

const inputClass = "min-h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = "min-h-10 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function WorkplaceSafetySurface({ canMutate, initialRecordId }: { canMutate: boolean; initialRecordId?: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [auditRows, setAuditRows] = useState<AuditLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState(initialRecordId ?? "");
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async () => {
    const [overviewResult, lookupResult, auditResult] = await Promise.all([
      listWorkplaceSafetyOverviewAction(), listWorkplaceSafetyLookupsAction(), listWorkplaceSafetyAuditLogsAction(),
    ]);
    if (overviewResult.ok) setOverview(overviewResult.data); else setError(readErrors(overviewResult));
    if (lookupResult.ok) setLookups(lookupResult.data); else setError(readErrors(lookupResult));
    if (auditResult.ok) setAuditRows(auditResult.data.rows); else setError(readErrors(auditResult));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => { if (selectedId) closeRef.current?.focus(); }, [selectedId]);

  const items = toItems(overview);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const visibleItems = items.filter((item) =>
    (filter === "all" || item.kind === filter)
    && `${item.title} ${item.detail} ${item.status}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")),
  );
  const openCount = items.filter((item) => ["DRAFT", "OPEN", "ISSUED", "PLANNED", "RECORDED"].includes(item.status)).length;

  function select(item: SafetyItem, opener: HTMLElement) {
    openerRef.current = opener;
    setSelectedId(item.id);
    window.history.replaceState(null, "", `/isg?isg=${encodeURIComponent(item.id)}`);
  }

  function closeDrawer() {
    setSelectedId("");
    window.history.replaceState(null, "", "/isg");
    openerRef.current?.focus();
  }

  function mutate(work: () => Promise<unknown>, success: string) {
    setError("");
    startTransition(async () => {
      const result = await work();
      if (!isSuccess(result)) { setError(readErrors(result)); return; }
      setNotice(success);
      await refresh();
    });
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createKind) return;
    const values = new FormData(event.currentTarget);
    const value = (key: string) => String(values.get(key) ?? "").trim();
    const optional = (key: string) => value(key) || undefined;
    setError("");
    startTransition(async () => {
      const result = createKind === "accident" ? await createSafetyWorkAccidentAction({
        classification: value("classification"), occurredOn: value("occurredOn"), personnelId: optional("personnelId"), projectId: optional("projectId"), summary: value("summary"),
      }) : createKind === "training" ? await createSafetyTrainingAction({
        durationMinutes: Number(value("durationMinutes")), name: value("name"), nextTrainingOn: optional("nextTrainingOn"), trainerName: value("trainerName"), trainingOn: value("trainingOn"), type: value("type"),
      }) : createKind === "inspection" ? await createSafetyInspectionAction({
        inspectedOn: value("inspectedOn"), inspectorName: value("inspectorName"), projectId: value("projectId"), summary: optional("summary"),
      }) : createKind === "finding" ? await createSafetyFindingAction({
        category: value("category"), dueOn: optional("dueOn"), inspectionId: value("inspectionId"), ownerPersonnelId: optional("ownerPersonnelId"), riskLevel: value("riskLevel") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", summary: value("summary"),
      }) : await createSafetyPpeIssuanceAction({
        issuedOn: value("issuedOn"), personnelId: value("personnelId"), ppeCode: value("ppeCode"), ppeType: value("ppeType"), quantity: Number(value("quantity")),
      });
      if (!result.ok) { setError(readErrors(result)); return; }
      setNotice(`${kindLabel(createKind)} kaydı oluşturuldu.`);
      setCreateKind(null);
      await refresh();
    });
  }

  const action = selected ? nextAction(selected) : null;
  const selectedAudit = selected ? auditRows.filter((row) => row.entityId === selected.id).slice(0, 8) : [];

  return (
    <section aria-label="İSG operasyon merkezi" className="mx-auto grid max-w-7xl gap-4">
      <header className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Faz 14 · Operasyon merkezi</p><h1 className="mt-1 text-xl font-bold text-content">İş Sağlığı ve Güvenliği</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">İş kazası, eğitim, saha denetimi, bulgu ve KKD zimmetini aynı tenant/firma/dönem kapsamında izleyin. Resmi kurum bildirimi yapılmaz.</p></div>
          {canMutate ? <button className={`${primaryButton} print:hidden`} onClick={() => setCreateKind("accident")} type="button">Yeni İSG kaydı</button> : <span className="rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning">Salt okunur erişim</span>}
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-3"><Metric label="Toplam kayıt" value={items.length} /><Metric label="Açık takip" value={openCount} emphasis="warning" /><Metric label="Çözülen / iade" value={items.filter((item) => ["CLOSED", "COMPLETED", "RESOLVED", "RETURNED"].includes(item.status)).length} emphasis="success" /></dl>
      </header>

      <div aria-atomic="true" aria-live="polite">{notice ? <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success">{notice}</p> : null}{error ? <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{error}</p> : null}</div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-center gap-2 border-b border-divider bg-surface-subtle p-3 print:hidden"><input aria-label="İSG kayıtlarında ara" className={`${inputClass} min-w-[12rem] flex-1`} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Kayıt, durum veya sınıflama ara" value={query} /><select aria-label="İSG kayıt türü filtresi" className={inputClass} onChange={(event) => setFilter(event.currentTarget.value as Kind | "all")} value={filter}><option value="all">Tüm kayıtlar</option>{(["accident", "training", "inspection", "finding", "ppe"] as Kind[]).map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}</select>{canMutate ? <select aria-label="Yeni İSG kayıt türü" className={inputClass} onChange={(event) => setCreateKind(event.currentTarget.value as CreateKind)} value={createKind ?? ""}><option value="" disabled>Yeni kayıt türü</option>{(["accident", "training", "inspection", "finding", "ppe"] as Kind[]).map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}</select> : null}</div>
          <div className="overflow-x-auto"><table aria-label="İSG kayıt listesi" className="min-w-[760px] w-full text-left text-sm"><thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-3 py-3">Tür</th><th className="px-3 py-3">Kayıt</th><th className="px-3 py-3">Tarih</th><th className="px-3 py-3">Durum</th><th className="px-3 py-3 print:hidden">Detay</th></tr></thead><tbody className="divide-y divide-divider">{!overview ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>İSG kayıtları yükleniyor…</td></tr> : null}{overview && !visibleItems.length ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>Bu filtrede İSG kaydı bulunmuyor.</td></tr> : null}{visibleItems.map((item) => <tr className={selectedId === item.id ? "bg-brand-primary/5" : ""} key={`${item.kind}-${item.id}`}><td className="px-3 py-3 text-xs font-semibold text-content-muted">{kindLabel(item.kind)}</td><td className="px-3 py-3"><strong className="block text-content">{item.title}</strong><span className="block max-w-md truncate text-xs text-content-muted">{item.detail}</span></td><td className="px-3 py-3 font-mono text-xs text-content">{formatDate(item.occurredOn)}</td><td className="px-3 py-3"><StatusBadge status={item.status} /></td><td className="px-3 py-3 print:hidden"><button className={secondaryButton} onClick={(event) => select(item, event.currentTarget)} type="button">Aç</button></td></tr>)}</tbody></table></div>
        </article>
        <aside aria-label="İSG kullanım notları" className="space-y-3 print:hidden"><section className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h2 className="text-sm font-bold text-content">Güvenli işlem sınırı</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-content-muted"><li>Her yazma isteğinde oturum, rol ve dönem tekrar denetlenir.</li><li>Audit kaydı işlem/durum bilgisini taşır; serbest olay özeti taşımaz.</li><li>Resmi bildirim, sağlık verisi ve otomatik ceza/bordro işlemi kapsam dışıdır.</li></ul></section><section className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h2 className="text-sm font-bold text-content">Durum işaretleri</h2><p className="mt-2 text-sm text-content-muted">Renk yanında metin durumları kullanılır; tablo yazdırılabilir ve mobilde yatay kaydırılır.</p></section></aside>
      </div>

      {selected ? <DetailDrawer auditRows={selectedAudit} canMutate={canMutate} item={selected} lookups={lookups} onAttendance={(trainingId, personnelId) => mutate(() => recordSafetyTrainingAttendanceAction({ personnelId, trainingId }), "Eğitim katılımı kaydedildi.")} onClose={closeDrawer} onTransition={() => action ? mutate(action.run, action.label) : undefined} pending={pending} transitionLabel={action?.label} /> : null}
      {createKind ? <CreateDialog inspections={overview?.inspections ?? []} kind={createKind} lookups={lookups} onCancel={() => setCreateKind(null)} onSubmit={submitCreate} pending={pending} /> : null}
    </section>
  );
}

function DetailDrawer({ auditRows, canMutate, item, lookups, onAttendance, onClose, onTransition, pending, transitionLabel }: { auditRows: AuditLogEntry[]; canMutate: boolean; item: SafetyItem; lookups: Lookups | null; onAttendance: (trainingId: string, personnelId: string) => void; onClose: () => void; onTransition: () => void; pending: boolean; transitionLabel?: string }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return <div aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-content/45 p-0 sm:p-4 print:static print:bg-transparent" onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }} role="dialog"><article aria-labelledby="isg-drawer-title" className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-xl sm:rounded-ui-panel sm:border sm:border-divider sm:p-5 print:max-w-none print:shadow-none"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">{kindLabel(item.kind)}</p><h2 className="mt-1 text-xl font-bold text-content" id="isg-drawer-title">{item.title}</h2><p className="mt-2 text-sm leading-6 text-content-muted">{item.summary || item.detail}</p></div><button aria-label="İSG detayını kapat" className={`${secondaryButton} print:hidden`} disabled={pending} onClick={onClose} ref={closeRef} type="button">Kapat</button></div><dl className="mt-5 grid gap-2 sm:grid-cols-2"><Metric label="Tarih" value={formatDate(item.occurredOn)} /><Metric label="Durum" value={statusLabel(item.status)} /></dl>{canMutate && transitionLabel ? <div className="mt-5 flex flex-wrap gap-2 print:hidden"><button className={primaryButton} disabled={pending} onClick={onTransition} type="button">{pending ? "İşleniyor…" : transitionLabel}</button></div> : null}{canMutate && item.kind === "training" ? <form aria-label="Eğitim katılımı ekle" className="mt-5 rounded-ui-control border border-divider bg-surface-subtle p-3 print:hidden" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onAttendance(item.id, String(data.get("personnelId") ?? "")); }}><label className="block text-sm font-semibold text-content" htmlFor="isg-training-personnel">Katılım kaydı</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><select className={inputClass} id="isg-training-personnel" name="personnelId" required><option value="">Personel seçin</option>{lookups?.personnel.map((person) => <option key={person.code} value={person.code}>{person.code} · {person.name}</option>)}</select><button className={primaryButton} disabled={pending} type="submit">Katılım ekle</button></div></form> : null}<section className="mt-5"><h3 className="text-sm font-bold text-content">Audit geçmişi</h3>{auditRows.length ? <ol className="mt-3 space-y-2">{auditRows.map((row) => <li className="flex flex-wrap justify-between gap-2 rounded-ui-control border border-divider p-3 text-xs" key={row.id}><span className="font-semibold text-content">{auditLabel(row.action)}</span><time className="font-mono text-content-muted">{formatDateTime(row.occurredAt)}</time></li>)}</ol> : <p className="mt-2 rounded-ui-control border border-dashed border-divider p-3 text-sm text-content-muted">Bu kayıt için görünür audit olayı yok.</p>}</section></article></div>;
}

function CreateDialog({ inspections, kind, lookups, onCancel, onSubmit, pending }: { inspections: SafetyInspectionRow[]; kind: CreateKind; lookups: Lookups | null; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  const title = `${kindLabel(kind)} kaydı oluştur`;
  const today = new Date().toISOString().slice(0, 10);
  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-content/45 p-4 print:hidden" role="dialog"><form aria-labelledby="isg-create-title" className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl" onSubmit={onSubmit}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Yeni kayıt</p><h2 className="mt-1 text-lg font-bold text-content" id="isg-create-title">{title}</h2></div><button aria-label="İSG kayıt formunu kapat" className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Kapat</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Fields inspections={inspections} kind={kind} lookups={lookups} today={today} /></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Vazgeç</button><button className={primaryButton} disabled={pending} type="submit">{pending ? "Kaydediliyor…" : "Kaydı oluştur"}</button></div></form></div>;
}

function Fields({ inspections, kind, lookups, today }: { inspections: SafetyInspectionRow[]; kind: CreateKind; lookups: Lookups | null; today: string }) {
  const personnel = <Field label="Personel"><select className={inputClass} name="personnelId"><option value="">Personel seçilmedi</option>{lookups?.personnel.map((row) => <option key={row.code} value={row.code}>{row.code} · {row.name}</option>)}</select></Field>;
  const project = <Field label="Proje / şantiye"><select className={inputClass} name="projectId"><option value="">Proje seçilmedi</option>{lookups?.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></Field>;
  if (kind === "accident") return <><Field label="Kaza sınıflaması"><input className={inputClass} name="classification" required /></Field><Field label="Olay tarihi"><input className={inputClass} defaultValue={today} name="occurredOn" required type="date" /></Field>{project}{personnel}<Field full label="Olay özeti"><textarea className={inputClass} name="summary" required rows={3} /></Field></>;
  if (kind === "training") return <><Field label="Eğitim adı"><input className={inputClass} name="name" required /></Field><Field label="Eğitim türü"><input className={inputClass} name="type" placeholder="Temel / periyodik" required /></Field><Field label="Eğitmen"><input className={inputClass} name="trainerName" required /></Field><Field label="Eğitim tarihi"><input className={inputClass} defaultValue={today} name="trainingOn" required type="date" /></Field><Field label="Süre (dakika)"><input className={inputClass} min="1" name="durationMinutes" required type="number" /></Field><Field label="Sonraki eğitim"><input className={inputClass} name="nextTrainingOn" type="date" /></Field></>;
  if (kind === "inspection") return <><Field label="Proje / şantiye"><select className={inputClass} name="projectId" required><option value="">Proje seçin</option>{lookups?.projects.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></Field><Field label="Denetim tarihi"><input className={inputClass} defaultValue={today} name="inspectedOn" required type="date" /></Field><Field full label="Denetleyen"><input className={inputClass} name="inspectorName" required /></Field><Field full label="Checklist / özet"><textarea className={inputClass} name="summary" rows={3} /></Field></>;
  if (kind === "finding") return <><Field label="Saha denetimi"><select className={inputClass} name="inspectionId" required><option value="">Denetim seçin</option>{inspections.map((row) => <option key={row.id} value={row.id}>{formatDate(row.inspectedOn)} · {row.inspectorName}</option>)}</select></Field><Field label="Kategori"><input className={inputClass} name="category" required /></Field><Field label="Risk seviyesi"><select className={inputClass} defaultValue="MEDIUM" name="riskLevel"><option value="LOW">Düşük</option><option value="MEDIUM">Orta</option><option value="HIGH">Yüksek</option><option value="CRITICAL">Kritik</option></select></Field><Field label="Hedef tarih"><input className={inputClass} name="dueOn" type="date" /></Field><Field label="Sorumlu personel"><select className={inputClass} name="ownerPersonnelId"><option value="">Sorumlu seçilmedi</option>{lookups?.personnel.map((row) => <option key={row.code} value={row.code}>{row.code} · {row.name}</option>)}</select></Field><Field full label="Bulgu özeti"><textarea className={inputClass} name="summary" required rows={3} /></Field></>;
  return <><Field label="Personel"><select className={inputClass} name="personnelId" required><option value="">Personel seçin</option>{lookups?.personnel.map((row) => <option key={row.code} value={row.code}>{row.code} · {row.name}</option>)}</select></Field><Field label="Teslim tarihi"><input className={inputClass} defaultValue={today} name="issuedOn" required type="date" /></Field><Field label="KKD kodu"><input className={inputClass} name="ppeCode" required /></Field><Field label="KKD tipi"><input className={inputClass} name="ppeType" required /></Field><Field label="Miktar"><input className={inputClass} min="1" name="quantity" required type="number" /></Field></>;
}

function Field({ children, full = false, label }: { children: React.ReactNode; full?: boolean; label: string }) { return <label className={full ? "grid gap-1 text-sm font-semibold text-content sm:col-span-2" : "grid gap-1 text-sm font-semibold text-content"}>{label}{children}</label>; }
function Metric({ emphasis, label, value }: { emphasis?: "success" | "warning"; label: string; value: number | string }) { return <div className="rounded-ui-control border border-divider bg-surface-subtle p-3"><dt className="text-xs font-semibold text-content-muted">{label}</dt><dd className={emphasis === "warning" ? "mt-1 font-mono text-lg font-bold text-warning" : emphasis === "success" ? "mt-1 font-mono text-lg font-bold text-success" : "mt-1 font-mono text-lg font-bold text-content"}>{value}</dd></div>; }
function StatusBadge({ status }: { status: string }) { return <span className={status === "CLOSED" || status === "COMPLETED" || status === "RESOLVED" || status === "RETURNED" ? "rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success" : status === "OPEN" || status === "RECORDED" ? "rounded-full bg-danger-subtle px-2 py-1 text-xs font-semibold text-danger" : "rounded-full bg-warning-subtle px-2 py-1 text-xs font-semibold text-warning"}>{statusLabel(status)}</span>; }

function toItems(overview: Overview | null): SafetyItem[] { if (!overview) return []; return [
  ...overview.workAccidents.map((row) => ({ detail: row.classification, id: row.id, kind: "accident" as const, occurredOn: row.occurredOn, status: row.status, summary: row.summary, title: `İş kazası · ${row.classification}` })),
  ...overview.trainings.map((row) => ({ detail: `${row.type} · ${row.trainerName}`, id: row.id, kind: "training" as const, occurredOn: row.trainingOn, status: row.status, title: row.name })),
  ...overview.inspections.map((row) => ({ detail: row.inspectorName, id: row.id, kind: "inspection" as const, occurredOn: row.inspectedOn, status: row.status, summary: row.summary ?? undefined, title: "Saha denetimi" })),
  ...overview.findings.map((row) => ({ detail: `${riskLabel(row.riskLevel)} risk · ${row.category}`, id: row.id, kind: "finding" as const, occurredOn: row.dueOn ?? row.createdAt, status: row.status, summary: row.summary, title: `Bulgu · ${row.category}` })),
  ...overview.ppeIssuances.map((row) => ({ detail: `${row.ppeType} · ${row.personnelId}`, id: row.id, kind: "ppe" as const, occurredOn: row.issuedOn, status: row.status, title: row.ppeCode })),
].sort((left, right) => right.occurredOn.localeCompare(left.occurredOn)); }
function nextAction(item: SafetyItem) { if (item.kind === "accident" && item.status === "DRAFT") return { label: "Kayda al", run: () => recordSafetyWorkAccidentAction(item.id) }; if (item.kind === "accident" && item.status === "RECORDED") return { label: "Kapat", run: () => closeSafetyWorkAccidentAction(item.id) }; if (item.kind === "training" && item.status === "DRAFT") return { label: "Planla", run: () => planSafetyTrainingAction(item.id) }; if (item.kind === "training" && item.status === "PLANNED") return { label: "Tamamla", run: () => completeSafetyTrainingAction(item.id) }; if (item.kind === "inspection" && item.status === "DRAFT") return { label: "Denetimi tamamla", run: () => completeSafetyInspectionAction(item.id) }; if (item.kind === "finding" && item.status === "OPEN") return { label: "Bulgu çözümünü kaydet", run: () => resolveSafetyFindingAction(item.id) }; if (item.kind === "ppe" && item.status === "ISSUED") return { label: "KKD iadesini kaydet", run: () => returnSafetyPpeIssuanceAction(item.id) }; return null; }
function kindLabel(kind: Kind) { return ({ accident: "İş kazası", training: "Eğitim", inspection: "Saha denetimi", finding: "Bulgu", ppe: "KKD zimmeti" })[kind]; }
function statusLabel(status: string) { return ({ CLOSED: "Kapandı", COMPLETED: "Tamamlandı", DRAFT: "Taslak", ISSUED: "Teslim edildi", OPEN: "Açık", PLANNED: "Planlandı", RECORDED: "Kayda alındı", RESOLVED: "Çözüldü", RETURNED: "İade edildi" } as Record<string, string>)[status] ?? status; }
function riskLabel(risk: string) { return ({ LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", CRITICAL: "Kritik" } as Record<string, string>)[risk] ?? risk; }
function auditLabel(action: string) { return ({ "workplace-safety.work-accident.create": "İş kazası oluşturuldu", "workplace-safety.work-accident.record": "İş kazası kayda alındı", "workplace-safety.work-accident.close": "İş kazası kapatıldı", "workplace-safety.training.create": "Eğitim oluşturuldu", "workplace-safety.training.plan": "Eğitim planlandı", "workplace-safety.training.complete": "Eğitim tamamlandı", "workplace-safety.training-attendance.create": "Eğitim katılımı kaydedildi", "workplace-safety.inspection.create": "Saha denetimi oluşturuldu", "workplace-safety.inspection.complete": "Saha denetimi tamamlandı", "workplace-safety.finding.create": "Bulgu oluşturuldu", "workplace-safety.finding.resolve": "Bulgu çözüldü", "workplace-safety.ppe-issuance.create": "KKD teslim edildi", "workplace-safety.ppe-issuance.return": "KKD iade edildi" } as Record<string, string>)[action] ?? action; }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function isSuccess(value: unknown): value is { ok: true } { return typeof value === "object" && value !== null && "ok" in value && value.ok === true; }
function readErrors(value: unknown) { return typeof value === "object" && value !== null && "errors" in value && Array.isArray(value.errors) ? value.errors.join(" ") : "İşlem tamamlanamadı."; }
