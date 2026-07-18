import { createHmac, timingSafeEqual } from "node:crypto";

import type { AuditLogRepository } from "./audit-log";
import type { TenantScope, TenantUserRole } from "./tenant-scope";
import {
  activateSubscriptionAddonCheckout,
  activateSubscriptionPlanChange,
  activateSubscriptionRenewal,
  failSubscriptionAddonCheckout,
  failSubscriptionPlanChangeCheckout,
  failSubscriptionRenewalCheckout,
  listSubscriptionOverview,
  type SubscriptionActionResult,
  type SubscriptionAddonActivationRepository,
  type SubscriptionActivationRepository,
  type SubscriptionBillingCycle,
  type SubscriptionCheckoutInvoiceFailureRepository,
  type SubscriptionPersistenceSnapshot,
  type SubscriptionRenewalRepository,
} from "./subscription-service";

export type SubscriptionPaymentWebhookEventType =
  | "subscription.payment.succeeded"
  | "subscription.payment.failed";

export type SubscriptionPaymentWebhookPayload = {
  data: {
    addonId?: string;
    amount: number;
    billingCycle: SubscriptionBillingCycle;
    invoiceNo: string;
    providerFailureCode?: string;
    providerRef: string;
    reason?: string;
    targetPlanId?: string;
  };
  eventId: string;
  scope: TenantScope;
  type: SubscriptionPaymentWebhookEventType;
};

export type SubscriptionPaymentWebhookProcessingStatus =
  | "processing"
  | "processed"
  | "failed";

export type SubscriptionPaymentWebhookResultStatus =
  | "activated"
  | "failed"
  | "duplicate";

export type SubscriptionPaymentWebhookEventRow = {
  companyId: string;
  errorMessage: string | null;
  eventId: string;
  eventType: SubscriptionPaymentWebhookEventType;
  invoiceNo: string;
  periodId: string;
  processedAt: string | null;
  providerRef: string;
  receivedAt: string;
  resultStatus: Exclude<SubscriptionPaymentWebhookResultStatus, "duplicate"> | null;
  status: SubscriptionPaymentWebhookProcessingStatus;
  tenantId: string;
};

export type SubscriptionPaymentWebhookClaimResult =
  | {
      event: SubscriptionPaymentWebhookEventRow;
      status: "claimed";
    }
  | {
      event: SubscriptionPaymentWebhookEventRow;
      status: "duplicate";
    };

export type SubscriptionPaymentWebhookRepository =
  SubscriptionActivationRepository &
  Partial<SubscriptionRenewalRepository> &
    Partial<SubscriptionAddonActivationRepository> &
    SubscriptionCheckoutInvoiceFailureRepository & {
      claimPaymentWebhookEvent?(input: {
        event: SubscriptionPaymentWebhookEventRow;
        scope: TenantScope;
      }): Promise<SubscriptionPaymentWebhookClaimResult>;
      completePaymentWebhookEvent?(input: {
        event: SubscriptionPaymentWebhookEventRow;
        scope: TenantScope;
      }): Promise<SubscriptionPaymentWebhookEventRow>;
      getCurrentSnapshot(input: {
        scope: TenantScope;
      }): Promise<SubscriptionPersistenceSnapshot>;
    };

export type SubscriptionPaymentWebhookResult = {
  eventId: string;
  invoiceNo: string;
  providerRef: string;
  status: SubscriptionPaymentWebhookResultStatus;
};

