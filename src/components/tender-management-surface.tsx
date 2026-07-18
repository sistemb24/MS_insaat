"use client";

import { useState } from "react";

import {
  TENDER_STATUSES,
  buildTenderBoqSummary,
  calculateTenderBoqSimulation,
  createTenderDraftFromValues,
  getNextTenderStatuses,
  isTenderDeadlineOverdue,
  isTenderDeadlineUpcoming,
  summarizeTenders,
  type TenderBoqLineFormValues,
  type TenderBoqLineRow,
  type TenderBoqLineValues,
  type TenderBoqUpdateValues,
  type TenderCreateValues,
  type TenderDraftFormValues,
  type TenderProcedure,
  type TenderRow,
  type TenderSiteConversionValues,
  type TenderStatus,
} from "@/lib/tender-service";

type TenderManagementSurfaceProps = {
  persistence?: {
    createTender?: (
      values: TenderCreateValues,
    ) => Promise<
      | {
          ok: true;
          data: TenderRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    transitionTenderStatus?: (
      tenderId: string,
      status: TenderStatus,
    ) => Promise<
      | {
          ok: true;
          data: TenderRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    updateTenderBoq?: (
      tenderId: string,
      values: TenderBoqUpdateValues,
    ) => Promise<
      | {
          ok: true;
          data: TenderRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    convertTenderToSite?: (
      tenderId: string,
      values: TenderSiteConversionValues,
    ) => Promise<
      | {
          ok: true;
          data: TenderRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
  };
  rows: TenderRow[];
  today?: string;
};

type TenderSiteConversionFormValues = {
  projectAmount: string;
  responsible: string;
  siteCode: string;
  siteName: string;
};

const statusClass: Record<TenderStatus, string> = {
  Hazırlanıyor: "border-blue-200 bg-blue-50 text-blue-700",
  Kazanıldı: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Kaybedildi: "border-red-200 bg-red-50 text-red-700",
  Sunuldu: "border-amber-200 bg-amber-50 text-amber-700",
  Takip: "border-slate-200 bg-slate-50 text-slate-700",
  İptal: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

type TenderDeadlineFilter = "all" | "overdue" | "upcoming";

const tenderDeadlineFilters: TenderDeadlineFilter[] = [
  "all",
  "overdue",
  "upcoming",
];

const tenderDeadlineFilterLabels: Record<TenderDeadlineFilter, string> = {
  all: "Tümü",
  overdue: "Süre Doldu",
  upcoming: "Yaklaşıyor",
};

function createEmptyTenderBoqLine(): TenderBoqLineFormValues {
  return {
    description: "",
    equipmentCost: "",
    laborCost: "",
    materialCost: "",
    pozNo: "",
    quantity: "",
    shippingCost: "",
    subcontractorCost: "",
    unit: "",
    unitBid: "",
  };
}

function createInitialTenderDraftForm(): TenderDraftFormValues {
  return {
    authorityName: "",
    bidValue: "",
    boqLines: [createEmptyTenderBoqLine()],
    city: "",
    contractSignDate: "",
    currency: "TRY",
    description: "",
    estimatedValue: "",
    ikn: "",
    noticeDate: "",
    overheadRate: "",
    profitMargin: "",
    procedure: "Açık",
    questionAnswerDeadline: "",
    sessionDate: "",
    specPurchaseDeadline: "",
    submissionDeadline: "",
    tenderNo: "",
    thresholdValue: "",
    title: "",
  };
}

export function TenderManagementSurface({
  persistence,
  rows,
  today = new Date().toISOString(),
}: TenderManagementSurfaceProps) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<
    "general" | "cost" | "boq"
  >("general");
  const [formValues, setFormValues] = useState<TenderDraftFormValues>(
    createInitialTenderDraftForm,
  );
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [surfaceError, setSurfaceError] = useState("");
  const [surfaceNotice, setSurfaceNotice] = useState("");
  const [activeBoqTenderId, setActiveBoqTenderId] = useState("");
  const [activeSiteConversionTenderId, setActiveSiteConversionTenderId] =
    useState("");
  const [siteConversionValues, setSiteConversionValues] =
    useState<TenderSiteConversionFormValues>({
      projectAmount: "",
      responsible: "",
      siteCode: "",
      siteName: "",
    });
  const [boqEditorBidValue, setBoqEditorBidValue] = useState("");
  const [boqEditorLines, setBoqEditorLines] = useState<
    TenderBoqLineFormValues[]
  >([createEmptyTenderBoqLine()]);
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    TenderStatus | "all"
  >("all");
  const [activeDeadlineFilter, setActiveDeadlineFilter] =
    useState<TenderDeadlineFilter>("all");
  const [activeView, setActiveView] = useState<"analysis" | "list">("list");
  const summary = summarizeTenders(displayRows, today);
  const filteredRows =
    displayRows.filter((row) => {
      if (activeStatusFilter !== "all" && row.status !== activeStatusFilter) {
        return false;
      }

      if (activeDeadlineFilter === "overdue") {
        return isTenderDeadlineOverdue(row, today);
      }

      if (activeDeadlineFilter === "upcoming") {
        return isTenderDeadlineUpcoming(row, today);
      }

      return true;
    });
  const activeBoqTender = displayRows.find((row) => row.id === activeBoqTenderId);
  const activeSiteConversionTender = displayRows.find(
    (row) => row.id === activeSiteConversionTenderId,
  );

  function openDraftForm() {
    setIsFormOpen(true);
    setActiveFormTab("general");
    setFormError("");
    setFormNotice("");
  }

  function updateFormValue<Field extends keyof TenderDraftFormValues>(
    field: Field,
    value: TenderDraftFormValues[Field],
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function updateBoqLineValue<Field extends keyof TenderBoqLineFormValues>(
    index: number,
    field: Field,
    value: TenderBoqLineFormValues[Field],
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      boqLines: currentValues.boqLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    }));
  }

  function addBoqLine() {
    setFormValues((currentValues) => ({
      ...currentValues,
      boqLines: [...currentValues.boqLines, createEmptyTenderBoqLine()],
    }));
  }

  function openBoqEditor(row: TenderRow) {
    setActiveBoqTenderId(row.id);
    setBoqEditorBidValue(numberToFormValue(row.bidValue));
    setBoqEditorLines(tenderBoqRowsToFormValues(row.boqLines ?? []));
    setSurfaceError("");
    setSurfaceNotice("");
  }

  function openSiteConversion(row: TenderRow) {
    setActiveSiteConversionTenderId(row.id);
    setSiteConversionValues({
      projectAmount: numberToFormValue(
        row.contractValue > 0 ? row.contractValue : row.bidValue,
      ),
      responsible: "",
      siteCode: "",
      siteName: row.title,
    });
    setSurfaceError("");
    setSurfaceNotice("");
  }

  function updateSiteConversionValue<
    Field extends keyof TenderSiteConversionFormValues,
  >(field: Field, value: TenderSiteConversionFormValues[Field]) {
    setSiteConversionValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function updateExistingBoqLineValue<
    Field extends keyof TenderBoqLineFormValues,
  >(
    index: number,
    field: Field,
    value: TenderBoqLineFormValues[Field],
  ) {
    setBoqEditorLines((currentLines) =>
      currentLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
  }

  function addExistingBoqLine() {
    setBoqEditorLines((currentLines) => [
      ...currentLines,
      createEmptyTenderBoqLine(),
    ]);
  }

  function copyExistingBoqLine(index: number) {
    setBoqEditorLines((currentLines) => {
      const sourceLine = currentLines[index] ?? createEmptyTenderBoqLine();

      return [
        ...currentLines.slice(0, index + 1),
        { ...sourceLine },
        ...currentLines.slice(index + 1),
      ];
    });
  }

  function deleteExistingBoqLine(index: number) {
    setBoqEditorLines((currentLines) => {
      const nextLines = currentLines.filter((_, lineIndex) => lineIndex !== index);

      return nextLines.length > 0 ? nextLines : [createEmptyTenderBoqLine()];
    });
  }

  async function saveDraftTender() {
    try {
      if (persistence?.createTender) {
        const result = await persistence.createTender(
          tenderFormValuesToCreateValues(formValues),
        );

        if (!result.ok) {
          setFormError(result.errors.join(" "));
          setFormNotice("");
          return;
        }

        setDisplayRows((currentRows) => [result.data, ...currentRows]);
        setFormValues(createInitialTenderDraftForm());
        setActiveFormTab("general");
        setFormError("");
        setFormNotice("İhale taslağı kalıcı kaynağa eklendi.");
        return;
      }

      const draft = createTenderDraftFromValues(formValues, displayRows.length + 1);

      setDisplayRows((currentRows) => [draft, ...currentRows]);
      setFormValues(createInitialTenderDraftForm());
      setActiveFormTab("general");
      setFormError("");
      setFormNotice("İhale taslağı listeye eklendi.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Taslak kaydedilemedi");
      setFormNotice("");
    }
  }

  function toggleStatusFilter(status: TenderStatus) {
    setActiveStatusFilter((currentStatus) =>
      currentStatus === status ? "all" : status,
    );
  }

  function toggleDeadlineFilter(filter: TenderDeadlineFilter) {
    setActiveDeadlineFilter((currentFilter) =>
      currentFilter === filter ? "all" : filter,
    );
  }

  function toggleAnalysisView() {
    setActiveView((currentView) =>
      currentView === "analysis" ? "list" : "analysis",
    );
  }

  async function transitionTenderStatus(tenderId: string, status: TenderStatus) {
    setSurfaceError("");
    setSurfaceNotice("");

    try {
      if (persistence?.transitionTenderStatus) {
        const result = await persistence.transitionTenderStatus(tenderId, status);

        if (!result.ok) {
          setSurfaceError(result.errors.join(" "));
          return;
        }

        setDisplayRows((currentRows) =>
          currentRows.map((row) => (row.id === tenderId ? result.data : row)),
        );
        setSurfaceNotice(`İhale durumu ${result.data.status} olarak güncellendi.`);
        return;
      }

      setDisplayRows((currentRows) =>
        currentRows.map((row) =>
          row.id === tenderId
            ? {
                ...row,
                status,
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      );
      setSurfaceNotice(`İhale durumu ${status} olarak güncellendi.`);
    } catch (error) {
      setSurfaceError(
        error instanceof Error ? error.message : "İhale durumu güncellenemedi",
      );
    }
  }

  async function saveSiteConversion() {
    if (!activeSiteConversionTender) {
      return;
    }

    const values: TenderSiteConversionValues = {
      projectAmount: parseFormNumber(siteConversionValues.projectAmount),
      responsible: siteConversionValues.responsible.trim(),
      siteCode: siteConversionValues.siteCode.trim(),
      siteName: siteConversionValues.siteName.trim(),
    };

    setSurfaceError("");
    setSurfaceNotice("");

    if (!values.siteCode || !values.siteName) {
      setSurfaceError("Şantiye kodu ve adı zorunludur.");
      return;
    }

    try {
      if (persistence?.convertTenderToSite) {
        const result = await persistence.convertTenderToSite(
          activeSiteConversionTender.id,
          values,
        );

        if (!result.ok) {
          setSurfaceError(result.errors.join(" "));
          return;
        }

        setDisplayRows((currentRows) =>
          currentRows.map((row) =>
            row.id === activeSiteConversionTender.id ? result.data : row,
          ),
        );
        setActiveSiteConversionTenderId("");
        setSurfaceNotice("Şantiye kartı oluşturuldu.");
        return;
      }

      const convertedRow: TenderRow = {
        ...activeSiteConversionTender,
        convertedSiteCode: values.siteCode,
        convertedSiteName: values.siteName,
        convertedToSiteAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setDisplayRows((currentRows) =>
        currentRows.map((row) =>
          row.id === activeSiteConversionTender.id ? convertedRow : row,
        ),
      );
      setActiveSiteConversionTenderId("");
      setSurfaceNotice("Şantiye kartı oluşturuldu.");
    } catch (error) {
      setSurfaceError(
        error instanceof Error ? error.message : "Şantiye kartı oluşturulamadı",
      );
    }
  }
  async function saveExistingBoqLines() {
    if (!activeBoqTender) {
      return;
    }

    const values: TenderBoqUpdateValues = {
      bidValue: parseFormNumber(boqEditorBidValue),
      boqLines: boqEditorLines.map(tenderBoqLineFormToValues),
    };

    setSurfaceError("");
    setSurfaceNotice("");

    try {
      if (persistence?.updateTenderBoq) {
        const result = await persistence.updateTenderBoq(
          activeBoqTender.id,
          values,
        );

        if (!result.ok) {
          setSurfaceError(result.errors.join(" "));
          return;
        }

        setDisplayRows((currentRows) =>
          currentRows.map((row) =>
            row.id === activeBoqTender.id ? result.data : row,
          ),
        );
        setBoqEditorBidValue(numberToFormValue(result.data.bidValue));
        setBoqEditorLines(tenderBoqRowsToFormValues(result.data.boqLines ?? []));
        setSurfaceNotice("BOQ satırları güncellendi.");
        return;
      }

      const bidValue = parseFormNumber(boqEditorBidValue);
      const updatedRow = {
        ...activeBoqTender,
        bidValue,
        ...buildTenderBoqSummary({
          bidValue,
          boqLines: values.boqLines,
          overheadRate: activeBoqTender.overheadRate,
          profitMargin: activeBoqTender.profitMargin,
        }),
        updatedAt: new Date().toISOString(),
      };

      setDisplayRows((currentRows) =>
        currentRows.map((row) =>
          row.id === activeBoqTender.id ? updatedRow : row,
        ),
      );
      setBoqEditorLines(tenderBoqRowsToFormValues(updatedRow.boqLines ?? []));
      setSurfaceNotice("BOQ satırları güncellendi.");
    } catch (error) {
      setSurfaceError(
        error instanceof Error ? error.message : "BOQ satırları güncellenemedi",
      );
    }
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          P1-S3 temel modül
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              İhale Yönetimi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              EKAP/İKN odaklı ihale takibi; kazanılırsa şantiye açılış
              akışına bağlanacak teklif, takvim, durum ve analiz çalışma alanı.
            </p>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs text-[var(--on-surface-variant)]">
            Görsel kaynak: İhale Yönetimi 5 ekran
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Kazanma Oranı" value={`%${summary.winRate}`} />
        <Metric label="Toplam İhale" value={String(summary.totalCount)} />
        <Metric
          label="Kazanılan Değer"
          value={formatMoney(summary.wonBidTotal)}
        />
        <Metric
          label="Sözleşme Bedeli"
          value={formatMoney(summary.contractTotal)}
        />
      </div>

      <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ul
            aria-label="İhale durum sayaçları"
            className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6"
            role="list"
          >
            {TENDER_STATUSES.map((status) => (
              <li
                className={`rounded-[var(--radius-control)] border px-3 py-2 text-sm ${statusClass[status]}`}
                key={status}
              >
                <button
                  aria-label={`${status} ${summary.statusCounts[status]}`}
                  aria-pressed={activeStatusFilter === status}
                  className="grid w-full grid-cols-[1fr_auto] items-center gap-2 text-left"
                  onClick={() => toggleStatusFilter(status)}
                  type="button"
                >
                  <span className="text-xs font-semibold">{status}</span>
                  <span className="font-mono text-lg font-semibold">
                    {summary.statusCounts[status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {[
              "Ara",
              "Excel",
              "PDF",
              activeView === "analysis" ? "Listeye Dön" : "Analiz Panosu",
              "+ Yeni İhale",
            ].map((action) => (
              <button
                className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold transition hover:bg-[var(--primary-fixed)]"
                key={action}
                onClick={
                  action === "+ Yeni İhale"
                    ? openDraftForm
                    : action === "Analiz Panosu" || action === "Listeye Dön"
                      ? toggleAnalysisView
                      : undefined
                }
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--on-surface-variant)]">
            Son teklif filtresi
          </span>
          {tenderDeadlineFilters.map((filter) => (
            <button
              aria-pressed={activeDeadlineFilter === filter}
              className={`h-8 rounded-[var(--radius-control)] border px-3 text-xs font-semibold transition ${
                activeDeadlineFilter === filter
                  ? "border-[var(--primary)] bg-[var(--primary-fixed)] text-[var(--primary)]"
                  : "border-[var(--grid-border)] bg-[var(--surface-container-low)] text-[var(--on-surface-variant)] hover:bg-[var(--primary-fixed)]"
              }`}
              key={filter}
              onClick={() => toggleDeadlineFilter(filter)}
              type="button"
            >
              {tenderDeadlineFilterLabels[filter]}
            </button>
          ))}
        </div>
      </article>

      {isFormOpen ? (
        <TenderDraftForm
          activeTab={activeFormTab}
          error={formError}
          notice={formNotice}
          onBoqLineAdd={addBoqLine}
          onBoqLineChange={updateBoqLineValue}
          onSave={saveDraftTender}
          onTabChange={setActiveFormTab}
          onValueChange={updateFormValue}
          values={formValues}
        />
      ) : null}

      {activeBoqTender ? (
        <ExistingTenderBoqEditor
          lines={boqEditorLines}
          bidValue={boqEditorBidValue}
          onApplyBoqBidTotal={(value) =>
            setBoqEditorBidValue(numberToFormValue(value))
          }
          onBoqLineAdd={addExistingBoqLine}
          onBoqLineChange={updateExistingBoqLineValue}
          onBoqLineCopy={copyExistingBoqLine}
          onBoqLineDelete={deleteExistingBoqLine}
          onClose={() => setActiveBoqTenderId("")}
          onSave={saveExistingBoqLines}
          tender={activeBoqTender}
        />
      ) : null}

      {activeSiteConversionTender ? (
        <SiteConversionWizard
          onClose={() => setActiveSiteConversionTenderId("")}
          onSave={saveSiteConversion}
          onValueChange={updateSiteConversionValue}
          tender={activeSiteConversionTender}
          values={siteConversionValues}
        />
      ) : null}

      {surfaceError || surfaceNotice ? (
        <p
          className={`rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ${
            surfaceError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role={surfaceError ? "alert" : "status"}
        >
          {surfaceError || surfaceNotice}
        </p>
      ) : null}

      {activeView === "analysis" ? (
        <TenderAnalysisBoard rows={displayRows} summary={summary} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <TenderList
            activeStatusFilter={activeStatusFilter}
            activeDeadlineFilter={activeDeadlineFilter}
            allRowCount={displayRows.length}
            onConvertToSite={openSiteConversion}
            onEditBoq={openBoqEditor}
            onTransitionStatus={transitionTenderStatus}
            rows={filteredRows}
            today={today}
          />
          <TenderAlerts summary={summary} />
        </div>
      )}
    </section>
  );
}

function TenderDraftForm({
  activeTab,
  error,
  notice,
  onBoqLineAdd,
  onBoqLineChange,
  onSave,
  onTabChange,
  onValueChange,
  values,
}: {
  activeTab: "general" | "cost" | "boq";
  error: string;
  notice: string;
  onBoqLineAdd: () => void;
  onBoqLineChange: <Field extends keyof TenderBoqLineFormValues>(
    index: number,
    field: Field,
    value: TenderBoqLineFormValues[Field],
  ) => void;
  onSave: () => void;
  onTabChange: (tab: "general" | "cost" | "boq") => void;
  onValueChange: <Field extends keyof TenderDraftFormValues>(
    field: Field,
    value: TenderDraftFormValues[Field],
  ) => void;
  values: TenderDraftFormValues;
}) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
            3 sekmeli taslak
          </p>
          <h2 className="mt-1 text-lg font-semibold">Yeni İhale</h2>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          <FormTab
            active={activeTab === "general"}
            label="Genel & Takvim"
            onClick={() => onTabChange("general")}
          />
          <FormTab
            active={activeTab === "cost"}
            label="Maliyet & Teklif"
            onClick={() => onTabChange("cost")}
          />
          <FormTab
            active={activeTab === "boq"}
            label="BOQ / Poz"
            onClick={() => onTabChange("boq")}
          />
        </div>
      </div>

      <div className="p-4">
        {error ? (
          <p
            className="mb-3 rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            className="mb-3 rounded-[var(--radius-control)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
            role="status"
          >
            {notice}
          </p>
        ) : null}

        {activeTab === "general" ? (
          <GeneralTenderFields
            onValueChange={onValueChange}
            values={values}
          />
        ) : activeTab === "cost" ? (
          <CostTenderFields onValueChange={onValueChange} values={values} />
        ) : (
          <BoqTenderFields
            onApplyBoqBidTotal={(value) =>
              onValueChange("bidValue", numberToFormValue(value))
            }
            onBoqLineAdd={onBoqLineAdd}
            onBoqLineChange={onBoqLineChange}
            values={values}
          />
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--grid-border)] pt-4">
          <button
            className="h-9 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
            onClick={onSave}
            type="button"
          >
            Taslak Kaydet
          </button>
        </div>
      </div>
    </article>
  );
}

function FormTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`h-9 rounded-[var(--radius-control)] border px-3 text-sm font-semibold ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--grid-border)] bg-[var(--surface-container-low)]"
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}

function GeneralTenderFields({
  onValueChange,
  values,
}: {
  onValueChange: <Field extends keyof TenderDraftFormValues>(
    field: Field,
    value: TenderDraftFormValues[Field],
  ) => void;
  values: TenderDraftFormValues;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <TextInput
        label="Başlık"
        onChange={(value) => onValueChange("title", value)}
        required
        value={values.title}
      />
      <TextInput
        label="İhale No"
        onChange={(value) => onValueChange("tenderNo", value)}
        value={values.tenderNo}
      />
      <TextInput
        label="EKAP / İKN"
        onChange={(value) => onValueChange("ikn", value)}
        value={values.ikn}
      />
      <TextInput
        label="İhale Makamı"
        onChange={(value) => onValueChange("authorityName", value)}
        value={values.authorityName}
      />
      <label className="flex flex-col gap-2 text-sm font-semibold">
        <span>İhale Usulü</span>
        <select
          className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
          onChange={(event) =>
            onValueChange("procedure", event.target.value as TenderProcedure)
          }
          value={values.procedure}
        >
          <option value="Açık">Açık</option>
          <option value="Kapalı">Kapalı</option>
          <option value="Pazarlık">Pazarlık</option>
        </select>
      </label>
      <DateInput
        label="İlan Tarihi"
        onChange={(value) => onValueChange("noticeDate", value)}
        value={values.noticeDate}
      />
      <DateInput
        label="Şartname Satın Alma Son"
        onChange={(value) => onValueChange("specPurchaseDeadline", value)}
        value={values.specPurchaseDeadline}
      />
      <DateInput
        label="Soru-Cevap Son"
        onChange={(value) => onValueChange("questionAnswerDeadline", value)}
        value={values.questionAnswerDeadline}
      />
      <DateTimeInput
        label="Son Teklif Tarihi"
        onChange={(value) => onValueChange("submissionDeadline", value)}
        value={values.submissionDeadline}
      />
      <DateTimeInput
        label="İhale Oturum Tarihi"
        onChange={(value) => onValueChange("sessionDate", value)}
        value={values.sessionDate}
      />
      <DateInput
        label="Sözleşme İmza Tarihi"
        onChange={(value) => onValueChange("contractSignDate", value)}
        value={values.contractSignDate}
      />
      <TextInput
        label="Yer / İl"
        onChange={(value) => onValueChange("city", value)}
        value={values.city}
      />
      <label className="flex flex-col gap-2 text-sm font-semibold md:col-span-2 xl:col-span-3">
        <span>Açıklama</span>
        <textarea
          className="min-h-24 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 py-2 font-normal outline-none focus:border-[var(--primary)]"
          onChange={(event) => onValueChange("description", event.target.value)}
          value={values.description}
        />
      </label>
    </div>
  );
}

function CostTenderFields({
  onValueChange,
  values,
}: {
  onValueChange: <Field extends keyof TenderDraftFormValues>(
    field: Field,
    value: TenderDraftFormValues[Field],
  ) => void;
  values: TenderDraftFormValues;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="flex flex-col gap-2 text-sm font-semibold">
        <span>Para Birimi</span>
        <select
          className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
          onChange={(event) =>
            onValueChange(
              "currency",
              event.target.value as TenderDraftFormValues["currency"],
            )
          }
          value={values.currency}
        >
          <option value="TRY">TRY</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      <NumberInput
        label="İdare Yaklaşık Maliyeti"
        onChange={(value) => onValueChange("estimatedValue", value)}
        value={values.estimatedValue}
      />
      <NumberInput
        label="Genel Gider (Overhead) %"
        onChange={(value) => onValueChange("overheadRate", value)}
        value={values.overheadRate}
      />
      <NumberInput
        label="Kâr Marjı %"
        onChange={(value) => onValueChange("profitMargin", value)}
        value={values.profitMargin}
      />
      <NumberInput
        label="Bizim Teklif Bedeli"
        onChange={(value) => onValueChange("bidValue", value)}
        value={values.bidValue}
      />
      <NumberInput
        label="Sınır Değer (aşırı düşük)"
        onChange={(value) => onValueChange("thresholdValue", value)}
        value={values.thresholdValue}
      />
    </div>
  );
}

function BoqTenderFields({
  onApplyBoqBidTotal,
  onBoqLineAdd,
  onBoqLineChange,
  onBoqLineCopy,
  onBoqLineDelete,
  title = "BOQ / Poz Cetveli",
  values,
}: {
  onApplyBoqBidTotal?: (value: number) => void;
  onBoqLineAdd: () => void;
  onBoqLineChange: <Field extends keyof TenderBoqLineFormValues>(
    index: number,
    field: Field,
    value: TenderBoqLineFormValues[Field],
  ) => void;
  onBoqLineCopy?: (index: number) => void;
  onBoqLineDelete?: (index: number) => void;
  title?: string;
  values: TenderDraftFormValues;
}) {
  const canManageRows = Boolean(onBoqLineCopy || onBoqLineDelete);
  const gridColumns = canManageRows
    ? "grid-cols-[90px_1.5fr_80px_repeat(7,minmax(92px,1fr))_128px]"
    : "grid-cols-[90px_1.5fr_80px_repeat(7,minmax(92px,1fr))]";
  const simulation = calculateTenderBoqSimulation({
    lines: values.boqLines.map(tenderBoqLineFormToValues),
    manualBidValue: parseFormNumber(values.bidValue),
    overheadRate: parseFormNumber(values.overheadRate),
    profitMargin: parseFormNumber(values.profitMargin),
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
            Poz satırı bazında birim maliyet, teklif toplamı ve kârlılık
            simülasyonu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onApplyBoqBidTotal ? (
            <button
              className="h-9 rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary-fixed)] px-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--surface-container-low)]"
              onClick={() => onApplyBoqBidTotal(simulation.boqBidTotal)}
              type="button"
            >
              BOQ Toplamını Teklife Aktar
            </button>
          ) : null}
          <button
            className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold transition hover:bg-[var(--primary-fixed)]"
            onClick={onBoqLineAdd}
            type="button"
          >
            + Poz Ekle
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--grid-border)]">
        <div className={canManageRows ? "min-w-[1240px]" : "min-w-[1120px]"}>
          <div className={`grid ${gridColumns} gap-2 border-b border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold uppercase text-[var(--on-surface-variant)]`}>
            <span>Poz</span>
            <span>İş Kalemi</span>
            <span>Birim</span>
            <span>Miktar</span>
            <span>Malzeme</span>
            <span>İşçilik</span>
            <span>Ekipman</span>
            <span>Taşeron</span>
            <span>Nakliye</span>
            <span>Birim Teklif</span>
            {canManageRows ? <span>İşlem</span> : null}
          </div>
          <div className="divide-y divide-[var(--grid-border)]">
            {values.boqLines.map((line, index) => (
              <div
                className={`grid ${gridColumns} gap-2 px-3 py-2`}
                key={`boq-line-${index}`}
              >
                <BoqInput
                  label="Poz"
                  onChange={(value) => onBoqLineChange(index, "pozNo", value)}
                  value={line.pozNo}
                />
                <BoqInput
                  label="İş Kalemi"
                  onChange={(value) =>
                    onBoqLineChange(index, "description", value)
                  }
                  value={line.description}
                />
                <BoqInput
                  label="Birim"
                  onChange={(value) => onBoqLineChange(index, "unit", value)}
                  value={line.unit}
                />
                <BoqInput
                  label="Miktar"
                  numeric
                  onChange={(value) => onBoqLineChange(index, "quantity", value)}
                  value={line.quantity}
                />
                <BoqInput
                  label="Malzeme"
                  numeric
                  onChange={(value) =>
                    onBoqLineChange(index, "materialCost", value)
                  }
                  value={line.materialCost}
                />
                <BoqInput
                  label="İşçilik"
                  numeric
                  onChange={(value) =>
                    onBoqLineChange(index, "laborCost", value)
                  }
                  value={line.laborCost}
                />
                <BoqInput
                  label="Ekipman"
                  numeric
                  onChange={(value) =>
                    onBoqLineChange(index, "equipmentCost", value)
                  }
                  value={line.equipmentCost}
                />
                <BoqInput
                  label="Taşeron"
                  numeric
                  onChange={(value) =>
                    onBoqLineChange(index, "subcontractorCost", value)
                  }
                  value={line.subcontractorCost}
                />
                <BoqInput
                  label="Nakliye"
                  numeric
                  onChange={(value) =>
                    onBoqLineChange(index, "shippingCost", value)
                  }
                  value={line.shippingCost}
                />
                <BoqInput
                  label="Birim Teklif"
                  numeric
                  onChange={(value) => onBoqLineChange(index, "unitBid", value)}
                  value={line.unitBid}
                />
                {canManageRows ? (
                  <div className="flex gap-1">
                    {onBoqLineCopy ? (
                      <button
                        aria-label={`Satır Kopyala ${index + 1}`}
                        className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 text-xs font-semibold transition hover:bg-[var(--primary-fixed)]"
                        onClick={() => onBoqLineCopy(index)}
                        type="button"
                      >
                        Kopyala
                      </button>
                    ) : null}
                    {onBoqLineDelete ? (
                      <button
                        aria-label={`Satır Sil ${index + 1}`}
                        className="h-9 rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        onClick={() => onBoqLineDelete(index)}
                        type="button"
                      >
                        Sil
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <BoqMetric label="Toplam Maliyet" value={formatMoney(simulation.totalCost)} />
        <BoqMetric
          label="BOQ Teklif Toplamı"
          value={formatMoney(simulation.boqBidTotal)}
        />
        <BoqMetric
          label="Önerilen Teklif"
          value={formatMoney(simulation.suggestedOffer)}
        />
        <BoqMetric label="Kâr" value={formatMoney(simulation.profitAmount)} />
        <BoqMetric
          label="Kâr Oranı"
          value={formatPercent(simulation.profitRate)}
        />
      </div>
    </section>
  );
}

function SiteConversionWizard({
  onClose,
  onSave,
  onValueChange,
  tender,
  values,
}: {
  onClose: () => void;
  onSave: () => void;
  onValueChange: <Field extends keyof TenderSiteConversionFormValues>(
    field: Field,
    value: TenderSiteConversionFormValues[Field],
  ) => void;
  tender: TenderRow;
  values: TenderSiteConversionFormValues;
}) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="flex flex-col gap-2 border-b border-[var(--grid-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
            {tender.tenderNo}
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            İhaleden Şantiye Oluştur
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold transition hover:bg-[var(--primary-fixed)]"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
          <button
            className="h-9 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
            onClick={onSave}
            type="button"
          >
            Şantiye Oluştur
          </button>
        </div>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
        <TextInput
          label="Şantiye Kodu"
          onChange={(value) => onValueChange("siteCode", value)}
          required
          value={values.siteCode}
        />
        <TextInput
          label="Şantiye Adı"
          onChange={(value) => onValueChange("siteName", value)}
          required
          value={values.siteName}
        />
        <TextInput
          label="Yetkili"
          onChange={(value) => onValueChange("responsible", value)}
          value={values.responsible}
        />
        <NumberInput
          label="Proje Tutarı"
          onChange={(value) => onValueChange("projectAmount", value)}
          value={values.projectAmount}
        />
      </div>
    </article>
  );
}
function ExistingTenderBoqEditor({
  bidValue,
  lines,
  onApplyBoqBidTotal,
  onBoqLineAdd,
  onBoqLineChange,
  onBoqLineCopy,
  onBoqLineDelete,
  onClose,
  onSave,
  tender,
}: {
  bidValue: string;
  lines: TenderBoqLineFormValues[];
  onApplyBoqBidTotal: (value: number) => void;
  onBoqLineAdd: () => void;
  onBoqLineChange: <Field extends keyof TenderBoqLineFormValues>(
    index: number,
    field: Field,
    value: TenderBoqLineFormValues[Field],
  ) => void;
  onBoqLineCopy: (index: number) => void;
  onBoqLineDelete: (index: number) => void;
  onClose: () => void;
  onSave: () => void;
  tender: TenderRow;
}) {
  const values = tenderRowToBoqDraftFormValues(tender, lines, bidValue);

  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="flex flex-col gap-2 border-b border-[var(--grid-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
            {tender.tenderNo}
          </p>
          <h2 className="mt-1 text-lg font-semibold">BOQ Düzenle</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold transition hover:bg-[var(--primary-fixed)]"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
          <button
            className="h-9 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
            onClick={onSave}
            type="button"
          >
            BOQ Kaydet
          </button>
        </div>
      </div>
      <div className="p-4">
        <BoqTenderFields
          onApplyBoqBidTotal={onApplyBoqBidTotal}
          onBoqLineAdd={onBoqLineAdd}
          onBoqLineChange={onBoqLineChange}
          onBoqLineCopy={onBoqLineCopy}
          onBoqLineDelete={onBoqLineDelete}
          title="BOQ / Poz Satırları"
          values={values}
        />
      </div>
    </article>
  );
}

function BoqInput({
  label,
  numeric = false,
  onChange,
  value,
}: {
  label: string;
  numeric?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <input
      aria-label={label}
      className="h-9 min-w-0 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-2 text-sm outline-none focus:border-[var(--primary)]"
      inputMode={numeric ? "decimal" : undefined}
      onChange={(event) => onChange(event.target.value)}
      type={numeric ? "number" : "text"}
      value={value}
    />
  );
}

function BoqMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2">
      <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function TextInput({
  label,
  onChange,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      <span>
        {label}
        {required ? (
          <span className="ml-1 text-[var(--mandatory-indicator)]">*</span>
        ) : null}
      </span>
      <input
        aria-label={label}
        className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      <span>{label}</span>
      <input
        aria-label={label}
        className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function DateTimeInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      <span>{label}</span>
      <input
        aria-label={label}
        className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        type="datetime-local"
        value={value}
      />
    </label>
  );
}

function NumberInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      <span>{label}</span>
      <input
        aria-label={label}
        className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </label>
  );
}

function tenderFormValuesToCreateValues(
  values: TenderDraftFormValues,
): TenderCreateValues {
  return {
    authorityName: values.authorityName,
    bidValue: parseFormNumber(values.bidValue),
    boqLines: values.boqLines.map(tenderBoqLineFormToValues),
    city: values.city,
    contractSignDate: values.contractSignDate,
    currency: values.currency,
    description: values.description,
    estimatedValue: parseFormNumber(values.estimatedValue),
    ikn: values.ikn,
    noticeDate: values.noticeDate,
    overheadRate: parseFormNumber(values.overheadRate),
    profitMargin: parseFormNumber(values.profitMargin),
    procedure: values.procedure,
    questionAnswerDeadline: values.questionAnswerDeadline,
    sessionDate: values.sessionDate,
    specPurchaseDeadline: values.specPurchaseDeadline,
    submissionDeadline: values.submissionDeadline,
    tenderNo: values.tenderNo,
    thresholdValue: parseFormNumber(values.thresholdValue),
    title: values.title,
  };
}

function tenderRowToBoqDraftFormValues(
  row: TenderRow,
  boqLines: TenderBoqLineFormValues[],
  bidValue = numberToFormValue(row.bidValue),
): TenderDraftFormValues {
  return {
    authorityName: row.authorityName,
    bidValue,
    boqLines,
    city: row.city ?? "",
    contractSignDate: row.contractSignDate ?? "",
    currency: row.currency ?? "TRY",
    description: row.description ?? "",
    estimatedValue: numberToFormValue(row.estimatedValue),
    ikn: row.ikn,
    noticeDate: row.noticeDate ?? "",
    overheadRate: numberToFormValue(row.overheadRate ?? 0),
    profitMargin: numberToFormValue(row.profitMargin ?? 0),
    procedure: row.procedure,
    questionAnswerDeadline: row.questionAnswerDeadline ?? "",
    sessionDate: row.sessionDate ?? "",
    specPurchaseDeadline: row.specPurchaseDeadline ?? "",
    submissionDeadline: row.submissionDeadline,
    tenderNo: row.tenderNo,
    thresholdValue: numberToFormValue(row.thresholdValue ?? 0),
    title: row.title,
  };
}

function tenderBoqRowsToFormValues(
  lines: TenderBoqLineRow[],
): TenderBoqLineFormValues[] {
  if (lines.length === 0) {
    return [createEmptyTenderBoqLine()];
  }

  return lines.map((line) => ({
    description: line.description,
    equipmentCost: numberToFormValue(line.equipmentCost),
    laborCost: numberToFormValue(line.laborCost),
    materialCost: numberToFormValue(line.materialCost),
    pozNo: line.pozNo,
    quantity: numberToFormValue(line.quantity),
    shippingCost: numberToFormValue(line.shippingCost),
    subcontractorCost: numberToFormValue(line.subcontractorCost),
    unit: line.unit,
    unitBid: numberToFormValue(line.unitBid),
  }));
}

function tenderBoqLineFormToValues(
  line: TenderBoqLineFormValues,
): TenderBoqLineValues {
  return {
    description: line.description.trim(),
    equipmentCost: parseFormNumber(line.equipmentCost),
    laborCost: parseFormNumber(line.laborCost),
    materialCost: parseFormNumber(line.materialCost),
    pozNo: line.pozNo.trim(),
    quantity: parseFormNumber(line.quantity),
    shippingCost: parseFormNumber(line.shippingCost),
    subcontractorCost: parseFormNumber(line.subcontractorCost),
    unit: line.unit.trim(),
    unitBid: parseFormNumber(line.unitBid),
  };
}

function parseFormNumber(value: string) {
  const parsedValue = Number(value.trim().replace(",", "."));

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function numberToFormValue(value: number) {
  return value > 0 ? String(value) : "";
}

function TenderAnalysisBoard({
  rows,
  summary,
}: {
  rows: TenderRow[];
  summary: ReturnType<typeof summarizeTenders>;
}) {
  const authorityRows = summarizeTenderAuthorities(rows);

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
        <h2 className="text-sm font-semibold">İhale Analiz Panosu</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <AnalysisMetric
            label="Açık İhale"
            value={String(
              summary.statusCounts.Takip +
                summary.statusCounts.Hazırlanıyor +
                summary.statusCounts.Sunuldu,
            )}
          />
          <AnalysisMetric
            label="Sonuçlanan"
            value={String(
              summary.statusCounts.Kazanıldı +
                summary.statusCounts.Kaybedildi +
                summary.statusCounts.İptal,
            )}
          />
          <AnalysisMetric
            label="Süresi Dolan"
            value={String(summary.overdueOpenRows.length)}
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TENDER_STATUSES.map((status) => (
            <div
              className={`rounded-[var(--radius-control)] border px-3 py-2 text-sm ${statusClass[status]}`}
              key={status}
            >
              <span className="block text-xs font-semibold">{status}</span>
              <span className="font-mono text-lg font-semibold">
                {summary.statusCounts[status]}
              </span>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
        <h2 className="text-sm font-semibold">En Çok İhale Açan Kurumlar</h2>
        <div className="mt-3 space-y-2 text-sm">
          {authorityRows.length === 0 ? (
            <p className="text-[var(--on-surface-variant)]">Kurum kaydı yok.</p>
          ) : (
            authorityRows.map((row) => (
              <div
                className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-3"
                key={row.authorityName}
              >
                <p className="font-semibold">{row.authorityName}</p>
                <p className="font-mono text-xs text-[var(--on-surface-variant)]">
                  {row.totalCount} ihale / {row.wonCount} kazanıldı
                </p>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

function summarizeTenderAuthorities(rows: TenderRow[]) {
  const summaryByAuthority = new Map<
    string,
    { authorityName: string; totalCount: number; wonCount: number }
  >();

  for (const row of rows) {
    const authorityName = row.authorityName || "Belirtilmemiş kurum";
    const current = summaryByAuthority.get(authorityName) ?? {
      authorityName,
      totalCount: 0,
      wonCount: 0,
    };

    summaryByAuthority.set(authorityName, {
      ...current,
      totalCount: current.totalCount + 1,
      wonCount: current.wonCount + (row.status === "Kazanıldı" ? 1 : 0),
    });
  }

  return [...summaryByAuthority.values()].sort(
    (first, second) => second.totalCount - first.totalCount,
  );
}

function AnalysisMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2">
      <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}

function TenderList({
  activeStatusFilter,
  activeDeadlineFilter,
  allRowCount,
  onConvertToSite,
  onEditBoq,
  onTransitionStatus,
  rows,
  today,
}: {
  activeStatusFilter: TenderStatus | "all";
  activeDeadlineFilter: TenderDeadlineFilter;
  allRowCount: number;
  onConvertToSite: (row: TenderRow) => void;
  onEditBoq: (row: TenderRow) => void;
  onTransitionStatus: (tenderId: string, status: TenderStatus) => void;
  rows: TenderRow[];
  today: string;
}) {
  return (
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="flex flex-col gap-1 border-b border-[var(--grid-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold">İhale Listesi</h2>
        {activeStatusFilter !== "all" || activeDeadlineFilter !== "all" ? (
          <p className="text-xs font-semibold text-[var(--on-surface-variant)]">
            {allRowCount} kayıt içinden {rows.length} gösteriliyor.
          </p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
            <tr>
              <th className="px-4 py-3 font-semibold">NO / İKN</th>
              <th className="px-4 py-3 font-semibold">BAŞLIK</th>
              <th className="px-4 py-3 font-semibold">İHALE MAKAMI</th>
              <th className="px-4 py-3 font-semibold">DURUM</th>
              <th className="px-4 py-3 font-semibold">SON TEKLİF</th>
              <th className="px-4 py-3 text-right font-semibold">
                YAKLAŞIK BEDEL
              </th>
              <th className="px-4 py-3 text-right font-semibold">İŞLEMLER</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--grid-border)]">
            {rows.map((row) => (
              <tr className="hover:bg-[var(--primary-fixed)]" key={row.id}>
                <td className="px-4 py-3">
                  <span className="block font-mono text-xs font-semibold">
                    {row.tenderNo}
                  </span>
                  <span className="block font-mono text-xs text-[var(--on-surface-variant)]">
                    {row.ikn}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="block font-semibold">{row.title}</span>
                  <span className="text-xs text-[var(--on-surface-variant)]">
                    {row.procedure} usul
                  </span>
                  {row.convertedSiteCode ? (
                    <span className="mt-1 block font-mono text-xs font-semibold text-[var(--primary)]">
                      {row.convertedSiteCode}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{row.authorityName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="block font-mono text-xs">
                    {formatDateTime(row.submissionDeadline)}
                  </span>
                  {isTenderDeadlineOverdue(row, today) ? (
                    <span className="mt-1 inline-flex rounded-[var(--radius-control)] bg-[var(--status-cancelled)] px-2 py-0.5 text-xs font-semibold text-white">
                      Süre doldu
                    </span>
                  ) : isTenderDeadlineUpcoming(row, today) ? (
                    <span className="mt-1 inline-flex rounded-[var(--radius-control)] bg-[var(--status-process)] px-2 py-0.5 text-xs font-semibold text-white">
                      Yaklaşıyor
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  {formatMoney(row.estimatedValue)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <button
                      aria-label={`BOQ Düzenle ${row.tenderNo}`}
                      className="h-8 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 text-xs font-semibold transition hover:bg-[var(--primary-fixed)]"
                      onClick={() => onEditBoq(row)}
                      type="button"
                    >
                      BOQ
                    </button>
                    {row.status === "Kazanıldı" && !row.convertedSiteCode ? (
                      <button
                        aria-label={`Şantiye Aç ${row.tenderNo}`}
                        className="h-8 rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--primary-fixed)] px-2 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--surface-container-low)]"
                        onClick={() => onConvertToSite(row)}
                        type="button"
                      >
                        Şantiye Aç
                      </button>
                    ) : null}
                    <TenderStatusActions
                      onTransition={(status) => onTransitionStatus(row.id, status)}
                      status={row.status}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function TenderStatusActions({
  onTransition,
  status,
}: {
  onTransition: (status: TenderStatus) => void;
  status: TenderStatus;
}) {
  const nextStatuses = getNextTenderStatuses(status);

  if (nextStatuses.length === 0) {
    return (
      <span className="text-xs font-semibold text-[var(--on-surface-variant)]">
        Sonuçlandı
      </span>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {nextStatuses.map((nextStatus) => (
        <button
          className="h-8 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 text-xs font-semibold transition hover:bg-[var(--primary-fixed)]"
          key={nextStatus}
          onClick={() => onTransition(nextStatus)}
          type="button"
        >
          {nextStatus} yap
        </button>
      ))}
    </div>
  );
}

function TenderAlerts({
  summary,
}: {
  summary: ReturnType<typeof summarizeTenders>;
}) {
  return (
    <aside className="flex flex-col gap-4">
      <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
        <h2 className="text-sm font-semibold">Yaklaşan son teklif</h2>
        <div className="mt-3 space-y-2 text-sm">
          {summary.upcomingDeadlineRows.length === 0 ? (
            <p className="text-[var(--on-surface-variant)]">
              7 gün içinde son teklif tarihi yok.
            </p>
          ) : (
            summary.upcomingDeadlineRows.map((row) => (
              <div
                className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-3"
                key={row.id}
              >
                <p className="font-semibold">{row.tenderNo}</p>
                <p className="text-[var(--on-surface-variant)]">{row.title}</p>
              </div>
            ))
          )}
        </div>
      </article>
      <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
        <h2 className="text-sm font-semibold">Sonuç bekleyen</h2>
        <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
          Sunuldu durumunda olup süresi dolan ihaleler burada takip edilir.
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold">
          {summary.overdueOpenRows.length}
        </p>
      </article>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <p className="text-sm font-semibold text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: TenderStatus }) {
  return (
    <span
      className={`inline-flex rounded-[var(--radius-control)] border px-2 py-1 text-xs font-semibold ${statusClass[status]}`}
    >
      {status}
    </span>
  );
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatPercent(value: number) {
  return `%${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
