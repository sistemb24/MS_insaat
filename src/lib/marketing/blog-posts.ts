/**
 * Statik blog gönderileri veri katmanı.
 *
 * Bu dosya `prisma`, `app-shell` veya `server-active-scope` import etmez.
 * Tüm veriler derleme zamanında sabit nesneler olarak tanımlanmıştır.
 */

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

export type BlogCategory =
  | "sektor-haberleri"
  | "urun-guncellemeleri"
  | "ipuclari"
  | "mevzuat";

export type BlogPost = {
  /** Yazarın tam adı */
  author: string;
  /** Yazar hakkında kısa tanıtım (opsiyonel) */
  authorBio?: string;
  /** Yazarın unvanı / rolü */
  authorRole: string;
  /** Makale gövdesi — MDX veya düz HTML dizisi (detay sayfasında kullanılır, opsiyonel) */
  body?: string;
  /** Yazının kategorisi */
  category: BlogCategory;
  /** Kapak görselinin erişilebilir açıklaması */
  coverImageAlt: string;
  /** Kapak görseli URL'i (opsiyonel — yoksa placeholder gösterilir) */
  coverImageUrl?: string;
  /** true ise "Öne Çıkan Yazı" bölümünde gösterilir */
  featured?: boolean;
  /** true ise kimliği doğrulanmamış ziyaretçilere 404 döndürülür */
  isDraft?: boolean;
  /** ISO 8601 formatında yayın tarihi */
  publishedAt: string;
  /** Tahmini okuma süresi (dakika) */
  readingTimeMinutes: number;
  /** URL-güvenli benzersiz tanımlayıcı */
  slug: string;
  /** Kısa özet — maksimum 160 karakter */
  summary: string;
  /** İsteğe bağlı etiket listesi */
  tags?: string[];
  /** Yazı başlığı */
  title: string;
};

// ---------------------------------------------------------------------------
// Sabit veri
// ---------------------------------------------------------------------------

export const BLOG_POSTS: BlogPost[] = [
  // 1 — Öne çıkan (featured: true) ----------------------------------------
  {
    slug: "noa-insaat-2-santiye-yonetiminde-yeni-donem",
    title: "NOA İnşaat Ürün Kabiliyet Durumu",
    summary:
      "Tenant kapsamlı şantiye, finans ve operasyon çekirdeği ile provider bekleyen kabiliyetlerin güncel ayrımını inceleyin.",
    category: "urun-guncellemeleri",
    author: "NOA Ürün Ekibi",
    authorRole: "Ürün Yönetimi",
    authorBio:
      "NOA ürün ekibi, inşaat sektörünün dijital dönüşümüne odaklanmaktadır.",
    publishedAt: "2024-11-20T09:00:00.000Z",
    readingTimeMinutes: 6,
    featured: true,
    coverImageAlt:
      "NOA İnşaat 2.0 kontrol panelinin modern arayüzü — karanlık tema",
    tags: ["ürün", "güncelleme", "hakediş", "şantiye"],
  },

  // 2 — Normal gönderi -----------------------------------------------------
  {
    slug: "santiyede-veri-guvenligi-bilmeniz-gerekenler",
    title: "Şantiyede Veri Güvenliği: Bilmeniz Gerekenler",
    summary:
      "Saha verilerini korumak için uygulamanız gereken temel güvenlik önlemleri ve KVKK uyum adımları.",
    category: "ipuclari",
    author: "Murat Demir",
    authorRole: "Bilgi Güvenliği Uzmanı",
    authorBio:
      "10 yıllık kurumsal güvenlik deneyimiyle inşaat sektörüne özel çözümler üretiyor.",
    publishedAt: "2024-11-12T08:00:00.000Z",
    readingTimeMinutes: 5,
    coverImageAlt: "Şantiye alanında bir tablet ekranında güvenlik gösterge paneli",
    tags: ["güvenlik", "KVKK", "veri", "saha"],
    isDraft: true,
  },

  // 3 — Normal gönderi -----------------------------------------------------
  {
    slug: "2025-insaat-maliyet-endeksi-beklentileri",
    title: "2025 İnşaat Maliyet Endeksi Beklentileri",
    summary:
      "İnşaat malzeme ve işçilik maliyetlerinin 2025 yılı projeksiyonları ile bütçe planlamanıza yön verecek sektör verileri.",
    category: "sektor-haberleri",
    author: "Ayşe Kaya",
    authorRole: "Sektör Analisti",
    authorBio:
      "İnşaat ekonomisi alanında uzmanlaşmış bağımsız analist ve yazar.",
    publishedAt: "2024-11-08T10:30:00.000Z",
    readingTimeMinutes: 8,
    coverImageAlt: "İnşaat maliyet grafikleri ve endeks tabloları içeren bir rapor sayfası",
    tags: ["maliyet", "endeks", "2025", "bütçe"],
    isDraft: true,
  },

  // 4 — Normal gönderi -----------------------------------------------------
  {
    slug: "taseronlarda-hakdis-hatalar",
    title: "Taşeron Hakedişlerinde Sık Yapılan Hatalar",
    summary:
      "Hakediş belgelerinde en çok karşılaşılan on hata ve bunlardan nasıl kaçınacağınıza dair pratik rehber.",
    category: "ipuclari",
    author: "Kemal Arslan",
    authorRole: "İnşaat Hukuku Danışmanı",
    authorBio:
      "İnşaat sözleşmeleri ve hakediş uyuşmazlıkları konusunda 15 yıllık deneyim.",
    publishedAt: "2024-11-01T07:45:00.000Z",
    readingTimeMinutes: 7,
    coverImageAlt:
      "Masada imzalanmayı bekleyen bir hakediş formu ve kalem",
    tags: ["hakediş", "taşeron", "hata", "sözleşme"],
    isDraft: true,
  },

  // 5 — Normal gönderi -----------------------------------------------------
  {
    slug: "yeni-imar-yonetmeligi-degisiklikleri-ozeti",
    title: "Yeni İmar Yönetmeliği Değişiklikleri Özeti",
    summary:
      "Ekim 2024 itibarıyla yürürlüğe giren imar yönetmeliği güncellemelerinin inşaat firmalarına etkileri.",
    category: "mevzuat",
    author: "Zeynep Çelik",
    authorRole: "Hukuk Editörü",
    authorBio:
      "İmar mevzuatı ve yapı denetimi konularında uzmanlaşmış hukuk editörü.",
    publishedAt: "2024-10-24T11:00:00.000Z",
    readingTimeMinutes: 10,
    coverImageAlt: "Büyük bir mimari plan çizimi önünde çalışan bir mühendis",
    tags: ["imar", "mevzuat", "yönetmelik", "yasal"],
    isDraft: true,
  },

  // 6 — Taslak (isDraft: true) — kimliği doğrulanmamışlara 404 döner ------
  {
    slug: "e-fatura-entegrasyonu-rehberi-2025",
    title: "E-Fatura Entegrasyonu Rehberi 2025 [TASLAK]",
    summary:
      "NOA platformu üzerinden e-fatura gönderimi ve GİB entegrasyonu için adım adım kurulum kılavuzu.",
    category: "urun-guncellemeleri",
    author: "NOA Teknik Ekibi",
    authorRole: "Platform Mühendisliği",
    publishedAt: "2025-01-15T08:00:00.000Z",
    readingTimeMinutes: 12,
    isDraft: true,
    coverImageAlt: "Bilgisayar ekranında GİB e-fatura portal arayüzü",
    tags: ["e-fatura", "GİB", "entegrasyon", "rehber"],
  },
];
