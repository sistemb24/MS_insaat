"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Icon, StatusBadge, type IconName } from "@/components/ui";
import type { EntityDefinition, EntityDraft, EntityRow } from "@/lib/entities";
import {
  buildEntityImportErrorReportCsvFileName,
  buildEntityImportErrorReportCsvHref,
  buildEntityRowsCsvFileName,
  buildEntityRowsCsvHref,
} from "@/lib/entity-export";
import type { EntityImportPreview } from "@/lib/entity-import";
import {
  buildEntityImportTemplateXlsxFileName,
  buildEntityImportTemplateXlsxHref,
} from "@/lib/entity-xlsx-export";
import { previewEntityImportCsv } from "@/lib/entity-import";
import {
  previewEntityImportXlsx,
  inspectEntityImportXlsxWorkbook,
} from "@/lib/entity-xlsx-import";
import {
  createEditDraft,
  createEntityDraft,
  deactivateEntityRow,
  filterEntityRows,
  standardEntityActions,
} from "@/lib/entities";
import {
  buildTenantScopeKey,
  createScopedEntityRows,
  defaultTenantScope,
  getTenantScopeLabel,
  saveScopedEntityDraft,
  type TenantScope,
} from "@/lib/tenant-scope";
import type { OperationalReportCounterpartyStatementDetailRow } from "@/lib/reports-service";
import type {
  CashBankAccountOption,
  CashBankMovementRow,
  CashBankMovementServiceResult,
  CounterpartyCashBankMovementCreateValues,
} from "@/lib/cash-bank-movement-service";
import {
  buildCounterpartyStatementCsvFileName,
  buildCounterpartyStatementCsvHref,
} from "@/lib/report-export";

const maxXlsxImportFileSizeBytes = 15 * 1024 * 1024;

export type EntityListSurfaceProps = {
  definition: EntityDefinition;
  hideHeader?: boolean;
  initialRows?: EntityRow[];
  persistence?: EntityListPersistence;
  scope?: TenantScope;
  statementRows?: OperationalReportCounterpartyStatementDetailRow[];
  cashBankAccountOptions?: CashBankAccountOption[];
  visualVariant?:
    | "customer"
    | "site"
    | "subcontractor"
    | "supplier";
};

type EntityActionResult =
  | {
      ok: true;
      data: EntityRow;
    }
  | {
      ok: false;
      errors: string[];
    };

type EntityListActionResult =
  | {
      ok: true;
      data: {
        rows: EntityRow[];
      };
    }
  | {
      ok: false;
      errors: string[];
    };

export type EntityListPersistence = {
  createRow?: (slug: string, values: EntityRow) => Promise<EntityActionResult>;
  createRows?: (slug: string, rows: EntityRow[]) => Promise<EntityListActionResult>;
  updateRow?: (
    slug: string,
    code: string,
    values: EntityRow,
  ) => Promise<EntityActionResult>;
  deactivateRow?: (slug: string, code: string) => Promise<EntityActionResult>;
  listRows?: (slug: string) => Promise<EntityListActionResult>;
  createCounterpartyMovement?: (
    values: CounterpartyCashBankMovementCreateValues,
  ) => Promise<CashBankMovementServiceResult<CashBankMovementRow>>;
};

const buttonClass =
  "rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:border-brand-primary hover:bg-brand-primary-subtle disabled:cursor-not-allowed disabled:border-divider disabled:opacity-40";
const primaryButtonClass =
  "rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-1.5 text-sm font-semibold text-on-brand transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";
const demoSeedIso = "2026-06-24T00:00:00.000Z";

function getStatusClass(status: string) {
  if (status === "Pasif") {
    return "rounded-ui-control bg-[var(--ds-danger)] px-2 py-1 text-xs font-semibold text-on-status";
  }

  return "rounded-ui-control bg-[var(--ds-success)] px-2 py-1 text-xs font-semibold text-on-status";
}

function getEntityActionIcon(
  action: (typeof standardEntityActions)[number],
): IconName {
  if (action === "Yeni") return "plus";
  if (action === "Düzenle") return "receipt";
  if (action === "Pasifleştir") return "close";
  if (action === "Yenile") return "loader";
  if (action === "İçe Aktar") return "file";
  return "file";
}

function buildInitialXlsxHeaderMapping(
  definition: EntityDefinition,
  sourceHeaders: string[],
) {
  return definition.columns.reduce<Record<string, string>>((mapping, column) => {
    if (sourceHeaders.includes(column.label)) {
      mapping[column.label] = column.label;
    }

    return mapping;
  }, {});
}

function getSelectedXlsxHeaderValues(
  definition: EntityDefinition,
  mapping: Record<string, string>,
) {
  return definition.columns.map((column) => mapping[column.label] ?? "");
}

