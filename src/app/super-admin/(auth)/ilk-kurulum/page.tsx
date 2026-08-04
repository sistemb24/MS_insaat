import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { setupSuperAdminAction } from "@/app/super-admin/actions/super-admin-auth-actions";
import { SetupWizard } from "@/components/super-admin/setup-wizard";
import { prisma } from "@/lib/prisma";
import { createSuperAdminCredentialPrismaRepository } from "@/lib/super-admin-credential";

export const metadata: Metadata = { title: "İlk Süper Admin Kurulumu | NOA İnşaat" };

export default async function SuperAdminSetupPage() {
  if (await createSuperAdminCredentialPrismaRepository(prisma).existsAny()) {
    redirect("/super-admin/giris");
  }
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ui-control focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-content focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        Ana içeriğe geç
      </a>
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-[var(--ds-surface)] px-4 py-10 text-content"
      >
        <div className="w-full max-w-[800px]">
          <section className="rounded-ui-panel border border-divider bg-surface-raised p-6 shadow-sm">
            {/* NOA Brand Mark */}
            <div className="mb-6 flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-ui-panel bg-brand-primary text-sm font-bold text-on-brand"
              >
                NOA
              </div>
              <div>
                <h1 className="text-lg font-semibold text-content">İlk Süper Admin Kurulumu</h1>
                <p className="text-sm text-content-subtle">Tek kullanımlık platform hesabı oluşturma</p>
              </div>
            </div>
            <SetupWizard setupAction={setupSuperAdminAction} />
          </section>
        </div>
      </main>
    </>
  );
}
