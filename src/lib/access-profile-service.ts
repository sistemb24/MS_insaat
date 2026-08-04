import { createAuditLogEntry, type AuditLogRepository } from "./audit-log";
import {
  accessProfilePermissionCodes,
  accessProfilePermissionLabels,
  AccessProfileDomainError,
  createAccessProfileMutationKey,
  getAccessProfileManagementPermission,
  validateAccessProfileValues,
  type AccessProfileAssignmentSnapshot,
  type AccessProfileAssignmentValues,
  type AccessProfileOverview,
  type AccessProfileSaveValues,
  type AccessProfileSnapshot,
  type AccessProfileStatusValues,
  type EffectiveDocumentAccess,
} from "./access-profile";
import type { TenantScope } from "./tenant-scope";
import { validateTenantScope } from "./tenant-scope";

export type AccessProfileResult<T> =
  | { data: T; ok: true }
  | { errors: string[]; ok: false };

export type AccessProfileRepository = {
  countAssignments(profileId: string, scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<number>;
  createProfile(row: AccessProfileSnapshot): Promise<AccessProfileSnapshot>;
  findAssignment(scope: TenantScope, userId: string): Promise<AccessProfileAssignmentSnapshot | null>;
  findProfileById(scope: Pick<TenantScope, "companyId" | "tenantId">, id: string): Promise<AccessProfileSnapshot | null>;
  findProfileByNormalizedName(scope: Pick<TenantScope, "companyId" | "tenantId">, normalizedName: string): Promise<AccessProfileSnapshot | null>;
  listAssignments(scope: TenantScope): Promise<AccessProfileAssignmentSnapshot[]>;
  listProfiles(scope: Pick<TenantScope, "companyId" | "tenantId">): Promise<AccessProfileSnapshot[]>;
  listViewerUsers(scope: TenantScope): Promise<Array<{ email: string | null; name: string; userId: string }>>;
  removeAssignment(input: { expectedRevisionNo: number; scope: TenantScope; userId: string }): Promise<void>;
  updateProfile(input: { expectedRevisionNo: number; row: AccessProfileSnapshot }): Promise<AccessProfileSnapshot>;
  upsertAssignment(input: { expectedRevisionNo: number; row: AccessProfileAssignmentSnapshot }): Promise<AccessProfileAssignmentSnapshot>;
};

export class AccessProfileRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessProfileRepositoryError";
  }
}

