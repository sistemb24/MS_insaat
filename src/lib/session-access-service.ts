import { filterSessionsByScopeAccess } from "./session-access";
import type { SessionScopeRepository } from "./session-scope";
import type { UserScopeAccessRepository } from "./user-scope-access";

export async function listAccessibleSessionRecordsForUser({
  now,
  scopeAccessRepository,
  sessionRepository,
  userId,
}: {
  now: Date;
  scopeAccessRepository: UserScopeAccessRepository;
  sessionRepository: SessionScopeRepository;
  userId: string;
}) {
  const sessions = sessionRepository.listActiveForUser
    ? await sessionRepository.listActiveForUser({ now, userId })
    : [];
  const accessRows = await scopeAccessRepository.listActiveForUser({ userId });

  return filterSessionsByScopeAccess({ accessRows, sessions });
}