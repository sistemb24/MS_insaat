import type { Metadata } from "next";

export const LEGAL_DOCUMENT_VERSION = "2026-08-12.a";
export const LEGAL_EFFECTIVE_DATE = "2026-08-12";
export const LEGAL_CONTACT_EMAIL = "info@msinsaat.com";

export type LegalDocumentSection = {
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export type LegalDocument = {
  description: string;
  effectiveDate: string;
  id: "kvkk-aydinlatma" | "gizlilik-politikasi" | "kullanim-kosullari";
  sections: readonly LegalDocumentSection[];
  title: string;
  version: string;
};

const sharedIdentity =
  "NOA İnşaat Yönetimi, MS İNŞAAT ticari adıyla Murat Saygı tarafından işletilir. Faaliyet yeri Atakum, Samsun, Türkiye; iletişim adresi info@msinsaat.com'dur.";

export const kvkkDocument = {
  id: "kvkk-aydinlatma",
  title: "KVKK Aydınlatma Metni",
  description: "NOA İnşaat Yönetimi kişisel veri işleme aydınlatma metni.",
  version: LEGAL_DOCUMENT_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: "Veri sorumlusu ve iletişim",
      paragraphs: [
        sharedIdentity,
        "Platform hesabı, erişim güvenliği, hizmet yönetimi ve platform operasyonlarında veri sorumlusu Murat Saygı'dır. Tenant müşterilerin kendi çalışanları, müşterileri, tedarikçileri ve proje muhatapları hakkında belirlediği faaliyetlerde müşteri veri sorumlusu; NOA İnşaat Yönetimi ise müşterinin belgelenmiş talimatları sınırında veri işleyen olarak hareket eder.",
      ],
    },
    {
      heading: "İşlenen veri kategorileri ve amaçlar",
      paragraphs: [
        "Kullanılan modüllere göre hesap ve iletişim, kimlik doğrulama, rol/yetki, tenant-firma-dönem kapsamı, proje, müşteri/tedarikçi, finans/muhasebe, personel, ücret/çalışma, İSG, doküman, destek, audit, güvenlik, oturum ve backup verileri işlenebilir. İSG veya yüklenen doküman içeriği sağlık bilgisi gibi özel nitelikli kişisel veri içerebilir.",
        "Veriler hesabı ve yetki kapsamını işletmek, müşterinin iş süreçlerini talimatı doğrultusunda yürütmek, bilgi güvenliği ve tenant izolasyonunu sağlamak, destek sunmak, backup/recovery işletmek, yasal yükümlülükleri yerine getirmek ve hakları korumak amaçlarıyla işlenir.",
        "Public iletişim formu, newsletter ve self-servis kayıt mevcut sürümde veri toplamaz. Open Banking, Arvento, GİB/e-Fatura, ödeme, SMTP/SMS ve benzeri dış entegrasyonlar canlı production hizmeti olarak açık değildir.",
      ],
    },
    {
      heading: "Toplama yöntemi ve hukuki sebepler",
      paragraphs: [
        "Veriler kullanıcıların arayüze girdiği veya yüklediği içerikten, tenant yöneticisinin tanımlarından, kimlik doğrulama/audit/güvenlik sırasında otomatik üretilen kayıtlardan ve yetkili import/entegrasyon işlemlerinden otomatik veya bir veri kayıt sisteminin parçası olan otomatik olmayan yöntemlerle elde edilir.",
        "Faaliyete göre Kanunun 5 ve 6'ncı maddelerindeki sözleşmenin kurulması veya ifası, kanunlarda açıkça öngörülme, hukuki yükümlülük, bir hakkın tesisi, kullanılması veya korunması ve temel haklara zarar vermemek kaydıyla meşru menfaat şartlarına dayanılır. Özel nitelikli veriler yalnız uygun şart ve ek tedbirlerle, müşterinin yetkili talimatı kapsamında işlenebilir.",
      ],
    },
    {
      heading: "Alıcılar ve yurt dışına aktarım",
      paragraphs: [
        "Veriler amaçla sınırlı ve gerekli ölçüde yetkili tenant kullanıcılarına, Vercel hosting/runtime, Neon PostgreSQL, Cloudflare R2 storage/backup, Sentry monitoring ve GitHub Actions workflow hizmetlerine; ayrıca yasal zorunlulukta yetkili kamu/yargı mercileri ile gizlilik yükümlüsü danışmanlara aktarılabilir.",
        "Yabancı merkezli sağlayıcılara erişim veya aktarım, Kanunun 9'uncu maddesindeki şartlardan biri ve uygulanabilir uygun güvence sağlanmadan gerçek kullanıcı trafiği için açılamaz. Sağlayıcı rolü, ülke, alt işleyen, veri kategorisi ve aktarım mekanizmasının sözleşme kanıtı operasyon kaydında tutulur. Avrupa bölgesi seçimi tek başına uygun güvence sayılmaz.",
      ],
    },
    {
      heading: "Saklama ve imha",
      paragraphs: [
        "Saklama süreleri 2026-08-09.a kategori kararlarına göre uygulanır. Kimlik ve iletişim, auth, audit/güvenlik, finans, personel/İSG, doküman, entegrasyon, destek ve backup kayıtları tek bir genel süreye tabi değildir. Günlük backuplar 30 gün tutulur; finans/ticari, personel/İSG ve audit kayıtları ilgili yasal yükümlülük süresince saklanabilir.",
        "Aktif legal hold veya kanuni zorunluluk yoksa işleme şartları sona eren veri silinir, yok edilir veya anonimleştirilir.",
      ],
    },
    {
      heading: "İlgili kişi hakları ve başvuru",
      paragraphs: [
        "İlgili kişiler Kanunun 11'inci maddesindeki bilgi alma, düzeltme, şartları varsa silme/yok etme, üçüncü kişilere bildirim, otomatik analiz sonucuna itiraz ve zararın giderilmesini isteme haklarını kullanabilir.",
        "Başvurular, ilgili kişinin NOA sisteminde kayıtlı e-posta adresinden info@msinsaat.com adresine veya güvenli elektronik/mobil imzalı olarak aynı adrese iletilebilir. Başvuruda ad-soyad, kimliği doğrulamaya yeterli bilgi, bildirim adresi ve talep konusu bulunmalıdır. Başvurular en kısa sürede ve en geç 30 gün içinde sonuçlandırılır.",
      ],
    },
  ],
} as const satisfies LegalDocument;

