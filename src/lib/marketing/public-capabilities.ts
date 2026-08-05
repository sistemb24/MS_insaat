export type PublicCapabilityKey =
  | "contact-delivery"
  | "newsletter-subscription"
  | "password-recovery"
  | "self-service-registration";

export type PublicCapabilityState = {
  available: false;
  description: string;
  label: string;
};

export const PUBLIC_CAPABILITIES = {
  "contact-delivery": {
    available: false,
    description:
      "İletişim teslimat sağlayıcısı henüz yapılandırılmadı. Bu sayfa mesaj veya kişisel veri kaydetmez.",
    label: "İletişim formu kullanılamıyor",
  },
  "newsletter-subscription": {
    available: false,
    description:
      "Bülten abonelik ve onay altyapısı henüz yapılandırılmadı. E-posta adresi toplanmıyor.",
    label: "Bülten aboneliği kullanılamıyor",
  },
  "password-recovery": {
    available: false,
    description:
      "E-posta teslimat sağlayıcısı olmadan parola sıfırlama bağlantısı gönderilmez veya token üretilmez.",
    label: "Parola kurtarma kullanılamıyor",
  },
  "self-service-registration": {
    available: false,
    description:
      "Self-servis tenant kaydı ve doğrulama teslimatı henüz etkin değildir. Bu sayfa hesap veya deneme aboneliği oluşturmaz.",
    label: "Yeni hesap kaydı kullanılamıyor",
  },
} as const satisfies Record<PublicCapabilityKey, PublicCapabilityState>;

export function getPublicCapability(key: PublicCapabilityKey) {
  return PUBLIC_CAPABILITIES[key];
}

const PUBLIC_MODULE_LABELS: Record<string, string> = {
  "AI Analiz": "AI Analiz (etkin değil)",
  "Araç/Filo": "Araç/Filo (manual + sandbox)",
  "Banka Entegrasyonu": "Banka eşleştirme (sandbox)",
  "E-Fatura": "E-Fatura çekirdeği (provider bekliyor)",
};

export function formatPublicModuleLabel(moduleLabel: string) {
  return PUBLIC_MODULE_LABELS[moduleLabel] ?? moduleLabel;
}
