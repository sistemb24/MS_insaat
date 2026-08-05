import type { CompanyProfileSnapshot } from "./company-profile";
import {
  CompanyProfileRepositoryError,
  type CompanyProfileRepository,
} from "./company-profile-service";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type CompanyProfileRecord = Omit<
  CompanyProfileSnapshot,
  "createdAt" | "updatedAt"
> & {
  createdAt: DateLike;
  updatedAt: DateLike;
};

type ScopeWhere = {
  companyId: string;
  id?: string;
  revisionNo?: number;
  tenantId: string;
};

type CompanyProfileDelegate = {
  create(input: { data: unknown }): Promise<CompanyProfileRecord>;
  findFirst(input: { where: ScopeWhere }): Promise<CompanyProfileRecord | null>;
  updateMany(input: {
    data: unknown;
    where: ScopeWhere;
  }): Promise<{ count: number }>;
};

export type CompanyProfilePrismaClientLike = {
  companyProfile: CompanyProfileDelegate;
};

export function createCompanyProfilePrismaRepository(
  prisma: CompanyProfilePrismaClientLike,
): CompanyProfileRepository {
  return {
    async create(row) {
      return fromRecord(
        await prisma.companyProfile.create({
          data: {
            ...row,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
          },
        }),
      );
    },
    async find(scope) {
      const row = await prisma.companyProfile.findFirst({
        where: scopeFields(scope),
      });
      return row ? fromRecord(row) : null;
    },
    async update({ expectedRevisionNo, row }) {
      const result = await prisma.companyProfile.updateMany({
        data: {
          addressLine: row.addressLine,
          city: row.city,
          district: row.district,
          email: row.email,
          lastMutationKey: row.lastMutationKey,
          legalName: row.legalName,
          mersisNumber: row.mersisNumber,
          phone: row.phone,
          postalCode: row.postalCode,
          revisionNo: row.revisionNo,
          taxNumber: row.taxNumber,
          taxOffice: row.taxOffice,
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
        throw new CompanyProfileRepositoryError(
          "Firma profili beklenen revizyonda bulunamadı.",
        );
      }
      const saved = await prisma.companyProfile.findFirst({
        where: { ...scopeFields(row), id: row.id },
      });
      if (!saved) {
        throw new CompanyProfileRepositoryError(
          "Güncellenen firma profili yeniden okunamadı.",
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

function fromRecord(row: CompanyProfileRecord): CompanyProfileSnapshot {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
