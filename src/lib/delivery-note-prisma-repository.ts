import type {
  DeliveryNoteRepository,
  DeliveryNoteRow,
} from "./delivery-note-service";

type DeliveryNoteRecord = {
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  deliveryDate: Date | string;
  description: string | null;
  documentNo: string;
  id: string;
  lineCount: number;
  lines: Array<{
    lineNo: number;
    quantity: unknown;
    stockCode: string | null;
    stockName: string;
    unit: string;
    warehouse: string;
  }>;
  linkedPurchaseInvoiceDocumentNo: string | null;
  linkedPurchaseInvoiceId: string | null;
  periodId: string;
  siteCode: string;
  siteName: string;
  status: string;
  supplierCode: string;
  supplierName: string;
  tenantId: string;
  totalQuantity: unknown;
  updatedAt: Date | string;
  updatedBy: string;
};

type DeliveryNoteDelegate = {
  create(input: {
    data: ReturnType<typeof toCreateData>;
    include: ReturnType<typeof includeLines>;
  }): Promise<DeliveryNoteRecord>;
  findMany(input: {
    include: ReturnType<typeof includeLines>;
    orderBy: Array<{ deliveryDate: "asc" | "desc" } | { documentNo: "asc" | "desc" }>;
    where: { companyId: string; periodId: string; tenantId: string };
  }): Promise<DeliveryNoteRecord[]>;
  update(input: {
    data: ReturnType<typeof toUpdateData>;
    include: ReturnType<typeof includeLines>;
    where: { id: string };
  }): Promise<DeliveryNoteRecord>;
};

export type DeliveryNotePrismaClientLike = {
  deliveryNote: DeliveryNoteDelegate;
};

export function createDeliveryNotePrismaRepository(
  prisma: DeliveryNotePrismaClientLike,
): DeliveryNoteRepository {
  return {
    async create(row) {
      return fromRecord(await prisma.deliveryNote.create({
        data: toCreateData(row),
        include: includeLines(),
      }));
    },
    async list({ scope }) {
      const rows = await prisma.deliveryNote.findMany({
        include: includeLines(),
        orderBy: [{ deliveryDate: "desc" }, { documentNo: "asc" }],
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });
      return rows.map(fromRecord);
    },
    async update(row) {
      return fromRecord(await prisma.deliveryNote.update({
        data: toUpdateData(row),
        include: includeLines(),
        where: { id: row.id },
      }));
    },
  };
}

function toCreateData(row: DeliveryNoteRow) {
  return {
    ...persistedFields(row),
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
    lines: { createMany: { data: lineData(row) } },
    periodId: row.periodId,
    tenantId: row.tenantId,
  };
}

function toUpdateData(row: DeliveryNoteRow) {
  return {
    ...persistedFields(row),
    lines: {
      deleteMany: {},
      createMany: { data: lineData(row) },
    },
  };
}

function persistedFields(row: DeliveryNoteRow) {
  return {
    deliveryDate: new Date(`${row.deliveryDate}T00:00:00.000Z`),
    description: row.description || null,
    documentNo: row.documentNo,
    lineCount: row.lineCount,
    linkedPurchaseInvoiceDocumentNo: row.linkedPurchaseInvoiceDocumentNo || null,
    linkedPurchaseInvoiceId: row.linkedPurchaseInvoiceId || null,
    siteCode: row.siteCode,
    siteName: row.siteName,
    status: row.status,
    supplierCode: row.supplierCode,
    supplierName: row.supplierName,
    totalQuantity: row.totalQuantity,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function lineData(row: DeliveryNoteRow) {
  return row.lines.map((line, index) => ({
    lineNo: index + 1,
    quantity: line.quantity,
    stockCode: line.stockCode || null,
    stockName: line.stockName,
    unit: line.unit,
    warehouse: line.warehouse,
  }));
}

function fromRecord(record: DeliveryNoteRecord): DeliveryNoteRow {
  return {
    companyId: record.companyId,
    createdAt: iso(record.createdAt),
    createdBy: record.createdBy,
    deliveryDate: iso(record.deliveryDate).slice(0, 10),
    description: record.description ?? "",
    documentNo: record.documentNo,
    id: record.id,
    lineCount: record.lineCount,
    lines: record.lines.map((line) => ({
      quantity: Number(line.quantity),
      stockCode: line.stockCode ?? "",
      stockName: line.stockName,
      unit: line.unit,
      warehouse: line.warehouse,
    })),
    linkedPurchaseInvoiceDocumentNo: record.linkedPurchaseInvoiceDocumentNo ?? "",
    linkedPurchaseInvoiceId: record.linkedPurchaseInvoiceId ?? "",
    periodId: record.periodId,
    siteCode: record.siteCode,
    siteName: record.siteName,
    status: readStatus(record.status),
    supplierCode: record.supplierCode,
    supplierName: record.supplierName,
    tenantId: record.tenantId,
    totalQuantity: Number(record.totalQuantity),
    updatedAt: iso(record.updatedAt),
    updatedBy: record.updatedBy,
  };
}

function includeLines() {
  return { lines: { orderBy: { lineNo: "asc" as const } } };
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readStatus(value: string): DeliveryNoteRow["status"] {
  return value === "Kaydedildi" || value === "İptal" ? value : "Taslak";
}
