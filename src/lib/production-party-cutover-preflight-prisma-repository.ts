import { Prisma, type PrismaClient } from "@prisma/client";

import type { ProductionPartyCutoverPreflightRepository } from
  "./production-party-cutover-preflight";
import { readPartyParitySnapshotFromClient } from "./party-parity-snapshot-prisma";

type PrismaLike = Pick<PrismaClient, "$transaction">;

export function createProductionPartyCutoverPreflightPrismaRepository(
  prisma: PrismaLike,
): ProductionPartyCutoverPreflightRepository {
  return {
    async readScope({ actorUserId, scope }) {
      return prisma.$transaction(
        async (tx) => {
          const readOnlyRows = await tx.$queryRaw<Array<{ read_only: string }>>(
            Prisma.sql`
              SELECT current_setting('transaction_read_only')::text AS read_only
            `,
          );
          const transactionReadOnly = readOnlyRows.length === 1
            && readOnlyRows[0]?.read_only === "on";
          if (!transactionReadOnly) {
            throw new Error("Party cutover production transaction salt-okunur değil.");
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

          const tenant = await tx.tenant.findUnique({
            select: { lifecycleStatus: true },
            where: { id: scope.tenantId },
          });
          const company = await tx.company.findFirst({
            select: { id: true },
            where: { id: scope.companyId, tenantId: scope.tenantId },
          });
          const period = await tx.period.findFirst({
            select: { isClosed: true },
            where: {
              companyId: scope.companyId,
              id: scope.periodId,
              tenantId: scope.tenantId,
            },
          });
          const adminAccess = await tx.appUserScopeAccess.findFirst({
            select: { id: true },
            where: {
              ...scope,
              isActive: true,
              role: "admin",
              userId: actorUserId,
            },
          });
          const paritySnapshot = await readPartyParitySnapshotFromClient(tx, scope);
          const backfillRuns = await tx.partyBackfillRun.findMany({
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              candidateCount: true,
              issueCount: true,
              sourceChecksum: true,
              sourceCount: true,
              status: true,
              version: true,
            },
            where: scope,
          });
          const backfillIssueCount = await tx.partyBackfillIssue.count({ where: scope });
          const backfillAuditCount = await tx.auditLog.count({
            where: {
              ...scope,
              action: "party.backfill.verified",
              actorUserId,
              entityType: "party-backfill-run",
            },
          });
          const purchaseInvoice = await tx.purchaseInvoice.count({ where: scope });
          const salesInvoice = await tx.salesInvoice.count({ where: scope });
          const progressPayment = await tx.progressPayment.count({ where: scope });
          const ledgerEntry = await tx.ledgerEntry.count({ where: scope });
          const cashBankMovement = await tx.cashBankMovement.count({ where: scope });

          const hasCutoverTables = ["PartyCutoverEvent", "PartyCutoverState"]
            .every((table) => publicTableNames.includes(table));
          let cutoverStateCount = 0;
          let cutoverEventCount = 0;
          let cutoverAuditCount = 0;
          let cutoverState: {
            mode: string;
            parityChecksum: string;
            revisionNo: number;
          } | null = null;
          if (hasCutoverTables) {
            cutoverStateCount = await tx.partyCutoverState.count({ where: scope });
            cutoverEventCount = await tx.partyCutoverEvent.count({ where: scope });
            cutoverAuditCount = await tx.auditLog.count({
              where: { ...scope, entityType: "party-cutover-state" },
            });
            cutoverState = await tx.partyCutoverState.findFirst({
              select: { mode: true, parityChecksum: true, revisionNo: true },
              where: scope,
            });
          }

          return {
            actorHasActiveAdminAccess: Boolean(adminAccess),
            backfillAuditCount,
            backfillIssueCount,
            backfillRuns,
            companyExists: Boolean(company),
            cutoverAuditCount,
            cutoverEventCount,
            cutoverState,
            cutoverStateCount,
            financialCounts: {
              cashBankMovement,
              ledgerEntry,
              progressPayment,
              purchaseInvoice,
              salesInvoice,
            },
            migrationTableExists,
            paritySnapshot,
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
