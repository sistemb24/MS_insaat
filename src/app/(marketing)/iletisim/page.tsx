import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "İletişim — NOA İnşaat",
  description:
    "NOA İnşaat iletişim kanalının güncel kullanılabilirlik durumunu inceleyin.",
  alternates: { canonical: "/iletisim" },
};

export default function IletisimPage() {
  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "64px 16px" }}>
      {/* Başlık */}
      <header style={{ marginBottom: "48px" }}>
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 700,
            color: "var(--ds-on-surface)",
            marginBottom: "12px",
          }}
        >
          İletişim
        </h1>
        <p style={{ fontSize: "16px", color: "var(--ds-on-surface-variant)", maxWidth: "520px" }}>
          Resmi iletişim ve teslimat kanalları doğrulanana kadar bu sayfa talep
          toplamaz veya geri dönüş süresi taahhüt etmez.
        </p>
      </header>

      {/* İçerik Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr min(340px, 100%)",
          gap: "48px",
          alignItems: "start",
        }}
        className="contact-grid"
      >
        {/* Sol: Form */}
        <section aria-labelledby="form-heading">
          <h2
            id="form-heading"
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "var(--ds-on-surface)",
              marginBottom: "24px",
            }}
          >
            İletişim Kanalı
          </h2>
          <ContactForm />
        </section>

        {/* Sağ: Bilgi sidebar */}
        <aside
          style={{
            padding: "32px",
            background: "var(--ds-surface-raised)",
            borderRadius: "var(--ds-radius-panel)",
            border: "1px solid var(--ds-outline-variant)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--ds-on-surface)",
              marginBottom: "24px",
            }}
          >
            İletişim Bilgileri
          </h2>

          <p
            style={{
              color: "var(--ds-on-surface-variant)",
              fontSize: "14px",
              lineHeight: 1.65,
            }}
          >
            Resmi şirket e-posta adresi, telefon numarası ve destek saatleri
            henüz yayın onayı almamıştır. Örnek iletişim bilgileri gösterilmez.
          </p>

          {/* SSS Linki */}
          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid var(--ds-outline-variant)",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--ds-on-surface-variant)",
                marginBottom: "12px",
              }}
            >
              Sık sorulan sorulara göz atmak ister misiniz?
            </p>
            <Link
              href="/sss"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--ds-primary)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Sık Sorulan Sorular →
            </Link>
          </div>
        </aside>
      </div>

      {/* Mobil responsive — globals.css'teki .contact-grid media query ile */}
    </div>
  );
}
