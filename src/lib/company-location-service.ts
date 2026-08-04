import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  buildCompanyLocationDirectory,
  createCompanyLocationId,
  createCompanyLocationMutationKey,
  CompanyLocationDomainError,
  getCompanyLocationPermission,
  normalizeCompanyLocationValues,
  type CompanyLocationDirectoryRow,
  type CompanyLocationSaveInput,
  type CompanyLocationSiteSnapshot,
  type CompanyLocationSnapshot,
  type CompanyLocationValues,
} from "./company-location";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type CompanyLocationResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type CompanyLocationRepository = {
  create(row: CompanyLocationSnapshot): Promise<CompanyLocationSnapshot>;
  find(
    scope: Pick<TenantScope, "companyId" | "tenantId">,
    id: string,
  ): Promise<CompanyLocationSnapshot | null>;
  list(
    scope: Pick<TenantScope, "companyId" | "tenantId">,
  ): Promise<CompanyLocationSnapshot[]>;
  listSites(
    scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
  ): Promise<CompanyLocationSiteSnapshot[]>;
  update(input: {
    expectedRevisionNo: number;
    row: CompanyLocationSnapshot;
  }): Promise<CompanyLocationSnapshot>;
};

export class CompanyLocationRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyLocationRepositoryError";
  }
}

export function createCompanyLocationService({
  auditLogRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  repository: CompanyLocationRepository;
}) {
  return {
    async list(input: {
      scope: TenantScope;
    }): Promise<
      CompanyLocationResult<{ locations: CompanyLocationDirectoryRow[] }>
    > {
      const errors = validateTenantScope(input.scope);
      if (errors.length > 0) return { errors, ok: false };
      const [locations, sites] = await Promise.all([
        repository.list(input.scope),
        repository.listSites(input.scope),
      ]);
      return {
        data: {
          locations: buildCompanyLocationDirectory({
            locations,
            scope: input.scope,
            sites,
          }),
        },
        ok: true,
      };
    },

    async save(input: {
      scope: TenantScope;
      values: CompanyLocationSaveInput;
    }): Promise<
      CompanyLocationResult<{
        idempotent: boolean;
        location: CompanyLocationDirectoryRow;
      }>
    > {
      const scopeErrors = validateTenantScope(input.scope);
      if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };
      const permission = getCompanyLocationPermission(input.scope.userRole);
      if (!permission.allowed) return { errors: [permission.reason], ok: false };

      try {
        const values = normalizeCompanyLocationValues(input.values);
        const mutationKey = createCompanyLocationMutationKey(
          input.scope,
          input.values.requestKey,
        );
        const existing = input.values.id
          ? await repository.find(input.scope, input.values.id)
          : null;

        if (input.values.id && !existing) {
          return { errors: ["Lokasyon bulunamadı."], ok: false };
        }
        if (existing?.lastMutationKey === mutationKey) {
          return {
            data: {
              idempotent: true,
              location: toDirectoryRow(existing, true),
            },
            ok: true,
          };
        }

        const currentRevisionNo = existing?.revisionNo ?? 0;
        if (
          !Number.isInteger(input.values.expectedRevisionNo) ||
          input.values.expectedRevisionNo !== currentRevisionNo
        ) {
          return {
            errors: [
              "Lokasyon başka bir işlemle güncellendi; güncel kaydı yeniden açın.",
            ],
            ok: false,
          };
        }

        const rows = await repository.list(input.scope);
        if (
          values.status === "ACTIVE" &&
          values.type === "HEADQUARTERS" &&
          rows.some(
            (row) =>
              row.id !== existing?.id &&
              row.type === "HEADQUARTERS" &&
              row.status === "ACTIVE",
          )
        ) {
          return {
            errors: ["Bir firmada yalnız bir aktif merkez bulunabilir."],
            ok: false,
          };
        }
        if (
          rows.some(
            (row) =>
              row.id !== existing?.id &&
              row.code.toUpperCase() === values.code,
          )
        ) {
          return { errors: ["Lokasyon kodu firma içinde tekil olmalıdır."], ok: false };
        }

        const timestamp = now();
        const next: CompanyLocationSnapshot = {
          ...values,
          companyId: input.scope.companyId,
          createdAt: existing?.createdAt ?? timestamp,
          createdBy: existing?.createdBy ?? input.scope.userId,
          id:
            existing?.id ??
            createCompanyLocationId(input.scope, values.code),
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
          await auditLogRepository.record(
            createAuditLogEntry(input.scope, {
              action: existing
                ? "company-location.update"
                : "company-location.create",
              entityId: saved.id,
              entityLabel: `${saved.code} · ${saved.name}`,
              entityType: "company-location",
              metadata: {
                changedFields: getChangedFields(existing, saved),
                code: saved.code,
                revisionFrom: currentRevisionNo,
                revisionTo: saved.revisionNo,
                statusFrom: existing?.status ?? null,
                statusTo: saved.status,
                type: saved.type,
              },
              occurredAt: timestamp,
            }),
          );
        }

        return {
          data: {
            idempotent: false,
            location: toDirectoryRow(saved, true),
          },
          ok: true,
        };
      } catch (error) {
        if (
          error instanceof CompanyLocationDomainError ||
          error instanceof CompanyLocationRepositoryError
        ) {
          return { errors: [error.message], ok: false };
        }
        return { errors: ["Lokasyon kaydedilemedi."], ok: false };
      }
    },
  };
}

