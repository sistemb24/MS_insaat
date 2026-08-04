import Link from "next/link";

import type { PublicCapabilityState } from "@/lib/marketing/public-capabilities";

type PublicCapabilityNoticeProps = {
  capability: PublicCapabilityState;
  headingLevel?: 1 | 3;
  linkHref?: string;
  linkLabel?: string;
};

export default function PublicCapabilityNotice({
  capability,
  headingLevel = 1,
  linkHref,
  linkLabel,
}: PublicCapabilityNoticeProps) {
  return (
    <section
      aria-labelledby="public-capability-title"
      role="status"
      style={{
        background: "var(--ds-warning-container)",
        border: "1px solid var(--ds-warning)",
        borderRadius: "var(--ds-radius-panel)",
        padding: "24px",
      }}
    >
      <p
        style={{
          color: "var(--ds-warning)",
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          marginBottom: "8px",
          textTransform: "uppercase",
        }}
      >
        Kontrollü olarak kapalı
      </p>
      {headingLevel === 1 ? (
        <h1
          id="public-capability-title"
          style={headingStyle}
        >
          {capability.label}
        </h1>
      ) : (
        <h3
          id="public-capability-title"
          style={headingStyle}
        >
          {capability.label}
        </h3>
      )}
      <p
        style={{
          color: "var(--ds-on-surface-variant)",
          fontSize: "14px",
          lineHeight: 1.65,
        }}
      >
        {capability.description}
      </p>
      {linkHref && linkLabel ? (
        <Link
          href={linkHref}
          style={{
            color: "var(--ds-primary)",
            display: "inline-flex",
            fontSize: "14px",
            fontWeight: 600,
            marginTop: "18px",
            textDecoration: "none",
          }}
        >
          {linkLabel} →
        </Link>
      ) : null}
    </section>
  );
}

const headingStyle = {
  color: "var(--ds-on-surface)",
  fontSize: "22px",
  fontWeight: 700,
  marginBottom: "10px",
} as const;
