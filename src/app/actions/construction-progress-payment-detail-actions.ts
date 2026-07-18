"use server";
/* eslint-disable @typescript-eslint/no-explicit-any -- scoped Prisma transaction helper */

import { revalidatePath } from "next/cache";

import {
  aggregateConstructionMeasurementQuantities,
  calculateConstructionItemSnapshot,
  calculateConstructionMeasurementLineQuantity,
  calculateConstructionPaymentTotals,
  calculateConstructionSupplementarySummary,
  roundMoney,
  type ConstructionItemSnapshot,
  type ConstructionPreviousSnapshot,
} from "@/lib/construction-progress-payment-service";
import { buildConstructionProgressPaymentProjectionDraft } from "@/lib/construction-progress-payment-projection";
import { calculateProgressPaymentTotals } from "@/lib/progress-payment-service";
import { prisma } from "@/lib/prisma";
import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

async function context() { return getSubscriptionFeatureActionContext("progress-payments"); }

export async function listConstructionProgressPaymentDetailsAction(id: string) {
  const result = await context();
  if (!result.ok) return result.result;
  const payment = await prisma.constructionProgressPayment.findFirst({
    where: { id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId },
    include: { measurementSheets: { include: { lines: { include: { contractItem: { select: { itemCode: true, description: true, unit: true } } }, orderBy: { lineNo: "asc" } } }, orderBy: { sheetNo: "asc" } }, extraWorks: { orderBy: [{ workDate: "asc" }, { documentNo: "asc" }] }, deductionMovements: { orderBy: { movementDate: "asc" } }, financialMovements: { orderBy: { movementDate: "asc" } } },
  });
  if (!payment) return { ok: false as const, errors: ["Kümülatif hakediş bulunamadı."] };
  return { ok: true as const, data: {
    summary: { periodExtraWorkTotal: Number(payment.periodExtraWorkTotal), periodAdditionTotal: Number(payment.periodAdditionTotal), periodDeductionTotal: Number(payment.periodDeductionTotal), periodPayableTotal: Number(payment.periodPayableTotal), cumulativeExtraWorkTotal: Number(payment.cumulativeExtraWorkTotal), cumulativeAdditionTotal: Number(payment.cumulativeAdditionTotal), cumulativeDeductionTotal: Number(payment.cumulativeDeductionTotal), cumulativePayableTotal: Number(payment.cumulativePayableTotal) },
    measurementSheets: payment.measurementSheets.map((row) => ({ id: row.id, sheetNo: row.sheetNo, sheetType: row.sheetType, title: row.title, status: row.status, lines: row.lines.map((line) => ({ id: line.id, lineNo: line.lineNo, contractItemId: line.contractItemId, itemCode: line.contractItem.itemCode, itemDescription: line.contractItem.description, description: line.description, unit: line.unit || line.contractItem.unit, quantity: Number(line.quantity), length: line.length === null ? null : Number(line.length), width: line.width === null ? null : Number(line.width), height: line.height === null ? null : Number(line.height), multiplier: Number(line.multiplier) })) })),
    extraWorks: payment.extraWorks.map((row) => ({ id: row.id, documentNo: row.documentNo, workDate: row.workDate.toISOString(), description: row.description, unit: row.unit, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), vatRate: Number(row.vatRate), periodAmount: Number(row.periodAmount), status: row.status })),
    deductions: payment.deductionMovements.map((row) => ({ id: row.id, category: row.category, documentNo: row.documentNo, movementDate: row.movementDate.toISOString(), description: row.description, amount: Number(row.amount), vatAmount: Number(row.vatAmount), totalAmount: Number(row.totalAmount) })),
    financialMovements: payment.financialMovements.map((row) => ({ id: row.id, movementType: row.movementType, direction: row.direction, movementDate: row.movementDate.toISOString(), description: row.description, amount: Number(row.amount) })),
  } };
}

