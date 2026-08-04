import { describe, expect, it, vi } from "vitest";

import {
  AnnouncementRepositoryError,
  createAnnouncementPrismaRepository,
  type AnnouncementPrismaClientLike,
  type AnnouncementRow,
} from "./announcement-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

const row: AnnouncementRow = {
  announcementKey: "admin::create-1",
  archiveRequestKey: null,
  archivedAt: null,
  category: "UPDATE",
  companyId: defaultTenantScope.companyId,
  content: "Yeni rapor ekranı kullanıma açıldı.",
  createdAt: "2026-07-30T10:00:00.000Z",
  createdBy: "user-admin",
  id: "announcement-1",
  lastUpdateKey: null,
  periodId: defaultTenantScope.periodId,
  priority: "IMPORTANT",
  publishRequestKey: null,
  publishedAt: null,
  revisionNo: 1,
  status: "DRAFT",
  summary: "Rapor ekranı güncellendi.",
  tenantId: defaultTenantScope.tenantId,
  title: "Yeni rapor ekranı",
  updatedAt: "2026-07-30T10:00:00.000Z",
  updatedBy: "user-admin",
};

function record(value: AnnouncementRow = row) {
  return {
    ...value,
    archivedAt: value.archivedAt ? new Date(value.archivedAt) : null,
    createdAt: new Date(value.createdAt),
    publishedAt: value.publishedAt ? new Date(value.publishedAt) : null,
    updatedAt: new Date(value.updatedAt),
  };
}

function setup(options: {
  findFirst?: ReturnType<typeof record> | null;
  findMany?: ReturnType<typeof record>[];
  updateCount?: number;
} = {}) {
  const announcement = {
    create: vi.fn().mockResolvedValue(record()),
    findFirst: vi.fn().mockResolvedValue(options.findFirst === undefined ? record() : options.findFirst),
    findMany: vi.fn().mockResolvedValue(options.findMany ?? [record()]),
    updateMany: vi.fn().mockResolvedValue({ count: options.updateCount ?? 1 }),
  };
  return {
    announcement,
    repository: createAnnouncementPrismaRepository({
      announcement,
    } as unknown as AnnouncementPrismaClientLike),
  };
}

describe("announcement prisma repository", () => {
  it("creates an additive scoped announcement row", async () => {
    const { announcement, repository } = setup();
    await expect(repository.create(row)).resolves.toEqual(row);
    expect(announcement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        announcementKey: row.announcementKey,
        companyId: row.companyId,
        periodId: row.periodId,
        tenantId: row.tenantId,
      }),
    });
  });

  it("limits non-admin list and detail reads to published rows", async () => {
    const { announcement, repository } = setup();
    await repository.list({
      scope: defaultTenantScope,
      visibility: { mode: "published" },
    });
    await repository.findById({
      id: row.id,
      scope: defaultTenantScope,
      visibility: { mode: "published" },
    });
    expect(announcement.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        companyId: row.companyId,
        periodId: row.periodId,
        status: "PUBLISHED",
        tenantId: row.tenantId,
      }),
    }));
    expect(announcement.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: row.id, status: "PUBLISHED" }),
    });
  });

  it("keeps admin reads scoped without a status restriction", async () => {
    const { announcement, repository } = setup();
    await repository.findByCreateKey({
      announcementKey: row.announcementKey,
      scope: defaultTenantScope,
      visibility: { mode: "all" },
    });
    expect(announcement.findFirst).toHaveBeenCalledWith({
      where: {
        announcementKey: row.announcementKey,
        companyId: row.companyId,
        periodId: row.periodId,
        tenantId: row.tenantId,
      },
    });
  });

  it("updates a draft only at the expected scope, status and revision", async () => {
    const { announcement, repository } = setup();
    await repository.updateDraft({
      expectedRevisionNo: 1,
      row: { ...row, lastUpdateKey: "update-1", revisionNo: 2 },
    });
    expect(announcement.updateMany).toHaveBeenCalledWith({
      data: expect.objectContaining({ lastUpdateKey: "update-1", revisionNo: 2 }),
      where: {
        companyId: row.companyId,
        id: row.id,
        periodId: row.periodId,
        revisionNo: 1,
        status: "DRAFT",
        tenantId: row.tenantId,
      },
    });
  });

  it("transitions with optimistic status and revision guards", async () => {
    const published = {
      ...row,
      publishRequestKey: "publish-1",
      publishedAt: "2026-07-30T11:00:00.000Z",
      revisionNo: 2,
      status: "PUBLISHED" as const,
    };
    const { announcement, repository } = setup({ findFirst: record(published) });
    await expect(repository.transition({
      expectedRevisionNo: 1,
      fromStatus: "DRAFT",
      row: published,
    })).resolves.toEqual(published);
    expect(announcement.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ revisionNo: 1, status: "DRAFT" }),
    }));
  });

  it("fails closed when optimistic scoped update changes no row", async () => {
    const { repository } = setup({ updateCount: 0 });
    await expect(repository.updateDraft({
      expectedRevisionNo: 1,
      row: { ...row, revisionNo: 2 },
    })).rejects.toThrow(AnnouncementRepositoryError);
  });
});
