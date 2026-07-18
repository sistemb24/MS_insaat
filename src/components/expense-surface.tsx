"use client";

import { useState } from "react";

import type {
  CashBankAccountOption,
  CashBankMovementRow,
} from "@/lib/cash-bank-movement-service";
import type { ExpenseCreateValues, ExpenseRow } from "@/lib/expense-service";
import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
  getP0DefaultVatRateInputValue,
} from "@/lib/settings-contract";

type ExpenseLookupOption = {
  code: string;
  name: string;
};

type ExpenseCreateActionResult =
  | {
      ok: true;
      data: {
        expense: ExpenseRow;
        paymentMovement?: CashBankMovementRow;
      };
    }
  | {
      ok: false;
      errors: string[];
    };

type ExpenseSurfaceProps = {
  accountOptions?: CashBankAccountOption[];
  highlightedDocumentNo?: string;
  lookups?: {
    sites: ExpenseLookupOption[];
  };
  paymentMovements?: CashBankMovementRow[];
  permissions?: {
    canMutateExpenses: boolean;
  };
  persistence?: {
    createExpense?: (values: ExpenseCreateValues) => Promise<ExpenseCreateActionResult>;
  };
  rows: ExpenseRow[];
  today?: string;
};

type FormState = {
  accountCode: string;
  amount: string;
  counterpartyName: string;
  description: string;
  documentNo: string;
  expenseDate: string;
  movementGroup: string;
  siteCode: string;
  vatRate: string;
};

