import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createCashBankMovementPrismaRepository, type CashBankMovementPrismaClientLike } from "@/lib/cash-bank-movement-prisma-repository";
import { createCashBankMovementService } from "@/lib/cash-bank-movement-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const cashBankService = createCashBankMovementService({ now: () => new Date().toISOString(), repository: createCashBankMovementPrismaRepository(prisma as unknown as CashBankMovementPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["cash-bank"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await cashBankService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  const currencyTotals = result.data.rows.reduce<Record<string, { incomingTotal: number; outgoingTotal: number; movementCount: number }>>((totals, row) => { const current = totals[row.currency] ?? { incomingTotal: 0, outgoingTotal: 0, movementCount: 0 }; current.movementCount += 1; if (row.direction === "Giriş") current.incomingTotal += row.amount; else current.outgoingTotal += row.amount; totals[row.currency] = current; return totals; }, {});
  return Response.json({ ok: true, data: { totalCount: result.data.rows.length, currencyTotals } });
}
