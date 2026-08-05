import {
  normalizeAnnouncementCategory,
  normalizeAnnouncementPriority,
  normalizeAnnouncementStatus,
  type AnnouncementCategory,
  type AnnouncementPriority,
  type AnnouncementStatus,
  type AnnouncementVisibility,
} from "./announcement";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type ScopeFields = { companyId: string; periodId: string; tenantId: string };
type AnnouncementWhere = ScopeFields & {
  announcementKey?: string;
  id?: string;
  revisionNo?: number;
  status?: string;
};
type AnnouncementDelegate<T> = {
  create(input: { data: unknown }): Promise<T>;
  findFirst(input: { where: AnnouncementWhere }): Promise<T | null>;
  findMany(input: { orderBy: unknown; where: AnnouncementWhere }): Promise<T[]>;
  updateMany(input: { data: unknown; where: AnnouncementWhere }): Promise<{ count: number }>;
};

export type AnnouncementRow = ScopeFields & {
  announcementKey: string;
  archiveRequestKey: string | null;
  archivedAt: string | null;
  category: AnnouncementCategory;
  content: string;
  createdAt: string;
  createdBy: string;
  id: string;
  lastUpdateKey: string | null;
  priority: AnnouncementPriority;
  publishRequestKey: string | null;
  publishedAt: string | null;
  revisionNo: number;
  status: AnnouncementStatus;
  summary: string;
  title: string;
  updatedAt: string;
  updatedBy: string;
};

type AnnouncementRecord = Omit<
  AnnouncementRow,
  "archivedAt" | "category" | "createdAt" | "priority" | "publishedAt" | "status" | "updatedAt"
> & {
  archivedAt: DateLike | null;
  category: string;
  createdAt: DateLike;
  priority: string;
  publishedAt: DateLike | null;
  status: string;
  updatedAt: DateLike;
};

export type AnnouncementPrismaClientLike = {
  announcement: AnnouncementDelegate<AnnouncementRecord>;
};

export type AnnouncementRepository = {
  create(row: AnnouncementRow): Promise<AnnouncementRow>;
  findByCreateKey(input: {
    announcementKey: string;
    scope: TenantScope;
    visibility: AnnouncementVisibility;
  }): Promise<AnnouncementRow | null>;
  findById(input: {
    id: string;
    scope: TenantScope;
    visibility: AnnouncementVisibility;
  }): Promise<AnnouncementRow | null>;
  list(input: {
    scope: TenantScope;
    visibility: AnnouncementVisibility;
  }): Promise<AnnouncementRow[]>;
  transition(input: {
    expectedRevisionNo: number;
    fromStatus: AnnouncementStatus;
    row: AnnouncementRow;
  }): Promise<AnnouncementRow>;
  updateDraft(input: {
    expectedRevisionNo: number;
    row: AnnouncementRow;
  }): Promise<AnnouncementRow>;
};

export class AnnouncementRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnnouncementRepositoryError";
  }
}

export function createAnnouncementPrismaRepository(
  prisma: AnnouncementPrismaClientLike,
): AnnouncementRepository {
  return {
    async create(row) {
      return fromRecord(await prisma.announcement.create({ data: rowData(row) }));
    },
    async findByCreateKey({ announcementKey, scope, visibility }) {
      const record = await prisma.announcement.findFirst({
        where: scopedWhere({ announcementKey, scope, visibility }),
      });
      return record ? fromRecord(record) : null;
    },
    async findById({ id, scope, visibility }) {
      const record = await prisma.announcement.findFirst({
        where: scopedWhere({ id, scope, visibility }),
      });
      return record ? fromRecord(record) : null;
    },
    async list({ scope, visibility }) {
      const records = await prisma.announcement.findMany({
        orderBy: [
          { publishedAt: { nulls: "last", sort: "desc" } },
          { updatedAt: "desc" },
          { id: "asc" },
        ],
        where: scopedWhere({ scope, visibility }),
      });
      return records.map(fromRecord);
    },
    async transition({ expectedRevisionNo, fromStatus, row }) {
      return updateScoped(prisma, {
        data: transitionData(row),
        expectedRevisionNo,
        fromStatus,
        row,
      });
    },
    async updateDraft({ expectedRevisionNo, row }) {
      return updateScoped(prisma, {
        data: draftUpdateData(row),
        expectedRevisionNo,
        fromStatus: "DRAFT",
        row,
      });
    },
  };
}

