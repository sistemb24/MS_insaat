import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import { createCashBankMovementPrismaRepository } from "@/lib/cash-bank-movement-prisma-repository";
import { createExpensePrismaRepository } from "@/lib/expense-prisma-repository";
import { createExpenseService } from "@/lib/expense-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const expenseService = createExpenseService({
  cashBankMovementRepository: createCashBankMovementPrismaRepository(prisma),
  now: () => new Date().toISOString(),
  repository: createExpensePrismaRepository(prisma),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["expenses"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers:
        authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const result = await expenseService.list({
    scope: buildTenantScopeFromApiKey(authResult.data.apiKey),
  });

  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  return Response.json({
    ok: true,
    data: {
      count: result.data.rows.length,
      rows: result.data.rows,
    },
  });
}
