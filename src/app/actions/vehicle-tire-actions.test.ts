import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const scope = vi.fn(); const ensureScope = vi.fn(); const vehicleFindFirst = vi.fn(); const auditRecord = vi.fn(); const auditList = vi.fn();
  const repository = { createTireRecord: vi.fn(async (row) => row), listTireRecords: vi.fn(async () => []), updateTireRecord: vi.fn(async (row) => row) };
  return { auditList, auditRecord, ensureScope, repository, scope, vehicleFindFirst, prisma: { vehicle: { findFirst: vehicleFindFirst } } };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-active-scope", () => ({ getActiveTenantScope: mocks.scope }));
vi.mock("@/lib/prisma-scope-bootstrap", () => ({ ensureTenantScope: mocks.ensureScope }));
vi.mock("@/lib/audit-log-prisma-repository", () => ({ createAuditLogPrismaRepository: () => ({ listByEntityType: mocks.auditList, record: mocks.auditRecord }) }));
vi.mock("@/lib/vehicle-tire-prisma-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/vehicle-tire-prisma-repository")>("@/lib/vehicle-tire-prisma-repository");
  return { ...actual, createVehicleTirePrismaRepository: () => mocks.repository };
});

import { createVehicleTireMountAction, listVehicleTireAuditLogsAction } from "./vehicle-tire-actions";

const activeScope = { tenantId: "tenant-tire", tenantName: "Tenant", companyId: "company-tire", companyName: "Şirket", periodId: "period-2026", periodLabel: "2026", userId: "accounting-user", userName: "Muhasebe", userRole: "accounting" as const, licenseLabel: "Kurumsal", periodClosed: false };

describe("vehicle tire actions", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.scope.mockResolvedValue(activeScope); mocks.ensureScope.mockResolvedValue(undefined); mocks.vehicleFindFirst.mockResolvedValue({ id: "vehicle-1", entryOdometerKm: 100 }); mocks.auditRecord.mockResolvedValue(undefined); mocks.auditList.mockResolvedValue([]); });

  it("re-resolves scope, validates the vehicle and audits a tire mount without brand metadata", async () => {
    const result = await createVehicleTireMountAction(values());
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(mocks.ensureScope).toHaveBeenCalledWith(mocks.prisma, activeScope);
    expect(mocks.vehicleFindFirst).toHaveBeenCalledWith({ where: { id: "vehicle-1", tenantId: activeScope.tenantId, companyId: activeScope.companyId, periodId: activeScope.periodId, status: "Aktif" }, select: { entryOdometerKm: true, id: true } });
    expect(mocks.auditRecord).toHaveBeenCalledWith(expect.objectContaining({ action: "vehicle-tire.mount.create" }));
    expect(JSON.stringify(mocks.auditRecord.mock.calls[0][0])).not.toContain("315/80");
  });

  it("denies a viewer before scoped vehicle reads or writes", async () => {
    mocks.scope.mockResolvedValue({ ...activeScope, userRole: "viewer" as const });
    const result = await createVehicleTireMountAction(values());
    expect(result).toEqual(expect.objectContaining({ ok: false }));
    expect(mocks.vehicleFindFirst).not.toHaveBeenCalled(); expect(mocks.repository.createTireRecord).not.toHaveBeenCalled(); expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("does not mutate or audit when the vehicle is outside the active scope", async () => {
    mocks.vehicleFindFirst.mockResolvedValue(null);
    const result = await createVehicleTireMountAction(values());
    expect(result).toEqual({ errors: ["Aktif araç kaydı aktif kapsamda bulunamadı."], ok: false });
    expect(mocks.repository.createTireRecord).not.toHaveBeenCalled(); expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it("lists lastik audit entries only through the active tenant scope", async () => {
    await expect(listVehicleTireAuditLogsAction()).resolves.toEqual({ data: { rows: [] }, ok: true });
    expect(mocks.auditList).toHaveBeenCalledWith({ entityType: "vehicle-tire-record", limit: 100, scope: activeScope });
  });
});

function values() { return { brandModel: "315/80 R22.5 X Multi", mountedOdometerKm: 120500, mountedOn: "2026-07-29", season: "SUMMER" as const, tirePosition: "Sol Ön", treadWearPercent: 12, vehicleId: "vehicle-1" }; }
