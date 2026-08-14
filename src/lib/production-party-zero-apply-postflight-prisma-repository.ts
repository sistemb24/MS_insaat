import { Prisma, type PrismaClient } from "@prisma/client";

import type { ProductionPartyZeroApplyPostflightRepository } from
  "./production-party-zero-apply-postflight";

type PrismaLike = Pick<PrismaClient, "$transaction">;

export function createProductionPartyZeroApplyPostflightPrismaRepository(
  prisma: PrismaLike,
): ProductionPartyZeroApplyPostflightRepository {
  return {
    async readExactState({ actorUserId, runId, scope }) {
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
            throw new Error("Party production postflight DB transaction salt-okunur değil.");
          }

          const runCount = await tx.partyBackfillRun.count({ where: scope });
          const run = await tx.partyBackfillRun.findFirst({
            select: {
              candidateCount: true,
              issueCount: true,
              sourceChecksum: true,
              sourceCount: true,
              status: true,
              version: true,
            },
            where: { ...scope, id: runId },
          });
          const partyCount = await tx.party.count({ where: scope });
          const roleCount = await tx.partyRole.count({ where: scope });
          const issueCount = await tx.partyBackfillIssue.count({ where: scope });
          const auditCount = await tx.auditLog.count({
            where: {
              ...scope,
              action: "party.backfill.verified",
              actorUserId,
              entityId: runId,
              entityType: "party-backfill-run",
            },
          });
          const purchaseInvoice = await tx.purchaseInvoice.count({ where: scope });
          const salesInvoice = await tx.salesInvoice.count({ where: scope });
          const progressPayment = await tx.progressPayment.count({ where: scope });
          const ledgerEntry = await tx.ledgerEntry.count({ where: scope });
          const cashBankMovement = await tx.cashBankMovement.count({ where: scope });

          return {
            auditCount,
            financialCounts: {
              cashBankMovement,
              ledgerEntry,
              progressPayment,
              purchaseInvoice,
              salesInvoice,
            },
            issueCount,
            partyCount,
            roleCount,
            run,
            runCount,
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
