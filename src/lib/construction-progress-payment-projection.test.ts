import { describe, expect, it } from "vitest";

import { buildConstructionProgressPaymentProjectionDraft } from "./construction-progress-payment-projection";
import { calculateProgressPaymentTotals } from "./progress-payment-service";

describe("construction progress payment financial projection", () => {
  it("projects only current-period work, extra work and additions while folding deductions into retention", () => {
    const draft = buildConstructionProgressPaymentProjectionDraft({
      documentNo: "HAK-2026-02",
      periodEnd: new Date("2026-07-17T00:00:00.000Z"),
      description: "İkinci hakediş",
      periodDeductionTotal: 125,
      project: {
        paymentType: "Taşeron Hakedişi",
        counterpartyCode: "TAS-001",
        counterpartyName: "Örnek Taşeron",
        name: "Örnek Proje",
        siteCode: "SNT-001",
        siteName: "Örnek Şantiye",
      },
      snapshots: [
        {
          periodQuantity: 10,
          unitPrice: 100,
          vatRate: 10,
          contractItem: { description: "Beton imalatı", unit: "m3" },
        },
        {
          periodQuantity: 0,
          unitPrice: 500,
          vatRate: 10,
          contractItem: { description: "Önceki dönem işi", unit: "adet" },
        },
      ],
      extraWorks: [
        { documentNo: "TUT-01", description: "İlave imalat", quantity: 2, unit: "adet", unitPrice: 100, vatRate: 20 },
      ],
      financialMovements: [
        { movementType: "PRICE_DIFFERENCE", direction: "ADDITION", description: "Fiyat farkı", amount: 50 },
        { movementType: "ADVANCE", direction: "DEDUCTION", description: "Avans mahsubu", amount: 25 },
      ],
    });

    expect(draft.documentNo).toBe("HAK-2026-02");
    expect(draft.issueDate).toBe("2026-07-17");
    expect(draft.retentionRate).toBe(10);
    expect(draft.lines).toEqual([
      { description: "Beton imalatı", quantity: 10, unit: "m3", unitPrice: 100, vatRate: 10 },
      { description: "Tutanak TUT-01 - İlave imalat", quantity: 2, unit: "adet", unitPrice: 100, vatRate: 20 },
      { description: "PRICE_DIFFERENCE - Fiyat farkı", quantity: 1, unit: "TL", unitPrice: 50, vatRate: 0 },
    ]);
    expect(calculateProgressPaymentTotals(draft)).toMatchObject({
      grossTotal: 1250,
      retentionTotal: 125,
      netTotal: 1125,
      vatTotal: 126,
      grandTotal: 1251,
    });
  });
});
