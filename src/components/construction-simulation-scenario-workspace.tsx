"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";

import {
  approveConstructionSimulationScenarioAction,
  archiveConstructionSimulationScenarioAction,
  cloneConstructionSimulationScenarioAction,
  compareConstructionSimulationScenariosAction,
  createConstructionSimulationScenarioAction,
  getConstructionSimulationScenarioAction,
  listConstructionSimulationScenariosAction,
  reviseConstructionSimulationScenarioAction,
  type ConstructionSimulationActionLineInput,
} from "@/app/actions/construction-simulation-scenario-actions";

export type ConstructionSimulationDraft = {
  contractItemId: string;
  itemCode: string;
  description: string;
  unit: string;
  proposedQuantity: number;
  currentCumulative: number;
  projectedCumulative: number;
  contractQuantity: number;
  projectedRemaining: number;
  projectedAmount: number;
  actionLine: ConstructionSimulationActionLineInput;
};

type ScenarioListData = Extract<
  Awaited<ReturnType<typeof listConstructionSimulationScenariosAction>>,
  { ok: true }
>["data"];
type ScenarioDetailData = Extract<
  Awaited<ReturnType<typeof getConstructionSimulationScenarioAction>>,
  { ok: true }
>["data"];
type ComparisonData = Extract<
  Awaited<ReturnType<typeof compareConstructionSimulationScenariosAction>>,
  { ok: true }
>["data"];
type ConfirmState = { type: "approve" | "archive"; id: string; label: string };

