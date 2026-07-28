/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  closeSafetyWorkAccidentAction: vi.fn(), completeSafetyInspectionAction: vi.fn(), completeSafetyTrainingAction: vi.fn(),
  createSafetyFindingAction: vi.fn(), createSafetyInspectionAction: vi.fn(), createSafetyPpeIssuanceAction: vi.fn(),
  createSafetyTrainingAction: vi.fn(), createSafetyWorkAccidentAction: vi.fn(), listWorkplaceSafetyAuditLogsAction: vi.fn(),
  listWorkplaceSafetyLookupsAction: vi.fn(), listWorkplaceSafetyOverviewAction: vi.fn(), planSafetyTrainingAction: vi.fn(),
  recordSafetyTrainingAttendanceAction: vi.fn(), recordSafetyWorkAccidentAction: vi.fn(), resolveSafetyFindingAction: vi.fn(),
  returnSafetyPpeIssuanceAction: vi.fn(),
}));

vi.mock("@/app/actions/workplace-safety-actions", () => actions);

import { WorkplaceSafetySurface } from "./workplace-safety-surface";

const timestamp = "2026-07-28T10:00:00.000Z";

describe("WorkplaceSafetySurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.listWorkplaceSafetyOverviewAction.mockResolvedValue({ data: overview(), ok: true });
    actions.listWorkplaceSafetyLookupsAction.mockResolvedValue({ data: { personnel: [{ code: "PER-001", name: "Ayşe Kaya" }], projects: [{ code: "PRJ-001", id: "project-1", name: "A Blok" }] }, ok: true });
    actions.listWorkplaceSafetyAuditLogsAction.mockResolvedValue({ data: { rows: [{ id: "audit-1", entityId: "accident-1", action: "workplace-safety.work-accident.create", occurredAt: timestamp }] }, ok: true });
    actions.recordSafetyWorkAccidentAction.mockResolvedValue({ data: {}, ok: true });
  });

  afterEach(cleanup);

  it("filters records and opens an accessible deep-linkable drawer", async () => {
    render(<WorkplaceSafetySurface canMutate initialRecordId="accident-1" />);

    expect(await screen.findByRole("heading", { name: "İş Sağlığı ve Güvenliği" })).toBeTruthy();
    expect((await screen.findByRole("dialog")).getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("İş kazası oluşturuldu")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("İSG kayıt türü filtresi"), { target: { value: "training" } });
    expect(screen.getByText("Temel İSG Eğitimi")).toBeTruthy();
    expect(screen.getByRole("table", { name: "İSG kayıt listesi" }).textContent).not.toContain("İş kazası · Kayma");
  });

  it("executes lifecycle actions from the drawer and refreshes scoped data", async () => {
    render(<WorkplaceSafetySurface canMutate />);
    const openButton = await screen.findAllByRole("button", { name: "Aç" });
    fireEvent.click(openButton[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Kayda al" }));

    await waitFor(() => expect(actions.recordSafetyWorkAccidentAction).toHaveBeenCalledWith("accident-1"));
    expect(actions.listWorkplaceSafetyOverviewAction.mock.calls.length).toBeGreaterThan(1);
  });

  it("does not render mutation controls for a viewer", async () => {
    render(<WorkplaceSafetySurface canMutate={false} />);

    await screen.findByText("İş kazası · Kayma");
    expect(screen.getByText("Salt okunur erişim")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yeni İSG kaydı" })).toBeNull();
    expect(screen.queryByLabelText("Yeni İSG kayıt türü")).toBeNull();
  });
});

function overview() {
  return {
    workAccidents: [{ id: "accident-1", classification: "Kayma", occurredOn: "2026-07-28", status: "DRAFT", summary: "Zemin kaygandı", projectId: "project-1", personnelId: "PER-001", recordedAt: null, closedAt: null, tenantId: "tenant", companyId: "company", periodId: "period", createdAt: timestamp, createdBy: "user", updatedAt: timestamp, updatedBy: "user" }],
    trainings: [{ id: "training-1", name: "Temel İSG Eğitimi", type: "Temel", trainerName: "Uzman", trainingOn: "2026-07-27", nextTrainingOn: null, durationMinutes: 90, status: "PLANNED", tenantId: "tenant", companyId: "company", periodId: "period", createdAt: timestamp, createdBy: "user", updatedAt: timestamp, updatedBy: "user" }],
    inspections: [], findings: [], ppeIssuances: [], trainingAttendances: [],
  };
}
