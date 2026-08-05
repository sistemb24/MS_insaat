"use client";

import { useState } from "react";

import { Icon } from "@/components/ui";
import type { AuditLogEntry } from "@/lib/audit-log";
import type { CashBankAccountOption } from "@/lib/cash-bank-movement-service";
import type { ChequeCreateValues, ChequeRow } from "@/lib/cheque-service";
import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
} from "@/lib/settings-contract";

type ChequeSurfaceProps = {
  accountOptions?: CashBankAccountOption[];
  auditLogsByEntityId?: Record<string, AuditLogEntry[]>;
  permissions?: {
    canMutateCheques: boolean;
  };
  persistence?: {
    collectCheque?: (
      id: string,
      collectionAccount?: CashBankAccountOption,
    ) => Promise<
      | {
          ok: true;
          data: ChequeRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    createCheque?: (
      values: ChequeCreateValues,
    ) => Promise<
      | {
          ok: true;
          data: ChequeRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
  };
  rows: ChequeRow[];
  initialSearchQuery?: string;
  highlightedRecordId?: string;
  today?: string;
};

type FormState = {
  amount: string;
  bankName: string;
  branchName: string;
  checkNo: string;
  currency: "TL" | "USD" | "EUR";
  description: string;
  direction: "Gelen" | "Firma";
  documentNo: string;
  drawerName: string;
  dueDate: string;
  issueDate: string;
};

export function ChequeSurface({
  accountOptions = [],
  auditLogsByEntityId = {},
  permissions = { canMutateCheques: true },
  persistence,
  rows,
  initialSearchQuery = "",
  highlightedRecordId,
  today = new Date().toISOString().slice(0, 10),
}: ChequeSurfaceProps) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [form, setForm] = useState<FormState | null>(null);
  const [selectedAccountCode, setSelectedAccountCode] = useState(
    accountOptions[0]?.code ?? "KASA-0001",
  );
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [printNotice, setPrintNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState<"Tümü" | ChequeRow["status"]>(
    "Tümü",
  );
  const baseCurrencyContext = `Baz Para: ${getP0BaseCurrencyDisplayValue()}`;
  const currencyPolicyContext = getP0CurrencyPolicyDisplayValue();
  const p0ChequeCurrency = getP0BaseCurrencyTransactionValue();
  const portfolioRows = displayRows.filter((row) => row.status === "Portföyde");
  const collectedRows = displayRows.filter((row) => row.status === "Tahsil Edildi");
  const portfolioTotal = portfolioRows.reduce((total, row) => total + row.amount, 0);
  const collectedTotal = collectedRows.reduce((total, row) => total + row.amount, 0);
  const dueSoonRows = portfolioRows.filter((row) => {
    const dueDate = new Date(`${row.dueDate}T00:00:00`).getTime();
    const todayDate = new Date(`${today}T00:00:00`).getTime();
    const thirtyDaysAfterToday = todayDate + 30 * 24 * 60 * 60 * 1000;

    return dueDate >= todayDate && dueDate <= thirtyDaysAfterToday;
  });
  const visibleRows = displayRows.filter((row) => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");
    const matchesStatus = statusFilter === "Tümü" || row.status === statusFilter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        row.documentNo,
        row.checkNo,
        row.bankName,
        row.branchName,
        row.drawerName,
      ].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedQuery));

    return matchesStatus && matchesQuery;
  });

  function startCreate() {
    if (!permissions.canMutateCheques) {
      return;
    }

    setErrors([]);
    setForm({
      amount: "0",
      bankName: "",
      branchName: "",
      checkNo: "",
      currency: p0ChequeCurrency,
      description: "",
      direction: "Gelen",
      documentNo: "",
      drawerName: "",
      dueDate: today,
      issueDate: today,
    });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setErrors([]);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveForm() {
    if (!form || !persistence?.createCheque || !permissions.canMutateCheques) {
      return;
    }

    setIsSaving(true);
    setErrors([]);

    const result = await persistence.createCheque(createValuesFromForm(form));

    if (result.ok) {
      setDisplayRows((current) => [result.data, ...current]);
      setForm(null);
      setIsSaving(false);
      return;
    }

    setErrors(result.errors);
    setIsSaving(false);
  }

  async function collectCheque(row: ChequeRow) {
    if (
      !permissions.canMutateCheques ||
      !persistence?.collectCheque ||
      row.status !== "Portföyde"
    ) {
      return;
    }

    setCollectingId(row.id);
    setErrors([]);

    const selectedAccount = resolveSelectedAccount(
      accountOptions,
      selectedAccountCode,
    );
    const result = await persistence.collectCheque(row.id, selectedAccount);

    if (result.ok) {
      setDisplayRows((current) =>
        current.map((currentRow) =>
          currentRow.id === result.data.id ? result.data : currentRow,
        ),
      );
      setCollectingId(null);
      return;
    }

    setErrors(result.errors);
    setCollectingId(null);
  }

  function handleToolbarAction(action: string) {
    if (action === "Yazdır") {
      setPrintNotice(`Yazdırma kapsamı hazır: ${visibleRows.length} çek.`);
      window.print();
      return;
    }

    if (action === "PDF Önizleme") {
      setPrintNotice(
        "PDF önizleme P0 kapsamı dışında; görünen çek listesi için Yazdır kullanılabilir.",
      );
      return;
    }

    if (action === "Bordro") {
      setPrintNotice(
        "Çek bordrosu P0 kapsamı dışında; görünen çek listesi için Yazdır kullanılabilir.",
      );
      return;
    }

    if (action === "Yenile") {
      setPrintNotice(
        "Çek listesi server render ve revalidate akışıyla güncellenir.",
      );
    }
  }

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-5">
      <header className="rounded-ui-panel border border-divider bg-surface-raised p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">
          Finans · çek portföyü
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-content sm:text-3xl">
              Çek Yönetimi
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-muted">
              Gelen çekleri portföy, vade ve tahsil durumlarıyla izleyin; her
              tahsilat seçilen kasa veya banka hesabına gerçek hareket olarak işlenir.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary">
            <Icon name="wallet" size={16} /> Portföyde {portfolioRows.length} çek
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-ui-panel border border-divider bg-surface-raised p-2 shadow-sm">
        <button
          className={toolbarButtonClass}
          disabled={!permissions.canMutateCheques}
          onClick={startCreate}
          type="button"
        >
          Yeni
        </button>
        <button
          className={`${toolbarButtonClass} disabled:opacity-50`}
          disabled={!permissions.canMutateCheques || !form || isSaving}
          onClick={saveForm}
          type="button"
        >
          {isSaving ? "Kaydediliyor" : "Kaydet"}
        </button>
        {["Bordro", "Yazdır", "PDF Önizleme", "Yenile"].map((action) => (
          <button
            className={toolbarButtonClass}
            key={action}
            onClick={() => handleToolbarAction(action)}
            type="button"
          >
            {action}
          </button>
        ))}
      </div>

      {errors.length > 0 ? (
        <div className="rounded-ui-panel border border-[var(--ds-danger)] bg-surface-raised p-3 text-sm text-[var(--ds-danger)]">
          <p className="font-semibold">Çek işlemi kaydedilemedi</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {printNotice ? (
        <div
          className="rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm font-semibold text-content-subtle"
          role="status"
        >
          {printNotice}
        </div>
      ) : null}

      <label className="grid gap-1 rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm font-medium shadow-sm md:max-w-md">
        Tahsil Hesabı
        <select
          className={controlClass}
          onChange={(event) => setSelectedAccountCode(event.target.value)}
          value={selectedAccountCode}
        >
          {resolveAccountOptions(accountOptions).map((account) => (
            <option key={account.code} value={account.code}>
              {account.code} · {account.name}
            </option>
          ))}
        </select>
      </label>

      {form ? (
        <article className="rounded-ui-panel border border-divider bg-surface-raised">
          <div className="border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold">Gelen Çek Ekle</h2>
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
            <Field label="Çek No">
              <input
                className={controlClass}
                onChange={(event) => updateForm("checkNo", event.target.value)}
                value={form.checkNo}
              />
            </Field>
            <Field label="Banka">
              <input
                className={controlClass}
                onChange={(event) => updateForm("bankName", event.target.value)}
                value={form.bankName}
              />
            </Field>
            <Field label="Şube">
              <input
                className={controlClass}
                onChange={(event) => updateForm("branchName", event.target.value)}
                value={form.branchName}
              />
            </Field>
            <Field label="Keşideci/Cari">
              <input
                className={controlClass}
                onChange={(event) => updateForm("drawerName", event.target.value)}
                value={form.drawerName}
              />
            </Field>
            <Field label="Düzenleme Tarihi">
              <input
                className={controlClass}
                onChange={(event) => updateForm("issueDate", event.target.value)}
                type="date"
                value={form.issueDate}
              />
            </Field>
            <Field label="Vade Tarihi">
              <input
                className={controlClass}
                onChange={(event) => updateForm("dueDate", event.target.value)}
                type="date"
                value={form.dueDate}
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
                  updateForm("currency", event.target.value as FormState["currency"])
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Portföy Toplamı" value={formatMoney(portfolioTotal)} />
        <Metric label="Tahsil Toplamı" value={formatMoney(collectedTotal)} />
        <Metric label="Portföy Adedi" value={String(portfolioRows.length)} />
        <Metric label="30 Gün İçinde Vade" value={String(dueSoonRows.length)} />
      </div>

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised shadow-sm">
        <div className="flex flex-col gap-3 border-b border-divider p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-content">Çek portföy listesi</h2>
            <p className="mt-1 text-sm text-content-muted">Gösterilen {visibleRows.length} / {displayRows.length} çek</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" name="search" size={16} />
              <input aria-label="Çek ara" className="h-10 w-full rounded-ui-control border border-divider bg-surface-raised py-2 pl-9 pr-3 text-sm text-content outline-none transition placeholder:text-content-muted focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Evrak, çek no veya cari ara" value={searchQuery} />
            </div>
            <select aria-label="Çek durum filtresi" className="h-10 rounded-ui-control border border-divider bg-surface-raised px-3 text-sm text-content outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
              <option value="Tümü">Tüm durumlar</option>
              <option value="Portföyde">Portföyde</option>
              <option value="Tahsil Edildi">Tahsil edildi</option>
              <option value="İptal">İptal</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">Çek No</th>
                <th className="px-4 py-3 font-semibold">Vade</th>
                <th className="px-4 py-3 font-semibold">Keşideci/Cari</th>
                <th className="px-4 py-3 font-semibold">Banka</th>
                <th className="px-4 py-3 text-right font-semibold">Tutar</th>
                <th className="px-4 py-3 text-center font-semibold">Durum</th>
                <th className="px-4 py-3 text-center font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {visibleRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">Gösterilecek çek kaydı yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Filtreyi temizleyin veya ilk gelen çek kaydıyla portföy akışını başlatın.
                    </p>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const isCollecting = collectingId === row.id;
                  const canCollect =
                    permissions.canMutateCheques && row.status === "Portföyde";

                  return (
                    <tr
                      className={
                        row.id === highlightedRecordId
                          ? "bg-brand-primary-subtle ring-1 ring-inset ring-brand-primary"
                          : "hover:bg-brand-primary-subtle"
                      }
                      data-highlighted={
                        row.id === highlightedRecordId ? "true" : undefined
                      }
                      key={row.id}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.documentNo}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {row.checkNo}
                      </td>
                      <td className="px-4 py-3">{formatDate(row.dueDate)}</td>
                      <td className="px-4 py-3">{row.drawerName}</td>
                      <td className="px-4 py-3">
                        {row.bankName}
                        {row.branchName ? ` / ${row.branchName}` : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatMoney(row.amount, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="grid justify-items-center gap-1">
                          <span className={statusBadgeClass(row.status)}>
                            {row.status}
                          </span>
                          {row.ledgerDocumentNo ? (
                            <span className="font-mono text-[11px] text-content-subtle">
                              Fiş: {row.ledgerDocumentNo}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          aria-label={`Tahsil Et ${row.documentNo}`}
                          className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold transition hover:bg-brand-primary-subtle disabled:opacity-50"
                          disabled={!canCollect || isCollecting}
                          onClick={() => collectCheque(row)}
                          type="button"
                        >
                          {isCollecting ? "Tahsil ediliyor" : "Tahsil Et"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>

      <ChequeAuditHistory
        auditLogsByEntityId={auditLogsByEntityId}
        rows={displayRows}
      />
    </section>
  );
}

function ChequeAuditHistory({
  auditLogsByEntityId,
  rows,
}: {
  auditLogsByEntityId: Record<string, AuditLogEntry[]>;
  rows: ChequeRow[];
}) {
  const groups = rows
    .map((row) => ({
      row,
      logs: auditLogsByEntityId[row.id] ?? [],
    }))
    .filter((group) => group.logs.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <article className="rounded-ui-panel border border-divider bg-surface-raised">
      <div className="border-b border-divider px-4 py-3">
        <h2 className="text-sm font-semibold">İşlem Geçmişi</h2>
      </div>
      <div className="divide-y divide-divider">
        {groups.map(({ logs, row }) => (
          <section className="grid gap-3 p-4 lg:grid-cols-[180px_1fr]" key={row.id}>
            <div>
              <p className="font-mono text-xs font-semibold">{row.documentNo}</p>
              <p className="mt-1 text-xs text-content-subtle">
                {row.checkNo}
              </p>
            </div>
            <ol className="grid gap-2">
              {logs.map((log) => (
                <li
                  className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2"
                  key={log.id}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold">
                      {formatAuditAction(log.action)}
                    </p>
                    <time className="font-mono text-xs text-content-subtle">
                      {formatAuditDate(log.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-content-subtle">
                    {formatAuditTransition(log.metadata)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </article>
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
    <article className="rounded-ui-panel border border-divider bg-surface-raised p-4 shadow-sm">
      <p className="text-sm font-semibold text-content-muted">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-content">{value}</p>
    </article>
  );
}

function createValuesFromForm(form: FormState): ChequeCreateValues {
  return {
    amount: toNumber(form.amount),
    bankName: form.bankName.trim(),
    branchName: form.branchName.trim(),
    checkNo: form.checkNo.trim(),
    currency: form.currency,
    description: form.description.trim(),
    direction: form.direction,
    documentNo: form.documentNo.trim(),
    drawerName: form.drawerName.trim(),
    dueDate: form.dueDate,
    issueDate: form.issueDate,
  };
}

function resolveAccountOptions(accountOptions: CashBankAccountOption[]) {
  if (accountOptions.length > 0) {
    return accountOptions;
  }

  return [
    {
      code: "KASA-0001",
      name: "MERKEZ KASA",
    },
  ];
}

function resolveSelectedAccount(
  accountOptions: CashBankAccountOption[],
  selectedAccountCode: string,
) {
  return resolveAccountOptions(accountOptions).find(
    (account) => account.code === selectedAccountCode,
  );
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    "cheque.collect": "Tahsil Edildi",
    "cheque.create": "Oluşturuldu",
  };

  return labels[action] ?? action;
}

function formatAuditTransition(metadata: Record<string, unknown>) {
  const statusFrom = typeof metadata.statusFrom === "string" ? metadata.statusFrom : "";
  const statusTo = typeof metadata.statusTo === "string" ? metadata.statusTo : "";

  if (statusFrom && statusTo) {
    return `${statusFrom} -> ${statusTo}`;
  }

  if (statusTo) {
    return `Durum: ${statusTo}`;
  }

  return "Kayıt hareketi";
}

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
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

function statusBadgeClass(status: ChequeRow["status"]) {
  const tone =
    status === "Tahsil Edildi"
      ? "bg-[var(--ds-success)]"
      : status === "İptal"
        ? "bg-[var(--ds-danger)]"
        : "bg-[var(--ds-info)]";

  return `rounded-ui-control ${tone} px-2 py-1 text-xs font-semibold text-on-status`;
}

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

const controlClass =
  "h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm outline-none transition focus:border-brand-primary";

const toolbarButtonClass =
  "rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:bg-brand-primary-subtle";
