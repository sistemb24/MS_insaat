/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ConstructionSimulationScenarioWorkspace, type ConstructionSimulationDraft } from "./construction-simulation-scenario-workspace";

const {
  approveMock,
  archiveMock,
  cloneMock,
  compareMock,
  createMock,
  detailMock,
  listMock,
  reviseMock,
} = vi.hoisted(() => ({
  approveMock: vi.fn(),
  archiveMock: vi.fn(),
  cloneMock: vi.fn(),
  compareMock: vi.fn(),
  createMock: vi.fn(),
  detailMock: vi.fn(),
  listMock: vi.fn(),
  reviseMock: vi.fn(),
}));

vi.mock("@/app/actions/construction-simulation-scenario-actions", () => ({
  approveConstructionSimulationScenarioAction: approveMock,
  archiveConstructionSimulationScenarioAction: archiveMock,
  cloneConstructionSimulationScenarioAction: cloneMock,
  compareConstructionSimulationScenariosAction: compareMock,
  createConstructionSimulationScenarioAction: createMock,
  getConstructionSimulationScenarioAction: detailMock,
  listConstructionSimulationScenariosAction: listMock,
  reviseConstructionSimulationScenarioAction: reviseMock,
}));

const revision = {
  inputHash: "hash-1",
  lineCount: 1,
  lines: [{
    contractItemId: "item-1",
    contractItemRevisionNo: 0,
    contractQuantity: 1_000,
    currentCumulative: 500,
    description: "Betonarme imalatı",
    directQuantity: 10,
    height: null,
    inputMode: "DIRECT" as const,
    isOverrun: false,
    itemCode: "15.001",
    length: null,
    lineNo: 1,
    multiplier: null,
    projectedAmount: 22_200,
    projectedCumulative: 510,
    projectedRemaining: 490,
    proposedQuantity: 10,
    unit: "m3",
    unitPrice: 2_220,
    width: null,
  }],
  overrunLineCount: 0,
  projectedAmountTotal: 22_200,
  proposedQuantityTotal: 10,
  revisionNo: 1,
  revisionNote: "İlk çalışma",
  sourceProgressPaymentUpdatedAt: "2026-07-22T10:00:00.000Z",
  sourceSnapshotAt: "2026-07-23T10:00:00.000Z",
};

const scenario = {
  approvedAt: null,
  approvedBy: null,
  archivedAt: null,
  archivedBy: null,
  companyId: "company-1",
  createdAt: "2026-07-23T10:00:00.000Z",
  createdBy: "user-1",
  currentRevision: revision,
  currentRevisionNo: 1,
  description: "Temel alternatifi",
  id: "scenario-1",
  name: "Temel optimizasyonu",
  periodId: "period-1",
  projectId: "project-1",
  scenarioNo: "SEN-001",
  sourceProgressPaymentId: "payment-1",
  status: "DRAFT" as const,
  tenantId: "tenant-1",
  updatedAt: "2026-07-23T10:00:00.000Z",
  updatedBy: "user-1",
};

const draft: ConstructionSimulationDraft = {
  actionLine: { contractItemId: "item-1", directQuantity: 10 },
  contractItemId: "item-1",
  contractQuantity: 1_000,
  currentCumulative: 500,
  description: "Betonarme imalatı",
  itemCode: "15.001",
  projectedAmount: 22_200,
  projectedCumulative: 510,
  projectedRemaining: 490,
  proposedQuantity: 10,
  unit: "m3",
};

function listResult(canCreate = true) {
  return {
    ok: true as const,
    data: {
      canApprove: canCreate,
      canArchive: canCreate,
      canCreate,
      rows: [{ ...scenario, currentRevision: { ...revision, lines: undefined } }],
    },
  };
}

beforeEach(() => {
  listMock.mockResolvedValue(listResult());
  detailMock.mockResolvedValue({ ok: true, data: { revisions: [revision], scenario, sourceStale: false } });
  createMock.mockResolvedValue({ ok: true, data: { kind: "created", scenario } });
  approveMock.mockResolvedValue({ ok: true, data: { kind: "updated", scenario: { ...scenario, status: "APPROVED" } } });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConstructionSimulationScenarioWorkspace", () => {
  test("saves a calculated draft and confirms approval in an accessible dialog", async () => {
    render(<ConstructionSimulationScenarioWorkspace draft={draft} projectId="project-1" sourceProgressPaymentId="payment-1" />);

    const list = await screen.findByRole("region", { name: "Simülasyon senaryo listesi" });
    expect(within(list).getByText("SEN-001 · R1")).toBeTruthy();
    expect(await screen.findByRole("table", { name: "Simülasyon senaryosu güncel satırları" })).toBeTruthy();

    const createForm = screen.getByRole("form", { name: "Simülasyon senaryosu oluştur" });
    fireEvent.change(within(createForm).getByPlaceholderText("Senaryo no (örn. SEN-001)"), { target: { value: "SEN-002" } });
    fireEvent.change(within(createForm).getByPlaceholderText("Senaryo adı"), { target: { value: "Alternatif temel" } });
    fireEvent.submit(createForm);
    await waitFor(() => expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      sourceProgressPaymentId: "payment-1",
      scenarioNo: "SEN-002",
      lines: [{ contractItemId: "item-1", directQuantity: 10 }],
    })));

    const approveButton = await screen.findByRole("button", { name: "Onayla" }) as HTMLButtonElement;
    await waitFor(() => expect(approveButton.disabled).toBe(false));
    fireEvent.click(approveButton);
    const dialog = screen.getByRole("dialog", { name: "Senaryoyu onayla" });
    expect(within(dialog).getByText(/onaylandıktan sonra revize edilemez/)).toBeTruthy();
    const confirmButton = within(dialog).getByRole("button", { name: "Onayı tamamla" });
    expect(document.activeElement).toBe(confirmButton);
    fireEvent.click(confirmButton);
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith("scenario-1"));
    await waitFor(() => expect(document.activeElement).toBe(approveButton));
  });

  test("does not render mutation controls for a viewer read model", async () => {
    listMock.mockResolvedValue(listResult(false));
    render(<ConstructionSimulationScenarioWorkspace draft={draft} projectId="project-1" sourceProgressPaymentId="payment-1" />);

    await screen.findByText("SEN-001 · R1");
    expect(screen.queryByRole("form", { name: "Simülasyon senaryosu oluştur" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Onayla" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Arşivle" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Klonla" })).toBeNull();
  });
});
