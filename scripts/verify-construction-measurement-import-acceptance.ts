import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const scope = {
  tenantId: "tenant-noa-demo",
  companyId: "company-demo-insaat",
  periodId: "period-2026",
};
const projectCode = "F12-KABUL-20260728";
const sourceDocumentNo = "F12-HAK-001";

async function main() {
  const project = await prisma.constructionProject.findFirst({
    where: { ...scope, code: projectCode },
    select: {
      id: true,
      status: true,
      progressPayments: {
        where: { documentNo: sourceDocumentNo },
        select: {
          id: true,
          status: true,
          snapshots: {
            select: { periodQuantity: true, cumulativeQuantity: true, periodAmount: true },
          },
          measurementSheets: { select: { id: true, sheetNo: true, title: true } },
          measurementLines: { select: { id: true, quantity: true } },
        },
      },
      measurementImportBatches: {
        orderBy: { batchNo: "asc" },
        select: {
          id: true,
          status: true,
          originalFileName: true,
          targetSheetId: true,
          errorRowCount: true,
          rows: { select: { status: true, errorCode: true, appliedMeasurementLineId: true } },
          events: { orderBy: { createdAt: "asc" }, select: { eventType: true, actorUserId: true, metadata: true } },
        },
      },
    },
  });
  assert(project, "F12 kabul projesi bulunamadı.");
  assert(project.status === "OPEN", "F12 kabul projesi açık kalmalıdır.");
  const source = project.progressPayments[0];
  assert(source, "F12 kabul kaynak hakedişi bulunamadı.");
  assert(source.status === "DRAFT", "F12 kabul kaynak hakedişi taslak kalmalıdır.");
  assert(source.snapshots.length === 1, "F12 kaynak hakedişi tek snapshot taşımalıdır.");
  assertNumber(source.snapshots[0]?.periodQuantity, 3.5, "F12 dönem metrajı");
  assertNumber(source.snapshots[0]?.cumulativeQuantity, 3.5, "F12 kümülatif metrajı");
  assertNumber(source.snapshots[0]?.periodAmount, 3_500, "F12 dönem tutarı");
  assert(source.measurementSheets.length === 2, "Geçerli import tek yeni metraj föyü oluşturmalıdır.");
  assert(source.measurementLines.length === 2, "Geçerli import tek yeni metraj satırı oluşturmalıdır.");

  assert(project.measurementImportBatches.length === 2, "F12 kabulünde iki batch bulunmalıdır.");
  const validBatch = project.measurementImportBatches.find((batch) => batch.status === "APPLIED");
  const invalidBatch = project.measurementImportBatches.find((batch) => batch.originalFileName === "f12-hatali-kabul.csv");
  assert(validBatch, "Geçerli F12 batch uygulanmış olmalıdır.");
  assert(validBatch.targetSheetId, "Geçerli F12 batch hedef föye bağlı olmalıdır.");
  assert(
    JSON.stringify(validBatch.events.map((event) => event.eventType)) === JSON.stringify(["CREATED", "VALIDATED", "APPLIED"]),
    "Geçerli F12 batch event sırası birer kez CREATED/VALIDATED/APPLIED olmalıdır.",
  );
  assert(validBatch.rows.length === 1 && validBatch.rows[0]?.appliedMeasurementLineId, "Geçerli F12 satırı tek metraj satırına bağlanmalıdır.");
  assert(invalidBatch, "Hatalı F12 batch bulunmalıdır.");
  assert(invalidBatch.status === "DRAFT", "Hatalı F12 batch taslak kalmalıdır.");
  assert(invalidBatch.errorRowCount === 1, "Hatalı F12 batch tek hata satırı taşımalıdır.");
  assert(invalidBatch.targetSheetId === null, "Hatalı F12 batch hedef föy oluşturmamalıdır.");
  assert(
    invalidBatch.rows.length === 1
      && invalidBatch.rows[0]?.status === "ERROR"
      && invalidBatch.rows[0]?.errorCode === "ITEM_NOT_FOUND"
      && invalidBatch.rows[0]?.appliedMeasurementLineId === null,
    "Hatalı F12 satırı metraj yazımı olmadan ITEM_NOT_FOUND olarak kalmalıdır.",
  );
  assert(
    JSON.stringify(invalidBatch.events.map((event) => event.eventType)) === JSON.stringify(["CREATED"]),
    "Hatalı F12 batch yalnız CREATED event'i taşımalıdır.",
  );

  const auditRows = await prisma.auditLog.findMany({
    where: {
      ...scope,
      entityType: "construction-measurement-import",
      entityId: { in: project.measurementImportBatches.map((batch) => batch.id) },
    },
    orderBy: [{ occurredAt: "asc" }, { action: "asc" }],
    select: { action: true, entityId: true, actorUserId: true, metadata: true },
  });
  assert(auditRows.length === 4, "F12 import merkezi audit sayısı dört olmalıdır.");
  assert(
    JSON.stringify(auditRows.map((row) => row.action).sort())
      === JSON.stringify([
        "CONSTRUCTION_MEASUREMENT_IMPORT_APPLIED",
        "CONSTRUCTION_MEASUREMENT_IMPORT_CREATED",
        "CONSTRUCTION_MEASUREMENT_IMPORT_CREATED",
        "CONSTRUCTION_MEASUREMENT_IMPORT_VALIDATED",
      ]),
    "F12 import audit aksiyonları eksik veya tekrarlıdır.",
  );
  assert(auditRows.every((row) => row.actorUserId === "user-main"), "F12 import audit aktörü accounting kullanıcısı olmalıdır.");
  assert(
    auditRows.every((row) => !containsSensitiveFileContent(row.metadata)),
    "F12 import audit metadata dosya adı, hash veya ham CSV taşımamalıdır.",
  );

  const [wrongCompanyCount, wrongPeriodCount, wrongProjectCount] = await Promise.all([
    prisma.constructionMeasurementImportBatch.count({
      where: { id: { in: project.measurementImportBatches.map((batch) => batch.id) }, companyId: "company-akdeniz-insaat" },
    }),
    prisma.constructionMeasurementImportBatch.count({
      where: { id: { in: project.measurementImportBatches.map((batch) => batch.id) }, periodId: "period-akdeniz-2026" },
    }),
    prisma.constructionMeasurementImportBatch.count({
      where: { id: { in: project.measurementImportBatches.map((batch) => batch.id) }, projectId: { not: project.id } },
    }),
  ]);
  assert(wrongCompanyCount === 0, "Cross-company import sızıntısı bulundu.");
  assert(wrongPeriodCount === 0, "Cross-period import sızıntısı bulundu.");
  assert(wrongProjectCount === 0, "Cross-project import sızıntısı bulundu.");

  console.log(JSON.stringify({
    ok: true,
    scope,
    project: { code: projectCode, status: project.status, sourceDocumentNo, sourceStatus: source.status },
    source: {
      snapshotCount: source.snapshots.length,
      measurementSheetCount: source.measurementSheets.length,
      measurementLineCount: source.measurementLines.length,
      periodQuantity: Number(source.snapshots[0]?.periodQuantity),
      periodAmount: Number(source.snapshots[0]?.periodAmount),
    },
    batches: project.measurementImportBatches.map((batch) => ({
      id: batch.id,
      status: batch.status,
      errorRowCount: batch.errorRowCount,
      eventTypes: batch.events.map((event) => event.eventType),
    })),
    audit: { count: auditRows.length, actions: auditRows.map((row) => row.action).sort() },
    isolation: { wrongCompanyCount, wrongPeriodCount, wrongProjectCount },
  }, null, 2));
}

function containsSensitiveFileContent(metadata: unknown) {
  const serialized = JSON.stringify(metadata).toLocaleLowerCase("tr-TR");
  return serialized.includes("f12-gecerli-kabul")
    || serialized.includes("f12-hatali-kabul")
    || /[a-f0-9]{64}/.test(serialized)
    || serialized.includes("f12 geçerli csv kabul satırı");
}

function assertNumber(value: unknown, expected: number, label: string) {
  assert(Number(value) === expected, `${label} ${expected} olmalıdır; alınan ${Number(value)}.`);
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
