import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  PartyParityReadRepository,
} from "./party-parity-read-model";
import { readPartyParitySnapshotFromClient } from "./party-parity-snapshot-prisma";

type PartyParityPrismaClientLike = Pick<PrismaClient, "$transaction">;

export function createPartyParityPrismaRepository(
  prisma: PartyParityPrismaClientLike,
): PartyParityReadRepository {
  return {
    async readScope({ scope }) {
      return prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw(Prisma.sql`SET TRANSACTION READ ONLY`);
          const mode = await tx.$queryRaw<Array<{ read_only: string }>>(
            Prisma.sql`
              SELECT current_setting('transaction_read_only')::text AS read_only
            `,
          );
          if (mode.length !== 1 || mode[0]?.read_only !== "on") {
            throw new Error("Party parity transaction salt-okunur moda alınamadı.");
          }

          return readPartyParitySnapshotFromClient(tx, scope);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          maxWait: 10_000,
          timeout: 30_000,
        },
      );
    },
  };
}
