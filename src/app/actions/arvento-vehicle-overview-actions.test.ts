import { beforeEach, describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "@/lib/tenant-scope";

const getActiveTenantScopeMock = vi.hoisted(() => vi.fn());
const ensureTenantScopeMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  subscriptionInvoice: {
    findMany: vi.fn(),
  },
  tenantSubscription: {
    findFirst: vi.fn(),
  },
  tenantSubscriptionAddon: {
    findMany: vi.fn(),
  },
  vehicle: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: ensureTenantScopeMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: getActiveTenantScopeMock,
}));

import {
  activateVehicleCardAction,
  createVehicleCardAction,
  deactivateVehicleCardAction,
  listArventoVehicleFleetOverviewAction,
  updateVehicleCardAction,
} from "./arvento-fleet-actions";

const adminScope = {
  ...defaultTenantScope,
  userRole: "admin" as const,
};

function createVehicleRecord(overrides: Record<string, unknown> = {}) {
  return {
    acquisitionDate: new Date("2026-07-01T00:00:00.000Z"),
    arventoDeviceId: "ARV-303",
    brand: "Ford",
    chassisNumber: "WVWZZZ303",
    companyId: defaultTenantScope.companyId,
    createdAt: new Date("2026-07-05T19:30:00.000Z"),
    createdBy: defaultTenantScope.userId,
    dispositionDate: new Date("2026-07-10T00:00:00.000Z"),
    insuranceEndDate: new Date("2026-12-31T00:00:00.000Z"),
    inspectionEndDate: new Date("2027-01-15T00:00:00.000Z"),
    registrationDate: new Date("2026-06-20T00:00:00.000Z"),
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
    updatedAt: new Date("2026-07-09T08:15:00.000Z"),
    updatedBy: defaultTenantScope.userId,
    vehicleType: "Kamyonet",
    ...overrides,
  };
}

function mockKurumsalSubscription() {
  prismaMock.tenantSubscription.findFirst.mockResolvedValue({
    autoRenew: true,
    billingCycle: "monthly",
    endsAt: "2026-08-03T00:00:00.000Z",
    id: "sub-kurumsal",
    plan: {
      id: "kurumsal",
      name: "Kurumsal",
    },
    planId: "kurumsal",
    renewalAmount: 16900,
    startsAt: "2026-07-04T00:00:00.000Z",
    storageLimitGb: 100,
    userLimit: 75,
  });
}

