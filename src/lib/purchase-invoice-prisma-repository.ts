import { calculateInvoiceTotals } from "./invoices";
import type {
  PurchaseInvoiceRepository,
  PurchaseInvoiceRepositoryListInput,
  PurchaseInvoiceRow,
} from "./purchase-invoice-service";
import { getP0BaseCurrencyTransactionValue } from "./settings-contract";

type PurchaseInvoiceWithLines = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  documentNo: string;
  currency: string;
  status: string;
  invoiceDate: Date | string;
  dueDate: Date | string | null;
  counterpartyCode: string;
  counterpartyName: string;
  siteCode: string;
  siteName: string;
  exchangeRate: unknown;
  movementGroup?: string | null;
  isOfficial: boolean;
  description?: string | null;
  subtotal: unknown;
  discountTotal: unknown;
  netTotal: unknown;
  vatTotal: unknown;
  withholdingTotal: unknown;
  grandTotal: unknown;
  lineCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lines: PurchaseInvoiceLineRecord[];
};

type PurchaseInvoiceLineRecord = {
  lineNo: number;
  stockCode?: string | null;
  stockName?: string;
  siteName?: string | null;
  unit?: string;
  description?: string | null;
  warehouse?: string | null;
  quantity?: unknown;
  unitPrice?: unknown;
  discountRate1?: unknown;
  discountRate2?: unknown;
  vatRate?: unknown;
  grossTotal?: unknown;
  discountTotal?: unknown;
  netTotal?: unknown;
  vatTotal?: unknown;
  grandTotal?: unknown;
};

export type InvoicePrismaDelegate = {
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
    };
    orderBy: Array<{ invoiceDate: "asc" | "desc" } | { documentNo: "asc" | "desc" }>;
    include: {
      lines: {
        orderBy: {
          lineNo: "asc" | "desc";
        };
      };
    };
  }): Promise<PurchaseInvoiceWithLines[]>;
  create(input: {
    data: ReturnType<typeof rowToCreateData>;
    include: {
      lines: {
        orderBy: {
          lineNo: "asc" | "desc";
        };
      };
    };
  }): Promise<PurchaseInvoiceWithLines>;
  update(input: {
    where: {
      id: string;
    };
    data: ReturnType<typeof rowToUpdateData>;
    include: {
      lines: {
        orderBy: {
          lineNo: "asc" | "desc";
        };
      };
    };
  }): Promise<PurchaseInvoiceWithLines>;
};

export type PurchaseInvoicePrismaClientLike = {
  purchaseInvoice: InvoicePrismaDelegate;
};

export function createPurchaseInvoicePrismaRepository(
  prisma: PurchaseInvoicePrismaClientLike,
): PurchaseInvoiceRepository {
  return createInvoicePrismaRepository(prisma.purchaseInvoice);
}

export function createInvoicePrismaRepository(
  invoice: InvoicePrismaDelegate,
): PurchaseInvoiceRepository {
  return {
    async list({ scope }: PurchaseInvoiceRepositoryListInput) {
      const rows = await invoice.findMany({
        where: {
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
        },
        orderBy: [{ invoiceDate: "desc" }, { documentNo: "asc" }],
        include: lineInclude(),
      });

      return rows.map(recordToRow);
    },

    async create(row) {
      const created = await invoice.create({
        data: rowToCreateData(row),
        include: lineInclude(),
      });

      return recordToRow(created);
    },

    async update(row) {
      const updated = await invoice.update({
        where: {
          id: row.id,
        },
        data: rowToUpdateData(row),
        include: lineInclude(),
      });

      return recordToRow(updated);
    },
  };
}

function rowToCreateData(row: PurchaseInvoiceRow) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    companyId: row.companyId,
    periodId: row.periodId,
    ...rowToPersistedFields(row),
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt),
    lines: {
      createMany: {
        data: rowToLineCreateManyData(row),
      },
    },
  };
}

function rowToUpdateData(row: PurchaseInvoiceRow) {
  return {
    ...rowToPersistedFields(row),
    lines: {
      deleteMany: {},
      createMany: {
        data: rowToLineCreateManyData(row),
      },
    },
  };
}

