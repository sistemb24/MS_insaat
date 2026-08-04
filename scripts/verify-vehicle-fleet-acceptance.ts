import "dotenv/config";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "../src/lib/audit-log-prisma-repository";
import { prisma } from "../src/lib/prisma";
import { createVehicleFleetPrismaRepository, type VehicleFleetPrismaClientLike } from "../src/lib/vehicle-fleet-prisma-repository";
import { createVehicleFleetService } from "../src/lib/vehicle-fleet-service";
import type { TenantScope } from "../src/lib/tenant-scope";

const scope: TenantScope = {
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  companyId: "company-f15-kabul-20260729",
  companyName: "F15 Filo Kabul Şirketi",
  periodId: "period-f15-kabul-20260729",
  periodLabel: "F15 Kabul 2026",
  userId: "user-main",
  userName: "Muhasebe Kullanıcısı",
  userRole: "accounting",
  licenseLabel: "Kurumsal",
  periodClosed: false,
};
const timestamp = "2026-07-31T18:00:00.000Z";
const projectCode = "F15-KABUL-20260729";
const personnelCode = "PER-F15-KABUL-001";
const sessionId = "session-f15-kabul-accounting-20260729";
const subscriptionId = "sub-f15-kabul-20260729";
const vehicleId = "vehicle-f15-kabul-20260729";
const service = createVehicleFleetService({
  auditLogRepository: createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike),
  createId: ({ kind, stableKey }) => `F15-KABUL-20260729::${kind}::${stableKey ?? "001"}`,
  now: () => timestamp,
  repository: createVehicleFleetPrismaRepository(prisma as unknown as VehicleFleetPrismaClientLike),
});