export function createCompanyLocationMemoryRepository({
  locations = [],
  sites = [],
}: {
  locations?: CompanyLocationSnapshot[];
  sites?: CompanyLocationSiteSnapshot[];
} = {}): CompanyLocationRepository {
  const rows = [...locations];
  return {
    async create(row) {
      if (rows.some((item) => item.id === row.id)) {
        throw new CompanyLocationRepositoryError("Lokasyon zaten bulunuyor.");
      }
      rows.push(row);
      return row;
    },
    async find(scope, id) {
      return (
        rows.find((row) => row.id === id && isSameScope(row, scope)) ?? null
      );
    },
    async list(scope) {
      return rows.filter((row) => isSameScope(row, scope));
    },
    async listSites() {
      return sites;
    },
    async update({ expectedRevisionNo, row }) {
      const index = rows.findIndex(
        (item) =>
          item.id === row.id &&
          isSameScope(item, row) &&
          item.revisionNo === expectedRevisionNo,
      );
      if (index < 0) {
        throw new CompanyLocationRepositoryError(
          "Lokasyon beklenen revizyonda bulunamadı.",
        );
      }
      rows[index] = row;
      return row;
    },
  };
}

function isSameScope(
  left: Pick<CompanyLocationSnapshot, "companyId" | "tenantId">,
  right: Pick<TenantScope, "companyId" | "tenantId">,
) {
  return left.tenantId === right.tenantId && left.companyId === right.companyId;
}

function toDirectoryRow(
  row: CompanyLocationSnapshot,
  canManage: boolean,
): CompanyLocationDirectoryRow {
  return {
    addressLine: row.addressLine,
    canManage,
    city: row.city,
    code: row.code,
    district: row.district,
    email: row.email,
    href: null,
    id: row.id,
    name: row.name,
    phone: row.phone,
    postalCode: row.postalCode,
    responsiblePerson: row.responsiblePerson,
    revisionNo: row.revisionNo,
    source: "company-location",
    status: row.status,
    type: row.type,
    updatedAt: row.updatedAt,
  };
}

const fields: Array<keyof CompanyLocationValues> = [
  "code",
  "name",
  "type",
  "responsiblePerson",
  "phone",
  "email",
  "addressLine",
  "district",
  "city",
  "postalCode",
  "status",
];

function getChangedFields(
  previous: CompanyLocationValues | null,
  next: CompanyLocationValues,
) {
  if (!previous) return fields;
  return fields.filter((field) => previous[field] !== next[field]);
}
