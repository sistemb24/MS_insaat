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
import { afterEach, describe, expect, test, vi } from "vitest";

import { getDefaultArventoVehicleFleetOverview } from "@/lib/arvento-fleet-service";
import type { AuditLogEntry } from "@/lib/audit-log";
import type { VehicleCardRow } from "@/lib/vehicle-service";

import { VehicleFleetSurface } from "./vehicle-fleet-surface";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

function createVehicleAuditEntry(
  overrides: Partial<AuditLogEntry> = {},
): AuditLogEntry {
  return {
    action: "vehicle.update",
    actorUserId: "user-demo-admin",
    companyId: "company-demo-insaat",
    createdAt: "2026-07-10T06:15:00.000Z",
    entityId: "vehicle-34-noa-303",
    entityLabel: "34 NOA 303",
    entityType: "vehicle",
    id: "audit-vehicle-update-303",
    metadata: { status: "Aktif" },
    occurredAt: "2026-07-10T06:15:00.000Z",
    periodId: "period-2026",
    tenantId: "tenant-noa-demo",
    ...overrides,
  };
}

function createVehicleCardTestRow(
  overrides: Partial<VehicleCardRow> = {},
): VehicleCardRow {
  return {
    acquisitionDate: "2026-07-01",
    arventoDeviceId: "ARV-303",
    brand: "Ford",
    chassisNumber: "WVWZZZ303",
    dispositionDate: "2026-07-10",
    insuranceEndDate: "2026-12-31",
    inspectionEndDate: "2027-01-15",
    registrationDate: "2026-06-20",
    companyId: "company-demo-insaat",
    createdAt: "2026-07-05T19:30:00.000Z",
    createdBy: "user-demo-admin",
    driverName: "Ali Usta",
    engineNumber: "ENG303TR",
    entryOdometerKm: 125000,
    fuelType: "Dizel",
    id: "vehicle-passive-303",
    modelName: "Transit",
    modelYear: 2024,
    periodId: "period-2026",
    plate: "34 NOA 303",
    siteCode: "SNT-001",
    siteName: "Merkez Şantiye",
    status: "Pasif",
    tenantId: "tenant-noa-demo",
    updatedAt: "2026-07-09T08:15:00.000Z",
    updatedBy: "user-demo-admin",
    vehicleType: "Kamyonet",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  refreshMock.mockReset();
});

