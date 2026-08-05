"use server";

import { revalidatePath } from "next/cache";

import {
  CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES,
  getConstructionMeasurementImportPermission,
  parseConstructionMeasurementImportCsv,
  type ConstructionMeasurementImportOperation,
  type ConstructionMeasurementImportStatus,
} from "@/lib/construction-measurement-import";
import {
  ConstructionMeasurementImportRepositoryError,
  createConstructionMeasurementImportPrismaRepository,
  type ConstructionMeasurementImportPrismaClientLike,
} from "@/lib/construction-measurement-import-prisma-repository";
import { prisma } from "@/lib/prisma";
import type { TenantScope } from "@/lib/tenant-scope";
import { getSubscriptionFeatureActionContext } from "./subscription-feature-action-guard";

const repository = createConstructionMeasurementImportPrismaRepository(
  prisma as unknown as ConstructionMeasurementImportPrismaClientLike,
);

export type ConstructionMeasurementImportUploadFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export async function listConstructionMeasurementImportBatchesAction(
  projectId: string,
) {
  const context = await getImportContext("read");
  if (!context.ok) return context.result;
  if (!projectId.trim()) return failure("İnşaat projesi zorunludur.");

  try {
    const rows = await repository.listProjectBatches({
      scope: context.scope,
      projectId: projectId.trim(),
    });
    return {
      ok: true as const,
      data: {
        rows,
        canCreate: getConstructionMeasurementImportPermission({
          role: context.scope.userRole,
          operation: "create",
          periodClosed: context.scope.periodClosed,
        }).allowed,
      },
    };
  } catch {
    return failure("Import geçmişi güvenli biçimde yüklenemedi.");
  }
}

export async function getConstructionMeasurementImportBatchAction(
  batchId: string,
) {
  const context = await getImportContext("read");
  if (!context.ok) return context.result;
  if (!batchId.trim()) return failure("Import batch kimliği zorunludur.");

  try {
    const batch = await repository.findBatch({
      scope: context.scope,
      batchId: batchId.trim(),
    });
    if (!batch) return failure("Import batch'i aktif kapsamda bulunamadı.");
    return {
      ok: true as const,
      data: {
        batch,
        permissions: mutationPermissions(context.scope, batch.status),
      },
    };
  } catch {
    return failure("Import batch'i güvenli biçimde yüklenemedi.");
  }
}

export async function uploadConstructionMeasurementImportAction(input: {
  projectId: string;
  sourceProgressPaymentId: string;
  file: ConstructionMeasurementImportUploadFile;
}) {
  const context = await getImportContext("create");
  if (!context.ok) return context.result;
  if (!input.projectId.trim() || !input.sourceProgressPaymentId.trim()) {
    return failure("Proje ve kaynak hakediş zorunludur.");
  }
  if (!isUploadFile(input.file)) {
    return failure("Geçerli bir CSV dosyası seçin.");
  }
  if (input.file.size > CONSTRUCTION_MEASUREMENT_IMPORT_MAX_BYTES) {
    return failure("CSV dosyası en fazla 2 MiB olabilir.");
  }

  try {
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    if (bytes.byteLength !== input.file.size) {
      return failure("Dosya boyutu doğrulanamadı.");
    }
    const contractItems = await prisma.constructionContractItem.findMany({
      where: {
        tenantId: context.scope.tenantId,
        companyId: context.scope.companyId,
        periodId: context.scope.periodId,
        projectId: input.projectId.trim(),
      },
      select: {
        id: true,
        itemCode: true,
        unit: true,
        isActive: true,
      },
    });
    const parseResult = parseConstructionMeasurementImportCsv({
      bytes,
      fileName: input.file.name,
      contentType: input.file.type,
      contractItems,
    });
    if (parseResult.fileErrors.length) {
      return failure(...parseResult.fileErrors.map(fileErrorMessage));
    }
    const result = await repository.createBatch({
      scope: context.scope,
      projectId: input.projectId.trim(),
      sourceProgressPaymentId: input.sourceProgressPaymentId.trim(),
      parseResult,
      nowIso: new Date().toISOString(),
    });
    if (result.kind !== "idempotent") revalidatePath("/hakedis");
    return { ok: true as const, data: result };
  } catch (error) {
    return safeFailure(error);
  }
}

export async function validateConstructionMeasurementImportBatchAction(
  batchId: string,
) {
  return mutateBatch("validate", batchId);
}

export async function applyConstructionMeasurementImportBatchAction(
  batchId: string,
) {
  return mutateBatch("apply", batchId);
}

export async function cancelConstructionMeasurementImportBatchAction(
  batchId: string,
) {
  return mutateBatch("cancel", batchId);
}

