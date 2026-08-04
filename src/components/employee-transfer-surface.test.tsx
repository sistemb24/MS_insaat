/**
 * @vitest-environment jsdom
 */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  lookups: vi.fn(),
  reject: vi.fn(),
  submit: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/app/actions/employee-transfer-actions", () => ({
  approveEmployeeTransferAction: mocks.approve,
  createEmployeeTransferAction: mocks.create,
  getEmployeeTransferAction: mocks.get,
  listEmployeeTransferLookupsAction: mocks.lookups,
  listEmployeeTransfersAction: mocks.list,
  rejectEmployeeTransferAction: mocks.reject,
  submitEmployeeTransferAction: mocks.submit,
  updateEmployeeTransferDraftAction: mocks.update,
}));

import { EmployeeTransferSurface } from "./employee-transfer-surface";

const submitted = {
  approveRequestKey: null,
  approvedAt: null,
  companyId: "company-1",
  createRequestKey: "create-1",
  createdAt: "2026-07-30T09:00:00.000Z",
  createdBy: "user-admin",
  effectiveDate: "2026-07-30",
  id: "transfer-1",
  lastUpdateKey: null,
  note: "Saha ekibi planlaması",
  periodId: "period-1",
  personnelCode: "PER-0003",
  personnelName: "Hasan Çelik",
  rejectRequestKey: null,
  rejectedAt: null,
  revisionNo: 2,
  sourceSiteCode: "SAN-0001",
  sourceSiteName: "Antalya Konyaaltı 120 Konut Projesi",
  status: "SUBMITTED" as const,
  submitRequestKey: "submit-1",
  submittedAt: "2026-07-30T09:30:00.000Z",
  targetSiteCode: "SAN-0002",
  targetSiteName: "İstanbul Kartal İş Merkezi İnşaatı",
  tenantId: "tenant-1",
  updatedAt: "2026-07-30T09:30:00.000Z",
  updatedBy: "user-admin",
};
const draft = {
  ...submitted,
  createRequestKey: "create-2",
  id: "transfer-2",
  personnelCode: "PER-0004",
  personnelName: "Fatma Özkan",
  revisionNo: 1,
  sourceSiteCode: "SAN-0002",
  sourceSiteName: "İstanbul Kartal İş Merkezi İnşaatı",
  status: "DRAFT" as const,
  submitRequestKey: null,
  submittedAt: null,
  targetSiteCode: "SAN-0001",
  targetSiteName: "Antalya Konyaaltı 120 Konut Projesi",
};
const approved = {
  ...submitted,
  approveRequestKey: "approve-1",
  approvedAt: "2026-07-30T10:00:00.000Z",
  id: "transfer-3",
  personnelCode: "PER-0005",
  personnelName: "Emir Akın",
  revisionNo: 3,
  status: "APPROVED" as const,
};

