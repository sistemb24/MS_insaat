import type {
  ExistingPartyRole,
  LegacyPartyRecord,
} from "./party-backfill";
import type { PartyKind, PartySlug } from "./party-read-model";
import type { TenantScope } from "./tenant-scope";

type PartyEntityRecordDelegate = {
  findMany(input: {
    orderBy: Array<{ slug?: "asc" } | { code?: "asc" }>;
    where: {
      companyId: string;
      periodId: string;
      slug: { in: PartySlug[] };
      tenantId: string;
    };
  }): Promise<LegacyPartyRecord[]>;
};

type PartyRoleRecord = Omit<ExistingPartyRole, "kind" | "legacySlug"> & {
  kind: string;
  legacySlug: string;
};

type PartyRoleDelegate = {
  findMany(input: {
    include: { party: true };
    orderBy: Array<{ kind?: "asc" } | { normalizedCode?: "asc" }>;
    where: Pick<TenantScope, "companyId" | "periodId" | "tenantId">;
  }): Promise<PartyRoleRecord[]>;
};

export type PartyBackfillPrismaClientLike = {
  entityRecord: PartyEntityRecordDelegate;
  partyRole: PartyRoleDelegate;
};

export type PartyBackfillReadRepository = {
  listExistingRoles(
    scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
  ): Promise<ExistingPartyRole[]>;
  listLegacyRecords(
    scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
  ): Promise<LegacyPartyRecord[]>;
};

const partySlugs: PartySlug[] = ["musteriler", "taseronlar", "tedarikciler"];

export function createPartyBackfillPrismaRepository(
  prisma: PartyBackfillPrismaClientLike,
): PartyBackfillReadRepository {
  return {
    async listExistingRoles(scope) {
      const rows = await prisma.partyRole.findMany({
        include: { party: true },
        orderBy: [{ kind: "asc" }, { normalizedCode: "asc" }],
        where: scopeFields(scope),
      });
      return rows.flatMap((row) => {
        if (!isPartyKind(row.kind) || !isPartySlug(row.legacySlug)) return [];
        return [{ ...row, kind: row.kind, legacySlug: row.legacySlug }];
      });
    },
    async listLegacyRecords(scope) {
      return prisma.entityRecord.findMany({
        orderBy: [{ slug: "asc" }, { code: "asc" }],
        where: {
          ...scopeFields(scope),
          slug: { in: partySlugs },
        },
      });
    },
  };
}

function scopeFields(
  scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
) {
  return {
    companyId: scope.companyId,
    periodId: scope.periodId,
    tenantId: scope.tenantId,
  };
}

function isPartyKind(value: string): value is PartyKind {
  return value === "customer" || value === "subcontractor" || value === "supplier";
}

function isPartySlug(value: string): value is PartySlug {
  return value === "musteriler" || value === "taseronlar" || value === "tedarikciler";
}
