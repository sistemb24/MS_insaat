import type { ReactNode } from "react";
import type { Metadata } from "next";

import Link from "next/link";

export const metadata: Metadata = { robots: { follow: false, index: false } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ds-background)",
        padding: "16px",
      }}
    >
      {/* Logotype */}
      <Link
        href="/landing"
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--ds-primary)",
          textDecoration: "none",
          letterSpacing: "-0.01em",
        }}
      >
        NOA İnşaat
      </Link>

      {/* Auth card */}
      <main
        style={{
          width: "100%",
          maxWidth: "440px",
          marginTop: "24px",
          background: "var(--ds-surface-raised)",
          borderRadius: "var(--ds-radius-panel)",
          border: "1px solid var(--ds-outline-variant)",
          padding: "32px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
