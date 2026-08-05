import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  createSuperAdminSessionPrismaRepository,
  resolveSuperAdminSession,
  SUPER_ADMIN_SESSION_COOKIE,
  type AuthenticatedSuperAdmin,
} from "@/lib/super-admin-session-repository";

export type { AuthenticatedSuperAdmin };

export async function requireSuperAdminSession(): Promise<AuthenticatedSuperAdmin> {
  const cookieStore = await cookies();
  const repository = createSuperAdminSessionPrismaRepository(prisma);
  const session = await resolveSuperAdminSession(
    cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value,
    repository,
  );
  if (!session) redirect("/super-admin/giris?error=session");
  return session;
}
