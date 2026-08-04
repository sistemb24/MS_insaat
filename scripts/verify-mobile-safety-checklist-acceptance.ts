import "dotenv/config";

import { createAuditLogPrismaRepository, type AuditLogPrismaClientLike } from "../src/lib/audit-log-prisma-repository";
import { createMobileSafetyChecklistPrismaRepository, type MobileSafetyChecklistPrismaClientLike } from "../src/lib/mobile-safety-checklist-prisma-repository";
import { createMobileSafetyChecklistService } from "../src/lib/mobile-safety-checklist-service";
import { prisma } from "../src/lib/prisma";
import type { TenantScope } from "../src/lib/tenant-scope";

const scope: TenantScope = {
  tenantId: "tenant-noa-demo",
  tenantName: "NOA Demo Tenant",
  companyId: "company-f17-kabul-20260730",
  companyName: "F17 Mobil İSG Kabul Şirketi",
  periodId: "period-f17-kabul-20260730",
  periodLabel: "F17 Kabul 2026",
  userId: "user-main",
  userName: "Muhasebe Kullanıcısı",
  userRole: "accounting",
  licenseLabel: "Kurumsal",
  periodClosed: false,
};
const projectCode = "F17-KABUL-20260730";
const timestamp = "2026-07-30T18:00:00.000Z";
const sessionId = "session-f17-kabul-accounting-20260730";
const subscriptionId = "sub-f17-kabul-20260730";
const inspectionId = id("inspection");
const findingId = id("finding");
const idCounters = new Map<string, number>();

const service = createMobileSafetyChecklistService({
  auditLogRepository: createAuditLogPrismaRepository(prisma as unknown as AuditLogPrismaClientLike),
  createId: ({ kind }) => {
    const next = (idCounters.get(kind) ?? 0) + 1;
    idCounters.set(kind, next);
    return id(kind, next);
  },
  now: () => timestamp,
  repository: createMobileSafetyChecklistPrismaRepository(prisma as unknown as MobileSafetyChecklistPrismaClientLike),
});