export async function getConstructionProgressPaymentReportAction(id: string) {
  const result = await context();
  if (!result.ok) return result.result;
  const payment = await prisma.constructionProgressPayment.findFirst({
    where: { id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId },
    include: { project: true, snapshots: { include: { contractItem: true }, orderBy: { contractItem: { itemCode: "asc" } } }, extraWorks: { orderBy: [{ workDate: "asc" }, { documentNo: "asc" }] }, deductionMovements: { orderBy: { movementDate: "asc" } }, financialMovements: { orderBy: { movementDate: "asc" } }, measurementSheets: { include: { lines: { include: { contractItem: { select: { itemCode: true, description: true } } }, orderBy: { lineNo: "asc" } } }, orderBy: { sheetNo: "asc" } }, approvals: { orderBy: { createdAt: "asc" } }, accountingLink: true },
  });
  if (!payment) return { ok: false as const, errors: ["Kümülatif hakediş bulunamadı."] };
  const financialDraft = buildConstructionProgressPaymentProjectionDraft(payment);
  const financialTotals = financialDraft.lines.length ? calculateProgressPaymentTotals(financialDraft) : { grossTotal: 0, retentionTotal: 0, netTotal: 0, vatTotal: 0, grandTotal: 0, lines: [] };
  const [ledger, auditLogs] = await Promise.all([
    payment.accountingLink ? prisma.ledgerEntry.findFirst({ where: { tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, sourceType: "progress-payment", sourceId: payment.accountingLink.progressPaymentId }, select: { id: true, documentNo: true, status: true } }) : Promise.resolve(null),
    prisma.auditLog.findMany({ where: { tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, entityType: "construction-progress-payment", entityId: payment.id }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { ok: true as const, data: {
    header: { projectCode: payment.project.code, projectName: payment.project.name, siteName: payment.project.siteName, contractNo: payment.project.contractNo, documentNo: payment.documentNo, sequenceNo: payment.sequenceNo, kind: payment.kind, status: payment.status, periodStart: payment.periodStart.toISOString(), periodEnd: payment.periodEnd.toISOString(), currency: payment.currency },
    greenBook: payment.snapshots.map((snapshot) => ({ itemCode: snapshot.contractItem.itemCode, description: snapshot.contractItem.description, unit: snapshot.contractItem.unit, contractQuantity: Number(snapshot.contractQuantity), previousQuantity: Number(snapshot.previousQuantity), periodQuantity: Number(snapshot.periodQuantity), cumulativeQuantity: Number(snapshot.cumulativeQuantity), completionRate: Number(snapshot.contractQuantity) ? roundMoney(Number(snapshot.cumulativeQuantity) / Number(snapshot.contractQuantity) * 100) : 0, exceededContract: snapshot.exceededContract })),
    manufacturingSheet: payment.snapshots.map((snapshot) => ({ itemCode: snapshot.contractItem.itemCode, description: snapshot.contractItem.description, unit: snapshot.contractItem.unit, unitPrice: Number(snapshot.unitPrice), vatRate: Number(snapshot.vatRate), contractQuantity: Number(snapshot.contractQuantity), contractAmount: roundMoney(Number(snapshot.contractQuantity) * Number(snapshot.unitPrice)), previousQuantity: Number(snapshot.previousQuantity), periodQuantity: Number(snapshot.periodQuantity), cumulativeQuantity: Number(snapshot.cumulativeQuantity), previousAmount: Number(snapshot.previousAmount), periodAmount: Number(snapshot.periodAmount), cumulativeAmount: Number(snapshot.cumulativeAmount), periodVatAmount: Number(snapshot.periodVatAmount), cumulativeVatAmount: Number(snapshot.cumulativeVatAmount) })),
    extraWorks: payment.extraWorks.map((row) => ({ documentNo: row.documentNo, workDate: row.workDate.toISOString(), description: row.description, unit: row.unit, quantity: Number(row.quantity), unitPrice: Number(row.unitPrice), vatRate: Number(row.vatRate), amount: Number(row.periodAmount) })),
    deductions: payment.deductionMovements.map((row) => ({ category: row.category, documentNo: row.documentNo, movementDate: row.movementDate.toISOString(), description: row.description, amount: Number(row.amount), vatAmount: Number(row.vatAmount), totalAmount: Number(row.totalAmount) })),
    financialMovements: payment.financialMovements.map((row) => ({ movementType: row.movementType, direction: row.direction, movementDate: row.movementDate.toISOString(), description: row.description, amount: Number(row.amount) })),
    summary: { periodWorkTotal: Number(payment.periodGrossTotal), periodWorkVatTotal: Number(payment.periodVatTotal), periodExtraWorkTotal: Number(payment.periodExtraWorkTotal), periodAdditionTotal: Number(payment.periodAdditionTotal), periodDeductionTotal: Number(payment.periodDeductionTotal), periodPayableTotal: Number(payment.periodPayableTotal), cumulativeWorkTotal: Number(payment.cumulativeGrossTotal), cumulativeWorkVatTotal: Number(payment.cumulativeVatTotal), cumulativeExtraWorkTotal: Number(payment.cumulativeExtraWorkTotal), cumulativeAdditionTotal: Number(payment.cumulativeAdditionTotal), cumulativeDeductionTotal: Number(payment.cumulativeDeductionTotal), cumulativePayableTotal: Number(payment.cumulativePayableTotal), projectedGrossTotal: financialTotals.grossTotal, projectedRetentionTotal: financialTotals.retentionTotal, projectedNetTotal: financialTotals.netTotal, projectedVatTotal: financialTotals.vatTotal, projectedGrandTotal: financialTotals.grandTotal },
    measurementSheets: payment.measurementSheets.map((row) => ({ sheetNo: row.sheetNo, sheetType: row.sheetType, title: row.title, status: row.status, lineCount: row.lines.length, lines: row.lines.map((line) => ({ lineNo: line.lineNo, itemCode: line.contractItem.itemCode, itemDescription: line.contractItem.description, description: line.description, unit: line.unit, quantity: Number(line.quantity), length: line.length === null ? null : Number(line.length), width: line.width === null ? null : Number(line.width), height: line.height === null ? null : Number(line.height), multiplier: Number(line.multiplier) })) })),
    approvals: payment.approvals.map((row) => ({ statusFrom: row.statusFrom, statusTo: row.statusTo, actorUserId: row.actorUserId, reason: row.reason, createdAt: row.createdAt.toISOString() })),
    auditLogs: auditLogs.map((row) => ({ id: row.id, action: row.action, actorUserId: row.actorUserId, metadata: row.metadata, occurredAt: row.occurredAt.toISOString() })),
    accounting: payment.accountingLink ? { progressPaymentId: payment.accountingLink.progressPaymentId, ledgerEntryId: ledger?.id ?? null, ledgerDocumentNo: ledger?.documentNo ?? null, ledgerStatus: ledger?.status ?? null } : null,
  } };
}

export async function createConstructionMeasurementSheetAction(input: { progressPaymentId: string; sheetNo: string; sheetType: "GENERAL" | "REBAR"; title: string }) {
  const resolved = await editablePayment(input.progressPaymentId);
  if (!resolved.ok) return resolved.result;
  if (!input.sheetNo.trim() || !input.title.trim()) return { ok: false as const, errors: ["Metraj föyü numarası ve başlığı zorunludur."] };
  const row = await prisma.$transaction(async (transaction) => {
    const created = await transaction.constructionMeasurementSheet.create({ data: { tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId, progressPaymentId: resolved.payment.id, sheetNo: input.sheetNo.trim(), sheetType: input.sheetType, title: input.title.trim(), createdBy: resolved.scope.userId, updatedBy: resolved.scope.userId } });
    await transaction.constructionProgressPayment.update({ where: { id: resolved.payment.id }, data: { updatedBy: resolved.scope.userId } });
    return created;
  });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id } };
}

export async function createConstructionMeasurementLineAction(input: { progressPaymentId: string; measurementSheetId: string; contractItemId: string; description: string; unit?: string; quantity?: number; length?: number; width?: number; height?: number; multiplier?: number }) {
  const resolved = await editablePayment(input.progressPaymentId);
  if (!resolved.ok) return resolved.result;
  const [sheet, contractItem] = await Promise.all([
    prisma.constructionMeasurementSheet.findFirst({ where: { id: input.measurementSheetId, progressPaymentId: resolved.payment.id, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId } }),
    prisma.constructionContractItem.findFirst({ where: { id: input.contractItemId, projectId: resolved.payment.projectId, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId, isActive: true } }),
  ]);
  if (!sheet || !contractItem) return { ok: false as const, errors: ["Metraj föyü veya sözleşme pozu aktif kapsamda bulunamadı."] };
  const dimensions = [input.length, input.width, input.height].filter((value): value is number => value !== undefined);
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0) || !Number.isFinite(input.multiplier ?? 1) || (input.multiplier ?? 1) <= 0) return { ok: false as const, errors: ["Ölçü değerleri ve çarpan sıfırdan büyük olmalıdır."] };
  const quantity = calculateConstructionMeasurementLineQuantity({ quantity: input.quantity ?? 0, length: input.length, width: input.width, height: input.height, multiplier: input.multiplier });
  if (!quantity || !Number.isFinite(quantity) || !input.description.trim()) return { ok: false as const, errors: ["Metraj açıklaması ile sıfırdan farklı doğrudan miktar veya geçerli ölçüler zorunludur."] };
  const row = await prisma.$transaction(async (transaction) => {
    const aggregate = await transaction.constructionMeasurementLine.aggregate({ where: { progressPaymentId: resolved.payment.id, measurementSheetId: sheet.id }, _max: { lineNo: true } });
    const created = await transaction.constructionMeasurementLine.create({ data: { tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId, progressPaymentId: resolved.payment.id, measurementSheetId: sheet.id, contractItemId: contractItem.id, lineNo: (aggregate._max.lineNo ?? 0) + 1, measurementType: sheet.sheetType, description: input.description.trim(), unit: input.unit?.trim() || contractItem.unit, quantity, length: input.length, width: input.width, height: input.height, multiplier: input.multiplier ?? 1, createdBy: resolved.scope.userId, updatedBy: resolved.scope.userId } });
    await recalculateMeasurementSnapshots(transaction, resolved.payment.id, resolved.scope);
    return created;
  });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id, lineNo: row.lineNo, quantity } };
}

