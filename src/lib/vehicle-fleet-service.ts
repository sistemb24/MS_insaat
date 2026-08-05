import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  VehicleFleetDomainError,
  assertVehicleFleetTransition,
  assertVehicleOdometerNotRegressed,
  canTransitionVehicleAssignmentStatus,
  canTransitionVehicleFuelRecordStatus,
  canTransitionVehicleMaintenancePlanStatus,
  canTransitionVehicleMaintenanceRecordStatus,
  createVehicleAssignmentDraft,
  createVehicleFuelRecordDraft,
  createVehicleMaintenancePlanDraft,
  createVehicleMaintenanceRecordDraft,
  getVehicleAssignmentKey,
  getVehicleFleetOperationPermission,
  type VehicleAssignmentDraftInput,
  type VehicleFuelRecordDraftInput,
  type VehicleMaintenancePlanDraftInput,
  type VehicleMaintenanceRecordDraftInput,
} from "./vehicle-fleet-operations";
import type {
  VehicleAssignmentRow,
  VehicleFleetOverview,
  VehicleFleetRepository,
  VehicleFuelRecordRow,
  VehicleMaintenancePlanRow,
  VehicleMaintenanceRecordRow,
} from "./vehicle-fleet-prisma-repository";
import { buildTenantScopeKey, type TenantScope, validateTenantScope } from "./tenant-scope";

type Result<T> = { data: T; ok: true } | { errors: string[]; ok: false };

export type VehicleFleetService = ReturnType<typeof createVehicleFleetService>;

