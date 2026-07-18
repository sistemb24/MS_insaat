import { describe, expect, test } from "vitest";

import { createSubscriptionPrismaRepository } from "./subscription-prisma-repository";
import { defaultTenantScope } from "./tenant-scope";

describe("subscription prisma repository", () => {
  test("reads the active tenant subscription and payment history in scope", async () => {
    const calls: unknown[] = [];
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany(input) {
          calls.push(input);

          return [
            {
              amount: 16900,
              currency: "TRY",
              id: "invoice-2026-008",
              invoiceDate: "2026-08-01T00:00:00.000Z",
              invoiceNo: "INV-2026-008",
              method: "Kredi Kartı",
              providerRef: null,
              status: "pending",
            },
          ];
        },
      },
      tenantSubscription: {
        async findFirst(input) {
          calls.push(input);

          return {
            autoRenew: false,
            billingCycle: "monthly",
            endsAt: "2026-08-31T00:00:00.000Z",
            id: "sub-tenant-noa-demo-2026-08",
            plan: {
              id: "kurumsal",
              name: "Kurumsal",
            },
            planId: "kurumsal",
            renewalAmount: 16900,
            startsAt: "2026-08-01T00:00:00.000Z",
            storageLimitGb: 100,
            userLimit: 75,
          };
        },
      },
    });

    await expect(
      repository.getCurrentSnapshot({ scope: defaultTenantScope }),
    ).resolves.toEqual({
      currentSubscription: {
        autoRenew: false,
        billingCycle: "monthly",
        endsAt: "2026-08-31",
        planId: "kurumsal",
        planName: "Kurumsal",
        renewalAmount: 16900,
        startsAt: "2026-08-01",
        storageLimitGb: 100,
        subscriptionId: "sub-tenant-noa-demo-2026-08",
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
      paymentProviderEvents: [],
    });
    expect(calls).toEqual([
      {
        include: {
          plan: true,
        },
        orderBy: [
          {
            endsAt: "desc",
          },
        ],
        where: {
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          status: "active",
          tenantId: defaultTenantScope.tenantId,
        },
      },
      {
        orderBy: [
          {
            invoiceDate: "desc",
          },
        ],
        take: 12,
        where: {
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          subscriptionId: "sub-tenant-noa-demo-2026-08",
          tenantId: defaultTenantScope.tenantId,
        },
      },
    ]);
  });

  test("maps failed checkout invoices as failed payment history rows", async () => {
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          return [
            {
              amount: 16900,
              currency: "TRY",
              id: "failed-invoice-2026-007",
              invoiceDate: "2026-07-04T00:00:00.000Z",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              method: "Ödeme sağlayıcı hata döndü",
              providerRef: "sandbox-failure-001",
              status: "failed",
            },
          ];
        },
      },
      tenantSubscription: {
        async findFirst() {
          return {
            autoRenew: true,
            billingCycle: "monthly",
            endsAt: "2026-08-03T00:00:00.000Z",
            id: "sub-tenant-noa-demo-2026-07",
            plan: {
              id: "profesyonel",
              name: "Profesyonel",
            },
            planId: "profesyonel",
            renewalAmount: 9900,
            startsAt: "2026-07-04T00:00:00.000Z",
            storageLimitGb: 25,
            userLimit: 25,
          };
        },
      },
    });

    await expect(
      repository.getCurrentSnapshot({ scope: defaultTenantScope }),
    ).resolves.toMatchObject({
      paymentHistory: [
        {
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          method: "Ödeme sağlayıcı hata döndü",
          providerRef: "sandbox-failure-001",
          status: "Başarısız",
        },
      ],
    });
  });

  test("includes recent payment webhook events in the subscription snapshot", async () => {
    const calls: unknown[] = [];
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany(input) {
          calls.push(input);

          return [];
        },
      },
      subscriptionPaymentWebhookEvent: {
        async create() {
          throw new Error("not used");
        },
        async findMany(input) {
          calls.push(input);

          return [
            {
              companyId: defaultTenantScope.companyId,
              errorMessage: "Kart sağlayıcı tarafından reddedildi.",
              eventId: "evt_payment_failed_001",
              eventType: "subscription.payment.failed",
              invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
              periodId: defaultTenantScope.periodId,
              processedAt: "2026-07-04T11:08:00.000Z",
              providerRef: "provider-payment-failed-001",
              receivedAt: "2026-07-04T11:07:00.000Z",
              resultStatus: "failed",
              status: "processed",
              tenantId: defaultTenantScope.tenantId,
            },
          ];
        },
        async findUnique() {
          throw new Error("not used");
        },
        async update() {
          throw new Error("not used");
        },
      },
      tenantSubscription: {
        async findFirst(input) {
          calls.push(input);

          return {
            autoRenew: true,
            billingCycle: "monthly",
            endsAt: "2026-08-03T00:00:00.000Z",
            id: "sub-tenant-noa-demo-2026-07",
            plan: {
              id: "profesyonel",
              name: "Profesyonel",
            },
            planId: "profesyonel",
            renewalAmount: 9900,
            startsAt: "2026-07-04T00:00:00.000Z",
            storageLimitGb: 50,
            userLimit: 25,
          };
        },
      },
    });

    await expect(
      repository.getCurrentSnapshot({ scope: defaultTenantScope }),
    ).resolves.toMatchObject({
      paymentProviderEvents: [
        {
          errorMessage: "Kart sağlayıcı tarafından reddedildi.",
          eventId: "evt_payment_failed_001",
          eventType: "subscription.payment.failed",
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          processedAt: "2026-07-04T11:08:00.000Z",
          providerRef: "provider-payment-failed-001",
          receivedAt: "2026-07-04T11:07:00.000Z",
          resultStatus: "failed",
          status: "processed",
        },
      ],
    });
    expect(calls[2]).toEqual({
      orderBy: [
        {
          receivedAt: "desc",
        },
      ],
      take: 8,
      where: {
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        tenantId: defaultTenantScope.tenantId,
      },
    });
  });

  test("includes active tenant add-ons in the subscription snapshot", async () => {
    const calls: unknown[] = [];
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany(input) {
          calls.push(input);

          return [];
        },
      },
      tenantSubscription: {
        async findFirst(input) {
          calls.push(input);

          return {
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
          };
        },
      },
      tenantSubscriptionAddon: {
        async findMany(input) {
          calls.push(input);

          return [
            {
              addonId: "bank-integration",
              companyId: defaultTenantScope.companyId,
              createdAt: "2026-07-05T09:10:00.000Z",
              endsAt: "2027-06-30T00:00:00.000Z",
              id: "active-addon-row",
              monthlyPrice: 1290,
              periodId: defaultTenantScope.periodId,
              startsAt: "2026-07-05T00:00:00.000Z",
              status: "active",
              subscriptionId: "active-subscription-row",
              tenantId: defaultTenantScope.tenantId,
              updatedAt: "2026-07-05T09:10:00.000Z",
            },
          ];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.getCurrentSnapshot({ scope: defaultTenantScope }),
    ).resolves.toMatchObject({
      activeAddonIds: ["bank-integration"],
    });
    expect(calls[2]).toEqual({
      where: {
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
        status: "active",
        subscriptionId: "active-subscription-row",
        tenantId: defaultTenantScope.tenantId,
      },
    });
  });

  test("excludes expired active tenant add-ons from the subscription snapshot", async () => {
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          return [];
        },
      },
      tenantSubscription: {
        async findFirst() {
          return {
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
          };
        },
      },
      tenantSubscriptionAddon: {
        async findMany() {
          return [
            {
              addonId: "bank-integration",
              companyId: defaultTenantScope.companyId,
              createdAt: "2026-07-05T09:10:00.000Z",
              endsAt: "2026-01-01T00:00:00.000Z",
              id: "expired-addon-row",
              monthlyPrice: 1290,
              periodId: defaultTenantScope.periodId,
              startsAt: "2025-07-05T00:00:00.000Z",
              status: "active",
              subscriptionId: "active-subscription-row",
              tenantId: defaultTenantScope.tenantId,
              updatedAt: "2026-07-05T09:10:00.000Z",
            },
          ];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.getCurrentSnapshot({ scope: defaultTenantScope }),
    ).resolves.not.toHaveProperty("activeAddonIds");
  });

  test("excludes future-start active tenant add-ons from the subscription snapshot", async () => {
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          return [];
        },
      },
      tenantSubscription: {
        async findFirst() {
          return {
            autoRenew: true,
            billingCycle: "yearly",
            endsAt: "2999-12-31T00:00:00.000Z",
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
          };
        },
      },
      tenantSubscriptionAddon: {
        async findMany() {
          return [
            {
              addonId: "bank-integration",
              companyId: defaultTenantScope.companyId,
              createdAt: "2026-07-05T09:10:00.000Z",
              endsAt: "2999-12-31T00:00:00.000Z",
              id: "future-addon-row",
              monthlyPrice: 1290,
              periodId: defaultTenantScope.periodId,
              startsAt: "2999-01-01T00:00:00.000Z",
              status: "active",
              subscriptionId: "active-subscription-row",
              tenantId: defaultTenantScope.tenantId,
              updatedAt: "2026-07-05T09:10:00.000Z",
            },
          ];
        },
        async upsert() {
          throw new Error("not used");
        },
      },
    });

    await expect(
      repository.getCurrentSnapshot({ scope: defaultTenantScope }),
    ).resolves.not.toHaveProperty("activeAddonIds");
  });

  test("returns an empty snapshot when the tenant has no active subscription row yet", async () => {
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          throw new Error("not used");
        },
      },
      tenantSubscription: {
        async findFirst() {
          return null;
        },
      },
    });

    await expect(
      repository.getCurrentSnapshot({ scope: defaultTenantScope }),
    ).resolves.toEqual({});
  });

  test("activates a plan change by closing old active rows and writing paid invoice", async () => {
    const calls: unknown[] = [];
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return input.create;
        },
      },
      subscriptionPlan: {
        async upsert(input) {
          calls.push(input);

          return input.create;
        },
      },
      tenantSubscription: {
        async create(input) {
          calls.push(input);

          return {
            ...input.data,
            plan: {
              id: "kurumsal",
              name: "Kurumsal",
            },
          };
        },
        async findFirst() {
          return null;
        },
        async updateMany(input) {
          calls.push(input);

          return { count: 1 };
        },
      },
    });

    await expect(
      repository.activatePlanChange({
        invoice: {
          amount: 16900,
          companyId: defaultTenantScope.companyId,
          createdAt: "2026-07-04T10:00:00.000Z",
          currency: "TRY",
          id: "invoice-row",
          invoiceDate: "2026-07-04",
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          method: "Sandbox ödeme onayı",
          periodId: defaultTenantScope.periodId,
          providerRef: "sandbox-payment-001",
          status: "paid",
          subscriptionId: "subscription-row",
          tenantId: defaultTenantScope.tenantId,
          updatedAt: "2026-07-04T10:00:00.000Z",
        },
        previousPlanId: "profesyonel",
        scope: defaultTenantScope,
        subscription: {
          autoRenew: true,
          billingCycle: "monthly",
          companyId: defaultTenantScope.companyId,
          createdAt: "2026-07-04T10:00:00.000Z",
          createdBy: defaultTenantScope.userId,
          endsAt: "2026-08-03",
          id: "subscription-row",
          periodId: defaultTenantScope.periodId,
          planId: "kurumsal",
          renewalAmount: 16900,
          startsAt: "2026-07-04",
          status: "active",
          storageLimitGb: 100,
          tenantId: defaultTenantScope.tenantId,
          updatedAt: "2026-07-04T10:00:00.000Z",
          updatedBy: defaultTenantScope.userId,
          userLimit: 75,
        },
        targetPlan: {
          description: "Entegrasyonlar, filo ve gelişmiş analiz kapsamı",
          id: "kurumsal",
          includedModules: ["Profesyonel", "Banka Entegrasyonu"],
          isActive: true,
          monthlyPrice: 16900,
          name: "Kurumsal",
          sortOrder: 4,
          storageLimitGb: 100,
          userLimit: 75,
        },
      }),
    ).resolves.toEqual({
      invoice: expect.objectContaining({
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        status: "paid",
      }),
      subscription: expect.objectContaining({
        planId: "kurumsal",
        status: "active",
      }),
    });
    expect(calls).toEqual([
      {
        create: expect.objectContaining({
          id: "kurumsal",
          includedModules: ["Profesyonel", "Banka Entegrasyonu"],
          monthlyPrice: 16900,
          name: "Kurumsal",
        }),
        update: expect.objectContaining({
          includedModules: ["Profesyonel", "Banka Entegrasyonu"],
          monthlyPrice: 16900,
          name: "Kurumsal",
        }),
        where: {
          id: "kurumsal",
        },
      },
      {
        data: {
          status: "inactive",
          updatedAt: new Date("2026-07-04T10:00:00.000Z"),
          updatedBy: defaultTenantScope.userId,
        },
        where: {
          companyId: defaultTenantScope.companyId,
          periodId: defaultTenantScope.periodId,
          status: "active",
          tenantId: defaultTenantScope.tenantId,
        },
      },
      {
        data: expect.objectContaining({
          billingCycle: "monthly",
          id: "subscription-row",
          planId: "kurumsal",
          renewalAmount: 16900,
          status: "active",
        }),
      },
      {
        create: expect.objectContaining({
          id: "invoice-row",
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          status: "paid",
        }),
        update: expect.objectContaining({
          providerRef: "sandbox-payment-001",
          subscriptionId: "subscription-row",
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
      },
    ]);
  });

  test("writes a pending checkout invoice draft without changing the active subscription", async () => {
    const calls: unknown[] = [];
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return input.create;
        },
      },
      tenantSubscription: {
        async findFirst() {
          return null;
        },
      },
    });

    await expect(
      repository.createCheckoutInvoiceDraft({
        invoice: {
          amount: 16900,
          companyId: defaultTenantScope.companyId,
          createdAt: "2026-07-04T10:00:00.000Z",
          currency: "TRY",
          id: "checkout-invoice-row",
          invoiceDate: "2026-07-04",
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          method: "Ödeme sağlayıcı seçilecek",
          periodId: defaultTenantScope.periodId,
          providerRef: null,
          status: "pending",
          subscriptionId: "active-subscription-row",
          tenantId: defaultTenantScope.tenantId,
          updatedAt: "2026-07-04T10:00:00.000Z",
        },
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      amount: 16900,
      companyId: defaultTenantScope.companyId,
      createdAt: "2026-07-04T10:00:00.000Z",
      currency: "TRY",
      id: "checkout-invoice-row",
      invoiceDate: "2026-07-04",
      invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
      method: "Ödeme sağlayıcı seçilecek",
      periodId: defaultTenantScope.periodId,
      providerRef: null,
      status: "pending",
      subscriptionId: "active-subscription-row",
      tenantId: defaultTenantScope.tenantId,
      updatedAt: "2026-07-04T10:00:00.000Z",
    });
    expect(calls).toEqual([
      {
        create: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          method: "Ödeme sağlayıcı seçilecek",
          status: "pending",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          amount: 16900,
          method: "Ödeme sağlayıcı seçilecek",
          providerRef: null,
          status: "pending",
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
      },
    ]);
  });

  test("activates an add-on by upserting catalog, tenant add-on and paid invoice", async () => {
    const calls: unknown[] = [];
    const repository = createSubscriptionPrismaRepository({
      subscriptionAddon: {
        async upsert(input) {
          calls.push(input);

          return input.create;
        },
      },
      subscriptionInvoice: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return input.create;
        },
      },
      tenantSubscription: {
        async findFirst() {
          return null;
        },
      },
      tenantSubscriptionAddon: {
        async upsert(input) {
          calls.push(input);

          return input.create;
        },
      },
    });

    await expect(
      repository.activateAddon({
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
        addonCatalog: {
          description: "Open Banking hareket senkronizasyonu",
          id: "bank-integration",
          isActive: true,
          monthlyPrice: 1290,
          name: "Banka Entegrasyonu",
        },
        invoice: {
          amount: 1290,
          companyId: defaultTenantScope.companyId,
          createdAt: "2026-07-05T09:10:00.000Z",
          currency: "TRY",
          id: "addon-invoice-row",
          invoiceDate: "2026-07-05",
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          method: "Sandbox ödeme onayı",
          periodId: defaultTenantScope.periodId,
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
          subscriptionId: "active-subscription-row",
          tenantId: defaultTenantScope.tenantId,
          updatedAt: "2026-07-05T09:10:00.000Z",
        },
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual({
      addon: expect.objectContaining({
        addonId: "bank-integration",
        status: "active",
      }),
      invoice: expect.objectContaining({
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        status: "paid",
      }),
    });
    expect(calls).toEqual([
      {
        create: expect.objectContaining({
          id: "bank-integration",
          monthlyPrice: 1290,
          name: "Banka Entegrasyonu",
        }),
        update: expect.objectContaining({
          monthlyPrice: 1290,
          name: "Banka Entegrasyonu",
        }),
        where: {
          id: "bank-integration",
        },
      },
      {
        create: expect.objectContaining({
          addonId: "bank-integration",
          id: "tenant-noa-demo::company-demo-insaat::period-2026::subscription-addon::active-subscription-row::bank-integration",
          status: "active",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          monthlyPrice: 1290,
          status: "active",
        }),
        where: {
          tenantId_companyId_periodId_subscriptionId_addonId: {
            addonId: "bank-integration",
            companyId: defaultTenantScope.companyId,
            periodId: defaultTenantScope.periodId,
            subscriptionId: "active-subscription-row",
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
      {
        create: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
          subscriptionId: "active-subscription-row",
        }),
        update: expect.objectContaining({
          providerRef: "sandbox-addon-payment-001",
          status: "paid",
          subscriptionId: "active-subscription-row",
        }),
        where: {
          tenantId_companyId_periodId_invoiceNo: {
            companyId: defaultTenantScope.companyId,
            invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
            periodId: defaultTenantScope.periodId,
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
    ]);
  });

  test("marks a checkout invoice as failed by invoice number without changing subscription rows", async () => {
    const calls: unknown[] = [];
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          return [];
        },
        async upsert(input) {
          calls.push(input);

          return input.create;
        },
      },
      tenantSubscription: {
        async findFirst() {
          return null;
        },
      },
    });

    await expect(
      repository.markCheckoutInvoicePaymentFailed({
        invoice: {
          amount: 16900,
          companyId: defaultTenantScope.companyId,
          createdAt: "2026-07-04T10:05:00.000Z",
          currency: "TRY",
          id: "checkout-failed-invoice-row",
          invoiceDate: "2026-07-04",
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          method: "Ödeme sağlayıcı hata döndü",
          periodId: defaultTenantScope.periodId,
          providerRef: "sandbox-failure-001",
          status: "failed",
          subscriptionId: "active-subscription-row",
          tenantId: defaultTenantScope.tenantId,
          updatedAt: "2026-07-04T10:05:00.000Z",
        },
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "sandbox-failure-001",
        status: "failed",
      }),
    );
    expect(calls).toEqual([
      {
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
      },
    ]);
  });

  test("claims duplicate payment webhook events and completes the processing row", async () => {
    const calls: unknown[] = [];
    type WebhookEventRecordForTest = {
      companyId: string;
      errorMessage: string | null;
      eventId: string;
      eventType: string;
      invoiceNo: string;
      periodId: string;
      processedAt: Date | string | null;
      providerRef: string;
      receivedAt: Date | string;
      resultStatus: string | null;
      status: string;
      tenantId: string;
    };
    let existingEvent: WebhookEventRecordForTest | null = null;
    const event = {
      companyId: defaultTenantScope.companyId,
      errorMessage: null,
      eventId: "evt_payment_success",
      eventType: "subscription.payment.succeeded" as const,
      invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
      periodId: defaultTenantScope.periodId,
      processedAt: null,
      providerRef: "provider-payment-001",
      receivedAt: "2026-07-04T11:00:00.000Z",
      resultStatus: null,
      status: "processing" as const,
      tenantId: defaultTenantScope.tenantId,
    };
    const repository = createSubscriptionPrismaRepository({
      subscriptionInvoice: {
        async findMany() {
          return [];
        },
      },
      subscriptionPaymentWebhookEvent: {
        async create(input) {
          calls.push(input);
          existingEvent = input.data;

          return input.data;
        },
        async findUnique(input) {
          calls.push(input);

          return existingEvent;
        },
        async update(input) {
          calls.push(input);
          if (!existingEvent) {
            throw new Error("event should be claimed before completion");
          }
          existingEvent = {
            ...existingEvent,
            ...input.data,
          };

          return existingEvent;
        },
      },
      tenantSubscription: {
        async findFirst() {
          return null;
        },
      },
    });

    await expect(
      repository.claimPaymentWebhookEvent({ event, scope: defaultTenantScope }),
    ).resolves.toEqual({
      event,
      status: "claimed",
    });
    await expect(
      repository.claimPaymentWebhookEvent({ event, scope: defaultTenantScope }),
    ).resolves.toEqual({
      event: expect.objectContaining({
        eventId: "evt_payment_success",
        status: "processing",
      }),
      status: "duplicate",
    });
    await expect(
      repository.completePaymentWebhookEvent({
        event: {
          ...event,
          processedAt: "2026-07-04T11:01:00.000Z",
          resultStatus: "activated",
          status: "processed",
        },
        scope: defaultTenantScope,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        eventId: "evt_payment_success",
        processedAt: "2026-07-04T11:01:00.000Z",
        resultStatus: "activated",
        status: "processed",
      }),
    );
    expect(calls).toEqual([
      {
        where: {
          tenantId_eventId: {
            eventId: "evt_payment_success",
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
      {
        data: expect.objectContaining({
          companyId: defaultTenantScope.companyId,
          eventId: "evt_payment_success",
          eventType: "subscription.payment.succeeded",
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          status: "processing",
        }),
      },
      {
        where: {
          tenantId_eventId: {
            eventId: "evt_payment_success",
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
      {
        data: expect.objectContaining({
          processedAt: new Date("2026-07-04T11:01:00.000Z"),
          resultStatus: "activated",
          status: "processed",
        }),
        where: {
          tenantId_eventId: {
            eventId: "evt_payment_success",
            tenantId: defaultTenantScope.tenantId,
          },
        },
      },
    ]);
  });});