export async function createConstructionExtraWorkAction(input: { progressPaymentId: string; documentNo: string; workDate: string; description: string; unit: string; quantity: number; unitPrice: number; vatRate?: number }) {
  const resolved = await editablePayment(input.progressPaymentId);
  if (!resolved.ok) return resolved.result;
  if (!input.documentNo.trim() || !input.description.trim() || !input.unit.trim() || !(input.quantity > 0) || input.unitPrice < 0) return { ok: false as const, errors: ["Tutanak no, açıklama, birim, pozitif miktar ve geçerli birim fiyat zorunludur."] };
  const workDate = new Date(input.workDate); if (Number.isNaN(workDate.getTime())) return { ok: false as const, errors: ["Tutanak tarihi geçersizdir."] };
  const amount = roundMoney(input.quantity * input.unitPrice);
  const row = await prisma.$transaction(async (transaction) => {
    const created = await transaction.constructionExtraWork.create({ data: { tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId, progressPaymentId: resolved.payment.id, documentNo: input.documentNo.trim(), workDate, description: input.description.trim(), unit: input.unit.trim(), quantity: input.quantity, unitPrice: input.unitPrice, vatRate: input.vatRate ?? 0, periodAmount: amount, createdBy: resolved.scope.userId, updatedBy: resolved.scope.userId } });
    await recalculateSummary(transaction, resolved.payment.id, resolved.scope);
    return created;
  });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id } };
}

