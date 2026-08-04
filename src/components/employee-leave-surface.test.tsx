/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  cancel: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  lookups: vi.fn(),
  reject: vi.fn(),
  saveBalance: vi.fn(),
  submit: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/app/actions/employee-leave-actions", () => ({
  approveEmployeeLeaveAction: mocks.approve,
  cancelEmployeeLeaveAction: mocks.cancel,
  createEmployeeLeaveAction: mocks.create,
  getEmployeeLeaveAction: mocks.get,
  listEmployeeLeaveLookupsAction: mocks.lookups,
  listEmployeeLeavesAction: mocks.list,
  rejectEmployeeLeaveAction: mocks.reject,
  saveEmployeeLeaveBalanceAction: mocks.saveBalance,
  submitEmployeeLeaveAction: mocks.submit,
  updateEmployeeLeaveDraftAction: mocks.update,
}));

import { EmployeeLeaveSurface } from "./employee-leave-surface";

const submitted = {
  approveRequestKey: null,
  approvedAt: null,
  cancelRequestKey: null,
  cancelledAt: null,
  chargeableDays: 2,
  companyId: "company-1",
  createRequestKey: "create-1",
  createdAt: "2026-07-30T10:00:00.000Z",
  createdBy: "user-admin",
  documentFileId: null,
  endDate: "2026-08-11",
  id: "leave-1",
  lastUpdateKey: null,
  leaveType: "ANNUAL" as const,
  note: "Planlı yıllık izin",
  periodId: "period-1",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  rejectRequestKey: null,
  rejectedAt: null,
  revisionNo: 2,
  startDate: "2026-08-10",
  status: "SUBMITTED" as const,
  submitRequestKey: "submit-1",
  submittedAt: "2026-07-30T10:00:00.000Z",
  tenantId: "tenant-1",
  updatedAt: "2026-07-30T10:00:00.000Z",
  updatedBy: "user-admin",
};
const draft = {
  ...submitted,
  createRequestKey: "create-2",
  id: "leave-2",
  leaveType: "EXCUSE" as const,
  personnelCode: "PER-0002",
  personnelName: "Mehmet Kaya",
  revisionNo: 1,
  status: "DRAFT" as const,
  submitRequestKey: null,
  submittedAt: null,
};
const balance = {
  adjustmentDays: 0,
  companyId: "company-1",
  createdAt: "2026-07-30T10:00:00.000Z",
  createdBy: "user-admin",
  id: "balance-1",
  lastMutationKey: "balance-key",
  openingDays: 14,
  periodId: "period-1",
  personnelCode: "PER-0001",
  personnelName: "Ayşe Demir",
  revisionNo: 1,
  tenantId: "tenant-1",
  updatedAt: "2026-07-30T10:00:00.000Z",
  updatedBy: "user-admin",
  usedDays: 3,
  year: 2026,
};

describe("EmployeeLeaveSurface", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      data: { balances: [balance], leaves: [submitted, draft] },
      ok: true,
    });
    mocks.lookups.mockResolvedValue({
      data: {
        documents: [{ id: "doc-1", name: "İzin Belgesi.pdf" }],
        personnel: [
          { code: "PER-0001", name: "Ayşe Demir" },
          { code: "PER-0002", name: "Mehmet Kaya" },
        ],
      },
      ok: true,
    });
    mocks.get.mockImplementation(async (id: string) => ({
      data: { leave: id === draft.id ? draft : submitted },
      ok: true,
    }));
  });

  test("renders real leave metrics, rows and balances", async () => {
    render(<EmployeeLeaveSurface canApprove canCreate isAdmin />);
    expect(await screen.findByRole("heading", { name: "Personel İzin Yönetimi" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Ayşe Demir izin detayını aç" })).toBeTruthy();
    expect(screen.getByText("Mehmet Kaya")).toBeTruthy();
    const balanceRegion = screen.getByRole("region", { name: "Yıllık İzin Bakiyeleri" });
    expect(within(balanceRegion).getByText("11")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yeni izin" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bakiye tanımla" })).toBeTruthy();
  });

  test("keeps every mutation control out of viewer DOM", async () => {
    render(<EmployeeLeaveSurface canApprove={false} canCreate={false} isAdmin={false} />);
    await screen.findByRole("button", { name: "Ayşe Demir izin detayını aç" });
    expect(screen.queryByRole("button", { name: "Yeni izin" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bakiye tanımla" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ayşe Demir izin detayını aç" }));
    expect(screen.queryByRole("button", { name: "Onayla" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reddet" })).toBeNull();
  });

  test("filters by leave type and search text", async () => {
    render(<EmployeeLeaveSurface canApprove canCreate isAdmin />);
    await screen.findByRole("button", { name: "Ayşe Demir izin detayını aç" });
    fireEvent.change(screen.getByLabelText("İzin türü"), { target: { value: "EXCUSE" } });
    expect(screen.queryByRole("button", { name: "Ayşe Demir izin detayını aç" })).toBeNull();
    expect(screen.getByText("Mehmet Kaya")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Personel izinlerinde ara"), {
      target: { value: "bulunmayan" },
    });
    expect(screen.getByText("Filtrelerle eşleşen izin kaydı bulunmuyor.")).toBeTruthy();
  });

  test("opens initial deep-link detail and exposes admin approval controls", async () => {
    render(<EmployeeLeaveSurface canApprove canCreate initialLeaveId={submitted.id} isAdmin />);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Ayşe Demir" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Onayla" })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Reddet" })).toBeTruthy();
  });

  test("opens a draft form with current values", async () => {
    render(<EmployeeLeaveSurface canApprove canCreate isAdmin />);
    await screen.findByText("Mehmet Kaya");
    fireEvent.click(screen.getByRole("button", { name: "Mehmet Kaya izin detayını aç" }));
    fireEvent.click(screen.getByRole("button", { name: "Taslağı düzenle" }));
    const formDialog = screen.getAllByRole("dialog").at(-1)!;
    expect(within(formDialog).getByRole("heading", { name: "İzin Taslağını Düzenle" })).toBeTruthy();
    await waitFor(() => {
      expect((within(formDialog).getByLabelText("Personel") as HTMLSelectElement).value)
        .toBe("PER-0002");
    });
  });
});
