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
  approveEmployeeLeaveAction,
  cancelEmployeeLeaveAction,
  createEmployeeLeaveAction,
  getEmployeeLeaveAction,
  listEmployeeLeaveLookupsAction,
  listEmployeeLeavesAction,
  rejectEmployeeLeaveAction,
  saveEmployeeLeaveBalanceAction,
  submitEmployeeLeaveAction,
  updateEmployeeLeaveDraftAction,
} from "@/app/actions/employee-leave-actions";
import type { EmployeeLeaveStatus, EmployeeLeaveType } from "@/lib/employee-leave";
import type {
  EmployeeLeaveBalanceRow,
  EmployeeLeaveRow,
} from "@/lib/employee-leave-prisma-repository";

type Lookups = Extract<
  Awaited<ReturnType<typeof listEmployeeLeaveLookupsAction>>,
  { ok: true }
>["data"];

const inputClass =
  "min-h-11 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  "min-h-11 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "min-h-11 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function EmployeeLeaveSurface({
  canApprove,
  canCreate,
  initialLeaveId,
  isAdmin,
}: {
  canApprove: boolean;
  canCreate: boolean;
  initialLeaveId?: string;
  isAdmin: boolean;
}) {
  const [leaves, setLeaves] = useState<EmployeeLeaveRow[] | null>(null);
  const [balances, setBalances] = useState<EmployeeLeaveBalanceRow[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ documents: [], personnel: [] });
  const [selected, setSelected] = useState<EmployeeLeaveRow | null>(null);
  const [selectedId, setSelectedId] = useState(initialLeaveId ?? "");
  const [dialog, setDialog] = useState<"balance" | "create" | "edit" | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [year, setYear] = useState("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const initialLeaveIdRef = useRef(initialLeaveId);

  const refresh = useCallback(async (leaveId = selectedId) => {
    const [listResult, lookupResult] = await Promise.all([
      listEmployeeLeavesAction(),
      listEmployeeLeaveLookupsAction(),
    ]);
    if (!listResult.ok) {
      setError(readErrors(listResult));
      return;
    }
    setLeaves(listResult.data.leaves);
    setBalances(listResult.data.balances);
    if (lookupResult.ok) setLookups(lookupResult.data);
    if (!leaveId) {
      setSelected(null);
      return;
    }
    const detail = await getEmployeeLeaveAction(leaveId);
    if (detail.ok) setSelected(detail.data.leave);
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
    if (initialLeaveIdRef.current === initialLeaveId) return;
    initialLeaveIdRef.current = initialLeaveId;
    setSelectedId(initialLeaveId ?? "");
  }, [initialLeaveId]);
  useEffect(() => { if (selected) closeRef.current?.focus(); }, [selected]);

  const years = useMemo(() =>
    [...new Set((leaves ?? []).map((row) => row.startDate.slice(0, 4)))].sort().reverse(),
  [leaves]);
  const visible = useMemo(() => {
    const needle = query.toLocaleLowerCase("tr-TR");
    return (leaves ?? []).filter((row) =>
      (status === "ALL" || row.status === status)
      && (type === "ALL" || row.leaveType === type)
      && (year === "ALL" || row.startDate.startsWith(year))
      && `${row.personnelCode} ${row.personnelName} ${leaveTypeLabel(row.leaveType)} ${statusLabel(row.status)}`
        .toLocaleLowerCase("tr-TR").includes(needle));
  }, [leaves, query, status, type, year]);
  const metrics = useMemo(() => ({
    approved: leaves?.filter((row) => row.status === "APPROVED").length ?? 0,
    pending: leaves?.filter((row) => row.status === "SUBMITTED").length ?? 0,
    remaining: balances.reduce(
      (sum, row) => sum + row.openingDays + row.adjustmentDays - row.usedDays,
      0,
    ),
  }), [balances, leaves]);

  function openDetail(row: EmployeeLeaveRow, opener: HTMLElement) {
    openerRef.current = opener;
    setSelected(row);
    setSelectedId(row.id);
    setError("");
    window.history.replaceState(null, "", `/personel?leave=${encodeURIComponent(row.id)}`);
  }
  function closeDetail() {
    setSelected(null);
    setSelectedId("");
    window.history.replaceState(null, "", "/personel");
    openerRef.current?.focus();
  }

  function submitLeaveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personnelCode = value(data, "personnelCode");
    const personnelName =
      lookups.personnel.find((row) => row.code === personnelCode)?.name ?? "";
    const editing = dialog === "edit" ? selected : null;
    setError("");
    startTransition(async () => {
      const values = {
        chargeableDays: numberValue(data, "chargeableDays"),
        documentFileId: value(data, "documentFileId") || null,
        endDate: value(data, "endDate"),
        leaveType: value(data, "leaveType") as EmployeeLeaveType,
        note: value(data, "note"),
        personnelCode,
        personnelName,
        requestKey: createRequestKey(),
        startDate: value(data, "startDate"),
      };
      const result = editing
        ? await updateEmployeeLeaveDraftAction({
            ...values,
            expectedRevisionNo: editing.revisionNo,
            leaveId: editing.id,
          })
        : await createEmployeeLeaveAction(values);
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      setDialog(null);
      setSelectedId(result.data.leave.id);
      setNotice(editing ? "İzin taslağı güncellendi." : "İzin taslağı oluşturuldu.");
      window.history.replaceState(
        null,
        "",
        `/personel?leave=${encodeURIComponent(result.data.leave.id)}`,
      );
      await refresh(result.data.leave.id);
    });
  }

  function submitBalanceForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personnelCode = value(data, "personnelCode");
    const personnelName =
      lookups.personnel.find((row) => row.code === personnelCode)?.name ?? "";
    setError("");
    startTransition(async () => {
      const result = await saveEmployeeLeaveBalanceAction({
        adjustmentDays: numberValue(data, "adjustmentDays"),
        openingDays: numberValue(data, "openingDays"),
        personnelCode,
        personnelName,
        requestKey: createRequestKey(),
        year: numberValue(data, "year"),
      });
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      setDialog(null);
      setNotice("Yıllık izin bakiyesi kaydedildi.");
      await refresh();
    });
  }

  function transition(operation: "approve" | "cancel" | "reject" | "submit") {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      const input = { leaveId: selected.id, requestKey: createRequestKey() };
      const result = operation === "submit"
        ? await submitEmployeeLeaveAction(input)
        : operation === "approve"
          ? await approveEmployeeLeaveAction(input)
          : operation === "reject"
            ? await rejectEmployeeLeaveAction(input)
            : await cancelEmployeeLeaveAction(input);
      if (!result.ok) {
        setError(readErrors(result));
        return;
      }
      setNotice(`${statusLabel(result.data.leave.status)} durumu kaydedildi.`);
      await refresh(selected.id);
    });
  }

  return (
    <section aria-label="Personel İzin Yönetimi" className="mx-auto grid max-w-7xl gap-4">
      <header className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
        <div className="border-l-4 border-brand-primary p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                Faz 20 · İK operasyonu
              </p>
              <h2 className="mt-1 text-2xl font-bold text-content">Personel İzin Yönetimi</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">
                İzin taleplerini, onay akışını ve operasyonel yıllık bakiyeyi personel iş akışından ayırmadan yönetin.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              {isAdmin && canApprove ? (
                <button className={secondaryButton} onClick={() => setDialog("balance")} type="button">
                  Bakiye tanımla
                </button>
              ) : null}
              {canCreate ? (
                <button className={primaryButton} onClick={() => setDialog("create")} type="button">
                  Yeni izin
                </button>
              ) : null}
            </div>
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <Metric label="Onay bekleyen" value={metrics.pending} />
            <Metric label="Onaylı izin" value={metrics.approved} />
            <Metric label="Toplam kalan gün" value={formatDays(metrics.remaining)} />
          </dl>
        </div>
      </header>

      {notice ? <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success" role="status">{notice}</p> : null}
      {error ? <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger" role="alert">{error}</p> : null}

      <div className="grid gap-3 rounded-ui-panel border border-divider bg-surface-raised p-4 print:hidden lg:grid-cols-4">
        <label className="text-xs font-semibold text-content-muted">
          İzinlerde ara
          <input aria-label="Personel izinlerinde ara" className={`${inputClass} mt-1`} onChange={(event) => setQuery(event.target.value)} placeholder="Personel, kod, tür veya durum" value={query} />
        </label>
        <Filter label="İzin türü" onChange={setType} value={type}>
          <option value="ALL">Tüm türler</option>
          {LEAVE_TYPES.map((item) => <option key={item} value={item}>{leaveTypeLabel(item)}</option>)}
        </Filter>
        <Filter label="İzin durumu" onChange={setStatus} value={status}>
          <option value="ALL">Tüm durumlar</option>
          {LEAVE_STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </Filter>
        <Filter label="İzin yılı" onChange={setYear} value={year}>
          <option value="ALL">Tüm yıllar</option>
          {years.map((item) => <option key={item}>{item}</option>)}
        </Filter>
      </div>

      {leaves === null ? (
        <p className="rounded-ui-panel border border-divider bg-surface-raised p-6 text-sm text-content-muted" role="status">İzin kayıtları yükleniyor…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-ui-panel border border-dashed border-divider bg-surface-raised p-8 text-center text-sm text-content-muted">Filtrelerle eşleşen izin kaydı bulunmuyor.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((row) => (
            <article className={`rounded-ui-panel border bg-surface-raised p-4 shadow-sm print:break-inside-avoid print:shadow-none ${row.status === "SUBMITTED" ? "border-l-4 border-l-warning" : "border-divider"}`} key={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-brand-primary">{row.personnelCode}</p>
                  <h3 className="text-base font-bold text-content">{row.personnelName}</h3>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge>{leaveTypeLabel(row.leaveType)}</Badge>
                  <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <LabelValue label="Tarih" value={`${formatDate(row.startDate)} – ${formatDate(row.endDate)}`} />
                <LabelValue label="Gün" value={formatDays(row.chargeableDays)} />
              </dl>
              <button className={`${secondaryButton} mt-3 w-full print:hidden`} onClick={(event) => openDetail(row, event.currentTarget)} type="button" aria-label={`${row.personnelName} izin detayını aç`}>
                Detayı görüntüle
              </button>
            </article>
          ))}
        </div>
      )}

      <section aria-label="Yıllık İzin Bakiyeleri" className="rounded-ui-panel border border-divider bg-surface-raised p-4 print:break-inside-avoid">
        <h3 className="text-lg font-bold text-content">Yıllık İzin Bakiyeleri</h3>
        <p className="mt-1 text-sm text-content-muted">Bu değerler operasyonel planlama içindir; yasal hak ediş hesabı değildir.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-divider text-xs uppercase tracking-wide text-content-muted">
              <tr><th className="px-3 py-2">Personel</th><th className="px-3 py-2">Yıl</th><th className="px-3 py-2">Açılış</th><th className="px-3 py-2">Düzeltme</th><th className="px-3 py-2">Kullanılan</th><th className="px-3 py-2">Kalan</th></tr>
            </thead>
            <tbody>
              {balances.map((row) => (
                <tr className="border-b border-divider/70" key={row.id}>
                  <td className="px-3 py-2 font-semibold text-content">{row.personnelName}<span className="block text-xs font-normal text-content-muted">{row.personnelCode}</span></td>
                  <td className="px-3 py-2">{row.year}</td>
                  <td className="px-3 py-2">{formatDays(row.openingDays)}</td>
                  <td className="px-3 py-2">{formatDays(row.adjustmentDays)}</td>
                  <td className="px-3 py-2">{formatDays(row.usedDays)}</td>
                  <td className="px-3 py-2 font-bold text-brand-primary">{formatDays(row.openingDays + row.adjustmentDays - row.usedDays)}</td>
                </tr>
              ))}
              {balances.length === 0 ? <tr><td className="px-3 py-5 text-content-muted" colSpan={6}>Henüz yıllık izin bakiyesi tanımlanmadı.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 print:static print:bg-transparent" role="dialog" aria-modal="true">
          <article aria-label={`${selected.personnelName} izin detayı`} className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-2xl sm:border-l sm:border-divider sm:p-6 print:max-w-none print:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-semibold text-brand-primary">{selected.personnelCode}</p><h2 className="text-xl font-bold text-content">{selected.personnelName}</h2></div>
              <button className={`${secondaryButton} print:hidden`} onClick={closeDetail} ref={closeRef} type="button">Kapat</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Badge>{leaveTypeLabel(selected.leaveType)}</Badge><Badge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</Badge></div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <LabelValue label="Başlangıç" value={formatDate(selected.startDate)} />
              <LabelValue label="Bitiş" value={formatDate(selected.endDate)} />
              <LabelValue label="İzin gün sayısı" value={formatDays(selected.chargeableDays)} />
              <LabelValue label="Revizyon" value={String(selected.revisionNo)} />
              <LabelValue label="Belge referansı" value={selected.documentFileId || "Yok"} />
            </dl>
            {selected.note ? <p className="mt-4 rounded-ui-control bg-surface-muted p-3 text-sm leading-6 text-content">{selected.note}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2 print:hidden">
              {selected.status === "DRAFT" && canCreate ? (
                <>
                  <button className={secondaryButton} onClick={() => setDialog("edit")} type="button">Taslağı düzenle</button>
                  <button className={primaryButton} disabled={pending} onClick={() => transition("submit")} type="button">Onaya gönder</button>
                </>
              ) : null}
              {selected.status === "SUBMITTED" && canApprove ? (
                <>
                  <button className={primaryButton} disabled={pending} onClick={() => transition("approve")} type="button">Onayla</button>
                  <button className={secondaryButton} disabled={pending} onClick={() => transition("reject")} type="button">Reddet</button>
                </>
              ) : null}
              {selected.status === "APPROVED" && canApprove ? <button className={secondaryButton} disabled={pending} onClick={() => transition("cancel")} type="button">İzni iptal et</button> : null}
            </div>
          </article>
        </div>
      ) : null}

      {dialog === "create" || dialog === "edit" ? (
        <Modal title={dialog === "edit" ? "İzin Taslağını Düzenle" : "Yeni İzin Taslağı"} onClose={() => setDialog(null)}>
          <LeaveForm key={`${dialog}-${selected?.id ?? "new"}`} leave={dialog === "edit" ? selected : null} lookups={lookups} onSubmit={submitLeaveForm} pending={pending} />
        </Modal>
      ) : null}
      {dialog === "balance" ? (
        <Modal title="Yıllık İzin Bakiyesi" onClose={() => setDialog(null)}>
          <BalanceForm lookups={lookups} onSubmit={submitBalanceForm} pending={pending} />
        </Modal>
      ) : null}
    </section>
  );
}

