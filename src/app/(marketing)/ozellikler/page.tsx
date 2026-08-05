import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Özellikler — NOA İnşaat",
  description:
    "NOA İnşaat'ın 15 güçlü modülünü keşfedin: şantiye yönetimi, hakediş takibi, taşeron/tedarikçi, puantaj, kasa-banka ve daha fazlası.",
  alternates: { canonical: "/ozellikler" },
};

type Module = {
  slug: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  capabilities: string[];
};

const CATEGORIES = [
  { id: "proje-yonetimi", label: "Proje Yönetimi" },
  { id: "muhasebe-finans", label: "Muhasebe ve Finans" },
  { id: "ik-saha", label: "İK ve Saha" },
  { id: "raporlama-entegrasyon", label: "Raporlama ve Entegrasyon" },
];

const MODULES: Module[] = [
  {
    slug: "santiyeler",
    name: "Şantiyeler",
    icon: "🏗️",
    category: "proje-yonetimi",
    description:
      "Şantiye kayıtlarını tenant, firma ve dönem kapsamında merkezi panelden yönetin; ilişkili finans ve operasyon özetlerini izleyin.",
    capabilities: [
      "Şantiye bazlı bütçe ve gerçekleşen maliyet takibi",
      "Proje durum ve tarih bilgileri",
      "Fotoğraf ve döküman arşivi",
      "Saha ekibi ve operasyon kayıtları",
    ],
  },
  {
    slug: "musteriler",
    name: "Müşteriler",
    icon: "👔",
    category: "proje-yonetimi",
    description:
      "Müşteri portföyünü merkezi olarak yönetin; müşteri bazlı sözleşme, hakediş ve ödeme kayıtlarını aynı firma/dönem kapsamında izleyin.",
    capabilities: [
      "Müşteri profili ve iletişim bilgileri",
      "Sözleşme yönetimi ve arşivleme",
      "Müşteri bazlı hakediş takibi",
      "Ödeme durumu ve vade takibi",
    ],
  },
  {
    slug: "ihale-yonetimi",
    name: "İhale Yönetimi",
    icon: "📄",
    category: "proje-yonetimi",
    description:
      "İhale süreçlerini uçtan uca dijital ortamda yönetin. Teklif hazırlama, değerlendirme ve sözleşme aşamalarını sistematik şekilde takip edin. İhale arşivine her zaman erişin.",
    capabilities: [
      "İhale dosyası ve döküman yönetimi",
      "Teklif karşılaştırma matrisi",
      "Sözleşme ve belge kayıtları",
      "İhale takvimi ve hatırlatmalar",
    ],
  },
  {
    slug: "taseronlar",
    name: "Taşeronlar",
    icon: "🤝",
    category: "proje-yonetimi",
    description:
      "Tüm taşeronlarınızı tek bir sistemde takip edin. Cari hesaplar, sözleşmeler ve performans değerlendirmeleri ile taşeron ilişkilerinizi profesyonel biçimde yönetin.",
    capabilities: [
      "Taşeron cari hesap yönetimi",
      "Hakediş ve ödeme takibi",
      "Sözleşme ve belge arşivi",
      "Performans değerlendirme raporları",
    ],
  },
  {
    slug: "tedarikciler",
    name: "Tedarikçiler",
    icon: "🏭",
    category: "proje-yonetimi",
    description:
      "Tedarik zincirinizi güçlendirin. Malzeme siparişlerini, teslimatları ve ödemeleri tek sistemden yönetin. Tedarikçi karşılaştırma raporları ile en uygun fiyatı bulun.",
    capabilities: [
      "Tedarikçi kartı ve kategori bilgileri",
      "Tedarikçi hareket takibi",
      "Tedarikçi cari hesap yönetimi",
      "Fiyat karşılaştırma analizi",
    ],
  },
  {
    slug: "hakedisler",
    name: "Hakedişler",
    icon: "📋",
    category: "muhasebe-finans",
    description:
      "Taşeron ve alt yüklenici hakedişlerini kayıtlı metraj, kesinti ve onay adımlarıyla yönetin; hesap sonuçlarını kullanıcı kontrolünde izleyin.",
    capabilities: [
      "Otomatik hakediş hesaplama ve oluşturma",
      "Durum ve onay takibi",
      "SGK ve vergi kesinti yönetimi",
      "Hakediş arşivi ve geçmiş sorgulama",
    ],
  },
  {
    slug: "giderler",
    name: "Giderler",
    icon: "💸",
    category: "muhasebe-finans",
    description:
      "Şantiye ve ofis giderlerini kategorilere göre takip edin; belge eklerini ve dönemsel raporlarını yönetin.",
    capabilities: [
      "Gider kategorilendirme ve etiketleme",
      "Fatura ve fiş yükleme",
      "Bütçe ve gerçekleşen karşılaştırması",
      "Gider raporu ve Excel dışa aktarma",
    ],
  },
  {
    slug: "faturalar",
    name: "Faturalar",
    icon: "🧾",
    category: "muhasebe-finans",
    description:
      "Satış ve alış faturalarını tek sistemde yönetin ve vade durumlarını izleyin. e-Fatura domain altyapısı vardır; gerçek GİB transport sağlayıcısı etkin değildir.",
    capabilities: [
      "Satış ve alış fatura yönetimi",
      "e-Fatura yönetim çekirdeği (provider bekliyor)",
      "Otomatik KDV hesaplama",
      "Vadesi geçen fatura uyarıları",
    ],
  },
  {
    slug: "kasa-banka",
    name: "Kasa & Banka",
    icon: "💳",
    category: "muhasebe-finans",
    description:
      "Kasa ve banka hareketlerini tek panelden takip edin. Banka eşleştirme akışı sandbox veya manuel veriyle kullanılabilir; canlı Open Banking provider'ı yoktur.",
    capabilities: [
      "Çoklu hesap yönetimi",
      "Sandbox/manüel banka eşleştirme",
      "Kesinleşmiş nakit akış raporu",
      "Kasa/banka hareket yönetimi",
    ],
  },
  {
    slug: "puantaj",
    name: "Puantaj",
    icon: "⏱️",
    category: "ik-saha",
    description:
      "Saha personelinin devam, mesai ve bordro hesaplarını responsive web ekranlarında yönetin. Ayrı native mobil uygulama ve offline senkronizasyon yoktur.",
    capabilities: [
      "Responsive puantaj girişi",
      "Mesai ve fazla çalışma takibi",
      "Otomatik bordro hesaplama",
      "Personel devamsızlık raporları",
    ],
  },
  {
    slug: "araclar",
    name: "Araçlar",
    icon: "🚛",
    category: "ik-saha",
    description:
      "Şantiye araç filosunu ve ekipmanlarını yönetin. Bakım programları, yakıt tüketimi ve araç tahsis kayıtlarını sistematik biçimde takip edin.",
    capabilities: [
      "Araç ve ekipman envanteri",
      "Periyodik bakım programlama",
      "Yakıt tüketimi takibi",
      "Araç tahsis ve şoför yönetimi",
    ],
  },
  {
    slug: "stok-depo",
    name: "Stok & Depo",
    icon: "📦",
    category: "ik-saha",
    description:
      "İnşaat malzemeleri ve ekipman stoklarını şantiye bazında yönetin; minimum stok eşiklerini ve hareketleri izleyin.",
    capabilities: [
      "Şantiye bazlı stok takibi",
      "Minimum stok uyarı sistemi",
      "Stok giriş/çıkış hareketleri",
      "Depo sayım ve envanter raporları",
    ],
  },
  {
    slug: "raporlar",
    name: "Raporlar",
    icon: "📊",
    category: "raporlama-entegrasyon",
    description:
      "Proje bazlı finans, nakit akış ve maliyet özetlerini kayıtlı kesinleşmiş verilerden oluşturun.",
    capabilities: [
      "Proje bazlı kâr-zarar analizi",
      "Nakit akış ve bütçe raporları",
      "Dönem filtreli dashboard",
      "Excel ve PDF dışa aktarma",
    ],
  },
  {
    slug: "dokuman-merkezi",
    name: "Döküman Merkezi",
    icon: "📁",
    category: "raporlama-entegrasyon",
    description:
      "Proje belgelerini yetki kontrollü Doküman Merkezi'nde yönetin. Mevcut dosya saklama geliştirme ortamında yereldir; production object storage seçilmemiştir.",
    capabilities: [
      "Yerel geliştirme depolaması (production adapter bekliyor)",
      "Sürüm geçmişi ve değişiklik takibi",
      "Yetki bazlı erişim kontrolü",
      "Hızlı arama ve etiketleme",
    ],
  },
  {
    slug: "api-yonetimi",
    name: "API Yönetimi",
    icon: "🔗",
    category: "raporlama-entegrasyon",
    description:
      "API anahtarı, read API ve imzalı webhook çekirdeğini yönetin. Canlı ERP adapter'ı ve outbound worker etkin değildir.",
    capabilities: [
      "REST API ve webhook desteği",
      "API anahtarı ve yetki yönetimi",
      "ERP adapter'ları henüz etkin değil",
      "API kullanım raporları ve limitler",
    ],
  },
];

