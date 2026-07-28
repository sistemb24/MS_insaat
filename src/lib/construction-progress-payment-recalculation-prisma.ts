/* eslint-disable @typescript-eslint/no-explicit-any -- shared scoped Prisma transaction helper */

import {
  aggregateConstructionMeasurementQuantities,
  calculateConstructionItemSnapshot,
  calculateConstructionPaymentTotals,
  calculateConstructionSupplementarySummary,
  resolveConstructionLegacyAutomaticDeduction,
  type ConstructionItemSnapshot,
  type ConstructionPreviousSnapshot,
} from "./construction-progress-payment-service";

export type ConstructionPaymentRecalculationScope = {
  tenantId: string;
  companyId: string;
  periodId: string;
  userId: string;
};

export async function recalculateConstructionProgressPaymentSummary(
  transaction: any,
  paymentId: string,
  scope: Omit<ConstructionPaymentRecalculationScope, "userId">,
) {
  const payment = await transaction.constructionProgressPayment.findFirst({
    where: scopedPaymentWhere(paymentId, scope),
    include: {
      project: true,
      previousProgressPayment: true,
      extraWorks: true,
      deductionMovements: true,
      deductionRuleApplications: { select: { ruleCode: true } },
      financialMovements: true,
    },
  });
  if (!payment) throw new Error("Kümülatif hakediş bulunamadı.");

  const extraAmount = payment.extraWorks.reduce(
    (sum: number, row: any) => sum + Number(row.periodAmount),
    0,
  );
  const additionAmount = payment.financialMovements
    .filter((row: any) => row.direction === "ADDITION")
    .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  const summary = calculateConstructionSupplementarySummary({
    periodBaseTotal: Number(payment.periodNetTotal),
    automaticDeductionAmount: resolveConstructionLegacyAutomaticDeduction({
      calculatedAmount:
        (
          Number(payment.periodNetTotal)
          + extraAmount
          + additionAmount
        )
        * Number(payment.project.retentionRate)
        / 100,
      applications: payment.deductionRuleApplications,
    }),
    previous: previousSupplementarySummary(payment.previousProgressPayment),
    extraWorks: payment.extraWorks.map((row: any) => ({
      amount: Number(row.periodAmount),
    })),
    deductions: payment.deductionMovements.map((row: any) => ({
      amount: Number(row.totalAmount),
    })),
    financialMovements: payment.financialMovements.map((row: any) => ({
      amount: Number(row.amount),
      direction: row.direction,
    })),
  });

  await transaction.constructionProgressPayment.update({
    where: { id: payment.id },
    data: summary,
  });
}