async function main() {
  const project = await ensureAcceptanceScope();
  let overview = unwrap(await service.list({ scope }));

  let template = overview.templates.find((row) => row.id === id("checklist-template"));
  if (!template) {
    template = unwrap(await service.createTemplate({
      scope,
      values: {
        description: "F17 izole gerçek veri ve mobil görünüm kabul şablonu",
        items: [
          { category: "Çalışma Alanı", title: "Geçiş yolları temiz ve güvenli mi?" },
          { category: "Yüksekte Çalışma", title: "Korkuluk ve kenar korumaları uygun mu?" },
          { category: "KKD", title: "Gerekli kişisel koruyucu donanım kullanılıyor mu?" },
        ],
        title: "F17 Mobil Saha Kontrolü",
      },
    }));
  }
  assert(template.status === "ACTIVE", "Kabul kontrol şablonu aktif olmalıdır.");

  overview = unwrap(await service.list({ scope }));
  const items = overview.templateItems
    .filter((row) => row.templateId === template.id)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  assert(items.length === 3, "Kabul kontrol şablonu üç madde taşımalıdır.");

  let run = overview.runs.find((row) => row.id === id("checklist-run"));
  if (!run) {
    const created = unwrap(await service.createRun({
      inspectionId,
      scope,
      values: {
        inspectedOn: "2026-07-30",
        inspectorName: "F17 Kabul İSG Uzmanı",
        projectId: project.id,
        requestKey: "F17-KABUL-SAHASI-001",
        templateId: template.id,
      },
    }));
    assert(!created.idempotent, "İlk kontrol yürütmesi idempotent olmamalıdır.");
    run = created.row;
  }
  assert(run, "Kabul kontrol yürütmesi bulunmalıdır.");
  const acceptanceRun = run;

  const answers = [
    { note: "Geçiş yolları açık.", response: "PASS" as const },
    { note: "Korkuluk gevşek; mevcut bulguya bağlanacak.", response: "FAIL" as const },
    { note: "Bu alanda KKD maddesi uygulanmadı.", response: "NOT_APPLICABLE" as const },
  ];
  for (const [index, item] of items.entries()) {
    overview = unwrap(await service.list({ scope }));
    const existing = overview.responses.find((row) => row.runId === acceptanceRun.id && row.checklistItemId === item.id);
    if (!existing) {
      const created = unwrap(await service.recordResponse({
        scope,
        values: {
          checklistItemId: item.id,
          checklistRunId: acceptanceRun.id,
          ...answers[index],
        },
      }));
      assert(!created.idempotent, `İlk ${index + 1}. madde yanıtı idempotent olmamalıdır.`);
    }
  }

  overview = unwrap(await service.list({ scope }));
  let failedResponse = overview.responses.find((row) => row.runId === acceptanceRun.id && row.response === "FAIL");
  assert(failedResponse, "Kabul yürütmesi bir uygunsuz yanıt taşımalıdır.");
  if (!failedResponse.findingId) {
    failedResponse = unwrap(await service.linkFinding({ findingId, responseId: failedResponse.id, scope })).row;
  }
  assert(failedResponse.findingId === findingId, "Uygunsuz yanıt mevcut bulguya bağlanmalıdır.");

  overview = unwrap(await service.list({ scope }));
  run = overview.runs.find((row) => row.id === acceptanceRun.id) ?? acceptanceRun;
  if (run.status === "DRAFT") run = unwrap(await service.completeRun({ id: run.id, scope })).row;
  assert(run.status === "COMPLETED", "Kabul kontrol yürütmesi tamamlanmış olmalıdır.");

  const auditBeforeRetry = await countAcceptanceAudit();
  const runRetry = unwrap(await service.createRun({
    inspectionId,
    scope,
    values: {
      inspectedOn: "2026-07-30",
      inspectorName: "F17 Kabul İSG Uzmanı",
      projectId: project.id,
      requestKey: "F17-KABUL-SAHASI-001",
      templateId: template.id,
    },
  }));
  assert(runRetry.idempotent, "Tekrarlanan kontrol yürütmesi idempotent olmalıdır.");
  for (const [index, item] of items.entries()) {
    const retry = unwrap(await service.recordResponse({
      scope,
      values: {
        checklistItemId: item.id,
        checklistRunId: run.id,
        ...answers[index],
      },
    }));
    assert(retry.idempotent, `Tekrarlanan ${index + 1}. madde yanıtı idempotent olmalıdır.`);
  }
  const findingRetry = unwrap(await service.linkFinding({ findingId, responseId: failedResponse.id, scope }));
  assert(findingRetry.idempotent, "Tekrarlanan bulgu bağlantısı idempotent olmalıdır.");
  const completeRetry = unwrap(await service.completeRun({ id: run.id, scope }));
  assert(completeRetry.idempotent, "Tekrarlanan kontrol tamamlama idempotent olmalıdır.");
  assert(await countAcceptanceAudit() === auditBeforeRetry, "Retry işlemleri audit kaydını çoğaltmamalıdır.");

  await verifyAcceptance(project.id);
}

