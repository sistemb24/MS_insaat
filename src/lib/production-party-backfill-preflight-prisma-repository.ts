import { Prisma, type PrismaClient } from "@prisma/client";

import type { ExistingPartyRole } from "./party-backfill";
import {
  PRODUCTION_PARTY_TABLES,
  type ProductionPartyPreflightRepository,
} from "./production-party-backfill-preflight";

type ProductionPartyPreflightPrismaClientLike = Pick<PrismaClient, "$transaction">;

export function createProductionPartyPreflightPrismaRepository(
  prisma: ProductionPartyPreflightPrismaClientLike,
): ProductionPartyPreflightRepository {
  return {
    async readScope({ actorUserId, scope }) {
      return prisma.$transaction(
        async (tx) => {
          const readOnlyRows = await tx.$queryRaw<Array<{ read_only: string }>>(
            Prisma.sql`
              SELECT current_setting('transaction_read_only')::text AS read_only
            `,
          );
          const transactionReadOnly =
            readOnlyRows.length === 1 && readOnlyRows[0]?.read_only === "on";
          if (!transactionReadOnly) {
            throw new Error("Party production preflight DB transaction salt-okunur değil.");
          }

          const tableRows = await tx.$queryRaw<Array<{ table_name: string }>>(
            Prisma.sql`
              SELECT tablename::text AS table_name
              FROM pg_catalog.pg_tables
              WHERE schemaname = 'public'
              ORDER BY tablename
            `,
          );
          const publicTableNames = tableRows.map((row) => row.table_name);
          const migrationTableExists = publicTableNames.includes("_prisma_migrations");
          const productionMigrationRecords = migrationTableExists
            ? await tx.$queryRaw<Array<{
                finished: boolean;
                migration_name: string;
                rolled_back: boolean;
              }>>(Prisma.sql`
                SELECT
                  migration_name,
                  finished_at IS NOT NULL AS finished,
                  rolled_back_at IS NOT NULL AS rolled_back
                FROM public."_prisma_migrations"
                ORDER BY started_at, migration_name
              `)
            : [];

          const [
            tenant,
            company,
            period,
            adminAccess,
            legacyRecords,
            purchaseInvoice,
            salesInvoice,
            progressPayment,
            ledgerEntry,
            cashBankMovement,
          ] = await Promise.all([
            tx.tenant.findUnique({
              select: { lifecycleStatus: true },
              where: { id: scope.tenantId },
            }),
            tx.company.findFirst({
              select: { id: true },
              where: { id: scope.companyId, tenantId: scope.tenantId },
            }),
            tx.period.findFirst({
              select: { isClosed: true },
              where: {
                companyId: scope.companyId,
                id: scope.periodId,
                tenantId: scope.tenantId,
              },
            }),
            tx.appUserScopeAccess.findFirst({
              select: { id: true },
              where: {
                companyId: scope.companyId,
                isActive: true,
                periodId: scope.periodId,
                role: "admin",
                tenantId: scope.tenantId,
                userId: actorUserId,
              },
            }),
            tx.entityRecord.findMany({
              orderBy: [{ slug: "asc" }, { code: "asc" }],
              where: {
                companyId: scope.companyId,
                periodId: scope.periodId,
                slug: { in: ["musteriler", "taseronlar", "tedarikciler"] },
                tenantId: scope.tenantId,
              },
            }),
            tx.purchaseInvoice.count({ where: scope }),
            tx.salesInvoice.count({ where: scope }),
            tx.progressPayment.count({ where: scope }),
            tx.ledgerEntry.count({ where: scope }),
            tx.cashBankMovement.count({ where: scope }),
          ]);

          const hasAllPartyTables = PRODUCTION_PARTY_TABLES.every((table) =>
            publicTableNames.includes(table),
          );
          const existingRoles = hasAllPartyTables
            ? toExistingRoles(await tx.partyRole.findMany({
                include: { party: true },
                orderBy: [{ kind: "asc" }, { normalizedCode: "asc" }],
                where: scope,
              }))
            : [];

          return {
            actorHasActiveAdminAccess: Boolean(adminAccess),
            companyExists: Boolean(company),
            existingRoles,
            financialCounts: {
              cashBankMovement,
              ledgerEntry,
              progressPayment,
              purchaseInvoice,
              salesInvoice,
            },
            legacyRecords,
            migrationTableExists,
            period,
            productionMigrationRecords: productionMigrationRecords.map((record) => ({
              finished: record.finished,
              migrationName: record.migration_name,
              rolledBack: record.rolled_back,
            })),
            publicTableNames,
            tenant,
            transactionReadOnly,
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

function toExistingRoles(rows: Array<{
  code: string;
  kind: string;
  legacyCode: string;
  legacySlug: string;
  normalizedCode: string;
  party: {
    displayName: string;
    email: string | null;
    normalizedName: string;
    normalizedTaxNumber: string | null;
    phone: string | null;
    status: string;
    taxNumber: string | null;
  };
  status: string;
}>): ExistingPartyRole[] {
  return rows.flatMap((row) => {
    if (!isPartyKind(row.kind) || !isPartySlug(row.legacySlug)) return [];
    return [{ ...row, kind: row.kind, legacySlug: row.legacySlug }];
  });
}

function isPartyKind(value: string): value is ExistingPartyRole["kind"] {
  return value === "customer" || value === "subcontractor" || value === "supplier";
}

function isPartySlug(value: string): value is ExistingPartyRole["legacySlug"] {
  return value === "musteriler" || value === "taseronlar" || value === "tedarikciler";
}