export const privacyDocument = {
  id: "gizlilik-politikasi",
  title: "Gizlilik Politikası",
  description: "NOA İnşaat Yönetimi gizlilik ve veri güvenliği politikası.",
  version: LEGAL_DOCUMENT_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: "Kapsam",
      paragraphs: [
        sharedIdentity,
        "Bu politika platformun gerçek teknik davranışını açıklar. Müşteri tenantların kendi iş verilerindeki veri sorumluluğu ile platform hesabı, güvenlik ve operasyon kayıtlarındaki platform sorumluluğu birbirinden ayrıdır.",
      ],
    },
    {
      heading: "İşlenen bilgiler",
      paragraphs: [
        "Kullanılan modüllere göre hesap/e-posta, rol/yetki, oturum, tenant/firma/dönem, proje, müşteri/tedarikçi, ticari/finansal belge, personel, çalışma/ücret, İSG, doküman, destek, audit/güvenlik, IP/user-agent ve backup bilgileri işlenebilir.",
        "Public iletişim formu ve newsletter mevcut sürümde veri kaydetmez. Self-servis kayıt, public parola sıfırlama teslimatı, pazarlama e-postası/SMS'i, ödeme formu ve üçüncü taraf reklam/analitik izleyicisi açık değildir.",
      ],
    },
    {
      heading: "Çerezler",
      paragraphs: [
        "Public marketing sayfalarında analitik veya reklam çerezi kullanılmaz. Giriş gerektiren yüzeylerde yalnız hizmetin çalışması ve güvenliği için zorunlu oturum çerezleri bulunur.",
      ],
      bullets: [
        "noa-session-id: tenant oturumu; en fazla 8 saat; HttpOnly, production'da Secure ve SameSite=Lax.",
        "noa-super-admin-session: Süper Admin oturumu; en fazla 2 saat; HttpOnly, production'da Secure, SameSite=Strict ve /super-admin kapsamı.",
      ],
    },
    {
      heading: "Kullanım amaçları",
      paragraphs: [
        "Bilgiler hesabı ve erişim kapsamını işletmek, müşteri talimatıyla iş süreçlerini yürütmek, finans/personel/proje/doküman kayıtlarını saklamak, tenant izolasyonu ve güvenliği sağlamak, destek vermek, backup/recovery yapmak, yasal yükümlülükleri yerine getirmek ve hakları korumak için kullanılır.",
        "Mevcut ürün, kişi hakkında hukuki veya benzeri önemli sonuç doğuran otomatik karar veya profil çıkarma yapmaz.",
      ],
    },
    {
      heading: "Sağlayıcılar ve aktarımlar",
      paragraphs: [
        "Teknik sunumda Vercel (fra1), Neon (AWS Frankfurt eu-central-1), Cloudflare R2 (EU jurisdiction), Sentry (DE region) ve GitHub Actions kullanılabilir. Sağlayıcı erişimi amaç, rol, alt işleyen ve veri kategorisiyle sınırlandırılır.",
        "Yurt dışı erişim veya aktarım için Kanunun 9'uncu maddesindeki geçerli mekanizma ve sözleşme kanıtı gerçek kullanıcı trafiği öncesinde tamamlanır. Bölge seçimi tek başına verinin yalnız o ülkede kaldığı garantisi değildir.",
      ],
    },
    {
      heading: "Saklama, güvenlik ve hesap kapanışı",
      paragraphs: [
        "Veriler 2026-08-09.a karar kataloğundaki kategori bazlı sürelerle tutulur. Günlük backuplar 30 gün; finans/ticari, personel/İSG ve audit kayıtları ilgili yasal süreler boyunca saklanabilir. Hesap kapanışı önce erişimin dondurulmasını, export ve legal hold kontrolünü gerektirebilir.",
        "Tenant/firma/dönem izolasyonu, rol tabanlı erişim, HttpOnly/Secure oturum, parola hash'i, private storage, redacted monitoring, audit, şifreli secret yüzeyleri ve backup/recovery kontrolleri uygulanır. Bunlar riski azaltır; mutlak güvenlik garantisi oluşturmaz.",
      ],
    },
    {
      heading: "Haklar ve iletişim",
      paragraphs: [
        "KVKK kapsamındaki talepler, NOA sisteminde kayıtlı e-posta adresinden veya güvenli elektronik/mobil imzalı olarak info@msinsaat.com adresine iletilebilir. Tenantın kontrol ettiği personel/müşteri verilerinde ilk muhatap, müşteri sözleşmesindeki taraf rolüne göre ilgili tenant olabilir.",
      ],
    },
  ],
} as const satisfies LegalDocument;

