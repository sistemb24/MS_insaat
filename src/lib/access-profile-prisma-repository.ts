import {
  type AccessProfileAssignmentSnapshot,
  type AccessProfilePermissionCode,
  type AccessProfileSnapshot,
  type AccessProfileStatus,
} from "./access-profile";
import {
  AccessProfileRepositoryError,
  type AccessProfileRepository,
} from "./access-profile-service";
import type { TenantScope } from "./tenant-scope";

type DateLike = Date | string;
type ProfileRecord = Omit<AccessProfileSnapshot, "createdAt" | "permissions" | "updatedAt"> & {
  createdAt: DateLike;
  permissions: Array<{ allowed: boolean; permissionCode: string }>;
  updatedAt: DateLike;
};
type AssignmentRecord = Omit<AccessProfileAssignmentSnapshot, "createdAt" | "updatedAt"> & {
  createdAt: DateLike;
  updatedAt: DateLike;
};

export type AccessProfilePrismaClientLike = {
  accessProfile: {
    create(input: { data: unknown; include: { permissions: true } }): Promise<ProfileRecord>;
    findFirst(input: { include: { permissions: true }; where: Record<string, unknown> }): Promise<ProfileRecord | null>;
    findMany(input: { include: { permissions: true }; orderBy: { name: "asc" }; where: Record<string, unknown> }): Promise<ProfileRecord[]>;
    updateMany(input: { data: unknown; where: Record<string, unknown> }): Promise<{ count: number }>;
  };
  appUserScopeAccess: {
    findMany(input: {
      include: { user: { select: { email: true; name: true } } };
      orderBy: { user: { name: "asc" } };
      where: Record<string, unknown>;
    }): Promise<Array<{ user: { email: string | null; name: string }; userId: string }>>;
  };
  userAccessProfileAssignment: {
    create(input: { data: unknown }): Promise<AssignmentRecord>;
    deleteMany(input: { where: Record<string, unknown> }): Promise<{ count: number }>;
    findFirst(input: { where: Record<string, unknown> }): Promise<AssignmentRecord | null>;
    findMany(input: { where: Record<string, unknown> }): Promise<AssignmentRecord[]>;
    updateMany(input: { data: unknown; where: Record<string, unknown> }): Promise<{ count: number }>;
  };
  accessProfilePermission: {
    deleteMany(input: { where: { profileId: string } }): Promise<unknown>;
    createMany(input: { data: unknown[] }): Promise<unknown>;
  };
  $transaction<T>(input: Promise<unknown>[]): Promise<T>;
};