async function ensureAcceptanceScope() {
  const tenant = await prisma.tenant.findUnique({ where: { id: scope.tenantId }, select: { id: true } });
  assert(tenant, "F17 kabul tenant'ı bulunamadı.");
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
  const project = await prisma.constructionProject.upsert({
    where: { tenantId_companyId_periodId_code: { ...scopeFields(), code: projectCode } },
    create: {
      ...scopeFields(), code: projectCode, contractAmount: 1, createdBy: scope.userId,
      name: "F17 İzole Mobil İSG Kabul Projesi", paymentType: "İSG Kabul",
      siteCode: "F17-KABUL", siteName: "F17 İzole Kabul Şantiyesi",
      status: "OPEN", updatedBy: scope.userId,
    },
    update: { name: "F17 İzole Mobil İSG Kabul Projesi", status: "OPEN", updatedBy: scope.userId },
    select: { id: true, status: true },
  });
  await prisma.safetyInspection.upsert({
    where: { id: inspectionId },
    create: {
      ...scopeFields(), createdBy: scope.userId, id: inspectionId,
      inspectedOn: new Date("2026-07-30T00:00:00.000Z"),
      inspectorName: "F17 Kabul İSG Uzmanı", projectId: project.id,
      status: "COMPLETED", summary: "F17 kabul denetimi", updatedBy: scope.userId,
    },
    update: { projectId: project.id, status: "COMPLETED", updatedBy: scope.userId },
  });
  await prisma.safetyFinding.upsert({
    where: { id: findingId },
    create: {
      ...scopeFields(), category: "Kenar Koruma", createdBy: scope.userId,
      dueOn: new Date("2026-08-01T00:00:00.000Z"), id: findingId,
      inspectionId, riskLevel: "HIGH", status: "OPEN",
      summary: "F17 kabul mevcut korkuluk bulgusu", updatedBy: scope.userId,
    },
    update: { inspectionId, status: "OPEN", updatedBy: scope.userId },
  });
  await prisma.appUserScopeAccess.upsert({
    where: { userId_companyId_periodId: { companyId: scope.companyId, periodId: scope.periodId, userId: scope.userId } },
    create: {
      ...scopeFields(), id: "scope-f17-kabul-accounting-20260730",
      isActive: true, isDefault: false, licenseLabel: scope.licenseLabel,
      role: scope.userRole, userId: scope.userId,
    },
    update: { isActive: true, licenseLabel: scope.licenseLabel, role: scope.userRole },
  });
  await prisma.appSession.upsert({
    where: { id: sessionId },
    create: { ...scopeFields(), id: sessionId, licenseLabel: scope.licenseLabel, role: scope.userRole, userId: scope.userId },
    update: { expiresAt: null, licenseLabel: scope.licenseLabel, role: scope.userRole },
  });
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: "kurumsal" },
    select: { id: true, monthlyPrice: true, storageLimitGb: true, userLimit: true },
  });
  assert(plan, "F17 görsel kabulü için Kurumsal abonelik planı bulunmalıdır.");
  await prisma.tenantSubscription.upsert({
    where: { id: subscriptionId },
    create: {
      ...scopeFields(), autoRenew: false, billingCycle: "yearly",
      createdBy: scope.userId, endsAt: new Date("2026-12-31T23:59:59.000Z"),
      id: subscriptionId, planId: plan.id, renewalAmount: Number(plan.monthlyPrice) * 12,
      startsAt: new Date("2026-01-01T00:00:00.000Z"), status: "active",
      storageLimitGb: plan.storageLimitGb, updatedBy: scope.userId, userLimit: plan.userLimit,
    },
    update: {
      endsAt: new Date("2026-12-31T23:59:59.000Z"), planId: plan.id,
      status: "active", updatedBy: scope.userId,
    },
  });
  return project;
}

