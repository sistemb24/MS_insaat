import { defaultTenantScope, type TenantScope } from "./tenant-scope";

export type AppContext = TenantScope;

export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  description: string;
  phase: "P0" | "P1" | "P2";
};

export const appContext: AppContext = defaultTenantScope;

export const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: "DS",
    description: "Nakit, vade, şantiye ve operasyon özetleri",
    phase: "P0",
  },
  {
    label: "Şantiyeler",
    href: "/santiyeler",
    icon: "ŞP",
    description: "Şantiye kartları, gelir/gider ve analiz",
    phase: "P0",
  },
  {
    label: "Tedarikçiler",
    href: "/tedarikciler",
    icon: "TD",
    description: "Tedarikçi kartları, alış faturası ve ekstre",
    phase: "P0",
  },
  {
    label: "Müşteriler",
    href: "/musteriler",
    icon: "MÜ",
    description: "Müşteri cari kartları, satış faturası ve ekstre",
    phase: "P1",
  },
  {
    label: "İhale Yönetimi",
    href: "/ihale-yonetimi",
    icon: "İH",
    description: "İhale listesi, analiz panosu, teklif ve durum takibi",
    phase: "P1",
  },
  {
    label: "Döküman Merkezi",
    href: "/dokuman-merkezi",
    icon: "DK",
    description: "Sistem klasörleri, dosya yükleme ve evrak bağlantıları",
    phase: "P1",
  },
  {
    label: "Bildirimler",
    href: "/bildirimler",
    icon: "BL",
    description: "Kategori ayarları, hatırlatmalar ve okunmamış bildirimler",
    phase: "P1",
  },
  {
    label: "Abonelik",
    href: "/abonelik",
    icon: "AB",
    description: "Paket, ek özellik, yenileme sepeti ve ödeme geçmişi",
    phase: "P2",
  },
  {
    label: "Araçlar",
    href: "/araclar",
    icon: "AR",
    description: "Araç kartları, GPS durumu ve bakım takvimi",
    phase: "P2",
  },
  {
    label: "API Yönetimi",
    href: "/api-yonetimi",
    icon: "AP",
    description: "API anahtarları, kapsamlar ve erişim limitleri",
    phase: "P2",
  },
  {
    label: "E-Fatura Yönetimi",
    href: "/e-fatura-yonetimi",
    icon: "EF",
    description: "E-Fatura, e-Arşiv durum ve entegrasyon başlangıcı",
    phase: "P2",
  },
  {
    label: "Taşeronlar",
    href: "/taseronlar",
    icon: "TŞ",
    description: "Taşeron hesapları, hakediş ve ödeme",
    phase: "P0",
  },
  {
    label: "Personel",
    href: "/personel",
    icon: "PR",
    description: "Personel kartları, ödeme ve zimmet",
    phase: "P0",
  },
  {
    label: "İSG Merkezi",
    href: "/isg",
    icon: "İS",
    description: "İş kazası, eğitim, denetim, bulgu ve KKD takibi",
    phase: "P1",
  },
  {
    label: "Kasa/Banka",
    href: "/kasa-banka",
    icon: "KB",
    description: "Kasa, banka, virman ve nakit akışı",
    phase: "P0",
  },
  {
    label: "Giderler",
    href: "/giderler",
    icon: "GD",
    description: "Şantiye gideri, ödeme aracı ve masraf analizi",
    phase: "P0",
  },
  {
    label: "Stok/Depo",
    href: "/stok-depo",
    icon: "SD",
    description: "Stok kartları, depo ve şantiye hareketleri",
    phase: "P0",
  },
  {
    label: "Faturalar",
    href: "/faturalar",
    icon: "FT",
    description: "Alış, satış, irsaliye ve PDF önizleme",
    phase: "P0",
  },
  {
    label: "Hakediş",
    href: "/hakedis",
    icon: "HK",
    description: "Hakediş faturası, onay ve çıktı",
    phase: "P0",
  },
  {
    label: "Çek",
    href: "/cek",
    icon: "ÇK",
    description: "Gelen çek, firma çeki, tahsil ve ciro",
    phase: "P0",
  },
  {
    label: "Puantaj",
    href: "/puantaj",
    icon: "PN",
    description: "Aylık puantaj grid'i ve maaş hazırlığı",
    phase: "P0",
  },
  {
    label: "Raporlar",
    href: "/raporlar",
    icon: "RP",
    description: "Ekstre, hareket toplamları ve şantiye raporu",
    phase: "P0",
  },
  {
    label: "Ayarlar",
    href: "/ayarlar",
    icon: "AY",
    description: "Firma parametreleri, yetki ve audit",
    phase: "P0",
  },
];

export const plannedRouteSlugs = navigationItems
  .filter((item) => item.href !== "/")
  .map((item) => item.href.slice(1));

export const counterpartyStatementRouteSlugs = [
  "tedarikciler",
  "musteriler",
  "taseronlar",
] as const;

export function getModuleBySlug(slug: string) {
  return navigationItems.find((item) => item.href === `/${slug}`);
}


