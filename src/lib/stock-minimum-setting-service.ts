import type { StockMinimumThreshold } from "./notification-center-service";
import type { EntityRow } from "./entities";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type StockMinimumSettingRow = {
  companyId: string;
  createdAt: string;
  id: string;
  isActive: boolean;
  minimumQuantity: number;
  periodId: string;
  stockCode: string;
  stockName: string;
  tenantId: string;
  unit: string;
  updatedAt: string;
  updatedBy: string;
  warehouse: string;
};

export type StockMinimumSettingSaveValues = {
  minimumQuantity: number;
  stockCode: string;
  stockName: string;
  unit: string;
  warehouse: string;
};

export type StockMinimumSettingResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      errors: string[];
    };

export type StockMinimumSettingRepository = {
  listSettings(input: {
    scope: TenantScope;
  }): Promise<StockMinimumSettingRow[]>;
  upsertSetting(input: {
    scope: TenantScope;
    setting: StockMinimumSettingRow;
  }): Promise<StockMinimumSettingRow>;
};

export function createStockMinimumSettingService({
  now = () => new Date().toISOString(),
  repository,
}: {
  now?: () => string;
  repository: StockMinimumSettingRepository;
}) {
  return {
    async list({
      scope,
    }: {
      scope: TenantScope;
    }): Promise<
      StockMinimumSettingResult<{ rows: StockMinimumSettingRow[] }>
    > {
      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      return {
        ok: true,
        data: {
          rows: await repository.listSettings({ scope }),
        },
      };
    },

    async save({
      scope,
      values,
    }: {
      scope: TenantScope;
      values: StockMinimumSettingSaveValues;
    }): Promise<StockMinimumSettingResult<{ row: StockMinimumSettingRow }>> {
      const normalized = normalizeSaveValues(values);
      const errors = validateSaveValues(normalized);

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      const timestamp = now();
      const setting: StockMinimumSettingRow = {
        companyId: scope.companyId,
        createdAt: timestamp,
        id: createStockMinimumSettingId(scope, normalized),
        isActive: true,
        minimumQuantity: normalized.minimumQuantity,
        periodId: scope.periodId,
        stockCode: normalized.stockCode,
        stockName: normalized.stockName,
        tenantId: scope.tenantId,
        unit: normalized.unit || "Adet",
        updatedAt: timestamp,
        updatedBy: scope.userId,
        warehouse: normalized.warehouse,
      };

      return {
        ok: true,
        data: {
          row: await repository.upsertSetting({
            scope,
            setting,
          }),
        },
      };
    },
  };
}

export function buildStockMinimumThresholds(
  settings: StockMinimumSettingRow[],
): StockMinimumThreshold[] {
  return settings
    .filter((setting) => setting.isActive && setting.minimumQuantity > 0)
    .map((setting) => ({
      minimumQuantity: setting.minimumQuantity,
      stockCode: setting.stockCode || undefined,
      stockName: setting.stockName || undefined,
      warehouse: setting.warehouse,
    }));
}

export function buildStockMinimumThresholdsFromStockCards(
  stockCards: EntityRow[],
): StockMinimumThreshold[] {
  return stockCards.flatMap((row) => {
    if (row.status === "Pasif") {
      return [];
    }

    const minimumQuantity = parseStockMinimumQuantity(row.minimumQuantity);
    const stockCode = row.code?.trim() ?? "";
    const stockName = row.name?.trim() ?? "";
    const warehouse = row.defaultWarehouse?.trim() ?? "";

    if (!warehouse || !stockName || minimumQuantity <= 0) {
      return [];
    }

    return [
      {
        minimumQuantity,
        stockCode: stockCode || undefined,
        stockName,
        warehouse,
      },
    ];
  });
}

export function mergeStockMinimumThresholds({
  settings,
  stockCards,
}: {
  settings: StockMinimumThreshold[];
  stockCards: StockMinimumThreshold[];
}): StockMinimumThreshold[] {
  const byIdentity = new Map<string, StockMinimumThreshold>();

  for (const threshold of stockCards) {
    byIdentity.set(createThresholdIdentity(threshold), threshold);
  }

  for (const threshold of settings) {
    byIdentity.set(createThresholdIdentity(threshold), threshold);
  }

  return Array.from(byIdentity.values());
}

export function createSeededStockMinimumSettingMemoryRepository({
  settings = [],
}: {
  settings?: StockMinimumSettingRow[];
} = {}): StockMinimumSettingRepository {
  const rows = [...settings];

  return {
    async listSettings({ scope }) {
      return rows
        .filter(
          (row) =>
            row.tenantId === scope.tenantId &&
            row.companyId === scope.companyId &&
            row.periodId === scope.periodId &&
            row.isActive,
        )
        .sort(compareStockMinimumSettings);
    },

    async upsertSetting({ setting }) {
      const index = rows.findIndex((row) => row.id === setting.id);

      if (index === -1) {
        rows.push(setting);

        return setting;
      }

      rows[index] = {
        ...rows[index],
        isActive: setting.isActive,
        minimumQuantity: setting.minimumQuantity,
        stockCode: setting.stockCode,
        stockName: setting.stockName,
        unit: setting.unit,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy,
        warehouse: setting.warehouse,
      };

      return rows[index];
    },
  };
}

function normalizeSaveValues(
  values: StockMinimumSettingSaveValues,
): StockMinimumSettingSaveValues {
  return {
    minimumQuantity: Number(values.minimumQuantity),
    stockCode: values.stockCode.trim(),
    stockName: values.stockName.trim(),
    unit: values.unit.trim(),
    warehouse: values.warehouse.trim(),
  };
}

function parseStockMinimumQuantity(value: string | undefined) {
  const normalized = (value ?? "").trim().replace(/\./g, "").replace(",", ".");
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createThresholdIdentity(threshold: StockMinimumThreshold) {
  return [
    threshold.warehouse,
    threshold.stockCode || threshold.stockName || "",
  ].join("::");
}

function validateSaveValues(values: StockMinimumSettingSaveValues) {
  const errors: string[] = [];

  if (!values.warehouse) {
    errors.push("Depo zorunludur.");
  }

  if (!values.stockCode && !values.stockName) {
    errors.push("Stok kodu veya stok adı zorunludur.");
  }

  if (!Number.isFinite(values.minimumQuantity) || values.minimumQuantity <= 0) {
    errors.push("Minimum miktar sıfırdan büyük olmalıdır.");
  }

  return errors;
}

function createStockMinimumSettingId(
  scope: TenantScope,
  values: Pick<StockMinimumSettingSaveValues, "stockCode" | "stockName" | "warehouse">,
) {
  const stockIdentity = values.stockCode || values.stockName;

  return [
    scope.tenantId,
    scope.companyId,
    scope.periodId,
    "stock-minimum",
    normalizeIdPart(values.warehouse),
    normalizeIdPart(stockIdentity),
  ].join("::");
}

function compareStockMinimumSettings(
  left: StockMinimumSettingRow,
  right: StockMinimumSettingRow,
) {
  return (
    left.warehouse.localeCompare(right.warehouse, "tr") ||
    left.stockCode.localeCompare(right.stockCode, "tr") ||
    left.stockName.localeCompare(right.stockName, "tr")
  );
}

function normalizeIdPart(value: string) {
  return (
    value
      .trim()
      .toLocaleLowerCase("tr")
      .replace(/ğ/g, "g")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kayit"
  );
}
