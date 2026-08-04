export type AccessProfileAssignmentRemovalReason =
  | "access-deactivation"
  | "role-change";

export type AccessProfileAssignmentLifecycleDecision = {
  reason: AccessProfileAssignmentRemovalReason | null;
  removeAssignment: boolean;
};

export function resolveAccessProfileAssignmentLifecycle(input: {
  operation: "deactivate" | "role-change";
  targetRole?: string;
}): AccessProfileAssignmentLifecycleDecision {
  if (input.operation === "deactivate") {
    return {
      reason: "access-deactivation",
      removeAssignment: true,
    };
  }

  if (input.targetRole && input.targetRole !== "viewer") {
    return {
      reason: "role-change",
      removeAssignment: true,
    };
  }

  return {
    reason: null,
    removeAssignment: false,
  };
}