async function main() {
  const project = await ensureAcceptanceScope();
  let overview = unwrap(await service.list({ scope }));

  let firstAssignment = overview.assignments.find((row) => row.id === id("assignment", `${vehicleId}::2026-07-29`));
  if (!firstAssignment) {
    const created = unwrap(await service.createAssignment({
      scope,
      values: { assignedOn: "2026-07-29", assignmentNote: "Hassas F15 kabul atama ayrıntısı", driverPersonnelId: personnelCode, projectId: project.id, vehicleId },
    }));
    assert(!created.idempotent, "İlk araç ataması idempotent olmamalıdır.");
    firstAssignment = created.row;
  }
  const assignmentAuditBeforeRetry = await countAcceptanceAudit();
  const assignmentRetry = unwrap(await service.createAssignment({
    scope,
    values: { assignedOn: "2026-07-29", driverPersonnelId: personnelCode, projectId: project.id, vehicleId },
  }));
  assert(assignmentRetry.idempotent, "Tekrarlanan araç ataması idempotent olmalıdır.");
  assert(await countAcceptanceAudit() === assignmentAuditBeforeRetry, "Atama retry audit kaydını çoğaltmamalıdır.");

  overview = unwrap(await service.list({ scope }));
  let transferredAssignment = overview.assignments.find((row) => row.id === id("assignment", `${vehicleId}::2026-07-30`));
  if (!transferredAssignment) {
    const transferred = unwrap(await service.transferAssignment({
      id: firstAssignment.id,
      scope,
      values: { assignedOn: "2026-07-30", assignmentNote: "Hassas F15 kabul transfer ayrıntısı", driverPersonnelId: personnelCode, projectId: project.id, vehicleId },
    }));
    assert(transferred.previous.status === "TRANSFERRED", "Önceki araç ataması transfer edilmiş olmalıdır.");
    transferredAssignment = transferred.row;
  }
  assert(transferredAssignment.status === "ACTIVE", "Transfer sonrası yeni araç ataması aktif olmalıdır.");

  overview = unwrap(await service.list({ scope }));
  let fuel = overview.fuelRecords.find((row) => row.vehicleId === vehicleId && row.fueledOn === "2026-07-30" && row.odometerKm === 100100);
  if (!fuel) {
    const created = unwrap(await service.createFuelRecord({
      entryOdometerKm: 100000,
      scope,
      values: { fueledOn: "2026-07-30", liters: 20, odometerKm: 100100, stationName: "F15 Kabul İstasyonu", unitPrice: 47.5, vehicleId },
    }));
    assert(!created.idempotent, "İlk yakıt kaydı idempotent olmamalıdır.");
    fuel = created.row;
  }
  const fuelAuditBeforeRetry = await countAcceptanceAudit();
  const fuelRetry = unwrap(await service.createFuelRecord({
    entryOdometerKm: 100000,
    scope,
    values: { fueledOn: "2026-07-30", liters: 20, odometerKm: 100100, stationName: "F15 Kabul İstasyonu", unitPrice: 47.5, vehicleId },
  }));
  assert(fuelRetry.idempotent, "Tekrarlanan yakıt kaydı idempotent olmalıdır.");
  assert(await countAcceptanceAudit() === fuelAuditBeforeRetry, "Yakıt retry audit kaydını çoğaltmamalıdır.");
  if (fuel.status === "RECORDED") fuel = unwrap(await service.cancelFuelRecord({ id: fuel.id, scope }));
  assert(fuel.status === "CANCELLED", "Kabul yakıt kaydı iptal edilmiş olmalıdır.");

  overview = unwrap(await service.list({ scope }));
  let plan = overview.maintenancePlans.find((row) => row.id === id("maintenance-plan"));
  if (!plan) {
    plan = unwrap(await service.createMaintenancePlan({
      scope,
      values: { intervalKm: 10000, maintenanceType: "F15 Kabul Periyodik Bakım", nextDueKm: 110000, nextDueOn: "2027-01-31", vehicleId },
    }));
  }
  assert(plan, "Kabul bakım planı oluşturulmalıdır.");

  overview = unwrap(await service.list({ scope }));
  let maintenance = overview.maintenanceRecords.find((row) => row.id === id("maintenance-record"));
  if (!maintenance) {
    maintenance = unwrap(await service.createMaintenanceRecord({
      entryOdometerKm: 100000,
      scope,
      values: { costAmount: 1250, maintenanceOn: "2026-07-31", maintenanceType: "F15 Kabul Periyodik Bakım", note: "Hassas F15 kabul bakım ayrıntısı", odometerKm: 100250, planId: plan.id, providerName: "F15 Kabul Servisi", vehicleId },
    }));
  }
  if (maintenance.status === "DRAFT") maintenance = unwrap(await service.completeMaintenanceRecord({ id: maintenance.id, scope }));
  assert(maintenance.status === "COMPLETED", "Bakım kaydı tamamlanmış olmalıdır.");
  const maintenanceAuditBeforeRetry = await countAcceptanceAudit();
  const maintenanceRetry = await service.completeMaintenanceRecord({ id: maintenance.id, scope });
  assert(!maintenanceRetry.ok, "Tamamlanmış bakım kaydı yeniden tamamlanmamalıdır.");
  assert(await countAcceptanceAudit() === maintenanceAuditBeforeRetry, "Bakım tamamlama retry audit kaydını çoğaltmamalıdır.");

  const planId = plan.id;
  overview = unwrap(await service.list({ scope }));
  plan = overview.maintenancePlans.find((row) => row.id === planId)!;
  if (plan.status === "ACTIVE") plan = unwrap(await service.completeMaintenancePlan({ id: plan.id, scope }));
  assert(plan.status === "COMPLETED" && plan.lastCompletedOn === "2026-07-31", "Bakım planı tamamlanmalı ve son bakım tarihi güncellenmelidir.");

  await verifyAcceptance(project.id);
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({ where: { id: scope.tenantId }, select: { id: true } });
  assert(tenant, "F15 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({ where: { id: scope.companyId }, create: { id: scope.companyId, name: scope.companyName, tenantId: scope.tenantId }, update: { name: scope.companyName } });
  await prisma.period.upsert({ where: { id: scope.periodId }, create: { companyId: scope.companyId, id: scope.periodId, isClosed: false, label: scope.periodLabel, tenantId: scope.tenantId }, update: { isClosed: false, label: scope.periodLabel } });
  await prisma.entityRecord.upsert({
    where: { tenantId_companyId_periodId_slug_code: { ...scopeFields(), code: personnelCode, slug: "personel" } },
    create: { ...scopeFields(), code: personnelCode, createdBy: scope.userId, data: { name: "F15 Kabul Personeli", status: "Aktif" }, slug: "personel", updatedBy: scope.userId },
    update: { data: { name: "F15 Kabul Personeli", status: "Aktif" }, updatedBy: scope.userId },
  });
  const project = await prisma.constructionProject.upsert({
    where: { tenantId_companyId_periodId_code: { ...scopeFields(), code: projectCode } },
    create: { ...scopeFields(), code: projectCode, contractAmount: 1, createdBy: scope.userId, name: "F15 İzole Filo Kabul Projesi", paymentType: "Filo Kabul", siteCode: "F15-KABUL", siteName: "F15 İzole Kabul Şantiyesi", status: "OPEN", updatedBy: scope.userId },
    update: { name: "F15 İzole Filo Kabul Projesi", status: "OPEN", updatedBy: scope.userId },
    select: { id: true, status: true },
  });
  await prisma.vehicle.upsert({
    where: { id: vehicleId },
    create: { ...scopeFields(), brand: "NOA", createdBy: scope.userId, entryOdometerKm: 100000, id: vehicleId, modelName: "F15 Kabul", plate: "F15 KABUL 001", siteName: "F15 İzole Kabul Şantiyesi", status: "Aktif", updatedBy: scope.userId, vehicleType: "Kamyonet" },
    update: { entryOdometerKm: 100000, siteName: "F15 İzole Kabul Şantiyesi", status: "Aktif", updatedBy: scope.userId },
  });
  await prisma.appUserScopeAccess.upsert({
    where: { userId_companyId_periodId: { companyId: scope.companyId, periodId: scope.periodId, userId: scope.userId } },
    create: { ...scopeFields(), id: "scope-f15-kabul-accounting-20260729", isActive: true, isDefault: false, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
    update: { isActive: true, licenseLabel: scope.licenseLabel, role: scope.userRole },
  });
  await prisma.appSession.upsert({
    where: { id: sessionId },
    create: { ...scopeFields(), id: sessionId, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
    update: { expiresAt: null, licenseLabel: scope.licenseLabel, role: scope.userRole },
  });
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: "kurumsal" }, select: { id: true, monthlyPrice: true, storageLimitGb: true, userLimit: true } });
  assert(plan, "F15 görsel kabulü için Kurumsal abonelik planı bulunmalıdır.");
  await prisma.tenantSubscription.upsert({
    where: { id: subscriptionId },
    create: { ...scopeFields(), autoRenew: false, billingCycle: "yearly", createdBy: scope.userId, endsAt: new Date("2026-12-31T23:59:59.000Z"), id: subscriptionId, planId: plan.id, renewalAmount: Number(plan.monthlyPrice) * 12, startsAt: new Date("2026-01-01T00:00:00.000Z"), status: "active", storageLimitGb: plan.storageLimitGb, updatedBy: scope.userId, userLimit: plan.userLimit },
    update: { endsAt: new Date("2026-12-31T23:59:59.000Z"), planId: plan.id, status: "active", updatedBy: scope.userId },
  });
  return project;
}

