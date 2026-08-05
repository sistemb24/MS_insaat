import "dotenv/config";

import { createHrDashboardPrismaRepository, type HrDashboardPrismaClientLike } from "../src/lib/hr-dashboard-prisma-repository";
import { buildHrDashboardSnapshot } from "../src/lib/hr-dashboard";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const base = {
  companyId: "company-f23-kabul-20260730",
  companyName: "F23 İK Dashboard Kabul Şirketi",
  licenseLabel: "Kurumsal",
  periodClosed: false,
  periodId: "period-f23-kabul-20260730",
  periodLabel: "F23 Kabul 2026",
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
};
const scope: TenantScope = { ...base, userId: "user-main", userName: "F23 Kabul Kullanıcısı", userRole: "accounting" };
const repository = createHrDashboardPrismaRepository(prisma as unknown as HrDashboardPrismaClientLike);
const scopeFields = () => ({ companyId: base.companyId, periodId: base.periodId, tenantId: base.tenantId });

async function main() {
  await ensureScope();
  await seedSources();
  const auditBefore = await prisma.auditLog.count({ where: scopeFields() });
  const first = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources: await repository.loadSources({ scope }) });
  const second = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources: await repository.loadSources({ scope }) });
  const auditAfter = await prisma.auditLog.count({ where: scopeFields() });

  assert(JSON.stringify(first) === JSON.stringify(second), "Tekrarlanan okuma aynı sonucu vermelidir.");
  assert(auditAfter === auditBefore, "Salt-okunur dashboard audit üretmemelidir.");
  assert(first.personnel.total === 4 && first.personnel.active === 3 && first.personnel.passive === 1 && first.personnel.onLeaveToday === 1, "Personel KPI'ları hatalıdır.");
  assert(JSON.stringify(first.siteDistribution) === JSON.stringify([
    { count: 2, percentage: 66.7, siteName: "F23 Kuzey Şantiyesi" },
    { count: 1, percentage: 33.3, siteName: "Şantiye atanmamış" },
  ]), "Şantiye dağılımı hatalıdır.");
  assert(first.workQueue.total === 6 && first.workQueue.leave === 1 && first.workQueue.advanceManager === 1 && first.workQueue.advanceFinance === 1 && first.workQueue.advancePayment === 1 && first.workQueue.advanceReceivable === 1 && first.workQueue.transfer === 1, "İş kuyruğu hatalıdır.");
  assert(first.upcomingLeaves.length === 1 && first.upcomingTrainings.length === 1 && first.upcomingTrainings[0]?.attendanceCount === 2 && first.draftTimesheets.length === 1, "Yaklaşan kayıtlar hatalıdır.");
  const serialized = JSON.stringify(first).toLocaleLowerCase("tr-TR");
  assert(!serialized.includes("gizli operasyon notu") && !serialized.includes("12500") && !serialized.includes("requestkey"), "Dashboard hassas kaynak alanı taşımamalıdır.");

  const foreignScope = { ...scope, companyId: "company-f23-yabanci", periodId: "period-f23-yabanci" };
  const foreign = buildHrDashboardSnapshot({ asOfDate: "2026-07-30", sources: await repository.loadSources({ scope: foreignScope }) });
  assert(foreign.personnel.total === 0 && foreign.workQueue.total === 0 && foreign.upcomingLeaves.length === 0 && foreign.upcomingTrainings.length === 0 && foreign.draftTimesheets.length === 0, "Yabancı scope boş olmalıdır.");

  console.log(JSON.stringify({ audit: { after: auditAfter, before: auditBefore, unchanged: true }, isolation: { foreignScopeEmpty: true }, ok: true, snapshot: first, scope: scopeFields() }, null, 2));
}

