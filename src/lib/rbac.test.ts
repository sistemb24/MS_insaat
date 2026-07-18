import { describe, expect, test } from "vitest";

import { getRbacPermissionRoles, hasRbacPermission } from "./rbac";

describe("rbac", () => {
  test("allows accounting roles for finance mutations but reserves user management for admins", () => {
    expect(hasRbacPermission("accounting", "cash-bank.manage")).toBe(true);
    expect(hasRbacPermission("accounting", "ledger.post")).toBe(true);
    expect(hasRbacPermission("viewer", "document.manage")).toBe(false);
    expect(hasRbacPermission("accounting", "user.manage")).toBe(false);
    expect(getRbacPermissionRoles("user.manage")).toEqual(["admin"]);
  });
});
