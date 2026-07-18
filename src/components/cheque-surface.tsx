"use client";

import { useState } from "react";

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
  const baseCurrencyContext = `Baz Para: ${getP0BaseCurrencyDisplayValue()}`;
  const currencyPolicyContext = getP0CurrencyPolicyDisplayValue();
  const p0ChequeCurrency = getP0BaseCurrencyTransactionValue();
  const portfolioRows = displayRows.filter((row) => row.status === "Portföyde");
  const collectedRows = displayRows.filter((row) => row.status === "Tahsil Edildi");
  const portfolioTotal = portfolioRows.reduce((total, row) => total + row.amount, 0);
  const collectedTotal = collectedRows.reduce((total, row) => total + row.amount, 0);

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
      setPrintNotice(`Yazdırma kapsamı hazır: ${displayRows.length} çek.`);
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
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Portföy, vade ve tahsil
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Çek İşlemleri
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              Gelen çek kaydı, portföy takibi ve tahsil durum geçişi ilk çek
              işlem yüzeyi olarak PostgreSQL ve audit altyapısına bağlandı.
            </p>
          </div>
          <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            Gelen Çek
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-2">
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
        <div className="rounded-[var(--radius-panel)] border border-[var(--status-cancelled)] bg-[var(--surface-container-lowest)] p-3 text-sm text-[var(--status-cancelled)]">
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
          className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-3 text-sm font-semibold text-[var(--on-surface-variant)]"
          role="status"
        >
          {printNotice}
        </div>
      ) : null}

      <label className="grid gap-1 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-3 text-sm font-medium md:max-w-md">
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
        <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Gelen Çek Ekle</h2>
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

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Portföy Toplamı" value={formatMoney(portfolioTotal)} />
        <Metric label="Tahsil Toplamı" value={formatMoney(collectedTotal)} />
        <Metric label="Portföy Adedi" value={String(portfolioRows.length)} />
      </div>

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="border-b border-[var(--grid-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Çek portföy listesi</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
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
            <tbody className="divide-y divide-[var(--grid-border)]">
              {displayRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={8}>
                    <p className="font-semibold">Henüz çek kaydı yok</p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      İlk gelen çek kaydı portföy ve tahsil akışını başlatır.
                    </p>
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const isCollecting = collectingId === row.id;
                  const canCollect =
                    permissions.canMutateCheques && row.status === "Portföyde";

                  return (
                    <tr className="hover:bg-[var(--primary-fixed)]" key={row.id}>
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
                            <span className="font-mono text-[11px] text-[var(--on-surface-variant)]">
                              Fiş: {row.ledgerDocumentNo}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          aria-label={`Tahsil Et ${row.documentNo}`}
                          className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 py-1 text-xs font-semibold transition hover:bg-[var(--primary-fixed)] disabled:opacity-50"
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
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
      <div className="border-b border-[var(--grid-border)] px-4 py-3">
        <h2 className="text-sm font-semibold">İşlem Geçmişi</h2>
      </div>
      <div className="divide-y divide-[var(--grid-border)]">
        {groups.map(({ logs, row }) => (
          <section className="grid gap-3 p-4 lg:grid-cols-[180px_1fr]" key={row.id}>
            <div>
              <p className="font-mono text-xs font-semibold">{row.documentNo}</p>
              <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                {row.checkNo}
              </p>
            </div>
            <ol className="grid gap-2">
              {logs.map((log) => (
                <li
                  className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2"
                  key={log.id}
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold">
                      {formatAuditAction(log.action)}
                    </p>
                    <time className="font-mono text-xs text-[var(--on-surface-variant)]">
                      {formatAuditDate(log.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
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
    <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-4">
      <p className="text-sm font-semibold text-[var(--on-surface-variant)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
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
      ? "bg-[var(--status-complete)]"
      : status === "İptal"
        ? "bg-[var(--status-cancelled)]"
        : "bg-[var(--status-process)]";

  return `rounded-[var(--radius-control)] ${tone} px-2 py-1 text-xs font-semibold text-white`;
}

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

const controlClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm outline-none transition focus:border-[var(--primary)]";

const toolbarButtonClass =
  "rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--primary-fixed)]";
