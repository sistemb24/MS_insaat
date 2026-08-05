import "dotenv/config";

import { randomUUID } from "node:crypto";

import {
  calculateConstructionItemSnapshot,
  calculateConstructionPaymentTotals,
  buildConstructionPaymentId,
} from "../src/lib/construction-progress-payment-service";
import {
  parseConstructionMeasurementImportCsv,
} from "../src/lib/construction-measurement-import";
import { createConstructionMeasurementImportPrismaRepository } from "../src/lib/construction-measurement-import-prisma-repository";
import { prisma } from "../src/lib/prisma";
import { defaultTenantScope } from "../src/lib/tenant-scope";

const scope = defaultTenantScope;
const persistedScope = {
  tenantId: scope.tenantId,
  companyId: scope.companyId,
  periodId: scope.periodId,
};
const projectCode = "F12-KABUL-20260728";
const sourceDocumentNo = "F12-HAK-001";
const itemCode = "F12-POZ-01";

async function main() {
  const fixture = await ensureFixture();
  const repository = createConstructionMeasurementImportPrismaRepository(prisma);

  const validParseResult = parseConstructionMeasurementImportCsv({
    bytes: new TextEncoder().encode([
      "poz;miktar;aciklama;birim",
      `${itemCode};2.5;F12 geçerli CSV kabul satırı;m3`,
    ].join("\n")),
    fileName: "f12-gecerli-kabul.csv",
    contentType: "text/csv",
    contractItems: [fixture.contractItem],
  });
  assert(validParseResult.canValidate, "Geçerli F12 CSV doğrulanabilir olmalıdır.");

  const created = await repository.createBatch({
    scope,
    projectId: fixture.projectId,
    sourceProgressPaymentId: fixture.sourceProgressPaymentId,
    parseResult: validParseResult,
    nowIso: new Date().toISOString(),
  });
  const createRetry = await repository.createBatch({
    scope,
    projectId: fixture.projectId,
    sourceProgressPaymentId: fixture.sourceProgressPaymentId,
    parseResult: validParseResult,
    nowIso: new Date().toISOString(),
  });
  assert(
    createRetry.kind === "idempotent" && createRetry.batch.id === created.batch.id,
    "Aynı F12 dosyası yeniden yüklendiğinde tek batch'e dönmelidir.",
  );
  let validBatch = created.batch;
  if (validBatch.status === "DRAFT") {
    validBatch = (await repository.validateBatch({
      scope,
      batchId: validBatch.id,
      nowIso: new Date().toISOString(),
    })).batch;
  }
  if (validBatch.status === "VALIDATED") {
    validBatch = (await repository.applyBatch({
      scope,
      batchId: validBatch.id,
      nowIso: new Date().toISOString(),
    })).batch;
  }
  assert(validBatch.status === "APPLIED", "Geçerli F12 batch uygulanmış olmalıdır.");

  const idempotentRetry = await repository.applyBatch({
    scope,
    batchId: validBatch.id,
    nowIso: new Date().toISOString(),
  });
  assert(
    idempotentRetry.kind === "idempotent" && idempotentRetry.batch.id === validBatch.id,
    "Uygulanmış F12 batch retry işlemi idempotent olmalıdır.",
  );

  const invalidParseResult = parseConstructionMeasurementImportCsv({
    bytes: new TextEncoder().encode([
      "poz;miktar;aciklama;birim",
      "F12-BILINMEYEN-POZ;9;Hatalı kabul satırı;m3",
    ].join("\n")),
    fileName: "f12-hatali-kabul.csv",
    contentType: "text/csv",
    contractItems: [fixture.contractItem],
  });
  assert(!invalidParseResult.canValidate, "Hatalı F12 CSV doğrulanabilir olmamalıdır.");
  const invalidCreated = await repository.createBatch({
    scope,
    projectId: fixture.projectId,
    sourceProgressPaymentId: fixture.sourceProgressPaymentId,
    parseResult: invalidParseResult,
    nowIso: new Date().toISOString(),
  });
  const invalidBatch = invalidCreated.batch;
  assert(invalidBatch.status === "DRAFT", "Hatalı F12 batch taslak kalmalıdır.");
  assert(invalidBatch.errorRowCount === 1, "Hatalı F12 batch tek hata satırı taşımalıdır.");

  let invalidValidationRejected = false;
  try {
    await repository.validateBatch({
      scope,
      batchId: invalidBatch.id,
      nowIso: new Date().toISOString(),
    });
  } catch {
    invalidValidationRejected = true;
  }
  assert(invalidValidationRejected, "Hatalı F12 batch doğrulamada reddedilmelidir.");

  console.log(JSON.stringify({
    ok: true,
    projectCode,
    sourceDocumentNo,
    validBatch: { id: validBatch.id, status: validBatch.status, targetSheetId: validBatch.targetSheetId },
    invalidBatch: { id: invalidBatch.id, status: invalidBatch.status, errorRowCount: invalidBatch.errorRowCount },
    idempotency: {
      createKind: created.kind,
      createRetryKind: createRetry.kind,
      applyRetryKind: idempotentRetry.kind,
    },
  }, null, 2));
}

