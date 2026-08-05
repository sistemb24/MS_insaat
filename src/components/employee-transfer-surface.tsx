"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  approveEmployeeTransferAction,
  createEmployeeTransferAction,
  getEmployeeTransferAction,
  listEmployeeTransferLookupsAction,
  listEmployeeTransfersAction,
  rejectEmployeeTransferAction,
  submitEmployeeTransferAction,
  updateEmployeeTransferDraftAction,
} from "@/app/actions/employee-transfer-actions";
import type { EmployeeTransferStatus } from "@/lib/employee-transfer";
import type { EmployeeTransferRow } from "@/lib/employee-transfer-prisma-repository";

type Lookups = Extract<
  Awaited<ReturnType<typeof listEmployeeTransferLookupsAction>>,
  { ok: true }
>["data"];
type Dialog = "create" | "edit" | null;

const inputClass =
  "min-h-11 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  "min-h-11 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "min-h-11 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function EmployeeTransferSurface({
  canApprove,
  canCreate,
  initialTransferId,
}: {
  canApprove: boolean;
  canCreate: boolean;
  initialTransferId?: string;
}) {
  const [transfers, setTransfers] = useState<EmployeeTransferRow[] | null>(null);
  const [lookups, setLookups] = useState<Lookups>({ personnel: [], sites: [] });
  const [selected, setSelected] = useState<EmployeeTransferRow | null>(null);
  const [selectedId, setSelectedId] = useState(initialTransferId ?? "");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [site, setSite] = useState("ALL");
  const [year, setYear] = useState("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const initialTransferIdRef = useRef(initialTransferId);

  const refresh = useCallback(async (transferId = selectedId) => {
    const [listResult, lookupResult] = await Promise.all([
      listEmployeeTransfersAction(),
      listEmployeeTransferLookupsAction(),
    ]);
    if (!listResult.ok) {
      setError(readErrors(listResult));
      return;
    }
    setTransfers(listResult.data.transfers);
    if (lookupResult.ok) setLookups(lookupResult.data);
    if (!transferId) {
      setSelected(null);
      return;
    }
    const detail = await getEmployeeTransferAction(transferId);
    if (detail.ok) setSelected(detail.data.transfer);
    else {
      setSelected(null);
      setError(readErrors(detail));
    }
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    if (initialTransferIdRef.current === initialTransferId) return;
    initialTransferIdRef.current = initialTransferId;
    setSelectedId(initialTransferId ?? "");
  }, [initialTransferId]);
  useEffect(() => { if (selected) closeRef.current?.focus(); }, [selected]);

  const years = useMemo(() =>
    [...new Set((transfers ?? []).map((row) => row.effectiveDate.slice(0, 4)))]
      .sort()
      .reverse(),
  [transfers]);
  const visible = useMemo(() => {
    const needle = query.toLocaleLowerCase("tr-TR");
    return (transfers ?? []).filter((row) =>
      (status === "ALL" || row.status === status)
      && (site === "ALL" || row.sourceSiteCode === site || row.targetSiteCode === site)
      && (year === "ALL" || row.effectiveDate.startsWith(year))
      && `${row.personnelCode} ${row.personnelName} ${row.sourceSiteName} ${row.targetSiteName} ${statusLabel(row.status)}`
        .toLocaleLowerCase("tr-TR")
        .includes(needle));
  }, [query, site, status, transfers, year]);
  const metrics = useMemo(() => ({
    approved: transfers?.filter((row) => row.status === "APPROVED").length ?? 0,
    draft: transfers?.filter((row) => row.status === "DRAFT").length ?? 0,
    pending: transfers?.filter((row) => row.status === "SUBMITTED").length ?? 0,
  }), [transfers]);

  function openDetail(row: EmployeeTransferRow, opener: HTMLElement) {
    openerRef.current = opener;
    setSelected(row);
    setSelectedId(row.id);
    setError("");
    window.history.replaceState(
      null,
      "",
      `/personel?transfer=${encodeURIComponent(row.id)}`,
    );
  }

  function closeDetail() {
    setSelected(null);
    setSelectedId("");
    window.history.replaceState(null, "", "/personel");
    openerRef.current?.focus();
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personnelCode = value(data, "personnelCode");
    const targetSiteCode = value(data, "targetSiteCode");
    const personnel = lookups.personnel.find((row) => row.code === personnelCode);
    const source = lookups.sites.find((row) => row.name === personnel?.site);
    const target = lookups.sites.find((row) => row.code === targetSiteCode);
    const editing = dialog === "edit" ? selected : null;

    run(async () => {
      const values = {
        effectiveDate: value(data, "effectiveDate"),
        note: value(data, "note"),
        personnelCode,
        personnelName: personnel?.name ?? "",
        requestKey: createRequestKey(),
        sourceSiteCode: editing?.sourceSiteCode ?? source?.code ?? "",
        sourceSiteName: editing?.sourceSiteName ?? personnel?.site ?? "",
        targetSiteCode,
        targetSiteName: target?.name ?? "",
      };
      const result = editing
        ? await updateEmployeeTransferDraftAction({
            ...values,
            expectedRevisionNo: editing.revisionNo,
            transferId: editing.id,
          })
        : await createEmployeeTransferAction(values);
      if (!result.ok) return fail(result);
      await finish(
        result.data.transfer,
        editing ? "Transfer taslağı güncellendi." : "Transfer taslağı oluşturuldu.",
      );
    });
  }

  function transition(operation: "approve" | "reject" | "submit") {
    if (!selected) return;
    run(async () => {
      const input = {
        requestKey: createRequestKey(),
        transferId: selected.id,
      };
      const result = operation === "submit"
        ? await submitEmployeeTransferAction(input)
        : operation === "approve"
          ? await approveEmployeeTransferAction(input)
          : await rejectEmployeeTransferAction(input);
      if (!result.ok) return fail(result);
      await finish(
        result.data.transfer,
        `${statusLabel(result.data.transfer.status)} durumu kaydedildi.`,
      );
    });
  }

  function run(task: () => Promise<void>) {
    setError("");
    setNotice("");
    startTransition(task);
  }

  function fail(result: { errors?: string[] }) {
    setError(readErrors(result));
  }

  async function finish(transfer: EmployeeTransferRow, message: string) {
    setDialog(null);
    setSelectedId(transfer.id);
    setNotice(message);
    window.history.replaceState(
      null,
      "",
      `/personel?transfer=${encodeURIComponent(transfer.id)}`,
    );
    await refresh(transfer.id);
  }

  return (
    <section
      aria-label="Personel Şantiye Transferleri"
      className="mx-auto grid max-w-7xl gap-4"
    >
      <header className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
        <div className="border-l-4 border-brand-primary p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                Faz 22 · Şantiye ekip planlaması
              </p>
              <h2 className="mt-1 text-2xl font-bold text-content">
                Personel Şantiye Transferleri
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">
                Personelin güncel şantiyesini yönetici onayıyla değiştirin;
                kaynak, hedef ve karar geçmişini izlenebilir biçimde koruyun.
              </p>
            </div>
            {canCreate ? (
              <button
                className={`${primaryButton} print:hidden`}
                onClick={() => setDialog("create")}
                type="button"
              >
                Yeni transfer
              </button>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <Metric label="Onay bekleyen" value={metrics.pending} />
            <Metric label="Onaylanan" value={metrics.approved} />
            <Metric label="Taslak" value={metrics.draft} />
          </dl>
        </div>
      </header>

      {notice ? (
        <p
          className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 rounded-ui-panel border border-divider bg-surface-raised p-4 print:hidden md:grid-cols-2 xl:grid-cols-4">
        <Field label="Transferlerde ara">
          <input
            aria-label="Personel transferlerinde ara"
            className={inputClass}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Personel, şantiye veya durum"
            value={query}
          />
        </Field>
        <Filter label="Transfer durumu" onChange={setStatus} value={status}>
          <option value="ALL">Tüm durumlar</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>{statusLabel(item)}</option>
          ))}
        </Filter>
        <Filter label="Şantiye" onChange={setSite} value={site}>
          <option value="ALL">Tüm şantiyeler</option>
          {lookups.sites.map((row) => (
            <option key={row.code} value={row.code}>{row.name}</option>
          ))}
        </Filter>
        <Filter label="Transfer yılı" onChange={setYear} value={year}>
          <option value="ALL">Tüm yıllar</option>
          {years.map((item) => <option key={item}>{item}</option>)}
        </Filter>
      </div>

      {transfers === null ? (
        <p
          className="rounded-ui-panel border border-divider bg-surface-raised p-6 text-sm text-content-muted"
          role="status"
        >
          Transfer kayıtları yükleniyor…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-ui-panel border border-dashed border-divider bg-surface-raised p-8 text-center text-sm text-content-muted">
          Filtrelerle eşleşen personel transferi bulunmuyor.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((row) => (
            <article
              className={`rounded-ui-panel border bg-surface-raised p-4 shadow-sm print:break-inside-avoid print:shadow-none ${
                row.status === "SUBMITTED"
                  ? "border-l-4 border-l-warning"
                  : "border-divider"
              }`}
              key={row.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-brand-primary">
                    {row.personnelCode}
                  </p>
                  <h3 className="text-base font-bold text-content">
                    {row.personnelName}
                  </h3>
                </div>
                <Badge tone={statusTone(row.status)}>
                  {statusLabel(row.status)}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-ui-control bg-surface-muted p-3">
                <SiteSummary code={row.sourceSiteCode} name={row.sourceSiteName} />
                <span aria-hidden="true" className="text-xl text-brand-primary">→</span>
                <SiteSummary
                  align="right"
                  code={row.targetSiteCode}
                  name={row.targetSiteName}
                />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <LabelValue
                  label="Yürürlük tarihi"
                  value={formatDate(row.effectiveDate)}
                />
                <LabelValue label="Revizyon" value={String(row.revisionNo)} />
              </dl>
              <button
                aria-label={`${row.personnelName} ${statusLabel(row.status)} transfer detayını aç`}
                className={`${secondaryButton} mt-3 w-full print:hidden`}
                onClick={(event) => openDetail(row, event.currentTarget)}
                type="button"
              >
                Detayı görüntüle
              </button>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 print:static print:bg-transparent"
          role="dialog"
        >
          <article
            aria-label={`${selected.personnelName} transfer detayı`}
            className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-2xl sm:border-l sm:border-divider sm:p-6 print:max-w-none print:shadow-none"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand-primary">
                  {selected.personnelCode}
                </p>
                <h2 className="text-xl font-bold text-content">
                  {selected.personnelName}
                </h2>
              </div>
              <button
                className={`${secondaryButton} print:hidden`}
                onClick={closeDetail}
                ref={closeRef}
                type="button"
              >
                Kapat
              </button>
            </div>
            <div className="mt-3">
              <Badge tone={statusTone(selected.status)}>
                {statusLabel(selected.status)}
              </Badge>
            </div>
            <div className="mt-5 grid gap-3 rounded-ui-panel border border-divider bg-surface-muted p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <SiteSummary
                code={selected.sourceSiteCode}
                name={selected.sourceSiteName}
              />
              <span aria-hidden="true" className="text-2xl text-brand-primary">→</span>
              <SiteSummary
                align="right"
                code={selected.targetSiteCode}
                name={selected.targetSiteName}
              />
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <LabelValue
                label="Yürürlük tarihi"
                value={formatDate(selected.effectiveDate)}
              />
              <LabelValue label="Revizyon" value={String(selected.revisionNo)} />
              <LabelValue
                label="Gönderim zamanı"
                value={selected.submittedAt ? formatDateTime(selected.submittedAt) : "—"}
              />
              <LabelValue
                label="Karar zamanı"
                value={
                  selected.approvedAt
                    ? formatDateTime(selected.approvedAt)
                    : selected.rejectedAt
                      ? formatDateTime(selected.rejectedAt)
                      : "—"
                }
              />
            </dl>
            {selected.note ? (
              <p className="mt-4 rounded-ui-control bg-surface-muted p-3 text-sm leading-6 text-content">
                {selected.note}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2 print:hidden">
              {selected.status === "DRAFT" && canCreate ? (
                <>
                  <button
                    className={secondaryButton}
                    onClick={() => setDialog("edit")}
                    type="button"
                  >
                    Taslağı düzenle
                  </button>
                  <button
                    className={primaryButton}
                    disabled={pending}
                    onClick={() => transition("submit")}
                    type="button"
                  >
                    Onaya gönder
                  </button>
                </>
              ) : null}
              {selected.status === "SUBMITTED" && canApprove ? (
                <>
                  <button
                    className={primaryButton}
                    disabled={pending}
                    onClick={() => transition("approve")}
                    type="button"
                  >
                    Transferi onayla
                  </button>
                  <button
                    className={secondaryButton}
                    disabled={pending}
                    onClick={() => transition("reject")}
                    type="button"
                  >
                    Transferi reddet
                  </button>
                </>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}

      {dialog === "create" || dialog === "edit" ? (
        <Modal
          onClose={() => setDialog(null)}
          title={dialog === "edit" ? "Transfer Taslağını Düzenle" : "Yeni Personel Transferi"}
        >
          <TransferForm
            key={`${dialog}-${selected?.id ?? "new"}`}
            lookups={lookups}
            onSubmit={submitDraft}
            pending={pending}
            transfer={dialog === "edit" ? selected : null}
          />
        </Modal>
      ) : null}
    </section>
  );
}

function TransferForm({
  lookups,
  onSubmit,
  pending,
  transfer,
}: {
  lookups: Lookups;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  transfer: EmployeeTransferRow | null;
}) {
  const [personnelCode, setPersonnelCode] = useState(
    transfer?.personnelCode ?? "",
  );
  const selectedPersonnel = lookups.personnel.find(
    (row) => row.code === personnelCode,
  );
  const sourceSiteName = transfer?.sourceSiteName ?? selectedPersonnel?.site ?? "";
  const sourceSite = lookups.sites.find((row) => row.name === sourceSiteName);

  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <Field label="Personel">
        <select
          className={inputClass}
          disabled={Boolean(transfer)}
          name="personnelCode"
          onChange={(event) => setPersonnelCode(event.target.value)}
          required
          value={personnelCode}
        >
          <option disabled value="">Personel seçin</option>
          {lookups.personnel.map((row) => (
            <option key={row.code} value={row.code}>
              {row.name} · {row.code}
            </option>
          ))}
        </select>
      </Field>
      {transfer ? (
        <input name="personnelCode" type="hidden" value={transfer.personnelCode} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kaynak şantiye">
          <input
            className={inputClass}
            disabled
            value={
              sourceSite
                ? `${sourceSite.name} · ${sourceSite.code}`
                : sourceSiteName || "Personelin güncel şantiyesi bulunamadı"
            }
          />
        </Field>
        <Field label="Hedef şantiye">
          <select
            className={inputClass}
            defaultValue={transfer?.targetSiteCode ?? ""}
            name="targetSiteCode"
            required
          >
            <option disabled value="">Hedef şantiye seçin</option>
            {lookups.sites
              .filter((row) => row.code !== sourceSite?.code)
              .map((row) => (
                <option key={row.code} value={row.code}>
                  {row.name} · {row.code}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <Field label="Yürürlük tarihi">
        <input
          className={inputClass}
          defaultValue={transfer?.effectiveDate ?? todayDateOnly()}
          name="effectiveDate"
          required
          type="date"
        />
      </Field>
      <Field label="Kısa operasyon notu">
        <textarea
          className={inputClass}
          defaultValue={transfer?.note ?? ""}
          maxLength={500}
          name="note"
          rows={3}
        />
      </Field>
      {!sourceSite ? (
        <p className="text-xs text-danger" role="alert">
          Seçilen personelin güncel şantiyesi aktif şantiye listesiyle eşleşmiyor.
        </p>
      ) : null}
      <button
        className={primaryButton}
        disabled={pending || !sourceSite}
        type="submit"
      >
        {pending ? "Kaydediliyor…" : "Taslağı kaydet"}
      </button>
    </form>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 print:hidden"
      role="dialog"
    >
      <div className="w-full max-w-2xl rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-content">{title}</h2>
          <button className={secondaryButton} onClick={onClose} type="button">
            Kapat
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-ui-control border border-divider bg-surface-muted p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-content-muted">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-bold text-content">{value}</dd>
    </div>
  );
}

function Filter({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-content-muted">
      {label}
      <select
        aria-label={label}
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-content-muted">
      {label}
      {children}
    </label>
  );
}

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-content-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-content">{value}</dd>
    </div>
  );
}

function SiteSummary({
  align = "left",
  code,
  name,
}: {
  align?: "left" | "right";
  code: string;
  name: string;
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="text-sm font-semibold text-content">{name}</p>
      <p className="mt-1 font-mono text-xs text-content-muted">{code}</p>
    </div>
  );
}

function Badge({
  children,
  tone = "brand",
}: {
  children: React.ReactNode;
  tone?: "brand" | "danger" | "success" | "warning";
}) {
  const classes = tone === "success"
    ? "bg-success-subtle text-success"
    : tone === "warning"
      ? "bg-warning-subtle text-warning"
      : tone === "danger"
        ? "bg-danger-subtle text-danger"
        : "bg-brand-subtle text-brand-primary";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>
      {children}
    </span>
  );
}

const STATUSES: EmployeeTransferStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

function statusLabel(value: EmployeeTransferStatus) {
  return {
    APPROVED: "Onaylandı",
    DRAFT: "Taslak",
    REJECTED: "Reddedildi",
    SUBMITTED: "Onay bekliyor",
  }[value];
}

function statusTone(
  value: EmployeeTransferStatus,
): "brand" | "danger" | "success" | "warning" {
  return value === "APPROVED"
    ? "success"
    : value === "SUBMITTED"
      ? "warning"
      : value === "REJECTED"
        ? "danger"
        : "brand";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function createRequestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function readErrors(result: { errors?: string[] }) {
  return result.errors?.join(" ") || "Personel transfer işlemi tamamlanamadı.";
}
