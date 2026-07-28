import { describe, expect, it, vi } from "vitest";

import { listSubscriptionOverview } from "./subscription-service";
import {
  calculatePercentile,
  countGlobalSearchRecords,
  decideGlobalSearchPerformance,
  measureGlobalSearchRepository,
} from "./global-search-performance";
import { defaultTenantScope } from "./tenant-scope";

describe("global search performance decision", () => {
  it("calculates nearest-rank percentiles deterministically", () => {
    expect(calculatePercentile([4, 1, 3, 2, 5], 0.5)).toBe(3);
    expect(calculatePercentile([4, 1, 3, 2, 5], 0.95)).toBe(5);
    expect(calculatePercentile([], 0.95)).toBe(0);
  });

  it("keeps the federated repository when both RFC thresholds pass", () => {
    expect(
      decideGlobalSearchPerformance({ p95Ms: 299.99, recordCount: 10_000 }),
    ).toEqual({
      p95Ms: 299.99,
      recordCount: 10_000,
      requiresProjectionRfc: false,
      reasons: [],
    });
  });

  it("requires a new RFC when either threshold is exceeded", () => {
    expect(
      decideGlobalSearchPerformance({ p95Ms: 301, recordCount: 10_001 }),
    ).toMatchObject({
      requiresProjectionRfc: true,
      reasons: [
        "Kayıt hacmi 10000 eşiğini aşıyor.",
        "p95 süre 300 ms eşiğini aşıyor.",
      ],
    });
  });

  it("counts every approved source inside the exact scope", async () => {
    const count = vi.fn().mockResolvedValueOnce(7).mockResolvedValue(1);
    const source = { count };
    const prisma = {
      entityRecord: source,
      purchaseInvoice: source,
      salesInvoice: source,
      cheque: source,
      tender: source,
      progressPayment: source,
      constructionProject: source,
      vehicle: source,
    };

    await expect(
      countGlobalSearchRecords(prisma as never, defaultTenantScope),
    ).resolves.toBe(14);
    expect(count).toHaveBeenCalledTimes(8);
    expect(count.mock.calls[0]?.[0]).toMatchObject({
      where: {
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        slug: { in: expect.arrayContaining(["santiyeler", "stok-kartlari"]) },
      },
    });
  });

  it("warms up separately and reports measured sample count", async () => {
    const search = vi.fn().mockResolvedValue({
      query: "fat",
      results: [],
      truncated: false,
    });

    const result = await measureGlobalSearchRepository({
      iterations: 3,
      queries: ["fat", "çek"],
      repository: { search },
      searchInput: {
        scope: defaultTenantScope,
        subscriptionOverview: listSubscriptionOverview(),
      },
      warmupIterations: 1,
    });

    expect(search).toHaveBeenCalledTimes(8);
    expect(result.sampleCount).toBe(6);
    expect(result.p95Ms).toBeGreaterThanOrEqual(0);
  });
});