async function ensureScope() {
  assert(await prisma.tenant.findUnique({ select: { id: true }, where: { id: base.tenantId } }), "F23 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({ create: { id: base.companyId, name: base.companyName, tenantId: base.tenantId }, update: { name: base.companyName }, where: { id: base.companyId } });
  await prisma.period.upsert({ create: { companyId: base.companyId, id: base.periodId, isClosed: false, label: base.periodLabel, tenantId: base.tenantId }, update: { isClosed: false, label: base.periodLabel }, where: { id: base.periodId } });
  await prisma.appUserScopeAccess.upsert({
    create: { ...scopeFields(), id: "scope-f23-kabul-accounting-20260730", isActive: true, isDefault: false, licenseLabel: base.licenseLabel, role: scope.userRole, userId: scope.userId },
    update: { isActive: true, licenseLabel: base.licenseLabel, role: scope.userRole },
    where: { userId_companyId_periodId: { companyId: base.companyId, periodId: base.periodId, userId: scope.userId } },
  });
  await prisma.appSession.upsert({
    create: { ...scopeFields(), id: "session-f23-kabul-accounting-20260730", licenseLabel: base.licenseLabel, role: scope.userRole, userId: scope.userId },
    update: { expiresAt: null, licenseLabel: base.licenseLabel, role: scope.userRole, userId: scope.userId },
    where: { id: "session-f23-kabul-accounting-20260730" },
  });
}

async function seedSources() {
  for (const [code, name, site, status] of [
    ["F23-PER-001", "F23 Ayşe Demir", "F23 Kuzey Şantiyesi", "Aktif"],
    ["F23-PER-002", "F23 Mehmet Kaya", "F23 Kuzey Şantiyesi", "Aktif"],
    ["F23-PER-003", "F23 Elif Yılmaz", "", "Aktif"],
    ["F23-PER-004", "F23 Can Aydın", "F23 Güney Şantiyesi", "Pasif"],
  ] as const) {
    const data = { name, site, status, title: "F23 Kabul Personeli" };
    await prisma.entityRecord.upsert({ create: { ...scopeFields(), code, createdBy: scope.userId, data, slug: "personel", updatedBy: scope.userId }, update: { data, updatedBy: scope.userId }, where: { tenantId_companyId_periodId_slug_code: { ...scopeFields(), code, slug: "personel" } } });
  }
  for (const row of [
    leave("current", "F23-PER-001", "F23 Ayşe Demir", "2026-07-29", "2026-07-31", "APPROVED"),
    leave("upcoming", "F23-PER-002", "F23 Mehmet Kaya", "2026-08-05", "2026-08-06", "APPROVED"),
    leave("submitted", "F23-PER-003", "F23 Elif Yılmaz", "2026-08-02", "2026-08-02", "SUBMITTED"),
  ]) {
    await prisma.employeeLeaveRequest.upsert({ create: row, update: { endDate: row.endDate, personnelCode: row.personnelCode, personnelName: row.personnelName, startDate: row.startDate, status: row.status, updatedBy: scope.userId }, where: { id: row.id } });
  }
  for (const [suffix, status] of [["manager", "SUBMITTED"], ["finance", "MANAGER_APPROVED"], ["payment", "FINANCE_APPROVED"], ["receivable", "PAID"]] as const) {
    const id = `F23-KABUL-20260730::advance::${suffix}`;
    await prisma.employeeAdvanceRequest.upsert({
      create: { ...scopeFields(), approvedAmount: status === "SUBMITTED" ? null : 12500, createRequestKey: `F23-ADVANCE-${suffix}`, createdBy: scope.userId, id, note: "Gizli operasyon notu dashboard dışı kalır.", personnelCode: "F23-PER-002", personnelName: "F23 Mehmet Kaya", requestDate: new Date("2026-07-30T00:00:00.000Z"), requestedAmount: 12500, settledAmount: 0, status, updatedBy: scope.userId },
      update: { status, updatedBy: scope.userId }, where: { id },
    });
  }
  await prisma.employeeTransfer.upsert({
    create: { ...scopeFields(), createRequestKey: "F23-TRANSFER-SUBMITTED", createdBy: scope.userId, effectiveDate: new Date("2026-08-03T00:00:00.000Z"), id: "F23-KABUL-20260730::transfer::submitted", note: "Gizli operasyon notu dashboard dışı kalır.", personnelCode: "F23-PER-003", personnelName: "F23 Elif Yılmaz", sourceSiteCode: "F23-SITE-A", sourceSiteName: "F23 Kuzey Şantiyesi", status: "SUBMITTED", targetSiteCode: "F23-SITE-B", targetSiteName: "F23 Güney Şantiyesi", updatedBy: scope.userId },
    update: { status: "SUBMITTED", updatedBy: scope.userId }, where: { id: "F23-KABUL-20260730::transfer::submitted" },
  });
  await prisma.safetyTraining.upsert({
    create: { ...scopeFields(), createdBy: scope.userId, durationMinutes: 90, id: "F23-KABUL-20260730::training::planned", name: "F23 Yüksekte Çalışma Eğitimi", status: "PLANNED", trainerName: "F23 Kabul Eğitmeni", trainingOn: new Date("2026-08-06T09:00:00.000Z"), type: "İSG", updatedBy: scope.userId },
    update: { name: "F23 Yüksekte Çalışma Eğitimi", status: "PLANNED", trainingOn: new Date("2026-08-06T09:00:00.000Z"), updatedBy: scope.userId }, where: { id: "F23-KABUL-20260730::training::planned" },
  });
  for (const personnelId of ["F23-PER-001", "F23-PER-002"]) {
    await prisma.safetyTrainingAttendance.upsert({ create: { ...scopeFields(), createdBy: scope.userId, id: `F23-KABUL-20260730::attendance::${personnelId}`, personnelId, status: "ATTENDED", trainingId: "F23-KABUL-20260730::training::planned" }, update: { status: "ATTENDED" }, where: { trainingId_personnelId: { personnelId, trainingId: "F23-KABUL-20260730::training::planned" } } });
  }
  for (const [suffix, documentNo, status] of [["draft", "PNT-F23-0001", "Taslak"], ["approved", "PNT-F23-0002", "Onaylandı"]] as const) {
    const id = `F23-KABUL-20260730::timesheet::${suffix}`;
    await prisma.timesheet.upsert({ create: { ...scopeFields(), createdBy: scope.userId, deductionTotal: 0, documentNo, grossTotal: 0, id, lineCount: suffix === "draft" ? 3 : 2, month: 7, netTotal: 0, siteCode: "F23-SITE-A", siteName: "F23 Kuzey Şantiyesi", status, totalOvertimeHours: 0, totalWorkedDays: 0, updatedBy: scope.userId, year: 2026 }, update: { lineCount: suffix === "draft" ? 3 : 2, status, updatedBy: scope.userId }, where: { id } });
  }
}

function leave(suffix: string, personnelCode: string, personnelName: string, startDate: string, endDate: string, status: string) {
  return { ...scopeFields(), chargeableDays: 1, createRequestKey: `F23-LEAVE-${suffix}`, createdBy: scope.userId, endDate: new Date(`${endDate}T00:00:00.000Z`), id: `F23-KABUL-20260730::leave::${suffix}`, leaveType: "ANNUAL", note: "Gizli operasyon notu dashboard dışı kalır.", personnelCode, personnelName, startDate: new Date(`${startDate}T00:00:00.000Z`), status, updatedBy: scope.userId };
}
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });