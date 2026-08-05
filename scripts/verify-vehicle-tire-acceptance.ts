import "dotenv/config";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "../src/lib/audit-log-prisma-repository";
import { prisma } from "../src/lib/prisma";
import { createVehicleTirePrismaRepository, type VehicleTirePrismaClientLike } from "../src/lib/vehicle-tire-prisma-repository";
import { createVehicleTireService } from "../src/lib/vehicle-tire-service";
import type { TenantScope } from "../src/lib/tenant-scope";

const scope: TenantScope = {
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  companyId: "company-f16-kabul-20260729",
  companyName: "F16 Lastik Kabul Şirketi",
  periodId: "period-f16-kabul-20260729",
  periodLabel: "F16 Kabul 2026",
  userId: "user-main",
  userName: "Muhasebe Kullanıcısı",
  userRole: "accounting",
  licenseLabel: "Kurumsal",
  periodClosed: false,
};
const timestamp = "2026-08-01T18:00:00.000Z";
const sessionId = "session-f16-kabul-accounting-20260729";
const subscriptionId = "sub-f16-kabul-20260729";
const vehicleId = "vehicle-f16-kabul-20260729";
const mountValues = {
  brandModel: "315/80 R22.5 F16 Kabul",
  mountedOdometerKm: 130000,
  mountedOn: "2026-07-30",
  season: "SUMMER" as const,
  tirePosition: "Sol Ön",
  treadWearPercent: 8,
  vehicleId,
};
const service = createVehicleTireService({
  auditLogRepository: createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike),
  createId: ({ kind }) => `F16-KABUL-20260729::${kind}::001`,
  now: () => timestamp,
  repository: createVehicleTirePrismaRepository(prisma as unknown as VehicleTirePrismaClientLike),
});

