/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  create: vi.fn(),
  financeApprove: vi.fn(),
  financeReject: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  lookups: vi.fn(),
  managerApprove: vi.fn(),
  managerReject: vi.fn(),
  pay: vi.fn(),
  settle: vi.fn(),
  submit: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/app/actions/employee-advance-actions", () => ({
  cancelEmployeeAdvanceAction: mocks.cancel,
  createEmployeeAdvanceAction: mocks.create,
  financeApproveEmployeeAdvanceAction: mocks.financeApprove,
  financeRejectEmployeeAdvanceAction: mocks.financeReject,
  getEmployeeAdvanceAction: mocks.get,
  listEmployeeAdvanceLookupsAction: mocks.lookups,
  listEmployeeAdvancesAction: mocks.list,
  managerApproveEmployeeAdvanceAction: mocks.managerApprove,
  managerRejectEmployeeAdvanceAction: mocks.managerReject,
  payEmployeeAdvanceAction: mocks.pay,
  settleEmployeeAdvanceAction: mocks.settle,
  submitEmployeeAdvanceAction: mocks.submit,
  updateEmployeeAdvanceDraftAction: mocks.update,
}));

import { EmployeeAdvanceSurface } from "./employee-advance-surface";

const base = {
  approvedAmount: null,
  cancelRequestKey: null,
  cancelledAt: null,
  companyId: "company-1",
  createRequestKey: "create-1",
  createdAt: "2026-08-01T10:00:00.000Z",
  createdBy: "user-admin",
  financeApproveRequestKey: null,
  financeApprovedAt: null,
  financeRejectRequestKey: null,
  financeRejectedAt: null,
  id: "advance-1",
  lastUpdateKey: null,
  managerApproveRequestKey: null,
  managerApprovedAt: null,
  managerRejectRequestKey: null,
  managerRejectedAt: null,
  note: "Okul masrafı",
  paidAt: null,
  paymentAccountCode: null,
  paymentAccountName: null,
  paymentDate: null,
  paymentLedgerEntryId: null,
  paymentMovementId: null,
  paymentRequestKey: null,
  periodId: "period-1",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  requestDate: "2026-08-01",
  requestedAmount: 7500,
  revisionNo: 2,
  settledAmount: 0,
  status: "SUBMITTED" as const,
  submitRequestKey: "submit-1",
  submittedAt: "2026-08-01T10:00:00.000Z",
  tenantId: "tenant-1",
  updatedAt: "2026-08-01T10:00:00.000Z",
  updatedBy: "user-admin",
};
const financePending = {
  ...base,
  id: "advance-2",
  managerApproveRequestKey: "manager-1",
  managerApprovedAt: "2026-08-01T10:00:00.000Z",
  personnelCode: "PER-0002",
  personnelName: "Mehmet Kaya",
  revisionNo: 3,
  status: "MANAGER_APPROVED" as const,
};
const paid = {
  ...base,
  approvedAmount: 3000,
  financeApproveRequestKey: "finance-1",
  financeApprovedAt: "2026-08-01T10:00:00.000Z",
  id: "advance-3",
  paidAt: "2026-08-02T10:00:00.000Z",
  paymentAccountCode: "KASA-0001",
  paymentAccountName: "Merkez Kasa",
  paymentDate: "2026-08-02",
  paymentLedgerEntryId: "ledger-1",
  paymentMovementId: "movement-1",
  paymentRequestKey: "pay-1",
  revisionNo: 5,
  settledAmount: 1000,
  status: "PAID" as const,
};

describe("EmployeeAdvanceSurface", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      data: { advances: [base, financePending, paid], settlements: [] },
      ok: true,
    });
    mocks.lookups.mockResolvedValue({
      data: {
        accounts: [{ code: "KASA-0001", name: "Merkez Kasa" }],
        payrollDeductions: [{
          allocatedAmount: 0,
          availableAmount: 2000,
          documentNo: "BRD-2026-08",
          payrollAccrualId: "payroll-1",
          personnelCode: "PER-0001",
          personnelName: "Ayşe Demir",
        }],
        personnel: [
          { code: "PER-0001", name: "Ayşe Demir" },
          { code: "PER-0002", name: "Mehmet Kaya" },
        ],
      },
      ok: true,
    });
    mocks.get.mockImplementation(async (id: string) => ({
      data: {
        advance: id === financePending.id
          ? financePending
          : id === paid.id ? paid : base,
      },
      ok: true,
    }));
  });

  test("renders real workflow metrics, rows and open balance", async () => {
    render(<EmployeeAdvanceSurface canCreate isAccounting={false} isAdmin />);
    expect(await screen.findByRole("heading", { name: "Personel Avans Yönetimi" }))
      .toBeTruthy();
    expect(await screen.findByRole("button", { name: "Ayşe Demir Yönetici bekliyor avans detayını aç" }))
      .toBeTruthy();
    expect(screen.getByText("Mehmet Kaya")).toBeTruthy();
    expect(screen.getAllByText("₺2.000,00").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Yeni avans talebi" })).toBeTruthy();
  });

  test("keeps every mutation control out of viewer DOM", async () => {
    render(
      <EmployeeAdvanceSurface
        canCreate={false}
        isAccounting={false}
        isAdmin={false}
      />,
    );
    await screen.findByRole("button", { name: "Ayşe Demir Yönetici bekliyor avans detayını aç" });
    expect(screen.queryByRole("button", { name: "Yeni avans talebi" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ayşe Demir Yönetici bekliyor avans detayını aç" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Yönetici onayı" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Finans onayı" })).toBeNull();
  });

  test("opens admin deep-link with only manager decision controls", async () => {
    render(
      <EmployeeAdvanceSurface
        canCreate
        initialAdvanceId={base.id}
        isAccounting={false}
        isAdmin
      />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Yönetici onayı" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Yönetici reddi" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Finans onayı" })).toBeNull();
  });

  test("shows finance controls only to accounting on manager-approved detail", async () => {
    render(
      <EmployeeAdvanceSurface
        canCreate
        initialAdvanceId={financePending.id}
        isAccounting
        isAdmin={false}
      />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Finans onayı" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Finans reddi" })).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Yönetici onayı" })).toBeNull();
  });
});
