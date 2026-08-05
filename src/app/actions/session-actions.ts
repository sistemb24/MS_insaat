"use server";

import { refresh, revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { parseCredentialLoginForm } from "@/lib/credential-login";
import { createCredentialPrismaRepository } from "@/lib/credential-prisma-repository";
import { authenticateCredentialSessionLogin } from "@/lib/credential-session-login";
import { prisma } from "@/lib/prisma";
import { canSwitchToSession } from "@/lib/session-access";
import { listAccessibleSessionRecordsForUser } from "@/lib/session-access-service";
import { createSessionScopePrismaRepository } from "@/lib/session-scope-prisma-repository";
import { SESSION_COOKIE_NAME } from "@/lib/session-scope";
import { parseSessionSwitchForm } from "@/lib/session-switch";
import { TENANT_AUTH_SESSION_POLICY } from "@/lib/tenant-auth-session";
import { createTenantAuthSessionPrismaRepository } from "@/lib/tenant-auth-session-prisma-repository";
import {
  createTenantLoginRateLimiter,
  resolveTenantLoginClientAddress,
} from "@/lib/tenant-login-rate-limiter";
import { createUserScopeAccessPrismaRepository } from "@/lib/user-scope-access-prisma-repository";

const sessionScopeRepository = createSessionScopePrismaRepository(prisma);
const userScopeAccessRepository = createUserScopeAccessPrismaRepository(prisma);
const credentialRepository = createCredentialPrismaRepository(prisma);
const tenantAuthSessionRepository = createTenantAuthSessionPrismaRepository(prisma);
const tenantLoginRateLimiter = createTenantLoginRateLimiter(prisma);

export async function signInWithCredentialsAction(formData: FormData) {
  const credentials = parseCredentialLoginForm(formData);
  if (
    !credentials.email ||
    credentials.email.length > 254 ||
    !credentials.password ||
    credentials.password.length > 256
  ) {
    redirect("/giris?error=credentials");
  }
  const requestHeaders = await headers();
  const result = await authenticateCredentialSessionLogin({
    ...credentials,
    authSessionRepository: tenantAuthSessionRepository,
    clientAddress: resolveTenantLoginClientAddress(
      requestHeaders,
      process.env.NOA_TRUST_PROXY === "true",
    ),
    now: new Date(),
    rateLimiter: tenantLoginRateLimiter,
    repository: credentialRepository,
    scopeAccessRepository: userScopeAccessRepository,
    sessionRepository: sessionScopeRepository,
  });

  if (!result.ok) {
    if ("reason" in result && result.reason === "rate_limited") {
      redirect("/giris?error=rate-limit");
    }
    redirect("/giris?error=credentials");
  }

  await setActiveSessionCookie(result.sessionId);
  revalidatePath("/");
  redirect("/");
}

export async function switchActiveSessionAction(formData: FormData) {
  const { redirectTo, sessionId } = parseSessionSwitchForm(formData);
  const now = new Date();
  const currentAuthSessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const authSession = currentAuthSessionId
    ? await tenantAuthSessionRepository.findActiveById({
        id: currentAuthSessionId,
        now,
      })
    : null;

  if (!authSession) redirect("/giris");

  const allowedSessions = await listAccessibleSessionRecordsForUser({
    now,
    scopeAccessRepository: userScopeAccessRepository,
    sessionRepository: sessionScopeRepository,
    userId: authSession.userId,
  });
  const session =
    sessionId &&
    canSwitchToSession({
      allowedSessionIds: allowedSessions.map((item) => item.id),
      targetSessionId: sessionId,
    })
      ? await sessionScopeRepository.findById(sessionId)
      : null;

  if (session && !isExpired(session.expiresAt)) {
    const rotatedSessionId = await tenantAuthSessionRepository.switchScope({
      authSessionId: authSession.id,
      now,
      scopeSessionId: session.id,
      userId: authSession.userId,
    });

    if (rotatedSessionId) {
      await setActiveSessionCookie(rotatedSessionId);
      revalidatePath(redirectTo);
      refresh();
      return;
    }
  }

  redirect(redirectTo);
}

export async function signOutActiveSessionAction() {
  const cookieStore = await cookies();
  const authSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (authSessionId) {
    await tenantAuthSessionRepository.revoke({
      id: authSessionId,
      revokedAt: new Date(),
    });
  }

  cookieStore.set({
    httpOnly: true,
    maxAge: 0,
    name: SESSION_COOKIE_NAME,
    path: TENANT_AUTH_SESSION_POLICY.cookiePath,
    sameSite: TENANT_AUTH_SESSION_POLICY.cookieSameSite,
    secure: process.env.NODE_ENV === "production",
    value: "",
  });

  revalidatePath("/giris");
  redirect("/giris");
}

function isExpired(expiresAt: Date | null) {
  return expiresAt ? expiresAt.getTime() <= Date.now() : false;
}

async function setActiveSessionCookie(sessionId: string) {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: TENANT_AUTH_SESSION_POLICY.absoluteDurationMs / 1000,
    name: SESSION_COOKIE_NAME,
    path: TENANT_AUTH_SESSION_POLICY.cookiePath,
    sameSite: TENANT_AUTH_SESSION_POLICY.cookieSameSite,
    secure: process.env.NODE_ENV === "production",
    value: sessionId,
  });
}
