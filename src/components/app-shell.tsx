import Link from "next/link";

import { AppShellMobileDrawer } from "@/components/app-shell-mobile-drawer";
import { ShellNavigation } from "@/components/app-shell-navigation";
import {
  GlobalSearchProvider,
  GlobalSearchTrigger,
} from "@/components/global-search-command";
import { Icon, ThemeControl } from "@/components/ui";
import type { GlobalSearchAction } from "@/app/actions/global-search-actions";
import { appContext } from "@/lib/navigation";
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
  globalSearchAction?: GlobalSearchAction;
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
  globalSearchAction,
  notificationUnreadCount = getUnreadNotificationCount(createSeedNotificationRows()),
  sessionOptions = [],
  signOutAction,
  switchSessionAction,
}: AppShellProps) {
  const shell = (
    <StandardAppShell
      activeSessionId={activeSessionId}
      context={context}
      currentPath={currentPath}
      globalSearchEnabled={Boolean(globalSearchAction)}
      notificationUnreadCount={notificationUnreadCount}
      sessionOptions={sessionOptions}
      signOutAction={signOutAction}
      switchSessionAction={switchSessionAction}
    >
      {children}
    </StandardAppShell>
  );

  return globalSearchAction ? (
    <GlobalSearchProvider searchAction={globalSearchAction}>
      {shell}
    </GlobalSearchProvider>
  ) : (
    shell
  );
}

