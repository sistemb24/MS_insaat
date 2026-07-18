import type { EntityCrudRepository } from "./entity-crud-service";
import { coreEntitySlugs, getEntityDefinition } from "./entities";
import type { TenantScope } from "./tenant-scope";
import { createScopedEntityRows } from "./tenant-scope";

export type SeedDefaultEntityRecordsInput = {
  nowIso: string;
  repository: EntityCrudRepository;
  scope: TenantScope;
  slugs?: readonly string[];
};

export type SeedDefaultEntityRecordsResult = {
  seeded: string[];
  skipped: string[];
  totalRows: number;
};

export async function seedDefaultEntityRecords({
  nowIso,
  repository,
  scope,
  slugs = coreEntitySlugs,
}: SeedDefaultEntityRecordsInput): Promise<SeedDefaultEntityRecordsResult> {
  const result: SeedDefaultEntityRecordsResult = {
    seeded: [],
    skipped: [],
    totalRows: 0,
  };

  for (const slug of slugs) {
    const definition = getEntityDefinition(slug);

    if (!definition) {
      continue;
    }

    const existingRows = await repository.read({ definition, scope });

    if (existingRows.length > 0) {
      result.skipped.push(slug);
      continue;
    }

    const seededRows = createScopedEntityRows({
      definition,
      nowIso,
      scope,
    });

    await repository.replace({
      definition,
      rows: seededRows,
      scope,
    });

    result.seeded.push(slug);
    result.totalRows += seededRows.length;
  }

  return result;
}