function LeaveForm({ leave, lookups, onSubmit, pending }: {
  leave: EmployeeLeaveRow | null;
  lookups: Lookups;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <Field label="Personel"><select className={inputClass} defaultValue={leave?.personnelCode ?? ""} name="personnelCode" required><option disabled value="">Personel seçin</option>{lookups.personnel.map((row) => <option key={row.code} value={row.code}>{row.name} · {row.code}</option>)}</select></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="İzin türü"><select className={inputClass} defaultValue={leave?.leaveType ?? "ANNUAL"} name="leaveType">{LEAVE_TYPES.map((item) => <option key={item} value={item}>{leaveTypeLabel(item)}</option>)}</select></Field>
        <Field label="İzin gün sayısı"><input className={inputClass} defaultValue={leave?.chargeableDays ?? 1} min="0.5" name="chargeableDays" required step="0.5" type="number" /></Field>
        <Field label="Başlangıç tarihi"><input className={inputClass} defaultValue={leave?.startDate ?? ""} name="startDate" required type="date" /></Field>
        <Field label="Bitiş tarihi"><input className={inputClass} defaultValue={leave?.endDate ?? ""} name="endDate" required type="date" /></Field>
      </div>
      <Field label="İzin belgesi (isteğe bağlı)"><select className={inputClass} defaultValue={leave?.documentFileId ?? ""} name="documentFileId"><option value="">Belge seçilmedi</option>{lookups.documents.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
      <Field label="Kısa açıklama"><textarea className={inputClass} defaultValue={leave?.note ?? ""} maxLength={500} name="note" rows={3} /></Field>
      <button className={primaryButton} disabled={pending} type="submit">{pending ? "Kaydediliyor…" : "Taslağı kaydet"}</button>
    </form>
  );
}

function BalanceForm({ lookups, onSubmit, pending }: {
  lookups: Lookups;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <Field label="Personel"><select className={inputClass} defaultValue="" name="personnelCode" required><option disabled value="">Personel seçin</option>{lookups.personnel.map((row) => <option key={row.code} value={row.code}>{row.name} · {row.code}</option>)}</select></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Yıl"><input className={inputClass} defaultValue={new Date().getFullYear()} min="2000" name="year" required type="number" /></Field>
        <Field label="Açılış günü"><input className={inputClass} defaultValue="14" min="0" name="openingDays" required step="0.5" type="number" /></Field>
        <Field label="Düzeltme günü"><input className={inputClass} defaultValue="0" name="adjustmentDays" required step="0.5" type="number" /></Field>
      </div>
      <button className={primaryButton} disabled={pending} type="submit">{pending ? "Kaydediliyor…" : "Bakiyeyi kaydet"}</button>
    </form>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 print:hidden" role="dialog" aria-modal="true" aria-label={title}><div className="w-full max-w-xl rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-xl sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-content">{title}</h2><button className={secondaryButton} onClick={onClose} type="button">Kapat</button></div>{children}</div></div>;
}
function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-ui-control border border-divider bg-surface-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</dt><dd className="mt-1 text-xl font-bold text-content">{value}</dd></div>;
}
function Filter({ children, label, onChange, value }: { children: React.ReactNode; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="text-xs font-semibold text-content-muted">{label}<select aria-label={label} className={`${inputClass} mt-1`} onChange={(event) => onChange(event.target.value)} value={value}>{children}</select></label>;
}
function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-content-muted">{label}{children}</label>;
}
function LabelValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</dt><dd className="mt-1 text-sm text-content">{value}</dd></div>;
}
function Badge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "danger" | "success" | "warning" }) {
  const classes = tone === "success" ? "bg-success-subtle text-success" : tone === "warning" ? "bg-warning-subtle text-warning" : tone === "danger" ? "bg-danger-subtle text-danger" : "bg-brand-subtle text-brand-primary";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{children}</span>;
}

