"use client";

import { useMemo, useState, useTransition } from "react";

import type {
  CashBankAccountOption,
  CashBankMovementRow,
} from "@/lib/cash-bank-movement-service";
import type { PayrollAccrualRow } from "@/lib/payroll-accrual-service";
import type { TimesheetRow } from "@/lib/timesheet-service";

type PayrollAccrualMutationResult =
  | { ok: true; data: PayrollAccrualRow; errors?: never }
  | { ok: false; errors: string[]; data?: never };

type PayrollAccrualPersistence = {
  cancelPayrollAccrual?: (id: string) => Promise<PayrollAccrualMutationResult>;
  createPayrollAccrualFromTimesheet?: (
    timesheetId: string,
  ) => Promise<PayrollAccrualMutationResult>;
  payPayrollAccrual?: (
    id: string,
    account?: CashBankAccountOption,
  ) => Promise<PayrollPaymentMutationResult>;
  postPayrollAccrual?: (id: string) => Promise<PayrollAccrualMutationResult>;
  reversePayrollAccrual?: (id: string) => Promise<PayrollAccrualMutationResult>;
};

type PayrollPaymentMutationResult =
  | { ok: true; data: CashBankMovementRow; errors?: never }
  | { ok: false; errors: string[]; data?: never };

type PayrollAccrualSurfaceProps = {
  accountOptions?: CashBankAccountOption[];
  canReverse?: boolean;
  highlightedDocumentNo?: string;
  paymentMovements?: CashBankMovementRow[];
  persistence?: PayrollAccrualPersistence;
  rows: PayrollAccrualRow[];
  sourceTimesheets: TimesheetRow[];
};

type PayrollFilter = "Tümü" | "Taslak" | "Ödeme Bekleyen" | "Ödendi" | "İptal";

const payrollFilters: { label: string; value: PayrollFilter }[] = [
  { label: "Tümü", value: "Tümü" },
  { label: "Taslak", value: "Taslak" },
  { label: "Ödeme Bekleyenler", value: "Ödeme Bekleyen" },
  { label: "Ödenmiş", value: "Ödendi" },
  { label: "İptal Kayıtları", value: "İptal" },
];

