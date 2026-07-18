import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import type { EntityDefinition, EntityDraft, EntityRow } from "./entities";
import {
  createEntityDraft,
  createEditDraft,
  deactivateEntityRow,
  getEntityDefinition,
} from "./entities";
import {
  buildTenantScopeKey,
  createScopedEntityRows,
  filterRowsByTenantScope,
  saveScopedEntityDraft,
  stampRowWithTenantScope,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

export type EntityCrudRepository = {
  read(input: EntityRepositoryReadInput): Promise<EntityRow[]>;
  replace(input: EntityRepositoryReplaceInput): Promise<void>;
};

export type EntityRepositoryReadInput = {
  scope: TenantScope;
  definition: EntityDefinition;
};

export type EntityRepositoryReplaceInput = EntityRepositoryReadInput & {
  rows: EntityRow[];
};

export type EntityCrudService = {
  list(input: EntityListInput): Promise<EntityServiceResult<EntityListData>>;
  create(input: EntityCreateInput): Promise<EntityServiceResult<EntityRow>>;
  importMany(
    input: EntityImportManyInput,
  ): Promise<EntityServiceResult<EntityImportManyData>>;
  update(input: EntityUpdateInput): Promise<EntityServiceResult<EntityRow>>;
  deactivate(input: EntityDeactivateInput): Promise<EntityServiceResult<EntityRow>>;
};

export type EntityListInput = {
  scope: TenantScope;
  slug: string;
};

export type EntityCreateInput = EntityListInput & {
  values: EntityRow;
};

export type EntityImportManyInput = EntityListInput & {
  rows: EntityRow[];
};

export type EntityUpdateInput = EntityListInput & {
  code: string;
  values: EntityRow;
};

export type EntityDeactivateInput = EntityListInput & {
  code: string;
};

export type EntityListData = {
  definition: EntityDefinition;
  rows: EntityRow[];
  nextCode: string;
  scopeKey: string;
};

export type EntityImportManyData = {
  rows: EntityRow[];
  importedCount: number;
};

export type EntityServiceResult<T> =
  | {
      ok: true;
      data: T;
      errors?: never;
    }
  | {
      ok: false;
      errors: string[];
      data?: never;
    };

export type EntityCrudServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  repository: EntityCrudRepository;
  now: () => string;
};

export type SeededEntityMemoryRepositoryOptions = {
  seedIso: string;
};

