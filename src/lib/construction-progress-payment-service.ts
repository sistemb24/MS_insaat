import type { TenantScope } from "./tenant-scope";

export const CONSTRUCTION_CALCULATION_VERSION = "construction-v1";

export type ConstructionPaymentKind = "FIRST" | "INTERIM" | "FINAL";
export type ConstructionPaymentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "RETURNED"
  | "APPROVED"
  | "FINALIZED"
  | "VOID";

export type ConstructionContractItemInput = {
  id: string;
  contractQuantity: number;
  unitPrice: number;
  vatRate?: number;
};

export type ConstructionMeasurementInput = {
  contractItemId: string;
  quantity: number;
};

export type ConstructionMeasurementLineInput = ConstructionMeasurementInput & {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  multiplier?: number | null;
};

export type ConstructionPreviousSnapshot = {
  contractItemId: string;
  cumulativeQuantity: number;
  cumulativeAmount: number;
  cumulativeVatAmount?: number;
};

export type ConstructionItemSnapshot = {
  contractItemId: string;
  previousQuantity: number;
  periodQuantity: number;
  cumulativeQuantity: number;
  unitPrice: number;
  vatRate: number;
  previousAmount: number;
  periodAmount: number;
  cumulativeAmount: number;
  previousVatAmount: number;
  periodVatAmount: number;
  cumulativeVatAmount: number;
  contractQuantity: number;
  exceededContract: boolean;
  calculationVersion: string;
};

export type ConstructionPaymentTotals = {
  periodGrossTotal: number;
  periodVatTotal: number;
  periodNetTotal: number;
  cumulativeGrossTotal: number;
  cumulativeVatTotal: number;
  cumulativeNetTotal: number;
};

export type ConstructionSupplementarySummary = {
  periodExtraWorkTotal: number;
  periodAdditionTotal: number;
  periodDeductionTotal: number;
  periodPayableTotal: number;
  cumulativeExtraWorkTotal: number;
  cumulativeAdditionTotal: number;
  cumulativeDeductionTotal: number;
  cumulativePayableTotal: number;
};

export type ConstructionPaymentRow = {
  id: string;
  tenantId: string;
  companyId: string;
  periodId: string;
  projectId: string;
  sequenceNo: number;
  kind: ConstructionPaymentKind;
  status: ConstructionPaymentStatus;
  previousProgressPaymentId?: string | null;
  periodStart: string;
  periodEnd: string;
  paymentDate?: string | null;
  documentNo: string;
  description?: string;
  periodGrossTotal: number;
  periodVatTotal: number;
  periodNetTotal: number;
  cumulativeGrossTotal: number;
  cumulativeVatTotal: number;
  cumulativeNetTotal: number;
  snapshots: ConstructionItemSnapshot[];
};

export function calculateConstructionItemSnapshot(
  item: ConstructionContractItemInput,
  measurements: ConstructionMeasurementInput[],
  previous?: ConstructionPreviousSnapshot,
): ConstructionItemSnapshot {
  const periodQuantity = roundQuantity(
    measurements
      .filter((measurement) => measurement.contractItemId === item.id)
      .reduce((sum, measurement) => sum + toFiniteNumber(measurement.quantity), 0),
  );
  const previousQuantity = roundQuantity(previous?.cumulativeQuantity ?? 0);
  const previousAmount = roundMoney(previous?.cumulativeAmount ?? 0);
  const periodAmount = roundMoney(periodQuantity * item.unitPrice);
  const cumulativeQuantity = roundQuantity(previousQuantity + periodQuantity);
  const cumulativeAmount = roundMoney(previousAmount + periodAmount);
  const vatRate = roundMoney(item.vatRate ?? 0);
  const previousVatAmount = roundMoney(previous?.cumulativeVatAmount ?? 0);
  const periodVatAmount = roundMoney(periodAmount * vatRate / 100);
  const cumulativeVatAmount = roundMoney(previousVatAmount + periodVatAmount);

  return {
    contractItemId: item.id,
    previousQuantity,
    periodQuantity,
    cumulativeQuantity,
    unitPrice: roundQuantity(item.unitPrice),
    vatRate,
    previousAmount,
    periodAmount,
    cumulativeAmount,
    previousVatAmount,
    periodVatAmount,
    cumulativeVatAmount,
    contractQuantity: roundQuantity(item.contractQuantity),
    exceededContract: cumulativeQuantity > item.contractQuantity,
    calculationVersion: CONSTRUCTION_CALCULATION_VERSION,
  };
}

