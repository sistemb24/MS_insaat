import { prisma } from "@/lib/prisma";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import { buildWebhookDeliveryDryRunReport } from "@/lib/webhook-delivery-batch";
import { createWebhookDeliveryEventEnvelope } from "@/lib/webhook-delivery-event-envelope";
import {
  WEBHOOK_DELIVERY_EVENT_TYPES,
  type WebhookDeliveryEventType,
} from "@/lib/webhook-delivery-events";
import {
  createWebhookEndpointPrismaRepository,
  type WebhookEndpointPrismaClientLike,
} from "@/lib/webhook-endpoint-prisma-repository";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const webhookEndpointRepository = createWebhookEndpointPrismaRepository(
  prisma as unknown as WebhookEndpointPrismaClientLike,
);

export async function POST(request: Request) {
  const authentication = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    repository: apiKeyRepository,
    requiredScopes: ["webhooks"],
  });

  if (!authentication.ok) {
    return Response.json(authentication, {
      headers: authentication.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authentication.status,
    });
  }

  const input = await parseDryRunRequest(request);

  if (!input.ok) {
    return Response.json(input, { status: 400 });
  }

  const scope = buildTenantScopeFromApiKey(authentication.data.apiKey);
  const endpoints = await webhookEndpointRepository.list({ scope });
  const eventEnvelope = createWebhookDeliveryEventEnvelope({
    data: input.data.payload,
    eventId: input.data.eventId,
    eventType: input.data.eventType,
  });
  const report = buildWebhookDeliveryDryRunReport({
    body: eventEnvelope,
    endpoints,
    eventType: input.data.eventType,
  });

  return Response.json({
    ok: true,
    data: report,
    eventEnvelope,
  });
}

async function parseDryRunRequest(request: Request): Promise<
  | {
      ok: true;
      data: {
        eventId?: string;
        eventType: WebhookDeliveryEventType;
        payload: Record<string, unknown>;
      };
    }
  | { ok: false; errors: string[] }
> {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    return { ok: false, errors: ["Webhook dry-run isteği geçerli JSON olmalıdır."] };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: ["Webhook dry-run isteği JSON nesnesi olmalıdır."] };
  }

  const { eventId, eventType, payload } = value as {
    eventId?: unknown;
    eventType?: unknown;
    payload?: unknown;
  };

  if (
    typeof eventType !== "string" ||
    !WEBHOOK_DELIVERY_EVENT_TYPES.some((event) => event.type === eventType)
  ) {
    return { ok: false, errors: ["Desteklenen bir webhook olay türü seçilmelidir."] };
  }

  if (payload !== undefined && (!payload || typeof payload !== "object" || Array.isArray(payload))) {
    return { ok: false, errors: ["Webhook dry-run payload alanı JSON nesnesi olmalıdır."] };
  }

  if (
    eventId !== undefined &&
    (typeof eventId !== "string" || eventId.trim().length === 0 || eventId.trim().length > 120)
  ) {
    return { ok: false, errors: ["Webhook olay kimliği 1 ile 120 karakter arasında olmalıdır."] };
  }

  return {
    ok: true,
    data: {
      eventId: typeof eventId === "string" ? eventId.trim() : undefined,
      eventType: eventType as WebhookDeliveryEventType,
      payload: (payload ?? {}) as Record<string, unknown>,
    },
  };
}