async function updateScoped(
  prisma: AnnouncementPrismaClientLike,
  input: {
    data: unknown;
    expectedRevisionNo: number;
    fromStatus: AnnouncementStatus;
    row: AnnouncementRow;
  },
) {
  const where = {
    ...scopeFields(input.row),
    id: input.row.id,
    revisionNo: input.expectedRevisionNo,
    status: input.fromStatus,
  };
  const result = await prisma.announcement.updateMany({ data: input.data, where });
  if (result.count !== 1) {
    throw new AnnouncementRepositoryError(
      "Duyuru aktif kapsamda, beklenen durumda veya revizyonda bulunamadı.",
    );
  }
  const updated = await prisma.announcement.findFirst({
    where: { ...scopeFields(input.row), id: input.row.id },
  });
  if (!updated) {
    throw new AnnouncementRepositoryError(
      "Güncellenen duyuru aktif kapsamda yeniden okunamadı.",
    );
  }
  return fromRecord(updated);
}

function scopedWhere(input: {
  announcementKey?: string;
  id?: string;
  scope: TenantScope;
  visibility: AnnouncementVisibility;
}): AnnouncementWhere {
  return {
    ...scopeFields(input.scope),
    ...(input.announcementKey ? { announcementKey: input.announcementKey } : {}),
    ...(input.id ? { id: input.id } : {}),
    ...(input.visibility.mode === "published" ? { status: "PUBLISHED" } : {}),
  };
}

function rowData(row: AnnouncementRow) {
  return {
    ...scopeFields(row),
    announcementKey: row.announcementKey,
    archiveRequestKey: row.archiveRequestKey,
    archivedAt: nullableDate(row.archivedAt),
    category: row.category,
    content: row.content,
    createdAt: dateTime(row.createdAt),
    createdBy: row.createdBy,
    id: row.id,
    lastUpdateKey: row.lastUpdateKey,
    priority: row.priority,
    publishRequestKey: row.publishRequestKey,
    publishedAt: nullableDate(row.publishedAt),
    revisionNo: row.revisionNo,
    status: row.status,
    summary: row.summary,
    title: row.title,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function draftUpdateData(row: AnnouncementRow) {
  return {
    category: row.category,
    content: row.content,
    lastUpdateKey: row.lastUpdateKey,
    priority: row.priority,
    revisionNo: row.revisionNo,
    summary: row.summary,
    title: row.title,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function transitionData(row: AnnouncementRow) {
  return {
    archiveRequestKey: row.archiveRequestKey,
    archivedAt: nullableDate(row.archivedAt),
    publishRequestKey: row.publishRequestKey,
    publishedAt: nullableDate(row.publishedAt),
    revisionNo: row.revisionNo,
    status: row.status,
    updatedAt: dateTime(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}

function fromRecord(row: AnnouncementRecord): AnnouncementRow {
  return {
    ...row,
    archivedAt: nullableIso(row.archivedAt),
    category: normalizeAnnouncementCategory(row.category),
    createdAt: iso(row.createdAt),
    priority: normalizeAnnouncementPriority(row.priority),
    publishedAt: nullableIso(row.publishedAt),
    status: normalizeAnnouncementStatus(row.status),
    updatedAt: iso(row.updatedAt),
  };
}

function scopeFields(scope: ScopeFields) {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}
function dateTime(value: string) { return new Date(value); }
function nullableDate(value: string | null) { return value ? new Date(value) : null; }
function iso(value: DateLike) { return (typeof value === "string" ? new Date(value) : value).toISOString(); }
function nullableIso(value: DateLike | null) { return value ? iso(value) : null; }
