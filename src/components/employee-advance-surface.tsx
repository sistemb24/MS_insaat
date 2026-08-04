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
  cancelEmployeeAdvanceAction,
  createEmployeeAdvanceAction,
  financeApproveEmployeeAdvanceAction,
  financeRejectEmployeeAdvanceAction,
  getEmployeeAdvanceAction,
  listEmployeeAdvanceLookupsAction,
  listEmployeeAdvancesAction,
  managerApproveEmployeeAdvanceAction,
  managerRejectEmployeeAdvanceAction,
  payEmployeeAdvanceAction,
  settleEmployeeAdvanceAction,
  submitEmployeeAdvanceAction,
  updateEmployeeAdvanceDraftAction,
} from "@/app/actions/employee-advance-actions";
import type { EmployeeAdvanceStatus } from "@/lib/employee-advance";
import type {
  EmployeeAdvanceRow,
  PayrollAdvanceDeductionRow,
} from "@/lib/employee-advance-prisma-repository";

type Lookups = Extract<
  Awaited<ReturnType<typeof listEmployeeAdvanceLookupsAction>>,
  { ok: true }
>["data"];
type Dialog = "create" | "edit" | "finance" | "pay" | "settle" | null;

const inputClass =
  "min-h-11 w-full rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm text-content outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
const primaryButton =
  "min-h-11 rounded-ui-control border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButton =
  "min-h-11 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-sm font-semibold text-content transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

