import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hakkımızda — NOA İnşaat",
  description:
    "NOA İnşaat'ın misyonu, değerleri ve inşaat sektörü dijitalleşme vizyonu hakkında bilgi edinin.",
  alternates: { canonical: "/hakkimizda" },
};

const VALUES = [
  {
    icon: "🛡️",
    title: "Güvenilirlik",
    description:
      "Yalnız doğrulanmış güvenlik kontrollerini açıklarız; hosting, şifreleme ve yedekleme kanıtı olmadan sertifika veya kesintisizlik iddiası yayınlamayız.",
  },
  {
    icon: "🔍",
    title: "Şeffaflık",
    description:
      "Fiyatlandırmadan hizmet koşullarına kadar her şeyi açık ve anlaşılır biçimde sunuyoruz.",
  },
  {
    icon: "🏗️",
    title: "Sektör Odaklılık",
    description:
      "İnşaat operasyonlarının şantiye, finans, personel ve tedarik süreçlerine odaklanan domain iş akışları geliştiriyoruz.",
  },
  {
    icon: "🚀",
    title: "Sürekli Gelişim",
    description:
      "Ürün kabiliyetlerini test, migration ve kabul kanıtlarıyla küçük dilimler halinde geliştiriyoruz.",
  },
];

const TIMELINE = [
  {
    year: "Ürün",
    title: "Domain Çekirdeği",
    description:
      "Tenant, firma ve dönem kapsamlı şantiye, finans ve operasyon modülleri geliştirildi.",
  },
  {
    year: "Güvenlik",
    title: "Kimlik ve Yetki Sınırı",
    description:
      "Tenant ve Süper Admin kimlik doğrulama hatları ayrıldı; opak DB oturumları ve scoped yetki kontrolleri uygulandı.",
  },
  {
    year: "Operasyon",
    title: "Modül Genişlemesi",
    description:
      "Puantaj, kasa-banka, stok, belge ve e-Fatura domain yüzeyleri eklendi; dış provider gerektiren akışlar kapalı veya sandbox tutuldu.",
  },
  {
    year: "Hazırlık",
    title: "Canlıya Hazırlık",
    description:
      "API, audit, platform yönetimi ve production readiness sınırları doğrulanıyor; müşteri veya canlı entegrasyon sayısı iddia edilmiyor.",
  },
];

const TECH_STACK = [
  { name: "Next.js", reason: "Hızlı, SEO dostu ve ölçeklenebilir frontend için." },
  { name: "React", reason: "Komponent bazlı mimari ile sürdürülebilir UI geliştirme." },
  { name: "PostgreSQL", reason: "Güvenilir, ACID uyumlu ilişkisel veritabanı yönetimi." },
  { name: "Tailwind CSS", reason: "Tutarlı, erişilebilir ve bakımı kolay design system." },
];

