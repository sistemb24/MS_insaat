import {
  normalizeEmployeeTransferStatus,
  type EmployeeTransferStatus,
} from "./employee-transfer";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type Delegate<T> = {
  create(input: { data: unknown }): Promise<T>;
  findFirst(input: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(input: { orderBy?: unknown; where: Record<string, unknown> }): Promise<T[]>;
  updateMany(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

export type EmployeeTransferRow = ScopeFields & {
  approveRequestKey: string | null;
  approvedAt: string | null;
  createRequestKey: string;
  createdAt: string;
  createdBy: string;
  effectiveDate: string;
  id: string;
  lastUpdateKey: string | null;
  note: string;
  personnelCode: string;
  personnelName: string;
  rejectRequestKey: string | null;
  rejectedAt: string | null;
  revisionNo: number;
  sourceSiteCode: string;
  sourceSiteName: string;
  status: EmployeeTransferStatus;
  submitRequestKey: string | null;
  submittedAt: string | null;
  targetSiteCode: string;
  targetSiteName: string;
  updatedAt: string;
  updatedBy: string;
};

type TransferRecord = Omit<
  EmployeeTransferRow,
  "approvedAt" | "createdAt" | "effectiveDate" | "rejectedAt" | "status"
  | "submittedAt" | "updatedAt"
> & {
  approvedAt: DateLike | null;
  createdAt: DateLike;
  effectiveDate: DateLike;
  rejectedAt: DateLike | null;
  status: string;
  submittedAt: DateLike | null;
  updatedAt: DateLike;
};

type EntityRecord = ScopeFields & {
  code: string;
  data: unknown;
  id: string;
  slug: string;
  updatedAt: DateLike;
  updatedBy: string;
};

type EntityRecordDelegate = {
  findFirst(input: { where: Record<string, unknown> }): Promise<EntityRecord | null>;
  updateMany(input: {
    data: Record<string, unknown>;
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
};

type TransactionClient = {
  employeeTransfer: Delegate<TransferRecord>;
  entityRecord: EntityRecordDelegate;
};

export type EmployeeTransferPrismaClientLike = TransactionClient & {
  $transaction<T>(callback: (client: TransactionClient) => Promise<T>): Promise<T>;
};

export type EmployeeTransferApprovalResult = {
  personnel: {
    code: string;
    site: string;
    updatedAt: string;
  };
  transfer: EmployeeTransferRow;
};

export type EmployeeTransferRepository = {
  approve(input: {
    expectedPersonnelUpdatedAt: string;
    expectedRevisionNo: number;
    row: EmployeeTransferRow;
  }): Promise<EmployeeTransferApprovalResult>;
  create(row: EmployeeTransferRow): Promise<EmployeeTransferRow>;
  findByCreateKey(input: {
    createRequestKey: string;
    scope: TenantScope;
  }): Promise<EmployeeTransferRow | null>;
  findById(input: {
    id: string;
    scope: TenantScope;
  }): Promise<EmployeeTransferRow | null>;
  list(input: { scope: TenantScope }): Promise<EmployeeTransferRow[]>;
  listPersonnelTransfers(input: {
    personnelCode: string;
    scope: TenantScope;
  }): Promise<EmployeeTransferRow[]>;
  transition(input: {
    expectedRevisionNo: number;
    fromStatus: EmployeeTransferStatus;
    row: EmployeeTransferRow;
  }): Promise<EmployeeTransferRow>;
  updateDraft(input: {
    expectedRevisionNo: number;
    row: EmployeeTransferRow;
  }): Promise<EmployeeTransferRow>;
};

export class EmployeeTransferRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeTransferRepositoryError";
  }
}

export function createEmployeeTransferPrismaRepository(
  prisma: EmployeeTransferPrismaClientLike,
): EmployeeTransferRepository {
  return {
    async approve({ expectedPersonnelUpdatedAt, expectedRevisionNo, row }) {
      return prisma.$transaction(async (tx) => {
        const expectedPersonnelDate = dateTime(expectedPersonnelUpdatedAt);
        const personnel = await tx.entityRecord.findFirst({
          where: {
            ...scopeFields(row),
            code: row.personnelCode,
            slug: "personel",
          },
        });
        if (!personnel) {
          throw new EmployeeTransferRepositoryError(
            "Personel kartı aktif kapsamda bulunamadı.",
          );
        }
        if (iso(personnel.updatedAt) !== expectedPersonnelDate.toISOString()) {
          throw new EmployeeTransferRepositoryError(
            "Personel kartı transfer hazırlanırken değişti.",
          );
        }
        const payload = jsonObject(personnel.data);
        if (canonicalText(payload.site) !== canonicalText(row.sourceSiteName)) {
          throw new EmployeeTransferRepositoryError(
            "Personel kartındaki güncel şantiye transfer kaynağıyla eşleşmiyor.",
          );
        }

        await updateTransfer(tx, {
          expectedRevisionNo,
          fromStatus: "SUBMITTED",
          row,
        });
        const personnelUpdate = await tx.entityRecord.updateMany({
          data: {
            data: { ...payload, site: row.targetSiteName },
            updatedAt: dateTime(row.updatedAt),
            updatedBy: row.updatedBy,
          },
          where: {
            ...scopeFields(row),
            code: row.personnelCode,
            id: personnel.id,
            slug: "personel",
            updatedAt: expectedPersonnelDate,
          },
        });
        if (personnelUpdate.count !== 1) {
          throw new EmployeeTransferRepositoryError(
            "Personel kartı beklenen sürümde güncellenemedi.",
          );
        }
        return {
          personnel: {
            code: personnel.code,
            site: row.targetSiteName,
            updatedAt: row.updatedAt,
          },
          transfer: await readTransfer(tx, row),
        };
      });
    },

    async create(row) {
      return fromTransferRecord(await prisma.employeeTransfer.create({
        data: transferCreateData(row),
      }));
    },

    async findByCreateKey({ createRequestKey, scope }) {
      const record = await prisma.employeeTransfer.findFirst({
        where: { ...scopeFields(scope), createRequestKey },
      });
      return record ? fromTransferRecord(record) : null;
    },

    async findById({ id, scope }) {
      const record = await prisma.employeeTransfer.findFirst({
        where: { ...scopeFields(scope), id },
      });
      return record ? fromTransferRecord(record) : null;
    },

    async list({ scope }) {
      return (await prisma.employeeTransfer.findMany({
        orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        where: scopeFields(scope),
      })).map(fromTransferRecord);
    },

    async listPersonnelTransfers({ personnelCode, scope }) {
      return (await prisma.employeeTransfer.findMany({
        orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        where: { ...scopeFields(scope), personnelCode },
      })).map(fromTransferRecord);
    },

    async transition({ expectedRevisionNo, fromStatus, row }) {
      await updateTransfer(prisma, { expectedRevisionNo, fromStatus, row });
      return readTransfer(prisma, row);
    },

    async updateDraft({ expectedRevisionNo, row }) {
      await updateTransfer(prisma, {
        expectedRevisionNo,
        fromStatus: "DRAFT",
        row,
      });
      return readTransfer(prisma, row);
    },
  };
}

async function updateTransfer(
  client: TransactionClient,
  input: {
    expectedRevisionNo: number;
    fromStatus: EmployeeTransferStatus;
    row: EmployeeTransferRow;
  },
) {
  const result = await client.employeeTransfer.updateMany({
    data: transferMutableData(input.row),
    where: {
      ...scopeFields(input.row),
      id: input.row.id,
      revisionNo: input.expectedRevisionNo,
      status: input.fromStatus,
    },
  });
  if (result.count !== 1) {
    throw new EmployeeTransferRepositoryError(
      "Personel transferi aktif kapsamda, beklenen durumda veya revizyonda bulunamadı.",
    );
  }
}

async function readTransfer(client: TransactionClient, row: EmployeeTransferRow) {
  const record = await client.employeeTransfer.findFirst({
    where: { ...scopeFields(row), id: row.id },
  });
  if (!record) {
    throw new EmployeeTransferRepositoryError(
      "Güncellenen personel transferi okunamadı.",
    );
  }
  return fromTransferRecord(record);
}

function transferCreateData(row: EmployeeTransferRow) {
  return {
    ...scopeFields(row),
    ...transferMutableData(row),
    createRequestKey: row.createRequestKey,
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
  };
}

function transferMutableData(row: EmployeeTransferRow) {
  return {
    approveRequestKey: row.approveRequestKey,
    approvedAt: nullableDateTime(row.approvedAt),
    effectiveDate: dateOnly(row.effectiveDate),
    lastUpdateKey: row.lastUpdateKey,
    note: row.note,
    personnelCode: row.personnelCode,
    personnelName: row.personnelName,
    rejectRequestKey: row.rejectRequestKey,
    rejectedAt: nullableDateTime(row.rejectedAt),
    revisionNo: row.revisionNo,
    sourceSiteCode: row.sourceSiteCode,
    sourceSiteName: row.sourceSiteName,
    status: row.status,
    submitRequestKey: row.submitRequestKey,
    submittedAt: nullableDateTime(row.submittedAt),
    targetSiteCode: row.targetSiteCode,
    targetSiteName: row.targetSiteName,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function fromTransferRecord(row: TransferRecord): EmployeeTransferRow {
  return {
    ...row,
    approvedAt: nullableIso(row.approvedAt),
    createdAt: iso(row.createdAt),
    effectiveDate: dateOnlyString(row.effectiveDate),
    rejectedAt: nullableIso(row.rejectedAt),
    status: normalizeEmployeeTransferStatus(row.status),
    submittedAt: nullableIso(row.submittedAt),
    updatedAt: iso(row.updatedAt),
  };
}

function scopeFields(scope: ScopeFields) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}

function jsonObject(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EmployeeTransferRepositoryError("Personel kartı verisi geçersizdir.");
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")]),
  );
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function dateTime(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new EmployeeTransferRepositoryError("Repository tarihi geçersizdir.");
  }
  return parsed;
}
function nullableDateTime(value: string | null) {
  return value ? dateTime(value) : null;
}
function iso(value: DateLike) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
function nullableIso(value: DateLike | null) {
  return value ? iso(value) : null;
}
function dateOnlyString(value: DateLike) {
  return iso(value).slice(0, 10);
}
function canonicalText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR");
}
