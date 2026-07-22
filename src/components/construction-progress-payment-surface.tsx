"use client";

import { useCallback, useEffect, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  applyConstructionDeductionRulesAction,
  createConstructionDeductionRuleRevisionAction,
  deactivateConstructionDeductionRuleAction,
  listConstructionDeductionRulesAction,
  previewConstructionDeductionRulesAction,
} from "@/app/actions/construction-deduction-rule-actions";
import {
  approveConstructionProgressPaymentAction,
  createConstructionContractItemAction,
  createConstructionProgressPaymentAction,
  createConstructionProjectAction,
  finalizeConstructionProgressPaymentAction,
  listConstructionProjectsAction,
  returnConstructionProgressPaymentAction,
  saveConstructionProgressPaymentDraftAction,
  submitConstructionProgressPaymentAction,
} from "@/app/actions/construction-progress-payment-actions";
import {
  createConstructionDeductionMovementAction,
  createConstructionContractItemPriceRevisionAction,
  createConstructionExtraWorkAction,
  createConstructionFinancialMovementAction,
  createConstructionMeasurementLineAction,
  createConstructionMeasurementSheetAction,
  deleteConstructionProgressPaymentDetailAction,
  getConstructionProgressPaymentReportAction,
  listConstructionProgressPaymentDetailsAction,
} from "@/app/actions/construction-progress-payment-detail-actions";
import { nextConstructionPaymentSequence } from "@/lib/construction-progress-payment-service";

type ContractItem = { id: string; itemCode: string; description: string; unit: string; contractQuantity: number; unitPrice: number; vatRate: number; revisionNo: number; priceRevisions: Array<{ id: string; revisionNo: number; effectiveFrom: string; unitPrice: number; reason: string; createdAt: string }> };
type Snapshot = { contractItemId: string; previousQuantity: number; periodQuantity: number; cumulativeQuantity: number; periodAmount: number; cumulativeAmount: number; exceededContract: boolean };
type Payment = { id: string; sequenceNo: number; kind: string; status: string; documentNo: string; periodStart: string; periodEnd: string; periodGrossTotal: number; cumulativeGrossTotal: number; progressPaymentId: string | null; updatedAt: string; snapshots: Snapshot[] };
type Project = { id: string; code: string; name: string; siteCode: string; siteName: string; contractNo: string | null; contractAmount: number; status: string; contractItems: ContractItem[]; progressPayments: Payment[] };

const statusLabels: Record<string, string> = { DRAFT: "Taslak", SUBMITTED: "Gönderildi", RETURNED: "İade", APPROVED: "Onaylı", FINALIZED: "Kesinleşti", VOID: "İptal" };
const fieldClass = "min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70";
const primaryButton = "min-h-10 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton = "min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition-colors hover:border-outline-strong hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function ConstructionProgressPaymentSurface() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const projectCount = projects.length;
  const openProjectCount = projects.filter((project) => project.status === "OPEN").length;
  const contractItemCount = projects.reduce((total, project) => total + project.contractItems.length, 0);
  const contractAmountTotal = projects.reduce((total, project) => total + project.contractAmount, 0);

  const refresh = useCallback(async () => {
    const result = await listConstructionProjectsAction();
    if (result.ok) {
      const rows = result.data.rows as Project[];
      setProjects(rows);
      setExpandedProject((current) => current ?? rows[0]?.id ?? null);
      setMessage(null);
    } else setMessage(readErrors(result));
  }, []);

  useEffect(() => {
    let active = true;
    void listConstructionProjectsAction().then((result) => {
      if (!active) return;
      if (result.ok) {
        const rows = result.data.rows as Project[];
        setProjects(rows);
        setExpandedProject((current) => current ?? rows[0]?.id ?? null);
      }
      else setMessage(readErrors(result));
    });
    return () => { active = false; };
  }, []);

  function run(operation: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      const result = await operation();
      if (isSuccess(result)) { setMessage(success); await refresh(); }
      else setMessage(readErrors(result));
    });
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    run(() => createConstructionProjectAction({ code: textValue(data, "code"), name: textValue(data, "name"), siteCode: textValue(data, "siteCode"), siteName: textValue(data, "siteName"), contractNo: textValue(data, "contractNo"), contractAmount: numberValue(data, "contractAmount"), counterpartyCode: textValue(data, "counterpartyCode"), counterpartyName: textValue(data, "counterpartyName"), paymentType: textValue(data, "paymentType"), retentionRate: numberValue(data, "retentionRate") }), "İnşaat projesi oluşturuldu.");
    form.reset(); setShowProjectForm(false);
  }

  function createItem(event: FormEvent<HTMLFormElement>, projectId: string) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    run(() => createConstructionContractItemAction({ projectId, itemCode: textValue(data, "itemCode"), description: textValue(data, "description"), unit: textValue(data, "unit"), contractQuantity: numberValue(data, "contractQuantity"), unitPrice: numberValue(data, "unitPrice"), vatRate: numberValue(data, "vatRate") }), "Sözleşme pozu eklendi.");
    form.reset();
  }

  function createPayment(event: FormEvent<HTMLFormElement>, project: Project) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    const nextSequence = nextConstructionPaymentSequence(project.progressPayments);
    run(() => createConstructionProgressPaymentAction({ projectId: project.id, kind: nextSequence === 1 ? "FIRST" : textValue(data, "kind") === "FINAL" ? "FINAL" : "INTERIM", periodStart: textValue(data, "periodStart"), periodEnd: textValue(data, "periodEnd"), documentNo: textValue(data, "documentNo"), description: textValue(data, "description"), measurements: project.contractItems.map((item) => ({ contractItemId: item.id, quantity: numberValue(data, `quantity-${item.id}`), description: item.description, unit: item.unit })) }), `Hakediş ${nextSequence} taslağı oluşturuldu.`);
    form.reset();
  }

  return (
    <section
      className="mx-auto mb-6 flex max-w-[1440px] flex-col gap-4"
      data-hakedis-pro-workspace="project-contract-items"
    >
      <header className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Hakediş Pro · Proje ve sözleşme</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-content sm:text-3xl">Hakediş Pro</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">Proje künyesi, sözleşme tutarı ve poz listesi mevcut kümülatif hakediş zinciriyle aynı kapsamda yönetilir.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-ui-control border border-success/30 bg-success-subtle px-3 py-2 text-xs font-semibold text-success">Tenant · firma · dönem kapsamlı</span>
              <button className="rounded-ui-control bg-brand-primary px-4 py-2 text-sm font-semibold text-on-brand disabled:cursor-not-allowed disabled:opacity-50" disabled={isPending} onClick={() => setShowProjectForm((value) => !value)} type="button">Yeni Proje</button>
            </div>
          </div>
          <nav aria-label="Hakediş Pro çalışma alanı bölümleri" className="mt-5 flex flex-wrap gap-2">
            <a className="rounded-ui-control bg-brand-primary px-3 py-2 text-xs font-semibold text-on-brand" href="#construction-projects">Proje ve Pozlar</a>
            <a className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content" href="#progress-payment-operations">Hakediş İşlemleri</a>
            <a className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content" href="#payment-list-reports">Liste, Özet ve Kapak</a>
            <a className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content" href="#measurement-entry-workspace">Metraj Veri Girişi</a>
            <a className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content" href="#commercial-adjustments-workspace">Kesinti ve Revizyon</a>
          </nav>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceMetric label="Toplam proje" value={String(projectCount)} />
        <WorkspaceMetric label="Açık proje" value={String(openProjectCount)} />
        <WorkspaceMetric label="Sözleşme pozu" value={String(contractItemCount)} />
        <WorkspaceMetric label="Sözleşme toplamı" value={`${money(contractAmountTotal)} TL`} />
      </div>

      {message ? <p aria-live="polite" className="mt-4 rounded-lg bg-brand-primary/5 p-3 text-sm text-info">{message}</p> : null}
      {showProjectForm ? <form className="mt-4 grid gap-3 rounded-ui-panel border border-divider bg-surface-muted p-4 md:grid-cols-4" onSubmit={createProject}>
        <input className={fieldClass} name="code" placeholder="Proje kodu" required /><input className={fieldClass} name="name" placeholder="Proje adı" required />
        <input className={fieldClass} name="siteCode" placeholder="Şantiye kodu" required /><input className={fieldClass} name="siteName" placeholder="Şantiye adı" required />
        <input className={fieldClass} name="contractNo" placeholder="Sözleşme no" /><input className={fieldClass} min="0" name="contractAmount" placeholder="Sözleşme tutarı" required step="0.01" type="number" />
        <input className={fieldClass} name="counterpartyCode" placeholder="Cari kodu" /><input className={fieldClass} name="counterpartyName" placeholder="Cari adı" />
        <select className={fieldClass} defaultValue="Taşeron Hakedişi" name="paymentType"><option>Taşeron Hakedişi</option><option>Tedarikçi Hakedişi</option><option>Şantiye Geliri</option></select>
        <input className={fieldClass} defaultValue="0" max="100" min="0" name="retentionRate" placeholder="Teminat oranı" step="0.01" type="number" />
        <button className={primaryButton} disabled={isPending} type="submit">Projeyi kaydet</button>
      </form> : null}

      <div className="scroll-mt-20 space-y-4" id="construction-projects">
        {projects.length === 0 ? <p className="text-sm text-content-muted">Henüz inşaat projesi oluşturulmadı.</p> : projects.map((project) => {
          const expanded = expandedProject === project.id; const lastPayment = project.progressPayments.at(-1); const canCreatePayment = project.status === "OPEN" && project.contractItems.length > 0 && (!lastPayment || ["APPROVED", "FINALIZED"].includes(lastPayment.status)); const canRevisePrices = project.status === "OPEN" && (!lastPayment || !["DRAFT", "SUBMITTED", "RETURNED"].includes(lastPayment.status));
          return <article className="rounded-ui-panel border border-divider p-4" key={project.id}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-content">{project.code} · {project.name}</p><p className="text-xs text-content-muted">{project.siteName} · {project.contractItems.length} poz · {money(project.contractAmount)} TL</p></div><div className="flex items-center gap-2"><span className="text-xs text-content-muted">{project.status === "OPEN" ? "Açık" : "Kapalı"}</span><button className={secondaryButton} onClick={() => setExpandedProject(expanded ? null : project.id)} type="button">{expanded ? "Daralt" : "Çalış"}</button></div></div>
            {project.progressPayments.length ? <PaymentTimeline payments={project.progressPayments} pending={isPending} run={run} /> : <p className="mt-3 text-xs text-content-muted">İlk hakediş için kümülatif zincir hazır.</p>}
            {expanded ? <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ProjectContractOverview project={project} />
              <ConstructionDeductionRulePanel project={project} />
              <form className="grid gap-2 rounded-ui-panel border border-divider p-3 md:grid-cols-2" onSubmit={(event) => createItem(event, project.id)}><p className="md:col-span-2 text-sm font-semibold text-content">Sözleşme pozu ekle</p><input className={fieldClass} name="itemCode" placeholder="Poz kodu" required /><input className={fieldClass} name="description" placeholder="Açıklama" required /><input className={fieldClass} name="unit" placeholder="Birim" required /><input className={fieldClass} min="0.0001" name="contractQuantity" placeholder="Sözleşme miktarı" required step="0.0001" type="number" /><input className={fieldClass} min="0" name="unitPrice" placeholder="Birim fiyat" required step="0.0001" type="number" /><input className={fieldClass} defaultValue="0" min="0" name="vatRate" placeholder="KDV oranı" step="0.01" type="number" /><button className={primaryButton} disabled={isPending || project.status !== "OPEN"} type="submit">Pozu kaydet</button></form>
              <form className="rounded-ui-panel border border-divider p-3" onSubmit={(event) => createPayment(event, project)}><p className="mb-2 text-sm font-semibold text-content">Yeni hakediş taslağı</p><div className="grid gap-2 md:grid-cols-2"><input className={fieldClass} name="documentNo" placeholder={`HAK-${project.code}-${nextConstructionPaymentSequence(project.progressPayments)}`} required /><select className={fieldClass} defaultValue="INTERIM" disabled={project.progressPayments.length === 0} name="kind"><option value="INTERIM">Ara hakediş</option><option value="FINAL">Kesin hakediş</option></select><input className={fieldClass} name="periodStart" required type="date" /><input className={fieldClass} name="periodEnd" required type="date" /><input className={`${fieldClass} md:col-span-2`} name="description" placeholder="Dönem açıklaması" /></div><div className="mt-3 space-y-2">{project.contractItems.map((item) => <label className="grid grid-cols-[1fr_9rem] items-center gap-2 text-xs text-content-subtle" key={item.id}><span>{item.itemCode} · {item.description} ({item.unit})</span><input className={fieldClass} defaultValue="0" name={`quantity-${item.id}`} step="0.0001" type="number" /></label>)}</div><button className={`${primaryButton} mt-3`} disabled={isPending || !canCreatePayment} type="submit">Hakediş {nextConstructionPaymentSequence(project.progressPayments)} taslağını oluştur</button>{!canCreatePayment ? <p className="mt-2 text-xs text-warning">Yeni hakediş için son hakedişin onaylı/kesinleşmiş ve projenin açık olması gerekir.</p> : null}</form>
              {lastPayment && ["DRAFT", "RETURNED"].includes(lastPayment.status) ? <DraftEditForm items={project.contractItems} payment={lastPayment} pending={isPending} run={run} /> : null}
              {lastPayment ? <PaymentDetailsPanel editable={["DRAFT", "RETURNED"].includes(lastPayment.status)} items={project.contractItems} key={`${lastPayment.id}:${lastPayment.updatedAt}`} payment={lastPayment} pending={isPending} run={run} /> : null}
              <ContractPriceRevisionPanel canRevise={canRevisePrices} items={project.contractItems} pending={isPending} run={run} />
            </div> : null}
          </article>;
        })}
      </div>
    </section>
  );
}