async function ensureFixture() {
  const existing = await prisma.constructionProject.findFirst({
    where: { ...persistedScope, code: projectCode },
    include: {
      contractItems: { where: { itemCode, isActive: true } },
      progressPayments: { where: { documentNo: sourceDocumentNo } },
    },
  });
  if (existing) {
    const item = existing.contractItems[0];
    const payment = existing.progressPayments[0];
    assert(item, "F12 kabul projesinde aktif sözleşme pozu bulunmalıdır.");
    assert(payment, "F12 kabul kaynak hakedişi bulunmalıdır.");
    assert(existing.status === "OPEN", "F12 kabul projesi açık kalmalıdır.");
    assert(payment.status === "DRAFT", "F12 kabul kaynak hakedişi taslak kalmalıdır.");
    return {
      projectId: existing.id,
      sourceProgressPaymentId: payment.id,
      contractItem: { id: item.id, itemCode: item.itemCode, unit: item.unit, isActive: item.isActive },
    };
  }

  return prisma.$transaction(async (transaction) => {
    const project = await transaction.constructionProject.create({
      data: {
        ...persistedScope,
        code: projectCode,
        name: "F12 Kalıcı Metraj Import Kabulü",
        siteCode: "F12-KABUL",
        siteName: "İzole Kabul Şantiyesi",
        contractNo: "F12-CSV-KABUL",
        contractAmount: 100_000,
        paymentType: "Taşeron Hakedişi",
        counterpartyCode: "F12-DEMO",
        counterpartyName: "F12 İzole Kabul",
        retentionRate: 0,
        createdBy: scope.userId,
        updatedBy: scope.userId,
      },
    });
    const contractItem = await transaction.constructionContractItem.create({
      data: {
        ...persistedScope,
        projectId: project.id,
        itemCode,
        description: "F12 CSV kabul metraj pozu",
        unit: "m3",
        contractQuantity: 100,
        unitPrice: 1_000,
        vatRate: 20,
        createdBy: scope.userId,
        updatedBy: scope.userId,
      },
    });
    const initialSnapshot = calculateConstructionItemSnapshot(
      {
        id: contractItem.id,
        contractQuantity: Number(contractItem.contractQuantity),
        unitPrice: Number(contractItem.unitPrice),
        vatRate: Number(contractItem.vatRate),
      },
      [{ contractItemId: contractItem.id, quantity: 1 }],
    );
    const totals = calculateConstructionPaymentTotals([initialSnapshot]);
    const paymentId = buildConstructionPaymentId(scope, project.id, 1);
    const sheetId = randomUUID();
    const payment = await transaction.constructionProgressPayment.create({
      data: {
        id: paymentId,
        ...persistedScope,
        projectId: project.id,
        sequenceNo: 1,
        kind: "FIRST",
        status: "DRAFT",
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T00:00:00.000Z"),
        documentNo: sourceDocumentNo,
        description: "F12 izole gerçek veri kabul kaynağı",
        periodGrossTotal: totals.periodGrossTotal,
        periodVatTotal: totals.periodVatTotal,
        periodNetTotal: totals.periodNetTotal,
        cumulativeGrossTotal: totals.cumulativeGrossTotal,
        cumulativeVatTotal: totals.cumulativeVatTotal,
        cumulativeNetTotal: totals.cumulativeNetTotal,
        createdBy: scope.userId,
        updatedBy: scope.userId,
        measurementSheets: {
          create: {
            id: sheetId,
            ...persistedScope,
            sheetNo: "GEN-1",
            sheetType: "GENERAL",
            title: "F12 Başlangıç Genel Metraj",
            status: "DRAFT",
            createdBy: scope.userId,
            updatedBy: scope.userId,
          },
        },
        measurementLines: {
          create: {
            ...persistedScope,
            measurementSheetId: sheetId,
            contractItemId: contractItem.id,
            lineNo: 1,
            measurementType: "GENERAL",
            description: "F12 başlangıç metrajı",
            unit: contractItem.unit,
            quantity: 1,
            createdBy: scope.userId,
            updatedBy: scope.userId,
          },
        },
        snapshots: {
          create: {
            ...persistedScope,
            contractItemId: contractItem.id,
            previousQuantity: initialSnapshot.previousQuantity,
            periodQuantity: initialSnapshot.periodQuantity,
            cumulativeQuantity: initialSnapshot.cumulativeQuantity,
            unitPrice: initialSnapshot.unitPrice,
            vatRate: initialSnapshot.vatRate,
            previousAmount: initialSnapshot.previousAmount,
            periodAmount: initialSnapshot.periodAmount,
            cumulativeAmount: initialSnapshot.cumulativeAmount,
            previousVatAmount: initialSnapshot.previousVatAmount,
            periodVatAmount: initialSnapshot.periodVatAmount,
            cumulativeVatAmount: initialSnapshot.cumulativeVatAmount,
            contractQuantity: initialSnapshot.contractQuantity,
            exceededContract: initialSnapshot.exceededContract,
          },
        },
      },
    });
    return {
      projectId: project.id,
      sourceProgressPaymentId: payment.id,
      contractItem: { id: contractItem.id, itemCode: contractItem.itemCode, unit: contractItem.unit, isActive: contractItem.isActive },
    };
  });
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
