import { describe, expect, it } from "vitest";

import {
  SAFETY_MAX_SUMMARY_LENGTH,
  SAFETY_MAX_TEXT_LENGTH,
  WorkplaceSafetyDomainError,
  assertSafetyTransition,
  canTransitionSafetyFindingStatus,
  canTransitionSafetyInspectionStatus,
  canTransitionSafetyPpeIssuanceStatus,
  canTransitionSafetyTrainingStatus,
  canTransitionSafetyWorkAccidentStatus,
  createSafetyFindingDraft,
  createSafetyInspectionDraft,
  createSafetyTrainingDraft,
  createSafetyWorkAccidentDraft,
  getSafetyPpeIssuanceKey,
  getSafetyTrainingAttendanceKey,
  getWorkplaceSafetyPermission,
  normalizeSafetyDate,
  normalizeSafetyText,
  validateSafetyPpeIssuance,
} from "./workplace-safety";

describe("workplace safety domain drafts", () => {
  it("creates normalized work accident drafts without sensitive health fields", () => {
    expect(createSafetyWorkAccidentDraft({
      classification: "  Hafif olay ",
      occurredOn: "2026-07-28",
      personnelId: " personnel-1 ",
      projectId: " project-1 ",
      summary: "  İskele   alanında kayma riski tespit edildi. ",
    })).toEqual({
      classification: "Hafif olay",
      occurredOn: "2026-07-28",
      personnelId: "personnel-1",
      projectId: "project-1",
      status: "DRAFT",
      summary: "İskele alanında kayma riski tespit edildi.",
    });
  });

  it("requires a classification, calendar date and summary for accident drafts", () => {
    for (const values of [
      { classification: "", occurredOn: "2026-07-28", summary: "Özet" },
      { classification: "Olay", occurredOn: "2026-02-30", summary: "Özet" },
      { classification: "Olay", occurredOn: "2026-07-28", summary: "" },
    ]) {
      expect(() => createSafetyWorkAccidentDraft(values)).toThrow(WorkplaceSafetyDomainError);
    }
  });

  it("creates a planned training draft with a valid follow-up date", () => {
    expect(createSafetyTrainingDraft({
      durationMinutes: 90,
      name: " Temel İSG ",
      nextTrainingOn: "2027-07-28",
      trainerName: " Uzman A ",
      trainingOn: "2026-07-28",
      type: " Periyodik ",
    })).toEqual({
      durationMinutes: 90,
      name: "Temel İSG",
      nextTrainingOn: "2027-07-28",
      status: "DRAFT",
      trainerName: "Uzman A",
      trainingOn: "2026-07-28",
      type: "Periyodik",
    });
  });

  it("rejects invalid training duration and backward follow-up dates", () => {
    expect(() => createSafetyTrainingDraft({
      durationMinutes: 0,
      name: "Temel İSG",
      trainerName: "Uzman",
      trainingOn: "2026-07-28",
      type: "Periyodik",
    })).toThrow(expect.objectContaining({ code: "INVALID_DURATION" }));
    expect(() => createSafetyTrainingDraft({
      durationMinutes: 45,
      name: "Temel İSG",
      nextTrainingOn: "2026-07-27",
      trainerName: "Uzman",
      trainingOn: "2026-07-28",
      type: "Periyodik",
    })).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
  });

  it("creates scoped inspection and finding drafts with normalized values", () => {
    expect(createSafetyInspectionDraft({
      inspectedOn: "2026-07-28",
      inspectorName: " Kontrolör ",
      projectId: " project-1 ",
      summary: "  Günlük saha kontrolü ",
    })).toEqual({
      inspectedOn: "2026-07-28",
      inspectorName: "Kontrolör",
      projectId: "project-1",
      status: "DRAFT",
      summary: "Günlük saha kontrolü",
    });
    expect(createSafetyFindingDraft({
      category: " Yüksekte çalışma ",
      dueOn: "2026-08-01",
      inspectionId: " inspection-1 ",
      ownerPersonnelId: " personnel-1 ",
      riskLevel: "HIGH",
      summary: "  Korkuluk tamamlanmalı ",
    })).toEqual({
      category: "Yüksekte çalışma",
      dueOn: "2026-08-01",
      inspectionId: "inspection-1",
      ownerPersonnelId: "personnel-1",
      riskLevel: "HIGH",
      status: "OPEN",
      summary: "Korkuluk tamamlanmalı",
    });
  });
});