export async function createConstructionDeductionMovementAction(input: { progressPaymentId: string; category: string; documentNo?: string; movementDate: string; description: string; amount: number; vatAmount?: number }) {
  const resolved = await editablePayment(input.progressPaymentId);
  if (!resolved.ok) return resolved.result;
  if (!input.category.trim() || !input.description.trim() || input.amount < 0 || (input.vatAmount ?? 0) < 0) return { ok: false as const, errors: ["Kesinti kategorisi, açıklaması ve negatif olmayan tutarlar zorunludur."] };
  const movementDate = new Date(input.movementDate); if (Number.isNaN(movementDate.getTime())) return { ok: false as const, errors: ["Kesinti tarihi geçersizdir."] };
  const totalAmount = roundMoney(input.amount + (input.vatAmount ?? 0));
  const row = await prisma.$transaction(async (transaction) => {
    const created = await transaction.constructionDeductionMovement.create({ data: { tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId, progressPaymentId: resolved.payment.id, category: input.category.trim(), documentNo: input.documentNo?.trim() || null, movementDate, description: input.description.trim(), amount: input.amount, vatAmount: input.vatAmount ?? 0, totalAmount, createdBy: resolved.scope.userId, updatedBy: resolved.scope.userId } });
    await recalculateSummary(transaction, resolved.payment.id, resolved.scope);
    return created;
  });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id } };
}

