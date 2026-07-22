import { roundMoney } from "./construction-progress-payment-service";

export type ConstructionDeductionCalculationType = "RATE" | "FIXED";
export type ConstructionDeductionBaseType =
  | "PERIOD_NET"
  | "PERIOD_NET_PLUS_EXTRAS"
  | "PAYABLE_BEFORE_RULE";
export type ConstructionDeductionTaxMode = "NONE" | "VAT_ADD";

export type ConstructionDeductionRuleDefinition = {
  ruleKey: string;
  code: string;
  name: string;
  revisionNo: number;
  calculationType: ConstructionDeductionCalculationType;
  baseType?: ConstructionDeductionBaseType | null;
  rate?: number | null;
  fixedAmount?: number | null;
  minimumAmount?: number | null;
  maximumAmount?: number | null;
  taxMode: ConstructionDeductionTaxMode;
  taxRate?: number | null;
  priority: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
};

export type ConstructionDeductionRuleEvaluationRow = {
  ruleKey: string;
  code: string;
  name: string;
  revisionNo: number;
  calculationType: ConstructionDeductionCalculationType;
  baseType: ConstructionDeductionBaseType | null;
  baseAmount: number;
  rate: number | null;
  fixedAmount: number | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  taxMode: ConstructionDeductionTaxMode;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  totalAmount: number;
  priority: number;
};

export type ConstructionDeductionRuleEvaluationInput = {
  rules: ConstructionDeductionRuleDefinition[];
  paymentPeriodEnd: string;
  periodNetTotal: number;
  extraWorkTotal?: number;
  additionTotal?: number;
  existingDeductionTotal?: number;
};

export type ConstructionDeductionRuleEvaluationResult =
  | {
      ok: true;
      data: {
        rows: ConstructionDeductionRuleEvaluationRow[];
        periodPayableBeforeRules: number;
        periodPayableTotal: number;
        totalRuleDeduction: number;
      };
    }
  | { ok: false; errors: string[] };

const baseTypes = new Set<ConstructionDeductionBaseType>([
  "PERIOD_NET",
  "PERIOD_NET_PLUS_EXTRAS",
  "PAYABLE_BEFORE_RULE",
]);

export function validateConstructionDeductionRule(
  rule: ConstructionDeductionRuleDefinition,
) {
  const errors: string[] = [];
  const label = rule.code.trim() || rule.ruleKey.trim() || "Adsız kural";
  const effectiveFrom = parseDate(rule.effectiveFrom);
  const effectiveTo = rule.effectiveTo ? parseDate(rule.effectiveTo) : null;

  if (!rule.ruleKey.trim()) errors.push("Kural anahtarı zorunludur.");
  if (!rule.code.trim()) errors.push("Kural kodu zorunludur.");
  if (!rule.name.trim()) errors.push("Kural adı zorunludur.");
  if (!Number.isInteger(rule.revisionNo) || rule.revisionNo < 1) {
    errors.push(`${label}: revizyon numarası 1 veya daha büyük bir tam sayı olmalıdır.`);
  }
  if (!Number.isInteger(rule.priority) || rule.priority < 0) {
    errors.push(`${label}: öncelik negatif olmayan bir tam sayı olmalıdır.`);
  }
  if (!effectiveFrom) errors.push(`${label}: geçerlilik başlangıç tarihi geçersizdir.`);
  if (rule.effectiveTo && !effectiveTo) {
    errors.push(`${label}: geçerlilik bitiş tarihi geçersizdir.`);
  } else if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
    errors.push(`${label}: geçerlilik bitişi başlangıçtan önce olamaz.`);
  }

  if (rule.calculationType === "RATE") {
    if (!rule.baseType || !baseTypes.has(rule.baseType)) {
      errors.push(`${label}: oransal kural için geçerli hesap tabanı zorunludur.`);
    }
    if (!isPercentage(rule.rate)) {
      errors.push(`${label}: oran 0 ile 100 arasında olmalıdır.`);
    }
    if (hasValue(rule.fixedAmount)) {
      errors.push(`${label}: oransal kuralda maktu tutar kullanılamaz.`);
    }
  } else if (rule.calculationType === "FIXED") {
    if (rule.baseType) errors.push(`${label}: maktu kuralda hesap tabanı kullanılamaz.`);
    if (!isNonNegativeFinite(rule.fixedAmount)) {
      errors.push(`${label}: maktu tutar negatif olmayan bir sayı olmalıdır.`);
    }
    if (hasValue(rule.rate)) errors.push(`${label}: maktu kuralda oran kullanılamaz.`);
  } else {
    errors.push(`${label}: hesaplama tipi RATE veya FIXED olmalıdır.`);
  }

  if (hasValue(rule.minimumAmount) && !isNonNegativeFinite(rule.minimumAmount)) {
    errors.push(`${label}: alt sınır negatif olmayan bir sayı olmalıdır.`);
  }
  if (hasValue(rule.maximumAmount) && !isNonNegativeFinite(rule.maximumAmount)) {
    errors.push(`${label}: üst sınır negatif olmayan bir sayı olmalıdır.`);
  }
  if (
    isNonNegativeFinite(rule.minimumAmount) &&
    isNonNegativeFinite(rule.maximumAmount) &&
    rule.minimumAmount > rule.maximumAmount
  ) {
    errors.push(`${label}: alt sınır üst sınırdan büyük olamaz.`);
  }

  if (rule.taxMode === "NONE") {
    if (hasValue(rule.taxRate) && rule.taxRate !== 0) {
      errors.push(`${label}: vergi modu NONE iken vergi oranı sıfır olmalıdır.`);
    }
  } else if (rule.taxMode === "VAT_ADD") {
    if (!isPercentage(rule.taxRate)) {
      errors.push(`${label}: KDV oranı 0 ile 100 arasında olmalıdır.`);
    }
  } else {
    errors.push(`${label}: vergi modu NONE veya VAT_ADD olmalıdır.`);
  }

  return errors;
}

