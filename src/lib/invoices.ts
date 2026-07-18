import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

export type PurchaseInvoiceLineDraft = {
  stockCode?: string;
  stockName: string;
  siteName?: string;
  unit: string;
  description?: string;
  warehouse?: string;
  quantity: number;
  unitPrice: number;
  discountRate1?: number;
  discountRate2?: number;
  vatRate: number;
};

export type PurchaseInvoiceDraft = {
  documentNo: string;
  invoiceDate: string;
  dueDate?: string;
  counterpartyCode: string;
  counterpartyName: string;
  siteCode: string;
  siteName: string;
  currency: "TL" | "USD" | "EUR";
  exchangeRate: number;
  movementGroup?: string;
  isOfficial: boolean;
  description?: string;
  lines: PurchaseInvoiceLineDraft[];
};

export type PurchaseInvoiceLineTotals = {
  lineNo: number;
  grossTotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  grandTotal: number;
};

export type PurchaseInvoiceTotals = {
  subtotal: number;
  discountTotal: number;
  netTotal: number;
  vatTotal: number;
  withholdingTotal: number;
  grandTotal: number;
  lines: PurchaseInvoiceLineTotals[];
};

export function createPurchaseInvoiceDraft(
  input: Partial<PurchaseInvoiceDraft> & {
    lines?: PurchaseInvoiceLineDraft[];
  },
): PurchaseInvoiceDraft {
  return {
    documentNo: input.documentNo?.trim() ?? "",
    invoiceDate: input.invoiceDate?.trim() ?? "",
    dueDate: input.dueDate?.trim() ?? "",
    counterpartyCode: input.counterpartyCode?.trim() ?? "",
    counterpartyName: input.counterpartyName?.trim() ?? "",
    siteCode: input.siteCode?.trim() ?? "",
    siteName: input.siteName?.trim() ?? "",
    currency: getP0BaseCurrencyTransactionValue(),
    exchangeRate: normalizePositiveNumber(input.exchangeRate, 1),
    movementGroup: input.movementGroup?.trim() ?? "",
    isOfficial: input.isOfficial ?? false,
    description: input.description?.trim() ?? "",
    lines: input.lines?.map(normalizeLine) ?? [],
  };
}

export function validatePurchaseInvoiceDraft(
  draft: PurchaseInvoiceDraft,
): string[] {
  return validateInvoiceDraft(draft, "Tedarikçi");
}

export function validateSalesInvoiceDraft(
  draft: PurchaseInvoiceDraft,
): string[] {
  return validateInvoiceDraft(draft, "Müşteri");
}

function validateInvoiceDraft(
  draft: PurchaseInvoiceDraft,
  counterpartyLabel: "Tedarikçi" | "Müşteri",
): string[] {
  const errors: string[] = [];

  if (!draft.documentNo.trim()) {
    errors.push("Evrak no zorunludur.");
  }

  if (!draft.invoiceDate.trim()) {
    errors.push("Fatura tarihi zorunludur.");
  }

  if (!draft.counterpartyCode.trim() || !draft.counterpartyName.trim()) {
    errors.push(`${counterpartyLabel} zorunludur.`);
  }

  if (!draft.siteCode.trim() || !draft.siteName.trim()) {
    errors.push("Şantiye zorunludur.");
  }

  if (!draft.lines.some((line) => line.stockName.trim())) {
    errors.push("En az bir fatura satırı stok/hizmet adı içermelidir.");
  }

  draft.lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (line.quantity <= 0) {
      errors.push(`${lineNo}. satır miktarı 0'dan büyük olmalıdır.`);
    }

    if (line.unitPrice < 0) {
      errors.push(`${lineNo}. satır birim fiyatı negatif olamaz.`);
    }

    if (line.vatRate < 0 || line.vatRate > 100) {
      errors.push(`${lineNo}. satır KDV oranı 0 ile 100 arasında olmalıdır.`);
    }
  });

  return errors;
}

export function calculateInvoiceTotals(
  draft: PurchaseInvoiceDraft,
): PurchaseInvoiceTotals {
  const lines = draft.lines.map((line, index) =>
    calculateLineTotals(line, index + 1),
  );

  const subtotal = sum(lines.map((line) => line.grossTotal));
  const discountTotal = sum(lines.map((line) => line.discountTotal));
  const netTotal = sum(lines.map((line) => line.netTotal));
  const vatTotal = sum(lines.map((line) => line.vatTotal));
  const withholdingTotal = 0;
  const grandTotal = roundMoney(netTotal + vatTotal - withholdingTotal);

  return {
    subtotal,
    discountTotal,
    netTotal,
    vatTotal,
    withholdingTotal,
    grandTotal,
    lines,
  };
}

function calculateLineTotals(
  line: PurchaseInvoiceLineDraft,
  lineNo: number,
): PurchaseInvoiceLineTotals {
  const grossTotal = roundMoney(line.quantity * line.unitPrice);
  const discount1 = roundMoney(grossTotal * percent(line.discountRate1));
  const discount2Base = roundMoney(grossTotal - discount1);
  const discount2 = roundMoney(discount2Base * percent(line.discountRate2));
  const discountTotal = roundMoney(discount1 + discount2);
  const netTotal = roundMoney(grossTotal - discountTotal);
  const vatTotal = roundMoney(netTotal * percent(line.vatRate));
  const grandTotal = roundMoney(netTotal + vatTotal);

  return {
    lineNo,
    grossTotal,
    discountTotal,
    netTotal,
    vatTotal,
    grandTotal,
  };
}

function normalizeLine(line: PurchaseInvoiceLineDraft): PurchaseInvoiceLineDraft {
  return {
    stockCode: line.stockCode?.trim() ?? "",
    stockName: line.stockName.trim(),
    siteName: line.siteName?.trim() ?? "",
    unit: line.unit.trim(),
    description: line.description?.trim() ?? "",
    warehouse: line.warehouse?.trim() ?? "",
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    discountRate1: normalizeRate(line.discountRate1),
    discountRate2: normalizeRate(line.discountRate2),
    vatRate: Number(line.vatRate),
  };
}

function normalizePositiveNumber(value: number | undefined, fallback: number) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizeRate(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function percent(value: number | undefined) {
  return normalizeRate(value) / 100;
}

function sum(values: number[]) {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
