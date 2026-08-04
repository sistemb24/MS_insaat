/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VehicleFleetOverview } from "@/lib/vehicle-fleet-prisma-repository";

import { VehicleFleetOperationsSurface } from "./vehicle-fleet-operations-surface";

const { refresh, replace, selectedFleetId } = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn(), selectedFleetId: { value: null as string | null } }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }), useSearchParams: () => ({ get: () => selectedFleetId.value }) }));
vi.mock("@/app/actions/vehicle-fleet-actions", () => ({
  cancelVehicleFuelRecordAction: vi.fn(), cancelVehicleMaintenancePlanAction: vi.fn(), completeVehicleAssignmentAction: vi.fn(), completeVehicleMaintenancePlanAction: vi.fn(), completeVehicleMaintenanceRecordAction: vi.fn(), createVehicleAssignmentAction: vi.fn(), createVehicleFuelRecordAction: vi.fn(), createVehicleMaintenancePlanAction: vi.fn(), createVehicleMaintenanceRecordAction: vi.fn(), transferVehicleAssignmentAction: vi.fn(),
}));

afterEach(() => { cleanup(); refresh.mockReset(); replace.mockReset(); selectedFleetId.value = null; });

describe("VehicleFleetOperationsSurface", () => {
  it("renders scoped fleet records with textual statuses", () => {
    render(<VehicleFleetOperationsSurface canMutate lookups={lookups()} overview={overview()} />);
    expect(screen.getByRole("heading", { name: "Filo Operasyon Merkezi" })).toBeTruthy();
    const table = screen.getByRole("table", { name: "Filo operasyon kayıt listesi" });
    expect(within(table).getByText("Atama · 34 NOA 101")).toBeTruthy();
    expect(within(table).getByText("Yakıt · 34 NOA 101")).toBeTruthy();
    expect(within(table).getAllByText("Aktif").length).toBeGreaterThan(0);
  });

  it("filters the fleet operation table by type and text", () => {
    render(<VehicleFleetOperationsSurface canMutate lookups={lookups()} overview={overview()} />);
    fireEvent.change(screen.getByLabelText("Filo kayıt türü filtresi"), { target: { value: "fuel" } });
    expect(screen.getByText("Yakıt · 34 NOA 101")).toBeTruthy();
    expect(screen.queryByText("Atama · 34 NOA 101")).toBeNull();
    fireEvent.change(screen.getByLabelText("Filo operasyonlarında ara"), { target: { value: "bulunmaz" } });
    expect(screen.getByText("Bu filtrede filo operasyon kaydı bulunmuyor.")).toBeTruthy();
  });

  it("opens an accessible detail drawer and updates the deep link", () => {
    render(<VehicleFleetOperationsSurface canMutate lookups={lookups()} overview={overview()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Aç" })[0]);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("/araclar?fleet="), { scroll: false });
  });

  it("renders the selected active assignment drawer with transfer controls", () => {
    selectedFleetId.value = "assignment-1";
    render(<VehicleFleetOperationsSurface canMutate lookups={lookups()} overview={overview()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Atama · 34 NOA 101" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Araç ataması transferi" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Transferi kaydet" })).toBeTruthy();
  });

  it("keeps mutation controls out of the viewer DOM", () => {
    render(<VehicleFleetOperationsSurface canMutate={false} lookups={lookups()} overview={overview()} />);
    expect(screen.queryByLabelText("Yeni filo kayıt türü")).toBeNull();
  });

  it("opens a labelled maintenance plan form", () => {
    render(<VehicleFleetOperationsSurface canMutate lookups={lookups()} overview={overview()} />);
    fireEvent.change(screen.getByLabelText("Yeni filo kayıt türü"), { target: { value: "maintenance-plan" } });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bakım planı oluştur" })).toBeTruthy();
    expect(screen.getByLabelText("Sonraki hedef km")).toBeTruthy();
  });

  it("offers active maintenance plans by name instead of a free-text plan id", () => {
    render(<VehicleFleetOperationsSurface canMutate lookups={lookups()} overview={overview()} />);
    fireEvent.change(screen.getByLabelText("Yeni filo kayıt türü"), { target: { value: "maintenance-record" } });
    const plan = screen.getByLabelText("Bakım planı") as HTMLSelectElement;
    expect(plan.tagName).toBe("SELECT");
    expect(within(plan).getByRole("option", { name: "Periyodik · 34 NOA 101" })).toBeTruthy();
  });
});

function overview(): VehicleFleetOverview {
  const scope = { tenantId: "tenant-demo", companyId: "company-demo", periodId: "period-2026" };
  const common = { ...scope, createdAt: "2026-07-29T08:00:00.000Z", createdBy: "user-main", updatedAt: "2026-07-29T08:00:00.000Z", updatedBy: "user-main" };
  return {
    assignments: [{ ...common, id: "assignment-1", vehicleId: "vehicle-1", projectId: "project-1", driverPersonnelId: "PER-001", assignmentKey: "vehicle-1::2026-07-29", assignedOn: "2026-07-29", endedOn: null, status: "ACTIVE", assignmentNote: null }],
    fuelRecords: [{ ...common, id: "fuel-1", vehicleId: "vehicle-1", fuelKey: "fuel-1", fueledOn: "2026-07-29", liters: 30, unitPrice: 40, totalAmount: 1200, odometerKm: 120000, stationName: "Merkez", status: "RECORDED", cancelledOn: null }],
    maintenancePlans: [{ ...common, id: "plan-1", vehicleId: "vehicle-1", maintenanceType: "Periyodik", intervalKm: 10000, intervalDays: null, nextDueKm: 130000, nextDueOn: "2027-01-01", lastCompletedOn: null, status: "ACTIVE" }],
    maintenanceRecords: [{ ...common, id: "record-1", vehicleId: "vehicle-1", planId: "plan-1", completionKey: null, maintenanceType: "Arıza", maintenanceOn: "2026-07-28", odometerKm: 119000, costAmount: 500, providerName: "Servis", note: null, status: "DRAFT", completedOn: null }],
  };
}
function lookups() { return { vehicles: [{ id: "vehicle-1", plate: "34 NOA 101", entryOdometerKm: 100000 }], projects: [{ id: "project-1", code: "PRJ-001", name: "A Blok" }], personnel: [{ code: "PER-001", name: "Ayşe" }] }; }
