"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  calculateInvoiceTotals,
  createPurchaseInvoiceDraft,
} from "@/lib/invoices";
import type { AuditLogEntry } from "@/lib/audit-log";
import { CompanyProfileDocumentHeader } from "@/components/company-profile-document-header";
import type { EffectiveCompanyProfile } from "@/lib/company-profile";
import type { EffectiveCompanyBrandAsset } from "@/lib/company-brand-asset";
import type {
  CashBankAccountOption,
  CashBankMovementRow,
} from "@/lib/cash-bank-movement-service";
import type { PurchaseInvoiceCreateValues } from "@/lib/purchase-invoice-service";
import type { PurchaseInvoiceRow } from "@/lib/purchase-invoice-service";
import {
  getP0BaseCurrencyDisplayValue,
  getP0BaseCurrencyTransactionValue,
  getP0CurrencyPolicyDisplayValue,
} from "@/lib/settings-contract";

export type InvoiceLookupOption = {
  code: string;
  name: string;
};

export type StockCardLookupOption = InvoiceLookupOption & {
  defaultWarehouse: string;
  unit: string;
};

export type PurchaseInvoiceSurfaceProps = {
  accountOptions?: CashBankAccountOption[];
  auditLogsByEntityId?: Record<string, AuditLogEntry[]>;
  companyBrandAsset?: EffectiveCompanyBrandAsset;
  companyProfile?: EffectiveCompanyProfile;
  lookups?: {
    customers?: InvoiceLookupOption[];
    sites: InvoiceLookupOption[];
    suppliers: InvoiceLookupOption[];
  };
  permissions?: {
    canMutateInvoices: boolean;
  };
  persistence?: {
    cancelInvoice?: (
      id: string,
    ) => Promise<
      | {
          ok: true;
          data: PurchaseInvoiceRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    allowPostedCancellation?: boolean;
    collectInvoice?: (
      id: string,
      account?: CashBankAccountOption,
      amount?: number,
    ) => Promise<
      | { ok: true; data: CashBankMovementRow }
      | { ok: false; errors: string[] }
    >;
    createInvoice: (
      values: PurchaseInvoiceCreateValues,
    ) => Promise<
      | {
          ok: true;
          data: PurchaseInvoiceRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    postInvoice?: (
      id: string,
    ) => Promise<
      | {
          ok: true;
          data: PurchaseInvoiceRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
    payInvoice?: (
      id: string,
      account?: CashBankAccountOption,
      amount?: number,
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
    updateInvoice?: (
      id: string,
      values: PurchaseInvoiceCreateValues,
    ) => Promise<
      | {
          ok: true;
          data: PurchaseInvoiceRow;
        }
      | {
          ok: false;
          errors: string[];
        }
    >;
  };
  highlightedDocumentNo?: string;
  highlightedRecordId?: string;
  embedded?: boolean;
  paymentMovements?: CashBankMovementRow[];
  rows: PurchaseInvoiceRow[];
  defaultVatRate?: number;
  showVatBreakdown?: boolean;
  stockCardOptions?: StockCardLookupOption[];
  today?: string;
  variant?: "purchase" | "sales";
};

type FormState = {
  mode: "create" | "edit";
  invoiceId?: string;
  documentNo: string;
  invoiceDate: string;
  dueDate: string;
  counterpartyCode: string;
  counterpartyName: string;
  siteCode: string;
  siteName: string;
  lines: LineState[];
};

type LineState = {
  id: string;
  stockCode: string;
  stockName: string;
  unit: string;
  description: string;
  warehouse: string;
  quantity: string;
  unitPrice: string;
  discountRate1: string;
  discountRate2: string;
  vatRate: string;
};

export function PurchaseInvoiceSurface({
  accountOptions = [],
  auditLogsByEntityId = {},
  companyBrandAsset,
  companyProfile,
  highlightedDocumentNo,
  highlightedRecordId,
  embedded = false,
  lookups = { sites: [], suppliers: [] },
  permissions = { canMutateInvoices: true },
  paymentMovements = [],
  persistence,
  rows,
  defaultVatRate = 20,
  showVatBreakdown = true,
  stockCardOptions = [],
  today = new Date().toISOString().slice(0, 10),
  variant = "purchase",
}: PurchaseInvoiceSurfaceProps) {
  const isSales = variant === "sales";
  const counterpartyLabel = isSales ? "Müşteri" : "Tedarikçi";
  const invoiceTypeLabel = isSales ? "Satış Faturası" : "Alış Faturası";
  const counterpartyOptions = isSales
    ? (lookups.customers ?? [])
    : lookups.suppliers;
  const [displayRows, setDisplayRows] = useState(rows);
  const [localPaymentMovements, setLocalPaymentMovements] =
    useState(paymentMovements);
  const [form, setForm] = useState<FormState | null>(null);
  const [paymentAccountCode, setPaymentAccountCode] = useState(
    accountOptions[0]?.code ?? "",
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [collectionAmountById, setCollectionAmountById] = useState<Record<string, string>>({});
  const [paymentAmountById, setPaymentAmountById] = useState<Record<string, string>>({});
  const [postingId, setPostingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [postingMessage, setPostingMessage] = useState("");
  const [printNotice, setPrintNotice] = useState("");
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const activeRows = displayRows.filter((row) => row.status !== "İptal");
  const totalGrand = activeRows.reduce((total, row) => total + row.grandTotal, 0);
  const totalVat = activeRows.reduce((total, row) => total + row.vatTotal, 0);
  const totalNet = activeRows.reduce((total, row) => total + row.netTotal, 0);
  const draftValues = form ? createValuesFromForm(form) : undefined;
  const draftTotals = useMemo(
    () =>
      draftValues
        ? calculateInvoiceTotals(createPurchaseInvoiceDraft(draftValues))
        : undefined,
    [draftValues],
  );
  const baseCurrencyContext = `Baz Para: ${getP0BaseCurrencyDisplayValue()}`;
  const currencyPolicyContext = getP0CurrencyPolicyDisplayValue();
  const defaultVatContext = `Varsayılan KDV: %${defaultVatRate}`;

  function startCreate() {
    if (!permissions.canMutateInvoices) {
      return;
    }

    setErrors([]);
    setForm({
      mode: "create",
      documentNo: "",
      invoiceDate: today,
      dueDate: "",
      counterpartyCode: "",
      counterpartyName: "",
      siteCode: "",
      siteName: "",
      lines: [createEmptyLine(defaultVatRate)],
    });
  }

  function startEdit(row: PurchaseInvoiceRow) {
    if (!permissions.canMutateInvoices || row.status !== "Taslak") {
      return;
    }

    setErrors([]);
    setForm({
      mode: "edit",
      invoiceId: row.id,
      documentNo: row.documentNo,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate ?? "",
      counterpartyCode: row.counterpartyCode,
      counterpartyName: row.counterpartyName,
      siteCode: row.siteCode,
      siteName: row.siteName,
      lines: row.lines.map(lineStateFromInvoiceLine),
    });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setErrors([]);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function selectSupplier(code: string) {
    const supplier = counterpartyOptions.find((item) => item.code === code);

    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            counterpartyCode: code,
            counterpartyName: supplier?.name ?? "",
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

  function selectStockCard(lineId: string, stockCode: string) {
    const stockCard = stockCardOptions.find((item) => item.code === stockCode);

    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    stockCode,
                    stockName: stockCard?.name ?? line.stockName,
                    unit: stockCard?.unit || line.unit,
                    warehouse:
                      stockCard?.defaultWarehouse || line.warehouse,
                  }
                : line,
            ),
          }
        : current,
    );
  }

  function addLine() {
    setErrors([]);
    setForm((current) =>
      current
        ? {
            ...current,
            lines: [...current.lines, createEmptyLine(defaultVatRate)],
          }
        : current,
    );
  }

  function removeLine(lineId: string) {
    setErrors([]);
    setForm((current) => {
      if (!current) {
        return current;
      }

      const lines = current.lines.filter((line) => line.id !== lineId);

      return {
        ...current,
        lines: lines.length > 0 ? lines : [createEmptyLine(defaultVatRate)],
      };
    });
  }

  async function saveForm() {
    if (!form || !persistence || !permissions.canMutateInvoices) {
      return;
    }

    setIsSaving(true);
    setErrors([]);

    if (form.mode === "edit" && !persistence.updateInvoice) {
      setErrors(["Fatura güncelleme aksiyonu bağlı değil."]);
      setIsSaving(false);
      return;
    }

    const values = createValuesFromForm(form);
    const result =
      form.mode === "edit"
        ? await persistence.updateInvoice!(form.invoiceId!, values)
        : await persistence.createInvoice(values);

    if (result.ok) {
      setDisplayRows((current) =>
        form.mode === "edit"
          ? current.map((row) => (row.id === result.data.id ? result.data : row))
          : [result.data, ...current],
      );
      setForm(null);
      setIsSaving(false);
      return;
    }

    setErrors(result.errors);
    setIsSaving(false);
  }

  async function cancelInvoice(row: PurchaseInvoiceRow) {
    if (
      !permissions.canMutateInvoices ||
      !persistence?.cancelInvoice ||
      row.status === "İptal" ||
      (row.status === "Kaydedildi" && !persistence?.allowPostedCancellation)
    ) {
      return;
    }

    setCancellingId(row.id);
    setErrors([]);

    const result = await persistence.cancelInvoice(row.id);

    if (result.ok) {
      setDisplayRows((current) =>
        current.map((currentRow) =>
          currentRow.id === result.data.id ? result.data : currentRow,
        ),
      );
      setForm((current) =>
        current?.invoiceId === result.data.id ? null : current,
      );
      setCancellingId(null);
      return;
    }

    setErrors(result.errors);
    setCancellingId(null);
  }

  async function postInvoice(row: PurchaseInvoiceRow) {
    if (
      !permissions.canMutateInvoices ||
      !persistence?.postInvoice ||
      row.status !== "Taslak"
    ) {
      return;
    }

    setPostingId(row.id);
    setErrors([]);
    setPostingMessage("");

    const result = await persistence.postInvoice(row.id);

    if (result.ok) {
      setDisplayRows((current) =>
        current.map((currentRow) =>
          currentRow.id === result.data.id ? result.data : currentRow,
        ),
      );
      setForm((current) =>
        current?.invoiceId === result.data.id ? null : current,
      );
      setPostingMessage(
        result.data.ledgerDocumentNo
          ? `Fatura kesinleştirildi ve ${result.data.ledgerDocumentNo} numaralı muhasebe fişi oluşturuldu.`
          : "Fatura kesinleştirildi.",
      );
      setPostingId(null);
      return;
    }

    setErrors(result.errors);
    setPostingId(null);
  }

  function payInvoice(row: PurchaseInvoiceRow) {
    if (
      !permissions.canMutateInvoices ||
      !persistence?.payInvoice ||
      row.status !== "Kaydedildi" ||
      getInvoicePaymentTotal(localPaymentMovements, row.id) >= row.grandTotal
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
      const rawAmount = paymentAmountById[row.id]?.trim() ?? "";
      const parsedAmount = rawAmount ? Number(rawAmount) : undefined;
      const result = selectedAccount
        ? rawAmount ? await persistence.payInvoice?.(row.id, selectedAccount, parsedAmount) : await persistence.payInvoice?.(row.id, selectedAccount)
        : rawAmount ? await persistence.payInvoice?.(row.id, undefined, parsedAmount) : await persistence.payInvoice?.(row.id);

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
      setPaymentMessage("Fatura ödeme hareketi oluşturuldu.");
      setPayingId(null);
    });
  }

  function collectInvoice(row: PurchaseInvoiceRow) {
    if (
      !isSales ||
      !permissions.canMutateInvoices ||
      !persistence?.collectInvoice ||
      row.status !== "Kaydedildi" ||
      getInvoiceCollection(localPaymentMovements, row.id)
    ) return;

    setCollectingId(row.id);
    setPaymentMessage("");
    setErrors([]);
    startTransition(async () => {
      const selectedAccount = accountOptions.find((account) => account.code === paymentAccountCode);
      const rawAmount = collectionAmountById[row.id]?.trim() ?? "";
      const parsedAmount = rawAmount ? Number(rawAmount) : undefined;
      const result = selectedAccount
        ? rawAmount ? await persistence.collectInvoice?.(row.id, selectedAccount, parsedAmount) : await persistence.collectInvoice?.(row.id, selectedAccount)
        : rawAmount ? await persistence.collectInvoice?.(row.id, undefined, parsedAmount) : await persistence.collectInvoice?.(row.id);
      if (!result) return setCollectingId(null);
      if (!result.ok) {
        setErrors(result.errors);
        setCollectingId(null);
        return;
      }
      setLocalPaymentMovements((current) => [result.data, ...current]);
      setPaymentMessage("Fatura tahsilat hareketi oluşturuldu.");
      setCollectingId(null);
    });
  }

  function handleToolbarAction(action: string) {
    if (action === "Yazdır") {
      setPrintNotice(
        `Yazdırma kapsamı hazır: ${displayRows.length} fatura.`,
      );
      window.print();
      return;
    }

    if (action === "PDF Önizleme") {
      setPrintNotice(`${invoiceTypeLabel} PDF önizlemesi hazırlandı.`);
      setIsPdfPreviewOpen(true);
      return;
    }

    if (action === "Sil") {
      setPrintNotice(
        "Fatura silme fiziksel silme değildir; ilgili satırdaki İptal Et aksiyonunu kullanın.",
      );
      return;
    }

    if (action === "Yenile") {
      setPrintNotice(
        "Fatura listesi server render ve revalidate akışıyla güncellenir.",
      );
    }
  }

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <CompanyProfileDocumentHeader
        brandAsset={companyBrandAsset}
        className="hidden print:block"
        profile={companyProfile}
      />
      {!embedded ? <header className="rounded-ui-panel border border-divider bg-surface-raised p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          {invoiceTypeLabel} ve çıktı
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Faturalar
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-content-subtle">
              {counterpartyLabel} faturası başlığı, satır toplamları, KDV,
              yaşam döngüsü ve çıktı önizlemesi PostgreSQL üzerinde çalışır.
            </p>
          </div>
          <span className="rounded-ui-control border border-divider bg-surface-muted px-3 py-2 text-xs font-semibold text-content-subtle">
            {invoiceTypeLabel}
          </span>
        </div>
      </header> : null}

      {!isSales ? (
        <div className="rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm text-content-subtle">
          Kesinleşen alış faturası otomatik olarak 153 Ticari Mallar ve 191
          İndirilecek KDV borç, 320 Satıcılar alacak satırlarıyla muhasebeleştirilir.
          Kesinleşmiş fatura, ters kayıt akışı uygulanmadan iptal edilemez.
        </div>
      ) : (
        <div className="rounded-ui-panel border border-divider bg-surface-raised p-3 text-sm text-content-subtle">
          Kesinleşen satış faturası otomatik olarak 120 Alıcılar borç, 600 Yurtiçi
          Satışlar ve 391 Hesaplanan KDV alacak satırlarıyla muhasebeleştirilir.
          Kesinleşmiş fatura, ters kayıt akışı uygulanmadan iptal edilemez.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-ui-panel border border-divider bg-surface-raised p-2">
        <button
          className="rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:bg-brand-primary-subtle"
          disabled={!permissions.canMutateInvoices}
          onClick={startCreate}
          type="button"
        >
          Yeni
        </button>
        <button
          className="rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:bg-brand-primary-subtle disabled:opacity-50"
          disabled={!permissions.canMutateInvoices || !form || isSaving}
          onClick={saveForm}
          type="button"
        >
          {isSaving ? "Kaydediliyor" : "Kaydet"}
        </button>
        {["Sil", "Yazdır", "PDF Önizleme", "Yenile"].map((action) => (
          <button
            className="rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:bg-brand-primary-subtle"
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
          <p className="font-semibold">Fatura kaydedilemedi</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {paymentMessage ? (
        <div className="rounded-ui-panel border border-[var(--ds-success)] bg-surface-raised p-3 text-sm font-semibold text-[var(--ds-success)]">
          {paymentMessage}
        </div>
      ) : null}

      {postingMessage ? (
        <div
          className="rounded-ui-panel border border-[var(--ds-success)] bg-surface-raised p-3 text-sm font-semibold text-[var(--ds-success)]"
          role="status"
        >
          {postingMessage}
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

      {form ? (
        <article className="rounded-ui-panel border border-divider bg-surface-raised">
          <div className="border-b border-divider px-4 py-3">
            <h2 className="text-sm font-semibold">{invoiceTypeLabel} Ekle/Düzelt</h2>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-4">
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
                <Field label="Fatura Tarihi">
                  <input
                    className={controlClass}
                    onChange={(event) =>
                      updateForm("invoiceDate", event.target.value)
                    }
                    type="date"
                    value={form.invoiceDate}
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
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label={counterpartyLabel}>
                  <select
                    className={controlClass}
                    onChange={(event) => selectSupplier(event.target.value)}
                    value={form.counterpartyCode}
                  >
                    <option value="">{counterpartyLabel} seç</option>
                    {counterpartyOptions.map((supplier) => (
                      <option key={supplier.code} value={supplier.code}>
                        {supplier.name}
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
              </div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Fatura Satırları</h3>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle">
                    {baseCurrencyContext}
                  </span>
                  <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle">
                    {currencyPolicyContext}
                  </span>
                  <span className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold text-content-subtle">
                    {defaultVatContext}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-ui-panel border border-divider">
                <table aria-label={invoiceTypeLabel + " giriş satırları"} className="min-w-[1040px] w-full text-left text-sm">
                  <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
                    <tr>
                      <th className="px-3 py-2">Stok Kartı</th>
                      <th className="px-3 py-2">Stok/Hizmet</th>
                      <th className="px-3 py-2">Açıklama</th>
                      <th className="px-3 py-2">Depo</th>
                      <th className="px-3 py-2">Birim</th>
                      <th className="px-3 py-2 text-right">Miktar</th>
                      <th className="px-3 py-2 text-right">Birim Fiyat</th>
                      <th className="px-3 py-2 text-right">İsk. 1</th>
                      <th className="px-3 py-2 text-right">İsk. 2</th>
                      <th className="px-3 py-2 text-right">KDV %</th>
                      <th className="px-3 py-2 text-right">Satır Toplamı</th>
                      <th className="px-3 py-2 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line, index) => {
                      const lineNo = index + 1;
                      const lineTotal = draftTotals?.lines[index]?.grandTotal ?? 0;

                      return (
                        <tr key={line.id}>
                          <td className="p-2">
                            <label className="sr-only" htmlFor={`stock-card-${line.id}`}>
                              {`Stok Kartı satır ${lineNo}`}
                            </label>
                            <select
                              className={controlClass}
                              id={`stock-card-${line.id}`}
                              onChange={(event) =>
                                selectStockCard(line.id, event.target.value)
                              }
                              value={line.stockCode}
                            >
                              <option value="">Serbest giriş</option>
                              {stockCardOptions.map((stockCard) => (
                                <option key={stockCard.code} value={stockCard.code}>
                                  {stockCard.code} - {stockCard.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <LineInput
                              label={`Stok/Hizmet satır ${lineNo}`}
                              onChange={(value) =>
                                updateLine(line.id, "stockName", value)
                              }
                              value={line.stockName}
                            />
                          </td>
                          <td className="p-2">
                            <LineInput
                              label={`Açıklama satır ${lineNo}`}
                              onChange={(value) =>
                                updateLine(line.id, "description", value)
                              }
                              value={line.description}
                            />
                          </td>
                          <td className="p-2">
                            <LineInput
                              label={`Depo satır ${lineNo}`}
                              onChange={(value) =>
                                updateLine(line.id, "warehouse", value)
                              }
                              value={line.warehouse}
                            />
                          </td>
                          <td className="p-2">
                            <LineInput
                              label={`Birim satır ${lineNo}`}
                              onChange={(value) => updateLine(line.id, "unit", value)}
                              value={line.unit}
                            />
                          </td>
                          <td className="p-2">
                            <LineInput
                              align="right"
                              label={`Miktar satır ${lineNo}`}
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
                              label={`Birim Fiyat satır ${lineNo}`}
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
                              label={`İskonto 1 satır ${lineNo}`}
                              onChange={(value) =>
                                updateLine(line.id, "discountRate1", value)
                              }
                              type="number"
                              value={line.discountRate1}
                            />
                          </td>
                          <td className="p-2">
                            <LineInput
                              align="right"
                              label={`İskonto 2 satır ${lineNo}`}
                              onChange={(value) =>
                                updateLine(line.id, "discountRate2", value)
                              }
                              type="number"
                              value={line.discountRate2}
                            />
                          </td>
                          <td className="p-2">
                            <LineInput
                              align="right"
                              label={`KDV % satır ${lineNo}`}
                              onChange={(value) =>
                                updateLine(line.id, "vatRate", value)
                              }
                              type="number"
                              value={line.vatRate}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold">
                            {formatMoney(lineTotal)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              className="rounded-ui-control border border-divider px-2 py-1 text-xs font-semibold"
                              onClick={() => removeLine(line.id)}
                              type="button"
                            >
                              Satır {lineNo} sil
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <button
                  className="rounded-ui-control border border-divider bg-surface-muted px-3 py-1.5 text-sm font-medium transition hover:bg-brand-primary-subtle"
                  onClick={addLine}
                  type="button"
                >
                  Satır Ekle
                </button>
              </div>
            </div>
            <aside className="rounded-ui-panel border border-divider bg-surface-muted p-4">
              <h3 className="text-sm font-semibold">Fatura Toplamları</h3>
              <SummaryRow label="Ara Toplam" value={draftTotals?.subtotal ?? 0} />
              <SummaryRow
                label="İskonto Toplamı"
                value={draftTotals?.discountTotal ?? 0}
              />
              {showVatBreakdown ? <SummaryRow
                label="KDV Toplamı"
                value={draftTotals?.vatTotal ?? 0}
              /> : null}
              <SummaryRow
                label="Genel Toplam"
                strong
                value={draftTotals?.grandTotal ?? 0}
              />
            </aside>
          </div>
        </article>
      ) : null}

      {!embedded ? <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Net Toplam" value={formatMoney(totalNet)} />
        {showVatBreakdown ? <Metric label="KDV Toplamı" value={formatMoney(totalVat)} /> : null}
        <Metric label="Genel Toplam" value={formatMoney(totalGrand)} />
      </div> : null}

      <article className="overflow-hidden rounded-ui-panel border border-divider bg-surface-raised">
        <div className="border-b border-divider px-4 py-3">
          <h2 className="text-sm font-semibold">{invoiceTypeLabel} hareket listesi</h2>
        </div>
        <div className="overflow-x-auto">
          <table aria-label={invoiceTypeLabel + " hareket listesi"} className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-content-subtle">
              <tr>
                <th className="px-4 py-3 font-semibold">Evrak No</th>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">{counterpartyLabel}</th>
                <th className="px-4 py-3 font-semibold">Şantiye</th>
                <th className="px-4 py-3 text-right font-semibold">Satır</th>
                <th className="px-4 py-3 text-right font-semibold">KDV</th>
                <th className="px-4 py-3 text-right font-semibold">Genel Toplam</th>
                <th className="px-4 py-3 text-center font-semibold">Durum</th>
                <th className="px-4 py-3 font-semibold">{isSales ? "Tahsilat" : "Ödeme"}</th>
                <th className="px-4 py-3 text-center font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {displayRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center" colSpan={10}>
                    <p className="font-semibold">Henüz fatura kaydı yok</p>
                    <p className="mt-1 text-sm text-content-subtle">
                      Satır grid&apos;i stok kartı, depo, miktar, fiyat, iskonto ve
                      KDV alanlarıyla birlikte kullanılabilir.
                    </p>
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const isCancelled = row.status === "İptal";
                  const isPosted = row.status === "Kaydedildi";
                  const paymentMovement = getInvoicePayment(
                    localPaymentMovements,
                    row.id,
                  );
                  const collectionMovement = getInvoiceCollection(localPaymentMovements, row.id);
                  const collectedTotal = getInvoiceCollectionTotal(localPaymentMovements, row.id);
                  const remainingCollectionTotal = Math.max(0, row.grandTotal - collectedTotal);
                  const paidTotal = getInvoicePaymentTotal(localPaymentMovements, row.id);
                  const remainingPaymentTotal = Math.max(0, row.grandTotal - paidTotal);
                  const isPaid = remainingPaymentTotal <= 0;
                  const isHighlighted = isHighlightedDocument(
                    row.id,
                    row.documentNo,
                    highlightedDocumentNo,
                    highlightedRecordId,
                  );
                  const isProcessing =
                    cancellingId === row.id ||
                    payingId === row.id ||
                    collectingId === row.id ||
                    postingId === row.id ||
                    isPending;
                  const cannotMutate = !permissions.canMutateInvoices;

                  return (
                    <tr
                      className={highlightedRowClass(isHighlighted)}
                      data-highlighted={isHighlighted ? "true" : undefined}
                      key={row.id}
                    >
                    <td className="px-4 py-3 font-mono text-xs">
                      {row.documentNo}
                    </td>
                    <td className="px-4 py-3">{formatDate(row.invoiceDate)}</td>
                    <td className="px-4 py-3">{row.counterpartyName}</td>
                    <td className="px-4 py-3">{row.siteName}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.lineCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(row.vatTotal)}
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
                          <span className="font-mono text-[10px] text-content-subtle">
                            Fiş: {row.ledgerDocumentNo}
                          </span>
                        ) : null}
                        {row.ledgerReversalDocumentNo ? (
                          <span className="font-mono text-[10px] text-[var(--ds-danger)]">
                            Ters fiş: {row.ledgerReversalDocumentNo}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isSales ? (
                        remainingCollectionTotal <= 0 ? (
                          <div className="grid gap-1">
                            <span className="font-semibold text-[var(--ds-success)]">Tahsil Edildi</span>
                            <span className="text-xs text-content-subtle">{collectionMovement?.accountName}</span>
                            <MovementLedgerDocuments movements={getInvoiceCollectionMovements(localPaymentMovements, row.id)} />
                          </div>
                        ) : isPosted ? (
                          <div className="grid gap-2">
                          <span className="font-semibold text-content-subtle">Kalan: {formatMoney(remainingCollectionTotal)}</span>
                            <MovementLedgerDocuments movements={getInvoiceCollectionMovements(localPaymentMovements, row.id)} />
                            {accountOptions.length > 0 ? (
                              <select className="h-8 rounded border border-divider bg-surface-raised px-2 text-xs" onChange={(event) => setPaymentAccountCode(event.target.value)} value={paymentAccountCode}>
                                {accountOptions.map((account) => <option key={account.code} value={account.code}>{account.code} - {account.name}</option>)}
                              </select>
                            ) : null}
                            <input className="h-8 rounded border border-divider px-2 text-xs" min="0.01" max={remainingCollectionTotal} placeholder={`Tam tahsilat: ${remainingCollectionTotal.toFixed(2)}`} step="0.01" type="number" value={collectionAmountById[row.id] ?? ""} onChange={(event) => setCollectionAmountById((current) => ({ ...current, [row.id]: event.target.value }))} />
                            <button className="rounded border border-divider px-2 py-1 text-xs font-semibold disabled:opacity-50" disabled={cannotMutate || isProcessing || accountOptions.length === 0} onClick={() => collectInvoice(row)} type="button">
                              {collectingId === row.id ? "Tahsil ediliyor" : "Tahsilat Oluştur"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-content-subtle">Kesinleşince tahsil edilir</span>
                        )
                      ) : isPaid && paymentMovement ? (
                        <div className="grid gap-1">
                          <span className="font-semibold text-[var(--ds-success)]">
                            Ödendi
                          </span>
                          <span className="text-xs text-content-subtle">
                            {paymentMovement.accountName}
                          </span>
                          <span className="font-mono text-xs text-content-subtle">
                            {formatDate(paymentMovement.movementDate)}
                          </span>
                          <MovementLedgerDocuments movements={getInvoicePaymentMovements(localPaymentMovements, row.id)} />
                        </div>
                      ) : isPosted ? (
                        <div className="grid gap-2">
                          <span className="font-semibold text-content-subtle">
                            Kalan: {formatMoney(remainingPaymentTotal)}
                          </span>
                          <MovementLedgerDocuments movements={getInvoicePaymentMovements(localPaymentMovements, row.id)} />
                          {accountOptions.length > 0 ? (
                            <label className="flex flex-col gap-1 text-xs font-semibold text-content-subtle">
                              <span>Ödeme hesabı</span>
                              <select
                                className="h-8 rounded-ui-control border border-divider bg-surface-raised px-2 text-xs font-semibold text-content"
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
                          <input
                            className="h-8 rounded-ui-control border border-divider px-2 text-xs"
                            max={remainingPaymentTotal}
                            min="0.01"
                            placeholder={`Tam ödeme: ${remainingPaymentTotal.toFixed(2)}`}
                            step="0.01"
                            type="number"
                            value={paymentAmountById[row.id] ?? ""}
                            onChange={(event) => setPaymentAmountById((current) => ({ ...current, [row.id]: event.target.value }))}
                          />
                          <button
                            className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold transition hover:bg-brand-primary-subtle disabled:opacity-50"
                            disabled={
                              cannotMutate ||
                              isCancelled ||
                              isPaid ||
                              isProcessing
                            }
                            onClick={() => payInvoice(row)}
                            type="button"
                          >
                            {payingId === row.id ? "Ödeniyor" : "Ödeme Oluştur"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-content-subtle">
                          Kesinleşince ödenir
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          aria-label={`Düzenle ${row.documentNo}`}
                          className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold transition hover:bg-brand-primary-subtle disabled:opacity-50"
                          disabled={
                            cannotMutate || isCancelled || isPosted || isProcessing
                          }
                          onClick={() => startEdit(row)}
                          type="button"
                        >
                          Düzenle
                        </button>
                        <button
                          aria-label={`Kesinleştir ${row.documentNo}`}
                          className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold transition hover:bg-brand-primary-subtle disabled:opacity-50"
                          disabled={
                            cannotMutate || isCancelled || isPosted || isProcessing
                          }
                          onClick={() => postInvoice(row)}
                          type="button"
                        >
                          {postingId === row.id ? "Kesinleşiyor" : "Kesinleştir"}
                        </button>
                        <button
                          aria-label={`İptal ${row.documentNo}`}
                          className="rounded-ui-control border border-divider bg-surface-muted px-2 py-1 text-xs font-semibold transition hover:bg-brand-primary-subtle disabled:opacity-50"
                          disabled={
                            cannotMutate ||
                            isCancelled ||
                            (isPosted && !persistence?.allowPostedCancellation) ||
                            isProcessing
                          }
                          onClick={() => cancelInvoice(row)}
                          type="button"
                        >
                          {cancellingId === row.id
                            ? "İptal ediliyor"
                            : isPosted && persistence?.allowPostedCancellation
                              ? "Ters Kayıtla İptal"
                              : "İptal Et"}
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

      <PurchaseInvoiceAuditHistory
        auditLogsByEntityId={auditLogsByEntityId}
        rows={displayRows}
        variant={variant}
      />

      {isPdfPreviewOpen ? (
        <InvoicePdfPreview
          companyBrandAsset={companyBrandAsset}
          companyProfile={companyProfile}
          invoiceTypeLabel={invoiceTypeLabel}
          onClose={() => setIsPdfPreviewOpen(false)}
          rows={displayRows}
        />
      ) : null}
    </section>
  );
}

function isHighlightedDocument(
  recordId: string,
  documentNo: string,
  highlightedDocumentNo?: string,
  highlightedRecordId?: string,
) {
  if (highlightedRecordId) {
    return recordId === highlightedRecordId;
  }

  return Boolean(highlightedDocumentNo && documentNo === highlightedDocumentNo);
}

function highlightedRowClass(isHighlighted: boolean) {
  return isHighlighted
    ? "bg-brand-primary-subtle ring-1 ring-inset ring-brand-primary"
    : "hover:bg-brand-primary-subtle";
}

function PurchaseInvoiceAuditHistory({
  auditLogsByEntityId,
  rows,
  variant,
}: {
  auditLogsByEntityId: Record<string, AuditLogEntry[]>;
  rows: PurchaseInvoiceRow[];
  variant: "purchase" | "sales";
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
                {row.counterpartyName}
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
                      {formatAuditAction(log.action, variant)}
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
function formatAuditAction(action: string, variant: "purchase" | "sales") {
  const prefix = variant === "sales" ? "sales-invoice" : "purchase-invoice";
  const labels: Record<string, string> = {
    [`${prefix}.cancel`]: "İptal Edildi",
    [`${prefix}.cancel-rejected`]: "İptal Reddedildi",
    [`${prefix}.create`]: "Oluşturuldu",
    [`${prefix}.ledger-post-rejected`]: "Muhasebe Fişi Reddedildi",
    [`${prefix}.post`]: "Kesinleştirildi",
    [`${prefix}.update`]: "Güncellendi",
  };

  return labels[action] ?? action;
}

function formatAuditTransition(metadata: Record<string, unknown>) {
  const statusFrom = typeof metadata.statusFrom === "string" ? metadata.statusFrom : "";
  const statusTo = typeof metadata.statusTo === "string" ? metadata.statusTo : "";
  const ledgerDocumentNo =
    typeof metadata.ledgerDocumentNo === "string" ? metadata.ledgerDocumentNo : "";
  const rejectionErrors = Array.isArray(metadata.errors)
    ? metadata.errors.filter((error): error is string => typeof error === "string")
    : [];
  const details = [
    ledgerDocumentNo ? `Muhasebe fişi: ${ledgerDocumentNo}` : "",
    rejectionErrors.length > 0 ? rejectionErrors.join("; ") : "",
  ].filter(Boolean);

  const appendDetails = (transition: string) =>
    details.length > 0 ? `${transition} · ${details.join(" · ")}` : transition;

  if (statusFrom && statusTo) {
    return appendDetails(`${statusFrom} -> ${statusTo}`);
  }

  if (statusTo) {
    return appendDetails(`Durum: ${statusTo}`);
  }

  return appendDetails("Kayıt hareketi");
}

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Istanbul",
    year: "numeric",
  }).format(new Date(value));
}

function InvoicePdfPreview({
  companyBrandAsset,
  companyProfile,
  invoiceTypeLabel,
  onClose,
  rows,
}: {
  companyBrandAsset?: EffectiveCompanyBrandAsset;
  companyProfile?: EffectiveCompanyProfile;
  invoiceTypeLabel: string;
  onClose: () => void;
  rows: PurchaseInvoiceRow[];
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ) ?? [],
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      aria-label={`${invoiceTypeLabel} PDF önizleme`}
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-scrim p-4 sm:p-8"
      ref={dialogRef}
      role="dialog"
    >
      <article className="mx-auto max-w-4xl rounded-ui-panel bg-surface-raised p-6 text-content shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-divider pb-4 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              PDF Önizleme
            </p>
            <h2 className="mt-1 text-xl font-semibold">{invoiceTypeLabel}</h2>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded border border-divider px-3 py-2 text-sm font-semibold"
              onClick={() => window.print()}
              type="button"
            >
              PDF Olarak Yazdır
            </button>
            <button
              className="rounded border border-divider px-3 py-2 text-sm font-semibold"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              Kapat
            </button>
          </div>
        </div>
        <CompanyProfileDocumentHeader
          brandAsset={companyBrandAsset}
          className="mb-5"
          profile={companyProfile}
        />
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            {!companyProfile ? (
              <p className="text-lg font-bold">NOA İnşaat Yönetim</p>
            ) : null}
            <p className="text-sm text-content-subtle">{invoiceTypeLabel} dökümü</p>
          </div>
          <p className="text-sm text-content-subtle">
            {new Intl.DateTimeFormat("tr-TR").format(new Date())}
          </p>
        </div>
        <table aria-label={`${invoiceTypeLabel} döküm tablosu`} className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-y border-divider bg-surface-muted">
              <th className="px-2 py-2">Evrak</th>
              <th className="px-2 py-2">Tarih</th>
              <th className="px-2 py-2">Cari</th>
              <th className="px-2 py-2">Şantiye</th>
              <th className="px-2 py-2 text-right">KDV</th>
              <th className="px-2 py-2 text-right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-divider" key={row.id}>
                <td className="px-2 py-2 font-mono text-xs">{row.documentNo}</td>
                <td className="px-2 py-2">{formatDate(row.invoiceDate)}</td>
                <td className="px-2 py-2">{row.counterpartyName}</td>
                <td className="px-2 py-2">{row.siteName}</td>
                <td className="px-2 py-2 text-right font-mono">{formatMoney(row.vatTotal)}</td>
                <td className="px-2 py-2 text-right font-mono font-semibold">{formatMoney(row.grandTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-outline-strong font-bold">
              <td className="px-2 py-3 text-right" colSpan={5}>Genel Toplam</td>
              <td className="px-2 py-3 text-right font-mono">
                {formatMoney(rows.filter((row) => row.status !== "İptal").reduce((sum, row) => sum + row.grandTotal, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </article>
    </div>
  );
}
const controlClass =
  "h-10 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-sm outline-none transition focus:border-brand-primary";

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
        strong ? "border-t border-divider pt-3 font-semibold" : ""
      }`}
    >
      <span>{label}</span>
      <span className="font-mono">{formatMoney(value)}</span>
    </div>
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
  const id = `invoice-${label
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9ğüşöçıİ]+/gi, "-")}`;

  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        className={`${controlClass} ${align === "right" ? "text-right" : ""}`}
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} TL`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

function getInvoicePayment(
  paymentMovements: CashBankMovementRow[],
  purchaseInvoiceId: string,
) {
  return paymentMovements.find(
    (movement) =>
      movement.sourceType === "purchase-invoice" &&
      movement.sourceId === purchaseInvoiceId &&
      movement.movementType === "Fatura Ödemesi",
  );
}

function getInvoiceCollection(
  paymentMovements: CashBankMovementRow[],
  invoiceId: string,
) {
  return paymentMovements.find(
    (movement) =>
      movement.sourceType === "sales-invoice" &&
      movement.sourceId === invoiceId &&
      movement.movementType === "Tahsilat",
  );
}

function getInvoiceCollectionMovements(
  paymentMovements: CashBankMovementRow[],
  invoiceId: string,
) {
  return paymentMovements.filter(
    (movement) =>
      movement.sourceType === "sales-invoice" &&
      movement.sourceId === invoiceId &&
      movement.movementType === "Tahsilat",
  );
}

function getInvoicePaymentMovements(
  paymentMovements: CashBankMovementRow[],
  invoiceId: string,
) {
  return paymentMovements.filter(
    (movement) =>
      movement.sourceType === "purchase-invoice" &&
      movement.sourceId === invoiceId &&
      movement.movementType === "Fatura Ödemesi",
  );
}

function getInvoiceCollectionTotal(
  paymentMovements: CashBankMovementRow[],
  invoiceId: string,
) {
  return paymentMovements
    .filter(
      (movement) =>
        movement.sourceType === "sales-invoice" &&
        movement.sourceId === invoiceId &&
        movement.movementType === "Tahsilat",
    )
    .reduce((total, movement) => total + movement.amount, 0);
}

function getInvoicePaymentTotal(
  paymentMovements: CashBankMovementRow[],
  invoiceId: string,
) {
  return paymentMovements
    .filter(
      (movement) =>
        movement.sourceType === "purchase-invoice" &&
        movement.sourceId === invoiceId &&
        movement.movementType === "Fatura Ödemesi",
    )
    .reduce((total, movement) => total + movement.amount, 0);
}

function MovementLedgerDocuments({ movements }: { movements: CashBankMovementRow[] }) {
  const documents = Array.from(
    new Set(
      movements
        .map((movement) => movement.ledgerDocumentNo)
        .filter((documentNo): documentNo is string => Boolean(documentNo)),
    ),
  );

  return documents.map((documentNo) => (
    <span className="font-mono text-xs text-content-subtle" key={documentNo}>
      Muhasebe fişi: {documentNo}
    </span>
  ));
}

function statusBadgeClass(status: PurchaseInvoiceRow["status"]) {
  const tone =
    status === "İptal"
      ? "bg-[var(--ds-danger)]"
      : "bg-[var(--ds-info)]";

  return `rounded-ui-control ${tone} px-2 py-1 text-xs font-semibold text-on-status`;
}

function createValuesFromForm(form: FormState): PurchaseInvoiceCreateValues {
  return {
    counterpartyCode: form.counterpartyCode,
    counterpartyName: form.counterpartyName,
    currency: getP0BaseCurrencyTransactionValue(),
    documentNo: form.documentNo.trim(),
    dueDate: form.dueDate,
    exchangeRate: 1,
    invoiceDate: form.invoiceDate,
    isOfficial: false,
    lines: form.lines.map((line) => ({
      description: line.description.trim(),
      discountRate1: toNumber(line.discountRate1),
      discountRate2: toNumber(line.discountRate2),
      quantity: toNumber(line.quantity),
      siteName: form.siteName,
      stockCode: line.stockCode.trim(),
      stockName: line.stockName.trim(),
      unit: line.unit.trim() || "Adet",
      unitPrice: toNumber(line.unitPrice),
      vatRate: toNumber(line.vatRate),
      warehouse: line.warehouse.trim(),
    })),
    movementGroup: "",
    siteCode: form.siteCode,
    siteName: form.siteName,
  };
}

function toNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function createEmptyLine(defaultVatRate = 20): LineState {
  return {
    id: `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stockCode: "",
    stockName: "",
    unit: "Adet",
    description: "",
    warehouse: "",
    quantity: "1",
    unitPrice: "0",
    discountRate1: "0",
    discountRate2: "0",
    vatRate: String(defaultVatRate),
  };
}

function lineStateFromInvoiceLine(
  line: PurchaseInvoiceRow["lines"][number],
): LineState {
  return {
    id: `line-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stockCode: line.stockCode ?? "",
    stockName: line.stockName,
    unit: line.unit,
    description: line.description ?? "",
    warehouse: line.warehouse ?? "",
    quantity: String(line.quantity),
    unitPrice: String(line.unitPrice),
    discountRate1: String(line.discountRate1 ?? 0),
    discountRate2: String(line.discountRate2 ?? 0),
    vatRate: String(line.vatRate),
  };
}