export function calculateConstructionMeasurementLineQuantity(
  input: Omit<ConstructionMeasurementLineInput, "contractItemId">,
) {
  const dimensions = [input.length, input.width, input.height].filter(
    (value): value is number => value !== null && value !== undefined,
  );
  if (!dimensions.length) return roundQuantity(input.quantity);
  const multiplier = input.multiplier === null || input.multiplier === undefined
    ? 1
    : toFiniteNumber(input.multiplier);
  return roundQuantity(
    dimensions.reduce((product, dimension) => product * toFiniteNumber(dimension), 1) * multiplier,
  );
}

export function aggregateConstructionMeasurementQuantities(
  lines: ConstructionMeasurementInput[],
) {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(
      line.contractItemId,
      roundQuantity((quantities.get(line.contractItemId) ?? 0) + toFiniteNumber(line.quantity)),
    );
  }
  return [...quantities.entries()].map(([contractItemId, quantity]) => ({ contractItemId, quantity }));
}

export function reconcileConstructionPrimaryMeasurementQuantities(
  requestedTotals: ConstructionMeasurementInput[],
  detailedLines: ConstructionMeasurementInput[],
) {
  const requested = aggregateConstructionMeasurementQuantities(requestedTotals);
  const detailed = new Map(
    aggregateConstructionMeasurementQuantities(detailedLines).map((line) => [line.contractItemId, line.quantity]),
  );
  return requested.map((line) => ({
    contractItemId: line.contractItemId,
    quantity: roundQuantity(line.quantity - (detailed.get(line.contractItemId) ?? 0)),
  }));
}

export function calculateConstructionPaymentTotals(
  snapshots: ConstructionItemSnapshot[],
): ConstructionPaymentTotals {
  const periodGrossTotal = roundMoney(
    snapshots.reduce((sum, snapshot) => sum + snapshot.periodAmount, 0),
  );
  const cumulativeGrossTotal = roundMoney(
    snapshots.reduce((sum, snapshot) => sum + snapshot.cumulativeAmount, 0),
  );
  const periodVatTotal = roundMoney(snapshots.reduce((sum, snapshot) => sum + snapshot.periodVatAmount, 0));
  const cumulativeVatTotal = roundMoney(snapshots.reduce((sum, snapshot) => sum + snapshot.cumulativeVatAmount, 0));

  return {
    periodGrossTotal,
    periodVatTotal,
    periodNetTotal: periodGrossTotal,
    cumulativeGrossTotal,
    cumulativeVatTotal,
    cumulativeNetTotal: cumulativeGrossTotal,
  };
}

export function calculateConstructionSupplementarySummary(input: {
  periodBaseTotal: number;
  automaticDeductionAmount?: number;
  previous?: Partial<Pick<ConstructionSupplementarySummary, "cumulativeExtraWorkTotal" | "cumulativeAdditionTotal" | "cumulativeDeductionTotal" | "cumulativePayableTotal">>;
  extraWorks?: Array<{ amount: number }>;
  deductions?: Array<{ amount: number }>;
  financialMovements?: Array<{ amount: number; direction: "ADDITION" | "DEDUCTION" }>;
}): ConstructionSupplementarySummary {
  const periodExtraWorkTotal = roundMoney((input.extraWorks ?? []).reduce((sum, row) => sum + Math.max(0, toFiniteNumber(row.amount)), 0));
  const periodAdditionTotal = roundMoney((input.financialMovements ?? []).filter((row) => row.direction === "ADDITION").reduce((sum, row) => sum + Math.max(0, toFiniteNumber(row.amount)), 0));
  const movementDeductions = (input.financialMovements ?? []).filter((row) => row.direction === "DEDUCTION").reduce((sum, row) => sum + Math.max(0, toFiniteNumber(row.amount)), 0);
  const periodDeductionTotal = roundMoney(Math.max(0, toFiniteNumber(input.automaticDeductionAmount)) + (input.deductions ?? []).reduce((sum, row) => sum + Math.max(0, toFiniteNumber(row.amount)), 0) + movementDeductions);
  const periodPayableTotal = roundMoney(toFiniteNumber(input.periodBaseTotal) + periodExtraWorkTotal + periodAdditionTotal - periodDeductionTotal);
  return {
    periodExtraWorkTotal,
    periodAdditionTotal,
    periodDeductionTotal,
    periodPayableTotal,
    cumulativeExtraWorkTotal: roundMoney(toFiniteNumber(input.previous?.cumulativeExtraWorkTotal) + periodExtraWorkTotal),
    cumulativeAdditionTotal: roundMoney(toFiniteNumber(input.previous?.cumulativeAdditionTotal) + periodAdditionTotal),
    cumulativeDeductionTotal: roundMoney(toFiniteNumber(input.previous?.cumulativeDeductionTotal) + periodDeductionTotal),
    cumulativePayableTotal: roundMoney(toFiniteNumber(input.previous?.cumulativePayableTotal) + periodPayableTotal),
  };
}

