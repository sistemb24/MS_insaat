import Link from "next/link";

import { appContext, navigationItems } from "@/lib/navigation";
import {
  createSeedNotificationRows,
  getUnreadNotificationCount,
} from "@/lib/notification-center-service";
import type { SessionOption } from "@/lib/session-options";
import type { TenantScope } from "@/lib/tenant-scope";

type AppShellProps = {
  activeSessionId?: string;
  children: React.ReactNode;
  context?: TenantScope;
  currentPath?: string;
  notificationUnreadCount?: number;
  sessionOptions?: SessionOption[];
  signOutAction?: () => void | Promise<void>;
  switchSessionAction?: (formData: FormData) => void | Promise<void>;
};

export function AppShell({
  activeSessionId,
  children,
  context = appContext,
  currentPath = "/",
  notificationUnreadCount = getUnreadNotificationCount(createSeedNotificationRows()),
  sessionOptions = [],
  signOutAction,
  switchSessionAction,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)]">
      <TopBar
        activeSessionId={activeSessionId}
        context={context}
        currentPath={currentPath}
        notificationUnreadCount={notificationUnreadCount}
        sessionOptions={sessionOptions}
        signOutAction={signOutAction}
        switchSessionAction={switchSessionAction}
      />
      <div className="flex min-h-[calc(100vh-var(--app-header-height))]">
        <SidebarNav />
        <main className="min-w-0 flex-1 px-5 py-4">{children}</main>
      </div>
    </div>
  );
}

function TopBar({
  activeSessionId,
  context,
  currentPath,
  notificationUnreadCount,
  sessionOptions,
  signOutAction,
  switchSessionAction,
}: {
  activeSessionId?: string;
  context: TenantScope;
  currentPath: string;
  notificationUnreadCount: number;
  sessionOptions: SessionOption[];
  signOutAction?: () => void | Promise<void>;
  switchSessionAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <header className="flex h-[var(--app-header-height)] items-center justify-between border-b border-[var(--grid-border)] bg-[var(--surface-container-lowest)] px-5">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--primary)] text-sm font-bold text-white">
          NOA
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            İnşaat Yönetim SaaS
          </p>
          <p className="truncate text-xs text-[var(--on-surface-variant)]">
            {context.tenantName} · {context.companyName}
          </p>
        </div>
      </div>
      <div className="hidden items-center gap-3 text-xs md:flex">
        <SessionSwitcher
          activeSessionId={activeSessionId}
          currentPath={currentPath}
          options={sessionOptions}
          switchSessionAction={switchSessionAction}
        />
        <NotificationBadge count={notificationUnreadCount} />
        <ContextPill label="Dönem" value={context.periodLabel} />
        <ContextPill label="Kullanıcı" value={context.userName} />
        {context.userRole === "viewer" ? (
          <div
            className="rounded-[var(--radius-control)] border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800"
            role="status"
          >
            Salt okur · işlemler pasif
          </div>
        ) : null}
        <ContextPill label="Lisans" value={context.licenseLabel} />
        <SignOutButton signOutAction={signOutAction} />
      </div>
      <div className="flex items-center md:hidden">
        <SignOutButton signOutAction={signOutAction} />
      </div>
    </header>
  );
}

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <Link
      aria-label={`${count} okunmamış bildirim`}
      className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--primary)] px-3 py-1.5 font-mono text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
      href="/bildirimler"
    >
      {count}
    </Link>
  );
}

function SessionSwitcher({
  activeSessionId,
  currentPath,
  options,
  switchSessionAction,
}: {
  activeSessionId?: string;
  currentPath: string;
  options: SessionOption[];
  switchSessionAction?: (formData: FormData) => void | Promise<void>;
}) {
  if (options.length === 0 || !switchSessionAction) {
    return null;
  }

  return (
    <form action={switchSessionAction} className="flex items-center gap-2">
      <input name="redirectTo" type="hidden" value={currentPath} />
      <label className="text-[var(--on-surface-variant)]" htmlFor="sessionId">
        Oturum
      </label>
      <select
        className="h-8 min-w-52 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-2 text-xs font-semibold outline-none transition focus:border-[var(--primary)]"
        defaultValue={activeSessionId}
        id="sessionId"
        name="sessionId"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        className="h-8 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
        type="submit"
      >
        Geç
      </button>
    </form>
  );
}

function SignOutButton({
  signOutAction,
}: {
  signOutAction?: () => void | Promise<void>;
}) {
  if (!signOutAction) {
    return null;
  }

  return (
    <form action={signOutAction}>
      <button
        className="h-8 rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-xs font-semibold transition hover:bg-[var(--primary-fixed)]"
        type="submit"
      >
        Çıkış
      </button>
    </form>
  );
}

function ContextPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 py-1.5">
      <span className="text-[var(--on-surface-variant)]">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function SidebarNav() {
  return (
    <aside className="hidden w-[var(--app-sidebar-width)] shrink-0 border-r border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-3 lg:block">
      <nav aria-label="Planlı modüller" className="space-y-1">
        {navigationItems.map((item) => (
          <Link
            className="group flex items-start gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm transition hover:bg-[var(--primary-fixed)]"
            href={item.href}
            key={item.href}
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--primary-fixed)] font-mono text-[11px] font-semibold text-[var(--primary)]">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="block font-semibold">{item.label}</span>
                <span className="rounded-[var(--radius-control)] border border-[var(--grid-border)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--on-surface-variant)]">
                  {item.phase}
                </span>
              </span>
              <span className="line-clamp-2 text-xs text-[var(--on-surface-variant)]">
                {item.description}
              </span>
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
