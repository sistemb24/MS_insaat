import type { StockMovementRepository, StockMovementRow } from "./stock-movement-service";

type RecordRow = Omit<StockMovementRow, "createdAt" | "description" | "movementDate" | "movementType" | "quantity" | "siteCode" | "siteName" | "status" | "targetWarehouse" | "unitCost" | "updatedAt"> & {
  createdAt: Date | string;
  description: string | null;
  movementDate: Date | string;
  movementType: string;
  quantity: unknown;
  siteCode: string | null;
  siteName: string | null;
  status: string;
  targetWarehouse: string | null;
  unitCost: unknown;
  updatedAt: Date | string;
};

type Delegate = {
  create(input: { data: ReturnType<typeof toCreateData> }): Promise<RecordRow>;
  findMany(input: {
    orderBy: Array<{ movementDate: "asc" | "desc" } | { documentNo: "asc" | "desc" }>;
    where: { companyId: string; periodId: string; tenantId: string };
  }): Promise<RecordRow[]>;
  update(input: { data: ReturnType<typeof persisted>; where: { id: string } }): Promise<RecordRow>;
};

export type StockMovementPrismaClientLike = { stockMovement: Delegate };

export function createStockMovementPrismaRepository(prisma: StockMovementPrismaClientLike): StockMovementRepository {
  return {
    async create(row) { return fromRecord(await prisma.stockMovement.create({ data: toCreateData(row) })); },
    async list({ scope }) { const rows = await prisma.stockMovement.findMany({ orderBy: [{ movementDate: "desc" }, { documentNo: "asc" }], where: { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId } }); return rows.map(fromRecord); },
    async update(row) { return fromRecord(await prisma.stockMovement.update({ data: persisted(row), where: { id: row.id } })); },
  };
}

function toCreateData(row: StockMovementRow) {
  return { ...persisted(row), companyId: row.companyId, createdAt: new Date(row.createdAt), createdBy: row.createdBy, id: row.id, periodId: row.periodId, tenantId: row.tenantId };
}

function persisted(row: StockMovementRow) {
  return {
    description: row.description || null,
    documentNo: row.documentNo,
    movementDate: date(row.movementDate),
    movementType: row.movementType,
    quantity: row.quantity,
    siteCode: row.siteCode || null,
    siteName: row.siteName || null,
    sourceWarehouse: row.sourceWarehouse,
    status: row.status,
    stockCode: row.stockCode,
    stockName: row.stockName,
    targetWarehouse: row.targetWarehouse || null,
    unit: row.unit,
    unitCost: row.unitCost,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function fromRecord(row: RecordRow): StockMovementRow {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    description: row.description ?? undefined,
    movementDate: iso(row.movementDate).slice(0, 10),
    movementType: row.movementType === "Şantiye Çıkışı" ? "Şantiye Çıkışı" : "Depo Transferi",
    quantity: Number(row.quantity),
    siteCode: row.siteCode ?? undefined,
    siteName: row.siteName ?? undefined,
    status: readStatus(row.status),
    targetWarehouse: row.targetWarehouse ?? undefined,
    unitCost: Number(row.unitCost),
    updatedAt: iso(row.updatedAt),
  };
}

function date(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function iso(value: Date | string) { return value instanceof Date ? value.toISOString() : new Date(value).toISOString(); }
function readStatus(value: string): StockMovementRow["status"] { return value === "Kaydedildi" || value === "İptal" ? value : "Taslak"; }
