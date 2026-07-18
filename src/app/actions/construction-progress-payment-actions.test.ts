import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const paymentFindFirst = vi.fn();
  const paymentUpdate = vi.fn();
  const approvalCreate = vi.fn();
  const approvalFindMany = vi.fn();
  const auditCreate = vi.fn();
  const auditFindMany = vi.fn();
  return {
    paymentFindFirst,
    paymentUpdate,
    approvalCreate,
    approvalFindMany,
    auditCreate,
    auditFindMany,
    revalidate: vi.fn(),
    context: vi.fn(),
    finalize: vi.fn(),
    prisma: {
      constructionProgressPayment: { findFirst: paymentFindFirst },
      constructionApprovalEvent: { findMany: approvalFindMany },
      auditLog: { findMany: auditFindMany },
      $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        constructionProgressPayment: { update: paymentUpdate },
        constructionApprovalEvent: { create: approvalCreate },
        auditLog: { create: auditCreate },
      })),
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/construction-progress-payment-finalization-prisma-adapter", () => ({ createConstructionProgressPaymentFinalizationPrismaAdapter: vi.fn(() => ({ finalize: mocks.finalize })) }));
vi.mock("./subscription-feature-action-guard", () => ({ getSubscriptionFeatureActionContext: mocks.context }));

import {
  approveConstructionProgressPaymentAction,
  listConstructionProgressPaymentAuditLogsAction,
  returnConstructionProgressPaymentAction,
  submitConstructionProgressPaymentAction,
} from "./construction-progress-payment-actions";

const scope = {
  tenantId: "tenant-construction",
  tenantName: "Tenant",
  companyId: "company-construction",
  companyName: "Company",
  periodId: "period-construction",
  periodLabel: "2026",
  userId: "accounting-user",
  userName: "Accounting",
  userRole: "accounting" as const,
  licenseLabel: "Kurumsal",
};

describe("construction progress payment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.mockResolvedValue({ ok: true, scope });
    mocks.approvalCreate.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
  });

  it("records submit, return, resubmit and approve transitions in approval and central audit logs", async () => {
    let status = "DRAFT";
    const row = () => ({ id: "construction-payment-2", projectId: "project-1", sequenceNo: 2, kind: "INTERIM", documentNo: "HAK-002", status, snapshots: [], project: {} });
    mocks.paymentFindFirst.mockImplementation(async () => row());
    mocks.paymentUpdate.mockImplementation(async ({ data }: { data: { status: string } }) => { status = data.status; return row(); });

    expect(await submitConstructionProgressPaymentAction("construction-payment-2")).toEqual({ ok: true, data: { id: "construction-payment-2", status: "SUBMITTED" } });
    expect((await returnConstructionProgressPaymentAction("construction-payment-2", "Metraj düzeltmesi")).ok).toBe(true);
    expect((await submitConstructionProgressPaymentAction("construction-payment-2")).ok).toBe(true);
    expect((await approveConstructionProgressPaymentAction("construction-payment-2")).ok).toBe(true);
    expect(status).toBe("APPROVED");

    expect(mocks.approvalCreate).toHaveBeenCalledTimes(4);
    expect(mocks.auditCreate.mock.calls.map(([input]) => input.data.action)).toEqual([
      "construction-progress-payment.submitted",
      "construction-progress-payment.returned",
      "construction-progress-payment.submitted",
      "construction-progress-payment.approved",
    ]);
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      tenantId: scope.tenantId,
      companyId: scope.companyId,
      periodId: scope.periodId,
      entityId: "construction-payment-2",
      entityType: "construction-progress-payment",
      metadata: expect.objectContaining({ statusFrom: "SUBMITTED", statusTo: "RETURNED", reason: "Metraj düzeltmesi" }),
    }) });

    await approveConstructionProgressPaymentAction("construction-payment-2");
    expect(mocks.auditCreate).toHaveBeenCalledTimes(4);
  });

  it("lists approval and central audit rows only after resolving the scoped payment", async () => {
    mocks.paymentFindFirst.mockResolvedValue({ id: "construction-payment-2" });
    mocks.approvalFindMany.mockResolvedValue([{ id: "approval-1", statusFrom: "DRAFT", statusTo: "SUBMITTED", actorUserId: scope.userId, reason: null, createdAt: new Date("2026-07-17T10:00:00.000Z") }]);
    mocks.auditFindMany.mockResolvedValue([{ id: "audit-1", action: "construction-progress-payment.submitted", actorUserId: scope.userId, entityLabel: "HAK-002", metadata: { statusFrom: "DRAFT", statusTo: "SUBMITTED" }, occurredAt: new Date("2026-07-17T10:00:00.000Z") }]);

    const result = await listConstructionProgressPaymentAuditLogsAction("construction-payment-2");

    expect(result).toMatchObject({ ok: true, data: { rows: [{ id: "approval-1", statusTo: "SUBMITTED" }], auditLogs: [{ id: "audit-1", action: "construction-progress-payment.submitted" }] } });
    expect(mocks.auditFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { entityId: "construction-payment-2", entityType: "construction-progress-payment", tenantId: scope.tenantId, companyId: scope.companyId, periodId: scope.periodId } }));
  });
});