export function EntityListSurface({
  definition,
  hideHeader = false,
  initialRows,
  persistence,
  scope = defaultTenantScope,
  statementRows = [],
  cashBankAccountOptions = [],
  visualVariant,
}: EntityListSurfaceProps) {
  const isSupplierVariant = visualVariant === "supplier";
  const isSubcontractorVariant = visualVariant === "subcontractor";
  const isSiteVariant = visualVariant === "site";
  const isTemplateVariant =
    visualVariant === "customer" ||
    isSiteVariant ||
    isSupplierVariant ||
    isSubcontractorVariant;
  const counterpartySingularLabel = isSiteVariant
    ? "Şantiye"
    : isSubcontractorVariant
    ? "Taşeron"
    : isSupplierVariant
      ? "Tedarikçi"
      : "Müşteri";
  const entityTableLabel = isSiteVariant
    ? "Şantiye proje kartları tablosu"
    : `${counterpartySingularLabel} cari kartları tablosu`;
  const [rows, setRows] = useState<EntityRow[]>(() =>
    initialRows
      ? initialRows.map((row) => ({ ...row }))
      : createScopedEntityRows({
          definition,
          scope,
          nowIso: demoSeedIso,
        }),
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Aktif" | "Pasif" | "Tümü">(
    "Tümü",
  );
  const [categoryFilter, setCategoryFilter] = useState("Tümü");
  const [contractFilter, setContractFilter] = useState<
    "Sözleşmeli" | "Sözleşmesiz" | "Tümü"
  >("Tümü");
  const [selectedCode, setSelectedCode] = useState<string | undefined>(
    initialRows ? initialRows[0]?.code : definition.sampleRows[0]?.code,
  );
  const [draft, setDraft] = useState<EntityDraft | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | undefined>();
  const editorFormRef = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState(
    "Liste hazır. İşlem için kayıt seçebilir veya yeni kayıt açabilirsiniz.",
  );

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");
  const [importPreview, setImportPreview] = useState<
    EntityImportPreview | undefined
  >();
  const [importResult, setImportResult] = useState<
    | {
        errorReportFileName?: string;
        errorReportHref?: string;
        importedCount: number;
        skippedCount: number;
      }
    | undefined
  >();
  const [xlsxImportState, setXlsxImportState] = useState<
    | {
        error?: string;
        fileErrors?: string[];
        fileName?: string;
        invalidRows?: number;
        sheetName?: string;
        totalRows?: number;
        validRows?: number;
      }
    | undefined
  >();
  const [xlsxImportWorkbookData, setXlsxImportWorkbookData] = useState<
    ArrayBuffer | undefined
  >();
  const [xlsxImportSourceHeaders, setXlsxImportSourceHeaders] = useState<
    string[]
  >([]);
  const [xlsxImportSheetNames, setXlsxImportSheetNames] = useState<string[]>([]);
  const [xlsxImportSheetName, setXlsxImportSheetName] = useState("");
  const [xlsxImportHeaderMapping, setXlsxImportHeaderMapping] = useState<
    Record<string, string>
  >({});
  const isEditorOpen = Boolean(draft);
  const editorFocusKey = draft
    ? `${draft.mode}:${draft.originalCode ?? "new"}`
    : "closed";

  useEffect(() => {
    if (!isEditorOpen || !editorFormRef.current) {
      return;
    }

    editorFormRef.current.scrollIntoView?.({
      behavior: "smooth",
      block: "center",
    });
    editorFormRef.current
      .querySelector<HTMLElement>("input, select, textarea")
      ?.focus();
  }, [editorFocusKey, isEditorOpen]);

  const displayRows = useMemo(
    () => applyStatementBalances(definition, rows, statementRows),
    [definition, rows, statementRows],
  );
  const [counterpartyMovementType, setCounterpartyMovementType] = useState<"Tahsilat" | "Ödeme">("Tahsilat");
  const [counterpartyMovementAmount, setCounterpartyMovementAmount] = useState("");
  const [counterpartyMovementDate, setCounterpartyMovementDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [counterpartyMovementDocumentNo, setCounterpartyMovementDocumentNo] = useState("");
  const [counterpartyMovementDescription, setCounterpartyMovementDescription] = useState("");
  const [counterpartyMovementAccountCode, setCounterpartyMovementAccountCode] = useState(cashBankAccountOptions[0]?.code ?? "");
  const [counterpartyMovementPending, setCounterpartyMovementPending] = useState(false);

  const filteredRows = useMemo(
    () =>
      filterEntityRows(definition, displayRows, query).filter(
        (row) =>
          (!isTemplateVariant ||
            statusFilter === "Tümü" ||
            row.status === statusFilter) &&
          (!isSupplierVariant ||
            categoryFilter === "Tümü" ||
            row.category === categoryFilter) &&
          (!isSubcontractorVariant ||
            contractFilter === "Tümü" ||
            (contractFilter === "Sözleşmeli"
              ? Boolean(row.contractNo?.trim())
              : !row.contractNo?.trim())),
      ),
    [
      categoryFilter,
      contractFilter,
      definition,
      displayRows,
      isTemplateVariant,
      isSubcontractorVariant,
      isSupplierVariant,
      query,
      statusFilter,
    ],
  );
  const supplierCategories = useMemo(
    () =>
      [...new Set(displayRows.map((row) => row.category).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, "tr-TR"),
      ),
    [displayRows],
  );

  const selectedRow = displayRows.find((row) => row.code === selectedCode);
  const counterpartySlug = ["musteriler", "tedarikciler", "taseronlar"].includes(definition.slug)
    ? (definition.slug as CounterpartyCashBankMovementCreateValues["counterpartySlug"])
    : undefined;
  const showCounterpartyMovementPanel = Boolean(
    selectedRow && persistence?.createCounterpartyMovement && counterpartySlug,
  );
  const selectedStatementRows = statementRows.filter(
    (row) => selectedRow && row.counterpartyName === selectedRow.name,
  );
  const selectedStatementCsvHref =
    buildCounterpartyStatementCsvHref(selectedStatementRows);
  const selectedStatementCsvFileName = buildCounterpartyStatementCsvFileName(
    selectedRow?.name ?? "tum-cariler",
  );
  const counterpartyControlClass = isTemplateVariant
    ? "mt-1 h-10 w-full rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-normal text-content outline-none focus:border-brand-primary focus:bg-surface-raised"
    : "mt-1 h-9 w-full rounded border border-divider bg-surface-raised px-2 text-sm";
  const entityRowsCsvHref = buildEntityRowsCsvHref(definition, filteredRows);
  const entityRowsCsvFileName = buildEntityRowsCsvFileName(definition);
  const entityTemplateXlsxHref = buildEntityImportTemplateXlsxHref(definition);
  const entityTemplateXlsxFileName =
    buildEntityImportTemplateXlsxFileName(definition);

  function startCreate() {
    setDraft(createEntityDraft(definition, rows));
    setErrors([]);
    setServerErrors([]);
    setNotice("Yeni kayıt formu açıldı.");
  }

  function startEdit() {
    if (!selectedRow) {
      setNotice("Düzenlemek için listeden kayıt seçin.");
      return;
    }

    setDraft(createEditDraft(selectedRow));
    setErrors([]);
    setServerErrors([]);
    setNotice(`${selectedRow.code} düzenleniyor.`);
  }

  async function deactivateSelectedRow() {
    if (!selectedRow) {
      setNotice("Pasifleştirmek için listeden kayıt seçin.");
      return;
    }

    if (persistence?.deactivateRow) {
      const result = await runPersistedAction(
        "Pasifleştir",
        () => persistence.deactivateRow!(definition.slug, selectedRow.code),
      );

      if (!result.ok) {
        setServerErrors(result.errors);
        setNotice("Sunucu işlemi tamamlanamadı.");
        return;
      }

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.code === result.data.code ? result.data : row,
        ),
      );
      setDraft(undefined);
      setErrors([]);
      setServerErrors([]);
      setNotice(`${selectedRow.code} pasifleştirildi.`);
      return;
    }

    setRows((currentRows) => deactivateEntityRow(currentRows, selectedRow.code));
    setDraft(undefined);
    setErrors([]);
    setServerErrors([]);
    setNotice(`${selectedRow.code} pasifleştirildi.`);
  }

  async function resetRows() {
    if (persistence?.listRows) {
      setIsSaving(true);
      setPendingAction("Yenile");
      const result = await persistence.listRows(definition.slug);
      setIsSaving(false);
      setPendingAction(undefined);

      if (!result.ok) {
        setServerErrors(result.errors);
        setNotice("Sunucu işlemi tamamlanamadı.");
        return;
      }

      setRows(result.data.rows);
      setSelectedCode(result.data.rows[0]?.code);
      setQuery("");
      setDraft(undefined);
      setErrors([]);
      setServerErrors([]);
      setNotice("Liste kalıcı kaynaktan yenilendi.");
      return;
    }

    const freshRows = createScopedEntityRows({
      definition,
      scope,
      nowIso: demoSeedIso,
    });

    setRows(freshRows);
    setSelectedCode(freshRows[0]?.code);
    setQuery("");
    setDraft(undefined);
    setErrors([]);
    setServerErrors([]);
    setNotice("Liste kaynak örnek kayıtlarına yenilendi.");
  }

  function startImport() {
    setIsImportOpen(true);
    setDraft(undefined);
    setErrors([]);
    setServerErrors([]);
    setImportPreview(undefined);
    setXlsxImportState(undefined);
    setXlsxImportWorkbookData(undefined);
    setXlsxImportSourceHeaders([]);
    setXlsxImportSheetNames([]);
    setXlsxImportSheetName("");
    setXlsxImportHeaderMapping({});
    setNotice("CSV içe aktarım paneli açıldı.");
  }

  async function submitCounterpartyMovement() {
    if (!selectedRow || !counterpartySlug || !persistence?.createCounterpartyMovement) return;
    const account = cashBankAccountOptions.find((option) => option.code === counterpartyMovementAccountCode);
    const amount = Number(counterpartyMovementAmount);
    if (!account || !counterpartyMovementDate || !counterpartyMovementDocumentNo.trim() || !Number.isFinite(amount) || amount <= 0) {
      setServerErrors(["Hesap, tarih, evrak numarası ve sıfırdan büyük tutar zorunludur."]);
      return;
    }
    setCounterpartyMovementPending(true);
    setServerErrors([]);
    const result = await persistence.createCounterpartyMovement({
      accountCode: account.code, amount, counterpartyCode: selectedRow.code,
      counterpartySlug, description: counterpartyMovementDescription,
      documentNo: counterpartyMovementDocumentNo, movementDate: counterpartyMovementDate,
      movementType: counterpartyMovementType,
    });
    setCounterpartyMovementPending(false);
    if (!result.ok) { setServerErrors(result.errors); return; }
    setNotice(`${selectedRow.name} için ${counterpartyMovementType.toLowerCase()} hareketi oluşturuldu.`);
    setCounterpartyMovementAmount(""); setCounterpartyMovementDocumentNo(""); setCounterpartyMovementDescription("");
  }

  async function handleImportFileChange(file: File | undefined) {
    if (!file) {
      return;
    }

    const fileText = await file.text();

    setImportCsvText(fileText);
    setImportPreview(undefined);
    setImportResult(undefined);
    setNotice(`${file.name} içe aktarım alanına yüklendi.`);
  }
  async function handleXlsxImportFileChange(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.name.toLocaleLowerCase("tr-TR").endsWith(".xlsx")) {
      setXlsxImportState({ error: "Yalnızca .xlsx dosyası seçin." });
      setXlsxImportWorkbookData(undefined);
      setXlsxImportSourceHeaders([]);
      setXlsxImportSheetNames([]);
      setXlsxImportSheetName("");
      setXlsxImportHeaderMapping({});
      setImportPreview(undefined);
      setImportResult(undefined);
      setNotice("XLSX dosyası seçimi tamamlanamadı.");
      return;
    }

    if (file.size > maxXlsxImportFileSizeBytes) {
      setXlsxImportState({ error: "XLSX dosyası 15 MB sınırını aşamaz." });
      setXlsxImportWorkbookData(undefined);
      setXlsxImportSourceHeaders([]);
      setXlsxImportSheetNames([]);
      setXlsxImportSheetName("");
      setXlsxImportHeaderMapping({});
      setImportPreview(undefined);
      setImportResult(undefined);
      setNotice("XLSX dosyası boyut sınırını aşıyor.");
      return;
    }

    try {
      const workbookData = await file.arrayBuffer();
      const inspection = inspectEntityImportXlsxWorkbook(workbookData);
      const sheetName = inspection.sheetNames[0] ?? "";
      const preview = previewEntityImportXlsx(
        definition,
        rows,
        workbookData,
        undefined,
        sheetName,
      );

      setImportCsvText("");
      setXlsxImportWorkbookData(workbookData);
      setXlsxImportSourceHeaders(inspection.headers);
      setXlsxImportSheetNames(inspection.sheetNames);
      setXlsxImportSheetName(sheetName);
      setXlsxImportHeaderMapping(
        buildInitialXlsxHeaderMapping(definition, inspection.headers),
      );
      setImportPreview(preview);
      setImportResult(undefined);
      setXlsxImportState({
        fileErrors: inspection.fileErrors.length
          ? inspection.fileErrors
          : preview.fileErrors,
        fileName: file.name,
        invalidRows: preview.summary.invalidRows,
        sheetName,
        totalRows: preview.summary.totalRows,
        validRows: preview.summary.validRows,
      });

      if (inspection.fileErrors.length > 0) {
        setNotice("XLSX dosyası okunamadı.");
        return;
      }

      if (preview.fileErrors.length > 0) {
        setNotice("XLSX şablon başlıkları kontrol edilmeli.");
        return;
      }

      setNotice(
        `${file.name} XLSX önizlemesi hazır: ${preview.summary.validRows} geçerli, ${preview.summary.invalidRows} hatalı.`,
      );
    } catch {
      setXlsxImportState({ error: "XLSX dosyası okunamadı." });
      setXlsxImportWorkbookData(undefined);
      setXlsxImportSourceHeaders([]);
      setXlsxImportSheetNames([]);
      setXlsxImportSheetName("");
      setXlsxImportHeaderMapping({});
      setImportPreview(undefined);
      setImportResult(undefined);
      setNotice("XLSX dosyası okunamadı.");
    }
  }

  function applyXlsxHeaderMapping() {
    if (!xlsxImportWorkbookData) {
      setNotice("Önce XLSX dosyası seçin.");
      return;
    }

    const selectedHeaderValues = getSelectedXlsxHeaderValues(
      definition,
      xlsxImportHeaderMapping,
    );

    if (selectedHeaderValues.some((header) => !header)) {
      setNotice("Tüm hedef kolonlar için kaynak başlığı seçin.");
      return;
    }

    if (new Set(selectedHeaderValues).size !== selectedHeaderValues.length) {
      setNotice("Aynı kaynak başlığı birden fazla hedefe bağlanamaz.");
      return;
    }

    const preview = previewEntityImportXlsx(
      definition,
      rows,
      xlsxImportWorkbookData,
      xlsxImportHeaderMapping,
      xlsxImportSheetName,
    );

    setImportPreview(preview);
    setImportResult(undefined);
    setXlsxImportState((currentState) =>
      currentState
        ? {
            ...currentState,
            fileErrors: preview.fileErrors,
            invalidRows: preview.summary.invalidRows,
            totalRows: preview.summary.totalRows,
            validRows: preview.summary.validRows,
          }
        : currentState,
    );

    if (preview.fileErrors.length > 0) {
      setNotice("XLSX şablon başlıkları kontrol edilmeli.");
      return;
    }

    setNotice("XLSX başlık eşlemesi uygulandı.");
  }

  function selectXlsxImportSheet(sheetName: string) {
    if (!xlsxImportWorkbookData) {
      return;
    }

    const inspection = inspectEntityImportXlsxWorkbook(xlsxImportWorkbookData, sheetName);
    const headerMapping = buildInitialXlsxHeaderMapping(definition, inspection.headers);
    const preview = previewEntityImportXlsx(
      definition,
      rows,
      xlsxImportWorkbookData,
      undefined,
      sheetName,
    );

    setXlsxImportSheetName(sheetName);
    setXlsxImportSourceHeaders(inspection.headers);
    setXlsxImportHeaderMapping(headerMapping);
    setImportPreview(preview);
    setImportResult(undefined);
    setXlsxImportState((currentState) =>
      currentState
        ? {
            ...currentState,
            fileErrors: inspection.fileErrors.length ? inspection.fileErrors : preview.fileErrors,
            invalidRows: preview.summary.invalidRows,
            sheetName,
            totalRows: preview.summary.totalRows,
            validRows: preview.summary.validRows,
          }
        : currentState,
    );
    setNotice(`${sheetName} çalışma sayfası için XLSX önizlemesi hazır.`);
  }

  function previewImportRows() {
    const preview = previewEntityImportCsv(definition, rows, importCsvText);

    setImportPreview(preview);
    setImportResult(undefined);

    if (preview.fileErrors.length > 0) {
      setNotice("İçe aktarım şablonu düzeltilmeli.");
      return;
    }

    setNotice(
      `Önizleme hazır: ${preview.summary.validRows} geçerli, ${preview.summary.invalidRows} hatalı.`,
    );
  }

  function createImportResult(importedCount: number, preview: EntityImportPreview) {
    const baseResult = {
      importedCount,
      skippedCount: preview.summary.invalidRows,
    };

    if (preview.summary.invalidRows === 0) {
      return baseResult;
    }

    return {
      ...baseResult,
      errorReportFileName: buildEntityImportErrorReportCsvFileName(definition),
      errorReportHref: buildEntityImportErrorReportCsvHref(preview),
    };
  }
  async function applyImportRows() {
    if (!importPreview || importPreview.validRows.length === 0) {
      setNotice("Uygulanacak geçerli içe aktarım satırı yok.");
      return;
    }

    if (persistence?.createRows) {
      setIsSaving(true);
      setPendingAction("İçe Aktar");

      try {
        const result = await persistence.createRows(
          definition.slug,
          importPreview.validRows,
        );

        if (!result.ok) {
          setServerErrors(result.errors);
          setNotice("Bazı içe aktarım satırları kaydedilemedi.");
          return;
        }

        setRows((currentRows) => result.data.rows.reduce(upsertRow, currentRows));
        setSelectedCode(result.data.rows[0]?.code);
        setImportPreview(undefined);
        setImportCsvText("");
        setIsImportOpen(false);
        setErrors([]);
        setServerErrors([]);
        setImportResult(createImportResult(result.data.rows.length, importPreview));
        setNotice(
          `${result.data.rows.length} geçerli kayıt kalıcı kaynağa eklendi.`,
        );
        return;
      } finally {
        setIsSaving(false);
        setPendingAction(undefined);
      }
    }
    if (persistence?.createRow) {
      setIsSaving(true);
      setPendingAction("İçe Aktar");

      try {
        const persistedRows: EntityRow[] = [];
        const importErrors: string[] = [];

        for (const validRow of importPreview.validRows) {
          const result = await persistence.createRow(definition.slug, validRow);

          if (result.ok) {
            persistedRows.push(result.data);
          } else {
            importErrors.push(...result.errors);
          }
        }

        if (persistedRows.length > 0) {
          setRows((currentRows) =>
            persistedRows.reduce(upsertRow, currentRows),
          );
          setSelectedCode(persistedRows[0]?.code);
        }

        if (importErrors.length > 0) {
          setServerErrors(importErrors);
          setNotice("Bazı içe aktarım satırları kaydedilemedi.");
          return;
        }

        setImportPreview(undefined);
        setImportCsvText("");
        setIsImportOpen(false);
        setErrors([]);
        setServerErrors([]);
        setImportResult(createImportResult(persistedRows.length, importPreview));
        setNotice(
          `${persistedRows.length} geçerli kayıt kalıcı kaynağa eklendi.`,
        );
        return;
      } finally {
        setIsSaving(false);
        setPendingAction(undefined);
      }
    }

    setRows((currentRows) => [...currentRows, ...importPreview.validRows]);
    setSelectedCode(importPreview.validRows[0]?.code);
    setImportPreview(undefined);
    setImportCsvText("");
    setIsImportOpen(false);
    setErrors([]);
    setServerErrors([]);
    setImportResult(createImportResult(importPreview.validRows.length, importPreview));
    setNotice(`${importPreview.validRows.length} geçerli kayıt listeye eklendi.`);
  }
  function handleAction(action: (typeof standardEntityActions)[number]) {
    if (action === "İçe Aktar") {
      startImport();
      return;
    }
    if (action === "Yeni") {
      startCreate();
      return;
    }

    if (action === "Düzenle") {
      startEdit();
      return;
    }

    if (action === "Pasifleştir") {
      void deactivateSelectedRow();
      return;
    }

    if (action === "Yenile") {
      void resetRows();
      return;
    }

    if (action === "Yazdır") {
      setNotice(`Yazdırma kapsamı hazır: ${filteredRows.length} kayıt.`);
      window.print();
      return;
    }

    setNotice(`${action} davranışı sonraki entegrasyon diliminde bağlanacak.`);
  }

  function updateDraftValue(key: string, value: string) {
    setDraft((currentDraft) =>
      currentDraft
        ? {
            ...currentDraft,
            values: {
              ...currentDraft.values,
              [key]: value,
            },
          }
        : currentDraft,
    );
  }

  async function runPersistedAction(
    label: string,
    action: () => Promise<EntityActionResult>,
  ) {
    setIsSaving(true);
    setPendingAction(label);

    try {
      return await action();
    } finally {
      setIsSaving(false);
      setPendingAction(undefined);
    }
  }

  async function saveDraft() {
    if (!draft) {
      return;
    }

    if (persistence?.createRow || persistence?.updateRow) {
      const result =
        draft.mode === "create" && persistence.createRow
          ? await runPersistedAction("Kaydet", () =>
              persistence.createRow!(definition.slug, draft.values),
            )
          : draft.mode === "edit" && persistence.updateRow
            ? await runPersistedAction("Kaydet", () =>
                persistence.updateRow!(
                  definition.slug,
                  draft.originalCode ?? draft.values.code,
                  draft.values,
                ),
              )
            : undefined;

      if (result) {
        if (!result.ok) {
          setServerErrors(result.errors);
          setNotice("Sunucu işlemi tamamlanamadı.");
          return;
        }

        setRows((currentRows) => upsertRow(currentRows, result.data));
        setSelectedCode(result.data.code);
        setDraft(undefined);
        setErrors([]);
        setServerErrors([]);
        setNotice(`${result.data.code} kaydedildi.`);
        return;
      }
    }

    const result = saveScopedEntityDraft({
      definition,
      scope,
      rows,
      draft,
      nowIso: new Date().toISOString(),
    });

    if (result.errors.length > 0) {
      setErrors(result.errors);
      setServerErrors([]);
      setNotice("Kayıt tamamlanmadan önce zorunlu alanlar düzeltilmeli.");
      return;
    }

    setRows(result.rows);
    setSelectedCode(draft.values.code);
    setDraft(undefined);
    setErrors([]);
    setServerErrors([]);
    setNotice(`${draft.values.code} kaydedildi.`);
  }

  return (
    <section
      className={
        isTemplateVariant
          ? "flex min-w-0 flex-col gap-5"
          : "mx-auto flex max-w-7xl flex-col gap-4"
      }
    >
      {!isTemplateVariant && !hideHeader ? (
        <header className="rounded-ui-panel border border-divider bg-surface-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
            Tanımlar standardı · {definition.codePrefix}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            {definition.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
            {definition.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-content-subtle">
            <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1">
              {getTenantScopeLabel(scope)}
            </span>
            <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 font-mono">
              {buildTenantScopeKey(scope)}
            </span>
          </div>
        </header>
      ) : null}

      <div
        className={
          isTemplateVariant
            ? "overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm"
            : "flex flex-wrap items-center justify-between gap-3 rounded-ui-panel border border-divider bg-surface-raised p-2"
        }
      >
        <div
          className={
            isTemplateVariant
              ? "flex flex-wrap items-center justify-between gap-3 border-b border-divider px-4 py-3"
              : "flex flex-wrap gap-2"
          }
        >
          <div className="flex flex-wrap gap-2">
            {standardEntityActions.map((action) =>
              action === "Şablon" || action === "Excel" ? (
                <a
                  className={
                    isTemplateVariant
                      ? "inline-flex min-h-9 items-center justify-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content transition-colors hover:border-outline-strong hover:bg-surface-muted"
                      : buttonClass
                  }
                  download={
                    action === "Şablon"
                      ? entityTemplateXlsxFileName
                      : entityRowsCsvFileName
                  }
                  href={
                    action === "Şablon"
                      ? entityTemplateXlsxHref
                      : entityRowsCsvHref
                  }
                  key={action}
                >
                  {isTemplateVariant ? <Icon name="file" size={16} /> : null}
                  {action}
                </a>
              ) : (
                <button
                  className={
                    isTemplateVariant
                      ? action === "Yeni"
                        ? "inline-flex min-h-9 items-center justify-center gap-2 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-40"
                        : "inline-flex min-h-9 items-center justify-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content transition-colors hover:border-outline-strong hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                      : action === "Yeni"
                        ? primaryButtonClass
                        : buttonClass
                  }
                  disabled={
                    isSaving ||
                    ((action === "Düzenle" || action === "Pasifleştir") &&
                      !selectedRow)
                  }
                  key={action}
                  onClick={() => handleAction(action)}
                  type="button"
                >
                  {isTemplateVariant ? (
                    <Icon name={getEntityActionIcon(action)} size={16} />
                  ) : null}
                  {isTemplateVariant && action === "Yeni"
                    ? `Yeni ${counterpartySingularLabel}`
                    : action}
                </button>
              ),
            )}
          </div>
          {isTemplateVariant ? (
            <div className="flex flex-wrap gap-2 text-xs text-content-subtle">
              <span className="rounded-ui-control bg-surface-muted px-2 py-1">
                {getTenantScopeLabel(scope)}
              </span>
              <span className="rounded-ui-control bg-surface-muted px-2 py-1 font-mono">
                {buildTenantScopeKey(scope)}
              </span>
            </div>
          ) : (
            <label className="min-w-60 text-sm">
              <span className="sr-only">Arama</span>
              <input
                className="w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Kod, tanım veya yetkili ara"
                type="search"
                value={query}
              />
            </label>
          )}
        </div>

        {isTemplateVariant ? (
          <div className="flex flex-col gap-3 bg-surface-raised px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {isSupplierVariant ? (
                <label className="relative">
                  <span className="sr-only">Tedarikçi kategorisi</span>
                  <select
                    className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 pr-8 text-sm font-semibold text-content outline-none focus:border-brand-primary"
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    value={categoryFilter}
                  >
                    <option value="Tümü">Tüm Kategoriler</option>
                    {supplierCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {isSubcontractorVariant ? (
                <label className="relative">
                  <span className="sr-only">Taşeron sözleşme filtresi</span>
                  <select
                    className="h-10 rounded-ui-control border border-divider bg-surface-muted px-3 pr-8 text-sm font-semibold text-content outline-none focus:border-brand-primary"
                    onChange={(event) =>
                      setContractFilter(
                        event.target.value as "Sözleşmeli" | "Sözleşmesiz" | "Tümü",
                      )
                    }
                    value={contractFilter}
                  >
                    <option value="Tümü">Tüm Sözleşmeler</option>
                    <option value="Sözleşmeli">Sözleşmeli</option>
                    <option value="Sözleşmesiz">Sözleşmesiz</option>
                  </select>
                </label>
              ) : null}
              <div
                aria-label={`${counterpartySingularLabel} durum filtresi`}
                className="inline-flex overflow-hidden rounded-ui-control border border-divider bg-surface-muted"
                role="group"
              >
                {(["Tümü", "Aktif", "Pasif"] as const).map((status) => {
                  const count =
                    status === "Tümü"
                      ? displayRows.length
                      : displayRows.filter((row) => row.status === status).length;

                  return (
                    <button
                      aria-pressed={statusFilter === status}
                      className={
                        "inline-flex min-h-9 items-center gap-2 px-3 text-sm font-semibold transition-colors " +
                        (statusFilter === status
                          ? "bg-brand-primary text-on-brand"
                          : "text-content-subtle hover:bg-brand-primary-subtle hover:text-content")
                      }
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      type="button"
                    >
                      {status}
                      <span
                        className={
                          "rounded-full px-1.5 py-0.5 font-mono text-[10px] " +
                          (statusFilter === status
                            ? "bg-surface-raised/20 text-on-brand"
                            : "bg-surface-selected text-content-subtle")
                        }
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="relative w-full sm:w-80">
              <span className="sr-only">{counterpartySingularLabel} ara</span>
              <Icon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
                name="search"
                size={17}
              />
              <input
                className="h-10 w-full rounded-ui-control border border-divider bg-surface-muted pl-9 pr-3 text-sm text-content outline-none transition-colors placeholder:text-content-muted focus:border-brand-primary focus:bg-surface-raised"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Kod, tanım veya yetkili ara"
                type="search"
                value={query}
              />
            </label>
          </div>
        ) : null}
      </div>

      <p
        className={
          isTemplateVariant
            ? "rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm text-content-subtle"
            : "rounded-ui-panel border border-divider bg-surface-muted px-3 py-2 text-sm text-content-subtle"
        }
        role="status"
      >
        {notice}
      </p>

      {importResult ? (
        <section className="rounded-ui-panel border border-[var(--ds-success)] bg-surface-raised px-3 py-2 text-sm">
          <h2 className="font-semibold text-[var(--ds-success)]">
            İçe aktarım sonucu
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-content-subtle">
            <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1">
              Eklenen kayıt: {importResult.importedCount}
            </span>
            <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1">
              Atlanan hatalı satır: {importResult.skippedCount}
            </span>
            {importResult.errorReportHref && importResult.errorReportFileName ? (
              <a
                className={buttonClass}
                download={importResult.errorReportFileName}
                href={importResult.errorReportHref}
              >
                Hata raporu CSV indir
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
      {isSaving && pendingAction ? (
        <div
          className="rounded-ui-panel border border-brand-primary bg-brand-primary-subtle px-3 py-2 text-sm font-semibold text-brand-primary"
          role="status"
        >
          Sunucu işlemi sürüyor: {pendingAction}
        </div>
      ) : null}

      {serverErrors.length > 0 ? (
        <div
          className="rounded-ui-panel border border-[var(--ds-danger)] bg-danger-subtle px-3 py-2 text-sm text-[var(--ds-danger)]"
          role="alert"
        >
          <p className="font-semibold">Sunucu işlemi tamamlanamadı</p>
          <ul className="mt-1">
            {serverErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft ? (
        <form
          aria-label={isTemplateVariant ? `${counterpartySingularLabel} kayıt paneli` : undefined}
          className={
            isTemplateVariant
              ? "rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5"
              : "rounded-ui-panel border border-divider bg-surface-raised p-4"
          }
          onSubmit={(event) => {
            event.preventDefault();
            void saveDraft();
          }}
          ref={editorFormRef}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={isTemplateVariant ? "text-xl font-semibold" : "text-base font-semibold"}>
              {isTemplateVariant
                ? draft.mode === "create"
                  ? `Yeni ${counterpartySingularLabel}`
                  : `${counterpartySingularLabel} Düzenle`
                : draft.mode === "create"
                  ? "Yeni Kayıt"
                  : "Kayıt Düzenle"}
            </h2>
            <div className="flex gap-2">
              <button
                className={
                  isTemplateVariant
                    ? "min-h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand hover:bg-brand-primary-strong disabled:opacity-40"
                    : primaryButtonClass
                }
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Kaydediliyor" : "Kaydet"}
              </button>
              <button
                className={buttonClass}
                onClick={() => {
                  setDraft(undefined);
                  setErrors([]);
                  setServerErrors([]);
                  setNotice("Form kapatıldı.");
                }}
                type="button"
              >
                Vazgeç
              </button>
            </div>
          </div>

          {errors.length > 0 ? (
            <ul className="mt-3 rounded-ui-control border border-[var(--ds-danger)] bg-danger-subtle px-3 py-2 text-sm text-[var(--ds-danger)]">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {definition.columns.map((column) => (
              <label className="text-sm font-medium" key={column.key}>
                <span>{column.label}</span>
                {column.key === "status" ? (
                  <select
                    className="mt-1 w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-2 font-normal outline-none"
                    onChange={(event) =>
                      updateDraftValue(column.key, event.target.value)
                    }
                    value={draft.values[column.key] ?? "Aktif"}
                  >
                    <option>Aktif</option>
                    <option>Pasif</option>
                  </select>
                ) : (
                  <input
                    className="mt-1 w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-2 font-normal outline-none"
                    onChange={(event) =>
                      updateDraftValue(column.key, event.target.value)
                    }
                    value={draft.values[column.key] ?? ""}
                  />
                )}
              </label>
            ))}
          </div>
        </form>
      ) : null}

      {isImportOpen ? (
        <section
          aria-label={isTemplateVariant ? `${counterpartySingularLabel} içe aktarım paneli` : undefined}
          className={
            isTemplateVariant
              ? "rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5"
              : "rounded-ui-panel border border-divider bg-surface-raised p-4"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">CSV İçe Aktar</h2>
            <div className="flex gap-2">
              <button
                className={buttonClass}
                onClick={previewImportRows}
                type="button"
              >
                Önizle
              </button>
              <button
                className={buttonClass}
                disabled={!importPreview || importPreview.validRows.length === 0}
                onClick={() => {
                  void applyImportRows();
                }}
                type="button"
              >
                Geçerli Satırları Uygula
              </button>
              <button
                className={
                  isTemplateVariant
                    ? "min-h-10 rounded-ui-control border border-divider bg-surface-raised px-4 text-sm font-semibold text-content hover:bg-surface-muted"
                    : buttonClass
                }
                onClick={() => {
                  setIsImportOpen(false);
                  setXlsxImportState(undefined);
                  setXlsxImportWorkbookData(undefined);
                  setXlsxImportSourceHeaders([]);
                  setXlsxImportSheetNames([]);
                  setXlsxImportSheetName("");
                  setXlsxImportHeaderMapping({});
                  setImportPreview(undefined);
                  setNotice("İçe aktarım paneli kapatıldı.");
                }}
                type="button"
              >
                Vazgeç
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-ui-control border border-divider bg-surface-muted px-3 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">XLSX içe aktar sihirbazı</h3>
                <p className="mt-1 text-content-subtle">
                  Excel şablonu, kolon eşleme ve kalıcı import adımları için hazırlık alanı.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-content-subtle">
                <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
                  1. Şablon
                </span>
                <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
                  2. Ön kontrol
                </span>
                <span className="rounded-ui-control border border-divider bg-surface-raised px-2 py-1">
                  3. Sonuç
                </span>
              </div>
            </div>
            <label className="mt-3 block font-medium">
              <span>XLSX dosyası seç</span>
              <input
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="mt-1 block w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm file:mr-3 file:rounded-ui-control file:border-0 file:bg-brand-primary-subtle file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-primary"
                onChange={(event) => {
                  void handleXlsxImportFileChange(event.target.files?.[0]);
                }}
                type="file"
              />
            </label>
            <div
              aria-label="XLSX dosyasını sürükle bırak"
              className="mt-3 rounded-ui-control border border-dashed border-divider bg-surface-raised px-3 py-5 text-center text-sm text-content-subtle transition hover:border-brand-primary hover:bg-brand-primary-subtle"
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                void handleXlsxImportFileChange(event.dataTransfer.files?.[0]);
              }}
              role="button"
              tabIndex={0}
            >
              XLSX dosyasını buraya bırak
            </div>
            {xlsxImportState?.fileName ? (
              <p className="mt-3 rounded-ui-control border border-[var(--ds-success)] bg-surface-raised px-2 py-1 text-[var(--ds-success)]">
                Dosya ön kontrolü hazır: {xlsxImportState.fileName}
              </p>
            ) : null}
            {typeof xlsxImportState?.validRows === "number" ? (
              <p className="mt-2 rounded-ui-control border border-divider bg-surface-raised px-2 py-1 text-content-subtle">
                XLSX önizleme: {xlsxImportState.validRows} geçerli,{" "}
                {xlsxImportState.invalidRows} hatalı.
              </p>
            ) : null}
            {xlsxImportState?.fileErrors?.length ? (
              <ul className="mt-2 rounded-ui-control border border-[var(--ds-danger)] bg-danger-subtle px-2 py-1 text-[var(--ds-danger)]">
                {xlsxImportState.fileErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}
            {xlsxImportState?.error ? (
              <p className="mt-3 rounded-ui-control border border-[var(--ds-danger)] bg-danger-subtle px-2 py-1 text-[var(--ds-danger)]">
                {xlsxImportState.error}
              </p>
            ) : null}
            {xlsxImportSheetNames.length > 1 ? (
              <label className="mt-3 block font-medium">
                <span>Çalışma sayfası</span>
                <select
                  aria-label="XLSX çalışma sayfası"
                  className="mt-1 block w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm outline-none"
                  onChange={(event) => selectXlsxImportSheet(event.target.value)}
                  value={xlsxImportSheetName}
                >
                  {xlsxImportSheetNames.map((sheetName) => (
                    <option key={sheetName} value={sheetName}>
                      {sheetName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {xlsxImportState?.fileErrors?.length &&
            xlsxImportWorkbookData &&
            xlsxImportSourceHeaders.length > 0 ? (
              <div className="mt-4 rounded-ui-control border border-divider bg-surface-raised px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">XLSX kolon eşleme</h4>
                    <p className="mt-1 text-content-subtle">
                      Kaynak başlıklar tanım kolonlarıyla birebir eşleşmiyor.
                      Her hedef kolon için bir kaynak başlık seçin.
                    </p>
                  </div>
                  <button
                    className={buttonClass}
                    onClick={applyXlsxHeaderMapping}
                    type="button"
                  >
                    Eşlemeyi Uygula
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {definition.columns.map((column) => (
                    <label
                      className="block text-sm font-medium"
                      key={column.key}
                    >
                      <span>{column.label} için XLSX kolonu</span>
                      <select
                        aria-label={`${column.label} için XLSX kolonu`}
                        className="mt-1 block w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm outline-none"
                        value={xlsxImportHeaderMapping[column.label] ?? ""}
                        onChange={(event) => {
                          const nextHeader = event.target.value;

                          setXlsxImportHeaderMapping((currentMapping) => ({
                            ...currentMapping,
                            [column.label]: nextHeader,
                          }));
                        }}
                      >
                        <option value="">Seçilmedi</option>
                        {xlsxImportSourceHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-content-subtle">
                  Seçili kaynak başlıklar:{" "}
                  {getSelectedXlsxHeaderValues(
                    definition,
                    xlsxImportHeaderMapping,
                  )
                    .filter(Boolean)
                    .join(", ") || "Henüz seçim yapılmadı"}
                </p>
              </div>
            ) : null}
          </div>
          <label className="mt-4 block text-sm font-medium">
            <span>CSV dosyası seç</span>
            <input
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm file:mr-3 file:rounded-ui-control file:border-0 file:bg-brand-primary-subtle file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-primary"
              onChange={(event) => {
                void handleImportFileChange(event.target.files?.[0]);
              }}
              type="file"
            />
          </label>
          <label className="mt-4 block text-sm font-medium">
            <span>CSV içe aktar verisi</span>
            <textarea
              className="mt-1 min-h-36 w-full rounded-ui-control border border-divider bg-surface-muted px-3 py-2 font-mono text-xs outline-none"
              onChange={(event) => {
                setImportCsvText(event.target.value);
                setImportPreview(undefined);
              }}
              value={importCsvText}
            />
          </label>
          {importPreview ? (
            <div className="mt-4 rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm">
              <p className="font-semibold">
                İçe aktarım önizlemesi: {importPreview.summary.validRows} geçerli, {importPreview.summary.invalidRows} hatalı.
              </p>
              {importPreview.fileErrors.length > 0 ? (
                <ul className="mt-2 text-[var(--ds-danger)]">
                  {importPreview.fileErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              {importPreview.rows.length > 0 ? (
                <div className="mt-3 overflow-x-auto rounded-ui-control border border-divider bg-surface-raised">
                  <table
                    aria-label="İçe aktarım satır durumları"
                    className="min-w-[720px] w-full text-left text-xs"
                  >
                    <thead className="bg-surface-muted text-content-subtle">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Satır</th>
                        <th className="px-3 py-2 font-semibold">Kod</th>
                        <th className="px-3 py-2 font-semibold">Tanım</th>
                        <th className="px-3 py-2 font-semibold">Durum</th>
                        <th className="px-3 py-2 font-semibold">Uyarı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {importPreview.rows.map((row) => {
                        const isInvalid = row.errors.length > 0;

                        return (
                          <tr
                            className={
                              isInvalid
                                ? "border-l-4 border-[var(--ds-danger)] bg-danger-subtle text-[var(--ds-danger)]"
                                : "border-l-4 border-[var(--ds-success)] bg-success-subtle text-[var(--ds-success)]"
                            }
                            key={row.rowNumber}
                          >
                            <td className="px-3 py-2 font-mono">
                              {row.rowNumber}. satır
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {row.values.code || "-"}
                            </td>
                            <td className="px-3 py-2">
                              {row.values.name || "-"}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {isInvalid ? "Hatalı" : "Geçerli"}
                            </td>
                            <td className="px-3 py-2">
                              {isInvalid ? row.errors.join(" ") : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {importPreview.rows.some((row) => row.errors.length > 0) ? (
                <ul className="mt-3 space-y-1 text-[var(--ds-danger)]">
                  {importPreview.rows
                    .filter((row) => row.errors.length > 0)
                    .map((row) => (
                      <li key={row.rowNumber}>
                        <span className="font-semibold">{row.rowNumber}. satır</span>{" "}
                        {row.errors.join(" ")}
                      </li>
                    ))}
                </ul>
              ) : null}
              {importPreview.rows.some((row) => row.errors.length > 0) ? (
                <a
                  className={`${buttonClass} mt-3 inline-flex`}
                  download={buildEntityImportErrorReportCsvFileName(definition)}
                  href={buildEntityImportErrorReportCsvHref(importPreview)}
                >
                  Önizleme hata raporu CSV indir
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
      <div
        className={
          isTemplateVariant
            ? "overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm"
            : "overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
        }
      >
        <div className="overflow-x-auto">
          <table
            aria-label={isTemplateVariant ? entityTableLabel : undefined}
            className={
              isTemplateVariant
                ? "w-full min-w-[980px] border-collapse text-sm text-content"
                : "min-w-full border-collapse text-sm"
            }
          >
            <thead
              className={
                isTemplateVariant
                  ? "bg-surface-muted text-left text-xs uppercase tracking-wide text-content-subtle"
                  : "bg-surface-muted text-left"
              }
            >
              <tr>
                <th className="h-[var(--ds-data-row-height)] border-b border-divider px-3 font-semibold">
                  Seç
                </th>
                {definition.columns.map((column) => (
                  <th
                    className="h-[var(--ds-data-row-height)] border-b border-divider px-3 font-semibold"
                    key={column.key}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    className="border-b border-divider px-3 py-8 text-center"
                    colSpan={definition.columns.length + 1}
                  >
                    <p className="font-semibold">Henüz kayıt yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Yeni butonu ile ilk tanım kaydını oluşturabilirsiniz.
                    </p>
                  </td>
                </tr>
              ) : null}
              {filteredRows.map((row) => {
                const isSelected = row.code === selectedCode;

                return (
                  <tr
                    className={
                      isTemplateVariant
                        ? isSelected
                          ? "bg-brand-primary-subtle"
                          : "hover:bg-surface-muted"
                        : isSelected
                          ? "bg-brand-primary-subtle"
                          : "hover:bg-brand-primary-subtle"
                    }
                    key={row.code}
                  >
                    <td className="h-[var(--ds-data-row-height)] border-b border-divider px-3">
                      <button
                        aria-pressed={isSelected}
                        className={
                          isTemplateVariant
                            ? isSelected
                              ? "min-h-8 rounded-ui-control bg-brand-primary px-2.5 text-xs font-semibold text-on-brand"
                              : "min-h-8 rounded-ui-control border border-divider bg-surface-raised px-2.5 text-xs font-semibold text-content hover:border-brand-primary"
                            : buttonClass
                        }
                        onClick={() => {
                          setSelectedCode(row.code);
                          setServerErrors([]);
                          setNotice(`${row.code} seçildi.`);
                        }}
                        type="button"
                      >
                        Seç
                      </button>
                    </td>
                    {definition.columns.map((column) => (
                      <td
                        className="h-[var(--ds-data-row-height)] border-b border-divider px-3"
                        key={column.key}
                        style={{ textAlign: column.align ?? "left" }}
                      >
                        {column.key === "status" ? (
                          isTemplateVariant ? (
                            <StatusBadge
                              tone={row[column.key] === "Pasif" ? "neutral" : "success"}
                            >
                              {row[column.key]}
                            </StatusBadge>
                          ) : (
                            <span className={getStatusClass(row[column.key])}>
                              {row[column.key]}
                            </span>
                          )
                        ) : (
                          row[column.key]
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer
          className={
            isTemplateVariant
              ? "flex flex-col gap-1 border-t border-divider bg-surface-muted px-4 py-3 text-xs text-content-subtle sm:flex-row sm:items-center sm:justify-between"
              : "flex items-center justify-between bg-surface-muted px-3 py-2 text-xs text-content-subtle"
          }
        >
          <span>
            {filteredRows.length}/{rows.length} kayıt
          </span>
          <span>F3 Yeni · F4 Düzenle · F11 Yenile · Ctrl+E Excel</span>
        </footer>
      </div>

      {showCounterpartyMovementPanel ? (
        <article
          aria-label={isTemplateVariant ? `Seçili ${counterpartySingularLabel.toLocaleLowerCase("tr-TR")} tahsilat ödeme paneli` : undefined}
          className={
            isTemplateVariant
              ? "rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm sm:p-5"
              : "rounded-ui-panel border border-divider bg-surface-raised p-4"
          }
        >
          <div>
            <h2 className={isTemplateVariant ? "text-xl font-semibold" : "text-sm font-semibold"}>
              Cari Tahsilat / Ödeme
            </h2>
            {isTemplateVariant ? (
              <p className="mt-1 text-sm text-content-subtle">
                {selectedRow
                  ? selectedRow.name + " için gerçek kasa/banka hareketi oluşturun."
                  : `İşlem oluşturmak için ${counterpartySingularLabel.toLocaleLowerCase("tr-TR")} seçin.`}
              </p>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-semibold text-content-subtle">
              Hareket tipi
              <select
                className={counterpartyControlClass}
                onChange={(event) =>
                  setCounterpartyMovementType(
                    event.target.value as "Tahsilat" | "Ödeme",
                  )
                }
                value={counterpartyMovementType}
              >
                <option value="Tahsilat">Tahsilat</option>
                <option value="Ödeme">Ödeme</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-content-subtle">
              Kasa/Banka hesabı
              <select
                className={counterpartyControlClass}
                onChange={(event) =>
                  setCounterpartyMovementAccountCode(event.target.value)
                }
                value={counterpartyMovementAccountCode}
              >
                {cashBankAccountOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name} ({option.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-content-subtle">
              İşlem tarihi
              <input
                className={counterpartyControlClass}
                onChange={(event) => setCounterpartyMovementDate(event.target.value)}
                type="date"
                value={counterpartyMovementDate}
              />
            </label>
            <label className="text-xs font-semibold text-content-subtle">
              Tutar
              <input
                className={counterpartyControlClass}
                min="0.01"
                onChange={(event) => setCounterpartyMovementAmount(event.target.value)}
                step="0.01"
                type="number"
                value={counterpartyMovementAmount}
              />
            </label>
            <label className="text-xs font-semibold text-content-subtle">
              Evrak No
              <input
                className={counterpartyControlClass}
                onChange={(event) =>
                  setCounterpartyMovementDocumentNo(event.target.value)
                }
                value={counterpartyMovementDocumentNo}
              />
            </label>
            <label className="text-xs font-semibold text-content-subtle">
              Açıklama
              <input
                className={counterpartyControlClass}
                onChange={(event) =>
                  setCounterpartyMovementDescription(event.target.value)
                }
                value={counterpartyMovementDescription}
              />
            </label>
          </div>
          <button
            className={
              isTemplateVariant
                ? "mt-4 min-h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-40"
                : buttonClass + " mt-4"
            }
            disabled={
              counterpartyMovementPending || cashBankAccountOptions.length === 0
            }
            onClick={submitCounterpartyMovement}
            type="button"
          >
            {counterpartyMovementPending
              ? "Kaydediliyor..."
              : "Tahsilat/Ödeme Kaydet"}
          </button>
          {cashBankAccountOptions.length === 0 ? (
            <p className="mt-2 text-xs text-danger">
              Önce aktif bir kasa/banka hesabı tanımlayın.
            </p>
          ) : null}
        </article>
      ) : null}

      {statementRows.length > 0 || showCounterpartyMovementPanel ? (
        <article
          className={
            isTemplateVariant
              ? "overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm"
              : "overflow-hidden rounded-ui-panel border border-divider bg-surface-raised"
          }
        >
          <div
            className={
              isTemplateVariant
                ? "flex flex-col gap-3 border-b border-divider px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                : "flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            }
          >
            <div>
              <h2 className={isTemplateVariant ? "text-xl font-semibold" : "text-sm font-semibold"}>
                Hesap Ekstresi
              </h2>
              {isTemplateVariant ? (
                <p className="mt-1 text-sm text-content-subtle">
                  {selectedRow
                    ? `${selectedRow.name} için kronolojik cari hareketler ve yürüyen bakiye.`
                    : `Ekstreyi görüntülemek için ${counterpartySingularLabel.toLocaleLowerCase("tr-TR")} seçin.`}
                </p>
              ) : null}
            </div>
            {selectedStatementRows.length > 0 ? (
              <a
                aria-label="Seçili cari hesap ekstresi CSV indir"
                className={
                  isTemplateVariant
                    ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-4 text-sm font-semibold text-content transition-colors hover:bg-surface-muted"
                    : "inline-flex h-9 items-center justify-center rounded-ui-control border border-divider bg-surface-muted px-3 text-xs font-semibold text-content transition hover:bg-brand-primary-subtle"
                }
                download={selectedStatementCsvFileName}
                href={selectedStatementCsvHref}
              >
                {isTemplateVariant ? <Icon aria-hidden name="download" size={16} /> : null}
                CSV
              </a>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table
              aria-label="Seçili cari hesap ekstresi"
              className="min-w-[920px] w-full text-left text-sm"
            >
              <thead
                className={
                  isTemplateVariant
                    ? "bg-surface-muted text-xs uppercase tracking-wide text-content-subtle"
                    : "bg-surface-muted text-xs uppercase text-content-subtle"
                }
              >
                <tr>
                  <th className="px-4 py-3 font-semibold">Tarih</th>
                  <th className="px-4 py-3 font-semibold">Kaynak</th>
                  <th className="px-4 py-3 font-semibold">Evrak No</th>
                  <th className="px-4 py-3 font-semibold">İşlem</th>
                  <th className="px-4 py-3 font-semibold">Muhasebe fişi</th>
                  <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Yürüyen Bakiye
                  </th>
                </tr>
              </thead>
              <tbody className={isTemplateVariant ? "divide-y divide-divider" : "divide-y divide-divider"}>
                {selectedStatementRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center" colSpan={7}>
                      <p className="font-semibold">
                        Seçili cari için hareket yok
                      </p>
                      <p
                        className={
                          isTemplateVariant
                            ? "mt-1 text-sm text-content-subtle"
                            : "mt-1 text-sm text-content-subtle"
                        }
                      >
                        Fatura, hakediş, maaş veya kasa/banka hareketleri
                        oluştuğunda bu tablo dolacaktır.
                      </p>
                    </td>
                  </tr>
                ) : (
                  selectedStatementRows.map((row) => (
                    <tr
                      className={isTemplateVariant ? "hover:bg-surface-muted" : "hover:bg-brand-primary-subtle"}
                      key={`${row.counterpartyName}-${row.source}-${row.documentNo}-${row.date}`}
                    >
                      <td className="px-4 py-3">{formatDate(row.date)}</td>
                      <td className="px-4 py-3">{row.source}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          aria-label={`${row.documentNo} evrakına git`}
                          className={
                            isTemplateVariant
                              ? "font-semibold text-brand-primary underline-offset-2 hover:underline"
                              : "font-semibold text-brand-primary underline-offset-2 hover:underline"
                          }
                          href={row.targetHref}
                        >
                          {row.documentNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{row.effect}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.ledgerDocumentNo ?? "-"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold ${
                          row.amount >= 0
                            ? "text-[var(--ds-success)]"
                            : "text-[var(--ds-danger)]"
                        }`}
                      >
                        {formatMoney(row.amount)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold ${
                          row.balanceAfter >= 0
                            ? "text-[var(--ds-success)]"
                            : "text-[var(--ds-danger)]"
                        }`}
                      >
                        {formatMoney(row.balanceAfter)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      {!isTemplateVariant ? (
        <aside className="rounded-ui-panel border border-divider bg-surface-raised p-4">
          <h2 className="text-sm font-semibold">Kaynak HTML şablonları</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {definition.templateSources.map((source) => (
              <span
                className="rounded-ui-control bg-brand-primary-subtle px-2 py-1 font-mono text-xs text-brand-primary"
                key={source}
              >
                {source}
              </span>
            ))}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

function upsertRow(rows: EntityRow[], nextRow: EntityRow) {
  if (rows.some((row) => row.code === nextRow.code)) {
    return rows.map((row) => (row.code === nextRow.code ? nextRow : row));
  }

  return [...rows, nextRow];
}

function applyStatementBalances(
  definition: EntityDefinition,
  rows: EntityRow[],
  statementRows: OperationalReportCounterpartyStatementDetailRow[],
) {
  if (
    statementRows.length === 0 ||
    !definition.columns.some((column) => column.key === "balance")
  ) {
    return rows;
  }

  const balancesByCounterpartyName = statementRows.reduce<Map<string, number>>(
    (balances, statementRow) =>
      balances.set(
        normalizeCounterpartyName(statementRow.counterpartyName),
        statementRow.balanceAfter,
      ),
    new Map(),
  );
  return rows.map((row) => {
    const balance = balancesByCounterpartyName.get(
      normalizeCounterpartyName(row.name),
    );

    if (typeof balance !== "number") {
      return row;
    }

    return {
      ...row,
      balance: formatMoney(balance),
    };
  });
}

function normalizeCounterpartyName(value: string | undefined) {
  return value?.trim() ?? "";
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

