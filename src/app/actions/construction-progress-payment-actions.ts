"use server";
/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma transaction payloads are intentionally narrowed at the action boundary. */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";
import {
  buildConstructionPaymentId,
  aggregateConstructionMeasurementQuantities,
  calculateConstructionItemSnapshot,
  calculateConstructionPaymentTotals,
  calculateConstructionSupplementarySummary,
  canTransitionConstructionPayment,
  reconcileConstructionPrimaryMeasurementQuantities,
  resolveConstructionLegacyAutomaticDeduction,
  roundMoney,
  validateConstructionPaymentChain,
  type ConstructionPaymentKind,
} from "@/lib/construction-progress-payment-service";
import { createConstructionProgressPaymentFinalizationPrismaAdapter } from "@/lib/construction-progress-payment-finalization-prisma-adapter";

const feature = "progress-payments" as const;
const finalizationAdapter = createConstructionProgressPaymentFinalizationPrismaAdapter(prisma);

async function context() {
  return getSubscriptionFeatureActionContext(feature);
}

export async function listConstructionProjectsAction() {
  const result = await context();
  if (!result.ok) return result.result;
  const rows = await prisma.constructionProject.findMany({
    where: { tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId },
    include: { contractItems: { where: { isActive: true }, include: { priceRevisions: { orderBy: { revisionNo: "desc" } } }, orderBy: { itemCode: "asc" } }, progressPayments: { orderBy: { sequenceNo: "asc" }, include: { snapshots: true, accountingLink: true } } },
    orderBy: { code: "asc" },
  });
  return { ok: true as const, data: { rows: rows.map((row) => ({
    id: row.id, code: row.code, name: row.name, siteCode: row.siteCode, siteName: row.siteName,
    contractNo: row.contractNo, contractAmount: Number(row.contractAmount), status: row.status,
    contractItems: row.contractItems.map((item) => ({ id: item.id, itemCode: item.itemCode, description: item.description, unit: item.unit, contractQuantity: Number(item.contractQuantity), unitPrice: Number(item.unitPrice), vatRate: Number(item.vatRate), revisionNo: item.revisionNo, priceRevisions: item.priceRevisions.map((revision) => ({ id: revision.id, revisionNo: revision.revisionNo, effectiveFrom: revision.effectiveFrom.toISOString(), unitPrice: Number(revision.unitPrice), reason: revision.reason, createdAt: revision.createdAt.toISOString() })) })),
    progressPayments: row.progressPayments.map((payment) => ({ id: payment.id, sequenceNo: payment.sequenceNo, kind: payment.kind, status: payment.status, documentNo: payment.documentNo, periodStart: payment.periodStart.toISOString(), periodEnd: payment.periodEnd.toISOString(), periodGrossTotal: Number(payment.periodGrossTotal), cumulativeGrossTotal: Number(payment.cumulativeGrossTotal), updatedAt: payment.updatedAt.toISOString(), progressPaymentId: payment.accountingLink?.progressPaymentId ?? null,
      snapshots: payment.snapshots.map((snapshot) => ({ contractItemId: snapshot.contractItemId, previousQuantity: Number(snapshot.previousQuantity), periodQuantity: Number(snapshot.periodQuantity), cumulativeQuantity: Number(snapshot.cumulativeQuantity), periodAmount: Number(snapshot.periodAmount), cumulativeAmount: Number(snapshot.cumulativeAmount), vatRate: Number(snapshot.vatRate), periodVatAmount: Number(snapshot.periodVatAmount), cumulativeVatAmount: Number(snapshot.cumulativeVatAmount), exceededContract: snapshot.exceededContract })) })),
  })) } };
}