export async function recalculateConstructionMeasurementSnapshots(
  transaction: any,
  paymentId: string,
  scope: ConstructionPaymentRecalculationScope,
) {
  const payment = await transaction.constructionProgressPayment.findFirst({
    where: scopedPaymentWhere(paymentId, scope),
    include: {
      project: {
        include: { contractItems: { where: { isActive: true } } },
      },
      previousProgressPayment: { include: { snapshots: true } },
      measurementLines: true,
      extraWorks: true,
      deductionMovements: true,
      deductionRuleApplications: { select: { ruleCode: true } },
      financialMovements: true,
    },
  });
  if (!payment) throw new Error("Kümülatif hakediş bulunamadı.");

  const measurements = aggregateConstructionMeasurementQuantities(
    payment.measurementLines.map((line: any) => ({
      contractItemId: line.contractItemId,
      quantity: Number(line.quantity),
    })),
  );
  const previousByItem = new Map<string, ConstructionPreviousSnapshot>(
    (payment.previousProgressPayment?.snapshots ?? []).map((snapshot: any) => [
      snapshot.contractItemId,
      {
        contractItemId: snapshot.contractItemId,
        cumulativeQuantity: Number(snapshot.cumulativeQuantity),
        cumulativeAmount: Number(snapshot.cumulativeAmount),
        cumulativeVatAmount: Number(snapshot.cumulativeVatAmount),
      },
    ]),
  );
  const snapshots: ConstructionItemSnapshot[] = payment.project.contractItems.map(
    (item: any) =>
      calculateConstructionItemSnapshot(
        {
          id: item.id,
          contractQuantity: Number(item.contractQuantity),
          unitPrice: Number(item.unitPrice),
          vatRate: Number(item.vatRate),
        },
        measurements,
        previousByItem.get(item.id),
      ),
  );
  const totals = calculateConstructionPaymentTotals(snapshots);
  const extraAmount = payment.extraWorks.reduce(
    (sum: number, row: any) => sum + Number(row.periodAmount),
    0,
  );
  const additionAmount = payment.financialMovements
    .filter((row: any) => row.direction === "ADDITION")
    .reduce((sum: number, row: any) => sum + Number(row.amount), 0);
  const supplementary = calculateConstructionSupplementarySummary({
    periodBaseTotal: totals.periodNetTotal,
    automaticDeductionAmount: resolveConstructionLegacyAutomaticDeduction({
      calculatedAmount:
        (totals.periodNetTotal + extraAmount + additionAmount)
        * Number(payment.project.retentionRate)
        / 100,
      applications: payment.deductionRuleApplications,
    }),
    previous: previousSupplementarySummary(payment.previousProgressPayment),
    extraWorks: payment.extraWorks.map((row: any) => ({
      amount: Number(row.periodAmount),
    })),
    deductions: payment.deductionMovements.map((row: any) => ({
      amount: Number(row.totalAmount),
    })),
    financialMovements: payment.financialMovements.map((row: any) => ({
      amount: Number(row.amount),
      direction: row.direction,
    })),
  });

  await transaction.constructionPaymentItemSnapshot.deleteMany({
    where: {
      progressPaymentId: payment.id,
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      periodId: scope.periodId,
    },
  });
  await transaction.constructionProgressPayment.update({
    where: { id: payment.id },
    data: {
      periodGrossTotal: totals.periodGrossTotal,
      periodVatTotal: totals.periodVatTotal,
      periodNetTotal: totals.periodNetTotal,
      cumulativeGrossTotal: totals.cumulativeGrossTotal,
      cumulativeVatTotal: totals.cumulativeVatTotal,
      cumulativeNetTotal: totals.cumulativeNetTotal,
      ...supplementary,
      updatedBy: scope.userId,
      snapshots: {
        create: snapshots.map((snapshot) => ({
          tenantId: scope.tenantId,
          companyId: scope.companyId,
          periodId: scope.periodId,
          contractItemId: snapshot.contractItemId,
          previousQuantity: snapshot.previousQuantity,
          periodQuantity: snapshot.periodQuantity,
          cumulativeQuantity: snapshot.cumulativeQuantity,
          unitPrice: snapshot.unitPrice,
          vatRate: snapshot.vatRate,
          previousAmount: snapshot.previousAmount,
          periodAmount: snapshot.periodAmount,
          cumulativeAmount: snapshot.cumulativeAmount,
          previousVatAmount: snapshot.previousVatAmount,
          periodVatAmount: snapshot.periodVatAmount,
          cumulativeVatAmount: snapshot.cumulativeVatAmount,
          contractQuantity: snapshot.contractQuantity,
          exceededContract: snapshot.exceededContract,
        })),
      },
    },
  });
}

function scopedPaymentWhere(
  paymentId: string,
  scope: { tenantId: string; companyId: string; periodId: string },
) {
  return {
    id: paymentId,
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
  };
}

function previousSupplementarySummary(payment: any) {
  return payment
    ? {
        cumulativeExtraWorkTotal: Number(payment.cumulativeExtraWorkTotal),
        cumulativeAdditionTotal: Number(payment.cumulativeAdditionTotal),
        cumulativeDeductionTotal: Number(payment.cumulativeDeductionTotal),
        cumulativePayableTotal: Number(payment.cumulativePayableTotal),
      }
    : undefined;
}