async function verifyAcceptance(projectId: string) {
  const overview = unwrap(await service.list({ scope }));
  assert(overview.assignments.length === 2, "Kabul kapsamı transfer edilmiş ve aktif iki araç ataması taşımalıdır.");
  assert(overview.assignments.filter((row) => row.status === "ACTIVE").length === 1, "Kabul kapsamında tek açık araç ataması bulunmalıdır.");
  assert(overview.fuelRecords.length === 1 && overview.fuelRecords[0]?.status === "CANCELLED", "Kabul kapsamı tek iptal edilmiş yakıt kaydı taşımalıdır.");
  assert(overview.maintenancePlans.length === 1 && overview.maintenancePlans[0]?.status === "COMPLETED", "Kabul kapsamı tek tamamlanmış bakım planı taşımalıdır.");
  assert(overview.maintenanceRecords.length === 1 && overview.maintenanceRecords[0]?.status === "COMPLETED", "Kabul kapsamı tek tamamlanmış bakım kaydı taşımalıdır.");

  const entityIds = [...overview.assignments, ...overview.fuelRecords, ...overview.maintenancePlans, ...overview.maintenanceRecords].map((row) => row.id);
  const auditRows = await prisma.auditLog.findMany({
    where: { ...scopeFields(), entityId: { in: entityIds }, entityType: { startsWith: "vehicle-fleet-" } },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, actorUserId: true, entityId: true, metadata: true },
  });
  const actions = auditRows.map((row) => row.action).sort();
  assert(JSON.stringify(actions) === JSON.stringify([
    "vehicle-fleet.assignment.create", "vehicle-fleet.assignment.create", "vehicle-fleet.assignment.transfer", "vehicle-fleet.fuel.cancel", "vehicle-fleet.fuel.create",
    "vehicle-fleet.maintenance-plan.complete", "vehicle-fleet.maintenance-plan.create", "vehicle-fleet.maintenance-record.complete", "vehicle-fleet.maintenance-record.create",
  ]), "Filo kabul audit aksiyonları eksik veya tekrarlıdır.");
  assert(auditRows.every((row) => row.actorUserId === scope.userId), "Filo audit aktörü kabul accounting kullanıcısı olmalıdır.");
  assert(auditRows.every((row) => !containsSensitiveDetail(row.metadata)), "Filo audit metadata hassas serbest ayrıntı taşımamalıdır.");

  const [wrongCompanyCount, wrongPeriodCount, crossProjectCount, cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount] = await Promise.all([
    prisma.vehicleAssignment.count({ where: { id: { in: entityIds }, companyId: "company-demo-insaat" } }),
    prisma.vehicleAssignment.count({ where: { id: { in: entityIds }, periodId: "period-2026" } }),
    prisma.vehicleAssignment.count({ where: { id: { in: entityIds }, projectId: { not: projectId } } }),
    prisma.cashBankMovement.count({ where: scopeFields() }),
    prisma.expense.count({ where: scopeFields() }),
    prisma.ledgerEntry.count({ where: scopeFields() }),
    prisma.payrollAccrual.count({ where: scopeFields() }),
    prisma.stockMovement.count({ where: scopeFields() }),
    prisma.timesheet.count({ where: scopeFields() }),
  ]);
  assert(wrongCompanyCount === 0 && wrongPeriodCount === 0 && crossProjectCount === 0, "Filo kabulünde scope sızıntısı bulundu.");
  assert(cashBankCount === 0 && expenseCount === 0 && ledgerCount === 0 && payrollCount === 0 && stockCount === 0 && timesheetCount === 0, "Filo kabulü finans/stok/bordro/puantaj yan etkisi üretmemelidir.");

  console.log(JSON.stringify({
    ok: true,
    scope: scopeFields(),
    project: { code: projectCode, status: "OPEN" },
    vehicle: vehicleId,
    records: { assignments: overview.assignments.map((row) => row.status), fuel: overview.fuelRecords[0]?.status, maintenancePlan: overview.maintenancePlans[0]?.status, maintenanceRecord: overview.maintenanceRecords[0]?.status },
    audit: { actions, count: auditRows.length },
    isolation: { crossProjectCount, wrongCompanyCount, wrongPeriodCount },
    sideEffects: { cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount },
  }, null, 2));
}

function id(kind: string, stableKey = "001") { return `F15-KABUL-20260729::${kind}::${stableKey}`; }
function scopeFields() { return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId }; }
async function countAcceptanceAudit() { return prisma.auditLog.count({ where: { ...scopeFields(), entityType: { startsWith: "vehicle-fleet-" } } }); }
function unwrap<T>(result: { data: T; ok: true } | { errors: string[]; ok: false }) { if (!result.ok) throw new Error(result.errors.join(" ")); return result.data; }
function containsSensitiveDetail(metadata: unknown) { const serialized = JSON.stringify(metadata).toLocaleLowerCase("tr-TR"); return serialized.includes("hassas f15 kabul") || serialized.includes("f15 kabul servisi"); }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
