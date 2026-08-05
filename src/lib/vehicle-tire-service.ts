import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  VehicleTireDomainError,
  assertVehicleTireOdometerNotRegressed,
  assertVehicleTirePositionAvailable,
  assertVehicleTireTransition,
  canTransitionVehicleTireStatus,
  createVehicleTireMountDraft,
  createVehicleTireRemovalDraft,
  getVehicleTireOperationPermission,
  type VehicleTireMountDraftInput,
} from "./vehicle-tire-operations";
import type { VehicleTireRecordRow, VehicleTireRepository } from "./vehicle-tire-prisma-repository";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type VehicleTireService = ReturnType<typeof createVehicleTireService>;

export function createVehicleTireService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (input: { kind: string; scope: TenantScope; stableKey?: string }) => string;
  now: () => string;
  repository: VehicleTireRepository;
}) {
  async function resolve(scope: TenantScope): Promise<Result<VehicleTireRecordRow[]>> {
    const errors = validateTenantScope(scope);
    if (errors.length > 0) return { errors, ok: false };
    return { data: await repository.listTireRecords({ scope }), ok: true };
  }

  function canMutate(scope: TenantScope): Result<null> {
    const permission = getVehicleTireOperationPermission({ operation: "create", periodClosed: scope.periodClosed, role: scope.userRole });
    return permission.allowed ? { data: null, ok: true } : { errors: [permission.reason], ok: false };
  }

  return {
    async list({ scope }: { scope: TenantScope }): Promise<Result<VehicleTireRecordRow[]>> {
      return resolve(scope);
    },

    async createMount(input: {
      entryOdometerKm?: number | null;
      scope: TenantScope;
      values: VehicleTireMountDraftInput;
    }): Promise<Result<{ idempotent: boolean; row: VehicleTireRecordRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const records = await resolve(input.scope); if (!records.ok) return records;
      try {
        const draft = createVehicleTireMountDraft(input.values);
        const existing = records.data.find((row) => row.mountKey === draft.key);
        if (existing) return { data: { idempotent: true, row: existing }, ok: true };
        assertVehicleTirePositionAvailable({
          activeTireRecordId: records.data.find((row) => row.vehicleId === draft.vehicleId && row.tirePosition === draft.tirePosition && row.status === "ACTIVE")?.id,
          tirePosition: draft.tirePosition,
          vehicleId: draft.vehicleId,
        });
        assertVehicleTireOdometerNotRegressed({
          entryOdometerKm: input.entryOdometerKm,
          lastPositionOdometerKm: lastPositionOdometer(records.data, draft.vehicleId, draft.tirePosition),
          nextOdometerKm: draft.mountedOdometerKm,
        });
        const timestamp = now();
        const row: VehicleTireRecordRow = {
          ...scopeFields(input.scope),
          ...draft,
          createdAt: timestamp,
          createdBy: input.scope.userId,
          id: createId({ kind: "tire-mount", scope: input.scope }),
          mountKey: draft.key,
          removedOdometerKm: null,
          removedOn: null,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        };
        const created = await repository.createTireRecord(row);
        await audit(auditLogRepository, input.scope, {
          action: "vehicle-tire.mount.create",
          entityId: created.id,
          entityLabel: created.vehicleId,
          entityType: "vehicle-tire-record",
          metadata: {
            mountedOdometerKm: created.mountedOdometerKm,
            mountedOn: created.mountedOn,
            statusTo: created.status,
            tirePosition: created.tirePosition,
            vehicleId: created.vehicleId,
          },
          occurredAt: timestamp,
        });
        return { data: { idempotent: false, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async removeTireRecord(input: {
      id: string;
      removedOdometerKm: number;
      removedOn: string;
      scope: TenantScope;
    }): Promise<Result<{ idempotent: boolean; row: VehicleTireRecordRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const records = await resolve(input.scope); if (!records.ok) return records;
      const existing = records.data.find((row) => row.id === input.id);
      if (!existing) return missing("Lastik kaydı");
      if (existing.status === "REMOVED") return { data: { idempotent: true, row: existing }, ok: true };
      try {
        assertVehicleTireTransition(canTransitionVehicleTireStatus(existing.status, "REMOVED"));
        const draft = createVehicleTireRemovalDraft({
          mountedOdometerKm: existing.mountedOdometerKm,
          mountedOn: existing.mountedOn,
          removedOdometerKm: input.removedOdometerKm,
          removedOn: input.removedOn,
          tireRecordId: existing.id,
        });
        const timestamp = now();
        const updated = await repository.updateTireRecord({
          ...existing,
          ...draft,
          updatedAt: timestamp,
          updatedBy: input.scope.userId,
        });
        await audit(auditLogRepository, input.scope, {
          action: "vehicle-tire.mount.remove",
          entityId: updated.id,
          entityLabel: updated.vehicleId,
          entityType: "vehicle-tire-record",
          metadata: {
            removedOdometerKm: updated.removedOdometerKm,
            removedOn: updated.removedOn,
            statusFrom: existing.status,
            statusTo: updated.status,
            tirePosition: updated.tirePosition,
            vehicleId: updated.vehicleId,
          },
          occurredAt: timestamp,
        });
        return { data: { idempotent: false, row: updated }, ok: true };
      } catch (error) { return failure(error); }
    },
  };
}

function lastPositionOdometer(records: VehicleTireRecordRow[], vehicleId: string, tirePosition: string) {
  const values = records
    .filter((row) => row.vehicleId === vehicleId && row.tirePosition === tirePosition)
    .flatMap((row) => [row.mountedOdometerKm, row.removedOdometerKm].filter((value): value is number => value !== null));
  return values.length > 0 ? Math.max(...values) : null;
}
function scopeFields(scope: TenantScope) { return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId }; }
async function audit(repository: AuditLogRepository | undefined, scope: TenantScope, input: Parameters<typeof createAuditLogEntry>[1]) { if (repository) await repository.record(createAuditLogEntry(scope, input)); }
function defaultCreateId(input: { kind: string; scope: TenantScope; stableKey?: string }) { const suffix = (input.stableKey ?? `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""); return `${buildTenantScopeKey(input.scope)}::vehicle-tire::${input.kind}::${suffix}`; }
function missing(label: string): Result<never> { return { errors: [`${label} aktif kapsamda bulunamadı.`], ok: false }; }
function failure(error: unknown): Result<never> { return error instanceof VehicleTireDomainError ? { errors: [error.message], ok: false } : { errors: ["Lastik operasyon işlemi tamamlanamadı."], ok: false }; }
