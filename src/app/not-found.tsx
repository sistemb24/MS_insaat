import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 16px",
        textAlign: "center",
      }}
    >
      {/* 404 sayısal görünüm */}
      <div
        aria-hidden="true"
        style={{
          fontSize: "clamp(80px, 15vw, 160px)",
          fontWeight: 900,
          color: "var(--ds-primary)",
          lineHeight: 1,
          marginBottom: "16px",
          fontVariantNumeric: "tabular-nums",
          opacity: 0.15,
          userSelect: "none",
        }}
      >
        404
      </div>

      {/* Dekoratif ikon */}
      <div
        aria-hidden="true"
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "var(--ds-primary-fixed)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "36px",
          marginBottom: "24px",
        }}
      >
        🔍
      </div>

      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "var(--ds-on-surface)",
          marginBottom: "12px",
        }}
      >
        Sayfa Bulunamadı
      </h1>

      <p
        style={{
          fontSize: "15px",
          color: "var(--ds-on-surface-variant)",
          maxWidth: "400px",
          lineHeight: 1.6,
          marginBottom: "40px",
        }}
      >
        Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir. Aşağıdaki bağlantılardan birini kullanabilirsiniz.
      </p>

      {/* Aksiyon butonları */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Link
          href="/landing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "11px 28px",
            borderRadius: "var(--ds-radius-control)",
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Ana Sayfaya Dön
        </Link>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "11px 28px",
            borderRadius: "var(--ds-radius-control)",
            border: "1px solid var(--ds-outline-variant)",
            background: "var(--ds-surface-raised)",
            color: "var(--ds-on-surface)",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Dashboard&apos;a Git
        </Link>
      </div>
    </div>
  );
}