const fieldClass = "min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70";
const primaryButton = "min-h-10 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition-colors hover:border-outline-strong hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function ConstructionSimulationScenarioWorkspace({
  draft,
  initialScenarioId,
  projectId,
  sourceProgressPaymentId,
}: {
  draft: ConstructionSimulationDraft | null;
  initialScenarioId?: string;
  projectId: string;
  sourceProgressPaymentId: string;
}) {
  const [data, setData] = useState<ScenarioListData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialScenarioId ?? null);
  const [detail, setDetail] = useState<ScenarioDetailData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [compareLeftId, setCompareLeftId] = useState(initialScenarioId ?? "");
  const [compareRightId, setCompareRightId] = useState("");
  const [compareHistories, setCompareHistories] = useState<Record<string, ScenarioDetailData>>({});
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [pending, startTransition] = useTransition();
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);

  const loadList = useCallback(async () => {
    const result = await listConstructionSimulationScenariosAction(projectId);
    if (result.ok) {
      setData(result.data);
      setMessage(null);
      const fallbackId = initialScenarioId ?? result.data.rows[0]?.id ?? null;
      setSelectedId((current) => current ?? fallbackId);
      setCompareLeftId((current) => current || fallbackId || "");
      setCompareRightId((current) => current || result.data.rows.find((row) => row.id !== fallbackId)?.id || fallbackId || "");
    } else {
      setData(null);
      setMessage(readErrors(result));
    }
  }, [initialScenarioId, projectId]);

  const loadDetail = useCallback(async (scenarioId: string) => {
    const result = await getConstructionSimulationScenarioAction(scenarioId);
    if (result.ok) {
      setDetail(result.data);
      setCompareHistories((current) => ({ ...current, [scenarioId]: result.data }));
      setMessage(null);
    } else {
      setDetail(null);
      setMessage(readErrors(result));
    }
  }, []);

  useEffect(() => {
    let active = true;
    void listConstructionSimulationScenariosAction(projectId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setData(result.data);
        setMessage(null);
        const fallbackId = initialScenarioId ?? result.data.rows[0]?.id ?? null;
        setSelectedId((current) => current ?? fallbackId);
        setCompareLeftId((current) => current || fallbackId || "");
        setCompareRightId((current) => current || result.data.rows.find((row) => row.id !== fallbackId)?.id || fallbackId || "");
      } else {
        setData(null);
        setMessage(readErrors(result));
      }
    });
    return () => { active = false; };
  }, [initialScenarioId, projectId]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void getConstructionSimulationScenarioAction(selectedId).then((result) => {
      if (!active) return;
      if (result.ok) {
        setDetail(result.data);
        setCompareHistories((current) => ({ ...current, [selectedId]: result.data }));
        setMessage(null);
      } else {
        setDetail(null);
        setMessage(readErrors(result));
      }
    });
    return () => { active = false; };
  }, [selectedId]);
  useEffect(() => {
    for (const id of [compareLeftId, compareRightId]) {
      if (id && !compareHistories[id]) {
        void getConstructionSimulationScenarioAction(id).then((result) => {
          if (result.ok) setCompareHistories((current) => ({ ...current, [id]: result.data }));
        });
      }
    }
  }, [compareHistories, compareLeftId, compareRightId]);
  useEffect(() => {
    if (!pending && !confirm && shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      returnFocusRef.current?.focus();
    }
  }, [confirm, pending]);

  function refreshAfterMutation(scenarioId?: string) {
    return Promise.all([loadList(), scenarioId ? loadDetail(scenarioId) : Promise.resolve()]);
  }

  function createScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createConstructionSimulationScenarioAction({
        projectId,
        sourceProgressPaymentId,
        scenarioNo: textValue(formData, "scenarioNo"),
        name: textValue(formData, "name"),
        description: textValue(formData, "description"),
        revisionNote: textValue(formData, "revisionNote"),
        lines: [draft.actionLine],
      });
      if (!result.ok) return setMessage(readErrors(result));
      const scenarioId = result.data.scenario.id;
      setSelectedId(scenarioId);
      setMessage("Simülasyon senaryosu ve R1 revizyonu kaydedildi.");
      form.reset();
      await refreshAfterMutation(scenarioId);
    });
  }

  function reviseScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !detail) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await reviseConstructionSimulationScenarioAction({
        scenarioId: detail.scenario.id,
        expectedCurrentRevisionNo: detail.scenario.currentRevisionNo,
        revisionNote: textValue(formData, "revisionNote"),
        lines: [draft.actionLine],
      });
      if (!result.ok) return setMessage(readErrors(result));
      setMessage(`R${result.data.scenario.currentRevisionNo} revizyonu kaydedildi.`);
      await refreshAfterMutation(detail.scenario.id);
    });
  }

  function cloneScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await cloneConstructionSimulationScenarioAction({
        sourceScenarioId: detail.scenario.id,
        scenarioNo: textValue(formData, "scenarioNo"),
        name: textValue(formData, "name"),
        description: textValue(formData, "description"),
        revisionNote: textValue(formData, "revisionNote"),
      });
      if (!result.ok) return setMessage(readErrors(result));
      const scenarioId = result.data.scenario.id;
      setSelectedId(scenarioId);
      setCloneOpen(false);
      setMessage("Senaryo yeni bir taslak olarak klonlandı.");
      form.reset();
      await refreshAfterMutation(scenarioId);
    });
  }

  function transitionScenario(state: ConfirmState) {
    startTransition(async () => {
      const result = state.type === "approve"
        ? await approveConstructionSimulationScenarioAction(state.id)
        : await archiveConstructionSimulationScenarioAction(state.id);
      if (!result.ok) setMessage(readErrors(result));
      else {
        setMessage(state.type === "approve" ? "Senaryo onaylandı ve değişikliklere kapatıldı." : "Senaryo arşivlendi.");
        await refreshAfterMutation(state.id);
      }
      shouldRestoreFocusRef.current = true;
      setConfirm(null);
    });
  }

  function compare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await compareConstructionSimulationScenariosAction({
        leftScenarioId: compareLeftId,
        leftRevisionNo: Number(textValue(formData, "leftRevisionNo")),
        rightScenarioId: compareRightId,
        rightRevisionNo: Number(textValue(formData, "rightRevisionNo")),
      });
      if (result.ok) {
        setComparison(result.data);
        setMessage("Senaryo revizyonları karşılaştırıldı.");
      } else {
        setComparison(null);
        setMessage(readErrors(result));
      }
    });
  }

  const rows = data?.rows ?? [];
  const selected = detail?.scenario;
  const leftHistory = compareHistories[compareLeftId];
  const rightHistory = compareHistories[compareRightId];

  return (
    <section aria-label="Kalıcı metraj simülasyon senaryoları" className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm" data-construction-simulation-scenarios="persistent">
      <header className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Faz 11 · Kalıcı çalışma alanı</p>
            <h5 className="mt-1 text-xl font-bold text-content">Simülasyon Senaryo Merkezi</h5>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">Etki hesabını revizyon geçmişi, karşılaştırma ve yönetici onayıyla saklayın. Kaynak hakediş verisi değişirse eski snapshot korunur ve uyarı gösterilir.</p>
          </div>
          <span className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-muted">{rows.length} senaryo</span>
        </div>
      </header>

      {message ? <p aria-live="polite" className="border-b border-divider bg-brand-primary/5 px-4 py-3 text-sm text-content">{message}</p> : null}

      <div className="grid gap-px bg-divider sm:grid-cols-3">
        <Metric label="Toplam senaryo" value={String(rows.length)} />
        <Metric label="Taslak" value={String(rows.filter((row) => row.status === "DRAFT").length)} />
        <Metric label="Onaylı" value={String(rows.filter((row) => row.status === "APPROVED").length)} />
      </div>

      {data?.canCreate ? (
        <form aria-label="Simülasyon senaryosu oluştur" className="grid gap-3 border-b border-divider bg-surface-subtle p-4 md:grid-cols-2 xl:grid-cols-4 sm:p-5" onSubmit={createScenario}>
          <div className="md:col-span-2 xl:col-span-4">
            <p className="text-sm font-bold text-content">Hesaplanan etkiyi senaryo olarak kaydet</p>
            <p className="mt-1 text-xs text-content-muted">{draft ? `${draft.itemCode} · ${formatQuantity(draft.proposedQuantity)} ${draft.unit} önerisi hazır.` : "Önce yukarıdaki poz bazlı etki hesabını çalıştırın."}</p>
          </div>
          <input className={fieldClass} disabled={!draft || pending} name="scenarioNo" placeholder="Senaryo no (örn. SEN-001)" required />
          <input className={fieldClass} disabled={!draft || pending} name="name" placeholder="Senaryo adı" required />
          <input className={fieldClass} disabled={!draft || pending} name="description" placeholder="Açıklama" />
          <input className={fieldClass} disabled={!draft || pending} name="revisionNote" placeholder="R1 revizyon notu" />
          <button className={primaryButton} disabled={!draft || pending} type="submit">Senaryo olarak kaydet</button>
        </form>
      ) : null}

      <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)] sm:p-5">
        <section aria-label="Simülasyon senaryo listesi" className="min-w-0">
          <h6 className="text-sm font-bold text-content">Senaryolar</h6>
          <div className="mt-3 space-y-2">
            {!data ? <p className="text-sm text-content-muted">Senaryolar yükleniyor…</p> : null}
            {data && !rows.length ? <p className="rounded-ui-control border border-divider bg-surface-subtle p-4 text-sm text-content-muted">Bu projede görünür senaryo bulunmuyor.</p> : null}
            {rows.map((row) => (
              <article className={selectedId === row.id ? "rounded-ui-control border border-brand-primary bg-brand-primary/5 p-3" : "rounded-ui-control border border-divider bg-surface-raised p-3"} key={row.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="font-mono text-xs font-bold text-brand-primary">{row.scenarioNo} · R{row.currentRevisionNo}</p><p className="mt-1 truncate text-sm font-semibold text-content">{row.name}</p></div>
                  <StatusBadge status={row.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-content-muted"><span>{formatMoney(row.currentRevision.projectedAmountTotal)} TL</span><span>{row.currentRevision.overrunLineCount} aşım</span></div>
                <div className="mt-3 flex flex-wrap gap-2"><button className={secondaryButton} onClick={() => setSelectedId(row.id)} type="button">Aç</button><a className={`${secondaryButton} inline-flex items-center`} href={`/hakedis?senaryo=${encodeURIComponent(row.id)}`}>Bağlantı</a></div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Seçili simülasyon senaryosu" className="min-w-0">
          {!selected ? <p className="rounded-ui-control border border-divider bg-surface-subtle p-4 text-sm text-content-muted">Detay için bir senaryo seçin.</p> : (
            <div className="space-y-4">
              <div className="rounded-ui-panel border border-divider bg-surface-raised p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-mono text-xs font-bold text-brand-primary">{selected.scenarioNo} · R{selected.currentRevisionNo}</p><h6 className="mt-1 text-lg font-bold text-content">{selected.name}</h6><p className="mt-1 text-sm text-content-muted">{selected.description || "Açıklama girilmemiş."}</p></div>
                  <StatusBadge status={selected.status} />
                </div>
                {detail.sourceStale ? <p className="mt-3 rounded-ui-control border border-warning/30 bg-warning-subtle p-3 text-sm text-warning"><strong>Kaynak hakediş değişti.</strong> Bu revizyonun snapshot’ı korunuyor; güncel veriyle yeni revizyon oluşturun.</p> : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-3"><Metric label="Önerilen miktar" value={formatQuantity(selected.currentRevision.proposedQuantityTotal)} /><Metric label="Tahmini tutar" value={`${formatMoney(selected.currentRevision.projectedAmountTotal)} TL`} /><Metric label="Aşan poz" value={String(selected.currentRevision.overrunLineCount)} /></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data?.canCreate ? <button className={secondaryButton} disabled={pending} onClick={() => setCloneOpen((value) => !value)} type="button">Klonla</button> : null}
                  {data?.canApprove && selected.status === "DRAFT" ? <button className={primaryButton} disabled={pending} onClick={(event) => { returnFocusRef.current = event.currentTarget; setConfirm({ type: "approve", id: selected.id, label: selected.name }); }} type="button">Onayla</button> : null}
                  {data?.canArchive && selected.status !== "ARCHIVED" ? <button className={secondaryButton} disabled={pending} onClick={(event) => { returnFocusRef.current = event.currentTarget; setConfirm({ type: "archive", id: selected.id, label: selected.name }); }} type="button">Arşivle</button> : null}
                </div>
              </div>

              {cloneOpen && data?.canCreate ? <form aria-label="Simülasyon senaryosunu klonla" className="grid gap-3 rounded-ui-panel border border-divider bg-surface-subtle p-4 md:grid-cols-2" onSubmit={cloneScenario}><input className={fieldClass} name="scenarioNo" placeholder="Yeni senaryo no" required /><input className={fieldClass} name="name" placeholder="Yeni senaryo adı" required /><input className={fieldClass} name="description" placeholder="Açıklama" /><input className={fieldClass} name="revisionNote" placeholder="Klon notu" /><div className="flex gap-2 md:col-span-2"><button className={primaryButton} disabled={pending} type="submit">Taslak klonu oluştur</button><button className={secondaryButton} onClick={() => setCloneOpen(false)} type="button">Vazgeç</button></div></form> : null}

              {data?.canCreate && selected.status === "DRAFT" ? <form aria-label="Simülasyon senaryosu revizyonu oluştur" className="grid gap-3 rounded-ui-panel border border-divider bg-surface-subtle p-4 sm:grid-cols-[1fr_auto]" onSubmit={reviseScenario}><div><p className="text-sm font-bold text-content">Yeni revizyon</p><p className="mt-1 text-xs text-content-muted">{draft ? `Hazır etki hesabı R${selected.currentRevisionNo + 1} olarak kaydedilecek.` : "Önce yukarıdan yeni bir etki hesabı çalıştırın."}</p><input className={`${fieldClass} mt-3 w-full`} disabled={!draft || pending} name="revisionNote" placeholder="Revizyon notu" /></div><button className={`${primaryButton} self-end`} disabled={!draft || pending} type="submit">R{selected.currentRevisionNo + 1} kaydet</button></form> : null}

              <div className="overflow-x-auto rounded-ui-panel border border-divider">
                <table aria-label="Simülasyon senaryosu güncel satırları" className="min-w-[760px] w-full text-left text-xs">
                  <thead className="bg-surface-subtle text-content-muted"><tr><th className="px-3 py-3">Poz</th><th className="px-3 py-3 text-right">Öneri</th><th className="px-3 py-3 text-right">Yeni kümülatif</th><th className="px-3 py-3 text-right">Kalan</th><th className="px-3 py-3 text-right">Tahmini tutar</th></tr></thead>
                  <tbody className="divide-y divide-divider">{selected.currentRevision.lines.map((line) => <tr className={line.isOverrun ? "bg-danger-subtle/50" : ""} key={line.contractItemId}><td className="px-3 py-3"><strong className="font-mono text-brand-primary">{line.itemCode}</strong><span className="block text-content-muted">{line.description}</span></td><td className="px-3 py-3 text-right font-mono">{formatQuantity(line.proposedQuantity)} {line.unit}</td><td className="px-3 py-3 text-right font-mono">{formatQuantity(line.projectedCumulative)}</td><td className={line.isOverrun ? "px-3 py-3 text-right font-mono font-bold text-danger" : "px-3 py-3 text-right font-mono"}>{formatQuantity(line.projectedRemaining)}</td><td className="px-3 py-3 text-right font-mono">{formatMoney(line.projectedAmount)} TL</td></tr>)}</tbody>
                </table>
              </div>

              <section aria-label="Simülasyon revizyon geçmişi" className="rounded-ui-panel border border-divider p-4">
                <h6 className="text-sm font-bold text-content">Revizyon geçmişi</h6>
                <ol className="mt-3 space-y-2">{detail.revisions.slice().reverse().map((revision) => <li className="flex flex-wrap items-center justify-between gap-2 rounded-ui-control bg-surface-subtle p-3 text-xs" key={revision.revisionNo}><span><strong className="text-content">R{revision.revisionNo}</strong> · {revision.revisionNote || "Not yok"}</span><span className="font-mono text-content-muted">{formatMoney(revision.projectedAmountTotal)} TL · {formatDate(revision.sourceSnapshotAt)}</span></li>)}</ol>
              </section>
            </div>
          )}
        </section>
      </div>

      {rows.length ? <section aria-label="Simülasyon senaryo karşılaştırması" className="border-t border-divider bg-surface-subtle p-4 sm:p-5">
        <div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Karşılaştırma</p><h6 className="mt-1 text-lg font-bold text-content">Senaryo / Revizyon Farkı</h6></div>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={compare}>
          <select aria-label="Sol senaryo" className={fieldClass} onChange={(event) => setCompareLeftId(event.currentTarget.value)} value={compareLeftId}>{rows.map((row) => <option key={row.id} value={row.id}>{row.scenarioNo} · {row.name}</option>)}</select>
          <select aria-label="Sol revizyon" className={fieldClass} defaultValue={leftHistory?.scenario.currentRevisionNo} key={`left-${compareLeftId}-${leftHistory?.scenario.currentRevisionNo ?? 0}`} name="leftRevisionNo">{leftHistory?.revisions.map((revision) => <option key={revision.revisionNo} value={revision.revisionNo}>R{revision.revisionNo}</option>)}</select>
          <select aria-label="Sağ senaryo" className={fieldClass} onChange={(event) => setCompareRightId(event.currentTarget.value)} value={compareRightId}>{rows.map((row) => <option key={row.id} value={row.id}>{row.scenarioNo} · {row.name}</option>)}</select>
          <select aria-label="Sağ revizyon" className={fieldClass} defaultValue={rightHistory?.scenario.currentRevisionNo} key={`right-${compareRightId}-${rightHistory?.scenario.currentRevisionNo ?? 0}`} name="rightRevisionNo">{rightHistory?.revisions.map((revision) => <option key={revision.revisionNo} value={revision.revisionNo}>R{revision.revisionNo}</option>)}</select>
          <button className={primaryButton} disabled={!leftHistory || !rightHistory || pending} type="submit">Karşılaştır</button>
        </form>
        {comparison ? <div className="mt-4 space-y-3"><div className="grid gap-2 sm:grid-cols-3"><Metric label="Miktar farkı" value={signed(comparison.comparison.proposedQuantityTotalDelta)} /><Metric label="Tutar farkı" value={`${signedMoney(comparison.comparison.projectedAmountTotalDelta)} TL`} /><Metric label="Aşım farkı" value={signed(comparison.comparison.overrunLineCountDelta)} /></div><div className="overflow-x-auto rounded-ui-panel border border-divider bg-surface-raised"><table aria-label="Simülasyon karşılaştırma satırları" className="min-w-[800px] w-full text-left text-xs"><thead className="bg-surface-subtle text-content-muted"><tr><th className="px-3 py-3">Poz</th><th className="px-3 py-3 text-right">Sol miktar</th><th className="px-3 py-3 text-right">Sağ miktar</th><th className="px-3 py-3 text-right">Miktar farkı</th><th className="px-3 py-3 text-right">Tutar farkı</th></tr></thead><tbody className="divide-y divide-divider">{comparison.comparison.lines.map((line) => <tr key={line.contractItemId}><td className="px-3 py-3"><strong>{line.itemCode}</strong><span className="block text-content-muted">{line.description}</span></td><td className="px-3 py-3 text-right font-mono">{formatQuantity(line.leftProposedQuantity)}</td><td className="px-3 py-3 text-right font-mono">{formatQuantity(line.rightProposedQuantity)}</td><td className="px-3 py-3 text-right font-mono">{signed(line.proposedQuantityDelta)}</td><td className="px-3 py-3 text-right font-mono">{signedMoney(line.projectedAmountDelta)} TL</td></tr>)}</tbody></table></div></div> : null}
      </section> : null}

      {confirm ? <ConfirmDialog pending={pending} state={confirm} onCancel={() => { shouldRestoreFocusRef.current = true; setConfirm(null); }} onConfirm={() => transitionScenario(confirm)} /> : null}
    </section>
  );
}

function ConfirmDialog({ onCancel, onConfirm, pending, state }: { onCancel: () => void; onConfirm: () => void; pending: boolean; state: ConfirmState }) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { confirmRef.current?.focus(); }, []);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-content/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section aria-labelledby="simulation-confirm-title" aria-modal="true" className="w-full max-w-md rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-xl" role="dialog">
      <h6 className="text-lg font-bold text-content" id="simulation-confirm-title">{state.type === "approve" ? "Senaryoyu onayla" : "Senaryoyu arşivle"}</h6>
      <p className="mt-2 text-sm leading-6 text-content-muted"><strong>{state.label}</strong> {state.type === "approve" ? "onaylandıktan sonra revize edilemez." : "arşivlenerek aktif çalışma listesinden ayrılacak."}</p>
      <div className="mt-5 flex justify-end gap-2"><button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Vazgeç</button><button className={primaryButton} disabled={pending} onClick={onConfirm} ref={confirmRef} type="button">{state.type === "approve" ? "Onayı tamamla" : "Arşivlemeyi tamamla"}</button></div>
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-surface-raised p-3"><p className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</p><p className="mt-1 truncate font-mono text-base font-bold text-content">{value}</p></div>;
}

function StatusBadge({ status }: { status: "DRAFT" | "APPROVED" | "ARCHIVED" }) {
  const labels = { DRAFT: "Taslak", APPROVED: "Onaylı", ARCHIVED: "Arşiv" };
  const classes = status === "APPROVED" ? "bg-success-subtle text-success" : status === "DRAFT" ? "bg-warning-subtle text-warning" : "bg-surface-subtle text-content-muted";
  return <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${classes}`}>{labels[status]}</span>;
}

function readErrors(result: unknown) {
  if (typeof result === "object" && result !== null && "errors" in result && Array.isArray(result.errors)) return result.errors.join(" ");
  return "İşlem tamamlanamadı.";
}

function textValue(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function formatQuantity(value: number) { return value.toLocaleString("tr-TR", { maximumFractionDigits: 4 }); }
function formatMoney(value: number) { return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(value: string) { return new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }); }
function signed(value: number) { return `${value > 0 ? "+" : ""}${formatQuantity(value)}`; }
function signedMoney(value: number) { return `${value > 0 ? "+" : ""}${formatMoney(value)}`; }
