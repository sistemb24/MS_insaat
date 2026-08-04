import { describe, expect, test } from "vitest";

import {
  EmployeeLeaveDomainError,
  assertEmployeeLeaveTransition,
  assertNoEmployeeLeaveOverlap,
  calculateLeaveBalance,
  createEmployeeLeaveDraft,
  getEmployeeLeaveMutationRequestKey,
  getEmployeeLeavePermission,
  normalizeLeaveBalanceInput,
} from "./employee-leave";

const draft = {
  actorUserId: "user-admin",
  chargeableDays: 3,
  documentFileId: "",
  endDate: "2026-08-12",
  leaveType: "ANNUAL" as const,
  note: "  Aile ziyareti  ",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  requestKey: "leave-create-1",
  startDate: "2026-08-10",
};

describe("employee leave domain", () => {
  test("normalizes a scoped draft without leaking the note into its request key", () => {
    const result = createEmployeeLeaveDraft(draft);
    expect(result).toMatchObject({
      chargeableDays: 3,
      createRequestKey: "user-admin::leave-create-1",
      documentFileId: null,
      note: "Aile ziyareti",
      revisionNo: 1,
      status: "DRAFT",
    });
    expect(result.createRequestKey).not.toContain("Aile");
  });

  test("rejects invalid date ranges and excessive chargeable days", () => {
    expect(() => createEmployeeLeaveDraft({ ...draft, endDate: "2026-08-09" }))
      .toThrow("bitiş tarihi");
    expect(() => createEmployeeLeaveDraft({ ...draft, chargeableDays: 4 }))
      .toThrow("takvim gününü");
    expect(() => createEmployeeLeaveDraft({
      ...draft,
      endDate: "2027-01-02",
      startDate: "2026-12-30",
    })).toThrow("aynı takvim yılında");
  });

  test("limits leave types and note length", () => {
    expect(() => createEmployeeLeaveDraft({ ...draft, leaveType: "OTHER" as never }))
      .toThrow(EmployeeLeaveDomainError);
    expect(() => createEmployeeLeaveDraft({ ...draft, note: "x".repeat(501) }))
      .toThrow("en fazla 500");
  });

  test("allows accounting to draft but reserves approval and balance for admin", () => {
    expect(getEmployeeLeavePermission({
      operation: "create",
      periodClosed: false,
      role: "accounting",
    }).allowed).toBe(true);
    expect(getEmployeeLeavePermission({
      operation: "approve",
      periodClosed: false,
      role: "accounting",
    }).allowed).toBe(false);
    expect(getEmployeeLeavePermission({
      operation: "balance",
      periodClosed: false,
      role: "admin",
    }).allowed).toBe(true);
  });

  test("keeps reads open and rejects every mutation in a closed period", () => {
    expect(getEmployeeLeavePermission({
      operation: "view",
      periodClosed: true,
      role: "viewer",
    }).allowed).toBe(true);
    expect(getEmployeeLeavePermission({
      operation: "create",
      periodClosed: true,
      role: "admin",
    }).allowed).toBe(false);
  });

  test("accepts only the forward leave lifecycle", () => {
    expect(assertEmployeeLeaveTransition("DRAFT", "SUBMITTED")).toEqual({
      from: "DRAFT",
      to: "SUBMITTED",
    });
    expect(assertEmployeeLeaveTransition("SUBMITTED", "APPROVED").to).toBe("APPROVED");
    expect(assertEmployeeLeaveTransition("APPROVED", "CANCELLED").to).toBe("CANCELLED");
    expect(() => assertEmployeeLeaveTransition("APPROVED", "DRAFT"))
      .toThrow("sırasıyla ilerleyebilir");
  });

  test("detects inclusive overlap only for submitted and approved rows", () => {
    expect(() => assertNoEmployeeLeaveOverlap({
      candidateEndDate: "2026-08-15",
      candidateStartDate: "2026-08-12",
      existing: [{
        endDate: "2026-08-12",
        id: "leave-1",
        startDate: "2026-08-10",
        status: "APPROVED",
      }],
    })).toThrow("aynı tarih aralığında");
    expect(() => assertNoEmployeeLeaveOverlap({
      candidateEndDate: "2026-08-15",
      candidateStartDate: "2026-08-12",
      existing: [{
        endDate: "2026-08-13",
        id: "leave-2",
        startDate: "2026-08-10",
        status: "REJECTED",
      }],
    })).not.toThrow();
  });

  test("calculates operational balance and validates its year", () => {
    expect(calculateLeaveBalance({ adjustmentDays: 2, openingDays: 14, usedDays: 5 }))
      .toEqual({ availableDays: 16, remainingDays: 11, usedDays: 5 });
    expect(normalizeLeaveBalanceInput({
      adjustmentDays: -1,
      openingDays: 14,
      personnelCode: "PER-0001",
      personnelName: "Ayşe Demir",
      requestKey: "balance-1",
      year: 2026,
    })).toMatchObject({ adjustmentDays: -1, openingDays: 14, year: 2026 });
    expect(() => normalizeLeaveBalanceInput({
      adjustmentDays: -2,
      openingDays: 1,
      personnelCode: "PER-0001",
      personnelName: "Ayşe Demir",
      requestKey: "balance-1",
      year: 2026,
    })).toThrow("sıfırdan küçük");
  });

  test("builds content-free deterministic mutation keys", () => {
    expect(getEmployeeLeaveMutationRequestKey({
      actorUserId: "user-admin",
      leaveId: "leave-1",
      operation: "approve",
      requestKey: "approve-1",
    })).toBe("leave-1::user-admin::approve::approve-1");
  });
});