export default function HakkimizdaPage() {
  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto" }}>

      {/* ── Misyon ─────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="mission-heading"
        style={{
          padding: "80px 16px",
          textAlign: "center",
          borderBottom: "1px solid var(--ds-outline-variant)",
        }}
      >
        <div
          aria-hidden="true"
          style={{ fontSize: "64px", marginBottom: "24px" }}
        >
          🏗️
        </div>
        <h1
          id="mission-heading"
          style={{
            fontSize: "40px",
            fontWeight: 700,
            color: "var(--ds-on-surface)",
            maxWidth: "720px",
            margin: "0 auto 24px",
            lineHeight: 1.2,
          }}
        >
          İnşaat sektörünü dijitalleştiriyoruz
        </h1>
        <div
          style={{
            maxWidth: "640px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <p style={{ fontSize: "17px", color: "var(--ds-on-surface-variant)", lineHeight: 1.7 }}>
            NOA İnşaat, Türkiye&apos;deki küçük ve orta ölçekli inşaat firmalarının karşılaştığı operasyonel
            zorluklara kalıcı çözümler üretmek amacıyla kuruldu. Şantiye takibi, hakediş yönetimi ve
            finansal raporlamayı tek bir platform altında birleştiriyoruz.
          </p>
          <p style={{ fontSize: "17px", color: "var(--ds-on-surface-variant)", lineHeight: 1.7 }}>
            Misyonumuz, inşaat firmasındaki her çalışanın — sahadan ofise — teknolojiyi kolayca
            kullanabilmesini sağlamak ve sektörün verimliliğini kalıcı olarak artırmaktır.
          </p>
          <p style={{ fontSize: "17px", color: "var(--ds-on-surface-variant)", lineHeight: 1.7 }}>
            Vizyonumuz, NOA İnşaat&apos;ı Türkiye&apos;nin en güvenilir inşaat yönetim SaaS platformu
            haline getirmek ve önümüzdeki yıllarda MENA bölgesine açılmaktır.
          </p>
        </div>
      </section>

      {/* ── Değerler ───────────────────────────────────────────────────── */}
      <section
        aria-labelledby="values-heading"
        style={{
          padding: "80px 16px",
          background: "var(--ds-surface-low)",
          borderBottom: "1px solid var(--ds-outline-variant)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            id="values-heading"
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--ds-on-surface)",
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            Değerlerimiz
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "24px",
            }}
          >
            {VALUES.map((val) => (
              <article
                key={val.title}
                style={{
                  padding: "32px",
                  background: "var(--ds-surface-raised)",
                  borderRadius: "var(--ds-radius-panel)",
                  border: "1px solid var(--ds-outline-variant)",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "16px" }} aria-hidden="true">
                  {val.icon}
                </div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "var(--ds-on-surface)",
                    marginBottom: "8px",
                  }}
                >
                  {val.title}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--ds-on-surface-variant)", lineHeight: 1.6 }}>
                  {val.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Zaman Çizelgesi ────────────────────────────────────────────── */}
      <section
        aria-labelledby="timeline-heading"
        style={{ padding: "80px 16px", borderBottom: "1px solid var(--ds-outline-variant)" }}
      >
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h2
            id="timeline-heading"
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--ds-on-surface)",
              textAlign: "center",
              marginBottom: "48px",
            }}
          >
            Yolculuğumuz
          </h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, position: "relative" }}>
            {/* Dikey çizgi */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "23px",
                top: 0,
                bottom: 0,
                width: "2px",
                background: "var(--ds-outline-variant)",
              }}
            />
            {TIMELINE.map((item) => (
              <li key={item.year} style={{ display: "flex", gap: "24px", marginBottom: "40px", position: "relative" }}>
                {/* Yıl balonu */}
                <div
                  style={{
                    flexShrink: 0,
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "var(--ds-primary)",
                    color: "var(--ds-on-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    zIndex: 1,
                  }}
                >
                  {item.year}
                </div>
                {/* İçerik */}
                <div style={{ paddingTop: "8px" }}>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "var(--ds-on-surface)",
                      marginBottom: "6px",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--ds-on-surface-variant)", lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Teknoloji ──────────────────────────────────────────────────── */}
      <section
        aria-labelledby="tech-heading"
        style={{
          padding: "80px 16px",
          background: "var(--ds-surface-low)",
          borderBottom: "1px solid var(--ds-outline-variant)",
        }}
      >
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <h2
            id="tech-heading"
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "var(--ds-on-surface)",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            Teknoloji altyapımız
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--ds-on-surface-variant)",
              marginBottom: "40px",
              fontSize: "15px",
            }}
          >
            Modern, güvenilir ve ölçeklenebilir teknolojiler üzerine inşa edilmiş bir platform.
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            {TECH_STACK.map((tech) => (
              <li
                key={tech.name}
                style={{
                  padding: "20px",
                  background: "var(--ds-surface-raised)",
                  borderRadius: "var(--ds-radius-panel)",
                  border: "1px solid var(--ds-outline-variant)",
                }}
              >
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--ds-primary)",
                    marginBottom: "6px",
                  }}
                >
                  {tech.name}
                </div>
                <p style={{ fontSize: "13px", color: "var(--ds-on-surface-variant)", lineHeight: 1.5, margin: 0 }}>
                  {tech.reason}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── İletişim CTA ───────────────────────────────────────────────── */}
      <section
        aria-labelledby="contact-cta-heading"
        style={{ padding: "80px 16px", textAlign: "center" }}
      >
        <h2
          id="contact-cta-heading"
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--ds-on-surface)",
            marginBottom: "16px",
          }}
        >
          Kurumsal iletişim durumu
        </h2>
        <p
          style={{
            color: "var(--ds-on-surface-variant)",
            marginBottom: "32px",
            maxWidth: "480px",
            margin: "0 auto 32px",
          }}
        >
          Resmi iletişim ve demo teslimat kanalı henüz etkin değildir. Güncel
          kullanılabilirlik durumunu iletişim sayfasından inceleyin.
        </p>
        <Link
          href="/iletisim"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 32px",
            borderRadius: "var(--ds-radius-control)",
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: 700,
          }}
        >
          İletişim Durumunu Gör
        </Link>
      </section>
    </div>
  );
}