function StandardAppShell({
  activeSessionId,
  children,
  context,
  currentPath,
  globalSearchEnabled,
  notificationUnreadCount,
  sessionOptions,
  signOutAction,
  switchSessionAction,
}: Required<Pick<AppShellProps, "children" | "context" | "currentPath" | "notificationUnreadCount" | "sessionOptions">> &
  { globalSearchEnabled: boolean } &
  Pick<AppShellProps, "activeSessionId" | "signOutAction" | "switchSessionAction">) {
  return (
    <div
      className="min-h-screen overflow-x-clip bg-surface text-content"
      data-shell-variant="standard"
    >
      <a
        className="sr-only z-[70] rounded-ui-control bg-brand-primary px-4 py-2 font-semibold text-on-brand focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Ana içeriğe geç
      </a>
      <header
        className="sticky top-0 z-40 flex h-[var(--ds-app-header-height)] items-center border-b border-divider bg-surface-raised px-4 shadow-sm sm:px-5"
        data-print-hidden="true"
      >
        <div className="flex min-w-0 items-center gap-3 lg:w-[var(--ds-app-sidebar-width)] lg:shrink-0">
          <AppShellMobileDrawer>
            <MobileContextSummary context={context} />
            {globalSearchEnabled ? (
              <div className="border-b border-divider bg-surface-raised p-4">
                <GlobalSearchTrigger variant="mobile" />
              </div>
            ) : null}
            <ShellNavigation currentPath={currentPath} label="Mobil ana modüller" />
            <div className="space-y-3 border-t border-divider bg-surface-raised p-4" data-mobile-drawer-footer="true">
              <ThemeControl />
              <SessionSwitcher
                activeSessionId={activeSessionId}
                currentPath={currentPath}
                id="mobile-sessionId"
                options={sessionOptions}
                switchSessionAction={switchSessionAction}
              />
              <SignOutButton className="w-full" signOutAction={signOutAction} />
            </div>
          </AppShellMobileDrawer>
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-ui-control bg-brand-primary-strong text-on-brand shadow-sm lg:inline-flex">
            <Icon name="building" size={21} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-5 text-brand-primary">NOA İnşaat</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
              İnşaat Yönetim SaaS
            </p>
          </div>
        </div>

        <div className="ml-auto hidden min-w-0 flex-1 items-center px-4 lg:flex">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-content">{context.companyName}</p>
            <p className="truncate text-[11px] text-content-muted">
              {context.tenantName} · {context.periodLabel} dönemi
            </p>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {globalSearchEnabled ? <GlobalSearchTrigger variant="desktop" /> : null}
          <ThemeControl className="hidden 2xl:inline-flex" compact />
          <SessionSwitcher
            activeSessionId={activeSessionId}
            currentPath={currentPath}
            id="sessionId"
            options={sessionOptions}
            switchSessionAction={switchSessionAction}
          />
          <NotificationBadge count={notificationUnreadCount} />
          {context.userRole === "viewer" ? (
            <div
              className="hidden rounded-ui-control border border-warning bg-warning-subtle px-2 py-1.5 text-[11px] font-semibold text-warning 2xl:block"
              role="status"
            >
              Salt okur · işlemler pasif
            </div>
          ) : null}
          <div className="hidden items-center gap-2 rounded-ui-control px-2 py-1.5 xl:flex">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary-subtle text-xs font-bold text-brand-primary">
              {getInitials(context.userName)}
            </span>
            <span className="min-w-0">
              <span className="block max-w-28 truncate text-xs font-semibold text-content">
                {context.userName}
              </span>
              <span className="block text-[10px] text-content-muted">
                {getRoleLabel(context.userRole)} · {context.licenseLabel}
              </span>
            </span>
          </div>
          <SignOutButton signOutAction={signOutAction} />
        </div>
      </header>

      <div
        className="flex min-h-[calc(100vh-var(--ds-app-header-height))]"
        data-shell-body="true"
      >
        <aside
          className="sticky top-[var(--ds-app-header-height)] hidden h-[calc(100vh-var(--ds-app-header-height))] w-[var(--ds-app-sidebar-width)] shrink-0 flex-col border-r border-divider bg-surface-raised shadow-sm lg:flex"
          data-print-hidden="true"
        >
          <ShellNavigation currentPath={currentPath} />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6" data-ui-workspace="true" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function MobileContextSummary({ context }: { context: TenantScope }) {
  return (
    <div className="border-b border-divider bg-surface-muted px-4 py-3">
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="col-span-2">
          <dt className="text-content-muted">Firma</dt>
          <dd className="truncate font-semibold text-content">{context.companyName}</dd>
        </div>
        <div>
          <dt className="text-content-muted">Dönem</dt>
          <dd className="font-semibold text-content">{context.periodLabel}</dd>
        </div>
        <div>
          <dt className="text-content-muted">Kullanıcı</dt>
          <dd className="truncate font-semibold text-content">{context.userName}</dd>
        </div>
      </dl>
      {context.userRole === "viewer" ? (
        <p className="mt-2 rounded-ui-control border border-warning bg-warning-subtle px-2 py-1.5 text-xs font-semibold text-warning">
          Salt okur · işlemler pasif
        </p>
      ) : null}
    </div>
  );
}

function SessionSwitcher({
  activeSessionId,
  currentPath,
  id,
  options,
  switchSessionAction,
}: {
  activeSessionId?: string;
  currentPath: string;
  id: string;
  options: SessionOption[];
  switchSessionAction?: (formData: FormData) => void | Promise<void>;
}) {
  if (options.length === 0 || !switchSessionAction) {
    return null;
  }

  return (
    <form action={switchSessionAction} className="flex items-end gap-2">
      <input name="redirectTo" type="hidden" value={currentPath} />
      <label className="min-w-0 flex-1 text-[11px] font-semibold text-content-subtle" htmlFor={id}>
        Oturum
        <select
          className="mt-1 h-9 w-full min-w-0 rounded-ui-control border border-divider bg-surface-muted px-2 text-xs font-semibold text-content outline-none focus:border-brand-primary"
          defaultValue={activeSessionId}
          id={id}
          name="sessionId"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="h-9 rounded-ui-control bg-brand-primary px-3 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-primary-strong"
        type="submit"
      >
        Geç
      </button>
    </form>
  );
}

function NotificationBadge({ count }: { count: number }) {
  const label = count > 0 ? `${count} okunmamış bildirim` : "Bildirimler";

  return (
    <Link
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-ui-control text-content-subtle transition-colors hover:bg-surface-muted hover:text-brand-primary"
      href="/bildirimler"
    >
      <Icon name="bell" size={20} />
      {count > 0 ? (
        <span className="absolute right-0.5 top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[9px] font-bold leading-4 text-on-danger">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function SignOutButton({
  className,
  signOutAction,
}: {
  className?: string;
  signOutAction?: () => void | Promise<void>;
}) {
  if (!signOutAction) {
    return null;
  }

  return (
    <form action={signOutAction} className={className}>
      <button
        className="h-9 w-full rounded-ui-control border border-divider bg-surface-raised px-3 text-xs font-semibold text-content transition-colors hover:bg-surface-muted"
        type="submit"
      >
        Çıkış
      </button>
    </form>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("") || "NO";
}

function getRoleLabel(role: TenantScope["userRole"]) {
  if (role === "admin") return "Yönetici";
  if (role === "viewer") return "Salt Okur";
  return "Muhasebe";
}
