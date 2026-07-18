import { authenticateBearerApiKey, buildTenantScopeFromApiKey } from "@/lib/api-key-auth";
import { createApiKeyPrismaRepository, type ApiKeyPrismaClientLike } from "@/lib/api-key-prisma-repository";
import { createEntityCrudService } from "@/lib/entity-crud-service";
import { createEntityPrismaRepository } from "@/lib/entity-prisma-repository";
import { createPurchaseInvoicePrismaRepository } from "@/lib/purchase-invoice-prisma-repository";
import { createPurchaseInvoiceService } from "@/lib/purchase-invoice-service";
import { prisma } from "@/lib/prisma";
import { createStockMinimumSettingPrismaRepository } from "@/lib/stock-minimum-setting-prisma-repository";
import {
  buildStockMinimumThresholds,
  buildStockMinimumThresholdsFromStockCards,
  createStockMinimumSettingService,
  mergeStockMinimumThresholds,
} from "@/lib/stock-minimum-setting-service";
import { summarizeStockDepotFromInvoices } from "@/lib/stock-depot-service";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const entityService = createEntityCrudService({
  now: () => new Date().toISOString(),
  repository: createEntityPrismaRepository(prisma),
});
const purchaseInvoiceService = createPurchaseInvoiceService({
  now: () => new Date().toISOString(),
  repository: createPurchaseInvoicePrismaRepository(prisma),
});
const stockMinimumSettingService = createStockMinimumSettingService({
  repository: createStockMinimumSettingPrismaRepository(prisma),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["stock"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers: authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const scope = buildTenantScopeFromApiKey(authResult.data.apiKey);
  const [purchaseInvoices, stockCardRowsResult, stockMinimumSettingsResult] =
    await Promise.all([
      purchaseInvoiceService.list({ scope }),
      entityService.list({ scope, slug: "stok-kartlari" }),
      stockMinimumSettingService.list({ scope }),
    ]);

  if (!purchaseInvoices.ok) {
    return Response.json(purchaseInvoices, { status: 400 });
  }

  if (!stockCardRowsResult.ok) {
    return Response.json(stockCardRowsResult, { status: 400 });
  }

  if (!stockMinimumSettingsResult.ok) {
    return Response.json(stockMinimumSettingsResult, { status: 400 });
  }

  const depotReadModel = summarizeStockDepotFromInvoices(
    purchaseInvoices.data.rows,
  );
  const stockCardThresholds = buildStockMinimumThresholdsFromStockCards(
    stockCardRowsResult.data.rows,
  );
  const stockMinimumThresholds = buildStockMinimumThresholds(
    stockMinimumSettingsResult.data.rows,
  );
  const mergedThresholds = mergeStockMinimumThresholds({
    settings: stockMinimumThresholds,
    stockCards: stockCardThresholds,
  });

  return Response.json({
    ok: true,
    data: {
      count: depotReadModel.summaryRows.length,
      movementRows: depotReadModel.movementRows,
      stockCardRows: stockCardRowsResult.data.rows,
      stockMinimumSettings: stockMinimumSettingsResult.data.rows,
      summaryRows: depotReadModel.summaryRows,
      thresholds: mergedThresholds,
    },
  });
}