function ProjectContractOverview({ project }: { project: Project }) {
  const calculatedContractTotal = project.contractItems.reduce(
    (total, item) => total + item.contractQuantity * item.unitPrice,
    0,
  );
  const lastPayment = project.progressPayments.at(-1);

  return (
    <section className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm xl:col-span-2" aria-label={`${project.code} proje ve sözleşme bilgileri`}>
      <div className="border-b border-divider bg-surface-subtle px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Proje künyesi</p>
            <h2 className="mt-1 text-lg font-bold text-content">{project.code} · {project.name}</h2>
            <p className="mt-1 text-sm text-content-muted">{project.siteCode} · {project.siteName}</p>
          </div>
          <span className="rounded-ui-control border border-success/30 bg-success-subtle px-3 py-1 text-xs font-semibold text-success">{project.status === "OPEN" ? "Aktif Proje" : "Kapalı Proje"}</span>
        </div>
      </div>
      <dl className="grid gap-px bg-divider sm:grid-cols-2 xl:grid-cols-4">
        <ProjectValue label="Sözleşme no" value={project.contractNo || "Tanımlı değil"} />
        <ProjectValue label="Sözleşme bedeli" value={`${money(project.contractAmount)} TL`} />
        <ProjectValue label="Poz toplamı" value={`${money(calculatedContractTotal)} TL`} />
        <ProjectValue label="Son kümülatif" value={`${money(lastPayment?.cumulativeGrossTotal ?? 0)} TL`} />
      </dl>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm" aria-label={`${project.code} sözleşme poz listesi`}>
          <thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted">
            <tr><th className="px-4 py-3">Poz no</th><th className="px-4 py-3">İş kalemi tanımı</th><th className="px-4 py-3">Birim</th><th className="px-4 py-3 text-right">Söz. miktarı</th><th className="px-4 py-3 text-right">Birim fiyat</th><th className="px-4 py-3 text-right">Toplam tutar</th><th className="px-4 py-3 text-center">Revizyon</th></tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {project.contractItems.map((item) => (
              <tr className="hover:bg-surface-subtle" key={item.id}>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-primary">{item.itemCode}</td>
                <td className="px-4 py-3 font-medium text-content">{item.description}</td>
                <td className="px-4 py-3 text-content-muted">{item.unit}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{quantity(item.contractQuantity)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{money(item.unitPrice)} TL</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{money(item.contractQuantity * item.unitPrice)} TL</td>
                <td className="px-4 py-3 text-center"><span className="rounded bg-brand-primary/10 px-2 py-1 text-xs font-semibold text-brand-primary">R{item.revisionNo}</span></td>
              </tr>
            ))}
            {project.contractItems.length === 0 ? <tr><td className="px-4 py-6 text-center text-content-muted" colSpan={7}>Bu projede henüz sözleşme pozu bulunmuyor.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type DeductionRuleListData = Extract<Awaited<ReturnType<typeof listConstructionDeductionRulesAction>>, { ok: true }>["data"];
type DeductionRule = DeductionRuleListData["rows"][number];

function ConstructionDeductionRulePanel({ project }: { project: Project }) {
  const [data, setData] = useState<DeductionRuleListData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [calculationType, setCalculationType] = useState<"RATE" | "FIXED">("RATE");
  const [taxMode, setTaxMode] = useState<"NONE" | "VAT_ADD">("NONE");
  const [pending, startTransition] = useTransition();
  const selectedRule = data?.rows.find((row) => row.id === selectedRuleId) ?? null;
  const currentRules = data?.rows.filter((row) => row.isActive && !row.effectiveTo) ?? [];

  const load = useCallback(async () => {
    const result = await listConstructionDeductionRulesAction(project.id);
    if (result.ok) { setData(result.data); setMessage(null); }
    else setMessage(readErrors(result));
  }, [project.id]);

  useEffect(() => {
    let active = true;
    void listConstructionDeductionRulesAction(project.id).then((result) => {
      if (!active) return;
      if (result.ok) { setData(result.data); setMessage(null); }
      else setMessage(readErrors(result));
    });
    return () => { active = false; };
  }, [project.id]);

  function chooseRevision(rule: DeductionRule) {
    setSelectedRuleId(rule.id);
    setCalculationType(rule.calculationType);
    setTaxMode(rule.taxMode);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    startTransition(async () => {
      const result = await createConstructionDeductionRuleRevisionAction({
        projectId: project.id,
        supersedesRuleId: selectedRule?.id ?? null,
        code: selectedRule?.code ?? textValue(values, "code"),
        name: textValue(values, "name"),
        category: textValue(values, "category"),
        description: textValue(values, "description"),
        calculationType,
        baseType: calculationType === "RATE" ? textValue(values, "baseType") as "PERIOD_NET" | "PERIOD_NET_PLUS_EXTRAS" | "PAYABLE_BEFORE_RULE" : null,
        rate: calculationType === "RATE" ? optionalNumberValue(values, "rate") : null,
        fixedAmount: calculationType === "FIXED" ? optionalNumberValue(values, "fixedAmount") : null,
        minimumAmount: optionalNumberValue(values, "minimumAmount"),
        maximumAmount: optionalNumberValue(values, "maximumAmount"),
        taxMode,
        taxRate: taxMode === "VAT_ADD" ? optionalNumberValue(values, "taxRate") : 0,
        priority: numberValue(values, "priority"),
        effectiveFrom: textValue(values, "effectiveFrom"),
      });
      if (result.ok) {
        setMessage(selectedRule ? "Yeni kural revizyonu kaydedildi." : "Kesinti kuralı oluşturuldu.");
        setSelectedRuleId(null);
        setCalculationType("RATE");
        setTaxMode("NONE");
        form.reset();
        await load();
      } else setMessage(readErrors(result));
    });
  }

  function deactivate(rule: DeductionRule) {
    startTransition(async () => {
      const result = await deactivateConstructionDeductionRuleAction({ projectId: project.id, ruleId: rule.id });
      if (result.ok) { setMessage(`${rule.code} kuralı pasifleştirildi.`); setSelectedRuleId(null); await load(); }
      else setMessage(readErrors(result));
    });
  }

  return <section aria-label={`${project.code} kesinti kuralları`} className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm xl:col-span-2">
    <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">F8 · Kural yönetimi</p><h3 className="mt-1 text-lg font-bold text-content">Kesinti Kuralları</h3><p className="mt-1 max-w-3xl text-sm text-content-muted">Oransal veya maktu kesintileri geçerlilik tarihi ve revizyon geçmişiyle yönetin. Kurallar hakedişe yalnız önizleme sonrası uygulanır.</p></div><span className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-muted">{currentRules.length} güncel kural · manuel uygulama</span></div></div>
    {message ? <p aria-live="polite" className="border-b border-divider bg-brand-primary/5 px-4 py-3 text-sm text-content">{message}</p> : null}
    {!data ? <p className="p-4 text-sm text-content-muted">Kesinti kuralları yükleniyor…</p> : <>
      <div className="overflow-x-auto"><table aria-label="Kesinti kural listesi" className="min-w-[980px] w-full text-left text-xs"><thead className="bg-surface-subtle font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-4 py-3">Kod / kural</th><th className="px-4 py-3">Hesap</th><th className="px-4 py-3">Sınırlar</th><th className="px-4 py-3">Geçerlilik</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3">İşlem</th></tr></thead><tbody className="divide-y divide-divider">{data.rows.map((rule) => { const current = rule.isActive && !rule.effectiveTo; return <tr className="hover:bg-surface-subtle" key={rule.id}><td className="px-4 py-3"><strong className="font-mono text-brand-primary">{rule.code} · R{rule.revisionNo}</strong><span className="block font-semibold text-content">{rule.name}</span><span className="block text-content-muted">{rule.category}</span></td><td className="px-4 py-3 text-content">{rule.calculationType === "RATE" ? `%${quantity(rule.rate ?? 0)} · ${deductionBaseLabel(rule.baseType)}` : `${money(rule.fixedAmount ?? 0)} TL maktu`}<span className="block text-content-muted">{rule.taxMode === "VAT_ADD" ? `+ KDV %${quantity(rule.taxRate)}` : "Vergi yok"}</span></td><td className="px-4 py-3 text-content-muted">Alt {rule.minimumAmount === null ? "—" : `${money(rule.minimumAmount)} TL`}<span className="block">Üst {rule.maximumAmount === null ? "—" : `${money(rule.maximumAmount)} TL`}</span></td><td className="px-4 py-3 text-content">{shortUtcDate(rule.effectiveFrom)}<span className="block text-content-muted">{rule.effectiveTo ? `${shortUtcDate(rule.effectiveTo)} tarihine kadar` : "Süresiz"}</span></td><td className="px-4 py-3"><span className={current ? "font-semibold text-success" : rule.isActive ? "text-content-muted" : "font-semibold text-danger"}>{current ? "Güncel" : rule.isActive ? "Geçmiş revizyon" : "Pasif"}</span></td><td className="px-4 py-3">{data.canManage && current ? <div className="flex gap-3"><button className="font-semibold text-brand-primary" disabled={pending} onClick={() => chooseRevision(rule)} type="button">Revize et</button><button className="font-semibold text-danger" disabled={pending} onClick={() => deactivate(rule)} type="button">Pasifleştir</button></div> : <span className="text-content-muted">Salt okunur</span>}</td></tr>; })}{!data.rows.length ? <tr><td className="px-4 py-8 text-center text-content-muted" colSpan={6}>Bu projede kesinti kuralı bulunmuyor.</td></tr> : null}</tbody></table></div>
      {data.canManage && project.status === "OPEN" ? <form aria-label="Kesinti kuralı oluştur veya revize et" className="grid gap-3 border-t border-divider bg-surface-subtle p-4 md:grid-cols-2 xl:grid-cols-4 sm:p-5" key={selectedRule?.id ?? "new-rule"} onSubmit={save}><div className="md:col-span-2 xl:col-span-4"><p className="text-sm font-bold text-content">{selectedRule ? `${selectedRule.code} · R${selectedRule.revisionNo + 1} revizyonu` : "Yeni kesinti kuralı"}</p><p className="mt-1 text-xs text-content-muted">{selectedRule ? "Önceki revizyon, yeni başlangıç tarihinden hemen önce tarihsel olarak kapanır." : "Kod daha sonra aynı kuralın revizyon anahtarı olarak korunur."}</p></div><input className={fieldClass} defaultValue={selectedRule?.code ?? ""} name="code" placeholder="Kural kodu" readOnly={Boolean(selectedRule)} required /><input className={fieldClass} defaultValue={selectedRule?.name ?? ""} name="name" placeholder="Kural adı" required /><select className={fieldClass} defaultValue={selectedRule?.category ?? "TEMINAT"} name="category"><option value="TEMINAT">Teminat</option><option value="TEVKIFAT">Tevkifat</option><option value="STOPAJ">Stopaj</option><option value="IHTIYAT">İhtiyat</option><option value="DIGER">Diğer</option></select><input className={fieldClass} defaultValue={selectedRule?.description ?? ""} name="description" placeholder="Açıklama" /><select className={fieldClass} onChange={(event) => setCalculationType(event.target.value === "FIXED" ? "FIXED" : "RATE")} value={calculationType}><option value="RATE">Oransal</option><option value="FIXED">Maktu</option></select>{calculationType === "RATE" ? <><select className={fieldClass} defaultValue={selectedRule?.baseType ?? "PERIOD_NET_PLUS_EXTRAS"} name="baseType"><option value="PERIOD_NET">Dönem neti</option><option value="PERIOD_NET_PLUS_EXTRAS">Dönem neti + ek işler</option><option value="PAYABLE_BEFORE_RULE">Kural öncesi ödenecek</option></select><input className={fieldClass} defaultValue={selectedRule?.rate ?? ""} max="100" min="0" name="rate" placeholder="Oran (%)" required step="0.0001" type="number" /></> : <input className={fieldClass} defaultValue={selectedRule?.fixedAmount ?? ""} min="0" name="fixedAmount" placeholder="Maktu tutar" required step="0.01" type="number" />}<input className={fieldClass} defaultValue={selectedRule?.minimumAmount ?? ""} min="0" name="minimumAmount" placeholder="Alt sınır" step="0.01" type="number" /><input className={fieldClass} defaultValue={selectedRule?.maximumAmount ?? ""} min="0" name="maximumAmount" placeholder="Üst sınır" step="0.01" type="number" /><select className={fieldClass} onChange={(event) => setTaxMode(event.target.value === "VAT_ADD" ? "VAT_ADD" : "NONE")} value={taxMode}><option value="NONE">Vergi yok</option><option value="VAT_ADD">KDV ekle</option></select>{taxMode === "VAT_ADD" ? <input className={fieldClass} defaultValue={selectedRule?.taxRate ?? 20} max="100" min="0" name="taxRate" placeholder="KDV oranı" required step="0.01" type="number" /> : null}<input className={fieldClass} defaultValue={selectedRule?.priority ?? 10} min="0" name="priority" placeholder="Öncelik" required step="1" type="number" /><input aria-label="Kural geçerlilik başlangıcı" className={fieldClass} defaultValue={new Date().toISOString().slice(0, 10)} name="effectiveFrom" required type="date" /><div className="flex gap-2 md:col-span-2 xl:col-span-4"><button className={primaryButton} disabled={pending} type="submit">{pending ? "Kaydediliyor…" : selectedRule ? "Revizyonu kaydet" : "Kuralı oluştur"}</button>{selectedRule ? <button className={secondaryButton} disabled={pending} onClick={() => { setSelectedRuleId(null); setCalculationType("RATE"); setTaxMode("NONE"); }} type="button">Vazgeç</button> : null}</div></form> : <p className="border-t border-divider bg-surface-subtle p-4 text-sm text-content-muted">Kural tanımları yalnız açık projede yönetici tarafından değiştirilebilir.</p>}
    </>}
  </section>;
}

function WorkspaceMetric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-ui-panel border border-divider border-l-4 border-l-brand-primary bg-surface-raised p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</p><p className="mt-2 font-mono text-2xl font-bold text-content">{value}</p></article>;
}

function ProjectValue({ label, value }: { label: string; value: string }) {
  return <div className="bg-surface-raised p-4"><dt className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</dt><dd className="mt-1 font-mono text-sm font-semibold text-content">{value}</dd></div>;
}

function PaymentTimeline({ payments, pending, run }: { payments: Payment[]; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  const [reportPaymentId, setReportPaymentId] = useState<string | null>(null);
  const currentPayment = payments.at(-1);
  return <section className="mt-3 scroll-mt-20 space-y-3" id="payment-list-reports">
    <div className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-surface-subtle px-4 py-3">
        <div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Hakediş zinciri</p><h3 className="mt-1 text-base font-bold text-content">Hakediş listesi</h3></div>
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 font-semibold text-content">{payments.length} hakediş</span>{currentPayment ? <span className="rounded-ui-control border border-success/30 bg-success-subtle px-3 py-1.5 font-semibold text-success">Son durum · {statusLabels[currentPayment.status] || currentPayment.status}</span> : null}</div>
      </div>
      <div className="overflow-x-auto">
        <table aria-label="Hakediş listesi" className="min-w-[880px] w-full text-left text-sm">
          <thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-4 py-3">Sıra</th><th className="px-4 py-3">Belge</th><th className="px-4 py-3">Dönem</th><th className="px-4 py-3">Durum</th><th className="px-4 py-3 text-right">Cari dönem</th><th className="px-4 py-3 text-right">Kümülatif</th><th className="px-4 py-3">İşlem</th></tr></thead>
          <tbody className="divide-y divide-divider">{payments.map((payment) => <tr className={reportPaymentId === payment.id ? "bg-brand-primary/5" : "hover:bg-surface-subtle"} key={payment.id}><td className="px-4 py-3 font-mono text-xs font-bold text-brand-primary">#{payment.sequenceNo}{payment.kind === "FINAL" ? " · Kesin" : ""}</td><td className="px-4 py-3 font-medium text-content">{payment.documentNo}</td><td className="px-4 py-3 text-xs text-content-muted">{shortDate(payment.periodStart)} – {shortDate(payment.periodEnd)}</td><td className="px-4 py-3"><span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-content-muted">{statusLabels[payment.status] || payment.status}</span></td><td className="px-4 py-3 text-right font-mono text-xs font-semibold text-content">{money(payment.periodGrossTotal)} TL</td><td className="px-4 py-3 text-right font-mono text-xs font-semibold text-content">{money(payment.cumulativeGrossTotal)} TL</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1"><button aria-expanded={reportPaymentId === payment.id} className={reportPaymentId === payment.id ? primaryButton : secondaryButton} onClick={() => setReportPaymentId((current) => current === payment.id ? null : payment.id)} type="button">{reportPaymentId === payment.id ? "Raporu kapat" : "Detay ve özet"}</button>{["DRAFT", "RETURNED"].includes(payment.status) ? <button className={secondaryButton} disabled={pending} onClick={() => run(() => submitConstructionProgressPaymentAction(payment.id), "Hakediş onaya gönderildi.")} type="button">Gönder</button> : null}{payment.status === "SUBMITTED" ? <><button className={primaryButton} disabled={pending} onClick={() => run(() => approveConstructionProgressPaymentAction(payment.id), "Hakediş onaylandı.")} type="button">Onayla</button><button className={secondaryButton} disabled={pending} onClick={() => run(() => returnConstructionProgressPaymentAction(payment.id, "Kullanıcı düzeltmesi"), "Hakediş düzeltmeye iade edildi.")} type="button">İade</button></> : null}{payment.status === "APPROVED" ? <button className={primaryButton} disabled={pending} onClick={() => run(() => finalizeConstructionProgressPaymentAction(payment.id), "Hakediş finansal kayda ve muhasebe fişine bağlandı.")} type="button">Kesinleştir</button> : null}{payment.progressPaymentId ? <span className="rounded bg-success-subtle px-2 py-1 text-xs font-semibold text-success">Finansal bağ hazır</span> : null}</div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
    {reportPaymentId ? <PaymentReportPanel paymentId={reportPaymentId} /> : null}
  </section>;
}

function ContractPriceRevisionPanel({ canRevise, items, pending, run }: { canRevise: boolean; items: ContractItem[]; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const revisionCount = items.reduce((total, item) => total + item.priceRevisions.length, 0);
  const currentContractTotal = items.reduce((total, item) => total + item.contractQuantity * item.unitPrice, 0);
  function revise(event: FormEvent<HTMLFormElement>, item: ContractItem) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    run(() => createConstructionContractItemPriceRevisionAction({ contractItemId: item.id, effectiveFrom: textValue(data, "effectiveFrom"), unitPrice: numberValue(data, "unitPrice"), reason: textValue(data, "reason") }), `${item.itemCode} birim fiyatı revize edildi; önceki hakediş snapshot'ları korunuyor.`);
    form.reset();
  }
  return <section aria-label="Fiyat revizyonu çalışma alanı" className="min-w-0 scroll-mt-20 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm xl:col-span-2" data-price-revision-workspace="contract-items" id="price-revision-workspace">
    <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Sözleşme fiyat geçmişi</p><h3 className="mt-1 text-lg font-bold text-content">Fiyat Revizyonu</h3><p className="mt-1 max-w-3xl text-sm text-content-muted">Yeni fiyat yalnız sonraki hakediş snapshot’larında kullanılır; geçmiş kümülatif tutarlar yeniden fiyatlanmaz.</p></div><span className={canRevise ? "rounded-ui-control border border-success/30 bg-success-subtle px-3 py-2 text-xs font-semibold text-success" : "rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning"}>{canRevise ? "Yeni revizyona açık" : "Revizyon kapalı"}</span></div></div>
    <div className="grid gap-px bg-divider sm:grid-cols-3"><MeasurementMetric label="Sözleşme pozu" value={String(items.length)} /><MeasurementMetric label="Toplam revizyon" value={String(revisionCount)} /><MeasurementMetric label="Güncel poz toplamı" value={`${money(currentContractTotal)} TL`} /></div>
    {!canRevise ? <p className="border-b border-divider bg-warning-subtle px-4 py-3 text-sm text-warning">Aktif hakediş tamamlanmadan veya proje kapalıyken yeni fiyat revizyonu yapılamaz. Kayıtlı fiyat geçmişi salt okunur görüntülenir.</p> : null}
    <div className="overflow-x-auto"><table aria-label="Poz fiyat revizyonları" className="min-w-[920px] w-full text-left text-xs"><thead className="bg-surface-subtle font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-4 py-3">Poz / iş kalemi</th><th className="px-4 py-3 text-center">Birim</th><th className="px-4 py-3 text-right">Söz. miktarı</th><th className="px-4 py-3 text-right">Güncel fiyat</th><th className="px-4 py-3 text-center">Revizyon</th><th className="px-4 py-3">Son gerekçe</th></tr></thead><tbody className="divide-y divide-divider">{items.map((item) => { const latest = item.priceRevisions.at(-1); return <tr className="hover:bg-surface-subtle" key={item.id}><td className="px-4 py-3"><strong className="font-mono text-brand-primary">{item.itemCode}</strong><span className="block text-content">{item.description}</span></td><td className="px-4 py-3 text-center text-content-muted">{item.unit}</td><td className="px-4 py-3 text-right font-mono">{quantity(item.contractQuantity)}</td><td className="px-4 py-3 text-right font-mono font-semibold">{money(item.unitPrice)} TL</td><td className="px-4 py-3 text-center"><span className="rounded-full bg-brand-primary/10 px-2 py-1 font-semibold text-brand-primary">R{item.revisionNo}</span></td><td className="px-4 py-3 text-content-muted">{latest ? `${shortDate(latest.effectiveFrom)} · ${latest.reason}` : "Başlangıç sözleşme fiyatı"}</td></tr>; })}{!items.length ? <tr><td className="px-4 py-8 text-center text-content-muted" colSpan={6}>Fiyat revizyonu yapılabilecek sözleşme pozu bulunmuyor.</td></tr> : null}</tbody></table></div>
    {canRevise ? <div className="grid gap-3 border-t border-divider bg-surface-subtle p-4 lg:grid-cols-2 sm:p-5">{items.map((item) => <article className="rounded-ui-control border border-divider bg-surface-raised p-3" key={item.id}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-content">{item.itemCode} · {item.description}</p><p className="mt-1 text-xs text-content-muted">Güncel fiyat {money(item.unitPrice)} TL/{item.unit}</p></div><span className="rounded bg-brand-primary/10 px-2 py-1 text-xs font-semibold text-brand-primary">R{item.revisionNo}</span></div><form aria-label={`${item.itemCode} fiyat revizyonu`} className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={(event) => revise(event, item)}><input aria-label="Geçerlilik tarihi" className={fieldClass} defaultValue={today} name="effectiveFrom" required type="date" /><input aria-label="Yeni birim fiyat" className={fieldClass} min="0" name="unitPrice" placeholder="Yeni birim fiyat" required step="0.0001" type="number" /><input aria-label="Revizyon gerekçesi" className={`${fieldClass} md:col-span-2`} name="reason" placeholder="Revizyon gerekçesi" required /><button className={`${primaryButton} md:col-span-2`} disabled={pending} type="submit">Yeni fiyatı kaydet</button></form>{item.priceRevisions.length ? <div className="mt-3 space-y-1 border-t border-divider pt-2">{item.priceRevisions.map((revision) => <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-content-muted" key={revision.id}><span>R{revision.revisionNo} · {shortDate(revision.effectiveFrom)} · {revision.reason}</span><strong className="text-content">{money(revision.unitPrice)} TL</strong></p>)}</div> : <p className="mt-2 text-xs text-content-muted">Henüz revizyon yok; sözleşme başlangıç fiyatı kullanılıyor.</p>}</article>)}</div> : null}
  </section>;
}

function DraftEditForm({ items, payment, pending, run }: { items: ContractItem[]; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(() => saveConstructionProgressPaymentDraftAction({ id: payment.id, updatedAt: payment.updatedAt, documentNo: textValue(data, "documentNo"), periodStart: textValue(data, "periodStart"), periodEnd: textValue(data, "periodEnd"), description: textValue(data, "description"), measurements: items.map((item) => ({ contractItemId: item.id, quantity: numberValue(data, `quantity-${item.id}`), description: item.description, unit: item.unit })) }), "Hakediş taslağı ve kümülatif snapshot yeniden hesaplandı.");
  }
  const snapshotByItem = new Map(payment.snapshots.map((snapshot) => [snapshot.contractItemId, snapshot]));
  return <form className="rounded-ui-panel border border-warning bg-warning-subtle p-3 xl:col-span-2" onSubmit={save}><p className="mb-2 text-sm font-semibold text-content">Hakediş {payment.sequenceNo} düzeltmesi</p><div className="grid gap-2 md:grid-cols-4"><input className={fieldClass} defaultValue={payment.documentNo} name="documentNo" required /><input className={fieldClass} defaultValue={payment.periodStart.slice(0, 10)} name="periodStart" required type="date" /><input className={fieldClass} defaultValue={payment.periodEnd.slice(0, 10)} name="periodEnd" required type="date" /><input className={fieldClass} name="description" placeholder="Düzeltme açıklaması" /></div><div className="mt-3 grid gap-2 md:grid-cols-2">{items.map((item) => { const snapshot = snapshotByItem.get(item.id); return <label className="grid grid-cols-[1fr_8rem_8rem_8rem] items-center gap-2 text-xs text-content-subtle" key={item.id}><span>{item.itemCode} · {item.description}</span><span className="rounded bg-surface-raised px-2 py-2 text-right">Önceki {snapshot?.previousQuantity ?? 0}</span><input className={fieldClass} defaultValue={snapshot?.periodQuantity ?? 0} name={`quantity-${item.id}`} step="0.0001" type="number" /><span className="rounded bg-surface-raised px-2 py-2 text-right">Kümülatif {snapshot?.cumulativeQuantity ?? 0}</span></label>; })}</div><button className={`${primaryButton} mt-3`} disabled={pending} type="submit">Düzeltmeyi kaydet ve yeniden hesapla</button></form>;
}

type PaymentDetails = Extract<Awaited<ReturnType<typeof listConstructionProgressPaymentDetailsAction>>, { ok: true }>["data"];
type PaymentReport = Extract<Awaited<ReturnType<typeof getConstructionProgressPaymentReportAction>>, { ok: true }>["data"];
type ReportTab = "COVER" | "SUMMARY" | "DETAIL" | "GREEN_BOOK" | "MANUFACTURING" | "QUANTITY_CONTROL" | "ACCOUNTING" | "REPORT_CENTER" | "IMPORT_SIMULATION" | "AUDIT";

const reportTabs: { id: ReportTab; label: string }[] = [
  { id: "COVER", label: "Kapak" },
  { id: "SUMMARY", label: "Özet" },
  { id: "DETAIL", label: "Detay" },
  { id: "GREEN_BOOK", label: "Yeşil Defter" },
  { id: "MANUFACTURING", label: "İmalat Çarşafı" },
  { id: "QUANTITY_CONTROL", label: "Miktar Kontrolü" },
  { id: "ACCOUNTING", label: "Muhasebe" },
  { id: "REPORT_CENTER", label: "Rapor Merkezi" },
  { id: "IMPORT_SIMULATION", label: "Aktarım / Simülasyon" },
  { id: "AUDIT", label: "Rapor / Audit" },
];

function PaymentReportPanel({ paymentId }: { paymentId: string }) {
  const [report, setReport] = useState<PaymentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportTab>("COVER");

  useEffect(() => {
    let active = true;
    void getConstructionProgressPaymentReportAction(paymentId).then((result) => {
      if (!active) return;
      if (result.ok) { setReport(result.data); setError(null); }
      else { setReport(null); setError(readErrors(result)); }
    });
    return () => { active = false; };
  }, [paymentId]);

  if (error) return <p className="rounded-lg bg-danger-subtle p-3 text-sm text-danger">{error}</p>;
  if (!report) return <p className="rounded-lg bg-surface-muted p-3 text-sm text-content-muted">Hakediş raporu hazırlanıyor…</p>;

  return <section aria-label="Hakediş rapor çalışma alanı" className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm" data-hakedis-report-workspace="list-detail-summary-cover">
    <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Hakediş rapor seti</p><h3 className="mt-1 text-lg font-bold text-content">{report.header.projectCode} · {report.header.projectName}</h3><p className="mt-1 text-xs text-content-muted">{report.header.documentNo} · Hakediş {report.header.sequenceNo} · {shortDate(report.header.periodStart)}–{shortDate(report.header.periodEnd)}</p></div>
      <div className="flex items-center gap-2"><span className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content">{statusLabels[report.header.status] ?? report.header.status}</span><button className={secondaryButton} onClick={() => window.print()} type="button">Yazdır</button></div>
    </div>
    <div aria-label="Hakediş rapor görünümleri" className="mt-4 flex flex-wrap gap-2" role="tablist">{reportTabs.map((item) => <button aria-controls={`payment-report-${item.id.toLowerCase()}`} aria-selected={tab === item.id} className={tab === item.id ? primaryButton : secondaryButton} key={item.id} onClick={() => setTab(item.id)} role="tab" type="button">{item.label}</button>)}</div>
    </div>
    <div className="p-4 sm:p-5" id={`payment-report-${tab.toLowerCase()}`} role="tabpanel">
      {tab === "COVER" ? <PaymentCoverReport report={report} /> : null}
      {tab === "SUMMARY" ? <PaymentSummaryReport report={report} /> : null}
      {tab === "DETAIL" ? <PaymentDetailReport report={report} /> : null}
      {tab === "GREEN_BOOK" ? <GreenBookReport report={report} /> : null}
      {tab === "MANUFACTURING" ? <ManufacturingReport report={report} /> : null}
      {tab === "QUANTITY_CONTROL" ? <QuantityControlReport report={report} /> : null}
      {tab === "ACCOUNTING" ? <PaymentAccountingWorkspace report={report} /> : null}
      {tab === "REPORT_CENTER" ? <PaymentReportCenter onOpen={setTab} report={report} /> : null}
      {tab === "IMPORT_SIMULATION" ? <ImportSimulationWorkspace report={report} /> : null}
      {tab === "AUDIT" ? <PaymentAuditReport report={report} /> : null}
    </div>
  </section>;
}

function PaymentCoverReport({ report }: { report: PaymentReport }) {
  const contractTotal = report.manufacturingSheet.reduce((total, row) => total + row.contractAmount, 0);
  return <article className="mx-auto max-w-4xl overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
    <div className="border-b-4 border-brand-primary bg-surface-subtle px-5 py-6 text-center sm:px-8 sm:py-10"><p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">Hakediş Pro</p><h4 className="mt-4 text-2xl font-bold uppercase tracking-wide text-content sm:text-3xl">Hakediş Özeti</h4><p className="mt-2 text-sm text-content-muted">{report.header.sequenceNo} Nolu Hakediş · {report.header.documentNo}</p></div>
    <div className="grid gap-px bg-divider sm:grid-cols-2"><CoverValue label="Proje" value={`${report.header.projectCode} · ${report.header.projectName}`} /><CoverValue label="Şantiye" value={report.header.siteName} /><CoverValue label="Sözleşme no" value={report.header.contractNo || "Tanımlı değil"} /><CoverValue label="Hakediş dönemi" value={`${shortDate(report.header.periodStart)} – ${shortDate(report.header.periodEnd)}`} /><CoverValue label="Sözleşme poz toplamı" value={`${money(contractTotal)} ${report.header.currency}`} /><CoverValue label="Hakediş durumu" value={statusLabels[report.header.status] ?? report.header.status} /></div>
    <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-8"><SummaryValue label="Bu dönem brüt" value={report.summary.periodWorkTotal} /><SummaryValue label="Kümülatif brüt" value={report.summary.cumulativeWorkTotal} /><SummaryValue label="Net ödenecek" value={report.summary.periodPayableTotal} /></div>
    <div className="border-t border-divider bg-brand-primary px-5 py-5 text-center text-on-brand"><p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">Dönem net ödenecek tutar</p><p className="mt-2 font-mono text-2xl font-bold sm:text-3xl">{money(report.summary.periodPayableTotal)} {report.header.currency}</p></div>
  </article>;
}

function CoverValue({ label, value }: { label: string; value: string }) {
  return <div className="bg-surface-raised p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</p><p className="mt-2 text-sm font-semibold text-content">{value}</p></div>;
}

function PaymentDetailReport({ report }: { report: PaymentReport }) {
  return <div className="space-y-6"><section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Miktar detayı</p><h4 className="mt-1 text-base font-bold text-content">Yeşil Defter</h4></div><GreenBookReport compact report={report} /></section><section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Tutar detayı</p><h4 className="mt-1 text-base font-bold text-content">İmalat Çarşafı</h4></div><ManufacturingReport compact report={report} /></section></div>;
}

function GreenBookReport({ compact = false, report }: { compact?: boolean; report: PaymentReport }) {
  if (compact) return <ReportTable headers={["Poz", "Birim", "Sözleşme", "Önceki", "Bu dönem", "Kümülatif", "Tamamlanma"]} rows={report.greenBook.map((row) => [<span key="item"><strong>{row.itemCode}</strong><span className="block text-content-muted">{row.description}</span></span>, row.unit, quantity(row.contractQuantity), quantity(row.previousQuantity), quantity(row.periodQuantity), quantity(row.cumulativeQuantity), <span className={row.exceededContract ? "font-semibold text-danger" : ""} key="rate">%{row.completionRate.toLocaleString("tr-TR")}{row.exceededContract ? " · Aşım" : ""}</span>])} />;

  const movingRows = report.greenBook.filter((row) => row.periodQuantity !== 0).length;
  const exceededRows = report.greenBook.filter((row) => row.exceededContract).length;
  const cumulativeQuantity = report.greenBook.reduce((total, row) => total + row.cumulativeQuantity, 0);
  return <section aria-label="Yeşil Defter çalışma alanı" className="space-y-4" data-green-book-workspace="cumulative-quantities">
    <ReportWorkspaceHeader eyebrow="Kümülatif ilerleme" title="Yeşil Defter" description={`${report.header.documentNo} belgesinin sözleşme, önceki dönem, cari dönem ve kümülatif imalat miktarları.`} />
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><ReportMetric label="Poz sayısı" value={String(report.greenBook.length)} /><ReportMetric label="Hareket gören" value={String(movingRows)} /><ReportMetric label="Kümülatif miktar" value={quantity(cumulativeQuantity)} /><ReportMetric danger={exceededRows > 0} label="Sözleşme aşımı" value={String(exceededRows)} /></div>
    <div className="overflow-x-auto rounded-ui-panel border border-divider bg-surface-raised"><table aria-label="Yeşil Defter miktar tablosu" className="min-w-[1050px] w-full text-left text-xs"><thead className="bg-surface-subtle text-content-muted"><tr><th className="px-3 py-3">Poz / İmalat</th><th className="px-3 py-3 text-center">Birim</th><th className="px-3 py-3 text-right">Sözleşme</th><th className="px-3 py-3 text-right">Önceki</th><th className="bg-brand-primary/5 px-3 py-3 text-right text-brand-primary">Bu hakediş</th><th className="px-3 py-3 text-right">Kümülatif</th><th className="px-3 py-3 text-right">Kalan</th><th className="px-3 py-3">İlerleme / Durum</th></tr></thead><tbody className="divide-y divide-divider">{report.greenBook.map((row) => { const remaining = row.contractQuantity - row.cumulativeQuantity; const progress = Math.min(100, Math.max(0, row.completionRate)); return <tr className={row.exceededContract ? "bg-danger-subtle/50" : "hover:bg-surface-subtle"} key={row.itemCode}><td className="px-3 py-3"><strong className="font-mono text-brand-primary">{row.itemCode}</strong><span className="mt-1 block max-w-sm text-content">{row.description}</span></td><td className="px-3 py-3 text-center text-content-muted">{row.unit}</td><td className="px-3 py-3 text-right font-mono">{quantity(row.contractQuantity)}</td><td className="px-3 py-3 text-right font-mono text-content-muted">{quantity(row.previousQuantity)}</td><td className="bg-brand-primary/5 px-3 py-3 text-right font-mono font-semibold text-brand-primary">{quantity(row.periodQuantity)}</td><td className="px-3 py-3 text-right font-mono font-bold">{quantity(row.cumulativeQuantity)}</td><td className={`px-3 py-3 text-right font-mono font-semibold ${remaining < 0 ? "text-danger" : "text-content"}`}>{quantity(remaining)}</td><td className="px-3 py-3"><div className="flex min-w-32 items-center justify-between gap-2"><span className={row.exceededContract ? "font-semibold text-danger" : "font-semibold text-content"}>%{row.completionRate.toLocaleString("tr-TR")}</span><span className={row.exceededContract ? "rounded-full bg-danger-subtle px-2 py-1 font-semibold text-danger" : row.periodQuantity !== 0 ? "rounded-full bg-success-subtle px-2 py-1 font-semibold text-success" : "rounded-full bg-surface-subtle px-2 py-1 font-semibold text-content-muted"}>{row.exceededContract ? "Aşım" : row.periodQuantity !== 0 ? "Hareketli" : "Hareketsiz"}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-divider"><div className={row.exceededContract ? "h-full bg-danger" : "h-full bg-brand-primary"} style={{ width: `${progress}%` }} /></div></td></tr>; })}</tbody></table></div>
  </section>;
}

function ManufacturingReport({ compact = false, report }: { compact?: boolean; report: PaymentReport }) {
  if (compact) return <ReportTable headers={["Poz", "Birim fiyat", "Önceki miktar", "Bu dönem miktar", "Kümülatif miktar", "Bu dönem tutar", "Kümülatif tutar", "KDV"]} rows={report.manufacturingSheet.map((row) => [<span key="item"><strong>{row.itemCode}</strong><span className="block text-content-muted">{row.description}</span></span>, `${money(row.unitPrice)} TL`, quantity(row.previousQuantity), quantity(row.periodQuantity), quantity(row.cumulativeQuantity), `${money(row.periodAmount)} TL`, `${money(row.cumulativeAmount)} TL`, <span key="vat">%{row.vatRate.toLocaleString("tr-TR")}<span className="block text-content-muted">{money(row.periodVatAmount)} TL</span></span>])} />;

  const previousTotal = report.manufacturingSheet.reduce((total, row) => total + row.previousAmount, 0);
  const periodTotal = report.manufacturingSheet.reduce((total, row) => total + row.periodAmount, 0);
  const cumulativeTotal = report.manufacturingSheet.reduce((total, row) => total + row.cumulativeAmount, 0);
  const contractTotal = report.manufacturingSheet.reduce((total, row) => total + row.contractAmount, 0);
  return <section aria-label="İmalat Çarşafı çalışma alanı" className="space-y-4" data-manufacturing-workspace="amount-sheet">
    <ReportWorkspaceHeader eyebrow="Poz bazlı tutar dökümü" title="İmalat Çarşafı" description="Snapshot birim fiyatlarıyla önceki, cari ve kümülatif imalat tutarlarını aynı mali tabloda karşılaştırın." />
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><ReportMetric label="Önceki dönem" moneyValue value={previousTotal} /><ReportMetric brand label="Bu dönem" moneyValue value={periodTotal} /><ReportMetric label="Kümülatif toplam" moneyValue value={cumulativeTotal} /><ReportMetric label="Sözleşme bakiyesi" moneyValue value={contractTotal - cumulativeTotal} /></div>
    <div className="overflow-x-auto rounded-ui-panel border border-divider bg-surface-raised"><table aria-label="İmalat Çarşafı tutar tablosu" className="min-w-[1250px] w-full text-left text-xs"><thead className="bg-surface-subtle text-content-muted"><tr><th className="px-3 py-3">Poz / İş kalemi</th><th className="px-3 py-3 text-center">Birim</th><th className="px-3 py-3 text-right">Birim fiyat</th><th className="px-3 py-3 text-right">Söz. miktarı</th><th className="px-3 py-3 text-right">Önceki miktar</th><th className="px-3 py-3 text-right">Önceki tutar</th><th className="bg-brand-primary/5 px-3 py-3 text-right text-brand-primary">Bu dönem miktar</th><th className="bg-brand-primary/5 px-3 py-3 text-right text-brand-primary">Bu dönem tutar</th><th className="px-3 py-3 text-right">Kümülatif miktar</th><th className="px-3 py-3 text-right">Kümülatif tutar</th><th className="px-3 py-3 text-right">Kalan miktar</th></tr></thead><tbody className="divide-y divide-divider">{report.manufacturingSheet.map((row) => <tr className="hover:bg-surface-subtle" key={row.itemCode}><td className="px-3 py-3"><strong className="font-mono text-brand-primary">{row.itemCode}</strong><span className="mt-1 block max-w-sm text-content">{row.description}</span></td><td className="px-3 py-3 text-center text-content-muted">{row.unit}</td><td className="px-3 py-3 text-right font-mono">{money(row.unitPrice)} TL</td><td className="px-3 py-3 text-right font-mono">{quantity(row.contractQuantity)}</td><td className="px-3 py-3 text-right font-mono text-content-muted">{quantity(row.previousQuantity)}</td><td className="px-3 py-3 text-right font-mono text-content-muted">{money(row.previousAmount)} TL</td><td className="bg-brand-primary/5 px-3 py-3 text-right font-mono font-semibold text-brand-primary">{quantity(row.periodQuantity)}</td><td className="bg-brand-primary/5 px-3 py-3 text-right font-mono font-semibold text-brand-primary">{money(row.periodAmount)} TL</td><td className="px-3 py-3 text-right font-mono font-semibold">{quantity(row.cumulativeQuantity)}</td><td className="px-3 py-3 text-right font-mono font-bold">{money(row.cumulativeAmount)} TL</td><td className="px-3 py-3 text-right font-mono">{quantity(row.contractQuantity - row.cumulativeQuantity)}</td></tr>)}</tbody><tfoot className="border-t-2 border-divider bg-surface-subtle font-bold"><tr><td className="px-3 py-3 text-right" colSpan={5}>Genel toplamlar</td><td className="px-3 py-3 text-right font-mono">{money(previousTotal)} TL</td><td /><td className="bg-brand-primary/5 px-3 py-3 text-right font-mono text-brand-primary">{money(periodTotal)} TL</td><td /><td className="px-3 py-3 text-right font-mono">{money(cumulativeTotal)} TL</td><td /></tr></tfoot></table></div>
  </section>;
}

function QuantityControlReport({ report }: { report: PaymentReport }) {
  const exceededRows = report.greenBook.filter((row) => row.exceededContract);
  const completedRows = report.greenBook.filter((row) => !row.exceededContract && row.contractQuantity > 0 && row.cumulativeQuantity >= row.contractQuantity);
  const activeRows = report.greenBook.filter((row) => !row.exceededContract && row.cumulativeQuantity > 0 && row.cumulativeQuantity < row.contractQuantity);
  const pendingRows = report.greenBook.filter((row) => row.cumulativeQuantity === 0);
  return <section aria-label="Miktar Kontrolü çalışma alanı" className="space-y-4" data-quantity-control-workspace="contract-balance" id="quantity-control-workspace">
    <ReportWorkspaceHeader eyebrow="Sözleşme miktar kontrolü" title="Miktar Kontrolü" description="Kümülatif imalatı sözleşme miktarıyla karşılaştırır; aşım ve kalan miktarlar mevcut snapshot üzerinden salt okunur hesaplanır." />
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><ReportMetric danger={exceededRows.length > 0} label="Aşım" value={String(exceededRows.length)} /><ReportMetric label="Tamamlanan" value={String(completedRows.length)} /><ReportMetric brand label="Devam eden" value={String(activeRows.length)} /><ReportMetric label="Başlamayan" value={String(pendingRows.length)} /></div>
    {exceededRows.length ? <div className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger"><strong>{exceededRows.length} poz sözleşme miktarını aşıyor.</strong> Hakediş kesinleştirilmeden önce metraj ve sözleşme miktarlarını kontrol edin.</div> : <div className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success"><strong>Miktar kontrolü temiz.</strong> Sözleşme miktarını aşan poz bulunmuyor.</div>}
    <ReportTable headers={["Poz / İmalat", "Sözleşme", "Kümülatif", "Kalan", "Tamamlanma", "Kontrol sonucu"]} rows={report.greenBook.map((row) => { const remaining = row.contractQuantity - row.cumulativeQuantity; const status = row.exceededContract ? "Aşım" : remaining === 0 && row.contractQuantity > 0 ? "Tamamlandı" : row.cumulativeQuantity > 0 ? "Devam ediyor" : "Başlamadı"; return [<span key="item"><strong>{row.itemCode}</strong><span className="block text-content-muted">{row.description}</span></span>, `${quantity(row.contractQuantity)} ${row.unit}`, `${quantity(row.cumulativeQuantity)} ${row.unit}`, <span className={remaining < 0 ? "font-semibold text-danger" : ""} key="balance">{quantity(remaining)} {row.unit}</span>, `%${row.completionRate.toLocaleString("tr-TR")}`, <span className={row.exceededContract ? "font-semibold text-danger" : "font-semibold text-content"} key="status">{status}</span>]; })} />
  </section>;
}

function ReportWorkspaceHeader({ description, eyebrow, title }: { description: string; eyebrow: string; title: string }) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">{eyebrow}</p><h4 className="mt-1 text-xl font-bold text-content">{title}</h4><p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">{description}</p></div><span className="rounded-ui-control border border-divider bg-surface-subtle px-3 py-2 text-xs font-semibold text-content-muted">Snapshot · salt okunur</span></div>;
}

function ReportMetric({ brand = false, danger = false, label, moneyValue = false, value }: { brand?: boolean; danger?: boolean; label: string; moneyValue?: boolean; value: number | string }) {
  const className = danger ? "border-danger/30 bg-danger-subtle text-danger" : brand ? "border-brand-primary/30 bg-brand-primary/5 text-brand-primary" : "border-divider bg-surface-raised text-content";
  return <article className={`rounded-ui-control border p-3 ${className}`}><p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p><p className="mt-2 font-mono text-lg font-bold">{moneyValue ? `${money(Number(value))} TL` : value}</p></article>;
}

function PaymentSummaryReport({ report }: { report: PaymentReport }) {
  const summary = report.summary;
  return <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><SummaryValue label="İmalat" value={summary.periodWorkTotal} /><SummaryValue label="Tutanaklı işler" value={summary.periodExtraWorkTotal} /><SummaryValue label="İlaveler" value={summary.periodAdditionTotal} /><SummaryValue label="Kesintiler" value={summary.periodDeductionTotal} /><SummaryValue label="Dönem ödenecek" value={summary.periodPayableTotal} /></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><SummaryValue label="Projection brüt" value={summary.projectedGrossTotal} /><SummaryValue label="Teminat/kesinti" value={summary.projectedRetentionTotal} /><SummaryValue label="Projection net" value={summary.projectedNetTotal} /><SummaryValue label="KDV" value={summary.projectedVatTotal} /><SummaryValue label="Genel toplam" value={summary.projectedGrandTotal} /></div><ReportTable headers={["Hareket", "Belge / tür", "Açıklama", "Tutar"]} rows={[...report.extraWorks.map((row) => ["Tutanaklı iş", row.documentNo, row.description, `${money(row.amount)} TL`]), ...report.financialMovements.map((row) => [row.direction === "ADDITION" ? "İlave" : "Kesinti", row.movementType, row.description, `${row.direction === "ADDITION" ? "+" : "-"}${money(row.amount)} TL`]), ...report.deductions.map((row) => ["Kesinti", row.category, row.description, `-${money(row.totalAmount)} TL`])]} empty="Bu hakedişte ek finansal hareket yok." /></div>;
}

function PaymentAccountingWorkspace({ report }: { report: PaymentReport }) {
  const accounting = report.accounting;
  const debitTotal = accounting?.debitTotal ?? 0;
  const creditTotal = accounting?.creditTotal ?? 0;
  const difference = Math.abs(debitTotal - creditTotal);
  const linked = Boolean(accounting?.ledgerEntryId);
  return <section aria-label="Hakediş muhasebe bağlantısı çalışma alanı" className="space-y-4" data-accounting-workspace="progress-payment-ledger">
    <div className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Muhasebe entegrasyonu</p><h4 className="mt-1 text-xl font-bold text-content">Yevmiye Fişi ve Hesap Dağılımı</h4><p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">Kesinleştirme sırasında oluşturulan gerçek muhasebe bağlantısını ve kapsamlı ledger satırlarını salt okunur inceleyin.</p></div><span className={linked ? "rounded-ui-control border border-success/30 bg-success-subtle px-3 py-2 text-xs font-semibold text-success" : "rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning"}>{linked ? ledgerStatusLabel(accounting?.ledgerStatus) : "Bağlantı bekleniyor"}</span></div></div>
      <div className="grid gap-px bg-divider sm:grid-cols-2 xl:grid-cols-4"><ReportMetric label="Yevmiye satırı" value={String(accounting?.lines.length ?? 0)} /><ReportMetric brand label="Borç toplamı" moneyValue value={debitTotal} /><ReportMetric brand label="Alacak toplamı" moneyValue value={creditTotal} /><ReportMetric danger={difference > 0} label="Denge farkı" moneyValue value={difference} /></div>
      {accounting ? <div className="grid gap-px border-t border-divider bg-divider sm:grid-cols-2 xl:grid-cols-4"><AccountingValue label="Bağlı hakediş" value={accounting.progressPaymentId} /><AccountingValue label="Yevmiye fişi" value={accounting.ledgerDocumentNo ?? "Henüz oluşmadı"} /><AccountingValue label="Fiş tarihi" value={accounting.entryDate ? shortDate(accounting.entryDate) : "—"} /><AccountingValue label="Para birimi" value={accounting.currency} /></div> : null}
    </div>
    {!accounting ? <div className="rounded-ui-control border border-warning/30 bg-warning-subtle p-4 text-sm text-warning"><strong>Muhasebe bağlantısı henüz oluşmadı.</strong> Bağlantı, mevcut kesinleştirme ve idempotent ledger akışı tamamlandığında otomatik görünür.</div> : null}
    {accounting && !linked ? <div className="rounded-ui-control border border-warning/30 bg-warning-subtle p-4 text-sm text-warning"><strong>Finansal hakediş bağlantısı mevcut ancak yevmiye fişi bulunamadı.</strong> Yeni fiş veya tekrar gönderim kontrolü sunulmaz; mevcut recovery akışı ve kayıt durumu korunur.</div> : null}
    {linked ? <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"><div className="min-w-0"><ReportTable headers={["Satır", "Hesap", "Hesap adı", "Açıklama", "Borç", "Alacak"]} rows={(accounting?.lines ?? []).map((line) => [line.lineNo, line.accountCode, line.accountName, line.description || accounting?.description || "—", `${money(line.debit)} ${accounting?.currency}`, `${money(line.credit)} ${accounting?.currency}`])} empty="Yevmiye satırı bulunmuyor." /></div><aside className="space-y-3 rounded-ui-panel border border-divider bg-surface-raised p-4"><p className="text-xs font-bold uppercase tracking-wide text-content-muted">Fiş doğrulaması</p><p className="text-sm font-semibold text-content">{accounting?.ledgerDocumentNo}</p><p className="text-xs leading-5 text-content-muted">{accounting?.description || `${report.header.documentNo} hakediş muhasebe kaydı`}</p><div className={difference === 0 ? "rounded-ui-control border border-success/30 bg-success-subtle p-3 text-success" : "rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-danger"}><strong>{difference === 0 ? "Fiş dengeli" : "Fiş dengesiz"}</strong><p className="mt-1 text-xs">{difference === 0 ? "Borç ve alacak toplamları eşit." : `${money(difference)} ${accounting?.currency} fark bulunuyor.`}</p></div><p className="rounded-ui-control border border-divider bg-surface-subtle p-3 text-xs leading-5 text-content-muted">Şablondaki hesap eşleştirme ve senkronizasyon kontrolleri için kalıcı model bulunmadığından bu alan yalnız gerçek yevmiye fişini gösterir.</p></aside></div> : null}
  </section>;
}

function PaymentReportCenter({ onOpen, report }: { onOpen: (tab: ReportTab) => void; report: PaymentReport }) {
  const cards: Array<{ title: string; description: string; target: ReportTab; ready: boolean; detail: string }> = [
    { title: "Hakediş Kapak ve Özeti", description: "Proje, dönem, sözleşme ve kümülatif mali özet.", target: "COVER", ready: true, detail: report.header.documentNo },
    { title: "Mali İcmal", description: "İmalat, KDV, kesinti ve ödenecek tutarların dönem özeti.", target: "SUMMARY", ready: true, detail: `${money(report.summary.periodPayableTotal)} ${report.header.currency}` },
    { title: "Genel / Demir Metraj Dökümü", description: "Kayıtlı föyler, satırlar ve onay izi aynı rapor görünümünde.", target: "AUDIT", ready: report.measurementSheets.length > 0, detail: `${report.measurementSheets.length} föy` },
    { title: "Yeşil Defter", description: "Poz bazında önceki, cari, kümülatif ve kalan miktarlar.", target: "GREEN_BOOK", ready: report.greenBook.length > 0, detail: `${report.greenBook.length} poz` },
    { title: "İmalat Çarşafı", description: "Snapshot fiyatlarıyla dönem ve kümülatif imalat tutarları.", target: "MANUFACTURING", ready: report.manufacturingSheet.length > 0, detail: `${report.manufacturingSheet.length} poz` },
    { title: "Miktar Kontrolü", description: "Sözleşme miktarı, ilerleme ve aşım kontrol sonuçları.", target: "QUANTITY_CONTROL", ready: report.greenBook.length > 0, detail: `${report.greenBook.filter((row) => row.exceededContract).length} aşım` },
  ];
  return <section aria-label="Hakediş rapor merkezi" className="space-y-4" data-report-center-workspace="progress-payment-reports">
    <ReportWorkspaceHeader eyebrow="Standart rapor kataloğu" title="Rapor Merkezi" description="Hakedişin mevcut gerçek read-model raporlarını tek katalogda açın. Dosya üretim altyapısı olmayan Excel/PDF kontrolleri gösterilmez." />
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><ReportMetric label="Rapor görünümü" value={String(cards.length)} /><ReportMetric brand label="Hazır rapor" value={String(cards.filter((card) => card.ready).length)} /><ReportMetric label="Metraj föyü" value={String(report.measurementSheets.length)} /><ReportMetric label="Audit kaydı" value={String(report.auditLogs.length)} /></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map((card) => <article className="flex min-w-0 flex-col rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm" key={card.title}><div className="flex items-start justify-between gap-3"><div><h5 className="font-bold text-content">{card.title}</h5><p className="mt-1 text-sm leading-6 text-content-muted">{card.description}</p></div><span className={card.ready ? "rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success" : "rounded-full bg-surface-subtle px-2 py-1 text-xs font-semibold text-content-muted"}>{card.ready ? "Hazır" : "Veri bekliyor"}</span></div><div className="mt-auto flex items-center justify-between gap-3 border-t border-divider pt-4"><span className="font-mono text-xs text-content-muted">{card.detail}</span><button aria-label={`${card.title} raporunu aç`} className={secondaryButton} disabled={!card.ready} onClick={() => onOpen(card.target)} type="button">Aç</button></div></article>)}</div>
  </section>;
}

type CsvPreviewRow = { lineNo: number; itemCode: string; description: string; unit: string; quantity: number | null; status: "READY" | "ERROR"; message: string };
type CsvPreview = { fileName: string; issue: string | null; rows: CsvPreviewRow[] };
type SimulationResult = { itemCode: string; description: string; unit: string; proposedQuantity: number; currentCumulative: number; projectedCumulative: number; contractQuantity: number; projectedRemaining: number; projectedAmount: number };

function ImportSimulationWorkspace({ report }: { report: PaymentReport }) {
  const firstItemCode = report.manufacturingSheet[0]?.itemCode ?? "";
  const [selectedItemCode, setSelectedItemCode] = useState(firstItemCode);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const readyRows = preview?.rows.filter((row) => row.status === "READY").length ?? 0;
  const errorRows = preview?.rows.filter((row) => row.status === "ERROR").length ?? 0;

  async function previewCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) { setPreview(null); return; }
    if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".csv")) {
      setPreview({ fileName: file.name, issue: "Bu güvenli önizleme yalnız CSV dosyalarını okur. XLSX aktarımı F2 mini-RFC kapsamındadır.", rows: [] });
      return;
    }
    try {
      const text = await file.text();
      setPreview(parseMeasurementCsv(text, report.greenBook, file.name));
    } catch {
      setPreview({ fileName: file.name, issue: "Dosya tarayıcıda okunamadı. Kaynak dosyayı değiştirmeden yeniden deneyin.", rows: [] });
    }
  }

  function calculateSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item = report.manufacturingSheet.find((row) => row.itemCode === selectedItemCode);
    if (!item) { setSimulation(null); setSimulationError("Simülasyon için geçerli bir sözleşme pozu seçin."); return; }
    const directText = textValue(data, "directQuantity");
    const proposedQuantity = directText
      ? Number(directText)
      : numberValue(data, "length") * numberValue(data, "width") * numberValue(data, "height") * numberValue(data, "multiplier");
    if (!Number.isFinite(proposedQuantity) || proposedQuantity <= 0) {
      setSimulation(null); setSimulationError("Doğrudan miktar veya pozitif ölçü değerleriyle sıfırdan büyük bir sonuç üretin."); return;
    }
    const projectedCumulative = item.cumulativeQuantity + proposedQuantity;
    setSimulation({ itemCode: item.itemCode, description: item.description, unit: item.unit, proposedQuantity, currentCumulative: item.cumulativeQuantity, projectedCumulative, contractQuantity: item.contractQuantity, projectedRemaining: item.contractQuantity - projectedCumulative, projectedAmount: proposedQuantity * item.unitPrice });
    setSimulationError(null);
  }

  return <section aria-label="Toplu aktarım ve poz bazlı simülasyon çalışma alanı" className="space-y-4" data-import-simulation-workspace="measurement-candidates">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Faz 6 · Güvenli aday çalışma alanı</p><h4 className="mt-1 text-xl font-bold text-content">Toplu Aktarım ve Poz Bazlı Simülasyon</h4><p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">CSV satırlarını tarayıcıda doğrulayın ve mevcut snapshot verisiyle miktar etkisini hesaplayın. Bu ekran hiçbir kayıt veya audit olayı oluşturmaz.</p></div><span className="rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning">Yerel önizleme · yazma yok</span></div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <article className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="border-b border-divider bg-surface-subtle p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">1 · Dosya doğrulama</p><h5 className="mt-1 text-lg font-bold text-content">CSV Metraj Önizlemesi</h5><p className="mt-1 text-sm text-content-muted">Beklenen başlıklar: <code>poz_no</code>, <code>miktar</code>, isteğe bağlı <code>aciklama</code> ve <code>birim</code>.</p></div>
        <div className="space-y-4 p-4"><label className="block cursor-pointer rounded-ui-panel border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 p-5 text-center"><span className="block text-sm font-semibold text-content">CSV dosyası seçin</span><span className="mt-1 block text-xs text-content-muted">Dosya yalnız bu tarayıcı oturumunda okunur; sunucuya gönderilmez.</span><input aria-label="Metraj CSV dosyası" accept=".csv,text/csv" className="mt-3 block w-full text-xs text-content-muted" onChange={previewCsv} type="file" /></label>
          {preview ? <><div className="flex flex-wrap items-center justify-between gap-2"><p className="break-all font-mono text-xs font-semibold text-content">{preview.fileName}</p><span className="text-xs text-content-muted">{preview.rows.length} veri satırı</span></div>{preview.issue ? <p aria-live="polite" className="rounded-ui-control border border-warning/30 bg-warning-subtle p-3 text-sm text-warning">{preview.issue}</p> : <div className="grid gap-2 sm:grid-cols-3"><ReportMetric label="Bulunan satır" value={String(preview.rows.length)} /><ReportMetric brand label="Aktarıma hazır" value={String(readyRows)} /><ReportMetric danger={errorRows > 0} label="Hatalı satır" value={String(errorRows)} /></div>}{preview.rows.length ? <ReportTable headers={["Satır", "Poz", "Açıklama", "Miktar", "Kontrol"]} rows={preview.rows.map((row) => [row.lineNo, row.itemCode || "—", row.description || "—", row.quantity === null ? "—" : `${quantity(row.quantity)} ${row.unit}`, <span className={row.status === "READY" ? "font-semibold text-success" : "font-semibold text-danger"} key="status">{row.message}</span>])} /> : null}</> : <p className="rounded-ui-control border border-divider bg-surface-subtle p-3 text-xs leading-5 text-content-muted">Önizleme, dosyayı değiştirmeden poz kodu, miktar ve birim uyumunu mevcut hakediş read-model&apos;iyle karşılaştırır.</p>}
          <p className="rounded-ui-control border border-divider bg-surface-subtle p-3 text-xs leading-5 text-content-muted"><strong>F2 sınırı:</strong> XLSX ayrıştırma, sütun eşleme, toplu DB yazımı, audit, idempotency ve rollback tasarımı ayrı mini-RFC ve kullanıcı onayı gerektirir.</p>
        </div>
      </article>
      <article className="min-w-0 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="border-b border-divider bg-surface-subtle p-4"><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">2 · Etki hesabı</p><h5 className="mt-1 text-lg font-bold text-content">Poz Bazlı Metraj Simülasyonu</h5><p className="mt-1 text-sm text-content-muted">Mevcut kümülatif miktara önerilen metrajı ekleyerek sözleşme bakiyesi ve dönem tutarı etkisini görün.</p></div>
        <form aria-label="Poz bazlı metraj simülasyonu" className="grid gap-3 p-4 sm:grid-cols-2" onSubmit={calculateSimulation}><label className="text-xs font-semibold text-content sm:col-span-2">Sözleşme pozu<select className={`${fieldClass} mt-1 w-full`} onChange={(event) => { setSelectedItemCode(event.currentTarget.value); setSimulation(null); }} value={selectedItemCode}>{report.manufacturingSheet.map((item) => <option key={item.itemCode} value={item.itemCode}>{item.itemCode} · {item.description}</option>)}</select></label><label className="text-xs font-semibold text-content">Doğrudan miktar<input className={`${fieldClass} mt-1 w-full`} min="0.0001" name="directQuantity" placeholder="İsteğe bağlı" step="0.0001" type="number" /></label><span className="self-end pb-2 text-xs text-content-muted">Doluysa ölçülerin yerine kullanılır.</span><label className="text-xs font-semibold text-content">Boy<input className={`${fieldClass} mt-1 w-full`} defaultValue="1" min="0.0001" name="length" step="0.0001" type="number" /></label><label className="text-xs font-semibold text-content">En<input className={`${fieldClass} mt-1 w-full`} defaultValue="1" min="0.0001" name="width" step="0.0001" type="number" /></label><label className="text-xs font-semibold text-content">Yükseklik<input className={`${fieldClass} mt-1 w-full`} defaultValue="1" min="0.0001" name="height" step="0.0001" type="number" /></label><label className="text-xs font-semibold text-content">Çarpan<input className={`${fieldClass} mt-1 w-full`} defaultValue="1" min="0.0001" name="multiplier" step="0.0001" type="number" /></label><button className={`${primaryButton} sm:col-span-2`} disabled={!report.manufacturingSheet.length} type="submit">Simülasyonu hesapla</button></form>
        <div aria-live="polite" className="border-t border-divider p-4">{simulationError ? <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{simulationError}</p> : null}{simulation ? <div className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-xs font-bold text-brand-primary">{simulation.itemCode}</p><p className="mt-1 text-sm font-semibold text-content">{simulation.description}</p></div><span className={simulation.projectedRemaining < 0 ? "rounded-full bg-danger-subtle px-2 py-1 text-xs font-semibold text-danger" : "rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success"}>{simulation.projectedRemaining < 0 ? "Sözleşme aşımı" : "Sınırlar içinde"}</span></div><div className="grid gap-2 sm:grid-cols-2"><ReportMetric brand label="Önerilen miktar" value={`${quantity(simulation.proposedQuantity)} ${simulation.unit}`} /><ReportMetric label="Tahmini dönem tutarı" moneyValue value={simulation.projectedAmount} /><ReportMetric label="Yeni kümülatif" value={`${quantity(simulation.projectedCumulative)} ${simulation.unit}`} /><ReportMetric danger={simulation.projectedRemaining < 0} label="Kalan sözleşme" value={`${quantity(simulation.projectedRemaining)} ${simulation.unit}`} /></div><p className="rounded-ui-control border border-divider bg-surface-subtle p-3 text-xs leading-5 text-content-muted">Hesap, {quantity(simulation.currentCumulative)} {simulation.unit} mevcut kümülatif ve {quantity(simulation.contractQuantity)} {simulation.unit} sözleşme miktarını kullanır. Sonuç föye aktarılmaz ve kaydedilmez.</p></div> : !simulationError ? <p className="text-sm text-content-muted">Bir poz ve miktar seçerek salt okunur etki hesabını başlatın.</p> : null}</div>
      </article>
    </div>
  </section>;
}

function AccountingValue({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-surface-raised p-4"><p className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</p><p className="mt-1 break-all font-mono text-sm font-semibold text-content">{value}</p></div>;
}

function PaymentAuditReport({ report }: { report: PaymentReport }) {
  return <div className="grid gap-4 lg:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">Metraj föyleri</p><ReportTable headers={["Föy", "Tür", "Başlık", "Satır", "Durum"]} rows={report.measurementSheets.map((row) => [row.sheetNo, row.sheetType === "REBAR" ? "Demir" : "Genel", row.title, row.lineCount, row.status])} empty="Metraj föyü bulunmuyor." /></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">Onay izi</p><ReportTable headers={["Tarih", "Geçiş", "Gerekçe", "Kullanıcı"]} rows={report.approvals.map((row) => [dateTime(row.createdAt), `${row.statusFrom ?? "Başlangıç"} → ${row.statusTo}`, row.reason ?? "—", row.actorUserId])} empty="Onay olayı bulunmuyor." /></div><div className="lg:col-span-2"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">Merkezi audit kayıtları</p><ReportTable headers={["Tarih", "Aksiyon", "Kullanıcı", "Durum"]} rows={report.auditLogs.map((row) => [dateTime(row.occurredAt), row.action, row.actorUserId, auditStatus(row.metadata)])} empty="Merkezi audit kaydı bulunmuyor." /></div><div className="space-y-3 lg:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Metraj satır dökümü</p>{report.measurementSheets.map((sheet) => <div key={sheet.sheetNo}><p className="mb-1 text-xs font-medium text-content-subtle">{sheet.sheetNo} · {sheet.title}</p><ReportTable headers={["Satır", "Poz", "Açıklama", "Ölçüler", "Miktar"]} rows={sheet.lines.map((line) => [line.lineNo, line.itemCode, line.description || line.itemDescription, reportMeasurementFormula(line), `${quantity(line.quantity)} ${line.unit}`])} empty="Bu föyde metraj satırı yok." /></div>)}</div><div className="rounded-lg border border-divider bg-surface-raised p-3 text-xs lg:col-span-2"><p className="font-semibold text-content">Muhasebe bağlantısı</p>{report.accounting ? <div className="mt-2 grid gap-2 md:grid-cols-4"><AuditValue label="ProgressPayment" value={report.accounting.progressPaymentId} /><AuditValue label="Ledger fişi" value={report.accounting.ledgerEntryId ?? "—"} /><AuditValue label="Belge no" value={report.accounting.ledgerDocumentNo ?? "—"} /><AuditValue label="Durum" value={report.accounting.ledgerStatus ?? "—"} /></div> : <p className="mt-1 text-content-muted">Hakediş henüz finansal projection’a kesinleştirilmedi.</p>}</div></div>;
}

function ReportTable({ headers, rows, empty = "Kayıt bulunmuyor." }: { headers: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="rounded-lg bg-surface-raised p-3 text-xs text-content-muted">{empty}</p>;
  return <div className="overflow-x-auto rounded-lg border border-divider bg-surface-raised"><table className="min-w-full text-left text-xs"><thead className="bg-surface-muted text-content-muted"><tr>{headers.map((header) => <th className="whitespace-nowrap px-3 py-2 font-medium" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr className="border-t border-divider" key={rowIndex}>{row.map((cell, cellIndex) => <td className="whitespace-nowrap px-3 py-2 text-content-subtle" key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function AuditValue({ label, value }: { label: string; value: string }) { return <span><span className="block text-content-muted">{label}</span><span className="break-all font-medium text-content">{value}</span></span>; }

function PaymentDetailsPanel({ editable, items, payment, pending, run }: { editable: boolean; items: ContractItem[]; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  useEffect(() => {
    let active = true;
    void listConstructionProgressPaymentDetailsAction(payment.id).then((result) => { if (active && result.ok) setDetails(result.data); });
    return () => { active = false; };
  }, [payment.id, payment.updatedAt]);

  function addSheet(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); run(() => createConstructionMeasurementSheetAction({ progressPaymentId: payment.id, sheetNo: textValue(data, "sheetNo"), sheetType: textValue(data, "sheetType") === "REBAR" ? "REBAR" : "GENERAL", title: textValue(data, "title") }), "Metraj föyü oluşturuldu."); form.reset(); }
  function addExtra(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); run(() => createConstructionExtraWorkAction({ progressPaymentId: payment.id, documentNo: textValue(data, "documentNo"), workDate: textValue(data, "workDate"), description: textValue(data, "description"), unit: textValue(data, "unit"), quantity: numberValue(data, "quantity"), unitPrice: numberValue(data, "unitPrice"), vatRate: numberValue(data, "vatRate") }), "Tutanaklı iş ve özet tutarı kaydedildi."); form.reset(); }
  function addDeduction(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); run(() => createConstructionDeductionMovementAction({ progressPaymentId: payment.id, category: textValue(data, "category"), documentNo: textValue(data, "documentNo"), movementDate: textValue(data, "movementDate"), description: textValue(data, "description"), amount: numberValue(data, "amount"), vatAmount: numberValue(data, "vatAmount") }), "Kesinti hareketi ve özet tutarı kaydedildi."); form.reset(); }
  function addFinancial(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const movementType = textValue(data, "movementType") as "ADVANCE" | "RETENTION" | "WITHHOLDING" | "TAX_WITHHOLDING" | "RESERVE" | "PRICE_DIFFERENCE"; run(() => createConstructionFinancialMovementAction({ progressPaymentId: payment.id, movementType, direction: textValue(data, "direction") === "ADDITION" ? "ADDITION" : "DEDUCTION", movementDate: textValue(data, "movementDate"), description: textValue(data, "description"), amount: numberValue(data, "amount") }), "Finansal hareket ve özet tutarı kaydedildi."); form.reset(); }

  return <section className="min-w-0 rounded-ui-panel border border-divider bg-surface-subtle p-3 shadow-sm xl:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-content">Hakediş {payment.sequenceNo} detayları</p><p className="text-xs text-content-muted">Metraj Genel · Metraj Demir · Tutanaklı İşler · Kesintiler · Özet</p></div>{details ? <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4"><SummaryValue label="Ek işler" value={details.summary.periodExtraWorkTotal} /><SummaryValue label="İlaveler" value={details.summary.periodAdditionTotal} /><SummaryValue label="Kesintiler" value={details.summary.periodDeductionTotal} /><SummaryValue label="Ödenecek" value={details.summary.periodPayableTotal} /></div> : null}</div>
    {details ? <MeasurementEntryWorkspace addSheet={addSheet} editable={editable} items={items} payment={payment} pending={pending} run={run} sheets={details.measurementSheets} /> : <p className="mt-4 rounded-ui-control border border-divider bg-surface-raised p-4 text-sm text-content-muted">Metraj föyleri hazırlanıyor…</p>}
    {details ? <SupplementaryWorksWorkspace addDeduction={addDeduction} addExtra={addExtra} addFinancial={addFinancial} details={details} editable={editable} payment={payment} pending={pending} run={run} /> : null}</section>;
}

type SupplementaryTab = "EXTRA_WORK" | "DEDUCTION" | "FINANCIAL";

function SupplementaryWorksWorkspace({ addDeduction, addExtra, addFinancial, details, editable, payment, pending, run }: { addDeduction: (event: FormEvent<HTMLFormElement>) => void; addExtra: (event: FormEvent<HTMLFormElement>) => void; addFinancial: (event: FormEvent<HTMLFormElement>) => void; details: PaymentDetails; editable: boolean; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  const [tab, setTab] = useState<SupplementaryTab>("EXTRA_WORK");
  const extraTotal = details.extraWorks.reduce((total, row) => total + row.periodAmount, 0);
  const documentDeductionTotal = details.deductions.reduce((total, row) => total + row.totalAmount, 0);
  const financialDeductionTotal = details.financialMovements.filter((row) => row.direction === "DEDUCTION").reduce((total, row) => total + row.amount, 0);
  const financialAdditionTotal = details.financialMovements.filter((row) => row.direction === "ADDITION").reduce((total, row) => total + row.amount, 0);
  const tabs: Array<{ id: SupplementaryTab; label: string }> = [{ id: "EXTRA_WORK", label: "Tutanaklı İşler" }, { id: "DEDUCTION", label: "Kesintiler" }, { id: "FINANCIAL", label: "Finansal Hareketler" }];

  function remove(detailId: string, detailType: "EXTRA_WORK" | "DEDUCTION" | "FINANCIAL_MOVEMENT", message: string) {
    run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId, detailType }), message);
  }

  return <section aria-label="Tutanaklı işler ve kesintiler çalışma alanı" className="mt-4 scroll-mt-20 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm" data-commercial-adjustments-workspace="supplementary-works" id="commercial-adjustments-workspace">
    <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Hakediş {payment.sequenceNo} · Ek hareketler</p><h3 className="mt-1 text-lg font-bold text-content">Tutanaklı İşler ve Kesintiler</h3><p className="mt-1 max-w-3xl text-sm text-content-muted">Belgeli ek imalatları, kesintileri ve finansal düzeltmeleri cari hakediş özetiyle aynı gerçek kayıt setinde yönetin.</p></div><span className={editable ? "rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning" : "rounded-ui-control border border-divider bg-surface-subtle px-3 py-2 text-xs font-semibold text-content-muted"}>{editable ? "Taslak hakediş · düzenlenebilir" : `${statusLabels[payment.status] ?? payment.status} · salt okunur`}</span></div><div aria-label="Ek hareket türü" className="mt-4 flex flex-wrap gap-2" role="tablist">{tabs.map((item) => <button aria-selected={tab === item.id} className={tab === item.id ? primaryButton : secondaryButton} key={item.id} onClick={() => setTab(item.id)} role="tab" type="button">{item.label}</button>)}</div></div>
    <div className="grid gap-px bg-divider sm:grid-cols-2 xl:grid-cols-4"><AdjustmentMetric label="Tutanak toplamı" value={extraTotal} /><AdjustmentMetric danger label="Belge kesintisi" value={documentDeductionTotal} /><AdjustmentMetric danger label="Finans kesintisi" value={financialDeductionTotal} /><AdjustmentMetric brand label="Finans ilavesi" value={financialAdditionTotal} /></div>
    <div className="p-4 sm:p-5" role="tabpanel">
      {tab === "EXTRA_WORK" ? <div className={editable ? "grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]" : "space-y-4"}>{editable ? <form aria-label="Tutanaklı iş ekle" className="grid content-start gap-2 rounded-ui-control border border-divider bg-surface-subtle p-3" onSubmit={addExtra}><p className="text-sm font-bold text-content">Yeni tutanaklı iş</p><input className={fieldClass} name="documentNo" placeholder="Tutanak no" required /><input aria-label="Tutanak tarihi" className={fieldClass} name="workDate" required type="date" /><input className={fieldClass} name="description" placeholder="İş tanımı" required /><div className="grid grid-cols-3 gap-2"><input className={fieldClass} name="unit" placeholder="Birim" required /><input className={fieldClass} min="0.0001" name="quantity" placeholder="Miktar" required step="0.0001" type="number" /><input className={fieldClass} min="0" name="unitPrice" placeholder="Birim fiyat" required step="0.0001" type="number" /></div><input className={fieldClass} defaultValue="0" min="0" name="vatRate" placeholder="KDV oranı" step="0.01" type="number" /><button className={primaryButton} disabled={pending} type="submit">Tutanak ekle</button></form> : null}<SupplementaryTable ariaLabel="Tutanaklı işler" empty="Bu hakedişte tutanaklı iş bulunmuyor." headers={["Tutanak", "Tarih", "İş tanımı", "Miktar", "Tutar", "Durum", "İşlem"]} rows={details.extraWorks.map((row) => [row.documentNo, shortDate(row.workDate), row.description, `${quantity(row.quantity)} ${row.unit}`, `${money(row.periodAmount)} TL`, row.status, editable ? <button className="font-semibold text-danger" disabled={pending} key="delete" onClick={() => remove(row.id, "EXTRA_WORK", "Tutanaklı iş silindi ve özet yeniden hesaplandı.")} type="button">Sil</button> : <span className="text-content-muted" key="readonly">Salt okunur</span>])} /></div> : null}
      {tab === "DEDUCTION" ? <div className="space-y-4"><DeductionRulePaymentWorkspace details={details} editable={editable} payment={payment} pending={pending} run={run} /><div className={editable ? "grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]" : "space-y-4"}>{editable ? <form aria-label="Kesinti ekle" className="grid content-start gap-2 rounded-ui-control border border-divider bg-surface-subtle p-3" onSubmit={addDeduction}><p className="text-sm font-bold text-content">Yeni manuel kesinti kalemi</p><select className={fieldClass} name="category"><option>Yemek/Malzeme</option><option>Hizmet</option><option>Makine/Ekipman</option><option>İmalat/İşçilik</option><option>Diğer</option></select><input className={fieldClass} name="documentNo" placeholder="Belge no" /><input aria-label="Kesinti tarihi" className={fieldClass} name="movementDate" required type="date" /><input className={fieldClass} name="description" placeholder="Kesinti açıklaması" required /><div className="grid grid-cols-2 gap-2"><input className={fieldClass} min="0" name="amount" placeholder="Tutar" required step="0.01" type="number" /><input className={fieldClass} defaultValue="0" min="0" name="vatAmount" placeholder="KDV" step="0.01" type="number" /></div><button className={primaryButton} disabled={pending} type="submit">Manuel kesinti ekle</button></form> : null}<div className="min-w-0 space-y-3"><SupplementaryTable ariaLabel="Kesinti kalemleri" empty="Bu hakedişte kesinti hareketi bulunmuyor." headers={["Kategori", "Belge", "Tarih", "Açıklama", "Matrah", "KDV", "Toplam", "İşlem"]} rows={details.deductions.map((row) => [row.category, row.documentNo || "—", shortDate(row.movementDate), row.description, `${money(row.amount)} TL`, `${money(row.vatAmount)} TL`, `${money(row.totalAmount)} TL`, editable && !row.ruleApplicationId ? <button className="font-semibold text-danger" disabled={pending} key="delete" onClick={() => remove(row.id, "DEDUCTION", "Kesinti silindi ve özet yeniden hesaplandı.")} type="button">Sil</button> : <span className="text-content-muted" key="readonly">{row.ruleApplicationId ? "Kural kaydı" : "Salt okunur"}</span>])} /></div></div></div> : null}
      {tab === "FINANCIAL" ? <div className={editable ? "grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]" : "space-y-4"}>{editable ? <form aria-label="Finansal hareket ekle" className="grid content-start gap-2 rounded-ui-control border border-divider bg-surface-subtle p-3" onSubmit={addFinancial}><p className="text-sm font-bold text-content">Yeni finansal hareket</p><select className={fieldClass} name="movementType"><option value="ADVANCE">Avans</option><option value="RETENTION">Teminat</option><option value="WITHHOLDING">Tevkifat</option><option value="TAX_WITHHOLDING">Stopaj</option><option value="RESERVE">İhtiyat</option><option value="PRICE_DIFFERENCE">Fiyat farkı</option></select><select className={fieldClass} name="direction"><option value="DEDUCTION">Kesinti</option><option value="ADDITION">İlave</option></select><input aria-label="Hareket tarihi" className={fieldClass} name="movementDate" required type="date" /><input className={fieldClass} name="description" placeholder="Açıklama" required /><input className={fieldClass} min="0.01" name="amount" placeholder="Tutar" required step="0.01" type="number" /><button className={primaryButton} disabled={pending} type="submit">Hareket ekle</button></form> : null}<SupplementaryTable ariaLabel="Finansal hareketler" empty="Bu hakedişte finansal kesinti veya ilave bulunmuyor." headers={["Tür", "Yön", "Tarih", "Açıklama", "Tutar", "İşlem"]} rows={details.financialMovements.map((row) => [row.movementType, row.direction === "ADDITION" ? "İlave" : "Kesinti", shortDate(row.movementDate), row.description, `${row.direction === "ADDITION" ? "+" : "-"}${money(row.amount)} TL`, editable ? <button className="font-semibold text-danger" disabled={pending} key="delete" onClick={() => remove(row.id, "FINANCIAL_MOVEMENT", "Finansal hareket silindi ve özet yeniden hesaplandı.")} type="button">Sil</button> : <span className="text-content-muted" key="readonly">Salt okunur</span>])} /></div> : null}
    </div>
  </section>;
}

type DeductionRulePreview = Extract<Awaited<ReturnType<typeof previewConstructionDeductionRulesAction>>, { ok: true }>["data"];

function DeductionRulePaymentWorkspace({ details, editable, payment, pending, run }: { details: PaymentDetails; editable: boolean; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  const [preview, setPreview] = useState<DeductionRulePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPending, startPreviewTransition] = useTransition();
  const applicationTotal = details.deductionRuleApplications.reduce((total, row) => total + row.totalAmount, 0);
  const canOperate = editable && details.canApplyDeductionRules;

  function loadPreview() {
    startPreviewTransition(async () => {
      const result = await previewConstructionDeductionRulesAction(payment.id);
      if (result.ok) { setPreview(result.data); setError(null); }
      else { setPreview(null); setError(readErrors(result)); }
    });
  }

  function applyPreview() {
    run(async () => {
      const result = await applyConstructionDeductionRulesAction(payment.id);
      if (result.ok) { setPreview(null); setError(null); }
      return result;
    }, "Kesinti kuralları uygulandı; snapshot ve hakediş özeti yenilendi.");
  }

  return <section aria-label="Hakediş kesinti kuralı önizleme ve uygulama" className="overflow-hidden rounded-ui-control border border-brand-primary/25 bg-brand-primary/5">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-primary/15 p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-primary">Kural motoru</p><h4 className="mt-1 text-base font-bold text-content">Önizleme ve Gerçekleşen Snapshot</h4><p className="mt-1 max-w-3xl text-xs leading-5 text-content-muted">Önizleme veri yazmaz. Uygulama; kural snapshot’ı, kesinti hareketi, hakediş özeti ve audit kaydını tek transaction’da üretir.</p></div><div className="flex flex-wrap gap-2"><span className="rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content">{details.deductionRuleApplications.length} uygulama · {money(applicationTotal)} TL</span>{canOperate ? <button className={secondaryButton} disabled={pending || previewPending} onClick={loadPreview} type="button">{previewPending ? "Hesaplanıyor…" : "Kuralları önizle"}</button> : null}</div></div>
    {error ? <p aria-live="polite" className="border-b border-danger/20 bg-danger-subtle px-4 py-3 text-sm text-danger">{error}</p> : null}
    {preview ? <div className="space-y-3 border-b border-brand-primary/15 p-4"><div className="grid gap-2 sm:grid-cols-3"><AdjustmentMetric label="Kural öncesi ödenecek" value={preview.periodPayableBeforeRules} /><AdjustmentMetric danger label="Öngörülen kural kesintisi" value={preview.totalRuleDeduction} /><AdjustmentMetric brand label="Kural sonrası ödenecek" value={preview.periodPayableTotal} /></div><SupplementaryTable ariaLabel="Kesinti kuralı önizlemesi" empty="Hakediş tarihinde geçerli aktif kural bulunmuyor." headers={["Kural", "Revizyon", "Matrah", "Formül", "Vergi", "Toplam"]} rows={preview.rows.map((row) => [`${row.code} · ${row.name}`, `R${row.revisionNo}`, `${money(row.baseAmount)} TL`, row.calculationType === "RATE" ? `%${quantity(row.rate ?? 0)} · ${deductionBaseLabel(row.baseType)}` : `${money(row.fixedAmount ?? 0)} TL`, row.taxMode === "VAT_ADD" ? `${money(row.taxAmount)} TL` : "—", `${money(row.totalAmount)} TL`])} />{preview.rows.length ? <div className="flex justify-end"><button className={primaryButton} disabled={pending || previewPending} onClick={applyPreview} type="button">Önizlenen kuralları uygula</button></div> : null}</div> : null}
    <div className="p-4"><SupplementaryTable ariaLabel="Uygulanan kesinti kuralı snapshotları" empty="Bu hakedişte uygulanmış kesinti kuralı snapshot’ı bulunmuyor." headers={["Kural", "Revizyon", "Matrah", "Formül", "Vergi", "Net / toplam", "Uygulama"]} rows={details.deductionRuleApplications.map((row) => [`${row.ruleCode} · ${row.ruleName}`, `R${row.ruleRevisionNo}`, `${money(row.baseAmount)} TL`, row.calculationType === "RATE" ? `%${quantity(row.rate ?? 0)} · ${deductionBaseLabel(row.baseType)}` : `${money(row.fixedAmount ?? 0)} TL`, row.taxMode === "VAT_ADD" ? `%${quantity(row.taxRate)} · ${money(row.taxAmount)} TL` : "—", `${money(row.netAmount)} / ${money(row.totalAmount)} TL`, <span className="text-content-muted" key="applied">{shortDate(row.appliedAt)}<span className="block">{row.appliedBy}</span></span>])} /></div>
    {!canOperate ? <p className="border-t border-divider bg-surface-subtle px-4 py-3 text-xs text-content-muted">{editable ? "Kural önizleme ve uygulama için muhasebe veya yönetici yetkisi gerekir." : "Kilitli hakedişte gerçekleşen snapshot salt okunur korunur."}</p> : null}
  </section>;
}

function AdjustmentMetric({ brand = false, danger = false, label, value }: { brand?: boolean; danger?: boolean; label: string; value: number }) {
  const tone = danger && value > 0 ? "text-danger" : brand && value > 0 ? "text-brand-primary" : "text-content";
  return <div className="bg-surface-raised p-4"><p className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</p><p className={`mt-1 font-mono text-xl font-bold ${tone}`}>{money(value)} TL</p></div>;
}

function SupplementaryTable({ ariaLabel, empty, headers, rows }: { ariaLabel: string; empty: string; headers: string[]; rows: ReactNode[][] }) {
  return <div className="overflow-x-auto rounded-ui-control border border-divider bg-surface-raised"><table aria-label={ariaLabel} className="min-w-[760px] w-full text-left text-xs"><thead className="bg-surface-subtle font-bold uppercase tracking-wide text-content-muted"><tr>{headers.map((header) => <th className="whitespace-nowrap px-3 py-3" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-divider">{rows.map((row, rowIndex) => <tr className="hover:bg-surface-subtle" key={rowIndex}>{row.map((cell, cellIndex) => <td className="whitespace-nowrap px-3 py-3 text-content" key={cellIndex}>{cell}</td>)}</tr>)}{!rows.length ? <tr><td className="px-3 py-8 text-center text-content-muted" colSpan={headers.length}>{empty}</td></tr> : null}</tbody></table></div>;
}

type MeasurementSheet = PaymentDetails["measurementSheets"][number];

function MeasurementEntryWorkspace({ addSheet, editable, items, payment, pending, run, sheets }: { addSheet: (event: FormEvent<HTMLFormElement>) => void; editable: boolean; items: ContractItem[]; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void; sheets: MeasurementSheet[] }) {
  const [sheetType, setSheetType] = useState<"GENERAL" | "REBAR">("GENERAL");
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const visibleSheets = sheets.filter((sheet) => sheet.sheetType === sheetType);
  const selectedSheet = visibleSheets.find((sheet) => sheet.id === selectedSheetId) ?? visibleSheets[0] ?? null;
  const lineCount = visibleSheets.reduce((total, sheet) => total + sheet.lines.length, 0);
  const totalQuantity = visibleSheets.reduce((total, sheet) => total + sheet.lines.reduce((sheetTotal, line) => sheetTotal + line.quantity, 0), 0);
  const typeLabel = sheetType === "REBAR" ? "Demir Metrajı" : "Genel Metraj";

  return <section aria-label="Genel ve demir metraj veri girişi" className="mt-4 scroll-mt-20 overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm" data-measurement-entry-workspace="general-rebar" id="measurement-entry-workspace">
    <div className="border-b border-divider bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">Hakediş {payment.sequenceNo} · Metraj çalışma alanı</p><h3 className="mt-1 text-lg font-bold text-content">Genel / Demir Metraj Veri Girişi</h3><p className="mt-1 max-w-3xl text-sm text-content-muted">Doğrudan miktar veya ölçü × çarpan ile girilen satırlar cari dönem snapshot’ını güvenli biçimde yeniden hesaplar.</p></div><span className={editable ? "rounded-ui-control border border-warning/30 bg-warning-subtle px-3 py-2 text-xs font-semibold text-warning" : "rounded-ui-control border border-divider bg-surface-subtle px-3 py-2 text-xs font-semibold text-content-muted"}>{editable ? "Taslak hakediş · düzenlenebilir" : `${statusLabels[payment.status] ?? payment.status} · salt okunur`}</span></div>
      <div aria-label="Metraj türü" className="mt-4 flex flex-wrap gap-2" role="tablist"><button aria-selected={sheetType === "GENERAL"} className={sheetType === "GENERAL" ? primaryButton : secondaryButton} onClick={() => { setSheetType("GENERAL"); setSelectedSheetId(null); }} role="tab" type="button">Genel Metraj</button><button aria-selected={sheetType === "REBAR"} className={sheetType === "REBAR" ? primaryButton : secondaryButton} onClick={() => { setSheetType("REBAR"); setSelectedSheetId(null); }} role="tab" type="button">Demir Metrajı</button></div>
    </div>
    <div className="grid gap-px bg-divider sm:grid-cols-3"><MeasurementMetric label="Föy sayısı" value={String(visibleSheets.length)} /><MeasurementMetric label="Satır sayısı" value={String(lineCount)} /><MeasurementMetric label={sheetType === "REBAR" ? "Toplam demir miktarı" : "Toplam metraj"} value={quantity(totalQuantity)} /></div>
    <div className="grid gap-4 p-4 lg:grid-cols-[17rem_minmax(0,1fr)] sm:p-5">
      <aside className="space-y-3"><div><p className="text-xs font-bold uppercase tracking-wide text-content-muted">{typeLabel} föyleri</p><p className="mt-1 text-xs text-content-muted">{editable ? "Düzenlemek için bir föy seçin." : "Kayıtlı föyleri incelemek için seçim yapın."}</p></div><div className="space-y-2">{visibleSheets.map((sheet) => <div className={selectedSheet?.id === sheet.id ? "rounded-ui-control border border-brand-primary bg-brand-primary/5 p-3" : "rounded-ui-control border border-divider bg-surface-raised p-3"} key={sheet.id}><button aria-pressed={selectedSheet?.id === sheet.id} className="w-full text-left" onClick={() => setSelectedSheetId(sheet.id)} type="button"><span className="block font-mono text-xs font-bold text-brand-primary">{sheet.sheetNo}</span><span className="mt-1 block text-sm font-semibold text-content">{sheet.title}</span><span className="mt-1 block text-xs text-content-muted">{sheet.lines.length} satır · {sheet.status === "DRAFT" ? "Taslak" : sheet.status}</span></button>{editable && sheet.sheetNo !== "GEN-1" ? <button className="mt-2 text-xs font-semibold text-danger" disabled={pending} onClick={() => run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId: sheet.id, detailType: "MEASUREMENT_SHEET" }), "Metraj föyü ve satırları silindi; snapshot yeniden hesaplandı.")} type="button">Föyü sil</button> : null}</div>)}{visibleSheets.length === 0 ? <p className="rounded-ui-control border border-dashed border-divider p-3 text-xs text-content-muted">Bu türde henüz metraj föyü yok.</p> : null}</div>
        {editable ? <form aria-label={`${typeLabel} föyü oluştur`} className="space-y-2 rounded-ui-control border border-divider bg-surface-subtle p-3" onSubmit={addSheet}><p className="text-xs font-bold text-content">Yeni föy oluştur</p><input name="sheetType" type="hidden" value={sheetType} /><input className={fieldClass} name="sheetNo" placeholder={sheetType === "REBAR" ? "DM-01" : "GM-01"} required /><input className={fieldClass} name="title" placeholder="Föy başlığı" required /><button className={primaryButton} disabled={pending} type="submit">Föyü oluştur</button></form> : null}
      </aside>
      <div className="min-w-0">{selectedSheet ? <MeasurementSheetEditor editable={editable} items={items} payment={payment} pending={pending} run={run} sheet={selectedSheet} /> : <div className="flex min-h-64 items-center justify-center rounded-ui-panel border border-dashed border-divider bg-surface-subtle p-6 text-center"><div><p className="text-sm font-semibold text-content">{typeLabel} föyü seçilmedi</p><p className="mt-1 text-xs text-content-muted">{editable ? "Soldaki formdan ilk föyü oluşturarak veri girişine başlayın." : "Bu hakedişte seçili tür için kayıtlı föy bulunmuyor."}</p></div></div>}</div>
    </div>
  </section>;
}

function MeasurementMetric({ label, value }: { label: string; value: string }) {
  return <div className="bg-surface-raised p-4"><p className="text-xs font-bold uppercase tracking-wide text-content-muted">{label}</p><p className="mt-1 font-mono text-xl font-bold text-content">{value}</p></div>;
}

function MeasurementSheetEditor({ editable, items, payment, pending, run, sheet }: { editable: boolean; items: ContractItem[]; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void; sheet: MeasurementSheet }) {
  function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    run(() => createConstructionMeasurementLineAction({ progressPaymentId: payment.id, measurementSheetId: sheet.id, contractItemId: textValue(data, "contractItemId"), description: textValue(data, "description"), quantity: optionalNumberValue(data, "quantity"), length: optionalNumberValue(data, "length"), width: optionalNumberValue(data, "width"), height: optionalNumberValue(data, "height"), multiplier: optionalNumberValue(data, "multiplier") }), "Metraj satırı eklendi; cari ve kümülatif snapshot yeniden hesaplandı.");
    form.reset();
  }
  const isRebar = sheet.sheetType === "REBAR";
  return <section aria-label={`${sheet.sheetNo} metraj satır editörü`} className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider bg-surface-subtle px-4 py-3"><div><p className="font-mono text-xs font-bold text-brand-primary">{sheet.sheetNo}</p><h4 className="mt-1 text-base font-bold text-content">{sheet.title}</h4><p className="mt-1 text-xs text-content-muted">{isRebar ? "Demir metrajı · boy × adet/çarpan veya doğrudan miktar" : "Genel metraj · boy × en × yükseklik × çarpan veya doğrudan miktar"}</p></div><span className="rounded-ui-control border border-divider bg-surface-raised px-3 py-1 text-xs font-semibold text-content-muted">{sheet.lines.length} satır</span></div>
    {editable ? <form aria-label={`${sheet.sheetNo} metraj satırı ekle`} className="grid gap-2 border-b border-divider p-4 md:grid-cols-4" onSubmit={addLine}><select className={`${fieldClass} md:col-span-2`} name="contractItemId" required><option value="">Poz seçin</option>{items.map((item) => <option key={item.id} value={item.id}>{item.itemCode} · {item.description}</option>)}</select><input className={`${fieldClass} md:col-span-2`} name="description" placeholder={isRebar ? "Konum / eleman açıklaması" : "Metraj açıklaması"} required /><input className={fieldClass} name="quantity" placeholder="Doğrudan miktar" step="0.0001" type="number" /><input className={fieldClass} min="0.0001" name="length" placeholder={isRebar ? "Boy (m)" : "Boy"} step="0.0001" type="number" />{!isRebar ? <><input className={fieldClass} min="0.0001" name="width" placeholder="En" step="0.0001" type="number" /><input className={fieldClass} min="0.0001" name="height" placeholder="Yükseklik" step="0.0001" type="number" /></> : null}<input className={fieldClass} defaultValue="1" min="0.0001" name="multiplier" placeholder={isRebar ? "Adet / çarpan" : "Çarpan"} step="0.0001" type="number" /><button className={primaryButton} disabled={pending} type="submit">Satırı ekle</button><p className="text-xs text-content-muted md:col-span-4">{isRebar ? "Çap ve birim ağırlık için kalıcı model alanı bulunmadığından miktar, sözleşme pozunun biriminde doğrudan veya boy × adet/çarpan olarak kaydedilir." : "Doğrudan miktar boşsa girilen ölçüler × çarpan kullanılır. Negatif doğrudan miktar düzeltme olarak kabul edilir."}</p></form> : null}
    <div className="overflow-x-auto"><table aria-label={`${sheet.sheetNo} metraj satırları`} className="min-w-[760px] w-full text-left text-xs"><thead className="bg-surface-subtle text-xs font-bold uppercase tracking-wide text-content-muted"><tr><th className="px-4 py-3">Satır</th><th className="px-4 py-3">Poz / açıklama</th><th className="px-4 py-3">Ölçüler</th><th className="px-4 py-3 text-right">Miktar</th><th className="px-4 py-3">İşlem</th></tr></thead><tbody className="divide-y divide-divider">{sheet.lines.map((line) => <tr className="hover:bg-surface-subtle" key={line.id}><td className="px-4 py-3 font-mono font-semibold text-brand-primary">{line.lineNo}</td><td className="px-4 py-3"><strong className="text-content">{line.itemCode}</strong><span className="block text-content-muted">{line.description || line.itemDescription}</span></td><td className="px-4 py-3 text-content-muted">{measurementFormula(line)}</td><td className="px-4 py-3 text-right font-mono font-semibold text-content">{quantity(line.quantity)} {line.unit}</td><td className="px-4 py-3">{editable ? <button className="font-semibold text-danger" disabled={pending} onClick={() => run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId: line.id, detailType: "MEASUREMENT_LINE" }), "Metraj satırı silindi; snapshot yeniden hesaplandı.")} type="button">Sil</button> : <span className="text-content-muted">Salt okunur</span>}</td></tr>)}{!sheet.lines.length ? <tr><td className="px-4 py-8 text-center text-content-muted" colSpan={5}>Bu föyde henüz metraj satırı yok.</td></tr> : null}</tbody></table></div>
  </section>;
}

