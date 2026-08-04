import type { Metadata } from "next";
import Link from "next/link";
import HeroSection from "@/components/marketing/hero-section";
import FeatureCard from "@/components/marketing/feature-card";
import PricingCard from "@/components/marketing/pricing-card";
import { formatPublicModuleLabel } from "@/lib/marketing/public-capabilities";
import { MARKETING_PLANS } from "@/lib/marketing/subscription-plans";

export const metadata: Metadata = {
  title: "NOA İnşaat — İnşaat Yönetiminde Yeni Nesil Standart",
  description:
    "Şantiye takibi, hakediş yönetimi ve taşeron cari hesapları için NOA İnşaat SaaS platformunu inceleyin.",
  openGraph: {
    title: "NOA İnşaat — İnşaat Yönetiminde Yeni Nesil Standart",
    description:
      "Şantiye takibi, hakediş yönetimi ve taşeron cari hesapları için NOA İnşaat SaaS platformunu inceleyin.",
    type: "website",
    url: "/landing",
    images: [{ url: "/og-landing.png", width: 1200, height: 630, alt: "NOA İnşaat" }],
  },
  alternates: { canonical: "/landing" },
};

const FEATURES = [
  {
    title: "Şantiye Yönetimi",
    description:
      "Tüm şantiyelerinizi tek panelden takip edin. Bütçe, taşeron ve hakediş verilerini anlık görüntüleyin.",
    icon: "🏗️",
  },
  {
    title: "Hakediş Takibi",
    description:
      "Taşeron hakedişlerini, kesintileri, onay ve tahsilat durumlarını kayıtlı iş akışında yönetin.",
    icon: "📋",
  },
  {
    title: "Taşeron & Tedarikçi",
    description:
      "Cari hesapları, ödeme planlarını ve sözleşme belgelerini merkezi olarak yönetin.",
    icon: "🤝",
  },
  {
    title: "Puantaj",
    description:
      "Saha personelinin devam, mesai ve bordro hesaplarını responsive web ekranlarından yönetin.",
    icon: "⏱️",
  },
  {
    title: "Kasa & Banka",
    description:
      "Kesinleşmiş nakit hareketlerini izleyin; banka eşleştirme akışını sandbox veya manuel veriyle değerlendirin.",
    icon: "💳",
  },
  {
    title: "Raporlama",
    description:
      "Proje bazlı kâr-zarar, nakit akış ve maliyet raporlarını tek tıkla oluşturun ve dışa aktarın.",
    icon: "📊",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Yetkili Hesapla Gir",
    description: "Yöneticiniz tarafından tanımlanmış tenant hesabıyla güvenli giriş yapın.",
  },
  {
    step: 2,
    title: "Şantiye ve Cari Ekle",
    description: "Şantiyelerinizi, taşeronlarınızı ve tedarikçilerinizi sisteme tanımlayın.",
  },
  {
    step: 3,
    title: "Hakediş Oluştur ve Takip Et",
    description: "Hakedişleri otomatik hesaplayın, onaylayın ve ödemeleri takip edin.",
  },
];

