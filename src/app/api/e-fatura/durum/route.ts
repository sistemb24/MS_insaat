import { prisma } from "@/lib/prisma";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey } from "@/lib/api-key-auth";
import { buildDefaultEFaturaStatusResponse } from "@/lib/e-fatura-service";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);

export async function GET(request: Request) {
  const result = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    repository: apiKeyRepository,
    requiredScopes: ["e-invoice"],
  });

  if (!result.ok) {
    return Response.json(result, {
      headers: result.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: result.status,
    });
  }

  return Response.json({
    ok: true,
    data: buildDefaultEFaturaStatusResponse(result.data.apiKey.id),
  });
}