export async function createConstructionProjectAction(input: {
  code: string; name: string; siteCode: string; siteName: string; contractNo?: string;
  contractAmount: number; counterpartyCode?: string; counterpartyName?: string;
  paymentType?: string; retentionRate?: number;
}) {
  const result = await context();
  if (!result.ok) return result.result;
  if (!["admin", "accounting"].includes(result.scope.userRole)) return { ok: false as const, errors: ["Hakediş işlemi için muhasebe yetkisi gereklidir."] };
  const code = input.code.trim();
  if (!code || !input.name.trim() || !input.siteCode.trim()) return { ok: false as const, errors: ["Proje kodu, adı ve şantiye kodu zorunludur."] };
  const row = await prisma.constructionProject.create({ data: {
    tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId,
    code, name: input.name.trim(), siteCode: input.siteCode.trim(), siteName: input.siteName.trim(), contractNo: input.contractNo?.trim() || null,
    contractAmount: input.contractAmount, paymentType: input.paymentType || "Taşeron Hakedişi", counterpartyCode: input.counterpartyCode?.trim() || null,
    counterpartyName: input.counterpartyName?.trim() || null, retentionRate: input.retentionRate ?? 0, createdBy: result.scope.userId, updatedBy: result.scope.userId,
  } });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id } };
}

export async function createConstructionContractItemAction(input: {
  projectId: string; itemCode: string; description: string; unit: string;
  contractQuantity: number; unitPrice: number; vatRate?: number;
}) {
  const result = await context();
  if (!result.ok) return result.result;
  if (!["admin", "accounting"].includes(result.scope.userRole)) return { ok: false as const, errors: ["Hakediş işlemi için muhasebe yetkisi gereklidir."] };
  const project = await prisma.constructionProject.findFirst({ where: { id: input.projectId, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId } });
  if (!project) return { ok: false as const, errors: ["İnşaat projesi bulunamadı."] };
  if (project.status !== "OPEN") return { ok: false as const, errors: ["Kapalı projeye sözleşme pozu eklenemez."] };
  if (!input.itemCode.trim() || !input.description.trim() || !input.unit.trim()) return { ok: false as const, errors: ["Poz kodu, açıklaması ve birimi zorunludur."] };
  if (!(input.contractQuantity > 0) || !(input.unitPrice >= 0)) return { ok: false as const, errors: ["Sözleşme miktarı sıfırdan büyük, birim fiyat sıfır veya daha büyük olmalıdır."] };
  const existing = await prisma.constructionContractItem.findFirst({ where: { projectId: project.id, itemCode: input.itemCode.trim(), isActive: true } });
  if (existing) return { ok: false as const, errors: ["Bu projede aynı kodla aktif bir sözleşme pozu bulunmaktadır."] };
  const row = await prisma.constructionContractItem.create({ data: {
    tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, projectId: project.id,
    itemCode: input.itemCode.trim(), description: input.description.trim(), unit: input.unit.trim(), contractQuantity: input.contractQuantity,
    unitPrice: input.unitPrice, vatRate: input.vatRate ?? 0, createdBy: result.scope.userId, updatedBy: result.scope.userId,
  } });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: row.id } };
}