export async function processSubscriptionPaymentWebhook({
  auditLogRepository,
  now,
  rawBody,
  repository,
  secret,
  signatureHeader,
}: {
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  rawBody: string;
  repository: SubscriptionPaymentWebhookRepository;
  secret: string;
  signatureHeader: string | null | undefined;
}): Promise<SubscriptionActionResult<SubscriptionPaymentWebhookResult>> {
  if (
    !verifySubscriptionPaymentWebhookSignature({
      rawBody,
      secret,
      signatureHeader,
    })
  ) {
    return {
      ok: false,
      errors: ["Ödeme sağlayıcı webhook imzası doğrulanamadı."],
    };
  }

  const payloadResult = parseSubscriptionPaymentWebhookPayload(rawBody);

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const payload = payloadResult.data;
  const receivedAt = now?.() ?? new Date().toISOString();
  const webhookEvent: SubscriptionPaymentWebhookEventRow = {
    companyId: payload.scope.companyId,
    errorMessage: null,
    eventId: payload.eventId,
    eventType: payload.type,
    invoiceNo: payload.data.invoiceNo,
    periodId: payload.scope.periodId,
    processedAt: null,
    providerRef: payload.data.providerRef,
    receivedAt,
    resultStatus: null,
    status: "processing",
    tenantId: payload.scope.tenantId,
  };
  const claimResult = await repository.claimPaymentWebhookEvent?.({
    event: webhookEvent,
    scope: payload.scope,
  });

  if (claimResult?.status === "duplicate") {
    return {
      ok: true,
      data: {
        eventId: payload.eventId,
        invoiceNo: payload.data.invoiceNo,
        providerRef: payload.data.providerRef,
        status: "duplicate",
      },
    };
  }

  const snapshot = await repository.getCurrentSnapshot({ scope: payload.scope });
  const overview = listSubscriptionOverview(snapshot);

  if (payload.type === "subscription.payment.succeeded") {
    if (payload.data.addonId) {
      if (!repository.activateAddon) {
        return {
          ok: false,
          errors: ["Ek özellik aktivasyonu için repository desteği bulunamadı."],
        };
      }

      const addonRepository: SubscriptionAddonActivationRepository = {
        activateAddon: repository.activateAddon,
      };
      const result = await activateSubscriptionAddonCheckout({
        addonId: payload.data.addonId,
        auditLogRepository,
        invoiceNo: payload.data.invoiceNo,
        now,
        overview,
        paymentProviderRef: payload.data.providerRef,
        repository: addonRepository,
        scope: payload.scope,
      });

      if (!result.ok) {
        await completeWebhookEvent({
          errorMessage: result.errors.join(" "),
          event: webhookEvent,
          repository,
          resultStatus: null,
          scope: payload.scope,
          status: "failed",
        });

        return result;
      }

      await completeWebhookEvent({
        errorMessage: null,
        event: webhookEvent,
        repository,
        resultStatus: "activated",
        scope: payload.scope,
        status: "processed",
      });

      return {
        ok: true,
        data: {
          eventId: payload.eventId,
          invoiceNo: payload.data.invoiceNo,
          providerRef: payload.data.providerRef,
          status: "activated",
        },
      };
    }

    if (!payload.data.targetPlanId) {
      return { ok: false, errors: ["Webhook hedef paket kimliği zorunludur."] };
    }

    if (
      payload.data.targetPlanId === overview.currentSubscription.planId &&
      payload.data.invoiceNo.startsWith("REN-")
    ) {
      if (!repository.renewSubscription) {
        return { ok: false, errors: ["Abonelik yenileme için repository desteği bulunamadı."] };
      }
      const renewalRepository: SubscriptionRenewalRepository = {
        renewSubscription: repository.renewSubscription,
      };
      const result = await activateSubscriptionRenewal({
        auditLogRepository,
        billingCycle: payload.data.billingCycle,
        invoiceNo: payload.data.invoiceNo,
        now,
        overview,
        paymentProviderRef: payload.data.providerRef,
        repository: renewalRepository,
        scope: payload.scope,
      });

      if (!result.ok) {
        await completeWebhookEvent({
          errorMessage: result.errors.join(" "),
          event: webhookEvent,
          repository,
          resultStatus: null,
          scope: payload.scope,
          status: "failed",
        });
        return result;
      }

      await completeWebhookEvent({
        errorMessage: null,
        event: webhookEvent,
        repository,
        resultStatus: "activated",
        scope: payload.scope,
        status: "processed",
      });

      return {
        ok: true,
        data: {
          eventId: payload.eventId,
          invoiceNo: payload.data.invoiceNo,
          providerRef: payload.data.providerRef,
          status: "activated",
        },
      };
    }

    const result = await activateSubscriptionPlanChange({
      auditLogRepository,
      billingCycle: payload.data.billingCycle,
      invoiceNo: payload.data.invoiceNo,
      now,
      overview,
      paymentProviderRef: payload.data.providerRef,
      repository,
      scope: payload.scope,
      targetPlanId: payload.data.targetPlanId,
    });

    if (!result.ok) {
      await completeWebhookEvent({
        errorMessage: result.errors.join(" "),
        event: webhookEvent,
        repository,
        resultStatus: null,
        scope: payload.scope,
        status: "failed",
      });

      return result;
    }

    await completeWebhookEvent({
      errorMessage: null,
      event: webhookEvent,
      repository,
      resultStatus: "activated",
      scope: payload.scope,
      status: "processed",
    });

    return {
      ok: true,
      data: {
        eventId: payload.eventId,
        invoiceNo: payload.data.invoiceNo,
        providerRef: payload.data.providerRef,
        status: "activated",
      },
    };
  }

  const failureReason =
    normalizeProviderFailureReason(payload.data.providerFailureCode, payload.data.reason) ??
    "Ödeme sağlayıcı işlem başarısız döndü.";

  if (payload.data.addonId) {
    const result = await failSubscriptionAddonCheckout({
      addonId: payload.data.addonId,
      amount: payload.data.amount,
      auditLogRepository,
      invoiceNo: payload.data.invoiceNo,
      now,
      overview,
      paymentProviderFailureCode: payload.data.providerFailureCode,
      paymentProviderRef: payload.data.providerRef,
      reason: failureReason,
      repository,
      scope: payload.scope,
    });

    if (!result.ok) {
      await completeWebhookEvent({
        errorMessage: result.errors.join(" "),
        event: webhookEvent,
        repository,
        resultStatus: null,
        scope: payload.scope,
        status: "failed",
      });

      return result;
    }

    await completeWebhookEvent({
      errorMessage: failureReason,
      event: webhookEvent,
      repository,
      resultStatus: "failed",
      scope: payload.scope,
      status: "processed",
    });

    return {
      ok: true,
      data: {
        eventId: payload.eventId,
        invoiceNo: payload.data.invoiceNo,
        providerRef: payload.data.providerRef,
        status: "failed",
      },
    };
  }

  if (!payload.data.targetPlanId) {
    return { ok: false, errors: ["Webhook hedef paket kimliği zorunludur."] };
  }

  if (
    payload.data.targetPlanId === overview.currentSubscription.planId &&
    payload.data.invoiceNo.startsWith("REN-")
  ) {
    const result = await failSubscriptionRenewalCheckout({
      amount: payload.data.amount,
      auditLogRepository,
      invoiceNo: payload.data.invoiceNo,
      now,
      overview,
      paymentProviderFailureCode: payload.data.providerFailureCode,
      paymentProviderRef: payload.data.providerRef,
      reason: failureReason,
      repository,
      scope: payload.scope,
    });

    if (!result.ok) {
      await completeWebhookEvent({
        errorMessage: result.errors.join(" "),
        event: webhookEvent,
        repository,
        resultStatus: null,
        scope: payload.scope,
        status: "failed",
      });
      return result;
    }

    await completeWebhookEvent({
      errorMessage: failureReason,
      event: webhookEvent,
      repository,
      resultStatus: "failed",
      scope: payload.scope,
      status: "processed",
    });

    return {
      ok: true,
      data: {
        eventId: payload.eventId,
        invoiceNo: payload.data.invoiceNo,
        providerRef: payload.data.providerRef,
        status: "failed",
      },
    };
  }

  const result = await failSubscriptionPlanChangeCheckout({
    amount: payload.data.amount,
    auditLogRepository,
    invoiceNo: payload.data.invoiceNo,
    now,
    overview,
    paymentProviderFailureCode: payload.data.providerFailureCode,
    paymentProviderRef: payload.data.providerRef,
    reason: failureReason,
    repository,
    scope: payload.scope,
    targetPlanId: payload.data.targetPlanId,
  });

  if (!result.ok) {
    await completeWebhookEvent({
      errorMessage: result.errors.join(" "),
      event: webhookEvent,
      repository,
      resultStatus: null,
      scope: payload.scope,
      status: "failed",
    });

    return result;
  }

  await completeWebhookEvent({
    errorMessage: failureReason,
    event: webhookEvent,
    repository,
    resultStatus: "failed",
    scope: payload.scope,
    status: "processed",
  });

  return {
    ok: true,
    data: {
      eventId: payload.eventId,
      invoiceNo: payload.data.invoiceNo,
      providerRef: payload.data.providerRef,
      status: "failed",
    },
  };
}