describe("EmployeeTransferSurface", () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({
      data: { transfers: [submitted, draft, approved] },
      ok: true,
    });
    mocks.lookups.mockResolvedValue({
      data: {
        personnel: [
          {
            code: "PER-0003",
            name: "Hasan Çelik",
            site: "Antalya Konyaaltı 120 Konut Projesi",
            updatedAt: "2026-07-30T08:00:00.000Z",
          },
          {
            code: "PER-0004",
            name: "Fatma Özkan",
            site: "İstanbul Kartal İş Merkezi İnşaatı",
            updatedAt: "2026-07-30T08:00:00.000Z",
          },
        ],
        sites: [
          {
            code: "SAN-0001",
            name: "Antalya Konyaaltı 120 Konut Projesi",
          },
          {
            code: "SAN-0002",
            name: "İstanbul Kartal İş Merkezi İnşaatı",
          },
        ],
      },
      ok: true,
    });
    mocks.get.mockImplementation(async (id: string) => ({
      data: {
        transfer: id === draft.id
          ? draft
          : id === approved.id
            ? approved
            : submitted,
      },
      ok: true,
    }));
  });

  test("renders workflow metrics, transfer route and rows", async () => {
    render(
      <EmployeeTransferSurface canApprove canCreate />,
    );
    expect(await screen.findByRole("heading", {
      name: "Personel Şantiye Transferleri",
    })).toBeTruthy();
    expect(await screen.findByRole("button", {
      name: "Hasan Çelik Onay bekliyor transfer detayını aç",
    })).toBeTruthy();
    expect(screen.getByText("Fatma Özkan")).toBeTruthy();
    expect(screen.getAllByText("Antalya Konyaaltı 120 Konut Projesi").length)
      .toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Yeni transfer" })).toBeTruthy();
  });

  test("keeps every mutation control out of viewer DOM", async () => {
    render(
      <EmployeeTransferSurface canApprove={false} canCreate={false} />,
    );
    await screen.findByRole("button", {
      name: "Hasan Çelik Onay bekliyor transfer detayını aç",
    });
    expect(screen.queryByRole("button", { name: "Yeni transfer" })).toBeNull();
    fireEvent.click(screen.getByRole("button", {
      name: "Hasan Çelik Onay bekliyor transfer detayını aç",
    }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", {
      name: "Transferi onayla",
    })).toBeNull();
    expect(within(dialog).queryByRole("button", {
      name: "Transferi reddet",
    })).toBeNull();
  });

  test("filters by status, site and search text", async () => {
    render(<EmployeeTransferSurface canApprove canCreate />);
    await screen.findByText("Fatma Özkan");
    fireEvent.change(screen.getByLabelText("Transfer durumu"), {
      target: { value: "DRAFT" },
    });
    expect(screen.queryByText("Hasan Çelik")).toBeNull();
    expect(screen.getByText("Fatma Özkan")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Personel transferlerinde ara"), {
      target: { value: "bulunmayan" },
    });
    expect(screen.getByText(
      "Filtrelerle eşleşen personel transferi bulunmuyor.",
    )).toBeTruthy();
  });

  test("opens admin deep-link with decision controls", async () => {
    render(
      <EmployeeTransferSurface
        canApprove
        canCreate
        initialTransferId={submitted.id}
      />,
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Hasan Çelik" }))
      .toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Transferi onayla" }))
      .toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Transferi reddet" }))
      .toBeTruthy();
  });

  test("opens a draft form with derived source and current values", async () => {
    render(<EmployeeTransferSurface canApprove canCreate />);
    await screen.findByText("Fatma Özkan");
    fireEvent.click(screen.getByRole("button", {
      name: "Fatma Özkan Taslak transfer detayını aç",
    }));
    fireEvent.click(screen.getByRole("button", { name: "Taslağı düzenle" }));
    const dialogs = screen.getAllByRole("dialog");
    const formDialog = dialogs.at(-1)!;
    expect(within(formDialog).getByRole("heading", {
      name: "Transfer Taslağını Düzenle",
    })).toBeTruthy();
    await waitFor(() => {
      expect((within(formDialog).getByLabelText("Personel") as HTMLSelectElement).value)
        .toBe("PER-0004");
    });
    expect((within(formDialog).getByLabelText("Kaynak şantiye") as HTMLInputElement).value)
      .toContain("İstanbul Kartal");
  });

  test("keeps responsive, theme-token and print contracts on the workspace", async () => {
    const { container } = render(
      <EmployeeTransferSurface canApprove canCreate />,
    );
    const region = await screen.findByRole("region", {
      name: "Personel Şantiye Transferleri",
    });
    expect(region.className).toContain("max-w-7xl");
    expect(container.querySelector('[class*="bg-surface-raised"]')).toBeTruthy();
    expect(container.querySelector('[class*="print:hidden"]')).toBeTruthy();
    await waitFor(() => {
      expect(container.querySelector('[class*="print:break-inside-avoid"]'))
        .toBeTruthy();
    });
    expect(container.querySelector('[class*="sm:grid-cols-3"]')).toBeTruthy();
  });
});