export function ExpenseSurface({
  accountOptions = [],
  highlightedDocumentNo,
  lookups = { sites: [] },
  paymentMovements = [],
  permissions = { canMutateExpenses: true },
  persistence,
  rows,
  today = new Date().toISOString().slice(0, 10),
}: ExpenseSurfaceProps) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [localPaymentMovements, setLocalPaymentMovements] =
    useState(paymentMovements);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const activeRows = displayRows.filter((row) => row.status !== "İptal");
  const amountTotal = activeRows.reduce((total, row) => total + row.amount, 0);
  const vatTotal = activeRows.reduce((total, row) => total + row.vatTotal, 0);
  const grandTotal = activeRows.reduce((total, row) => total + row.grandTotal, 0);
  const baseCurrencyContext = `Baz Para: ${getP0BaseCurrencyDisplayValue()}`;
  const currencyPolicyContext = getP0CurrencyPolicyDisplayValue();

  function startCreate() {
    if (!permissions.canMutateExpenses) {
      return;
    }

    setErrors([]);
    setNotice("");
    setForm({
      accountCode: accountOptions[0]?.code ?? "",
      amount: "0",
      counterpartyName: "",
      description: "",
      documentNo: "",
      expenseDate: today,
      movementGroup: "",
      siteCode: lookups.sites[0]?.code ?? "",
      vatRate: getP0DefaultVatRateInputValue(),
    });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setErrors([]);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveForm() {
    if (!form || !persistence?.createExpense || !permissions.canMutateExpenses) {
      return;
    }

    setIsSaving(true);
    setErrors([]);
    setNotice("");

    const result = await persistence.createExpense(createValuesFromForm(form, {
      accounts: accountOptions,
      sites: lookups.sites,
    }));

    if (result.ok) {
      setDisplayRows((current) => [result.data.expense, ...current]);
      if (result.data.paymentMovement) {
        setLocalPaymentMovements((current) => [
          result.data.paymentMovement!,
          ...current,
        ]);
      }
      setNotice("Gider kaydı ve ödeme hareketi oluşturuldu.");
      setForm(null);
      setIsSaving(false);
      return;
    }

    setErrors(result.errors);
    setIsSaving(false);
  }

  function printRows() {
    setNotice(`Yazdırma kapsamı hazır: ${displayRows.length} gider.`);
    window.print();
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Şantiye, masraf ve ödeme
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Giderler</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              Şantiye/proje gideri kaydedildiğinde aynı akışta kasa/banka çıkış
              hareketi oluşturulur ve gider maliyeti şantiye bağlamında izlenir.
            </p>
          </div>
          <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            Gider Kaydı
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-2">
        <button
          className={toolbarButtonClass}
          disabled={!permissions.canMutateExpenses}
          onClick={startCreate}
          type="button"
        >
          Yeni
        </button>
        <button
          className={`${toolbarButtonClass} disabled:opacity-50`}
          disabled={!permissions.canMutateExpenses || !form || isSaving}
          onClick={saveForm}
          type="button"
        >
          {isSaving ? "Kaydediliyor" : "Kaydet"}
        </button>
        <button className={toolbarButtonClass} onClick={printRows} type="button">
          Yazdır
        </button>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-[var(--radius-panel)] border border-[var(--status-cancelled)] bg-[var(--surface-container-lowest)] p-3 text-sm text-[var(--status-cancelled)]">
          <p className="font-semibold">Gider kaydedilemedi</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-3 text-sm font-semibold text-[var(--on-surface-variant)]"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {form ? (
        <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Gider Kaydı Ekle</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[var(--on-surface-variant)]">
              <span className="rounded-[var(--radius-control)] bg-[var(--surface-container-low)] px-2 py-1">
                {baseCurrencyContext}
              </span>
              <span className="rounded-[var(--radius-control)] bg-[var(--surface-container-low)] px-2 py-1">
                {currencyPolicyContext}
              </span>
            </div>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <Field label="Evrak No">
              <input
                className={controlClass}
                onChange={(event) => updateForm("documentNo", event.target.value)}
                value={form.documentNo}
              />
            </Field>
            <Field label="Gider Tarihi">
              <input
                className={controlClass}
                onChange={(event) => updateForm("expenseDate", event.target.value)}
                type="date"
                value={form.expenseDate}
              />
            </Field>
            <Field label="Şantiye">
              <select
                className={controlClass}
                onChange={(event) => updateForm("siteCode", event.target.value)}
                value={form.siteCode}
              >
                <option value="">Şantiye seç</option>
                {lookups.sites.map((site) => (
                  <option key={site.code} value={site.code}>
                    {site.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hareket Grubu">
              <input
                className={controlClass}
                onChange={(event) => updateForm("movementGroup", event.target.value)}
                value={form.movementGroup}
              />
            </Field>
            <Field label="Ödeme Hesabı">
              <select
                className={controlClass}
                onChange={(event) => updateForm("accountCode", event.target.value)}
                value={form.accountCode}
              >
                <option value="">Hesap seç</option>
                {accountOptions.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cari">
              <input
                className={controlClass}
                onChange={(event) =>
                  updateForm("counterpartyName", event.target.value)
                }
                value={form.counterpartyName}
              />
            </Field>
            <Field label="Tutar">
              <input
                className={`${controlClass} text-right font-mono`}
                onChange={(event) => updateForm("amount", event.target.value)}
                type="number"
                value={form.amount}
              />
            </Field>
            <Field label="KDV %">
              <input
                className={`${controlClass} text-right font-mono`}
                onChange={(event) => updateForm("vatRate", event.target.value)}
                type="number"
                value={form.vatRate}
              />
            </Field>
            <Field label="Açıklama">
              <input
                className={controlClass}
                onChange={(event) => updateForm("description", event.target.value)}
                value={form.description}
              />
            </Field>
          </div>
        </article>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Gider Tutarı" value={formatMoney(amountTotal)} />
        <Metric label="KDV Toplamı" value={formatMoney(vatTotal)} />
        <Metric label="Ödenen Toplam" value={formatMoney(grandTotal)} />
      </div>

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="border-b border-[var(--grid-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Gider hareket listesi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Şantiye</th>
                <th className="px-4 py-3 font-semibold">Grup</th>
                <th className="px-4 py-3 font-semibold">Cari</th>
                <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                <th className="px-4 py-3 text-right font-semibold">KDV</th>
                <th className="px-4 py-3 text-right font-semibold">Toplam</th>
                <th className="px-4 py-3 font-semibold">Ödeme</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {displayRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={9}>
                    <p className="font-semibold">Henüz gider kaydı yok</p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      İlk gider kaydı şantiye maliyeti ve kasa/banka çıkışını
                      aynı anda başlatır.
                    </p>
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const paymentMovement = getExpensePayment(
                    localPaymentMovements,
                    row.id,
                  );
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
                        {row.ledgerDocumentNo ? (
                          <span className="mt-1 block text-[11px] text-[var(--on-surface-variant)]">
                            Fiş: {row.ledgerDocumentNo}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{formatDate(row.expenseDate)}</td>
                      <td className="px-4 py-3">{row.siteName}</td>
                      <td className="px-4 py-3">{row.movementGroup}</td>
                      <td className="px-4 py-3">{row.counterpartyName}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(row.vatTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatMoney(row.grandTotal)}
                      </td>
                      <td className="px-4 py-3">
                        {paymentMovement ? (
                          <div className="grid gap-1">
                            <span className="font-semibold text-[var(--status-posted)]">
                              Ödendi
                            </span>
                            <span className="text-xs text-[var(--on-surface-variant)]">
                              {paymentMovement.accountName}
                            </span>
                            <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                              {paymentMovement.documentNo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--on-surface-variant)]">
                            Ödeme hareketi bekleniyor
                          </span>
                        )}
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

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
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

function createValuesFromForm(
  form: FormState,
  lookups: {
    accounts: CashBankAccountOption[];
    sites: ExpenseLookupOption[];
  },
): ExpenseCreateValues {
  const account = lookups.accounts.find((item) => item.code === form.accountCode);
  const site = lookups.sites.find((item) => item.code === form.siteCode);

  return {
    accountCode: account?.code ?? form.accountCode,
    accountName: account?.name ?? "",
    amount: toNumber(form.amount),
    counterpartyName: form.counterpartyName.trim(),
    description: form.description.trim(),
    documentNo: form.documentNo.trim(),
    expenseDate: form.expenseDate,
    movementGroup: form.movementGroup.trim(),
    siteCode: site?.code ?? form.siteCode,
    siteName: site?.name ?? "",
    vatRate: toNumber(form.vatRate),
  };
}

function getExpensePayment(
  paymentMovements: CashBankMovementRow[],
  expenseId: string,
) {
  return paymentMovements.find(
    (movement) =>
      movement.sourceType === "expense" &&
      movement.sourceId === expenseId &&
      movement.movementType === "Gider Ödemesi",
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

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} ${getP0BaseCurrencyTransactionValue()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

const controlClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm outline-none transition focus:border-[var(--primary)]";

const toolbarButtonClass =
  "rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--primary-fixed)]";
