import { describe, expect, test } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import { createVehiclePrismaRepository } from "./vehicle-prisma-repository";
import type { VehicleCardRow } from "./vehicle-service";

const vehicle: VehicleCardRow = {
  acquisitionDate: "2026-07-01",
  arventoDeviceId: "ARV-303",
  brand: "Ford",
  chassisNumber: "WVWZZZ123",
  companyId: defaultTenantScope.companyId,
  createdAt: "2026-07-05T19:30:00.000Z",
  createdBy: defaultTenantScope.userId,
  dispositionDate: "2026-07-10",
  insuranceEndDate: "2026-12-31",
  inspectionEndDate: "2027-01-15",
  registrationDate: "2026-06-20",
  driverName: "Ali Usta",
  engineNumber: "ENG303TR",
  entryOdometerKm: 125000,
  fuelType: "Dizel",
  id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
  modelName: "Transit",
  modelYear: 2024,
  periodId: defaultTenantScope.periodId,
  plate: "34 NOA 303",
  siteCode: "SNT-001",
  siteName: "Merkez Şantiye",
  status: "Aktif",
  tenantId: defaultTenantScope.tenantId,
  updatedAt: "2026-07-05T19:30:00.000Z",
  updatedBy: defaultTenantScope.userId,
  vehicleType: "Kamyonet",
};

