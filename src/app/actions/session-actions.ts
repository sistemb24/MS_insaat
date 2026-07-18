"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { parseCredentialLoginForm } from "@/lib/credential-login";
import { createCredentialPrismaRepository } from "@/lib/credential-prisma-repository";
import { authenticateCredentialSessionLogin } from "@/lib/credential-session-login";
import { prisma } from "@/lib/prisma";
import { canSwitchToSession } from "@/lib/session-access";
import { listAccessibleSessionRecordsForUser } from "@/lib/session-access-service";
import { createSessionScopePrismaRepository } from "@/lib/session-scope-prisma-repository";
import {
  resolveTenantScopeFromSessionStore,
  SESSION_COOKIE_NAME,
} from "@/lib/session-scope";
import { parseSessionSwitchForm } from "@/lib/session-switch";
import { createUserScopeAccessPrismaRepository } from "@/lib/user-scope-access-prisma-repository";

const sessionScopeRepository = createSessionScopePrismaRepository(prisma);
const userScopeAccessRepository = createUserScopeAccessPrismaRepository(prisma);
const credentialRepository = createCredentialPrismaRepository(prisma);

export async function signInWithCredentialsAction(formData: FormData) {
  const credentials = parseCredentialLoginForm(formData);
  const result = await authenticateCredentialSessionLogin({
    ...credentials,
    now: new Date(),
    repository: credentialRepository,
    scopeAccessRepository: userScopeAccessRepository,
    sessionRepository: sessionScopeRepository,
  });

  if (!result.ok) {
    redirect("/giris?error=credentials");
  }

  await setActiveSessionCookie(result.sessionId);
  revalidatePath("/");
  redirect("/");
}

export async function switchActiveSessionAction(formData: FormData) {
  const { redirectTo, sessionId } = parseSessionSwitchForm(formData);
  const now = new Date();
  const currentSessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const activeScope = await resolveTenantScopeFromSessionStore({
    now,
    repository: sessionScopeRepository,
    sessionId: currentSessionId,
  });
  const allowedSessions = await listAccessibleSessionRecordsForUser({
    now,
    scopeAccessRepository: userScopeAccessRepository,
    sessionRepository: sessionScopeRepository,
    userId: activeScope.userId,
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
    await setActiveSessionCookie(session.id);

    revalidatePath(redirectTo);
  }

  redirect(redirectTo);
}

export async function signOutActiveSessionAction() {
  const cookieStore = await cookies();

  cookieStore.set({
    httpOnly: true,
    maxAge: 0,
    name: SESSION_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
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
    name: SESSION_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    value: sessionId,
  });
}
