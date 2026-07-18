import { describe, expect, test } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  buildVehicleCardRow,
  createVehicleCardDraft,
  validateVehicleCardDraft,
} from "./vehicle-service";

describe("vehicle service", () => {
  test("normalizes a vehicle card draft before persistence", () => {
    expect(
      createVehicleCardDraft({
        acquisitionDate: " 2026-07-01 ",
        arventoDeviceId: " arv-303 ",
        brand: " Ford ",
        chassisNumber: " wvw zzZ 123 ",
        dispositionDate: " 2026-07-10 ",
        insuranceEndDate: " 2026-12-31 ",
        inspectionEndDate: " 2027-01-15 ",
        registrationDate: " 2026-06-20 ",
        driverName: " Ali Usta ",
        engineNumber: " eng 303 tr ",
        entryOdometerKm: "125000",
        fuelType: " Dizel ",
        modelName: " Transit ",
        modelYear: "2024",
        plate: " 34 noa 303 ",
        siteCode: " SNT-001 ",
        siteName: " Merkez Şantiye ",
        vehicleType: " Kamyonet ",
      }),
    ).toEqual({
      acquisitionDate: "2026-07-01",
      arventoDeviceId: "ARV-303",
      brand: "Ford",
      chassisNumber: "WVW ZZZ 123",
      dispositionDate: "2026-07-10",
      insuranceEndDate: "2026-12-31",
      inspectionEndDate: "2027-01-15",
      registrationDate: "2026-06-20",
      driverName: "Ali Usta",
      engineNumber: "ENG 303 TR",
      entryOdometerKm: 125000,
      fuelType: "Dizel",
      modelName: "Transit",
      modelYear: 2024,
      plate: "34 NOA 303",
      siteCode: "SNT-001",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });
  });

  test("validates required vehicle card fields", () => {
    const draft = createVehicleCardDraft({
      modelYear: "1885",
      plate: " ",
      siteName: "",
      vehicleType: "\t",
    });

    expect(validateVehicleCardDraft(draft)).toEqual([
      "Plaka zorunludur.",
      "Araç tipi zorunludur.",
      "Şantiye adı zorunludur.",
      "Model yılı 1900 ile 2100 arasında olmalıdır.",
    ]);
  });

  test.each(["20AB", "2024.5"])(
    "rejects malformed model year value %s",
    (modelYear) => {
      const draft = createVehicleCardDraft({
        modelYear,
        plate: "34 NOA 303",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      });

      expect(validateVehicleCardDraft(draft)).toContain(
        "Model yılı dört haneli geçerli bir yıl olmalıdır.",
      );
    },
  );

  test.each(["12.5", "-1", "geçersiz"])(
    "rejects invalid entry odometer value %s",
    (entryOdometerKm) => {
      const draft = createVehicleCardDraft({
        entryOdometerKm,
        plate: "34 NOA 303",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      });

      expect(validateVehicleCardDraft(draft)).toContain(
        "Giriş KM negatif olmayan bir tam sayı olmalıdır.",
      );
    },
  );

  test.each(["2026-02-29", "01.07.2026", "2026-13-01"])(
    "rejects invalid acquisition date %s",
    (acquisitionDate) => {
      const draft = createVehicleCardDraft({
        acquisitionDate,
        plate: "34 NOA 303",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      });

      expect(validateVehicleCardDraft(draft)).toContain(
        "Alındığı/kiralandığı tarih geçerli bir tarih olmalıdır.",
      );
    },
  );

  test("rejects a disposition date before the acquisition date", () => {
    const draft = createVehicleCardDraft({
      acquisitionDate: "2026-07-10",
      dispositionDate: "2026-07-09",
      plate: "34 NOA 303",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(validateVehicleCardDraft(draft)).toContain(
      "Satıldığı/iade tarihi alındığı/kiralandığı tarihten önce olamaz.",
    );
  });

  test("rejects an invalid disposition calendar date", () => {
    const draft = createVehicleCardDraft({
      dispositionDate: "2026-02-29",
      plate: "34 NOA 303",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(validateVehicleCardDraft(draft)).toContain(
      "Satıldığı/iade tarihi geçerli bir tarih olmalıdır.",
    );
  });

  test("rejects an invalid insurance end calendar date", () => {
    const draft = createVehicleCardDraft({
      insuranceEndDate: "2026-02-29",
      plate: "34 NOA 303",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(validateVehicleCardDraft(draft)).toContain(
      "Sigorta bitiş tarihi geçerli bir tarih olmalıdır.",
    );
  });

  test("rejects an invalid inspection end calendar date", () => {
    const draft = createVehicleCardDraft({
      inspectionEndDate: "2026-02-29",
      plate: "34 NOA 303",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(validateVehicleCardDraft(draft)).toContain(
      "Muayene bitiş tarihi geçerli bir tarih olmalıdır.",
    );
  });

  test("rejects an invalid maintenance calendar date", () => {
    const draft = createVehicleCardDraft({
      maintenanceDueDate: "2026-02-29",
      modelYear: 2024,
      plate: "34 NOA 606",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyon",
    });

    expect(validateVehicleCardDraft(draft)).toContain(
      "Bakım tarihi geçerli bir tarih olmalıdır.",
    );
  });

  test("rejects an invalid registration calendar date", () => {
    const draft = createVehicleCardDraft({
      registrationDate: "2026-02-29",
      plate: "34 NOA 303",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(validateVehicleCardDraft(draft)).toContain(
      "Tescil tarihi geçerli bir tarih olmalıdır.",
    );
  });

  test("builds a scoped vehicle card row with deterministic identity", () => {
    const draft = createVehicleCardDraft({
      arventoDeviceId: "ARV-303",
      brand: "Ford",
      driverName: "Ali Usta",
      modelName: "Transit",
      modelYear: "2024",
      plate: "34 NOA 303",
      siteCode: "SNT-001",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(
      buildVehicleCardRow({
        draft,
        nowIso: "2026-07-05T19:30:00.000Z",
        scope: defaultTenantScope,
      }),
    ).toEqual({
      ...draft,
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-07-05T19:30:00.000Z",
      createdBy: defaultTenantScope.userId,
      id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
      periodId: defaultTenantScope.periodId,
      status: "Aktif",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-05T19:30:00.000Z",
      updatedBy: defaultTenantScope.userId,
    });
  });
});
