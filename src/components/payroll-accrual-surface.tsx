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
};

type PayrollPaymentMutationResult =
  | { ok: true; data: CashBankMovementRow; errors?: never }
  | { ok: false; errors: string[]; data?: never };

type PayrollAccrualSurfaceProps = {
  accountOptions?: CashBankAccountOption[];
  highlightedDocumentNo?: string;
  paymentMovements?: CashBankMovementRow[];
  persistence?: PayrollAccrualPersistence;
  rows: PayrollAccrualRow[];
  sourceTimesheets: TimesheetRow[];
};

export function PayrollAccrualSurface({
  accountOptions = [],
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
  const summary = useMemo(
    () => {
      const paidRows = localRows.filter((row) =>
        getPayrollPayment(localPaymentMovements, row.id),
      );
      const paymentWaitingRows = localRows.filter(
        (row) =>
          row.status === "Kaydedildi" &&
          !getPayrollPayment(localPaymentMovements, row.id),
      );

      return {
        deductionTotal: localRows.reduce(
          (total, row) => total + row.deductionTotal,
          0,
        ),
        netTotal: localRows.reduce((total, row) => total + row.netTotal, 0),
        openCount: localRows.filter((row) => row.status === "Taslak").length,
        paidCount: paidRows.length,
        paymentWaitingCount: paymentWaitingRows.length,
        pendingTimesheetCount: availableTimesheets.length,
      };
    },
    [availableTimesheets.length, localPaymentMovements, localRows],
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

  function handlePrint() {
    setMessage(`Yazdırma kapsamı hazır: ${localRows.length} tahakkuk.`);
    window.print();
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Puantajdan tahakkuk
        </p>
        <div className="mt-2">
          <h2 className="text-2xl font-semibold tracking-normal">
            Maaş Tahakkuku
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
            Kesinleşmiş puantaj kayıtlarından personel bazlı maaş tahakkuku
            oluşturulur; ödeme ve resmi bordro adımları sonraki iş akışlarına
            bırakılır.
          </p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Tahakkuk" value={String(localRows.length)} />
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

      {message ? (
        <p
          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-sm font-semibold"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="border-b border-[var(--grid-border)] px-4 py-3">
          <h3 className="text-sm font-semibold">
            Tahakkuka Hazır Puantajlar
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3">Puantaj No</th>
                <th className="px-4 py-3">Dönem</th>
                <th className="px-4 py-3">Şantiye</th>
                <th className="px-4 py-3">Taşeron</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {availableTimesheets.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center" colSpan={6}>
                    <p className="font-semibold">
                      Tahakkuka hazır puantaj yok
                    </p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      Puantaj kesinleştiğinde burada işlem bekler.
                    </p>
                  </td>
                </tr>
              ) : (
                availableTimesheets.map((row) => (
                  <tr className="hover:bg-[var(--primary-fixed)]" key={row.id}>
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
                          className="h-9 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-xs font-semibold text-white disabled:opacity-50"
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

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Maaş tahakkuk listesi</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {accountOptions.length > 0 ? (
              <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)] sm:min-w-64">
                <span>Ödeme hesabı</span>
                <select
                  className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm font-semibold text-[var(--on-surface)]"
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
              className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold disabled:opacity-50"
              disabled={localRows.length === 0}
              onClick={handlePrint}
              type="button"
            >
              Tahakkukları Yazdır
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
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
            <tbody className="divide-y divide-[var(--grid-border)]">
              {localRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={9}>
                    <p className="font-semibold">Henüz tahakkuk yok</p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      Kesinleşmiş puantajdan tahakkuk üretildiğinde liste
                      dolacaktır.
                    </p>
                  </td>
                </tr>
              ) : (
                localRows.map((row) => {
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
                            <span className="font-mono text-[11px] text-[var(--on-surface-variant)]">
                              Fiş: {row.ledgerDocumentNo}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {paymentMovement ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">Ödendi</span>
                            <span className="text-xs text-[var(--on-surface-variant)]">
                              {paymentMovement.accountName}
                            </span>
                            <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                              {formatDate(paymentMovement.movementDate)}
                            </span>
                            {paymentMovement.ledgerDocumentNo ? (
                              <span className="font-mono text-xs text-[var(--on-surface-variant)]">
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
                            className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold disabled:opacity-50"
                            disabled={isPending || row.status !== "Taslak"}
                            onClick={() => mutateStatus(row.id, "post")}
                            type="button"
                          >
                            Kesinleştir
                          </button>
                          <button
                            className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] px-3 text-xs font-semibold disabled:opacity-50"
                            disabled={isPending || row.status === "İptal"}
                            onClick={() => mutateStatus(row.id, "cancel")}
                            type="button"
                          >
                            İptal
                          </button>
                          <button
                            className="h-9 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-xs font-semibold text-white disabled:opacity-50"
                            disabled={
                              isPending || row.status !== "Kaydedildi" || isPaid
                            }
                            onClick={() => handlePay(row.id)}
                            type="button"
                          >
                            Ödeme Oluştur
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
    ? "bg-[var(--primary-fixed)] ring-1 ring-inset ring-[var(--primary)]"
    : "hover:bg-[var(--primary-fixed)]";
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
  return paymentMovements.find(
    (movement) =>
      movement.sourceType === "payroll-accrual" &&
      movement.sourceId === payrollAccrualId &&
      movement.movementType === "Maaş Ödemesi",
  );
}
