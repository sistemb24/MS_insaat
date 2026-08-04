import type {
  CompanyLocationSiteSnapshot,
  CompanyLocationSnapshot,
  CompanyLocationStatus,
  CompanyLocationType,
} from "./company-location";
import {
  CompanyLocationRepositoryError,
  type CompanyLocationRepository,
} from "./company-location-service";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type CompanyLocationRecord = Omit<
  CompanyLocationSnapshot,
  "createdAt" | "updatedAt"
> & {
  createdAt: DateLike;
  updatedAt: DateLike;
};

type EntityRecord = {
  code: string;
  data: unknown;
  updatedAt: DateLike;
};

type LocationWhere = {
  companyId: string;
  id?: string;
  revisionNo?: number;
  tenantId: string;
};

type CompanyLocationDelegate = {
  create(input: { data: unknown }): Promise<CompanyLocationRecord>;
  findFirst(input: { where: LocationWhere }): Promise<CompanyLocationRecord | null>;
  findMany(input: {
    orderBy: { code: "asc" };
    where: Pick<LocationWhere, "companyId" | "tenantId">;
  }): Promise<CompanyLocationRecord[]>;
  updateMany(input: {
    data: unknown;
    where: LocationWhere;
  }): Promise<{ count: number }>;
};

type EntityRecordDelegate = {
  findMany(input: {
    orderBy: { code: "asc" };
    select: { code: true; data: true; updatedAt: true };
    where: {
      companyId: string;
      periodId: string;
      slug: "santiyeler";
      tenantId: string;
    };
  }): Promise<EntityRecord[]>;
};

export type CompanyLocationPrismaClientLike = {
  companyLocation: CompanyLocationDelegate;
  entityRecord: EntityRecordDelegate;
};

export function createCompanyLocationPrismaRepository(
  prisma: CompanyLocationPrismaClientLike,
): CompanyLocationRepository {
  return {
    async create(row) {
      return fromRecord(
        await prisma.companyLocation.create({
          data: {
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
          },
        }),
      );
    },
    async find(scope, id) {
      const row = await prisma.companyLocation.findFirst({
        where: { ...scopeFields(scope), id },
      });
      return row ? fromRecord(row) : null;
    },
    async list(scope) {
      const rows = await prisma.companyLocation.findMany({
        orderBy: { code: "asc" },
        where: scopeFields(scope),
      });
      return rows.map(fromRecord);
    },
    async listSites(scope) {
      const rows = await prisma.entityRecord.findMany({
        orderBy: { code: "asc" },
        select: { code: true, data: true, updatedAt: true },
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          slug: "santiyeler",
          tenantId: scope.tenantId,
        },
      });
      return rows.map(toSiteSnapshot);
    },
    async update({ expectedRevisionNo, row }) {
      const result = await prisma.companyLocation.updateMany({
        data: {
          addressLine: row.addressLine,
          city: row.city,
          code: row.code,
          district: row.district,
          email: row.email,
          lastMutationKey: row.lastMutationKey,
          name: row.name,
          phone: row.phone,
          postalCode: row.postalCode,
          responsiblePerson: row.responsiblePerson,
          revisionNo: row.revisionNo,
          status: row.status,
          type: row.type,
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
        throw new CompanyLocationRepositoryError(
          "Lokasyon beklenen revizyonda bulunamadı.",
        );
      }
      const saved = await prisma.companyLocation.findFirst({
        where: { ...scopeFields(row), id: row.id },
      });
      if (!saved) {
        throw new CompanyLocationRepositoryError(
          "Güncellenen lokasyon yeniden okunamadı.",
        );
      }
      return fromRecord(saved);
    },
  };
}

function scopeFields(
  scope: Pick<TenantScope, "companyId" | "tenantId">,
) {
  return {
    companyId: scope.companyId,
    tenantId: scope.tenantId,
  };
}

function fromRecord(row: CompanyLocationRecord): CompanyLocationSnapshot {
  return {
    ...row,
    status: row.status as CompanyLocationStatus,
    type: row.type as CompanyLocationType,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function toSiteSnapshot(row: EntityRecord): CompanyLocationSiteSnapshot {
  const data = readJsonObject(row.data);
  return {
    code: row.code,
    name: data.name || row.code,
    responsiblePerson: data.responsible || "",
    status: data.status?.toLocaleLowerCase("tr") === "pasif"
      ? "INACTIVE"
      : "ACTIVE",
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
