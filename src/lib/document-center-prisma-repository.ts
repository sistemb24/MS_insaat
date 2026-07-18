import type {
  DocumentCenterRepository,
  DocumentFileKind,
  DocumentFileRow,
  DocumentFolderColor,
  DocumentFolderRow,
} from "./document-center-service";
import type { TenantScope } from "./tenant-scope";

type DocumentFolderRecord = {
  accessLevel: string;
  canDelete: boolean;
  canRename: boolean;
  color: string;
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  fileCount: number;
  files?: false | unknown[];
  id: string;
  isStarred: boolean;
  isSystem: boolean;
  name: string;
  periodId: string;
  purpose: string;
  sizeBytes: bigint | number | string;
  systemKey?: string | null;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
};

type DocumentFileRecord = {
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  deletedAt?: Date | string | null;
  extension: string;
  fileType: string;
  folderId: string;
  id: string;
  lastModified: Date | string;
  linkedModule?: string | null;
  linkedRecordId?: string | null;
  linkedRecordLabel?: string | null;
  mimeType: string;
  name: string;
  periodId: string;
  sizeBytes: bigint | number | string;
  storageKey: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
};

type DocumentFolderClient = {
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
      deletedAt: null;
    };
    orderBy: Array<{ isSystem: "asc" | "desc" } | { createdAt: "asc" | "desc" }>;
    include: { files: false };
  }): Promise<DocumentFolderRecord[]>;
  update(input: {
    where: { id: string };
    data: {
      fileCount: { increment: number };
      sizeBytes: { increment: bigint };
      updatedAt: Date;
      updatedBy: string;
    };
  }): Promise<DocumentFolderRecord>;
  upsert(input: {
    where: { id: string };
    create: ReturnType<typeof folderRowToCreateData>;
    update: ReturnType<typeof folderRowToUpdateData>;
  }): Promise<DocumentFolderRecord>;
  deleteMany?: (input: { where: { id: string; tenantId: string; companyId: string; periodId: string; isSystem: false } }) => Promise<{ count: number }>;
};

type DocumentFileDeletedAtWhere = null | { lt: Date } | { not: null };

type DocumentFileClient = {
  create(input: {
    data: ReturnType<typeof fileRowToCreateData>;
  }): Promise<DocumentFileRecord>;
  findFirst?: (input: {
    where: {
      id: string;
      tenantId: string;
      companyId: string;
      periodId: string;
    };
  }) => Promise<DocumentFileRecord | null>;
  findMany(input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
      deletedAt: DocumentFileDeletedAtWhere;
    };
    orderBy: Array<
      | { createdAt: "asc" | "desc" }
      | { deletedAt: "asc" | "desc" }
      | { updatedAt: "asc" | "desc" }
    >;
  }): Promise<DocumentFileRecord[]>;
  deleteMany?: (input: {
    where: {
      tenantId: string;
      companyId: string;
      periodId: string;
      deletedAt: DocumentFileDeletedAtWhere;
    };
  }) => Promise<{ count: number }>;
  updateMany?: (input: {
    where: {
      id: string;
      tenantId: string;
      companyId: string;
      periodId: string;
      deletedAt: DocumentFileDeletedAtWhere;
    };
    data: {
      deletedAt?: Date | null;
      name?: string;
      updatedAt: Date;
      updatedBy: string;
    };
  }) => Promise<{ count: number }>;
};

export type DocumentCenterPrismaClientLike = {
  documentFile: DocumentFileClient;
  documentFolder: DocumentFolderClient;
};

