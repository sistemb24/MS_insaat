import { beforeEach, describe, expect, test, vi } from "vitest";

import { defaultTenantScope } from "@/lib/tenant-scope";

const getActiveTenantScopeMock = vi.hoisted(() => vi.fn());
const ensureTenantScopeMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  auditLog: {
    create: vi.fn(),
  },
  subscriptionAddon: {
    upsert: vi.fn(),
  },
  subscriptionInvoice: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  subscriptionPlan: {
    upsert: vi.fn(),
  },
  tenantSubscription: {
    create: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  tenantSubscriptionAddon: {
    upsert: vi.fn(),
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
  activateSubscriptionAddonCheckoutAction,
  activateSubscriptionPlanChangeAction,
  createSubscriptionAddonCheckoutAction,
  createSubscriptionPlanChangeCheckoutAction,
  failSubscriptionAddonCheckoutAction,
  failSubscriptionPlanChangeCheckoutAction,
  failSubscriptionRenewalCheckoutAction,
  listSubscriptionOverviewAction,
  requireSubscriptionFeatureAction,
} from "./subscription-actions";

describe("subscription actions", () => {
  beforeEach(() => {
    getActiveTenantScopeMock.mockReset();
    ensureTenantScopeMock.mockReset();
    revalidatePathMock.mockReset();
    prismaMock.auditLog.create.mockReset();
    prismaMock.subscriptionAddon.upsert.mockReset();
    prismaMock.subscriptionPlan.upsert.mockReset();
    prismaMock.tenantSubscriptionAddon.upsert.mockReset();
    prismaMock.tenantSubscription.create.mockReset();
    prismaMock.tenantSubscription.updateMany.mockReset();
    prismaMock.tenantSubscription.findFirst.mockReset();
    prismaMock.subscriptionInvoice.findMany.mockReset();
    prismaMock.subscriptionInvoice.upsert.mockReset();
    getActiveTenantScopeMock.mockResolvedValue(defaultTenantScope);
    prismaMock.tenantSubscription.findFirst.mockResolvedValue(null);
    prismaMock.subscriptionInvoice.findMany.mockResolvedValue([]);
    prismaMock.subscriptionPlan.upsert.mockResolvedValue({});
    prismaMock.tenantSubscription.create.mockResolvedValue({});
    prismaMock.tenantSubscription.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.subscriptionInvoice.upsert.mockResolvedValue({});
    prismaMock.subscriptionAddon.upsert.mockResolvedValue({});
    prismaMock.tenantSubscriptionAddon.upsert.mockResolvedValue({});
  });

  test("loads subscription overview through the active tenant scope bridge", async () => {
    const result = await listSubscriptionOverviewAction();

    expect(getActiveTenantScopeMock).toHaveBeenCalledOnce();
    expect(ensureTenantScopeMock).toHaveBeenCalledWith(
      prismaMock,
      defaultTenantScope,
    );
    expect(prismaMock.tenantSubscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          status: "active",
          tenantId: defaultTenantScope.tenantId,
        }),
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.data.overview.currentSubscription.planName).toBe("Profesyonel");
    expect(result.data.overview.integrationMode).toBe("read-model");
    expect(result.data.scope.tenantId).toBe(defaultTenantScope.tenantId);
  });

  test("loads persisted subscription data without changing the page contract", async () => {
    prismaMock.tenantSubscription.findFirst.mockResolvedValue({
      autoRenew: false,
      billingCycle: "monthly",
      endsAt: "2026-08-31T00:00:00.000Z",
      id: "sub-kurumsal",
      plan: {
        id: "kurumsal",
        name: "Kurumsal",
      },
      planId: "kurumsal",
      renewalAmount: 16900,
      startsAt: "2026-08-01T00:00:00.000Z",
      storageLimitGb: 100,
      userLimit: 75,
    });
    prismaMock.subscriptionInvoice.findMany.mockResolvedValue([
      {
        amount: 16900,
        currency: "TRY",
        id: "invoice-2026-008",
        invoiceDate: "2026-08-01T00:00:00.000Z",
        invoiceNo: "INV-2026-008",
        method: "Kredi Kartı",
        status: "pending",
      },
    ]);

    const result = await listSubscriptionOverviewAction();

    expect(result.data.overview.integrationMode).toBe("persistence-read");
    expect(result.data.overview.currentSubscription.planName).toBe("Kurumsal");
    expect(result.data.overview.paymentHistory).toEqual([
      expect.objectContaining({
        invoiceNo: "INV-2026-008",
        status: "Bekliyor",
      }),
    ]);
  });

  test("returns action-friendly subscription guard decisions", async () => {
    await expect(
      requireSubscriptionFeatureAction("document-center"),
    ).resolves.toEqual({ ok: true });
    await expect(requireSubscriptionFeatureAction("ai-analysis")).resolves.toEqual({
      ok: false,
      errors: ["AI Analiz için Kurumsal pakete yükseltme gerekir."],
      featureLabel: "AI Analiz",
      requiredPlan: "Kurumsal",
    });
  });

  test("creates a package change checkout draft through the server action bridge", async () => {
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

    const result = await createSubscriptionPlanChangeCheckoutAction({
      billingCycle: "monthly",
      targetPlanId: "kurumsal",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        checkout: expect.objectContaining({
          amount: 16900,
          currentPlanName: "Profesyonel",
          invoiceDraft: expect.objectContaining({
            amount: 16900,
            method: "Ödeme sağlayıcı seçilecek",
            status: "Bekliyor",
          }),
          providerSession: expect.objectContaining({
            provider: "sandbox",
            providerRef: expect.stringMatching(
              /^sandbox-subscription-SUB-\d{8}-KURUMSAL-MONTHLY$/,
            ),
            redirectUrl: expect.stringContaining(
              "providerRef=sandbox-subscription-SUB-",
            ),
            status: "created",
          }),
          status: "provider-pending",
          targetPlanName: "Kurumsal",
        }),
      },
    });
    if (!result.ok) {
      throw new Error(result.errors.join(" "));
    }
    const providerRef = `sandbox-subscription-${result.data.checkout.invoiceDraft.invoiceNo}`;
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "subscription.checkout-draft.create",
        companyId: defaultTenantScope.companyId,
        entityType: "subscription",
        metadata: expect.objectContaining({
          amount: 16900,
          billingCycle: "monthly",
          paymentProvider: "sandbox",
          paymentProviderRef: providerRef,
          paymentProviderStatus: "created",
          planFrom: "profesyonel",
          planTo: "kurumsal",
        }),
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      }),
    });
    expect(prismaMock.subscriptionInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          invoiceNo: result.data.checkout.invoiceDraft.invoiceNo,
          method: "Ödeme sağlayıcı seçilecek",
          providerRef,
          status: "pending",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          providerRef,
          status: "pending",
          subscriptionId: "active-subscription-row",
        }),
        where: {
          tenantId_companyId_periodId_invoiceNo: {
            companyId: defaultTenantScope.companyId,
            invoiceNo: result.data.checkout.invoiceDraft.invoiceNo,
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("activates a plan change through the sandbox payment action bridge", async () => {
    const result = await activateSubscriptionPlanChangeAction({
      billingCycle: "monthly",
      invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
      paymentProviderRef: "sandbox-payment-001",
      targetPlanId: "kurumsal",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invoice: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          providerRef: "sandbox-payment-001",
          status: "paid",
        }),
        subscription: expect.objectContaining({
          planId: "kurumsal",
          status: "active",
        }),
      },
    });
    expect(prismaMock.subscriptionPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "kurumsal" },
      }),
    );
    expect(prismaMock.tenantSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          status: "active",
          tenantId: defaultTenantScope.tenantId,
        }),
      }),
    );
    expect(prismaMock.tenantSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planId: "kurumsal",
          status: "active",
        }),
      }),
    );
    expect(prismaMock.subscriptionInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          providerRef: "sandbox-payment-001",
          status: "paid",
        }),
        update: expect.objectContaining({
          providerRef: "sandbox-payment-001",
          status: "paid",
        }),
        where: {
          tenantId_companyId_periodId_invoiceNo: {
            companyId: defaultTenantScope.companyId,
            invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "subscription.plan-change.activate",
        entityType: "subscription",
        metadata: expect.objectContaining({
          paymentProviderRef: "sandbox-payment-001",
          planFrom: "profesyonel",
          planTo: "kurumsal",
          statusTo: "active",
        }),
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("creates an add-on checkout draft through the server action bridge", async () => {
    const result = await createSubscriptionAddonCheckoutAction({
      addonId: "bank-integration",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        checkout: expect.objectContaining({
          addonId: "bank-integration",
          addonName: "Banka Entegrasyonu",
          amount: 1290,
          currency: "TRY",
          invoiceDraft: expect.objectContaining({
            amount: 1290,
            method: "Ödeme sağlayıcı seçilecek",
            status: "Bekliyor",
          }),
          providerSession: expect.objectContaining({
            provider: "sandbox",
            providerRef: expect.stringMatching(
              /^sandbox-subscription-ADD-\d{8}-BANK-INTEGRATION-MONTHLY$/,
            ),
            redirectUrl: expect.stringContaining(
              "providerRef=sandbox-subscription-ADD-",
            ),
            status: "created",
          }),
          status: "provider-pending",
        }),
      },
    });
    expect(prismaMock.subscriptionInvoice.upsert).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "subscription.addon-checkout-draft.create",
        entityLabel: "Banka Entegrasyonu",
        entityType: "subscription",
        metadata: expect.objectContaining({
          addonId: "bank-integration",
          amount: 1290,
          currency: "TL",
          paymentProvider: "sandbox",
          paymentProviderRef: expect.stringMatching(
            /^sandbox-subscription-ADD-\d{8}-BANK-INTEGRATION-MONTHLY$/,
          ),
          paymentProviderStatus: "created",
        }),
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("persists an add-on checkout invoice draft through the server action bridge", async () => {
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

    const result = await createSubscriptionAddonCheckoutAction({
      addonId: "bank-integration",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        checkout: expect.objectContaining({
          addonId: "bank-integration",
          addonName: "Banka Entegrasyonu",
          invoiceDraft: expect.objectContaining({
            method: "Ödeme sağlayıcı seçilecek",
            status: "Bekliyor",
          }),
        }),
      },
    });
    if (!result.ok) {
      throw new Error(result.errors.join(" "));
    }
    const providerRef = `sandbox-subscription-${result.data.checkout.invoiceDraft.invoiceNo}`;
    expect(result.data.checkout.providerSession).toEqual(
      expect.objectContaining({
        provider: "sandbox",
        providerRef,
        redirectUrl: expect.stringContaining(
          `providerRef=${encodeURIComponent(providerRef)}`,
        ),
      }),
    );
    expect(prismaMock.subscriptionInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          amount: 1290,
          invoiceNo: result.data.checkout.invoiceDraft.invoiceNo,
          method: "Ödeme sağlayıcı seçilecek",
          providerRef,
          status: "pending",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          amount: 1290,
          method: "Ödeme sağlayıcı seçilecek",
          providerRef,
          status: "pending",
          subscriptionId: "active-subscription-row",
        }),
        where: {
          tenantId_companyId_periodId_invoiceNo: {
            companyId: defaultTenantScope.companyId,
            invoiceNo: result.data.checkout.invoiceDraft.invoiceNo,
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("activates an add-on checkout through the sandbox payment action bridge", async () => {
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

    const result = await activateSubscriptionAddonCheckoutAction({
      addonId: "bank-integration",
      invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
      paymentProviderRef: "sandbox-addon-payment-001",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        addon: expect.objectContaining({
          addonId: "bank-integration",
          status: "active",
          subscriptionId: "active-subscription-row",
        }),
        invoice: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
          subscriptionId: "active-subscription-row",
        }),
      },
    });
    expect(prismaMock.subscriptionAddon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bank-integration" },
      }),
    );
    expect(prismaMock.tenantSubscriptionAddon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          addonId: "bank-integration",
          status: "active",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          monthlyPrice: 1290,
          status: "active",
        }),
      }),
    );
    expect(prismaMock.subscriptionInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          method: "Sandbox ödeme onayı",
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
          subscriptionId: "active-subscription-row",
        }),
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "subscription.addon.activate",
        entityType: "subscription",
        metadata: expect.objectContaining({
          addonId: "bank-integration",
          paymentProviderRef: "sandbox-addon-payment-001",
          statusTo: "active",
        }),
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("marks a sandbox checkout payment failure without activating a package", async () => {
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

    const result = await failSubscriptionPlanChangeCheckoutAction({
      amount: 16900,
      invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
      paymentProviderRef: "sandbox-failure-001",
      reason: "Kart reddedildi",
      targetPlanId: "kurumsal",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invoice: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          providerRef: "sandbox-failure-001",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
      },
    });
    expect(prismaMock.tenantSubscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.tenantSubscription.create).not.toHaveBeenCalled();
    expect(prismaMock.subscriptionInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          method: "Ödeme sağlayıcı hata döndü",
          providerRef: "sandbox-failure-001",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          method: "Ödeme sağlayıcı hata döndü",
          providerRef: "sandbox-failure-001",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
        where: {
          tenantId_companyId_periodId_invoiceNo: {
            companyId: defaultTenantScope.companyId,
            invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "subscription.checkout-payment.fail",
        entityType: "subscription",
        metadata: expect.objectContaining({
          failureReason: "Kart reddedildi",
          paymentProviderRef: "sandbox-failure-001",
          statusTo: "failed",
        }),
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });

  test("marks a sandbox renewal payment failure without changing the subscription", async () => {
    prismaMock.tenantSubscription.findFirst.mockResolvedValue({
      autoRenew: false,
      billingCycle: "yearly",
      endsAt: "2027-06-30T00:00:00.000Z",
      id: "active-subscription-row",
      plan: { id: "profesyonel", name: "Profesyonel" },
      planId: "profesyonel",
      renewalAmount: 98604,
      startsAt: "2026-07-01T00:00:00.000Z",
      storageLimitGb: 25,
      userLimit: 25,
    });

    const result = await failSubscriptionRenewalCheckoutAction({
      amount: 98604,
      invoiceNo: "REN-20260712-PROFESYONEL-YEARLY",
      paymentProviderRef: "sandbox-renewal-failure-001",
      reason: "Kart reddedildi",
    });

    expect(result).toEqual({ ok: true, data: { invoice: expect.objectContaining({ status: "failed", providerRef: "sandbox-renewal-failure-001", subscriptionId: "active-subscription-row" }) } });
    expect(prismaMock.tenantSubscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.tenantSubscription.create).not.toHaveBeenCalled();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "subscription.renewal-checkout-payment.fail" }) });
  });

  test("marks a sandbox add-on payment failure without activating an add-on", async () => {
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

    const result = await failSubscriptionAddonCheckoutAction({
      addonId: "bank-integration",
      amount: 1290,
      invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
      paymentProviderRef:
        "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
      reason: "Sandbox ek özellik ödeme sağlayıcı hata simülasyonu",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invoice: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          providerRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
      },
    });
    expect(prismaMock.tenantSubscriptionAddon.upsert).not.toHaveBeenCalled();
    expect(prismaMock.subscriptionInvoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          method: "Ödeme sağlayıcı hata döndü",
          providerRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          method: "Ödeme sağlayıcı hata döndü",
          providerRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "subscription.addon-checkout-payment.fail",
        entityType: "subscription",
        metadata: expect.objectContaining({
          addonId: "bank-integration",
          failureReason: "Sandbox ek özellik ödeme sağlayıcı hata simülasyonu",
          paymentProviderRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          statusTo: "failed",
        }),
      }),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/abonelik");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ayarlar");
    expect(revalidatePathMock).toHaveBeenCalledWith("/[module]", "page");
  });
});



