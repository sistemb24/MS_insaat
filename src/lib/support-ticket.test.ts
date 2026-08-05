import { describe, expect, it } from "vitest";

import {
  SUPPORT_TICKET_MAX_MESSAGE_LENGTH,
  SUPPORT_TICKET_MAX_REQUEST_KEY_LENGTH,
  SUPPORT_TICKET_MAX_SUBJECT_LENGTH,
  assertSupportTicketTransition,
  canTransitionSupportTicketStatus,
  createSupportTicketDraft,
  createSupportTicketMessageDraft,
  getSupportTicketMessageRequestKey,
  getSupportTicketPermission,
  getSupportTicketRequestKey,
  getSupportTicketVisibility,
  normalizeSupportTicketMessage,
  normalizeSupportTicketStatus,
} from "./support-ticket";

describe("support ticket drafts", () => {
  it("normalizes a new open ticket without placing content in the idempotency key", () => {
    expect(createSupportTicketDraft({
      initialMessage: "  Rapor ekranında filtre\n  sonucu görünmüyor. ",
      priority: "HIGH",
      requesterUserId: " user-1 ",
      requestKey: " request-1 ",
      subject: "  Rapor   filtresi sorunu ",
      type: "TECHNICAL",
    })).toEqual({
      initialMessage: "Rapor ekranında filtre\nsonucu görünmüyor.",
      priority: "HIGH",
      requesterUserId: "user-1",
      status: "OPEN",
      subject: "Rapor filtresi sorunu",
      ticketKey: "user-1::request-1",
      type: "TECHNICAL",
    });
    expect(getSupportTicketRequestKey({ requestKey: "request-1", requesterUserId: "user-1" }))
      .toBe("user-1::request-1");
  });

  it("rejects missing, oversized, or unknown ticket values", () => {
    expect(() => createSupportTicketDraft({
      initialMessage: "Mesaj",
      priority: "HIGH",
      requesterUserId: "user-1",
      requestKey: "request-1",
      subject: "",
      type: "TECHNICAL",
    })).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    expect(() => createSupportTicketDraft({
      initialMessage: "Mesaj",
      priority: "HIGH",
      requesterUserId: "user-1",
      requestKey: "request-1",
      subject: "x".repeat(SUPPORT_TICKET_MAX_SUBJECT_LENGTH + 1),
      type: "TECHNICAL",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
    expect(() => createSupportTicketDraft({
      initialMessage: "Mesaj",
      priority: "URGENT" as "HIGH",
      requesterUserId: "user-1",
      requestKey: "request-1",
      subject: "Konu",
      type: "OTHER" as "TECHNICAL",
    })).toThrow(expect.objectContaining({ code: "INVALID_PRIORITY" }));
    expect(() => createSupportTicketDraft({
      initialMessage: "Mesaj",
      priority: "NORMAL",
      requesterUserId: "user-1",
      requestKey: "request-1",
      subject: "Konu",
      type: "OTHER" as "TECHNICAL",
    })).toThrow(expect.objectContaining({ code: "INVALID_TYPE" }));
  });

  it("creates an append-only message draft with an author-scoped request key", () => {
    expect(createSupportTicketMessageDraft({
      authorUserId: " user-1 ",
      body: " İlk satır\r\n  İkinci   satır ",
      requestKey: " reply-1 ",
      ticketId: " ticket-1 ",
    })).toEqual({
      authorUserId: "user-1",
      body: "İlk satır\nİkinci satır",
      messageKey: "ticket-1::user-1::reply-1",
      ticketId: "ticket-1",
    });
    expect(getSupportTicketMessageRequestKey({
      authorUserId: "user-1",
      requestKey: "reply-1",
      ticketId: "ticket-1",
    })).toBe("ticket-1::user-1::reply-1");
  });

  it("validates message and request-key limits", () => {
    expect(() => createSupportTicketMessageDraft({
      authorUserId: "user-1",
      body: "",
      requestKey: "reply-1",
      ticketId: "ticket-1",
    })).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    expect(() => createSupportTicketMessageDraft({
      authorUserId: "user-1",
      body: "x".repeat(SUPPORT_TICKET_MAX_MESSAGE_LENGTH + 1),
      requestKey: "reply-1",
      ticketId: "ticket-1",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
    expect(() => createSupportTicketMessageDraft({
      authorUserId: "user-1",
      body: "Mesaj",
      requestKey: "x".repeat(SUPPORT_TICKET_MAX_REQUEST_KEY_LENGTH + 1),
      ticketId: "ticket-1",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
    expect(normalizeSupportTicketMessage("  Birinci \n\n İkinci  ")).toBe("Birinci\n\nİkinci");
  });
});

describe("support ticket access and lifecycle", () => {
  it("allows only adjacent forward lifecycle transitions", () => {
    expect(canTransitionSupportTicketStatus("OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransitionSupportTicketStatus("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransitionSupportTicketStatus("RESOLVED", "CLOSED")).toBe(true);
    expect(canTransitionSupportTicketStatus("OPEN", "RESOLVED")).toBe(false);
    expect(canTransitionSupportTicketStatus("CLOSED", "OPEN")).toBe(false);
    expect(assertSupportTicketTransition("OPEN", "IN_PROGRESS")).toEqual({
      from: "OPEN",
      to: "IN_PROGRESS",
    });
    expect(() => assertSupportTicketTransition("RESOLVED", "IN_PROGRESS"))
      .toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
    expect(() => normalizeSupportTicketStatus("UNKNOWN"))
      .toThrow(expect.objectContaining({ code: "INVALID_STATUS" }));
  });

  it("limits scope-wide visibility to admin and everyone else to their own tickets", () => {
    expect(getSupportTicketVisibility({ actorUserId: "admin-1", role: "admin" }))
      .toEqual({ mode: "scope" });
    expect(getSupportTicketVisibility({ actorUserId: "accounting-1", role: "accounting" }))
      .toEqual({ mode: "own", requesterUserId: "accounting-1" });
    expect(getSupportTicketVisibility({ actorUserId: "viewer-1", role: "viewer" }))
      .toEqual({ mode: "own", requesterUserId: "viewer-1" });
  });

  it("lets every role create support requests without granting cross-owner access", () => {
    for (const role of ["admin", "accounting", "viewer"] as const) {
      expect(getSupportTicketPermission({
        actorUserId: `${role}-1`,
        operation: "create",
        role,
      })).toEqual({ allowed: true });
    }
    expect(getSupportTicketPermission({
      actorUserId: "viewer-1",
      operation: "reply",
      requesterUserId: "viewer-1",
      role: "viewer",
      status: "OPEN",
    })).toEqual({ allowed: true });
    expect(getSupportTicketPermission({
      actorUserId: "accounting-1",
      operation: "reply",
      requesterUserId: "viewer-1",
      role: "accounting",
      status: "OPEN",
    })).toEqual({
      allowed: false,
      reason: "Yalnız kendi destek talebinize mesaj ekleyebilirsiniz.",
    });
    expect(getSupportTicketPermission({
      actorUserId: "admin-1",
      operation: "reply",
      requesterUserId: "viewer-1",
      role: "admin",
      status: "IN_PROGRESS",
    })).toEqual({ allowed: true });
  });

  it("reserves status transitions for admin and rejects replies to closed tickets", () => {
    expect(getSupportTicketPermission({
      actorUserId: "admin-1",
      operation: "transition",
      role: "admin",
    })).toEqual({ allowed: true });
    expect(getSupportTicketPermission({
      actorUserId: "accounting-1",
      operation: "transition",
      role: "accounting",
    })).toEqual({
      allowed: false,
      reason: "Destek talebi durumunu yalnız yönetici değiştirebilir.",
    });
    expect(getSupportTicketPermission({
      actorUserId: "viewer-1",
      operation: "reply",
      requesterUserId: "viewer-1",
      role: "viewer",
      status: "CLOSED",
    })).toEqual({
      allowed: false,
      reason: "Kapatılmış destek talebine mesaj eklenemez.",
    });
    expect(() => getSupportTicketPermission({
      actorUserId: "viewer-1",
      operation: "reply",
      requesterUserId: "viewer-1",
      role: "viewer",
    })).toThrow(expect.objectContaining({ code: "INVALID_STATUS" }));
  });
});
