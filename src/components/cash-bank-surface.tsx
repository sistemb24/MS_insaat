"use client";

import { useState } from "react";

import { Button, Icon, Panel, StatusBadge, type IconName } from "@/components/ui";
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

type MovementFilter = "all" | "incoming" | "ledger" | "outgoing" | "reversal";

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
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const [movementQuery, setMovementQuery] = useState("");
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
  const normalizedMovementQuery = movementQuery.trim().toLocaleLowerCase("tr-TR");
  const filteredMovements = displayMovements.filter((movement) => {
    if (movementFilter === "incoming" && movement.direction !== "Giriş") {
      return false;
    }
    if (movementFilter === "outgoing" && movement.direction !== "Çıkış") {
      return false;
    }
    if (movementFilter === "ledger" && !movement.ledgerDocumentNo) {
      return false;
    }
    if (
      movementFilter === "reversal" &&
      movement.sourceType !== "cash-bank-movement-reversal"
    ) {
      return false;
    }

    return (
      !normalizedMovementQuery ||
      [
        movement.accountCode,
        movement.accountName,
        movement.counterpartyName,
        movement.description,
        movement.documentNo,
        movement.ledgerDocumentNo,
        movement.movementType,
        movement.sourceLabel,
      ].some((value) =>
        value?.toLocaleLowerCase("tr-TR").includes(normalizedMovementQuery),
      )
    );
  });
  const ledgerMovementCount = displayMovements.filter(
    (movement) => movement.ledgerDocumentNo,
  ).length;
  const currentTlBalance = accountBalances
    .filter((account) => account.currency === "TL")
    .reduce((total, account) => total + account.currentBalance, 0);

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
      `Yazdırma kapsamı hazır: ${filteredMovements.length} hareket.`,
    );
    window.print();
  }

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="İçerik yolu" className="text-xs font-semibold text-content-muted">
            Finans / Kasa ve Banka Yönetimi
          </nav>
          <h1 className="mt-2 text-3xl font-bold leading-[2.375rem] tracking-[-0.02em] text-content">
            Kasa/Banka
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
            Hesap bakiyelerini, tahsilat ve ödemeleri, virman çiftlerini ve
            oluşan muhasebe fişlerini aynı dönem kapsamındaki gerçek kayıtlarla izleyin.
          </p>
        </div>
        <StatusBadge className="shrink-0" tone={permissions.canMutateMovements ? "success" : "warning"}>
          {permissions.canMutateMovements ? "Finans işlemleri açık" : "Salt okunur görünüm"}
        </StatusBadge>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon="wallet" label="TL Güncel Bakiye" value={formatMoney(currentTlBalance)} />
        <Metric icon="chart" label="Giriş Toplamı" value={formatMoney(incomingTotal)} />
        <Metric icon="receipt" label="Çıkış Toplamı" value={formatMoney(outgoingTotal)} />
        <Metric
          detail={`${displayMovements.length} toplam hareket`}
          icon="bank"
          label="Muhasebeleşen"
          value={String(ledgerMovementCount)}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-ui-panel border border-divider bg-surface-raised p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!permissions.canMutateMovements}
            leadingIcon={<Icon name="plus" size={16} />}
            onClick={startCreateMovement}
            size="sm"
          >
            Yeni Hareket
          </Button>
          <Button
            disabled={!permissions.canMutateMovements || activeAccounts.length < 2}
            leadingIcon={<Icon name="bank" size={16} />}
            onClick={startCreateTransfer}
            size="sm"
            variant="secondary"
          >
            Virman
          </Button>
        </div>
        <Button
          leadingIcon={<Icon name="file" size={16} />}
          onClick={printMovements}
          size="sm"
          variant="ghost"
        >
          Hareketleri Yazdır
        </Button>
      </div>

      {printNotice ? (
        <div className="rounded-ui-control border border-accent-violet bg-brand-primary-subtle px-4 py-3 text-sm font-semibold text-brand-primary" role="status">
          {printNotice}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="rounded-ui-panel border border-danger bg-danger-subtle p-4 text-sm text-danger" role="alert">
          <p className="font-semibold">Kasa/banka hareketi kaydedilemedi</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      {form ? (
        <Panel
          actions={
            <>
              <Button onClick={() => setForm(null)} size="sm" variant="ghost">Vazgeç</Button>
              <Button
                disabled={!permissions.canMutateMovements}
                isPending={isSavingMovement}
                onClick={saveMovement}
                pendingLabel="Kaydediliyor"
                size="sm"
              >
                Hareket Kaydet
              </Button>
            </>
          }
          description="Manuel tahsilat veya ödeme, seçilen karşı muhasebe hesabıyla dengeli fiş üretir."
          title="Manuel Kasa/Banka Hareketi"
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusBadge tone="info">{baseCurrencyContext}</StatusBadge>
            <StatusBadge tone="neutral">{currencyPolicyContext}</StatusBadge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Hareket Tipi">
              <select className={controlClass} onChange={(event) => selectMovementType(event.target.value as ManualCashBankMovementType)} value={form.movementType}>
                <option value="Tahsilat">Tahsilat</option>
                <option value="Ödeme">Ödeme</option>
              </select>
            </Field>
            <Field label="Hesap">
              <select className={controlClass} onChange={(event) => selectAccount(event.target.value)} value={form.accountCode}>
                {activeAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}
              </select>
            </Field>
            <Field label="Karşı Muhasebe Hesabı">
              <select className={controlClass} onChange={(event) => updateForm("counterAccountCode", event.target.value)} value={form.counterAccountCode}>
                {manualCashBankCounterAccounts[form.movementType].map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}
              </select>
            </Field>
            <Field label="Hareket Tarihi">
              <input className={controlClass} onChange={(event) => updateForm("movementDate", event.target.value)} type="date" value={form.movementDate} />
            </Field>
            <Field label="Evrak No">
              <input className={controlClass} onChange={(event) => updateForm("documentNo", event.target.value)} value={form.documentNo} />
            </Field>
            <Field label="Cari">
              <input className={controlClass} onChange={(event) => updateForm("counterpartyName", event.target.value)} value={form.counterpartyName} />
            </Field>
            <Field label="Tutar">
              <input className={`${controlClass} text-right font-mono`} onChange={(event) => updateForm("amount", event.target.value)} type="number" value={form.amount} />
            </Field>
            <Field label="Para Birimi">
              <select className={controlClass} disabled onChange={(event) => updateForm("currency", event.target.value as CashBankMovementCurrency)} value={form.currency}>
                <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </Field>
            <Field label="Açıklama">
              <input className={controlClass} onChange={(event) => updateForm("description", event.target.value)} value={form.description} />
            </Field>
          </div>
        </Panel>
      ) : null}

      {transferForm ? (
        <Panel
          actions={
            <>
              <Button onClick={() => setTransferForm(null)} size="sm" variant="ghost">Vazgeç</Button>
              <Button
                disabled={!permissions.canMutateMovements}
                isPending={isSavingTransfer}
                onClick={saveTransfer}
                pendingLabel="Kaydediliyor"
                size="sm"
              >
                Virman Kaydet
              </Button>
            </>
          }
          description="Çıkış ve giriş hareketleri aynı evrak numarasıyla birlikte oluşturulur."
          title="Kasa/Banka Virmanı"
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusBadge tone="info">{baseCurrencyContext}</StatusBadge>
            <StatusBadge tone="neutral">{currencyPolicyContext}</StatusBadge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Çıkış Hesabı">
              <select className={controlClass} onChange={(event) => selectTransferFromAccount(event.target.value)} value={transferForm.fromAccountCode}>
                {activeAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}
              </select>
            </Field>
            <Field label="Giriş Hesabı">
              <select className={controlClass} onChange={(event) => updateTransferForm("toAccountCode", event.target.value)} value={transferForm.toAccountCode}>
                {activeAccounts.map((account) => <option key={account.code} value={account.code}>{account.code} · {account.name}</option>)}
              </select>
            </Field>
            <Field label="Hareket Tarihi">
              <input className={controlClass} onChange={(event) => updateTransferForm("movementDate", event.target.value)} type="date" value={transferForm.movementDate} />
            </Field>
            <Field label="Evrak No">
              <input className={controlClass} onChange={(event) => updateTransferForm("documentNo", event.target.value)} value={transferForm.documentNo} />
            </Field>
            <Field label="Tutar">
              <input className={`${controlClass} text-right font-mono`} onChange={(event) => updateTransferForm("amount", event.target.value)} type="number" value={transferForm.amount} />
            </Field>
            <Field label="Para Birimi">
              <select className={controlClass} disabled onChange={(event) => updateTransferForm("currency", event.target.value as CashBankMovementCurrency)} value={transferForm.currency}>
                <option value="TL">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </select>
            </Field>
            <Field label="Açıklama">
              <input className={controlClass} onChange={(event) => updateTransferForm("description", event.target.value)} value={transferForm.description} />
            </Field>
          </div>
        </Panel>
      ) : null}

      <Panel
        description={`${activeAccounts.length} aktif hesap · açılış, dönem hareketi ve güncel bakiye birlikte gösterilir.`}
        padding="none"
        title="Hesap Bakiye Özeti"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-divider bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Hesap</th>
                <th className="px-4 py-3 font-semibold">Tip</th>
                <th className="px-4 py-3 text-right font-semibold">Açılış</th>
                <th className="px-4 py-3 text-right font-semibold">Giriş</th>
                <th className="px-4 py-3 text-right font-semibold">Çıkış</th>
                <th className="px-5 py-3 text-right font-semibold">Güncel Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {accountBalances.map((account) => (
                <tr className="transition-colors hover:bg-surface-muted" key={account.accountCode}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-ui-control border border-divider bg-brand-primary-subtle text-brand-primary">
                        <Icon name={account.type === "Banka" ? "bank" : "wallet"} size={18} />
                      </span>
                      <span><span className="block font-semibold text-content">{account.accountName}</span><span className="font-mono text-xs text-content-muted">{account.accountCode}</span></span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-content-subtle">{account.type}</td>
                  <td className="px-4 py-3 text-right font-mono text-content-subtle">{formatMoney(account.openingBalance, account.currency)}</td>
                  <td className="px-4 py-3 text-right font-mono text-success">{formatMoney(account.incomingTotal, account.currency)}</td>
                  <td className="px-4 py-3 text-right font-mono text-danger">{formatMoney(account.outgoingTotal, account.currency)}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-content">{formatMoney(account.currentBalance, account.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        description={`${filteredMovements.length} / ${displayMovements.length} hareket gösteriliyor · evrak ve fiş ilişkisi aynı satırda.`}
        padding="none"
        title="Otomatik Hareketler"
      >
        <div className="grid gap-3 border-b border-divider p-4 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Hareketlerde ara</span>
            <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" name="search" size={17} />
            <input
              className={`${controlClass} pl-10`}
              onChange={(event) => setMovementQuery(event.target.value)}
              placeholder="Evrak, fiş, hesap veya cari ara"
              type="search"
              value={movementQuery}
            />
          </label>
          <div aria-label="Hareket filtresi" className="flex flex-wrap gap-2" role="group">
            {movementFilters.map((filter) => (
              <button
                aria-pressed={movementFilter === filter.value}
                className={movementFilter === filter.value ? activeFilterClass : filterClass}
                key={filter.value}
                onClick={() => setMovementFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table aria-label="Kasa banka hareketleri" className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-divider bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Tarih / Evrak</th>
                <th className="px-4 py-3 font-semibold">Hareket</th>
                <th className="px-4 py-3 font-semibold">Muhasebe fişi</th>
                <th className="px-4 py-3 font-semibold">Hesap</th>
                <th className="px-4 py-3 font-semibold">Cari</th>
                <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                <th className="px-5 py-3 text-center font-semibold">Yön</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center" colSpan={7}>
                    <Icon className="mx-auto text-content-muted" name="empty" size={28} />
                    <p className="mt-3 font-semibold text-content">
                      {displayMovements.length === 0 ? "Henüz kasa/banka hareketi yok" : "Filtreyle eşleşen hareket yok"}
                    </p>
                    <p className="mt-1 text-sm text-content-subtle">
                      {displayMovements.length === 0 ? "Çek tahsili ve ödeme akışları bağlandıkça bu liste dolar." : "Arama metnini veya hareket filtresini değiştirin."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
                  const isHighlighted = isHighlightedDocument(movement.documentNo, highlightedDocumentNo);
                  return (
                    <tr className={highlightedRowClass(isHighlighted)} data-highlighted={isHighlighted ? "true" : undefined} key={movement.id}>
                      <td className="px-5 py-3"><span className="block text-content-subtle">{formatDate(movement.movementDate)}</span><span className="mt-1 block font-mono text-xs font-semibold text-content">{movement.documentNo}</span></td>
                      <td className="px-4 py-3"><span className="font-semibold text-content">{movement.movementType}</span>{movement.sourceType === "cash-bank-movement-reversal" ? <span className="mt-1 block text-xs font-semibold text-danger">Ters kayıt</span> : null}<span className="mt-1 block max-w-64 truncate text-xs text-content-muted">{movement.description}</span></td>
                      <td className="px-4 py-3">{movement.ledgerDocumentNo ? <StatusBadge tone="info"><span className="font-mono">{movement.ledgerDocumentNo}</span></StatusBadge> : <span className="text-content-muted">Fiş yok</span>}</td>
                      <td className="px-4 py-3"><span className="block font-semibold text-content">{movement.accountName}</span><span className="font-mono text-xs text-content-muted">{movement.accountCode}</span></td>
                      <td className="px-4 py-3 text-content-subtle">{movement.counterpartyName || "-"}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-content">{formatMoney(movement.amount, movement.currency)}</td>
                      <td className="px-5 py-3 text-center"><StatusBadge tone={movement.direction === "Giriş" ? "success" : "danger"}>{movement.direction}</StatusBadge></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        description="Hareketlerde seçilebilen kasa ve banka kartlarını oluşturun, güncelleyin veya pasifleştirin."
        padding="none"
        title="Hesap Kartları ve Tanımlar"
      >
        <div className="p-4 sm:p-5">
          <EntityListSurface definition={accountDefinition} hideHeader initialRows={accountRows} persistence={persistence} />
        </div>
      </Panel>
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
    : "transition-colors hover:bg-surface-muted";
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-content-subtle">
      {label}
      {children}
    </label>
  );
}

function Metric({
  detail,
  icon,
  label,
  value,
}: {
  detail?: string;
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-primary-subtle" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">{label}</p>
          <p className="mt-3 font-mono text-2xl font-bold tracking-tight text-content">{value}</p>
          {detail ? <p className="mt-1 text-xs text-content-subtle">{detail}</p> : null}
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-subtle text-brand-primary">
          <Icon name={icon} size={18} />
        </span>
      </div>
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

const controlClass =
  "h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm text-content outline-none transition-colors placeholder:text-content-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-content-muted";

const movementFilters: Array<{ label: string; value: MovementFilter }> = [
  { label: "Tümü", value: "all" },
  { label: "Giriş", value: "incoming" },
  { label: "Çıkış", value: "outgoing" },
  { label: "Muhasebeleşen", value: "ledger" },
  { label: "Ters Kayıtlar", value: "reversal" },
];

const filterClass =
  "min-h-9 rounded-ui-control border border-divider bg-surface-raised px-3 py-1.5 text-xs font-semibold text-content-subtle transition-colors hover:bg-surface-muted hover:text-content";

const activeFilterClass =
  "min-h-9 rounded-ui-control border border-brand-primary bg-brand-primary-subtle px-3 py-1.5 text-xs font-semibold text-brand-primary";
