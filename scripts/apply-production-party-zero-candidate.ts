import { asPartyBackfillApplyPrismaClient, createPartyBackfillApplyPrismaRepository } from
  "../src/lib/party-backfill-apply-prisma-repository";
import {
  readProductionPartyZeroApplyConfig,
  runProductionPartyZeroApply,
} from "../src/lib/production-party-transition";
import { prisma } from "../src/lib/prisma";

async function main() {
  const config = readProductionPartyZeroApplyConfig(process.env);
  const result = await runProductionPartyZeroApply({
    config,
    repository: createPartyBackfillApplyPrismaRepository(
      asPartyBackfillApplyPrismaClient(prisma),
    ),
  });
  console.log(JSON.stringify(result));
}

void main()
  .catch(() => {
    console.error("Party production zero-candidate apply fail-closed durdu.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