describe("vehicle prisma repository", () => {
  test("lists vehicle cards in tenant company period scope", async () => {
    const repository = createVehiclePrismaRepository({
      vehicle: {
        async findFirst() {
          throw new Error("not used");
        },
        async findMany(input) {
          expect(input).toEqual({
            orderBy: [{ plate: "asc" }],
            where: {
              companyId: defaultTenantScope.companyId,
              periodId: defaultTenantScope.periodId,
              tenantId: defaultTenantScope.tenantId,
            },
          });

          return [
            {
              ...vehicle,
              arventoDeviceId: null,
              createdAt: new Date(vehicle.createdAt),
              updatedAt: new Date(vehicle.updatedAt),
            },
          ];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(repository.list({ scope: defaultTenantScope })).resolves.toEqual([
      {
        ...vehicle,
        arventoDeviceId: "",
      },
    ]);
  });

  test("upserts vehicle cards by scoped plate identity", async () => {
    const calls: unknown[] = [];
    const repository = createVehiclePrismaRepository({
      vehicle: {
        async findFirst() {
          throw new Error("not used");
        },
        async findMany() {
          return [];
        },
        async update() {
          throw new Error("not used");
        },
        async upsert(input) {
          calls.push(input);

          return {
            ...input.create,
            createdAt: input.create.createdAt,
            updatedAt: input.create.updatedAt,
          };
        },
      },
    });

    await expect(repository.upsert(vehicle)).resolves.toEqual(vehicle);
    expect(calls).toEqual([
      expect.objectContaining({
        create: expect.objectContaining({
          acquisitionDate: new Date("2026-07-01T00:00:00.000Z"),
          dispositionDate: new Date("2026-07-10T00:00:00.000Z"),
          insuranceEndDate: new Date("2026-12-31T00:00:00.000Z"),
          inspectionEndDate: new Date("2027-01-15T00:00:00.000Z"),
          registrationDate: new Date("2026-06-20T00:00:00.000Z"),
          arventoDeviceId: "ARV-303",
          chassisNumber: "WVWZZZ123",
          engineNumber: "ENG303TR",
          entryOdometerKm: 125000,
          fuelType: "Dizel",
          plate: "34 NOA 303",
          siteName: "Merkez Şantiye",
          tenantId: defaultTenantScope.tenantId,
        }),
        update: expect.objectContaining({
          acquisitionDate: new Date("2026-07-01T00:00:00.000Z"),
          dispositionDate: new Date("2026-07-10T00:00:00.000Z"),
          insuranceEndDate: new Date("2026-12-31T00:00:00.000Z"),
          inspectionEndDate: new Date("2027-01-15T00:00:00.000Z"),
          registrationDate: new Date("2026-06-20T00:00:00.000Z"),
          arventoDeviceId: "ARV-303",
          driverName: "Ali Usta",
          engineNumber: "ENG303TR",
          entryOdometerKm: 125000,
          chassisNumber: "WVWZZZ123",
          fuelType: "Dizel",
          status: "Aktif",
          updatedBy: defaultTenantScope.userId,
        }),
        where: {
          id: vehicle.id,
        },
      }),
    ]);
  });

  test("updates a vehicle card only when its scoped version is unchanged", async () => {
    const calls: unknown[] = [];
    const updatedVehicle = {
      ...vehicle,
      driverName: "Ayşe Operatör",
      updatedAt: "2026-07-10T10:00:00.000Z",
    };
    const repository = createVehiclePrismaRepository({
      vehicle: {
        async findFirst() {
          throw new Error("not used");
        },
        async findMany() {
          return [];
        },
        async update(input) {
          calls.push(input);

          return {
            ...updatedVehicle,
            createdAt: new Date(updatedVehicle.createdAt),
            updatedAt: input.data.updatedAt,
          };
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.updateIfUnchanged({
        expectedUpdatedAt: vehicle.updatedAt,
        row: updatedVehicle,
      }),
    ).resolves.toEqual(updatedVehicle);
    expect(calls).toEqual([
      {
        data: expect.objectContaining({
          driverName: "Ayşe Operatör",
          updatedAt: new Date("2026-07-10T10:00:00.000Z"),
        }),
        where: {
          companyId: defaultTenantScope.companyId,
          id: vehicle.id,
          periodId: defaultTenantScope.periodId,
          tenantId: defaultTenantScope.tenantId,
          updatedAt: new Date(vehicle.updatedAt),
        },
      },
    ]);
  });

  test("returns a conflict when the vehicle version changed before update", async () => {
    const repository = createVehiclePrismaRepository({
      vehicle: {
        async findFirst() {
          throw new Error("not used");
        },
        async findMany() {
          return [];
        },
        async update() {
          throw Object.assign(new Error("record not found"), { code: "P2025" });
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.updateIfUnchanged({
        expectedUpdatedAt: vehicle.updatedAt,
        row: { ...vehicle, updatedAt: "2026-07-10T10:00:00.000Z" },
      }),
    ).resolves.toBeNull();
  });

  test("sets vehicle card status inside tenant company period scope", async () => {
    const calls: unknown[] = [];
    const repository = createVehiclePrismaRepository({
      vehicle: {
        async findMany() {
          return [];
        },
        async findFirst(input) {
          calls.push({ findFirst: input });

          return {
            ...vehicle,
            createdAt: new Date(vehicle.createdAt),
            updatedAt: new Date(vehicle.updatedAt),
          };
        },
        async update(input) {
          calls.push({ update: input });

          return {
            ...vehicle,
            status: input.data.status,
            updatedAt: input.data.updatedAt,
            updatedBy: input.data.updatedBy,
          };
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.setStatus({
        id: vehicle.id,
        nowIso: "2026-07-09T08:15:00.000Z",
        scope: defaultTenantScope,
        status: "Pasif",
      }),
    ).resolves.toEqual({
      ...vehicle,
      status: "Pasif",
      updatedAt: "2026-07-09T08:15:00.000Z",
      updatedBy: defaultTenantScope.userId,
    });
    expect(calls).toEqual([
      {
        findFirst: {
          where: {
            companyId: defaultTenantScope.companyId,
            id: vehicle.id,
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
      {
        update: {
          data: {
            status: "Pasif",
            updatedAt: new Date("2026-07-09T08:15:00.000Z"),
            updatedBy: defaultTenantScope.userId,
          },
          where: {
            id: vehicle.id,
          },
        },
      },
    ]);
  });

  test("does not update vehicle card status outside tenant company period scope", async () => {
    const calls: unknown[] = [];
    const repository = createVehiclePrismaRepository({
      vehicle: {
        async findMany() {
          return [];
        },
        async findFirst(input) {
          calls.push({ findFirst: input });
          return null;
        },
        async update() {
          throw new Error("not used");
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.setStatus({
        id: vehicle.id,
        nowIso: "2026-07-09T08:15:00.000Z",
        scope: defaultTenantScope,
        status: "Pasif",
      }),
    ).resolves.toBeNull();
    expect(calls).toEqual([
      {
        findFirst: {
          where: {
            companyId: defaultTenantScope.companyId,
            id: vehicle.id,
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
    ]);
  });
});