async function verifyAcceptance(projectId: string) {
  const overview = unwrap(await service.list({ scope }));
  assert(overview.templates.length === 1 && overview.templates[0]?.status === "ACTIVE", "Kabul kapsamı tek aktif kontrol şablonu taşımalıdır.");
  assert(overview.templateItems.length === 3, "Kabul kapsamı üç kontrol maddesi taşımalıdır.");
  assert(overview.runs.length === 1 && overview.runs[0]?.status === "COMPLETED", "Kabul kapsamı tek tamamlanmış yürütme taşımalıdır.");
  assert(overview.runs[0]?.projectId === projectId && overview.runs[0]?.inspectionId === inspectionId, "Kontrol yürütmesi doğru proje ve denetime bağlı olmalıdır.");
  assert(overview.responses.length === 3, "Kabul kapsamı üç kontrol yanıtı taşımalıdır.");
  assert(
    JSON.stringify(overview.responses.map((row) => row.response).sort()) === JSON.stringify(["FAIL", "NOT_APPLICABLE", "PASS"]),
    "Kabul yanıtları PASS, FAIL ve NOT_APPLICABLE durumlarını taşımalıdır.",
  );
  assert(overview.responses.filter((row) => row.findingId === findingId).length === 1, "Yalnız bir uygunsuz yanıt mevcut bulguya bağlı olmalıdır.");

  const entityIds = [
    ...overview.templates,
    ...overview.runs,
    ...overview.responses,
  ].map((row) => row.id);
  const auditRows = await prisma.auditLog.findMany({
    where: { ...scopeFields(), entityId: { in: entityIds }, entityType: { startsWith: "mobile-safety-checklist-" } },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, actorUserId: true, entityId: true, metadata: true },
  });
  const actions = auditRows.map((row) => row.action).sort();
  assert(JSON.stringify(actions) === JSON.stringify([
    "mobile-safety-checklist.response.finding-link",
    "mobile-safety-checklist.response.record",
    "mobile-safety-checklist.response.record",
    "mobile-safety-checklist.response.record",
    "mobile-safety-checklist.run.complete",
    "mobile-safety-checklist.run.create",
    "mobile-safety-checklist.template.create",
  ]), "Mobil İSG kontrol listesi audit aksiyonları eksik veya tekrarlıdır.");
  assert(auditRows.every((row) => row.actorUserId === scope.userId), "Mobil İSG audit aktörü kabul accounting kullanıcısı olmalıdır.");
  assert(auditRows.every((row) => !containsSensitiveDetail(row.metadata)), "Mobil İSG audit metadata serbest kontrol metni taşımamalıdır.");

  const [
    wrongCompanyTemplates, wrongPeriodRuns, crossProjectRuns,
    cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount,
  ] = await Promise.all([
    prisma.safetyChecklistTemplate.count({ where: { id: { in: entityIds }, companyId: "company-demo-insaat" } }),
    prisma.safetyChecklistRun.count({ where: { id: { in: entityIds }, periodId: "period-2026" } }),
    prisma.safetyChecklistRun.count({ where: { id: { in: entityIds }, projectId: { not: projectId } } }),
    prisma.cashBankMovement.count({ where: scopeFields() }),
    prisma.expense.count({ where: scopeFields() }),
    prisma.ledgerEntry.count({ where: scopeFields() }),
    prisma.payrollAccrual.count({ where: scopeFields() }),
    prisma.stockMovement.count({ where: scopeFields() }),
    prisma.timesheet.count({ where: scopeFields() }),
  ]);
  assert(wrongCompanyTemplates === 0 && wrongPeriodRuns === 0 && crossProjectRuns === 0, "Mobil İSG kabulünde scope sızıntısı bulundu.");
  assert(
    cashBankCount === 0 && expenseCount === 0 && ledgerCount === 0
      && payrollCount === 0 && stockCount === 0 && timesheetCount === 0,
    "Mobil İSG kabulü finans/stok/bordro/puantaj yan etkisi üretmemelidir.",
  );

  console.log(JSON.stringify({
    ok: true,
    scope: scopeFields(),
    project: { code: projectCode, status: "OPEN" },
    records: {
      findingLinks: overview.responses.filter((row) => row.findingId).length,
      responseCount: overview.responses.length,
      responseStatuses: overview.responses.map((row) => row.response).sort(),
      runStatus: overview.runs[0]?.status,
      templateItemCount: overview.templateItems.length,
      templateStatus: overview.templates[0]?.status,
    },
    audit: { actions, count: auditRows.length },
    isolation: { crossProjectRuns, wrongCompanyTemplates, wrongPeriodRuns },
    sideEffects: { cashBankCount, expenseCount, ledgerCount, payrollCount, stockCount, timesheetCount },
  }, null, 2));
}

function id(kind: string, sequence = 1) {
  return `F17-KABUL-20260730::${kind}::${String(sequence).padStart(3, "0")}`;
}
function scopeFields() {
  return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId };
}
async function countAcceptanceAudit() {
  return prisma.auditLog.count({ where: { ...scopeFields(), entityType: { startsWith: "mobile-safety-checklist-" } } });
}
function unwrap<T>(result: { data: T; ok: true } | { errors: string[]; ok: false }) {
  if (!result.ok) throw new Error(result.errors.join(" "));
  return result.data;
}
function containsSensitiveDetail(metadata: unknown) {
  const serialized = JSON.stringify(metadata).toLocaleLowerCase("tr-TR");
  return serialized.includes("korkuluk gevşek")
    || serialized.includes("geçiş yolları açık")
    || serialized.includes("kişisel koruyucu donanım");
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
