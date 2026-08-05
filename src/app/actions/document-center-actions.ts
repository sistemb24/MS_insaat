"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  createDocumentCenterPrismaRepository,
  type DocumentCenterPrismaClientLike,
} from "@/lib/document-center-prisma-repository";
import {
  createDocumentFileDraft,
  createDocumentCenterService,
  type DocumentCenterResult,
  type DocumentFileRow,
  type DocumentFileMetadataCreateValues,
  type DocumentFolderRow,
  type DocumentUserFolderCreateValues,
  type DocumentUploadFileLike,
} from "@/lib/document-center-service";
import { canUseDocumentPermission } from "@/lib/access-profile";
import { createDocumentStorageRuntime } from "@/lib/document-storage-runtime";
import { createDocumentStorageKey } from "@/lib/document-storage-key";
import { prisma } from "@/lib/prisma";
import { accessProfileService } from "@/lib/access-profile-runtime";

import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

const documentCenterRepository = createDocumentCenterPrismaRepository(
  prisma as unknown as DocumentCenterPrismaClientLike,
);
const documentCenterService = createDocumentCenterService({
  auditLogRepository: createAuditLogPrismaRepository(
    prisma as unknown as AuditLogPrismaClientLike,
  ),
  now: () => new Date().toISOString(),
  repository: documentCenterRepository,
});
const documentStorage = createDocumentStorageRuntime().storage;

export async function listDocumentCenterAction() {
  const context = await getDocumentCenterActionContext();

  if (!context.ok) {
    return context.result;
  }

  const ensured = await documentCenterService.ensureSystemFolders({
    scope: context.scope,
  });

  if (!ensured.ok) {
    return ensured;
  }

  return documentCenterService.list({ scope: context.scope });
}

