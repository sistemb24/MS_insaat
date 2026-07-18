import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "./prisma";
import { listAccessibleSessionRecordsForUser } from "./session-access-service";
import { sessionRecordToOption } from "./session-options";
import { createSessionScopePrismaRepository } from "./session-scope-prisma-repository";
import {
  resolveTenantScopeFromSessionStore,
  SESSION_COOKIE_NAME,
} from "./session-scope";
import { createUserScopeAccessPrismaRepository } from "./user-scope-access-prisma-repository";

const sessionScopeRepository = createSessionScopePrismaRepository(prisma);
const userScopeAccessRepository = createUserScopeAccessPrismaRepository(prisma);

export async function getActiveTenantScope() {
  const sessionId = await getActiveSessionId();

  return resolveTenantScopeFromSessionStore({
    now: new Date(),
    repository: sessionScopeRepository,
    sessionId,
  });
}

export async function getActiveSessionState() {
  const sessionId = await getActiveSessionId();
  const now = new Date();
  const scope = await resolveTenantScopeFromSessionStore({
    now,
    repository: sessionScopeRepository,
    sessionId,
  });

  return {
    sessionId,
    sessionOptions: await listActiveSessionOptionsForUser(now, scope.userId),
    scope,
  };
}

/**
 * Resolves the authenticated session for protected app pages.
 *
 * The scope resolver intentionally falls back to the demo tenant when there
 * is no cookie so server actions can remain deterministic. Pages must not use
 * that fallback as an authenticated state, however: after logout a direct
 * visit to `/` would otherwise render the dashboard again.
 */
export async function requireActiveSessionState() {
  const sessionId = await getActiveSessionId();
  const record = sessionId
    ? await sessionScopeRepository.findById(sessionId)
    : null;

  if (!record || (record.expiresAt && record.expiresAt.getTime() <= Date.now())) {
    redirect("/giris");
  }

  return getActiveSessionState();
}

export async function getActiveSessionOptions() {
  return listActiveSessionOptions(new Date());
}

async function getActiveSessionId() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

async function listActiveSessionOptions(now: Date) {
  const sessionRecords = sessionScopeRepository.listActive
    ? await sessionScopeRepository.listActive({ now })
    : [];

  return sessionRecords.map(sessionRecordToOption);
}

async function listActiveSessionOptionsForUser(now: Date, userId: string) {
  const sessionRecords = await listAccessibleSessionRecordsForUser({
    now,
    scopeAccessRepository: userScopeAccessRepository,
    sessionRepository: sessionScopeRepository,
    userId,
  });

  return sessionRecords.map(sessionRecordToOption);
}