function SummaryValue({ label, value }: { label: string; value: number }) { return <span className="rounded-lg bg-surface-raised px-2 py-1"><span className="block text-content-muted">{label}</span><strong className="text-content">{money(value)} TL</strong></span>; }

function parseMeasurementCsv(text: string, knownItems: PaymentReport["greenBook"], fileName: string): CsvPreview {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { fileName, issue: "CSV dosyasında başlık ve en az bir veri satırı bulunmalıdır.", rows: [] };
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeCsvHeader);
  const itemIndex = findCsvHeader(headers, ["poz_no", "poz_numarasi", "poz", "item_code"]);
  const quantityIndex = findCsvHeader(headers, ["miktar", "quantity"]);
  const descriptionIndex = findCsvHeader(headers, ["aciklama", "imalat_aciklamasi", "description"]);
  const unitIndex = findCsvHeader(headers, ["birim", "unit"]);
  if (itemIndex < 0 || quantityIndex < 0) return { fileName, issue: "Zorunlu poz_no ve miktar sütunları bulunamadı.", rows: [] };
  const knownByCode = new Map(knownItems.map((item) => [item.itemCode.toLocaleUpperCase("tr-TR"), item]));
  const seenCodes = new Set<string>();
  const rows = lines.slice(1).map((line, index): CsvPreviewRow => {
    const cells = splitCsvLine(line, delimiter);
    const itemCode = (cells[itemIndex] ?? "").trim();
    const normalizedCode = itemCode.toLocaleUpperCase("tr-TR");
    const known = knownByCode.get(normalizedCode);
    const sourceUnit = unitIndex >= 0 ? (cells[unitIndex] ?? "").trim() : "";
    const parsedQuantity = parseCsvNumber(cells[quantityIndex] ?? "");
    const duplicate = seenCodes.has(normalizedCode);
    if (normalizedCode) seenCodes.add(normalizedCode);
    let message = "Hazır";
    if (!itemCode) message = "Poz kodu boş";
    else if (!known) message = "Sözleşme pozu bulunamadı";
    else if (parsedQuantity === null || parsedQuantity === 0) message = "Miktar geçersiz";
    else if (duplicate) message = "Poz kodu tekrar ediyor";
    else if (sourceUnit && sourceUnit.toLocaleLowerCase("tr-TR") !== known.unit.toLocaleLowerCase("tr-TR")) message = `Birim uyuşmuyor (${known.unit})`;
    return { lineNo: index + 2, itemCode, description: (descriptionIndex >= 0 ? cells[descriptionIndex] : "")?.trim() || known?.description || "", unit: sourceUnit || known?.unit || "", quantity: parsedQuantity, status: message === "Hazır" ? "READY" : "ERROR", message };
  });
  return { fileName, issue: null, rows };
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(current); current = ""; }
    else current += char;
  }
  cells.push(current);
  return cells;
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function findCsvHeader(headers: string[], candidates: string[]) { return headers.findIndex((header) => candidates.includes(header)); }
function parseCsvNumber(value: string) { const compact = value.trim().replace(/\s/g, ""); if (!compact) return null; const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact; const parsed = Number(normalized); return Number.isFinite(parsed) ? parsed : null; }

