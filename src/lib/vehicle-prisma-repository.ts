import type { VehicleCardRow, VehicleCardStatus, VehicleRepository } from "./vehicle-service";

type VehicleRecord = {
  acquisitionDate?: Date | string | null;
  arventoDeviceId?: string | null;
  brand?: string | null;
  chassisNumber?: string | null;
  companyId: string;
  createdAt: Date | string;
  createdBy: string;
  dispositionDate?: Date | string | null;
  insuranceEndDate?: Date | string | null;
  inspectionEndDate?: Date | string | null;
  maintenanceDueDate?: Date | string | null;
  registrationDate?: Date | string | null;
  driverName?: string | null;
  engineNumber?: string | null;
  entryOdometerKm?: number | null;
  fuelType?: string | null;
  id: string;
  modelName?: string | null;
  modelYear?: number | null;
  periodId: string;
  plate: string;
  siteCode?: string | null;
  siteName: string;
  status: string;
  tenantId: string;
  updatedAt: Date | string;
  updatedBy: string;
  vehicleType: string;
};

type VehicleUpdateData =
  | ReturnType<typeof rowToUpdateData>
  | {
      status: VehicleCardStatus;
      updatedAt: Date;
      updatedBy: string;
    };

type VehicleClient = {
  findFirst(input: {
    where: {
      companyId: string;
      id: string;
      periodId: string;
      tenantId: string;
    };
  }): Promise<VehicleRecord | null>;
  findMany(input: {
    orderBy: Array<{ plate: "asc" | "desc" }>;
    where: {
      companyId: string;
      periodId: string;
      tenantId: string;
    };
  }): Promise<VehicleRecord[]>;
  update(input: {
    data: VehicleUpdateData;
    where: {
      companyId?: string;
      id: string;
      periodId?: string;
      tenantId?: string;
      updatedAt?: Date;
    };
  }): Promise<VehicleRecord>;
  upsert(input: {
    create: ReturnType<typeof rowToCreateData>;
    update: ReturnType<typeof rowToUpdateData>;
    where: {
      id: string;
    };
  }): Promise<VehicleRecord>;
};

export type VehiclePrismaClientLike = {
  vehicle: VehicleClient;
};

export function createVehiclePrismaRepository(
  prisma: VehiclePrismaClientLike,
): VehicleRepository {
  return {
    async list({ scope }) {
      const rows = await prisma.vehicle.findMany({
        orderBy: [{ plate: "asc" }],
        where: {
          companyId: scope.companyId,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      return rows.map(recordToRow);
    },
    async setStatus({ id, nowIso, scope, status }) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          companyId: scope.companyId,
          id,
          periodId: scope.periodId,
          tenantId: scope.tenantId,
        },
      });

      if (!existing) {
        return null;
      }

      const updated = await prisma.vehicle.update({
        data: {
          status,
          updatedAt: new Date(nowIso),
          updatedBy: scope.userId,
        },
        where: {
          id: existing.id,
        },
      });

      return recordToRow(updated);
    },
    async updateIfUnchanged({ expectedUpdatedAt, row }) {
      try {
        const updated = await prisma.vehicle.update({
          data: rowToUpdateData(row),
          where: {
            companyId: row.companyId,
            id: row.id,
            periodId: row.periodId,
            tenantId: row.tenantId,
            updatedAt: new Date(expectedUpdatedAt),
          },
        });

        return recordToRow(updated);
      } catch (error) {
        if (isPrismaRecordNotFound(error)) {
          return null;
        }

        throw error;
      }
    },
    async upsert(row) {
      const persisted = await prisma.vehicle.upsert({
        create: rowToCreateData(row),
        update: rowToUpdateData(row),
        where: {
          id: row.id,
        },
      });

      return recordToRow(persisted);
    },
  };
}