const LEAVE_TYPES: EmployeeLeaveType[] = ["ANNUAL", "EXCUSE", "SICK", "MATERNITY", "PATERNITY", "UNPAID"];
const LEAVE_STATUSES: EmployeeLeaveStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "CANCELLED"];
function leaveTypeLabel(value: EmployeeLeaveType) {
  return { ANNUAL: "Yıllık", EXCUSE: "Mazeret", MATERNITY: "Doğum", PATERNITY: "Babalık", SICK: "Hastalık", UNPAID: "Ücretsiz" }[value];
}
function statusLabel(value: EmployeeLeaveStatus) {
  return { APPROVED: "Onaylandı", CANCELLED: "İptal edildi", DRAFT: "Taslak", REJECTED: "Reddedildi", SUBMITTED: "Onay bekliyor" }[value];
}
function statusTone(value: EmployeeLeaveStatus): "brand" | "danger" | "success" | "warning" {
  return value === "APPROVED" ? "success" : value === "SUBMITTED" ? "warning" : value === "REJECTED" || value === "CANCELLED" ? "danger" : "brand";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}
function formatDays(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
}
function value(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function numberValue(data: FormData, key: string) { return Number(value(data, key)); }
function createRequestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}
function readErrors(result: { errors?: string[] }) {
  return result.errors?.join(" ") || "İzin işlemi tamamlanamadı.";
}
