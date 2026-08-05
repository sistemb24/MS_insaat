export type P0FinanceSettings = {
  baseCurrency: "TRY";
  defaultVatRate: number;
  multiCurrencyEnabled: boolean;
  showVatBreakdown: boolean;
  vatMode: "excluded";
};

export type P0CompanySettings = {
  locationMode: "multi-location";
  supportedLocationTypes: ["Merkez", "Şantiye", "Şube", "Ofis"];
};

export type SettingsDisplayRow = {
  label: string;
  value: string;
};

export type SettingsFinancePolicyRow = {
  field: keyof Pick<
    P0FinanceSettings,
    "defaultVatRate" | "multiCurrencyEnabled" | "showVatBreakdown" | "vatMode"
  >;
  p0Behavior: string;
  setting: string;
  value: string;
};

export type SettingsRoleRow = {
  role: "admin" | "accounting" | "viewer";
  scope: string;
  permissions: string;
};

export type SettingsRolePermissionRow = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  canView: boolean;
  resource: string;
  role: SettingsRoleRow["role"];
  specialActions: string;
};

export type SettingsUserTypeRow = {
  description: string;
  permissionLevel: string;
  type: string;
};

export type SettingsUserInvitePolicy = {
  buttonLabel: "Kullanıcı Davet Et";
  expiresInDays: 7;
  helperText: "Davet linki 7 gün geçerlidir";
  requiredFields: ["E-posta", "Rol"];
};

export type SettingsActionRow = {
  label:
    | "Firma Bilgilerini Düzenle"
    | "Finans Ayarlarını Düzenle"
    | "Rol Matrisini Düzenle"
    | "Audit Detayını Aç";
  message: string;
};

export type SettingsPrintAction = {
  label: "Ayarlar Özetini Yazdır";
  message: string;
};

export type P0SettingsContract = {
  actionRows: SettingsActionRow[];
  auditScopes: string[];
  company: P0CompanySettings;
  companyDisplayRows: SettingsDisplayRow[];
  finance: P0FinanceSettings;
  financeDisplayRows: SettingsDisplayRow[];
  financePolicyRows: SettingsFinancePolicyRow[];
  printAction: SettingsPrintAction;
  rolePermissionRows: SettingsRolePermissionRow[];
  roleRows: SettingsRoleRow[];
  userInvitePolicy: SettingsUserInvitePolicy;
  userTypeRows: SettingsUserTypeRow[];
};

const p0CompanySettings: P0CompanySettings = {
  locationMode: "multi-location",
  supportedLocationTypes: ["Merkez", "Şantiye", "Şube", "Ofis"],
};

const p0FinanceSettings: P0FinanceSettings = {
  baseCurrency: "TRY",
  defaultVatRate: 20,
  multiCurrencyEnabled: false,
  showVatBreakdown: true,
  vatMode: "excluded",
};

const p0FinancePolicyRows: SettingsFinancePolicyRow[] = [
  {
    field: "defaultVatRate",
    p0Behavior: "Alış faturası ve hakediş yeni satır varsayımı",
    setting: "Varsayılan KDV Oranı",
    value: `%${p0FinanceSettings.defaultVatRate}`,
  },
  {
    field: "vatMode",
    p0Behavior: "Net tutardan KDV ve genel toplam hesaplanır",
    setting: "KDV Modu",
    value: "KDV hariç",
  },
  {
    field: "showVatBreakdown",
    p0Behavior: "Satır ve özet alanlarında KDV ayrı gösterilir",
    setting: "KDV Dağılımı",
    value: p0FinanceSettings.showVatBreakdown ? "Aktif" : "Kapalı",
  },
  {
    field: "multiCurrencyEnabled",
    p0Behavior: "P0 işlem para birimi TL olarak normalize edilir",
    setting: "Çoklu Döviz",
    value: p0FinanceSettings.multiCurrencyEnabled ? "Aktif" : "P1 için kapalı",
  },
];

const p0RoleRows: SettingsRoleRow[] = [
  {
    role: "admin",
    scope: "Tüm P0 modüller",
    permissions: "Ayar, mutasyon, rapor ve audit okuma",
  },
  {
    role: "accounting",
    scope: "Finans ve operasyon",
    permissions: "Fatura, gider, hakediş, çek, puantaj ve kasa/banka mutasyonları",
  },
  {
    role: "viewer",
    scope: "Salt okuma",
    permissions: "Liste, rapor ve audit görüntüleme",
  },
];

const p0RolePermissionRows: SettingsRolePermissionRow[] = [
  {
    canCreate: true,
    canDelete: true,
    canUpdate: true,
    canView: true,
    resource: "Ayarlar",
    role: "admin",
    specialActions: "audit, users",
  },
  {
    canCreate: true,
    canDelete: false,
    canUpdate: true,
    canView: true,
    resource: "Giderler",
    role: "accounting",
    specialActions: "pay, approve",
  },
  {
    canCreate: false,
    canDelete: false,
    canUpdate: false,
    canView: true,
    resource: "Raporlar",
    role: "viewer",
    specialActions: "-",
  },
];

