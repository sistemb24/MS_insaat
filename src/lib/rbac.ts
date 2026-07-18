import type { TenantUserRole } from "./tenant-scope";

export type RbacPermission =
  | "cash-bank.manage"
  | "document.manage"
  | "ledger.post"
  | "user.manage";

const permissionRoles: Record<RbacPermission, readonly TenantUserRole[]> = {
  "cash-bank.manage": ["admin", "accounting"],
  "document.manage": ["admin", "accounting"],
  "ledger.post": ["admin", "accounting"],
  "user.manage": ["admin"],
};

export function hasRbacPermission(role: TenantUserRole, permission: RbacPermission) {
  return permissionRoles[permission].includes(role);
}

export function getRbacPermissionRoles(permission: RbacPermission) {
  return [...permissionRoles[permission]];
}
