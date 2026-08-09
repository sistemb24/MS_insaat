import { Prisma, type PrismaClient } from "@prisma/client";

import {
  PRODUCTION_TENANT_MODELS,
  type ProductionTenantInventoryRepositoryPort,
  type ProductionTenantInventorySnapshot,
  type ProductionTenantModel,
} from "./production-tenant-inventory";
import type { TenantLifecycleStatus } from "./tenant-lifecycle";

type CountDelegate = {
  count(input: { where: { tenantId: string } }): Promise<number>;
};

type ProductionTenantInventoryPrismaClientLike = Pick<PrismaClient, "$transaction">;

export function createProductionTenantInventoryPrismaRepository(
  prisma: ProductionTenantInventoryPrismaClientLike,
): ProductionTenantInventoryRepositoryPort {
  return {
    async readTenantInventory(input) {
      const tenantId = normalizeIdentifier(input.tenantId);
      const activeAt = normalizeDate(input.activeAt);
      assertExactModelCatalog(input.models);

      return prisma.$transaction(
        async (tx) => {
          const readOnlyRows = await tx.$queryRaw<
            { transaction_read_only: string }[]
          >(Prisma.sql`
            SELECT current_setting('transaction_read_only')::text
              AS transaction_read_only
          `);
          if (readOnlyRows.length !== 1 || readOnlyRows[0]?.transaction_read_only !== "on") {
            throw new Error("Production tenant envanter DB bağlantısı salt-okunur değil.");
          }

          const modelCounts = [];
          for (const model of PRODUCTION_TENANT_MODELS) {
            const delegate = readCountDelegate(tx, model);
            const count = await delegate.count({ where: { tenantId } });
            assertNonNegativeInteger(count, `${model} kayıt sayısı`);
            modelCounts.push({ count, model });
          }

          const [tenantRow, activeSessionCount, activeLegalHoldCount, documentRows] =
            await Promise.all([
              tx.tenant.findUnique({
                where: { id: tenantId },
                select: { lifecycleStatus: true, lifecycleVersion: true },
              }),
              tx.appAuthSession.count({
                where: {
                  expiresAt: { gt: activeAt },
                  revokedAt: null,
                  scopeSession: { tenantId },
                },
              }),
              tx.tenantLegalHold.count({
                where: { status: "ACTIVE", tenantId },
              }),
              tx.documentFile.findMany({
                where: { tenantId },
                orderBy: { id: "asc" },
                select: { sizeBytes: true, storageKey: true },
              }),
            ]);

          assertNonNegativeInteger(activeSessionCount, "Aktif oturum sayısı");
          assertNonNegativeInteger(activeLegalHoldCount, "Aktif legal hold sayısı");

          const tenant: ProductionTenantInventorySnapshot | null = tenantRow
            ? {
                activeLegalHoldCount,
                activeSessionCount,
                lifecycleStatus: normalizeLifecycleStatus(
                  tenantRow.lifecycleStatus,
                ),
                lifecycleVersion: normalizePositiveInteger(
                  tenantRow.lifecycleVersion,
                  "Tenant yaşam döngüsü sürümü",
                ),
              }
            : null;

          return {
            documents: documentRows.map((row) => ({
              sizeBytes: normalizeSizeBytes(row.sizeBytes),
              storageKey: row.storageKey,
            })),
            modelCounts,
            tenant,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          maxWait: 10_000,
          timeout: 120_000,
        },
      );
    },
  };
}

function readCountDelegate(
  tx: Prisma.TransactionClient,
  model: ProductionTenantModel,
) {
  const delegateName = `${model[0]?.toLowerCase()}${model.slice(1)}`;
  const delegate = (tx as unknown as Record<string, CountDelegate | undefined>)[
    delegateName
  ];
  if (!delegate || typeof delegate.count !== "function") {
    throw new Error(`Tenant model delegate'i bulunamadı: ${model}`);
  }
  return delegate;
}

function assertExactModelCatalog(models: readonly ProductionTenantModel[]) {
  if (
    models.length !== PRODUCTION_TENANT_MODELS.length ||
    models.some((model, index) => model !== PRODUCTION_TENANT_MODELS[index])
  ) {
    throw new Error("Tenant model envanteri exact katalogla eşleşmiyor.");
  }
}

function normalizeIdentifier(value: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(normalized)) {
    throw new Error("Production tenant kimliği güvenli değil.");
  }
  return normalized;
}

function normalizeDate(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("Tenant envanter zamanı geçerli değil.");
  }
  return value;
}

function normalizeLifecycleStatus(value: string): TenantLifecycleStatus {
  if (value === "ACTIVE" || value === "FROZEN" || value === "CLOSURE_PENDING") {
    return value;
  }
  throw new Error("Tenant yaşam döngüsü durumu bilinmiyor.");
}

function normalizeSizeBytes(value: bigint) {
  if (value < BigInt(0) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Doküman boyutu güvenli tam sayı sınırında değil.");
  }
  return Number(value);
}

function normalizePositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} geçerli değil.`);
  }
  return value;
}

function assertNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} geçerli değil.`);
  }
}
