import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { createNotificationCenterPrismaRepository } from "@/lib/notification-center-prisma-repository";
import { buildNotificationCenterModel, createNotificationCenterService } from "@/lib/notification-center-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const notificationService = createNotificationCenterService({
  repository: createNotificationCenterPrismaRepository(prisma),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["notifications"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers:
        authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const result = await notificationService.list({
    scope: buildTenantScopeFromApiKey(authResult.data.apiKey),
  });

  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const priority = url.searchParams.get("priority");
  const unread = url.searchParams.get("unread");
  if (category || priority || unread) {
    const rows = result.data.rows.filter((row) =>
      (!category || row.categoryKey === category) &&
      (!priority || row.priority === priority) &&
      (unread !== "true" || !row.readAt) &&
      (unread !== "false" || Boolean(row.readAt)),
    );
    const model = buildNotificationCenterModel({
      enabledCategoryKeys: result.data.enabledCategoryKeys,
      rows,
    });
    return Response.json({ ok: true, data: { count: rows.length, unreadCount: model.summary.unreadCount, rows, model, preferences: result.data.preferences } });
  }

  return Response.json({
    ok: true,
    data: {
      count: result.data.rows.length,
      unreadCount: result.data.model.summary.unreadCount,
      rows: result.data.rows,
      model: result.data.model,
      preferences: result.data.preferences,
    },
  });
}
