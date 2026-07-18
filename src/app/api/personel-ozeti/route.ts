import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const entityService = createEntityCrudService({ now: () => new Date().toISOString(), repository: createEntityPrismaRepository(prisma) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["employees"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await entityService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey), slug: "personel" });
  if (!result.ok) return Response.json(result, { status: 400 });
  const roleCounts = result.data.rows.reduce<Record<string, number>>((counts, row) => { const role = row.Rol ?? row.role ?? "Belirtilmemiş"; counts[role] = (counts[role] ?? 0) + 1; return counts; }, {});
  const statusCounts = result.data.rows.reduce<Record<string, number>>((counts, row) => { const status = row.Durum ?? row.status ?? "Belirtilmemiş"; counts[status] = (counts[status] ?? 0) + 1; return counts; }, {});
  return Response.json({ ok: true, data: { totalCount: result.data.rows.length, roleCounts, statusCounts } });
}
