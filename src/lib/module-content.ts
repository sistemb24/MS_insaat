import { navigationItems } from "./navigation";

export type MetricCard = {
  label: string;
  value: string;
  detail: string;
  status: "approved" | "process" | "draft" | "cancelled";
};

export type ModuleContent = {
  title: string;
  eyebrow: string;
  summary: string;
  templateSources: string[];
  primaryActions: string[];
  metrics: MetricCard[];
};

const defaultMetrics: MetricCard[] = [
  {
    label: "Açık kayıt",
    value: "0",
    detail: "Demo veri bağlanınca dolacak",
    status: "draft",
  },
  {
    label: "İş akışı",
    value: "P0",
    detail: "Planla uyumlu placeholder",
    status: "process",
  },
  {
    label: "Audit",
    value: "Hazır",
    detail: "Kayıt etkileri için zorunlu",
    status: "approved",
  },
];

const moduleContentBySlug: Record<string, ModuleContent> = {
  santiyeler: {
    title: "Şantiye & Proje Yönetimi",
    eyebrow: "P0 çekirdek modül",
    summary:
      "Şantiye kartları, gelir/gider akışı, hakediş bağlantısı ve maliyet analizleri için çalışma alanı.",
    templateSources: [
      "Şantiye_proje_listesi_1.html",
      "Şantiye_maliyet_ve_kar_analizi.html",
    ],
    primaryActions: ["Yeni Şantiye", "Gelir/Gider", "Şantiye Ekstresi"],
    metrics: [
      {
        label: "Planlanan şablon",
        value: "2",
        detail: "Liste ve maliyet analizi",
        status: "process",
      },
      ...defaultMetrics.slice(1),
    ],
  },
  musteriler: {
    title: "Müşteri Cari Kartları",
    eyebrow: "P1 cari ve satış",
    summary:
      "Müşteri cari kartları, satış faturası, tahsilat ve hesap ekstresi akışları için planlı modül başlangıcı.",
    templateSources: ["müşteri_cari_kartı.html", "cari_hesap_ekstresi.html"],
    primaryActions: ["Yeni Müşteri", "Satış Faturası", "Ekstre"],
    metrics: defaultMetrics,
  },
  "ihale-yonetimi": {
    title: "İhale Yönetimi",
    eyebrow: "P1 teklif ve kazanım",
    summary:
      "İhale listesi, analiz panosu, EKAP/İKN takibi, teklif takvimi ve kazanılan ihaleden şantiye açma akışının temel başlangıcı.",
    templateSources: [
      "İhale Yönetimi-01.png",
      "İhale Yönetimi-Analiz-02.png",
      "İhale Yönetimi-Yeni ihale-03.png",
    ],
    primaryActions: ["Yeni İhale", "Analiz Panosu", "Excel", "PDF"],
    metrics: defaultMetrics,
  },
  "dokuman-merkezi": {
    title: "Döküman / Evrak Merkezi",
    eyebrow: "P1 merkezi evrak",
    summary:
      "Sistem klasörleri, dosya yükleme, yetki, çöp kutusu ve modül kayıtlarına evrak bağlantısı için merkezi çalışma alanı.",
    templateSources: [
      "Döküman Yönetimi-01.png",
      "Döküman Yönetimi-02.png",
      "Döküman Yönetimi-06.png",
    ],
    primaryActions: ["Yeni Klasör", "Dosya Yükle", "Liste", "Izgara"],
    metrics: defaultMetrics,
  },
  bildirimler: {
    title: "Bildirim Merkezi",
    eyebrow: "P1 bildirim ve ayarlar",
    summary:
      "Kategori bazlı bildirim aç/kapat, okunmamış sayaç, öncelik dağılımı ve ilgili kayıt ekranına yönlendirme akışları.",
    templateSources: [
      "Ayarlar-Bildirim Ayarlari-01.png",
      "Ayarlar-Bildirim Ayarlari-02.png",
      "Ayarlar-Bildirim Ayarlari-03.png",
    ],
    primaryActions: ["Kategori Ayarları", "Okundu İşaretle", "Kayıda Git"],
    metrics: defaultMetrics,
  },
  abonelik: {
    title: "Abonelik ve Paket Yönetimi",
    eyebrow: "P2 paket ve faturalama",
    summary:
      "Mevcut paket özeti, aylık/yıllık yenileme sepeti, paket yükseltme, ek özellik satın alma ve ödeme geçmişi iş akışları için SaaS abonelik modülü başlangıcı.",
    templateSources: [
      "Parsek-Mevcut Paketiniz-01.png",
      "Parsek-Mevcut Paketiniz-05.png",
      "Parsek-Destek Merkezi-01.png",
      "Parsek-Davet Et & Kazan.png",
    ],
    primaryActions: [
      "Paketleri İncele",
      "Yenileme Sepeti",
      "Ek Özellik",
      "Ödeme Geçmişi",
    ],
    metrics: [
      {
        label: "Paket",
        value: "4",
        detail: "Başlangıç, Standart, Profesyonel, Kurumsal",
        status: "process",
      },
      {
        label: "Ek özellik",
        value: "6",
        detail: "Depolama, e-Fatura, banka, filo, AI, barkod",
        status: "draft",
      },
      {
        label: "Ödeme",
        value: "Planlı",
        detail: "Stripe/Iyzico/PayTR kararı sonraki dilimde",
        status: "draft",
      },
    ],
  },
  araclar: {
    title: "Araç / Filo Yönetimi",
    eyebrow: "P2 araç ve GPS",
    summary:
      "Araç kartları, GPS konumu, son hareket zamanı, bakım hatırlatması ve Arvento filo takip bağlantısı için planlı modül başlangıcı.",
    templateSources: [
      "Araçlar P2 plan",
      "Ayarlar-Arvento Filo Takip-01.png",
      "Ayarlar-Arvento Filo Takip-02.png",
    ],
    primaryActions: ["Araç Kartı", "GPS Durumu", "Bakım Takvimi"],
    metrics: [
      {
        label: "Filo Takip",
        value: "P2",
        detail: "Arvento erişimi ile açılır",
        status: "process",
      },
      {
        label: "GPS",
        value: "Planlı",
        detail: "Araç kartına konum ve son hareket",
        status: "draft",
      },
      {
        label: "Bakım",
        value: "Planlı",
        detail: "KM / motor saati uyarıları",
        status: "draft",
      },
    ],
  },
  "api-yonetimi": {
    title: "API Yönetimi",
    eyebrow: "P2-S4 entegrasyon altyapısı",
    summary:
      "API anahtarları, kapsam seçimi, son kullanım tarihi ve istek limiti için güvenli entegrasyon yönetimi.",
    templateSources: [
      "Parsek-API Dokumantasyonu-01.png",
      "Parsek-API Dokumantasyonu-07.png",
      "E-Fatura Yönetimi.png",
    ],
    primaryActions: ["Yeni Anahtar", "Kapsam Seç", "Anahtarı İptal Et"],
    metrics: [
      {
        label: "API kategorisi",
        value: "6",
        detail: "e-Fatura, fatura, cari, stok, proje ve webhook",
        status: "process",
      },
      {
        label: "Anahtar güvenliği",
        value: "SHA-256",
        detail: "Açık anahtar yalnız oluştururken gösterilir",
        status: "approved",
      },
      {
        label: "Endpoint",
        value: "Planlı",
        detail: "Kaynak API route'ları sonraki P2-S4 diliminde",
        status: "draft",
      },
    ],
  },
  "e-fatura-yonetimi": {
    title: "E-Fatura Yönetimi",
    eyebrow: "P2 e-Fatura API başlangıcı",
    summary:
      "E-Fatura / e-Arşiv için durum görünümü, entegrasyon hazırlığı ve API tabanlı başlangıç akışı.",
    templateSources: [
      "e_fatura_yönetimi.html",
      "e_fatura_entegrasyon_ve_ayarlar.html",
      "E-Fatura Yönetimi.png",
    ],
    primaryActions: ["Durum", "Entegrasyon", "Gönderim"],
    metrics: [
      {
        label: "API",
        value: "Başladı",
        detail: "e-invoice scope ve durum endpoint'i",
        status: "process",
      },
      {
        label: "GİB",
        value: "Planlı",
        detail: "Sağlayıcı bağlantısı sonraki dilimde",
        status: "draft",
      },
      {
        label: "İşlem",
        value: "Hazır",
        detail: "Durum görünümü ve kapsam kontrolü",
        status: "approved",
      },
    ],
  },
  tedarikciler: {
    title: "Tedarikçi Yönetimi",
    eyebrow: "Kart, fatura ve ekstre",
    summary:
      "Tedarikçi kartları, alış faturası, cari ekstre ve fiyat analizleri için modül başlangıcı.",
    templateSources: [
      "tedarikçi_yönetimi.html",
      "yeni_tedarikçi_kayıt_formu.html",
      "al_faturasi_ekle.html",
    ],
    primaryActions: ["Yeni Tedarikçi", "Alış Faturası", "Ekstre"],
    metrics: defaultMetrics,
  },
  taseronlar: {
    title: "Taşeron Yönetimi",
    eyebrow: "Hakediş ve cari takip",
    summary:
      "Taşeron tanımları, hakediş faturaları, ödeme ve hesap ekstresi akışlarını toplar.",
    templateSources: [
      "taşeron_yönetimi.html",
      "taşeron_hesap_ekstresi.html",
      "hakediş_faturası_ekle.html",
    ],
    primaryActions: ["Yeni Taşeron", "Hakediş", "Ödeme"],
    metrics: defaultMetrics,
  },
  personel: {
    title: "Personel Yönetimi",
    eyebrow: "Kart, ödeme ve zimmet",
    summary:
      "Personel kartları, şantiye görevlendirmeleri, ödeme ve maaş tahakkuk hazırlığı.",
    templateSources: [
      "personel_listesi.html",
      "personel_maaş_ve_bordro_yönetimi.html",
    ],
    primaryActions: ["Yeni Personel", "Ödeme", "Zimmet"],
    metrics: defaultMetrics,
  },
  isg: {
    title: "İSG Operasyon Merkezi",
    eyebrow: "Faz 14 operasyon ve takip",
    summary:
      "İş kazası, eğitim, saha denetimi, bulgu ve KKD zimmetini aynı kapsamda takip edin.",
    templateSources: ["İSG operasyon çekirdeği", "AppShell çalışma alanı"],
    primaryActions: ["İş Kazası", "Eğitim", "Denetim", "KKD Zimmeti"],
    metrics: defaultMetrics,
  },
  "kasa-banka": {
    title: "Kasa/Banka",
    eyebrow: "Nakit ve virman",
    summary:
      "Kasa, banka, virman, tahsilat, ödeme ve vade takibi için finans modülü.",
    templateSources: [
      "kasa_banka_yönetimi.html",
      "banka_kasa_virman_işlemi.html",
      "nakit_ak_ve_vade_takip_raporu.html",
    ],
    primaryActions: ["Tahsilat", "Ödeme", "Virman"],
    metrics: defaultMetrics,
  },
  giderler: {
    title: "Giderler",
    eyebrow: "Şantiye masraf hareketleri",
    summary:
      "Şantiye/proje gider hareketleri, ödeme aracı seçimi, evrak izi ve gider analizleri için P0 başlangıç kabuğu.",
    templateSources: [
      "gider_ve_masraf_yönetimi.html",
      "yeni_gider_kaydı_ekle.html",
      "gider_analiz_ve_raporlar.html",
    ],
    primaryActions: ["Yeni Gider", "Ödeme Aracı", "Gider Raporu"],
    metrics: defaultMetrics,
  },
  "stok-depo": {
    title: "Stok/Depo",
    eyebrow: "Malzeme ve şantiye hareketleri",
    summary:
      "Stok kartları, depo tanımları, şantiye stok/hizmet hareketleri ve durum raporu.",
    templateSources: [
      "stok_listesi.html",
      "depo_tanımları.html",
      "stok_ve_depo_hareket_raporu.html",
    ],
    primaryActions: ["Yeni Stok", "Depo Transferi", "Stok Raporu"],
    metrics: defaultMetrics,
  },
  faturalar: {
    title: "Faturalar",
    eyebrow: "Alış, satış ve çıktı",
    summary:
      "Alış faturası, satış faturası, satır grid'i, toplamlar ve PDF önizleme standartları.",
    templateSources: [
      "al_faturasi_ekle.html",
      "al_faturas_pdf_önizleme.html",
      "satış_faturası.html",
    ],
    primaryActions: ["Alış Faturası", "Satış Faturası", "PDF Önizleme"],
    metrics: defaultMetrics,
  },
  hakedis: {
    title: "Hakediş",
    eyebrow: "Fatura ve onay",
    summary:
      "Şantiye ve taşeron hakedişleri, onay yönetimi, stopaj/tevkifat ve çıktı akışı.",
    templateSources: [
      "hakediş_yönetimi.html",
      "hakediş_faturası_ekle.html",
      "hakediş_faturası_pdf_önizleme.html",
    ],
    primaryActions: ["Yeni Hakediş", "Onay", "PDF"],
    metrics: defaultMetrics,
  },
  cek: {
    title: "Çek İşlemleri",
    eyebrow: "Portföy ve vade",
    summary:
      "Gelen çek, firma çeki, tahsil, ödeme, ciro ve çek bordrosu iş akışları.",
    templateSources: ["ek_işlemleri.html", "ek_bordrosu_pdf_önizleme.html"],
    primaryActions: ["Çek Girişi", "Tahsil Et", "Ciro"],
    metrics: defaultMetrics,
  },
  puantaj: {
    title: "Puantaj",
    eyebrow: "Aylık çalışma grid'i",
    summary:
      "Şantiye, taşeron, ay ve yıl bazında personel gün/mesai girişi ve maaş hazırlığı.",
    templateSources: [
      "puantaj_girişi.html",
      "puantaj_detaylar.html",
      "personel_puantaj_cetveli_pdf_önizleme.html",
    ],
    primaryActions: ["Puantaj Gir", "Toplu Yevmiye", "PDF"],
    metrics: defaultMetrics,
  },
  raporlar: {
    title: "Raporlar",
    eyebrow: "Ekstre ve analiz",
    summary:
      "Şantiye gelir/gider, cari ekstre, kasa/banka, çek vade, stok ve puantaj raporları.",
    templateSources: [
      "genel_finansal_durum_ve_kar_zarar_özeti.html",
      "Şantiye_maliyet_ve_kar_analizi.html",
      "kasa_ve_banka_durum_raporu.html",
    ],
    primaryActions: ["Rapor Seç", "Excel", "PDF"],
    metrics: defaultMetrics,
  },
  ayarlar: {
    title: "Ayarlar",
    eyebrow: "Firma ve denetim",
    summary:
      "Firma parametreleri, yetki matrisi, audit log ve şablon dönüşüm kontrolleri.",
    templateSources: [
      "firma_ayarlar_ve_parametreler.html",
      "ge_mi_i_lem_raporu_audit_log.html",
    ],
    primaryActions: ["Parametreler", "Yetkiler", "Audit"],
    metrics: defaultMetrics,
  },
};

export const dashboardContent: ModuleContent = {
  title: "NOA İnşaat SaaS Kabuk",
  eyebrow: "Hafta 1 platform başlangıcı",
  summary:
    "Tenant, firma, dönem, navigasyon, design system ve P0 modül route iskeleti hazırlandı.",
  templateSources: [
    "dashboard.html",
    "genel_dashboard.html",
    "puantaj_girişi.html",
  ],
  primaryActions: ["Şantiye Aç", "Alış Faturası", "Puantaj"],
  metrics: [
    {
      label: "P0 route",
      value: String(navigationItems.length),
      detail: "Dashboard dahil",
      status: "approved",
    },
    {
      label: "Şablon modu",
      value: "Token",
      detail: "Statik HTML taşınmadı",
      status: "process",
    },
    {
      label: "Tenant",
      value: "Aktif",
      detail: "Firma/dönem bağlamı üst barda",
      status: "approved",
    },
  ],
};

export function getModuleContent(slug: string): ModuleContent | undefined {
  return moduleContentBySlug[slug];
}


