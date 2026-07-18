import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createStockMinimumSettingPrismaRepository, type StockMinimumSettingPrismaClientLike } from "@/lib/stock-minimum-setting-prisma-repository";
import { createStockMinimumSettingService } from "@/lib/stock-minimum-setting-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const stockMinimumService = createStockMinimumSettingService({ repository: createStockMinimumSettingPrismaRepository(prisma as unknown as StockMinimumSettingPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["stock-minimums"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await stockMinimumService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  return Response.json({ ok: true, data: { count: result.data.rows.length, rows: result.data.rows } });
}
