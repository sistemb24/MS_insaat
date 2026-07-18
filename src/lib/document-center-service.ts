import type { AuditLogRepository } from "./audit-log";
import { createAuditLogEntry } from "./audit-log";
import { hasRbacPermission } from "./rbac";
import {
  buildTenantScopeKey,
  type TenantScope,
  validateTenantScope,
} from "./tenant-scope";

export const DOCUMENT_CENTER_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;
export const DOCUMENT_FILE_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_TRASH_RETENTION_DAYS = 30;

export type DocumentFileKind =
  | "document"
  | "image"
  | "other"
  | "pdf"
  | "spreadsheet";

export type DocumentFolderColor =
  | "Gri"
  | "Kırmızı"
  | "Lacivert"
  | "Mavi"
  | "Mor"
  | "Sarı"
  | "Turuncu"
  | "Yeşil";

export type DocumentFolderRow = {
  accessLevel: "public" | "restricted";
  canDelete: boolean;
  canRename: boolean;
  color: DocumentFolderColor;
  companyId?: string;
  createdAt: string;
  createdBy: string;
  fileCount: number;
  id: string;
  isStarred: boolean;
  isSystem: boolean;
  name: string;
  periodId?: string;
  purpose: string;
  sizeBytes: number;
  systemKey?: string;
  tenantId?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type DocumentFileRow = {
  companyId?: string;
  createdAt: string;
  createdBy: string;
  deletedAt?: string;
  extension: string;
  folderId: string;
  id: string;
  kind: DocumentFileKind;
  lastModified: number;
  linkedModule?: string;
  linkedRecordId?: string;
  linkedRecordLabel?: string;
  mimeType?: string;
  name: string;
  periodId?: string;
  sizeBytes: number;
  storageKey?: string;
  tenantId?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type DocumentUploadFileLike = {
  lastModified: number;
  name: string;
  size: number;
  type: string;
};

export type DocumentFileDraftInput = {
  file: DocumentUploadFileLike;
  folderId: string;
  now?: string;
  userName?: string;
};

export type DocumentFileInsertInput = {
  file: DocumentFileRow;
  folders: DocumentFolderRow[];
};

export type DocumentFileMetadataCreateValues = {
  file: DocumentUploadFileLike;
  folderId: string;
  linkedModule?: string;
  linkedRecordId?: string;
  linkedRecordLabel?: string;
};

export type DocumentUserFolderCreateValues = {
  accessLevel: "public" | "restricted";
  name: string;
};

export type DocumentUserFolderCreateInput = {
  existingFolders: DocumentFolderRow[];
  now?: string;
  userName?: string;
  values: DocumentUserFolderCreateValues;
};

export type DocumentUserFolderCreateServiceInput = {
  scope: TenantScope;
  values: DocumentUserFolderCreateValues;
};

export type DocumentCenterResult<T> =
  | { ok: true; data: T; errors?: never }
  | { ok: false; errors: string[]; data?: never };

export type DocumentCenterSummary = {
  fileCount: number;
  folderCount: number;
  limitBytes: number;
  systemFolderCount: number;
  usedBytes: number;
  usedPercent: number;
};

export type DocumentCenterRepositoryListInput = {
  scope: TenantScope;
};

export type DocumentCenterFolderUsageInput = {
  fileSizeBytes: number;
  folderId: string;
  scope: TenantScope;
  updatedAt: string;
  updatedBy: string;
};

export type DocumentCenterFileTrashRepositoryInput = {
  deletedAt: string;
  fileId: string;
  scope: TenantScope;
  updatedAt: string;
  updatedBy: string;
};

export type DocumentCenterFileRestoreRepositoryInput = {
  fileId: string;
  scope: TenantScope;
  updatedAt: string;
  updatedBy: string;
};

export type DocumentCenterTrashPurgeRepositoryInput = {
  deletedBefore: string;
  scope: TenantScope;
};

export type DocumentCenterRepository = {
  createFile(row: DocumentFileRow): Promise<DocumentFileRow>;
  incrementFolderUsage(
    input: DocumentCenterFolderUsageInput,
  ): Promise<DocumentFolderRow>;
  listFiles(input: DocumentCenterRepositoryListInput): Promise<DocumentFileRow[]>;
  listFolders(
    input: DocumentCenterRepositoryListInput,
  ): Promise<DocumentFolderRow[]>;
  listTrashedFiles(
    input: DocumentCenterRepositoryListInput,
  ): Promise<DocumentFileRow[]>;
  moveFileToTrash(
    input: DocumentCenterFileTrashRepositoryInput,
  ): Promise<DocumentFileRow | undefined>;
  renameFile?(input: { fileId: string; name: string; scope: TenantScope; updatedAt: string; updatedBy: string }): Promise<DocumentFileRow | undefined>;
  restoreFileFromTrash(
    input: DocumentCenterFileRestoreRepositoryInput,
  ): Promise<DocumentFileRow | undefined>;
  purgeTrashedFiles(
    input: DocumentCenterTrashPurgeRepositoryInput,
  ): Promise<DocumentFileRow[]>;
  upsertFolder(row: DocumentFolderRow): Promise<DocumentFolderRow>;
  deleteFolder?(input: { folderId: string; scope: TenantScope }): Promise<boolean>;
};

export type DocumentCenterEnsureSystemFoldersInput = {
  scope: TenantScope;
};

export type DocumentCenterFileMetadataCreateInput = {
  scope: TenantScope;
  storageKey: string;
  values: DocumentFileMetadataCreateValues;
};

export type DocumentCenterFileTrashInput = {
  fileId: string;
  scope: TenantScope;
};
export type DocumentFileRenameInput = { fileId: string; name: string; scope: TenantScope };

export type DocumentUserFolderDeleteInput = {
  folderId: string;
  scope: TenantScope;
};
export type DocumentUserFolderRenameInput = { folderId: string; name: string; scope: TenantScope };

export type DocumentCenterTrashPurgeInput = {
  retentionDays?: number;
  scope: TenantScope;
};

export type DocumentCenterTrashPurgeResult = {
  deletedBefore: string;
  purgedCount: number;
  purgedFiles: DocumentFileRow[];
  purgedStorageKeys: string[];
  retentionDays: number;
};

export type DocumentCenterService = {
  createUserFolder(
    input: DocumentUserFolderCreateServiceInput,
  ): Promise<DocumentCenterResult<{ folder: DocumentFolderRow }>>;
  deleteUserFolder(input: DocumentUserFolderDeleteInput): Promise<DocumentCenterResult<{ folderId: string }>>;
  renameUserFolder(input: DocumentUserFolderRenameInput): Promise<DocumentCenterResult<{ folder: DocumentFolderRow }>>;
  createFileMetadata(
    input: DocumentCenterFileMetadataCreateInput,
  ): Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
  ensureSystemFolders(
    input: DocumentCenterEnsureSystemFoldersInput,
  ): Promise<DocumentCenterResult<{ folders: DocumentFolderRow[] }>>;
  list(
    input: DocumentCenterRepositoryListInput,
  ): Promise<
    DocumentCenterResult<{
      files: DocumentFileRow[];
      folders: DocumentFolderRow[];
      trashedFiles: DocumentFileRow[];
    }>
  >;
  moveFileToTrash(
    input: DocumentCenterFileTrashInput,
  ): Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
  renameFile(input: DocumentFileRenameInput): Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
  restoreFileFromTrash(
    input: DocumentCenterFileTrashInput,
  ): Promise<DocumentCenterResult<{ file: DocumentFileRow }>>;
  purgeExpiredTrash(
    input: DocumentCenterTrashPurgeInput,
  ): Promise<DocumentCenterResult<DocumentCenterTrashPurgeResult>>;
};

export type DocumentCenterServiceOptions = {
  auditLogRepository?: AuditLogRepository;
  now: () => string;
  repository: DocumentCenterRepository;
};

const documentSystemFolders: DocumentFolderRow[] = [
  createSystemFolder({
    color: "Turuncu",
    name: "Araç Belgeleri",
    purpose: "Araç ruhsatları, muayene, sigorta",
    systemKey: "vehicle-documents",
  }),
  createSystemFolder({
    color: "Turuncu",
    name: "Araçlar",
    purpose: "Araç fotoğrafları",
    systemKey: "vehicles",
  }),
  createSystemFolder({
    color: "Kırmızı",
    name: "Disiplin",
    purpose: "Disiplin tutanakları",
    systemKey: "discipline",
  }),
  createSystemFolder({
    color: "Yeşil",
    name: "İrsaliyeler",
    purpose: "Alış irsaliyesi PDF'leri",
    systemKey: "delivery-notes",
  }),
  createSystemFolder({
    color: "Mor",
    name: "İzin Belgeleri",
    purpose: "Personel izin formları",
    systemKey: "leave-documents",
  }),
  createSystemFolder({
    color: "Gri",
    name: "Malzemeler",
    purpose: "Teknik şartnameler",
    systemKey: "materials",
  }),
  createSystemFolder({
    color: "Sarı",
    name: "Masraflar",
    purpose: "Masraf dekontları ve fotoğrafları",
    systemKey: "expenses",
  }),
  createSystemFolder({
    color: "Yeşil",
    name: "Ödeme Dekontları",
    purpose: "Ödeme dekontları",
    systemKey: "payment-receipts",
  }),
  createSystemFolder({
    color: "Mavi",
    name: "Personel",
    purpose: "Personel fotoğrafları",
    systemKey: "personnel",
  }),
  createSystemFolder({
    color: "Mavi",
    name: "Personel Belgeleri",
    purpose: "Kimlik, sertifika, SGK",
    systemKey: "personnel-documents",
  }),
  createSystemFolder({
    color: "Mor",
    name: "Sözleşmeler",
    purpose: "İhale ve taşeron sözleşmeleri",
    systemKey: "contracts",
  }),
  createSystemFolder({
    color: "Lacivert",
    name: "Stok Demirbaşları",
    purpose: "Demirbaş fotoğraf ve belgeleri",
    systemKey: "stock-fixtures",
  }),
  createSystemFolder({
    color: "Yeşil",
    name: "Teklifler",
    purpose: "Teklif PDF'leri",
    systemKey: "offers",
  }),
];

export function listDocumentSystemFolders(): DocumentFolderRow[] {
  return documentSystemFolders.map((folder) => ({ ...folder }));
}

export function summarizeDocumentCenter(
  folders: DocumentFolderRow[] = listDocumentSystemFolders(),
): DocumentCenterSummary {
  const usedBytes = folders.reduce(
    (total, folder) => total + folder.sizeBytes,
    0,
  );
  const fileCount = folders.reduce(
    (total, folder) => total + folder.fileCount,
    0,
  );

  return {
    fileCount,
    folderCount: folders.length,
    limitBytes: DOCUMENT_CENTER_STORAGE_LIMIT_BYTES,
    systemFolderCount: folders.filter((folder) => folder.isSystem).length,
    usedBytes,
    usedPercent:
      DOCUMENT_CENTER_STORAGE_LIMIT_BYTES === 0
        ? 0
        : Math.round((usedBytes / DOCUMENT_CENTER_STORAGE_LIMIT_BYTES) * 100),
  };
}

export function createDocumentUserFolder({
  existingFolders,
  now = new Date().toISOString().slice(0, 10),
  userName = "Ana Kullanıcı",
  values,
}: DocumentUserFolderCreateInput): DocumentCenterResult<DocumentFolderRow> {
  const name = values.name.trim();
  const errors: string[] = [];

  if (!name) {
    errors.push("Klasör adı zorunludur.");
  }

  const hasDuplicateName = existingFolders.some(
    (folder) => normalizeFolderName(folder.name) === normalizeFolderName(name),
  );

  if (name && hasDuplicateName) {
    errors.push(`Bu klasör adı zaten kullanılıyor: ${values.name}`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      accessLevel: values.accessLevel,
      canDelete: true,
      canRename: true,
      color: "Gri",
      createdAt: now,
      createdBy: userName,
      fileCount: 0,
      id: `user-${slugifyFolderName(name)}`,
      isStarred: false,
      isSystem: false,
      name,
      purpose:
        values.accessLevel === "public"
          ? "Herkese açık kullanıcı klasörü"
          : "Belirli kullanıcı/rol erişimli kullanıcı klasörü",
      sizeBytes: 0,
    },
  };
}

export function createDocumentFileDraft({
  file,
  folderId,
  now = new Date().toISOString().slice(0, 10),
  userName = "Ana Kullanıcı",
}: DocumentFileDraftInput): DocumentCenterResult<DocumentFileRow> {
  const name = file.name.trim();
  const errors: string[] = [];

  if (!folderId) {
    errors.push("Hedef klasör zorunludur.");
  }

  if (!name) {
    errors.push("Dosya adı zorunludur.");
  }

  if (file.size > DOCUMENT_FILE_UPLOAD_LIMIT_BYTES) {
    errors.push("Dosya boyutu 5MB sınırını aşamaz.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const extension = getFileExtension(name);

  return {
    ok: true,
    data: {
      createdAt: now,
      createdBy: userName,
      extension,
      folderId,
      id: `file-${folderId}-${slugifyFolderName(name)}`,
      kind: classifyDocumentFileKind(file.type, extension),
      lastModified: file.lastModified,
      name,
      sizeBytes: file.size,
    },
  };
}

export function insertDocumentFileIntoFolder({
  file,
  folders,
}: DocumentFileInsertInput): DocumentFolderRow[] {
  return folders.map((folder) =>
    folder.id === file.folderId
      ? {
          ...folder,
          fileCount: folder.fileCount + 1,
          sizeBytes: folder.sizeBytes + file.sizeBytes,
        }
      : { ...folder },
  );
}

export function createDocumentCenterService({
  auditLogRepository,
  now,
  repository,
}: DocumentCenterServiceOptions): DocumentCenterService {
  async function resolveFolders(scope: TenantScope) {
    const scopeErrors = validateTenantScope(scope);

    if (scopeErrors.length > 0) {
      return { ok: false as const, errors: scopeErrors };
    }

    return {
      ok: true as const,
      folders: await repository.listFolders({ scope }),
    };
  }

  return {
    async ensureSystemFolders({ scope }) {
      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const createdAt = now();
      const rows = await Promise.all(
        listDocumentSystemFolders().map((folder) =>
          repository.upsertFolder(
            stampDocumentFolderWithScope({
              folder,
              nowIso: createdAt,
              scope,
              userId: "Sistem",
            }),
          ),
        ),
      );

      return { ok: true, data: { folders: rows } };
    },

    async list({ scope }) {
      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      return {
        ok: true,
        data: {
          files: await repository.listFiles({ scope }),
          folders: await repository.listFolders({ scope }),
          trashedFiles: await repository.listTrashedFiles({ scope }),
        },
      };
    },

    async moveFileToTrash({ fileId, scope }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const deletedAt = now();
      const file = await repository.moveFileToTrash({
        deletedAt,
        fileId,
        scope,
        updatedAt: deletedAt,
        updatedBy: scope.userId,
      });

      if (!file) {
        return { ok: false, errors: ["Döküman dosyası bulunamadı."] };
      }

      await recordDocumentAudit(auditLogRepository, {
        action: "document.file.trash",
        file,
        occurredAt: file.updatedAt ?? deletedAt,
        scope,
      });

      return { ok: true, data: { file } };
    },

    async renameFile({ fileId, name, scope }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);
      if (permissionErrors.length > 0) return { ok: false, errors: permissionErrors };
      const trimmedName = name.trim();
      if (!trimmedName) return { ok: false, errors: ["Dosya adı zorunludur."] };
      const file = (await repository.listFiles({ scope })).find((row) => row.id === fileId);
      if (!file) return { ok: false, errors: ["Döküman dosyası bulunamadı."] };
      if (getFileExtension(trimmedName) !== file.extension) {
        return { ok: false, errors: ["Dosya uzantısı değiştirilemez."] };
      }
      if (!repository.renameFile) return { ok: false, errors: ["Dosya yeniden adlandırma altyapısı kullanılamıyor."] };
      const updatedAt = now();
      const renamed = await repository.renameFile({ fileId, name: trimmedName, scope, updatedAt, updatedBy: scope.userId });
      if (!renamed) return { ok: false, errors: ["Döküman dosyası bulunamadı."] };
      await recordDocumentAudit(auditLogRepository, {
        action: "document.file.rename",
        file: renamed,
        occurredAt: renamed.updatedAt ?? updatedAt,
        scope,
      });
      return { ok: true, data: { file: renamed } };
    },

    async restoreFileFromTrash({ fileId, scope }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      const restoredAt = now();
      const file = await repository.restoreFileFromTrash({
        fileId,
        scope,
        updatedAt: restoredAt,
        updatedBy: scope.userId,
      });

      if (!file) {
        return { ok: false, errors: ["Döküman dosyası bulunamadı."] };
      }

      await recordDocumentAudit(auditLogRepository, {
        action: "document.file.restore",
        file,
        occurredAt: file.updatedAt ?? restoredAt,
        scope,
      });

      return { ok: true, data: { file } };
    },

    async purgeExpiredTrash({ retentionDays = DOCUMENT_TRASH_RETENTION_DAYS, scope }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const scopeErrors = validateTenantScope(scope);

      if (scopeErrors.length > 0) {
        return { ok: false, errors: scopeErrors };
      }

      if (!Number.isInteger(retentionDays) || retentionDays < 1) {
        return { ok: false, errors: ["Çöp kutusu bekletme süresi geçersiz."] };
      }

      const deletedBefore = subtractDays(now(), retentionDays);
      const purgedFiles = await repository.purgeTrashedFiles({
        deletedBefore,
        scope,
      });
      const purgedStorageKeys = purgedFiles
        .map((file) => file.storageKey)
        .filter((storageKey): storageKey is string => Boolean(storageKey));

      return {
        ok: true,
        data: {
          deletedBefore,
          purgedCount: purgedFiles.length,
          purgedFiles,
          purgedStorageKeys,
          retentionDays,
        },
      };
    },

    async createUserFolder({ scope, values }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolvedFolders = await resolveFolders(scope);

      if (!resolvedFolders.ok) {
        return resolvedFolders;
      }

      const createdAt = now();
      const draft = createDocumentUserFolder({
        existingFolders: resolvedFolders.folders,
        now: createdAt,
        userName: scope.userId,
        values,
      });

      if (!draft.ok) {
        return draft;
      }

      const folder = await repository.upsertFolder(
        stampDocumentFolderWithScope({
          folder: draft.data,
          nowIso: createdAt,
          scope,
          userId: scope.userId,
        }),
      );

      return { ok: true, data: { folder } };
    },

    async deleteUserFolder({ folderId, scope }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);
      if (permissionErrors.length > 0) return { ok: false, errors: permissionErrors };
      const resolvedFolders = await resolveFolders(scope);
      if (!resolvedFolders.ok) return resolvedFolders;
      const folder = resolvedFolders.folders.find((row) => row.id === folderId);
      if (!folder) return { ok: false, errors: ["Klasör bulunamadı."] };
      if (folder.isSystem || !folder.canDelete) return { ok: false, errors: ["Sistem klasörleri silinemez."] };
      if (folder.fileCount > 0 || folder.sizeBytes > 0) return { ok: false, errors: ["Yalnızca boş klasörler silinebilir."] };
      if (!repository.deleteFolder) return { ok: false, errors: ["Klasör silme altyapısı kullanılamıyor."] };
      const deleted = await repository.deleteFolder({ folderId, scope });
      return deleted
        ? { ok: true, data: { folderId } }
        : { ok: false, errors: ["Klasör silinemedi veya bulunamadı."] };
    },

    async renameUserFolder({ folderId, name, scope }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);
      if (permissionErrors.length > 0) return { ok: false, errors: permissionErrors };
      const resolvedFolders = await resolveFolders(scope);
      if (!resolvedFolders.ok) return resolvedFolders;
      const folder = resolvedFolders.folders.find((row) => row.id === folderId);
      const trimmedName = name.trim();
      if (!folder) return { ok: false, errors: ["Klasör bulunamadı."] };
      if (folder.isSystem || !folder.canRename) return { ok: false, errors: ["Sistem klasörleri yeniden adlandırılamaz."] };
      if (!trimmedName) return { ok: false, errors: ["Klasör adı zorunludur."] };
      if (resolvedFolders.folders.some((row) => row.id !== folderId && row.name.toLocaleLowerCase("tr-TR") === trimmedName.toLocaleLowerCase("tr-TR"))) {
        return { ok: false, errors: [`Bu klasör adı zaten kullanılıyor: ${trimmedName}`] };
      }
      const updated = await repository.upsertFolder({
        ...folder,
        name: trimmedName,
        updatedAt: now(),
        updatedBy: scope.userId,
      });
      return { ok: true, data: { folder: updated } };
    },

    async createFileMetadata({ scope, storageKey, values }) {
      const permissionErrors = validateDocumentCenterMutationPermission(scope);

      if (permissionErrors.length > 0) {
        return { ok: false, errors: permissionErrors };
      }

      const resolvedFolders = await resolveFolders(scope);

      if (!resolvedFolders.ok) {
        return resolvedFolders;
      }

      const targetFolder = resolvedFolders.folders.find(
        (folder) => folder.id === values.folderId,
      );

      if (!targetFolder) {
        return { ok: false, errors: ["Hedef klasör bulunamadı."] };
      }

      const createdAt = now();
      const draft = createDocumentFileDraft({
        file: values.file,
        folderId: values.folderId,
        now: createdAt,
        userName: scope.userId,
      });

      if (!draft.ok) {
        return draft;
      }

      const fileLink = normalizeDocumentFileLink(values);

      if (!fileLink.ok) {
        return fileLink;
      }

      const fileRow: DocumentFileRow = {
        ...draft.data,
        ...fileLink.data,
        companyId: scope.companyId,
        id: createDocumentFileId(scope, draft.data.name),
        mimeType: values.file.type,
        periodId: scope.periodId,
        storageKey,
        tenantId: scope.tenantId,
        updatedAt: createdAt,
        updatedBy: scope.userId,
      };
      const file = await repository.createFile(fileRow);
      await repository.incrementFolderUsage({
        fileSizeBytes: file.sizeBytes,
        folderId: file.folderId,
        scope,
        updatedAt: file.updatedAt ?? createdAt,
        updatedBy: file.updatedBy ?? scope.userId,
      });
      await recordDocumentAudit(auditLogRepository, {
        action: "document.file.create",
        file,
        occurredAt: file.updatedAt ?? createdAt,
        scope,
      });

      return { ok: true, data: { file } };
    },
  };
}

export function canMutateDocumentCenter(scope: TenantScope) {
  return hasRbacPermission(scope.userRole, "document.manage");
}

export function createSeededDocumentCenterMemoryRepository(): DocumentCenterRepository {
  const folders = new Map<string, DocumentFolderRow[]>();
  const files = new Map<string, DocumentFileRow[]>();

  return {
    async createFile(row) {
      const key = buildRowScopeKey(row);
      const persisted = { ...row };

      files.set(key, [persisted, ...(files.get(key) ?? [])]);

      return persisted;
    },
    async incrementFolderUsage({ fileSizeBytes, folderId, scope, updatedAt, updatedBy }) {
      const key = buildTenantScopeKey(scope);
      const scopedFolders = folders.get(key) ?? [];
      let updatedFolder: DocumentFolderRow | undefined;

      folders.set(
        key,
        scopedFolders.map((folder) => {
          if (folder.id !== folderId) {
            return { ...folder };
          }

          updatedFolder = {
            ...folder,
            fileCount: folder.fileCount + 1,
            sizeBytes: folder.sizeBytes + fileSizeBytes,
            updatedAt,
            updatedBy,
          };

          return updatedFolder;
        }),
      );

      if (!updatedFolder) {
        throw new Error("Hedef klasör bulunamadı.");
      }

      return updatedFolder;
    },
    async listFiles({ scope }) {
      return (files.get(buildTenantScopeKey(scope)) ?? [])
        .filter((file) => !file.deletedAt)
        .map((file) => ({
          ...file,
        }));
    },
    async listTrashedFiles({ scope }) {
      return (files.get(buildTenantScopeKey(scope)) ?? [])
        .filter((file) => file.deletedAt)
        .map((file) => ({
          ...file,
        }));
    },
    async moveFileToTrash({ deletedAt, fileId, scope, updatedAt, updatedBy }) {
      const key = buildTenantScopeKey(scope);
      const scopedFiles = files.get(key) ?? [];
      let updatedFile: DocumentFileRow | undefined;

      files.set(
        key,
        scopedFiles.map((file) => {
          if (file.id !== fileId || file.deletedAt) {
            return { ...file };
          }

          updatedFile = {
            ...file,
            deletedAt,
            updatedAt,
            updatedBy,
          };

          return updatedFile;
        }),
      );

      return updatedFile ? { ...updatedFile } : undefined;
    },
    async restoreFileFromTrash({ fileId, scope, updatedAt, updatedBy }) {
      const key = buildTenantScopeKey(scope);
      const scopedFiles = files.get(key) ?? [];
      let updatedFile: DocumentFileRow | undefined;

      files.set(
        key,
        scopedFiles.map((file) => {
          if (file.id !== fileId || !file.deletedAt) {
            return { ...file };
          }

          const restoredFile: DocumentFileRow = {
            ...file,
            updatedAt,
            updatedBy,
          };

          delete restoredFile.deletedAt;
          updatedFile = restoredFile;

          return updatedFile;
        }),
      );

      return updatedFile ? { ...updatedFile } : undefined;
    },
    async renameFile({ fileId, name, scope, updatedAt, updatedBy }) {
      const key = buildTenantScopeKey(scope);
      const scopedFiles = files.get(key) ?? [];
      let updatedFile: DocumentFileRow | undefined;
      files.set(key, scopedFiles.map((file) => {
        if (file.id !== fileId || file.deletedAt) return { ...file };
        updatedFile = { ...file, name, updatedAt, updatedBy };
        return updatedFile;
      }));
      return updatedFile ? { ...updatedFile } : undefined;
    },
    async purgeTrashedFiles({ deletedBefore, scope }) {
      const key = buildTenantScopeKey(scope);
      const scopedFiles = files.get(key) ?? [];
      const cutoff = new Date(deletedBefore).getTime();
      const purgedFiles = scopedFiles.filter(
        (file) => file.deletedAt && new Date(file.deletedAt).getTime() < cutoff,
      );

      files.set(
        key,
        scopedFiles
          .filter((file) => !purgedFiles.some((purgedFile) => purgedFile.id === file.id))
          .map((file) => ({ ...file })),
      );

      return purgedFiles.map((file) => ({ ...file }));
    },
    async listFolders({ scope }) {
      return (folders.get(buildTenantScopeKey(scope)) ?? []).map((folder) => ({
        ...folder,
      }));
    },
    async upsertFolder(row) {
      const key = buildRowScopeKey(row);
      const scopedFolders = folders.get(key) ?? [];
      const existingIndex = scopedFolders.findIndex(
        (folder) => folder.id === row.id,
      );
      const persisted = { ...row };

      folders.set(
        key,
        existingIndex >= 0
          ? scopedFolders.map((folder, index) =>
              index === existingIndex
                ? { ...folder, ...persisted, fileCount: folder.fileCount, sizeBytes: folder.sizeBytes }
                : { ...folder },
            )
          : [...scopedFolders, persisted],
      );

      return persisted;
    },
    async deleteFolder({ folderId, scope }) {
      const key = buildTenantScopeKey(scope);
      const scopedFolders = folders.get(key) ?? [];
      const folder = scopedFolders.find((item) => item.id === folderId);
      if (!folder || folder.isSystem || folder.fileCount > 0 || folder.sizeBytes > 0) return false;
      folders.set(key, scopedFolders.filter((item) => item.id !== folderId));
      return true;
    },
  };
}

export function classifyDocumentFileKind(
  mimeType: string,
  extension: string,
): DocumentFileKind {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (
    [
      "csv",
      "ods",
      "xls",
      "xlsx",
    ].includes(extension) ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel")
  ) {
    return "spreadsheet";
  }

  if (
    [
      "doc",
      "docx",
      "odt",
      "rtf",
      "txt",
    ].includes(extension) ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword")
  ) {
    return "document";
  }

  return "other";
}

function normalizeDocumentFileLink(values: DocumentFileMetadataCreateValues): DocumentCenterResult<{
  linkedModule?: string;
  linkedRecordId?: string;
  linkedRecordLabel?: string;
}> {
  const linkedModule = values.linkedModule?.trim() ?? "";
  const linkedRecordLabel = values.linkedRecordLabel?.trim() ?? "";
  const linkedRecordId = values.linkedRecordId?.trim() || linkedRecordLabel;

  if (!linkedModule && !linkedRecordLabel && !linkedRecordId) {
    return { ok: true, data: {} };
  }

  const errors: string[] = [];

  if (!linkedModule) {
    errors.push("Bağlı modül seçilmelidir.");
  }

  if (!linkedRecordLabel) {
    errors.push("Bağlı evrak veya kayıt bilgisi zorunludur.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      linkedModule,
      linkedRecordId,
      linkedRecordLabel,
    },
  };
}

function createSystemFolder({
  color,
  name,
  purpose,
  systemKey,
}: {
  color: DocumentFolderColor;
  name: string;
  purpose: string;
  systemKey: string;
}): DocumentFolderRow {
  return {
    accessLevel: "public",
    canDelete: false,
    canRename: false,
    color,
    createdAt: "2026-07-01",
    createdBy: "Sistem",
    fileCount: 0,
    id: `system-${systemKey}`,
    isStarred: false,
    isSystem: true,
    name,
    purpose,
    sizeBytes: 0,
    systemKey,
  };
}

function normalizeFolderName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function slugifyFolderName(value: string) {
  return normalizeFolderName(value)
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();

  return extension && extension !== fileName
    ? extension.toLocaleLowerCase("tr-TR")
    : "";
}

function stampDocumentFolderWithScope({
  folder,
  nowIso,
  scope,
  userId,
}: {
  folder: DocumentFolderRow;
  nowIso: string;
  scope: TenantScope;
  userId: string;
}): DocumentFolderRow {
  return {
    ...folder,
    companyId: scope.companyId,
    createdAt: nowIso,
    createdBy: userId,
    id: createDocumentFolderId(scope, folder.systemKey ?? folder.name),
    periodId: scope.periodId,
    tenantId: scope.tenantId,
    updatedAt: nowIso,
    updatedBy: userId,
  };
}

function createDocumentFolderId(scope: TenantScope, key: string) {
  return `${buildTenantScopeKey(scope)}::document-folder::${slugifyFolderName(key)}`;
}

function createDocumentFileId(scope: TenantScope, fileName: string) {
  return `${buildTenantScopeKey(scope)}::document-file::${slugifyFolderName(fileName)}`;
}

function subtractDays(isoDate: string, days: number) {
  const date = new Date(isoDate);

  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString();
}

function buildRowScopeKey(row: {
  companyId?: string;
  periodId?: string;
  tenantId?: string;
}) {
  return `${row.tenantId ?? ""}::${row.companyId ?? ""}::${row.periodId ?? ""}`;
}

function validateDocumentCenterMutationPermission(scope: TenantScope) {
  return canMutateDocumentCenter(scope)
    ? []
    : ["Döküman işlemi için muhasebe veya admin yetkisi gereklidir."];
}

async function recordDocumentAudit(
  auditLogRepository: AuditLogRepository | undefined,
  {
    action,
    file,
    occurredAt,
    scope,
  }: {
    action: "document.file.create" | "document.file.rename" | "document.file.trash" | "document.file.restore";
    file: DocumentFileRow;
    occurredAt: string;
    scope: TenantScope;
  },
) {
  if (!auditLogRepository) {
    return;
  }

  await auditLogRepository.record(
    createAuditLogEntry(scope, {
      action,
      entityType: "document",
      entityId: file.id,
      entityLabel: file.name,
      occurredAt,
      metadata: {
        fileType: file.kind,
        folderId: file.folderId,
        mimeType: file.mimeType ?? "",
        sizeBytes: file.sizeBytes,
        linkedModule: file.linkedModule ?? "",
        linkedRecordId: file.linkedRecordId ?? "",
        linkedRecordLabel: file.linkedRecordLabel ?? "",
        storageKey: file.storageKey ?? "",
      },
    }),
  );
}

