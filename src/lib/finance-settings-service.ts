import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  buildEffectiveFinanceSettings,
  createFinanceSettingsId,
  createFinanceSettingsMutationKey,
  FinanceSettingsDomainError,
  getFinanceSettingsPermission,
  normalizeFinanceSettingsValues,
  type EffectiveFinanceSettings,
  type FinanceSettingsSaveInput,
  type FinanceSettingsSnapshot,
} from "./finance-settings";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type FinanceSettingsResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type FinanceSettingsRepository = {
  create(row: FinanceSettingsSnapshot): Promise<FinanceSettingsSnapshot>;
  find(scope: TenantScope): Promise<FinanceSettingsSnapshot | null>;
  update(input: {
    expectedRevisionNo: number;
    row: FinanceSettingsSnapshot;
  }): Promise<FinanceSettingsSnapshot>;
};

export class FinanceSettingsRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceSettingsRepositoryError";
  }
}

export function createFinanceSettingsService({
  auditLogRepository,
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  now?: () => string;
  repository: FinanceSettingsRepository;
}) {
  return {
    async get(input: {
      scope: TenantScope;
    }): Promise<FinanceSettingsResult<{ settings: EffectiveFinanceSettings }>> {
      const errors = validateTenantScope(input.scope);
      if (errors.length > 0) return { errors, ok: false };

      return {
        data: {
          settings: buildEffectiveFinanceSettings(
            await repository.find(input.scope),
            input.scope,
          ),
        },
        ok: true,
      };
    },

    async save(input: {
      scope: TenantScope;
      values: FinanceSettingsSaveInput;
    }): Promise<
      FinanceSettingsResult<{
        idempotent: boolean;
        settings: EffectiveFinanceSettings;
      }>
    > {
      const scopeErrors = validateTenantScope(input.scope);
      if (scopeErrors.length > 0) return { errors: scopeErrors, ok: false };

      const permission = getFinanceSettingsPermission({
        periodClosed: input.scope.periodClosed,
        role: input.scope.userRole,
      });
      if (!permission.allowed) return { errors: [permission.reason], ok: false };

      try {
        const values = normalizeFinanceSettingsValues(input.values);
        const mutationKey = createFinanceSettingsMutationKey(
          input.scope,
          input.values.requestKey,
        );
        const existing = await repository.find(input.scope);

        if (existing?.lastMutationKey === mutationKey) {
          return {
            data: {
              idempotent: true,
              settings: buildEffectiveFinanceSettings(existing, input.scope),
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
              "Finans ayarları başka bir işlemle güncellendi; güncel kaydı yeniden açın.",
            ],
            ok: false,
          };
        }

        const timestamp = now();
        const next: FinanceSettingsSnapshot = {
          companyId: input.scope.companyId,
          createdAt: existing?.createdAt ?? timestamp,
          createdBy: existing?.createdBy ?? input.scope.userId,
          defaultVatRate: values.defaultVatRate,
          id: existing?.id ?? createFinanceSettingsId(input.scope),
          lastMutationKey: mutationKey,
          periodId: input.scope.periodId,
          revisionNo: currentRevisionNo + 1,
          showVatBreakdown: values.showVatBreakdown,
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
              action: "finance-settings.update",
              entityId: saved.id,
              entityLabel: "Finans Ayarları",
              entityType: "finance-settings",
              metadata: {
                defaultVatRateFrom: existing?.defaultVatRate ?? 20,
                defaultVatRateTo: saved.defaultVatRate,
                revisionFrom: currentRevisionNo,
                revisionTo: saved.revisionNo,
                showVatBreakdownFrom: existing?.showVatBreakdown ?? true,
                showVatBreakdownTo: saved.showVatBreakdown,
              },
              occurredAt: timestamp,
            }),
          );
        }

        return {
          data: {
            idempotent: false,
            settings: buildEffectiveFinanceSettings(saved, input.scope),
          },
          ok: true,
        };
      } catch (error) {
        if (
          error instanceof FinanceSettingsDomainError ||
          error instanceof FinanceSettingsRepositoryError
        ) {
          return { errors: [error.message], ok: false };
        }

        return { errors: ["Finans ayarları kaydedilemedi."], ok: false };
      }
    },
  };
}

export function createFinanceSettingsMemoryRepository(
  initialRows: FinanceSettingsSnapshot[] = [],
): FinanceSettingsRepository {
  const rows = [...initialRows];

  return {
    async create(row) {
      if (rows.some((item) => isSameScope(item, row))) {
        throw new FinanceSettingsRepositoryError(
          "Aktif kapsam için finans ayarı zaten bulunuyor.",
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
        (item) => isSameScope(item, row) && item.revisionNo === expectedRevisionNo,
      );
      if (index < 0) {
        throw new FinanceSettingsRepositoryError(
          "Finans ayarı beklenen revizyonda bulunamadı.",
        );
      }
      rows[index] = row;
      return row;
    },
  };
}

function isSameScope(
  left: Pick<FinanceSettingsSnapshot, "companyId" | "periodId" | "tenantId">,
  right: Pick<TenantScope, "companyId" | "periodId" | "tenantId">,
) {
  return (
    left.tenantId === right.tenantId &&
    left.companyId === right.companyId &&
    left.periodId === right.periodId
  );
}
