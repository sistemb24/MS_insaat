import { describe, expect, test } from "vitest";

import { createDocumentCenterPrismaRepository } from "./document-center-prisma-repository";
import type { DocumentFileRow, DocumentFolderRow } from "./document-center-service";
import { defaultTenantScope } from "./tenant-scope";

const baseFolder: DocumentFolderRow = {
  accessLevel: "public",
  canDelete: false,
  canRename: false,
  color: "Mor",
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-01T10:00:00.000Z",
  createdBy: "Sistem",
  fileCount: 0,
  id: "tenant-noa-demo::company-demo-insaat::period-2026::document-folder::contracts",
  isStarred: false,
  isSystem: true,
  name: "Sözleşmeler",
  periodId: defaultTenantScope.periodId,
  purpose: "İhale ve taşeron sözleşmeleri",
  sizeBytes: 0,
  systemKey: "contracts",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-01T10:00:00.000Z",
  updatedBy: "Sistem",
};

const baseFile: DocumentFileRow = {
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-01T10:05:00.000Z",
  createdBy: defaultTenantScope.userId,
  extension: "pdf",
  folderId: baseFolder.id,
  id: "tenant-noa-demo::company-demo-insaat::period-2026::document-file::hakedis-pdf",
  kind: "pdf",
  lastModified: 1_782_883_200_000,
  mimeType: "application/pdf",
  name: "hakediş.pdf",
  periodId: defaultTenantScope.periodId,
  sizeBytes: 640_000,
  storageKey: "tenant-noa-demo/company-demo-insaat/contracts/hakedis.pdf",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-01T10:05:00.000Z",
  updatedBy: defaultTenantScope.userId,
};

function toPrismaDocumentFileRecord(file: DocumentFileRow) {
  return {
    companyId: file.companyId ?? defaultTenantScope.companyId,
    createdAt: file.createdAt,
    createdBy: file.createdBy,
    deletedAt: file.deletedAt ?? null,
    extension: file.extension,
    fileType: file.kind,
    folderId: file.folderId,
    id: file.id,
    lastModified: new Date(file.lastModified),
    mimeType: file.mimeType ?? "",
    name: file.name,
    periodId: file.periodId ?? defaultTenantScope.periodId,
    sizeBytes: BigInt(file.sizeBytes),
    storageKey: file.storageKey ?? "",
    tenantId: file.tenantId ?? defaultTenantScope.tenantId,
    updatedAt: file.updatedAt ?? file.createdAt,
    updatedBy: file.updatedBy ?? file.createdBy,
  };
}

