import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "@/lib/tenant-scope";

const getActiveTenantScopeMock = vi.hoisted(() => vi.fn());
const ensureTenantScopeMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  auditLog: {
    create: vi.fn(),
  },
  bankIntegrationConnection: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  bankLedgerEntry: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
  bankTransaction: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  cashBankMovement: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
  entityRecord: {
    findMany: vi.fn(),
  },
  subscriptionInvoice: {
    findMany: vi.fn(),
  },
  tenantSubscription: {
    findFirst: vi.fn(),
  },
  tenantSubscriptionAddon: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/prisma-scope-bootstrap", () => ({
  ensureTenantScope: ensureTenantScopeMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/server-active-scope", () => ({
  getActiveTenantScope: getActiveTenantScopeMock,
}));

import {
  approveBankTransactionMatchAction,
  approveManualBankTransactionMatchAction,
  createCashBankMovementFromBankTransactionAction,
  createPartialCashBankMovementFromBankTransactionAction,
  ignoreBankTransactionAction,
  reopenBankTransactionMatchAction,
  reopenIgnoredBankTransactionAction,
  syncBankSandboxTransactionsAction,
  testBankSandboxConnectionAction,
} from "./bank-integration-actions";

const adminScope = {
  ...defaultTenantScope,
  userRole: "admin" as const,
};

const missingBankIntegrationGuardResult = {
  errors: ["Banka Entegrasyonu için Kurumsal pakete yükseltme gerekir."],
  featureLabel: "Banka Entegrasyonu",
  ok: false,
  requiredPlan: "Kurumsal",
};

