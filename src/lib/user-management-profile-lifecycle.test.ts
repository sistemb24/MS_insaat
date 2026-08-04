import { describe, expect, test } from "vitest";

import { resolveAccessProfileAssignmentLifecycle } from "./user-management-profile-lifecycle";

describe("user management access profile lifecycle", () => {
  test("removes the assignment when access is deactivated", () => {
    expect(
      resolveAccessProfileAssignmentLifecycle({ operation: "deactivate" }),
    ).toEqual({
      reason: "access-deactivation",
      removeAssignment: true,
    });
  });

  test.each(["accounting", "admin"])(
    "removes the assignment when the target role is %s",
    (targetRole) => {
      expect(
        resolveAccessProfileAssignmentLifecycle({
          operation: "role-change",
          targetRole,
        }),
      ).toEqual({
        reason: "role-change",
        removeAssignment: true,
      });
    },
  );

  test("preserves the assignment when the target role remains viewer", () => {
    expect(
      resolveAccessProfileAssignmentLifecycle({
        operation: "role-change",
        targetRole: "viewer",
      }),
    ).toEqual({
      reason: null,
      removeAssignment: false,
    });
  });
});
