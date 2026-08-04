import type { FinanceSettingsSnapshot } from "./finance-settings";
import {
  FinanceSettingsRepositoryError,
  type FinanceSettingsRepository,
} from "./finance-settings-service";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type DecimalLike = number | string | { toNumber(): number };
type FinanceSettingsRecord = Omit<
  FinanceSettingsSnapshot,
  "createdAt" | "defaultVatRate" | "updatedAt"
> & {
  createdAt: DateLike;
  defaultVatRate: DecimalLike;
  updatedAt: DateLike;
};

type ScopeWhere = {
  companyId: string;
  id?: string;
  periodId: string;
  revisionNo?: number;
  tenantId: string;
};

type FinanceSettingsDelegate = {
  create(input: { data: unknown }): Promise<FinanceSettingsRecord>;
  findFirst(input: { where: ScopeWhere }): Promise<FinanceSettingsRecord | null>;
  updateMany(input: {
    data: unknown;
    where: ScopeWhere;
  }): Promise<{ count: number }>;
};

export type FinanceSettingsPrismaClientLike = {
  financeSetting: FinanceSettingsDelegate;
};

export function createFinanceSettingsPrismaRepository(
  prisma: FinanceSettingsPrismaClientLike,
): FinanceSettingsRepository {
  return {
    async create(row) {
      return fromRecord(
        await prisma.financeSetting.create({
          data: {
            ...scopeFields(row),
            createdAt: new Date(row.createdAt),
            createdBy: row.createdBy,
            defaultVatRate: row.defaultVatRate,
            id: row.id,
            lastMutationKey: row.lastMutationKey,
            revisionNo: row.revisionNo,
            showVatBreakdown: row.showVatBreakdown,
            updatedAt: new Date(row.updatedAt),
            updatedBy: row.updatedBy,
          },
        }),
      );
    },

    async find(scope) {
      const row = await prisma.financeSetting.findFirst({
        where: scopeFields(scope),
      });
      return row ? fromRecord(row) : null;
    },

    async update({ expectedRevisionNo, row }) {
      const result = await prisma.financeSetting.updateMany({
        data: {
          defaultVatRate: row.defaultVatRate,
          lastMutationKey: row.lastMutationKey,
          revisionNo: row.revisionNo,
          showVatBreakdown: row.showVatBreakdown,
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
        throw new FinanceSettingsRepositoryError(
          "Finans ayarı beklenen revizyonda bulunamadı.",
        );
      }
      const saved = await prisma.financeSetting.findFirst({
        where: { ...scopeFields(row), id: row.id },
      });
      if (!saved) {
        throw new FinanceSettingsRepositoryError(
          "Güncellenen finans ayarı yeniden okunamadı.",
        );
      }
      return fromRecord(saved);
    },
  };
}

function scopeFields(
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}

function fromRecord(row: FinanceSettingsRecord): FinanceSettingsSnapshot {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    defaultVatRate: decimalToNumber(row.defaultVatRate),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function decimalToNumber(value: DecimalLike) {
  if (typeof value === "object") return value.toNumber();
  return Number(value);
}
