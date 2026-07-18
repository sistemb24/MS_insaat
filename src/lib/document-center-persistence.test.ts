import { describe, expect, test } from "vitest";

import {
  createDocumentCenterService,
  createSeededDocumentCenterMemoryRepository,
} from "./document-center-service";
import {
  defaultTenantScope,
  type TenantScope,
} from "./tenant-scope";

describe("document center persistence service", () => {
  test("ensures protected system folders once per tenant scope", async () => {
    const repository = createSeededDocumentCenterMemoryRepository();
    const service = createDocumentCenterService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository,
    });

    await expect(
      service.ensureSystemFolders({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        folders: expect.arrayContaining([
          expect.objectContaining({
            canDelete: false,
            canRename: false,
            companyId: defaultTenantScope.companyId,
            isSystem: true,
            name: "Sözleşmeler",
            periodId: defaultTenantScope.periodId,
            systemKey: "contracts",
            tenantId: defaultTenantScope.tenantId,
          }),
        ]),
      }),
    });

    await service.ensureSystemFolders({ scope: defaultTenantScope });

    const folders = await repository.listFolders({ scope: defaultTenantScope });
    expect(folders).toHaveLength(13);
    expect(folders.every((folder) => folder.createdBy === "Sistem")).toBe(true);
  });

  test("keeps folder rows isolated by tenant company period scope", async () => {
    const repository = createSeededDocumentCenterMemoryRepository();
    const service = createDocumentCenterService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository,
    });
    const secondScope: TenantScope = {
      ...defaultTenantScope,
      companyId: "company-second",
      companyName: "İKİNCİ İNŞAAT",
      periodId: "period-2027",
      periodLabel: "2027",
    };

    await service.ensureSystemFolders({ scope: defaultTenantScope });
    await service.ensureSystemFolders({ scope: secondScope });

    const firstFolders = await repository.listFolders({ scope: defaultTenantScope });
    const secondFolders = await repository.listFolders({ scope: secondScope });

    expect(firstFolders).toHaveLength(13);
    expect(secondFolders).toHaveLength(13);
    expect(firstFolders.every((folder) => folder.companyId === "company-demo-insaat")).toBe(true);
    expect(secondFolders.every((folder) => folder.companyId === "company-second")).toBe(true);
  });

  test("persists uploaded file metadata and increments target folder counters", async () => {
    const repository = createSeededDocumentCenterMemoryRepository();
    const service = createDocumentCenterService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository,
    });
    const systemFolders = await service.ensureSystemFolders({
      scope: defaultTenantScope,
    });

    expect(systemFolders.ok).toBe(true);
    if (!systemFolders.ok) {
      return;
    }

    const contractsFolder = systemFolders.data.folders.find(
      (folder) => folder.systemKey === "contracts",
    );

    expect(contractsFolder).toBeTruthy();
    if (!contractsFolder) {
      return;
    }

    const result = await service.createFileMetadata({
      scope: defaultTenantScope,
      storageKey: "tenant-noa-demo/company-demo-insaat/contracts/hakedis.pdf",
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

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        file: expect.objectContaining({
          companyId: defaultTenantScope.companyId,
          folderId: contractsFolder.id,
          kind: "pdf",
          name: "hakediş.pdf",
          sizeBytes: 640_000,
          storageKey: "tenant-noa-demo/company-demo-insaat/contracts/hakedis.pdf",
          tenantId: defaultTenantScope.tenantId,
        }),
      }),
    });

    const folders = await repository.listFolders({ scope: defaultTenantScope });
    expect(folders.find((folder) => folder.id === contractsFolder.id)).toEqual(
      expect.objectContaining({
        fileCount: 1,
        sizeBytes: 640_000,
      }),
    );
  });

  test("persists a user folder in the active tenant scope", async () => {
    const repository = createSeededDocumentCenterMemoryRepository();
    const service = createDocumentCenterService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository,
    });

    await service.ensureSystemFolders({ scope: defaultTenantScope });

    const result = await service.createUserFolder({
      scope: defaultTenantScope,
      values: {
        accessLevel: "restricted",
        name: "Proje Evrakları",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        folder: expect.objectContaining({
          accessLevel: "restricted",
          canDelete: true,
          canRename: true,
          companyId: defaultTenantScope.companyId,
          createdAt: "2026-07-01T10:00:00.000Z",
          createdBy: defaultTenantScope.userId,
          isSystem: false,
          name: "Proje Evrakları",
          periodId: defaultTenantScope.periodId,
          tenantId: defaultTenantScope.tenantId,
          updatedAt: "2026-07-01T10:00:00.000Z",
          updatedBy: defaultTenantScope.userId,
        }),
      },
    });

    const folders = await repository.listFolders({ scope: defaultTenantScope });

    expect(folders).toHaveLength(14);
    expect(folders.find((folder) => folder.name === "Proje Evrakları")).toEqual(
      result.ok ? result.data.folder : undefined,
    );
  });

  test("rejects metadata writes for users without document mutation permission", async () => {
    const repository = createSeededDocumentCenterMemoryRepository();
    const service = createDocumentCenterService({
      now: () => "2026-07-01T10:00:00.000Z",
      repository,
    });
    const viewerScope: TenantScope = {
      ...defaultTenantScope,
      userRole: "viewer",
    };

    expect(
      await service.createFileMetadata({
        scope: viewerScope,
        storageKey: "viewer/no-write.pdf",
        values: {
          file: {
            lastModified: 1_782_883_200_000,
            name: "no-write.pdf",
            size: 128_000,
            type: "application/pdf",
          },
          folderId: "any-folder",
        },
      }),
    ).toEqual({
      ok: false,
      errors: ["Döküman işlemi için muhasebe veya admin yetkisi gereklidir."],
    });
  });
});