export function validateConstructionDeductionRuleRevisionSet(
  rules: ConstructionDeductionRuleDefinition[],
) {
  const errors = rules.flatMap(validateConstructionDeductionRule);
  const revisionKeys = new Set<string>();
  const codeRevisionKeys = new Set<string>();

  for (const rule of rules) {
    const revisionKey = `${normalizeKey(rule.ruleKey)}::${rule.revisionNo}`;
    if (revisionKeys.has(revisionKey)) {
      errors.push(`${rule.code}: aynı kural revizyonu birden fazla kez tanımlanamaz.`);
    }
    revisionKeys.add(revisionKey);

    const codeRevisionKey = `${normalizeKey(rule.code)}::${rule.revisionNo}`;
    if (codeRevisionKeys.has(codeRevisionKey)) {
      errors.push(`${rule.code}: aynı kod ve revizyon birden fazla kuralda kullanılamaz.`);
    }
    codeRevisionKeys.add(codeRevisionKey);
  }

  const activeByRuleKey = new Map<string, ConstructionDeductionRuleDefinition[]>();
  for (const rule of rules.filter((row) => row.isActive)) {
    const key = normalizeKey(rule.ruleKey);
    activeByRuleKey.set(key, [...(activeByRuleKey.get(key) ?? []), rule]);
  }

  for (const activeRules of activeByRuleKey.values()) {
    const sorted = [...activeRules].sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom),
    );
    for (let index = 1; index < sorted.length; index += 1) {
      if (dateRangesOverlap(sorted[index - 1], sorted[index])) {
        errors.push(
          `${sorted[index].code}: aynı kuralın aktif revizyon tarihleri çakışamaz.`,
        );
      }
    }
  }

  return unique(errors);
}

export function evaluateConstructionDeductionRules(
  input: ConstructionDeductionRuleEvaluationInput,
): ConstructionDeductionRuleEvaluationResult {
  const errors = validateEvaluationInput(input);
  errors.push(...validateConstructionDeductionRuleRevisionSet(input.rules));
  if (errors.length) return { ok: false, errors: unique(errors) };

  const paymentPeriodEnd = parseDate(input.paymentPeriodEnd)!;
  const effectiveRules = input.rules
    .filter((rule) => isRuleEffectiveOn(rule, paymentPeriodEnd))
    .sort(compareRules);
  const periodNetTotal = roundMoney(input.periodNetTotal);
  const extraWorkTotal = roundMoney(input.extraWorkTotal ?? 0);
  const additionTotal = roundMoney(input.additionTotal ?? 0);
  const existingDeductionTotal = roundMoney(input.existingDeductionTotal ?? 0);
  const periodPayableBeforeRules = roundMoney(
    periodNetTotal + extraWorkTotal + additionTotal - existingDeductionTotal,
  );

  if (periodPayableBeforeRules < 0) {
    return {
      ok: false,
      errors: ["Mevcut kesintiler dönem ödenecek tutarını negatife indiriyor."],
    };
  }

  const rows: ConstructionDeductionRuleEvaluationRow[] = [];
  let runningPayable = periodPayableBeforeRules;

  for (const rule of effectiveRules) {
    const baseAmount = resolveBaseAmount({
      rule,
      periodNetTotal,
      extraWorkTotal,
      additionTotal,
      runningPayable,
    });
    const rawAmount =
      rule.calculationType === "RATE"
        ? roundMoney(baseAmount * (rule.rate ?? 0) / 100)
        : roundMoney(rule.fixedAmount ?? 0);
    const netAmount = roundMoney(
      Math.min(
        rule.maximumAmount ?? Number.POSITIVE_INFINITY,
        Math.max(rule.minimumAmount ?? 0, rawAmount),
      ),
    );
    const taxRate = rule.taxMode === "VAT_ADD" ? rule.taxRate ?? 0 : 0;
    const taxAmount =
      rule.taxMode === "VAT_ADD" ? roundMoney(netAmount * taxRate / 100) : 0;
    const totalAmount = roundMoney(netAmount + taxAmount);

    if (roundMoney(runningPayable - totalAmount) < 0) {
      return {
        ok: false,
        errors: [
          `${rule.code}: kural sonucu dönem ödenecek tutarını negatife indiriyor.`,
        ],
      };
    }

    rows.push({
      ruleKey: rule.ruleKey,
      code: rule.code,
      name: rule.name,
      revisionNo: rule.revisionNo,
      calculationType: rule.calculationType,
      baseType: rule.calculationType === "RATE" ? rule.baseType ?? null : null,
      baseAmount,
      rate: rule.calculationType === "RATE" ? rule.rate ?? null : null,
      fixedAmount: rule.calculationType === "FIXED" ? rule.fixedAmount ?? null : null,
      minimumAmount: rule.minimumAmount ?? null,
      maximumAmount: rule.maximumAmount ?? null,
      taxMode: rule.taxMode,
      taxRate,
      taxAmount,
      netAmount,
      totalAmount,
      priority: rule.priority,
    });
    runningPayable = roundMoney(runningPayable - totalAmount);
  }

  return {
    ok: true,
    data: {
      rows,
      periodPayableBeforeRules,
      periodPayableTotal: runningPayable,
      totalRuleDeduction: roundMoney(
        rows.reduce((sum, row) => sum + row.totalAmount, 0),
      ),
    },
  };
}

