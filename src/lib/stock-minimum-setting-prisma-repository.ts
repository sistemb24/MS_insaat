import type {
  StockMinimumSettingRepository,
  StockMinimumSettingRow,
} from "./stock-minimum-setting-service";

type StockMinimumSettingRecord = {
  companyId: string;
  createdAt: Date | string;
  id: string;
  isActive: boolean;
  minimumQuantity: unknown;
  periodId: string;
  stockCode: string | null;
  stockName: string | null;
  tenantId: string;
  unit: string;
  updatedAt: Date | string;
  updatedBy: string;
  warehouse: string;
};

type StockMinimumSettingClient = {
  findMany(input: {
    where: {
      companyId: string;
      isActive: boolean;
      periodId: string;
      tenantId: string;
    };
    orderBy: Array<
      | { warehouse: "asc" | "desc" }
      | { stockCode: "asc" | "desc" }
      | { stockName: "asc" | "desc" }
    >;
  }): Promise<StockMinimumSettingRecord[]>;
  upsert(input: {
    where: {
      id: string;
    };
    create: ReturnType<typeof settingRowToCreateData>;
    update: ReturnType<typeof settingRowToUpdateData>;
  }): Promise<StockMinimumSettingRecord>;
};

export type StockMinimumSettingPrismaClientLike = {
  stockMinimumSetting: StockMinimumSettingClient;
};

export function createStockMinimumSettingPrismaRepository(
  prisma: StockMinimumSettingPrismaClientLike,
): StockMinimumSettingRepository {
  return {
    async listSettings({ scope }) {
      const rows = await prisma.stockMinimumSetting.findMany({
        where: {
          companyId: scope.companyId,
          isActive: true,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
        orderBy: [
          { warehouse: "asc" },
          { stockCode: "asc" },
          { stockName: "asc" },
        ],
      });

      return rows.map(settingRecordToRow);
    },

    async upsertSetting({ setting }) {
      const row = await prisma.stockMinimumSetting.upsert({
        where: {
          id: setting.id,
        },
        create: settingRowToCreateData(setting),
        update: settingRowToUpdateData(setting),
      });

      return settingRecordToRow(row);
    },
  };
}

function settingRowToCreateData(row: StockMinimumSettingRow) {
  return {
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    id: row.id,
    isActive: row.isActive,
    minimumQuantity: row.minimumQuantity,
    periodId: row.periodId,
    stockCode: row.stockCode || null,
    stockName: row.stockName || null,
    tenantId: row.tenantId,
    unit: row.unit,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    warehouse: row.warehouse,
  };
}

function settingRowToUpdateData(row: StockMinimumSettingRow) {
  return {
    isActive: row.isActive,
    minimumQuantity: row.minimumQuantity,
    stockCode: row.stockCode || null,
    stockName: row.stockName || null,
    unit: row.unit,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    warehouse: row.warehouse,
  };
}

function settingRecordToRow(
  row: StockMinimumSettingRecord,
): StockMinimumSettingRow {
  return {
    companyId: row.companyId,
    createdAt: toIsoString(row.createdAt),
    id: row.id,
    isActive: row.isActive,
    minimumQuantity: Number(row.minimumQuantity ?? 0),
    periodId: row.periodId,
    stockCode: row.stockCode ?? "",
    stockName: row.stockName ?? "",
    tenantId: row.tenantId,
    unit: row.unit,
    updatedAt: toIsoString(row.updatedAt),
    updatedBy: row.updatedBy,
    warehouse: row.warehouse,
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
