import {
  normalizeCustomerTypeName,
  type CustomerTypeSnapshot,
  type CustomerTypeStatus,
} from "./customer-type";
import {
  CustomerTypeRepositoryError,
  type CustomerTypeRepository,
} from "./customer-type-service";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type CustomerTypeRecord = Omit<CustomerTypeSnapshot, "createdAt" | "updatedAt"> & {
  createdAt: DateLike;
  updatedAt: DateLike;
};
type CustomerTypeWhere = {
  companyId: string;
  id?: string;
  normalizedName?: string;
  revisionNo?: number;
  tenantId: string;
};
type CustomerTypeDelegate = {
  create(input: { data: unknown }): Promise<CustomerTypeRecord>;
  findFirst(input: { where: CustomerTypeWhere }): Promise<CustomerTypeRecord | null>;
  findMany(input: {
    orderBy: { name: "asc" };
    where: Pick<CustomerTypeWhere, "companyId" | "tenantId">;
  }): Promise<CustomerTypeRecord[]>;
  updateMany(input: {
    data: unknown;
    where: CustomerTypeWhere;
  }): Promise<{ count: number }>;
};
type EntityRecordDelegate = {
  findMany(input: {
    select: { data: true };
    where: {
      companyId: string;
      slug: "musteriler";
      tenantId: string;
    };
  }): Promise<Array<{ data: unknown }>>;
};

export type CustomerTypePrismaClientLike = {
  customerType: CustomerTypeDelegate;
  entityRecord: EntityRecordDelegate;
};

export function createCustomerTypePrismaRepository(
  prisma: CustomerTypePrismaClientLike,
): CustomerTypeRepository {
  return {
    async create(row) {
      return fromRecord(await prisma.customerType.create({
        data: {
          ...row,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      }));
    },
    async findById(scope, id) {
      const row = await prisma.customerType.findFirst({
        where: { ...scopeFields(scope), id },
      });
      return row ? fromRecord(row) : null;
    },
    async findByNormalizedName(scope, normalizedName) {
      const row = await prisma.customerType.findFirst({
        where: { ...scopeFields(scope), normalizedName },
      });
      return row ? fromRecord(row) : null;
    },
    async listManaged(scope) {
      const rows = await prisma.customerType.findMany({
        orderBy: { name: "asc" },
        where: scopeFields(scope),
      });
      return rows.map(fromRecord);
    },
    async listUsage(scope) {
      const rows = await prisma.entityRecord.findMany({
        select: { data: true },
        where: { ...scopeFields(scope), slug: "musteriler" },
      });
      const usage = new Map<string, { name: string; usageCount: number }>();
      for (const row of rows) {
        const customerType = readJsonObject(row.data).customerType?.trim();
        if (!customerType) continue;
        const normalizedName = normalizeCustomerTypeName(customerType);
        const current = usage.get(normalizedName);
        usage.set(normalizedName, {
          name: current?.name ?? customerType,
          usageCount: (current?.usageCount ?? 0) + 1,
        });
      }
      return [...usage.entries()].map(([normalizedName, row]) => ({
        ...row,
        normalizedName,
      }));
    },
    async update({ expectedRevisionNo, row }) {
      const result = await prisma.customerType.updateMany({
        data: {
          description: row.description,
          lastMutationKey: row.lastMutationKey,
          name: row.name,
          normalizedName: row.normalizedName,
          revisionNo: row.revisionNo,
          status: row.status,
          updatedAt: new Date(row.updatedAt),
          updatedBy: row.updatedBy,
        },
        where: {
          ...scopeFields(row),
          id: row.id,
          revisionNo: expectedRevisionNo,
        },
      });
      if (result.count !== 1) {
        throw new CustomerTypeRepositoryError(
          "Müşteri tipi beklenen revizyonda bulunamadı.",
        );
      }
      const saved = await prisma.customerType.findFirst({
        where: { ...scopeFields(row), id: row.id },
      });
      if (!saved) {
        throw new CustomerTypeRepositoryError(
          "Güncellenen müşteri tipi yeniden okunamadı.",
        );
      }
      return fromRecord(saved);
    },
  };
}

function scopeFields(scope: Pick<TenantScope, "companyId" | "tenantId">) {
  return { companyId: scope.companyId, tenantId: scope.tenantId };
}

function fromRecord(row: CustomerTypeRecord): CustomerTypeSnapshot {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    status: row.status as CustomerTypeStatus,
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function readJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, string>;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")]),
  );
}
