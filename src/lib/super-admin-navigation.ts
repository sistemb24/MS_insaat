export type SuperAdminNavItem = {
  label: string;
  href: string;
  icon: string;
  description: string;
  group: "core" | "operations" | "system";
};

export const superAdminNavItems: SuperAdminNavItem[] = [
  {
    label: "Dashboard",
    href: "/super-admin",
    icon: "DS",
    description: "Platform genel bakış ve KPI'lar",
    group: "core",
  },
  {
    label: "Tenant Yönetimi",
    href: "/super-admin/tenants",
    icon: "TN",
    description: "Firma ve tenant yönetimi",
    group: "core",
  },
  {
    label: "Kullanıcılar",
    href: "/super-admin/users",
    icon: "KL",
    description: "Platform geneli kullanıcı listesi",
    group: "core",
  },
  {
    label: "Abonelikler",
    href: "/super-admin/abonelikler",
    icon: "AB",
    description: "Abonelik ve faturalandırma yönetimi",
    group: "operations",
  },
  {
    label: "Destek Masası",
    href: "/super-admin/destek",
    icon: "DM",
    description: "Destek talepleri ve çözüm takibi",
    group: "operations",
  },
  {
    label: "Bildirimler",
    href: "/super-admin/bildirimler",
    icon: "BL",
    description: "Platform bildirim yönetimi",
    group: "operations",
  },
  {
    label: "Raporlar",
    href: "/super-admin/raporlar",
    icon: "RP",
    description: "Platform analizleri ve raporlar",
    group: "operations",
  },
  {
    label: "Erişim Kontrol",
    href: "/super-admin/erisim",
    icon: "EK",
    description: "Yetki ve erişim yönetimi",
    group: "system",
  },
  {
    label: "Sistem Logları",
    href: "/super-admin/loglar",
    icon: "LG",
    description: "Audit log ve güvenlik olayları",
    group: "system",
  },
  {
    label: "Sistem Ayarları",
    href: "/super-admin/ayarlar",
    icon: "AY",
    description: "Platform yapılandırma ayarları",
    group: "system",
  },
  {
    label: "Profil",
    href: "/super-admin/profil",
    icon: "PR",
    description: "Süper admin hesap ayarları",
    group: "system",
  },
];

export const superAdminNavGroups = [
  { key: "core" as const, label: "Ana Modüller" },
  { key: "operations" as const, label: "Operasyonlar" },
  { key: "system" as const, label: "Sistem" },
];
