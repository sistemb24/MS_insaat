"use client";

import { useMemo, useState, useTransition } from "react";

import type { AuditLogEntry } from "@/lib/audit-log";
import type {
  CashBankAccountOption,
  CashBankMovementRow,
} from "@/lib/cash-bank-movement-service";
import {
  calculateProgressPaymentTotals,
  createProgressPaymentDraft,
  type ProgressPaymentCreateValues,
  type ProgressPaymentRow,
} from "@/lib/progress-payment-service";
import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
  getP0DefaultVatRateInputValue,
} from "@/lib/settings-contract";

type ProgressPaymentLookupOption = {
  code: string;
  name: string;
};

type ProgressPaymentSurfaceProps = {
  accountOptions?: CashBankAccountOption[];
  auditLogsByEntityId?: Record<string, AuditLogEntry[]>;
  lookups?: {
    counterparties: ProgressPaymentLookupOption[];
    sites: ProgressPaymentLookupOption[];
  };
  permissions?: {
    canMutateProgressPayments: boolean;
  };
  persistence?: {
    cancelProgressPayment?: (
      id: string,
    ) => Promise<
      | { ok: true; data: ProgressPaymentRow }
      | { ok: false; errors: string[] }
    >;
    createProgressPayment?: (
      values: ProgressPaymentCreateValues,
    ) => Promise<
      | { ok: true; data: ProgressPaymentRow }
      | { ok: false; errors: string[] }
    >;
    postProgressPayment?: (
      id: string,
    ) => Promise<
      | { ok: true; data: ProgressPaymentRow }
      | { ok: false; errors: string[] }
    >;
    payProgressPayment?: (
      id: string,
      account?: CashBankAccountOption,
    ) => Promise<
      | { ok: true; data: CashBankMovementRow }
      | { ok: false; errors: string[] }
    >;
    collectProgressPayment?: (
      id: string,
      account?: CashBankAccountOption,
    ) => Promise<
      | { ok: true; data: CashBankMovementRow }
      | { ok: false; errors: string[] }
    >;
  };
  highlightedDocumentNo?: string;
  paymentMovements?: CashBankMovementRow[];
  rows: ProgressPaymentRow[];
  today?: string;
};

type FormState = {
  counterpartyCode: string;
  counterpartyName: string;
  description: string;
  documentNo: string;
  issueDate: string;
  lines: LineState[];
  paymentType: ProgressPaymentCreateValues["paymentType"];
  retentionRate: string;
  siteCode: string;
  siteName: string;
};

type LineState = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
};

