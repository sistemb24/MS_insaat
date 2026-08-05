/**
 * Statik FAQ (Sık Sorulan Sorular) veri katmanı
 *
 * Bu dosya prisma, app-shell veya server-active-scope import etmez.
 * Requirements: 8.1, 8.6
 */

export type FAQCategory =
  | "genel"
  | "fiyatlandirma"
  | "teknik"
  | "guvenlik-gizlilik"
  | "destek";

export type FAQItem = {
  answer: string;
  category: FAQCategory;
  id: string;
  question: string;
};

export const FAQ_ITEMS: FAQItem[] = [
  // ─── Genel ────────────────────────────────────────────────────────────────
  {
    id: "genel-1",
    category: "genel",
    question: "NOA İnşaat nedir ve kimler içindir?",
    answer:
      "NOA İnşaat, küçük ve orta ölçekli Türk inşaat firmalarına yönelik bulut tabanlı bir şantiye ve finans yönetim platformudur. Şantiye takibi, hakediş yönetimi, taşeron/tedarikçi cari hesapları, puantaj ve raporlama gibi temel ihtiyaçları tek bir arayüzde sunar.",
  },
  {
    id: "genel-2",
    category: "genel",
    question: "NOA İnşaat'ı kullanmaya başlamak için ne gerekir?",
    answer:
      "Self-servis kayıt ve ücretsiz deneme henüz açık değildir. Yalnız yönetici tarafından önceden tanımlanmış tenant hesabı bulunan kullanıcılar giriş yapabilir.",
  },
  {
    id: "genel-3",
    category: "genel",
    question: "Birden fazla şantiyeyi aynı anda takip edebilir miyim?",
    answer:
      "Evet. Yetkili olduğunuz tenant, firma ve dönem kapsamında birden fazla şantiye kaydı oluşturabilir; bunların operasyon özetlerini ana panodan izleyebilirsiniz. Sözleşmesel kapasite sınırları henüz yayınlanmamıştır.",
  },
  {
    id: "genel-4",
    category: "genel",
    question: "Sistemde kaç kullanıcı tanımlayabilirim?",
    answer:
      "Güncel katalog Başlangıç, Standart, Profesyonel ve Kurumsal planlar için sırasıyla 5, 10, 25 ve 75 kullanıcı limiti tanımlar. Satın alma ve otomatik plan değişikliği sağlayıcısı henüz etkin değildir.",
  },
  {
    id: "genel-5",
    category: "genel",
    question: "Deneme süresi sona erdiğinde verilerim ne olur?",
    answer:
      "Self-servis deneme akışı etkin değildir. Veri saklama, hesap kapatma ve ödeme sonrası erişim politikası resmi operasyon kararı verilmeden taahhüt edilmez.",
  },

  // ─── Fiyatlandırma ────────────────────────────────────────────────────────
  {
    id: "fiyatlandirma-1",
    category: "fiyatlandirma",
    question: "Fiyatlandırma modeliniz nasıl işliyor?",
    answer:
      "Sayfada mevcut ürün kataloğundaki aylık ve yıllık plan hesapları gösterilir. Gerçek tahsilat sağlayıcısı etkin olmadığı için bu bilgiler satın alma teklifi veya ödeme taahhüdü değildir.",
  },
  {
    id: "fiyatlandirma-2",
    category: "fiyatlandirma",
    question: "Aboneliğimi istediğim zaman iptal edebilir miyim?",
    answer:
      "Gerçek ödeme ve self-servis abonelik sağlayıcısı henüz etkin değildir. İptal ve iade politikası sağlayıcı ve resmi sözleşme onayı sonrasında yayınlanacaktır.",
  },
  {
    id: "fiyatlandirma-3",
    category: "fiyatlandirma",
    question: "Fiyatlara KDV dahil mi?",
    answer:
      "Katalog tutarları ürün karşılaştırması içindir; gerçek satış teklifi, vergi hesabı veya fatura oluşturmaz. Vergi sunumu resmi satış sözleşmesiyle belirlenecektir.",
  },
  {
    id: "fiyatlandirma-4",
    category: "fiyatlandirma",
    question: "İade politikanız nedir?",
    answer:
      "Henüz yayınlanmış ve onaylanmış bir iade politikası veya resmi iade iletişim kanalı yoktur. Gerçek ödeme alınmadığı için bu sayfadan iade talebi oluşturulamaz.",
  },
  {
    id: "fiyatlandirma-5",
    category: "fiyatlandirma",
    question: "Planımı yükseltmek veya düşürmek mümkün mü?",
    answer:
      "Tenant içindeki plan read-modeli ve sandbox akışları mevcuttur; gerçek yükseltme, düşürme ve bakiye tahsilatı sağlayıcı olmadan etkin değildir.",
  },

  // ─── Teknik ───────────────────────────────────────────────────────────────
  {
    id: "teknik-1",
    category: "teknik",
    question: "Sistem diğer muhasebe yazılımlarıyla entegre çalışır mı?",
    answer:
      "API anahtarı, webhook ve entegrasyon durum çekirdeği vardır; Logo, Mikro, Zirve veya başka bir ERP için doğrulanmış canlı çift yönlü adapter henüz yoktur.",
  },
  {
    id: "teknik-2",
    category: "teknik",
    question: "Mobil uygulama üzerinden şantiye takibi yapabilir miyim?",
    answer:
      "Tenant uygulaması mobil genişliklere uyarlanan web ekranları sunar. Ayrı iOS/Android uygulaması ve offline senkronizasyon desteği yoktur.",
  },
  {
    id: "teknik-3",
    category: "teknik",
    question: "e-Fatura entegrasyonu nasıl çalışır?",
    answer:
      "e-Fatura domain ve imzalı webhook altyapısı vardır; gerçek GİB transport sağlayıcısı ve credential bulunmadığından canlı gönderim veya otomatik alım yapılmaz.",
  },
  {
    id: "teknik-4",
    category: "teknik",
    question: "Sistemin çalışması için hangi tarayıcılar destekleniyor?",
    answer:
      "Güncel Chromium tabanlı tarayıcılarla geliştirme kabulü yapılır. Resmi çoklu tarayıcı destek matrisi henüz yayınlanmamıştır; Internet Explorer hedeflenmez.",
  },
  {
    id: "teknik-5",
    category: "teknik",
    question: "Excel veya CSV dosyalarından toplu veri aktarımı yapabilir miyim?",
    answer:
      "Bazı tenant kayıt türlerinde doğrulamalı Excel içe aktarma akışları vardır. Desteklenen kayıt türleri ilgili modül ekranında gösterilir; tüm domainler için toplu aktarım taahhüdü verilmez.",
  },

  // ─── Güvenlik ve Gizlilik ─────────────────────────────────────────────────
  {
    id: "guvenlik-gizlilik-1",
    category: "guvenlik-gizlilik",
    question: "Verilerim ne kadar güvende?",
    answer:
      "Uygulama tenant scope, opak DB oturumu, rol kontrolleri ve audit kayıtları kullanır. Production hosting, TLS sürümü, at-rest şifreleme, backup ve sertifika kanıtları henüz seçilmediği için bunlar hakkında taahhüt verilmez.",
  },
  {
    id: "guvenlik-gizlilik-2",
    category: "guvenlik-gizlilik",
    question: "Verilerim nerede depolanıyor?",
    answer:
      "Production hosting ve veri bölgesi henüz seçilmemiştir. Veri konumu, aktarım mekanizması ve sağlayıcı sertifikaları deployment kararı ve hukuki onay sonrasında yayınlanacaktır.",
  },
  {
    id: "guvenlik-gizlilik-3",
    category: "guvenlik-gizlilik",
    question: "İki faktörlü kimlik doğrulama (2FA) destekleniyor mu?",
    answer:
      "TOTP güvenlik çekirdeği Süper Admin için fail-closed zeminde bulunur; gerçek anahtar ve enrollment akışı olmadan etkin değildir. Tenant kullanıcıları için yayınlanmış 2FA özelliği yoktur.",
  },
  {
    id: "guvenlik-gizlilik-4",
    category: "guvenlik-gizlilik",
    question: "KVKK kapsamındaki haklarımı nasıl kullanabilirim?",
    answer:
      "Resmi veri sorumlusu kimliği ve başvuru kanalı henüz doğrulanmamıştır. KVKK sayfası hukuki onay alınana kadar taslak durumundadır ve başvuru teslimatı yaptığını iddia etmez.",
  },
  {
    id: "guvenlik-gizlilik-5",
    category: "guvenlik-gizlilik",
    question: "Sisteme kimin eriştiğini takip edebilir miyim?",
    answer:
      "Kritik tenant mutasyonlarının önemli bölümü scoped audit kaydı üretir ve Süper Admin için ayrı güvenlik kayıtları vardır. Tüm giriş/çıkışların tek export yüzeyinde toplandığı iddia edilmez.",
  },

  // ─── Destek ───────────────────────────────────────────────────────────────
  {
    id: "destek-1",
    category: "destek",
    question: "Teknik destek kanallarınız nelerdir?",
    answer:
      "Tenant içinde destek talebi ve bilgi merkezi modülleri vardır. Resmi e-posta, telefon, canlı sohbet, çalışma saati veya 7/24 destek taahhüdü henüz yayınlanmamıştır.",
  },
  {
    id: "destek-2",
    category: "destek",
    question: "Sisteme nasıl eğitim alabilir veya demo talep edebilirim?",
    answer:
      "Public demo talep teslimatı ve resmi eğitim kanalı henüz etkin değildir. Mevcut kullanıcılar tenant içindeki bilgi ve destek merkezi içeriklerini inceleyebilir.",
  },
  {
    id: "destek-3",
    category: "destek",
    question: "Sorun bildirimi yaparken nasıl hızlı yardım alabilirim?",
    answer:
      "Tenant içindeki destek talebine açıklama ve uygun ek eklenebilir. Plan bazlı yanıt süresi veya SLA henüz onaylanmamıştır.",
  },
  {
    id: "destek-4",
    category: "destek",
    question: "Sistem bakımı ve güncellemeler sırasında ne olur?",
    answer:
      "Yayınlanmış bakım penceresi veya ön bildirim SLA'sı yoktur. Bakım operasyonu, incident sahibi ve bildirim sağlayıcısı deployment runbook'u ile belirlenecektir.",
  },
  {
    id: "destek-5",
    category: "destek",
    question: "Aboneliğimi iptal ettiğimde verilerimi nasıl alabilirim?",
    answer:
      "Hesap kapatma, tam veri export'u ve retention politikası henüz onaylanmamıştır. Mevcut modül bazlı dışa aktarımlar bu politikanın yerine geçmez.",
  },
];

/**
 * Belirli bir kategoriye ait FAQ öğelerini döndürür.
 */
export function getFAQItemsByCategory(category: FAQCategory): FAQItem[] {
  return FAQ_ITEMS.filter((item) => item.category === category);
}

/**
 * Kullanılan tüm benzersiz kategorileri döndürür.
 */
export function getAllFAQCategories(): FAQCategory[] {
  const seen = new Set<FAQCategory>();
  for (const item of FAQ_ITEMS) {
    seen.add(item.category);
  }
  return Array.from(seen);
}
