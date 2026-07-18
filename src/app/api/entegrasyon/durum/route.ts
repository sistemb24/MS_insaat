import { prisma } from "@/lib/prisma";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey } from "@/lib/api-key-auth";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);

export async function GET(request: Request) {
  const result = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    repository: apiKeyRepository,
    requiredScopes: ["integration"],
  });

  if (!result.ok) {
    return Response.json(result, {
      headers: result.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: result.status,
    });
  }

  return Response.json({
    ok: true,
    data: {
      apiKey: {
        companyId: result.data.apiKey.companyId,
        id: result.data.apiKey.id,
        lastUsedAt: result.data.apiKey.lastUsedAt,
        periodId: result.data.apiKey.periodId,
        rateLimitPerSecond: result.data.apiKey.rateLimitPerSecond,
        scopes: result.data.apiKey.scopes,
        status: result.data.apiKey.status,
        tenantId: result.data.apiKey.tenantId,
      },
    },
  });
}
