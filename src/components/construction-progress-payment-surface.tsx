"use client";

import { useCallback, useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
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
const fieldClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500";
const primaryButton = "rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

export function ConstructionProgressPaymentSurface() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const result = await listConstructionProjectsAction();
    if (result.ok) {
      setProjects(result.data.rows as Project[]);
      setMessage(null);
    } else setMessage(readErrors(result));
  }, []);

  useEffect(() => {
    let active = true;
    void listConstructionProjectsAction().then((result) => {
      if (!active) return;
      if (result.ok) setProjects(result.data.rows as Project[]);
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
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Native kümülatif hakediş</p><h2 className="text-lg font-semibold text-slate-900">Proje ve hakediş zinciri</h2></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Tenant / firma / dönem kapsamlı</span><button className={primaryButton} disabled={isPending} onClick={() => setShowProjectForm((value) => !value)} type="button">Yeni proje</button></div>
      </div>

      {message ? <p aria-live="polite" className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">{message}</p> : null}
      {showProjectForm ? <form className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4" onSubmit={createProject}>
        <input className={fieldClass} name="code" placeholder="Proje kodu" required /><input className={fieldClass} name="name" placeholder="Proje adı" required />
        <input className={fieldClass} name="siteCode" placeholder="Şantiye kodu" required /><input className={fieldClass} name="siteName" placeholder="Şantiye adı" required />
        <input className={fieldClass} name="contractNo" placeholder="Sözleşme no" /><input className={fieldClass} min="0" name="contractAmount" placeholder="Sözleşme tutarı" required step="0.01" type="number" />
        <input className={fieldClass} name="counterpartyCode" placeholder="Cari kodu" /><input className={fieldClass} name="counterpartyName" placeholder="Cari adı" />
        <select className={fieldClass} defaultValue="Taşeron Hakedişi" name="paymentType"><option>Taşeron Hakedişi</option><option>Tedarikçi Hakedişi</option><option>Şantiye Geliri</option></select>
        <input className={fieldClass} defaultValue="0" max="100" min="0" name="retentionRate" placeholder="Teminat oranı" step="0.01" type="number" />
        <button className={primaryButton} disabled={isPending} type="submit">Projeyi kaydet</button>
      </form> : null}

      <div className="mt-5 space-y-4">
        {projects.length === 0 ? <p className="text-sm text-slate-500">Henüz inşaat projesi oluşturulmadı.</p> : projects.map((project) => {
          const expanded = expandedProject === project.id; const lastPayment = project.progressPayments.at(-1); const canCreatePayment = project.status === "OPEN" && project.contractItems.length > 0 && (!lastPayment || ["APPROVED", "FINALIZED"].includes(lastPayment.status)); const canRevisePrices = project.status === "OPEN" && (!lastPayment || !["DRAFT", "SUBMITTED", "RETURNED"].includes(lastPayment.status));
          return <article className="rounded-xl border border-slate-200 p-4" key={project.id}>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-slate-900">{project.code} · {project.name}</p><p className="text-xs text-slate-500">{project.siteName} · {project.contractItems.length} poz · {money(project.contractAmount)} TL</p></div><div className="flex items-center gap-2"><span className="text-xs text-slate-500">{project.status === "OPEN" ? "Açık" : "Kapalı"}</span><button className={secondaryButton} onClick={() => setExpandedProject(expanded ? null : project.id)} type="button">{expanded ? "Daralt" : "Çalış"}</button></div></div>
            {project.progressPayments.length ? <PaymentTimeline payments={project.progressPayments} pending={isPending} run={run} /> : <p className="mt-3 text-xs text-slate-500">İlk hakediş için kümülatif zincir hazır.</p>}
            {expanded ? <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <form className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-2" onSubmit={(event) => createItem(event, project.id)}><p className="md:col-span-2 text-sm font-semibold text-slate-800">Sözleşme pozu ekle</p><input className={fieldClass} name="itemCode" placeholder="Poz kodu" required /><input className={fieldClass} name="description" placeholder="Açıklama" required /><input className={fieldClass} name="unit" placeholder="Birim" required /><input className={fieldClass} min="0.0001" name="contractQuantity" placeholder="Sözleşme miktarı" required step="0.0001" type="number" /><input className={fieldClass} min="0" name="unitPrice" placeholder="Birim fiyat" required step="0.0001" type="number" /><input className={fieldClass} defaultValue="0" min="0" name="vatRate" placeholder="KDV oranı" step="0.01" type="number" /><button className={primaryButton} disabled={isPending || project.status !== "OPEN"} type="submit">Pozu kaydet</button></form>
              <form className="rounded-xl border border-slate-200 p-3" onSubmit={(event) => createPayment(event, project)}><p className="mb-2 text-sm font-semibold text-slate-800">Yeni hakediş taslağı</p><div className="grid gap-2 md:grid-cols-2"><input className={fieldClass} name="documentNo" placeholder={`HAK-${project.code}-${nextConstructionPaymentSequence(project.progressPayments)}`} required /><select className={fieldClass} defaultValue="INTERIM" disabled={project.progressPayments.length === 0} name="kind"><option value="INTERIM">Ara hakediş</option><option value="FINAL">Kesin hakediş</option></select><input className={fieldClass} name="periodStart" required type="date" /><input className={fieldClass} name="periodEnd" required type="date" /><input className={`${fieldClass} md:col-span-2`} name="description" placeholder="Dönem açıklaması" /></div><div className="mt-3 space-y-2">{project.contractItems.map((item) => <label className="grid grid-cols-[1fr_9rem] items-center gap-2 text-xs text-slate-700" key={item.id}><span>{item.itemCode} · {item.description} ({item.unit})</span><input className={fieldClass} defaultValue="0" name={`quantity-${item.id}`} step="0.0001" type="number" /></label>)}</div><button className={`${primaryButton} mt-3`} disabled={isPending || !canCreatePayment} type="submit">Hakediş {nextConstructionPaymentSequence(project.progressPayments)} taslağını oluştur</button>{!canCreatePayment ? <p className="mt-2 text-xs text-amber-700">Yeni hakediş için son hakedişin onaylı/kesinleşmiş ve projenin açık olması gerekir.</p> : null}</form>
              {lastPayment && ["DRAFT", "RETURNED"].includes(lastPayment.status) ? <DraftEditForm items={project.contractItems} payment={lastPayment} pending={isPending} run={run} /> : null}
              {lastPayment && ["DRAFT", "RETURNED"].includes(lastPayment.status) ? <PaymentDetailsPanel items={project.contractItems} key={`${lastPayment.id}:${lastPayment.updatedAt}`} payment={lastPayment} pending={isPending} run={run} /> : null}
              <ContractPriceRevisionPanel canRevise={canRevisePrices} items={project.contractItems} pending={isPending} run={run} />
            </div> : null}
          </article>;
        })}
      </div>
    </section>
  );
}

function PaymentTimeline({ payments, pending, run }: { payments: Payment[]; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  const [reportPaymentId, setReportPaymentId] = useState<string | null>(null);
  return <div className="mt-3 space-y-3"><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="py-2 pr-4">Sıra</th><th className="py-2 pr-4">Belge</th><th className="py-2 pr-4">Durum</th><th className="py-2 pr-4">Cari dönem</th><th className="py-2 pr-4">Kümülatif</th><th className="py-2">İşlem</th></tr></thead><tbody>{payments.map((payment) => <tr className="border-t border-slate-100" key={payment.id}><td className="py-2 pr-4 font-medium">{payment.sequenceNo}{payment.kind === "FINAL" ? " · Kesin" : ""}</td><td className="py-2 pr-4">{payment.documentNo}</td><td className="py-2 pr-4"><span className="rounded-full bg-slate-100 px-2 py-1">{statusLabels[payment.status] || payment.status}</span></td><td className="py-2 pr-4">{money(payment.periodGrossTotal)} TL</td><td className="py-2 pr-4">{money(payment.cumulativeGrossTotal)} TL</td><td className="py-2"><div className="flex flex-wrap gap-1"><button className={secondaryButton} onClick={() => setReportPaymentId((current) => current === payment.id ? null : payment.id)} type="button">{reportPaymentId === payment.id ? "Raporu kapat" : "Raporlar"}</button>{["DRAFT", "RETURNED"].includes(payment.status) ? <button className={secondaryButton} disabled={pending} onClick={() => run(() => submitConstructionProgressPaymentAction(payment.id), "Hakediş onaya gönderildi.")} type="button">Gönder</button> : null}{payment.status === "SUBMITTED" ? <><button className={primaryButton} disabled={pending} onClick={() => run(() => approveConstructionProgressPaymentAction(payment.id), "Hakediş onaylandı.")} type="button">Onayla</button><button className={secondaryButton} disabled={pending} onClick={() => run(() => returnConstructionProgressPaymentAction(payment.id, "Kullanıcı düzeltmesi"), "Hakediş düzeltmeye iade edildi.")} type="button">İade</button></> : null}{payment.status === "APPROVED" ? <button className={primaryButton} disabled={pending} onClick={() => run(() => finalizeConstructionProgressPaymentAction(payment.id), "Hakediş finansal kayda ve muhasebe fişine bağlandı.")} type="button">Kesinleştir</button> : null}{payment.progressPaymentId ? <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Finansal bağ hazır</span> : null}</div></td></tr>)}</tbody></table></div>{reportPaymentId ? <PaymentReportPanel paymentId={reportPaymentId} /> : null}</div>;
}

function ContractPriceRevisionPanel({ canRevise, items, pending, run }: { canRevise: boolean; items: ContractItem[]; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  function revise(event: FormEvent<HTMLFormElement>, item: ContractItem) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    run(() => createConstructionContractItemPriceRevisionAction({ contractItemId: item.id, effectiveFrom: textValue(data, "effectiveFrom"), unitPrice: numberValue(data, "unitPrice"), reason: textValue(data, "reason") }), `${item.itemCode} birim fiyatı revize edildi; önceki hakediş snapshot'ları korunuyor.`);
    form.reset();
  }
  return <section className="rounded-xl border border-violet-200 bg-violet-50/30 p-3 xl:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">Birim fiyat revizyonları</p><p className="text-xs text-slate-500">Yeni fiyat yalnız sonraki hakediş snapshot’larında kullanılır; geçmiş kümülatif tutarlar yeniden fiyatlanmaz.</p></div>{!canRevise ? <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Aktif hakediş tamamlanmadan revizyon yapılamaz</span> : null}</div><div className="mt-3 grid gap-3 lg:grid-cols-2">{items.map((item) => <article className="rounded-lg border border-slate-200 bg-white p-3" key={item.id}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-slate-800">{item.itemCode} · {item.description}</p><p className="text-xs text-slate-500">Revizyon {item.revisionNo} · Güncel fiyat {money(item.unitPrice)} TL/{item.unit}</p></div><span className="rounded bg-violet-50 px-2 py-1 text-xs text-violet-700">R{item.revisionNo}</span></div><form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={(event) => revise(event, item)}><input className={fieldClass} defaultValue={today} name="effectiveFrom" required type="date" /><input className={fieldClass} min="0" name="unitPrice" placeholder="Yeni birim fiyat" required step="0.0001" type="number" /><input className={fieldClass} name="reason" placeholder="Revizyon gerekçesi" required /><button className={primaryButton} disabled={pending || !canRevise} type="submit">Yeni fiyatı kaydet</button></form>{item.priceRevisions.length ? <div className="mt-3 space-y-1 border-t border-slate-100 pt-2">{item.priceRevisions.map((revision) => <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500" key={revision.id}><span>R{revision.revisionNo} · {shortDate(revision.effectiveFrom)} · {revision.reason}</span><strong className="text-slate-700">{money(revision.unitPrice)} TL</strong></p>)}</div> : <p className="mt-2 text-xs text-slate-400">Henüz fiyat revizyonu yok; sözleşme başlangıç fiyatı kullanılıyor.</p>}</article>)}</div></section>;
}

function DraftEditForm({ items, payment, pending, run }: { items: ContractItem[]; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(() => saveConstructionProgressPaymentDraftAction({ id: payment.id, updatedAt: payment.updatedAt, documentNo: textValue(data, "documentNo"), periodStart: textValue(data, "periodStart"), periodEnd: textValue(data, "periodEnd"), description: textValue(data, "description"), measurements: items.map((item) => ({ contractItemId: item.id, quantity: numberValue(data, `quantity-${item.id}`), description: item.description, unit: item.unit })) }), "Hakediş taslağı ve kümülatif snapshot yeniden hesaplandı.");
  }
  const snapshotByItem = new Map(payment.snapshots.map((snapshot) => [snapshot.contractItemId, snapshot]));
  return <form className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 xl:col-span-2" onSubmit={save}><p className="mb-2 text-sm font-semibold text-slate-800">Hakediş {payment.sequenceNo} düzeltmesi</p><div className="grid gap-2 md:grid-cols-4"><input className={fieldClass} defaultValue={payment.documentNo} name="documentNo" required /><input className={fieldClass} defaultValue={payment.periodStart.slice(0, 10)} name="periodStart" required type="date" /><input className={fieldClass} defaultValue={payment.periodEnd.slice(0, 10)} name="periodEnd" required type="date" /><input className={fieldClass} name="description" placeholder="Düzeltme açıklaması" /></div><div className="mt-3 grid gap-2 md:grid-cols-2">{items.map((item) => { const snapshot = snapshotByItem.get(item.id); return <label className="grid grid-cols-[1fr_8rem_8rem_8rem] items-center gap-2 text-xs text-slate-700" key={item.id}><span>{item.itemCode} · {item.description}</span><span className="rounded bg-white px-2 py-2 text-right">Önceki {snapshot?.previousQuantity ?? 0}</span><input className={fieldClass} defaultValue={snapshot?.periodQuantity ?? 0} name={`quantity-${item.id}`} step="0.0001" type="number" /><span className="rounded bg-white px-2 py-2 text-right">Kümülatif {snapshot?.cumulativeQuantity ?? 0}</span></label>; })}</div><button className={`${primaryButton} mt-3`} disabled={pending} type="submit">Düzeltmeyi kaydet ve yeniden hesapla</button></form>;
}

type PaymentDetails = Extract<Awaited<ReturnType<typeof listConstructionProgressPaymentDetailsAction>>, { ok: true }>["data"];
type PaymentReport = Extract<Awaited<ReturnType<typeof getConstructionProgressPaymentReportAction>>, { ok: true }>["data"];
type ReportTab = "GREEN_BOOK" | "MANUFACTURING" | "SUMMARY" | "AUDIT";

const reportTabs: { id: ReportTab; label: string }[] = [
  { id: "GREEN_BOOK", label: "Yeşil Defter" },
  { id: "MANUFACTURING", label: "İmalat Çarşafı" },
  { id: "SUMMARY", label: "Özet" },
  { id: "AUDIT", label: "Rapor / Audit" },
];

function PaymentReportPanel({ paymentId }: { paymentId: string }) {
  const [report, setReport] = useState<PaymentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReportTab>("GREEN_BOOK");

  useEffect(() => {
    let active = true;
    void getConstructionProgressPaymentReportAction(paymentId).then((result) => {
      if (!active) return;
      if (result.ok) { setReport(result.data); setError(null); }
      else { setReport(null); setError(readErrors(result)); }
    });
    return () => { active = false; };
  }, [paymentId]);

  if (error) return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;
  if (!report) return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Hakediş raporu hazırlanıyor…</p>;

  return <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-sm font-semibold text-slate-900">{report.header.projectCode} · {report.header.projectName}</p><p className="text-xs text-slate-500">{report.header.documentNo} · Hakediş {report.header.sequenceNo} · {shortDate(report.header.periodStart)}–{shortDate(report.header.periodEnd)} · {statusLabels[report.header.status] ?? report.header.status}</p></div>
      <button className={secondaryButton} onClick={() => window.print()} type="button">Yazdır</button>
    </div>
    <div className="mt-3 flex flex-wrap gap-2" role="tablist">{reportTabs.map((item) => <button aria-selected={tab === item.id} className={tab === item.id ? primaryButton : secondaryButton} key={item.id} onClick={() => setTab(item.id)} role="tab" type="button">{item.label}</button>)}</div>
    <div className="mt-4">
      {tab === "GREEN_BOOK" ? <GreenBookReport report={report} /> : null}
      {tab === "MANUFACTURING" ? <ManufacturingReport report={report} /> : null}
      {tab === "SUMMARY" ? <PaymentSummaryReport report={report} /> : null}
      {tab === "AUDIT" ? <PaymentAuditReport report={report} /> : null}
    </div>
  </section>;
}

function GreenBookReport({ report }: { report: PaymentReport }) {
  return <ReportTable headers={["Poz", "Birim", "Sözleşme", "Önceki", "Bu dönem", "Kümülatif", "Tamamlanma"]} rows={report.greenBook.map((row) => [<span key="item"><strong>{row.itemCode}</strong><span className="block text-slate-500">{row.description}</span></span>, row.unit, quantity(row.contractQuantity), quantity(row.previousQuantity), quantity(row.periodQuantity), quantity(row.cumulativeQuantity), <span className={row.exceededContract ? "font-semibold text-rose-600" : ""} key="rate">%{row.completionRate.toLocaleString("tr-TR")}{row.exceededContract ? " · Aşım" : ""}</span>])} />;
}

function ManufacturingReport({ report }: { report: PaymentReport }) {
  return <ReportTable headers={["Poz", "Birim fiyat", "Önceki miktar", "Bu dönem miktar", "Kümülatif miktar", "Bu dönem tutar", "Kümülatif tutar", "KDV"]} rows={report.manufacturingSheet.map((row) => [<span key="item"><strong>{row.itemCode}</strong><span className="block text-slate-500">{row.description}</span></span>, `${money(row.unitPrice)} TL`, quantity(row.previousQuantity), quantity(row.periodQuantity), quantity(row.cumulativeQuantity), `${money(row.periodAmount)} TL`, `${money(row.cumulativeAmount)} TL`, <span key="vat">%{row.vatRate.toLocaleString("tr-TR")}<span className="block text-slate-500">{money(row.periodVatAmount)} TL</span></span>])} />;
}

function PaymentSummaryReport({ report }: { report: PaymentReport }) {
  const summary = report.summary;
  return <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><SummaryValue label="İmalat" value={summary.periodWorkTotal} /><SummaryValue label="Tutanaklı işler" value={summary.periodExtraWorkTotal} /><SummaryValue label="İlaveler" value={summary.periodAdditionTotal} /><SummaryValue label="Kesintiler" value={summary.periodDeductionTotal} /><SummaryValue label="Dönem ödenecek" value={summary.periodPayableTotal} /></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"><SummaryValue label="Projection brüt" value={summary.projectedGrossTotal} /><SummaryValue label="Teminat/kesinti" value={summary.projectedRetentionTotal} /><SummaryValue label="Projection net" value={summary.projectedNetTotal} /><SummaryValue label="KDV" value={summary.projectedVatTotal} /><SummaryValue label="Genel toplam" value={summary.projectedGrandTotal} /></div><ReportTable headers={["Hareket", "Belge / tür", "Açıklama", "Tutar"]} rows={[...report.extraWorks.map((row) => ["Tutanaklı iş", row.documentNo, row.description, `${money(row.amount)} TL`]), ...report.financialMovements.map((row) => [row.direction === "ADDITION" ? "İlave" : "Kesinti", row.movementType, row.description, `${row.direction === "ADDITION" ? "+" : "-"}${money(row.amount)} TL`]), ...report.deductions.map((row) => ["Kesinti", row.category, row.description, `-${money(row.totalAmount)} TL`])]} empty="Bu hakedişte ek finansal hareket yok." /></div>;
}

function PaymentAuditReport({ report }: { report: PaymentReport }) {
  return <div className="grid gap-4 lg:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Metraj föyleri</p><ReportTable headers={["Föy", "Tür", "Başlık", "Satır", "Durum"]} rows={report.measurementSheets.map((row) => [row.sheetNo, row.sheetType === "REBAR" ? "Demir" : "Genel", row.title, row.lineCount, row.status])} empty="Metraj föyü bulunmuyor." /></div><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Onay izi</p><ReportTable headers={["Tarih", "Geçiş", "Gerekçe", "Kullanıcı"]} rows={report.approvals.map((row) => [dateTime(row.createdAt), `${row.statusFrom ?? "Başlangıç"} → ${row.statusTo}`, row.reason ?? "—", row.actorUserId])} empty="Onay olayı bulunmuyor." /></div><div className="lg:col-span-2"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Merkezi audit kayıtları</p><ReportTable headers={["Tarih", "Aksiyon", "Kullanıcı", "Durum"]} rows={report.auditLogs.map((row) => [dateTime(row.occurredAt), row.action, row.actorUserId, auditStatus(row.metadata)])} empty="Merkezi audit kaydı bulunmuyor." /></div><div className="space-y-3 lg:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Metraj satır dökümü</p>{report.measurementSheets.map((sheet) => <div key={sheet.sheetNo}><p className="mb-1 text-xs font-medium text-slate-700">{sheet.sheetNo} · {sheet.title}</p><ReportTable headers={["Satır", "Poz", "Açıklama", "Ölçüler", "Miktar"]} rows={sheet.lines.map((line) => [line.lineNo, line.itemCode, line.description || line.itemDescription, reportMeasurementFormula(line), `${quantity(line.quantity)} ${line.unit}`])} empty="Bu föyde metraj satırı yok." /></div>)}</div><div className="rounded-lg border border-slate-200 bg-white p-3 text-xs lg:col-span-2"><p className="font-semibold text-slate-800">Muhasebe bağlantısı</p>{report.accounting ? <div className="mt-2 grid gap-2 md:grid-cols-4"><AuditValue label="ProgressPayment" value={report.accounting.progressPaymentId} /><AuditValue label="Ledger fişi" value={report.accounting.ledgerEntryId ?? "—"} /><AuditValue label="Belge no" value={report.accounting.ledgerDocumentNo ?? "—"} /><AuditValue label="Durum" value={report.accounting.ledgerStatus ?? "—"} /></div> : <p className="mt-1 text-slate-500">Hakediş henüz finansal projection’a kesinleştirilmedi.</p>}</div></div>;
}

function ReportTable({ headers, rows, empty = "Kayıt bulunmuyor." }: { headers: string[]; rows: ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p className="rounded-lg bg-white p-3 text-xs text-slate-500">{empty}</p>;
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{headers.map((header) => <th className="whitespace-nowrap px-3 py-2 font-medium" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr className="border-t border-slate-100" key={rowIndex}>{row.map((cell, cellIndex) => <td className="whitespace-nowrap px-3 py-2 text-slate-700" key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function AuditValue({ label, value }: { label: string; value: string }) { return <span><span className="block text-slate-500">{label}</span><span className="break-all font-medium text-slate-800">{value}</span></span>; }

function PaymentDetailsPanel({ items, payment, pending, run }: { items: ContractItem[]; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void }) {
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

  return <section className="rounded-xl border border-sky-200 bg-sky-50/30 p-3 xl:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">Hakediş {payment.sequenceNo} detayları</p><p className="text-xs text-slate-500">Metraj Genel · Metraj Demir · Tutanaklı İşler · Kesintiler · Özet</p></div>{details ? <div className="grid grid-cols-4 gap-2 text-right text-xs"><SummaryValue label="Ek işler" value={details.summary.periodExtraWorkTotal} /><SummaryValue label="İlaveler" value={details.summary.periodAdditionTotal} /><SummaryValue label="Kesintiler" value={details.summary.periodDeductionTotal} /><SummaryValue label="Ödenecek" value={details.summary.periodPayableTotal} /></div> : null}</div><div className="mt-4 grid gap-3 xl:grid-cols-4">
    <form className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" onSubmit={addSheet}><p className="text-xs font-semibold text-slate-800">Metraj föyü</p><input className={fieldClass} name="sheetNo" placeholder="Föy no" required /><select className={fieldClass} name="sheetType"><option value="GENERAL">Genel metraj</option><option value="REBAR">Demir metrajı</option></select><input className={fieldClass} name="title" placeholder="Başlık" required /><button className={primaryButton} disabled={pending} type="submit">Föy ekle</button>{details?.measurementSheets.map((row) => <p className="flex items-center justify-between gap-2 text-xs text-slate-500" key={row.id}><span>{row.sheetNo} · {row.title} · {row.lines.length} satır</span>{row.sheetNo !== "GEN-1" ? <button className="text-rose-600" onClick={() => run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId: row.id, detailType: "MEASUREMENT_SHEET" }), "Metraj föyü ve satırları silindi; snapshot yeniden hesaplandı.")} type="button">Sil</button> : null}</p>)}</form>
    <form className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" onSubmit={addExtra}><p className="text-xs font-semibold text-slate-800">Tutanaklı iş</p><input className={fieldClass} name="documentNo" placeholder="Tutanak no" required /><input className={fieldClass} name="workDate" required type="date" /><input className={fieldClass} name="description" placeholder="Açıklama" required /><div className="grid grid-cols-3 gap-1"><input className={fieldClass} name="unit" placeholder="Birim" required /><input className={fieldClass} min="0.0001" name="quantity" placeholder="Miktar" required step="0.0001" type="number" /><input className={fieldClass} min="0" name="unitPrice" placeholder="Fiyat" required step="0.0001" type="number" /></div><input className={fieldClass} defaultValue="0" min="0" name="vatRate" placeholder="KDV" step="0.01" type="number" /><button className={primaryButton} disabled={pending} type="submit">Tutanak ekle</button>{details?.extraWorks.map((row) => <DetailRow key={row.id} label={`${row.documentNo} · ${money(row.periodAmount)} TL`} onDelete={() => run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId: row.id, detailType: "EXTRA_WORK" }), "Tutanaklı iş silindi ve özet yeniden hesaplandı.")} />)}</form>
    <form className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" onSubmit={addDeduction}><p className="text-xs font-semibold text-slate-800">Kesinti</p><select className={fieldClass} name="category"><option>Yemek/Malzeme</option><option>Hizmet</option><option>Makine/Ekipman</option><option>İmalat/İşçilik</option><option>Diğer</option></select><input className={fieldClass} name="documentNo" placeholder="Belge no" /><input className={fieldClass} name="movementDate" required type="date" /><input className={fieldClass} name="description" placeholder="Açıklama" required /><div className="grid grid-cols-2 gap-1"><input className={fieldClass} min="0" name="amount" placeholder="Tutar" required step="0.01" type="number" /><input className={fieldClass} defaultValue="0" min="0" name="vatAmount" placeholder="KDV" step="0.01" type="number" /></div><button className={primaryButton} disabled={pending} type="submit">Kesinti ekle</button>{details?.deductions.map((row) => <DetailRow key={row.id} label={`${row.category} · ${money(row.totalAmount)} TL`} onDelete={() => run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId: row.id, detailType: "DEDUCTION" }), "Kesinti silindi ve özet yeniden hesaplandı.")} />)}</form>
    <form className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" onSubmit={addFinancial}><p className="text-xs font-semibold text-slate-800">Finansal hareket</p><select className={fieldClass} name="movementType"><option value="ADVANCE">Avans</option><option value="RETENTION">Teminat</option><option value="WITHHOLDING">Tevkifat</option><option value="TAX_WITHHOLDING">Stopaj</option><option value="RESERVE">İhtiyat</option><option value="PRICE_DIFFERENCE">Fiyat farkı</option></select><select className={fieldClass} name="direction"><option value="DEDUCTION">Kesinti</option><option value="ADDITION">İlave</option></select><input className={fieldClass} name="movementDate" required type="date" /><input className={fieldClass} name="description" placeholder="Açıklama" required /><input className={fieldClass} min="0.01" name="amount" placeholder="Tutar" required step="0.01" type="number" /><button className={primaryButton} disabled={pending} type="submit">Hareket ekle</button>{details?.financialMovements.map((row) => <DetailRow key={row.id} label={`${row.movementType} · ${row.direction === "ADDITION" ? "+" : "-"}${money(row.amount)} TL`} onDelete={() => run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId: row.id, detailType: "FINANCIAL_MOVEMENT" }), "Finansal hareket silindi ve özet yeniden hesaplandı.")} />)}</form>
  </div>{details ? <div className="mt-4 grid gap-3 xl:grid-cols-2">{details.measurementSheets.map((sheet) => <MeasurementSheetEditor items={items} key={sheet.id} payment={payment} pending={pending} run={run} sheet={sheet} />)}</div> : null}</section>;
}

type MeasurementSheet = PaymentDetails["measurementSheets"][number];

function MeasurementSheetEditor({ items, payment, pending, run, sheet }: { items: ContractItem[]; payment: Payment; pending: boolean; run: (operation: () => Promise<unknown>, success: string) => void; sheet: MeasurementSheet }) {
  function addLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    run(() => createConstructionMeasurementLineAction({ progressPaymentId: payment.id, measurementSheetId: sheet.id, contractItemId: textValue(data, "contractItemId"), description: textValue(data, "description"), quantity: optionalNumberValue(data, "quantity"), length: optionalNumberValue(data, "length"), width: optionalNumberValue(data, "width"), height: optionalNumberValue(data, "height"), multiplier: optionalNumberValue(data, "multiplier") }), "Metraj satırı eklendi; cari ve kümülatif snapshot yeniden hesaplandı.");
    form.reset();
  }
  return <section className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-slate-800">{sheet.sheetNo} · {sheet.title}</p><p className="text-xs text-slate-500">{sheet.sheetType === "REBAR" ? "Demir metrajı" : "Genel metraj"} · Satırlar cari dönem hareketidir</p></div><span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{sheet.lines.length} satır</span></div><form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={addLine}><select className={fieldClass} name="contractItemId" required><option value="">Poz seçin</option>{items.map((item) => <option key={item.id} value={item.id}>{item.itemCode} · {item.description}</option>)}</select><input className={`${fieldClass} md:col-span-2`} name="description" placeholder="Metraj açıklaması" required /><input className={fieldClass} name="quantity" placeholder="Doğrudan miktar" step="0.0001" type="number" /><input className={fieldClass} min="0.0001" name="length" placeholder="Boy" step="0.0001" type="number" /><input className={fieldClass} min="0.0001" name="width" placeholder="En" step="0.0001" type="number" /><input className={fieldClass} min="0.0001" name="height" placeholder="Yükseklik" step="0.0001" type="number" /><input className={fieldClass} defaultValue="1" min="0.0001" name="multiplier" placeholder="Çarpan" step="0.0001" type="number" /><button className={primaryButton} disabled={pending} type="submit">Satır ekle</button><p className="text-xs text-slate-500 md:col-span-3">Doğrudan miktar boşsa girilen ölçüler × çarpan kullanılır. Negatif doğrudan miktar düzeltme olarak kabul edilir.</p></form><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="py-2 pr-3">Satır</th><th className="py-2 pr-3">Poz / açıklama</th><th className="py-2 pr-3">Ölçüler</th><th className="py-2 pr-3">Miktar</th><th className="py-2">İşlem</th></tr></thead><tbody>{sheet.lines.map((line) => <tr className="border-t border-slate-100" key={line.id}><td className="py-2 pr-3">{line.lineNo}</td><td className="py-2 pr-3"><strong>{line.itemCode}</strong><span className="block text-slate-500">{line.description || line.itemDescription}</span></td><td className="py-2 pr-3">{measurementFormula(line)}</td><td className="py-2 pr-3 font-medium">{quantity(line.quantity)} {line.unit}</td><td className="py-2"><button className="text-rose-600" disabled={pending} onClick={() => run(() => deleteConstructionProgressPaymentDetailAction({ progressPaymentId: payment.id, detailId: line.id, detailType: "MEASUREMENT_LINE" }), "Metraj satırı silindi; snapshot yeniden hesaplandı.")} type="button">Sil</button></td></tr>)}</tbody></table>{!sheet.lines.length ? <p className="py-3 text-xs text-slate-500">Bu föyde henüz metraj satırı yok.</p> : null}</div></section>;
}

function SummaryValue({ label, value }: { label: string; value: number }) { return <span className="rounded-lg bg-white px-2 py-1"><span className="block text-slate-500">{label}</span><strong className="text-slate-900">{money(value)} TL</strong></span>; }
function DetailRow({ label, onDelete }: { label: string; onDelete: () => void }) { return <p className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{label}</span><button className="text-rose-600" onClick={onDelete} type="button">Sil</button></p>; }

function textValue(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function numberValue(data: FormData, key: string) { const value = Number(data.get(key)); return Number.isFinite(value) ? value : 0; }
function optionalNumberValue(data: FormData, key: string) { const raw = String(data.get(key) ?? "").trim(); if (!raw) return undefined; const value = Number(raw); return Number.isFinite(value) ? value : undefined; }
function money(value: number) { return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function quantity(value: number) { return value.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 4 }); }
function measurementFormula(line: MeasurementSheet["lines"][number]) { const dimensions = [line.length, line.width, line.height].filter((value): value is number => value !== null); return dimensions.length ? `${dimensions.map(quantity).join(" × ")} × ${quantity(line.multiplier)}` : "Doğrudan"; }
function reportMeasurementFormula(line: PaymentReport["measurementSheets"][number]["lines"][number]) { const dimensions = [line.length, line.width, line.height].filter((value): value is number => value !== null); return dimensions.length ? `${dimensions.map(quantity).join(" × ")} × ${quantity(line.multiplier)}` : "Doğrudan"; }
function auditStatus(metadata: unknown) { if (typeof metadata !== "object" || metadata === null) return "—"; const record = metadata as Record<string, unknown>; const from = typeof record.statusFrom === "string" ? record.statusFrom : "Başlangıç"; const to = typeof record.statusTo === "string" ? record.statusTo : null; return to ? `${from} → ${to}` : "—"; }
function shortDate(value: string) { return new Date(value).toLocaleDateString("tr-TR"); }
function dateTime(value: string) { return new Date(value).toLocaleString("tr-TR"); }
function isSuccess(result: unknown): result is { ok: true } { return typeof result === "object" && result !== null && "ok" in result && result.ok === true; }
function readErrors(result: unknown) { if (typeof result === "object" && result !== null && "errors" in result && Array.isArray(result.errors)) return result.errors.join(" "); return "İşlem tamamlanamadı."; }
