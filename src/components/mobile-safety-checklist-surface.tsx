"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";

import {
  archiveSafetyChecklistTemplateAction,
  completeSafetyChecklistRunAction,
  createSafetyChecklistRunAction,
  createSafetyChecklistTemplateAction,
  linkSafetyChecklistResponseFindingAction,
  listMobileSafetyChecklistAuditLogsAction,
  listMobileSafetyChecklistOverviewAction,
  recordSafetyChecklistResponseAction,
} from "@/app/actions/mobile-safety-checklist-actions";
import { listWorkplaceSafetyLookupsAction, listWorkplaceSafetyOverviewAction } from "@/app/actions/workplace-safety-actions";
import type { AuditLogEntry } from "@/lib/audit-log";
import type { SafetyChecklistResponseStatus } from "@/lib/mobile-safety-checklist";

type ChecklistOverview = Extract<Awaited<ReturnType<typeof listMobileSafetyChecklistOverviewAction>>, { ok: true }>["data"];
type SafetyOverview = Extract<Awaited<ReturnType<typeof listWorkplaceSafetyOverviewAction>>, { ok: true }>["data"];
type SafetyLookups = Extract<Awaited<ReturnType<typeof listWorkplaceSafetyLookupsAction>>, { ok: true }>["data"];

const inputClass = "min-h-11 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton = "min-h-11 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "min-h-11 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function MobileSafetyChecklistSurface({ canMutate, initialRunId }: { canMutate: boolean; initialRunId?: string }) {
  const [overview, setOverview] = useState<ChecklistOverview | null>(null);
  const [safetyOverview, setSafetyOverview] = useState<SafetyOverview | null>(null);
  const [lookups, setLookups] = useState<SafetyLookups | null>(null);
  const [auditRows, setAuditRows] = useState<AuditLogEntry[]>([]);
  const [selectedRunId, setSelectedRunId] = useState(initialRunId ?? "");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"run" | "template" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [findingIds, setFindingIds] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async () => {
    const [checklistResult, safetyResult, lookupResult, auditResult] = await Promise.all([
      listMobileSafetyChecklistOverviewAction(), listWorkplaceSafetyOverviewAction(), listWorkplaceSafetyLookupsAction(), listMobileSafetyChecklistAuditLogsAction(),
    ]);
    if (checklistResult.ok) setOverview(checklistResult.data); else setError(readErrors(checklistResult));
    if (safetyResult.ok) setSafetyOverview(safetyResult.data); else setError(readErrors(safetyResult));
    if (lookupResult.ok) setLookups(lookupResult.data); else setError(readErrors(lookupResult));
    if (auditResult.ok) setAuditRows(auditResult.data.rows); else setError(readErrors(auditResult));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => { if (selectedRunId) closeRef.current?.focus(); }, [selectedRunId]);

  const selectedRun = overview?.runs.find((row) => row.id === selectedRunId) ?? null;
  const selectedTemplate = selectedRun ? overview?.templates.find((row) => row.id === selectedRun.templateId) ?? null : null;
  const selectedItems = useMemo(() => selectedRun ? (overview?.templateItems.filter((row) => row.templateId === selectedRun.templateId) ?? []) : [], [overview?.templateItems, selectedRun]);
  const selectedResponses = useMemo(() => selectedRun ? (overview?.responses.filter((row) => row.runId === selectedRun.id) ?? []) : [], [overview?.responses, selectedRun]);
  const projectLabels = new Map((lookups?.projects ?? []).map((project) => [project.id, `${project.code} · ${project.name}`]));
  const visibleRuns = (overview?.runs ?? []).filter((row) => `${row.inspectorName} ${projectLabels.get(row.projectId) ?? row.projectId} ${row.status}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")));
  const activeTemplates = overview?.templates.filter((row) => row.status === "ACTIVE") ?? [];
  const selectedAudit = selectedRun ? auditRows.filter((row) => row.entityId === selectedRun.id || selectedResponses.some((response) => response.id === row.entityId)) : [];

  function selectRun(id: string, opener: HTMLElement) {
    openerRef.current = opener;
    setSelectedRunId(id);
    window.history.replaceState(null, "", `/isg?checklist=${encodeURIComponent(id)}`);
  }

  function closeDrawer() {
    setSelectedRunId("");
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

  function submitTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const items = parseItems(String(data.get("items") ?? ""));
    mutate(async () => {
      const result = await createSafetyChecklistTemplateAction({ description: value(data, "description") || undefined, items, title: value(data, "title") });
      if (result.ok) setDialog(null);
      return result;
    }, "Kontrol şablonu oluşturuldu.");
  }

  function submitRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    mutate(async () => {
      const result = await createSafetyChecklistRunAction({
        inspectionId: value(data, "inspectionId") || undefined,
        values: { inspectedOn: value(data, "inspectedOn"), inspectorName: value(data, "inspectorName"), projectId: value(data, "projectId"), requestKey: createRequestKey(), templateId: value(data, "templateId") },
      });
      if (result.ok) {
        setDialog(null);
        setSelectedRunId(result.data.row.id);
        window.history.replaceState(null, "", `/isg?checklist=${encodeURIComponent(result.data.row.id)}`);
      }
      return result;
    }, "Saha kontrolü oluşturuldu.");
  }

  return <section aria-label="Mobil İSG kontrol listeleri" className="mx-auto grid max-w-7xl gap-4">
    <header className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Faz 17 · Mobil saha kontrolü</p><h2 className="mt-1 text-xl font-bold text-content">Mobil İSG Kontrol Listeleri</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">Şantiye turunu telefonda tek kolonla tamamlayın. Uygunsuz yanıtlar otomatik bulgu veya bildirim üretmez.</p></div>{canMutate ? <div className="flex flex-wrap gap-2 print:hidden"><button className={secondaryButton} onClick={() => setDialog("template")} type="button">Yeni kontrol şablonu</button><button className={primaryButton} onClick={() => setDialog("run")} type="button">Yeni saha kontrolü</button></div> : <span className="rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning">Salt okunur erişim</span>}</div>
      <dl className="mt-4 grid gap-2 sm:grid-cols-3"><Metric label="Aktif şablon" value={activeTemplates.length} /><Metric label="Taslak saha kontrolü" value={(overview?.runs.filter((row) => row.status === "DRAFT").length ?? 0)} emphasis="warning" /><Metric label="Tamamlanan" value={(overview?.runs.filter((row) => row.status === "COMPLETED").length ?? 0)} emphasis="success" /></dl>
    </header>

    <div aria-atomic="true" aria-live="polite">{notice ? <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success">{notice}</p> : null}{error ? <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{error}</p> : null}</div>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <article className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none"><div className="flex flex-wrap items-center gap-2 border-b border-divider bg-surface-subtle p-3 print:hidden"><input aria-label="Kontrol listelerinde ara" className={`${inputClass} min-w-[12rem] flex-1`} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Denetleyen, proje veya durum ara" value={query} /></div><div className="overflow-x-auto"><table aria-label="Mobil İSG saha kontrol listesi" className="min-w-[720px] w-full text-left text-sm"><thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-3 py-3">Kontrol</th><th className="px-3 py-3">Şablon</th><th className="px-3 py-3">Tarih</th><th className="px-3 py-3">Durum</th><th className="px-3 py-3 print:hidden">Detay</th></tr></thead><tbody className="divide-y divide-divider">{!overview ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>Kontrol listeleri yükleniyor…</td></tr> : null}{overview && !visibleRuns.length ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={5}>Bu filtrede saha kontrolü bulunmuyor.</td></tr> : null}{visibleRuns.map((row) => <tr className={row.id === selectedRunId ? "bg-brand-primary/5" : ""} key={row.id}><td className="px-3 py-3"><strong className="block text-content">{row.inspectorName}</strong><span className="text-xs text-content-muted">{projectLabels.get(row.projectId) ?? row.projectId}</span></td><td className="px-3 py-3 text-content">{overview?.templates.find((template) => template.id === row.templateId)?.title ?? "Arşivlenmiş şablon"}</td><td className="px-3 py-3 font-mono text-xs text-content">{formatDate(row.inspectedOn)}</td><td className="px-3 py-3"><StatusBadge status={row.status} /></td><td className="px-3 py-3 print:hidden"><button className={secondaryButton} onClick={(event) => selectRun(row.id, event.currentTarget)} type="button">Aç</button></td></tr>)}</tbody></table></div></article>
      <aside aria-label="Kontrol listesi şablonları" className="space-y-3 print:hidden"><section className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h3 className="text-sm font-bold text-content">Şablonlar</h3><ul className="mt-3 space-y-2">{!overview ? <li className="text-sm text-content-muted">Şablonlar yükleniyor…</li> : null}{overview?.templates.map((template) => <li className="rounded-ui-control border border-divider p-3" key={template.id}><strong className="block text-sm text-content">{template.title}</strong><span className="mt-1 block text-xs text-content-muted">{template.status === "ACTIVE" ? "Aktif" : "Arşivlendi"} · {overview?.templateItems.filter((item) => item.templateId === template.id).length ?? 0} madde</span>{canMutate && template.status === "ACTIVE" ? <button className="mt-2 text-xs font-semibold text-danger hover:underline" disabled={pending} onClick={() => mutate(() => archiveSafetyChecklistTemplateAction(template.id), "Kontrol şablonu arşivlendi.")} type="button">Şablonu arşivle</button> : null}</li>)}</ul></section><section className="rounded-ui-panel border border-divider bg-surface-raised p-4"><h3 className="text-sm font-bold text-content">Güvenli sınır</h3><p className="mt-2 text-sm leading-6 text-content-muted">Offline, kamera, konum ve otomatik bulgu yoktur. Her yanıt ve tamamlama sunucuda tekrar doğrulanır.</p></section></aside>
    </div>

    {selectedRun && selectedTemplate ? <RunDrawer auditRows={selectedAudit} canMutate={canMutate} findingIds={findingIds} findings={safetyOverview?.findings ?? []} items={selectedItems} notes={notes} onClose={closeDrawer} onComplete={() => mutate(() => completeSafetyChecklistRunAction(selectedRun.id), "Saha kontrolü tamamlandı.")} onFinding={(responseId) => mutate(() => linkSafetyChecklistResponseFindingAction({ findingId: findingIds[responseId] ?? "", responseId }), "Uygunsuz yanıt mevcut bulguya bağlandı.")} onFindingIdChange={(responseId, findingId) => setFindingIds((current) => ({ ...current, [responseId]: findingId }))} onNoteChange={(itemId, note) => setNotes((current) => ({ ...current, [itemId]: note }))} onRespond={(itemId, response) => mutate(() => recordSafetyChecklistResponseAction({ checklistItemId: itemId, checklistRunId: selectedRun.id, note: notes[itemId], response }), "Kontrol yanıtı kaydedildi.")} pending={pending} projectLabel={projectLabels.get(selectedRun.projectId) ?? selectedRun.projectId} responses={selectedResponses} run={selectedRun} template={selectedTemplate} closeRef={closeRef} /> : null}
    {dialog === "template" ? <TemplateDialog onCancel={() => setDialog(null)} onSubmit={submitTemplate} pending={pending} /> : null}
    {dialog === "run" ? <RunDialog inspections={safetyOverview?.inspections ?? []} onCancel={() => setDialog(null)} onSubmit={submitRun} pending={pending} projects={lookups?.projects ?? []} templates={activeTemplates} /> : null}
  </section>;
}

function RunDrawer({ auditRows, canMutate, closeRef, findingIds, findings, items, notes, onClose, onComplete, onFinding, onFindingIdChange, onNoteChange, onRespond, pending, projectLabel, responses, run, template }: { auditRows: AuditLogEntry[]; canMutate: boolean; closeRef: React.RefObject<HTMLButtonElement | null>; findingIds: Record<string, string>; findings: SafetyOverview["findings"]; items: ChecklistOverview["templateItems"]; notes: Record<string, string>; onClose: () => void; onComplete: () => void; onFinding: (responseId: string) => void; onFindingIdChange: (responseId: string, findingId: string) => void; onNoteChange: (itemId: string, note: string) => void; onRespond: (itemId: string, response: SafetyChecklistResponseStatus) => void; pending: boolean; projectLabel: string; responses: ChecklistOverview["responses"]; run: ChecklistOverview["runs"][number]; template: ChecklistOverview["templates"][number] }) {
  const responseByItem = new Map(responses.map((row) => [row.checklistItemId, row]));
  const answeredCount = responses.length;
  return <div aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-content/45 p-0 sm:p-4 print:static print:bg-transparent" onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }} role="dialog"><article aria-labelledby="mobile-checklist-drawer-title" className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-xl sm:rounded-ui-panel sm:border sm:border-divider sm:p-5 print:max-w-none print:shadow-none"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Mobil saha kontrolü</p><h2 className="mt-1 text-xl font-bold text-content" id="mobile-checklist-drawer-title">{template.title}</h2><p className="mt-2 text-sm leading-6 text-content-muted">{formatDate(run.inspectedOn)} · {run.inspectorName} · {projectLabel}</p></div><button aria-label="Mobil kontrol detayını kapat" className={`${secondaryButton} print:hidden`} disabled={pending} onClick={onClose} ref={closeRef} type="button">Kapat</button></div><dl className="mt-5 grid gap-2 sm:grid-cols-2"><Metric label="Yanıtlanan madde" value={`${answeredCount} / ${items.length}`} /><Metric label="Durum" value={run.status === "COMPLETED" ? "Tamamlandı" : "Taslak"} emphasis={run.status === "COMPLETED" ? "success" : "warning"} /></dl><div className="mt-5 space-y-3">{items.map((item) => { const response = responseByItem.get(item.id); return <section className="rounded-ui-panel border border-divider bg-surface-subtle p-4" key={item.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold text-content-muted">{item.category ?? "Genel"}</p><h3 className="mt-1 text-sm font-bold text-content">{item.sortOrder}. {item.title}</h3></div>{response ? <ResponseBadge response={response.response} /> : <span className="rounded-full bg-warning-subtle px-2 py-1 text-xs font-semibold text-warning">Yanıt bekliyor</span>}</div>{response ? <><p className="mt-2 text-sm text-content-muted">{response.note || "Not girilmedi."}</p>{canMutate && response.response === "FAIL" && !response.findingId ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select aria-label={`${item.title} için mevcut bulgu`} className={inputClass} onChange={(event) => onFindingIdChange(response.id, event.currentTarget.value)} value={findingIds[response.id] ?? ""}><option value="">Mevcut bulgu seçin</option>{findings.map((finding) => <option key={finding.id} value={finding.id}>{finding.category} · {finding.riskLevel}</option>)}</select><button className={secondaryButton} disabled={pending || !(findingIds[response.id] ?? "")} onClick={() => onFinding(response.id)} type="button">Mevcut bulguya bağla</button></div> : null}{response.findingId ? <p className="mt-3 text-xs font-semibold text-success">Mevcut bulguya bağlandı.</p> : null}</> : canMutate && run.status === "DRAFT" ? <div className="mt-3"><label className="block text-sm font-semibold text-content" htmlFor={`checklist-note-${item.id}`}>Kısa not <span className="font-normal text-content-muted">(isteğe bağlı)</span></label><textarea className={`${inputClass} mt-2`} id={`checklist-note-${item.id}`} onChange={(event) => onNoteChange(item.id, event.currentTarget.value)} rows={2} value={notes[item.id] ?? ""} /><div className="mt-3 grid gap-2 sm:grid-cols-3"><button className={primaryButton} disabled={pending} onClick={() => onRespond(item.id, "PASS")} type="button">Uygun</button><button className={secondaryButton} disabled={pending} onClick={() => onRespond(item.id, "FAIL")} type="button">Uygunsuz</button><button className={secondaryButton} disabled={pending} onClick={() => onRespond(item.id, "NOT_APPLICABLE")} type="button">Uygulanamaz</button></div></div> : null}</section>; })}</div>{canMutate && run.status === "DRAFT" ? <div className="mt-5 flex justify-end print:hidden"><button className={primaryButton} disabled={pending || answeredCount !== items.length} onClick={onComplete} type="button">{pending ? "İşleniyor…" : "Kontrolü tamamla"}</button></div> : null}<section className="mt-5"><h3 className="text-sm font-bold text-content">Audit geçmişi</h3>{auditRows.length ? <ol className="mt-3 space-y-2">{auditRows.slice(0, 8).map((row) => <li className="flex flex-wrap justify-between gap-2 rounded-ui-control border border-divider p-3 text-xs" key={row.id}><span className="font-semibold text-content">{auditLabel(row.action)}</span><time className="font-mono text-content-muted">{formatDateTime(row.occurredAt)}</time></li>)}</ol> : <p className="mt-2 rounded-ui-control border border-dashed border-divider p-3 text-sm text-content-muted">Bu kontrol için görünür audit olayı yok.</p>}</section></article></div>;
}

function TemplateDialog({ onCancel, onSubmit, pending }: { onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) { return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-content/45 p-4 print:hidden" role="dialog"><form aria-labelledby="checklist-template-title" className="w-full max-w-xl rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl" onSubmit={onSubmit}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Yeni şablon</p><h2 className="mt-1 text-lg font-bold text-content" id="checklist-template-title">Mobil kontrol şablonu oluştur</h2></div><button aria-label="Kontrol şablonu formunu kapat" className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Kapat</button></div><div className="mt-5 grid gap-3"><Field label="Şablon başlığı"><input className={inputClass} name="title" required /></Field><Field label="Kısa açıklama"><textarea className={inputClass} name="description" rows={2} /></Field><Field label="Kontrol maddeleri"><textarea aria-describedby="checklist-item-help" className={inputClass} name="items" placeholder={"Şantiye | Baret kullanımı\nElektrik | Pano kapalı mı?"} required rows={7} /></Field><p className="text-xs leading-5 text-content-muted" id="checklist-item-help">Her satıra bir madde yazın. İsteğe bağlı kategori için `Kategori | Madde` biçimini kullanın.</p></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Vazgeç</button><button className={primaryButton} disabled={pending} type="submit">{pending ? "Kaydediliyor…" : "Şablonu oluştur"}</button></div></form></div>; }

function RunDialog({ inspections, onCancel, onSubmit, pending, projects, templates }: { inspections: SafetyOverview["inspections"]; onCancel: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean; projects: SafetyLookups["projects"]; templates: ChecklistOverview["templates"] }) { const today = new Date().toISOString().slice(0, 10); return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-content/45 p-4 print:hidden" role="dialog"><form aria-labelledby="checklist-run-title" className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl" onSubmit={onSubmit}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Yeni saha kontrolü</p><h2 className="mt-1 text-lg font-bold text-content" id="checklist-run-title">Mobil İSG kontrolünü başlat</h2></div><button aria-label="Saha kontrolü formunu kapat" className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Kapat</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Kontrol şablonu"><select className={inputClass} name="templateId" required><option value="">Şablon seçin</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></Field><Field label="Proje / şantiye"><select className={inputClass} name="projectId" required><option value="">Proje seçin</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</select></Field><Field label="Kontrol tarihi"><input className={inputClass} defaultValue={today} name="inspectedOn" required type="date" /></Field><Field label="Denetleyen"><input className={inputClass} name="inspectorName" required /></Field><Field full label="Mevcut İSG denetimi"><select className={inputClass} name="inspectionId"><option value="">Bağlantı kurma</option>{inspections.map((inspection) => <option key={inspection.id} value={inspection.id}>{formatDate(inspection.inspectedOn)} · {inspection.inspectorName}</option>)}</select></Field></div><div className="mt-5 flex flex-wrap justify-end gap-2"><button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Vazgeç</button><button className={primaryButton} disabled={pending || templates.length === 0} type="submit">{pending ? "Başlatılıyor…" : "Kontrolü başlat"}</button></div></form></div>; }

function Field({ children, full = false, label }: { children: React.ReactNode; full?: boolean; label: string }) { return <label className={full ? "grid gap-1 text-sm font-semibold text-content sm:col-span-2" : "grid gap-1 text-sm font-semibold text-content"}>{label}{children}</label>; }
function Metric({ emphasis, label, value }: { emphasis?: "success" | "warning"; label: string; value: number | string }) { return <div className="rounded-ui-control border border-divider bg-surface-subtle p-3"><dt className="text-xs font-semibold text-content-muted">{label}</dt><dd className={emphasis === "warning" ? "mt-1 font-mono text-lg font-bold text-warning" : emphasis === "success" ? "mt-1 font-mono text-lg font-bold text-success" : "mt-1 font-mono text-lg font-bold text-content"}>{value}</dd></div>; }
function StatusBadge({ status }: { status: string }) { return <span className={status === "COMPLETED" ? "rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success" : "rounded-full bg-warning-subtle px-2 py-1 text-xs font-semibold text-warning"}>{status === "COMPLETED" ? "Tamamlandı" : "Taslak"}</span>; }
function ResponseBadge({ response }: { response: SafetyChecklistResponseStatus }) { const label = response === "PASS" ? "Uygun" : response === "FAIL" ? "Uygunsuz" : "Uygulanamaz"; const color = response === "PASS" ? "bg-success-subtle text-success" : response === "FAIL" ? "bg-danger-subtle text-danger" : "bg-warning-subtle text-warning"; return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>{label}</span>; }
function parseItems(value: string) { return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [category, ...rest] = line.split("|"); return rest.length ? { category: category.trim(), title: rest.join("|").trim() } : { title: category.trim() }; }); }
function value(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function createRequestKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
function auditLabel(action: string) { return ({ "mobile-safety-checklist.template.create": "Şablon oluşturuldu", "mobile-safety-checklist.template.archive": "Şablon arşivlendi", "mobile-safety-checklist.run.create": "Saha kontrolü başlatıldı", "mobile-safety-checklist.response.record": "Kontrol yanıtı kaydedildi", "mobile-safety-checklist.run.complete": "Saha kontrolü tamamlandı", "mobile-safety-checklist.response.finding-link": "Mevcut bulgu bağlandı" } as Record<string, string>)[action] ?? action; }
function isSuccess(value: unknown): value is { data: { row: { id: string } }; ok: true } { return typeof value === "object" && value !== null && "ok" in value && value.ok === true; }
function readErrors(value: unknown) { return typeof value === "object" && value !== null && "errors" in value && Array.isArray(value.errors) ? value.errors.join(" ") : "İşlem tamamlanamadı."; }