describe("document center prisma repository", () => {
  test("upserts a system folder by tenant scoped id", async () => {
    const calls: unknown[] = [];
    const repository = createDocumentCenterPrismaRepository({
      documentFile: {
        async create() {
          throw new Error("not used");
        },
        async findMany() {
          return [];
        },
      },
      documentFolder: {
        async findMany() {
          return [];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            files: [],
          };
        },
      },
    });

    const saved = await repository.upsertFolder(baseFolder);

    expect(calls).toEqual([
      {
        where: { id: baseFolder.id },
        create: expect.objectContaining({
          accessLevel: "public",
          canDelete: false,
          companyId: defaultTenantScope.companyId,
          id: baseFolder.id,
          isSystem: true,
          name: "Sözleşmeler",
          systemKey: "contracts",
          tenantId: defaultTenantScope.tenantId,
        }),
        update: expect.objectContaining({
          accessLevel: "public",
          canDelete: false,
          name: "Sözleşmeler",
          systemKey: "contracts",
        }),
      },
    ]);
    expect(saved).toEqual(expect.objectContaining(baseFolder));
  });

  test("lists folders and files only in the active tenant scope", async () => {
    const repository = createDocumentCenterPrismaRepository({
      documentFile: {
        async create() {
          throw new Error("not used");
        },
        async findMany() {
          return [
            {
              ...baseFile,
              companyId: defaultTenantScope.companyId,
              fileType: "pdf",
              lastModified: new Date(baseFile.lastModified),
              mimeType: "application/pdf",
              periodId: defaultTenantScope.periodId,
              sizeBytes: BigInt(640_000),
              storageKey: "tenant-noa-demo/company-demo-insaat/contracts/hakedis.pdf",
              tenantId: defaultTenantScope.tenantId,
              updatedAt: "2026-07-01T10:05:00.000Z",
              updatedBy: defaultTenantScope.userId,
            },
          ];
        },
      },
      documentFolder: {
        async findMany(input) {
          expect(input).toEqual({
            where: {
              tenantId: defaultTenantScope.tenantId,
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
              deletedAt: null,
            },
            orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
            include: { files: false },
          });

          return [
            {
              ...baseFolder,
              companyId: defaultTenantScope.companyId,
              sizeBytes: BigInt(0),
              files: [],
              periodId: defaultTenantScope.periodId,
              tenantId: defaultTenantScope.tenantId,
              updatedAt: "2026-07-01T10:00:00.000Z",
              updatedBy: "Sistem",
            },
          ];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.listFolders({ scope: defaultTenantScope })).resolves.toEqual([
      baseFolder,
    ]);
    await expect(repository.listFiles({ scope: defaultTenantScope })).resolves.toEqual([
      baseFile,
    ]);
  });

  test("creates file metadata and updates folder counters", async () => {
    const calls: unknown[] = [];
    const repository = createDocumentCenterPrismaRepository({
      documentFile: {
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            fileType: input.data.fileType,
            sizeBytes: BigInt(input.data.sizeBytes),
          };
        },
        async findMany() {
          return [];
        },
      },
      documentFolder: {
        async findMany() {
          return [];
        },
        async update(input) {
          calls.push(input);

          return {
            ...baseFolder,
            companyId: defaultTenantScope.companyId,
            fileCount: 1,
            sizeBytes: BigInt(640_000),
            files: [],
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
            updatedAt: "2026-07-01T10:05:00.000Z",
            updatedBy: defaultTenantScope.userId,
          };
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.createFile(baseFile)).resolves.toEqual(baseFile);
    await expect(
      repository.incrementFolderUsage({
        fileSizeBytes: 640_000,
        folderId: baseFolder.id,
        scope: defaultTenantScope,
        updatedAt: baseFile.updatedAt!,
        updatedBy: baseFile.updatedBy!,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        fileCount: 1,
        sizeBytes: 640_000,
      }),
    );
    expect(calls).toEqual([
      {
        data: expect.objectContaining({
          fileType: "pdf",
          folderId: baseFolder.id,
          name: "hakediş.pdf",
          sizeBytes: BigInt(640_000),
          storageKey: "tenant-noa-demo/company-demo-insaat/contracts/hakedis.pdf",
        }),
      },
      {
        where: { id: baseFolder.id },
        data: {
          fileCount: { increment: 1 },
          sizeBytes: { increment: BigInt(640_000) },
          updatedAt: new Date("2026-07-01T10:05:00.000Z"),
          updatedBy: defaultTenantScope.userId,
        },
      },
    ]);
  });

  test("maps linked source module fields while creating and reading file metadata", async () => {
    const linkedFile: DocumentFileRow = {
      ...baseFile,
      linkedModule: "faturalar",
      linkedRecordId: "FAT-0001",
      linkedRecordLabel: "FAT-0001 - ABC Beton",
    };
    const calls: unknown[] = [];
    const repository = createDocumentCenterPrismaRepository({
      documentFile: {
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            fileType: input.data.fileType,
            sizeBytes: BigInt(input.data.sizeBytes),
          };
        },
        async findMany() {
          return [
            {
              ...toPrismaDocumentFileRecord(linkedFile),
              linkedModule: "faturalar",
              linkedRecordId: "FAT-0001",
              linkedRecordLabel: "FAT-0001 - ABC Beton",
            },
          ];
        },
      },
      documentFolder: {
        async findMany() {
          return [];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.createFile(linkedFile)).resolves.toEqual(linkedFile);
    await expect(repository.listFiles({ scope: defaultTenantScope })).resolves.toEqual([
      linkedFile,
    ]);
    expect(calls).toEqual([
      {
        data: expect.objectContaining({
          linkedModule: "faturalar",
          linkedRecordId: "FAT-0001",
          linkedRecordLabel: "FAT-0001 - ABC Beton",
        }),
      },
    ]);
  });
  test("soft deletes file metadata and lists trashed files separately", async () => {
    const calls: unknown[] = [];
    const deletedAt = "2026-07-01T10:15:00.000Z";
    const repository = createDocumentCenterPrismaRepository({
      documentFile: {
        async create() {
          throw new Error("not used");
        },
        async findFirst(input) {
          calls.push(input);

          return {
            ...toPrismaDocumentFileRecord(baseFile),
            deletedAt,
            updatedAt: deletedAt,
            updatedBy: defaultTenantScope.userId,
          };
        },
        async findMany(input) {
          calls.push(input);

          return [
            {
              ...toPrismaDocumentFileRecord(baseFile),
              deletedAt,
              updatedAt: deletedAt,
              updatedBy: defaultTenantScope.userId,
            },
          ];
        },
        async updateMany(input) {
          calls.push(input);

          return { count: 1 };
        },
      },
      documentFolder: {
        async findMany() {
          return [];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.moveFileToTrash({
        deletedAt,
        fileId: baseFile.id,
        scope: defaultTenantScope,
        updatedAt: deletedAt,
        updatedBy: defaultTenantScope.userId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        deletedAt,
        id: baseFile.id,
        updatedAt: deletedAt,
      }),
    );
    await expect(
      repository.listTrashedFiles({ scope: defaultTenantScope }),
    ).resolves.toEqual([
      expect.objectContaining({
        deletedAt,
        id: baseFile.id,
      }),
    ]);
    expect(calls).toEqual([
      {
        where: {
          id: baseFile.id,
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(deletedAt),
          updatedAt: new Date(deletedAt),
          updatedBy: defaultTenantScope.userId,
        },
      },
      {
        where: {
          id: baseFile.id,
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
        },
      },
      {
        where: {
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          deletedAt: { not: null },
        },
        orderBy: [{ updatedAt: "desc" }],
      },
    ]);
  });

  test("restores trashed file metadata and returns it to active scope", async () => {
    const calls: unknown[] = [];
    const restoredAt = "2026-07-01T10:20:00.000Z";
    const repository = createDocumentCenterPrismaRepository({
      documentFile: {
        async create() {
          throw new Error("not used");
        },
        async findFirst(input) {
          calls.push(input);

          return {
            ...toPrismaDocumentFileRecord(baseFile),
            deletedAt: null,
            updatedAt: restoredAt,
            updatedBy: defaultTenantScope.userId,
          };
        },
        async findMany(input) {
          calls.push(input);

          return [
            {
              ...toPrismaDocumentFileRecord(baseFile),
              deletedAt: null,
              updatedAt: restoredAt,
              updatedBy: defaultTenantScope.userId,
            },
          ];
        },
        async updateMany(input) {
          calls.push(input);

          return { count: 1 };
        },
      },
      documentFolder: {
        async findMany() {
          return [];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.restoreFileFromTrash({
        fileId: baseFile.id,
        scope: defaultTenantScope,
        updatedAt: restoredAt,
        updatedBy: defaultTenantScope.userId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        deletedAt: undefined,
        id: baseFile.id,
        updatedAt: restoredAt,
      }),
    );
    await expect(repository.listFiles({ scope: defaultTenantScope })).resolves.toEqual([
      expect.objectContaining({
        deletedAt: undefined,
        id: baseFile.id,
      }),
    ]);
    expect(calls).toEqual([
      {
        where: {
          id: baseFile.id,
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          deletedAt: { not: null },
        },
        data: {
          deletedAt: null,
          updatedAt: new Date(restoredAt),
          updatedBy: defaultTenantScope.userId,
        },
      },
      {
        where: {
          id: baseFile.id,
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
        },
      },
      {
        where: {
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
      },
    ]);
  });

  test("purges trashed file metadata older than the retention cutoff", async () => {
    const calls: unknown[] = [];
    const deletedBefore = "2026-07-16T10:15:00.000Z";
    const deletedFile = {
      ...toPrismaDocumentFileRecord(baseFile),
      deletedAt: "2026-07-01T10:15:00.000Z",
      updatedAt: "2026-07-01T10:15:00.000Z",
    };
    const repository = createDocumentCenterPrismaRepository({
      documentFile: {
        async create() {
          throw new Error("not used");
        },
        async deleteMany(input) {
          calls.push(input);

          return { count: 1 };
        },
        async findMany(input) {
          calls.push(input);

          return [deletedFile];
        },
        async updateMany() {
          throw new Error("not used");
        },
      },
      documentFolder: {
        async findMany() {
          return [];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.purgeTrashedFiles({
        deletedBefore,
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        deletedAt: "2026-07-01T10:15:00.000Z",
        id: baseFile.id,
        storageKey: baseFile.storageKey,
      }),
    ]);
    expect(calls).toEqual([
      {
        where: {
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          deletedAt: { lt: new Date(deletedBefore) },
        },
        orderBy: [{ deletedAt: "asc" }],
      },
      {
        where: {
          tenantId: defaultTenantScope.tenantId,
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          deletedAt: { lt: new Date(deletedBefore) },
        },
      },
    ]);
  });
});

