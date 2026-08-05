import { describe, expect, it } from "vitest";

import {
  SAFETY_CHECKLIST_MAX_ITEM_COUNT,
  SAFETY_CHECKLIST_MAX_NOTE_LENGTH,
  assertSafetyChecklistRunComplete,
  assertSafetyChecklistTransition,
  canTransitionSafetyChecklistRunStatus,
  canTransitionSafetyChecklistTemplateStatus,
  createSafetyChecklistResponseDraft,
  createSafetyChecklistRunDraft,
  createSafetyChecklistTemplateDraft,
  getMobileSafetyChecklistPermission,
  getSafetyChecklistResponseKey,
  getSafetyChecklistRunKey,
  normalizeSafetyChecklistDate,
  normalizeSafetyChecklistText,
} from "./mobile-safety-checklist";

describe("mobile safety checklist drafts", () => {
  it("creates a normalized active template with ordered unique items", () => {
    expect(createSafetyChecklistTemplateDraft({
      description: "  Günlük   saha kontrolü ",
      items: [
        { category: "  Şantiye ", title: " Baret kullanımı " },
        { category: "Elektrik", title: "Pano kapalı mı?" },
      ],
      title: "  Günlük  İSG Kontrolü ",
    })).toEqual({
      description: "Günlük saha kontrolü",
      items: [
        { category: "Şantiye", sortOrder: 1, title: "Baret kullanımı" },
        { category: "Elektrik", sortOrder: 2, title: "Pano kapalı mı?" },
      ],
      status: "ACTIVE",
      title: "Günlük İSG Kontrolü",
    });
  });

  it("rejects empty, duplicate, or oversized template items", () => {
    expect(() => createSafetyChecklistTemplateDraft({ items: [], title: "Şablon" }))
      .toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
    expect(() => createSafetyChecklistTemplateDraft({
      items: [{ title: "Baret" }, { title: "  baret " }],
      title: "Şablon",
    })).toThrow(expect.objectContaining({ code: "DUPLICATE_CHECKLIST_ITEM" }));
    expect(() => createSafetyChecklistTemplateDraft({
      items: Array.from({ length: SAFETY_CHECKLIST_MAX_ITEM_COUNT + 1 }, (_, index) => ({ title: `Madde ${index}` })),
      title: "Şablon",
    })).toThrow(expect.objectContaining({ code: "ITEM_LIMIT_EXCEEDED" }));
  });

  it("creates a draft run with a deterministic request key", () => {
    expect(createSafetyChecklistRunDraft({
      inspectedOn: "2026-07-30",
      inspectorName: "  Saha  Sorumlusu ",
      projectId: " project-1 ",
      requestKey: " request-1 ",
      templateId: " template-1 ",
    })).toEqual({
      inspectedOn: "2026-07-30",
      inspectorName: "Saha Sorumlusu",
      key: "template-1::project-1::2026-07-30::request-1",
      projectId: "project-1",
      status: "DRAFT",
      templateId: "template-1",
    });
    expect(getSafetyChecklistRunKey({
      inspectedOn: "2026-07-30",
      projectId: "project-1",
      requestKey: "request-1",
      templateId: "template-1",
    })).toBe("template-1::project-1::2026-07-30::request-1");
  });

  it("keeps one response per run-item pair and validates optional notes", () => {
    expect(createSafetyChecklistResponseDraft({
      checklistItemId: " item-1 ",
      checklistRunId: " run-1 ",
      note: "  Kablo kanalı açık ",
      response: "FAIL",
    })).toEqual({
      checklistItemId: "item-1",
      checklistRunId: "run-1",
      key: "run-1::item-1",
      note: "Kablo kanalı açık",
      response: "FAIL",
    });
    expect(getSafetyChecklistResponseKey({ checklistItemId: "item-1", checklistRunId: "run-1" })).toBe("run-1::item-1");
    expect(() => createSafetyChecklistResponseDraft({
      checklistItemId: "item-1",
      checklistRunId: "run-1",
      note: "a".repeat(SAFETY_CHECKLIST_MAX_NOTE_LENGTH + 1),
      response: "UNKNOWN" as "PASS",
    })).toThrow(expect.objectContaining({ code: "INVALID_RESPONSE" }));
    expect(() => createSafetyChecklistResponseDraft({
      checklistItemId: "item-1",
      checklistRunId: "run-1",
      note: "a".repeat(SAFETY_CHECKLIST_MAX_NOTE_LENGTH + 1),
      response: "PASS",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
  });
});

describe("mobile safety checklist safeguards", () => {
  it("requires every template item to be answered exactly once before completion", () => {
    expect(assertSafetyChecklistRunComplete({
      answeredItemIds: ["item-1", "item-2"],
      expectedItemIds: ["item-1", "item-2"],
    })).toEqual({ status: "COMPLETED" });
    expect(() => assertSafetyChecklistRunComplete({
      answeredItemIds: ["item-1"],
      expectedItemIds: ["item-1", "item-2"],
    })).toThrow(expect.objectContaining({ code: "INCOMPLETE_CHECKLIST" }));
    expect(() => assertSafetyChecklistRunComplete({
      answeredItemIds: ["item-1", "item-1"],
      expectedItemIds: ["item-1", "item-2"],
    })).toThrow(expect.objectContaining({ code: "INVALID_INPUT" }));
  });

  it("allows only archive and completion lifecycle transitions", () => {
    expect(canTransitionSafetyChecklistTemplateStatus("ACTIVE", "ARCHIVED")).toBe(true);
    expect(canTransitionSafetyChecklistTemplateStatus("ARCHIVED", "ACTIVE")).toBe(false);
    expect(canTransitionSafetyChecklistRunStatus("DRAFT", "COMPLETED")).toBe(true);
    expect(canTransitionSafetyChecklistRunStatus("COMPLETED", "DRAFT")).toBe(false);
    expect(() => assertSafetyChecklistTransition(false, "Kontrol yürütmesi"))
      .toThrow(expect.objectContaining({ code: "INVALID_TRANSITION" }));
  });

  it("keeps list access open and rejects viewer or closed-period mutations", () => {
    expect(getMobileSafetyChecklistPermission({ operation: "list", role: "viewer" })).toEqual({ allowed: true });
    expect(getMobileSafetyChecklistPermission({ operation: "create", role: "viewer" })).toEqual({
      allowed: false,
      reason: "Mobil İSG kontrol listesi için muhasebe veya yönetici yetkisi gereklidir.",
    });
    expect(getMobileSafetyChecklistPermission({ operation: "respond", periodClosed: true, role: "admin" })).toEqual({
      allowed: false,
      reason: "Kapalı dönemde mobil İSG kontrol listesi değiştirilemez.",
    });
    expect(getMobileSafetyChecklistPermission({ operation: "transition", role: "accounting" })).toEqual({ allowed: true });
  });

  it("normalizes whitespace and rejects impossible calendar dates", () => {
    expect(normalizeSafetyChecklistText("  Uygulanamaz\n\tmadde ")).toBe("Uygulanamaz madde");
    expect(normalizeSafetyChecklistDate("2024-02-29", "Tarih")).toBe("2024-02-29");
    expect(() => normalizeSafetyChecklistDate("2025-02-29", "Tarih"))
      .toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
  });
});
