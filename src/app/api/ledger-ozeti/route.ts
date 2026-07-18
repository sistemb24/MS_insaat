import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { createLedgerPrismaRepository, type LedgerPrismaClientLike } from "@/lib/ledger-prisma-repository";
import { createLedgerService } from "@/lib/ledger-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const ledgerService = createLedgerService({ repository: createLedgerPrismaRepository(prisma as unknown as LedgerPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["ledger"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const entries = await ledgerService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  const totalsByCurrency = entries.reduce<Record<string, { debitTotal: number; creditTotal: number; entryCount: number }>>((totals, entry) => {
    const current = totals[entry.currency] ?? { debitTotal: 0, creditTotal: 0, entryCount: 0 };
    current.debitTotal += entry.debitTotal;
    current.creditTotal += entry.creditTotal;
    current.entryCount += 1;
    totals[entry.currency] = current;
    return totals;
  }, {});
  return Response.json({ ok: true, data: { totalCount: entries.length, totalsByCurrency } });
}
