import { describe, expect, it, vi } from "vitest";

import { createAnnouncementService } from "./announcement-service";
import type {
  AnnouncementRepository,
  AnnouncementRow,
} from "./announcement-prisma-repository";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

const timestamp = "2026-07-30T20:00:00.000Z";
const adminScope: TenantScope = {
  ...defaultTenantScope,
  userId: "user-admin",
  userRole: "admin",
};
const viewerScope: TenantScope = {
  ...defaultTenantScope,
  userId: "user-viewer",
  userRole: "viewer",
};

function setup(initialRows: AnnouncementRow[] = []) {
  let rows = [...initialRows];
  const repository: AnnouncementRepository = {
    create: vi.fn(async (row) => {
      rows.push(row);
      return row;
    }),
    findByCreateKey: vi.fn(async ({ announcementKey, scope, visibility }) =>
      rows.find((row) =>
        row.announcementKey === announcementKey
        && inScope(row, scope)
        && visible(row, visibility.mode)
      ) ?? null),
    findById: vi.fn(async ({ id, scope, visibility }) =>
      rows.find((row) => row.id === id && inScope(row, scope) && visible(row, visibility.mode))
      ?? null),
    list: vi.fn(async ({ scope, visibility }) =>
      rows.filter((row) => inScope(row, scope) && visible(row, visibility.mode))),
    transition: vi.fn(async ({ row }) => {
      rows = rows.map((item) => item.id === row.id ? row : item);
      return row;
    }),
    updateDraft: vi.fn(async ({ row }) => {
      rows = rows.map((item) => item.id === row.id ? row : item);
      return row;
    }),
  };
  const audit = { record: vi.fn(async () => undefined) };
  const service = createAnnouncementService({
    auditLogRepository: audit,
    createId: () => "announcement-created",
    now: () => timestamp,
    repository,
  });
  return { audit, repository, service };
}

