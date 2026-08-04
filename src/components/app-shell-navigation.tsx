import Link from "next/link";

import { Icon, type IconName } from "@/components/ui";
import { navigationItems, type NavigationItem } from "@/lib/navigation";

type ShellNavigationProps = {
  currentPath: string;
  label?: string;
};

const navigationGroups = [
  {
    label: "Genel",
    routes: ["/", "/santiyeler", "/ihale-yonetimi", "/dokuman-merkezi", "/bildirimler"],
  },
  {
    label: "Finans",
    routes: [
      "/tedarikciler",
      "/musteriler",
      "/taseronlar",
      "/kasa-banka",
      "/giderler",
      "/faturalar",
      "/hakedis",
      "/cek",
    ],
  },
  {
    label: "Operasyon",
    routes: ["/personel", "/stok-depo", "/araclar", "/puantaj", "/raporlar"],
  },
  {
    label: "Sistem",
    routes: [
      "/abonelik",
      "/api-yonetimi",
      "/destek-merkezi",
      "/bilgi-merkezi",
      "/e-fatura-yonetimi",
    ],
  },
] as const;

const iconByRoute: Record<string, IconName> = {
  "/": "dashboard",
  "/abonelik": "receipt",
  "/api-yonetimi": "code",
  "/destek-merkezi": "life-buoy",
  "/bilgi-merkezi": "info",
  "/araclar": "car",
  "/ayarlar": "settings",
  "/bildirimler": "bell",
  "/cek": "receipt",
  "/dokuman-merkezi": "file",
  "/e-fatura-yonetimi": "receipt",
  "/faturalar": "receipt",
  "/giderler": "wallet",
  "/hakedis": "chart",
  "/ihale-yonetimi": "gavel",
  "/kasa-banka": "bank",
  "/musteriler": "users",
  "/personel": "users",
  "/puantaj": "calendar",
  "/raporlar": "chart",
  "/santiyeler": "building",
  "/stok-depo": "box",
  "/taseronlar": "users",
  "/tedarikciler": "users",
};

const itemsByRoute = new Map(navigationItems.map((item) => [item.href, item]));

export function ShellNavigation({
  currentPath,
  label = "Ana modüller",
}: ShellNavigationProps) {
  const settingsItem = itemsByRoute.get("/ayarlar");

  return (
    <nav aria-label={label} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-content-muted">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.routes.map((route) => {
                const item = itemsByRoute.get(route);
                return item ? (
                  <NavigationLink currentPath={currentPath} item={item} key={item.href} />
                ) : null;
              })}
            </div>
          </div>
        ))}
      </div>
      {settingsItem ? (
        <div className="border-t border-divider p-3">
          <NavigationLink currentPath={currentPath} item={settingsItem} />
        </div>
      ) : null}
    </nav>
  );
}

function NavigationLink({
  currentPath,
  item,
}: {
  currentPath: string;
  item: NavigationItem;
}) {
  const isActive =
    item.href === "/"
      ? currentPath === "/"
      : currentPath === item.href || currentPath.startsWith(`${item.href}/`);

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? "group flex min-h-10 items-center gap-3 rounded-ui-control bg-brand-primary-subtle px-3 py-2 text-sm font-semibold text-brand-primary"
          : "group flex min-h-10 items-center gap-3 rounded-ui-control px-3 py-2 text-sm font-medium text-content-subtle transition-colors hover:bg-surface-muted hover:text-content"
      }
      href={item.href}
    >
      <Icon
        className={isActive ? "text-brand-primary" : "text-content-muted group-hover:text-brand-primary"}
        name={iconByRoute[item.href] ?? "file"}
        size={19}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
