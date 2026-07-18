import { createProgressPaymentDraft, type ProgressPaymentDraft, type ProgressPaymentType } from "./progress-payment-service";

export type ConstructionProjectionSource = {
  documentNo: string;
  periodEnd: Date;
  description: string | null;
  periodDeductionTotal: unknown;
  project: { paymentType: string; counterpartyCode: string | null; counterpartyName: string | null; name: string; siteCode: string; siteName: string };
  snapshots: Array<{ periodQuantity: unknown; unitPrice: unknown; vatRate: unknown; contractItem: { description: string; unit: string } }>;
  extraWorks: Array<{ documentNo: string; description: string; quantity: unknown; unit: string; unitPrice: unknown; vatRate: unknown }>;
  financialMovements: Array<{ movementType: string; direction: string; description: string; amount: unknown }>;
};

export function buildConstructionProgressPaymentProjectionDraft(source: ConstructionProjectionSource): ProgressPaymentDraft {
  const lines = [
    ...source.snapshots.filter((snapshot) => Number(snapshot.periodQuantity) !== 0).map((snapshot) => ({ description: snapshot.contractItem.description, quantity: Number(snapshot.periodQuantity), unit: snapshot.contractItem.unit, unitPrice: Number(snapshot.unitPrice), vatRate: Number(snapshot.vatRate) })),
    ...source.extraWorks.map((work) => ({ description: `Tutanak ${work.documentNo} - ${work.description}`, quantity: Number(work.quantity), unit: work.unit, unitPrice: Number(work.unitPrice), vatRate: Number(work.vatRate) })),
    ...source.financialMovements.filter((movement) => movement.direction === "ADDITION").map((movement) => ({ description: `${movement.movementType} - ${movement.description}`, quantity: 1, unit: "TL", unitPrice: Number(movement.amount), vatRate: 0 })),
  ];
  const grossTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return createProgressPaymentDraft({
    documentNo: source.documentNo,
    issueDate: source.periodEnd.toISOString().slice(0, 10),
    paymentType: readPaymentType(source.project.paymentType),
    counterpartyCode: source.project.counterpartyCode || "CONSTRUCTION",
    counterpartyName: source.project.counterpartyName || source.project.name,
    siteCode: source.project.siteCode,
    siteName: source.project.siteName,
    retentionRate: grossTotal > 0 ? Number(source.periodDeductionTotal) / grossTotal * 100 : 0,
    description: source.description ?? "",
    lines,
  });
}

function readPaymentType(value: string): ProgressPaymentType { return value === "Şantiye Geliri" || value === "Tedarikçi Hakedişi" ? value : "Taşeron Hakedişi"; }