async function completeWebhookEvent({
  errorMessage,
  event,
  repository,
  resultStatus,
  scope,
  status,
}: {
  errorMessage: string | null;
  event: SubscriptionPaymentWebhookEventRow;
  repository: SubscriptionPaymentWebhookRepository;
  resultStatus: SubscriptionPaymentWebhookEventRow["resultStatus"];
  scope: TenantScope;
  status: SubscriptionPaymentWebhookProcessingStatus;
}) {
  await repository.completePaymentWebhookEvent?.({
    event: {
      ...event,
      errorMessage,
      processedAt: new Date().toISOString(),
      resultStatus,
      status,
    },
    scope,
  });
}

export function signSubscriptionPaymentWebhookPayload({
  rawBody,
  secret,
}: {
  rawBody: string;
  secret: string;
}) {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

export function verifySubscriptionPaymentWebhookSignature({
  rawBody,
  secret,
  signatureHeader,
}: {
  rawBody: string;
  secret: string;
  signatureHeader: string | null | undefined;
}) {
  if (!secret.trim() || !signatureHeader?.trim()) {
    return false;
  }

  const expected = signSubscriptionPaymentWebhookPayload({ rawBody, secret });
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signatureHeader.trim(), "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

function normalizeProviderFailureReason(
  providerFailureCode: string | undefined,
  reason: string | undefined,
) {
  if (reason?.trim()) {
    return reason.trim();
  }

  if (!providerFailureCode?.trim()) {
    return undefined;
  }

  return providerFailureReasons[providerFailureCode.trim()] ??
    `Ödeme sağlayıcı işlemi ${providerFailureCode.trim()} koduyla reddetti.`;
}

const providerFailureReasons: Record<string, string> = {
  card_declined: "Kart sağlayıcı tarafından reddedildi.",
  expired_card: "Kartın son kullanma tarihi geçmiş.",
  insufficient_funds: "Kart limiti yetersiz veya bakiye uygun değil.",
  invalid_cvc: "Kart güvenlik kodu doğrulanamadı.",
};
function parseSubscriptionPaymentWebhookPayload(
  rawBody: string,
): SubscriptionActionResult<SubscriptionPaymentWebhookPayload> {
  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { ok: false, errors: ["Ödeme sağlayıcı webhook gövdesi JSON olmalıdır."] };
  }

  if (!isRecord(payload)) {
    return { ok: false, errors: ["Ödeme sağlayıcı webhook gövdesi geçersiz."] };
  }

  const errors: string[] = [];
  const data = payload.data;
  const scope = payload.scope;
  const eventId = payload.eventId;
  const type = payload.type;

  if (!isNonEmptyString(eventId)) {
    errors.push("Webhook olay kimliği zorunludur.");
  }

  if (!isWebhookEventType(type)) {
    errors.push("Webhook olay tipi desteklenmiyor.");
  }

  if (!isTenantScope(scope)) {
    errors.push("Webhook tenant kapsamı geçersiz.");
  }

  if (!isRecord(data)) {
    errors.push("Webhook ödeme verisi geçersiz.");
  } else {
    if (!isFinitePositiveNumber(data.amount)) {
      errors.push("Webhook ödeme tutarı geçersiz.");
    }

    if (!isBillingCycle(data.billingCycle)) {
      errors.push("Webhook abonelik dönemi geçersiz.");
    }

    if (!isNonEmptyString(data.invoiceNo)) {
      errors.push("Webhook fatura numarası zorunludur.");
    }

    if (!isNonEmptyString(data.providerRef)) {
      errors.push("Webhook ödeme sağlayıcı referansı zorunludur.");
    }

    if (
      data.addonId !== undefined &&
      !isNonEmptyString(data.addonId)
    ) {
      errors.push("Webhook ek özellik kimliği metin olmalıdır.");
    }

    if (!isNonEmptyString(data.targetPlanId) && !isNonEmptyString(data.addonId)) {
      errors.push("Webhook hedef paket veya ek özellik kimliği zorunludur.");
    }

    if (isNonEmptyString(data.targetPlanId) && isNonEmptyString(data.addonId)) {
      errors.push("Webhook yalnız bir hedef paket veya ek özellik taşımalıdır.");
    }

    if (
      data.reason !== undefined &&
      typeof data.reason !== "string"
    ) {
      errors.push("Webhook hata nedeni metin olmalıdır.");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: payload as SubscriptionPaymentWebhookPayload,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFinitePositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isBillingCycle(value: unknown): value is SubscriptionBillingCycle {
  return value === "monthly" || value === "yearly";
}

function isWebhookEventType(
  value: unknown,
): value is SubscriptionPaymentWebhookEventType {
  return (
    value === "subscription.payment.succeeded" ||
    value === "subscription.payment.failed"
  );
}

function isTenantScope(value: unknown): value is TenantScope {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.tenantId) &&
    isNonEmptyString(value.tenantName) &&
    isNonEmptyString(value.companyId) &&
    isNonEmptyString(value.companyName) &&
    isNonEmptyString(value.periodId) &&
    isNonEmptyString(value.periodLabel) &&
    isNonEmptyString(value.userId) &&
    isNonEmptyString(value.userName) &&
    isTenantUserRole(value.userRole) &&
    isNonEmptyString(value.licenseLabel)
  );
}

function isTenantUserRole(value: unknown): value is TenantUserRole {
  return value === "admin" || value === "accounting" || value === "viewer";
}
