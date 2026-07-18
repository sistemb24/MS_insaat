import { describe, expect, it } from "vitest";

import {
  createSeededEntityMemoryRepository,
  type EntityCrudRepository,
} from "./entity-crud-service";
import { getEntityDefinition } from "./entities";
import { seedDefaultEntityRecords } from "./entity-seed";
import { defaultTenantScope } from "./tenant-scope";

describe("default entity seed workflow", () => {
  it("seeds all core definition modules when the scoped repository is empty", async () => {
    const repository = createEmptyMemoryRepository();

    const result = await seedDefaultEntityRecords({
      nowIso: "2026-06-25T12:00:00.000Z",
      repository,
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      seeded: [
        "santiyeler",
        "tedarikciler",
        "taseronlar",
        "personel",
        "kasa-banka",
        "stok-kartlari",
      ],
      skipped: [],
      totalRows: 30,
    });

    const sites = await repository.read({
      definition: getEntityDefinition("santiyeler")!,
      scope: defaultTenantScope,
    });

    expect(sites).toEqual([
      expect.objectContaining({
        code: "SANT-0001",
        tenantId: "tenant-noa-demo",
        createdAt: "2026-06-25T12:00:00.000Z",
      }),
      expect.objectContaining({ code: "SANT-0002" }),
      expect.objectContaining({ code: "SANT-0003" }),
      expect.objectContaining({ code: "SANT-0004" }),
      expect.objectContaining({ code: "SANT-0005" }),
    ]);
  });

  it("does not overwrite modules that already have records", async () => {
    const repository = createSeededEntityMemoryRepository({
      seedIso: "2026-06-24T00:00:00.000Z",
    });

    const result = await seedDefaultEntityRecords({
      nowIso: "2026-06-25T12:00:00.000Z",
      repository,
      scope: defaultTenantScope,
      slugs: ["tedarikciler"],
    });

    expect(result).toEqual({
      seeded: [],
      skipped: ["tedarikciler"],
      totalRows: 0,
    });
  });
});

function createEmptyMemoryRepository(): EntityCrudRepository {
  const store = new Map<string, Record<string, string>[]>();

  return {
    async read({ definition, scope }) {
      return [
        ...(store.get(
          `${scope.tenantId}::${scope.companyId}::${scope.periodId}::${definition.slug}`,
        ) ?? []),
      ];
    },
    async replace({ definition, rows, scope }) {
      store.set(
        `${scope.tenantId}::${scope.companyId}::${scope.periodId}::${definition.slug}`,
        rows.map((row) => ({ ...row })),
      );
    },
  };
}