export async function listConstructionProgressPaymentsAction(projectId: string) {
  const result = await context();
  if (!result.ok) return result.result;
  const project = await prisma.constructionProject.findFirst({ where: { id: projectId, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, select: { id: true } });
  if (!project) return { ok: false as const, errors: ["İnşaat projesi bulunamadı."] };
  const rows = await prisma.constructionProgressPayment.findMany({ where: { projectId: project.id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, orderBy: { sequenceNo: "asc" }, include: { accountingLink: true } });
  return { ok: true as const, data: { rows: rows.map((row) => ({ id: row.id, sequenceNo: row.sequenceNo, kind: row.kind, status: row.status, documentNo: row.documentNo, periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(), periodGrossTotal: Number(row.periodGrossTotal), cumulativeGrossTotal: Number(row.cumulativeGrossTotal), progressPaymentId: row.accountingLink?.progressPaymentId ?? null })) } };
}

export async function calculateConstructionProgressPaymentAction(input: {
  projectId: string; measurements: Array<{ contractItemId: string; quantity: number }>;
}) {
  const result = await context();
  if (!result.ok) return result.result;
  const project = await prisma.constructionProject.findFirst({ where: { id: input.projectId, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, include: { contractItems: { where: { isActive: true } }, progressPayments: { where: { status: { in: ["APPROVED", "FINALIZED"] } }, orderBy: { sequenceNo: "desc" }, take: 1, include: { snapshots: true } } } });
  if (!project) return { ok: false as const, errors: ["İnşaat projesi bulunamadı."] };
  const previous = project.progressPayments[0];
  const previousByItem = new Map((previous?.snapshots ?? []).map((snapshot) => [snapshot.contractItemId, { contractItemId: snapshot.contractItemId, cumulativeQuantity: Number(snapshot.cumulativeQuantity), cumulativeAmount: Number(snapshot.cumulativeAmount), cumulativeVatAmount: Number(snapshot.cumulativeVatAmount) }]));
  const snapshots = project.contractItems.map((item) => calculateConstructionItemSnapshot({ id: item.id, contractQuantity: Number(item.contractQuantity), unitPrice: Number(item.unitPrice), vatRate: Number(item.vatRate) }, input.measurements, previousByItem.get(item.id)));
  return { ok: true as const, data: { snapshots, totals: calculateConstructionPaymentTotals(snapshots), previousProgressPaymentId: previous?.id ?? null } };
}

export async function createConstructionProgressPaymentAction(input: {
  projectId: string; sequenceNo?: number; kind?: ConstructionPaymentKind; periodStart: string; periodEnd: string; documentNo: string; description?: string;
  measurements: Array<{ contractItemId: string; quantity: number; description?: string; unit?: string; measurementType?: string }>;
}) {
  const result = await context();
  if (!result.ok) return result.result;
  if (!["admin", "accounting"].includes(result.scope.userRole)) return { ok: false as const, errors: ["Hakediş işlemi için muhasebe yetkisi gereklidir."] };
  const project = await prisma.constructionProject.findFirst({ where: { id: input.projectId, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, include: { contractItems: { where: { isActive: true } }, progressPayments: { orderBy: { sequenceNo: "desc" }, take: 1, include: { snapshots: true } } } });
  if (!project) return { ok: false as const, errors: ["İnşaat projesi bulunamadı."] };
  if (project.status !== "OPEN") return { ok: false as const, errors: ["Kapalı projede yeni hakediş açılamaz."] };
  if (project.contractItems.length === 0) return { ok: false as const, errors: ["Hakediş açılmadan önce en az bir sözleşme pozu oluşturulmalıdır."] };
  if (!input.documentNo.trim()) return { ok: false as const, errors: ["Hakediş belge numarası zorunludur."] };
  const periodStart = new Date(input.periodStart); const periodEnd = new Date(input.periodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd < periodStart) return { ok: false as const, errors: ["Hakediş başlangıç ve bitiş tarihleri geçerli ve sıralı olmalıdır."] };
  const itemIds = new Set(project.contractItems.map((item) => item.id));
  if (input.measurements.some((measurement) => !itemIds.has(measurement.contractItemId))) return { ok: false as const, errors: ["Metraj satırlarından biri aktif proje kapsamındaki bir sözleşme pozuna ait değil."] };
  if (!input.measurements.some((measurement) => Number.isFinite(measurement.quantity) && measurement.quantity !== 0)) return { ok: false as const, errors: ["En az bir cari dönem metraj miktarı girilmelidir."] };
  const activeDraft = await prisma.constructionProgressPayment.findFirst({ where: { projectId: project.id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, status: { in: ["DRAFT", "SUBMITTED", "RETURNED"] } } });
  if (activeDraft) return { ok: false as const, errors: ["Projede zaten aktif bir taslak hakediş bulunmaktadır."] };
  const previous = project.progressPayments[0];
  const sequenceNo = input.sequenceNo ?? ((previous?.sequenceNo ?? 0) + 1);
  const kind = input.kind ?? (sequenceNo === 1 ? "FIRST" : "INTERIM");
  const chainErrors = validateConstructionPaymentChain({ sequenceNo, kind, previous: previous ? { id: previous.id, sequenceNo: previous.sequenceNo, status: previous.status as never } : null });
  if (chainErrors.length) return { ok: false as const, errors: chainErrors };
  const previousByItem = new Map((previous?.snapshots ?? []).map((s) => [s.contractItemId, { contractItemId: s.contractItemId, cumulativeQuantity: Number(s.cumulativeQuantity), cumulativeAmount: Number(s.cumulativeAmount), cumulativeVatAmount: Number(s.cumulativeVatAmount) }]));
  const snapshots = project.contractItems.map((item) => calculateConstructionItemSnapshot({ id: item.id, contractQuantity: Number(item.contractQuantity), unitPrice: Number(item.unitPrice), vatRate: Number(item.vatRate) }, input.measurements, previousByItem.get(item.id)));
  const totals = calculateConstructionPaymentTotals(snapshots);
  const supplementary = calculateConstructionSupplementarySummary({ periodBaseTotal: totals.periodNetTotal, automaticDeductionAmount: roundMoney(totals.periodNetTotal * Number(project.retentionRate) / 100), previous: previous ? { cumulativeExtraWorkTotal: Number(previous.cumulativeExtraWorkTotal), cumulativeAdditionTotal: Number(previous.cumulativeAdditionTotal), cumulativeDeductionTotal: Number(previous.cumulativeDeductionTotal), cumulativePayableTotal: Number(previous.cumulativePayableTotal) } : undefined });
  const id = buildConstructionPaymentId(result.scope, project.id, sequenceNo);
  const sheetId = `${id}::measurement-sheet::general-1`;
  const created = await prisma.constructionProgressPayment.create({ data: {
    id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, projectId: project.id, previousProgressPaymentId: previous?.id ?? null,
    sequenceNo, kind, status: "DRAFT", periodStart, periodEnd, documentNo: input.documentNo.trim(), description: input.description?.trim() || null,
    periodGrossTotal: totals.periodGrossTotal, periodVatTotal: totals.periodVatTotal, periodNetTotal: totals.periodNetTotal, cumulativeGrossTotal: totals.cumulativeGrossTotal, cumulativeVatTotal: totals.cumulativeVatTotal, cumulativeNetTotal: totals.cumulativeNetTotal,
    ...supplementary,
    createdBy: result.scope.userId, updatedBy: result.scope.userId,
    measurementSheets: { create: { id: sheetId, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, sheetNo: "GEN-1", sheetType: "GENERAL", title: `Hakediş ${sequenceNo} Genel Metraj`, createdBy: result.scope.userId, updatedBy: result.scope.userId } },
    measurementLines: { create: input.measurements.map((m, index) => ({ tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, measurementSheetId: sheetId, contractItemId: m.contractItemId, lineNo: index + 1, measurementType: m.measurementType || "GENERAL", description: m.description || "", unit: m.unit || "", quantity: m.quantity, createdBy: result.scope.userId, updatedBy: result.scope.userId })) },
    snapshots: { create: snapshots.map((s) => ({ tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, contractItemId: s.contractItemId, previousQuantity: s.previousQuantity, periodQuantity: s.periodQuantity, cumulativeQuantity: s.cumulativeQuantity, unitPrice: s.unitPrice, vatRate: s.vatRate, previousAmount: s.previousAmount, periodAmount: s.periodAmount, cumulativeAmount: s.cumulativeAmount, previousVatAmount: s.previousVatAmount, periodVatAmount: s.periodVatAmount, cumulativeVatAmount: s.cumulativeVatAmount, contractQuantity: s.contractQuantity, exceededContract: s.exceededContract })) },
  }, include: { snapshots: true } });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: created.id, sequenceNo: created.sequenceNo, status: created.status, updatedAt: created.updatedAt.toISOString() } };
}

export async function saveConstructionProgressPaymentDraftAction(input: {
  id: string; updatedAt?: string; periodStart: string; periodEnd: string; documentNo: string; description?: string;
  measurements: Array<{ contractItemId: string; quantity: number; description?: string; unit?: string; measurementType?: string }>;
}) {
  const result = await context();
  if (!result.ok) return result.result;
  if (!["admin", "accounting"].includes(result.scope.userRole)) return { ok: false as const, errors: ["Hakediş işlemi için muhasebe yetkisi gereklidir."] };
  const payment = await prisma.constructionProgressPayment.findFirst({ where: { id: input.id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, include: { project: { include: { contractItems: { where: { isActive: true } } } }, previousProgressPayment: { include: { snapshots: true } }, measurementSheets: { orderBy: { createdAt: "asc" } }, measurementLines: true, extraWorks: true, deductionMovements: true, deductionRuleApplications: { select: { ruleCode: true } }, financialMovements: true } });
  if (!payment) return { ok: false as const, errors: ["Kümülatif hakediş bulunamadı."] };
  if (!["DRAFT", "RETURNED"].includes(payment.status)) return { ok: false as const, errors: ["Yalnız taslak veya iade edilmiş hakediş değiştirilebilir."] };
  if (input.updatedAt && payment.updatedAt.getTime() !== new Date(input.updatedAt).getTime()) return { ok: false as const, errors: ["Hakediş başka bir işlemle güncellendi; sayfayı yenileyip yeniden deneyin."] };
  const periodStart = new Date(input.periodStart); const periodEnd = new Date(input.periodEnd);
  if (!input.documentNo.trim() || Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd < periodStart) return { ok: false as const, errors: ["Belge numarası ve geçerli tarih aralığı zorunludur."] };
  const itemIds = new Set(payment.project.contractItems.map((item) => item.id));
  if (input.measurements.some((measurement) => !itemIds.has(measurement.contractItemId))) return { ok: false as const, errors: ["Metraj satırlarından biri aktif proje kapsamındaki bir sözleşme pozuna ait değil."] };
  const previousByItem = new Map((payment.previousProgressPayment?.snapshots ?? []).map((snapshot) => [snapshot.contractItemId, { contractItemId: snapshot.contractItemId, cumulativeQuantity: Number(snapshot.cumulativeQuantity), cumulativeAmount: Number(snapshot.cumulativeAmount), cumulativeVatAmount: Number(snapshot.cumulativeVatAmount) }]));
  const requestedMeasurements = aggregateConstructionMeasurementQuantities(input.measurements);
  const snapshots = payment.project.contractItems.map((item) => calculateConstructionItemSnapshot({ id: item.id, contractQuantity: Number(item.contractQuantity), unitPrice: Number(item.unitPrice), vatRate: Number(item.vatRate) }, requestedMeasurements, previousByItem.get(item.id)));
  const totals = calculateConstructionPaymentTotals(snapshots);
  const extraAmount = payment.extraWorks.reduce((sum, row) => sum + Number(row.periodAmount), 0); const additionAmount = payment.financialMovements.filter((row) => row.direction === "ADDITION").reduce((sum, row) => sum + Number(row.amount), 0);
  const supplementary = calculateConstructionSupplementarySummary({ periodBaseTotal: totals.periodNetTotal, automaticDeductionAmount: resolveConstructionLegacyAutomaticDeduction({ calculatedAmount: (totals.periodNetTotal + extraAmount + additionAmount) * Number(payment.project.retentionRate) / 100, applications: payment.deductionRuleApplications }), previous: payment.previousProgressPayment ? { cumulativeExtraWorkTotal: Number(payment.previousProgressPayment.cumulativeExtraWorkTotal), cumulativeAdditionTotal: Number(payment.previousProgressPayment.cumulativeAdditionTotal), cumulativeDeductionTotal: Number(payment.previousProgressPayment.cumulativeDeductionTotal), cumulativePayableTotal: Number(payment.previousProgressPayment.cumulativePayableTotal) } : undefined, extraWorks: payment.extraWorks.map((row) => ({ amount: Number(row.periodAmount) })), deductions: payment.deductionMovements.map((row) => ({ amount: Number(row.totalAmount) })), financialMovements: payment.financialMovements.map((row) => ({ amount: Number(row.amount), direction: row.direction === "ADDITION" ? "ADDITION" as const : "DEDUCTION" as const })) });
  const primarySheet = payment.measurementSheets.find((sheet) => sheet.sheetNo === "GEN-1") ?? payment.measurementSheets.find((sheet) => sheet.sheetType === "GENERAL");
  if (!primarySheet) return { ok: false as const, errors: ["Hakedişin ana genel metraj föyü bulunamadı."] };
  const primaryMeasurements = reconcileConstructionPrimaryMeasurementQuantities(requestedMeasurements, payment.measurementLines.filter((line) => line.measurementSheetId !== primarySheet.id).map((line) => ({ contractItemId: line.contractItemId, quantity: Number(line.quantity) })));
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.constructionMeasurementLine.deleteMany({ where: { progressPaymentId: payment.id, measurementSheetId: primarySheet.id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId } });
    await transaction.constructionPaymentItemSnapshot.deleteMany({ where: { progressPaymentId: payment.id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId } });
    return transaction.constructionProgressPayment.update({ where: { id: payment.id }, data: {
      periodStart, periodEnd, documentNo: input.documentNo.trim(), description: input.description?.trim() || null, updatedBy: result.scope.userId,
      periodGrossTotal: totals.periodGrossTotal, periodVatTotal: totals.periodVatTotal, periodNetTotal: totals.periodNetTotal, cumulativeGrossTotal: totals.cumulativeGrossTotal, cumulativeVatTotal: totals.cumulativeVatTotal, cumulativeNetTotal: totals.cumulativeNetTotal,
      ...supplementary,
      measurementLines: { create: primaryMeasurements.map((measurement, index) => ({ tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, measurementSheetId: primarySheet.id, contractItemId: measurement.contractItemId, lineNo: index + 1, measurementType: "GENERAL", description: "Özet metraj uzlaştırması", unit: payment.project.contractItems.find((item) => item.id === measurement.contractItemId)?.unit ?? "", quantity: measurement.quantity, createdBy: result.scope.userId, updatedBy: result.scope.userId })) },
      snapshots: { create: snapshots.map((snapshot) => ({ tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, contractItemId: snapshot.contractItemId, previousQuantity: snapshot.previousQuantity, periodQuantity: snapshot.periodQuantity, cumulativeQuantity: snapshot.cumulativeQuantity, unitPrice: snapshot.unitPrice, vatRate: snapshot.vatRate, previousAmount: snapshot.previousAmount, periodAmount: snapshot.periodAmount, cumulativeAmount: snapshot.cumulativeAmount, previousVatAmount: snapshot.previousVatAmount, periodVatAmount: snapshot.periodVatAmount, cumulativeVatAmount: snapshot.cumulativeVatAmount, contractQuantity: snapshot.contractQuantity, exceededContract: snapshot.exceededContract })) },
    }, include: { snapshots: true } });
  });
  revalidatePath("/hakedis");
  return { ok: true as const, data: { id: updated.id, updatedAt: updated.updatedAt.toISOString() } };
}

export async function listConstructionProgressPaymentSnapshotsAction(id: string) {
  const result = await context();
  if (!result.ok) return result.result;
  const payment = await prisma.constructionProgressPayment.findFirst({ where: { id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, select: { id: true } });
  if (!payment) return { ok: false as const, errors: ["Kümülatif hakediş bulunamadı."] };
  const rows = await prisma.constructionPaymentItemSnapshot.findMany({ where: { progressPaymentId: payment.id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, include: { contractItem: { select: { itemCode: true, description: true, unit: true } } }, orderBy: { contractItem: { itemCode: "asc" } } });
  return { ok: true as const, data: { rows: rows.map((row) => ({ id: row.id, contractItemId: row.contractItemId, itemCode: row.contractItem.itemCode, description: row.contractItem.description, unit: row.contractItem.unit, previousQuantity: Number(row.previousQuantity), periodQuantity: Number(row.periodQuantity), cumulativeQuantity: Number(row.cumulativeQuantity), unitPrice: Number(row.unitPrice), vatRate: Number(row.vatRate), periodAmount: Number(row.periodAmount), cumulativeAmount: Number(row.cumulativeAmount), periodVatAmount: Number(row.periodVatAmount), cumulativeVatAmount: Number(row.cumulativeVatAmount), exceededContract: row.exceededContract })) } };
}

export async function listConstructionProgressPaymentAuditLogsAction(id: string) {
  const result = await context();
  if (!result.ok) return result.result;
  const payment = await prisma.constructionProgressPayment.findFirst({ where: { id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, select: { id: true } });
  if (!payment) return { ok: false as const, errors: ["Kümülatif hakediş bulunamadı."] };
  const [rows, auditLogs] = await Promise.all([
    prisma.constructionApprovalEvent.findMany({ where: { progressPaymentId: payment.id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ where: { entityId: payment.id, entityType: "construction-progress-payment", tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] }),
  ]);
  return { ok: true as const, data: { rows: rows.map((row) => ({ id: row.id, statusFrom: row.statusFrom, statusTo: row.statusTo, actorUserId: row.actorUserId, reason: row.reason, createdAt: row.createdAt.toISOString() })), auditLogs: auditLogs.map((row) => ({ id: row.id, action: row.action, actorUserId: row.actorUserId, entityLabel: row.entityLabel, metadata: row.metadata, occurredAt: row.occurredAt.toISOString() })) } };
}

async function transition(id: string, to: string, reason?: string) {
  const result = await context();
  if (!result.ok) return result.result;
  if (!["admin", "accounting"].includes(result.scope.userRole)) return { ok: false as const, errors: ["Hakediş işlemi için muhasebe yetkisi gereklidir."] };
  if (to === "FINALIZED") {
    const finalized = await finalizationAdapter.finalize({ id, scope: result.scope });
    if (finalized.ok) { revalidatePath("/hakedis"); revalidatePath("/"); revalidatePath("/kasa-banka"); revalidatePath("/raporlar"); }
    return finalized;
  }
  const row = await prisma.constructionProgressPayment.findFirst({ where: { id, tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId }, include: { project: true } });
  if (!row) return { ok: false as const, errors: ["Kümülatif hakediş bulunamadı."] };
  if (row.status === to) return { ok: true as const, data: { id: row.id, status: row.status } };
  if (!canTransitionConstructionPayment(row.status as never, to as never)) return { ok: false as const, errors: [`${row.status} durumundan ${to} durumuna geçiş yapılamaz.`] };
  const occurredAt = new Date();
  const data: any = { status: to, updatedBy: result.scope.userId };
  if (to === "SUBMITTED") { data.submittedBy = result.scope.userId; data.submittedAt = occurredAt; }
  if (to === "APPROVED") { data.approvedBy = result.scope.userId; data.approvedAt = occurredAt; }
  const updated = await prisma.$transaction(async (transaction) => {
    const payment = await transaction.constructionProgressPayment.update({ where: { id: row.id }, data, include: { snapshots: true } });
    await transaction.constructionApprovalEvent.create({ data: { tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, progressPaymentId: row.id, statusFrom: row.status, statusTo: to, actorUserId: result.scope.userId, reason: reason || null } });
    await transaction.auditLog.create({ data: { tenantId: result.scope.tenantId, companyId: result.scope.companyId, periodId: result.scope.periodId, actorUserId: result.scope.userId, action: `construction-progress-payment.${to.toLowerCase()}`, entityType: "construction-progress-payment", entityId: row.id, entityLabel: row.documentNo, occurredAt, metadata: { projectId: row.projectId, sequenceNo: row.sequenceNo, kind: row.kind, statusFrom: row.status, statusTo: to, reason: reason || null } } });
    return payment;
  });
  revalidatePath("/hakedis"); revalidatePath("/"); revalidatePath("/kasa-banka"); revalidatePath("/raporlar");
  return { ok: true as const, data: { id: updated.id, status: updated.status } };
}

export async function submitConstructionProgressPaymentAction(id: string) { return transition(id, "SUBMITTED"); }
export async function returnConstructionProgressPaymentAction(id: string, reason?: string) { return transition(id, "RETURNED", reason); }
export async function approveConstructionProgressPaymentAction(id: string) { return transition(id, "APPROVED"); }
export async function finalizeConstructionProgressPaymentAction(id: string) { return transition(id, "FINALIZED"); }