export default function OzelliklerPage() {
  const modulesByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    modules: MODULES.filter((m) => m.category === cat.id),
  }));

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
      {/* Başlık */}
      <section
        aria-labelledby="features-heading"
        style={{ padding: "64px 16px 48px", textAlign: "center", borderBottom: "1px solid var(--ds-outline-variant)" }}
      >
        <h1
          id="features-heading"
          style={{ fontSize: "40px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "16px" }}
        >
          Tüm Özellikler
        </h1>
        <p style={{ fontSize: "16px", color: "var(--ds-on-surface-variant)", maxWidth: "560px", margin: "0 auto" }}>
          15 ürün yüzeyi aynı tenant, firma ve dönem kapsamını kullanır. Dış
          provider gerektiren kabiliyetler ayrıca “bekliyor” veya “sandbox”
          olarak belirtilir.
        </p>
      </section>

      {/* İçerik */}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* Desktop sticky TOC — ≥1024px */}
        <nav
          aria-label="Kategoriler"
          style={{
            display: "none",
            width: "220px",
            flexShrink: 0,
            position: "sticky",
            top: "80px",
            padding: "32px 16px",
          }}
          className="features-toc"
        >
          <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--ds-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            Kategoriler
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
            {CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <a
                  href={`#${cat.id}`}
                  style={{
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--ds-on-surface-variant)",
                    textDecoration: "none",
                    transition: "color 160ms ease, background 160ms ease",
                  }}
                >
                  {cat.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Modül bölümleri */}
        <div style={{ flex: 1, padding: "32px 16px" }}>
          {modulesByCategory.map((cat) => (
            <section
              key={cat.id}
              id={cat.id}
              aria-labelledby={`cat-${cat.id}`}
              style={{ marginBottom: "64px" }}
            >
              <h2
                id={`cat-${cat.id}`}
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--ds-primary)",
                  marginBottom: "32px",
                  paddingBottom: "12px",
                  borderBottom: "2px solid var(--ds-outline-variant)",
                }}
              >
                {cat.label}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
                {cat.modules.map((mod, idx) => (
                  <article
                    key={mod.slug}
                    style={{
                      display: "flex",
                      flexDirection: idx % 2 === 0 ? "row" : "row-reverse",
                      gap: "40px",
                      alignItems: "flex-start",
                    }}
                    className="module-row"
                  >
                    {/* Metin */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "32px" }} aria-hidden="true">{mod.icon}</span>
                        <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ds-on-surface)" }}>
                          {mod.name}
                        </h3>
                      </div>
                      <p style={{ fontSize: "15px", color: "var(--ds-on-surface-variant)", lineHeight: 1.7, marginBottom: "16px" }}>
                        {mod.description}
                      </p>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                        {mod.capabilities.map((cap) => (
                          <li
                            key={cap}
                            style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "14px", color: "var(--ds-on-surface-variant)" }}
                          >
                            <span style={{ color: "var(--ds-success)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Screenshot placeholder */}
                    <div
                      aria-hidden="true"
                      style={{
                        width: "320px",
                        height: "200px",
                        flexShrink: 0,
                        borderRadius: "var(--ds-radius-panel)",
                        background: "var(--ds-surface-container)",
                        border: "1px solid var(--ds-outline-variant)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "48px",
                      }}
                      className="module-screenshot"
                    >
                      {mod.icon}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Alt CTA */}
      <section
        aria-labelledby="features-cta"
        style={{
          padding: "64px 16px",
          textAlign: "center",
          background: "var(--ds-surface-low)",
          borderTop: "1px solid var(--ds-outline-variant)",
        }}
      >
        <h2
          id="features-cta"
          style={{ fontSize: "32px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "16px" }}
        >
          Kabiliyet Sınırlarını İnceleyin
        </h2>
        <p style={{ color: "var(--ds-on-surface-variant)", marginBottom: "32px" }}>
          Self-servis deneme kapalıdır; aktif, sandbox ve provider bekleyen
          özellikleri bu sayfadan karşılaştırın.
        </p>
        <Link
          href="/fiyatlandirma"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "14px 36px",
            borderRadius: "var(--ds-radius-control)",
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: 700,
          }}
        >
          Plan Kataloğunu Gör
        </Link>
      </section>

      {/* Features TOC + module layout CSS — globals.css'e taşındı */}
    </div>
  );
}
