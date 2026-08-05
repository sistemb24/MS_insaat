import { basename } from "node:path";

import { createDocumentCenterPrismaRepository, type DocumentCenterPrismaClientLike } from "@/lib/document-center-prisma-repository";
import { createDocumentStorageRuntime } from "@/lib/document-storage-runtime";
import { prisma } from "@/lib/prisma";
import { getActiveTenantScope } from "@/lib/server-active-scope";
import { accessProfileService } from "@/lib/access-profile-runtime";
import { canUseDocumentPermission } from "@/lib/access-profile";

export const runtime = "nodejs";

const documentCenterRepository = createDocumentCenterPrismaRepository(
  prisma as unknown as DocumentCenterPrismaClientLike,
);
const documentStorage = createDocumentStorageRuntime().storage;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim();

  if (!fileId) {
    return Response.json({ ok: false, errors: ["Dosya seçimi zorunludur."] }, { status: 400 });
  }

  const baseScope = await getActiveTenantScope();
  const scope =
    baseScope.userRole === "viewer"
      ? {
          ...baseScope,
          documentAccess: await accessProfileService.resolveDocumentAccess({
            scope: baseScope,
          }),
        }
      : baseScope;
  if (
    !canUseDocumentPermission(
      scope.userRole,
      scope.documentAccess,
      "document.view",
    )
  ) {
    return Response.json(
      { ok: false, errors: ["Yetki profiliniz doküman indirmeye izin vermiyor."] },
      { status: 403 },
    );
  }
  const files = await documentCenterRepository.listFiles({ scope });
  const file = files.find((item) => item.id === fileId);

  if (!file || !file.storageKey) {
    return Response.json({ ok: false, errors: ["Dosya bulunamadı."] }, { status: 404 });
  }

  const object = await documentStorage.readObject(file.storageKey);
  const response = new Response(Buffer.from(object.content), {
    headers: {
      "Content-Disposition": `attachment; filename="${escapeDownloadFileName(file.name)}"`,
      "Content-Type": object.contentType || file.mimeType || "application/octet-stream",
      "Content-Length": String(object.sizeBytes),
      "X-Content-Type-Options": "nosniff",
    },
  });

  return response;
}

function escapeDownloadFileName(value: string) {
  return basename(value).replaceAll("\\", "_").replaceAll('"', "'");
}
