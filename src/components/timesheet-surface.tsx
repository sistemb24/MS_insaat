"use client";

import { useMemo, useState, useTransition } from "react";

import { Button, PageHeader, StatusBadge } from "@/components/ui";
import type { AuditLogEntry } from "@/lib/audit-log";
import {
  calculateTimesheetTotals,
  type TimesheetCreateValues,
  type TimesheetRow,
} from "@/lib/timesheet-service";

type LookupOption = {
  code: string;
  name: string;
};

type TimesheetPersistence = {
  cancelTimesheet?: (id: string) => Promise<TimesheetMutationResult>;
  createTimesheet?: (
    values: TimesheetCreateValues,
  ) => Promise<TimesheetMutationResult>;
  postTimesheet?: (id: string) => Promise<TimesheetMutationResult>;
};

type TimesheetMutationResult =
  | { ok: true; data: TimesheetRow; errors?: never }
  | { ok: false; errors: string[]; data?: never };

type TimesheetSurfaceProps = {
  auditLogsByEntityId?: Record<string, AuditLogEntry[]>;
  lookups?: {
    personnel?: LookupOption[];
    sites?: LookupOption[];
    subcontractors?: LookupOption[];
  };
  permissions?: {
    canMutateTimesheets?: boolean;
  };
  persistence?: TimesheetPersistence;
  rows: TimesheetRow[];
  today?: string;
};

type DraftState = {
  advanceDeduction: string;
  dailyWage: string;
  debtDeduction: string;
  description: string;
  documentNo: string;
  month: string;
  overtimeHourlyRate: string;
  overtimeHours: string;
  personCode: string;
  siteCode: string;
  subcontractorCode: string;
  workedDays: string;
  year: string;
};

const defaultLookups = {
  personnel: [{ code: "PRS-0001", name: "MEHMET YILMAZ" }],
  sites: [{ code: "SANT-0001", name: "ŞİRKET MERKEZ ŞANTİYESİ" }],
  subcontractors: [{ code: "TAS-0001", name: "ŞİRKETİN TAŞERONU" }],
};