export function EmployeeAdvanceSurface({
  canCreate,
  initialAdvanceId,
  isAccounting,
  isAdmin,
}: {
  canCreate: boolean;
  initialAdvanceId?: string;
  isAccounting: boolean;
  isAdmin: boolean;
}) {
  const [advances, setAdvances] = useState<EmployeeAdvanceRow[] | null>(null);
  const [lookups, setLookups] = useState<Lookups>({
    accounts: [],
    payrollDeductions: [],
    personnel: [],
  });
  const [selected, setSelected] = useState<EmployeeAdvanceRow | null>(null);
  const [selectedId, setSelectedId] = useState(initialAdvanceId ?? "");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const initialAdvanceIdRef = useRef(initialAdvanceId);

  const refresh = useCallback(async (advanceId = selectedId) => {
    const [listResult, lookupResult] = await Promise.all([
      listEmployeeAdvancesAction(),
      listEmployeeAdvanceLookupsAction(),
    ]);
    if (!listResult.ok) {
      setError(readErrors(listResult));
      return;
    }
    setAdvances(listResult.data.advances);
    if (lookupResult.ok) setLookups(lookupResult.data);
    if (!advanceId) {
      setSelected(null);
      return;
    }
    const detail = await getEmployeeAdvanceAction(advanceId);
    if (detail.ok) setSelected(detail.data.advance);
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
    if (initialAdvanceIdRef.current === initialAdvanceId) return;
    initialAdvanceIdRef.current = initialAdvanceId;
    setSelectedId(initialAdvanceId ?? "");
  }, [initialAdvanceId]);
  useEffect(() => { if (selected) closeRef.current?.focus(); }, [selected]);

  const visible = useMemo(() => {
    const needle = query.toLocaleLowerCase("tr-TR");
    return (advances ?? []).filter((row) =>
      (status === "ALL" || row.status === status)
      && `${row.personnelCode} ${row.personnelName} ${statusLabel(row.status)}`
        .toLocaleLowerCase("tr-TR")
        .includes(needle));
  }, [advances, query, status]);
  const metrics = useMemo(() => ({
    openBalance: (advances ?? [])
      .filter((row) => row.status === "PAID")
      .reduce(
        (sum, row) => sum + (row.approvedAmount ?? 0) - row.settledAmount,
        0,
      ),
    pendingFinance:
      advances?.filter((row) => row.status === "MANAGER_APPROVED").length ?? 0,
    pendingManager:
      advances?.filter((row) => row.status === "SUBMITTED").length ?? 0,
  }), [advances]);

  function openDetail(row: EmployeeAdvanceRow, opener: HTMLElement) {
    openerRef.current = opener;
    setSelected(row);
    setSelectedId(row.id);
    setError("");
    window.history.replaceState(null, "", `/personel?advance=${encodeURIComponent(row.id)}`);
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
    const personnelName =
      lookups.personnel.find((row) => row.code === personnelCode)?.name ?? "";
    const editing = dialog === "edit" ? selected : null;
    run(async () => {
      const values = {
        note: value(data, "note"),
        personnelCode,
        personnelName,
        requestDate: value(data, "requestDate"),
        requestedAmount: numberValue(data, "requestedAmount"),
        requestKey: createRequestKey(),
      };
      const result = editing
        ? await updateEmployeeAdvanceDraftAction({
            ...values,
            advanceId: editing.id,
            expectedRevisionNo: editing.revisionNo,
          })
        : await createEmployeeAdvanceAction(values);
      if (!result.ok) return fail(result);
      await finish(
        result.data.advance,
        editing ? "Avans taslağı güncellendi." : "Avans taslağı oluşturuldu.",
      );
    });
  }

  function submitFinance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    run(async () => {
      const result = await financeApproveEmployeeAdvanceAction({
        advanceId: selected.id,
        approvedAmount: numberValue(data, "approvedAmount"),
        expectedRevisionNo: selected.revisionNo,
        requestKey: createRequestKey(),
      });
      if (!result.ok) return fail(result);
      await finish(result.data.advance, "Finans onayı kaydedildi.");
    });
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const accountCode = value(data, "accountCode");
    const account = lookups.accounts.find((row) => row.code === accountCode);
    run(async () => {
      const result = await payEmployeeAdvanceAction({
        account: { code: accountCode, name: account?.name ?? "" },
        advanceId: selected.id,
        expectedRevisionNo: selected.revisionNo,
        paymentDate: value(data, "paymentDate"),
        requestKey: createRequestKey(),
      });
      if (!result.ok) return fail(result);
      await finish(result.data.advance, "Avans ödemesi ve yevmiye kaydı oluşturuldu.");
    });
  }

  function submitSettlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    run(async () => {
      const result = await settleEmployeeAdvanceAction({
        advanceId: selected.id,
        amount: numberValue(data, "amount"),
        payrollAccrualId: value(data, "payrollAccrualId"),
        payrollLinePersonCode: selected.personnelCode,
        requestKey: createRequestKey(),
        settlementDate: value(data, "settlementDate"),
      });
      if (!result.ok) return fail(result);
      await finish(result.data.advance, "Bordro avans kesintisi mahsup edildi.");
    });
  }

  function transition(
    operation:
      | "cancel"
      | "finance-reject"
      | "manager-approve"
      | "manager-reject"
      | "submit",
  ) {
    if (!selected) return;
    run(async () => {
      const input = { advanceId: selected.id, requestKey: createRequestKey() };
      const result = operation === "submit"
        ? await submitEmployeeAdvanceAction(input)
        : operation === "manager-approve"
          ? await managerApproveEmployeeAdvanceAction(input)
          : operation === "manager-reject"
            ? await managerRejectEmployeeAdvanceAction(input)
            : operation === "finance-reject"
              ? await financeRejectEmployeeAdvanceAction(input)
              : await cancelEmployeeAdvanceAction(input);
      if (!result.ok) return fail(result);
      await finish(
        result.data.advance,
        `${statusLabel(result.data.advance.status)} durumu kaydedildi.`,
      );
    });
  }

  function run(task: () => Promise<void>) {
    setError("");
    startTransition(task);
  }
  function fail(result: { errors?: string[] }) {
    setError(readErrors(result));
  }
  async function finish(advance: EmployeeAdvanceRow, message: string) {
    setDialog(null);
    setSelectedId(advance.id);
    setNotice(message);
    window.history.replaceState(
      null,
      "",
      `/personel?advance=${encodeURIComponent(advance.id)}`,
    );
    await refresh(advance.id);
  }

  const selectedPayroll = selected
    ? lookups.payrollDeductions.filter((row) =>
        row.personnelCode === selected.personnelCode && row.availableAmount > 0)
    : [];

  return (
    <section aria-label="Personel Avans Yönetimi" className="mx-auto grid max-w-7xl gap-4">
      <header className="rounded-ui-panel border border-divider bg-surface-raised shadow-sm print:shadow-none">
        <div className="border-l-4 border-brand-primary p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                Faz 21 · İK ve finans operasyonu
              </p>
              <h2 className="mt-1 text-2xl font-bold text-content">
                Personel Avans Yönetimi
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-content-muted">
                Talepleri yönetici ve finans onayından ödemeye, mevcut bordro
                kesintisi üzerinden kontrollü mahsuba kadar izleyin.
              </p>
            </div>
            {canCreate ? (
              <button
                className={`${primaryButton} print:hidden`}
                onClick={() => setDialog("create")}
                type="button"
              >
                Yeni avans talebi
              </button>
            ) : null}
          </div>
          <dl className="mt-4 grid gap-2 sm:grid-cols-3">
            <Metric label="Yönetici bekleyen" value={metrics.pendingManager} />
            <Metric label="Finans bekleyen" value={metrics.pendingFinance} />
            <Metric label="Açık personel alacağı" value={formatMoney(metrics.openBalance)} />
          </dl>
        </div>
      </header>

      {notice ? (
        <p className="rounded-ui-control border border-success/30 bg-success-subtle p-3 text-sm text-success" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-ui-control border border-danger/30 bg-danger-subtle p-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 rounded-ui-panel border border-divider bg-surface-raised p-4 print:hidden md:grid-cols-2">
        <Field label="Avanslarda ara">
          <input
            aria-label="Personel avanslarında ara"
            className={inputClass}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Personel, kod veya durum"
            value={query}
          />
        </Field>
        <Field label="Avans durumu">
          <select
            aria-label="Avans durumu"
            className={inputClass}
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="ALL">Tüm durumlar</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </select>
        </Field>
      </div>

      {advances === null ? (
        <p className="rounded-ui-panel border border-divider bg-surface-raised p-6 text-sm text-content-muted" role="status">
          Avans kayıtları yükleniyor…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-ui-panel border border-dashed border-divider bg-surface-raised p-8 text-center text-sm text-content-muted">
          Filtrelerle eşleşen avans kaydı bulunmuyor.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((row) => (
            <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm print:break-inside-avoid print:shadow-none" key={row.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-brand-primary">{row.personnelCode}</p>
                  <h3 className="text-lg font-bold text-content">{row.personnelName}</h3>
                </div>
                <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <LabelValue label="Talep tarihi" value={formatDate(row.requestDate)} />
                <LabelValue label="Talep tutarı" value={formatMoney(row.requestedAmount)} />
                <LabelValue
                  label="Onaylanan"
                  value={row.approvedAmount ? formatMoney(row.approvedAmount) : "—"}
                />
                <LabelValue
                  label="Kalan"
                  value={row.approvedAmount
                    ? formatMoney(row.approvedAmount - row.settledAmount)
                    : "—"}
                />
              </dl>
              <button
                aria-label={`${row.personnelName} ${statusLabel(row.status)} avans detayını aç`}
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
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 print:static print:bg-transparent" role="dialog" aria-modal="true">
          <article aria-label={`${selected.personnelName} avans detayı`} className="h-full w-full overflow-y-auto bg-surface-raised p-4 shadow-xl sm:max-w-2xl sm:border-l sm:border-divider sm:p-6 print:max-w-none print:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand-primary">{selected.personnelCode}</p>
                <h2 className="text-xl font-bold text-content">{selected.personnelName}</h2>
              </div>
              <button className={`${secondaryButton} print:hidden`} onClick={closeDetail} ref={closeRef} type="button">
                Kapat
              </button>
            </div>
            <div className="mt-3"><Badge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</Badge></div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <LabelValue label="Talep tarihi" value={formatDate(selected.requestDate)} />
              <LabelValue label="Talep tutarı" value={formatMoney(selected.requestedAmount)} />
              <LabelValue label="Finans onayı" value={selected.approvedAmount ? formatMoney(selected.approvedAmount) : "—"} />
              <LabelValue label="Mahsup edilen" value={formatMoney(selected.settledAmount)} />
              <LabelValue label="Ödeme tarihi" value={selected.paymentDate ? formatDate(selected.paymentDate) : "—"} />
              <LabelValue label="Ödeme hesabı" value={selected.paymentAccountName || "—"} />
              <LabelValue label="Kasa/banka hareketi" value={selected.paymentMovementId || "—"} />
              <LabelValue label="Yevmiye kaydı" value={selected.paymentLedgerEntryId || "—"} />
            </dl>
            {selected.note ? (
              <p className="mt-4 rounded-ui-control bg-surface-muted p-3 text-sm leading-6 text-content">
                {selected.note}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2 print:hidden">
              {selected.status === "DRAFT" && canCreate ? (
                <>
                  <button className={secondaryButton} onClick={() => setDialog("edit")} type="button">Taslağı düzenle</button>
                  <button className={primaryButton} disabled={pending} onClick={() => transition("submit")} type="button">Onaya gönder</button>
                </>
              ) : null}
              {selected.status === "SUBMITTED" && isAdmin ? (
                <>
                  <button className={primaryButton} disabled={pending} onClick={() => transition("manager-approve")} type="button">Yönetici onayı</button>
                  <button className={secondaryButton} disabled={pending} onClick={() => transition("manager-reject")} type="button">Yönetici reddi</button>
                </>
              ) : null}
              {selected.status === "MANAGER_APPROVED" && isAccounting ? (
                <>
                  <button className={primaryButton} onClick={() => setDialog("finance")} type="button">Finans onayı</button>
                  <button className={secondaryButton} disabled={pending} onClick={() => transition("finance-reject")} type="button">Finans reddi</button>
                </>
              ) : null}
              {selected.status === "FINANCE_APPROVED" && isAccounting ? (
                <>
                  <button className={primaryButton} onClick={() => setDialog("pay")} type="button">Ödemeyi oluştur</button>
                  <button className={secondaryButton} disabled={pending} onClick={() => transition("cancel")} type="button">Talebi iptal et</button>
                </>
              ) : null}
              {selected.status === "PAID" && isAccounting && selectedPayroll.length > 0 ? (
                <button className={primaryButton} onClick={() => setDialog("settle")} type="button">Bordrodan mahsup et</button>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}

      {dialog === "create" || dialog === "edit" ? (
        <Modal onClose={() => setDialog(null)} title={dialog === "edit" ? "Avans Taslağını Düzenle" : "Yeni Avans Talebi"}>
          <DraftForm
            advance={dialog === "edit" ? selected : null}
            lookups={lookups}
            onSubmit={submitDraft}
            pending={pending}
          />
        </Modal>
      ) : null}
      {dialog === "finance" && selected ? (
        <Modal onClose={() => setDialog(null)} title="Finans Onayı">
          <form className="grid gap-3" onSubmit={submitFinance}>
            <Field label="Onay tutarı">
              <input className={inputClass} defaultValue={selected.requestedAmount} max={selected.requestedAmount} min="0.01" name="approvedAmount" required step="0.01" type="number" />
            </Field>
            <button className={primaryButton} disabled={pending} type="submit">Finans onayını kaydet</button>
          </form>
        </Modal>
      ) : null}
      {dialog === "pay" ? (
        <Modal onClose={() => setDialog(null)} title="Avans Ödemesi">
          <form className="grid gap-3" onSubmit={submitPayment}>
            <Field label="Kasa/banka hesabı">
              <select className={inputClass} defaultValue="" name="accountCode" required>
                <option disabled value="">Hesap seçin</option>
                {lookups.accounts.map((row) => <option key={row.code} value={row.code}>{row.name} · {row.code}</option>)}
              </select>
            </Field>
            <Field label="Ödeme tarihi">
              <input className={inputClass} defaultValue={today()} name="paymentDate" required type="date" />
            </Field>
            <p className="text-xs leading-5 text-content-muted">Ödeme, 135 Personel Avansları borç ve seçilen hesabın alacağı olarak tek kaynak bağıyla kaydedilir.</p>
            <button className={primaryButton} disabled={pending} type="submit">Ödeme ve yevmiye oluştur</button>
          </form>
        </Modal>
      ) : null}
      {dialog === "settle" && selected ? (
        <Modal onClose={() => setDialog(null)} title="Bordro Kesintisi Mahsubu">
          <SettlementForm
            advance={selected}
            onSubmit={submitSettlement}
            payrollRows={selectedPayroll}
            pending={pending}
          />
        </Modal>
      ) : null}
    </section>
  );
}

function DraftForm({
  advance,
  lookups,
  onSubmit,
  pending,
}: {
  advance: EmployeeAdvanceRow | null;
  lookups: Lookups;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <Field label="Personel">
        <select className={inputClass} defaultValue={advance?.personnelCode ?? ""} name="personnelCode" required>
          <option disabled value="">Personel seçin</option>
          {lookups.personnel.map((row) => <option key={row.code} value={row.code}>{row.name} · {row.code}</option>)}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Talep tarihi"><input className={inputClass} defaultValue={advance?.requestDate ?? today()} name="requestDate" required type="date" /></Field>
        <Field label="Talep tutarı"><input className={inputClass} defaultValue={advance?.requestedAmount ?? ""} min="0.01" name="requestedAmount" required step="0.01" type="number" /></Field>
      </div>
      <Field label="Kısa açıklama"><textarea className={inputClass} defaultValue={advance?.note ?? ""} maxLength={500} name="note" rows={3} /></Field>
      <button className={primaryButton} disabled={pending} type="submit">{pending ? "Kaydediliyor…" : "Taslağı kaydet"}</button>
    </form>
  );
}

function SettlementForm({
  advance,
  onSubmit,
  payrollRows,
  pending,
}: {
  advance: EmployeeAdvanceRow;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  payrollRows: PayrollAdvanceDeductionRow[];
  pending: boolean;
}) {
  const max = Math.min(
    (advance.approvedAmount ?? 0) - advance.settledAmount,
    ...payrollRows.map((row) => row.availableAmount),
  );
  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <Field label="Kesinleşmiş bordro">
        <select className={inputClass} defaultValue="" name="payrollAccrualId" required>
          <option disabled value="">Bordro seçin</option>
          {payrollRows.map((row) => (
            <option key={row.payrollAccrualId} value={row.payrollAccrualId}>
              {row.documentNo} · kullanılabilir {formatMoney(row.availableAmount)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mahsup tutarı"><input className={inputClass} defaultValue={max} max={max} min="0.01" name="amount" required step="0.01" type="number" /></Field>
        <Field label="Mahsup tarihi"><input className={inputClass} defaultValue={today()} name="settlementDate" required type="date" /></Field>
      </div>
      <p className="text-xs leading-5 text-content-muted">Bu tahsis bordro satırını veya bordro yevmiyesini değiştirmez; yalnız mevcut avans kesintisini açık avansa bağlar.</p>
      <button className={primaryButton} disabled={pending} type="submit">Mahsubu kaydet</button>
    </form>
  );
}

function Modal({ children, onClose, title }: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 print:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-xl rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-content">{title}</h2>
          <button className={secondaryButton} onClick={onClose} type="button">Kapat</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-ui-control border border-divider bg-surface-muted p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</dt><dd className="mt-1 text-xl font-bold text-content">{value}</dd></div>;
}
function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="grid gap-1 text-xs font-semibold text-content-muted">{label}{children}</label>;
}
function LabelValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</dt><dd className="mt-1 break-words text-sm text-content">{value}</dd></div>;
}
function Badge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "danger" | "success" | "warning" }) {
  const classes = tone === "success" ? "bg-success-subtle text-success" : tone === "warning" ? "bg-warning-subtle text-warning" : tone === "danger" ? "bg-danger-subtle text-danger" : "bg-brand-subtle text-brand-primary";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{children}</span>;
}

const STATUSES: EmployeeAdvanceStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "MANAGER_APPROVED",
  "FINANCE_APPROVED",
  "PAID",
  "SETTLED",
  "REJECTED",
  "CANCELLED",
];
function statusLabel(value: EmployeeAdvanceStatus) {
  return {
    CANCELLED: "İptal edildi",
    DRAFT: "Taslak",
    FINANCE_APPROVED: "Finans onaylı",
    MANAGER_APPROVED: "Yönetici onaylı",
    PAID: "Ödendi · açık",
    REJECTED: "Reddedildi",
    SETTLED: "Mahsup tamamlandı",
    SUBMITTED: "Yönetici bekliyor",
  }[value];
}
function statusTone(value: EmployeeAdvanceStatus): "brand" | "danger" | "success" | "warning" {
  return value === "SETTLED" ? "success" : value === "SUBMITTED" || value === "MANAGER_APPROVED" || value === "FINANCE_APPROVED" || value === "PAID" ? "warning" : value === "REJECTED" || value === "CANCELLED" ? "danger" : "brand";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", { currency: "TRY", style: "currency" }).format(value);
}
function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}
function numberValue(data: FormData, key: string) {
  return Number(value(data, key));
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function createRequestKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}
function readErrors(result: { errors?: string[] }) {
  return result.errors?.join(" ") || "Avans işlemi tamamlanamadı.";
}
