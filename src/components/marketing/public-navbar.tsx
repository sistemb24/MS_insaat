import Link from "next/link";

import PublicMobileNav from "./public-mobile-nav";
import ThemeToggleButton from "./theme-toggle-button";

type NavLink = {
  label: string;
  href: string;
};

const NAV_LINKS: NavLink[] = [
  { label: "Özellikler", href: "/ozellikler" },
  { label: "Fiyatlandırma", href: "/fiyatlandirma" },
  { label: "Hakkımızda", href: "/hakkimizda" },
  { label: "Blog", href: "/blog" },
  { label: "İletişim", href: "/iletisim" },
];

export default function PublicNavbar() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--ds-outline-variant)",
        background:
          "color-mix(in srgb, var(--ds-surface) 85%, transparent)",
      }}
    >
      <div
        className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 md:px-10"
      >
        {/* Logo */}
        <Link
          href="/landing"
          className="text-xl font-bold text-[var(--ds-primary)] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          NOA İnşaat
        </Link>

        {/* Desktop nav — ≥768px */}
        <nav
          className="hidden md:flex"
          aria-label="Ana navigasyon"
          style={{ alignItems: "center", gap: "4px" }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-2 text-sm text-[var(--ds-on-surface-variant)] transition-colors hover:text-[var(--ds-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
              style={{ textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Sağ taraf aksiyonlar */}
        <div className="flex items-center gap-3">
          {/* Tema toggle — her viewport'ta görünür */}
          <ThemeToggleButton />

          {/* Giriş Yap CTA — sadece desktop */}
          <Link
            href="/giris"
            className="hidden rounded px-6 py-2 text-sm font-semibold md:inline-flex"
            style={{
              background: "var(--ds-primary)",
              color: "var(--ds-on-primary)",
              textDecoration: "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Giriş Yap
          </Link>

          {/* Hamburger — sadece mobil */}
          <PublicMobileNav links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
