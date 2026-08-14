import {
  buildPartyBackfillPlan,
  PARTY_BACKFILL_VERSION,
  type PartyBackfillPlan,
} from "./party-backfill";
import type { PartyBackfillReadRepository } from "./party-backfill-prisma-repository";
import type { TenantScope } from "./tenant-scope";

export type PartyBackfillDryRunService = {
  preview(input: {
    scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">;
    version?: string;
  }): Promise<PartyBackfillPlan>;
};

export function createPartyBackfillDryRunService({
  repository,
}: {
  repository: PartyBackfillReadRepository;
}): PartyBackfillDryRunService {
  return {
    async preview({ scope, version = PARTY_BACKFILL_VERSION }) {
      const [existingRoles, records] = await Promise.all([
        repository.listExistingRoles(scope),
        repository.listLegacyRecords(scope),
      ]);
      return buildPartyBackfillPlan({ existingRoles, records, scope, version });
    },
  };
}