async function mutateBatch(
  operation: "validate" | "apply" | "cancel",
  batchId: string,
) {
  const baseContext = await getSubscriptionFeatureActionContext("progress-payments");
  if (!baseContext.ok) return baseContext.result;
  if (!batchId.trim()) return failure("Import batch kimliği zorunludur.");

  const readPermission = getConstructionMeasurementImportPermission({
    role: baseContext.scope.userRole,
    operation: "read",
  });
  if (!readPermission.allowed) return permissionFailure(readPermission.reason);

  try {
    const batch = await repository.findBatch({
      scope: baseContext.scope,
      batchId: batchId.trim(),
    });
    if (!batch) return failure("Import batch'i aktif kapsamda bulunamadı.");
    const permission = getConstructionMeasurementImportPermission({
      role: baseContext.scope.userRole,
      operation,
      status: batch.status,
      periodClosed: baseContext.scope.periodClosed,
    });
    if (!permission.allowed) return permissionFailure(permission.reason);

    const input = {
      scope: baseContext.scope,
      batchId: batch.id,
      nowIso: new Date().toISOString(),
    };
    const result = operation === "validate"
      ? await repository.validateBatch(input)
      : operation === "apply"
        ? await repository.applyBatch(input)
        : await repository.cancelBatch(input);
    if (result.kind !== "idempotent") revalidatePath("/hakedis");
    return { ok: true as const, data: result };
  } catch (error) {
    return safeFailure(error);
  }
}

async function getImportContext(operation: "read" | "create") {
  const context = await getSubscriptionFeatureActionContext("progress-payments");
  if (!context.ok) return context;
  const permission = getConstructionMeasurementImportPermission({
    role: context.scope.userRole,
    operation,
    periodClosed: context.scope.periodClosed,
  });
  return permission.allowed
    ? context
    : {
        ok: false as const,
        result: permissionFailure(permission.reason),
      };
}

function mutationPermissions(
  scope: TenantScope,
  status: ConstructionMeasurementImportStatus,
) {
  return {
    canValidate: permissionAllowed(scope, "validate", status),
    canApply: permissionAllowed(scope, "apply", status),
    canCancel: permissionAllowed(scope, "cancel", status),
  };
}

function permissionAllowed(
  scope: TenantScope,
  operation: ConstructionMeasurementImportOperation,
  status: ConstructionMeasurementImportStatus,
) {
  return getConstructionMeasurementImportPermission({
    role: scope.userRole,
    operation,
    status,
    periodClosed: scope.periodClosed,
  }).allowed;
}

function isUploadFile(
  value: ConstructionMeasurementImportUploadFile | null | undefined,
): value is ConstructionMeasurementImportUploadFile {
  return Boolean(
    value
    && typeof value.name === "string"
    && typeof value.type === "string"
    && Number.isInteger(value.size)
    && value.size >= 0
    && typeof value.arrayBuffer === "function",
  );
}

function fileErrorMessage(code: string) {
  const messages: Record<string, string> = {
    FILE_NAME_INVALID: "Yalnız .csv uzantılı dosyalar kabul edilir.",
    FILE_TYPE_INVALID: "Dosya içerik türü CSV ile uyumlu değil.",
    FILE_EMPTY: "CSV dosyası boş olamaz.",
    FILE_TOO_LARGE: "CSV dosyası en fazla 2 MiB olabilir.",
    UTF8_INVALID: "CSV dosyası geçerli UTF-8 metin olmalıdır.",
    NUL_CHARACTER: "CSV dosyası geçersiz kontrol karakteri içeriyor.",
    CSV_UNCLOSED_QUOTE: "CSV dosyasında kapanmamış tırnak bulundu.",
    HEADER_REQUIRED: "CSV dosyasında poz_no ve miktar başlıkları zorunludur.",
    HEADER_DUPLICATE: "CSV dosyasında aynı iş alanına ait başlık tekrarlanıyor.",
    DATA_ROW_REQUIRED: "CSV dosyasında en az bir veri satırı bulunmalıdır.",
    ROW_LIMIT_EXCEEDED: "CSV dosyası en fazla 500 veri satırı içerebilir.",
  };
  return messages[code] ?? "CSV dosyası doğrulanamadı.";
}

function permissionFailure(reason: string) {
  if (reason === "PERIOD_CLOSED") {
    return failure("Kapalı dönemde import işlemi yapılamaz.");
  }
  if (reason === "INVALID_STATUS") {
    return failure("Import batch durumu bu işleme uygun değil.");
  }
  return failure("Bu import işlemi için muhasebe veya yönetici yetkisi gereklidir.");
}

function safeFailure(error: unknown) {
  if (error instanceof ConstructionMeasurementImportRepositoryError) {
    if (error.code === "NOT_FOUND" || error.code === "SCOPE_MISMATCH") {
      return failure("Import kaydı veya kaynakları aktif kapsamda bulunamadı.");
    }
    return failure(error.message);
  }
  return failure("Import işlemi güvenli biçimde tamamlanamadı.");
}

function failure(...errors: string[]) {
  return { ok: false as const, errors };
}
