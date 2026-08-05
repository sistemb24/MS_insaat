/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  archiveAnnouncementAction: vi.fn(),
  createAnnouncementAction: vi.fn(),
  getAnnouncementAction: vi.fn(),
  listAnnouncementsAction: vi.fn(),
  publishAnnouncementAction: vi.fn(),
  updateAnnouncementDraftAction: vi.fn(),
}));

vi.mock("@/app/actions/announcement-actions", () => actions);

import { AnnouncementCenterSurface } from "./announcement-center-surface";

const timestamp = "2026-07-30T20:00:00.000Z";

describe("AnnouncementCenterSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-07-30T21:00:00.000Z"));
    actions.listAnnouncementsAction.mockResolvedValue({
      data: { announcements: rows() },
      ok: true,
    });
    actions.getAnnouncementAction.mockResolvedValue({
      data: { announcement: rows()[0] },
      ok: true,
    });
    actions.createAnnouncementAction.mockResolvedValue({
      data: { announcement: rows()[1], idempotent: false },
      ok: true,
    });
    actions.updateAnnouncementDraftAction.mockResolvedValue({
      data: { announcement: { ...rows()[1], revisionNo: 2 }, idempotent: false },
      ok: true,
    });
    actions.publishAnnouncementAction.mockResolvedValue({
      data: {
        announcement: { ...rows()[1], publishedAt: timestamp, status: "PUBLISHED" },
        idempotent: false,
      },
      ok: true,
    });
    actions.archiveAnnouncementAction.mockResolvedValue({
      data: {
        announcement: { ...rows()[0], archivedAt: timestamp, status: "ARCHIVED" },
        idempotent: false,
      },
      ok: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("loads a deep-linked announcement with source-aligned badges", async () => {
    render(
      <AnnouncementCenterSurface
        canManage
        initialAnnouncementId="announcement-published"
        isAdmin
      />,
    );
    expect(await screen.findByRole("heading", { name: "Bilgi Merkezi" })).toBeTruthy();
    expect((await screen.findByRole("dialog")).getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { level: 2, name: "Yeni rapor ekranı" })).toBeTruthy();
    expect(screen.getAllByText("YENİ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Şirket Duyurusu").length).toBeGreaterThan(0);
  });

  it("filters cards by category and query with an accessible empty state", async () => {
    render(<AnnouncementCenterSurface canManage={false} isAdmin={false} />);
    await screen.findByText("Yeni rapor ekranı");
    fireEvent.change(screen.getByLabelText("Kategoriye göre filtrele"), {
      target: { value: "MAINTENANCE" },
    });
    expect(screen.getByText("Planlı bakım taslağı")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Bilgi Merkezi içeriklerinde ara"), {
      target: { value: "bulunmayan" },
    });
    expect(screen.getByText("Bu filtrede Bilgi Merkezi içeriği bulunmuyor.")).toBeTruthy();
  });

  it("keeps management controls out of viewer DOM", async () => {
    render(
      <AnnouncementCenterSurface
        canManage={false}
        initialAnnouncementId="announcement-published"
        isAdmin={false}
      />,
    );
    await screen.findByRole("heading", { level: 2, name: "Yeni rapor ekranı" });
    expect(screen.queryByRole("button", { name: "Yeni duyuru" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Duyuruyu arşivle" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Taslağı düzenle" })).toBeNull();
  });

  it("creates a labeled draft with an opaque request key", async () => {
    render(<AnnouncementCenterSurface canManage isAdmin />);
    fireEvent.click(await screen.findByRole("button", { name: "Yeni duyuru" }));
    fireEvent.change(screen.getByLabelText("Başlık"), { target: { value: "Yeni başlık" } });
    fireEvent.change(screen.getByLabelText("Kısa özet"), { target: { value: "Yeni özet" } });
    fireEvent.change(screen.getByLabelText("İçerik"), { target: { value: "Yeni içerik" } });
    fireEvent.click(screen.getByRole("button", { name: "Taslağı oluştur" }));
    await waitFor(() => expect(actions.createAnnouncementAction).toHaveBeenCalledWith({
      category: "ANNOUNCEMENT",
      content: "Yeni içerik",
      priority: "NORMAL",
      requestKey: expect.any(String),
      summary: "Yeni özet",
      title: "Yeni başlık",
    }));
  });

  it("publishes a draft through an explicit admin action", async () => {
    actions.getAnnouncementAction.mockResolvedValue({
      data: { announcement: rows()[1] },
      ok: true,
    });
    render(
      <AnnouncementCenterSurface
        canManage
        initialAnnouncementId="announcement-draft"
        isAdmin
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Duyuruyu yayımla" }));
    await waitFor(() => expect(actions.publishAnnouncementAction).toHaveBeenCalledWith({
      announcementId: "announcement-draft",
      requestKey: expect.any(String),
    }));
  });
});

function rows() {
  return [
    {
      announcementKey: "key-published",
      archiveRequestKey: null,
      archivedAt: null,
      category: "UPDATE" as const,
      companyId: "company",
      content: "Yeni rapor ekranının ayrıntılı kullanımı.",
      createdAt: timestamp,
      createdBy: "admin",
      id: "announcement-published",
      lastUpdateKey: null,
      periodId: "period",
      priority: "IMPORTANT" as const,
      publishRequestKey: "publish-key",
      publishedAt: timestamp,
      revisionNo: 2,
      status: "PUBLISHED" as const,
      summary: "Rapor ekranı kullanıma açıldı.",
      tenantId: "tenant",
      title: "Yeni rapor ekranı",
      updatedAt: timestamp,
      updatedBy: "admin",
    },
    {
      announcementKey: "key-draft",
      archiveRequestKey: null,
      archivedAt: null,
      category: "MAINTENANCE" as const,
      companyId: "company",
      content: "Bakım ayrıntısı.",
      createdAt: timestamp,
      createdBy: "admin",
      id: "announcement-draft",
      lastUpdateKey: null,
      periodId: "period",
      priority: "NORMAL" as const,
      publishRequestKey: null,
      publishedAt: null,
      revisionNo: 1,
      status: "DRAFT" as const,
      summary: "Bakım özeti.",
      tenantId: "tenant",
      title: "Planlı bakım taslağı",
      updatedAt: timestamp,
      updatedBy: "admin",
    },
  ];
}