export function ProgressPaymentSurface({
  accountOptions = [],
  auditLogsByEntityId = {},
  highlightedDocumentNo,
  lookups = { counterparties: [], sites: [] },
  permissions = { canMutateProgressPayments: true },
  paymentMovements = [],
  persistence,
  rows,
  today = new Date().toISOString().slice(0, 10),
}: ProgressPaymentSurfaceProps) {
  const [displayRows, setDisplayRows] = useState(rows);
  const [localPaymentMovements, setLocalPaymentMovements] =
    useState(paymentMovements);
  const [form, setForm] = useState<FormState | null>(null);
  const [paymentAccountCode, setPaymentAccountCode] = useState(
    accountOptions[0]?.code ?? "",
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [printNotice, setPrintNotice] = useState("");
  const [postingId, setPostingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeRows = displayRows.filter((row) => row.status !== "İptal");
  const grossTotal = activeRows.reduce((total, row) => total + row.grossTotal, 0);
  const retentionTotal = activeRows.reduce(
    (total, row) => total + row.retentionTotal,
    0,
  );
  const grandTotal = activeRows.reduce((total, row) => total + row.grandTotal, 0);
  const draftValues = form ? createValuesFromForm(form) : undefined;
  const draftTotals = useMemo(
    () =>
      draftValues
        ? calculateProgressPaymentTotals(createProgressPaymentDraft(draftValues))
        : undefined,
    [draftValues],
  );
  const baseCurrencyContext = `Baz Para: ${getP0BaseCurrencyDisplayValue()}`;
  const currencyPolicyContext = getP0CurrencyPolicyDisplayValue();
  const defaultVatContext = `Varsayılan KDV: %${getP0DefaultVatRateInputValue()}`;

  function startCreate() {
    if (!permissions.canMutateProgressPayments) {
      return;
    }

    setErrors([]);
    setForm({
      counterpartyCode: "",
      counterpartyName: "",
      description: "",
      documentNo: "",
      issueDate: today,
      lines: [createEmptyLine()],
      paymentType: "Taşeron Hakedişi",
      retentionRate: "5",
      siteCode: "",
      siteName: "",
    });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setErrors([]);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateLine<K extends keyof LineState>(
    lineId: string,
    key: K,
    value: LineState[K],
  ) {
    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.id === lineId ? { ...line, [key]: value } : line,
            ),
          }
        : current,
    );
  }

  function selectCounterparty(code: string) {
    const counterparty = lookups.counterparties.find((item) => item.code === code);

    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            counterpartyCode: code,
            counterpartyName: counterparty?.name ?? "",
          }
        : current,
    );
  }

  function selectSite(code: string) {
    const site = lookups.sites.find((item) => item.code === code);

    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            siteCode: code,
            siteName: site?.name ?? "",
          }
        : current,
    );
  }

  async function saveForm() {
    if (
      !form ||
      !persistence?.createProgressPayment ||
      !permissions.canMutateProgressPayments
    ) {
      return;
    }

    setIsSaving(true);
    setErrors([]);

    const result = await persistence.createProgressPayment(createValuesFromForm(form));

    if (result.ok) {
      setDisplayRows((current) => [result.data, ...current]);
      setForm(null);
      setIsSaving(false);
      return;
    }

    setErrors(result.errors);
    setIsSaving(false);
  }

  async function postProgressPayment(row: ProgressPaymentRow) {
    if (
      !persistence?.postProgressPayment ||
      !permissions.canMutateProgressPayments ||
      row.status !== "Taslak"
    ) {
      return;
    }

    setPostingId(row.id);
    setErrors([]);

    const result = await persistence.postProgressPayment(row.id);

    if (result.ok) {
      setDisplayRows((current) =>
        current.map((currentRow) =>
          currentRow.id === result.data.id ? result.data : currentRow,
        ),
      );
    } else {
      setErrors(result.errors);
    }

    setPostingId(null);
  }

  async function cancelProgressPayment(row: ProgressPaymentRow) {
    if (
      !persistence?.cancelProgressPayment ||
      !permissions.canMutateProgressPayments ||
      row.status === "İptal"
    ) {
      return;
    }

    setCancellingId(row.id);
    setErrors([]);

    const result = await persistence.cancelProgressPayment(row.id);

    if (result.ok) {
      setDisplayRows((current) =>
        current.map((currentRow) =>
          currentRow.id === result.data.id ? result.data : currentRow,
        ),
      );
    } else {
      setErrors(result.errors);
    }

    setCancellingId(null);
  }

  function payProgressPayment(row: ProgressPaymentRow) {
    if (
      !persistence?.payProgressPayment ||
      !permissions.canMutateProgressPayments ||
      row.status !== "Kaydedildi" ||
      row.paymentType === "Şantiye Geliri" ||
      getProgressPaymentPayment(localPaymentMovements, row.id)
    ) {
      return;
    }

    setPayingId(row.id);
    setPaymentMessage("");
    setErrors([]);

    startTransition(async () => {
      const selectedAccount = accountOptions.find(
        (account) => account.code === paymentAccountCode,
      );
      const result = selectedAccount
        ? await persistence.payProgressPayment?.(row.id, selectedAccount)
        : await persistence.payProgressPayment?.(row.id);

      if (!result) {
        setPayingId(null);
        return;
      }

      if (!result.ok) {
        setErrors(result.errors);
        setPayingId(null);
        return;
      }

      setLocalPaymentMovements((current) => [result.data, ...current]);
      setPaymentMessage("Hakediş ödeme hareketi oluşturuldu.");
      setPayingId(null);
    });
  }

  function collectProgressPayment(row: ProgressPaymentRow) {
    if (
      !persistence?.collectProgressPayment ||
      !permissions.canMutateProgressPayments ||
      row.status !== "Kaydedildi" ||
      row.paymentType !== "Şantiye Geliri" ||
      getProgressPaymentCollection(localPaymentMovements, row.id)
    ) {
      return;
    }

    setPayingId(row.id);
    setPaymentMessage("");
    setErrors([]);

    startTransition(async () => {
      const selectedAccount = accountOptions.find(
        (account) => account.code === paymentAccountCode,
      );
      const result = selectedAccount
        ? await persistence.collectProgressPayment?.(row.id, selectedAccount)
        : await persistence.collectProgressPayment?.(row.id);

      if (!result) {
        setPayingId(null);
        return;
      }

      if (!result.ok) {
        setErrors(result.errors);
        setPayingId(null);
        return;
      }

      setLocalPaymentMovements((current) => [result.data, ...current]);
      setPaymentMessage("Hakediş tahsilat hareketi oluşturuldu.");
      setPayingId(null);
    });
  }

  function handleToolbarAction(action: string) {
    if (action === "Yazdır") {
      setPrintNotice(
        `Yazdırma kapsamı hazır: ${displayRows.length} hakediş.`,
      );
      window.print();
      return;
    }

    if (action === "PDF Önizleme") {
      setPrintNotice(
        "PDF önizleme P0 kapsamı dışında; görünen hakediş listesi için Yazdır kullanılabilir.",
      );
      return;
    }

    if (action === "Onay") {
      setPrintNotice(
        "Hakediş onayı P0 kapsamında satırdaki Kesinleştir aksiyonuyla yönetilir.",
      );
      return;
    }

    if (action === "Yenile") {
      setPrintNotice(
        "Hakediş listesi server render ve revalidate akışıyla güncellenir.",
      );
    }
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <header className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
          Şantiye, taşeron ve cari
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Hakediş</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--on-surface-variant)]">
              Şantiye veya taşeron bağlamında hakediş faturası başlığı, satır
              imalatları, kesinti ve KDV toplamları P0 işlem akışına bağlanır.
            </p>
          </div>
          <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-2 text-xs font-semibold text-[var(--on-surface-variant)]">
            Hakediş Faturası
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-2">
        <button
          className={toolbarButtonClass}
          disabled={!permissions.canMutateProgressPayments}
          onClick={startCreate}
          type="button"
        >
          Yeni
        </button>
        <button
          className={`${toolbarButtonClass} disabled:opacity-50`}
          disabled={!permissions.canMutateProgressPayments || !form || isSaving}
          onClick={saveForm}
          type="button"
        >
          {isSaving ? "Kaydediliyor" : "Kaydet"}
        </button>
        {["Onay", "Yazdır", "PDF Önizleme", "Yenile"].map((action) => (
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
          <p className="font-semibold">Hakediş kaydedilemedi</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {paymentMessage ? (
        <div className="rounded-[var(--radius-panel)] border border-[var(--status-posted)] bg-[var(--surface-container-lowest)] p-3 text-sm font-semibold text-[var(--status-posted)]">
          {paymentMessage}
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

      {form ? (
        <article className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
          <div className="border-b border-[var(--grid-border)] px-4 py-3">
            <h2 className="text-sm font-semibold">Hakediş Faturası Ekle</h2>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Evrak No">
                  <input
                    className={controlClass}
                    onChange={(event) =>
                      updateForm("documentNo", event.target.value)
                    }
                    value={form.documentNo}
                  />
                </Field>
                <Field label="Hakediş Tarihi">
                  <input
                    className={controlClass}
                    onChange={(event) =>
                      updateForm("issueDate", event.target.value)
                    }
                    type="date"
                    value={form.issueDate}
                  />
                </Field>
                <Field label="Kesinti Oranı">
                  <input
                    className={`${controlClass} text-right font-mono`}
                    onChange={(event) =>
                      updateForm("retentionRate", event.target.value)
                    }
                    type="number"
                    value={form.retentionRate}
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Cari">
                  <select
                    className={controlClass}
                    onChange={(event) => selectCounterparty(event.target.value)}
                    value={form.counterpartyCode}
                  >
                    <option value="">Cari seç</option>
                    {lookups.counterparties.map((counterparty) => (
                      <option key={counterparty.code} value={counterparty.code}>
                        {counterparty.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Şantiye">
                  <select
                    className={controlClass}
                    onChange={(event) => selectSite(event.target.value)}
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
                <Field label="Hakediş Tipi">
                  <select
                    className={controlClass}
                    onChange={(event) =>
                      updateForm(
                        "paymentType",
                        event.target.value as FormState["paymentType"],
                      )
                    }
                    value={form.paymentType}
                  >
                    <option value="Taşeron Hakedişi">Taşeron Hakedişi</option>
                    <option value="Şantiye Geliri">Şantiye Geliri</option>
                    <option value="Tedarikçi Hakedişi">Tedarikçi Hakedişi</option>
                  </select>
                </Field>
              </div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Hakediş Satırları</h3>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 py-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                    {baseCurrencyContext}
                  </span>
                  <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 py-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                    {currencyPolicyContext}
                  </span>
                  <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 py-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                    {defaultVatContext}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-[var(--grid-border)]">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
                    <tr>
                      <th className="px-3 py-2">Açıklama</th>
                      <th className="px-3 py-2">Birim</th>
                      <th className="px-3 py-2 text-right">Miktar</th>
                      <th className="px-3 py-2 text-right">Birim Fiyat</th>
                      <th className="px-3 py-2 text-right">KDV %</th>
                      <th className="px-3 py-2 text-right">Satır Toplamı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, index) => (
                      <tr key={line.id}>
                        <td className="p-2">
                          <LineInput
                            label={`Açıklama satır ${index + 1}`}
                            onChange={(value) =>
                              updateLine(line.id, "description", value)
                            }
                            value={line.description}
                          />
                        </td>
                        <td className="p-2">
                          <LineInput
                            label={`Birim satır ${index + 1}`}
                            onChange={(value) => updateLine(line.id, "unit", value)}
                            value={line.unit}
                          />
                        </td>
                        <td className="p-2">
                          <LineInput
                            align="right"
                            label={`Miktar satır ${index + 1}`}
                            onChange={(value) =>
                              updateLine(line.id, "quantity", value)
                            }
                            type="number"
                            value={line.quantity}
                          />
                        </td>
                        <td className="p-2">
                          <LineInput
                            align="right"
                            label={`Birim Fiyat satır ${index + 1}`}
                            onChange={(value) =>
                              updateLine(line.id, "unitPrice", value)
                            }
                            type="number"
                            value={line.unitPrice}
                          />
                        </td>
                        <td className="p-2">
                          <LineInput
                            align="right"
                            label={`KDV satır ${index + 1}`}
                            onChange={(value) => updateLine(line.id, "vatRate", value)}
                            type="number"
                            value={line.vatRate}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {formatMoney(draftTotals?.lines[index]?.grossTotal ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <aside className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
              <h3 className="text-sm font-semibold">Hakediş Toplamları</h3>
              <SummaryRow label="Brüt Toplam" value={draftTotals?.grossTotal ?? 0} />
              <SummaryRow
                label="Kesinti Toplamı"
                value={draftTotals?.retentionTotal ?? 0}
              />
              <SummaryRow label="KDV Toplamı" value={draftTotals?.vatTotal ?? 0} />
              <SummaryRow
                label="Genel Toplam"
                strong
                value={draftTotals?.grandTotal ?? 0}
              />
            </aside>
          </div>
        </article>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Brüt Hakediş" value={formatMoney(grossTotal)} />
        <Metric label="Kesinti Toplamı" value={formatMoney(retentionTotal)} />
        <Metric label="Genel Toplam" value={formatMoney(grandTotal)} />
      </div>

      <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)]">
        <div className="flex flex-col gap-3 border-b border-[var(--grid-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">
            Hakediş faturası hareket listesi
          </h2>
          {accountOptions.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--on-surface-variant)] sm:min-w-64">
              <span>Ödeme/Tahsilat hesabı</span>
              <select
                className="h-9 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm font-semibold text-[var(--on-surface)]"
                onChange={(event) => setPaymentAccountCode(event.target.value)}
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
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-[var(--surface-container-low)] text-xs uppercase text-[var(--on-surface-variant)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Tip</th>
                <th className="px-4 py-3 font-semibold">Cari</th>
                <th className="px-4 py-3 font-semibold">Şantiye</th>
                <th className="px-4 py-3 text-right font-semibold">Kesinti</th>
                <th className="px-4 py-3 text-right font-semibold">Genel Toplam</th>
                <th className="px-4 py-3 text-center font-semibold">Durum</th>
                <th className="px-4 py-3 font-semibold">Ödeme/Tahsilat</th>
                <th className="px-4 py-3 text-center font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--grid-border)]">
              {displayRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={10}>
                    <p className="font-semibold">Henüz hakediş kaydı yok</p>
                    <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
                      İlk hakediş kaydı şantiye ve cari bazlı gelir/gider
                      takibini başlatır.
                    </p>
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const isProcessing =
                    postingId === row.id ||
                    cancellingId === row.id ||
                    payingId === row.id ||
                    isPending;
                  const isCancelled = row.status === "İptal";
                  const isPosted = row.status === "Kaydedildi";
                  const paymentMovement = getProgressPaymentPayment(
                    localPaymentMovements,
                    row.id,
                  );
                  const collectionMovement = getProgressPaymentCollection(
                    localPaymentMovements,
                    row.id,
                  );
                  const isPaid = Boolean(paymentMovement);
                  const isCollected = Boolean(collectionMovement);
                  const isIncome = row.paymentType === "Şantiye Geliri";
                  const isPayable = isPosted && !isIncome;
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
                      <td className="px-4 py-3">{formatDate(row.issueDate)}</td>
                      <td className="px-4 py-3">{row.paymentType}</td>
                      <td className="px-4 py-3">{row.counterpartyName}</td>
                      <td className="px-4 py-3">{row.siteName}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatMoney(row.retentionTotal)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {formatMoney(row.grandTotal)}
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
                              {formatDate(paymentMovement.movementDate)}
                            </span>
                            {paymentMovement.ledgerDocumentNo ? (
                              <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                                Muhasebe fişi: {paymentMovement.ledgerDocumentNo}
                              </span>
                            ) : null}
                          </div>
                        ) : collectionMovement ? (
                          <div className="grid gap-1">
                            <span className="font-semibold text-[var(--status-posted)]">
                              Tahsil Edildi
                            </span>
                            <span className="text-xs text-[var(--on-surface-variant)]">
                              {collectionMovement.accountName}
                            </span>
                            <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                              {formatDate(collectionMovement.movementDate)}
                            </span>
                            {collectionMovement.ledgerDocumentNo ? (
                              <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                                Muhasebe fişi: {collectionMovement.ledgerDocumentNo}
                              </span>
                            ) : null}
                          </div>
                        ) : isIncome && isPosted ? (
                          <div className="grid gap-2">
                            <span className="font-semibold text-[var(--on-surface-variant)]">
                              Tahsilat Bekliyor
                            </span>
                            <button
                              className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 py-1 text-xs font-semibold transition hover:bg-[var(--primary-fixed)] disabled:opacity-50"
                              disabled={
                                !permissions.canMutateProgressPayments ||
                                isCancelled ||
                                isCollected ||
                                isProcessing
                              }
                              onClick={() => collectProgressPayment(row)}
                              type="button"
                            >
                              {payingId === row.id
                                ? "Tahsil ediliyor"
                                : "Tahsilat Oluştur"}
                            </button>
                          </div>
                        ) : isPosted ? (
                          <div className="grid gap-2">
                            <span className="font-semibold text-[var(--on-surface-variant)]">
                              Bekliyor
                            </span>
                            <button
                              className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 py-1 text-xs font-semibold transition hover:bg-[var(--primary-fixed)] disabled:opacity-50"
                              disabled={
                                !permissions.canMutateProgressPayments ||
                                isCancelled ||
                                isPaid ||
                                isProcessing
                              }
                              onClick={() => payProgressPayment(row)}
                              type="button"
                            >
                              {payingId === row.id ? "Ödeniyor" : "Ödeme Oluştur"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--on-surface-variant)]">
                            {isIncome ? "Kesinleşince tahsil edilir" : "Kesinleşince ödenir"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            aria-label={`Kesinleştir ${row.documentNo}`}
                            className={`${toolbarButtonClass} px-2 py-1 text-xs disabled:opacity-50`}
                            disabled={
                              !permissions.canMutateProgressPayments ||
                              isCancelled ||
                              isPosted ||
                              isProcessing
                            }
                            onClick={() => postProgressPayment(row)}
                            type="button"
                          >
                            {postingId === row.id ? "Kesinleşiyor" : "Kesinleştir"}
                          </button>
                          <button
                            aria-label={`İptal ${row.documentNo}`}
                            className={`${toolbarButtonClass} px-2 py-1 text-xs disabled:opacity-50`}
                            disabled={
                              !permissions.canMutateProgressPayments ||
                              isCancelled ||
                              ((isPayable && isPaid) || (isIncome && isCollected)) ||
                              isProcessing
                            }
                            onClick={() => cancelProgressPayment(row)}
                            type="button"
                          >
                            {cancellingId === row.id ? "İptal ediliyor" : "İptal Et"}
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

      <ProgressPaymentAuditHistory
        auditLogsByEntityId={auditLogsByEntityId}
        rows={displayRows}
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

function ProgressPaymentAuditHistory({
  auditLogsByEntityId,
  rows,
}: {
  auditLogsByEntityId: Record<string, AuditLogEntry[]>;
  rows: ProgressPaymentRow[];
}) {
  const groups = rows
    .map((row) => ({
      logs: auditLogsByEntityId[row.id] ?? [],
      row,
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
                {row.counterpartyName}
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

function LineInput({
  align = "left",
  label,
  onChange,
  type = "text",
  value,
}: {
  align?: "left" | "right";
  label: string;
  onChange: (value: string) => void;
  type?: "number" | "text";
  value: string;
}) {
  const id = `progress-payment-${label
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9ğüşöçıİ]+/gi, "-")}`;

  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        className={`${controlClass} ${align === "right" ? "text-right font-mono" : ""}`}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </>
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

function SummaryRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: number;
}) {
  return (
    <div
      className={`mt-3 flex items-center justify-between gap-3 text-sm ${
        strong ? "border-t border-[var(--grid-border)] pt-3 font-semibold" : ""
      }`}
    >
      <span>{label}</span>
      <span className="font-mono">{formatMoney(value)}</span>
    </div>
  );
}

function createValuesFromForm(form: FormState): ProgressPaymentCreateValues {
  return {
    counterpartyCode: form.counterpartyCode,
    counterpartyName: form.counterpartyName,
    currency: getP0BaseCurrencyTransactionValue(),
    description: form.description.trim(),
    documentNo: form.documentNo.trim(),
    issueDate: form.issueDate,
    lines: form.lines.map((line) => ({
      description: line.description.trim(),
      quantity: toNumber(line.quantity),
      unit: line.unit.trim() || "Adet",
      unitPrice: toNumber(line.unitPrice),
      vatRate: toNumber(line.vatRate),
    })),
    paymentType: form.paymentType,
    retentionRate: toNumber(form.retentionRate),
    siteCode: form.siteCode,
    siteName: form.siteName,
  };
}

function createEmptyLine(): LineState {
  return {
    id: `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: "",
    quantity: "1",
    unit: "Adet",
    unitPrice: "0",
    vatRate: getP0DefaultVatRateInputValue(),
  };
}

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

function getProgressPaymentPayment(
  paymentMovements: CashBankMovementRow[],
  progressPaymentId: string,
) {
  return paymentMovements.find(
    (movement) =>
      movement.sourceType === "progress-payment" &&
      movement.sourceId === progressPaymentId &&
      movement.movementType === "Hakediş Ödemesi",
  );
}


function getProgressPaymentCollection(
  paymentMovements: CashBankMovementRow[],
  progressPaymentId: string,
) {
  return paymentMovements.find(
    (movement) =>
      movement.sourceType === "progress-payment" &&
      movement.sourceId === progressPaymentId &&
      movement.movementType === "Hakediş Tahsilatı",
  );
}
function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    "progress-payment.cancel": "İptal Edildi",
    "progress-payment.create": "Oluşturuldu",
    "progress-payment.post": "Kesinleştirildi",
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

function statusBadgeClass(status: ProgressPaymentRow["status"]) {
  const tone =
    status === "İptal"
      ? "bg-[var(--status-cancelled)]"
      : status === "Kaydedildi"
        ? "bg-[var(--status-complete)]"
        : "bg-[var(--status-process)]";

  return `rounded-[var(--radius-control)] ${tone} px-2 py-1 text-xs font-semibold text-white`;
}

const controlClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-3 text-sm outline-none transition focus:border-[var(--primary)]";

const toolbarButtonClass =
  "rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--primary-fixed)]";