export function PayrollAccrualSurface({
  accountOptions = [],
  canReverse = false,
  highlightedDocumentNo,
  paymentMovements = [],
  persistence = {},
  rows,
  sourceTimesheets,
}: PayrollAccrualSurfaceProps) {
  const [localRows, setLocalRows] = useState(rows);
  const [localPaymentMovements, setLocalPaymentMovements] =
    useState(paymentMovements);
  const [paymentAccountCode, setPaymentAccountCode] = useState(
    accountOptions[0]?.code ?? "",
  );
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PayrollFilter>("Tümü");
  const [isPending, startTransition] = useTransition();
  const sourceIds = useMemo(
    () => new Set(localRows.map((row) => row.sourceTimesheetId)),
    [localRows],
  );
  const availableTimesheets = useMemo(
    () =>
      sourceTimesheets.filter(
        (row) => row.status === "Kaydedildi" && !sourceIds.has(row.id),
      ),
    [sourceIds, sourceTimesheets],
  );
  const visibleRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");

    return localRows.filter((row) => {
      const paymentMovement = getPayrollPayment(localPaymentMovements, row.id);
      const matchesStatus =
        statusFilter === "Tümü" ||
        (statusFilter === "Ödendi" && Boolean(paymentMovement)) ||
        (statusFilter === "Ödeme Bekleyen" &&
          row.status === "Kaydedildi" &&
          !paymentMovement) ||
        (statusFilter === "Taslak" && row.status === "Taslak") ||
        (statusFilter === "İptal" && row.status === "İptal");
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          row.documentNo,
          row.sourceTimesheetNo,
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
  }, [localPaymentMovements, localRows, search, statusFilter]);
  const summary = useMemo(
    () => {
      const paidRows = visibleRows.filter((row) =>
        getPayrollPayment(localPaymentMovements, row.id),
      );
      const paymentWaitingRows = visibleRows.filter(
        (row) =>
          row.status === "Kaydedildi" &&
          !getPayrollPayment(localPaymentMovements, row.id),
      );

      return {
        deductionTotal: visibleRows.reduce(
          (total, row) => total + row.deductionTotal,
          0,
        ),
        netTotal: visibleRows.reduce((total, row) => total + row.netTotal, 0),
        openCount: visibleRows.filter((row) => row.status === "Taslak").length,
        paidCount: paidRows.length,
        paymentWaitingCount: paymentWaitingRows.length,
        pendingTimesheetCount: availableTimesheets.length,
      };
    },
    [availableTimesheets.length, localPaymentMovements, visibleRows],
  );

  function handleCreate(timesheetId: string) {
    if (!persistence.createPayrollAccrualFromTimesheet) {
      setMessage("Maaş tahakkuku bağlantısı hazır değil.");
      return;
    }

    startTransition(async () => {
      const result =
        await persistence.createPayrollAccrualFromTimesheet?.(timesheetId);

      if (!result) {
        return;
      }

      if (!result.ok) {
        setMessage(result.errors.join(" "));
        return;
      }

      setLocalRows((current) => [result.data, ...current]);
      setMessage("Maaş tahakkuku oluşturuldu.");
    });
  }

  function mutateStatus(id: string, action: "cancel" | "post") {
    const mutation =
      action === "post"
        ? persistence.postPayrollAccrual
        : persistence.cancelPayrollAccrual;

    if (!mutation) {
      setMessage("Maaş tahakkuku durum bağlantısı hazır değil.");
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
        action === "post"
          ? "Maaş tahakkuku kesinleştirildi."
          : "Maaş tahakkuku iptal edildi.",
      );
    });
  }

  function handlePay(id: string) {
    if (!persistence.payPayrollAccrual) {
      setMessage("Maaş ödeme bağlantısı hazır değil.");
      return;
    }

    startTransition(async () => {
      const selectedAccount = accountOptions.find(
        (account) => account.code === paymentAccountCode,
      );
      const result = selectedAccount
        ? await persistence.payPayrollAccrual?.(id, selectedAccount)
        : await persistence.payPayrollAccrual?.(id);

      if (!result) {
        return;
      }

      if (!result.ok) {
        setMessage(result.errors.join(" "));
        return;
      }

      setLocalPaymentMovements((current) => [result.data, ...current]);
      setMessage("Maaş ödeme hareketi oluşturuldu.");
    });
  }

  function handleReverse(id: string) {
    if (!persistence.reversePayrollAccrual) {
      setMessage("Maaş tahakkuku ters kayıt bağlantısı hazır değil.");
      return;
    }

    if (
      !window.confirm(
        "Tahakkuk ve varsa bağlı ödeme için karşı muhasebe kayıtları oluşturulacak. İşleme devam edilsin mi?",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = await persistence.reversePayrollAccrual?.(id);

      if (!result) return;
      if (!result.ok) {
        setMessage(result.errors.join(" "));
        return;
      }

      setLocalRows((current) =>
        current.map((row) => (row.id === id ? result.data : row)),
      );
      setLocalPaymentMovements((current) =>
        current.filter(
          (movement) =>
            !(
              movement.sourceType === "payroll-accrual" &&
              movement.sourceId === id &&
              movement.movementType === "Maaş Ödemesi"
            ),
        ),
      );
      setMessage("Maaş tahakkuku kontrollü ters kayıtla iptal edildi.");
    });
  }

  function handlePrint() {
    setMessage(`Yazdırma kapsamı hazır: ${visibleRows.length} tahakkuk.`);
    window.print();
  }

  return (
    <section
      className="mx-auto flex max-w-7xl flex-col gap-4"
      data-payroll-workspace
    >
      <header className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="bg-gradient-to-r from-brand-primary/10 via-surface-raised to-surface-raised px-5 py-6 text-content md:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                Maaş Tahakkuku
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Bordro Yönetimi
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
                Kesinleşmiş puantaj kayıtlarından tahakkuk oluşturun, kesintileri
                izleyin ve gerçek kasa/banka ödeme hareketiyle bordro sürecini tamamlayın.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <div className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                  Net bordro
                </p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {formatMoney(summary.netTotal)}
                </p>
              </div>
              <div className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                  Kesinti
                </p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {formatMoney(summary.deductionTotal)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Tahakkuk" value={String(visibleRows.length)} />
        <Metric label="Taslak Tahakkuk" value={String(summary.openCount)} />
        <Metric label="Ödenen Tahakkuk" value={String(summary.paidCount)} />
        <Metric
          label="Ödeme Bekleyen"
          value={String(summary.paymentWaitingCount)}
        />
        <Metric
          label="Bekleyen Puantaj"
          value={String(summary.pendingTimesheetCount)}
        />
        <Metric label="Net Toplam" value={formatMoney(summary.netTotal)} />
      </div>

      <section className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                Bordro filtresi
              </p>
              <p className="mt-1 text-sm text-content-muted">
                Özet, tahakkuk listesi ve bordro çıktısı yalnız görünür kayıtları kullanır.
              </p>
            </div>
            <label className="flex w-full flex-col gap-1 text-xs font-semibold text-content-muted xl:w-96">
              Tahakkuk, puantaj, şantiye veya personel ara
              <input
                className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-normal text-content outline-none focus:border-brand-primary"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tahakkuk no, şantiye veya personel"
                type="search"
                value={search}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Bordro durumu filtresi">
            {payrollFilters.map(({ label, value }) => (
                <button
                  aria-pressed={statusFilter === value}
                  className={
                    statusFilter === value
                      ? "h-10 rounded-ui-control bg-brand-primary px-3 text-sm font-semibold text-on-brand"
                      : "h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content-muted hover:text-content"
                  }
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
          </div>
        </div>
      </section>

      {message ? (
        <p
          className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-sm font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised">
        <div className="border-b border-divider px-4 py-3">
          <h3 className="text-sm font-semibold">
            Tahakkuka Hazır Puantajlar
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3">Puantaj No</th>
                <th className="px-4 py-3">Dönem</th>
                <th className="px-4 py-3">Şantiye</th>
                <th className="px-4 py-3">Taşeron</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {availableTimesheets.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center" colSpan={6}>
                    <p className="font-semibold">
                      Tahakkuka hazır puantaj yok
                    </p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Puantaj kesinleştiğinde burada işlem bekler.
                    </p>
                  </td>
                </tr>
              ) : (
                availableTimesheets.map((row) => (
                  <tr className="hover:bg-brand-primary-subtle" key={row.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.documentNo}
                    </td>
                    <td className="px-4 py-3">
                      {row.year}/{String(row.month).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">{row.siteName}</td>
                    <td className="px-4 py-3">{row.contractorName || "-"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatMoney(row.netTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          className="h-9 rounded-ui-control bg-brand-primary px-3 text-xs font-semibold text-on-brand disabled:opacity-50"
                          disabled={isPending}
                          onClick={() => handleCreate(row.id)}
                          type="button"
                        >
                          Tahakkuk Oluştur
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

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised">
        <div className="flex flex-col gap-3 border-b border-divider px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Maaş tahakkuk listesi</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {accountOptions.length > 0 ? (
              <label className="flex flex-col gap-1 text-xs font-semibold text-content-subtle sm:min-w-64">
                <span>Ödeme hesabı</span>
                <select
                  className="h-9 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content"
                  onChange={(event) =>
                    setPaymentAccountCode(event.target.value)
                  }
                  value={paymentAccountCode}
                >
                  {accountOptions.map((account) => (
                    <option key={account.code} value={account.code}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              className="h-9 rounded-ui-control border border-divider px-3 text-xs font-semibold disabled:opacity-50"
              disabled={visibleRows.length === 0}
              onClick={handlePrint}
              type="button"
            >
              Tahakkukları Yazdır
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3">Tahakkuk No</th>
                <th className="px-4 py-3">Kaynak Puantaj</th>
                <th className="px-4 py-3">Dönem</th>
                <th className="px-4 py-3">Şantiye</th>
                <th className="px-4 py-3 text-right">Kesinti</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Ödeme</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={9}>
                    <p className="font-semibold">
                      {localRows.length === 0
                        ? "Henüz tahakkuk yok"
                        : "Filtreyle eşleşen tahakkuk yok"}
                    </p>
                    <p className="mt-1 text-sm text-content-subtle">
                      {localRows.length === 0
                        ? "Kesinleşmiş puantajdan tahakkuk üretildiğinde liste dolacaktır."
                        : "Arama veya durum filtresini değiştirerek bordro kayıtlarını görün."}
                    </p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const paymentMovement = getPayrollPayment(
                    localPaymentMovements,
                    row.id,
                  );
                  const isPaid = Boolean(paymentMovement);
                  const isHighlighted = isHighlightedDocument(
                    row.documentNo,
                    highlightedDocumentNo,
                  );

                  return (
                    <tr
                      className={highlightedRowClass(isHighlighted)}
                      data-highlighted={isHighlighted ? "true" : undefined}
                      key={row.id}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.documentNo}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.sourceTimesheetNo}
                      </td>
                      <td className="px-4 py-3">
                        {row.year}/{String(row.month).padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3">{row.siteName}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(row.deductionTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatMoney(row.netTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid gap-1">
                          <span>{row.status}</span>
                          {row.ledgerDocumentNo ? (
                            <span className="font-mono text-[11px] text-content-subtle">
                              Fiş: {row.ledgerDocumentNo}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {paymentMovement ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">Ödendi</span>
                            <span className="text-xs text-content-subtle">
                              {paymentMovement.accountName}
                            </span>
                            <span className="font-mono text-xs text-content-subtle">
                              {formatDate(paymentMovement.movementDate)}
                            </span>
                            {paymentMovement.ledgerDocumentNo ? (
                              <span className="font-mono text-xs text-content-subtle">
                                Muhasebe fişi: {paymentMovement.ledgerDocumentNo}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          "Bekliyor"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="h-9 rounded-ui-control border border-divider px-3 text-xs font-semibold disabled:opacity-50"
                            disabled={isPending || row.status !== "Taslak"}
                            onClick={() => mutateStatus(row.id, "post")}
                            type="button"
                          >
                            Kesinleştir
                          </button>
                          <button
                            className="h-9 rounded-ui-control border border-divider px-3 text-xs font-semibold disabled:opacity-50"
                            disabled={isPending || row.status !== "Taslak"}
                            onClick={() => mutateStatus(row.id, "cancel")}
                            type="button"
                            title={
                              row.status === "Kaydedildi"
                                ? "Kaydedilmiş tahakkuk için kontrollü ters kayıt gerekir."
                                : undefined
                            }
                          >
                            İptal
                          </button>
                          <button
                            className="h-9 rounded-ui-control bg-brand-primary px-3 text-xs font-semibold text-on-brand disabled:opacity-50"
                            disabled={
                              isPending || row.status !== "Kaydedildi" || isPaid
                            }
                            onClick={() => handlePay(row.id)}
                            type="button"
                          >
                            Ödeme Oluştur
                          </button>
                          <button
                            className="h-9 rounded-ui-control border border-danger/40 px-3 text-xs font-semibold text-danger disabled:opacity-50"
                            disabled={
                              isPending ||
                              !canReverse ||
                              row.status !== "Kaydedildi"
                            }
                            onClick={() => handleReverse(row.id)}
                            title={
                              canReverse
                                ? "Tahakkuk ve bağlı ödeme için kontrollü ters kayıt oluşturur."
                                : "Kontrollü ters kayıt yalnız yönetici tarafından oluşturulabilir."
                            }
                            type="button"
                          >
                            Ters Kayıt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function isHighlightedDocument(
  documentNo: string,
  highlightedDocumentNo?: string,
) {
  return Boolean(highlightedDocumentNo && documentNo === highlightedDocumentNo);
}

function highlightedRowClass(isHighlighted: boolean) {
  return isHighlighted
    ? "bg-brand-primary-subtle ring-1 ring-inset ring-brand-primary"
    : "hover:bg-brand-primary-subtle";
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

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function getPayrollPayment(
  paymentMovements: CashBankMovementRow[],
  payrollAccrualId: string,
) {
  const payment = paymentMovements.find(
    (movement) =>
      movement.sourceType === "payroll-accrual" &&
      movement.sourceId === payrollAccrualId &&
      movement.movementType === "Maaş Ödemesi",
  );

  if (!payment) return undefined;

  const reversal = paymentMovements.find(
    (movement) =>
      movement.sourceType === "cash-bank-movement-reversal" &&
      movement.sourceId === payment.id,
  );

  return reversal ? undefined : payment;
}
