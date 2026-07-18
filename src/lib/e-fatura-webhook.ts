import { createHmac, timingSafeEqual } from "node:crypto";

import type { AuditLogRepository } from "./audit-log";
import {
  isEFaturaWebhookEventType,
  type EFaturaWebhookEventType,
} from "./e-fatura-webhook-event-types";

export type EFaturaWebhookPayload = {
  data: {
    invoiceNo: string;
    providerRef: string;
    providerStatus: string;
  };
  eventId: string;
  scope: {
    companyId: string;
    periodId: string;
    tenantId: string;
  };
  type: EFaturaWebhookEventType;
};

export type EFaturaWebhookResult = {
  eventId: string;
  invoiceNo: string;
  providerRef: string;
  providerStatus: string;
  status: "accepted" | "duplicate";
};

export type EFaturaWebhookEventRepository = {
  claimEvent(input: {
    payload: EFaturaWebhookPayload;
    receivedAt: string;
  }): Promise<"claimed" | "duplicate">;
  releaseEvent?(input: { payload: EFaturaWebhookPayload }): Promise<void>;
};

export type EFaturaWebhookProcessResult =
  | {
      ok: true;
      data: EFaturaWebhookResult;
    }
  | {
      errors: string[];
      ok: false;
      retryable?: boolean;
    };

type EFaturaWebhookParseResult =
  | {
      ok: true;
      data: EFaturaWebhookPayload;
    }
  | {
      errors: string[];
      ok: false;
    };

export function createEFaturaWebhookSignature(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyEFaturaWebhookSignature({
  rawBody,
  secret,
  signatureHeader,
}: {
  rawBody: string;
  secret: string;
  signatureHeader: string | null | undefined;
}) {
  const providedSignature = signatureHeader?.trim();

  if (!providedSignature) {
    return false;
  }

  if (!/^[0-9a-f]{64}$/i.test(providedSignature)) {
    return false;
  }

  const expectedSignature = createEFaturaWebhookSignature(rawBody, secret);

  return timingSafeEqual(
    Buffer.from(providedSignature, "hex"),
    Buffer.from(expectedSignature, "hex"),
  );
}

export async function processEFaturaWebhook({
  auditLogRepository,
  eventRepository,
  rawBody,
  now,
  secret,
  signatureHeader,
}: {
  auditLogRepository?: AuditLogRepository;
  eventRepository?: EFaturaWebhookEventRepository;
  rawBody: string;
  now?: () => string;
  secret: string;
  signatureHeader: string | null | undefined;
}): Promise<EFaturaWebhookProcessResult> {
  if (!verifyEFaturaWebhookSignature({
    rawBody,
    secret,
    signatureHeader,
  })) {
    return {
      ok: false,
      errors: ["E-Fatura webhook imzası doğrulanamadı."],
    };
  }

  const payloadResult = parseEFaturaWebhookPayload(rawBody);

  if (!payloadResult.ok) {
    return payloadResult;
  }

  const payload = payloadResult.data;
  const receivedAt = now?.() ?? new Date().toISOString();
  let eventClaim: "claimed" | "duplicate";

  try {
    eventClaim = eventRepository
      ? await eventRepository.claimEvent({
          payload,
          receivedAt,
        })
      : "claimed";
  } catch {
    return {
      errors: [
        "E-Fatura webhook olayı kaydedilemedi. Sağlayıcı tekrar deneyebilir.",
      ],
      ok: false,
      retryable: true,
    };
  }

  if (eventClaim === "duplicate") {
    return {
      ok: true,
      data: {
        eventId: payload.eventId,
        invoiceNo: payload.data.invoiceNo,
        providerRef: payload.data.providerRef,
        providerStatus: payload.data.providerStatus,
        status: "duplicate",
      },
    };
  }

  if (auditLogRepository) {
    try {
      await auditLogRepository.record({
        action: "e-fatura.webhook.accepted",
        actorUserId: "system-webhook",
        companyId: payload.scope.companyId,
        entityId: payload.eventId,
        entityLabel: payload.data.invoiceNo,
        entityType: "e-fatura-webhook",
        metadata: {
          invoiceNo: payload.data.invoiceNo,
          providerRef: payload.data.providerRef,
          providerStatus: payload.data.providerStatus,
          type: payload.type,
        },
        occurredAt: receivedAt,
        periodId: payload.scope.periodId,
        tenantId: payload.scope.tenantId,
      });
    } catch {
      await releaseEFaturaWebhookEvent(eventRepository, payload);

      return {
        errors: [
          "E-Fatura webhook audit kaydı oluşturulamadı. Sağlayıcı tekrar deneyebilir.",
        ],
        ok: false,
        retryable: true,
      };
    }
  }

  return {
    ok: true,
    data: {
      eventId: payload.eventId,
      invoiceNo: payload.data.invoiceNo,
      providerRef: payload.data.providerRef,
      providerStatus: payload.data.providerStatus,
      status: "accepted",
    },
  };
}

async function releaseEFaturaWebhookEvent(
  eventRepository: EFaturaWebhookEventRepository | undefined,
  payload: EFaturaWebhookPayload,
) {
  try {
    await eventRepository?.releaseEvent?.({ payload });
  } catch {
    // Audit kaydı başarısız olsa da sağlayıcıya retry sinyali döndürülür.
  }
}

function parseEFaturaWebhookPayload(rawBody: string): EFaturaWebhookParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, errors: ["E-Fatura webhook gövdesi JSON olmalıdır."] };
  }

  if (!isEFaturaWebhookPayload(parsed)) {
    return {
      ok: false,
      errors: ["E-Fatura webhook gövdesi geçerli değil."],
    };
  }

  return {
    ok: true,
    data: parsed,
  };
}

function isEFaturaWebhookPayload(
  value: unknown,
): value is EFaturaWebhookPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const data = candidate.data as Record<string, unknown> | undefined;
  const scope = candidate.scope as Record<string, unknown> | undefined;

  return (
    isNonEmptyString(candidate.eventId) &&
    typeof candidate.type === "string" &&
    isEFaturaWebhookEventType(candidate.type) &&
    isNonEmptyString(data?.invoiceNo) &&
    isNonEmptyString(data?.providerRef) &&
    isNonEmptyString(data?.providerStatus) &&
    isNonEmptyString(scope?.tenantId) &&
    isNonEmptyString(scope?.companyId) &&
    isNonEmptyString(scope?.periodId)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
