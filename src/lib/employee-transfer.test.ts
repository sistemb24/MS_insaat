import { describe, expect, test } from "vitest";

import {
  EmployeeTransferDomainError,
  assertEmployeeTransferEffectiveDate,
  assertEmployeeTransferSourceContinuity,
  assertEmployeeTransferTransition,
  assertNoPendingEmployeeTransfer,
  createEmployeeTransferDraft,
  getEmployeeTransferMutationRequestKey,
  getEmployeeTransferPermission,
  normalizeEmployeeTransferDraftUpdate,
} from "./employee-transfer";

const draft = {
  actorUserId: "user-admin",
  effectiveDate: "2026-07-30",
  note: "  Saha ekibi planlaması  ",
  personnelCode: "PER-0003",
  personnelName: "Hasan Çelik",
  requestKey: "transfer-create-1",
  sourceSiteCode: "SAN-0001",
  sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
  targetSiteCode: "SAN-0002",
  targetSiteName: "İstanbul Kartal İş Merkezi İnşaatı",
};

describe("employee transfer domain", () => {
  test("normalizes a draft and keeps free text out of its request key", () => {
    const result = createEmployeeTransferDraft(draft);
    expect(result).toMatchObject({
      createRequestKey: "user-admin::transfer-create-1",
      note: "Saha ekibi planlaması",
      personnelCode: "PER-0003",
      revisionNo: 1,
      status: "DRAFT",
    });
    expect(result.createRequestKey).not.toContain("Saha");
  });

  test("rejects equal source and target sites by code or normalized name", () => {
    expect(() => createEmployeeTransferDraft({
      ...draft,
      targetSiteCode: "SAN-0001",
    })).toThrow("farklı olmalıdır");
    expect(() => createEmployeeTransferDraft({
      ...draft,
      targetSiteName: "  ANTALYA   KONYAALTI 120 KONUT PROJESİ ",
    })).toThrow(EmployeeTransferDomainError);
  });

  test("validates date-only values and blocks future dates at approval", () => {
    expect(() => createEmployeeTransferDraft({
      ...draft,
      effectiveDate: "2026-02-30",
    })).toThrow("geçersizdir");
    expect(assertEmployeeTransferEffectiveDate({
      effectiveDate: "2026-07-30",
      today: "2026-07-30",
    })).toBe("2026-07-30");
    expect(() => assertEmployeeTransferEffectiveDate({
      effectiveDate: "2026-07-31",
      today: "2026-07-30",
    })).toThrow("gelecek");
  });

  test("allows accounting to draft but reserves approve and reject for admin", () => {
    expect(getEmployeeTransferPermission({
      operation: "create",
      periodClosed: false,
      role: "accounting",
    }).allowed).toBe(true);
    expect(getEmployeeTransferPermission({
      operation: "approve",
      periodClosed: false,
      role: "accounting",
    }).allowed).toBe(false);
    expect(getEmployeeTransferPermission({
      operation: "reject",
      periodClosed: false,
      role: "admin",
    }).allowed).toBe(true);
  });

  test("keeps reads open and rejects every mutation in a closed period", () => {
    expect(getEmployeeTransferPermission({
      operation: "view",
      periodClosed: true,
      role: "viewer",
    }).allowed).toBe(true);
    expect(getEmployeeTransferPermission({
      operation: "submit",
      periodClosed: true,
      role: "admin",
    }).allowed).toBe(false);
  });

  test("accepts only the forward transfer lifecycle", () => {
    expect(assertEmployeeTransferTransition("DRAFT", "SUBMITTED")).toEqual({
      from: "DRAFT",
      to: "SUBMITTED",
    });
    expect(assertEmployeeTransferTransition("SUBMITTED", "APPROVED").to).toBe("APPROVED");
    expect(assertEmployeeTransferTransition("SUBMITTED", "REJECTED").to).toBe("REJECTED");
    expect(() => assertEmployeeTransferTransition("APPROVED", "DRAFT"))
      .toThrow("sırasıyla ilerleyebilir");
  });

  test("requires the source to match both current site and latest approved target", () => {
    expect(assertEmployeeTransferSourceContinuity({
      currentPersonnelSiteName: "antalya konyaaltı 120 konut projesi",
      latestApprovedTargetSiteCode: "san-0001",
      sourceSiteCode: "SAN-0001",
      sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
    }).sourceSiteCode).toBe("SAN-0001");
    expect(() => assertEmployeeTransferSourceContinuity({
      currentPersonnelSiteName: "Şirket Merkez Şantiyesi",
      sourceSiteCode: "SAN-0001",
      sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
    })).toThrow("personel kartındaki");
    expect(() => assertEmployeeTransferSourceContinuity({
      currentPersonnelSiteName: "Antalya Konyaaltı 120 Konut Projesi",
      latestApprovedTargetSiteCode: "SAN-0099",
      sourceSiteCode: "SAN-0001",
      sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
    })).toThrow("son onaylı");
  });

  test("permits at most one submitted transfer for a person", () => {
    expect(() => assertNoPendingEmployeeTransfer({
      existing: [{
        id: "transfer-1",
        personnelCode: "per-0003",
        status: "SUBMITTED",
      }],
      personnelCode: "PER-0003",
    })).toThrow("sonuçlanmamış");
    expect(() => assertNoPendingEmployeeTransfer({
      existing: [{
        id: "transfer-1",
        personnelCode: "PER-0003",
        status: "SUBMITTED",
      }],
      ignoreId: "transfer-1",
      personnelCode: "PER-0003",
    })).not.toThrow();
  });

  test("normalizes optimistic revision and builds content-free mutation keys", () => {
    expect(normalizeEmployeeTransferDraftUpdate({
      ...draft,
      expectedRevisionNo: 2,
      transferId: "transfer-1",
    })).toMatchObject({
      expectedRevisionNo: 2,
      mutationRequestKey: "transfer-create-1",
      transferId: "transfer-1",
    });
    expect(getEmployeeTransferMutationRequestKey({
      actorUserId: "user-admin",
      operation: "approve",
      requestKey: "approve-1",
      transferId: "transfer-1",
    })).toBe("transfer-1::user-admin::approve::approve-1");
    expect(() => normalizeEmployeeTransferDraftUpdate({
      ...draft,
      expectedRevisionNo: 0,
      transferId: "transfer-1",
    })).toThrow("revizyonu");
  });

  test("limits operational note and request key length", () => {
    expect(() => createEmployeeTransferDraft({
      ...draft,
      note: "x".repeat(501),
    })).toThrow("en fazla 500");
    expect(() => createEmployeeTransferDraft({
      ...draft,
      requestKey: "x".repeat(201),
    })).toThrow("en fazla 200");
  });
});
