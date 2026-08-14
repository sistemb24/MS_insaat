import { Prisma } from "@prisma/client";

import type { PartyParitySnapshotPrismaClient } from
  "./party-parity-snapshot-prisma";
import { readPartyParitySnapshotFromClient } from
  "./party-parity-snapshot-prisma";
import type { ProductionPartyCutoverPostflightRepository } from
  "./production-party-cutover-postflight";

type TransactionClient = PartyParitySnapshotPrismaClient & {
  $queryRaw<T = unknown>(query: unknown): Promise<T>;
  auditLog: {
    findMany(input: unknown): Promise<Array<{
      action: string;
      actorUserId: string | null;
      entityId: string;
      metadata: unknown;
    }>>;
  };
  partyCutoverEvent: {
    findMany(input: unknown): Promise<Array<{
      action: string;
      actorUserId: string;
      fromMode: string;
      issueChecksum: string;
      legacyChecksum: string;
      legacyCount: number;
      matchedCount: number;
      operationId: string;
      parityChecksum: string;
      partyChecksum: string;
      partyCount: number;
      reasonCode: string;
      releaseId: string;
      roleCount: number;
      stateId: string;
      stateRevisionNo: number;
      toMode: string;
    }>>;
  };
  partyCutoverState: {
    findMany(input: unknown): Promise<Array<{
      createdBy: string;
      id: string;
      issueChecksum: string;
      legacyChecksum: string;
      legacyCount: number;
      matchedCount: number;
      mode: string;
      parityChecksum: string;
      partyChecksum: string;
      partyCount: number;
      releaseId: string;
      revisionNo: number;
      roleCount: number;
      updatedBy: string;
    }>>;
  };
};

export type ProductionPartyCutoverPostflightPrismaClientLike = {
  $transaction<T>(
    callback: (transaction: TransactionClient) => Promise<T>,
    options: {
      isolationLevel: "RepeatableRead";
      maxWait: number;
      timeout: number;
    },
  ): Promise<T>;
};

export function createProductionPartyCutoverPostflightPrismaRepository(
  prisma: ProductionPartyCutoverPostflightPrismaClientLike,
): ProductionPartyCutoverPostflightRepository {
  return {
    readExactState({ scope }) {
      return prisma.$transaction(async (transaction) => {
        const readOnlyRows = await transaction.$queryRaw<Array<{
          read_only: string;
        }>>(Prisma.sql`
          SELECT current_setting('transaction_read_only')::text AS read_only
        `);
        const transactionReadOnly =
          readOnlyRows.length === 1 && readOnlyRows[0]?.read_only === "on";
        if (!transactionReadOnly) {
          throw new Error("Party cutover postflight transaction salt-okunur değil.");
        }
        const states = await transaction.partyCutoverState.findMany({
          orderBy: { id: "asc" },
          select: {
            createdBy: true,
            id: true,
            issueChecksum: true,
            legacyChecksum: true,
            legacyCount: true,
            matchedCount: true,
            mode: true,
            parityChecksum: true,
            partyChecksum: true,
            partyCount: true,
            releaseId: true,
            revisionNo: true,
            roleCount: true,
            updatedBy: true,
          },
          where: scope,
        });
        const events = await transaction.partyCutoverEvent.findMany({
          orderBy: { stateRevisionNo: "asc" },
          select: {
            action: true,
            actorUserId: true,
            fromMode: true,
            issueChecksum: true,
            legacyChecksum: true,
            legacyCount: true,
            matchedCount: true,
            operationId: true,
            parityChecksum: true,
            partyChecksum: true,
            partyCount: true,
            reasonCode: true,
            releaseId: true,
            roleCount: true,
            stateId: true,
            stateRevisionNo: true,
            toMode: true,
          },
          where: scope,
        });
        const audits = await transaction.auditLog.findMany({
          orderBy: { occurredAt: "asc" },
          select: {
            action: true,
            actorUserId: true,
            entityId: true,
            metadata: true,
          },
          where: {
            ...scope,
            action: {
              in: [
                "party-cutover.legacy-restored",
                "party-cutover.shadow-activated",
              ],
            },
            entityId: states[0]?.id ?? "__missing_party_cutover_state__",
            entityType: "party-cutover-state",
          },
        });
        return {
          audits,
          events,
          paritySnapshot: await readPartyParitySnapshotFromClient(
            transaction,
            scope,
          ),
          state: states[0] ?? null,
          stateCount: states.length,
          transactionReadOnly,
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: 10_000,
        timeout: 30_000,
      });
    },
  };
}

export function asProductionPartyCutoverPostflightPrismaClient(
  prisma: unknown,
): ProductionPartyCutoverPostflightPrismaClientLike {
  return prisma as ProductionPartyCutoverPostflightPrismaClientLike;
}
