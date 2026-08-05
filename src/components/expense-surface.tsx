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
} from "@/lib/settings-contract";
import { Icon, type IconName } from "@/components/ui";

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
  defaultVatRate?: number;
  showVatBreakdown?: boolean;
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
  defaultVatRate = 20,
  showVatBreakdown = true,
  today = new Date().toISOString().slice(0, 10),
}: ExpenseSurfaceProps) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [localPaymentMovements, setLocalPaymentMovements] =
    useState(paymentMovements);
  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("Tümü");
  const activeRows = displayRows.filter((row) => row.status !== "İptal");
  const vatTotal = activeRows.reduce((total, row) => total + row.vatTotal, 0);
  const grandTotal = activeRows.reduce((total, row) => total + row.grandTotal, 0);
  const currentMonthTotal = activeRows.filter((row) => row.expenseDate.startsWith(today.slice(0, 7))).reduce((total, row) => total + row.grandTotal, 0);
  const paymentLinkedCount = activeRows.filter((row) => Boolean(getExpensePayment(localPaymentMovements, row.id))).length;
  const expenseGroups = buildExpenseGroups(activeRows);
  const query = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filteredRows = displayRows.filter((row) => {
    const matchesGroup = groupFilter === "Tümü" || normalizeMovementGroup(row.movementGroup) === groupFilter;
    const matchesQuery = !query || [row.documentNo, row.siteName, row.movementGroup, row.counterpartyName, row.description ?? ""].some((value) => value.toLocaleLowerCase("tr-TR").includes(query));
    return matchesGroup && matchesQuery;
  });
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
      vatRate: String(defaultVatRate),
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
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <nav aria-label="İçerik yolu" className="text-xs font-semibold text-content-muted">Finans / Giderler</nav>
          <h1 className="mt-2 text-3xl font-bold leading-[2.375rem] tracking-[-0.02em] text-content">Gider Yönetimi</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">Şantiye ve ofis harcamalarını ödeme hesabı ve muhasebe fişi bağlantısıyla aynı çalışma alanında yönetin.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-ui-control border border-divider bg-surface-raised px-3 py-2 text-xs font-semibold text-content-subtle shadow-sm"><Icon name="receipt" size={18} /> {activeRows.length} aktif gider</span>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-ui-panel border border-divider bg-surface-raised p-2">
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

      <div className="flex flex-col gap-3 rounded-ui-panel border border-divider bg-surface-raised p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm"><Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" name="search" size={16} /><input aria-label="Gider ara" className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised py-2 pl-9 pr-3 text-sm text-content outline-none transition placeholder:text-content-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Evrak, şantiye veya cari ara" value={searchQuery} /></div>
        <select aria-label="Gider grubu filtresi" className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm text-content outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" onChange={(event) => setGroupFilter(event.target.value)} value={groupFilter}><option value="Tümü">Tüm gruplar</option>{expenseGroups.map((group) => <option key={group.name} value={group.name}>{group.name}</option>)}</select>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-ui-panel border border-[var(--ds-danger)] bg-surface-raised p-3 text-sm text-[var(--ds-danger)]">
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
          className="rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm font-semibold text-content-subtle"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {form ? (
        <article className="rounded-ui-panel border border-divider bg-surface-raised">
          <div className="border-b border-divider bg-surface-muted px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">Gider Kaydı Ekle</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-content-subtle">
              <span className="rounded-ui-control bg-surface-muted px-2 py-1">
                {baseCurrencyContext}
              </span>
              <span className="rounded-ui-control bg-surface-muted px-2 py-1">
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

      <div aria-label="Gider özet metrikleri" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon="wallet" label="Toplam Gider" tone="warning" value={formatMoney(grandTotal)} />
        <Metric icon="calendar" label="Bu Ay" value={formatMoney(currentMonthTotal)} />
        {showVatBreakdown ? <Metric detail={`${activeRows.length} aktif kayıt`} icon="receipt" label="KDV Toplamı" tone="success" value={formatMoney(vatTotal)} /> : null}
        <Metric detail={`${paymentLinkedCount}/${activeRows.length} ödeme bağlantılı`} icon="bank" label="Ödeme Bağlantısı" value={String(paymentLinkedCount)} />
      </div>

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="border-b border-divider bg-surface-muted px-4 py-4 sm:px-5">
          <div><h2 className="text-lg font-semibold text-content">Son Giderler</h2><p className="mt-1 text-sm text-content-subtle">{filteredRows.length} kayıt gösteriliyor</p></div>
        </div>
        <div className="overflow-x-auto">
          <table aria-label="Gider hareketleri tablosu" className="min-w-[980px] w-full text-left text-sm">
            <thead className="border-b border-divider bg-surface-muted text-xs uppercase tracking-wide text-content-muted">
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
            <tbody className="divide-y divide-divider">
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={9}>
                    <p className="font-semibold">Henüz gider kaydı yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      İlk gider kaydı şantiye maliyeti ve kasa/banka çıkışını
                      aynı anda başlatır.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
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
                          <span className="mt-1 block text-[11px] text-content-subtle">
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
                            <span className="font-semibold text-[var(--ds-success)]">
                              Ödendi
                            </span>
                            <span className="text-xs text-content-subtle">
                              {paymentMovement.accountName}
                            </span>
                            <span className="font-mono text-xs text-content-subtle">
                              {paymentMovement.documentNo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-content-subtle">
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

      <section aria-label="Gider dağılımı" className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">Finansal analiz</p><h2 className="mt-1 text-lg font-semibold text-content">Gider Dağılımı</h2><p className="mt-1 text-sm text-content-subtle">Aktif giderlerin mevcut hareket grubuna göre dağılımı</p></div><Icon className="text-brand-primary" name="chart" size={21} /></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {expenseGroups.length === 0 ? <p className="text-sm text-content-subtle">Dağılım için aktif gider kaydı yok.</p> : expenseGroups.map((group) => {
            const percentage = grandTotal > 0 ? (group.amount / grandTotal) * 100 : 0;
            return <article className="rounded-ui-control border border-divider bg-surface-muted p-4" key={group.name}><div className="flex items-center justify-between gap-3"><span className="truncate font-semibold text-content">{group.name}</span><span className="font-mono text-xs text-content-subtle">{percentage.toFixed(0)}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${percentage}%` }} /></div><p className="mt-2 font-mono text-sm font-semibold tabular-nums text-content">{formatMoney(group.amount)}</p></article>;
          })}
        </div>
      </section>
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

function Metric({ detail, icon, label, tone = "brand", value }: { detail?: string; icon: IconName; label: string; tone?: "brand" | "success" | "warning"; value: string }) {
  const toneClasses = { brand: "bg-brand-primary-subtle text-brand-primary", success: "bg-success-subtle text-success", warning: "bg-warning-subtle text-warning" }[tone];

  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-content-muted">{label}</p><p className="mt-4 font-mono text-xl font-bold tabular-nums text-content">{value}</p>{detail ? <p className="mt-1 text-xs text-content-subtle">{detail}</p> : null}</div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-control ${toneClasses}`}><Icon name={icon} size={19} /></span>
      </div>
    </article>
  );
}

function buildExpenseGroups(rows: ExpenseRow[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = normalizeMovementGroup(row.movementGroup);
    totals.set(name, (totals.get(name) ?? 0) + row.grandTotal);
  }
  return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((left, right) => right.amount - left.amount);
}

function normalizeMovementGroup(value: string) {
  return value.trim() || "Grupsuz";
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
    ? "bg-brand-primary-subtle ring-1 ring-inset ring-brand-primary"
    : "hover:bg-brand-primary-subtle";
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
  "h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm outline-none transition focus:border-brand-primary";

const toolbarButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-ui-control border border-divider bg-surface-raised px-3 text-sm font-semibold text-content transition-colors hover:bg-surface-muted";
