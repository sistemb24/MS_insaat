import { describe, expect, test } from "vitest";

import {
  DOCUMENT_CENTER_STORAGE_LIMIT_BYTES,
  DOCUMENT_FILE_UPLOAD_LIMIT_BYTES,
  createDocumentCenterService,
  createDocumentFileDraft,
  createDocumentUserFolder,
  createSeededDocumentCenterMemoryRepository,
  insertDocumentFileIntoFolder,
  listDocumentSystemFolders,
  summarizeDocumentCenter,
} from "./document-center-service";
import { defaultTenantScope } from "./tenant-scope";

describe("document-center-service", () => {
  test("creates the protected NOA system folders in plan order", () => {
    const folders = listDocumentSystemFolders();

    expect(folders.map((folder) => folder.name)).toEqual([
      "Araç Belgeleri",
      "Araçlar",
      "Disiplin",
      "İrsaliyeler",
      "İzin Belgeleri",
      "Malzemeler",
      "Masraflar",
      "Ödeme Dekontları",
      "Personel",
      "Personel Belgeleri",
      "Sözleşmeler",
      "Stok Demirbaşları",
      "Teklifler",
    ]);
    expect(folders).toHaveLength(13);
    expect(
      folders.every(
        (folder) =>
          folder.isSystem && !folder.canDelete && !folder.canRename,
      ),
    ).toBe(true);
    expect(folders.find((folder) => folder.name === "Sözleşmeler")).toEqual(
      expect.objectContaining({
        color: "Mor",
        purpose: "İhale ve taşeron sözleşmeleri",
        systemKey: "contracts",
      }),
    );
  });

  test("summarizes storage and system folder counters for the opening surface", () => {
    const summary = summarizeDocumentCenter();

    expect(summary.folderCount).toBe(13);
    expect(summary.systemFolderCount).toBe(13);
    expect(summary.fileCount).toBe(0);
    expect(summary.usedBytes).toBe(0);
    expect(summary.limitBytes).toBe(DOCUMENT_CENTER_STORAGE_LIMIT_BYTES);
    expect(summary.usedPercent).toBe(0);
  });

  test("creates a user folder with selected access without system protections", () => {
    const result = createDocumentUserFolder({
      existingFolders: listDocumentSystemFolders(),
      now: "2026-07-01",
      userName: "Ana Kullanıcı",
      values: {
        accessLevel: "restricted",
        name: "Proje Evrakları",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        accessLevel: "restricted",
        canDelete: true,
        canRename: true,
        color: "Gri",
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        isSystem: false,
        name: "Proje Evrakları",
        purpose: "Belirli kullanıcı/rol erişimli kullanıcı klasörü",
      }),
    });
  });

  test("rejects empty and duplicate user folder names", () => {
    const existingFolders = listDocumentSystemFolders();

    expect(
      createDocumentUserFolder({
        existingFolders,
        values: { accessLevel: "public", name: "   " },
      }),
    ).toEqual({
      ok: false,
      errors: ["Klasör adı zorunludur."],
    });
    expect(
      createDocumentUserFolder({
        existingFolders,
        values: { accessLevel: "public", name: "sözleşmeler" },
      }),
    ).toEqual({
      ok: false,
      errors: ["Bu klasör adı zaten kullanılıyor: sözleşmeler"],
    });
  });

  test("deletes only empty non-system user folders", async () => {
    const service = createDocumentCenterService({
      now: () => "2026-07-14T08:00:00.000Z",
      repository: createSeededDocumentCenterMemoryRepository(),
    });
    await service.ensureSystemFolders({ scope: defaultTenantScope });
    const created = await service.createUserFolder({
      scope: defaultTenantScope,
      values: { accessLevel: "public", name: "Boş Klasör" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await expect(
      service.deleteUserFolder({
        folderId: created.data.folder.id,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: { folderId: created.data.folder.id },
    });
    const listed = await service.list({ scope: defaultTenantScope });
    const systemFolderId = listed.ok
      ? listed.data.folders.find((folder) => folder.isSystem)?.id
      : undefined;
    await expect(
      service.deleteUserFolder({
        folderId: systemFolderId ?? "missing-system-folder",
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Sistem klasörleri silinemez."],
    });
  });

  test("renames a user folder while protecting system and duplicate names", async () => {
    const service = createDocumentCenterService({
      now: () => "2026-07-14T08:00:00.000Z",
      repository: createSeededDocumentCenterMemoryRepository(),
    });
    await service.ensureSystemFolders({ scope: defaultTenantScope });
    const created = await service.createUserFolder({
      scope: defaultTenantScope,
      values: { accessLevel: "public", name: "Eski Ad" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await expect(service.renameUserFolder({ folderId: created.data.folder.id, name: "Yeni Ad", scope: defaultTenantScope })).resolves.toMatchObject({ ok: true, data: { folder: { name: "Yeni Ad" } } });
    await expect(service.renameUserFolder({ folderId: created.data.folder.id, name: "Araçlar", scope: defaultTenantScope })).resolves.toEqual({ ok: false, errors: ["Bu klasör adı zaten kullanılıyor: Araçlar"] });
  });

  test("creates a file draft with type classification within the 5MB upload limit", () => {
    const result = createDocumentFileDraft({
      file: {
        lastModified: 1_782_883_200_000,
        name: "hakediş-raporu.pdf",
        size: 1_280_000,
        type: "application/pdf",
      },
      folderId: "system-contracts",
      now: "2026-07-01",
      userName: "Ana Kullanıcı",
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        createdAt: "2026-07-01",
        createdBy: "Ana Kullanıcı",
        extension: "pdf",
        folderId: "system-contracts",
        id: "file-system-contracts-hakedis-raporu-pdf",
        kind: "pdf",
        name: "hakediş-raporu.pdf",
        sizeBytes: 1_280_000,
      }),
    });
  });

  test("rejects files larger than the 5MB upload limit", () => {
    expect(
      createDocumentFileDraft({
        file: {
          lastModified: 1_782_883_200_000,
          name: "buyuk-metraj.xlsx",
          size: DOCUMENT_FILE_UPLOAD_LIMIT_BYTES + 1,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        folderId: "system-contracts",
      }),
    ).toEqual({
      ok: false,
      errors: ["Dosya boyutu 5MB sınırını aşamaz."],
    });
  });

  test("adds an uploaded file to its target folder counters", () => {
    const folders = listDocumentSystemFolders();
    const fileResult = createDocumentFileDraft({
      file: {
        lastModified: 1_782_883_200_000,
        name: "sozlesme.docx",
        size: 512_000,
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      folderId: "system-contracts",
    });

    expect(fileResult.ok).toBe(true);
    if (!fileResult.ok) {
      return;
    }

    const nextFolders = insertDocumentFileIntoFolder({
      file: fileResult.data,
      folders,
    });

    expect(
      nextFolders.find((folder) => folder.id === "system-contracts"),
    ).toEqual(
      expect.objectContaining({
        fileCount: 1,
        sizeBytes: 512_000,
      }),
    );
    expect(summarizeDocumentCenter(nextFolders).fileCount).toBe(1);
  });

  test("creates file metadata linked to a source module record", async () => {
    const service = createDocumentCenterService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository: createSeededDocumentCenterMemoryRepository(),
    });
    const folders = await service.ensureSystemFolders({ scope: defaultTenantScope });

    expect(folders.ok).toBe(true);
    if (!folders.ok) {
      return;
    }

    const contractsFolder = folders.data.folders.find(
      (folder) => folder.name === "Sözleşmeler",
    );

    expect(contractsFolder).toBeDefined();
    if (!contractsFolder) {
      return;
    }

    await expect(
      service.createFileMetadata({
        scope: defaultTenantScope,
        storageKey: "document-center/contracts/fatura.pdf",
        values: {
          file: {
            lastModified: 1_782_883_200_000,
            name: "fatura.pdf",
            size: 640_000,
            type: "application/pdf",
          },
          folderId: contractsFolder.id,
          linkedModule: "faturalar",
          linkedRecordId: "FAT-0001",
          linkedRecordLabel: "FAT-0001 - ABC Beton",
        },
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        file: expect.objectContaining({
          linkedModule: "faturalar",
          linkedRecordId: "FAT-0001",
          linkedRecordLabel: "FAT-0001 - ABC Beton",
          name: "fatura.pdf",
        }),
      },
    });
  });

  test("renames active file metadata without changing its extension", async () => {
    const service = createDocumentCenterService({
      now: () => "2026-07-14T08:00:00.000Z",
      repository: createSeededDocumentCenterMemoryRepository(),
    });
    const folders = await service.ensureSystemFolders({ scope: defaultTenantScope });
    if (!folders.ok) return;
    const created = await service.createFileMetadata({
      scope: defaultTenantScope,
      storageKey: "document-center/contracts/eski-ad.pdf",
      values: {
        file: { lastModified: 1, name: "eski-ad.pdf", size: 128, type: "application/pdf" },
        folderId: folders.data.folders[0]!.id,
      },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await expect(service.renameFile({ fileId: created.data.file.id, name: "yeni-ad.pdf", scope: defaultTenantScope })).resolves.toMatchObject({ ok: true, data: { file: { name: "yeni-ad.pdf" } } });
    await expect(service.renameFile({ fileId: created.data.file.id, name: "yeni-ad.xlsx", scope: defaultTenantScope })).resolves.toEqual({ ok: false, errors: ["Dosya uzantısı değiştirilemez."] });
  });
  test("moves file metadata to trash and separates active and deleted lists", async () => {
    let currentNow = "2026-07-01T10:00:00.000Z";
    const service = createDocumentCenterService({
      now: () => currentNow,
      repository: createSeededDocumentCenterMemoryRepository(),
    });

    await expect(
      service.ensureSystemFolders({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        folders: expect.any(Array),
      },
    });

    const listedFolders = await service.list({ scope: defaultTenantScope });

    expect(listedFolders.ok).toBe(true);
    if (!listedFolders.ok) {
      return;
    }

    const contractsFolder = listedFolders.data.folders.find(
      (folder) => folder.systemKey === "contracts",
    );

    expect(contractsFolder).toBeDefined();
    if (!contractsFolder) {
      return;
    }

    const created = await service.createFileMetadata({
      scope: defaultTenantScope,
      storageKey: "document-center/contracts/hakedis.pdf",
      values: {
        file: {
          lastModified: 1_782_883_200_000,
          name: "hakediş.pdf",
          size: 640_000,
          type: "application/pdf",
        },
        folderId: contractsFolder.id,
      },
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    currentNow = "2026-07-01T10:15:00.000Z";
    await expect(
      service.moveFileToTrash({
        fileId: created.data.file.id,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      ok: true,
      data: {
        file: expect.objectContaining({
          deletedAt: "2026-07-01T10:15:00.000Z",
          id: created.data.file.id,
          updatedAt: "2026-07-01T10:15:00.000Z",
          updatedBy: defaultTenantScope.userId,
        }),
      },
    });

    const listedAfterDelete = await service.list({ scope: defaultTenantScope });

    expect(listedAfterDelete.ok).toBe(true);
    if (!listedAfterDelete.ok) {
      return;
    }

    expect(listedAfterDelete.data.files).toEqual([]);
    expect(listedAfterDelete.data.trashedFiles).toEqual([
      expect.objectContaining({
        deletedAt: "2026-07-01T10:15:00.000Z",
        id: created.data.file.id,
        name: "hakediş.pdf",
      }),
    ]);
  });

  test("restores trashed file metadata back to active files", async () => {
    let currentNow = "2026-07-01T10:00:00.000Z";
    const service = createDocumentCenterService({
      now: () => currentNow,
      repository: createSeededDocumentCenterMemoryRepository(),
    });
    const folders = await service.ensureSystemFolders({ scope: defaultTenantScope });

    expect(folders.ok).toBe(true);
    if (!folders.ok) {
      return;
    }

    const contractsFolder = folders.data.folders.find(
      (folder) => folder.name === "Sözleşmeler",
    );

    expect(contractsFolder).toBeDefined();
    if (!contractsFolder) {
      return;
    }

    const created = await service.createFileMetadata({
      scope: defaultTenantScope,
      storageKey: "document-center/contracts/hakedis.pdf",
      values: {
        file: {
          lastModified: 1_782_883_200_000,
          name: "hakediş.pdf",
          size: 640_000,
          type: "application/pdf",
        },
        folderId: contractsFolder.id,
      },
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    currentNow = "2026-07-01T10:15:00.000Z";
    await service.moveFileToTrash({
      fileId: created.data.file.id,
      scope: defaultTenantScope,
    });

    currentNow = "2026-07-01T10:20:00.000Z";
    const restored = await service.restoreFileFromTrash({
      fileId: created.data.file.id,
      scope: defaultTenantScope,
    });

    expect(restored).toEqual({
      ok: true,
      data: {
        file: expect.objectContaining({
          id: created.data.file.id,
          updatedAt: "2026-07-01T10:20:00.000Z",
          updatedBy: defaultTenantScope.userId,
        }),
      },
    });
    expect(restored.ok ? restored.data.file : {}).not.toHaveProperty("deletedAt");

    const listedAfterRestore = await service.list({ scope: defaultTenantScope });

    expect(listedAfterRestore.ok).toBe(true);
    if (!listedAfterRestore.ok) {
      return;
    }

    expect(listedAfterRestore.data.files).toEqual([
      expect.objectContaining({
        id: created.data.file.id,
        name: "hakediş.pdf",
      }),
    ]);
    expect(listedAfterRestore.data.files[0]).not.toHaveProperty("deletedAt");
    expect(listedAfterRestore.data.trashedFiles).toEqual([]);
  });

  test("purges only trashed files older than the retention window", async () => {
    let currentNow = "2026-07-01T10:00:00.000Z";
    const service = createDocumentCenterService({
      now: () => currentNow,
      repository: createSeededDocumentCenterMemoryRepository(),
    });
    const folders = await service.ensureSystemFolders({ scope: defaultTenantScope });

    expect(folders.ok).toBe(true);
    if (!folders.ok) {
      return;
    }

    const contractsFolder = folders.data.folders.find(
      (folder) => folder.name === "Sözleşmeler",
    );

    expect(contractsFolder).toBeDefined();
    if (!contractsFolder) {
      return;
    }

    const oldFile = await service.createFileMetadata({
      scope: defaultTenantScope,
      storageKey: "document-center/contracts/old-hakedis.pdf",
      values: {
        file: {
          lastModified: 1_782_883_200_000,
          name: "eski-hakediş.pdf",
          size: 640_000,
          type: "application/pdf",
        },
        folderId: contractsFolder.id,
      },
    });
    const recentFile = await service.createFileMetadata({
      scope: defaultTenantScope,
      storageKey: "document-center/contracts/recent-hakedis.pdf",
      values: {
        file: {
          lastModified: 1_782_883_300_000,
          name: "yeni-hakediş.pdf",
          size: 320_000,
          type: "application/pdf",
        },
        folderId: contractsFolder.id,
      },
    });

    expect(oldFile.ok).toBe(true);
    expect(recentFile.ok).toBe(true);
    if (!oldFile.ok || !recentFile.ok) {
      return;
    }

    currentNow = "2026-07-01T10:15:00.000Z";
    await service.moveFileToTrash({
      fileId: oldFile.data.file.id,
      scope: defaultTenantScope,
    });
    currentNow = "2026-08-01T10:15:00.000Z";
    await service.moveFileToTrash({
      fileId: recentFile.data.file.id,
      scope: defaultTenantScope,
    });

    currentNow = "2026-08-15T10:15:00.000Z";
    await expect(
      service.purgeExpiredTrash({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: {
        deletedBefore: "2026-07-16T10:15:00.000Z",
        purgedCount: 1,
        purgedFiles: [
          expect.objectContaining({
            id: oldFile.data.file.id,
            name: "eski-hakediş.pdf",
            storageKey: "document-center/contracts/old-hakedis.pdf",
          }),
        ],
        purgedStorageKeys: ["document-center/contracts/old-hakedis.pdf"],
        retentionDays: 30,
      },
    });

    const listedAfterPurge = await service.list({ scope: defaultTenantScope });

    expect(listedAfterPurge.ok).toBe(true);
    if (!listedAfterPurge.ok) {
      return;
    }

    expect(listedAfterPurge.data.files).toEqual([]);
    expect(listedAfterPurge.data.trashedFiles).toEqual([
      expect.objectContaining({
        id: recentFile.data.file.id,
        name: "yeni-hakediş.pdf",
      }),
    ]);
  });
});

