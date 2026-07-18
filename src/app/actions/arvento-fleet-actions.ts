"use server";

import { revalidatePath } from "next/cache";

import { getSubscriptionFeatureActionContext } from "@/app/actions/subscription-feature-action-guard";
import { createAuditLogEntry } from "@/lib/audit-log";
import {
  createAuditLogPrismaRepository,
  type AuditLogPrismaClientLike,
} from "@/lib/audit-log-prisma-repository";
import {
  getArventoVehicleFleetOverview,
  testArventoSandboxConnection,
} from "@/lib/arvento-fleet-service";
import { prisma } from "@/lib/prisma";
import {
  createVehiclePrismaRepository,
  type VehiclePrismaClientLike,
} from "@/lib/vehicle-prisma-repository";
import {
  buildVehicleCardRow,
  createVehicleCardDraft,
  validateVehicleCardDraft,
  type VehicleCardDraftValues,
  type VehicleCardRow,
} from "@/lib/vehicle-service";

const vehicleRepository = createVehiclePrismaRepository(
  prisma as unknown as VehiclePrismaClientLike,
);
const auditLogRepository = createAuditLogPrismaRepository(
  prisma as unknown as AuditLogPrismaClientLike,
);

export async function testArventoSandboxConnectionAction() {
  const context = await getSubscriptionFeatureActionContext("arvento-fleet");

  if (!context.ok) {
    return context.result;
  }

  const result = testArventoSandboxConnection();

  if (result.ok) {
    revalidatePath("/ayarlar");
    revalidatePath("/[module]", "page");
  }

  return result;
}
export async function listArventoVehicleFleetOverviewAction() {
  const context = await getSubscriptionFeatureActionContext("arvento-fleet");

  if (!context.ok) {
    return context.result;
  }

  const [vehicleCards, auditEntries] = await Promise.all([
    vehicleRepository.list({ scope: context.scope }),
    auditLogRepository.listByEntityType({
      entityType: "vehicle",
      limit: 20,
      scope: context.scope,
    }),
  ]);

  return {
    ok: true as const,
    data: {
      auditEntries,
      overview: getArventoVehicleFleetOverview(vehicleCards),
      vehicleCards,
    },
  };
}
export async function createVehicleCardAction(values: VehicleCardDraftValues) {
  const context = await getSubscriptionFeatureActionContext("arvento-fleet");

  if (!context.ok) {
    return context.result;
  }

  const draft = createVehicleCardDraft(values);
  const errors = validateVehicleCardDraft(draft);

  if (errors.length > 0) {
    return {
      ok: false as const,
      errors,
    };
  }

  const nowIso = new Date().toISOString();
  const builtRow = buildVehicleCardRow({
    draft,
    nowIso,
    scope: context.scope,
  });
  const vehicleCards = await vehicleRepository.list({ scope: context.scope });
  const existingVehicleCard = vehicleCards.find(
    (vehicleCard) => vehicleCard.id === builtRow.id,
  );

  if (existingVehicleCard) {
    return {
      ok: false as const,
      errors: [
        `Araç plakası bu dönem için zaten kullanılıyor: ${draft.plate}`,
      ],
    };
  }

  const row = builtRow;
  const deviceConflict = draft.arventoDeviceId
    ? vehicleCards.find(
        (vehicleCard) =>
          vehicleCard.id !== row.id &&
          vehicleCard.arventoDeviceId.toLocaleUpperCase("tr-TR") ===
            draft.arventoDeviceId,
      )
    : undefined;

  if (deviceConflict) {
    return {
      ok: false as const,
      errors: [
        `Arvento cihaz ID başka bir araç kartında kullanılıyor: ${draft.arventoDeviceId}`,
      ],
    };
  }

  const chassisConflict = draft.chassisNumber
    ? vehicleCards.find(
        (vehicleCard) =>
          vehicleCard.id !== row.id &&
          vehicleCard.chassisNumber?.toLocaleUpperCase("tr-TR") ===
            draft.chassisNumber,
      )
    : undefined;

  if (chassisConflict) {
    return {
      ok: false as const,
      errors: [`Şase no başka bir araç kartında kullanılıyor: ${draft.chassisNumber}`],
    };
  }

  let persistedRow: VehicleCardRow;

  try {
    persistedRow = await vehicleRepository.upsert(row);
  } catch (error) {
    if (draft.arventoDeviceId && isArventoDeviceUniqueConflict(error)) {
      return {
        ok: false as const,
        errors: [
          `Arvento cihaz ID başka bir araç kartında kullanılıyor: ${draft.arventoDeviceId}`,
        ],
      };
    }

    if (draft.chassisNumber && isChassisNumberUniqueConflict(error)) {
      return {
        ok: false as const,
        errors: [`Şase no başka bir araç kartında kullanılıyor: ${draft.chassisNumber}`],
      };
    }

    if (isVehicleUniqueConflict(error, "plate")) {
      return {
        ok: false as const,
        errors: [
          `Araç plakası bu dönem için zaten kullanılıyor: ${draft.plate}`,
        ],
      };
    }

    throw error;
  }

  await auditLogRepository.record(
    createAuditLogEntry(context.scope, {
      action: "vehicle.create",
      entityId: persistedRow.id,
      entityLabel: persistedRow.plate,
      entityType: "vehicle",
      metadata: {
        acquisitionDate: persistedRow.acquisitionDate,
        arventoDeviceId: persistedRow.arventoDeviceId,
        chassisNumber: persistedRow.chassisNumber,
        dispositionDate: persistedRow.dispositionDate,
        insuranceEndDate: persistedRow.insuranceEndDate,
        inspectionEndDate: persistedRow.inspectionEndDate,
        maintenanceDueDate: persistedRow.maintenanceDueDate,
        registrationDate: persistedRow.registrationDate,
        engineNumber: persistedRow.engineNumber,
        entryOdometerKm: persistedRow.entryOdometerKm,
        fuelType: persistedRow.fuelType,
        siteName: persistedRow.siteName,
        status: persistedRow.status,
        vehicleType: persistedRow.vehicleType,
      },
      occurredAt: persistedRow.updatedAt,
    }),
  );

  revalidatePath("/araclar");
  revalidatePath("/[module]", "page");

  return {
    ok: true as const,
    data: {
      row: persistedRow,
    },
  };
}
export async function updateVehicleCardAction(
  vehicleId: string,
  expectedUpdatedAt: string,
  values: VehicleCardDraftValues,
) {
  const context = await getSubscriptionFeatureActionContext("arvento-fleet");

  if (!context.ok) {
    return context.result;
  }

  const id = vehicleId.trim();

  if (!id) {
    return {
      ok: false as const,
      errors: ["Araç kartı seçilmelidir."],
    };
  }

  const expectedUpdatedAtIso = normalizeVehicleUpdatedAt(expectedUpdatedAt);

  if (!expectedUpdatedAtIso) {
    return {
      ok: false as const,
      errors: ["Araç kartı sürüm bilgisi geçersizdir."],
    };
  }

  const vehicleCards = await vehicleRepository.list({ scope: context.scope });
  const existingVehicleCard = vehicleCards.find(
    (vehicleCard) => vehicleCard.id === id,
  );

  if (!existingVehicleCard) {
    return {
      ok: false as const,
      errors: ["Araç kartı bulunamadı."],
    };
  }

  if (existingVehicleCard.updatedAt !== expectedUpdatedAtIso) {
    return getVehicleUpdateConflictResult();
  }

  const draft = createVehicleCardDraft({
    ...values,
    plate: existingVehicleCard.plate,
    siteCode: values.siteCode ?? existingVehicleCard.siteCode,
  });
  const errors = validateVehicleCardDraft(draft);

  if (errors.length > 0) {
    return {
      ok: false as const,
      errors,
    };
  }

  const builtRow = buildVehicleCardRow({
    draft,
    nowIso: new Date().toISOString(),
    scope: context.scope,
  });
  const row = {
    ...builtRow,
    createdAt: existingVehicleCard.createdAt,
    createdBy: existingVehicleCard.createdBy,
    id: existingVehicleCard.id,
    status: existingVehicleCard.status,
  };
  const deviceConflict = draft.arventoDeviceId
    ? vehicleCards.find(
        (vehicleCard) =>
          vehicleCard.id !== row.id &&
          vehicleCard.arventoDeviceId.toLocaleUpperCase("tr-TR") ===
            draft.arventoDeviceId,
      )
    : undefined;

  if (deviceConflict) {
    return {
      ok: false as const,
      errors: [
        `Arvento cihaz ID başka bir araç kartında kullanılıyor: ${draft.arventoDeviceId}`,
      ],
    };
  }

  const chassisConflict = draft.chassisNumber
    ? vehicleCards.find(
        (vehicleCard) =>
          vehicleCard.id !== row.id &&
          vehicleCard.chassisNumber?.toLocaleUpperCase("tr-TR") ===
            draft.chassisNumber,
      )
    : undefined;

  if (chassisConflict) {
    return {
      ok: false as const,
      errors: [`Şase no başka bir araç kartında kullanılıyor: ${draft.chassisNumber}`],
    };
  }

  let persistedRow: VehicleCardRow;

  try {
    const updatedRow = await vehicleRepository.updateIfUnchanged({
      expectedUpdatedAt: expectedUpdatedAtIso,
      row,
    });

    if (!updatedRow) {
      return getVehicleUpdateConflictResult();
    }

    persistedRow = updatedRow;
  } catch (error) {
    if (draft.arventoDeviceId && isArventoDeviceUniqueConflict(error)) {
      return {
        ok: false as const,
        errors: [
          `Arvento cihaz ID başka bir araç kartında kullanılıyor: ${draft.arventoDeviceId}`,
        ],
      };
    }


    if (draft.chassisNumber && isChassisNumberUniqueConflict(error)) {
      return {
        ok: false as const,
        errors: [`Şase no başka bir araç kartında kullanılıyor: ${draft.chassisNumber}`],
      };
    }

    throw error;
  }

  await auditLogRepository.record(
    createAuditLogEntry(context.scope, {
      action: "vehicle.update",
      entityId: persistedRow.id,
      entityLabel: persistedRow.plate,
      entityType: "vehicle",
      metadata: {
        acquisitionDate: persistedRow.acquisitionDate,
        arventoDeviceId: persistedRow.arventoDeviceId,
        chassisNumber: persistedRow.chassisNumber,
        changedFields: getVehicleUpdateChangedFields(
          existingVehicleCard,
          persistedRow,
        ),
        dispositionDate: persistedRow.dispositionDate,
        insuranceEndDate: persistedRow.insuranceEndDate,
        inspectionEndDate: persistedRow.inspectionEndDate,
        maintenanceDueDate: persistedRow.maintenanceDueDate,
        registrationDate: persistedRow.registrationDate,
        engineNumber: persistedRow.engineNumber,
        entryOdometerKm: persistedRow.entryOdometerKm,
        fuelType: persistedRow.fuelType,
        siteName: persistedRow.siteName,
        status: persistedRow.status,
        vehicleType: persistedRow.vehicleType,
      },
      occurredAt: persistedRow.updatedAt,
    }),
  );

  revalidatePath("/araclar");
  revalidatePath("/[module]", "page");

  return {
    ok: true as const,
    data: {
      row: persistedRow,
    },
  };
}
export async function deactivateVehicleCardAction(vehicleId: string) {
  const context = await getSubscriptionFeatureActionContext("arvento-fleet");

  if (!context.ok) {
    return context.result;
  }

  const id = vehicleId.trim();

  if (!id) {
    return {
      ok: false as const,
      errors: ["Araç kartı seçilmelidir."],
    };
  }

  const row = await vehicleRepository.setStatus({
    id,
    nowIso: new Date().toISOString(),
    scope: context.scope,
    status: "Pasif",
  });

  if (!row) {
    return {
      ok: false as const,
      errors: ["Araç kartı bulunamadı."],
    };
  }

  await auditLogRepository.record(
    createAuditLogEntry(context.scope, {
      action: "vehicle.deactivate",
      entityId: row.id,
      entityLabel: row.plate,
      entityType: "vehicle",
      metadata: {
        acquisitionDate: row.acquisitionDate,
        arventoDeviceId: row.arventoDeviceId,
        chassisNumber: row.chassisNumber,
        dispositionDate: row.dispositionDate,
        insuranceEndDate: row.insuranceEndDate,
        inspectionEndDate: row.inspectionEndDate,
        maintenanceDueDate: row.maintenanceDueDate,
        registrationDate: row.registrationDate,
        engineNumber: row.engineNumber,
        entryOdometerKm: row.entryOdometerKm,
        fuelType: row.fuelType,
        siteName: row.siteName,
        status: row.status,
        vehicleType: row.vehicleType,
      },
      occurredAt: row.updatedAt,
    }),
  );

  revalidatePath("/araclar");
  revalidatePath("/[module]", "page");

  return {
    ok: true as const,
    data: {
      row,
    },
  };
}
export async function activateVehicleCardAction(vehicleId: string) {
  const context = await getSubscriptionFeatureActionContext("arvento-fleet");

  if (!context.ok) {
    return context.result;
  }

  const id = vehicleId.trim();

  if (!id) {
    return {
      ok: false as const,
      errors: ["Araç kartı seçilmelidir."],
    };
  }

  const row = await vehicleRepository.setStatus({
    id,
    nowIso: new Date().toISOString(),
    scope: context.scope,
    status: "Aktif",
  });

  if (!row) {
    return {
      ok: false as const,
      errors: ["Araç kartı bulunamadı."],
    };
  }

  await auditLogRepository.record(
    createAuditLogEntry(context.scope, {
      action: "vehicle.activate",
      entityId: row.id,
      entityLabel: row.plate,
      entityType: "vehicle",
      metadata: {
        acquisitionDate: row.acquisitionDate,
        arventoDeviceId: row.arventoDeviceId,
        chassisNumber: row.chassisNumber,
        dispositionDate: row.dispositionDate,
        insuranceEndDate: row.insuranceEndDate,
        inspectionEndDate: row.inspectionEndDate,
        maintenanceDueDate: row.maintenanceDueDate,
        registrationDate: row.registrationDate,
        engineNumber: row.engineNumber,
        entryOdometerKm: row.entryOdometerKm,
        fuelType: row.fuelType,
        siteName: row.siteName,
        status: row.status,
        vehicleType: row.vehicleType,
      },
      occurredAt: row.updatedAt,
    }),
  );

  revalidatePath("/araclar");
  revalidatePath("/[module]", "page");

  return {
    ok: true as const,
    data: {
      row,
    },
  };
}

