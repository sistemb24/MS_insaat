import { createHash } from "node:crypto";

import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  createCompanyBrandAssetId,
  createCompanyBrandMutationKey,
  CompanyBrandAssetDomainError,
  getCompanyBrandAssetPermission,
  validateCompanyLogo,
  type CompanyBrandAssetSnapshot,
  type EffectiveCompanyBrandAsset,
} from "./company-brand-asset";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type CompanyBrandAssetResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type CompanyBrandAssetRepository = {
  create(row: CompanyBrandAssetSnapshot): Promise<CompanyBrandAssetSnapshot>;
  find(scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<CompanyBrandAssetSnapshot | null>;
  update(input: { expectedRevisionNo: number; row: CompanyBrandAssetSnapshot }): Promise<CompanyBrandAssetSnapshot>;
};

export class CompanyBrandAssetRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyBrandAssetRepositoryError";
  }
}

export function createCompanyBrandAssetService({
  auditLogRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  repository: CompanyBrandAssetRepository;
}) {
  async function get(scope: TenantScope) {
    const errors = validateTenantScope(scope);
    if (errors.length > 0) return { errors, ok: false } as const;
    return {
      data: { asset: toEffective(await repository.find(scope), scope) },
      ok: true,
    } as const;
  }

  async function mutate(input: {
    content?: Uint8Array;
    expectedRevisionNo: number;
    mimeType?: string;
    originalFileName?: string;
    remove?: boolean;
    requestKey: string;
    scope: TenantScope;
  }): Promise<CompanyBrandAssetResult<{ asset: EffectiveCompanyBrandAsset; idempotent: boolean }>> {
    const scopeErrors = validateTenantScope(input.scope);
    if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };
    const permission = getCompanyBrandAssetPermission(input.scope.userRole);
    if (!permission.allowed) return { errors: [permission.reason], ok: false };
    try {
      const mutationKey = createCompanyBrandMutationKey(input.scope, input.requestKey);
      const existing = await repository.find(input.scope);
      if (existing?.lastMutationKey === mutationKey) {
        return { data: { asset: toEffective(existing, input.scope), idempotent: true }, ok: true };
      }
      const currentRevision = existing?.revisionNo ?? 0;
      if (!Number.isInteger(input.expectedRevisionNo) || input.expectedRevisionNo !== currentRevision) {
        return { errors: ["Firma logosu başka bir işlemle güncellendi; güncel kaydı yeniden açın."], ok: false };
      }
      if (input.remove && (!existing || existing.status !== "ACTIVE")) {
        return { errors: ["Kaldırılacak aktif firma logosu bulunamadı."], ok: false };
      }
      const validated = input.remove ? null : validateCompanyLogo({
        content: input.content ?? new Uint8Array(),
        mimeType: input.mimeType ?? "",
        originalFileName: input.originalFileName ?? "",
      });
      const timestamp = now();
      const next: CompanyBrandAssetSnapshot = {
        companyId: input.scope.companyId,
        content: validated?.content ?? null,
        createdAt: existing?.createdAt ?? timestamp,
        createdBy: existing?.createdBy ?? input.scope.userId,
        height: validated?.height ?? null,
        id: existing?.id ?? createCompanyBrandAssetId(input.scope),
        lastMutationKey: mutationKey,
        mimeType: validated?.mimeType ?? null,
        originalFileName: validated?.originalFileName ?? "",
        revisionNo: currentRevision + 1,
        sha256: validated ? createHash("sha256").update(validated.content).digest("hex") : "",
        sizeBytes: validated?.sizeBytes ?? 0,
        status: input.remove ? "REMOVED" : "ACTIVE",
        tenantId: input.scope.tenantId,
        updatedAt: timestamp,
        updatedBy: input.scope.userId,
        width: validated?.width ?? null,
      };
      const saved = existing
        ? await repository.update({ expectedRevisionNo: currentRevision, row: next })
        : await repository.create(next);
      if (auditLogRepository) {
        await auditLogRepository.record(createAuditLogEntry(input.scope, {
          action: input.remove ? "company-brand.logo-remove" : existing ? "company-brand.logo-update" : "company-brand.logo-create",
          entityId: saved.id,
          entityLabel: "Firma Belge Logosu",
          entityType: "company-brand-asset",
          metadata: {
            height: saved.height,
            mimeType: saved.mimeType,
            revisionFrom: currentRevision,
            revisionTo: saved.revisionNo,
            sizeBytes: saved.sizeBytes,
            statusFrom: existing?.status ?? null,
            statusTo: saved.status,
            width: saved.width,
          },
          occurredAt: timestamp,
        }));
      }
      return { data: { asset: toEffective(saved, input.scope), idempotent: false }, ok: true };
    } catch (error) {
      if (error instanceof CompanyBrandAssetDomainError || error instanceof CompanyBrandAssetRepositoryError) {
        return { errors: [error.message], ok: false };
      }
      return { errors: ["Firma logosu kaydedilemedi."], ok: false };
    }
  }

  return { get: ({ scope }: { scope: TenantScope }) => get(scope), mutate };
}

export function toEffective(
  row: CompanyBrandAssetSnapshot | null,
  scope: TenantScope,
): EffectiveCompanyBrandAsset {
  const canManage = getCompanyBrandAssetPermission(scope.userRole).allowed;
  if (!row || row.status !== "ACTIVE" || !row.content || !row.mimeType) {
    return { canManage, dataUrl: null, height: null, mimeType: null, revisionNo: row?.revisionNo ?? 0, sizeBytes: 0, source: "none", updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null, width: null };
  }
  return {
    canManage,
    dataUrl: `data:${row.mimeType};base64,${Buffer.from(row.content).toString("base64")}`,
    height: row.height,
    mimeType: row.mimeType,
    revisionNo: row.revisionNo,
    sizeBytes: row.sizeBytes,
    source: "persisted",
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    width: row.width,
  };
}

export function createCompanyBrandAssetMemoryRepository(initial: CompanyBrandAssetSnapshot | null = null): CompanyBrandAssetRepository {
  let row = initial;
  return {
    async create(next) {
      if (row) throw new CompanyBrandAssetRepositoryError("Firma marka asset'i zaten bulunuyor.");
      row = next; return next;
    },
    async find(scope) {
      return row?.tenantId === scope.tenantId && row.companyId === scope.companyId ? row : null;
    },
    async update({ expectedRevisionNo, row: next }) {
      if (!row || row.revisionNo !== expectedRevisionNo || row.tenantId !== next.tenantId || row.companyId !== next.companyId) throw new CompanyBrandAssetRepositoryError("Firma logosu beklenen revizyonda bulunamadı.");
      row = next; return next;
    },
  };
}
