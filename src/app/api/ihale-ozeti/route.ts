import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createTenderPrismaRepository, type TenderPrismaClientLike } from "@/lib/tender-prisma-repository";
import { createTenderService, summarizeTenders } from "@/lib/tender-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const tenderService = createTenderService({ now: () => new Date().toISOString(), repository: createTenderPrismaRepository(prisma as unknown as TenderPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["tenders"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await tenderService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  return Response.json({ ok: true, data: summarizeTenders(result.data.rows) });
}