export async function createDocumentFileMetadataAction(
  values: DocumentFileMetadataCreateValues,
  storageKey: string,
) {
  const context = await getDocumentCenterActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await documentCenterService.createFileMetadata({
    scope: context.scope,
    storageKey,
    values,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dokuman-merkezi");

  return result;
}

export async function createDocumentFolderAction(
  values: DocumentUserFolderCreateValues,
): Promise<DocumentCenterResult<{ folder: DocumentFolderRow }>> {
  const context = await getDocumentCenterActionContext();

  if (!context.ok) {
    return context.result;
  }

  const ensured = await documentCenterService.ensureSystemFolders({
    scope: context.scope,
  });

  if (!ensured.ok) {
    return ensured;
  }

  const result = await documentCenterService.createUserFolder({
    scope: context.scope,
    values,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dokuman-merkezi");

  return result;
}

export async function deleteDocumentFolderAction(folderId: string) {
  const context = await getDocumentCenterActionContext();
  if (!context.ok) return context.result;
  const result = await documentCenterService.deleteUserFolder({
    folderId: folderId.trim(),
    scope: context.scope,
  });
  if (result.ok) revalidatePath("/dokuman-merkezi");
  return result;
}

export async function renameDocumentFolderAction(folderId: string, name: string) {
  const context = await getDocumentCenterActionContext();
  if (!context.ok) return context.result;
  const result = await documentCenterService.renameUserFolder({
    folderId: folderId.trim(),
    name,
    scope: context.scope,
  });
  if (result.ok) revalidatePath("/dokuman-merkezi");
  return result;
}

export async function renameDocumentFileAction(fileId: string, name: string) {
  const context = await getDocumentCenterActionContext();
  if (!context.ok) return context.result;
  const result = await documentCenterService.renameFile({
    fileId: fileId.trim(),
    name,
    scope: context.scope,
  });
  if (result.ok) revalidatePath("/dokuman-merkezi");
  return result;
}

export async function createDocumentFileAction(
  formData: FormData,
): Promise<DocumentCenterResult<{ file: DocumentFileRow }>> {
  const folderId = formData.get("folderId");
  const rawFile = formData.get("file");

  if (typeof folderId !== "string" || !folderId.trim()) {
    return { ok: false, errors: ["Hedef klasör zorunludur."] };
  }

  if (!isUploadedFile(rawFile)) {
    return { ok: false, errors: ["Yüklenecek dosya zorunludur."] };
  }

  const context = await getDocumentCenterActionContext();

  if (!context.ok) {
    return context.result;
  }

  if (
    !canUseDocumentPermission(
      context.scope.userRole,
      context.scope.documentAccess,
      "document.file.create",
    )
  ) {
    return {
      ok: false,
      errors: ["Yetki profiliniz dosya yüklemeye izin vermiyor."],
    };
  }

  const ensured = await documentCenterService.ensureSystemFolders({
    scope: context.scope,
  });

  if (!ensured.ok) {
    return ensured;
  }

  const values: DocumentFileMetadataCreateValues = {
    file: toDocumentUploadFile(rawFile),
    folderId: folderId.trim(),
    ...readDocumentFileLinkValues(formData),
  };
  const draft = createDocumentFileDraft({
    file: values.file,
    folderId: values.folderId,
    userName: context.scope.userId,
  });

  if (!draft.ok) {
    return draft;
  }

  const folders = await documentCenterService.list({ scope: context.scope });

  if (!folders.ok) {
    return folders;
  }

  if (!folders.data.folders.some((folder) => folder.id === values.folderId)) {
    return { ok: false, errors: ["Hedef klasör bulunamadı."] };
  }

  const storageKey = createDocumentStorageKey({
    fileName: values.file.name,
    folderId: values.folderId,
    lastModified: values.file.lastModified,
  });

  try {
    await documentStorage.putObject({
      content: await rawFile.arrayBuffer(),
      contentType: values.file.type || "application/octet-stream",
      storageKey,
    });
  } catch (error) {
    return {
      ok: false,
      errors: [`Döküman dosyası saklanamadı: ${getErrorMessage(error)}`],
    };
  }

  const result = await documentCenterService.createFileMetadata({
    scope: context.scope,
    storageKey,
    values,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dokuman-merkezi");

  return result;
}


export async function moveDocumentFileToTrashAction(
  fileId: string,
): Promise<DocumentCenterResult<{ file: DocumentFileRow }>> {
  const context = await getDocumentCenterActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await documentCenterService.moveFileToTrash({
    fileId,
    scope: context.scope,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dokuman-merkezi");

  return result;
}

export async function restoreDocumentFileFromTrashAction(
  fileId: string,
): Promise<DocumentCenterResult<{ file: DocumentFileRow }>> {
  const context = await getDocumentCenterActionContext();

  if (!context.ok) {
    return context.result;
  }

  const result = await documentCenterService.restoreFileFromTrash({
    fileId,
    scope: context.scope,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dokuman-merkezi");

  return result;
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<File>;

  return (
    typeof candidate.arrayBuffer === "function" &&
    typeof candidate.name === "string" &&
    typeof candidate.size === "number"
  );
}

function readDocumentFileLinkValues(
  formData: FormData,
): Pick<
  DocumentFileMetadataCreateValues,
  "linkedModule" | "linkedRecordId" | "linkedRecordLabel"
> {
  const linkedModule = readOptionalFormString(formData, "linkedModule");
  const linkedRecordLabel = readOptionalFormString(formData, "linkedRecordLabel");
  const linkedRecordId =
    readOptionalFormString(formData, "linkedRecordId") || linkedRecordLabel;

  if (!linkedModule && !linkedRecordLabel && !linkedRecordId) {
    return {};
  }

  return {
    linkedModule,
    linkedRecordId,
    linkedRecordLabel,
  };
}

function readOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function toDocumentUploadFile(file: File): DocumentUploadFileLike {
  return {
    lastModified: file.lastModified,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Bilinmeyen storage hatası";
}

async function getDocumentCenterActionContext() {
  const context = await getSubscriptionFeatureActionContext("document-center");
  if (!context.ok || context.scope.userRole !== "viewer") return context;
  return {
    ...context,
    scope: {
      ...context.scope,
      documentAccess: await accessProfileService.resolveDocumentAccess({
        scope: context.scope,
      }),
    },
  };
}

