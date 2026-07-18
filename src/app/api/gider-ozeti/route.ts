import { prisma } from "@/lib/prisma";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createCashBankMovementPrismaRepository, type CashBankMovementPrismaClientLike } from "@/lib/cash-bank-movement-prisma-repository";
import { createExpensePrismaRepository, type ExpensePrismaClientLike } from "@/lib/expense-prisma-repository";
import { createExpenseService } from "@/lib/expense-service";

export const runtime = "nodejs";
const apiKeyRepository = createApiKeyPrismaRepository(prisma as unknown as ApiKeyPrismaClientLike);
const expenseService = createExpenseService({ now: () => new Date().toISOString(), repository: createExpensePrismaRepository(prisma as unknown as ExpensePrismaClientLike), cashBankMovementRepository: createCashBankMovementPrismaRepository(prisma as unknown as CashBankMovementPrismaClientLike) });

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({ authorizationHeader: request.headers.get("authorization"), requiredScopes: ["expenses"], repository: apiKeyRepository });
  if (!authResult.ok) return Response.json(authResult, { headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined, status: authResult.status });
  const result = await expenseService.list({ scope: buildTenantScopeFromApiKey(authResult.data.apiKey) });
  if (!result.ok) return Response.json(result, { status: 400 });
  const statusCounts = result.data.rows.reduce<Record<string, number>>((counts, row) => { counts[row.status] = (counts[row.status] ?? 0) + 1; return counts; }, {});
  const currencyTotals = result.data.rows.reduce<Record<string, number>>((totals, row) => { totals[row.currency] = (totals[row.currency] ?? 0) + row.grandTotal; return totals; }, {});
  return Response.json({ ok: true, data: { totalCount: result.data.rows.length, statusCounts, currencyTotals } });
}