export function createVehicleFleetService({
  auditLogRepository,
  createId = defaultCreateId,
  now,
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: (input: { kind: string; scope: TenantScope; stableKey?: string }) => string;
  now: () => string;
  repository: VehicleFleetRepository;
}) {
  async function resolve(scope: TenantScope): Promise<Result<VehicleFleetOverview>> {
    const errors = validateTenantScope(scope);
    if (errors.length > 0) return { errors, ok: false };
    return { data: await repository.listOverview({ scope }), ok: true };
  }

  function canMutate(scope: TenantScope): Result<null> {
    const permission = getVehicleFleetOperationPermission({ operation: "create", periodClosed: scope.periodClosed, role: scope.userRole });
    return permission.allowed ? { data: null, ok: true } : { errors: [permission.reason], ok: false };
  }

  return {
    async list({ scope }: { scope: TenantScope }): Promise<Result<VehicleFleetOverview>> { return resolve(scope); },

    async createAssignment(input: { scope: TenantScope; values: VehicleAssignmentDraftInput }): Promise<Result<{ idempotent: boolean; row: VehicleAssignmentRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      try {
        const draft = createVehicleAssignmentDraft(input.values);
        const key = getVehicleAssignmentKey(draft);
        const existing = overview.data.assignments.find((row) => row.assignmentKey === key);
        if (existing) return { data: { idempotent: true, row: existing }, ok: true };
        const active = overview.data.assignments.find((row) => row.vehicleId === draft.vehicleId && row.status === "ACTIVE");
        if (active) return { errors: ["Araç için açık bir atama zaten bulunmaktadır."], ok: false };
        const timestamp = now();
        const row: VehicleAssignmentRow = { ...scopeFields(input.scope), ...draft, assignmentKey: key, id: createId({ kind: "assignment", scope: input.scope, stableKey: key }), endedOn: null, createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId };
        const created = await repository.createAssignment(row);
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.assignment.create", entityId: created.id, entityLabel: created.vehicleId, entityType: "vehicle-fleet-assignment", occurredAt: timestamp, metadata: { projectId: created.projectId, statusTo: created.status, vehicleId: created.vehicleId } });
        return { data: { idempotent: false, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async completeAssignment(input: { id: string; scope: TenantScope }): Promise<Result<VehicleAssignmentRow>> { return transitionAssignment(input, "COMPLETED"); },
    async transferAssignment(input: { id: string; scope: TenantScope; values: VehicleAssignmentDraftInput }): Promise<Result<{ previous: VehicleAssignmentRow; row: VehicleAssignmentRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      const existing = overview.data.assignments.find((row) => row.id === input.id); if (!existing) return missing("Araç ataması");
      try {
        assertVehicleFleetTransition(canTransitionVehicleAssignmentStatus(existing.status, "TRANSFERRED"), "Araç ataması");
        const draft = createVehicleAssignmentDraft(input.values);
        if (draft.vehicleId !== existing.vehicleId) return { errors: ["Araç transferi aynı araç için yapılmalıdır."], ok: false };
        const key = getVehicleAssignmentKey(draft);
        const alreadyCreated = overview.data.assignments.find((row) => row.assignmentKey === key);
        if (alreadyCreated) return { data: { previous: existing, row: alreadyCreated }, ok: true };
        const timestamp = now();
        const previous = await repository.updateAssignment({ ...existing, endedOn: timestamp.slice(0, 10), status: "TRANSFERRED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.assignment.transfer", entityId: previous.id, entityLabel: previous.vehicleId, entityType: "vehicle-fleet-assignment", occurredAt: timestamp, metadata: { projectId: previous.projectId, statusFrom: existing.status, statusTo: previous.status, vehicleId: previous.vehicleId } });
        const row: VehicleAssignmentRow = { ...scopeFields(input.scope), ...draft, assignmentKey: key, id: createId({ kind: "assignment", scope: input.scope, stableKey: key }), endedOn: null, createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId };
        const created = await repository.createAssignment(row);
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.assignment.create", entityId: created.id, entityLabel: created.vehicleId, entityType: "vehicle-fleet-assignment", occurredAt: timestamp, metadata: { projectId: created.projectId, statusTo: created.status, vehicleId: created.vehicleId } });
        return { data: { previous, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async createFuelRecord(input: { entryOdometerKm?: number | null; scope: TenantScope; values: VehicleFuelRecordDraftInput }): Promise<Result<{ idempotent: boolean; row: VehicleFuelRecordRow }>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      try {
        const draft = createVehicleFuelRecordDraft(input.values);
        const existing = overview.data.fuelRecords.find((row) => row.fuelKey === draft.key);
        if (existing) return { data: { idempotent: true, row: existing }, ok: true };
        const lastRecordedOdometerKm = maximumOdometer(overview.data, draft.vehicleId);
        assertVehicleOdometerNotRegressed({ entryOdometerKm: input.entryOdometerKm, lastRecordedOdometerKm, nextOdometerKm: draft.odometerKm });
        const timestamp = now();
        const row: VehicleFuelRecordRow = { ...scopeFields(input.scope), ...draft, fuelKey: draft.key, id: createId({ kind: "fuel", scope: input.scope, stableKey: draft.key }), cancelledOn: null, createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId };
        const created = await repository.createFuelRecord(row);
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.fuel.create", entityId: created.id, entityLabel: created.vehicleId, entityType: "vehicle-fleet-fuel", occurredAt: timestamp, metadata: { fueledOn: created.fueledOn, liters: created.liters, statusTo: created.status, vehicleId: created.vehicleId } });
        return { data: { idempotent: false, row: created }, ok: true };
      } catch (error) { return failure(error); }
    },

    async cancelFuelRecord(input: { id: string; scope: TenantScope }): Promise<Result<VehicleFuelRecordRow>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      const existing = overview.data.fuelRecords.find((row) => row.id === input.id);
      if (!existing) return missing("Yakıt kaydı");
      try {
        assertVehicleFleetTransition(canTransitionVehicleFuelRecordStatus(existing.status, "CANCELLED"), "Yakıt kaydı");
        const timestamp = now();
        const updated = await repository.updateFuelRecord({ ...existing, cancelledOn: timestamp.slice(0, 10), status: "CANCELLED", updatedAt: timestamp, updatedBy: input.scope.userId });
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.fuel.cancel", entityId: updated.id, entityLabel: updated.vehicleId, entityType: "vehicle-fleet-fuel", occurredAt: timestamp, metadata: { statusFrom: existing.status, statusTo: updated.status, vehicleId: updated.vehicleId } });
        return { data: updated, ok: true };
      } catch (error) { return failure(error); }
    },

    async createMaintenancePlan(input: { scope: TenantScope; values: VehicleMaintenancePlanDraftInput }): Promise<Result<VehicleMaintenancePlanRow>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      try {
        const draft = createVehicleMaintenancePlanDraft(input.values); const timestamp = now();
        const row: VehicleMaintenancePlanRow = { ...scopeFields(input.scope), ...draft, id: createId({ kind: "maintenance-plan", scope: input.scope }), lastCompletedOn: null, createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId };
        const created = await repository.createMaintenancePlan(row);
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.maintenance-plan.create", entityId: created.id, entityLabel: created.maintenanceType, entityType: "vehicle-fleet-maintenance-plan", occurredAt: timestamp, metadata: { nextDueKm: created.nextDueKm, nextDueOn: created.nextDueOn, statusTo: created.status, vehicleId: created.vehicleId } });
        return { data: created, ok: true };
      } catch (error) { return failure(error); }
    },

    async completeMaintenancePlan(input: { id: string; scope: TenantScope }): Promise<Result<VehicleMaintenancePlanRow>> { return transitionPlan(input, "COMPLETED"); },
    async cancelMaintenancePlan(input: { id: string; scope: TenantScope }): Promise<Result<VehicleMaintenancePlanRow>> { return transitionPlan(input, "CANCELLED"); },

    async createMaintenanceRecord(input: { entryOdometerKm?: number | null; scope: TenantScope; values: VehicleMaintenanceRecordDraftInput }): Promise<Result<VehicleMaintenanceRecordRow>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      try {
        const draft = createVehicleMaintenanceRecordDraft(input.values);
        if (draft.planId && !overview.data.maintenancePlans.some((row) => row.id === draft.planId)) return missing("Bakım planı");
        assertVehicleOdometerNotRegressed({ entryOdometerKm: input.entryOdometerKm, lastRecordedOdometerKm: maximumOdometer(overview.data, draft.vehicleId), nextOdometerKm: draft.odometerKm });
        const timestamp = now();
        const row: VehicleMaintenanceRecordRow = { ...scopeFields(input.scope), ...draft, id: createId({ kind: "maintenance-record", scope: input.scope }), completionKey: null, completedOn: null, createdAt: timestamp, createdBy: input.scope.userId, updatedAt: timestamp, updatedBy: input.scope.userId };
        const created = await repository.createMaintenanceRecord(row);
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.maintenance-record.create", entityId: created.id, entityLabel: created.maintenanceType, entityType: "vehicle-fleet-maintenance-record", occurredAt: timestamp, metadata: { planId: created.planId, statusTo: created.status, vehicleId: created.vehicleId } });
        return { data: created, ok: true };
      } catch (error) { return failure(error); }
    },

    async completeMaintenanceRecord(input: { id: string; scope: TenantScope }): Promise<Result<VehicleMaintenanceRecordRow>> {
      const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
      const overview = await resolve(input.scope); if (!overview.ok) return overview;
      const existing = overview.data.maintenanceRecords.find((row) => row.id === input.id);
      if (!existing) return missing("Bakım kaydı");
      try {
        assertVehicleFleetTransition(canTransitionVehicleMaintenanceRecordStatus(existing.status, "COMPLETED"), "Bakım kaydı");
        const timestamp = now();
        const completionKey = `${existing.id}::${timestamp.slice(0, 10)}`;
        const updated = await repository.updateMaintenanceRecord({ ...existing, completedOn: timestamp.slice(0, 10), completionKey, status: "COMPLETED", updatedAt: timestamp, updatedBy: input.scope.userId });
        if (updated.planId) {
          const plan = overview.data.maintenancePlans.find((row) => row.id === updated.planId);
          if (plan && plan.status === "ACTIVE") await repository.updateMaintenancePlan({ ...plan, lastCompletedOn: timestamp.slice(0, 10), updatedAt: timestamp, updatedBy: input.scope.userId });
        }
        await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.maintenance-record.complete", entityId: updated.id, entityLabel: updated.maintenanceType, entityType: "vehicle-fleet-maintenance-record", occurredAt: timestamp, metadata: { planId: updated.planId, statusFrom: existing.status, statusTo: updated.status, vehicleId: updated.vehicleId } });
        return { data: updated, ok: true };
      } catch (error) { return failure(error); }
    },
  };

  async function transitionAssignment(input: { id: string; scope: TenantScope }, status: "COMPLETED" | "TRANSFERRED"): Promise<Result<VehicleAssignmentRow>> {
    const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
    const overview = await resolve(input.scope); if (!overview.ok) return overview;
    const existing = overview.data.assignments.find((row) => row.id === input.id); if (!existing) return missing("Araç ataması");
    try {
      assertVehicleFleetTransition(canTransitionVehicleAssignmentStatus(existing.status, status), "Araç ataması");
      const timestamp = now(); const updated = await repository.updateAssignment({ ...existing, endedOn: timestamp.slice(0, 10), status, updatedAt: timestamp, updatedBy: input.scope.userId });
      await audit(auditLogRepository, input.scope, { action: "vehicle-fleet.assignment.complete", entityId: updated.id, entityLabel: updated.vehicleId, entityType: "vehicle-fleet-assignment", occurredAt: timestamp, metadata: { projectId: updated.projectId, statusFrom: existing.status, statusTo: updated.status, vehicleId: updated.vehicleId } });
      return { data: updated, ok: true };
    } catch (error) { return failure(error); }
  }

  async function transitionPlan(input: { id: string; scope: TenantScope }, status: "COMPLETED" | "CANCELLED"): Promise<Result<VehicleMaintenancePlanRow>> {
    const allowed = canMutate(input.scope); if (!allowed.ok) return allowed;
    const overview = await resolve(input.scope); if (!overview.ok) return overview;
    const existing = overview.data.maintenancePlans.find((row) => row.id === input.id); if (!existing) return missing("Bakım planı");
    try {
      assertVehicleFleetTransition(canTransitionVehicleMaintenancePlanStatus(existing.status, status), "Bakım planı");
      const timestamp = now(); const updated = await repository.updateMaintenancePlan({ ...existing, status, updatedAt: timestamp, updatedBy: input.scope.userId });
      await audit(auditLogRepository, input.scope, { action: status === "COMPLETED" ? "vehicle-fleet.maintenance-plan.complete" : "vehicle-fleet.maintenance-plan.cancel", entityId: updated.id, entityLabel: updated.maintenanceType, entityType: "vehicle-fleet-maintenance-plan", occurredAt: timestamp, metadata: { statusFrom: existing.status, statusTo: updated.status, vehicleId: updated.vehicleId } });
      return { data: updated, ok: true };
    } catch (error) { return failure(error); }
  }
}

function maximumOdometer(overview: VehicleFleetOverview, vehicleId: string) {
  const values = [
    ...overview.fuelRecords.filter((row) => row.vehicleId === vehicleId && row.status !== "CANCELLED").map((row) => row.odometerKm),
    ...overview.maintenanceRecords.filter((row) => row.vehicleId === vehicleId).map((row) => row.odometerKm),
  ];
  return values.length > 0 ? Math.max(...values) : null;
}
function scopeFields(scope: TenantScope) { return { companyId: scope.companyId, periodId: scope.periodId, tenantId: scope.tenantId }; }
async function audit(repository: AuditLogRepository | undefined, scope: TenantScope, input: Parameters<typeof createAuditLogEntry>[1]) { if (repository) await repository.record(createAuditLogEntry(scope, input)); }
function defaultCreateId(input: { kind: string; scope: TenantScope; stableKey?: string }) { const suffix = (input.stableKey ?? `${Date.now()}-${Math.random()}`).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""); return `${buildTenantScopeKey(input.scope)}::vehicle-fleet::${input.kind}::${suffix}`; }
function missing(label: string): Result<never> { return { errors: [`${label} aktif kapsamda bulunamadı.`], ok: false }; }
function failure(error: unknown): Result<never> { return error instanceof VehicleFleetDomainError ? { errors: [error.message], ok: false } : { errors: ["Araç operasyon işlemi tamamlanamadı."], ok: false }; }
