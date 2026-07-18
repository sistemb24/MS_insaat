import { describe, expect, test } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  activateSubscriptionAddonCheckout,
  activateSubscriptionPlanChange,
  activateSubscriptionRenewal,
  canUseSubscriptionFeature,
  createSubscriptionAddonCheckout,
  createSubscriptionPlanChangeCheckout,
  createSubscriptionRenewalCheckout,
  failSubscriptionAddonCheckout,
  failSubscriptionPlanChangeCheckout,
  failSubscriptionRenewalCheckout,
  listSubscriptionFeatureAccessRows,
  listSubscriptionOverview,
  requireSubscriptionFeature,
} from "./subscription-service";

describe("subscription service", () => {
  test("enables every guarded feature for the development demo Kurumsal subscription", () => {
    const base = listSubscriptionOverview();
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...base.currentSubscription,
        planId: "kurumsal",
        planName: "Kurumsal",
        subscriptionId: "demo-kurumsal-subscription",
      },
    });

    expect(listSubscriptionFeatureAccessRows(overview).every((feature) => feature.enabled)).toBe(true);
    expect(overview.currentSubscription.planId).toBe("kurumsal");
  });
  test("records renewal payment failure with renewal-specific audit action", async () => {
    const audits: unknown[] = [];
    const invoices: unknown[] = [];
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...listSubscriptionOverview().currentSubscription,
        subscriptionId: "subscription-row",
      },
    });
    const result = await failSubscriptionRenewalCheckout({
      amount: 9900,
      auditLogRepository: { async record(entry) { audits.push(entry); } },
      invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY",
      now: () => "2026-07-12T11:00:00.000Z",
      overview,
      paymentProviderRef: "provider-renewal-failed",
      repository: { async markCheckoutInvoicePaymentFailed(input) { invoices.push(input.invoice); return input.invoice; } },
      scope: defaultTenantScope,
    });
    expect(result).toEqual({ ok: true, data: { invoice: expect.objectContaining({ status: "failed", providerRef: "provider-renewal-failed" }) } });
    expect(audits).toEqual([expect.objectContaining({ action: "subscription.renewal-checkout-payment.fail" })]);
    expect(invoices).toHaveLength(1);
  });

  test("reuses an existing failed renewal invoice without repeating side effects", async () => {
    const base = listSubscriptionOverview();
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...base.currentSubscription,
        subscriptionId: "subscription-row",
      },
      paymentHistory: [
        {
          amount: 9900,
          date: "2026-07-12",
          id: "invoice-failed",
          invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY",
          method: "Ödeme sağlayıcı hata döndü",
          providerRef: "provider-failed",
          status: "Başarısız",
        },
      ],
    });
    const audits: unknown[] = [];
    const invoices: unknown[] = [];
    const result = await failSubscriptionRenewalCheckout({
      amount: 9900,
      auditLogRepository: { async record(entry) { audits.push(entry); } },
      invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY",
      now: () => "2026-07-12T11:00:00.000Z",
      overview,
      repository: { async markCheckoutInvoicePaymentFailed(input) { invoices.push(input.invoice); return input.invoice; } },
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: { invoice: expect.objectContaining({ id: "invoice-failed", status: "failed", providerRef: "provider-failed" }) },
    });
    expect(audits).toHaveLength(0);
    expect(invoices).toHaveLength(0);
  });
  test("creates and activates a scoped manual renewal without replacing the subscription", async () => {
    const base = listSubscriptionOverview();
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...base.currentSubscription,
        autoRenew: false,
        endsAt: "2026-07-31",
        subscriptionId: "subscription-row",
      },
    });
    const drafts: unknown[] = [];
    const checkout = await createSubscriptionRenewalCheckout({
      billingCycle: "monthly",
      now: () => "2026-07-12T10:00:00.000Z",
      overview,
      repository: { async createCheckoutInvoiceDraft(input) { drafts.push(input); return input.invoice; } },
      scope: defaultTenantScope,
    });

    expect(checkout).toEqual({ ok: true, data: { checkout: expect.objectContaining({
      amount: 9900,
      invoiceDraft: expect.objectContaining({ invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY" }),
      targetPlanId: "profesyonel",
    }) } });
    expect(drafts).toEqual([expect.objectContaining({ invoice: expect.objectContaining({
      status: "pending",
      subscriptionId: "subscription-row",
    }) })]);

    const renewals: unknown[] = [];
    const result = await activateSubscriptionRenewal({
      billingCycle: "monthly",
      invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY",
      now: () => "2026-07-12T10:05:00.000Z",
      overview,
      paymentProviderRef: "sandbox-renewal-1",
      repository: { async renewSubscription(input) { renewals.push(input); return { invoice: input.invoice, subscription: input.subscription }; } },
      scope: defaultTenantScope,
    });

    expect(result).toEqual({ ok: true, data: {
      invoice: expect.objectContaining({ providerRef: "sandbox-renewal-1", status: "paid" }),
      subscription: expect.objectContaining({ id: "subscription-row", startsAt: base.currentSubscription.startsAt, endsAt: "2026-08-30", autoRenew: false }),
    } });
    expect(renewals).toHaveLength(1);
  });

  test("reuses an existing pending renewal checkout for the same day and cycle", async () => {
    const base = listSubscriptionOverview();
    const invoiceNo = "REN-20260712-PROFESYONEL-MONTHLY";
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...base.currentSubscription,
        subscriptionId: "subscription-row",
      },
      paymentHistory: [
        {
          amount: 9900,
          date: "2026-07-12",
          id: "invoice-pending",
          invoiceNo,
          method: "Ödeme sağlayıcı seçilecek",
          providerRef: null,
          status: "Bekliyor",
        },
      ],
    });
    const drafts: unknown[] = [];
    const providerSessions: unknown[] = [];
    const result = await createSubscriptionRenewalCheckout({
      billingCycle: "monthly",
      now: () => "2026-07-12T15:00:00.000Z",
      overview,
      paymentProvider: {
        async createCheckoutSession(input) {
          providerSessions.push(input);
          return {
            provider: "sandbox",
            providerRef: "should-not-be-created",
            redirectUrl: "https://sandbox.invalid/checkout",
            expiresAt: "2026-07-12T15:15:00.000Z",
            status: "created",
          };
        },
      },
      repository: {
        async createCheckoutInvoiceDraft(input) {
          drafts.push(input);
          return input.invoice;
        },
      },
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        checkout: expect.objectContaining({
          invoiceDraft: expect.objectContaining({ invoiceNo }),
          status: "provider-pending",
        }),
      },
    });
    expect(providerSessions).toHaveLength(0);
    expect(drafts).toHaveLength(0);
  });

  test("renews an expired subscription from today and rejects viewers", async () => {
    const base = listSubscriptionOverview();
    const overview = listSubscriptionOverview({ currentSubscription: { ...base.currentSubscription, endsAt: "2026-07-01", subscriptionId: "subscription-row" } });
    const repository = { async renewSubscription(input: Parameters<import("./subscription-service").SubscriptionRenewalRepository["renewSubscription"]>[0]) { return { invoice: input.invoice, subscription: input.subscription }; } };
    await expect(activateSubscriptionRenewal({ billingCycle: "monthly", invoiceNo: "REN-1", now: () => "2026-07-12T00:00:00.000Z", overview, repository, scope: defaultTenantScope })).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({ subscription: expect.objectContaining({ endsAt: "2026-08-11" }) }),
    });
    await expect(createSubscriptionRenewalCheckout({ billingCycle: "monthly", overview, scope: { ...defaultTenantScope, userRole: "viewer" } })).resolves.toEqual({ ok: false, errors: ["Abonelik yenileme admin veya muhasebe rolü gerektirir."] });
  });
  test("builds the P2-S2 plan catalog from the approved NOA package structure", () => {
    const overview = listSubscriptionOverview();

    expect(overview.currentSubscription.planName).toBe("Profesyonel");
    expect(overview.plans.map((plan) => plan.name)).toEqual([
      "Başlangıç",
      "Standart",
      "Profesyonel",
      "Kurumsal",
    ]);
    expect(overview.plans.find((plan) => plan.name === "Kurumsal")?.includedModules).toContain(
      "Banka Entegrasyonu",
    );
    expect(overview.plans.find((plan) => plan.name === "Kurumsal")?.includedModules).toContain(
      "Araç/Filo",
    );
  });

  test("exposes add-ons and payment history without opening payment provider writes", () => {
    const overview = listSubscriptionOverview();

    expect(overview.addons.map((addon) => addon.name)).toEqual([
      "Döküman Yönetimi (+5GB)",
      "E-Fatura/E-Arşiv",
      "Banka Entegrasyonu",
      "Arvento Filo Takip",
      "AI Analiz",
      "Barkod & QR Tarayıcı",
    ]);
    expect(overview.paymentHistory).toHaveLength(3);
    expect(overview.integrationMode).toBe("read-model");
  });

  test("builds feature access rows from the current subscription package", () => {
    const overview = listSubscriptionOverview();
    const accessRows = listSubscriptionFeatureAccessRows(overview);

    expect(accessRows.find((row) => row.key === "progress-payments")).toMatchObject({
      enabled: true,
      source: "plan",
    });
    expect(accessRows.find((row) => row.key === "e-invoice")).toMatchObject({
      enabled: true,
      source: "addon-included",
    });
    expect(accessRows.find((row) => row.key === "bank-integration")).toMatchObject({
      enabled: false,
      requiredPlan: "Kurumsal",
      source: "upgrade-required",
    });
    expect(accessRows.find((row) => row.key === "arvento-fleet")).toMatchObject({
      enabled: false,
      requiredPlan: "Kurumsal",
      source: "upgrade-required",
    });
  });

  test("marks purchased active add-ons as enabled feature access", () => {
    const overview = listSubscriptionOverview({
      activeAddonIds: ["bank-integration"],
      currentSubscription: {
        autoRenew: true,
        billingCycle: "yearly",
        endsAt: "2027-06-30",
        planId: "profesyonel",
        planName: "Profesyonel",
        renewalAmount: 98604,
        startsAt: "2026-07-01",
        storageLimitGb: 25,
        subscriptionId: "active-subscription-row",
        userLimit: 25,
      },
    });
    const accessRows = listSubscriptionFeatureAccessRows(overview);

    expect(overview.addons.find((addon) => addon.id === "bank-integration")).toMatchObject({
      status: "active",
    });
    expect(accessRows.find((row) => row.key === "bank-integration")).toMatchObject({
      enabled: true,
      reason: "Banka Entegrasyonu ek özelliği aktif.",
      source: "addon-included",
    });
  });

  test("locks every feature when the persisted subscription period has expired", () => {
    const overview = listSubscriptionOverview({
      currentSubscription: {
        autoRenew: false,
        billingCycle: "monthly",
        endsAt: "2026-07-03",
        planId: "kurumsal",
        planName: "Kurumsal",
        renewalAmount: 16900,
        startsAt: "2026-06-04",
        storageLimitGb: 100,
        subscriptionId: "expired-kurumsal-subscription",
        userLimit: 75,
      },
    });
    const accessRows = listSubscriptionFeatureAccessRows(overview, "2026-07-04");

    expect(accessRows.every((row) => row.enabled === false)).toBe(true);
    expect(accessRows.find((row) => row.key === "bank-integration")).toMatchObject({
      enabled: false,
      reason: "Abonelik süresi 2026-07-03 tarihinde doldu. Paketi yenilemek gerekir.",
      source: "upgrade-required",
    });
    expect(requireSubscriptionFeature(overview, "document-center", "2026-07-04")).toEqual({
      ok: false,
      errors: ["Döküman Merkezi için abonelik süresi doldu. Paketi yenilemek gerekir."],
      featureLabel: "Döküman Merkezi",
      requiredPlan: "Profesyonel",
    });
  });
  test("answers subscription feature access decisions for route guards", () => {
    const overview = listSubscriptionOverview();

    expect(canUseSubscriptionFeature(overview, "document-center")).toEqual({
      enabled: true,
      reason: "Profesyonel paketi kapsamında kullanılabilir.",
    });
    expect(canUseSubscriptionFeature(overview, "ai-analysis")).toEqual({
      enabled: false,
      reason: "Kurumsal pakete yükseltme gerekir.",
    });
  });

  test("returns server-action friendly guard results for subscription enforcement", () => {
    const overview = listSubscriptionOverview();

    expect(requireSubscriptionFeature(overview, "document-center")).toEqual({
      ok: true,
    });
    expect(requireSubscriptionFeature(overview, "ai-analysis")).toEqual({
      ok: false,
      errors: ["AI Analiz için Kurumsal pakete yükseltme gerekir."],
      featureLabel: "AI Analiz",
      requiredPlan: "Kurumsal",
    });
  });

  test("overrides the read-model with a persistence subscription snapshot", () => {
    const overview = listSubscriptionOverview({
      currentSubscription: {
        autoRenew: false,
        billingCycle: "monthly",
        endsAt: "2026-08-31",
        planId: "kurumsal",
        planName: "Kurumsal",
        renewalAmount: 16900,
        startsAt: "2026-08-01",
        storageLimitGb: 100,
        userLimit: 75,
      },
      paymentHistory: [
        {
          amount: 16900,
          date: "2026-08-01",
          id: "invoice-2026-008",
          invoiceNo: "INV-2026-008",
          method: "Kredi Kartı",
          providerRef: null,
          status: "Bekliyor",
        },
      ],
    });

    expect(overview.integrationMode).toBe("persistence-read");
    expect(overview.currentSubscription.planName).toBe("Kurumsal");
    expect(overview.plans.find((plan) => plan.id === "kurumsal")).toMatchObject({
      isCurrent: true,
    });
    expect(overview.paymentHistory).toEqual([
      expect.objectContaining({
        invoiceNo: "INV-2026-008",
        status: "Bekliyor",
      }),
    ]);
  });

  test("creates a package change checkout draft with audit trail without charging payment", async () => {
    const auditEntries: unknown[] = [];
    const overview = listSubscriptionOverview();

    const result = await createSubscriptionPlanChangeCheckout({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      billingCycle: "monthly",
      now: () => "2026-07-04T09:30:00.000Z",
      overview,
      scope: defaultTenantScope,
      targetPlanId: "kurumsal",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        checkout: {
          amount: 16900,
          billingCycle: "monthly",
          currency: "TRY",
          currentPlanId: "profesyonel",
          currentPlanName: "Profesyonel",
          invoiceDraft: {
            amount: 16900,
            currency: "TRY",
            invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
            method: "Ödeme sağlayıcı seçilecek",
            status: "Bekliyor",
          },
          status: "provider-pending",
          targetPlanId: "kurumsal",
          targetPlanName: "Kurumsal",
        },
      },
    });
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.checkout-draft.create",
        entityId: "SUB-20260704-KURUMSAL-MONTHLY",
        entityLabel: "Profesyonel -> Kurumsal",
        entityType: "subscription",
        metadata: {
          amount: 16900,
          billingCycle: "monthly",
          currency: "TRY",
          paymentProviderStatus: "not-started",
          planFrom: "profesyonel",
          planTo: "kurumsal",
        },
      }),
    ]);
  });

  test("creates an add-on checkout draft with audit trail without charging payment", async () => {
    const auditEntries: unknown[] = [];
    const overview = listSubscriptionOverview();

    const result = await createSubscriptionAddonCheckout({
      addonId: "bank-integration",
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      now: () => "2026-07-05T08:30:00.000Z",
      overview,
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        checkout: {
          addonId: "bank-integration",
          addonName: "Banka Entegrasyonu",
          amount: 1290,
          currency: "TRY",
          invoiceDraft: {
            amount: 1290,
            currency: "TRY",
            invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
            method: "Ödeme sağlayıcı seçilecek",
            status: "Bekliyor",
          },
          status: "provider-pending",
        },
      },
    });
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.addon-checkout-draft.create",
        entityId: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        entityLabel: "Banka Entegrasyonu",
        entityType: "subscription",
        metadata: {
          addonId: "bank-integration",
          amount: 1290,
          currency: "TRY",
          paymentProviderStatus: "not-started",
        },
      }),
    ]);
  });

  test("persists an add-on checkout invoice draft when an active subscription exists", async () => {
    const invoiceDrafts: unknown[] = [];
    const baseOverview = listSubscriptionOverview();
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...baseOverview.currentSubscription,
        subscriptionId: "active-subscription-row",
      },
    });

    const result = await createSubscriptionAddonCheckout({
      addonId: "bank-integration",
      now: () => "2026-07-05T08:30:00.000Z",
      overview,
      repository: {
        async createCheckoutInvoiceDraft(input) {
          invoiceDrafts.push(input.invoice);

          return input.invoice;
        },
      },
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        checkout: expect.objectContaining({
          addonId: "bank-integration",
          invoiceDraft: expect.objectContaining({
            invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          }),
        }),
      },
    });
    expect(invoiceDrafts).toEqual([
      {
        amount: 1290,
        companyId: defaultTenantScope.companyId,
        createdAt: "2026-07-05T08:30:00.000Z",
        currency: "TRY",
        id: "tenant-noa-demo::company-demo-insaat::period-2026::subscription-checkout::ADD-20260705-BANK-INTEGRATION-MONTHLY",
        invoiceDate: "2026-07-05",
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        method: "Ödeme sağlayıcı seçilecek",
        periodId: defaultTenantScope.periodId,
        providerRef: null,
        status: "pending",
        subscriptionId: "active-subscription-row",
        tenantId: defaultTenantScope.tenantId,
        updatedAt: "2026-07-05T08:30:00.000Z",
      },
    ]);
  });

  test("activates an add-on checkout with paid invoice and audit trail", async () => {
    const auditEntries: unknown[] = [];
    const activations: unknown[] = [];
    const baseOverview = listSubscriptionOverview();
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...baseOverview.currentSubscription,
        subscriptionId: "active-subscription-row",
      },
    });

    const result = await activateSubscriptionAddonCheckout({
      addonId: "bank-integration",
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
      now: () => "2026-07-05T09:10:00.000Z",
      overview,
      paymentProviderRef: "sandbox-addon-payment-001",
      repository: {
        async activateAddon(input) {
          activations.push(input);

          return {
            addon: input.addon,
            invoice: input.invoice,
          };
        },
      },
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        addon: {
          addonId: "bank-integration",
          companyId: defaultTenantScope.companyId,
          createdAt: "2026-07-05T09:10:00.000Z",
          endsAt: "2027-06-30",
          id: "tenant-noa-demo::company-demo-insaat::period-2026::subscription-addon::active-subscription-row::bank-integration",
          monthlyPrice: 1290,
          periodId: defaultTenantScope.periodId,
          startsAt: "2026-07-05",
          status: "active",
          subscriptionId: "active-subscription-row",
          tenantId: defaultTenantScope.tenantId,
          updatedAt: "2026-07-05T09:10:00.000Z",
        },
        invoice: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          method: "Sandbox ödeme onayı",
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
        }),
      },
    });
    expect(activations).toEqual([
      {
        addon: expect.objectContaining({
          addonId: "bank-integration",
          status: "active",
        }),
        addonCatalog: expect.objectContaining({
          id: "bank-integration",
          monthlyPrice: 1290,
          name: "Banka Entegrasyonu",
        }),
        invoice: expect.objectContaining({
          amount: 1290,
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
        }),
        scope: defaultTenantScope,
      },
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.addon.activate",
        entityId: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        entityLabel: "Banka Entegrasyonu",
        entityType: "subscription",
        metadata: {
          addonId: "bank-integration",
          amount: 1290,
          currency: "TRY",
          paymentProviderRef: "sandbox-addon-payment-001",
          statusTo: "active",
        },
      }),
    ]);
  });

  test("creates a payment provider session for checkout drafts when a provider is supplied", async () => {
    const providerSessions: unknown[] = [];
    const invoiceDrafts: unknown[] = [];
    const baseOverview = listSubscriptionOverview();
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...baseOverview.currentSubscription,
        subscriptionId: "active-subscription-row",
      },
    });

    const result = await createSubscriptionPlanChangeCheckout({
      billingCycle: "monthly",
      now: () => "2026-07-04T09:30:00.000Z",
      overview,
      paymentProvider: {
        async createCheckoutSession(input) {
          providerSessions.push(input);

          return {
            expiresAt: "2026-07-04T09:45:00.000Z",
            provider: "sandbox",
            providerRef: `sandbox-subscription-${input.invoiceNo}`,
            redirectUrl: `/abonelik?checkout=${input.invoiceNo}&provider=sandbox&providerRef=sandbox-subscription-${input.invoiceNo}`,
            status: "created",
          };
        },
      },
      repository: {
        async createCheckoutInvoiceDraft(input) {
          invoiceDrafts.push(input.invoice);

          return input.invoice;
        },
      },
      scope: defaultTenantScope,
      targetPlanId: "kurumsal",
    });

    expect(providerSessions).toEqual([
      expect.objectContaining({
        amount: 16900,
        billingCycle: "monthly",
        currentPlanId: "profesyonel",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        targetPlanId: "kurumsal",
      }),
    ]);
    expect(result).toEqual({
      ok: true,
      data: {
        checkout: expect.objectContaining({
          providerSession: {
            expiresAt: "2026-07-04T09:45:00.000Z",
            provider: "sandbox",
            providerRef: "sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
            redirectUrl:
              "/abonelik?checkout=SUB-20260704-KURUMSAL-MONTHLY&provider=sandbox&providerRef=sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
            status: "created",
          },
        }),
      },
    });
    expect(invoiceDrafts).toEqual([
      expect.objectContaining({
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "sandbox-subscription-SUB-20260704-KURUMSAL-MONTHLY",
        status: "pending",
      }),
    ]);
  });
  test("rejects subscription checkout drafts for viewer users and current package", async () => {
    const overview = listSubscriptionOverview();

    await expect(
      createSubscriptionPlanChangeCheckout({
        billingCycle: "yearly",
        overview,
        scope: { ...defaultTenantScope, userRole: "viewer" },
        targetPlanId: "kurumsal",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Abonelik paketi değiştirme yetkisi admin veya muhasebe rolündedir."],
    });

    await expect(
      createSubscriptionPlanChangeCheckout({
        billingCycle: "yearly",
        overview,
        scope: defaultTenantScope,
        targetPlanId: "profesyonel",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Mevcut paket için yeni satın alma taslağı oluşturulamaz."],
    });
  });

  test("activates a package change after sandbox payment confirmation", async () => {
    const auditEntries: unknown[] = [];
    const activations: unknown[] = [];
    const overview = listSubscriptionOverview();

    const result = await activateSubscriptionPlanChange({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      billingCycle: "monthly",
      invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
      now: () => "2026-07-04T10:00:00.000Z",
      overview,
      paymentProviderRef: "sandbox-payment-001",
      repository: {
        async activatePlanChange(input) {
          activations.push(input);

          return {
            invoice: input.invoice,
            subscription: input.subscription,
          };
        },
      },
      scope: defaultTenantScope,
      targetPlanId: "kurumsal",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invoice: expect.objectContaining({
          amount: 16900,
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          providerRef: "sandbox-payment-001",
          status: "paid",
        }),
        subscription: expect.objectContaining({
          billingCycle: "monthly",
          endsAt: "2026-08-03",
          planId: "kurumsal",
          renewalAmount: 16900,
          startsAt: "2026-07-04",
          status: "active",
        }),
      },
    });
    expect(activations).toEqual([
      expect.objectContaining({
        previousPlanId: "profesyonel",
        targetPlan: expect.objectContaining({
          id: "kurumsal",
          name: "Kurumsal",
        }),
      }),
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.plan-change.activate",
        entityId: "SUB-20260704-KURUMSAL-MONTHLY",
        entityLabel: "Profesyonel -> Kurumsal",
        entityType: "subscription",
        metadata: {
          amount: 16900,
          billingCycle: "monthly",
          currency: "TRY",
          paymentProviderRef: "sandbox-payment-001",
          planFrom: "profesyonel",
          planTo: "kurumsal",
          statusTo: "active",
        },
      }),
    ]);
  });

  test("rejects activation for viewer users and current package", async () => {
    const overview = listSubscriptionOverview();
    const repository = {
      async activatePlanChange() {
        throw new Error("not used");
      },
    };

    await expect(
      activateSubscriptionPlanChange({
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        overview,
        repository,
        scope: { ...defaultTenantScope, userRole: "viewer" },
        targetPlanId: "kurumsal",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Abonelik aktivasyonu admin veya muhasebe rolü gerektirir."],
    });

    await expect(
      activateSubscriptionPlanChange({
        billingCycle: "yearly",
        invoiceNo: "SUB-20260704-PROFESYONEL-YEARLY",
        overview,
        repository,
        scope: defaultTenantScope,
        targetPlanId: "profesyonel",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Mevcut paket tekrar aktive edilemez."],
    });
  });

  test("marks a checkout payment failure without activating the target package", async () => {
    const auditEntries: unknown[] = [];
    const failures: unknown[] = [];
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...listSubscriptionOverview().currentSubscription,
        subscriptionId: "active-subscription-row",
      },
    });

    const result = await failSubscriptionPlanChangeCheckout({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      amount: 16900,
      invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
      now: () => "2026-07-04T10:05:00.000Z",
      overview,
      paymentProviderRef: "sandbox-failure-001",
      reason: "Kart reddedildi",
      repository: {
        async markCheckoutInvoicePaymentFailed(input) {
          failures.push(input);

          return input.invoice;
        },
      },
      scope: defaultTenantScope,
      targetPlanId: "kurumsal",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invoice: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          method: "Ödeme sağlayıcı hata döndü",
          providerRef: "sandbox-failure-001",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
      },
    });
    expect(failures).toEqual([
      expect.objectContaining({
        invoice: expect.objectContaining({
          amount: 16900,
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          status: "failed",
        }),
      }),
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.checkout-payment.fail",
        entityId: "SUB-20260704-KURUMSAL-MONTHLY",
        entityLabel: "Profesyonel -> Kurumsal",
        entityType: "subscription",
        metadata: {
          amount: 16900,
          currency: "TRY",
          failureReason: "Kart reddedildi",
          paymentProviderRef: "sandbox-failure-001",
          planFrom: "profesyonel",
          planTo: "kurumsal",
          statusTo: "failed",
        },
      }),
    ]);
  });

  test("marks an add-on checkout payment failure without activating the add-on", async () => {
    const auditEntries: unknown[] = [];
    const failures: unknown[] = [];
    const overview = listSubscriptionOverview({
      currentSubscription: {
        ...listSubscriptionOverview().currentSubscription,
        subscriptionId: "active-subscription-row",
      },
    });

    const result = await failSubscriptionAddonCheckout({
      addonId: "bank-integration",
      amount: 1290,
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
      now: () => "2026-07-05T12:25:00.000Z",
      overview,
      paymentProviderFailureCode: "card_declined",
      paymentProviderRef:
        "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
      reason: "Kart sağlayıcı tarafından reddedildi.",
      repository: {
        async markCheckoutInvoicePaymentFailed(input) {
          failures.push(input);

          return input.invoice;
        },
      },
      scope: defaultTenantScope,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        invoice: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          method: "Ödeme sağlayıcı hata döndü",
          providerRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
      },
    });
    expect(failures).toEqual([
      expect.objectContaining({
        invoice: expect.objectContaining({
          amount: 1290,
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          status: "failed",
        }),
      }),
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.addon-checkout-payment.fail",
        entityId: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        entityLabel: "Banka Entegrasyonu",
        entityType: "subscription",
        metadata: {
          addonId: "bank-integration",
          amount: 1290,
          currency: "TRY",
          failureReason: "Kart sağlayıcı tarafından reddedildi.",
          paymentProviderFailureCode: "card_declined",
          paymentProviderRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          statusTo: "failed",
        },
      }),
    ]);
  });

  test("rejects checkout payment failure for viewer users and non-persistent subscriptions", async () => {
    const repository = {
      async markCheckoutInvoicePaymentFailed() {
        throw new Error("not used");
      },
    };

    await expect(
      failSubscriptionPlanChangeCheckout({
        amount: 16900,
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        overview: listSubscriptionOverview(),
        repository,
        scope: { ...defaultTenantScope, userRole: "viewer" },
        targetPlanId: "kurumsal",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: [
        "Başarısız abonelik ödemesi işleme yetkisi admin veya muhasebe rolündedir.",
      ],
    });

    await expect(
      failSubscriptionPlanChangeCheckout({
        amount: 16900,
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        overview: listSubscriptionOverview(),
        repository,
        scope: defaultTenantScope,
        targetPlanId: "kurumsal",
      }),
    ).resolves.toEqual({
      ok: false,
      errors: ["Başarısız ödeme için kalıcı aktif abonelik satırı bulunamadı."],
    });
  });
});