const teaser = MARKETING_PLANS.filter((p) =>
  ["baslangic", "profesyonel", "kurumsal"].includes(p.id),
);

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <HeroSection
        headline="İnşaat Yönetiminde Yeni Nesil Standart"
        subheadline="KOBİ inşaat firmaları için tasarlanmış, şantiyeden ofise tüm verileri tek noktada toplayan, güvenilir ve verimli yönetim platformu."
        ctaPrimaryHref="/ozellikler"
        ctaPrimaryLabel="Ürün Durumunu İncele"
        ctaSecondaryHref="/ozellikler"
        ctaSecondaryLabel="Özellikleri Keşfet"
      />

      {/* ── Product status ───────────────────────────────────────────────── */}
      <section
        aria-label="Ürün yayın durumu"
        style={{
          background: "var(--ds-surface-low)",
          borderBottom: "1px solid var(--ds-outline-variant)",
          padding: "48px 16px",
        }}
      >
        <div
          style={{ maxWidth: "880px", margin: "0 auto", textAlign: "center" }}
        >
          <h2 style={{ color: "var(--ds-on-surface)", fontSize: "24px", fontWeight: 700 }}>
            Doğrulanmış ürün kabiliyetleri
          </h2>
          <p style={{ color: "var(--ds-on-surface-variant)", lineHeight: 1.7, marginTop: "12px" }}>
            Bu sayfada yalnız çalışan tenant iş akışları gösterilir. Müşteri,
            işlem hacmi veya memnuniyet istatistiği; doğrulanabilir yayın kaynağı
            olmadan paylaşılmaz.
          </p>
        </div>
      </section>

      {/* ── Feature Highlights ───────────────────────────────────────────── */}
      <section
        aria-labelledby="features-heading"
        style={{ padding: "80px 16px" }}
      >
        <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
          <h2
            id="features-heading"
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--ds-on-surface)",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            Her şey tek platformda
          </h2>
          <p
            style={{
              fontSize: "16px",
              color: "var(--ds-on-surface-variant)",
              textAlign: "center",
              maxWidth: "560px",
              margin: "0 auto 48px",
            }}
          >
            Şantiyeden ofise tüm iş süreçlerinizi dijitalleştiren modüller, birbirleriyle tam entegre çalışır.
          </p>

          {/* Self-service kayıt kapalı; ürün durumu CTA'sı */}
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <Link
              href="/ozellikler"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "10px 28px",
                borderRadius: "var(--ds-radius-control)",
                background: "var(--ds-secondary-container)",
                color: "var(--ds-on-surface)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 600,
                border: "1px solid var(--ds-outline-variant)",
              }}
            >
              Kabiliyet Durumlarını Gör →
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {FEATURES.map((feat, i) => (
              <FeatureCard
                key={feat.title}
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
                delay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Entegrasyon & Güven ────────────────────────────────────────────── */}
      <section
        aria-label="Entegrasyonlar ve güvenlik"
        style={{
          background: "var(--ds-surface-low)",
          borderTop: "1px solid var(--ds-outline-variant)",
          borderBottom: "1px solid var(--ds-outline-variant)",
          padding: "64px 16px",
        }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--ds-on-surface)",
              marginBottom: "12px",
            }}
          >
            Güvenlik ve Entegrasyon Durumu
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--ds-on-surface-variant)",
              maxWidth: "480px",
              margin: "0 auto 40px",
            }}
          >
            Tenant kapsamı, DB-backed oturum ve audit çekirdeği aktiftir. Dış
            provider, hosting, yedekleme ve sertifika iddiaları yayın onayı
            olmadan sunulmaz.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "16px",
            }}
          >
            {[
              { icon: "🔒", label: "DB Oturumu" },
              { icon: "🏢", label: "Tenant Kapsamı" },
              { icon: "📱", label: "Responsive Web" },
              { icon: "🧾", label: "Audit Kayıtları" },
              { icon: "📊", label: "Raporlama" },
              { icon: "🔌", label: "API Çekirdeği" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "20px 12px",
                  background: "var(--ds-surface-raised)",
                  borderRadius: "var(--ds-radius-panel)",
                  border: "1px solid var(--ds-outline-variant)",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>
                  {item.icon}
                </span>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--ds-on-surface)",
                    margin: 0,
                  }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="how-heading"
        style={{
          background: "var(--ds-surface-low)",
          borderTop: "1px solid var(--ds-outline-variant)",
          borderBottom: "1px solid var(--ds-outline-variant)",
          padding: "80px 16px",
        }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <h2
            id="how-heading"
            style={{ fontSize: "32px", fontWeight: 700, color: "var(--ds-on-surface)", textAlign: "center", marginBottom: "48px" }}
          >
            3 adımda başlayın
          </h2>
          <ol
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "32px",
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {HOW_IT_WORKS.map((step) => (
              <li
                key={step.step}
                style={{
                  textAlign: "center",
                  padding: "32px 24px",
                  background: "var(--ds-surface-raised)",
                  borderRadius: "var(--ds-radius-panel)",
                  border: "1px solid var(--ds-outline-variant)",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--ds-primary)",
                    color: "var(--ds-on-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: "0 auto 16px",
                  }}
                >
                  {step.step}
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ds-on-surface)", marginBottom: "8px" }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--ds-on-surface-variant)", lineHeight: 1.6 }}>
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pricing Teaser ───────────────────────────────────────────────── */}
      <section aria-labelledby="pricing-heading" style={{ padding: "80px 16px" }}>
        <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
          <h2
            id="pricing-heading"
            style={{ fontSize: "32px", fontWeight: 700, color: "var(--ds-on-surface)", textAlign: "center", marginBottom: "16px" }}
          >
            Şeffaf fiyatlandırma
          </h2>
          <p style={{ textAlign: "center", color: "var(--ds-on-surface-variant)", marginBottom: "48px" }}>
            Plan kataloğunu inceleyin. Self-servis satın alma ve kayıt henüz açık değildir.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            {teaser.map((plan) => (
              <PricingCard
                key={plan.id}
                billingCycle="monthly"
                ctaHref={`/kayit?plan=${plan.id}`}
                ctaLabel="Kayıt Durumunu Gör"
                description={plan.description}
                features={plan.includedModules.slice(0, 5).map(formatPublicModuleLabel)}
                isPopular={plan.id === "profesyonel"}
                monthlyPrice={plan.monthlyPrice}
                name={plan.name}
                planId={plan.id}
                apiRequestsPerDay={plan.apiRequestsPerDay}
              />
            ))}
          </div>

          <div style={{ textAlign: "center" }}>
            <Link
              href="/fiyatlandirma"
              style={{
                color: "var(--ds-primary)",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "15px",
              }}
            >
              Tüm Planları Gör →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA Banner ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-heading"
        style={{
          background: "var(--ds-primary)",
          padding: "80px 16px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2
            id="cta-heading"
            style={{ fontSize: "36px", fontWeight: 700, color: "var(--ds-on-primary)", marginBottom: "16px" }}
          >
            Ürünün mevcut kapsamını inceleyin
          </h2>
          <p style={{ fontSize: "16px", color: "var(--ds-on-primary)", opacity: 0.85, marginBottom: "32px" }}>
            Self-servis kayıt kapalıdır; ürün kabiliyetleri ve provider sınırları açıkça listelenir.
          </p>
          <Link
            href="/ozellikler"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "14px 36px",
              borderRadius: "var(--ds-radius-control)",
              background: "var(--ds-on-primary)",
              color: "var(--ds-primary)",
              textDecoration: "none",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            Özellik Durumlarını Gör
          </Link>
        </div>
      </section>
    </>
  );
}
