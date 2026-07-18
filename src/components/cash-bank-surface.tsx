"use client";

import { useState } from "react";

import {
  summarizeCashBankAccounts,
  type CashBankMovementCreateValues,
  type CashBankMovementCurrency,
  type CashBankMovementRow,
  type CashBankTransferValues,
  type ManualCashBankMovementType,
} from "@/lib/cash-bank-movement-service";
import { manualCashBankCounterAccounts } from "@/lib/manual-cash-bank-ledger-posting-service";
import type { EntityDefinition, EntityRow } from "@/lib/entities";
import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
} from "@/lib/settings-contract";

import { EntityListSurface } from "./entity-list-surface";

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

type CashBankSurfaceProps = {
  accountDefinition: EntityDefinition;
  accountRows: EntityRow[];
  highlightedDocumentNo?: string;
  movements: CashBankMovementRow[];
  permissions?: {
    canMutateMovements: boolean;
  };
  persistence?: {
    createMovement?: (
      values: CashBankMovementCreateValues,
    ) => Promise<
      | {
          ok: true;
          data: CashBankMovementRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    createTransfer?: (
      values: CashBankTransferValues,
    ) => Promise<
      | {
          ok: true;
          data: {
            rows: CashBankMovementRow[];
          };
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    createRow?: (slug: string, values: EntityRow) => Promise<EntityActionResult>;
    createRows?: (slug: string, rows: EntityRow[]) => Promise<EntityListActionResult>;
    deactivateRow?: (slug: string, code: string) => Promise<EntityActionResult>;
    listRows?: (slug: string) => Promise<EntityListActionResult>;
    updateRow?: (
      slug: string,
      code: string,
      values: EntityRow,
    ) => Promise<EntityActionResult>;
  };
  today?: string;
};

type MovementFormState = {
  accountCode: string;
  amount: string;
  counterAccountCode: string;
  counterpartyName: string;
  currency: CashBankMovementCurrency;
  description: string;
  documentNo: string;
  movementDate: string;
  movementType: ManualCashBankMovementType;
};

type TransferFormState = {
  amount: string;
  currency: CashBankMovementCurrency;
  description: string;
  documentNo: string;
  fromAccountCode: string;
  movementDate: string;
  toAccountCode: string;
};

export function CashBankSurface({
  accountDefinition,
  accountRows,
  highlightedDocumentNo,
  movements,
  permissions = { canMutateMovements: true },
  persistence,
  today = new Date().toISOString().slice(0, 10),
}: CashBankSurfaceProps) {
  const [displayMovements, setDisplayMovements] = useState(movements);
  const [form, setForm] = useState<MovementFormState | null>(null);
  const [transferForm, setTransferForm] = useState<TransferFormState | null>(null);
  const [isSavingMovement, setIsSavingMovement] = useState(false);
  const [isSavingTransfer, setIsSavingTransfer] = useState(false);
  const [printNotice, setPrintNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const baseCurrencyContext = `Baz Para: ${getP0BaseCurrencyDisplayValue()}`;
  const currencyPolicyContext = getP0CurrencyPolicyDisplayValue();
  const p0MovementCurrency: CashBankMovementCurrency =
    getP0BaseCurrencyTransactionValue();
  const activeAccounts = resolveActiveAccounts(accountRows);
  const incomingTotal = displayMovements
    .filter((movement) => movement.direction === "Giriş")
    .reduce((total, movement) => total + movement.amount, 0);
  const outgoingTotal = displayMovements
    .filter((movement) => movement.direction === "Çıkış")
    .reduce((total, movement) => total + movement.amount, 0);
  const accountBalances = summarizeCashBankAccounts({
    accounts: accountRows.map((account) => ({
      code: account.code,
      currency: normalizeCurrency(account.currency),
      name: account.name,
      openingBalance: account.balance,
      type: account.type,
    })),
    movements: displayMovements,
  });

  function startCreateMovement() {
    if (!permissions.canMutateMovements) {
      return;
    }

    const firstAccount = activeAccounts[0];

    setErrors([]);
    setTransferForm(null);
    setForm({
      accountCode: firstAccount?.code ?? "",
      amount: "0",
      counterAccountCode: manualCashBankCounterAccounts.Tahsilat[0].code,
      counterpartyName: "",
      currency: p0MovementCurrency,
      description: "",
      documentNo: "",
      movementDate: today,
      movementType: "Tahsilat",
    });
  }

  function startCreateTransfer() {
    if (!permissions.canMutateMovements) {
      return;
    }

    const [fromAccount, toAccount] = activeAccounts;

    setErrors([]);
    setForm(null);
    setTransferForm({
      amount: "0",
      currency: p0MovementCurrency,
      description: "",
      documentNo: "",
      fromAccountCode: fromAccount?.code ?? "",
      movementDate: today,
      toAccountCode: toAccount?.code ?? fromAccount?.code ?? "",
    });
  }

  function updateForm<K extends keyof MovementFormState>(
    key: K,
    value: MovementFormState[K],
  ) {
    setErrors([]);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function selectAccount(code: string) {
    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            accountCode: code,
            currency: p0MovementCurrency,
          }
        : current,
    );
  }

  function selectMovementType(movementType: ManualCashBankMovementType) {
    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            counterAccountCode:
              manualCashBankCounterAccounts[movementType][0].code,
            movementType,
          }
        : current,
    );
  }

  function updateTransferForm<K extends keyof TransferFormState>(
    key: K,
    value: TransferFormState[K],
  ) {
    setErrors([]);
    setTransferForm((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }

  function selectTransferFromAccount(code: string) {
    setErrors([]);
    setTransferForm((current) =>
      current
        ? {
            ...current,
            fromAccountCode: code,
            currency: p0MovementCurrency,
          }
        : current,
    );
  }

  async function saveMovement() {
    if (
      !form ||
      !permissions.canMutateMovements ||
      !persistence?.createMovement
    ) {
      return;
    }

    setIsSavingMovement(true);
    setErrors([]);

    const values = createMovementValuesFromForm(form, activeAccounts);
    const result = await persistence.createMovement(values);

    if (result.ok) {
      setDisplayMovements((current) => [result.data, ...current]);
      setForm(null);
      setIsSavingMovement(false);
      return;
    }

    setErrors(result.errors);
    setIsSavingMovement(false);
  }

  async function saveTransfer() {
    if (
      !transferForm ||
      !permissions.canMutateMovements ||
      !persistence?.createTransfer
    ) {
      return;
    }

    setIsSavingTransfer(true);
    setErrors([]);

    const values = createTransferValuesFromForm(transferForm, activeAccounts);
    const result = await persistence.createTransfer(values);

    if (result.ok) {
      setDisplayMovements((current) => [...result.data.rows, ...current]);
      setTransferForm(null);
      setIsSavingTransfer(false);
      return;
    }

    setErrors(result.errors);
    setIsSavingTransfer(false);
  }

  function printMovements() {
    setPrintNotice(
      `Yazdırma kapsamı hazır: ${displayMovements.length} hareket.`,
    );
    window.print();
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Nakit, banka ve otomatik hareketler
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-normal">
          Kasa/Banka
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
          Hesap tanımları korunur; çek tahsili gibi P0 işlem modüllerinden
          doğan finansal hareketler aynı ekranda izlenir.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Giriş Toplamı" value={formatMoney(incomingTotal)} />
        <Metric label="Çıkış Toplamı" value={formatMoney(outgoingTotal)} />
        <Metric label="Hareket Adedi" value={String(displayMovements.length)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-2">
        <button
          className={toolbarButtonClass}
          disabled={!permissions.canMutateMovements}
          onClick={startCreateMovement}
          type="button"
        >
          Yeni Hareket
        </button>
        <button
          className={toolbarButtonClass}
          disabled={!permissions.canMutateMovements || activeAccounts.length < 2}
          onClick={startCreateTransfer}
          type="button"
        >
          Virman
        </button>
        <button
          className={toolbarButtonClass}
          disabled={!permissions.canMutateMovements || !form || isSavingMovement}
          onClick={saveMovement}
          type="button"
        >
          {isSavingMovement ? "Kaydediliyor" : "Hareket Kaydet"}
        </button>
        <button
          className={toolbarButtonClass}
          disabled={
            !permissions.canMutateMovements || !transferForm || isSavingTransfer
          }
          onClick={saveTransfer}
          type="button"
        >
          {isSavingTransfer ? "Kaydediliyor" : "Virman Kaydet"}
        </button>
        <button
          className={toolbarButtonClass}
          onClick={printMovements}
          type="button"
        >
          Hareketleri Yazdır
        </button>
      </div>

      {printNotice ? (
        <div
          className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-3 text-sm font-semibold text-[var(--on-surface-variant)]"
          role="status"
        >
          {printNotice}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="rounded-[var(--radius-panel)] border border-[var(--status-cancelled)] bg-[var(--surface-container-lowest)] p-3 text-sm text-[var(--status-cancelled)]">
          <p className="font-semibold">Kasa/banka hareketi kaydedilemedi</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {form ? (
        <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Manuel Kasa/Banka Hareketi</h2>
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
            <Field label="Hareket Tipi">
              <select
                className={controlClass}
                onChange={(event) =>
                  selectMovementType(
                    event.target.value as ManualCashBankMovementType,
                  )
                }
                value={form.movementType}
              >
                <option value="Tahsilat">Tahsilat</option>
                <option value="Ödeme">Ödeme</option>
              </select>
            </Field>
            <Field label="Hesap">
              <select
                className={controlClass}
                onChange={(event) => selectAccount(event.target.value)}
                value={form.accountCode}
              >
                {activeAccounts.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.code} · {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Karşı Muhasebe Hesabı">
              <select
                className={controlClass}
                onChange={(event) =>
                  updateForm("counterAccountCode", event.target.value)
                }
                value={form.counterAccountCode}
              >
                {manualCashBankCounterAccounts[form.movementType].map(
                  (account) => (
                    <option key={account.code} value={account.code}>
                      {account.code} · {account.name}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Hareket Tarihi">
              <input
                className={controlClass}
                onChange={(event) => updateForm("movementDate", event.target.value)}
                type="date"
                value={form.movementDate}
              />
            </Field>
            <Field label="Evrak No">
              <input
                className={controlClass}
                onChange={(event) => updateForm("documentNo", event.target.value)}
                value={form.documentNo}
              />
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
            <Field label="Para Birimi">
              <select
                className={controlClass}
                disabled
                onChange={(event) =>
                  updateForm(
                    "currency",
                    event.target.value as CashBankMovementCurrency,
                  )
                }
                value={form.currency}
              >
                <option value="TL">TL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
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

      {transferForm ? (
        <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Kasa/Banka Virmanı</h2>
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
            <Field label="Çıkış Hesabı">
              <select
                className={controlClass}
                onChange={(event) => selectTransferFromAccount(event.target.value)}
                value={transferForm.fromAccountCode}
              >
                {activeAccounts.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.code} · {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Giriş Hesabı">
              <select
                className={controlClass}
                onChange={(event) =>
                  updateTransferForm("toAccountCode", event.target.value)
                }
                value={transferForm.toAccountCode}
              >
                {activeAccounts.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.code} · {account.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hareket Tarihi">
              <input
                className={controlClass}
                onChange={(event) =>
                  updateTransferForm("movementDate", event.target.value)
                }
                type="date"
                value={transferForm.movementDate}
              />
            </Field>
            <Field label="Evrak No">
              <input
                className={controlClass}
                onChange={(event) =>
                  updateTransferForm("documentNo", event.target.value)
                }
                value={transferForm.documentNo}
              />
            </Field>
            <Field label="Tutar">
              <input
                className={`${controlClass} text-right font-mono`}
                onChange={(event) => updateTransferForm("amount", event.target.value)}
                type="number"
                value={transferForm.amount}
              />
            </Field>
            <Field label="Para Birimi">
              <select
                className={controlClass}
                disabled
                onChange={(event) =>
                  updateTransferForm(
                    "currency",
                    event.target.value as CashBankMovementCurrency,
                  )
                }
                value={transferForm.currency}
              >
                <option value="TL">TL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
            <Field label="Açıklama">
              <input
                className={controlClass}
                onChange={(event) =>
                  updateTransferForm("description", event.target.value)
                }
                value={transferForm.description}
              />
            </Field>
          </div>
        </article>
      ) : null}

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="border-b border-[var(--grid-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Hesap Bakiye Özeti</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Hesap</th>
                <th className="px-4 py-3 font-semibold">Tip</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Açılış
                </th>
                <th className="px-4 py-3 text-right font-semibold">Giriş</th>
                <th className="px-4 py-3 text-right font-semibold">Çıkış</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Güncel Bakiye
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {accountBalances.map((account) => (
                <tr
                  className="hover:bg-[var(--primary-fixed)]"
                  key={account.accountCode}
                >
                  <td className="px-4 py-3">
                    {account.accountName}
                    <span className="ml-2 font-mono text-xs text-[var(--on-surface-variant)]">
                      {account.accountCode}
                    </span>
                  </td>
                  <td className="px-4 py-3">{account.type}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(account.openingBalance, account.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(account.incomingTotal, account.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(account.outgoingTotal, account.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">
                    {formatMoney(account.currentBalance, account.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="border-b border-[var(--grid-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Otomatik Hareketler</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">Hareket</th>
                <th className="px-4 py-3 font-semibold">Muhasebe fişi</th>
                <th className="px-4 py-3 font-semibold">Hesap</th>
                <th className="px-4 py-3 font-semibold">Cari</th>
                <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                <th className="px-4 py-3 text-center font-semibold">Yön</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {displayMovements.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">Henüz kasa/banka hareketi yok</p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      Çek tahsili ve ödeme akışları bağlandıkça bu liste dolar.
                    </p>
                  </td>
                </tr>
              ) : (
                displayMovements.map((movement) => {
                  const isHighlighted = isHighlightedDocument(
                    movement.documentNo,
                    highlightedDocumentNo,
                  );

                  return (
                    <tr
                      className={highlightedRowClass(isHighlighted)}
                      data-highlighted={isHighlighted ? "true" : undefined}
                      key={movement.id}
                    >
                      <td className="px-4 py-3">
                        {formatDate(movement.movementDate)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {movement.documentNo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid gap-1">
                          <span>{movement.movementType}</span>
                          {movement.sourceType === "cash-bank-movement-reversal" ? (
                            <span className="text-xs font-semibold text-[var(--status-cancelled)]">
                              Ters kayıt
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {movement.ledgerDocumentNo ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        {movement.accountName}
                        <span className="ml-2 font-mono text-xs text-[var(--on-surface-variant)]">
                          {movement.accountCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">{movement.counterpartyName}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatMoney(movement.amount, movement.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={directionBadgeClass(movement.direction)}>
                          {movement.direction}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>

      <EntityListSurface
        definition={accountDefinition}
        initialRows={accountRows}
        persistence={persistence}
      />
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

function formatMoney(value: number, currency = "TL") {
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} ${currency}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

function normalizeCurrency(value?: string): CashBankMovementCurrency {
  if (value === "USD" || value === "EUR") {
    return value;
  }

  return "TL";
}

function resolveActiveAccounts(accountRows: EntityRow[]) {
  return accountRows
    .filter((account) => account.status !== "Pasif")
    .map((account) => ({
      code: account.code,
      currency: account.currency,
      name: account.name,
    }));
}

function createMovementValuesFromForm(
  form: MovementFormState,
  accounts: ReturnType<typeof resolveActiveAccounts>,
): CashBankMovementCreateValues {
  const account = accounts.find((item) => item.code === form.accountCode);
  const counterAccount = manualCashBankCounterAccounts[form.movementType].find(
    (item) => item.code === form.counterAccountCode,
  );

  return {
    accountCode: account?.code ?? form.accountCode,
    accountName: account?.name ?? "",
    amount: toNumber(form.amount),
    counterAccountCode: counterAccount?.code ?? form.counterAccountCode,
    counterAccountName: counterAccount?.name ?? "",
    counterpartyName: form.counterpartyName.trim(),
    currency: form.currency,
    description: form.description.trim(),
    documentNo: form.documentNo.trim(),
    movementDate: form.movementDate,
    movementType: form.movementType,
  };
}

function createTransferValuesFromForm(
  form: TransferFormState,
  accounts: ReturnType<typeof resolveActiveAccounts>,
): CashBankTransferValues {
  const fromAccount = accounts.find((item) => item.code === form.fromAccountCode);
  const toAccount = accounts.find((item) => item.code === form.toAccountCode);

  return {
    amount: toNumber(form.amount),
    currency: form.currency,
    description: form.description.trim(),
    documentNo: form.documentNo.trim(),
    fromAccountCode: fromAccount?.code ?? form.fromAccountCode,
    fromAccountName: fromAccount?.name ?? "",
    movementDate: form.movementDate,
    toAccountCode: toAccount?.code ?? form.toAccountCode,
    toAccountName: toAccount?.name ?? "",
  };
}

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function directionBadgeClass(direction: CashBankMovementRow["direction"]) {
  const tone =
    direction === "Giriş"
      ? "bg-[var(--status-approved)]"
      : "bg-[var(--status-cancelled)]";

  return `rounded-[var(--radius-control)] ${tone} px-2 py-1 text-xs font-semibold text-white`;
}

const controlClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm outline-none transition focus:border-[var(--primary)]";

const toolbarButtonClass =
  "rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--primary-fixed)] disabled:opacity-50";
