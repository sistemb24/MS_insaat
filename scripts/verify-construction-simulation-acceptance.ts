import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const scope = {
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
};
const projectCode = "F8-KABUL-20260722";
const sourceDocumentNo = "F8-HAK-001";
const scenarioNumbers = [
  "F11-KABUL-20260723-A",
  "F11-KABUL-20260723-B",
] as const;

async function main() {
  const project = await prisma.constructionProject.findFirst({
    where: { ...scope, code: projectCode },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      progressPayments: {
        where: { documentNo: sourceDocumentNo },
        select: {
          id: true,
          status: true,
          updatedAt: true,
          snapshots: {
            orderBy: { contractItemId: "asc" },
            select: {
              contractItemId: true,
              periodQuantity: true,
              cumulativeQuantity: true,
              unitPrice: true,
            },
          },
          accountingLink: {
            select: { id: true, progressPaymentId: true },
          },
          _count: {
            select: {
              measurementLines: true,
              measurementSheets: true,
              extraWorks: true,
              deductionMovements: true,
              financialMovements: true,
            },
          },
        },
      },
    },
  });
  assert(project, "Kabul projesi bulunamadı.");
  assert(project.status === "OPEN", "Kabul projesi açık kalmalıdır.");
  const sourcePayment = project.progressPayments[0];
  assert(sourcePayment, "Kabul kaynak hakedişi bulunamadı.");
  assert(sourcePayment.status === "FINALIZED", "Kaynak hakediş kesinleşmiş kalmalıdır.");
  assert(
    sourcePayment.updatedAt.toISOString() === "2026-07-22T10:27:14.279Z",
    "Kaynak hakediş kabul sırasında değişti.",
  );
  assert(sourcePayment.snapshots.length === 1, "Kaynak snapshot sayısı değişti.");
  assertNumber(sourcePayment.snapshots[0]?.periodQuantity, 10, "Kaynak dönem miktarı");
  assertNumber(sourcePayment.snapshots[0]?.cumulativeQuantity, 10, "Kaynak kümülatif miktarı");
  assertNumber(sourcePayment.snapshots[0]?.unitPrice, 10_000, "Kaynak birim fiyatı");
  assert(sourcePayment._count.measurementLines === 1, "Kaynak metraj satırı sayısı değişti.");
  assert(sourcePayment._count.measurementSheets === 1, "Kaynak metraj föyü sayısı değişti.");
  assert(sourcePayment._count.extraWorks === 0, "Kaynak ek iş sayısı değişti.");
  assert(sourcePayment._count.deductionMovements === 2, "Kaynak kesinti sayısı değişti.");
  assert(sourcePayment._count.financialMovements === 0, "Kaynak finansal hareket sayısı değişti.");
  assert(sourcePayment.accountingLink, "Kaynak muhasebe bağlantısı kayboldu.");

  const scenarios = await prisma.constructionSimulationScenario.findMany({
    where: {
      ...scope,
      projectId: project.id,
      scenarioNo: { in: [...scenarioNumbers] },
    },
    orderBy: { scenarioNo: "asc" },
    include: {
      revisions: {
        orderBy: { revisionNo: "asc" },
        include: { lines: { orderBy: { lineNo: "asc" } } },
      },
    },
  });
  assert(scenarios.length === 2, "İki izole kabul senaryosu bulunmalıdır.");
  const [approved, archived] = scenarios;
  assert(approved?.scenarioNo === scenarioNumbers[0], "Onaylı senaryo numarası uyuşmuyor.");
  assert(approved.status === "APPROVED", "A senaryosu onaylı olmalıdır.");
  assert(approved.currentRevisionNo === 2, "A senaryosu R2 olmalıdır.");
  assert(approved.approvedBy === "user-ahmet", "A senaryosu yönetici tarafından onaylanmalıdır.");
  assertRevision(approved.revisions[0], 1, 12, 120_000);
  assertRevision(approved.revisions[1], 2, 18, 180_000);

  assert(archived?.scenarioNo === scenarioNumbers[1], "Arşiv senaryosu numarası uyuşmuyor.");
  assert(archived.status === "ARCHIVED", "B senaryosu arşivli olmalıdır.");
  assert(archived.currentRevisionNo === 2, "B senaryosu R2 olmalıdır.");
  assert(archived.archivedBy === "user-ahmet", "B senaryosu yönetici tarafından arşivlenmelidir.");
  assertRevision(archived.revisions[0], 1, 18, 180_000);
  assertRevision(archived.revisions[1], 2, 25, 250_000);

  const auditRows = await prisma.auditLog.findMany({
    where: {
      ...scope,
      entityType: "construction-simulation",
      entityId: { in: scenarios.map((scenario) => scenario.id) },
    },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: {
      action: true,
      actorUserId: true,
      entityId: true,
      metadata: true,
    },
  });
  const expectedActions = [
    "construction-simulation.create",
    "construction-simulation.revise",
    "construction-simulation.approve",
    "construction-simulation.clone",
    "construction-simulation.revise",
    "construction-simulation.archive",
  ].sort();
  assert(
    JSON.stringify(auditRows.map((row) => row.action).sort()) === JSON.stringify(expectedActions),
    "Mutation audit aksiyonları eksik veya tekrarlı.",
  );
  assert(
    auditRows.filter((row) => row.actorUserId === "user-main").length === 4,
    "Accounting audit sayısı dört olmalıdır.",
  );
  assert(
    auditRows.filter((row) => row.actorUserId === "user-ahmet").length === 2,
    "Admin audit sayısı iki olmalıdır.",
  );
  assert(
    auditRows.every((row) => !containsFreeText(row.metadata)),
    "Audit metadata açıklama veya revizyon notu taşımamalıdır.",
  );

  const [wrongCompanyCount, wrongPeriodCount, wrongProjectCount] = await Promise.all([
    prisma.constructionSimulationScenario.count({
      where: { id: { in: scenarios.map((scenario) => scenario.id) }, companyId: "company-akdeniz-insaat" },
    }),
    prisma.constructionSimulationScenario.count({
      where: { id: { in: scenarios.map((scenario) => scenario.id) }, periodId: "period-akdeniz-2026" },
    }),
    prisma.constructionSimulationScenario.count({
      where: {
        scenarioNo: { in: [...scenarioNumbers] },
        projectId: { not: project.id },
      },
    }),
  ]);
  assert(wrongCompanyCount === 0, "Cross-company senaryo sızıntısı bulundu.");
  assert(wrongPeriodCount === 0, "Cross-period senaryo sızıntısı bulundu.");
  assert(wrongProjectCount === 0, "Cross-project senaryo sızıntısı bulundu.");

  const [period, subscription] = await Promise.all([
    prisma.period.findFirst({ where: { id: scope.periodId, companyId: scope.companyId }, select: { isClosed: true } }),
    prisma.tenantSubscription.findFirst({
      where: { ...scope, status: "active" },
      select: { planId: true, status: true },
    }),
  ]);
  assert(period && !period.isClosed, "Kabul sonrası demo dönemi açık kalmalıdır.");
  assert(subscription?.status === "active", "Kabul sonrası abonelik aktif kalmalıdır.");
  assert(subscription.planId === "kurumsal", "Kabul sonrası demo paketi değişmemelidir.");

  console.log(JSON.stringify({
    ok: true,
    scope,
    project: {
      code: projectCode,
      status: project.status,
      sourceDocumentNo,
      sourceUpdatedAt: sourcePayment.updatedAt.toISOString(),
      snapshotCount: sourcePayment.snapshots.length,
      accountingLinkPreserved: Boolean(sourcePayment.accountingLink),
    },
    scenarios: scenarios.map((scenario) => ({
      scenarioNo: scenario.scenarioNo,
      status: scenario.status,
      currentRevisionNo: scenario.currentRevisionNo,
      revisions: scenario.revisions.map((revision) => ({
        revisionNo: revision.revisionNo,
        proposedQuantityTotal: Number(revision.proposedQuantityTotal),
        projectedAmountTotal: Number(revision.projectedAmountTotal),
      })),
    })),
    audit: {
      count: auditRows.length,
      accounting: auditRows.filter((row) => row.actorUserId === "user-main").length,
      admin: auditRows.filter((row) => row.actorUserId === "user-ahmet").length,
      compareAuditCount: auditRows.filter((row) => row.action.includes("compare")).length,
    },
    isolation: { wrongCompanyCount, wrongPeriodCount, wrongProjectCount },
    guards: {
      periodClosed: period.isClosed,
      subscriptionPlan: subscription.planId,
      subscriptionStatus: subscription.status,
    },
  }, null, 2));
}