export function buildConstructionDeductionApplicationKey(input: {
  tenantId: string;
  companyId: string;
  periodId: string;
  progressPaymentId: string;
  ruleKey: string;
}) {
  const parts = [
    input.tenantId,
    input.companyId,
    input.periodId,
    input.progressPaymentId,
    input.ruleKey,
  ].map(normalizeKey);
  if (parts.some((part) => !part)) {
    throw new Error("Kesinti uygulama anahtarı için tüm kapsam alanları zorunludur.");
  }
  return parts.join("::");
}

function validateEvaluationInput(input: ConstructionDeductionRuleEvaluationInput) {
  const errors: string[] = [];
  if (!parseDate(input.paymentPeriodEnd)) {
    errors.push("Hakediş dönem bitiş tarihi geçersizdir.");
  }
  for (const [label, value] of [
    ["Dönem net tutarı", input.periodNetTotal],
    ["Tutanaklı iş toplamı", input.extraWorkTotal ?? 0],
    ["İlave toplamı", input.additionTotal ?? 0],
    ["Mevcut kesinti toplamı", input.existingDeductionTotal ?? 0],
  ] as const) {
    if (!isNonNegativeFinite(value)) errors.push(`${label} negatif olmayan bir sayı olmalıdır.`);
  }
  return errors;
}

function isRuleEffectiveOn(rule: ConstructionDeductionRuleDefinition, date: Date) {
  if (!rule.isActive) return false;
  const from = parseDate(rule.effectiveFrom)!;
  const to = rule.effectiveTo ? parseDate(rule.effectiveTo)! : null;
  return date >= from && (!to || date <= to);
}

function resolveBaseAmount(input: {
  rule: ConstructionDeductionRuleDefinition;
  periodNetTotal: number;
  extraWorkTotal: number;
  additionTotal: number;
  runningPayable: number;
}) {
  if (input.rule.calculationType === "FIXED") return 0;
  if (input.rule.baseType === "PERIOD_NET") return input.periodNetTotal;
  if (input.rule.baseType === "PERIOD_NET_PLUS_EXTRAS") {
    return roundMoney(input.periodNetTotal + input.extraWorkTotal + input.additionTotal);
  }
  return input.runningPayable;
}

function compareRules(
  left: ConstructionDeductionRuleDefinition,
  right: ConstructionDeductionRuleDefinition,
) {
  if (left.priority !== right.priority) return left.priority - right.priority;
  const codeComparison = normalizeKey(left.code).localeCompare(normalizeKey(right.code));
  if (codeComparison !== 0) return codeComparison;
  return left.revisionNo - right.revisionNo;
}

function dateRangesOverlap(
  left: ConstructionDeductionRuleDefinition,
  right: ConstructionDeductionRuleDefinition,
) {
  const leftFrom = parseDate(left.effectiveFrom);
  const rightFrom = parseDate(right.effectiveFrom);
  if (!leftFrom || !rightFrom) return false;
  const leftTo = left.effectiveTo ? parseDate(left.effectiveTo) : null;
  const rightTo = right.effectiveTo ? parseDate(right.effectiveTo) : null;
  if (left.effectiveTo && !leftTo) return false;
  if (right.effectiveTo && !rightTo) return false;
  return leftFrom <= (rightTo ?? maxDate) && rightFrom <= (leftTo ?? maxDate);
}

const maxDate = new Date(8_640_000_000_000_000);

function parseDate(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPercentage(value: number | null | undefined): value is number {
  return isNonNegativeFinite(value) && value <= 100;
}

function isNonNegativeFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function hasValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

function normalizeKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function unique(values: string[]) {
  return [...new Set(values)];
}