describe("VehicleFleetSurface", () => {
  test("renders recent vehicle audit history", () => {
    render(
      <VehicleFleetSurface
        auditEntries={[
          {
            action: "vehicle.update",
            actorUserId: "user-demo-admin",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-10T06:15:00.000Z",
            entityId: "vehicle-34-noa-303",
            entityLabel: "34 NOA 303",
            entityType: "vehicle",
            id: "audit-vehicle-update-303",
            metadata: {
              changedFields: ["driverName", "siteName"],
              status: "Pasif",
            },
            occurredAt: "2026-07-10T06:15:00.000Z",
            periodId: "period-2026",
            tenantId: "tenant-noa-demo",
          },
        ]}
        overview={getDefaultArventoVehicleFleetOverview()}
      />,
    );

    const historyTable = screen.getByRole("table", {
      name: "P2 Araç İşlem Geçmişi",
    });

    expect(screen.getByRole("heading", { name: "Araç İşlem Geçmişi" })).toBeTruthy();
    expect(within(historyTable).getByText("34 NOA 303")).toBeTruthy();
    expect(within(historyTable).getByText("Güncellendi")).toBeTruthy();
    expect(within(historyTable).getByText("Pasif")).toBeTruthy();
    expect(within(historyTable).getByText("Sürücü, Şantiye")).toBeTruthy();
    expect(within(historyTable).getByText("user-demo-admin")).toBeTruthy();
  });

  test("filters vehicle audit history by plate, action, and user", () => {
    render(
      <VehicleFleetSurface
        auditEntries={[
          createVehicleAuditEntry(),
          createVehicleAuditEntry({
            action: "vehicle.create",
            actorUserId: "user-fleet-operator",
            entityId: "vehicle-34-noa-404",
            entityLabel: "34 NOA 404",
            id: "audit-vehicle-create-404",
          }),
          createVehicleAuditEntry({
            action: "vehicle.imported",
            actorUserId: "user-integration",
            entityId: "vehicle-06-noa-505",
            entityLabel: "06 NOA 505",
            id: "audit-vehicle-imported-505",
            metadata: { changedFields: ["customField"], status: "Aktif" },
          }),
        ]}
        overview={getDefaultArventoVehicleFleetOverview()}
      />,
    );

    const historyTable = screen.getByRole("table", {
      name: "P2 Araç İşlem Geçmişi",
    });
    const plateFilter = screen.getByLabelText("Plakaya göre filtrele");
    const actionFilter = screen.getByLabelText("İşleme göre filtrele");
    const userFilter = screen.getByLabelText("Kullanıcıya göre filtrele");

    fireEvent.change(plateFilter, { target: { value: " 34 noa 404 " } });
    expect(within(historyTable).getByText("34 NOA 404")).toBeTruthy();
    expect(within(historyTable).queryByText("34 NOA 303")).toBeNull();
    expect(screen.getByText("1 / 3 işlem")).toBeTruthy();
    const exportLink = screen.getByRole("link", { name: "CSV Dışa Aktar" });
    const filteredCsvHref = decodeURIComponent(
      exportLink.getAttribute("href") ?? "",
    );
    expect(exportLink.getAttribute("download")).toBe("arac-islem-gecmisi.csv");
    expect(filteredCsvHref).toContain("34 NOA 404");
    expect(filteredCsvHref).not.toContain("34 NOA 303");
    expect(filteredCsvHref).not.toContain("06 NOA 505");

    fireEvent.change(plateFilter, { target: { value: "" } });
    fireEvent.change(actionFilter, { target: { value: "vehicle.update" } });
    expect(within(historyTable).getByText("34 NOA 303")).toBeTruthy();
    expect(within(historyTable).queryByText("34 NOA 404")).toBeNull();

    fireEvent.change(actionFilter, { target: { value: "" } });
    fireEvent.change(userFilter, { target: { value: "INTEGRATION" } });
    expect(within(historyTable).getByText("06 NOA 505")).toBeTruthy();
    expect(within(historyTable).getByText("vehicle.imported")).toBeTruthy();
    expect(within(historyTable).getByText("customField")).toBeTruthy();

    fireEvent.change(userFilter, { target: { value: "missing-user" } });
    expect(
      within(historyTable).getByText(
        "Filtrelerle eşleşen araç işlemi bulunamadı.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "CSV Dışa Aktar" })).toBeNull();
  });

  test("keeps unknown vehicle audit actions filterable and visible", () => {
    render(
      <VehicleFleetSurface
        auditEntries={[
          createVehicleAuditEntry(),
          createVehicleAuditEntry({
            action: "vehicle.transfer",
            actorUserId: "user-fleet-operator",
            entityId: "vehicle-34-noa-707",
            entityLabel: "34 NOA 707",
            id: "audit-vehicle-transfer-707",
            metadata: { status: "Aktif" },
          }),
        ]}
        overview={getDefaultArventoVehicleFleetOverview()}
      />,
    );

    const historyTable = screen.getByRole("table", {
      name: "P2 Araç İşlem Geçmişi",
    });

    fireEvent.change(screen.getByLabelText("İşleme göre filtrele"), {
      target: { value: "vehicle.transfer" },
    });

    expect(within(historyTable).getByText("vehicle.transfer")).toBeTruthy();
    expect(within(historyTable).queryByText("34 NOA 303")).toBeNull();
    expect(screen.getByText("1 / 2 işlem")).toBeTruthy();
    expect(screen.getByRole("link", { name: "CSV Dışa Aktar" })).toBeTruthy();
  });

  test("clears audit filters in one step", () => {
    render(
      <VehicleFleetSurface
        auditEntries={[
          createVehicleAuditEntry(),
          createVehicleAuditEntry({
            action: "vehicle.create",
            actorUserId: "user-fleet-operator",
            entityId: "vehicle-34-noa-404",
            entityLabel: "34 NOA 404",
            id: "audit-vehicle-create-404",
          }),
        ]}
        overview={getDefaultArventoVehicleFleetOverview()}
      />,
    );

    const historyTable = screen.getByRole("table", {
      name: "P2 Araç İşlem Geçmişi",
    });

    fireEvent.change(screen.getByLabelText("Plakaya göre filtrele"), {
      target: { value: "404" },
    });
    fireEvent.change(screen.getByLabelText("İşleme göre filtrele"), {
      target: { value: "vehicle.create" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filtreleri Temizle" }));

    expect((screen.getByLabelText("Plakaya göre filtrele") as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("İşleme göre filtrele") as HTMLSelectElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("Kullanıcıya göre filtrele") as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("Başlangıç tarihi") as HTMLInputElement).value).toBe(
      "",
    );
    expect((screen.getByLabelText("Bitiş tarihi") as HTMLInputElement).value).toBe(
      "",
    );
    expect(within(historyTable).getByText("34 NOA 303")).toBeTruthy();
    expect(within(historyTable).getByText("34 NOA 404")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Filtreleri Temizle" })).toBeNull();
  });

  test("keeps the unfiltered audit empty state explicit", () => {
    render(
      <VehicleFleetSurface overview={getDefaultArventoVehicleFleetOverview()} />,
    );

    const historyTable = screen.getByRole("table", {
      name: "P2 Araç İşlem Geçmişi",
    });

    expect(
      within(historyTable).getByText("Araç işlem geçmişi bulunamadı."),
    ).toBeTruthy();
    expect(screen.getByText("Son 0 işlem")).toBeTruthy();
  });

  test("filters and exports vehicle audit history by an inclusive date range", () => {
    const july10At = new Date(2026, 6, 10, 12, 0, 0).toISOString();
    const july8At = new Date(2026, 6, 8, 12, 0, 0).toISOString();

    render(
      <VehicleFleetSurface
        auditEntries={[
          createVehicleAuditEntry({
            createdAt: july10At,
            occurredAt: july10At,
          }),
          createVehicleAuditEntry({
            createdAt: july8At,
            entityId: "vehicle-34-noa-404",
            entityLabel: "34 NOA 404",
            id: "audit-vehicle-update-404",
            occurredAt: july8At,
          }),
        ]}
        overview={getDefaultArventoVehicleFleetOverview()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), {
      target: { value: "2026-07-10" },
    });

    const historyTable = screen.getByRole("table", {
      name: "P2 Araç İşlem Geçmişi",
    });
    expect(within(historyTable).getByText("34 NOA 303")).toBeTruthy();
    expect(within(historyTable).queryByText("34 NOA 404")).toBeNull();
    const csvHref = decodeURIComponent(
      screen
        .getByRole("link", { name: "CSV Dışa Aktar" })
        .getAttribute("href") ?? "",
    );
    expect(csvHref).toContain("34 NOA 303");
    expect(csvHref).not.toContain("34 NOA 404");

    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), {
      target: { value: "2026-07-11" },
    });

    expect(screen.getByRole("alert").textContent).toBe(
      "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
    );
    expect(screen.queryByRole("link", { name: "CSV Dışa Aktar" })).toBeNull();
  });

  test("configures model year as an optional four-digit numeric field", () => {
    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard: vi.fn() }}
      />,
    );

    const modelYear = screen.getByLabelText("Model Yılı");

    expect(modelYear.getAttribute("inputmode")).toBe("numeric");
    expect(modelYear.getAttribute("maxlength")).toBe("4");
    expect(modelYear.getAttribute("pattern")).toBe("[0-9]{4}");
    const entryOdometerKm = screen.getByLabelText("Giriş KM");
    expect(entryOdometerKm.getAttribute("inputmode")).toBe("numeric");
    expect(entryOdometerKm.getAttribute("pattern")).toBe("[0-9]*");
  });

  test("submits a vehicle card draft through the persistence adapter", async () => {
    const createVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { plate: "34 NOA 404" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Plaka"), {
      target: { value: " 34 noa 404 " },
    });
    fireEvent.change(screen.getByLabelText("Alındığı/Kiralandığı Tarih"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.change(screen.getByLabelText("Satıldığı/İade Tarihi"), {
      target: { value: "2026-07-10" },
    });
    fireEvent.change(screen.getByLabelText("Sigorta Bitiş Tarihi"), {
      target: { value: "2026-12-31" },
    });
    fireEvent.change(screen.getByLabelText("Muayene Bitiş Tarihi"), {
      target: { value: "2027-01-15" },
    });
    fireEvent.change(screen.getByLabelText("Tescil Tarihi"), {
      target: { value: "2026-06-20" },
    });
    fireEvent.change(screen.getByLabelText("Araç Tipi"), {
      target: { value: " Kamyonet " },
    });
    fireEvent.change(screen.getByLabelText("Marka"), {
      target: { value: " Ford " },
    });
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: " Transit " },
    });
    fireEvent.change(screen.getByLabelText("Model Yılı"), {
      target: { value: "2024" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: " Kuzey Şantiye " },
    });
    fireEvent.change(screen.getByLabelText("Sürücü"), {
      target: { value: " Ayşe Operatör " },
    });
    fireEvent.change(screen.getByLabelText("Şase No"), {
      target: { value: " wvw zzz 404 " },
    });
    fireEvent.change(screen.getByLabelText("Motor No"), {
      target: { value: " eng 404 tr " },
    });
    fireEvent.change(screen.getByLabelText("Giriş KM"), {
      target: { value: "125000" },
    });
    fireEvent.change(screen.getByLabelText("Yakıt Türü"), {
      target: { value: " Dizel " },
    });
    fireEvent.change(screen.getByLabelText("Arvento Cihaz ID"), {
      target: { value: " ARV-404 " },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartı Kaydet" }),
    );

    await waitFor(() => {
      expect(createVehicleCard).toHaveBeenCalledWith({
        acquisitionDate: "2026-07-01",
        arventoDeviceId: "ARV-404",
        brand: "Ford",
        chassisNumber: "wvw zzz 404",
        dispositionDate: "2026-07-10",
        insuranceEndDate: "2026-12-31",
        inspectionEndDate: "2027-01-15",
        maintenanceDueDate: "",
        registrationDate: "2026-06-20",
        driverName: "Ayşe Operatör",
        engineNumber: "eng 404 tr",
        entryOdometerKm: "125000",
        fuelType: "Dizel",
        modelName: "Transit",
        modelYear: "2024",
        plate: "34 noa 404",
        siteName: "Kuzey Şantiye",
        vehicleType: "Kamyonet",
      });
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Araç kartı kaydedildi.")).toBeTruthy();
  });

  test("offers existing site names while keeping vehicle card site entry editable", async () => {
    const createVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { plate: "35 NOA 505" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard }}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-505",
            brand: "BMC",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-07T10:00:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Can Operatör",
            id: "vehicle-passive-505",
            modelName: "Tugra",
            modelYear: 2023,
            periodId: "period-2026",
            plate: "35 NOA 505",
            siteCode: "SNT-005",
            siteName: "Güney Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T09:00:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Kamyon",
          },
        ]}
      />,
    );

    const siteInput = screen.getByLabelText("Şantiye");
    expect(siteInput.getAttribute("list")).toBe("vehicle-site-suggestions");
    const siteSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-site-suggestions option",
      ),
    ).map((option) => option.value);
    expect(siteSuggestions).toContain("Merkez Şantiye");
    expect(siteSuggestions).toContain("Depo / Lojistik");
    expect(siteSuggestions).toContain("Güney Şantiye");

    fireEvent.change(screen.getByLabelText("Plaka"), {
      target: { value: "35 NOA 505" },
    });
    fireEvent.change(screen.getByLabelText("Araç Tipi"), {
      target: { value: "Kamyon" },
    });
    fireEvent.change(siteInput, { target: { value: "Güney Şantiye" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartı Kaydet" }),
    );

    await waitFor(() => {
      expect(createVehicleCard).toHaveBeenCalledWith(
        expect.objectContaining({ siteName: "Güney Şantiye" }),
      );
    });
  });
  test("offers existing vehicle types while keeping vehicle card type entry editable", async () => {
    const createVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { plate: "35 NOA 606" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard }}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-606",
            brand: "Volvo",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-07T11:00:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Deniz Operatör",
            id: "vehicle-passive-606",
            modelName: "EC220",
            modelYear: 2022,
            periodId: "period-2026",
            plate: "35 NOA 606",
            siteCode: "SNT-006",
            siteName: "Güney Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T09:30:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Ekskavatör",
          },
        ]}
      />,
    );

    const vehicleTypeInput = screen.getByLabelText("Araç Tipi");
    expect(vehicleTypeInput.getAttribute("list")).toBe(
      "vehicle-type-suggestions",
    );
    const vehicleTypeSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-type-suggestions option",
      ),
    ).map((option) => option.value);
    expect(vehicleTypeSuggestions).toContain("Kamyon");
    expect(vehicleTypeSuggestions).toContain("Kamyonet");
    expect(vehicleTypeSuggestions).toContain("Binek");
    expect(vehicleTypeSuggestions).toContain("Ekskavatör");

    fireEvent.change(screen.getByLabelText("Plaka"), {
      target: { value: "35 NOA 606" },
    });
    fireEvent.change(vehicleTypeInput, { target: { value: "Ekskavatör" } });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "Güney Şantiye" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartı Kaydet" }),
    );

    await waitFor(() => {
      expect(createVehicleCard).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleType: "Ekskavatör" }),
      );
    });
  });
  test("offers existing brands while keeping vehicle card brand entry editable", async () => {
    const createVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { plate: "35 NOA 707" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard }}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-707",
            brand: "Caterpillar",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-07T12:00:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Ece Operatör",
            id: "vehicle-passive-707",
            modelName: "320",
            modelYear: 2021,
            periodId: "period-2026",
            plate: "35 NOA 707",
            siteCode: "SNT-007",
            siteName: "Güney Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T09:45:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Ekskavatör",
          },
        ]}
      />,
    );

    const brandInput = screen.getByLabelText("Marka");
    expect(brandInput.getAttribute("list")).toBe("vehicle-brand-suggestions");
    const brandSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-brand-suggestions option",
      ),
    ).map((option) => option.value);
    expect(brandSuggestions).toContain("Mercedes");
    expect(brandSuggestions).toContain("Ford");
    expect(brandSuggestions).toContain("Renault");
    expect(brandSuggestions).toContain("Caterpillar");

    fireEvent.change(screen.getByLabelText("Plaka"), {
      target: { value: "35 NOA 707" },
    });
    fireEvent.change(screen.getByLabelText("Araç Tipi"), {
      target: { value: "Ekskavatör" },
    });
    fireEvent.change(brandInput, { target: { value: "Caterpillar" } });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "Güney Şantiye" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartı Kaydet" }),
    );

    await waitFor(() => {
      expect(createVehicleCard).toHaveBeenCalledWith(
        expect.objectContaining({ brand: "Caterpillar" }),
      );
    });
  });
  test("offers existing models while keeping vehicle card model entry editable", async () => {
    const createVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { plate: "35 NOA 808" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard }}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-808",
            brand: "Caterpillar",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-07T13:00:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Emre Operatör",
            id: "vehicle-passive-808",
            modelName: "320 GC",
            modelYear: 2021,
            periodId: "period-2026",
            plate: "35 NOA 808",
            siteCode: "SNT-008",
            siteName: "Güney Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T10:00:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Ekskavatör",
          },
        ]}
      />,
    );

    const modelInput = screen.getByLabelText("Model");
    expect(modelInput.getAttribute("list")).toBe("vehicle-model-suggestions");
    const modelSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-model-suggestions option",
      ),
    ).map((option) => option.value);
    expect(modelSuggestions).toContain("Arocs");
    expect(modelSuggestions).toContain("Transit");
    expect(modelSuggestions).toContain("Megane");
    expect(modelSuggestions).toContain("320 GC");

    fireEvent.change(screen.getByLabelText("Plaka"), {
      target: { value: "35 NOA 808" },
    });
    fireEvent.change(screen.getByLabelText("Araç Tipi"), {
      target: { value: "Ekskavatör" },
    });
    fireEvent.change(screen.getByLabelText("Marka"), {
      target: { value: "Caterpillar" },
    });
    fireEvent.change(modelInput, { target: { value: "320 GC" } });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "Güney Şantiye" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartı Kaydet" }),
    );

    await waitFor(() => {
      expect(createVehicleCard).toHaveBeenCalledWith(
        expect.objectContaining({ modelName: "320 GC" }),
      );
    });
  });
  test("offers assigned drivers while keeping vehicle card driver entry editable", async () => {
    const createVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { plate: "35 NOA 818" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard }}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-818",
            brand: "Caterpillar",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-07T13:00:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Emre Operatör",
            id: "vehicle-passive-818",
            modelName: "320 GC",
            modelYear: 2021,
            periodId: "period-2026",
            plate: "35 NOA 818",
            siteCode: "SNT-008",
            siteName: "Güney Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T10:00:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Ekskavatör",
          },
        ]}
      />,
    );

    const driverInput = screen.getByLabelText("Sürücü");
    expect(driverInput.getAttribute("list")).toBe("vehicle-driver-suggestions");
    const driverSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-driver-suggestions option",
      ),
    ).map((option) => option.value);

    expect(driverSuggestions).toContain("Ali Usta");
    expect(driverSuggestions).toContain("Mehmet Operatör");
    expect(driverSuggestions).toContain("Emre Operatör");
    expect(driverSuggestions).not.toContain("Atanmamış");

    fireEvent.change(screen.getByLabelText("Plaka"), {
      target: { value: "35 NOA 818" },
    });
    fireEvent.change(screen.getByLabelText("Araç Tipi"), {
      target: { value: "Ekskavatör" },
    });
    fireEvent.change(screen.getByLabelText("Şantiye"), {
      target: { value: "Güney Şantiye" },
    });
    fireEvent.change(driverInput, { target: { value: "Yeni Operatör" } });

    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartı Kaydet" }),
    );

    await waitFor(() => {
      expect(createVehicleCard).toHaveBeenCalledWith(
        expect.objectContaining({ driverName: "Yeni Operatör" }),
      );
    });
  });
  test("deduplicates vehicle card suggestion variants case-insensitively", () => {
    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard: vi.fn() }}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-909",
            brand: "mercedes",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-07T14:00:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Fatma Operatör",
            id: "vehicle-passive-909",
            modelName: "arocs",
            modelYear: 2022,
            periodId: "period-2026",
            plate: "35 NOA 909",
            siteCode: "SNT-009",
            siteName: "merkez şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T10:15:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "kamyon",
          },
        ]}
      />,
    );

    const brandSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-brand-suggestions option",
      ),
    ).map((option) => option.value.toLocaleLowerCase("tr-TR"));
    const modelSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-model-suggestions option",
      ),
    ).map((option) => option.value.toLocaleLowerCase("tr-TR"));
    const siteSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-site-suggestions option",
      ),
    ).map((option) => option.value.toLocaleLowerCase("tr-TR"));
    const typeSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-type-suggestions option",
      ),
    ).map((option) => option.value.toLocaleLowerCase("tr-TR"));

    expect(brandSuggestions.filter((value) => value === "mercedes")).toHaveLength(1);
    expect(modelSuggestions.filter((value) => value === "arocs")).toHaveLength(1);
    expect(siteSuggestions.filter((value) => value === "merkez şantiye")).toHaveLength(1);
    expect(typeSuggestions.filter((value) => value === "kamyon")).toHaveLength(1);
  });
  test("parses multi-word brands from vehicle labels for brand and model suggestions", () => {
    const overview = getDefaultArventoVehicleFleetOverview();

    render(
      <VehicleFleetSurface
        overview={{
          ...overview,
          rows: [
            ...overview.rows,
            {
              ...overview.rows[0],
              id: "vehicle-multi-word-brand",
              plate: "35 NOA 919",
              vehicleLabel: "Kamyon / Mercedes Benz Arocs 1848 2022",
            },
          ],
        }}
        persistence={{ createVehicleCard: vi.fn() }}
      />,
    );

    const brandSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-brand-suggestions option",
      ),
    ).map((option) => option.value);
    const modelSuggestions = Array.from(
      document.querySelectorAll<HTMLOptionElement>(
        "#vehicle-model-suggestions option",
      ),
    ).map((option) => option.value);

    expect(brandSuggestions).toContain("Mercedes Benz");
    expect(modelSuggestions).toContain("Arocs 1848");
    expect(modelSuggestions).not.toContain("Benz Arocs 1848");
  });
  test("shows vehicle card validation errors returned by persistence", async () => {
    const createVehicleCard = vi.fn().mockResolvedValue({
      ok: false,
      errors: ["Plaka zorunludur."],
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ createVehicleCard }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartı Kaydet" }),
    );

    expect(await screen.findByText("Plaka zorunludur.")).toBeTruthy();
    expect(refreshMock).not.toHaveBeenCalled();
  });


  test("asks for confirmation before deactivating a vehicle card", async () => {
    const deactivateVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { id: "vehicle-34-noa-101", status: "Pasif" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ deactivateVehicleCard }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "34 NOA 101 pasife al" }),
    );

    expect(deactivateVehicleCard).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", {
      name: "Araç pasife alma onayı",
    });
    expect(within(dialog).getByText("34 NOA 101 pasife alınacak.")).toBeTruthy();
    expect(
      within(dialog).getByText("Kamyon / Mercedes Arocs 2022"),
    ).toBeTruthy();
    expect(within(dialog).getByText("Merkez Şantiye")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Pasife Al" }));

    await waitFor(() => {
      expect(deactivateVehicleCard).toHaveBeenCalledWith("vehicle-34-noa-101");
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Araç kartı pasife alındı.")).toBeTruthy();
  });

  test("closes vehicle deactivation confirmation with Escape without mutation", async () => {
    const deactivateVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { id: "vehicle-34-noa-101", status: "Pasif" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{ deactivateVehicleCard }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "34 NOA 101 pasife al" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Araç pasife alma onayı" }),
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Araç pasife alma onayı" }),
      ).toBeNull();
    });
    expect(deactivateVehicleCard).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test("activates a passive vehicle card from the passive card list", async () => {
    const activateVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { id: "vehicle-passive-303", status: "Aktif" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        vehicleCards={[
          {
            acquisitionDate: "2026-07-01",
            arventoDeviceId: "ARV-303",
            brand: "Ford",
            chassisNumber: "WVWZZZ303",
            dispositionDate: "2026-07-10",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-05T19:30:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Ali Usta",
            engineNumber: "ENG303TR",
            entryOdometerKm: 125000,
            fuelType: "Dizel",
            id: "vehicle-passive-303",
            modelName: "Transit",
            modelYear: 2024,
            periodId: "period-2026",
            plate: "34 NOA 303",
            siteCode: "SNT-001",
            siteName: "Merkez Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T08:15:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Kamyonet",
          },
        ]}
        persistence={{ activateVehicleCard }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Pasif Araç Kartları" }),
    ).toBeTruthy();
    const passiveVehicleTable = screen.getByRole("table", {
      name: "P2 Pasif Araç Kartları",
    });
    expect(within(passiveVehicleTable).getByText("34 NOA 303")).toBeTruthy();
    expect(
      within(passiveVehicleTable).getByText("Kamyonet / Ford Transit 2024"),
    ).toBeTruthy();

    fireEvent.click(
      within(passiveVehicleTable).getByRole("button", {
        name: "34 NOA 303 aktifleştir",
      }),
    );

    expect(activateVehicleCard).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", {
      name: "Araç aktifleştirme onayı",
    });
    expect(within(dialog).getByText("34 NOA 303 aktifleştirilecek.")).toBeTruthy();
    expect(
      within(dialog).getByText("Kamyonet / Ford Transit 2024"),
    ).toBeTruthy();
    expect(within(dialog).getByText("Merkez Şantiye")).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Aktifleştir" }));

    await waitFor(() => {
      expect(activateVehicleCard).toHaveBeenCalledWith("vehicle-passive-303");
    });
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Araç kartı aktifleştirildi.")).toBeTruthy();
  });

  test("edits a persisted vehicle card without changing its plate identity", async () => {
    const updateVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { id: "vehicle-passive-303", status: "Pasif" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        vehicleCards={[
          {
            acquisitionDate: "2026-07-01",
            arventoDeviceId: "ARV-303",
            brand: "Ford",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-05T19:30:00.000Z",
            createdBy: "user-demo-admin",
            chassisNumber: "WVWZZZ303",
            dispositionDate: "2026-07-10",
            insuranceEndDate: "2026-12-31",
            inspectionEndDate: "2027-01-15",
            registrationDate: "2026-06-20",
            driverName: "Ali Usta",
            engineNumber: "ENG303TR",
            entryOdometerKm: 125000,
            fuelType: "Dizel",
            id: "vehicle-passive-303",
            modelName: "Transit",
            modelYear: 2024,
            periodId: "period-2026",
            plate: "34 NOA 303",
            siteCode: "SNT-001",
            siteName: "Merkez Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T08:15:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Kamyonet",
          },
        ]}
        persistence={{
          activateVehicleCard: vi.fn(),
          createVehicleCard: vi.fn(),
          updateVehicleCard,
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "34 NOA 303 düzenle" }),
    );

    expect(
      screen.getByRole("heading", { name: "Araç Kartı Düzenle" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Plaka").getAttribute("disabled")).not.toBeNull();
    expect(screen.getByLabelText("Plaka").getAttribute("value")).toBe(
      "34 NOA 303",
    );
    expect(screen.getByLabelText("Arvento Cihaz ID").getAttribute("value")).toBe(
      "ARV-303",
    );
    expect(screen.getByLabelText("Yakıt Türü").getAttribute("value")).toBe(
      "Dizel",
    );
    expect(screen.getByLabelText("Şase No").getAttribute("value")).toBe(
      "WVWZZZ303",
    );
    expect(screen.getByLabelText("Motor No").getAttribute("value")).toBe(
      "ENG303TR",
    );
    expect(screen.getByLabelText("Giriş KM").getAttribute("value")).toBe(
      "125000",
    );
    expect(
      screen
        .getByLabelText("Alındığı/Kiralandığı Tarih")
        .getAttribute("value"),
    ).toBe("2026-07-01");
    expect(
      screen.getByLabelText("Satıldığı/İade Tarihi").getAttribute("value"),
    ).toBe("2026-07-10");
    expect(
      screen.getByLabelText("Sigorta Bitiş Tarihi").getAttribute("value"),
    ).toBe("2026-12-31");
    expect(
      screen.getByLabelText("Muayene Bitiş Tarihi").getAttribute("value"),
    ).toBe("2027-01-15");
    expect(screen.getByLabelText("Tescil Tarihi").getAttribute("value")).toBe(
      "2026-06-20",
    );

    fireEvent.change(screen.getByLabelText("Sürücü"), {
      target: { value: "Ayşe Operatör" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartını Güncelle" }),
    );

    await waitFor(() => {
      expect(updateVehicleCard).toHaveBeenCalledWith(
        "vehicle-passive-303",
        "2026-07-09T08:15:00.000Z",
        {
          acquisitionDate: "2026-07-01",
          arventoDeviceId: "ARV-303",
          brand: "Ford",
          chassisNumber: "WVWZZZ303",
          dispositionDate: "2026-07-10",
          insuranceEndDate: "2026-12-31",
          inspectionEndDate: "2027-01-15",
          maintenanceDueDate: "",
          registrationDate: "2026-06-20",
          driverName: "Ayşe Operatör",
          engineNumber: "ENG303TR",
          entryOdometerKm: "125000",
          fuelType: "Dizel",
          modelName: "Transit",
          modelYear: "2024",
          plate: "34 NOA 303",
          siteCode: "SNT-001",
          siteName: "Merkez Şantiye",
          vehicleType: "Kamyonet",
        },
      );
    });
    expect(await screen.findByText("Araç kartı güncellendi.")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Araç Kartı" }),
    ).toBeTruthy();
  });

  test("reloads the current vehicle card after an update conflict", async () => {
    const conflictMessage =
      "Araç kartı başka bir kullanıcı tarafından güncellendi. Güncel bilgileri yükleyip tekrar deneyin.";
    const updateVehicleCard = vi.fn().mockResolvedValue({
      code: "VEHICLE_UPDATE_CONFLICT",
      errors: [conflictMessage],
      ok: false,
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        persistence={{
          activateVehicleCard: vi.fn(),
          createVehicleCard: vi.fn(),
          updateVehicleCard,
        }}
        vehicleCards={[createVehicleCardTestRow()]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "34 NOA 303 düzenle" }),
    );
    fireEvent.change(screen.getByLabelText("Sürücü"), {
      target: { value: "Ayşe Operatör" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Araç Kartını Güncelle" }),
    );

    expect(await screen.findByText(conflictMessage)).toBeTruthy();
    expect(refreshMock).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Güncel Kaydı Yükle" }),
    );

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(conflictMessage)).toBeNull();
    expect(
      screen.getByText(
        "Güncel araç kartı yüklendi. Düzenlemek için kaydı yeniden açın.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Araç Kartı" }),
    ).toBeTruthy();
  });

  test("closes vehicle activation confirmation with Escape without mutation", async () => {
    const activateVehicleCard = vi.fn().mockResolvedValue({
      ok: true,
      data: { row: { id: "vehicle-passive-303", status: "Aktif" } },
    });

    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-303",
            brand: "Ford",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-05T19:30:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Ali Usta",
            id: "vehicle-passive-303",
            modelName: "Transit",
            modelYear: 2024,
            periodId: "period-2026",
            plate: "34 NOA 303",
            siteCode: "SNT-001",
            siteName: "Merkez Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T08:15:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Kamyonet",
          },
        ]}
        persistence={{ activateVehicleCard }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "34 NOA 303 aktifleştir" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Araç aktifleştirme onayı" }),
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Araç aktifleştirme onayı" }),
      ).toBeNull();
    });
    expect(activateVehicleCard).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });
  test("filters passive vehicle cards without changing active tracking rows", async () => {
    render(
      <VehicleFleetSurface
        overview={getDefaultArventoVehicleFleetOverview()}
        vehicleCards={[
          {
            arventoDeviceId: "ARV-303",
            brand: "Ford",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-05T19:30:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Ali Usta",
            id: "vehicle-passive-303",
            modelName: "Transit",
            modelYear: 2024,
            periodId: "period-2026",
            plate: "34 NOA 303",
            siteCode: "SNT-001",
            siteName: "Merkez Şantiye",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T08:15:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Kamyonet",
          },
          {
            arventoDeviceId: "ARV-404",
            brand: "BMC",
            companyId: "company-demo-insaat",
            createdAt: "2026-07-06T08:30:00.000Z",
            createdBy: "user-demo-admin",
            driverName: "Zeynep Operatör",
            id: "vehicle-passive-404",
            modelName: "Tugra",
            modelYear: 2023,
            periodId: "period-2026",
            plate: "35 NOA 404",
            siteCode: "SNT-002",
            siteName: "Depo / Lojistik",
            status: "Pasif",
            tenantId: "tenant-noa-demo",
            updatedAt: "2026-07-09T08:20:00.000Z",
            updatedBy: "user-demo-admin",
            vehicleType: "Kamyon",
          },
        ]}
        persistence={{ activateVehicleCard: vi.fn() }}
      />,
  );

    expect(screen.getByText("2 pasif kart")).toBeTruthy();
    const searchInput = screen.getByLabelText("Pasif araçlarda ara");
    fireEvent.change(searchInput, { target: { value: "Depo" } });

    const passiveVehicleTable = screen.getByRole("table", {
      name: "P2 Pasif Araç Kartları",
    });
    expect(screen.getByText("1 / 2 pasif kart")).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Pasif araç aramasını temizle",
        }),
      ).toBeTruthy();
    });
    expect(within(passiveVehicleTable).getByText("35 NOA 404")).toBeTruthy();
    expect(within(passiveVehicleTable).queryByText("34 NOA 303")).toBeNull();
    expect(screen.getByRole("table", { name: "P2 Arvento Araç Takip Listesi" })).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Pasif araç aramasını temizle" }),
    );
    expect(screen.getByText("2 pasif kart")).toBeTruthy();
    expect((screen.getByLabelText("Pasif araçlarda ara") as HTMLInputElement).value).toBe("");
    expect(within(passiveVehicleTable).getByText("34 NOA 303")).toBeTruthy();
    expect(within(passiveVehicleTable).getByText("35 NOA 404")).toBeTruthy();

    fireEvent.change(searchInput, { target: { value: "eşleşmeyen" } });

    expect(screen.getByText("Pasif araç bulunamadı.")).toBeTruthy();
  });

  test("filters the active vehicle tracking list client-side", async () => {
    render(
      <VehicleFleetSurface overview={getDefaultArventoVehicleFleetOverview()} />,
    );

    expect(screen.getByText("Son 3 araç")).toBeTruthy();
    const activeSearch = screen.getByLabelText("Aktif araçlarda ara");
    fireEvent.change(activeSearch, { target: { value: "303" } });

    const activeVehicleTable = screen.getByRole("table", {
      name: "P2 Arvento Araç Takip Listesi",
    });
    await waitFor(() => {
      expect(screen.getByText("1 / 3 araç")).toBeTruthy();
      expect(
        screen.getByRole("button", {
          name: "Aktif araç aramasını temizle",
        }),
      ).toBeTruthy();
    });
    expect(within(activeVehicleTable).getByText("34 NOA 303")).toBeTruthy();
    expect(within(activeVehicleTable).queryByText("34 NOA 101")).toBeNull();
    expect(within(activeVehicleTable).queryByText("34 NOA 202")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Aktif araç aramasını temizle" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Son 3 araç")).toBeTruthy();
      expect(
        screen.queryByRole("button", {
          name: "Aktif araç aramasını temizle",
        }),
      ).toBeNull();
      expect(
        (screen.getByLabelText("Aktif araçlarda ara") as HTMLInputElement).value,
      ).toBe("");
      expect(within(activeVehicleTable).getByText("34 NOA 101")).toBeTruthy();
      expect(within(activeVehicleTable).getByText("34 NOA 202")).toBeTruthy();
      expect(within(activeVehicleTable).getByText("34 NOA 303")).toBeTruthy();
    });

    fireEvent.change(activeSearch, { target: { value: "eşleşmeyen" } });

    expect(screen.getByText("Aktif araç bulunamadı.")).toBeTruthy();
  });

  test("filters the vehicle alerts client-side", async () => {
    render(
      <VehicleFleetSurface overview={getDefaultArventoVehicleFleetOverview()} />,
    );

    expect(screen.getByText("Son 3 uyarı")).toBeTruthy();
    const alertSearch = screen.getByLabelText("Uyarılarda ara");
    fireEvent.change(alertSearch, { target: { value: "sinyal" } });

    const alertsTable = screen.getByRole("table", {
      name: "P2 Arvento Araç Uyarıları",
    });
    await waitFor(() => {
      expect(screen.getByText("1 / 3 uyarı")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Uyarı aramasını temizle" }),
      ).toBeTruthy();
      expect(within(alertsTable).getByText("Sinyal yok")).toBeTruthy();
      expect(within(alertsTable).queryByText("Yaklaşan bakım")).toBeNull();
      expect(within(alertsTable).queryByText("Yakıt seviyesi izleniyor")).toBeNull();
    });

    fireEvent.change(alertSearch, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Uyarı türü filtresi"), {
      target: { value: "maintenance" },
    });
    await waitFor(() => {
      expect(screen.getByText("1 / 3 uyarı")).toBeTruthy();
      expect(within(alertsTable).getByText("Yaklaşan bakım")).toBeTruthy();
      expect(within(alertsTable).queryByText("Sinyal yok")).toBeNull();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Uyarı aramasını temizle" }),
    );
    await waitFor(() => {
      expect(screen.getByText("Son 3 uyarı")).toBeTruthy();
      expect(
        (screen.getByLabelText("Uyarılarda ara") as HTMLInputElement).value,
      ).toBe("");
      expect(within(alertsTable).getByText("Yaklaşan bakım")).toBeTruthy();
      expect(within(alertsTable).getByText("Yakıt seviyesi izleniyor")).toBeTruthy();
    });

    fireEvent.change(alertSearch, { target: { value: "eşleşmeyen" } });
    expect(screen.getByText("Uyarı bulunamadı.")).toBeTruthy();
  });

  test("finds dated vehicle alerts by their due date", () => {
    const overview = getDefaultArventoVehicleFleetOverview();
    overview.alerts = [
      {
        detail: "34 NOA 505 sigorta süresi 2026-07-20 tarihinde doluyor (15 gün).",
        dueDate: "2026-07-20",
        id: "vehicle-insurance-alert",
        plate: "34 NOA 505",
        severity: "Uyarı",
        title: "Sigorta süresi yaklaşıyor",
      },
      {
        detail: "34 NOA 505 son sinyalden beri takip gerektirir.",
        id: "vehicle-signal-alert",
        plate: "34 NOA 505",
        severity: "Kritik",
        title: "Sinyal yok",
      },
    ];

    render(<VehicleFleetSurface overview={overview} />);
    fireEvent.change(screen.getByLabelText("Uyarılarda ara"), {
      target: { value: "2026-07-20" },
    });

    const alertsTable = screen.getByRole("table", {
      name: "P2 Arvento Araç Uyarıları",
    });
    expect(within(alertsTable).getByText("Sigorta süresi yaklaşıyor")).toBeTruthy();
    expect(within(alertsTable).queryByText("Sinyal yok")).toBeNull();
  });

  test("renders the Arvento-backed vehicle tracking read model without live GPS writes", () => {
    render(
      <VehicleFleetSurface overview={getDefaultArventoVehicleFleetOverview()} />,
    );

    expect(
      screen.getByRole("heading", { name: "Araç / Filo Yönetimi" }),
    ).toBeTruthy();
    expect(screen.getByText("Toplam araç")).toBeTruthy();
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: "Uyarı" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Kritik uyarı" })).toBeTruthy();
    expect(screen.getAllByText("Hareket halinde").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Park halinde").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sinyal yok").length).toBeGreaterThan(0);

    const table = screen.getByRole("table", {
      name: "P2 Arvento Araç Takip Listesi",
    });
    expect(within(table).getByText("34 NOA 101")).toBeTruthy();
    expect(within(table).getByText("Merkez Şantiye")).toBeTruthy();
    expect(within(table).getByText("Kamyon / Mercedes Arocs 2022")).toBeTruthy();
    expect(within(table).getByText("78%")).toBeTruthy();
    expect(within(table).getByText("Bakım takipte")).toBeTruthy();
    expect(within(table).getByText("34 NOA 303")).toBeTruthy();
    expect(within(table).getByText("Sinyal kontrolü")).toBeTruthy();

    const alertsTable = screen.getByRole("table", {
      name: "P2 Arvento Araç Uyarıları",
    });
    expect(within(alertsTable).getByText("Kritik")).toBeTruthy();
    expect(within(alertsTable).getByText("Sinyal yok")).toBeTruthy();
    expect(within(alertsTable).getAllByText("34 NOA 303").length).toBeGreaterThan(
      0,
    );
    expect(within(alertsTable).getByText("Yaklaşan bakım")).toBeTruthy();
    expect(within(alertsTable).getByText("34 NOA 202")).toBeTruthy();
    expect(
      within(alertsTable).getByText("Yakıt seviyesi izleniyor"),
    ).toBeTruthy();
  });
});















