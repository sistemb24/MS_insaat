import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "./prisma";
import { listAccessibleSessionRecordsForUser } from "./session-access-service";
import { sessionRecordToOption } from "./session-options";
import { createSessionScopePrismaRepository } from "./session-scope-prisma-repository";
import { SESSION_COOKIE_NAME } from "./session-scope";
import { createTenantAuthSessionPrismaRepository } from "./tenant-auth-session-prisma-repository";
import { createUserScopeAccessPrismaRepository } from "./user-scope-access-prisma-repository";

const sessionScopeRepository = createSessionScopePrismaRepository(prisma);
const tenantAuthSessionRepository = createTenantAuthSessionPrismaRepository(prisma);
const userScopeAccessRepository = createUserScopeAccessPrismaRepository(prisma);

export async function getActiveTenantScope() {
  return (await requireTenantAuthSession()).scope;
}

export async function getActiveSessionState() {
  const now = new Date();
  const authSession = await requireTenantAuthSession(now);

  return {
    sessionId: authSession.scopeSessionId,
    sessionOptions: await listActiveSessionOptionsForUser(
      now,
      authSession.userId,
    ),
    scope: authSession.scope,
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
  return getActiveSessionState();
}

export async function getActiveSessionOptions() {
  if (process.env.NODE_ENV === "production") return [];

  return listActiveSessionOptions(new Date());
}

async function getActiveSessionId() {
  const cookieStore = await cookies();

  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

async function requireTenantAuthSession(now = new Date()) {
  const sessionId = await getActiveSessionId();
  const authSession = sessionId
    ? await tenantAuthSessionRepository.findActiveById({ id: sessionId, now })
    : null;

  if (!authSession) redirect("/giris");

  return authSession;
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