function rowToCreateData(row: VehicleCardRow) {
  return {
    acquisitionDate: row.acquisitionDate
      ? new Date(`${row.acquisitionDate}T00:00:00.000Z`)
      : null,
    arventoDeviceId: row.arventoDeviceId || null,
    brand: row.brand || null,
    chassisNumber: row.chassisNumber || null,
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    dispositionDate: row.dispositionDate
      ? new Date(`${row.dispositionDate}T00:00:00.000Z`)
      : null,
    insuranceEndDate: row.insuranceEndDate
      ? new Date(`${row.insuranceEndDate}T00:00:00.000Z`)
      : null,
    inspectionEndDate: row.inspectionEndDate
      ? new Date(`${row.inspectionEndDate}T00:00:00.000Z`)
      : null,
    maintenanceDueDate: row.maintenanceDueDate
      ? new Date(`${row.maintenanceDueDate}T00:00:00.000Z`)
      : null,
    registrationDate: row.registrationDate
      ? new Date(`${row.registrationDate}T00:00:00.000Z`)
      : null,
    driverName: row.driverName || null,
    engineNumber: row.engineNumber || null,
    entryOdometerKm: row.entryOdometerKm || null,
    fuelType: row.fuelType || null,
    id: row.id,
    modelName: row.modelName || null,
    modelYear: row.modelYear || null,
    periodId: row.periodId,
    plate: row.plate,
    siteCode: row.siteCode || null,
    siteName: row.siteName,
    status: row.status,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    vehicleType: row.vehicleType,
  };
}

function rowToUpdateData(row: VehicleCardRow) {
  return {
    acquisitionDate: row.acquisitionDate
      ? new Date(`${row.acquisitionDate}T00:00:00.000Z`)
      : null,
    arventoDeviceId: row.arventoDeviceId || null,
    brand: row.brand || null,
    chassisNumber: row.chassisNumber || null,
    dispositionDate: row.dispositionDate
      ? new Date(`${row.dispositionDate}T00:00:00.000Z`)
      : null,
    insuranceEndDate: row.insuranceEndDate
      ? new Date(`${row.insuranceEndDate}T00:00:00.000Z`)
      : null,
    inspectionEndDate: row.inspectionEndDate
      ? new Date(`${row.inspectionEndDate}T00:00:00.000Z`)
      : null,
    maintenanceDueDate: row.maintenanceDueDate
      ? new Date(`${row.maintenanceDueDate}T00:00:00.000Z`)
      : null,
    registrationDate: row.registrationDate
      ? new Date(`${row.registrationDate}T00:00:00.000Z`)
      : null,
    driverName: row.driverName || null,
    engineNumber: row.engineNumber || null,
    entryOdometerKm: row.entryOdometerKm || null,
    fuelType: row.fuelType || null,
    modelName: row.modelName || null,
    modelYear: row.modelYear || null,
    plate: row.plate,
    siteCode: row.siteCode || null,
    siteName: row.siteName,
    status: row.status,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
    vehicleType: row.vehicleType,
  };
}

function recordToRow(record: VehicleRecord): VehicleCardRow {
  return {
    acquisitionDate: record.acquisitionDate
      ? formatDateOnly(record.acquisitionDate)
      : "",
    arventoDeviceId: record.arventoDeviceId ?? "",
    brand: record.brand ?? "",
    chassisNumber: record.chassisNumber ?? "",
    companyId: record.companyId,
    createdAt: formatIso(record.createdAt),
    createdBy: record.createdBy,
    dispositionDate: record.dispositionDate
      ? formatDateOnly(record.dispositionDate)
      : "",
    insuranceEndDate: record.insuranceEndDate
      ? formatDateOnly(record.insuranceEndDate)
      : "",
    inspectionEndDate: record.inspectionEndDate
      ? formatDateOnly(record.inspectionEndDate)
      : "",
    ...(record.maintenanceDueDate
      ? { maintenanceDueDate: formatDateOnly(record.maintenanceDueDate) }
      : {}),
    registrationDate: record.registrationDate
      ? formatDateOnly(record.registrationDate)
      : "",
    driverName: record.driverName ?? "",
    engineNumber: record.engineNumber ?? "",
    entryOdometerKm: record.entryOdometerKm ?? 0,
    fuelType: record.fuelType ?? "",
    id: record.id,
    modelName: record.modelName ?? "",
    modelYear: record.modelYear ?? 0,
    periodId: record.periodId,
    plate: record.plate,
    siteCode: record.siteCode ?? "",
    siteName: record.siteName,
    status: record.status === "Pasif" ? "Pasif" : "Aktif",
    tenantId: record.tenantId,
    updatedAt: formatIso(record.updatedAt),
    updatedBy: record.updatedBy,
    vehicleType: record.vehicleType,
  };
}

function formatIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function formatDateOnly(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function isPrismaRecordNotFound(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025",
  );
}

