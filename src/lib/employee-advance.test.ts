import { describe, expect, test } from "vitest";

import {
  assertEmployeeAdvanceSettlementCapacity,
  assertEmployeeAdvanceTransition,
  calculateEmployeeAdvanceBalance,
  createEmployeeAdvanceDraft,
  getEmployeeAdvanceMutationRequestKey,
  getEmployeeAdvancePermission,
  normalizeEmployeeAdvanceApproval,
} from "./employee-advance";

const draft = {
  actorUserId: "user-admin",
  note: "  Okul masrafı  ",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  requestDate: "2026-08-01",
  requestedAmount: 7500,
  requestKey: "advance-create-1",
};

describe("employee advance domain", () => {
  test("normalizes a TRY draft and keeps note out of its idempotency key", () => {
    const result = createEmployeeAdvanceDraft(draft);
    expect(result).toMatchObject({
      createRequestKey: "user-admin::advance-create-1",
      note: "Okul masrafı",
      requestedAmount: 7500,
      revisionNo: 1,
      status: "DRAFT",
    });
    expect(result.createRequestKey).not.toContain("Okul");
  });

  test("validates date, positive two-decimal amount and finance ceiling", () => {
    expect(() => createEmployeeAdvanceDraft({ ...draft, requestDate: "2026-02-30" }))
      .toThrow("Talep tarihi");
    expect(() => createEmployeeAdvanceDraft({ ...draft, requestedAmount: 0 }))
      .toThrow("sıfırdan büyük");
    expect(() => normalizeEmployeeAdvanceApproval({
      advanceId: "advance-1",
      approvedAmount: 8000,
      expectedRevisionNo: 3,
      requestedAmount: 7500,
      requestKey: "finance-1",
    })).toThrow("aşamaz");
  });

  test("enforces admin manager decision and accounting finance operations", () => {
    expect(getEmployeeAdvancePermission({
      operation: "manager-approve",
      periodClosed: false,
      role: "admin",
    }).allowed).toBe(true);
    expect(getEmployeeAdvancePermission({
      operation: "manager-approve",
      periodClosed: false,
      role: "accounting",
    }).allowed).toBe(false);
    expect(getEmployeeAdvancePermission({
      operation: "pay",
      periodClosed: false,
      role: "accounting",
    }).allowed).toBe(true);
    expect(getEmployeeAdvancePermission({
      operation: "pay",
      periodClosed: false,
      role: "admin",
    }).allowed).toBe(false);
  });

  test("keeps reads open and every mutation closed in a closed period", () => {
    expect(getEmployeeAdvancePermission({
      operation: "view",
      periodClosed: true,
      role: "viewer",
    }).allowed).toBe(true);
    expect(getEmployeeAdvancePermission({
      operation: "create",
      periodClosed: true,
      role: "admin",
    }).allowed).toBe(false);
  });

  test("accepts only the forward manager-finance-payment lifecycle", () => {
    expect(assertEmployeeAdvanceTransition("DRAFT", "SUBMITTED").to).toBe("SUBMITTED");
    expect(assertEmployeeAdvanceTransition("SUBMITTED", "MANAGER_APPROVED").to)
      .toBe("MANAGER_APPROVED");
    expect(assertEmployeeAdvanceTransition("MANAGER_APPROVED", "FINANCE_APPROVED").to)
      .toBe("FINANCE_APPROVED");
    expect(assertEmployeeAdvanceTransition("FINANCE_APPROVED", "PAID").to).toBe("PAID");
    expect(assertEmployeeAdvanceTransition("PAID", "SETTLED").to).toBe("SETTLED");
    expect(() => assertEmployeeAdvanceTransition("SUBMITTED", "PAID"))
      .toThrow("sırasıyla");
  });

  test("calculates partial and final balances", () => {
    expect(calculateEmployeeAdvanceBalance({
      approvedAmount: 7500,
      settledAmount: 2500,
    })).toEqual({
      approvedAmount: 7500,
      remainingAmount: 5000,
      settledAmount: 2500,
    });
  });

  test("caps settlement by both advance balance and payroll deduction", () => {
    expect(assertEmployeeAdvanceSettlementCapacity({
      advanceRemainingAmount: 5000,
      amount: 2000,
      payrollAlreadyAllocated: 1000,
      payrollDeduction: 3000,
    })).toEqual({ amount: 2000, remainingAfter: 3000 });
    expect(() => assertEmployeeAdvanceSettlementCapacity({
      advanceRemainingAmount: 5000,
      amount: 2500,
      payrollAlreadyAllocated: 1000,
      payrollDeduction: 3000,
    })).toThrow("tahsis edilebilir");
  });

  test("builds content-free deterministic mutation keys", () => {
    expect(getEmployeeAdvanceMutationRequestKey({
      actorUserId: "user-accounting",
      advanceId: "advance-1",
      operation: "pay",
      requestKey: "pay-1",
    })).toBe("advance-1::user-accounting::pay::pay-1");
  });
});
