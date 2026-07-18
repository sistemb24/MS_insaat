"use client";

import { useMemo, useState, useTransition } from "react";

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
  const summary = useMemo(() => summarizeRows(localRows), [localRows]);
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
    setMessage(`Yazdırma kapsamı hazır: ${localRows.length} puantaj.`);
    window.print();
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Aylık çalışma grid&apos;i
        </p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Puantaj</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              Şantiye, taşeron, ay ve yıl bazında personel çalışma günü, mesai
              ve net ödeme hazırlığı.
            </p>
          </div>
          <button
            className="h-10 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={!canMutate}
            onClick={() => setIsFormOpen((current) => !current)}
            type="button"
          >
            Yeni
          </button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Açık Puantaj" value={String(summary.openCount)} />
        <Metric label="Çalışma Günü" value={formatNumber(summary.totalWorkedDays)} />
        <Metric
          label="Mesai Saati"
          value={formatNumber(summary.totalOvertimeHours)}
        />
        <Metric label="Net Ödeme" value={formatMoney(summary.netTotal)} />
      </div>

      {isFormOpen ? (
        <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
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
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
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
              className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-4 text-sm font-semibold"
              onClick={() => setIsFormOpen(false)}
              type="button"
            >
              Vazgeç
            </button>
            <button
              className="h-10 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
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
          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Puantaj hareket listesi</h2>
          <button
            className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold disabled:opacity-50"
            disabled={localRows.length === 0}
            onClick={handlePrint}
            type="button"
          >
            Puantajları Yazdır
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
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
            <tbody className="divide-y divide-[var(--grid-border)]">
              {localRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">Henüz puantaj kaydı yok</p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      Personel çalışma günleri girildiğinde liste dolacaktır.
                    </p>
                  </td>
                </tr>
              ) : (
                localRows.map((row) => (
                  <tr className="hover:bg-[var(--primary-fixed)]" key={row.id}>
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
                          className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold disabled:opacity-50"
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
                          className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold disabled:opacity-50"
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

      <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
        <h2 className="text-sm font-semibold">İşlem Geçmişi</h2>
        <div className="mt-4 grid gap-3">
          {localRows.flatMap((row) =>
            (auditLogsByEntityId[row.id] ?? []).map((entry) => (
              <div
                className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-3 text-sm"
                key={entry.id}
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="font-semibold">{actionLabel(entry.action)}</p>
                  <p className="font-mono text-xs text-[var(--on-surface-variant)]">
                    {formatDateTime(entry.occurredAt)}
                  </p>
                </div>
                <p className="mt-1 text-[var(--on-surface-variant)]">
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
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <p className="text-sm font-semibold text-[var(--on-surface-variant)]">
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
        className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
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
        className="h-10 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 font-normal outline-none focus:border-[var(--primary)]"
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
        className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-white px-3 text-right font-mono outline-none focus:border-[var(--primary)]"
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
