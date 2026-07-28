import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import {
  countGlobalSearchRecords,
  decideGlobalSearchPerformance,
  measureGlobalSearchRepository,
} from "../src/lib/global-search-performance";
import { createGlobalSearchPrismaRepository } from "../src/lib/global-search-prisma-repository";
import { listSubscriptionOverview } from "../src/lib/subscription-service";
import { companyScopes } from "../src/lib/tenant-scope";

const benchmarkQueries = [
  "FAT-0006",
  "212121321",
  "HAK-0001",
  "şantiye",
  "tedarikçi",
  "kamyon",
  "DEMO",
  "2026",
] as const;

async function main() {
  const repository = createGlobalSearchPrismaRepository(prisma);
  const scopes = [];

  for (const scope of companyScopes) {
    const recordCount = await countGlobalSearchRecords(prisma, scope);
    const timing = await measureGlobalSearchRepository({
      iterations: 10,
      queries: benchmarkQueries,
      repository,
      searchInput: {
        scope,
        subscriptionOverview: listSubscriptionOverview(),
        today: "2026-07-23",
      },
      warmupIterations: 3,
    });

    scopes.push({
      recordCount,
      scope: {
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
      },
      timing,
    });
  }

  const recordCount = Math.max(...scopes.map((scope) => scope.recordCount));
  const p95Ms = Math.max(...scopes.map((scope) => scope.timing.p95Ms));
  const decision = decideGlobalSearchPerformance({
    p95Ms,
    recordCount,
  });

  console.log(
    JSON.stringify(
      {
        decision,
        queries: benchmarkQueries,
        scopes,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Benchmark failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