export function createEntityCrudService({
  auditLogRepository,
  repository,
  now,
}: EntityCrudServiceOptions): EntityCrudService {
  async function resolveDefinitionAndRows({ scope, slug }: EntityListInput) {
    const scopeErrors = validateTenantScope(scope);

    if (scopeErrors.length > 0) {
      return { ok: false as const, errors: scopeErrors };
    }

    const definition = getEntityDefinition(slug);

    if (!definition) {
      return {
        ok: false as const,
        errors: [`Tanım modülü bulunamadı: ${slug}`],
      };
    }

    const rows = filterRowsByTenantScope(
      scope,
      await repository.read({ scope, definition }),
    );

    return { ok: true as const, definition, rows };
  }

  return {
    async list(input) {
      const resolved = await resolveDefinitionAndRows(input);

      if (!resolved.ok) {
        return resolved;
      }

      return {
        ok: true,
        data: {
          definition: resolved.definition,
          rows: resolved.rows,
          nextCode: createEntityDraft(resolved.definition, resolved.rows).values
            .code,
          scopeKey: buildTenantScopeKey(input.scope),
        },
      };
    },

    async create(input) {
      const resolved = await resolveDefinitionAndRows(input);

      if (!resolved.ok) {
        return resolved;
      }

      const draft = createCreateDraft(
        resolved.definition,
        resolved.rows,
        input.values,
      );
      const result = saveScopedEntityDraft({
        definition: resolved.definition,
        scope: input.scope,
        rows: resolved.rows,
        draft,
        nowIso: now(),
      });

      if (result.errors.length > 0) {
        return { ok: false, errors: result.errors };
      }

      await repository.replace({
        scope: input.scope,
        definition: resolved.definition,
        rows: result.rows,
      });
      const savedRow = requireRow(result.rows, draft.values.code);

      await recordEntityAudit(auditLogRepository, {
        action: "entity.create",
        definition: resolved.definition,
        occurredAt: savedRow.updatedAt,
        row: savedRow,
        scope: input.scope,
        statusTo: savedRow.status,
      });

      return {
        ok: true,
        data: savedRow,
      };
    },

    async importMany(input) {
      const resolved = await resolveDefinitionAndRows(input);

      if (!resolved.ok) {
        return resolved;
      }

      if (input.rows.length === 0) {
        return { ok: false, errors: ["İçe aktarılacak geçerli kayıt yok."] };
      }

      let nextRows = resolved.rows;
      const importedRows: EntityRow[] = [];
      const errors: string[] = [];

      for (const [index, values] of input.rows.entries()) {
        const draft = createCreateDraft(
          resolved.definition,
          nextRows,
          values,
        );
        const result = saveScopedEntityDraft({
          definition: resolved.definition,
          scope: input.scope,
          rows: nextRows,
          draft,
          nowIso: now(),
        });

        if (result.errors.length > 0) {
          errors.push(
            ...result.errors.map((error) => `${index + 1}. satır: ${error}`),
          );
          continue;
        }

        nextRows = result.rows;
        importedRows.push(requireRow(nextRows, draft.values.code));
      }

      if (errors.length > 0) {
        return { ok: false, errors };
      }

      await repository.replace({
        scope: input.scope,
        definition: resolved.definition,
        rows: nextRows,
      });

      for (const importedRow of importedRows) {
        await recordEntityAudit(auditLogRepository, {
          action: "entity.create",
          definition: resolved.definition,
          occurredAt: importedRow.updatedAt,
          row: importedRow,
          scope: input.scope,
          statusTo: importedRow.status,
        });
      }

      return {
        ok: true,
        data: {
          rows: importedRows,
          importedCount: importedRows.length,
        },
      };
    },
    async update(input) {
      const resolved = await resolveDefinitionAndRows(input);

      if (!resolved.ok) {
        return resolved;
      }

      const existingRow = resolved.rows.find((row) => row.code === input.code);

      if (!existingRow) {
        return { ok: false, errors: [`Kayıt bulunamadı: ${input.code}`] };
      }

      const draft: EntityDraft = {
        ...createEditDraft(existingRow),
        values: {
          ...existingRow,
          ...input.values,
          code: input.code,
          status: input.values.status ?? existingRow.status ?? "Aktif",
        },
      };
      const result = saveScopedEntityDraft({
        definition: resolved.definition,
        scope: input.scope,
        rows: resolved.rows,
        draft,
        nowIso: now(),
      });

      if (result.errors.length > 0) {
        return { ok: false, errors: result.errors };
      }

      await repository.replace({
        scope: input.scope,
        definition: resolved.definition,
        rows: result.rows,
      });
      const updatedRow = requireRow(result.rows, input.code);

      await recordEntityAudit(auditLogRepository, {
        action: "entity.update",
        definition: resolved.definition,
        occurredAt: updatedRow.updatedAt,
        row: updatedRow,
        scope: input.scope,
        statusFrom: existingRow.status,
        statusTo: updatedRow.status,
      });

      return {
        ok: true,
        data: updatedRow,
      };
    },

    async deactivate(input) {
      const resolved = await resolveDefinitionAndRows(input);

      if (!resolved.ok) {
        return resolved;
      }

      const existingRow = resolved.rows.find((row) => row.code === input.code);

      if (!existingRow) {
        return { ok: false, errors: [`Kayıt bulunamadı: ${input.code}`] };
      }

      const rows = deactivateEntityRow(resolved.rows, input.code).map((row) =>
        row.code === input.code
          ? stampRowWithTenantScope(input.scope, row, now())
          : row,
      );

      await repository.replace({
        scope: input.scope,
        definition: resolved.definition,
        rows,
      });
      const deactivatedRow = requireRow(rows, input.code);

      await recordEntityAudit(auditLogRepository, {
        action: "entity.delete",
        definition: resolved.definition,
        occurredAt: deactivatedRow.updatedAt,
        row: deactivatedRow,
        scope: input.scope,
        statusFrom: existingRow.status,
        statusTo: deactivatedRow.status,
      });

      return {
        ok: true,
        data: deactivatedRow,
      };
    },
  };
}

type EntityAuditInput = {
  action: "entity.create" | "entity.delete" | "entity.update";
  definition: EntityDefinition;
  occurredAt: string;
  row: EntityRow;
  scope: TenantScope;
  statusFrom?: string;
  statusTo?: string;
};

async function recordEntityAudit(
  auditLogRepository: AuditLogRepository | undefined,
  input: EntityAuditInput,
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(input.scope, {
      action: input.action,
      entityId: `${input.definition.slug}:${input.row.code}`,
      entityLabel: `${input.row.code} / ${input.row.name ?? ""}`.trim(),
      entityType: "entity-record",
      occurredAt: input.occurredAt,
      metadata: {
        code: input.row.code,
        name: input.row.name ?? "",
        slug: input.definition.slug,
        statusFrom: input.statusFrom,
        statusTo: input.statusTo,
      },
    }),
  );
}

export function createSeededEntityMemoryRepository({
  seedIso,
}: SeededEntityMemoryRepositoryOptions): EntityCrudRepository {
  const store = new Map<string, EntityRow[]>();

  return {
    async read({ scope, definition }) {
      const key = createStoreKey(scope, definition);

      if (!store.has(key)) {
        store.set(
          key,
          createScopedEntityRows({ definition, scope, nowIso: seedIso }),
        );
      }

      return store.get(key)!.map((row) => ({ ...row }));
    },

    async replace({ scope, definition, rows }) {
      store.set(
        createStoreKey(scope, definition),
        filterRowsByTenantScope(scope, rows).map((row) => ({ ...row })),
      );
    },
  };
}

function createCreateDraft(
  definition: EntityDefinition,
  rows: EntityRow[],
  values: EntityRow,
): EntityDraft {
  const draft = createEntityDraft(definition, rows);

  return {
    ...draft,
    values: {
      ...draft.values,
      ...values,
      code: values.code?.trim() || draft.values.code,
      status: values.status?.trim() || "Aktif",
    },
  };
}

function createStoreKey(scope: TenantScope, definition: EntityDefinition) {
  return `${buildTenantScopeKey(scope)}::${definition.slug}`;
}

function requireRow(rows: EntityRow[], code: string) {
  const row = rows.find((candidate) => candidate.code === code);

  if (!row) {
    throw new Error(`Kayıt bulunamadı: ${code}`);
  }

  return row;
}
