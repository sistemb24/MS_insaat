import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createWebhookEndpointPrismaRepository, type WebhookEndpointPrismaClientLike } from "@/lib/webhook-endpoint-prisma-repository";
import { createWebhookEndpointService } from "@/lib/webhook-endpoint-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const endpointService = createWebhookEndpointService({
  auditLogRepository: { record: async () => undefined },
  repository: createWebhookEndpointPrismaRepository(prisma as unknown as WebhookEndpointPrismaClientLike),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["webhooks"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await endpointService.listOverview({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  const url = new URL(request.url);
  const activeFilter = url.searchParams.get("active");
  const eventType = url.searchParams.get("eventType")?.trim();
  if (activeFilter === null && !eventType) {
    return Response.json({ ok: true, data: result.data.overview });
  }
  const rows = result.data.overview.rows.filter((row) => {
    const activeMatches = activeFilter === "true" ? row.isActive : activeFilter === "false" ? !row.isActive : true;
    const eventMatches = eventType ? row.eventTypes.includes(eventType as never) : true;
    return activeMatches && eventMatches;
  });
  return Response.json({ ok: true, data: { rows, summary: { activeCount: rows.filter((row) => row.isActive).length, inactiveCount: rows.filter((row) => !row.isActive).length, totalCount: rows.length } } });
}
