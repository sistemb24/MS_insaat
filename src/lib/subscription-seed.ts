import type { TenantScope } from "./tenant-scope";

type SubscriptionSeedPrismaClientLike = {
  subscriptionPlan: {
    upsert(input: unknown): Promise<unknown>;
  };
  tenantSubscription: {
    upsert(input: unknown): Promise<unknown>;
  };
};

const subscriptionPlans = [
  {
    id: "baslangic",
    name: "Başlangıç",
    description: "P0 temel operasyon ve finans başlangıcı",
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
  },
  {
    id: "standart",
    name: "Standart",
    description: "Günlük inşaat operasyonlarının standart kapsamı",
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
  },
  {
    id: "profesyonel",
    name: "Profesyonel",
    description: "Hakediş, çek, ihale ve merkezi evrak akışları",
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
  },
  {
    id: "kurumsal",
    name: "Kurumsal",
    description: "Entegrasyonlar, filo ve gelişmiş analiz kapsamı",
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
  },
];

const companySubscriptions: Record<string, { planId: string; scope: TenantScope }> = {
  "company-demo-insaat": { planId: "kurumsal", scope: null! },
  "company-akdeniz-insaat": { planId: "kurumsal", scope: null! },
  "company-anadolu-insaat": { planId: "kurumsal", scope: null! },
};

export async function seedSubscriptionPlans({
  prisma,
}: {
  prisma: SubscriptionSeedPrismaClientLike;
}) {
  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
  }

  return {
    seeded: subscriptionPlans.length,
    planIds: subscriptionPlans.map((p) => p.id),
  };
}

export async function seedTenantSubscriptions({
  prisma,
  scopes,
}: {
  prisma: SubscriptionSeedPrismaClientLike;
  scopes: TenantScope[];
}) {
  let seeded = 0;

  for (const scope of scopes) {
    const config = companySubscriptions[scope.companyId];
    if (!config) continue;

    const startsAt = new Date("2026-01-01T00:00:00Z");
    const endsAt = new Date("2026-12-31T23:59:59Z");
    const plan = subscriptionPlans.find((p) => p.id === config.planId)!;
    const renewalAmount = plan.monthlyPrice * 12;
    const subscriptionId = `sub-${scope.companyId}`;

    await prisma.tenantSubscription.upsert({
      where: { id: subscriptionId },
      create: {
        id: subscriptionId,
        tenantId: scope.tenantId,
        companyId: scope.companyId,
        periodId: scope.periodId,
        planId: config.planId,
        billingCycle: "yearly",
        startsAt,
        endsAt,
        renewalAmount,
        autoRenew: true,
        userLimit: plan.userLimit,
        storageLimitGb: plan.storageLimitGb,
        status: "active",
        createdBy: scope.userId,
        updatedBy: scope.userId,
      },
      update: {
        planId: config.planId,
        billingCycle: "yearly",
        startsAt,
        endsAt,
        renewalAmount,
        autoRenew: true,
        userLimit: plan.userLimit,
        storageLimitGb: plan.storageLimitGb,
        status: "active",
        updatedBy: scope.userId,
      },
    });

    seeded++;
  }

  return { seeded };
}