export function createDocumentCenterPrismaRepository(
  prisma: DocumentCenterPrismaClientLike,
): DocumentCenterRepository {
  return {
    async createFile(row) {
      const created = await prisma.documentFile.create({
        data: fileRowToCreateData(row),
      });

      return fileRecordToRow(created);
    },

    async incrementFolderUsage({
      fileSizeBytes,
      folderId,
      scope,
      updatedAt,
      updatedBy,
    }) {
      const updated = await prisma.documentFolder.update({
        where: { id: folderId },
        data: {
          fileCount: { increment: 1 },
          sizeBytes: { increment: BigInt(fileSizeBytes) },
          updatedAt: new Date(updatedAt),
          updatedBy,
        },
      });

      return folderRecordToRow(updated, scope);
    },

    async listFiles({ scope }) {
      const rows = await prisma.documentFile.findMany({
        where: activeScopeWhere(scope),
        orderBy: [{ createdAt: "desc" }],
      });

      return rows.map(fileRecordToRow);
    },

    async listTrashedFiles({ scope }) {
      const rows = await prisma.documentFile.findMany({
        where: trashedScopeWhere(scope),
        orderBy: [{ updatedAt: "desc" }],
      });

      return rows.map(fileRecordToRow);
    },

    async moveFileToTrash({ deletedAt, fileId, scope, updatedAt, updatedBy }) {
      if (!prisma.documentFile.updateMany || !prisma.documentFile.findFirst) {
        throw new Error("DocumentFile soft delete repository method is not available.");
      }

      const updated = await prisma.documentFile.updateMany({
        where: {
          ...activeScopeWhere(scope),
          id: fileId,
        },
        data: {
          deletedAt: new Date(deletedAt),
          updatedAt: new Date(updatedAt),
          updatedBy,
        },
      });

      if (updated.count === 0) {
        return undefined;
      }

      const row = await prisma.documentFile.findFirst({
        where: {
          ...baseScopeWhere(scope),
          id: fileId,
        },
      });

      return row ? fileRecordToRow(row) : undefined;
    },

    async restoreFileFromTrash({ fileId, scope, updatedAt, updatedBy }) {
      if (!prisma.documentFile.updateMany || !prisma.documentFile.findFirst) {
        throw new Error("DocumentFile restore repository method is not available.");
      }

      const updated = await prisma.documentFile.updateMany({
        where: {
          ...trashedScopeWhere(scope),
          id: fileId,
        },
        data: {
          deletedAt: null,
          updatedAt: new Date(updatedAt),
          updatedBy,
        },
      });

      if (updated.count === 0) {
        return undefined;
      }

      const row = await prisma.documentFile.findFirst({
        where: {
          ...baseScopeWhere(scope),
          id: fileId,
        },
      });

      return row ? fileRecordToRow(row) : undefined;
    },

    async renameFile({ fileId, name, scope, updatedAt, updatedBy }) {
      if (!prisma.documentFile.updateMany || !prisma.documentFile.findFirst) {
        throw new Error("DocumentFile rename repository method is not available.");
      }
      const updated = await prisma.documentFile.updateMany({
        where: { ...activeScopeWhere(scope), id: fileId },
        data: { name, updatedAt: new Date(updatedAt), updatedBy },
      });
      if (updated.count === 0) return undefined;
      const row = await prisma.documentFile.findFirst({ where: { ...baseScopeWhere(scope), id: fileId } });
      return row ? fileRecordToRow(row) : undefined;
    },

    async purgeTrashedFiles({ deletedBefore, scope }) {
      if (!prisma.documentFile.deleteMany) {
        throw new Error("DocumentFile purge repository method is not available.");
      }

      const where = {
        ...baseScopeWhere(scope),
        deletedAt: { lt: new Date(deletedBefore) },
      };
      const rows = await prisma.documentFile.findMany({
        where,
        orderBy: [{ deletedAt: "asc" }],
      });

      if (rows.length === 0) {
        return [];
      }

      await prisma.documentFile.deleteMany({ where });

      return rows.map(fileRecordToRow);
    },

    async listFolders({ scope }) {
      const rows = await prisma.documentFolder.findMany({
        where: activeScopeWhere(scope),
        orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
        include: { files: false },
      });

      return rows.map((row) => folderRecordToRow(row, scope));
    },

    async upsertFolder(row) {
      const saved = await prisma.documentFolder.upsert({
        where: { id: row.id },
        create: folderRowToCreateData(row),
        update: folderRowToUpdateData(row),
      });

      return folderRecordToRow(saved);
    },
    async deleteFolder({ folderId, scope }) {
      if (!prisma.documentFolder.deleteMany) return false;
      const result = await prisma.documentFolder.deleteMany({
        where: { ...baseScopeWhere(scope), id: folderId, isSystem: false },
      });
      return result.count > 0;
    },
  };
}

function baseScopeWhere(scope: TenantScope) {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
  };
}

function activeScopeWhere(scope: TenantScope) {
  return {
    ...baseScopeWhere(scope),
    deletedAt: null,
  };
}

function trashedScopeWhere(scope: TenantScope) {
  return {
    ...baseScopeWhere(scope),
    deletedAt: { not: null },
  };
}

