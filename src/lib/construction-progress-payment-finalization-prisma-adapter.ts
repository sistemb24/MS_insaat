import type { PrismaClient } from "@prisma/client";

import {
  commitProgressPaymentLedgerPostingInTransaction,
  type ProgressPaymentLedgerPostingTransactionLike,
} from "./progress-payment-ledger-posting-prisma-repository";
import { buildProgressPaymentLedgerPostingCommand } from "./progress-payment-ledger-posting-service";
import {
  progressPaymentRecordToRow,
  progressPaymentRowToCreateData,
} from "./progress-payment-prisma-repository";
import {
  calculateProgressPaymentTotals,
  createProgressPaymentId,
  validateProgressPaymentDraft,
  type ProgressPaymentRow,
} from "./progress-payment-service";
import { buildConstructionProgressPaymentProjectionDraft, type ConstructionProjectionSource } from "./construction-progress-payment-projection";
import { shouldCloseConstructionProject, type ConstructionPaymentKind } from "./construction-progress-payment-service";
import type { TenantScope } from "./tenant-scope";

type FinalizationResult =
  | { ok: true; data: { constructionPaymentId: string; progressPaymentId: string; ledgerDocumentNo: string; created: boolean } }
  | { ok: false; errors: string[] };

class FinalizationAbort extends Error {
  constructor(readonly errors: string[]) { super(errors.join(" ")); }
}

export function createConstructionProgressPaymentFinalizationPrismaAdapter(prisma: PrismaClient) {
  return {
    async finalize(input: { id: string; scope: TenantScope }): Promise<FinalizationResult> {
      try {
        return await prisma.$transaction(async (transaction) => {
          const construction = await transaction.constructionProgressPayment.findFirst({
            where: { id: input.id, tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId },
            include: { project: true, accountingLink: true, snapshots: { include: { contractItem: true }, orderBy: { contractItem: { itemCode: "asc" } } }, extraWorks: { orderBy: [{ workDate: "asc" }, { documentNo: "asc" }] }, deductionMovements: true, financialMovements: { orderBy: { movementDate: "asc" } } },
          });
          if (!construction) abort("Kümülatif hakediş bulunamadı.");
          if (construction.status === "FINALIZED" && construction.accountingLink) {
            const ledger = await transaction.ledgerEntry.findFirst({ where: { tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId, sourceType: "progress-payment", sourceId: construction.accountingLink.progressPaymentId } });
            if (!ledger) abort("Kesinleşmiş hakedişin muhasebe fişi bulunamadı.");
            return { ok: true as const, data: { constructionPaymentId: construction.id, progressPaymentId: construction.accountingLink.progressPaymentId, ledgerDocumentNo: ledger.documentNo, created: false } };
          }
          if (construction.status !== "APPROVED") abort("Yalnız onaylı hakediş kesinleştirilebilir.");

          const expectedProjection = buildProjectionRow(construction, input.scope);
          let financialRecord = construction.accountingLink
            ? await transaction.progressPayment.findFirst({ where: { id: construction.accountingLink.progressPaymentId, tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId }, include: lineInclude() })
            : await transaction.progressPayment.findFirst({ where: { tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId, documentNo: construction.documentNo }, include: lineInclude() });
          let financialCreated = false;
          if (!financialRecord) {
            financialRecord = await transaction.progressPayment.create({ data: progressPaymentRowToCreateData(expectedProjection), include: lineInclude() });
            financialCreated = true;
            await transaction.auditLog.create({ data: {
              tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId, actorUserId: input.scope.userId,
              action: "progress-payment.create", entityType: "progress-payment", entityId: expectedProjection.id, entityLabel: expectedProjection.documentNo, occurredAt: new Date(expectedProjection.createdAt),
              metadata: { sourceType: "construction-progress-payment", sourceId: construction.id, documentNo: expectedProjection.documentNo, statusTo: "Taslak", grandTotal: expectedProjection.grandTotal, lineCount: expectedProjection.lineCount },
            } });
          }
          const financial = progressPaymentRecordToRow(financialRecord);
          assertProjectionCompatible(expectedProjection, financial);
          let ledgerDocumentNo = financial.ledgerDocumentNo;
          let ledgerCreated = false;
          if (financial.status === "Taslak") {
            const command = buildProgressPaymentLedgerPostingCommand({ progressPayment: financial, scope: input.scope, timestamp: new Date().toISOString() });
            if (!command.ok) throw new FinalizationAbort(command.errors);
            const posted = await commitProgressPaymentLedgerPostingInTransaction(transaction as unknown as ProgressPaymentLedgerPostingTransactionLike, command.data);
            if (!posted.ok) throw new FinalizationAbort(posted.errors);
            ledgerDocumentNo = posted.data.ledgerEntry.documentNo;
            ledgerCreated = posted.data.created;
          } else if (financial.status === "Kaydedildi") {
            const existingLedger = await transaction.ledgerEntry.findFirst({ where: { tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId, sourceType: "progress-payment", sourceId: financial.id } });
            if (!existingLedger) abort("Finansal hakediş kaydedilmiş ancak kaynak muhasebe fişi bulunamadı.");
            ledgerDocumentNo = existingLedger.documentNo;
          } else abort("İptal edilmiş finansal hakediş kümülatif hakedişe bağlanamaz.");

          if (!ledgerDocumentNo) abort("Muhasebe fişi belge numarası üretilemedi.");
          await transaction.constructionAccountingLink.upsert({ where: { constructionPaymentId: construction.id }, create: { tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId, constructionPaymentId: construction.id, progressPaymentId: financial.id }, update: { progressPaymentId: financial.id } });
          if (shouldCloseConstructionProject({ kind: construction.kind as ConstructionPaymentKind, targetStatus: "FINALIZED" })) await transaction.constructionProject.update({ where: { id: construction.projectId }, data: { status: "CLOSED", updatedBy: input.scope.userId } });
          const finalizedAt = new Date();
          await transaction.constructionProgressPayment.update({ where: { id: construction.id }, data: { status: "FINALIZED", finalizedBy: input.scope.userId, finalizedAt, updatedBy: input.scope.userId } });
          await transaction.constructionApprovalEvent.create({ data: { tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId, progressPaymentId: construction.id, statusFrom: construction.status, statusTo: "FINALIZED", actorUserId: input.scope.userId, metadata: { progressPaymentId: financial.id, ledgerDocumentNo } } });
          await transaction.auditLog.create({ data: { tenantId: input.scope.tenantId, companyId: input.scope.companyId, periodId: input.scope.periodId, actorUserId: input.scope.userId, action: "construction-progress-payment.finalized", entityType: "construction-progress-payment", entityId: construction.id, entityLabel: construction.documentNo, occurredAt: finalizedAt, metadata: { projectId: construction.projectId, sequenceNo: construction.sequenceNo, kind: construction.kind, statusFrom: construction.status, statusTo: "FINALIZED", progressPaymentId: financial.id, ledgerDocumentNo } } });
          return { ok: true as const, data: { constructionPaymentId: construction.id, progressPaymentId: financial.id, ledgerDocumentNo, created: financialCreated || ledgerCreated } };
        });
      } catch (error) {
        if (error instanceof FinalizationAbort) return { ok: false, errors: error.errors };
        return { ok: false, errors: ["Kümülatif hakediş ve muhasebe fişi atomik olarak kesinleştirilemedi."] };
      }
    },
  };
}

