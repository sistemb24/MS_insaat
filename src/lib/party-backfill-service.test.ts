import { describe, expect, it, vi } from "vitest";

import { createPartyBackfillDryRunService } from "./party-backfill-service";

describe("party backfill dry-run service", () => {
  it("performs parallel read-only discovery and returns a plan", async () => {
    const repository = {
      listExistingRoles: vi.fn().mockResolvedValue([]),
      listLegacyRecords: vi.fn().mockResolvedValue([]),
    };
    const service = createPartyBackfillDryRunService({ repository });
    const scope = {
      companyId: "company-1",
      periodId: "period-1",
      tenantId: "tenant-1",
    };

    const plan = await service.preview({ scope });

    expect(repository.listExistingRoles).toHaveBeenCalledWith(scope);
    expect(repository.listLegacyRecords).toHaveBeenCalledWith(scope);
    expect(plan.run).toMatchObject({ candidateCount: 0, sourceCount: 0 });
  });
});
