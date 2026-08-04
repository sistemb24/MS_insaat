/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { VehicleTireRecordRow } from "@/lib/vehicle-tire-prisma-repository";

import { VehicleTireOperationsSurface } from "./vehicle-tire-operations-surface";

const { refresh, replace, selectedTireId } = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn(), selectedTireId: { value: null as string | null } }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }), useSearchParams: () => ({ get: () => selectedTireId.value }) }));
vi.mock("@/app/actions/vehicle-tire-actions", () => ({ createVehicleTireMountAction: vi.fn(), removeVehicleTireRecordAction: vi.fn() }));

afterEach(() => { cleanup(); refresh.mockReset(); replace.mockReset(); selectedTireId.value = null; });

describe("VehicleTireOperationsSurface", () => {
  it("renders scoped tire records with textual statuses", () => {
    render(<VehicleTireOperationsSurface canMutate records={records()} vehicles={vehicles()} />);
    expect(screen.getByRole("heading", { name: "Filo Lastik Yönetimi" })).toBeTruthy();
    const table = screen.getByRole("table", { name: "Lastik kayıt listesi" });
    expect(within(table).getAllByText("34 NOA 101")).toHaveLength(2);
    expect(within(table).getByText("315/80 R22.5 X Multi")).toBeTruthy();
    expect(within(table).getByText("Aktif")).toBeTruthy();
  });

  it("filters tire records by status and text", () => {
    render(<VehicleTireOperationsSurface canMutate records={records()} vehicles={vehicles()} />);
    fireEvent.change(screen.getByLabelText("Lastik durum filtresi"), { target: { value: "REMOVED" } });
    expect(screen.getByText("Söküldü")).toBeTruthy();
    expect(screen.queryByText("315/80 R22.5 X Multi")).toBeNull();
    fireEvent.change(screen.getByLabelText("Lastik kayıtlarında ara"), { target: { value: "bulunmaz" } });
    expect(screen.getByText("Bu filtrede lastik kaydı bulunmuyor.")).toBeTruthy();
  });

  it("opens a deep link for the selected tire record", () => {
    render(<VehicleTireOperationsSurface canMutate records={records()} vehicles={vehicles()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Aç" })[0]);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("/araclar?tire="), { scroll: false });
  });

  it("renders a selected active tire drawer with controlled removal fields", () => {
    selectedTireId.value = "tire-1";
    render(<VehicleTireOperationsSurface canMutate records={records()} vehicles={vehicles()} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "34 NOA 101 · Sol Ön" })).toBeTruthy();
    expect(screen.getByRole("form", { name: "Lastik sökümü kaydı" })).toBeTruthy();
    expect(screen.getByLabelText("Söküm kilometresi")).toBeTruthy();
  });

  it("keeps mutation controls out of the viewer DOM", () => {
    render(<VehicleTireOperationsSurface canMutate={false} records={records()} vehicles={vehicles()} />);
    expect(screen.queryByRole("button", { name: "Yeni lastik montajı" })).toBeNull();
  });

  it("opens a labelled mount form with a scoped vehicle selector", () => {
    render(<VehicleTireOperationsSurface canMutate records={records()} vehicles={vehicles()} />);
    fireEvent.click(screen.getByRole("button", { name: "Yeni lastik montajı" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Lastik montajı oluştur" })).toBeTruthy();
    const vehicle = screen.getByLabelText("Araç") as HTMLSelectElement;
    expect(within(vehicle).getByRole("option", { name: "34 NOA 101" })).toBeTruthy();
    expect(screen.getByLabelText("Aşınma yüzdesi")).toBeTruthy();
  });
});

function records(): VehicleTireRecordRow[] {
  const common = { tenantId: "tenant-demo", companyId: "company-demo", periodId: "period-2026", createdAt: "2026-07-29T08:00:00.000Z", createdBy: "user-main", updatedAt: "2026-07-29T08:00:00.000Z", updatedBy: "user-main" };
  return [
    { ...common, id: "tire-1", vehicleId: "vehicle-1", mountKey: "key-1", tirePosition: "Sol Ön", season: "SUMMER", brandModel: "315/80 R22.5 X Multi", treadWearPercent: 12, mountedOn: "2026-07-29", mountedOdometerKm: 120500, status: "ACTIVE", removedOn: null, removedOdometerKm: null },
    { ...common, id: "tire-2", vehicleId: "vehicle-1", mountKey: "key-2", tirePosition: "Sağ Ön", season: "WINTER", brandModel: "Kış Lastiği", treadWearPercent: 45, mountedOn: "2026-01-01", mountedOdometerKm: 100000, status: "REMOVED", removedOn: "2026-04-01", removedOdometerKm: 110000 },
  ];
}
function vehicles() { return [{ id: "vehicle-1", plate: "34 NOA 101" }]; }
