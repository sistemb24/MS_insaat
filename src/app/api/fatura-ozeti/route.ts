import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const entityService = createEntityCrudService({ now: () => new Date().toISOString(), repository: createEntityPrismaRepository(prisma) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["invoices"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await entityService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey), slug: "faturalar" });
  if (!result.ok) return Response.json(result, { status: 400 });
  const statusCounts = result.data.rows.reduce<Record<string, number>>((counts, row) => { const status = row.Durum ?? row.status ?? "Belirtilmemiş"; counts[status] = (counts[status] ?? 0) + 1; return counts; }, {});
  const totalAmount = result.data.rows.reduce((sum, row) => { const raw = row["Genel Toplam"] ?? row.grandTotal ?? row["Genel toplam"] ?? "0"; const amount = Number(String(raw).replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")); return sum + (Number.isFinite(amount) ? amount : 0); }, 0);
  return Response.json({ ok: true, data: { totalCount: result.data.rows.length, statusCounts, totalAmount } });
}
