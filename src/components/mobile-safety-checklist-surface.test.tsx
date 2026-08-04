/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const checklistActions = vi.hoisted(() => ({
  archiveSafetyChecklistTemplateAction: vi.fn(), completeSafetyChecklistRunAction: vi.fn(), createSafetyChecklistRunAction: vi.fn(),
  createSafetyChecklistTemplateAction: vi.fn(), linkSafetyChecklistResponseFindingAction: vi.fn(), listMobileSafetyChecklistAuditLogsAction: vi.fn(),
  listMobileSafetyChecklistOverviewAction: vi.fn(), recordSafetyChecklistResponseAction: vi.fn(),
}));
const safetyActions = vi.hoisted(() => ({ listWorkplaceSafetyLookupsAction: vi.fn(), listWorkplaceSafetyOverviewAction: vi.fn() }));

vi.mock("@/app/actions/mobile-safety-checklist-actions", () => checklistActions);
vi.mock("@/app/actions/workplace-safety-actions", () => safetyActions);

import { MobileSafetyChecklistSurface } from "./mobile-safety-checklist-surface";

const timestamp = "2026-07-30T10:00:00.000Z";

describe("MobileSafetyChecklistSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checklistActions.listMobileSafetyChecklistOverviewAction.mockResolvedValue({ data: checklistOverview(), ok: true });
    checklistActions.listMobileSafetyChecklistAuditLogsAction.mockResolvedValue({ data: { rows: [{ id: "audit-1", entityId: "run-1", action: "mobile-safety-checklist.run.create", occurredAt: timestamp }] }, ok: true });
    safetyActions.listWorkplaceSafetyLookupsAction.mockResolvedValue({ data: { personnel: [], projects: [{ code: "PRJ-001", id: "project-1", name: "A Blok" }] }, ok: true });
    safetyActions.listWorkplaceSafetyOverviewAction.mockResolvedValue({ data: { findings: [{ id: "finding-1", category: "Elektrik", riskLevel: "HIGH" }], inspections: [], ppeIssuances: [], trainingAttendances: [], trainings: [], workAccidents: [] }, ok: true });
    checklistActions.recordSafetyChecklistResponseAction.mockResolvedValue({ data: { idempotent: false, row: {} }, ok: true });
    checklistActions.createSafetyChecklistTemplateAction.mockResolvedValue({ data: {}, ok: true });
  });

  afterEach(cleanup);

  it("opens a deep-linkable mobile run drawer with text-based response controls", async () => {
    render(<MobileSafetyChecklistSurface canMutate initialRunId="run-1" />);
    expect(await screen.findByRole("heading", { name: "Mobil İSG Kontrol Listeleri" })).toBeTruthy();
    expect((await screen.findByRole("dialog")).getAttribute("aria-modal")).toBe("true");
    expect(screen.getAllByText("PRJ-001 · A Blok").length).toBeGreaterThan(0);
    expect(screen.getByText("1. Baret kullanımı")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Uygun" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Uygunsuz" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Uygulanamaz" })).toBeTruthy();
  });

  it("records a response and refreshes the scoped checklist overview", async () => {
    render(<MobileSafetyChecklistSurface canMutate initialRunId="run-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Uygun" }));
    await waitFor(() => expect(checklistActions.recordSafetyChecklistResponseAction).toHaveBeenCalledWith({ checklistItemId: "item-1", checklistRunId: "run-1", note: undefined, response: "PASS" }));
    expect(checklistActions.listMobileSafetyChecklistOverviewAction.mock.calls.length).toBeGreaterThan(1);
  });

  it("opens a labeled template form and keeps mutation controls out of viewer DOM", async () => {
    const { rerender } = render(<MobileSafetyChecklistSurface canMutate />);
    fireEvent.click(await screen.findByRole("button", { name: "Yeni kontrol şablonu" }));
    expect(await screen.findByRole("heading", { name: "Mobil kontrol şablonu oluştur" })).toBeTruthy();
    expect(screen.getByLabelText("Kontrol maddeleri")).toBeTruthy();
    rerender(<MobileSafetyChecklistSurface canMutate={false} />);
    await screen.findByText("Salt okunur erişim");
    expect(screen.queryByRole("button", { name: "Yeni saha kontrolü" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Yeni kontrol şablonu" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Uygun" })).toBeNull();
  });
});

function checklistOverview() {
  return {
    templates: [{ id: "template-1", tenantId: "tenant", companyId: "company", periodId: "period", title: "Günlük İSG", description: "Günlük saha turu", status: "ACTIVE" as const, createdBy: "user", updatedBy: "user", createdAt: timestamp, updatedAt: timestamp }],
    templateItems: [{ id: "item-1", tenantId: "tenant", companyId: "company", periodId: "period", templateId: "template-1", category: "Şantiye", title: "Baret kullanımı", sortOrder: 1, createdBy: "user", createdAt: timestamp }],
    runs: [{ id: "run-1", tenantId: "tenant", companyId: "company", periodId: "period", templateId: "template-1", inspectionId: null, runKey: "key", projectId: "project-1", inspectedOn: "2026-07-30", inspectorName: "Saha Sorumlusu", status: "DRAFT" as const, completedAt: null, createdBy: "user", updatedBy: "user", createdAt: timestamp, updatedAt: timestamp }],
    responses: [],
  };
}