export async function createConstructionFinancialMovementAction(input: { progressPaymentId: string; movementType: "ADVANCE" | "RETENTION" | "WITHHOLDING" | "TAX_WITHHOLDING" | "RESERVE" | "PRICE_DIFFERENCE"; direction: "ADDITION" | "DEDUCTION"; movementDate: string; description: string; amount: number }) {
  const resolved = await editablePayment(input.progressPaymentId);
  if (!resolved.ok) return resolved.result;
  if (!input.description.trim() || !(input.amount > 0)) return { ok: false as const, errors: ["Finansal hareket açıklaması ve pozitif tutarı zorunludur."] };
  const movementDate = new Date(input.movementDate); if (Number.isNaN(movementDate.getTime())) return { ok: false as const, errors: ["Finansal hareket tarihi geçersizdir."] };
  const row = await prisma.$transaction(async (transaction) => {
    const created = await transaction.constructionFinancialMovement.create({ data: { tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId, progressPaymentId: resolved.payment.id, movementType: input.movementType, direction: input.direction, movementDate, description: input.description.trim(), amount: input.amount, createdBy: resolved.scope.userId, updatedBy: resolved.scope.userId } });
    await recalculateSummary(transaction, resolved.payment.id, resolved.scope);
    return created;
  });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id } };
}

export async function createConstructionContractItemPriceRevisionAction(input: { contractItemId: string; effectiveFrom: string; unitPrice: number; reason: string }) {
  const result = await context();
  if (!result.ok) return result.result;
  if (!["admin", "accounting"].includes(result.scope.userRole)) return { ok: false as const, errors: ["Birim fiyat revizyonu için muhasebe yetkisi gereklidir."] };
  const item = await prisma.constructionContractItem.findFirst({ where: { id: input.contractItemId, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, include: { project: { include: { progressPayments: { where: { status: { in: ["DRAFT", "SUBMITTED", "RETURNED"] } }, take: 1 } } } } });
  if (!item) return { ok: false as const, errors: ["Sözleşme pozu bulunamadı."] };
  if (item.project.status !== "OPEN") return { ok: false as const, errors: ["Kapalı projede birim fiyat revizyonu yapılamaz."] };
  if (item.project.progressPayments.length) return { ok: false as const, errors: ["Aktif hakediş varken birim fiyat revizyonu yapılamaz; taslağı tamamlayın veya iptal edin."] };
  const effectiveFrom = new Date(input.effectiveFrom);
  if (Number.isNaN(effectiveFrom.getTime()) || input.unitPrice < 0 || !input.reason.trim()) return { ok: false as const, errors: ["Geçerli tarih, negatif olmayan fiyat ve revizyon gerekçesi zorunludur."] };
  const revisionNo = item.revisionNo + 1;
  const row = await prisma.$transaction(async (transaction) => {
    const revision = await transaction.constructionContractItemPriceRevision.create({ data: { tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, contractItemId: item.id, revisionNo, effectiveFrom, unitPrice: input.unitPrice, reason: input.reason.trim(), createdBy: result.scope.userId } });
    await transaction.constructionContractItem.update({ where: { id: item.id }, data: { unitPrice: input.unitPrice, revisionNo, updatedBy: result.scope.userId } });
    return revision;
  });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id, revisionNo } };
}

