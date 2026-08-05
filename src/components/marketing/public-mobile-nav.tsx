"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NavLink = {
  label: string;
  href: string;
};

type PublicMobileNavProps = {
  links: NavLink[];
};

export default function PublicMobileNav({ links }: PublicMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Dialog aç/kapat
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
        // Kapatıldığında trigger'a focus geri döner
        triggerRef.current?.focus();
      }
    }
  }, [isOpen]);

  // native dialog 'cancel' (Escape tuşu) ile kapatma
  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    setIsOpen(false);
  }

  // Dialog dışına tıklayınca kapat
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      setIsOpen(false);
    }
  }

  return (
    <>
      {/* Hamburger butonu — yalnızca mobilde görünür */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-dialog"
        onClick={() => setIsOpen(true)}
        className="md:hidden"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          border: "1px solid var(--ds-outline-variant)",
          background: "transparent",
          color: "var(--ds-on-surface-variant)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {/* Hamburger ikonu */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Native <dialog> — focus trap built-in */}
      <dialog
        ref={dialogRef}
        id="mobile-nav-dialog"
        onCancel={handleCancel}
        onClick={handleBackdropClick}
        aria-label="Mobil navigasyon menüsü"
        style={{
          position: "fixed",
          inset: 0,
          margin: 0,
          padding: 0,
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          border: "none",
          background: "transparent",
        }}
      >
        {/* Overlay arka plan */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "var(--ds-scrim)",
          }}
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />

        {/* Menü paneli — sağdan kayar */}
        <nav
          aria-label="Mobil navigasyon"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "min(320px, 85vw)",
            height: "100%",
            background: "var(--ds-surface)",
            borderLeft: "1px solid var(--ds-outline-variant)",
            display: "flex",
            flexDirection: "column",
            padding: "0",
          }}
        >
          {/* Panel başlık satırı */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--ds-outline-variant)",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--ds-primary)",
              }}
            >
              NOA İnşaat
            </span>

            {/* Kapat butonu */}
            <button
              type="button"
              aria-label="Menüyü kapat"
              onClick={() => setIsOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "1px solid var(--ds-outline-variant)",
                background: "transparent",
                color: "var(--ds-on-surface-variant)",
                cursor: "pointer",
              }}
            >
              {/* ✕ ikonu */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Nav linkleri */}
          <ul
            role="list"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 8px",
              margin: 0,
              listStyle: "none",
            }}
          >
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "var(--ds-on-surface-variant)",
                    textDecoration: "none",
                    transition: "color 120ms ease, background 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--ds-primary)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "color-mix(in srgb, var(--ds-primary) 8%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--ds-on-surface-variant)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Giriş Yap CTA */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--ds-outline-variant)",
            }}
          >
            <Link
              href="/giris"
              onClick={() => setIsOpen(false)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 24px",
                borderRadius: "8px",
                background: "var(--ds-primary)",
                color: "var(--ds-on-primary)",
                fontSize: "14px",
                fontWeight: 600,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Giriş Yap
            </Link>
          </div>
        </nav>
      </dialog>
    </>
  );
}