export function TimesheetSurface({
  auditLogsByEntityId = {},
  lookups,
  permissions = { canMutateTimesheets: true },
  persistence = {},
  rows,
  today = new Date().toISOString().slice(0, 10),
}: TimesheetSurfaceProps) {
  const mergedLookups = {
    personnel: lookups?.personnel?.length
      ? lookups.personnel
      : defaultLookups.personnel,
    sites: lookups?.sites?.length ? lookups.sites : defaultLookups.sites,
    subcontractors: lookups?.subcontractors?.length
      ? lookups.subcontractors
      : defaultLookups.subcontractors,
  };
  const [localRows, setLocalRows] = useState(rows);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Tümü" | TimesheetRow["status"]>(
    "Tümü",
  );
  const [isPending, startTransition] = useTransition();
  const initialDate = new Date(`${today}T00:00:00`);
  const [draft, setDraft] = useState<DraftState>({
    advanceDeduction: "0",
    dailyWage: "1000",
    debtDeduction: "0",
    description: "",
    documentNo: "",
    month: String(initialDate.getMonth() + 1),
    overtimeHourlyRate: "80",
    overtimeHours: "0",
    personCode: mergedLookups.personnel[0]?.code ?? "",
    siteCode: mergedLookups.sites[0]?.code ?? "",
    subcontractorCode: mergedLookups.subcontractors[0]?.code ?? "",
    workedDays: "20",
    year: String(initialDate.getFullYear()),
  });
  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return localRows.filter((row) => {
      const matchesStatus =
        statusFilter === "Tümü" || row.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          row.documentNo,
          row.siteCode,
          row.siteName,
          row.contractorCode,
          row.contractorName,
          ...row.lines.flatMap((line) => [line.personCode, line.personName]),
        ].some((value) =>
          value.toLocaleLowerCase("tr-TR").includes(normalizedSearch),
        );

      return matchesStatus && matchesSearch;
    });
  }, [localRows, search, statusFilter]);
  const summary = useMemo(() => summarizeRows(visibleRows), [visibleRows]);
  const preview = calculateTimesheetTotals({
    contractorCode: selectedName(mergedLookups.subcontractors, draft.subcontractorCode)
      ? draft.subcontractorCode
      : "",
    contractorName: selectedName(
      mergedLookups.subcontractors,
      draft.subcontractorCode,
    ),
    description: draft.description,
    documentNo: draft.documentNo,
    lines: [
      {
        advanceDeduction: toNumber(draft.advanceDeduction),
        dailyWage: toNumber(draft.dailyWage),
        debtDeduction: toNumber(draft.debtDeduction),
        overtimeHourlyRate: toNumber(draft.overtimeHourlyRate),
        overtimeHours: toNumber(draft.overtimeHours),
        personCode: draft.personCode,
        personName: selectedName(mergedLookups.personnel, draft.personCode),
        workedDays: toNumber(draft.workedDays),
      },
    ],
    month: toNumber(draft.month),
    siteCode: draft.siteCode,
    siteName: selectedName(mergedLookups.sites, draft.siteCode),
    year: toNumber(draft.year),
  });
  const canMutate = permissions.canMutateTimesheets !== false;

  function updateDraft(field: keyof DraftState, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCreate() {
    if (!persistence.createTimesheet) {
      setMessage("Puantaj kayıt bağlantısı hazır değil.");
      return;
    }

    const values: TimesheetCreateValues = {
      contractorCode: draft.subcontractorCode,
      contractorName: selectedName(
        mergedLookups.subcontractors,
        draft.subcontractorCode,
      ),
      description: draft.description,
      documentNo: draft.documentNo,
      lines: [
        {
          advanceDeduction: toNumber(draft.advanceDeduction),
          dailyWage: toNumber(draft.dailyWage),
          debtDeduction: toNumber(draft.debtDeduction),
          overtimeHourlyRate: toNumber(draft.overtimeHourlyRate),
          overtimeHours: toNumber(draft.overtimeHours),
          personCode: draft.personCode,
          personName: selectedName(mergedLookups.personnel, draft.personCode),
          workedDays: toNumber(draft.workedDays),
        },
      ],
      month: toNumber(draft.month),
      siteCode: draft.siteCode,
      siteName: selectedName(mergedLookups.sites, draft.siteCode),
      year: toNumber(draft.year),
    };

    startTransition(async () => {
      const result = await persistence.createTimesheet?.(values);

      if (!result) {
        return;
      }

      if (!result.ok) {
        setMessage(result.errors.join(" "));
        return;
      }

      setLocalRows((current) => [result.data, ...current]);
      setMessage("Puantaj kaydedildi.");
      setIsFormOpen(false);
    });
  }

  function mutateStatus(id: string, action: "cancel" | "post") {
    const mutation =
      action === "post"
        ? persistence.postTimesheet
        : persistence.cancelTimesheet;

    if (!mutation) {
      setMessage("Durum işlemi bağlantısı hazır değil.");
      return;
    }

    startTransition(async () => {
      const result = await mutation(id);

      if (!result.ok) {
        setMessage(result.errors.join(" "));
        return;
      }

      setLocalRows((current) =>
        current.map((row) => (row.id === id ? result.data : row)),
      );
      setMessage(
        action === "post" ? "Puantaj kesinleştirildi." : "Puantaj iptal edildi.",
      );
    });
  }

  function handlePrint() {
    setMessage(`Yazdırma kapsamı hazır: ${visibleRows.length} puantaj.`);
    window.print();
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        actions={<><StatusBadge tone="info">{visibleRows.length} kayıt görünür</StatusBadge><Button disabled={!canMutate} onClick={() => setIsFormOpen((current) => !current)}>Yeni Puantaj</Button></>}
        description="Şantiye, taşeron, ay ve yıl bazında personel çalışma günü, mesai ve net ödeme hazırlığı."
        eyebrow="Personel yönetimi · aylık çalışma cetveli"
        title="Puantaj"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Açık Puantaj" value={String(summary.openCount)} />
        <Metric label="Çalışma Günü" value={formatNumber(summary.totalWorkedDays)} />
        <Metric
          label="Mesai Saati"
          value={formatNumber(summary.totalOvertimeHours)}
        />
        <Metric label="Net Ödeme" value={formatMoney(summary.netTotal)} />
      </div>

      <section className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
              Cetvel filtresi
            </p>
            <p className="mt-1 text-sm text-content-muted">
              Özet, liste ve yazdırma yalnız görünür puantaj kayıtlarını esas alır.
            </p>
          </div>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-content-muted xl:max-w-sm">
            Kayıt, şantiye, taşeron veya personel ara
            <input
              className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-normal text-content outline-none focus:border-brand-primary"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Puantaj no, şantiye veya personel"
              type="search"
              value={search}
            />
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Puantaj durumu filtresi">
            {(["Tümü", "Taslak", "Kaydedildi", "İptal"] as const).map((status) => (
              <button
                aria-pressed={statusFilter === status}
                className={
                  statusFilter === status
                    ? "h-10 rounded-ui-control bg-brand-primary px-3 text-sm font-semibold text-on-brand"
                    : "h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content-muted hover:bg-surface-muted hover:text-content"
                }
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <article className="rounded-ui-panel border border-divider bg-surface-raised p-4">
          <h2 className="text-sm font-semibold">Puantaj Girişi</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <TextField
              label="Puantaj No"
              onChange={(value) => updateDraft("documentNo", value)}
              value={draft.documentNo}
            />
            <TextField
              label="Yıl"
              onChange={(value) => updateDraft("year", value)}
              type="number"
              value={draft.year}
            />
            <TextField
              label="Ay"
              onChange={(value) => updateDraft("month", value)}
              type="number"
              value={draft.month}
            />
            <SelectField
              label="Şantiye"
              onChange={(value) => updateDraft("siteCode", value)}
              options={mergedLookups.sites}
              value={draft.siteCode}
            />
            <SelectField
              label="Taşeron"
              onChange={(value) => updateDraft("subcontractorCode", value)}
              options={mergedLookups.subcontractors}
              value={draft.subcontractorCode}
            />
            <TextField
              label="Açıklama"
              onChange={(value) => updateDraft("description", value)}
              value={draft.description}
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table aria-label="Puantaj giriş satırı" className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
                <tr>
                  <th className="px-3 py-3">Personel</th>
                  <th className="px-3 py-3 text-right">Gün</th>
                  <th className="px-3 py-3 text-right">Yevmiye</th>
                  <th className="px-3 py-3 text-right">Mesai</th>
                  <th className="px-3 py-3 text-right">Mesai Ücreti</th>
                  <th className="px-3 py-3 text-right">Avans</th>
                  <th className="px-3 py-3 text-right">Borç</th>
                  <th className="px-3 py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-3">
                    <SelectField
                      label="Personel satır 1"
                      onChange={(value) => updateDraft("personCode", value)}
                      options={mergedLookups.personnel}
                      value={draft.personCode}
                    />
                  </td>
                  <NumberCell
                    label="Çalışma günü satır 1"
                    onChange={(value) => updateDraft("workedDays", value)}
                    value={draft.workedDays}
                  />
                  <NumberCell
                    label="Yevmiye satır 1"
                    onChange={(value) => updateDraft("dailyWage", value)}
                    value={draft.dailyWage}
                  />
                  <NumberCell
                    label="Mesai saati satır 1"
                    onChange={(value) => updateDraft("overtimeHours", value)}
                    value={draft.overtimeHours}
                  />
                  <NumberCell
                    label="Mesai ücreti satır 1"
                    onChange={(value) =>
                      updateDraft("overtimeHourlyRate", value)
                    }
                    value={draft.overtimeHourlyRate}
                  />
                  <NumberCell
                    label="Avans satır 1"
                    onChange={(value) => updateDraft("advanceDeduction", value)}
                    value={draft.advanceDeduction}
                  />
                  <NumberCell
                    label="Borç satır 1"
                    onChange={(value) => updateDraft("debtDeduction", value)}
                    value={draft.debtDeduction}
                  />
                  <td className="px-3 py-3 text-right font-mono font-semibold">
                    {formatMoney(preview.netTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              className="h-10 rounded-ui-control border border-divider px-4 text-sm font-semibold"
              onClick={() => setIsFormOpen(false)}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="h-10 rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand disabled:opacity-60"
              disabled={isPending || !canMutate}
              onClick={handleCreate}
              type="button"
            >
              Kaydet
            </button>
          </div>
        </article>
      ) : null}

      {message ? (
        <p
          className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Puantaj hareket listesi</h2>
          <button
            className="h-9 rounded-ui-control border border-divider px-3 text-xs font-semibold disabled:opacity-50"
            disabled={visibleRows.length === 0}
            onClick={handlePrint}
            type="button"
          >
            Puantajları Yazdır
          </button>
        </div>
        <div className="overflow-x-auto">
          <table aria-label="Puantaj hareket listesi" className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3">Puantaj No</th>
                <th className="px-4 py-3">Dönem</th>
                <th className="px-4 py-3">Şantiye</th>
                <th className="px-4 py-3">Taşeron</th>
                <th className="px-4 py-3 text-right">Gün</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">
                      {localRows.length === 0
                        ? "Henüz puantaj kaydı yok"
                        : "Filtreyle eşleşen puantaj kaydı yok"}
                    </p>
                    <p className="mt-1 text-sm text-content-subtle">
                      {localRows.length === 0
                        ? "Personel çalışma günleri girildiğinde liste dolacaktır."
                        : "Arama veya durum filtresini değiştirerek kayıtları görün."}
                    </p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr className="hover:bg-brand-primary-subtle" key={row.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.documentNo}
                    </td>
                    <td className="px-4 py-3">
                      {row.year}/{String(row.month).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">{row.siteName}</td>
                    <td className="px-4 py-3">{row.contractorName || "-"}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatNumber(row.totalWorkedDays)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatMoney(row.netTotal)}
                    </td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="h-9 rounded-ui-control border border-divider px-3 text-xs font-semibold disabled:opacity-50"
                          disabled={
                            !canMutate ||
                            isPending ||
                            row.status !== "Taslak"
                          }
                          onClick={() => mutateStatus(row.id, "post")}
                          type="button"
                        >
                          Kesinleştir
                        </button>
                        <button
                          className="h-9 rounded-ui-control border border-divider px-3 text-xs font-semibold disabled:opacity-50"
                          disabled={
                            !canMutate ||
                            isPending ||
                            row.status === "İptal"
                          }
                          onClick={() => mutateStatus(row.id, "cancel")}
                          type="button"
                        >
                          İptal
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-ui-panel border border-divider bg-surface-raised p-4">
        <h2 className="text-sm font-semibold">İşlem Geçmişi</h2>
        <div className="mt-4 grid gap-3">
          {localRows.flatMap((row) =>
            (auditLogsByEntityId[row.id] ?? []).map((entry) => (
              <div
                className="rounded-ui-control border border-divider bg-surface-muted p-3 text-sm"
                key={entry.id}
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="font-semibold">{actionLabel(entry.action)}</p>
                  <p className="font-mono text-xs text-content-subtle">
                    {formatDateTime(entry.occurredAt)}
                  </p>
                </div>
                <p className="mt-1 text-content-subtle">
                  {String(entry.metadata.statusFrom ?? "")}
                  {entry.metadata.statusFrom ? " -> " : ""}
                  {String(entry.metadata.statusTo ?? "")}
                </p>
              </div>
            )),
          )}
        </div>
      </article>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-4">
      <p className="text-sm font-semibold text-content-subtle">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
    </article>
  );
}

function TextField({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      <span>{label}</span>
      <input
        aria-label={label}
        className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 font-normal outline-none focus:border-brand-primary"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: LookupOption[];
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      <span>{label}</span>
      <select
        aria-label={label}
        className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 font-normal outline-none focus:border-brand-primary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.code} - {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberCell({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <td className="px-3 py-3">
      <input
        aria-label={label}
        className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-right font-mono outline-none focus:border-brand-primary"
        onChange={(event) => onChange(event.target.value)}
        type="number"
        value={value}
      />
    </td>
  );
}

function summarizeRows(rows: TimesheetRow[]) {
  return {
    netTotal: rows.reduce((total, row) => total + row.netTotal, 0),
    openCount: rows.filter((row) => row.status === "Taslak").length,
    totalOvertimeHours: rows.reduce(
      (total, row) => total + row.totalOvertimeHours,
      0,
    ),
    totalWorkedDays: rows.reduce((total, row) => total + row.totalWorkedDays, 0),
  };
}

function selectedName(options: LookupOption[], code: string) {
  return options.find((option) => option.code === code)?.name ?? "";
}

function actionLabel(action: string) {
  if (action === "timesheet.post") {
    return "Kesinleştirildi";
  }

  if (action === "timesheet.cancel") {
    return "İptal Edildi";
  }

  return "Oluşturuldu";
}

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