const p1UserTypeRows: SettingsUserTypeRow[] = [
  {
    description: "Tüm modüller, sistem ayarları",
    permissionLevel: "Tam",
    type: "Admin (Tüm Yetkiler)",
  },
  {
    description: "Rol ekranında elle tanımlanmış izinler",
    permissionLevel: "Granüler",
    type: "Özel (RBAC ile Yönetilen)",
  },
  {
    description: "Atandığı lokasyona ait kayıtlar",
    permissionLevel: "Lokasyon bazlı",
    type: "Kullanıcı (Lokasyona Bağlı)",
  },
  {
    description: "Yalnızca İSG modülü",
    permissionLevel: "Modül bazlı",
    type: "İSG Uzmanı",
  },
  {
    description: "Yalnızca sağlık ve iş kazası kayıtları",
    permissionLevel: "Modül bazlı",
    type: "İşyeri Hekimi",
  },
  {
    description: "Salt okunur, finansal raporlar",
    permissionLevel: "Salt okunur",
    type: "İşveren (Görüntüleme)",
  },
];

const p1UserInvitePolicy: SettingsUserInvitePolicy = {
  buttonLabel: "Kullanıcı Davet Et",
  expiresInDays: 7,
  helperText: "Davet linki 7 gün geçerlidir",
  requiredFields: ["E-posta", "Rol"],
};

const p0AuditScopes = [
  "Fatura oluşturma, kesinleştirme, iptal ve ödeme",
  "Gider kaydı oluşturma ve ödeme hareketi",
  "Hakediş oluşturma, kesinleştirme, iptal ve ödeme/tahsilat",
  "Çek oluşturma ve tahsil",
  "Puantaj oluşturma, kesinleştirme ve iptal",
  "Maaş tahakkuku oluşturma, kesinleştirme, iptal ve ödeme",
  "Tanım kartlarında oluşturma, güncelleme ve pasifleştirme",
];

const p0ActionRows: SettingsActionRow[] = [
  {
    label: "Firma Bilgilerini Düzenle",
    message:
      "Kalıcı firma hukuki ve iletişim profili aşağıdaki panelden yönetilebilir; kapsam etiketi ve lokasyon modu değişmez.",
  },
  {
    label: "Finans Ayarlarını Düzenle",
    message:
      "Kalıcı finans ayarları aşağıdaki panelden yönetilebilir; değişiklikler yalnız yeni finans belgelerine varsayılan olur.",
  },
  {
    label: "Rol Matrisini Düzenle",
    message:
      "Rol matrisi düzenleme P0 kapsamında salt okunur; yetki değişikliği audit ve güvenlik sözleşmesiyle ayrı dilimde açılacaktır.",
  },
  {
    label: "Audit Detayını Aç",
    message:
      "Audit detayı P0 kapsamında özet görünür; filtreli denetim günlüğü ayrı ekranda açılacaktır.",
  },
];

const p0PrintAction: SettingsPrintAction = {
  label: "Ayarlar Özetini Yazdır",
  message: "Yazdırma kapsamı hazır: firma, finans, rol matrisi ve audit kapsamı.",
};

export function getP0SettingsContract(): P0SettingsContract {
  return {
    actionRows: p0ActionRows.map((row) => ({ ...row })),
    auditScopes: [...p0AuditScopes],
    company: {
      ...p0CompanySettings,
      supportedLocationTypes: [...p0CompanySettings.supportedLocationTypes],
    },
    companyDisplayRows: [
      { label: "Lokasyon Modu", value: "Çoklu lokasyon / şantiye bazlı" },
      {
        label: "Desteklenen Tipler",
        value: p0CompanySettings.supportedLocationTypes.join(", "),
      },
      { label: "Değişiklik Politikası", value: "P0'da kilitli" },
    ],
    finance: { ...p0FinanceSettings },
    financeDisplayRows: [
      { label: "Baz Para Birimi", value: p0FinanceSettings.baseCurrency },
      {
        label: "Varsayılan KDV",
        value: `%${p0FinanceSettings.defaultVatRate}`,
      },
      { label: "KDV Modu", value: "KDV hariç" },
      {
        label: "KDV Dağılımı",
        value: p0FinanceSettings.showVatBreakdown
          ? "KDV dağılımı aktif"
          : "KDV dağılımı kapalı",
      },
      {
        label: "Çoklu Döviz",
        value: p0FinanceSettings.multiCurrencyEnabled
          ? "Aktif"
          : "P1 için kapalı",
      },
    ],
    financePolicyRows: p0FinancePolicyRows.map((row) => ({ ...row })),
    printAction: { ...p0PrintAction },
    rolePermissionRows: p0RolePermissionRows.map((row) => ({ ...row })),
    roleRows: p0RoleRows.map((row) => ({ ...row })),
    userInvitePolicy: {
      ...p1UserInvitePolicy,
      requiredFields: [...p1UserInvitePolicy.requiredFields],
    },
    userTypeRows: p1UserTypeRows.map((row) => ({ ...row })),
  };
}

export function getP0DefaultVatRateInputValue(): string {
  return String(p0FinanceSettings.defaultVatRate);
}

export function getP0BaseCurrencyDisplayValue(): P0FinanceSettings["baseCurrency"] {
  return p0FinanceSettings.baseCurrency;
}

export function getP0BaseCurrencyTransactionValue(): "TL" {
  return "TL";
}

export function getP0CurrencyPolicyDisplayValue(): string {
  return p0FinanceSettings.multiCurrencyEnabled
    ? "Çoklu Döviz: Aktif"
    : "Çoklu Döviz: P1 için kapalı";
}

