import type { GlobalSearchPrismaClientLike } from "./global-search-prisma-repository";
import {
  GLOBAL_SEARCH_ENTITY_SLUGS,
  type GlobalSearchRepository,
  type GlobalSearchRepositoryInput,
} from "./global-search-prisma-repository";
import type { TenantScope } from "./tenant-scope";

export const GLOBAL_SEARCH_RECORD_THRESHOLD = 10_000;
export const GLOBAL_SEARCH_P95_THRESHOLD_MS = 300;

export type GlobalSearchPerformanceDecision = {
  p95Ms: number;
  recordCount: number;
  requiresProjectionRfc: boolean;
  reasons: string[];
};

export async function countGlobalSearchRecords(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
) {
  const where = {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
  };
  const counts = await Promise.all([
    prisma.entityRecord.count({
      where: { ...where, slug: { in: [...GLOBAL_SEARCH_ENTITY_SLUGS] } },
    }),
    prisma.purchaseInvoice.count({ where }),
    prisma.salesInvoice.count({ where }),
    prisma.cheque.count({ where }),
    prisma.tender.count({ where }),
    prisma.progressPayment.count({ where }),
    prisma.constructionProject.count({ where }),
    prisma.vehicle.count({ where }),
  ]);

  return counts.reduce((total, count) => total + count, 0);
}

export function calculatePercentile(
  samples: readonly number[],
  percentile: number,
) {
  if (samples.length === 0) {
    return 0;
  }

  const boundedPercentile = Math.min(1, Math.max(0, percentile));
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * boundedPercentile) - 1);

  return sorted[index] ?? 0;
}

export function decideGlobalSearchPerformance(input: {
  p95Ms: number;
  recordCount: number;
}): GlobalSearchPerformanceDecision {
  const reasons: string[] = [];

  if (input.recordCount > GLOBAL_SEARCH_RECORD_THRESHOLD) {
    reasons.push(
      `Kayıt hacmi ${GLOBAL_SEARCH_RECORD_THRESHOLD} eşiğini aşıyor.`,
    );
  }

  if (input.p95Ms > GLOBAL_SEARCH_P95_THRESHOLD_MS) {
    reasons.push(
      `p95 süre ${GLOBAL_SEARCH_P95_THRESHOLD_MS} ms eşiğini aşıyor.`,
    );
  }

  return {
    p95Ms: roundMilliseconds(input.p95Ms),
    recordCount: input.recordCount,
    requiresProjectionRfc: reasons.length > 0,
    reasons,
  };
}

export async function measureGlobalSearchRepository(input: {
  iterations: number;
  queries: readonly string[];
  repository: GlobalSearchRepository;
  searchInput: Omit<GlobalSearchRepositoryInput, "query">;
  warmupIterations?: number;
}) {
  const iterations = Math.max(1, Math.floor(input.iterations));
  const queries = input.queries.filter((query) => query.trim().length >= 2);
  const warmupIterations = Math.max(
    0,
    Math.floor(input.warmupIterations ?? 2),
  );

  if (queries.length === 0) {
    throw new Error("GLOBAL_SEARCH_BENCHMARK_QUERY_REQUIRED");
  }

  for (let cycle = 0; cycle < warmupIterations; cycle += 1) {
    for (const query of queries) {
      await input.repository.search({ ...input.searchInput, query });
    }
  }

  const samples: number[] = [];

  for (let cycle = 0; cycle < iterations; cycle += 1) {
    for (const query of queries) {
      const startedAt = performance.now();
      await input.repository.search({ ...input.searchInput, query });
      samples.push(performance.now() - startedAt);
    }
  }

  return {
    maxMs: roundMilliseconds(Math.max(...samples)),
    medianMs: roundMilliseconds(calculatePercentile(samples, 0.5)),
    p95Ms: roundMilliseconds(calculatePercentile(samples, 0.95)),
    sampleCount: samples.length,
  };
}

function roundMilliseconds(value: number) {
  return Math.round(value * 100) / 100;
}
