"use client";

import { useState } from "react";

import { Icon, type IconName } from "@/components/ui";
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
  highlightedRecordId?: string;
  initialSearchQuery?: string;
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
  Hazırlanıyor: "border-info bg-info-subtle text-info",
  Kazanıldı: "border-success bg-success-subtle text-success",
  Kaybedildi: "border-danger bg-danger-subtle text-danger",
  Sunuldu: "border-warning bg-warning-subtle text-warning",
  Takip: "border-divider bg-surface-muted text-content-subtle",
  İptal: "border-divider bg-surface-muted text-content-subtle",
};

type TenderDeadlineFilter = "all" | "overdue" | "upcoming";
type TenderView = "analysis" | "kanban" | "list";

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
  highlightedRecordId,
  initialSearchQuery = "",
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
  const [activeView, setActiveView] = useState<TenderView>("list");
  const [query, setQuery] = useState(initialSearchQuery);
  const summary = summarizeTenders(displayRows, today);
  const filteredRows =
    displayRows.filter((row) => {
      const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

      if (
        normalizedQuery &&
        ![
          row.authorityName,
          row.city,
          row.ikn,
          row.tenderNo,
          row.title,
        ].some((value) =>
          value?.toLocaleLowerCase("tr-TR").includes(normalizedQuery),
        )
      ) {
        return false;
      }

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

  function changeView(view: TenderView) {
    setActiveView(view);
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
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav
            aria-label="İçerik yolu"
            className="text-xs font-semibold text-content-muted"
          >
            Operasyon / İhale Yönetimi
          </nav>
          <h1 className="mt-2 text-3xl font-bold leading-[2.375rem] tracking-[-0.02em] text-content">
            İhale Yönetimi
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
            EKAP/İKN takibini, teklif takvimini, BOQ kârlılığını ve kazanılan
            ihaleden şantiye açılışını tek çalışma alanında yönetin.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-subtle shadow-sm">
          <Icon name="gavel" size={18} />
          {summary.statusCounts.Takip +
            summary.statusCounts.Hazırlanıyor +
            summary.statusCounts.Sunuldu}{" "}
          açık ihale
        </div>
      </header>

      <div
        aria-label="İhale özet metrikleri"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Metric
          icon="chart"
          label="Kazanma Oranı"
          tone="brand"
          value={`%${summary.winRate}`}
        />
        <Metric
          icon="gavel"
          label="Toplam İhale"
          value={String(summary.totalCount)}
        />
        <Metric
          compact
          icon="check"
          label="Kazanılan Değer"
          tone="success"
          value={formatMoney(summary.wonBidTotal)}
        />
        <Metric
          compact
          icon="receipt"
          label="Sözleşme Bedeli"
          tone="warning"
          value={formatMoney(summary.contractTotal)}
        />
      </div>

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <ul
            aria-label="İhale durum sayaçları"
            className="grid flex-1 gap-2 sm:grid-cols-3 xl:grid-cols-6"
            role="list"
          >
            {TENDER_STATUSES.map((status) => (
              <li
                className={`rounded-ui-control border text-sm transition-shadow ${
                  statusClass[status]
                } ${activeStatusFilter === status ? "ring-2 ring-brand-primary ring-offset-1" : ""}`}
                key={status}
              >
                <button
                  aria-label={`${status} ${summary.statusCounts[status]}`}
                  aria-pressed={activeStatusFilter === status}
                  className="grid min-h-11 w-full grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 text-left"
                  onClick={() => toggleStatusFilter(status)}
                  type="button"
                >
                  <span className="text-xs font-semibold">{status}</span>
                  <span className="font-mono text-base font-semibold">
                    {summary.statusCounts[status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            aria-label="+ Yeni İhale"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong"
            onClick={openDraftForm}
            type="button"
          >
            <Icon name="plus" size={17} />
            Yeni İhale
          </button>
        </div>

        <div className="grid gap-3 bg-surface-raised px-4 py-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto] lg:items-center">
          <label className="relative w-full max-w-xl">
            <span className="sr-only">İhale ara</span>
            <Icon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
              name="search"
              size={17}
            />
            <input
              className="h-10 w-full rounded-ui-control border border-divider bg-surface-muted pl-9 pr-3 text-sm text-content outline-none transition-colors placeholder:text-content-muted focus:border-brand-primary focus:bg-surface-raised"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="İhale no, İKN, başlık veya kurum ara"
              type="search"
              value={query}
            />
          </label>

          <div
            aria-label="İhale görünümü"
            className="inline-flex overflow-hidden rounded-ui-control border border-divider bg-surface-muted"
            role="group"
          >
            <ViewButton
              active={activeView === "list"}
              label="Liste"
              onClick={() => changeView("list")}
            />
            <ViewButton
              active={activeView === "kanban"}
              label="Kanban"
              onClick={() => changeView("kanban")}
            />
            <ViewButton
              active={activeView === "analysis"}
              label={activeView === "analysis" ? "Listeye Dön" : "Analiz Panosu"}
              onClick={toggleAnalysisView}
            />
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <a
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
              download="ihale-listesi.csv"
              href={buildTenderCsvHref(filteredRows)}
            >
              <Icon name="download" size={16} />
              CSV
            </a>
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
              onClick={() => window.print()}
              type="button"
            >
              <Icon name="file" size={16} />
              Yazdır / PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-divider bg-surface-muted px-4 py-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
            Son teklif
          </span>
          {tenderDeadlineFilters.map((filter) => (
            <button
              aria-pressed={activeDeadlineFilter === filter}
              className={`min-h-8 rounded-ui-control border px-3 text-xs font-semibold transition-colors ${
                activeDeadlineFilter === filter
                  ? "border-brand-primary bg-brand-primary text-on-brand"
                  : "border-divider bg-surface-raised text-content-subtle hover:border-brand-primary hover:bg-brand-primary-subtle"
              }`}
              key={filter}
              onClick={() => toggleDeadlineFilter(filter)}
              type="button"
            >
              {tenderDeadlineFilterLabels[filter]}
            </button>
          ))}
          <span className="ml-auto font-mono text-xs text-content-subtle">
            {filteredRows.length}/{displayRows.length} kayıt
          </span>
        </div>
      </article>

      {isFormOpen ? (
        <TenderDraftForm
          activeTab={activeFormTab}
          error={formError}
          notice={formNotice}
          onBoqLineAdd={addBoqLine}
          onBoqLineChange={updateBoqLineValue}
          onClose={() => setIsFormOpen(false)}
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
          className={`rounded-ui-control border px-3 py-2 text-sm font-semibold ${
            surfaceError
              ? "border-danger bg-danger-subtle text-danger"
              : "border-success bg-success-subtle text-success"
          }`}
          role={surfaceError ? "alert" : "status"}
        >
          {surfaceError || surfaceNotice}
        </p>
      ) : null}

      {activeView === "analysis" ? (
        <TenderAnalysisBoard rows={displayRows} summary={summary} />
      ) : activeView === "kanban" ? (
        <TenderKanbanBoard
          onEditBoq={openBoqEditor}
          onTransitionStatus={transitionTenderStatus}
          rows={filteredRows}
          today={today}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <TenderList
            activeStatusFilter={activeStatusFilter}
            activeDeadlineFilter={activeDeadlineFilter}
            allRowCount={displayRows.length}
            highlightedRecordId={highlightedRecordId}
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
  onClose,
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
  onClose: () => void;
  onSave: () => void;
  onTabChange: (tab: "general" | "cost" | "boq") => void;
  onValueChange: <Field extends keyof TenderDraftFormValues>(
    field: Field,
    value: TenderDraftFormValues[Field],
  ) => void;
  values: TenderDraftFormValues;
}) {
  return (
    <article
      aria-label="Yeni ihale formu"
      className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-divider px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            Üç adımlı ihale kaydı
          </p>
          <h2 className="mt-1 text-xl font-semibold text-content">Yeni İhale</h2>
          <p className="mt-1 text-sm text-content-subtle">
            Genel takvim, maliyet teklifi ve BOQ satırlarını tek taslakta yönetin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            aria-label="Yeni ihale formunu kapat"
            className="min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            Vazgeç
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {error ? (
          <p
            className="mb-3 rounded-ui-control border border-danger bg-danger-subtle px-3 py-2 text-sm font-semibold text-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            className="mb-3 rounded-ui-control border border-success bg-success-subtle px-3 py-2 text-sm font-semibold text-success"
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

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-divider pt-4">
          <button
            className="min-h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong"
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
      className={`min-h-10 rounded-ui-control border px-3 text-sm font-semibold transition-colors ${
        active
          ? "border-brand-primary bg-brand-primary text-on-brand"
          : "border-divider bg-surface-muted text-content-subtle hover:border-brand-primary hover:bg-brand-primary-subtle"
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}

function ViewButton({
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
      aria-pressed={active}
      className={
        "min-h-10 px-3 text-sm font-semibold transition-colors " +
        (active
          ? "bg-brand-primary text-on-brand"
          : "text-content-subtle hover:bg-brand-primary-subtle hover:text-content")
      }
      onClick={onClick}
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
        autoFocus
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
          className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 font-normal text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
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
          className="min-h-24 rounded-ui-control border border-divider bg-surface-muted px-3 py-2 font-normal text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
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
          className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 font-normal text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
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
          <p className="mt-1 text-sm text-content-subtle">
            Poz satırı bazında birim maliyet, teklif toplamı ve kârlılık
            simülasyonu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onApplyBoqBidTotal ? (
            <button
              className="min-h-9 rounded-ui-control border border-brand-primary bg-brand-primary-subtle px-3 text-sm font-semibold text-brand-primary transition-colors hover:bg-surface-selected"
              onClick={() => onApplyBoqBidTotal(simulation.boqBidTotal)}
              type="button"
            >
              BOQ Toplamını Teklife Aktar
            </button>
          ) : null}
          <button
            className="min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition-colors hover:border-brand-primary hover:bg-surface-muted"
            onClick={onBoqLineAdd}
            type="button"
          >
            + Poz Ekle
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-ui-control border border-divider">
        <div className={canManageRows ? "min-w-[1240px]" : "min-w-[1120px]"}>
          <div className={`grid ${gridColumns} gap-2 border-b border-divider bg-surface-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-content-subtle`}>
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
          <div className="divide-y divide-divider">
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
                        className="h-9 rounded-ui-control border border-divider bg-surface-muted px-2 text-xs font-semibold text-content transition-colors hover:border-brand-primary"
                        onClick={() => onBoqLineCopy(index)}
                        type="button"
                      >
                        Kopyala
                      </button>
                    ) : null}
                    {onBoqLineDelete ? (
                      <button
                        aria-label={`Satır Sil ${index + 1}`}
                        className="h-9 rounded-ui-control border border-danger bg-danger-subtle px-2 text-xs font-semibold text-danger transition-colors hover:brightness-95"
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
    <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="flex flex-col gap-2 border-b border-divider px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            {tender.tenderNo}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-content">
            İhaleden Şantiye Oluştur
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
          <button
            className="min-h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong"
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
    <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="flex flex-col gap-2 border-b border-divider px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            {tender.tenderNo}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-content">BOQ Düzenle</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="min-h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
          <button
            className="min-h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong"
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
      className="h-9 min-w-0 rounded-ui-control border border-divider bg-surface-muted px-2 text-sm text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
      inputMode={numeric ? "decimal" : undefined}
      onChange={(event) => onChange(event.target.value)}
      type={numeric ? "number" : "text"}
      value={value}
    />
  );
}

function BoqMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-ui-control border border-divider bg-surface-muted px-3 py-3">
      <p className="text-xs font-semibold text-content-subtle">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold text-content">{value}</p>
    </div>
  );
}

function TextInput({
  autoFocus = false,
  label,
  onChange,
  required = false,
  value,
}: {
  autoFocus?: boolean;
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
          <span className="ml-1 text-[var(--ds-danger)]">*</span>
        ) : null}
      </span>
      <input
        aria-label={label}
        autoFocus={autoFocus}
        className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 font-normal text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
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
        className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 font-normal text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
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
        className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 font-normal text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
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
        className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 font-normal text-content outline-none transition-colors focus:border-brand-primary focus:bg-surface-raised"
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
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold text-content">İhale Analiz Panosu</h2>
        <p className="mt-1 text-sm text-content-subtle">
          Durum, sonuç ve son teklif risklerini mevcut ihale kayıtlarından türetir.
        </p>
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
        <div
          aria-label="İhale durum dağılımı"
          className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {TENDER_STATUSES.map((status) => (
            <div
              className={`rounded-ui-control border px-3 py-3 text-sm ${statusClass[status]}`}
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

      <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5">
        <h2 className="text-xl font-semibold text-content">
          En Çok İhale Açan Kurumlar
        </h2>
        <p className="mt-1 text-sm text-content-subtle">
          Portföydeki gerçek ihale sayısı ve kazanım dağılımı.
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {authorityRows.length === 0 ? (
            <p className="text-content-subtle">Kurum kaydı yok.</p>
          ) : (
            authorityRows.map((row) => (
              <div
                className="rounded-ui-control border border-divider bg-surface-muted p-3"
                key={row.authorityName}
              >
                <p className="font-semibold">{row.authorityName}</p>
                <p className="mt-1 font-mono text-xs text-content-subtle">
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

function TenderKanbanBoard({
  onEditBoq,
  onTransitionStatus,
  rows,
  today,
}: {
  onEditBoq: (row: TenderRow) => void;
  onTransitionStatus: (tenderId: string, status: TenderStatus) => void;
  rows: TenderRow[];
  today: string;
}) {
  return (
    <section
      aria-label="İhale Kanban panosu"
      className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm"
    >
      <div className="border-b border-divider px-4 py-4 sm:px-5">
        <h2 className="text-xl font-semibold text-content">İhale Kanban</h2>
        <p className="mt-1 text-sm text-content-subtle">
          İhaleleri gerçek durumlarına göre izleyin; izin verilen sonraki duruma
          kart üzerinden geçirin.
        </p>
      </div>
      <div className="overflow-x-auto bg-surface-muted p-4">
        <div className="grid min-w-[1560px] grid-cols-6 gap-3">
          {TENDER_STATUSES.map((status) => {
            const statusRows = rows.filter((row) => row.status === status);

            return (
              <section
                aria-label={`${status} ihaleleri`}
                className="min-w-0 rounded-ui-panel border border-divider bg-surface-raised"
                key={status}
              >
                <header
                  className={`flex items-center justify-between gap-2 rounded-t-ui-panel border-b px-3 py-3 ${statusClass[status]}`}
                >
                  <h3 className="text-sm font-semibold">{status}</h3>
                  <span className="rounded-full bg-surface-raised/70 px-2 py-0.5 font-mono text-xs font-semibold">
                    {statusRows.length}
                  </span>
                </header>
                <div className="space-y-3 p-3">
                  {statusRows.length === 0 ? (
                    <p className="rounded-ui-control border border-dashed border-divider px-3 py-6 text-center text-xs text-content-muted">
                      Bu durumda ihale yok
                    </p>
                  ) : (
                    statusRows.map((row) => (
                      <article
                        className="rounded-ui-control border border-divider bg-surface-raised p-3 shadow-sm"
                        key={row.id}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-xs font-semibold text-brand-primary">
                            {row.tenderNo}
                          </p>
                          {isTenderDeadlineOverdue(row, today) ? (
                            <span className="rounded-full bg-danger-subtle px-2 py-0.5 text-[10px] font-semibold text-danger">
                              Süre doldu
                            </span>
                          ) : isTenderDeadlineUpcoming(row, today) ? (
                            <span className="rounded-full bg-warning-subtle px-2 py-0.5 text-[10px] font-semibold text-warning">
                              Yaklaşıyor
                            </span>
                          ) : null}
                        </div>
                        <h4 className="mt-2 text-sm font-semibold leading-5 text-content">
                          {row.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-content-subtle">
                          {row.authorityName || "İhale makamı belirtilmedi"}
                        </p>
                        <dl className="mt-3 space-y-1 border-t border-divider pt-3 text-xs">
                          <div className="flex justify-between gap-2">
                            <dt className="text-content-muted">Son teklif</dt>
                            <dd className="font-mono font-semibold text-content">
                              {formatDateTime(row.submissionDeadline)}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-2">
                            <dt className="text-content-muted">Yaklaşık bedel</dt>
                            <dd className="font-mono font-semibold text-content">
                              {formatMoney(row.estimatedValue)}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-3 flex flex-wrap gap-1 border-t border-divider pt-3">
                          <button
                            aria-label={`BOQ Düzenle ${row.tenderNo}`}
                            className="min-h-8 rounded-ui-control border border-divider bg-surface-muted px-2 text-xs font-semibold text-content hover:border-brand-primary"
                            onClick={() => onEditBoq(row)}
                            type="button"
                          >
                            BOQ
                          </button>
                          <TenderStatusActions
                            onTransition={(nextStatus) =>
                              onTransitionStatus(row.id, nextStatus)
                            }
                            status={row.status}
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
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
    <div className="rounded-ui-control border border-divider bg-surface-muted px-3 py-3">
      <p className="text-xs font-semibold text-content-subtle">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold text-content">{value}</p>
    </div>
  );
}

function TenderList({
  activeStatusFilter,
  activeDeadlineFilter,
  allRowCount,
  highlightedRecordId,
  onConvertToSite,
  onEditBoq,
  onTransitionStatus,
  rows,
  today,
}: {
  activeStatusFilter: TenderStatus | "all";
  activeDeadlineFilter: TenderDeadlineFilter;
  allRowCount: number;
  highlightedRecordId?: string;
  onConvertToSite: (row: TenderRow) => void;
  onEditBoq: (row: TenderRow) => void;
  onTransitionStatus: (tenderId: string, status: TenderStatus) => void;
  rows: TenderRow[];
  today: string;
}) {
  return (
    <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
      <div className="flex flex-col gap-1 border-b border-divider px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-xl font-semibold text-content">İhale Listesi</h2>
          <p className="mt-1 text-sm text-content-subtle">
            Teklif takvimi, bedeller, durum geçişleri ve BOQ işlemleri.
          </p>
        </div>
        {activeStatusFilter !== "all" || activeDeadlineFilter !== "all" ? (
          <p className="text-xs font-semibold text-content-subtle">
            {allRowCount} kayıt içinden {rows.length} gösteriliyor.
          </p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table
          aria-label="İhale listesi tablosu"
          className="min-w-[1100px] w-full text-left text-sm text-content"
        >
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-subtle">
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
          <tbody className="divide-y divide-divider">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center" colSpan={7}>
                  <p className="font-semibold text-content">
                    Filtrelerle eşleşen ihale yok
                  </p>
                  <p className="mt-1 text-sm text-content-subtle">
                    Arama veya durum/son teklif filtrelerini değiştirin.
                  </p>
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr
                className={
                  row.id === highlightedRecordId
                    ? "bg-brand-primary-subtle ring-1 ring-inset ring-brand-primary"
                    : "hover:bg-surface-muted"
                }
                data-highlighted={
                  row.id === highlightedRecordId ? "true" : undefined
                }
                key={row.id}
              >
                <td className="px-4 py-3">
                  <span className="block font-mono text-xs font-semibold">
                    {row.tenderNo}
                  </span>
                  <span className="block font-mono text-xs text-content-subtle">
                    {row.ikn}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="block font-semibold">{row.title}</span>
                  <span className="text-xs text-content-subtle">
                    {row.procedure} usul
                  </span>
                  {row.convertedSiteCode ? (
                    <span className="mt-1 block font-mono text-xs font-semibold text-brand-primary">
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
                    <span className="mt-1 inline-flex rounded-ui-control bg-[var(--ds-danger)] px-2 py-0.5 text-xs font-semibold text-on-status">
                      Süre doldu
                    </span>
                  ) : isTenderDeadlineUpcoming(row, today) ? (
                    <span className="mt-1 inline-flex rounded-ui-control bg-[var(--ds-info)] px-2 py-0.5 text-xs font-semibold text-on-status">
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
                      className="h-8 rounded-ui-control border border-divider bg-surface-muted px-2 text-xs font-semibold text-content transition-colors hover:border-brand-primary"
                      onClick={() => onEditBoq(row)}
                      type="button"
                    >
                      BOQ
                    </button>
                    {row.status === "Kazanıldı" && !row.convertedSiteCode ? (
                      <button
                        aria-label={`Şantiye Aç ${row.tenderNo}`}
                        className="h-8 rounded-ui-control border border-brand-primary bg-brand-primary-subtle px-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-surface-selected"
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
      <span className="text-xs font-semibold text-content-subtle">
        Sonuçlandı
      </span>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {nextStatuses.map((nextStatus) => (
        <button
          className="h-8 rounded-ui-control border border-divider bg-surface-muted px-2 text-xs font-semibold text-content transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle"
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
    <aside className="grid gap-4 md:grid-cols-2">
      <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-ui-control bg-warning-subtle text-warning">
            <Icon name="calendar" size={18} />
          </span>
          <h2 className="text-lg font-semibold text-content">
            Yaklaşan son teklif
          </h2>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {summary.upcomingDeadlineRows.length === 0 ? (
            <p className="text-content-subtle">
              7 gün içinde son teklif tarihi yok.
            </p>
          ) : (
            summary.upcomingDeadlineRows.map((row) => (
              <div
                className="rounded-ui-control border border-divider bg-surface-muted p-3"
                key={row.id}
              >
                <p className="font-semibold">{row.tenderNo}</p>
                <p className="mt-1 text-content-subtle">{row.title}</p>
              </div>
            ))
          )}
        </div>
      </article>
      <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-ui-control bg-danger-subtle text-danger">
            <Icon name="warning" size={18} />
          </span>
          <h2 className="text-lg font-semibold text-content">Sonuç bekleyen</h2>
        </div>
        <p className="mt-3 text-sm text-content-subtle">
          Sunuldu durumunda olup süresi dolan ihaleler burada takip edilir.
        </p>
        <p className="mt-3 font-mono text-2xl font-semibold text-content">
          {summary.overdueOpenRows.length}
        </p>
      </article>
    </aside>
  );
}

function Metric({
  compact = false,
  icon,
  label,
  tone = "neutral",
  value,
}: {
  compact?: boolean;
  icon: IconName;
  label: string;
  tone?: "brand" | "neutral" | "success" | "warning";
  value: string;
}) {
  const toneClasses = {
    brand: "bg-brand-primary-subtle text-brand-primary",
    neutral: "bg-surface-muted text-content-subtle",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
  }[tone];

  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-subtle">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-control ${toneClasses}`}
        >
          <Icon name={icon} size={19} />
        </span>
      </div>
      <p
        className={
          "mt-5 font-mono font-semibold tabular-nums text-content " +
          (compact ? "text-lg leading-7" : "text-2xl")
        }
      >
        {value}
      </p>
    </article>
  );
}

function StatusBadge({ status }: { status: TenderStatus }) {
  return (
    <span
      className={`inline-flex rounded-ui-control border px-2 py-1 text-xs font-semibold ${statusClass[status]}`}
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

function buildTenderCsvHref(rows: TenderRow[]) {
  const headers = [
    "İhale No",
    "EKAP / İKN",
    "Başlık",
    "İhale Makamı",
    "Durum",
    "Son Teklif",
    "Yaklaşık Bedel",
    "Teklif Bedeli",
    "Sözleşme Bedeli",
  ];
  const csvRows = rows.map((row) => [
    row.tenderNo,
    row.ikn,
    row.title,
    row.authorityName,
    row.status,
    row.submissionDeadline,
    String(row.estimatedValue),
    String(row.bidValue),
    String(row.contractValue),
  ]);
  const csv = [headers, ...csvRows]
    .map((values) => values.map(escapeCsvValue).join(";"))
    .join("\r\n");

  return `data:text/csv;charset=utf-8,${encodeURIComponent(`\uFEFF${csv}`)}`;
}

function escapeCsvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
