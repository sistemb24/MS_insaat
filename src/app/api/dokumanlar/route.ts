import {
  authenticateBearerApiKey,
  buildTenantScopeFromApiKey,
} from "@/lib/api-key-auth";
import {
  createApiKeyPrismaRepository,
  type ApiKeyPrismaClientLike,
} from "@/lib/api-key-prisma-repository";
import {
  createDocumentCenterPrismaRepository,
  type DocumentCenterPrismaClientLike,
} from "@/lib/document-center-prisma-repository";
import { createDocumentCenterService } from "@/lib/document-center-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const apiKeyRepository = createApiKeyPrismaRepository(
  prisma as unknown as ApiKeyPrismaClientLike,
);
const documentCenterService = createDocumentCenterService({
  now: () => new Date().toISOString(),
  repository: createDocumentCenterPrismaRepository(
    prisma as unknown as DocumentCenterPrismaClientLike,
  ),
});

export async function GET(request: Request) {
  const authResult = await authenticateBearerApiKey({
    authorizationHeader: request.headers.get("authorization"),
    requiredScopes: ["documents"],
    repository: apiKeyRepository,
  });

  if (!authResult.ok) {
    return Response.json(authResult, {
      headers:
        authResult.status === 401 ? { "WWW-Authenticate": "Bearer" } : undefined,
      status: authResult.status,
    });
  }

  const result = await documentCenterService.list({
    scope: buildTenantScopeFromApiKey(authResult.data.apiKey),
  });

  if (!result.ok) {
    return Response.json(result, { status: 400 });
  }

  return Response.json({
    ok: true,
    data: {
      fileCount: result.data.files.length,
      folderCount: result.data.folders.length,
      trashedFileCount: result.data.trashedFiles.length,
      files: result.data.files,
      folders: result.data.folders,
      trashedFiles: result.data.trashedFiles,
    },
  });
}
