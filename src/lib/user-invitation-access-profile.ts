import type {
  AccessProfileAssignmentSnapshot,
  AccessProfileSnapshot,
} from "./access-profile";

export const CUSTOM_RBAC_USER_TYPE = "Özel (RBAC ile Yönetilen)";

export function normalizeInvitationAccessProfileId(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function validateInvitationAccessProfileSelection(input: {
  accessProfileId?: string;
  role: string;
}) {
  const isCustomUser = input.role === CUSTOM_RBAC_USER_TYPE;
  if (isCustomUser && !input.accessProfileId) {
    return ["Özel kullanıcı daveti için aktif yetki profili seçilmelidir."];
  }
  if (!isCustomUser && input.accessProfileId) {
    return ["Yetki profili yalnız Özel (RBAC ile Yönetilen) kullanıcı tipinde seçilebilir."];
  }
  return [];
}

export function validateInvitationAccessProfile(
  profile:
    | Pick<AccessProfileSnapshot, "companyId" | "id" | "status" | "tenantId">
    | null,
) {
  return !profile || profile.status !== "ACTIVE"
    ? ["Davet için seçilen aktif yetki profili bulunamadı."]
    : [];
}

export function createInvitationAccessProfileAssignment(input: {
  acceptedAt: string;
  companyId: string;
  periodId: string;
  profileId: string;
  tenantId: string;
  userId: string;
}): AccessProfileAssignmentSnapshot {
  return {
    companyId: input.companyId,
    createdAt: input.acceptedAt,
    createdBy: input.userId,
    id: [
      input.tenantId,
      input.companyId,
      input.periodId,
      "access-profile-assignment",
      input.userId,
    ].join("::"),
    lastMutationKey: [
      input.tenantId,
      input.companyId,
      input.periodId,
      input.userId,
      "invitation-accept",
    ].join("::"),
    periodId: input.periodId,
    profileId: input.profileId,
    revisionNo: 1,
    tenantId: input.tenantId,
    updatedAt: input.acceptedAt,
    updatedBy: input.userId,
    userId: input.userId,
  };
}