export function createAccessProfilePrismaRepository(
  prisma: AccessProfilePrismaClientLike,
): AccessProfileRepository {
  return {
    async countAssignments(profileId, scope) {
      return (
        await prisma.userAccessProfileAssignment.findMany({
          where: { ...companyScope(scope), profileId },
        })
      ).length;
    },
    async createProfile(row) {
      return fromProfile(
        await prisma.accessProfile.create({
          data: {
            ...profileData(row),
            permissions: {
              create: row.permissions.map((permissionCode) => ({
                allowed: true,
                permissionCode,
              })),
            },
          },
          include: { permissions: true },
        }),
      );
    },
    async findAssignment(scope, userId) {
      const row = await prisma.userAccessProfileAssignment.findFirst({
        where: { ...periodScope(scope), userId },
      });
      return row ? fromAssignment(row) : null;
    },
    async findProfileById(scope, id) {
      const row = await prisma.accessProfile.findFirst({
        include: { permissions: true },
        where: { ...companyScope(scope), id },
      });
      return row ? fromProfile(row) : null;
    },
    async findProfileByNormalizedName(scope, normalizedName) {
      const row = await prisma.accessProfile.findFirst({
        include: { permissions: true },
        where: { ...companyScope(scope), normalizedName },
      });
      return row ? fromProfile(row) : null;
    },
    async listAssignments(scope) {
      return (
        await prisma.userAccessProfileAssignment.findMany({
          where: periodScope(scope),
        })
      ).map(fromAssignment);
    },
    async listProfiles(scope) {
      return (
        await prisma.accessProfile.findMany({
          include: { permissions: true },
          orderBy: { name: "asc" },
          where: companyScope(scope),
        })
      ).map(fromProfile);
    },
    async listViewerUsers(scope) {
      const rows = await prisma.appUserScopeAccess.findMany({
        include: { user: { select: { email: true, name: true } } },
        orderBy: { user: { name: "asc" } },
        where: { ...periodScope(scope), isActive: true, role: "viewer" },
      });
      return rows.map((row) => ({
        email: row.user.email,
        name: row.user.name,
        userId: row.userId,
      }));
    },
    async removeAssignment({ expectedRevisionNo, scope, userId }) {
      const result = await prisma.userAccessProfileAssignment.deleteMany({
        where: { ...periodScope(scope), revisionNo: expectedRevisionNo, userId },
      });
      if (result.count !== 1) {
        throw new AccessProfileRepositoryError(
          "Kullanıcı profil ataması beklenen revizyonda bulunamadı.",
        );
      }
    },
    async updateProfile({ expectedRevisionNo, row }) {
      const updated = await prisma.accessProfile.updateMany({
        data: profileData(row),
        where: { ...companyScope(row), id: row.id, revisionNo: expectedRevisionNo },
      });
      if (updated.count !== 1) {
        throw new AccessProfileRepositoryError(
          "Yetki profili beklenen revizyonda bulunamadı.",
        );
      }
      await prisma.accessProfilePermission.deleteMany({ where: { profileId: row.id } });
      if (row.permissions.length) {
        await prisma.accessProfilePermission.createMany({
          data: row.permissions.map((permissionCode) => ({
            allowed: true,
            permissionCode,
            profileId: row.id,
          })),
        });
      }
      const saved = await prisma.accessProfile.findFirst({
        include: { permissions: true },
        where: { ...companyScope(row), id: row.id },
      });
      if (!saved) throw new AccessProfileRepositoryError("Güncellenen yetki profili okunamadı.");
      return fromProfile(saved);
    },
    async upsertAssignment({ expectedRevisionNo, row }) {
      if (expectedRevisionNo === 0) {
        return fromAssignment(
          await prisma.userAccessProfileAssignment.create({
            data: assignmentData(row),
          }),
        );
      }
      const result = await prisma.userAccessProfileAssignment.updateMany({
        data: assignmentData(row),
        where: {
          ...periodScope(row),
          revisionNo: expectedRevisionNo,
          userId: row.userId,
        },
      });
      if (result.count !== 1) {
        throw new AccessProfileRepositoryError(
          "Kullanıcı profil ataması beklenen revizyonda bulunamadı.",
        );
      }
      const saved = await prisma.userAccessProfileAssignment.findFirst({
        where: { ...periodScope(row), userId: row.userId },
      });
      if (!saved) throw new AccessProfileRepositoryError("Güncellenen profil ataması okunamadı.");
      return fromAssignment(saved);
    },
  };
}

function companyScope(scope: Pick<TenantScope, "companyId" | "tenantId">) {
  return { companyId: scope.companyId, tenantId: scope.tenantId };
}
function periodScope(scope: Pick<TenantScope, "companyId" | "periodId" | "tenantId">) {
  return { ...companyScope(scope), periodId: scope.periodId };
}
function profileData(row: AccessProfileSnapshot) {
  return {
    companyId: row.companyId,
    createdAt: new Date(row.createdAt),
    createdBy: row.createdBy,
    description: row.description,
    id: row.id,
    lastMutationKey: row.lastMutationKey,
    name: row.name,
    normalizedName: row.normalizedName,
    revisionNo: row.revisionNo,
    status: row.status,
    tenantId: row.tenantId,
    updatedAt: new Date(row.updatedAt),
    updatedBy: row.updatedBy,
  };
}
function assignmentData(row: AccessProfileAssignmentSnapshot) {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}
function fromProfile(row: ProfileRecord): AccessProfileSnapshot {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    permissions: row.permissions
      .filter((item) => item.allowed)
      .map((item) => item.permissionCode as AccessProfilePermissionCode),
    status: row.status as AccessProfileStatus,
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
function fromAssignment(row: AssignmentRecord): AccessProfileAssignmentSnapshot {
  return {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
