import Link from "next/link";

type Props = {
  searchParams: Promise<{ token?: string; used?: string }>;
};

export default async function EpostaDogrulamaPage({ searchParams }: Props) {
  const { token, used } = await searchParams;

  // Token kullanılmış
  if (used === "1") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>ℹ️</div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "12px" }}>
          Bu bağlantı daha önce kullanıldı
        </h1>
        <p style={{ fontSize: "14px", color: "var(--ds-on-surface-variant)", marginBottom: "24px" }}>
          E-posta adresiniz zaten doğrulanmış. Giriş yapabilirsiniz.
        </p>
        <Link
          href="/giris"
          style={{
            display: "inline-flex",
            padding: "10px 24px",
            borderRadius: "var(--ds-radius-control)",
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  // Geçerli token
  if (token && token.length >= 8) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "12px" }}>
          E-posta adresiniz doğrulandı
        </h1>
        <p style={{ fontSize: "14px", color: "var(--ds-on-surface-variant)", marginBottom: "24px" }}>
          Hesabınız başarıyla aktive edildi. Giriş yaparak platformu kullanmaya başlayabilirsiniz.
        </p>
        <Link
          href="/giris"
          style={{
            display: "inline-flex",
            padding: "10px 24px",
            borderRadius: "var(--ds-radius-control)",
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Giriş Yap
        </Link>
      </div>
    );
  }

  // Geçersiz / eksik token
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
      <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "12px" }}>
        Doğrulama başarısız
      </h1>
      <p style={{ fontSize: "14px", color: "var(--ds-on-surface-variant)", marginBottom: "24px", lineHeight: 1.6 }}>
        Bağlantı geçersiz veya süresi dolmuş olabilir. Yeni bir doğrulama e-postası talep edebilirsiniz.
      </p>
      <Link
        href="/giris"
        style={{
          display: "inline-flex",
          padding: "10px 24px",
          borderRadius: "var(--ds-radius-control)",
          background: "var(--ds-primary)",
          color: "var(--ds-on-primary)",
          textDecoration: "none",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        Giriş Sayfasına Dön
      </Link>
    </div>
  );
}