describe("announcement service", () => {
  it("creates one scoped draft and keeps content out of audit", async () => {
    const { audit, repository, service } = setup();
    const values = draftValues();
    const result = await service.create({ scope: adminScope, values });

    expect(result).toEqual({
      data: {
        announcement: expect.objectContaining({
          id: "announcement-created",
          revisionNo: 1,
          status: "DRAFT",
          title: values.title,
        }),
        idempotent: false,
      },
      ok: true,
    });
    expect(repository.create).toHaveBeenCalledTimes(1);
    const auditJson = JSON.stringify(
      (audit.record.mock.calls as unknown as Array<[unknown]>)[0]?.[0],
    );
    expect(auditJson).not.toContain(values.title);
    expect(auditJson).not.toContain(values.summary);
    expect(auditJson).not.toContain(values.content);
    expect(auditJson).not.toContain(values.requestKey);
  });

  it("returns an existing draft for a repeated create request", async () => {
    const { audit, repository, service } = setup();
    const values = draftValues();
    await service.create({ scope: adminScope, values });
    const retry = await service.create({ scope: adminScope, values });
    expect(retry).toEqual(expect.objectContaining({
      data: expect.objectContaining({ idempotent: true }),
      ok: true,
    }));
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it("keeps draft and archived rows invisible to non-admin readers", async () => {
    const published = row({ id: "published", status: "PUBLISHED" });
    const draft = row({ id: "draft", status: "DRAFT" });
    const archived = row({ id: "archived", status: "ARCHIVED" });
    const { service } = setup([published, draft, archived]);
    await expect(service.list({ scope: viewerScope })).resolves.toEqual({
      data: { announcements: [published] },
      ok: true,
    });
    await expect(service.get({
      announcementId: draft.id,
      scope: viewerScope,
    })).resolves.toEqual({
      errors: ["Duyuru aktif kapsamda bulunamadı."],
      ok: false,
    });
    await expect(service.list({ scope: adminScope })).resolves.toEqual({
      data: { announcements: [published, draft, archived] },
      ok: true,
    });
  });

  it("updates a draft with an optimistic revision and idempotent request", async () => {
    const initial = row();
    const { audit, repository, service } = setup([initial]);
    const values = {
      announcementId: initial.id,
      category: "MAINTENANCE" as const,
      content: "Planlı bakım ayrıntısı.",
      expectedRevisionNo: 1,
      priority: "IMPORTANT" as const,
      requestKey: "update-1",
      summary: "Planlı bakım özeti",
      title: "Planlı bakım",
    };
    const first = await service.updateDraft({ scope: adminScope, values });
    const retry = await service.updateDraft({ scope: adminScope, values });
    expect(first).toEqual(expect.objectContaining({
      data: {
        announcement: expect.objectContaining({ revisionNo: 2, title: values.title }),
        idempotent: false,
      },
      ok: true,
    }));
    expect(retry).toEqual(expect.objectContaining({
      data: expect.objectContaining({ idempotent: true }),
      ok: true,
    }));
    expect(repository.updateDraft).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it("rejects stale draft updates and published content edits", async () => {
    const draft = row({ revisionNo: 2 });
    const draftSetup = setup([draft]);
    await expect(draftSetup.service.updateDraft({
      scope: adminScope,
      values: { ...draftValues(), announcementId: draft.id, expectedRevisionNo: 1 },
    })).resolves.toEqual({
      errors: ["Duyuru başka bir işlemle güncellendi; güncel kaydı yeniden açın."],
      ok: false,
    });

    const published = row({ status: "PUBLISHED" });
    const publishedSetup = setup([published]);
    await expect(publishedSetup.service.updateDraft({
      scope: adminScope,
      values: { ...draftValues(), announcementId: published.id, expectedRevisionNo: 1 },
    })).resolves.toEqual({
      errors: ["Yalnız taslak duyuru düzenlenebilir."],
      ok: false,
    });
  });

  it("publishes then archives in order and keeps retries idempotent", async () => {
    const { audit, repository, service } = setup([row()]);
    const publishInput = {
      announcementId: "announcement-1",
      requestKey: "publish-1",
      scope: adminScope,
    };
    const published = await service.publish(publishInput);
    const publishRetry = await service.publish(publishInput);
    const archived = await service.archive({
      announcementId: "announcement-1",
      requestKey: "archive-1",
      scope: adminScope,
    });
    const oldPublishRetry = await service.publish(publishInput);
    expect(published).toEqual(expect.objectContaining({
      data: {
        announcement: expect.objectContaining({
          publishedAt: timestamp,
          revisionNo: 2,
          status: "PUBLISHED",
        }),
        idempotent: false,
      },
      ok: true,
    }));
    expect(publishRetry).toEqual(expect.objectContaining({
      data: expect.objectContaining({ idempotent: true }),
    }));
    expect(archived).toEqual(expect.objectContaining({
      data: {
        announcement: expect.objectContaining({
          archivedAt: timestamp,
          revisionNo: 3,
          status: "ARCHIVED",
        }),
        idempotent: false,
      },
      ok: true,
    }));
    expect(oldPublishRetry).toEqual(expect.objectContaining({
      data: {
        announcement: expect.objectContaining({ status: "ARCHIVED" }),
        idempotent: true,
      },
      ok: true,
    }));
    expect(repository.transition).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenCalledTimes(2);
  });

  it("rejects viewer and closed-period mutations before repository reads", async () => {
    const denied = setup([row()]);
    await expect(denied.service.publish({
      announcementId: "announcement-1",
      requestKey: "publish-1",
      scope: viewerScope,
    })).resolves.toEqual({
      errors: ["Bilgi Merkezi duyurularını yalnız yönetici düzenleyebilir."],
      ok: false,
    });
    await expect(denied.service.create({
      scope: { ...adminScope, periodClosed: true },
      values: draftValues(),
    })).resolves.toEqual({
      errors: ["Kapalı dönemde Bilgi Merkezi duyurusu değiştirilemez."],
      ok: false,
    });
    expect(denied.repository.findById).not.toHaveBeenCalled();
    expect(denied.repository.create).not.toHaveBeenCalled();
  });
});

function draftValues() {
  return {
    category: "UPDATE" as const,
    content: "Yeni rapor ekranı kullanıma açıldı.",
    priority: "NORMAL" as const,
    requestKey: "request-1",
    summary: "Rapor ekranı güncellendi.",
    title: "Gizli olmayan ama audit dışı başlık",
  };
}

function row(overrides: Partial<AnnouncementRow> = {}): AnnouncementRow {
  return {
    announcementKey: "user-admin::request-1",
    archiveRequestKey: null,
    archivedAt: null,
    category: "UPDATE",
    companyId: adminScope.companyId,
    content: "İçerik",
    createdAt: timestamp,
    createdBy: adminScope.userId,
    id: "announcement-1",
    lastUpdateKey: null,
    periodId: adminScope.periodId,
    priority: "NORMAL",
    publishRequestKey: null,
    publishedAt: null,
    revisionNo: 1,
    status: "DRAFT",
    summary: "Özet",
    tenantId: adminScope.tenantId,
    title: "Başlık",
    updatedAt: timestamp,
    updatedBy: adminScope.userId,
    ...overrides,
  };
}

function inScope(row: AnnouncementRow, scope: TenantScope) {
  return row.tenantId === scope.tenantId
    && row.companyId === scope.companyId
    && row.periodId === scope.periodId;
}
function visible(row: AnnouncementRow, mode: "all" | "published") {
  return mode === "all" || row.status === "PUBLISHED";
}