function isArventoDeviceUniqueConflict(error: unknown) {
  return isVehicleUniqueConflict(error, "arventoDeviceId");
}

function isChassisNumberUniqueConflict(error: unknown) {
  return isVehicleUniqueConflict(error, "chassisNumber");
}

function getVehicleUpdateConflictResult() {
  return {
    code: "VEHICLE_UPDATE_CONFLICT" as const,
    ok: false as const,
    errors: [
      "Araç kartı başka bir kullanıcı tarafından güncellendi. Güncel bilgileri yükleyip tekrar deneyin.",
    ],
  };
}

function normalizeVehicleUpdatedAt(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);

  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

const vehicleUpdateAuditFields = [
  "acquisitionDate",
  "dispositionDate",
  "insuranceEndDate",
  "inspectionEndDate",
  "maintenanceDueDate",
  "registrationDate",
  "vehicleType",
  "brand",
  "modelName",
  "modelYear",
  "fuelType",
  "chassisNumber",
  "engineNumber",
  "entryOdometerKm",
  "siteCode",
  "siteName",
  "driverName",
  "arventoDeviceId",
] as const satisfies readonly (keyof VehicleCardRow)[];

function getVehicleUpdateChangedFields(
  previous: VehicleCardRow,
  current: VehicleCardRow,
) {
  return vehicleUpdateAuditFields.filter(
    (field) => previous[field] !== current[field],
  );
}

function isVehicleUniqueConflict(error: unknown, field: string) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    meta?: { target?: unknown };
  };

  if (candidate.code !== "P2002") {
    return false;
  }

  const target = candidate.meta?.target;

  return Array.isArray(target)
    ? target.includes(field)
    : typeof target === "string" && target.includes(field);
}