function rowToPersistedFields(row: PurchaseInvoiceRow) {
  return {
    documentNo: row.documentNo,
    invoiceDate: parseDate(row.invoiceDate),
    dueDate: row.dueDate ? parseDate(row.dueDate) : null,
    counterpartyCode: row.counterpartyCode,
    counterpartyName: row.counterpartyName,
    siteCode: row.siteCode,
    siteName: row.siteName,
    currency: getP0BaseCurrencyTransactionValue(),
    exchangeRate: row.exchangeRate,
    movementGroup: row.movementGroup || null,
    isOfficial: row.isOfficial,
    description: row.description || null,
    status: row.status,
    subtotal: row.subtotal,
    discountTotal: row.discountTotal,
    netTotal: row.netTotal,
    vatTotal: row.vatTotal,
    withholdingTotal: row.withholdingTotal,
    grandTotal: row.grandTotal,
    lineCount: row.lineCount,
    updatedBy: row.updatedBy,
    updatedAt: new Date(row.updatedAt),
  };
}

function rowToLineCreateManyData(row: PurchaseInvoiceRow) {
  const totals = calculateInvoiceTotals(row);

  return row.lines.map((line, index) => {
    const lineTotals = totals.lines[index];

    return {
      lineNo: lineTotals.lineNo,
      stockCode: line.stockCode || null,
      stockName: line.stockName,
      siteName: line.siteName || null,
      unit: line.unit,
      description: line.description || null,
      warehouse: line.warehouse || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountRate1: line.discountRate1 ?? 0,
      discountRate2: line.discountRate2 ?? 0,
      vatRate: line.vatRate,
      grossTotal: lineTotals.grossTotal,
      discountTotal: lineTotals.discountTotal,
      netTotal: lineTotals.netTotal,
      vatTotal: lineTotals.vatTotal,
      grandTotal: lineTotals.grandTotal,
    };
  });
}

function recordToRow(record: PurchaseInvoiceWithLines): PurchaseInvoiceRow {
  return {
    id: record.id,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    documentNo: record.documentNo,
    invoiceDate: formatDateOnly(record.invoiceDate),
    dueDate: record.dueDate ? formatDateOnly(record.dueDate) : "",
    counterpartyCode: record.counterpartyCode,
    counterpartyName: record.counterpartyName,
    siteCode: record.siteCode,
    siteName: record.siteName,
    currency: readCurrency(record.currency),
    exchangeRate: numberFromDecimal(record.exchangeRate),
    movementGroup: record.movementGroup ?? "",
    isOfficial: record.isOfficial,
    description: record.description ?? "",
    lines: record.lines.map((line) => ({
      stockCode: line.stockCode ?? "",
      stockName: line.stockName ?? "",
      siteName: line.siteName ?? "",
      unit: line.unit ?? "",
      description: line.description ?? "",
      warehouse: line.warehouse ?? "",
      quantity: numberFromDecimal(line.quantity),
      unitPrice: numberFromDecimal(line.unitPrice),
      discountRate1: numberFromDecimal(line.discountRate1 ?? 0),
      discountRate2: numberFromDecimal(line.discountRate2 ?? 0),
      vatRate: numberFromDecimal(line.vatRate),
    })),
    status: readStatus(record.status),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: formatIso(record.createdAt),
    updatedAt: formatIso(record.updatedAt),
    subtotal: numberFromDecimal(record.subtotal),
    discountTotal: numberFromDecimal(record.discountTotal),
    netTotal: numberFromDecimal(record.netTotal),
    vatTotal: numberFromDecimal(record.vatTotal),
    withholdingTotal: numberFromDecimal(record.withholdingTotal),
    grandTotal: numberFromDecimal(record.grandTotal),
    lineCount: record.lineCount,
  };
}

function lineInclude() {
  return {
    lines: {
      orderBy: {
        lineNo: "asc" as const,
      },
    },
  };
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateOnly(value: Date | string) {
  return formatIso(value).slice(0, 10);
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function numberFromDecimal(value: unknown) {
  return Number(value ?? 0);
}

function readCurrency(value: string): PurchaseInvoiceRow["currency"] {
  void value;

  return getP0BaseCurrencyTransactionValue();
}

function readStatus(value: string): PurchaseInvoiceRow["status"] {
  if (value === "Kaydedildi" || value === "İptal") {
    return value;
  }

  return "Taslak";
}