export async function deleteConstructionProgressPaymentDetailAction(input: { progressPaymentId: string; detailId: string; detailType: "MEASUREMENT_SHEET" | "MEASUREMENT_LINE" | "EXTRA_WORK" | "DEDUCTION" | "FINANCIAL_MOVEMENT" }) {
  const resolved = await editablePayment(input.progressPaymentId);
  if (!resolved.ok) return resolved.result;
  if (input.detailType === "MEASUREMENT_SHEET") {
    const sheet = await prisma.constructionMeasurementSheet.findFirst({ where: { id: input.detailId, progressPaymentId: resolved.payment.id, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId }, select: { sheetNo: true } });
    if (sheet?.sheetNo === "GEN-1") return { ok: false as const, errors: ["Ana genel metraj föyü silinemez; satırları ayrı ayrı düzenleyin."] };
  }
  const deleted = await prisma.$transaction(async (transaction) => {
    let count = 0;
    if (input.detailType === "MEASUREMENT_SHEET") count = (await transaction.constructionMeasurementSheet.deleteMany({ where: { id: input.detailId, progressPaymentId: resolved.payment.id, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId } })).count;
    if (input.detailType === "MEASUREMENT_LINE") count = (await transaction.constructionMeasurementLine.deleteMany({ where: { id: input.detailId, progressPaymentId: resolved.payment.id, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId } })).count;
    if (input.detailType === "EXTRA_WORK") count = (await transaction.constructionExtraWork.deleteMany({ where: { id: input.detailId, progressPaymentId: resolved.payment.id, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId } })).count;
    if (input.detailType === "DEDUCTION") count = (await transaction.constructionDeductionMovement.deleteMany({ where: { id: input.detailId, progressPaymentId: resolved.payment.id, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId } })).count;
    if (input.detailType === "FINANCIAL_MOVEMENT") count = (await transaction.constructionFinancialMovement.deleteMany({ where: { id: input.detailId, progressPaymentId: resolved.payment.id, tenantId: resolved.scope.tenantId, companyId: resolved.scope.companyId, periodId: resolved.scope.periodId } })).count;
    if (count && ["MEASUREMENT_SHEET", "MEASUREMENT_LINE"].includes(input.detailType)) await recalculateMeasurementSnapshots(transaction, resolved.payment.id, resolved.scope);
    else if (count) await recalculateSummary(transaction, resolved.payment.id, resolved.scope);
    return count;
  });
  if (!deleted) return { ok: false as const, errors: ["Silinecek hakediş detayı aktif kapsamda bulunamadı."] };
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: input.detailId } };
}

async function editablePayment(id: string) {
  const result = await context();
  if (!result.ok) return { ok: false as const, result: result.result };
  if (!["admin", "accounting"].includes(result.scope.userRole)) return { ok: false as const, result: { ok: false as const, errors: ["Hakediş işlemi için muhasebe yetkisi gereklidir."] } };
  const payment = await prisma.constructionProgressPayment.findFirst({ where: { id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId } });
  if (!payment) return { ok: false as const, result: { ok: false as const, errors: ["Kümülatif hakediş bulunamadı."] } };
  if (!["DRAFT", "RETURNED"].includes(payment.status)) return { ok: false as const, result: { ok: false as const, errors: ["Yalnız taslak veya iade edilmiş hakedişe detay hareketi eklenebilir."] } };
  return { ok: true as const, payment, scope: result.scope };
}

async function recalculateSummary(transaction: any, paymentId: string, scope: { tenantId: string; companyId: string; periodId: string }) {
  const payment = await transaction.constructionProgressPayment.findFirst({ where: { id: paymentId, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }, include: { project: true, previousProgressPayment: true, extraWorks: true, deductionMovements: true, financialMovements: true } });
  if (!payment) throw new Error("Kümülatif hakediş bulunamadı.");
  const extraAmount = payment.extraWorks.reduce((sum: number, row: any) => sum + Number(row.periodAmount), 0); const additionAmount = payment.financialMovements.filter((row: any) => row.direction === "ADDITION").reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  const summary = calculateConstructionSupplementarySummary({ periodBaseTotal: Number(payment.periodNetTotal), automaticDeductionAmount: roundMoney((Number(payment.periodNetTotal) + extraAmount + additionAmount) * Number(payment.project.retentionRate) / 100), previous: payment.previousProgressPayment ? { cumulativeExtraWorkTotal: Number(payment.previousProgressPayment.cumulativeExtraWorkTotal), cumulativeAdditionTotal: Number(payment.previousProgressPayment.cumulativeAdditionTotal), cumulativeDeductionTotal: Number(payment.previousProgressPayment.cumulativeDeductionTotal), cumulativePayableTotal: Number(payment.previousProgressPayment.cumulativePayableTotal) } : undefined, extraWorks: payment.extraWorks.map((row: any) => ({ amount: Number(row.periodAmount) })), deductions: payment.deductionMovements.map((row: any) => ({ amount: Number(row.totalAmount) })), financialMovements: payment.financialMovements.map((row: any) => ({ amount: Number(row.amount), direction: row.direction })) });
  await transaction.constructionProgressPayment.update({ where: { id: payment.id }, data: summary });
}

