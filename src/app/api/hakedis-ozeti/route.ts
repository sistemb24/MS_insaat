import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createProgressPaymentPrismaRepository, type ProgressPaymentPrismaClientLike } from "@/lib/progress-payment-prisma-repository";
import { createProgressPaymentService } from "@/lib/progress-payment-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const progressPaymentService = createProgressPaymentService({ now: () => new Date().toISOString(), repository: createProgressPaymentPrismaRepository(prisma as unknown as ProgressPaymentPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["progress-payments"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await progressPaymentService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  const rows = result.data.rows;
  const statusCounts = rows.reduce<Record<string, number>>((counts, row) => { counts[row.status] = (counts[row.status] ?? 0) + 1; return counts; }, {});
  return Response.json({ ok: true, data: { totalCount: rows.length, statusCounts, grandTotal: rows.reduce((sum, row) => sum + row.grandTotal, 0) } });
}
