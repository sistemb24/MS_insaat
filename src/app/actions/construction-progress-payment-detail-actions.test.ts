import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  paymentFindFirst: vi.fn(),
  applicationFindFirst: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  constructionProgressPayment: { findFirst: mocks.paymentFindFirst },
  constructionDeductionRuleApplication: { findFirst: mocks.applicationFindFirst },
  $transaction: mocks.transaction,
} }));
vi.mock("./subscription-feature-action-guard", () => ({ getSubscriptionFeatureActionContext: mocks.context }));

import { deleteConstructionProgressPaymentDetailAction } from "./construction-progress-payment-detail-actions";

const scope = { tenantId: "tenant-1", companyId: "company-1", periodId: "period-1", userId: "accounting-1", userRole: "accounting" };

describe("construction progress payment detail actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ ok: true, scope });
    mocks.paymentFindFirst.mockResolvedValue({ id: "payment-1", projectId: "project-1", status: "DRAFT" });
  });

  it("does not allow a generated rule movement to be deleted as a manual deduction", async () => {
    mocks.applicationFindFirst.mockResolvedValue({ id: "application-1" });

    await expect(deleteConstructionProgressPaymentDetailAction({ progressPaymentId: "payment-1", detailId: "movement-1", detailType: "DEDUCTION" })).resolves.toEqual({
      ok: false,
      errors: ["Kural kaynaklı kesinti hareketi manuel silinemez; ters kayıt yaşam döngüsü kullanılmalıdır."],
    });
    expect(mocks.applicationFindFirst).toHaveBeenCalledWith({ where: { deductionMovementId: "movement-1", progressPaymentId: "payment-1", tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }, select: { id: true } });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