describe("arvento vehicle overview actions", () => {
  beforeEach(() => {
    getActiveTenantScopeMock.mockReset();
    ensureTenantScopeMock.mockReset();
    revalidatePathMock.mockReset();
    prismaMock.auditLog.create.mockReset();
    prismaMock.auditLog.findMany.mockReset();
    prismaMock.subscriptionInvoice.findMany.mockReset();
    prismaMock.tenantSubscription.findFirst.mockReset();
    prismaMock.tenantSubscriptionAddon.findMany.mockReset();
    prismaMock.vehicle.findFirst.mockReset();
    prismaMock.vehicle.findMany.mockReset();
    prismaMock.vehicle.update.mockReset();
    prismaMock.vehicle.upsert.mockReset();

    getActiveTenantScopeMock.mockResolvedValue(adminScope);
    prismaMock.subscriptionInvoice.findMany.mockResolvedValue([]);
    prismaMock.tenantSubscription.findFirst.mockResolvedValue(null);
    prismaMock.tenantSubscriptionAddon.findMany.mockResolvedValue([]);
    prismaMock.vehicle.findFirst.mockResolvedValue(null);
    prismaMock.vehicle.findMany.mockResolvedValue([]);
    prismaMock.auditLog.create.mockResolvedValue({});
    prismaMock.auditLog.findMany.mockResolvedValue([]);
  });

  test("blocks vehicle overview loading when Arvento fleet access is locked", async () => {
    const result = await listArventoVehicleFleetOverviewAction();

    expect(result).toEqual({
      errors: ["Arvento Filo Takip için Kurumsal pakete yükseltme gerekir."],
      featureLabel: "Arvento Filo Takip",
      ok: false,
      requiredPlan: "Kurumsal",
    });
    expect(prismaMock.vehicle.findMany).not.toHaveBeenCalled();
  });

  test("loads persisted vehicle cards before falling back to sandbox rows", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findMany.mockResolvedValue([
      {
        arventoDeviceId: "ARV-303",
        brand: "Ford",
        companyId: defaultTenantScope.companyId,
        createdAt: new Date("2026-07-05T19:30:00.000Z"),
        createdBy: defaultTenantScope.userId,
        driverName: "Ali Usta",
        id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
        modelName: "Transit",
        modelYear: 2024,
        periodId: defaultTenantScope.periodId,
        plate: "34 NOA 303",
        siteCode: "SNT-001",
        siteName: "Merkez Şantiye",
        status: "Aktif",
        tenantId: defaultTenantScope.tenantId,
        updatedAt: new Date("2026-07-05T19:30:00.000Z"),
        updatedBy: defaultTenantScope.userId,
        vehicleType: "Kamyonet",
      },
    ]);

    const result = await listArventoVehicleFleetOverviewAction();

    expect(result).toMatchObject({
      ok: true,
      data: {
        overview: {
          summary: {
            vehicleCount: 1,
            parkedCount: 1,
          },
          rows: [
            expect.objectContaining({
              driverName: "Ali Usta",
              plate: "34 NOA 303",
              siteName: "Merkez Şantiye",
            }),
          ],
        },
        vehicleCards: [
          expect.objectContaining({
            id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
            plate: "34 NOA 303",
            status: "Aktif",
          }),
        ],
      },
    });
    expect(prismaMock.vehicle.findMany).toHaveBeenCalledWith({
      orderBy: [{ plate: "asc" }],
      where: {
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
  });

  test("loads recent vehicle audit history in the active tenant scope", async () => {
    mockKurumsalSubscription();
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        action: "vehicle.activate",
        actorUserId: "user-demo-admin",
        companyId: defaultTenantScope.companyId,
        createdAt: new Date("2026-07-10T06:30:00.000Z"),
        entityId: "vehicle-303",
        entityLabel: "34 NOA 303",
        entityType: "vehicle",
        id: "audit-vehicle-activate-303",
        metadata: { status: "Aktif" },
        occurredAt: new Date("2026-07-10T06:30:00.000Z"),
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    ]);

    const result = await listArventoVehicleFleetOverviewAction();

    expect(result).toMatchObject({
      ok: true,
      data: {
        auditEntries: [
          {
            action: "vehicle.activate",
            actorUserId: "user-demo-admin",
            entityId: "vehicle-303",
            entityLabel: "34 NOA 303",
            occurredAt: "2026-07-10T06:30:00.000Z",
          },
        ],
      },
    });
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      where: {
        companyId: defaultTenantScope.companyId,
        entityType: "vehicle",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
  });
  test("validates vehicle card creation before persistence", async () => {
    mockKurumsalSubscription();

    const result = await createVehicleCardAction({
      modelYear: "1885",
      plate: " ",
      siteName: "",
      vehicleType: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "Plaka zorunludur.",
        "Araç tipi zorunludur.",
        "Şantiye adı zorunludur.",
        "Model yılı 1900 ile 2100 arasında olmalıdır.",
      ],
    });
    expect(prismaMock.vehicle.upsert).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("rejects an existing plate instead of silently updating it during creation", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findMany.mockResolvedValue([createVehicleRecord()]);

    const result = await createVehicleCardAction({
      plate: "34 noa 303",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Araç plakası bu dönem için zaten kullanılıyor: 34 NOA 303"],
    });
    expect(prismaMock.vehicle.upsert).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("maps a concurrent vehicle plate uniqueness conflict to a form error", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.upsert.mockRejectedValue({
      code: "P2002",
      meta: {
        target: ["tenantId", "companyId", "periodId", "plate"],
      },
    });

    const result = await createVehicleCardAction({
      plate: "34 noa 606",
      siteName: "Merkez Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Araç plakası bu dönem için zaten kullanılıyor: 34 NOA 606"],
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("rejects an Arvento device already assigned to another vehicle", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findMany.mockResolvedValue([
      {
        arventoDeviceId: "ARV-303",
        brand: "Ford",
        companyId: defaultTenantScope.companyId,
        createdAt: new Date("2026-07-05T19:30:00.000Z"),
        createdBy: defaultTenantScope.userId,
        driverName: "Ali Usta",
        id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
        modelName: "Transit",
        modelYear: 2024,
        periodId: defaultTenantScope.periodId,
        plate: "34 NOA 303",
        siteCode: "SNT-001",
        siteName: "Merkez Şantiye",
        status: "Aktif",
        tenantId: defaultTenantScope.tenantId,
        updatedAt: new Date("2026-07-05T19:30:00.000Z"),
        updatedBy: defaultTenantScope.userId,
        vehicleType: "Kamyonet",
      },
    ]);

    const result = await createVehicleCardAction({
      arventoDeviceId: " arv-303 ",
      plate: "34 NOA 404",
      siteName: "Kuzey Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Arvento cihaz ID başka bir araç kartında kullanılıyor: ARV-303"],
    });
    expect(prismaMock.vehicle.upsert).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("maps a concurrent Arvento device uniqueness conflict to a form error", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.upsert.mockRejectedValue({
      code: "P2002",
      meta: {
        target: ["tenantId", "companyId", "periodId", "arventoDeviceId"],
      },
    });

    const result = await createVehicleCardAction({
      arventoDeviceId: "ARV-505",
      plate: "34 NOA 505",
      siteName: "Kuzey Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Arvento cihaz ID başka bir araç kartında kullanılıyor: ARV-505"],
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("rejects a chassis number already assigned to another vehicle", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findMany.mockResolvedValue([createVehicleRecord()]);

    const result = await createVehicleCardAction({
      chassisNumber: " wvwzzz303 ",
      plate: "34 NOA 404",
      siteName: "Kuzey Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Şase no başka bir araç kartında kullanılıyor: WVWZZZ303"],
    });
    expect(prismaMock.vehicle.upsert).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("maps a concurrent chassis number uniqueness conflict to a form error", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.upsert.mockRejectedValue({
      code: "P2002",
      meta: {
        target: ["tenantId", "companyId", "periodId", "chassisNumber"],
      },
    });

    const result = await createVehicleCardAction({
      chassisNumber: "WVWZZZ505",
      plate: "34 NOA 505",
      siteName: "Kuzey Şantiye",
      vehicleType: "Kamyonet",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Şase no başka bir araç kartında kullanılıyor: WVWZZZ505"],
    });
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("creates a persisted vehicle card when Arvento fleet access is active", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.upsert.mockImplementation(async (input) => ({
      ...input.create,
      createdAt: input.create.createdAt,
      updatedAt: input.create.updatedAt,
    }));

    const result = await createVehicleCardAction({
      acquisitionDate: "2026-07-01",
      arventoDeviceId: " ARV-404 ",
      brand: " Ford ",
      chassisNumber: " wvw zzz 404 ",
      dispositionDate: "2026-07-10",
      insuranceEndDate: "2026-12-31",
      inspectionEndDate: "2027-01-15",
      registrationDate: "2026-06-20",
      driverName: " Ayşe Operatör ",
      engineNumber: " eng 404 tr ",
      entryOdometerKm: "125000",
      fuelType: " Dizel ",
      modelName: " Transit ",
      modelYear: "2025",
      plate: " 34 noa 404 ",
      siteCode: " SNT-002 ",
      siteName: " Kuzey Şantiye ",
      vehicleType: " Kamyonet ",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        row: {
          acquisitionDate: "2026-07-01",
          arventoDeviceId: "ARV-404",
          chassisNumber: "WVW ZZZ 404",
          dispositionDate: "2026-07-10",
          insuranceEndDate: "2026-12-31",
          inspectionEndDate: "2027-01-15",
          registrationDate: "2026-06-20",
          driverName: "Ayşe Operatör",
          engineNumber: "ENG 404 TR",
          entryOdometerKm: 125000,
          fuelType: "Dizel",
          modelYear: 2025,
          plate: "34 NOA 404",
          siteName: "Kuzey Şantiye",
          status: "Aktif",
        },
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/araclar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
    expect(prismaMock.vehicle.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-404",
          plate: "34 NOA 404",
          tenantId: defaultTenantScope.tenantId,
        }),
        where: {
          id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-404",
        },
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "vehicle.create",
        actorUserId: defaultTenantScope.userId,
        companyId: defaultTenantScope.companyId,
        entityId:
          "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-404",
        entityLabel: "34 NOA 404",
        entityType: "vehicle",
        metadata: expect.objectContaining({
          acquisitionDate: "2026-07-01",
          arventoDeviceId: "ARV-404",
          chassisNumber: "WVW ZZZ 404",
          dispositionDate: "2026-07-10",
          insuranceEndDate: "2026-12-31",
          engineNumber: "ENG 404 TR",
          entryOdometerKm: 125000,
          fuelType: "Dizel",
          siteName: "Kuzey Şantiye",
          status: "Aktif",
          vehicleType: "Kamyonet",
        }),
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      }),
    });
  });

  test("preserves passive status when updating an existing vehicle card", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findMany.mockResolvedValue([
      {
        acquisitionDate: new Date("2026-07-01T00:00:00.000Z"),
        arventoDeviceId: "ARV-303",
        brand: "Ford",
        chassisNumber: "WVWZZZ303",
        companyId: defaultTenantScope.companyId,
        createdAt: new Date("2026-07-05T19:30:00.000Z"),
        createdBy: defaultTenantScope.userId,
        dispositionDate: new Date("2026-07-10T00:00:00.000Z"),
        insuranceEndDate: new Date("2026-12-31T00:00:00.000Z"),
        inspectionEndDate: new Date("2027-01-15T00:00:00.000Z"),
        registrationDate: new Date("2026-06-20T00:00:00.000Z"),
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
        status: "Pasif",
        tenantId: defaultTenantScope.tenantId,
        updatedAt: new Date("2026-07-09T08:15:00.000Z"),
        updatedBy: defaultTenantScope.userId,
        vehicleType: "Kamyonet",
      },
    ]);
    prismaMock.vehicle.update.mockImplementation(async (input) => ({
      acquisitionDate: input.data.acquisitionDate,
      arventoDeviceId: "ARV-303",
      brand: "Ford",
      chassisNumber: input.data.chassisNumber,
      companyId: defaultTenantScope.companyId,
      createdAt: new Date("2026-07-05T19:30:00.000Z"),
      createdBy: defaultTenantScope.userId,
      dispositionDate: input.data.dispositionDate,
      insuranceEndDate: input.data.insuranceEndDate,
      inspectionEndDate: input.data.inspectionEndDate,
      registrationDate: input.data.registrationDate,
      driverName: input.data.driverName,
      engineNumber: input.data.engineNumber,
      entryOdometerKm: input.data.entryOdometerKm,
      fuelType: input.data.fuelType,
      id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
      modelName: "Transit",
      modelYear: 2024,
      periodId: defaultTenantScope.periodId,
      plate: input.data.plate,
      siteCode: input.data.siteCode,
      siteName: input.data.siteName,
      status: input.data.status,
      tenantId: defaultTenantScope.tenantId,
      updatedAt: input.data.updatedAt,
      updatedBy: input.data.updatedBy,
      vehicleType: input.data.vehicleType,
    }));

    const result = await updateVehicleCardAction(
      "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
      "2026-07-09T08:15:00.000Z",
      {
        acquisitionDate: "2026-07-01",
        arventoDeviceId: "ARV-303",
        brand: "Ford",
        chassisNumber: "WVWZZZ303",
        dispositionDate: "2026-07-10",
        insuranceEndDate: "2026-12-31",
        inspectionEndDate: "2027-01-15",
        registrationDate: "2026-06-20",
        driverName: "Ayşe Operatör",
        engineNumber: "ENG303TR",
        entryOdometerKm: 125000,
        fuelType: "Dizel",
        modelName: "Transit",
        modelYear: 2024,
        plate: "99 DEĞİŞTİR 999",
        siteCode: "SNT-001",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      },
    );

    expect(result).toMatchObject({
      ok: true,
      data: { row: { status: "Pasif" } },
    });
    expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "Pasif" }),
      where: {
        companyId: defaultTenantScope.companyId,
        id: "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
        updatedAt: new Date("2026-07-09T08:15:00.000Z"),
      },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "vehicle.update",
        entityId:
          "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
        entityLabel: "34 NOA 303",
        entityType: "vehicle",
        metadata: expect.objectContaining({
          acquisitionDate: "2026-07-01",
          arventoDeviceId: "ARV-303",
          chassisNumber: "WVWZZZ303",
          changedFields: ["driverName"],
          dispositionDate: "2026-07-10",
          insuranceEndDate: "2026-12-31",
          engineNumber: "ENG303TR",
          entryOdometerKm: 125000,
          fuelType: "Dizel",
          siteName: "Merkez Şantiye",
          status: "Pasif",
          vehicleType: "Kamyonet",
        }),
      }),
    });
  });

  test("rejects a stale vehicle card update without persistence or audit", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findMany.mockResolvedValue([
      createVehicleRecord({ updatedAt: new Date("2026-07-10T09:30:00.000Z") }),
    ]);

    const result = await updateVehicleCardAction(
      "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
      "2026-07-09T08:15:00.000Z",
      {
        brand: "Ford",
        driverName: "Ayşe Operatör",
        modelName: "Transit",
        modelYear: 2024,
        plate: "34 NOA 303",
        siteCode: "SNT-001",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      },
    );

    expect(result).toEqual({
      code: "VEHICLE_UPDATE_CONFLICT",
      ok: false,
      errors: [
        "Araç kartı başka bir kullanıcı tarafından güncellendi. Güncel bilgileri yükleyip tekrar deneyin.",
      ],
    });
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("maps an atomic vehicle version miss to a conflict without audit", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findMany.mockResolvedValue([createVehicleRecord()]);
    prismaMock.vehicle.update.mockRejectedValue({ code: "P2025" });

    const result = await updateVehicleCardAction(
      "tenant-noa-demo::company-demo-insaat::period-2026::vehicle::34-noa-303",
      "2026-07-09T08:15:00.000Z",
      {
        arventoDeviceId: "ARV-303",
        brand: "Ford",
        driverName: "Ayşe Operatör",
        modelName: "Transit",
        modelYear: 2024,
        plate: "34 NOA 303",
        siteCode: "SNT-001",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      },
    );

    expect(result).toEqual({
      code: "VEHICLE_UPDATE_CONFLICT",
      ok: false,
      errors: [
        "Araç kartı başka bir kullanıcı tarafından güncellendi. Güncel bilgileri yükleyip tekrar deneyin.",
      ],
    });
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("does not update a vehicle card outside the active scope", async () => {
    mockKurumsalSubscription();

    const result = await updateVehicleCardAction(
      "vehicle-outside-scope",
      "2026-07-09T08:15:00.000Z",
      {
        plate: "34 NOA 303",
        siteName: "Merkez Şantiye",
        vehicleType: "Kamyonet",
      },
    );

    expect(result).toEqual({
      ok: false,
      errors: ["Araç kartı bulunamadı."],
    });
    expect(prismaMock.vehicle.upsert).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
  test("blocks vehicle card deactivation when Arvento fleet access is locked", async () => {
    const result = await deactivateVehicleCardAction("vehicle-303");

    expect(result).toEqual({
      errors: ["Arvento Filo Takip için Kurumsal pakete yükseltme gerekir."],
      featureLabel: "Arvento Filo Takip",
      ok: false,
      requiredPlan: "Kurumsal",
    });
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("validates vehicle card deactivation identity before persistence", async () => {
    mockKurumsalSubscription();

    const result = await deactivateVehicleCardAction("  ");

    expect(result).toEqual({
      ok: false,
      errors: ["Araç kartı seçilmelidir."],
    });
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("does not deactivate a vehicle card outside the active scope", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const result = await deactivateVehicleCardAction("vehicle-303");

    expect(result).toEqual({
      ok: false,
      errors: ["Araç kartı bulunamadı."],
    });
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        id: "vehicle-303",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("deactivates a vehicle card when Arvento fleet access is active", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findFirst.mockResolvedValue({
      arventoDeviceId: "ARV-303",
      brand: "Ford",
      companyId: defaultTenantScope.companyId,
      createdAt: new Date("2026-07-05T19:30:00.000Z"),
      createdBy: defaultTenantScope.userId,
      driverName: "Ali Usta",
      id: "vehicle-303",
      modelName: "Transit",
      modelYear: 2024,
      periodId: defaultTenantScope.periodId,
      plate: "34 NOA 303",
      siteCode: "SNT-001",
      siteName: "Merkez Şantiye",
      status: "Aktif",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: new Date("2026-07-05T19:30:00.000Z"),
      updatedBy: defaultTenantScope.userId,
      vehicleType: "Kamyonet",
    });
    prismaMock.vehicle.update.mockImplementation(async (input) => ({
      arventoDeviceId: "ARV-303",
      brand: "Ford",
      companyId: defaultTenantScope.companyId,
      createdAt: new Date("2026-07-05T19:30:00.000Z"),
      createdBy: defaultTenantScope.userId,
      driverName: "Ali Usta",
      id: input.where.id,
      modelName: "Transit",
      modelYear: 2024,
      periodId: defaultTenantScope.periodId,
      plate: "34 NOA 303",
      siteCode: "SNT-001",
      siteName: "Merkez Şantiye",
      status: input.data.status,
      tenantId: defaultTenantScope.tenantId,
      updatedAt: input.data.updatedAt,
      updatedBy: input.data.updatedBy,
      vehicleType: "Kamyonet",
    }));

    const result = await deactivateVehicleCardAction(" vehicle-303 ");

    expect(result).toMatchObject({
      ok: true,
      data: {
        row: {
          id: "vehicle-303",
          plate: "34 NOA 303",
          status: "Pasif",
          updatedBy: defaultTenantScope.userId,
        },
      },
    });
    expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
      data: {
        status: "Pasif",
        updatedAt: expect.any(Date),
        updatedBy: defaultTenantScope.userId,
      },
      where: {
        id: "vehicle-303",
      },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "vehicle.deactivate",
        entityId: "vehicle-303",
        entityLabel: "34 NOA 303",
        entityType: "vehicle",
        metadata: expect.objectContaining({
          siteName: "Merkez Şantiye",
          status: "Pasif",
          vehicleType: "Kamyonet",
        }),
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/araclar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });
  test("blocks vehicle card activation when Arvento fleet access is locked", async () => {
    const result = await activateVehicleCardAction("vehicle-303");

    expect(result).toEqual({
      errors: ["Arvento Filo Takip için Kurumsal pakete yükseltme gerekir."],
      featureLabel: "Arvento Filo Takip",
      ok: false,
      requiredPlan: "Kurumsal",
    });
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("validates vehicle card activation identity before persistence", async () => {
    mockKurumsalSubscription();

    const result = await activateVehicleCardAction("  ");

    expect(result).toEqual({
      ok: false,
      errors: ["Araç kartı seçilmelidir."],
    });
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("does not activate a vehicle card outside the active scope", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const result = await activateVehicleCardAction("vehicle-303");

    expect(result).toEqual({
      ok: false,
      errors: ["Araç kartı bulunamadı."],
    });
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: defaultTenantScope.companyId,
        id: "vehicle-303",
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("activates a vehicle card when Arvento fleet access is active", async () => {
    mockKurumsalSubscription();
    prismaMock.vehicle.findFirst.mockResolvedValue({
      arventoDeviceId: "ARV-303",
      brand: "Ford",
      companyId: defaultTenantScope.companyId,
      createdAt: new Date("2026-07-05T19:30:00.000Z"),
      createdBy: defaultTenantScope.userId,
      driverName: "Ali Usta",
      id: "vehicle-303",
      modelName: "Transit",
      modelYear: 2024,
      periodId: defaultTenantScope.periodId,
      plate: "34 NOA 303",
      siteCode: "SNT-001",
      siteName: "Merkez Şantiye",
      status: "Pasif",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: new Date("2026-07-05T19:30:00.000Z"),
      updatedBy: defaultTenantScope.userId,
      vehicleType: "Kamyonet",
    });
    prismaMock.vehicle.update.mockImplementation(async (input) => ({
      arventoDeviceId: "ARV-303",
      brand: "Ford",
      companyId: defaultTenantScope.companyId,
      createdAt: new Date("2026-07-05T19:30:00.000Z"),
      createdBy: defaultTenantScope.userId,
      driverName: "Ali Usta",
      id: input.where.id,
      modelName: "Transit",
      modelYear: 2024,
      periodId: defaultTenantScope.periodId,
      plate: "34 NOA 303",
      siteCode: "SNT-001",
      siteName: "Merkez Şantiye",
      status: input.data.status,
      tenantId: defaultTenantScope.tenantId,
      updatedAt: input.data.updatedAt,
      updatedBy: input.data.updatedBy,
      vehicleType: "Kamyonet",
    }));

    const result = await activateVehicleCardAction(" vehicle-303 ");

    expect(result).toMatchObject({
      ok: true,
      data: {
        row: {
          id: "vehicle-303",
          plate: "34 NOA 303",
          status: "Aktif",
          updatedBy: defaultTenantScope.userId,
        },
      },
    });
    expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
      data: {
        status: "Aktif",
        updatedAt: expect.any(Date),
        updatedBy: defaultTenantScope.userId,
      },
      where: {
        id: "vehicle-303",
      },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "vehicle.activate",
        entityId: "vehicle-303",
        entityLabel: "34 NOA 303",
        entityType: "vehicle",
        metadata: expect.objectContaining({
          siteName: "Merkez Şantiye",
          status: "Aktif",
          vehicleType: "Kamyonet",
        }),
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/araclar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });
});


