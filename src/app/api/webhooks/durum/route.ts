import { prisma } from "@/lib/prisma";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  buildDefaultWebhookDeliveryStatus,
  type WebhookDeliveryStatus,
} from "@/lib/webhook-delivery-service";
import { formatWebhookDeliveryEventType } from "@/lib/webhook-delivery-events";
import { planWebhookDeliveries } from "@/lib/webhook-delivery-planner";
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

export async function GET(request: Request) {
  const result = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    repository: apiKeyRepository,
    requiredScopes: ["webhooks"],
  });

  if (!result.ok) {
    return Response.json(result, {
      headers: result.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: result.status,
    });
  }

  const scope = buildTenantScopeFromApiKey(result.data.apiKey);
  const configuredEndpointCount = await webhookEndpointRepository.countByScope?.({
    scope,
  });
  const configuredEndpoints = await webhookEndpointRepository.list({
    scope,
  });
  const configuredEventTypes = [
    ...new Set(
      configuredEndpoints
        .filter((endpoint) => endpoint.isActive)
        .flatMap((endpoint) => endpoint.eventTypes),
    ),
  ] as WebhookDeliveryStatus["configuredEventTypes"];
  const deliveryReadiness = configuredEventTypes.reduce(
    (summary, eventType) => {
      const plan = planWebhookDeliveries({
        endpoints: configuredEndpoints,
        eventType,
      });

      summary.plannedAttemptCount += plan.matchingEndpointCount;
      if (!plan.deliverable) {
        summary.unroutableEventTypes.push(eventType);
      }

      return summary;
    },
    {
      plannedAttemptCount: 0,
      plannedEventTypeCount: configuredEventTypes.length,
      unroutableEventTypes: [] as WebhookDeliveryStatus["configuredEventTypes"],
    },
  );
  const plannedEventTypeLabels = configuredEventTypes.map((eventType) =>
    formatWebhookDeliveryEventType(eventType),
  );
  const unroutableEventTypeLabels = deliveryReadiness.unroutableEventTypes.map((eventType) =>
    formatWebhookDeliveryEventType(eventType),
  );

  return Response.json({
    ok: true,
    data: buildDefaultWebhookDeliveryStatus(
      result.data.apiKey.id,
      configuredEndpointCount ?? 0,
      configuredEventTypes,
    ),
    deliveryReadiness,
    plannedEventTypeLabels,
    unroutableEventTypeLabels,
  });
}
