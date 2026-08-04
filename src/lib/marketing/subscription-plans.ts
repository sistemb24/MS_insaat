/**
 * Statik abonelik planı verileri — marketing sayfaları için.
 *
 * Bu dosya yalnızca saf TypeScript sabitleri içerir; Prisma, app-shell
 * veya server-active-scope import etmez.
 *
 * `MarketingPlan` tipi, `SubscriptionPlan` Prisma modelinin alanlarıyla
 * birebir eşleşir (createdAt/updatedAt sunucu tarafı alanları hariç).
 *
 * ⚠️  Plan ID'leri, fiyatlar ve limitler `src/lib/subscription-seed.ts`
 *     ile birebir uyumlu olmalıdır. Değişiklik yaparken her iki dosyayı
 *     birlikte güncelleyin.
 */

import { formatPublicModuleLabel } from "./public-capabilities";

export type MarketingPlan = {
  /** Prisma model id alanı — subscription-seed.ts ile aynı */
  id: string;
  /** Plan adı (ör. "Başlangıç", "Standart") */
  name: string;
  /** Kısa açıklama metni */
  description: string;
  /** Aylık fiyat (TL). Prisma'da Decimal(18,2); burada number olarak tutulur. */
  monthlyPrice: number;
  /** Dahil edilen modül slug'larının listesi. Prisma'da Json; burada string[]. */
  includedModules: string[];
  /** Maksimum kullanıcı sayısı */
  userLimit: number;
  /** Depolama limiti (GB) */
  storageLimitGb: number;
  /** Fiyatlandırma sayfasındaki sıralama */
  sortOrder: number;
  /** Planın aktif olup olmadığı */
  isActive: boolean;
  /** Günlük API istek limiti (opsiyonel — yalnızca üst planlarda gösterilir) */
  apiRequestsPerDay?: number;
};

/**
 * Plan modelindeki deneme süresi kataloğu. Self-servis kayıt ve ödeme
 * provider'ı etkin olmadığı için bu değer public bir deneme taahhüdü değildir.
 */
export const TRIAL_DAYS = 14;

export const MARKETING_PLANS: MarketingPlan[] = [
  {
    id: "baslangic",
    name: "Başlangıç",
    description: "P0 temel operasyon ve finans başlangıcı.",
    monthlyPrice: 2900,
    includedModules: [
      "Şantiye",
      "Tedarikçi",
      "Kasa/Banka",
      "Gider",
      "Temel Raporlar",
    ],
    userLimit: 5,
    storageLimitGb: 5,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "standart",
    name: "Standart",
    description: "Günlük inşaat operasyonlarının standart kapsamı.",
    monthlyPrice: 5900,
    includedModules: [
      "Başlangıç",
      "Taşeron",
      "Personel/Puantaj",
      "Stok/Depo",
      "Alış/Satış Faturası",
    ],
    userLimit: 10,
    storageLimitGb: 10,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "profesyonel",
    name: "Profesyonel",
    description: "Hakediş, çek, ihale ve merkezi evrak akışları.",
    monthlyPrice: 9900,
    includedModules: [
      "Standart",
      "Hakediş",
      "Çek",
      "İhale",
      "Döküman Merkezi",
      "E-Fatura",
    ],
    userLimit: 25,
    storageLimitGb: 25,
    sortOrder: 3,
    isActive: true,
    apiRequestsPerDay: 1000,
  },
  {
    id: "kurumsal",
    name: "Kurumsal",
    description: "Entegrasyonlar, filo ve gelişmiş analiz kapsamı.",
    monthlyPrice: 16900,
    includedModules: [
      "Profesyonel",
      "Banka Entegrasyonu",
      "Araç/Filo",
      "AI Analiz",
    ],
    userLimit: 75,
    storageLimitGb: 100,
    sortOrder: 4,
    isActive: true,
    apiRequestsPerDay: 10000,
  },
] as const satisfies MarketingPlan[];

export type MarketingComparisonFeature = {
  name: string;
  baslangic: boolean | string;
  standart: boolean | string;
  profesyonel: boolean | string;
  kurumsal: boolean | string;
};

export const MARKETING_COMPARISON_FEATURES = buildMarketingComparisonFeatures(
  MARKETING_PLANS,
);

export function buildMarketingComparisonFeatures(
  plans: readonly MarketingPlan[],
): MarketingComparisonFeature[] {
  const plansByName = new Map(plans.map((plan) => [plan.name, plan]));
  const expandedById = new Map(
    plans.map((plan) => [plan.id, expandModules(plan, plansByName)]),
  );
  const moduleNames = [
    ...new Set(plans.flatMap((plan) => [...expandedById.get(plan.id) ?? []])),
  ];

  const features = moduleNames.map((moduleName) => ({
    name: formatPublicModuleLabel(moduleName),
    baslangic: includesAvailableModule(expandedById, "baslangic", moduleName),
    standart: includesAvailableModule(expandedById, "standart", moduleName),
    profesyonel: includesAvailableModule(expandedById, "profesyonel", moduleName),
    kurumsal: includesAvailableModule(expandedById, "kurumsal", moduleName),
  }));

  return [
    ...features,
    comparisonLimitRow(plans, "API Erişimi", (plan) =>
      plan.apiRequestsPerDay ? `${plan.apiRequestsPerDay.toLocaleString("tr-TR")}/gün` : false,
    ),
    comparisonLimitRow(plans, "Kullanıcı Sayısı", (plan) => String(plan.userLimit)),
    comparisonLimitRow(plans, "Depolama Alanı", (plan) => `${plan.storageLimitGb} GB`),
  ];
}

function expandModules(
  plan: MarketingPlan,
  plansByName: ReadonlyMap<string, MarketingPlan>,
  visited = new Set<string>(),
): Set<string> {
  if (visited.has(plan.id)) return new Set();
  visited.add(plan.id);
  const modules = new Set<string>();

  for (const moduleName of plan.includedModules) {
    const inheritedPlan = plansByName.get(moduleName);
    if (inheritedPlan) {
      for (const inheritedModule of expandModules(inheritedPlan, plansByName, visited)) {
        modules.add(inheritedModule);
      }
    } else {
      modules.add(moduleName);
    }
  }

  return modules;
}

function includesAvailableModule(
  expandedById: ReadonlyMap<string, ReadonlySet<string>>,
  planId: string,
  moduleName: string,
) {
  return moduleName !== "AI Analiz" && Boolean(expandedById.get(planId)?.has(moduleName));
}

function comparisonLimitRow(
  plans: readonly MarketingPlan[],
  name: string,
  value: (plan: MarketingPlan) => boolean | string,
): MarketingComparisonFeature {
  const byId = new Map(plans.map((plan) => [plan.id, value(plan)]));

  return {
    name,
    baslangic: byId.get("baslangic") ?? false,
    standart: byId.get("standart") ?? false,
    profesyonel: byId.get("profesyonel") ?? false,
    kurumsal: byId.get("kurumsal") ?? false,
  };
}