export const termsDocument = {
  id: "kullanim-kosullari",
  title: "Kullanım Koşulları",
  description: "NOA İnşaat Yönetimi B2B kullanım koşulları.",
  version: LEGAL_DOCUMENT_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  sections: [
    {
      heading: "Taraflar ve sözleşmenin kurulması",
      paragraphs: [
        `${sharedIdentity} Hizmet B2B/tacir ve mesleki kullanıcılar için sunulur. Müşteri, yazılı ana sözleşme veya sipariş formunda tanımlanan ticari kişidir.`,
        "Public site self-servis hesap, ödeme veya sözleşme kabulü oluşturmaz; fiyat ve plan açıklamaları tek başına bağlayıcı teklif değildir. Sözleşme yetkili tarafların yazılı veya ayrıca onaylanmış elektronik kabulüyle kurulur.",
      ],
    },
    {
      heading: "Hizmet ve kullanıcı sorumluluğu",
      paragraphs: [
        "Hizmet, sipariş formunda açılan kullanıcı/yetki, proje, finans, muhasebe, doküman, personel, İSG, destek ve raporlama modüllerini kapsar. Provider bağımlı özellikler ayrıca etkinleştirilmeden taahhüt edilmiş hizmet sayılmaz.",
        "Hizmet hukuki, mali, vergi, iş güvenliği veya mühendislik danışmanlığı; resmi kurum beyanı; bankacılık veya ödeme hizmeti sunmaz. Kullanıcı çıktıları yetkili uzman ve resmi kayıtlarla kontrol eder.",
      ],
      bullets: [
        "Müşteri kullanıcılarının yetkili olmasını ve doğru rol/kapsam tanımlarını sağlar.",
        "Credential paylaşımı, başka tenant'a erişim, zararlı kod ve hukuka aykırı içerik yasaktır.",
        "Ayrılan personelin erişimi müşteri tarafından zamanında kaldırılır.",
      ],
    },
    {
      heading: "Müşteri verisi ve veri koruma",
      paragraphs: [
        "Müşteri, yüklediği veriler üzerindeki haklarını korur ve işleme için gerekli yetki, hukuki sebep ve aydınlatmadan sorumludur. Platform, müşteri verisini yalnız hizmeti sunmak, güvenliği sağlamak, backup/recovery işletmek ve yasal yükümlülükleri yerine getirmek için sınırlı olarak işler.",
        "Taraf rolleri, alt işleyenler, yurt dışı aktarım, incident bildirimi, ilgili kişi talepleri ve silme/iade yükümlülükleri Veri İşleme Eki'nde düzenlenir. Geçerli aktarım mekanizması ve provider sözleşme kanıtı tamamlanmadan gerçek kullanıcı trafiği açılamaz.",
      ],
    },
    {
      heading: "Ücret, süre ve destek",
      paragraphs: [
        "Plan, kapsam, para birimi, vergi, fatura, ödeme vadesi, gecikme sonucu, sözleşme süresi, yenileme, fiyat değişikliği, iptal ve varsa iade yalnız ana sözleşme veya sipariş formunda belirlenir. Açık hüküm yoksa otomatik yenileme, service credit veya kullanılmayan dönem iadesi taahhüt edilmez.",
        "Kayıtlı operasyon penceresi hafta içi 09:00–18:00 Europe/Istanbul'dur; ayrı SLA'da yazmadıkça yanıt/çözüm garantisi değildir. Production RPO 24 saat ve RTO 8 saat teknik hedeflerdir; sözleşmesel garanti değildir.",
      ],
    },
    {
      heading: "Backup, export ve kapanış",
      paragraphs: [
        "Günlük production backupları 30 gün tutulur ve müşterinin kendi yasal arşiv yükümlülüğünün yerine geçmez. Kapanışta erişim önce dondurulabilir; export, kanuni saklama, legal hold ve backup silme-tekrar kontrolleri uygulanır. Kanunen saklanması gereken kayıtlar derhal silinmeyebilir.",
      ],
    },
    {
      heading: "Fikrî mülkiyet, askıya alma ve fesih",
      paragraphs: [
        "Yazılım, marka, arayüz ve dokümantasyon hakları hizmet sağlayıcıya veya lisans verenlerine aittir. Müşteriye sözleşme süresince sınırlı, devredilemez kullanım hakkı verilir. Müşteri verisi müşteride veya ilgili hak sahibinde kalır.",
        "Ödeme ihlali, güvenlik riski, hukuka aykırı kullanım veya esaslı ihlalde ölçülü askıya alma/fesih uygulanabilir. Acil hâl dışında makul bildirim ve giderim imkânı verilir.",
      ],
    },
    {
      heading: "Garanti, sorumluluk ve uyuşmazlık",
      paragraphs: [
        "Hizmet makul teknik ve idari özenle sunulur; kesintisiz, hatasız, her mevzuata otomatik uygun veya belirli ticari sonucu garanti etmez. Sorumluluk emredici hukuk ile imzalı ana sözleşmeye tabidir; kast, ağır kusur veya kanunen sınırlandırılamayan sorumluluk ortadan kaldırılmaz.",
        "Türkiye Cumhuriyeti hukuku uygulanır. Tacirler arasındaki uyuşmazlıklarda, emredici yetki kuralları saklı kalmak üzere Samsun Mahkemeleri ve İcra Daireleri yetkilidir.",
      ],
    },
    {
      heading: "Değişiklik ve yürürlük",
      paragraphs: [
        "Esaslı değişiklikler sürüm ve yürürlük tarihiyle makul süre önce müşteriye kayıtlı iletişim kanalı üzerinden bildirilir. Değişiklik mevcut sözleşme dengesini esaslı etkiliyorsa müşterinin ana sözleşmedeki itiraz/fesih hakları korunur.",
      ],
    },
  ],
} as const satisfies LegalDocument;

export function createLegalMetadata(document: LegalDocument): Metadata {
  return {
    title: `${document.title} — NOA İnşaat`,
    description: document.description,
    robots: { follow: false, index: false },
  };
}
