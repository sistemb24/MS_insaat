"use client";

import { useCallback, useEffect, useState } from "react";
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

function MobileNavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: SuperAdminNavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-ui-control px-3 py-2.5 text-sm font-medium transition-colors"
      style={{
        background: isActive ? "var(--ds-primary-fixed)" : "transparent",
        color: isActive
          ? "var(--ds-on-primary-fixed)"
          : "var(--ds-on-surface-variant)",
        textDecoration: "none",
      }}
    >
      <NavIcon icon={item.icon} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function SuperAdminSidebarMobile() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  function isItemActive(href: string) {
    if (href === "/super-admin") return pathname === "/super-admin";
    return pathname.startsWith(href);
  }

  const close = useCallback(() => setIsOpen(false), []);

  // Escape tuşu ile kapat
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // Body scroll kilitle
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  return (
    <>
      {/* Hamburger butonu */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-ui-control lg:hidden"
        style={{
          border: "1px solid var(--ds-outline-variant)",
          color: "var(--ds-on-surface)",
          background: "transparent",
        }}
        aria-label="Menüyü aç"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Overlay + Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Scrim */}
          <div
            className="absolute inset-0"
            style={{ background: "var(--ds-scrim)" }}
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col"
            style={{ background: "var(--ds-surface-raised)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobil navigasyon"
          >
            {/* Üst kısım */}
            <div
              className="flex h-16 items-center justify-between px-5"
              style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-ui-control text-xs font-bold"
                  style={{
                    background: "var(--ds-primary)",
                    color: "var(--ds-on-primary)",
                  }}
                >
                  NOA
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--ds-on-surface)" }}>
                  Admin Console
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-ui-control"
                style={{
                  color: "var(--ds-on-surface-variant)",
                  background: "transparent",
                  border: "none",
                }}
                aria-label="Menüyü kapat"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Süper Admin mobil navigasyon">
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
                        <MobileNavLink
                          key={item.href}
                          item={item}
                          isActive={isItemActive(item.href)}
                          onNavigate={close}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