function textValue(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function numberValue(data: FormData, key: string) { const value = Number(data.get(key)); return Number.isFinite(value) ? value : 0; }
function optionalNumberValue(data: FormData, key: string) { const raw = String(data.get(key) ?? "").trim(); if (!raw) return undefined; const value = Number(raw); return Number.isFinite(value) ? value : undefined; }
function money(value: number) { return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function quantity(value: number) { return value.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 4 }); }
function measurementFormula(line: MeasurementSheet["lines"][number]) { const dimensions = [line.length, line.width, line.height].filter((value): value is number => value !== null); return dimensions.length ? `${dimensions.map(quantity).join(" × ")} × ${quantity(line.multiplier)}` : "Doğrudan"; }
function reportMeasurementFormula(line: PaymentReport["measurementSheets"][number]["lines"][number]) { const dimensions = [line.length, line.width, line.height].filter((value): value is number => value !== null); return dimensions.length ? `${dimensions.map(quantity).join(" × ")} × ${quantity(line.multiplier)}` : "Doğrudan"; }
function auditStatus(metadata: unknown) { if (typeof metadata !== "object" || metadata === null) return "—"; const record = metadata as Record<string, unknown>; const from = typeof record.statusFrom === "string" ? record.statusFrom : "Başlangıç"; const to = typeof record.statusTo === "string" ? record.statusTo : null; return to ? `${from} → ${to}` : "—"; }
function ledgerStatusLabel(value: string | null | undefined) { if (!value) return "Fiş durumu bilinmiyor"; const labels: Record<string, string> = { DRAFT: "Taslak fiş", POSTED: "Muhasebeleşti", REVERSED: "Ters kayıt" }; return labels[value.toUpperCase()] ?? value; }
function deductionBaseLabel(value: string | null | undefined) { const labels: Record<string, string> = { PERIOD_NET: "Dönem neti", PERIOD_NET_PLUS_EXTRAS: "Dönem neti + ek işler", PAYABLE_BEFORE_RULE: "Kural öncesi ödenecek" }; return value ? labels[value] ?? value : "Maktu"; }
function shortDate(value: string) { return new Date(value).toLocaleDateString("tr-TR"); }
function shortUtcDate(value: string) { return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC" }).format(new Date(value)); }
function dateTime(value: string) { return new Date(value).toLocaleString("tr-TR"); }
function isSuccess(result: unknown): result is { ok: true } { return typeof result === "object" && result !== null && "ok" in result && result.ok === true; }
function readErrors(result: unknown) { if (typeof result === "object" && result !== null && "errors" in result && Array.isArray(result.errors)) return result.errors.join(" "); return "İşlem tamamlanamadı."; }
