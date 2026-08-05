import type { ReactNode } from "react";

import { signOutSuperAdminAction } from "@/app/super-admin/actions/super-admin-auth-actions";
import type { AuthenticatedSuperAdmin } from "@/lib/super-admin-session-repository";

import { SuperAdminSidebar } from "./sidebar";
import { SuperAdminSidebarMobile } from "./sidebar-mobile";

type SuperAdminShellProps = {
  admin: AuthenticatedSuperAdmin;
  children: ReactNode;
};

export function SuperAdminShell({ admin, children }: SuperAdminShellProps) {
  return (
    <div className="flex h-screen" style={{ background: "var(--ds-surface)" }}>
      {/* Desktop Sidebar */}
      <SuperAdminSidebar />

      {/* Ana içerik alanı */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6"
          style={{
            background: "var(--ds-surface-raised)",
            borderBottom: "1px solid var(--ds-outline-variant)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Mobil hamburger */}
            <SuperAdminSidebarMobile />

            {/* Breadcrumb / başlık alanı — sadece mobilde logo */}
            <span
              className="text-sm font-bold lg:hidden"
              style={{ color: "var(--ds-primary)" }}
            >
              NOA Admin
            </span>
          </div>

          {/* Sağ taraf: Admin bilgisi + çıkış */}
          <div className="flex items-center gap-4">
            {/* Admin adı */}
            <div className="hidden items-center gap-2 sm:flex">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: "var(--ds-primary)",
                  color: "var(--ds-on-primary)",
                }}
              >
                {admin.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: "var(--ds-on-surface)" }}
                >
                  {admin.name}
                </p>
                <p
                  className="truncate text-xs"
                  style={{ color: "var(--ds-text-muted)" }}
                >
                  {admin.email}
                </p>
              </div>
            </div>

            {/* Çıkış butonu */}
            <form action={signOutSuperAdminAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-ui-control border px-3 text-xs font-semibold transition-colors"
                style={{
                  borderColor: "var(--ds-outline-variant)",
                  color: "var(--ds-on-surface-variant)",
                  background: "transparent",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                <span className="hidden sm:inline">Güvenli Çıkış</span>
              </button>
            </form>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
          data-ui-workspace="true"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
