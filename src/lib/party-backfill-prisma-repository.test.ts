import { describe, expect, it, vi } from "vitest";

import { createPartyBackfillPrismaRepository } from "./party-backfill-prisma-repository";

describe("party backfill prisma repository", () => {
  it("reads only the three legacy slugs in the exact tenant scope", async () => {
    const entityRecord = { findMany: vi.fn().mockResolvedValue([]) };
    const partyRole = { findMany: vi.fn().mockResolvedValue([]) };
    const repository = createPartyBackfillPrismaRepository({
      entityRecord: entityRecord as never,
      partyRole: partyRole as never,
    });
    const scope = {
      companyId: "company-1",
      periodId: "period-1",
      tenantId: "tenant-1",
    };

    await repository.listLegacyRecords(scope);
    await repository.listExistingRoles(scope);

    expect(entityRecord.findMany).toHaveBeenCalledWith({
      orderBy: [{ slug: "asc" }, { code: "asc" }],
      where: {
        ...scope,
        slug: { in: ["musteriler", "taseronlar", "tedarikciler"] },
      },
    });
    expect(partyRole.findMany).toHaveBeenCalledWith({
      include: { party: true },
      orderBy: [{ kind: "asc" }, { normalizedCode: "asc" }],
      where: scope,
    });
  });

  it("drops unsupported persisted kinds instead of widening the contract", async () => {
    const partyRole = {
      findMany: vi.fn().mockResolvedValue([
        { kind: "customer", legacySlug: "musteriler" },
        { kind: "employee", legacySlug: "personel" },
      ]),
    };
    const repository = createPartyBackfillPrismaRepository({
      entityRecord: { findMany: vi.fn() } as never,
      partyRole: partyRole as never,
    });

    await expect(repository.listExistingRoles({
      companyId: "company-1",
      periodId: "period-1",
      tenantId: "tenant-1",
    })).resolves.toEqual([{ kind: "customer", legacySlug: "musteriler" }]);
  });
});