describe("workplace safety idempotency boundaries", () => {
  it("uses a stable training/personnel attendance key", () => {
    expect(getSafetyTrainingAttendanceKey({ personnelId: " person-1 ", trainingId: " training-1 " }))
      .toBe("training-1::person-1");
  });

  it("uses a stable PPE issuance key and validates positive integer quantities", () => {
    const input = {
      issuedOn: "2026-07-28",
      personnelId: "person-1",
      ppeCode: "KKB-001",
      ppeType: "Baret",
      quantity: 2,
    };
    expect(getSafetyPpeIssuanceKey(input)).toBe("person-1::KKB-001::2026-07-28");
    expect(validateSafetyPpeIssuance(input)).toEqual({
      ...input,
      key: "person-1::KKB-001::2026-07-28",
      status: "ISSUED",
    });
    expect(() => validateSafetyPpeIssuance({ ...input, quantity: 1.5 })).toThrow(
      expect.objectContaining({ code: "INVALID_QUANTITY" }),
    );
  });
});

describe("workplace safety lifecycle and permissions", () => {
  it("allows only forward lifecycle transitions", () => {
    expect(canTransitionSafetyWorkAccidentStatus("DRAFT", "RECORDED")).toBe(true);
    expect(canTransitionSafetyWorkAccidentStatus("RECORDED", "CLOSED")).toBe(true);
    expect(canTransitionSafetyWorkAccidentStatus("DRAFT", "CLOSED")).toBe(false);
    expect(canTransitionSafetyTrainingStatus("DRAFT", "PLANNED")).toBe(true);
    expect(canTransitionSafetyTrainingStatus("PLANNED", "COMPLETED")).toBe(true);
    expect(canTransitionSafetyInspectionStatus("DRAFT", "COMPLETED")).toBe(true);
    expect(canTransitionSafetyFindingStatus("OPEN", "RESOLVED")).toBe(true);
    expect(canTransitionSafetyPpeIssuanceStatus("ISSUED", "RETURNED")).toBe(true);
    expect(canTransitionSafetyPpeIssuanceStatus("RETURNED", "ISSUED")).toBe(false);
    expect(() => assertSafetyTransition(false, "İSG bulgusu")).toThrow(
      expect.objectContaining({ code: "INVALID_TRANSITION" }),
    );
  });

  it("keeps list access open but rejects viewer and closed-period mutations", () => {
    expect(getWorkplaceSafetyPermission({ operation: "list", role: "viewer" })).toEqual({ allowed: true });
    expect(getWorkplaceSafetyPermission({ operation: "create", role: "viewer" })).toEqual({
      allowed: false,
      reason: "İSG kaydı için muhasebe veya yönetici yetkisi gereklidir.",
    });
    expect(getWorkplaceSafetyPermission({ operation: "transition", periodClosed: true, role: "admin" }))
      .toEqual({ allowed: false, reason: "Kapalı dönemde İSG kaydı değiştirilemez." });
    expect(getWorkplaceSafetyPermission({ operation: "create", role: "accounting" })).toEqual({ allowed: true });
  });
});

describe("workplace safety normalization safeguards", () => {
  it("normalizes whitespace and rejects invalid calendar dates", () => {
    expect(normalizeSafetyText("  Günlük\n\tİSG   kontrolü ")).toBe("Günlük İSG kontrolü");
    expect(normalizeSafetyDate("2024-02-29", "Tarih")).toBe("2024-02-29");
    expect(() => normalizeSafetyDate("2025-02-29", "Tarih")).toThrow(
      expect.objectContaining({ code: "INVALID_DATE" }),
    );
  });

  it("keeps labels and summaries within explicit limits", () => {
    expect(() => createSafetyTrainingDraft({
      durationMinutes: 10,
      name: "a".repeat(SAFETY_MAX_TEXT_LENGTH + 1),
      trainerName: "Uzman",
      trainingOn: "2026-07-28",
      type: "Temel",
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
    expect(() => createSafetyWorkAccidentDraft({
      classification: "Olay",
      occurredOn: "2026-07-28",
      summary: "a".repeat(SAFETY_MAX_SUMMARY_LENGTH + 1),
    })).toThrow(expect.objectContaining({ code: "TEXT_LIMIT_EXCEEDED" }));
  });
});
