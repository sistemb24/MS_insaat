import type {
  EntityCrudRepository,
  EntityRepositoryReadInput,
  EntityRepositoryReplaceInput,
} from "./entity-crud-service";
import type { EntityRow } from "./entities";

type EntityRecord = {
  tenantId: string;
  companyId: string;
  periodId: string;
  slug: string;
  code: string;
  data: unknown;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type EntityRecordWrite = Omit<EntityRecord, "data"> & {
  data: Record<string, string>;
};

type EntityRecordWhere = Pick<
  EntityRecord,
  "tenantId" | "companyId" | "periodId" | "slug"
>;

type EntityRecordClient = {
  findMany(input: {
    where: EntityRecordWhere;
    orderBy?: { code: "asc" | "desc" };
  }): Promise<EntityRecord[]>;
  deleteMany(input: { where: EntityRecordWhere }): Promise<unknown>;
  createMany(input: { data: EntityRecordWrite[] }): Promise<unknown>;
};

export type EntityPrismaClientLike = {
  entityRecord: EntityRecordClient;
};

export function createEntityPrismaRepository(
  prisma: EntityPrismaClientLike,
): EntityCrudRepository {
  return {
    async read({ scope, definition }: EntityRepositoryReadInput) {
      const records = await prisma.entityRecord.findMany({
        where: createWhere(scopeFields(scope, definition.slug)),
        orderBy: { code: "asc" },
      });

      return records.map(recordToRow);
    },

    async replace({
      scope,
      definition,
      rows,
    }: EntityRepositoryReplaceInput) {
      const where = createWhere(scopeFields(scope, definition.slug));

      await prisma.entityRecord.deleteMany({ where });

      if (rows.length === 0) {
        return;
      }

      await prisma.entityRecord.createMany({
        data: rows.map((row) =>
          rowToRecord(scopeFields(scope, definition.slug), row),
        ),
      });
    },
  };
}

function scopeFields(
  scope: EntityRepositoryReadInput["scope"],
  slug: string,
): EntityRecordWhere {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
    slug,
  };
}

function createWhere(fields: EntityRecordWhere) {
  return fields;
}

function recordToRow(record: EntityRecord): EntityRow {
  return {
    ...readJsonObject(record.data),
    code: record.code,
    tenantId: record.tenantId,
    companyId: record.companyId,
    periodId: record.periodId,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function rowToRecord(
  fields: EntityRecordWhere,
  row: EntityRow,
): EntityRecordWrite {
  return {
    ...fields,
    code: row.code,
    data: createPayload(row),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: parseDate(row.createdAt),
    updatedAt: parseDate(row.updatedAt),
  };
}

function createPayload(row: EntityRow) {
  const metadataKeys = new Set([
    "tenantId",
    "companyId",
    "periodId",
    "createdBy",
    "updatedBy",
    "createdAt",
    "updatedAt",
  ]);
  const payload: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    if (!metadataKeys.has(key)) {
      payload[key] = value;
    }
  }

  return payload;
}

function readJsonObject(value: unknown): EntityRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")]),
  );
}

function parseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}