export function createAccessProfileService({
  auditLogRepository,
  createId = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
  repository,
}: {
  auditLogRepository?: AuditLogRepository;
  createId?: () => string;
  now?: () => string;
  repository: AccessProfileRepository;
}) {
  async function list({ scope }: { scope: TenantScope }): Promise<AccessProfileResult<{ overview: AccessProfileOverview }>> {
    const errors = validateTenantScope(scope);
    if (errors.length) return { errors, ok: false };
    const [profiles, assignments, users] = await Promise.all([
      repository.listProfiles(scope),
      repository.listAssignments(scope),
      repository.listViewerUsers(scope),
    ]);
    return {
      data: {
        overview: {
          canManage: scope.userRole === "admin",
          permissions: accessProfilePermissionCodes.map((code) => ({
            code,
            label: accessProfilePermissionLabels[code],
          })),
          profiles,
          users: users.map((user) => ({
            ...user,
            assignment:
              assignments.find((row) => row.userId === user.userId) ?? null,
          })),
        },
      },
      ok: true,
    };
  }

  async function save({
    scope,
    values,
  }: {
    scope: TenantScope;
    values: AccessProfileSaveValues;
  }): Promise<AccessProfileResult<{ idempotent: boolean; profile: AccessProfileSnapshot }>> {
    const denied = validateManagement(scope);
    if (denied) return denied;
    try {
      const normalized = validateAccessProfileValues(values);
      const mutationKey = createAccessProfileMutationKey(scope, values.requestKey);
      const existing = values.id
        ? await repository.findProfileById(scope, values.id)
        : null;
      if (values.id && !existing) return { errors: ["Yetki profili bulunamadı."], ok: false };
      const duplicate = await repository.findProfileByNormalizedName(
        scope,
        normalized.normalizedName,
      );
      if (existing?.lastMutationKey === mutationKey) {
        return { data: { idempotent: true, profile: existing }, ok: true };
      }
      if (!existing && duplicate?.lastMutationKey === mutationKey) {
        return { data: { idempotent: true, profile: duplicate }, ok: true };
      }
      const currentRevision = existing?.revisionNo ?? 0;
      if (values.expectedRevisionNo !== currentRevision) {
        return { errors: ["Yetki profili başka bir işlemle güncellendi; listeyi yenileyin."], ok: false };
      }
      if (duplicate && duplicate.id !== existing?.id) {
        return { errors: ["Aynı adlı yetki profili zaten bulunuyor."], ok: false };
      }
      const timestamp = now();
      const row: AccessProfileSnapshot = {
        companyId: scope.companyId,
        createdAt: existing?.createdAt ?? timestamp,
        createdBy: existing?.createdBy ?? scope.userId,
        description: normalized.description,
        id: existing?.id ?? createId(),
        lastMutationKey: mutationKey,
        name: normalized.name,
        normalizedName: normalized.normalizedName,
        permissions: normalized.permissions,
        revisionNo: currentRevision + 1,
        status: existing?.status ?? "ACTIVE",
        tenantId: scope.tenantId,
        updatedAt: timestamp,
        updatedBy: scope.userId,
      };
      const profile = existing
        ? await repository.updateProfile({ expectedRevisionNo: currentRevision, row })
        : await repository.createProfile(row);
      await audit(auditLogRepository, scope, {
        action: existing ? "access-profile.update" : "access-profile.create",
        entityId: profile.id,
        metadata: {
          permissionCodes: profile.permissions,
          revisionNo: profile.revisionNo,
          status: profile.status,
        },
        occurredAt: timestamp,
      });
      return { data: { idempotent: false, profile }, ok: true };
    } catch (error) {
      return accessProfileFailure(error, "Yetki profili kaydedilemedi.");
    }
  }

  async function changeStatus({
    scope,
    values,
  }: {
    scope: TenantScope;
    values: AccessProfileStatusValues;
  }): Promise<AccessProfileResult<{ idempotent: boolean; profile: AccessProfileSnapshot }>> {
    const denied = validateManagement(scope);
    if (denied) return denied;
    try {
      const existing = await repository.findProfileById(scope, values.id);
      if (!existing) return { errors: ["Yetki profili bulunamadı."], ok: false };
      const mutationKey = createAccessProfileMutationKey(scope, values.requestKey);
      if (existing.lastMutationKey === mutationKey) {
        return { data: { idempotent: true, profile: existing }, ok: true };
      }
      if (existing.revisionNo !== values.expectedRevisionNo) {
        return { errors: ["Yetki profili başka bir işlemle güncellendi; listeyi yenileyin."], ok: false };
      }
      if (existing.status === values.status) {
        return { errors: ["Yetki profili zaten seçilen durumda."], ok: false };
      }
      if (
        values.status === "INACTIVE" &&
        (await repository.countAssignments(existing.id, scope)) > 0
      ) {
        return { errors: ["Aktif kullanıcı ataması bulunan profil pasife alınamaz."], ok: false };
      }
      const timestamp = now();
      const profile = await repository.updateProfile({
        expectedRevisionNo: existing.revisionNo,
        row: {
          ...existing,
          lastMutationKey: mutationKey,
          revisionNo: existing.revisionNo + 1,
          status: values.status,
          updatedAt: timestamp,
          updatedBy: scope.userId,
        },
      });
      await audit(auditLogRepository, scope, {
        action: "access-profile.status-change",
        entityId: profile.id,
        metadata: { revisionNo: profile.revisionNo, status: profile.status },
        occurredAt: timestamp,
      });
      return { data: { idempotent: false, profile }, ok: true };
    } catch (error) {
      return accessProfileFailure(error, "Yetki profili durumu değiştirilemedi.");
    }
  }

  async function assign({
    scope,
    values,
  }: {
    scope: TenantScope;
    values: AccessProfileAssignmentValues;
  }): Promise<AccessProfileResult<{ assignment: AccessProfileAssignmentSnapshot | null; idempotent: boolean }>> {
    const denied = validateManagement(scope);
    if (denied) return denied;
    try {
      const mutationKey = createAccessProfileMutationKey(scope, values.requestKey);
      const viewer = (await repository.listViewerUsers(scope)).find(
        (row) => row.userId === values.userId,
      );
      if (!viewer) return { errors: ["Atama yalnızca aktif görüntüleyici kullanıcıya yapılabilir."], ok: false };
      const existing = await repository.findAssignment(scope, values.userId);
      if (existing?.lastMutationKey === mutationKey) {
        return { data: { assignment: existing, idempotent: true }, ok: true };
      }
      if ((existing?.revisionNo ?? 0) !== values.expectedRevisionNo) {
        return { errors: ["Kullanıcı profil ataması başka bir işlemle güncellendi; listeyi yenileyin."], ok: false };
      }
      const timestamp = now();
      if (!values.profileId) {
        if (!existing) return { data: { assignment: null, idempotent: true }, ok: true };
        await repository.removeAssignment({
          expectedRevisionNo: existing.revisionNo,
          scope,
          userId: values.userId,
        });
        await audit(auditLogRepository, scope, {
          action: "access-profile.assignment.remove",
          entityId: existing.id,
          metadata: { profileId: existing.profileId, userId: values.userId },
          occurredAt: timestamp,
        });
        return { data: { assignment: null, idempotent: false }, ok: true };
      }
      const profile = await repository.findProfileById(scope, values.profileId);
      if (!profile || profile.status !== "ACTIVE") {
        return { errors: ["Atanacak aktif yetki profili bulunamadı."], ok: false };
      }
      const assignment = await repository.upsertAssignment({
        expectedRevisionNo: existing?.revisionNo ?? 0,
        row: {
          companyId: scope.companyId,
          createdAt: existing?.createdAt ?? timestamp,
          createdBy: existing?.createdBy ?? scope.userId,
          id: existing?.id ?? createId(),
          lastMutationKey: mutationKey,
          periodId: scope.periodId,
          profileId: profile.id,
          revisionNo: (existing?.revisionNo ?? 0) + 1,
          tenantId: scope.tenantId,
          updatedAt: timestamp,
          updatedBy: scope.userId,
          userId: values.userId,
        },
      });
      await audit(auditLogRepository, scope, {
        action: "access-profile.assignment.save",
        entityId: assignment.id,
        metadata: {
          profileId: assignment.profileId,
          revisionNo: assignment.revisionNo,
          userId: assignment.userId,
        },
        occurredAt: timestamp,
      });
      return { data: { assignment, idempotent: false }, ok: true };
    } catch (error) {
      return accessProfileFailure(error, "Kullanıcı yetki profili atanamadı.");
    }
  }

  async function resolveDocumentAccess({
    scope,
  }: {
    scope: TenantScope;
  }): Promise<EffectiveDocumentAccess> {
    const assignment = await repository.findAssignment(scope, scope.userId);
    if (!assignment) {
      return { assigned: false, permissions: [], profileId: null, profileStatus: null };
    }
    const profile = await repository.findProfileById(scope, assignment.profileId);
    return {
      assigned: true,
      permissions: profile?.permissions ?? [],
      profileId: assignment.profileId,
      profileStatus: profile?.status ?? "INACTIVE",
    };
  }

  return { assign, changeStatus, list, resolveDocumentAccess, save };
}

function validateManagement(scope: TenantScope) {
  const scopeErrors = validateTenantScope(scope);
  if (scopeErrors.length) return { errors: scopeErrors, ok: false as const };
  const permission = getAccessProfileManagementPermission(scope.userRole);
  return permission.allowed
    ? null
    : { errors: [permission.reason], ok: false as const };
}

function accessProfileFailure<T>(error: unknown, fallback: string): AccessProfileResult<T> {
  if (
    error instanceof AccessProfileDomainError ||
    error instanceof AccessProfileRepositoryError
  ) {
    return { errors: [error.message], ok: false };
  }
  return { errors: [fallback], ok: false };
}

async function audit(
  repository: AuditLogRepository | undefined,
  scope: TenantScope,
  input: {
    action: string;
    entityId: string;
    metadata: Record<string, unknown>;
    occurredAt: string;
  },
) {
  if (!repository) return;
  await repository.record(
    createAuditLogEntry(scope, {
      action: input.action,
      entityId: input.entityId,
      entityLabel: input.entityId,
      entityType: input.action.startsWith("access-profile.assignment")
        ? "access-profile-assignment"
        : "access-profile",
      metadata: input.metadata,
      occurredAt: input.occurredAt,
    }),
  );
}