function buildProjectionRow(construction: ConstructionProjectionSource, scope: TenantScope): ProgressPaymentRow {
  const draft = buildConstructionProgressPaymentProjectionDraft(construction);
  const errors = validateProgressPaymentDraft(draft);
  if (errors.length) throw new FinalizationAbort(errors);
  const timestamp = new Date().toISOString();
  const totals = calculateProgressPaymentTotals(draft);
  return { ...draft, id: createProgressPaymentId(scope, draft.documentNo), tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId, status: "Taslak", createdBy: scope.userId, updatedBy: scope.userId, createdAt: timestamp, updatedAt: timestamp, grossTotal: totals.grossTotal, retentionTotal: totals.retentionTotal, netTotal: totals.netTotal, vatTotal: totals.vatTotal, grandTotal: totals.grandTotal, lineCount: draft.lines.length };
}

function lineInclude() { return { lines: { orderBy: { lineNo: "asc" as const } } }; }
function assertProjectionCompatible(expected: ProgressPaymentRow, actual: ProgressPaymentRow) {
  const compatible = expected.id === actual.id && expected.documentNo === actual.documentNo && expected.paymentType === actual.paymentType && expected.counterpartyCode === actual.counterpartyCode && expected.siteCode === actual.siteCode && expected.lineCount === actual.lineCount && expected.grandTotal === actual.grandTotal;
  if (!compatible) abort("Aynı belge numarasındaki finansal hakediş farklı bir kaynağa veya tutara aittir.");
}
function abort(message: string): never { throw new FinalizationAbort([message]); }