export function resolveConstructionLegacyAutomaticDeduction(input: {
  calculatedAmount: number;
  applications?: Array<{ ruleCode: string }>;
}) {
  const retentionApplied = (input.applications ?? []).some(
    (application) =>
      application.ruleCode.trim().toUpperCase() === "TEMINAT",
  );
  return retentionApplied ? 0 : roundMoney(input.calculatedAmount);
}

export function validateConstructionPaymentChain(input: {
  sequenceNo: number;
  kind: ConstructionPaymentKind;
  previous?: Pick<ConstructionPaymentRow, "sequenceNo" | "status" | "id"> | null;
}) {
  const errors: string[] = [];

  if (input.sequenceNo < 1 || !Number.isInteger(input.sequenceNo)) {
    errors.push("Hakediş sıra numarası 1 veya daha büyük bir tam sayı olmalıdır.");
  }

  if (input.sequenceNo === 1 && (input.previous || input.kind !== "FIRST")) {
    errors.push("İlk hakediş önceki hakediş olmadan FIRST türünde olmalıdır.");
  }

  if (input.sequenceNo > 1 && !input.previous) {
    errors.push("İkinci ve sonraki hakedişler son onaylı hakedişe bağlanmalıdır.");
  }

  if (input.sequenceNo > 1 && input.previous) {
    if (input.previous.sequenceNo !== input.sequenceNo - 1) {
      errors.push("Hakediş sıra numarası zincir içinde ardışık olmalıdır.");
    }
    if (!["APPROVED", "FINALIZED"].includes(input.previous.status)) {
      errors.push("Önceki hakediş onaylanmadan yeni hakediş açılamaz.");
    }
  }

  if (input.kind === "FINAL" && input.sequenceNo === 1) {
    errors.push("FINAL hakediş ilk hakediş olarak işaretlenemez.");
  }

  return errors;
}

export function nextConstructionPaymentSequence(
  payments: Array<{ sequenceNo: number }>,
) {
  return payments.reduce((highest, payment) => Math.max(highest, payment.sequenceNo), 0) + 1;
}

export function validateConstructionScope(scope: TenantScope) {
  const errors: string[] = [];

  if (!scope.tenantId.trim()) errors.push("Tenant kapsamı zorunludur.");
  if (!scope.companyId.trim()) errors.push("Firma kapsamı zorunludur.");
  if (!scope.periodId.trim()) errors.push("Muhasebe dönemi kapsamı zorunludur.");
  if (!scope.userId.trim()) errors.push("Kullanıcı kapsamı zorunludur.");

  return errors;
}

export function buildConstructionPaymentId(
  scope: Pick<TenantScope, "tenantId" | "companyId" | "periodId">,
  projectId: string,
  sequenceNo: number,
) {
  return `${scope.tenantId}::${scope.companyId}::${scope.periodId}::construction-payment::${projectId}::${sequenceNo}`;
}

export function canTransitionConstructionPayment(
  from: ConstructionPaymentStatus,
  to: ConstructionPaymentStatus,
) {
  const transitions: Record<ConstructionPaymentStatus, ConstructionPaymentStatus[]> = {
    DRAFT: ["SUBMITTED", "VOID"],
    SUBMITTED: ["APPROVED", "RETURNED"],
    RETURNED: ["SUBMITTED", "VOID"],
    APPROVED: ["FINALIZED"],
    FINALIZED: [],
    VOID: [],
  };

  return transitions[from].includes(to);
}

export function shouldCloseConstructionProject(input: {
  kind: ConstructionPaymentKind;
  targetStatus: ConstructionPaymentStatus;
}) {
  return input.kind === "FINAL" && input.targetStatus === "FINALIZED";
}

export function roundMoney(value: number) {
  return Math.round((toFiniteNumber(value) + Number.EPSILON) * 100) / 100;
}

export function roundQuantity(value: number) {
  return Math.round((toFiniteNumber(value) + Number.EPSILON) * 10000) / 10000;
}

function toFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
