import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/marketing/faq-items";
import type { FAQCategory } from "@/lib/marketing/faq-items";
import FAQSearchClient from "./faq-search-client";

export const metadata: Metadata = {
  title: "Sık Sorulan Sorular — NOA İnşaat",
  description:
    "NOA İnşaat platformu hakkında en çok merak edilen sorular ve cevapları. Ürün, fiyatlandırma, teknik ve güvenlik konularında yardım alın.",
  alternates: { canonical: "/sss" },
};

const CATEGORY_LABELS: Record<FAQCategory, string> = {
  genel: "Genel",
  fiyatlandirma: "Fiyatlandırma",
  teknik: "Teknik",
  "guvenlik-gizlilik": "Güvenlik ve Gizlilik",
  destek: "Destek",
};

const CATEGORIES: FAQCategory[] = ["genel", "fiyatlandirma", "teknik", "guvenlik-gizlilik", "destek"];

export default function SssPage() {
  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "64px 16px" }}>
      {/* Başlık + Arama */}
      <header style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 700,
            color: "var(--ds-on-surface)",
            marginBottom: "16px",
          }}
        >
          Sık Sorulan Sorular
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "var(--ds-on-surface-variant)",
            maxWidth: "520px",
            margin: "0 auto 32px",
          }}
        >
          NOA İnşaat platformu hakkında en çok merak edilen konuları derledik.
        </p>
      </header>

      {/* Client: Arama + Kategori filtresi + Sonuçlar */}
      <FAQSearchClient items={FAQ_ITEMS} categoryLabels={CATEGORY_LABELS} categories={CATEGORIES} />

      {/* Alt bölüm — Cevap bulamayanlar için */}
      <section
        aria-labelledby="not-found-heading"
        style={{
          marginTop: "64px",
          padding: "40px",
          textAlign: "center",
          background: "var(--ds-surface-raised)",
          borderRadius: "var(--ds-radius-panel)",
          border: "1px solid var(--ds-outline-variant)",
        }}
      >
        <h2
          id="not-found-heading"
          style={{ fontSize: "22px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "12px" }}
        >
          Sorunuzu bulamadınız mı?
        </h2>
        <p
          style={{
            color: "var(--ds-on-surface-variant)",
            marginBottom: "24px",
            maxWidth: "440px",
            margin: "0 auto 24px",
          }}
        >
          Destek ekibimiz iş günlerinde 09:00–18:00 saatleri arasında size yardımcı olmak için hazır.
        </p>
        <Link
          href="/iletisim"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "10px 28px",
            borderRadius: "var(--ds-radius-control)",
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          İletişime Geçin
        </Link>
      </section>
    </div>
  );
}