describe("bank integration actions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
    getActiveTenantScopeMock.mockReset();
    ensureTenantScopeMock.mockReset();
    revalidatePathMock.mockReset();
    prismaMock.auditLog.create.mockReset();
    prismaMock.bankIntegrationConnection.findMany.mockReset();
    prismaMock.bankIntegrationConnection.upsert.mockReset();
    prismaMock.bankLedgerEntry.findFirst.mockReset();
    prismaMock.bankLedgerEntry.updateMany.mockReset();
    prismaMock.bankLedgerEntry.upsert.mockReset();
    prismaMock.bankTransaction.findMany.mockReset();
    prismaMock.bankTransaction.upsert.mockReset();
    prismaMock.cashBankMovement.create.mockReset();
    prismaMock.cashBankMovement.findMany.mockReset();
    prismaMock.cashBankMovement.updateMany.mockReset();
    prismaMock.cashBankMovement.upsert.mockReset();
    prismaMock.entityRecord.findMany.mockReset();
    prismaMock.subscriptionInvoice.findMany.mockReset();
    prismaMock.tenantSubscription.findFirst.mockReset();
    prismaMock.tenantSubscriptionAddon.findMany.mockReset();

    getActiveTenantScopeMock.mockResolvedValue(adminScope);
    prismaMock.tenantSubscription.findFirst.mockResolvedValue(null);
    prismaMock.subscriptionInvoice.findMany.mockResolvedValue([]);
    prismaMock.tenantSubscriptionAddon.findMany.mockResolvedValue([]);
    prismaMock.bankIntegrationConnection.findMany.mockResolvedValue([]);
    prismaMock.bankIntegrationConnection.upsert.mockImplementation(
      async ({ create }) => create,
    );
    prismaMock.bankTransaction.findMany.mockResolvedValue([]);
    prismaMock.cashBankMovement.findMany.mockResolvedValue([]);
    prismaMock.entityRecord.findMany.mockResolvedValue([]);
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("blocks sandbox bank connection when the active subscription lacks bank integration", async () => {
    const result = await testBankSandboxConnectionAction({
      bankCode: "isbank",
      consentId: "NOA-SANDBOX-001",
    });

    expect(result).toEqual(missingBankIntegrationGuardResult);
    expect(getActiveTenantScopeMock).toHaveBeenCalledOnce();
    expect(ensureTenantScopeMock).toHaveBeenCalledWith(prismaMock, adminScope);
    expect(prismaMock.tenantSubscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: adminScope.companyId,
          periodId: adminScope.periodId,
          status: "active",
          tenantId: adminScope.tenantId,
        }),
      }),
    );
    expect(prismaMock.bankIntegrationConnection.upsert).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test.each([
    {
      action: () => syncBankSandboxTransactionsAction("connection-isbank"),
      name: "sync sandbox transactions",
    },
    {
      action: () =>
        approveBankTransactionMatchAction({
          cashBankMovementId: "cash-movement-1",
          transactionId: "bank-transaction-1",
        }),
      name: "approve automatic match",
    },
    {
      action: () =>
        approveManualBankTransactionMatchAction({
          cashBankMovementId: "cash-movement-1",
          transactionId: "bank-transaction-1",
        }),
      name: "approve manual match",
    },
    {
      action: () =>
        createCashBankMovementFromBankTransactionAction("bank-transaction-1", {
          code: "KASA-0001",
          name: "MERKEZ KASA",
        }),
      name: "create cash bank movement",
    },
    {
      action: () =>
        createPartialCashBankMovementFromBankTransactionAction(
          "bank-transaction-1",
          "cash-movement-1",
          {
            code: "KASA-0001",
            name: "MERKEZ KASA",
          },
        ),
      name: "create partial cash bank movement",
    },
    {
      action: () => ignoreBankTransactionAction("bank-transaction-1"),
      name: "ignore transaction",
    },
    {
      action: () => reopenIgnoredBankTransactionAction("bank-transaction-1"),
      name: "reopen ignored transaction",
    },
    {
      action: () => reopenBankTransactionMatchAction("bank-transaction-1"),
      name: "reopen matched transaction",
    },
  ])(
    "blocks $name when the active subscription lacks bank integration",
    async ({ action }) => {
      const result = await action();

      expect(result).toEqual(missingBankIntegrationGuardResult);
      expect(prismaMock.bankIntegrationConnection.upsert).not.toHaveBeenCalled();
      expect(prismaMock.bankTransaction.upsert).not.toHaveBeenCalled();
      expect(prismaMock.bankLedgerEntry.upsert).not.toHaveBeenCalled();
      expect(prismaMock.bankLedgerEntry.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.cashBankMovement.create).not.toHaveBeenCalled();
      expect(prismaMock.cashBankMovement.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.cashBankMovement.upsert).not.toHaveBeenCalled();
      expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
      expect(revalidatePathMock).not.toHaveBeenCalled();
    },
  );

  test("allows sandbox bank connection when Kurumsal subscription is active", async () => {
    prismaMock.tenantSubscription.findFirst.mockResolvedValue({
      autoRenew: true,
      billingCycle: "monthly",
      endsAt: "2026-08-03T00:00:00.000Z",
      id: "sub-kurumsal",
      plan: {
        id: "kurumsal",
        name: "Kurumsal",
      },
      planId: "kurumsal",
      renewalAmount: 16900,
      startsAt: "2026-07-04T00:00:00.000Z",
      storageLimitGb: 100,
      userLimit: 75,
    });

    const result = await testBankSandboxConnectionAction({
      bankCode: "isbank",
      consentId: "NOA-SANDBOX-001",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        connection: expect.objectContaining({
          bankCode: "isbank",
          consentId: "NOA-SANDBOX-001",
          status: "connected",
        }),
      },
    });
    expect(prismaMock.bankIntegrationConnection.upsert).toHaveBeenCalledOnce();
    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("allows sandbox bank connection when bank integration add-on is active", async () => {
    prismaMock.tenantSubscription.findFirst.mockResolvedValue({
      autoRenew: true,
      billingCycle: "yearly",
      endsAt: "2027-06-30T00:00:00.000Z",
      id: "active-subscription-row",
      plan: {
        id: "profesyonel",
        name: "Profesyonel",
      },
      planId: "profesyonel",
      renewalAmount: 98604,
      startsAt: "2026-07-01T00:00:00.000Z",
      storageLimitGb: 25,
      userLimit: 25,
    });
    prismaMock.tenantSubscriptionAddon.findMany.mockResolvedValue([
      {
        addonId: "bank-integration",
        companyId: adminScope.companyId,
        createdAt: "2026-07-05T09:10:00.000Z",
        endsAt: "2027-06-30T00:00:00.000Z",
        id: "active-addon-row",
        monthlyPrice: 1290,
        periodId: adminScope.periodId,
        startsAt: "2026-07-05T00:00:00.000Z",
        status: "active",
        subscriptionId: "active-subscription-row",
        tenantId: adminScope.tenantId,
        updatedAt: "2026-07-05T09:10:00.000Z",
      },
    ]);

    const result = await testBankSandboxConnectionAction({
      bankCode: "isbank",
      consentId: "NOA-SANDBOX-ADDON-001",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        connection: expect.objectContaining({
          bankCode: "isbank",
          consentId: "NOA-SANDBOX-ADDON-001",
          status: "connected",
        }),
      },
    });
    expect(prismaMock.tenantSubscriptionAddon.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        companyId: adminScope.companyId,
        periodId: adminScope.periodId,
        status: "active",
        subscriptionId: "active-subscription-row",
        tenantId: adminScope.tenantId,
      }),
    });
    expect(prismaMock.bankIntegrationConnection.upsert).toHaveBeenCalledOnce();
    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });
});
