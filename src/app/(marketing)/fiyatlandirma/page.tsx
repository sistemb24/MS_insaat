import type { Metadata } from "next";
import Link from "next/link";
import PricingClient from "./pricing-client";
import {
  ComparisonTable,
  DEFAULT_COMPARISON_FEATURES,
} from "@/components/marketing/comparison-table";

export const metadata: Metadata = {
  title: "Fiyatlandırma — NOA İnşaat",
  description:
    "NOA İnşaat Başlangıç, Standart, Profesyonel ve Kurumsal plan kataloğu.",
  openGraph: {
    title: "Fiyatlandırma — NOA İnşaat",
    description: "NOA İnşaat Başlangıç, Standart, Profesyonel ve Kurumsal plan kataloğu.",
    type: "website",
  },
  alternates: { canonical: "/fiyatlandirma" },
};

const PRICING_FAQ = [
  {
    q: "Aboneliğimi istediğim zaman iptal edebilir miyim?",
    a: "Gerçek ödeme ve self-servis abonelik sağlayıcısı etkin değildir; iptal politikası henüz yayınlanmamıştır.",
  },
  {
    q: "İade politikanız nedir?",
    a: "Gerçek ödeme alınmadığı ve resmi iade politikası onaylanmadığı için bu sayfa iade taahhüdü vermez.",
  },
  {
    q: "Self-servis deneme açık mı?",
    a: "Hayır. Kayıt, deneme ve ödeme teslimatı kontrollü olarak kapalıdır.",
  },
  {
    q: "Fiyatlara KDV dahil mi?",
    a: "Gösterilen tutarlar ürün kataloğu karşılaştırmasıdır; satış teklifi, vergi hesabı veya fatura değildir.",
  },
];

export default function FiyatlandirmaPage() {
  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
      {/* Başlık */}
      <section
        aria-labelledby="pricing-heading"
        style={{ padding: "64px 16px 40px", textAlign: "center" }}
      >
        <h1
          id="pricing-heading"
          style={{ fontSize: "40px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "16px" }}
        >
          Plan Kataloğunu İnceleyin
        </h1>
        <p style={{ fontSize: "16px", color: "var(--ds-on-surface-variant)", maxWidth: "560px", margin: "0 auto" }}>
          Bu sayfa mevcut plan modelini karşılaştırır. Self-servis satın alma,
          kayıt ve gerçek tahsilat sağlayıcısı henüz etkin değildir.
        </p>
      </section>

      {/* Client: Toggle + Plan kartları */}
      <section style={{ padding: "0 16px 64px" }}>
        <PricingClient />
      </section>

      {/* Feature Comparison Matrix */}
      <section
        aria-labelledby="comparison-heading"
        style={{
          padding: "64px 16px",
          background: "var(--ds-surface-low)",
          borderTop: "1px solid var(--ds-outline-variant)",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h2
            id="comparison-heading"
            style={{ fontSize: "28px", fontWeight: 700, color: "var(--ds-on-surface)", textAlign: "center", marginBottom: "40px" }}
          >
            Modül Karşılaştırması
          </h2>
          <ComparisonTable features={DEFAULT_COMPARISON_FEATURES} />
        </div>
      </section>

      {/* Pricing FAQ */}
      <section
        aria-labelledby="pricing-faq-heading"
        style={{ padding: "64px 16px" }}
      >
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2
            id="pricing-faq-heading"
            style={{ fontSize: "28px", fontWeight: 700, color: "var(--ds-on-surface)", textAlign: "center", marginBottom: "40px" }}
          >
            Fiyatlandırma Hakkında Sık Sorulanlar
          </h2>
          <dl style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {PRICING_FAQ.map((item) => (
              <div
                key={item.q}
                style={{
                  padding: "24px",
                  background: "var(--ds-surface-raised)",
                  borderRadius: "var(--ds-radius-panel)",
                  border: "1px solid var(--ds-outline-variant)",
                }}
              >
                <dt style={{ fontWeight: 600, color: "var(--ds-on-surface)", marginBottom: "8px" }}>
                  {item.q}
                </dt>
                <dd style={{ color: "var(--ds-on-surface-variant)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>

          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <Link
              href="/sss"
              style={{ color: "var(--ds-primary)", textDecoration: "none", fontWeight: 600 }}
            >
              Tüm Sık Sorulan Soruları Gör →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