function folderRowToCreateData(row: DocumentFolderRow) {
  return {
    accessLevel: row.accessLevel,
    canDelete: row.canDelete,
    canRename: row.canRename,
    color: row.color,
    companyId: row.companyId ?? "",
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    fileCount: row.fileCount,
    id: row.id,
    isStarred: row.isStarred,
    isSystem: row.isSystem,
    name: row.name,
    periodId: row.periodId ?? "",
    purpose: row.purpose,
    sizeBytes: BigInt(row.sizeBytes),
    systemKey: row.systemKey ?? null,
    tenantId: row.tenantId ?? "",
    updatedAt: new Date(row.updatedAt ?? row.createdAt),
    updatedBy: row.updatedBy ?? row.createdBy,
  };
}

function folderRowToUpdateData(row: DocumentFolderRow) {
  return {
    accessLevel: row.accessLevel,
    canDelete: row.canDelete,
    canRename: row.canRename,
    color: row.color,
    isStarred: row.isStarred,
    isSystem: row.isSystem,
    name: row.name,
    purpose: row.purpose,
    systemKey: row.systemKey ?? null,
    updatedAt: new Date(row.updatedAt ?? row.createdAt),
    updatedBy: row.updatedBy ?? row.createdBy,
  };
}

function fileRowToCreateData(row: DocumentFileRow) {
  return {
    companyId: row.companyId ?? "",
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    extension: row.extension,
    fileType: row.kind,
    folderId: row.folderId,
    id: row.id,
    lastModified: new Date(row.lastModified),
    linkedModule: row.linkedModule ?? null,
    linkedRecordId: row.linkedRecordId ?? null,
    linkedRecordLabel: row.linkedRecordLabel ?? null,
    mimeType: row.mimeType ?? "",
    name: row.name,
    periodId: row.periodId ?? "",
    sizeBytes: BigInt(row.sizeBytes),
    storageKey: row.storageKey ?? "",
    tenantId: row.tenantId ?? "",
    updatedAt: new Date(row.updatedAt ?? row.createdAt),
    updatedBy: row.updatedBy ?? row.createdBy,
  };
}

function folderRecordToRow(
  record: DocumentFolderRecord,
  scope?: TenantScope,
): DocumentFolderRow {
  return {
    accessLevel: record.accessLevel === "restricted" ? "restricted" : "public",
    canDelete: record.canDelete,
    canRename: record.canRename,
    color: readFolderColor(record.color),
    companyId: record.companyId,
    createdAt: formatIso(record.createdAt),
    createdBy: record.createdBy,
    fileCount: record.fileCount,
    id: record.id,
    isStarred: record.isStarred,
    isSystem: record.isSystem,
    name: record.name,
    periodId: record.periodId,
    purpose: record.purpose,
    sizeBytes: Number(record.sizeBytes),
    systemKey: record.systemKey ?? undefined,
    tenantId: record.tenantId,
    updatedAt: formatIso(record.updatedAt),
    updatedBy: record.updatedBy || scope?.userId,
  };
}

function fileRecordToRow(record: DocumentFileRecord): DocumentFileRow {
  return {
    companyId: record.companyId,
    createdAt: formatIso(record.createdAt),
    createdBy: record.createdBy,
    deletedAt: record.deletedAt ? formatIso(record.deletedAt) : undefined,
    extension: record.extension,
    folderId: record.folderId,
    id: record.id,
    kind: readFileKind(record.fileType),
    lastModified: new Date(record.lastModified).getTime(),
    linkedModule: record.linkedModule ?? undefined,
    linkedRecordId: record.linkedRecordId ?? undefined,
    linkedRecordLabel: record.linkedRecordLabel ?? undefined,
    mimeType: record.mimeType,
    name: record.name,
    periodId: record.periodId,
    sizeBytes: Number(record.sizeBytes),
    storageKey: record.storageKey,
    tenantId: record.tenantId,
    updatedAt: formatIso(record.updatedAt),
    updatedBy: record.updatedBy,
  };
}

function readFolderColor(value: string): DocumentFolderColor {
  if (
    value === "Kırmızı" ||
    value === "Lacivert" ||
    value === "Mavi" ||
    value === "Mor" ||
    value === "Sarı" ||
    value === "Turuncu" ||
    value === "Yeşil"
  ) {
    return value;
  }

  return "Gri";
}

function readFileKind(value: string): DocumentFileKind {
  if (
    value === "document" ||
    value === "image" ||
    value === "pdf" ||
    value === "spreadsheet"
  ) {
    return value;
  }

  return "other";
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

