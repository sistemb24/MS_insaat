import { createHmac } from "node:crypto";

import { describe, expect, test } from "vitest";

import { defaultTenantScope } from "./tenant-scope";
import {
  processSubscriptionPaymentWebhook,
  type SubscriptionPaymentWebhookPayload,
} from "./subscription-payment-webhook";

function sign(rawBody: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

function stringifyPayload(payload: SubscriptionPaymentWebhookPayload) {
  return JSON.stringify(payload);
}

describe("subscription payment webhook", () => {
  test("rejects invalid webhook signatures before touching repositories", async () => {
    const repositoryCalls: string[] = [];
    const rawBody = stringifyPayload({
      data: {
        amount: 16900,
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        targetPlanId: "kurumsal",
      },
      eventId: "evt_invalid_signature",
      scope: defaultTenantScope,
      type: "subscription.payment.succeeded",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record() {
          repositoryCalls.push("audit");
        },
      },
      rawBody,
      repository: {
        async activatePlanChange() {
          repositoryCalls.push("activate");
          throw new Error("not used");
        },
        async getCurrentSnapshot() {
          repositoryCalls.push("snapshot");
          throw new Error("not used");
        },
        async markCheckoutInvoicePaymentFailed() {
          repositoryCalls.push("fail");
          throw new Error("not used");
        },
      },
      secret: "webhook-secret",
      signatureHeader: "sha256=bad-signature",
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Ödeme sağlayıcı webhook imzası doğrulanamadı."],
    });
    expect(repositoryCalls).toEqual([]);
  });

  test("rejects provider events with both plan and add-on targets before touching repositories", async () => {
    const repositoryCalls: string[] = [];
    const rawBody = stringifyPayload({
      data: {
        addonId: "bank-integration",
        amount: 1290,
        billingCycle: "monthly",
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        providerRef:
          "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
        targetPlanId: "kurumsal",
      },
      eventId: "evt_ambiguous_target",
      scope: defaultTenantScope,
      type: "subscription.payment.succeeded",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record() {
          repositoryCalls.push("audit");
        },
      },
      rawBody,
      repository: {
        async activateAddon() {
          repositoryCalls.push("activate-addon");
          throw new Error("not used");
        },
        async activatePlanChange() {
          repositoryCalls.push("activate-plan");
          throw new Error("not used");
        },
        async getCurrentSnapshot() {
          repositoryCalls.push("snapshot");
          throw new Error("not used");
        },
        async markCheckoutInvoicePaymentFailed() {
          repositoryCalls.push("fail");
          throw new Error("not used");
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Webhook yalnız bir hedef paket veya ek özellik taşımalıdır."],
    });
    expect(repositoryCalls).toEqual([]);
  });

  test("activates a subscription from a signed provider success event", async () => {
    const activations: unknown[] = [];
    const auditEntries: unknown[] = [];
    const rawBody = stringifyPayload({
      data: {
        amount: 16900,
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        targetPlanId: "kurumsal",
      },
      eventId: "evt_payment_success",
      scope: defaultTenantScope,
      type: "subscription.payment.succeeded",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      now: () => "2026-07-04T11:00:00.000Z",
      rawBody,
      repository: {
        async activatePlanChange(input) {
          activations.push(input);

          return {
            invoice: input.invoice,
            subscription: input.subscription,
          };
        },
        async getCurrentSnapshot() {
          return {};
        },
        async markCheckoutInvoicePaymentFailed() {
          throw new Error("not used");
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: true,
      data: {
        eventId: "evt_payment_success",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        status: "activated",
      },
    });
    expect(activations).toEqual([
      expect.objectContaining({
        invoice: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          providerRef: "provider-payment-001",
          status: "paid",
        }),
        targetPlan: expect.objectContaining({
          id: "kurumsal",
        }),
      }),
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.plan-change.activate",
        entityId: "SUB-20260704-KURUMSAL-MONTHLY",
      }),
    ]);
  });

  test("routes REN invoices to the renewal repository on signed success", async () => {
    const renewals: unknown[] = [];
    const rawBody = stringifyPayload({
      data: {
        amount: 9900,
        billingCycle: "monthly",
        invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY",
        providerRef: "provider-renewal-001",
        targetPlanId: "profesyonel",
      },
      eventId: "evt_renewal_success",
      scope: defaultTenantScope,
      type: "subscription.payment.succeeded",
    });

    const result = await processSubscriptionPaymentWebhook({
      now: () => "2026-07-12T11:00:00.000Z",
      rawBody,
      repository: {
        async activatePlanChange() {
          throw new Error("not used");
        },
        async getCurrentSnapshot() {
          return {
            currentSubscription: {
              autoRenew: false,
              billingCycle: "monthly" as const,
              endsAt: "2026-07-31",
              planId: "profesyonel",
              planName: "Profesyonel",
              renewalAmount: 9900,
              startsAt: "2026-07-01",
              storageLimitGb: 25,
              subscriptionId: "subscription-row",
              userLimit: 25,
            },
          };
        },
        async renewSubscription(input) {
          renewals.push(input);
          return { invoice: input.invoice, subscription: input.subscription };
        },
        async markCheckoutInvoicePaymentFailed() {
          throw new Error("not used");
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({ invoiceNo: "REN-20260712-PROFESYONEL-MONTHLY", status: "activated" }),
    });
    expect(renewals).toHaveLength(1);
  });

  test("activates an add-on from a signed provider success event", async () => {
    const addonActivations: unknown[] = [];
    const completedEvents: unknown[] = [];
    const auditEntries: unknown[] = [];
    const rawBody = stringifyPayload({
      data: {
        addonId: "bank-integration",
        amount: 1290,
        billingCycle: "monthly",
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        providerRef:
          "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
      },
      eventId: "evt_addon_payment_success",
      scope: defaultTenantScope,
      type: "subscription.payment.succeeded",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      now: () => "2026-07-05T12:20:00.000Z",
      rawBody,
      repository: {
        async activateAddon(input) {
          addonActivations.push(input);

          return {
            addon: input.addon,
            invoice: input.invoice,
          };
        },
        async activatePlanChange() {
          throw new Error("not used");
        },
        async completePaymentWebhookEvent(input) {
          completedEvents.push(input.event);

          return input.event;
        },
        async getCurrentSnapshot() {
          return {
            currentSubscription: {
              ...defaultOverviewSubscription,
              subscriptionId: "active-subscription-row",
            },
          };
        },
        async markCheckoutInvoicePaymentFailed() {
          throw new Error("not used");
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: true,
      data: {
        eventId: "evt_addon_payment_success",
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        providerRef:
          "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
        status: "activated",
      },
    });
    expect(addonActivations).toEqual([
      expect.objectContaining({
        addon: expect.objectContaining({
          addonId: "bank-integration",
          status: "active",
          subscriptionId: "active-subscription-row",
        }),
        addonCatalog: expect.objectContaining({
          id: "bank-integration",
        }),
        invoice: expect.objectContaining({
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          providerRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          status: "paid",
        }),
      }),
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.addon.activate",
        entityId: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
      }),
    ]);
    expect(completedEvents).toEqual([
      expect.objectContaining({
        eventId: "evt_addon_payment_success",
        resultStatus: "activated",
        status: "processed",
      }),
    ]);
  });

  test("skips duplicate signed provider events before touching subscription state", async () => {
    const repositoryCalls: string[] = [];
    const rawBody = stringifyPayload({
      data: {
        amount: 16900,
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        targetPlanId: "kurumsal",
      },
      eventId: "evt_duplicate_success",
      scope: defaultTenantScope,
      type: "subscription.payment.succeeded",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record() {
          repositoryCalls.push("audit");
        },
      },
      rawBody,
      repository: {
        async activatePlanChange() {
          repositoryCalls.push("activate");
          throw new Error("not used");
        },
        async claimPaymentWebhookEvent(input) {
          repositoryCalls.push(`claim:${input.event.eventId}`);

          return {
            event: {
              ...input.event,
              processedAt: "2026-07-04T11:02:00.000Z",
              resultStatus: "activated",
              status: "processed",
            },
            status: "duplicate",
          };
        },
        async completePaymentWebhookEvent() {
          repositoryCalls.push("complete");
          throw new Error("not used");
        },
        async getCurrentSnapshot() {
          repositoryCalls.push("snapshot");
          throw new Error("not used");
        },
        async markCheckoutInvoicePaymentFailed() {
          repositoryCalls.push("fail");
          throw new Error("not used");
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: true,
      data: {
        eventId: "evt_duplicate_success",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-001",
        status: "duplicate",
      },
    });
    expect(repositoryCalls).toEqual(["claim:evt_duplicate_success"]);
  });
  test("maps provider failure codes to stable Turkish checkout failure reasons", async () => {
    const auditEntries: unknown[] = [];
    const rawBody = stringifyPayload({
      data: {
        amount: 16900,
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerFailureCode: "insufficient_funds",
        providerRef: "provider-payment-failed-002",
        targetPlanId: "kurumsal",
      },
      eventId: "evt_payment_failed_code",
      scope: defaultTenantScope,
      type: "subscription.payment.failed",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      now: () => "2026-07-04T11:06:00.000Z",
      rawBody,
      repository: {
        async activatePlanChange() {
          throw new Error("not used");
        },
        async getCurrentSnapshot() {
          return {
            currentSubscription: {
              ...defaultOverviewSubscription,
              subscriptionId: "active-subscription-row",
            },
          };
        },
        async markCheckoutInvoicePaymentFailed(input) {
          return input.invoice;
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: true,
      data: {
        eventId: "evt_payment_failed_code",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-failed-002",
        status: "failed",
      },
    });
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.checkout-payment.fail",
        metadata: expect.objectContaining({
          failureReason: "Kart limiti yetersiz veya bakiye uygun değil.",
          paymentProviderFailureCode: "insufficient_funds",
        }),
      }),
    ]);
  });
  test("stores the normalized provider failure reason on the webhook event row", async () => {
    const completedEvents: unknown[] = [];
    const rawBody = stringifyPayload({
      data: {
        amount: 16900,
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerFailureCode: "card_declined",
        providerRef: "provider-payment-failed-003",
        targetPlanId: "kurumsal",
      },
      eventId: "evt_payment_failed_complete_reason",
      scope: defaultTenantScope,
      type: "subscription.payment.failed",
    });

    await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record() {
          return undefined;
        },
      },
      now: () => "2026-07-04T11:07:00.000Z",
      rawBody,
      repository: {
        async activatePlanChange() {
          throw new Error("not used");
        },
        async completePaymentWebhookEvent(input) {
          completedEvents.push(input.event);

          return input.event;
        },
        async getCurrentSnapshot() {
          return {
            currentSubscription: {
              ...defaultOverviewSubscription,
              subscriptionId: "active-subscription-row",
            },
          };
        },
        async markCheckoutInvoicePaymentFailed(input) {
          return input.invoice;
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(completedEvents).toEqual([
      expect.objectContaining({
        errorMessage: "Kart sağlayıcı tarafından reddedildi.",
        eventId: "evt_payment_failed_complete_reason",
        resultStatus: "failed",
        status: "processed",
      }),
    ]);
  });

  test("marks a signed add-on provider failure event without activating the add-on", async () => {
    const failures: unknown[] = [];
    const completedEvents: unknown[] = [];
    const auditEntries: unknown[] = [];
    const rawBody = stringifyPayload({
      data: {
        addonId: "bank-integration",
        amount: 1290,
        billingCycle: "monthly",
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        providerFailureCode: "card_declined",
        providerRef:
          "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
      },
      eventId: "evt_addon_payment_failed",
      scope: defaultTenantScope,
      type: "subscription.payment.failed",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record(entry) {
          auditEntries.push(entry);
        },
      },
      now: () => "2026-07-05T12:25:00.000Z",
      rawBody,
      repository: {
        async activatePlanChange() {
          throw new Error("not used");
        },
        async completePaymentWebhookEvent(input) {
          completedEvents.push(input.event);

          return input.event;
        },
        async getCurrentSnapshot() {
          return {
            currentSubscription: {
              ...defaultOverviewSubscription,
              subscriptionId: "active-subscription-row",
            },
          };
        },
        async markCheckoutInvoicePaymentFailed(input) {
          failures.push(input);

          return input.invoice;
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: true,
      data: {
        eventId: "evt_addon_payment_failed",
        invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        providerRef:
          "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
        status: "failed",
      },
    });
    expect(failures).toEqual([
      expect.objectContaining({
        invoice: expect.objectContaining({
          amount: 1290,
          invoiceNo: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
          providerRef:
            "sandbox-subscription-ADD-20260705-BANK-INTEGRATION-MONTHLY",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
      }),
    ]);
    expect(auditEntries).toEqual([
      expect.objectContaining({
        action: "subscription.addon-checkout-payment.fail",
        entityId: "ADD-20260705-BANK-INTEGRATION-MONTHLY",
        metadata: expect.objectContaining({
          addonId: "bank-integration",
          failureReason: "Kart sağlayıcı tarafından reddedildi.",
          paymentProviderFailureCode: "card_declined",
        }),
      }),
    ]);
    expect(completedEvents).toEqual([
      expect.objectContaining({
        errorMessage: "Kart sağlayıcı tarafından reddedildi.",
        eventId: "evt_addon_payment_failed",
        resultStatus: "failed",
        status: "processed",
      }),
    ]);
  });
  test("marks a signed provider failure event without activating the target package", async () => {
    const failures: unknown[] = [];
    const rawBody = stringifyPayload({
      data: {
        amount: 16900,
        billingCycle: "monthly",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-failed-001",
        reason: "Kart limiti yetersiz.",
        targetPlanId: "kurumsal",
      },
      eventId: "evt_payment_failed",
      scope: defaultTenantScope,
      type: "subscription.payment.failed",
    });

    const result = await processSubscriptionPaymentWebhook({
      auditLogRepository: {
        async record() {
          return undefined;
        },
      },
      now: () => "2026-07-04T11:05:00.000Z",
      rawBody,
      repository: {
        async activatePlanChange() {
          throw new Error("not used");
        },
        async getCurrentSnapshot() {
          return {
            currentSubscription: {
              ...defaultOverviewSubscription,
              subscriptionId: "active-subscription-row",
            },
          };
        },
        async markCheckoutInvoicePaymentFailed(input) {
          failures.push(input);

          return input.invoice;
        },
      },
      secret: "webhook-secret",
      signatureHeader: sign(rawBody, "webhook-secret"),
    });

    expect(result).toEqual({
      ok: true,
      data: {
        eventId: "evt_payment_failed",
        invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
        providerRef: "provider-payment-failed-001",
        status: "failed",
      },
    });
    expect(failures).toEqual([
      expect.objectContaining({
        invoice: expect.objectContaining({
          invoiceNo: "SUB-20260704-KURUMSAL-MONTHLY",
          providerRef: "provider-payment-failed-001",
          status: "failed",
          subscriptionId: "active-subscription-row",
        }),
      }),
    ]);
  });
});

const defaultOverviewSubscription = {
  autoRenew: true,
  billingCycle: "yearly" as const,
  endsAt: "2027-06-30",
  planId: "profesyonel",
  planName: "Profesyonel",
  renewalAmount: 98604,
  startsAt: "2026-07-01",
  storageLimitGb: 25,
  userLimit: 25,
};
