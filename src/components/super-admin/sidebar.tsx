"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  superAdminNavGroups,
  superAdminNavItems,
  type SuperAdminNavItem,
} from "@/lib/super-admin-navigation";

function NavIcon({ icon }: { icon: string }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-control text-xs font-bold"
      style={{
        background: "var(--ds-primary-fixed)",
        color: "var(--ds-on-primary-fixed)",
      }}
    >
      {icon}
    </span>
  );
}

function NavLink({
  item,
  isActive,
}: {
  item: SuperAdminNavItem;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-ui-control px-3 py-2 text-sm font-medium transition-colors"
      style={{
        background: isActive ? "var(--ds-primary-fixed)" : "transparent",
        color: isActive
          ? "var(--ds-on-primary-fixed)"
          : "var(--ds-on-surface-variant)",
        textDecoration: "none",
      }}
      title={item.description}
    >
      <NavIcon icon={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function SuperAdminSidebar() {
  const pathname = usePathname();

  function isItemActive(href: string) {
    if (href === "/super-admin") return pathname === "/super-admin";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col"
      style={{
        borderRight: "1px solid var(--ds-outline-variant)",
        background: "var(--ds-surface-raised)",
        height: "100%",
      }}
    >
      {/* Logo bölümü */}
      <div
        className="flex h-16 items-center gap-3 px-5"
        style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-ui-control text-xs font-bold"
          style={{
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
          }}
        >
          NOA
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold" style={{ color: "var(--ds-on-surface)" }}>
            Admin Console
          </p>
          <p className="truncate text-xs" style={{ color: "var(--ds-text-muted)" }}>
            Platform Yönetimi
          </p>
        </div>
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Süper Admin navigasyonu">
        {superAdminNavGroups.map((group) => {
          const items = superAdminNavItems.filter((i) => i.group === group.key);
          if (items.length === 0) return null;
          return (
            <div key={group.key} className="mb-5">
              <p
                className="mb-2 px-3 text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--ds-text-muted)" }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink key={item.href} item={item} isActive={isItemActive(item.href)} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Alt bilgi */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid var(--ds-outline-variant)" }}
      >
        <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
          NOA İnşaat Yönetim
        </p>
        <p className="text-xs" style={{ color: "var(--ds-text-muted)" }}>
          v0.1.0 — Admin Console
        </p>
      </div>
    </aside>
  );
}