async function main() {
  await ensureAcceptanceScope();
  const records = unwrap(await service.list({ scope }));
  let tire = records.find((row) => row.id === id("tire-mount"));
  if (!tire) {
    const created = unwrap(await service.createMount({ entryOdometerKm: 125000, scope, values: mountValues }));
    assert(!created.idempotent, "İlk lastik montajı idempotent olmamalıdır.");
    tire = created.row;
  }
  const auditBeforeMountRetry = await countAcceptanceAudit();
  const mountRetry = unwrap(await service.createMount({ entryOdometerKm: 125000, scope, values: mountValues }));
  assert(mountRetry.idempotent, "Tekrarlanan lastik montajı idempotent olmalıdır.");
  assert(await countAcceptanceAudit() === auditBeforeMountRetry, "Montaj retry audit kaydını çoğaltmamalıdır.");

  if (tire.status === "ACTIVE") tire = unwrap(await service.removeTireRecord({ id: tire.id, removedOdometerKm: 131250, removedOn: "2026-08-01", scope })).row;
  assert(tire.status === "REMOVED", "Kabul lastik kaydı sökülmüş olmalıdır.");
  const auditBeforeRemovalRetry = await countAcceptanceAudit();
  const removalRetry = unwrap(await service.removeTireRecord({ id: tire.id, removedOdometerKm: 131250, removedOn: "2026-08-01", scope }));
  assert(removalRetry.idempotent, "Tekrarlanan lastik sökümü idempotent olmalıdır.");
  assert(await countAcceptanceAudit() === auditBeforeRemovalRetry, "Söküm retry audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance();
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({ where: { id: scope.tenantId }, select: { id: true } });
  assert(tenant, "F16 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({ where: { id: scope.companyId }, create: { id: scope.companyId, name: scope.companyName, tenantId: scope.tenantId }, update: { name: scope.companyName } });
  await prisma.period.upsert({ where: { id: scope.periodId }, create: { companyId: scope.companyId, id: scope.periodId, isClosed: false, label: scope.periodLabel, tenantId: scope.tenantId }, update: { isClosed: false, label: scope.periodLabel } });
  await prisma.vehicle.upsert({
    where: { id: vehicleId },
    create: { ...scopeFields(), brand: "NOA", createdBy: scope.userId, entryOdometerKm: 125000, id: vehicleId, modelName: "F16 Kabul", plate: "F16 KABUL 001", siteName: "F16 İzole Kabul Şantiyesi", status: "Aktif", updatedBy: scope.userId, vehicleType: "Kamyonet" },
    update: { entryOdometerKm: 125000, siteName: "F16 İzole Kabul Şantiyesi", status: "Aktif", updatedBy: scope.userId },
  });
  await prisma.appUserScopeAccess.upsert({
    where: { userId_companyId_periodId: { companyId: scope.companyId, periodId: scope.periodId, userId: scope.userId } },
    create: { ...scopeFields(), id: "scope-f16-kabul-accounting-20260729", isActive: true, isDefault: false, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
    update: { isActive: true, licenseLabel: scope.licenseLabel, role: scope.userRole },
  });
  await prisma.appSession.upsert({
    where: { id: sessionId },
    create: { ...scopeFields(), id: sessionId, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
    update: { expiresAt: null, licenseLabel: scope.licenseLabel, role: scope.userRole },
  });
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: "kurumsal" }, select: { id: true, monthlyPrice: true, storageLimitGb: true, userLimit: true } });
  assert(plan, "F16 görsel kabulü için Kurumsal abonelik planı bulunmalıdır.");
  await prisma.tenantSubscription.upsert({
    where: { id: subscriptionId },
    create: { ...scopeFields(), autoRenew: false, billingCycle: "yearly", createdBy: scope.userId, endsAt: new Date("2026-12-31T23:59:59.000Z"), id: subscriptionId, planId: plan.id, renewalAmount: Number(plan.monthlyPrice) * 12, startsAt: new Date("2026-01-01T00:00:00.000Z"), status: "active", storageLimitGb: plan.storageLimitGb, updatedBy: scope.userId, userLimit: plan.userLimit },
    update: { endsAt: new Date("2026-12-31T23:59:59.000Z"), planId: plan.id, status: "active", updatedBy: scope.userId },
  });
}

async function verifyAcceptance() {
  const records = unwrap(await service.list({ scope }));
  assert(records.length === 1 && records[0]?.status === "REMOVED", "Kabul kapsamı tek sökülmüş lastik kaydı taşımalıdır.");
  const entityIds = records.map((row) => row.id);
  const auditRows = await prisma.auditLog.findMany({
    where: { ...scopeFields(), entityId: { in: entityIds }, entityType: "vehicle-tire-record" },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, actorUserId: true, entityId: true, metadata: true },
  });
  const actions = auditRows.map((row) => row.action).sort();
  assert(JSON.stringify(actions) === JSON.stringify(["vehicle-tire.mount.create", "vehicle-tire.mount.remove"]), "Lastik kabul audit aksiyonları eksik veya tekrarlıdır.");
  assert(auditRows.every((row) => row.actorUserId === scope.userId), "Lastik audit aktörü kabul accounting kullanıcısı olmalıdır.");
  assert(auditRows.every((row) => !containsSensitiveDetail(row.metadata) && !row.entityId.includes("315/80")), "Lastik audit kaydı marka/model ayrıntısı taşımamalıdır.");
  const [wrongCompanyCount, wrongPeriodCount, cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount] = await Promise.all([
    prisma.vehicleTireRecord.count({ where: { id: { in: entityIds }, companyId: "company-demo-insaat" } }),
    prisma.vehicleTireRecord.count({ where: { id: { in: entityIds }, periodId: "period-2026" } }),
    prisma.cashBankMovement.count({ where: scopeFields() }), prisma.expense.count({ where: scopeFields() }), prisma.ledgerEntry.count({ where: scopeFields() }), prisma.payrollAccrual.count({ where: scopeFields() }), prisma.stockMovement.count({ where: scopeFields() }), prisma.timesheet.count({ where: scopeFields() }),
  ]);
  assert(wrongCompanyCount === 0 && wrongPeriodCount === 0, "Lastik kabulünde scope sızıntısı bulundu.");
  assert(cashBankCount === 0 && expenseCount === 0 && ledgerCount === 0 && payrollCount === 0 && stockCount === 0 && timesheetCount === 0, "Lastik kabulü finans/stok/bordro/puantaj yan etkisi üretmemelidir.");
  console.log(JSON.stringify({ ok: true, scope: scopeFields(), vehicle: vehicleId, records: { count: records.length, status: records[0]?.status }, audit: { actions, count: auditRows.length }, isolation: { wrongCompanyCount, wrongPeriodCount }, sideEffects: { cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount } }, null, 2));
}

function id(kind: string) { return `F16-KABUL-20260729::${kind}::001`; }
function scopeFields() { return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId }; }
async function countAcceptanceAudit() { return prisma.auditLog.count({ where: { ...scopeFields(), entityType: "vehicle-tire-record" } }); }
function unwrap<T>(result: { data: T; ok: true } | { errors: string[]; ok: false }) { if (!result.ok) throw new Error(result.errors.join(" ")); return result.data; }
function containsSensitiveDetail(metadata: unknown) { return JSON.stringify(metadata).toLocaleLowerCase("tr-TR").includes("315/80") || JSON.stringify(metadata).toLocaleLowerCase("tr-TR").includes("f16 kabul"); }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
