import { basename, join } from "node:path";

import { createDocumentCenterPrismaRepository, type DocumentCenterPrismaClientLike } from "@/lib/document-center-prisma-repository";
import { createLocalDocumentStorage } from "@/lib/document-storage";
import { prisma } from "@/lib/prisma";
import { getActiveTenantScope } from "@/lib/server-active-scope";

export const runtime = "nodejs";

const documentCenterRepository = createDocumentCenterPrismaRepository(
  prisma as unknown as DocumentCenterPrismaClientLike,
);
const documentStorage = createLocalDocumentStorage({
  rootDir:
    process.env.NOA_DOCUMENT_STORAGE_DIR ??
    join(process.cwd(), ".noa-storage", "documents"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId")?.trim();

  if (!fileId) {
    return Response.json({ ok: false, errors: ["Dosya seçimi zorunludur."] }, { status: 400 });
  }

  const scope = await getActiveTenantScope();
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
