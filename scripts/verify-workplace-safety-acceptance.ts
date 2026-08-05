import "dotenv/config";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "../src/lib/audit-log-prisma-repository";
import { prisma } from "../src/lib/prisma";
import { createWorkplaceSafetyPrismaRepository, type WorkplaceSafetyPrismaClientLike } from "../src/lib/workplace-safety-prisma-repository";
import { createWorkplaceSafetyService } from "../src/lib/workplace-safety-service";
import type { TenantScope } from "../src/lib/tenant-scope";

const scope: TenantScope = {
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  companyId: "company-f14-kabul-20260728",
  companyName: "F14 İSG Kabul Şirketi",
  periodId: "period-f14-kabul-20260728",
  periodLabel: "F14 Kabul 2026",
  userId: "user-main",
  userName: "Muhasebe Kullanıcısı",
  userRole: "accounting",
  licenseLabel: "Kurumsal",
  periodClosed: false,
};
const projectCode = "F14-KABUL-20260728";
const personnelCode = "PER-F14-KABUL-001";
const timestamp = "2026-07-28T18:00:00.000Z";

const service = createWorkplaceSafetyService({
  auditLogRepository: createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike),
  createId: ({ kind, stableKey }) => `F14-KABUL-20260728::${kind}::${stableKey ?? "001"}`,
  now: () => timestamp,
  repository: createWorkplaceSafetyPrismaRepository(prisma as unknown as WorkplaceSafetyPrismaClientLike),
});

