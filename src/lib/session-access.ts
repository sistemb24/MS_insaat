import type { SessionScopeRecord } from "./session-scope";
import type { UserScopeAccessRecord } from "./user-scope-access";

export function canSwitchToSession({
  allowedSessionIds,
  targetSessionId,
}: {
  allowedSessionIds: string[];
  targetSessionId: string;
}) {
  return allowedSessionIds.includes(targetSessionId);
}

export function filterSessionsByScopeAccess({
  accessRows,
  sessions,
}: {
  accessRows: UserScopeAccessRecord[];
  sessions: SessionScopeRecord[];
}) {
  return sessions.filter((session) =>
    accessRows.some((access) => sessionMatchesAccess(session, access)),
  );
}

function sessionMatchesAccess(
  session: SessionScopeRecord,
  access: UserScopeAccessRecord,
) {
  return (
    session.tenantId === access.tenantId &&
    session.companyId === access.companyId &&
    session.periodId === access.periodId &&
    session.userId === access.userId
  );
}