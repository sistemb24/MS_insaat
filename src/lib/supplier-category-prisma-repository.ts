import {
  normalizeSupplierCategoryName,
  type SupplierCategorySnapshot,
  type SupplierCategoryStatus,
} from "./supplier-category";
import {
  SupplierCategoryRepositoryError,
  type SupplierCategoryRepository,
} from "./supplier-category-service";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type CategoryRecord = Omit<SupplierCategorySnapshot, "createdAt" | "updatedAt"> & {
  createdAt: DateLike;
  updatedAt: DateLike;
};
type CategoryWhere = {
  companyId: string;
  id?: string;
  normalizedName?: string;
  revisionNo?: number;
  tenantId: string;
};
type CategoryDelegate = {
  create(input: { data: unknown }): Promise<CategoryRecord>;
  findFirst(input: { where: CategoryWhere }): Promise<CategoryRecord | null>;
  findMany(input: {
    orderBy: { name: "asc" };
    where: Pick<CategoryWhere, "companyId" | "tenantId">;
  }): Promise<CategoryRecord[]>;
  updateMany(input: {
    data: unknown;
    where: CategoryWhere;
  }): Promise<{ count: number }>;
};
type EntityRecordDelegate = {
  findMany(input: {
    select: { data: true };
    where: {
      companyId: string;
      slug: "tedarikciler";
      tenantId: string;
    };
  }): Promise<Array<{ data: unknown }>>;
};

export type SupplierCategoryPrismaClientLike = {
  entityRecord: EntityRecordDelegate;
  supplierCategory: CategoryDelegate;
};

export function createSupplierCategoryPrismaRepository(
  prisma: SupplierCategoryPrismaClientLike,
): SupplierCategoryRepository {
  return {
    async create(row) {
      return fromRecord(await prisma.supplierCategory.create({
        data: {
          ...row,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
      }));
    },
    async findById(scope, id) {
      const row = await prisma.supplierCategory.findFirst({
        where: { ...scopeFields(scope), id },
      });
      return row ? fromRecord(row) : null;
    },
    async findByNormalizedName(scope, normalizedName) {
      const row = await prisma.supplierCategory.findFirst({
        where: { ...scopeFields(scope), normalizedName },
      });
      return row ? fromRecord(row) : null;
    },
    async listManaged(scope) {
      const rows = await prisma.supplierCategory.findMany({
        orderBy: { name: "asc" },
        where: scopeFields(scope),
      });
      return rows.map(fromRecord);
    },
    async listUsage(scope) {
      const rows = await prisma.entityRecord.findMany({
        select: { data: true },
        where: {
          ...scopeFields(scope),
          slug: "tedarikciler",
        },
      });
      const usage = new Map<string, { name: string; usageCount: number }>();
      for (const row of rows) {
        const category = readJsonObject(row.data).category?.trim();
        if (!category) continue;
        const normalizedName = normalizeSupplierCategoryName(category);
        const current = usage.get(normalizedName);
        usage.set(normalizedName, {
          name: current?.name ?? category,
          usageCount: (current?.usageCount ?? 0) + 1,
        });
      }
      return [...usage.entries()].map(([normalizedName, row]) => ({
        ...row,
        normalizedName,
      }));
    },
    async update({ expectedRevisionNo, row }) {
      const result = await prisma.supplierCategory.updateMany({
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
        throw new SupplierCategoryRepositoryError(
          "Tedarikçi kategorisi beklenen revizyonda bulunamadı.",
        );
      }
      const saved = await prisma.supplierCategory.findFirst({
        where: { ...scopeFields(row), id: row.id },
      });
      if (!saved) {
        throw new SupplierCategoryRepositoryError(
          "Güncellenen tedarikçi kategorisi yeniden okunamadı.",
        );
      }
      return fromRecord(saved);
    },
  };
}

function scopeFields(scope: Pick<TenantScope, "companyId" | "tenantId">) {
  return { companyId: scope.companyId, tenantId: scope.tenantId };
}

function fromRecord(row: CategoryRecord): SupplierCategorySnapshot {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    status: row.status as SupplierCategoryStatus,
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