async function main() {
  const project = await ensureAcceptanceScope();
  let overview = unwrap(await service.list({ scope }));

  let accident = overview.workAccidents.find((row) => row.id === id("work-accident"));
  if (!accident) {
    accident = unwrap(await service.createWorkAccident({
      scope,
      values: {
        classification: "F14 Kabul Kayma Olayı",
        occurredOn: "2026-07-28",
        personnelId: personnelCode,
        projectId: project.id,
        summary: "F14 kabulü için hassas serbest olay özeti",
      },
    }));
    accident = unwrap(await service.recordWorkAccident({ id: accident.id, scope }));
    accident = unwrap(await service.closeWorkAccident({ id: accident.id, scope }));
  }
  assert(accident.status === "CLOSED", "İş kazası kabul kaydı kapalı olmalıdır.");

  overview = unwrap(await service.list({ scope }));
  let training = overview.trainings.find((row) => row.id === id("training"));
  if (!training) {
    training = unwrap(await service.createTraining({
      scope,
      values: {
        durationMinutes: 90,
        name: "F14 Kabul Temel İSG Eğitimi",
        nextTrainingOn: "2027-07-28",
        trainerName: "F14 Kabul Uzmanı",
        trainingOn: "2026-07-28",
        type: "Temel",
      },
    }));
    training = unwrap(await service.planTraining({ id: training.id, scope }));
    training = unwrap(await service.completeTraining({ id: training.id, scope }));
  }
  assert(training.status === "COMPLETED", "İSG eğitimi tamamlanmış olmalıdır.");

  overview = unwrap(await service.list({ scope }));
  const attendance = overview.trainingAttendances.find((row) => row.trainingId === training.id && row.personnelId === personnelCode);
  if (!attendance) {
    const created = unwrap(await service.recordTrainingAttendance({ scope, values: { personnelId: personnelCode, trainingId: training.id } }));
    assert(!created.idempotent, "İlk eğitim katılımı idempotent olmamalıdır.");
  }
  const attendanceAuditBeforeRetry = await countAcceptanceAudit();
  const attendanceRetry = unwrap(await service.recordTrainingAttendance({ scope, values: { personnelId: personnelCode, trainingId: training.id } }));
  assert(attendanceRetry.idempotent, "Tekrarlanan eğitim katılımı idempotent olmalıdır.");
  assert(await countAcceptanceAudit() === attendanceAuditBeforeRetry, "Katılım retry audit kaydını çoğaltmamalıdır.");

  overview = unwrap(await service.list({ scope }));
  let inspection = overview.inspections.find((row) => row.id === id("inspection"));
  if (!inspection) {
    inspection = unwrap(await service.createInspection({
      scope,
      values: { inspectedOn: "2026-07-28", inspectorName: "F14 Kabul Denetçisi", projectId: project.id, summary: "F14 kabul checklist özeti" },
    }));
    inspection = unwrap(await service.completeInspection({ id: inspection.id, scope }));
  }
  assert(inspection.status === "COMPLETED", "Saha denetimi tamamlanmış olmalıdır.");

  overview = unwrap(await service.list({ scope }));
  let finding = overview.findings.find((row) => row.id === id("finding"));
  if (!finding) {
    finding = unwrap(await service.createFinding({
      scope,
      values: {
        category: "F14 Kabul Korkuluk Kontrolü",
        dueOn: "2026-07-29",
        inspectionId: inspection.id,
        ownerPersonnelId: personnelCode,
        riskLevel: "HIGH",
        summary: "F14 kabulü için hassas bulgu özeti",
      },
    }));
    finding = unwrap(await service.resolveFinding({ id: finding.id, scope }));
  }
  assert(finding.status === "RESOLVED", "İSG bulgusu çözümlenmiş olmalıdır.");

  overview = unwrap(await service.list({ scope }));
  const issuanceKey = `${personnelCode}::F14-KKD-001::2026-07-28`;
  let issuance = overview.ppeIssuances.find((row) => row.issuanceKey === issuanceKey);
  if (!issuance) {
    const created = unwrap(await service.createPpeIssuance({
      scope,
      values: { issuedOn: "2026-07-28", personnelId: personnelCode, ppeCode: "F14-KKD-001", ppeType: "Baret", quantity: 1 },
    }));
    assert(!created.idempotent, "İlk KKD teslimi idempotent olmamalıdır.");
    issuance = unwrap(await service.returnPpeIssuance({ id: created.row.id, scope }));
  }
  assert(issuance.status === "RETURNED", "KKD zimmeti iade edilmiş olmalıdır.");
  const ppeAuditBeforeRetry = await countAcceptanceAudit();
  const ppeRetry = unwrap(await service.createPpeIssuance({
    scope,
    values: { issuedOn: "2026-07-28", personnelId: personnelCode, ppeCode: "F14-KKD-001", ppeType: "Baret", quantity: 1 },
  }));
  assert(ppeRetry.idempotent, "Tekrarlanan KKD teslimi idempotent olmalıdır.");
  assert(await countAcceptanceAudit() === ppeAuditBeforeRetry, "KKD retry audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance(project.id);
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({ where: { id: scope.tenantId }, select: { id: true } });
  assert(tenant, "F14 kabul tenant'ı bulunamadı.");
  await prisma.company.upsert({
    where: { id: scope.companyId },
    create: { id: scope.companyId, name: scope.companyName, tenantId: scope.tenantId },
    update: { name: scope.companyName },
  });
  await prisma.period.upsert({
    where: { id: scope.periodId },
    create: { companyId: scope.companyId, id: scope.periodId, isClosed: false, label: scope.periodLabel, tenantId: scope.tenantId },
    update: { isClosed: false, label: scope.periodLabel },
  });
  await prisma.entityRecord.upsert({
    where: { tenantId_companyId_periodId_slug_code: { ...scopeFields(), code: personnelCode, slug: "personel" } },
    create: { ...scopeFields(), code: personnelCode, createdBy: scope.userId, data: { name: "F14 Kabul Personeli", status: "Aktif" }, slug: "personel", updatedBy: scope.userId },
    update: { data: { name: "F14 Kabul Personeli", status: "Aktif" }, updatedBy: scope.userId },
  });
  return prisma.constructionProject.upsert({
    where: { tenantId_companyId_periodId_code: { ...scopeFields(), code: projectCode } },
    create: { ...scopeFields(), code: projectCode, contractAmount: 1, createdBy: scope.userId, name: "F14 İzole İSG Kabul Projesi", paymentType: "İSG Kabul", siteCode: "F14-KABUL", siteName: "F14 İzole Kabul Şantiyesi", status: "OPEN", updatedBy: scope.userId },
    update: { name: "F14 İzole İSG Kabul Projesi", status: "OPEN", updatedBy: scope.userId },
    select: { id: true, status: true },
  });
}

async function verifyAcceptance(projectId: string) {
  const overview = unwrap(await service.list({ scope }));
  assert(overview.workAccidents.length === 1 && overview.workAccidents[0]?.status === "CLOSED", "Kabul kapsamı tek kapalı iş kazası taşımalıdır.");
  assert(overview.trainings.length === 1 && overview.trainings[0]?.status === "COMPLETED", "Kabul kapsamı tek tamamlanan eğitim taşımalıdır.");
  assert(overview.trainingAttendances.length === 1, "Kabul kapsamı tek eğitim katılımı taşımalıdır.");
  assert(overview.inspections.length === 1 && overview.inspections[0]?.status === "COMPLETED", "Kabul kapsamı tek tamamlanmış denetim taşımalıdır.");
  assert(overview.findings.length === 1 && overview.findings[0]?.status === "RESOLVED", "Kabul kapsamı tek çözülmüş bulgu taşımalıdır.");
  assert(overview.ppeIssuances.length === 1 && overview.ppeIssuances[0]?.status === "RETURNED", "Kabul kapsamı tek iade edilmiş KKD taşımalıdır.");

  const entityIds = [
    ...overview.workAccidents, ...overview.trainings, ...overview.trainingAttendances,
    ...overview.inspections, ...overview.findings, ...overview.ppeIssuances,
  ].map((row) => row.id);
  const auditRows = await prisma.auditLog.findMany({
    where: { ...scopeFields(), entityId: { in: entityIds }, entityType: { startsWith: "workplace-safety-" } },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, actorUserId: true, entityId: true, metadata: true },
  });
  const actions = auditRows.map((row) => row.action).sort();
  assert(actions.length === 13, "İSG kabulü 13 merkezi audit kaydı taşımalıdır.");
  assert(JSON.stringify(actions) === JSON.stringify([
    "workplace-safety.finding.create", "workplace-safety.finding.resolve", "workplace-safety.inspection.complete", "workplace-safety.inspection.create",
    "workplace-safety.ppe-issuance.create", "workplace-safety.ppe-issuance.return", "workplace-safety.training-attendance.create",
    "workplace-safety.training.complete", "workplace-safety.training.create", "workplace-safety.training.plan",
    "workplace-safety.work-accident.close", "workplace-safety.work-accident.create", "workplace-safety.work-accident.record",
  ]), "İSG audit aksiyonları eksik veya tekrarlıdır.");
  assert(auditRows.every((row) => row.actorUserId === scope.userId), "İSG audit aktörü kabul accounting kullanıcısı olmalıdır.");
  assert(auditRows.every((row) => !containsSensitiveSummary(row.metadata)), "İSG audit metadata hassas serbest özet taşımamalıdır.");

  const [wrongCompanyCount, wrongPeriodCount, crossProjectCount, cashBankCount, payrollCount, stockCount, timesheetCount] = await Promise.all([
    prisma.safetyWorkAccident.count({ where: { id: { in: entityIds }, companyId: "company-demo-insaat" } }),
    prisma.safetyWorkAccident.count({ where: { id: { in: entityIds }, periodId: "period-2026" } }),
    prisma.safetyWorkAccident.count({ where: { id: { in: entityIds }, projectId: { not: projectId } } }),
    prisma.cashBankMovement.count({ where: scopeFields() }),
    prisma.payrollAccrual.count({ where: scopeFields() }),
    prisma.stockMovement.count({ where: scopeFields() }),
    prisma.timesheet.count({ where: scopeFields() }),
  ]);
  assert(wrongCompanyCount === 0 && wrongPeriodCount === 0 && crossProjectCount === 0, "İSG kabulünde scope sızıntısı bulundu.");
  assert(cashBankCount === 0 && payrollCount === 0 && stockCount === 0 && timesheetCount === 0, "İSG kabulü finans/bordro/stok/puantaj yan etkisi üretmemelidir.");

  console.log(JSON.stringify({
    ok: true,
    scope: scopeFields(),
    project: { code: projectCode, status: "OPEN" },
    records: {
      accident: overview.workAccidents[0]?.status, attendanceCount: overview.trainingAttendances.length,
      finding: overview.findings[0]?.status, inspection: overview.inspections[0]?.status,
      ppe: overview.ppeIssuances[0]?.status, training: overview.trainings[0]?.status,
    },
    audit: { actions, count: auditRows.length },
    isolation: { crossProjectCount, wrongCompanyCount, wrongPeriodCount },
    sideEffects: { cashBankCount, payrollCount, stockCount, timesheetCount },
  }, null, 2));
}

function id(kind: string) { return `F14-KABUL-20260728::${kind}::001`; }
function scopeFields() { return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId }; }
async function countAcceptanceAudit() { return prisma.auditLog.count({ where: { ...scopeFields(), entityType: { startsWith: "workplace-safety-" } } }); }
function unwrap<T>(result: { data: T; ok: true } | { errors: string[]; ok: false }) { if (!result.ok) throw new Error(result.errors.join(" ")); return result.data; }
function containsSensitiveSummary(metadata: unknown) { const serialized = JSON.stringify(metadata).toLocaleLowerCase("tr-TR"); return serialized.includes("hassas serbest") || serialized.includes("f14 kabul checklist"); }
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
