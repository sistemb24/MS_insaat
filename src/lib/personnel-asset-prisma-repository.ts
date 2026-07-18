import type { PersonnelAssetRepository, PersonnelAssetRow } from "./personnel-asset-service";

type RecordRow = Omit<PersonnelAssetRow, "assignedAt" | "createdAt" | "dueAt" | "notes" | "quantity" | "returnedAt" | "serialNo" | "siteCode" | "siteName" | "status" | "updatedAt"> & {
  assignedAt: Date | string;
  createdAt: Date | string;
  dueAt: Date | string | null;
  notes: string | null;
  quantity: unknown;
  returnedAt: Date | string | null;
  serialNo: string | null;
  siteCode: string | null;
  siteName: string | null;
  status: string;
  updatedAt: Date | string;
};

type Delegate = {
  create(input: { data: ReturnType<typeof toCreateData> }): Promise<RecordRow>;
  findMany(input: {
    orderBy: Array<{ assignedAt: "asc" | "desc" } | { assetCode: "asc" | "desc" }>;
    where: { companyId: string; periodId: string; tenantId: string };
  }): Promise<RecordRow[]>;
  update(input: { data: ReturnType<typeof toUpdateData>; where: { id: string } }): Promise<RecordRow>;
};

export type PersonnelAssetPrismaClientLike = { personnelAssetAssignment: Delegate };

export function createPersonnelAssetPrismaRepository(
  prisma: PersonnelAssetPrismaClientLike,
): PersonnelAssetRepository {
  return {
    async create(row) {
      return fromRecord(await prisma.personnelAssetAssignment.create({ data: toCreateData(row) }));
    },
    async list({ scope }) {
      const rows = await prisma.personnelAssetAssignment.findMany({
        orderBy: [{ assignedAt: "desc" }, { assetCode: "asc" }],
        where: { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId },
      });
      return rows.map(fromRecord);
    },
    async update(row) {
      return fromRecord(await prisma.personnelAssetAssignment.update({ data: toUpdateData(row), where: { id: row.id } }));
    },
  };
}

function toCreateData(row: PersonnelAssetRow) {
  return {
    ...persisted(row),
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
    periodId: row.periodId,
    tenantId: row.tenantId,
  };
}

function toUpdateData(row: PersonnelAssetRow) {
  return persisted(row);
}

function persisted(row: PersonnelAssetRow) {
  return {
    assetCategory: row.assetCategory,
    assetCode: row.assetCode,
    assetName: row.assetName,
    assignedAt: date(row.assignedAt),
    dueAt: row.dueAt ? date(row.dueAt) : null,
    notes: row.notes || null,
    personnelCode: row.personnelCode,
    personnelName: row.personnelName,
    quantity: row.quantity,
    returnedAt: row.returnedAt ? date(row.returnedAt) : null,
    serialNo: row.serialNo || null,
    siteCode: row.siteCode || null,
    siteName: row.siteName || null,
    status: row.status,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function fromRecord(row: RecordRow): PersonnelAssetRow {
  return {
    ...row,
    assignedAt: iso(row.assignedAt).slice(0, 10),
    createdAt: iso(row.createdAt),
    dueAt: row.dueAt ? iso(row.dueAt).slice(0, 10) : undefined,
    notes: row.notes ?? undefined,
    quantity: Number(row.quantity),
    returnedAt: row.returnedAt ? iso(row.returnedAt).slice(0, 10) : undefined,
    serialNo: row.serialNo ?? undefined,
    siteCode: row.siteCode ?? undefined,
    siteName: row.siteName ?? undefined,
    status: readStatus(row.status),
    updatedAt: iso(row.updatedAt),
  };
}

function date(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function iso(value: Date | string) { return value instanceof Date ? value.toISOString() : new Date(value).toISOString(); }
function readStatus(value: string): PersonnelAssetRow["status"] { return value === "İade Edildi" || value === "Kayıp" || value === "Kullanılamaz" ? value : "Zimmetli"; }
