import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { signInSuperAdminAction } from "@/app/super-admin/actions/super-admin-auth-actions";
import { SuperAdminAuthCard } from "@/components/super-admin/auth-card";
import { LoginForm } from "@/components/super-admin/login-form";
import { prisma } from "@/lib/prisma";
import { sanitizeSuperAdminReturnTo } from "@/lib/super-admin-auth";
import { createSuperAdminCredentialPrismaRepository } from "@/lib/super-admin-credential";
import { createSuperAdminSessionPrismaRepository, resolveSuperAdminSession, SUPER_ADMIN_SESSION_COOKIE } from "@/lib/super-admin-session-repository";

export const metadata: Metadata = { title: "Süper Admin Girişi | NOA İnşaat" };

export default async function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setup?: string; returnTo?: string }>;
}) {
  const credentialRepository = createSuperAdminCredentialPrismaRepository(prisma);
  if (!(await credentialRepository.existsAny())) redirect("/super-admin/ilk-kurulum");

  const cookieStore = await cookies();
  const existing = await resolveSuperAdminSession(
    cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value,
    createSuperAdminSessionPrismaRepository(prisma),
  );
  if (existing) redirect("/super-admin");

  const query = await searchParams;
  return (
    <SuperAdminAuthCard title="Süper Admin Girişi" description="NOA platform yönetim alanı">
      <LoginForm
        error={query.error}
        loginAction={signInSuperAdminAction}
        returnTo={sanitizeSuperAdminReturnTo(query.returnTo) ?? undefined}
        setupComplete={query.setup === "complete"}
      />
    </SuperAdminAuthCard>
  );
}