function assertRevision(
  revision: {
    revisionNo: number;
    proposedQuantityTotal: unknown;
    projectedAmountTotal: unknown;
    lines: Array<{
      proposedQuantity: unknown;
      projectedAmount: unknown;
      inputMode: string;
    }>;
  } | undefined,
  revisionNo: number,
  quantity: number,
  amount: number,
) {
  assert(revision, `R${revisionNo} bulunamadı.`);
  assert(revision.revisionNo === revisionNo, `R${revisionNo} sırası uyuşmuyor.`);
  assert(revision.lines.length === 1, `R${revisionNo} tek normalize satır taşımalıdır.`);
  assert(revision.lines[0]?.inputMode === "DIRECT", `R${revisionNo} doğrudan miktar girişi olmalıdır.`);
  assertNumber(revision.proposedQuantityTotal, quantity, `R${revisionNo} toplam miktarı`);
  assertNumber(revision.projectedAmountTotal, amount, `R${revisionNo} toplam tutarı`);
  assertNumber(revision.lines[0]?.proposedQuantity, quantity, `R${revisionNo} satır miktarı`);
  assertNumber(revision.lines[0]?.projectedAmount, amount, `R${revisionNo} satır tutarı`);
}

function assertNumber(value: unknown, expected: number, label: string) {
  assert(Number(value) === expected, `${label} ${expected} olmalıdır; alınan ${Number(value)}.`);
}

function containsFreeText(metadata: unknown) {
  const serialized = JSON.stringify(metadata).toLocaleLowerCase("tr-TR");
  return [
    "gerçek veri",
    "karşılaştırma klonu",
    "accounting kabulü",
    "snapshot klonu",
    "izole kabul",
  ].some((value) => serialized.includes(value.toLocaleLowerCase("tr-TR")));
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