async function recalculateMeasurementSnapshots(transaction: any, paymentId: string, scope: { tenantId: string; companyId: string; periodId: string; userId: string }) {
  const payment = await transaction.constructionProgressPayment.findFirst({ where: { id: paymentId, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }, include: { project: { include: { contractItems: { where: { isActive: true } } } }, previousProgressPayment: { include: { snapshots: true } }, measurementLines: true, extraWorks: true, deductionMovements: true, financialMovements: true } });
  if (!payment) throw new Error("Kümülatif hakediş bulunamadı.");
  const measurements = aggregateConstructionMeasurementQuantities(payment.measurementLines.map((line: any) => ({ contractItemId: line.contractItemId, quantity: Number(line.quantity) })));
  const previousByItem = new Map<string, ConstructionPreviousSnapshot>((payment.previousProgressPayment?.snapshots ?? []).map((snapshot: any) => [snapshot.contractItemId, { contractItemId: snapshot.contractItemId, cumulativeQuantity: Number(snapshot.cumulativeQuantity), cumulativeAmount: Number(snapshot.cumulativeAmount), cumulativeVatAmount: Number(snapshot.cumulativeVatAmount) }]));
  const snapshots: ConstructionItemSnapshot[] = payment.project.contractItems.map((item: any) => calculateConstructionItemSnapshot({ id: item.id, contractQuantity: Number(item.contractQuantity), unitPrice: Number(item.unitPrice), vatRate: Number(item.vatRate) }, measurements, previousByItem.get(item.id)));
  const totals = calculateConstructionPaymentTotals(snapshots);
  const extraAmount = payment.extraWorks.reduce((sum: number, row: any) => sum + Number(row.periodAmount), 0);
  const additionAmount = payment.financialMovements.filter((row: any) => row.direction === "ADDITION").reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  const supplementary = calculateConstructionSupplementarySummary({ periodBaseTotal: totals.periodNetTotal, automaticDeductionAmount: roundMoney((totals.periodNetTotal + extraAmount + additionAmount) * Number(payment.project.retentionRate) / 100), previous: payment.previousProgressPayment ? { cumulativeExtraWorkTotal: Number(payment.previousProgressPayment.cumulativeExtraWorkTotal), cumulativeAdditionTotal: Number(payment.previousProgressPayment.cumulativeAdditionTotal), cumulativeDeductionTotal: Number(payment.previousProgressPayment.cumulativeDeductionTotal), cumulativePayableTotal: Number(payment.previousProgressPayment.cumulativePayableTotal) } : undefined, extraWorks: payment.extraWorks.map((row: any) => ({ amount: Number(row.periodAmount) })), deductions: payment.deductionMovements.map((row: any) => ({ amount: Number(row.totalAmount) })), financialMovements: payment.financialMovements.map((row: any) => ({ amount: Number(row.amount), direction: row.direction })) });
  await transaction.constructionPaymentItemSnapshot.deleteMany({ where: { progressPaymentId: payment.id, tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId } });
  await transaction.constructionProgressPayment.update({ where: { id: payment.id }, data: { periodGrossTotal: totals.periodGrossTotal, periodVatTotal: totals.periodVatTotal, periodNetTotal: totals.periodNetTotal, cumulativeGrossTotal: totals.cumulativeGrossTotal, cumulativeVatTotal: totals.cumulativeVatTotal, cumulativeNetTotal: totals.cumulativeNetTotal, ...supplementary, updatedBy: scope.userId, snapshots: { create: snapshots.map((snapshot) => ({ tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, contractItemId: snapshot.contractItemId, previousQuantity: snapshot.previousQuantity, periodQuantity: snapshot.periodQuantity, cumulativeQuantity: snapshot.cumulativeQuantity, unitPrice: snapshot.unitPrice, vatRate: snapshot.vatRate, previousAmount: snapshot.previousAmount, periodAmount: snapshot.periodAmount, cumulativeAmount: snapshot.cumulativeAmount, previousVatAmount: snapshot.previousVatAmount, periodVatAmount: snapshot.periodVatAmount, cumulativeVatAmount: snapshot.cumulativeVatAmount, contractQuantity: snapshot.contractQuantity, exceededContract: snapshot.exceededContract })) } } });
}
