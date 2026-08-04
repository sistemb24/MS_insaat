import { describe, expect, it } from "vitest";

import {
  ANNOUNCEMENT_MAX_CONTENT_LENGTH,
  AnnouncementDomainError,
  assertAnnouncementTransition,
  createAnnouncementDraft,
  getAnnouncementMutationRequestKey,
  getAnnouncementPermission,
  getAnnouncementVisibility,
  isAnnouncementNew,
  normalizeAnnouncementUpdate,
} from "./announcement";

describe("announcement domain", () => {
  it("normalizes a draft and creates an actor-scoped idempotency key", () => {
    expect(createAnnouncementDraft({
      actorUserId: " user-admin ",
      category: "UPDATE",
      content: " Yeni özellik \r\n kullanıma açıldı. ",
      priority: "IMPORTANT",
      requestKey: " request 001 ",
      summary: "  İş akışı   güncellendi ",
      title: "  Yeni   rapor ekranı ",
    })).toEqual({
      announcementKey: "user-admin::request%20001",
      category: "UPDATE",
      content: "Yeni özellik\nkullanıma açıldı.",
      priority: "IMPORTANT",
      revisionNo: 1,
      status: "DRAFT",
      summary: "İş akışı güncellendi",
      title: "Yeni rapor ekranı",
    });
  });

  it("normalizes draft update values and requires a positive revision", () => {
    expect(normalizeAnnouncementUpdate({
      announcementId: "announcement-1",
      category: "MAINTENANCE",
      content: "Planlı bakım.",
      expectedRevisionNo: 2,
      priority: "NORMAL",
      requestKey: "update-1",
      summary: "Kısa bakım",
      title: "Bakım duyurusu",
    })).toMatchObject({
      announcementId: "announcement-1",
      expectedRevisionNo: 2,
      mutationKey: "update-1",
    });
    expect(() => normalizeAnnouncementUpdate({
      announcementId: "announcement-1",
      category: "NEWS",
      content: "İçerik",
      expectedRevisionNo: 0,
      priority: "NORMAL",
      requestKey: "update-2",
      summary: "Özet",
      title: "Başlık",
    })).toThrowError(AnnouncementDomainError);
  });

  it("rejects empty, invalid and over-limit content", () => {
    expect(() => createAnnouncementDraft({
      actorUserId: "admin",
      category: "INVALID" as "NEWS",
      content: "İçerik",
      priority: "NORMAL",
      requestKey: "key",
      summary: "Özet",
      title: "Başlık",
    })).toThrow("Duyuru kategorisi geçersizdir.");
    expect(() => createAnnouncementDraft({
      actorUserId: "admin",
      category: "NEWS",
      content: "x".repeat(ANNOUNCEMENT_MAX_CONTENT_LENGTH + 1),
      priority: "NORMAL",
      requestKey: "key",
      summary: "Özet",
      title: "Başlık",
    })).toThrow("Duyuru içeriği en fazla");
  });

  it("keeps management admin-only and rejects closed-period writes", () => {
    expect(getAnnouncementPermission({
      operation: "create",
      periodClosed: false,
      role: "viewer",
    })).toMatchObject({ allowed: false });
    expect(getAnnouncementPermission({
      operation: "publish",
      periodClosed: true,
      role: "admin",
    })).toMatchObject({ allowed: false });
    expect(getAnnouncementPermission({
      operation: "update",
      periodClosed: false,
      role: "admin",
    })).toEqual({ allowed: true });
    expect(getAnnouncementPermission({
      operation: "list",
      periodClosed: true,
      role: "viewer",
    })).toEqual({ allowed: true });
  });

  it("shows every state to admins and published rows to other roles", () => {
    expect(getAnnouncementVisibility("admin")).toEqual({ mode: "all" });
    expect(getAnnouncementVisibility("accounting")).toEqual({ mode: "published" });
    expect(getAnnouncementVisibility("viewer")).toEqual({ mode: "published" });
  });

  it("allows only the forward announcement lifecycle", () => {
    expect(assertAnnouncementTransition("DRAFT", "PUBLISHED")).toEqual({
      from: "DRAFT",
      to: "PUBLISHED",
    });
    expect(assertAnnouncementTransition("PUBLISHED", "ARCHIVED")).toEqual({
      from: "PUBLISHED",
      to: "ARCHIVED",
    });
    expect(() => assertAnnouncementTransition("PUBLISHED", "DRAFT")).toThrow(
      "Duyuru yalnız Taslak → Yayımlandı → Arşivlendi sırasıyla ilerleyebilir.",
    );
    expect(() => assertAnnouncementTransition("DRAFT", "ARCHIVED")).toThrow(
      AnnouncementDomainError,
    );
  });

  it("builds content-free mutation keys", () => {
    expect(getAnnouncementMutationRequestKey({
      actorUserId: "admin",
      announcementId: "announcement-1",
      operation: "publish",
      requestKey: "publish 1",
    })).toBe("announcement-1::admin::publish::publish%201");
  });

  it("derives the new badge from a strict fourteen-day window", () => {
    expect(isAnnouncementNew({
      now: "2026-07-30T12:00:00.000Z",
      publishedAt: "2026-07-17T12:00:00.000Z",
    })).toBe(true);
    expect(isAnnouncementNew({
      now: "2026-07-30T12:00:00.000Z",
      publishedAt: "2026-07-16T12:00:00.000Z",
    })).toBe(false);
    expect(isAnnouncementNew({
      now: "2026-07-30T12:00:00.000Z",
      publishedAt: null,
    })).toBe(false);
  });
});
