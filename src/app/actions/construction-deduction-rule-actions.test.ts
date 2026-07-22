import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const projectFindFirst = vi.fn();
  const periodFindFirst = vi.fn();
  const ruleFindFirst = vi.fn();
  const ruleFindMany = vi.fn();
  const ruleCreate = vi.fn();
  const ruleUpdateMany = vi.fn();
  const auditCreate = vi.fn();
  const transaction = { period: { findFirst: periodFindFirst }, constructionDeductionRule: { create: ruleCreate, updateMany: ruleUpdateMany }, auditLog: { create: auditCreate } };
  return {
    context: vi.fn(), preview: vi.fn(), apply: vi.fn(), revalidate: vi.fn(),
    projectFindFirst, periodFindFirst, ruleFindFirst, ruleFindMany, ruleCreate, ruleUpdateMany, auditCreate,
    prisma: { constructionProject: { findFirst: projectFindFirst }, period: { findFirst: periodFindFirst }, constructionDeductionRule: { findFirst: ruleFindFirst, findMany: ruleFindMany }, $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback(transaction)) },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/construction-deduction-rule-application-prisma-adapter", () => ({
  createConstructionDeductionRuleApplicationPrismaAdapter: () => ({
    preview: mocks.preview,
    apply: mocks.apply,
  }),
}));
vi.mock("./subscription-feature-action-guard", () => ({
  getSubscriptionFeatureActionContext: mocks.context,
}));

import {
  applyConstructionDeductionRulesAction,
  createConstructionDeductionRuleRevisionAction,
  deactivateConstructionDeductionRuleAction,
  listConstructionDeductionRulesAction,
  previewConstructionDeductionRulesAction,
} from "./construction-deduction-rule-actions";

const scope = {
  tenantId: "tenant-1",
  companyId: "company-1",
  periodId: "period-1",
  userId: "accounting-1",
  userRole: "accounting",
};

describe("construction deduction rule actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ ok: true, scope });
    mocks.projectFindFirst.mockResolvedValue({ id: "project-1", status: "OPEN" });
    mocks.periodFindFirst.mockResolvedValue({ isClosed: false });
    mocks.ruleUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({});
  });

  it("keeps preview read-only and revalidates only a successful apply", async () => {
    mocks.preview.mockResolvedValue({ ok: true, data: { rows: [] } });
    mocks.apply
      .mockResolvedValueOnce({ ok: false, errors: ["Kapalı dönem"] })
      .mockResolvedValueOnce({ ok: true, data: { rows: [] } });

    await previewConstructionDeductionRulesAction("payment-1");
    await applyConstructionDeductionRulesAction("payment-1");
    await applyConstructionDeductionRulesAction("payment-1");

    expect(mocks.preview).toHaveBeenCalledWith({ paymentId: "payment-1", scope });
    expect(mocks.revalidate).toHaveBeenCalledOnce();
    expect(mocks.revalidate).toHaveBeenCalledWith("/hakedis");
  });

  it("returns the subscription guard result without invoking the adapter", async () => {
    const denied = { ok: false, errors: ["Paket özelliği kapalı"] };
    mocks.context.mockResolvedValue({ ok: false, result: denied });

    expect(await applyConstructionDeductionRulesAction("payment-1")).toBe(denied);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it("lists project rules with full tenant, company and period scope", async () => {
    mocks.ruleFindMany.mockResolvedValue([ruleRecord()]);
    mocks.context.mockResolvedValue({ ok: true, scope: { ...scope, userRole: "admin" } });

    const result = await listConstructionDeductionRulesAction("project-1");

    expect(result).toMatchObject({ ok: true, data: { canManage: true, rows: [{ code: "TEMINAT", rate: 5 }] } });
    expect(mocks.ruleFindMany).toHaveBeenCalledWith({ where: { projectId: "project-1", tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }, orderBy: [{ code: "asc" }, { revisionNo: "desc" }] });
  });

  it("closes the previous effective range and creates an audited append-only revision", async () => {
    const previous = ruleRecord();
    mocks.context.mockResolvedValue({ ok: true, scope: { ...scope, userRole: "admin" } });
    mocks.ruleFindFirst.mockResolvedValue(previous);
    mocks.ruleCreate.mockImplementation(async ({ data }) => ({ ...previous, ...data }));

    const result = await createConstructionDeductionRuleRevisionAction({
      projectId: "project-1", supersedesRuleId: previous.id, code: previous.code, name: "Teminat Kesintisi", category: "TEMINAT", calculationType: "RATE", baseType: "PERIOD_NET_PLUS_EXTRAS", rate: 6, taxMode: "NONE", taxRate: 0, priority: 10, effectiveFrom: "2026-08-01",
    });

    expect(result).toMatchObject({ ok: true, data: { revisionNo: 2, rate: 6 } });
    expect(mocks.ruleUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "rule-1", tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId }), data: expect.objectContaining({ effectiveTo: new Date("2026-07-31T23:59:59.999Z") }) }));
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "construction-deduction-rule.revised", entityType: "construction-deduction-rule", metadata: expect.objectContaining({ revisionNo: 2, supersedesRuleId: "rule-1" }) }) });
    expect(mocks.revalidate).toHaveBeenCalledWith("/hakedis");
  });

  it("rejects rule management for accounting users and closed periods", async () => {
    const draft = { projectId: "project-1", code: "STOPAJ", name: "Stopaj", category: "STOPAJ", calculationType: "RATE" as const, baseType: "PERIOD_NET" as const, rate: 3, taxMode: "NONE" as const, priority: 20, effectiveFrom: "2026-08-01" };
    await expect(createConstructionDeductionRuleRevisionAction(draft)).resolves.toEqual({ ok: false, errors: ["Kesinti kuralı yönetimi için yönetici yetkisi gereklidir."] });

    mocks.context.mockResolvedValue({ ok: true, scope: { ...scope, userRole: "admin" } });
    mocks.periodFindFirst.mockResolvedValue({ isClosed: true });
    await expect(deactivateConstructionDeductionRuleAction({ projectId: "project-1", ruleId: "rule-1" })).resolves.toEqual({ ok: false, errors: ["Kapalı dönemde kesinti kuralı değiştirilemez."] });
    expect(mocks.ruleUpdateMany).not.toHaveBeenCalled();
  });
});

function ruleRecord() {
  return { id: "rule-1", ruleKey: "retention:project-1", code: "TEMINAT", name: "Teminat Kesintisi", category: "TEMINAT", description: null, revisionNo: 1, calculationType: "RATE", baseType: "PERIOD_NET_PLUS_EXTRAS", rate: 5, fixedAmount: null, minimumAmount: null, maximumAmount: null, taxMode: "NONE", taxRate: 0, priority: 10, effectiveFrom: new Date("2026-01-01T00:00:00.000Z"), effectiveTo: null, isActive: true, autoApply: false, supersedesRuleId: null, createdBy: scope.userId, updatedBy: scope.userId, createdAt: new Date("2026-01-01T00:00:00.000Z"), updatedAt: new Date("2026-01-01T00:00:00.000Z") };
}
