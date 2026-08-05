import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const auditRecord = vi.fn();
  const ensureScope = vi.fn();
  const revalidatePath = vi.fn();
  const sessionState = vi.fn();
  const repository = {
    create: vi.fn(async (row) => row),
    findByCreateKey: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    transition: vi.fn(async ({ row }) => row),
    updateDraft: vi.fn(async ({ row }) => row),
  };
  return {
    auditRecord,
    ensureScope,
    prisma: {},
    repository,
    revalidatePath,
    sessionState,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/server-active-scope", () => ({
  requireActiveSessionState: mocks.sessionState,
}));
vi.mock("@/lib/audit-log-prisma-repository", () => ({
  createAuditLogPrismaRepository: () => ({ record: mocks.auditRecord }),
}));
vi.mock("@/lib/announcement-prisma-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/announcement-prisma-repository")
  >("@/lib/announcement-prisma-repository");
  return {
    ...actual,
    createAnnouncementPrismaRepository: () => mocks.repository,
  };
});

import {
  archiveAnnouncementAction,
  createAnnouncementAction,
  getAnnouncementAction,
  listAnnouncementsAction,
  publishAnnouncementAction,
} from "./announcement-actions";

const activeScope = {
  tenantId: "tenant-announcement",
  tenantName: "Tenant",
  companyId: "company-announcement",
  companyName: "Şirket",
  periodId: "period-announcement",
  periodLabel: "2026",
  userId: "admin-announcement",
  userName: "Duyuru Yöneticisi",
  userRole: "admin" as const,
  licenseLabel: "Kurumsal",
  periodClosed: false,
};

describe("announcement actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionState.mockResolvedValue({ scope: activeScope });
    mocks.ensureScope.mockResolvedValue(undefined);
    mocks.auditRecord.mockResolvedValue(undefined);
    mocks.repository.findByCreateKey.mockResolvedValue(null);
    mocks.repository.findById.mockResolvedValue(null);
    mocks.repository.list.mockResolvedValue([]);
  });

  it("re-resolves session scope, creates a draft and audits no content", async () => {
    const result = await createAnnouncementAction({
      category: "NEWS",
      content: "Gizli olmayan fakat audit dışı uzun içerik",
      priority: "IMPORTANT",
      requestKey: "create-1",
      summary: "Audit dışı özet",
      title: "Audit dışı başlık",
    });
    expect(result).toEqual(expect.objectContaining({
      data: {
        announcement: expect.objectContaining({ status: "DRAFT" }),
        idempotent: false,
      },
      ok: true,
    }));
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    const auditJson = JSON.stringify(
      (mocks.auditRecord.mock.calls as unknown as Array<[unknown]>)[0]?.[0],
    );
    expect(auditJson).not.toContain("Audit dışı");
    expect(auditJson).not.toContain("create-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/bilgi-merkezi");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/[module]", "page");
  });

  it("uses published-only visibility for viewer list and detail reads", async () => {
    const viewerScope = { ...activeScope, userId: "viewer-1", userRole: "viewer" as const };
    mocks.sessionState.mockResolvedValue({ scope: viewerScope });
    await listAnnouncementsAction();
    await getAnnouncementAction("announcement-foreign");
    expect(mocks.repository.list).toHaveBeenCalledWith({
      scope: viewerScope,
      visibility: { mode: "published" },
    });
    expect(mocks.repository.findById).toHaveBeenCalledWith({
      id: "announcement-foreign",
      scope: viewerScope,
      visibility: { mode: "published" },
    });
  });

  it("rejects viewer publication before a repository read", async () => {
    mocks.sessionState.mockResolvedValue({
      scope: { ...activeScope, userId: "viewer-1", userRole: "viewer" as const },
    });
    await expect(publishAnnouncementAction({
      announcementId: "announcement-1",
      requestKey: "publish-1",
    })).resolves.toEqual({
      errors: ["Bilgi Merkezi duyurularını yalnız yönetici düzenleyebilir."],
      ok: false,
    });
    expect(mocks.repository.findById).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects closed-period archive before a repository read", async () => {
    mocks.sessionState.mockResolvedValue({
      scope: { ...activeScope, periodClosed: true },
    });
    await expect(archiveAnnouncementAction({
      announcementId: "announcement-1",
      requestKey: "archive-1",
    })).resolves.toEqual({
      errors: ["Kapalı dönemde Bilgi Merkezi duyurusu değiştirilemez."],
      ok: false,
    });
    expect(mocks.repository.findById).not.toHaveBeenCalled();
    expect(mocks.auditRecord).not.toHaveBeenCalled();
  });
});
