import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  buildEffectiveCompanyProfile,
  createCompanyProfileFallback,
  createCompanyProfileId,
  createCompanyProfileMutationKey,
  CompanyProfileDomainError,
  getCompanyProfilePermission,
  normalizeCompanyProfileValues,
  type CompanyProfileSaveInput,
  type CompanyProfileSnapshot,
  type CompanyProfileValues,
  type EffectiveCompanyProfile,
} from "./company-profile";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type CompanyProfileResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type CompanyProfileRepository = {
  create(row: CompanyProfileSnapshot): Promise<CompanyProfileSnapshot>;
  find(scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<CompanyProfileSnapshot | null>;
  update(input: {
    expectedRevisionNo: number;
    row: CompanyProfileSnapshot;
  }): Promise<CompanyProfileSnapshot>;
};

export class CompanyProfileRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyProfileRepositoryError";
  }
}

export function createCompanyProfileService({
  auditLogRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  repository: CompanyProfileRepository;
}) {
  return {
    async get(input: {
      scope: TenantScope;
    }): Promise<CompanyProfileResult<{ profile: EffectiveCompanyProfile }>> {
      const errors = validateTenantScope(input.scope);
      if (errors.length > 0) return { errors, ok: false };
      return {
        data: {
          profile: buildEffectiveCompanyProfile(
            await repository.find(input.scope),
            input.scope,
          ),
        },
        ok: true,
      };
    },

    async save(input: {
      scope: TenantScope;
      values: CompanyProfileSaveInput;
    }): Promise<
      CompanyProfileResult<{
        idempotent: boolean;
        profile: EffectiveCompanyProfile;
      }>
    > {
      const scopeErrors = validateTenantScope(input.scope);
      if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };

      const permission = getCompanyProfilePermission(input.scope.userRole);
      if (!permission.allowed) return { errors: [permission.reason], ok: false };

      try {
        const values = normalizeCompanyProfileValues(input.values);
        const mutationKey = createCompanyProfileMutationKey(
          input.scope,
          input.values.requestKey,
        );
        const existing = await repository.find(input.scope);

        if (existing?.lastMutationKey === mutationKey) {
          return {
            data: {
              idempotent: true,
              profile: buildEffectiveCompanyProfile(existing, input.scope),
            },
            ok: true,
          };
        }

        const expectedRevisionNo = Number(input.values.expectedRevisionNo);
        const currentRevisionNo = existing?.revisionNo ?? 0;
        if (
          !Number.isInteger(expectedRevisionNo) ||
          expectedRevisionNo !== currentRevisionNo
        ) {
          return {
            errors: [
              "Firma profili başka bir işlemle güncellendi; güncel kaydı yeniden açın.",
            ],
            ok: false,
          };
        }

        const timestamp = now();
        const next: CompanyProfileSnapshot = {
          ...values,
          companyId: input.scope.companyId,
          createdAt: existing?.createdAt ?? timestamp,
          createdBy: existing?.createdBy ?? input.scope.userId,
          id: existing?.id ?? createCompanyProfileId(input.scope),
          lastMutationKey: mutationKey,
          revisionNo: currentRevisionNo + 1,
          tenantId: input.scope.tenantId,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        };
        const saved = existing
          ? await repository.update({
              expectedRevisionNo: existing.revisionNo,
              row: next,
            })
          : await repository.create(next);

        if (auditLogRepository) {
          const previous = existing ?? {
            ...createCompanyProfileFallback(input.scope.companyName),
          };
          await auditLogRepository.record(
            createAuditLogEntry(input.scope, {
              action: "company-profile.update",
              entityId: saved.id,
              entityLabel: "Firma Profili",
              entityType: "company-profile",
              metadata: {
                changedFields: getChangedFields(previous, saved),
                revisionFrom: currentRevisionNo,
                revisionTo: saved.revisionNo,
              },
              occurredAt: timestamp,
            }),
          );
        }

        return {
          data: {
            idempotent: false,
            profile: buildEffectiveCompanyProfile(saved, input.scope),
          },
          ok: true,
        };
      } catch (error) {
        if (
          error instanceof CompanyProfileDomainError ||
          error instanceof CompanyProfileRepositoryError
        ) {
          return { errors: [error.message], ok: false };
        }
        return { errors: ["Firma profili kaydedilemedi."], ok: false };
      }
    },
  };
}

export function createCompanyProfileMemoryRepository(
  initialRows: CompanyProfileSnapshot[] = [],
): CompanyProfileRepository {
  const rows = [...initialRows];
  return {
    async create(row) {
      if (rows.some((item) => isSameScope(item, row))) {
        throw new CompanyProfileRepositoryError(
          "Aktif firma için profil zaten bulunuyor.",
        );
      }
      rows.push(row);
      return row;
    },
    async find(scope) {
      return rows.find((row) => isSameScope(row, scope)) ?? null;
    },
    async update({ expectedRevisionNo, row }) {
      const index = rows.findIndex(
        (item) =>
          isSameScope(item, row) && item.revisionNo === expectedRevisionNo,
      );
      if (index < 0) {
        throw new CompanyProfileRepositoryError(
          "Firma profili beklenen revizyonda bulunamadı.",
        );
      }
      rows[index] = row;
      return row;
    },
  };
}

function isSameScope(
  left: Pick<CompanyProfileSnapshot, "companyId" | "tenantId">,
  right: Pick<TenantScope, "companyId" | "tenantId">,
) {
  return left.tenantId === right.tenantId && left.companyId === right.companyId;
}

const profileFields: Array<keyof CompanyProfileValues> = [
  "legalName",
  "taxOffice",
  "taxNumber",
  "mersisNumber",
  "phone",
  "email",
  "addressLine",
  "district",
  "city",
  "postalCode",
];

function getChangedFields(
  previous: CompanyProfileValues,
  next: CompanyProfileValues,
) {
  return profileFields.filter((field) => previous[field] !== next[field]);
}
