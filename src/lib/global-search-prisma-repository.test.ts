import { describe, expect, it } from "vitest";

import { listSubscriptionOverview } from "./subscription-service";
import {
  createGlobalSearchPrismaRepository,
  GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  type GlobalSearchPrismaClientLike,
} from "./global-search-prisma-repository";
import { defaultTenantScope, type TenantScope } from "./tenant-scope";

type SearchCall = {
  input: {
    orderBy?: unknown;
    select?: Record<string, boolean>;
    take?: number;
    where?: Record<string, unknown>;
  };
  source: string;
};

type FakeRow = Record<string, unknown> & {
  companyId: string;
  periodId: string;
  tenantId: string;
};

type FakeSourceName =
  | "entityRecord"
  | "purchaseInvoice"
  | "salesInvoice"
  | "cheque"
  | "tender"
  | "progressPayment"
  | "constructionProject"
  | "vehicle";

const activeOverview = (planId: "baslangic" | "kurumsal" = "kurumsal") =>
  listSubscriptionOverview({
    currentSubscription: {
      autoRenew: false,
      billingCycle: "monthly",
      endsAt: "2026-12-31",
      planId,
      planName: planId === "kurumsal" ? "Kurumsal" : "Başlangıç",
      renewalAmount: planId === "kurumsal" ? 16900 : 2900,
      startsAt: "2026-01-01",
      storageLimitGb: planId === "kurumsal" ? 100 : 5,
      subscriptionId: `subscription-${planId}`,
      userLimit: planId === "kurumsal" ? 75 : 5,
    },
  });

const scoped = <T extends Record<string, unknown>>(row: T): T & FakeRow => ({
  tenantId: defaultTenantScope.tenantId,
  companyId: defaultTenantScope.companyId,
  periodId: defaultTenantScope.periodId,
  ...row,
});

describe("global search Prisma repository", () => {
  it("does not touch Prisma when the query is outside domain boundaries", async () => {
    const fake = createFakePrisma();
    const repository = createGlobalSearchPrismaRepository(fake.client);

    await expect(
      repository.search({
        query: "a",
        scope: defaultTenantScope,
        subscriptionOverview: activeOverview(),
        today: "2026-07-22",
      }),
    ).resolves.toEqual({
      valid: false,
      query: "a",
      reason: "too-short",
    });
    expect(fake.calls).toHaveLength(0);
  });

  it("federates every approved source inside the exact active scope", async () => {
    const fake = createFakePrisma({
      entityRecord: [
        scoped({
          id: "entity-atlas",
          slug: "santiyeler",
          code: "SANT-0001",
          data: {
            name: "Atlas Şantiyesi",
            responsible: "Ayşe Demir",
            status: "Aktif",
            apiSecret: "never-return-this",
          },
        }),
        {
          ...scoped({
            id: "entity-other-scope",
            slug: "santiyeler",
            code: "SANT-9999",
            data: { name: "Atlas Başka Tenant", status: "Aktif" },
          }),
          tenantId: "tenant-other",
        },
      ],
      purchaseInvoice: [scoped(invoiceRow("purchase-atlas", "AF-ATLAS-001"))],
      salesInvoice: [scoped(invoiceRow("sales-atlas", "SF-ATLAS-001"))],
      cheque: [
        scoped({
          id: "cheque-atlas",
          documentNo: "CEK-ATLAS-001",
          checkNo: "CHK-001",
          drawerName: "Atlas Yapı",
          bankName: "VakıfBank",
          branchName: "Merkez",
          description: "Teminat çeki",
          status: "Portföyde",
        }),
      ],
      tender: [
        scoped({
          id: "tender-atlas",
          tenderNo: "IHL-ATLAS-001",
          ikn: "2026/ATLAS",
          title: "Atlas Hastane İhalesi",
          authorityName: "Sağlık İdaresi",
          city: "Ankara",
          description: "Anahtar teslim",
          status: "Hazırlanıyor",
        }),
      ],
      progressPayment: [
        scoped({
          id: "payment-atlas",
          documentNo: "HAK-ATLAS-001",
          counterpartyCode: "TAS-001",
          counterpartyName: "Atlas Taahhüt",
          siteCode: "SANT-001",
          siteName: "Atlas Şantiyesi",
          description: "Birinci hakediş",
          status: "Kaydedildi",
        }),
      ],
      constructionProject: [
        scoped({
          id: "project-atlas",
          code: "PRJ-ATLAS-001",
          name: "Atlas Hakediş Projesi",
          siteCode: "SANT-001",
          siteName: "Atlas Şantiyesi",
          contractNo: "SZL-ATLAS",
          counterpartyCode: "TAS-001",
          counterpartyName: "Atlas Taahhüt",
          status: "OPEN",
        }),
      ],
      vehicle: [
        scoped({
          id: "vehicle-atlas",
          plate: "06 ATL 001",
          brand: "Atlas",
          modelName: "Kamyon",
          vehicleType: "Ağır Vasıta",
          siteCode: "SANT-001",
          siteName: "Atlas Şantiyesi",
          status: "Aktif",
        }),
      ],
    });
    const repository = createGlobalSearchPrismaRepository(fake.client);
    const viewerScope: TenantScope = {
      ...defaultTenantScope,
      userRole: "viewer",
    };

    const result = await repository.search({
      query: "atlas",
      scope: viewerScope,
      subscriptionOverview: activeOverview(),
      today: "2026-07-22",
    });

    expect(result).toMatchObject({
      query: "atlas",
      truncated: false,
    });
    expect("results" in result ? result.results.map((row) => row.type) : []).toEqual([
      "cheque",
      "construction-project",
      "entity",
      "progress-payment",
      "purchase-invoice",
      "sales-invoice",
      "tender",
      "vehicle",
    ]);
    expect(JSON.stringify(result)).not.toContain("never-return-this");
    expect(JSON.stringify(result)).not.toContain("entity-other-scope");
    if ("results" in result) {
      expect(result.results.find((row) => row.type === "cheque")?.href).toBe(
        "/cek?ara=CEK-ATLAS-001&kayit=cheque-atlas",
      );
      expect(result.results.find((row) => row.type === "tender")?.href).toBe(
        "/ihale-yonetimi?ara=IHL-ATLAS-001&kayit=tender-atlas",
      );
      expect(
        result.results.find((row) => row.type === "purchase-invoice")?.href,
      ).toBe("/faturalar?ara=AF-ATLAS-001&kayit=purchase-atlas");
      expect(
        result.results.find((row) => row.type === "construction-project")?.href,
      ).toBe("/hakedis");
    }
    expect(fake.calls).toHaveLength(14);

    for (const call of fake.calls) {
      expect(call.input.where).toMatchObject({
        tenantId: defaultTenantScope.tenantId,
        companyId: defaultTenantScope.companyId,
        periodId: defaultTenantScope.periodId,
      });
      expect(call.input.take).toBe(GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT);
    }

    const invoiceCall = fake.calls.find(
      (call) => call.source === "purchaseInvoice",
    );
    expect(invoiceCall?.input.select).toEqual({
      counterpartyCode: true,
      counterpartyName: true,
      description: true,
      documentNo: true,
      id: true,
      siteCode: true,
      siteName: true,
      status: true,
    });
  });

  it("fails closed for guarded routes that the subscription cannot access", async () => {
    const fake = createFakePrisma({
      entityRecord: [
        scoped({
          id: "entity-atlas",
          slug: "santiyeler",
          code: "SANT-001",
          data: { name: "Atlas Şantiyesi", status: "Aktif" },
        }),
      ],
      purchaseInvoice: [scoped(invoiceRow("purchase-atlas", "AF-ATLAS"))],
      cheque: [
        scoped({
          id: "cheque-atlas",
          documentNo: "CEK-ATLAS",
          checkNo: "CHK-ATLAS",
          drawerName: "Atlas",
          bankName: "Banka",
          branchName: null,
          description: null,
          status: "Portföyde",
        }),
      ],
    });
    const repository = createGlobalSearchPrismaRepository(fake.client);

    const result = await repository.search({
      query: "atlas",
      scope: defaultTenantScope,
      subscriptionOverview: activeOverview("baslangic"),
      today: "2026-07-22",
    });

    expect("results" in result ? result.results.map((row) => row.type) : []).toEqual([
      "entity",
      "purchase-invoice",
    ]);
    expect(fake.calls.map((call) => call.source)).not.toEqual(
      expect.arrayContaining([
        "cheque",
        "tender",
        "progressPayment",
        "constructionProject",
        "vehicle",
      ]),
    );
    expect(fake.calls).toHaveLength(9);

    const navigationResult = await repository.search({
      query: "araçlar",
      scope: defaultTenantScope,
      subscriptionOverview: activeOverview("baslangic"),
      today: "2026-07-22",
    });
    expect("results" in navigationResult ? navigationResult.results : []).toEqual([]);
  });

  it("searches only whitelisted EntityRecord JSON keys", async () => {
    const fake = createFakePrisma({
      entityRecord: [
        scoped({
          id: "personnel-sensitive",
          slug: "personel",
          code: "PER-001",
          data: {
            name: "Normal Personel",
            role: "Usta",
            site: "Merkez",
            status: "Aktif",
            salary: "GIZLI-999",
            apiSecret: "GIZLI-999",
          },
        }),
      ],
    });
    const repository = createGlobalSearchPrismaRepository(fake.client);

    const result = await repository.search({
      query: "gizli-999",
      scope: defaultTenantScope,
      subscriptionOverview: activeOverview(),
      today: "2026-07-22",
    });

    expect("results" in result ? result.results : []).toEqual([]);
    const personnelCall = fake.calls.find(
      (call) => call.source === "entityRecord" && call.input.where?.slug === "personel",
    );
    expect(JSON.stringify(personnelCall?.input.where)).not.toContain("salary");
    expect(JSON.stringify(personnelCall?.input.where)).not.toContain("apiSecret");
  });

  it("rejects an unexpected runtime role before starting source reads", async () => {
    const fake = createFakePrisma();
    const repository = createGlobalSearchPrismaRepository(fake.client);
    const invalidScope = {
      ...defaultTenantScope,
      userRole: "owner",
    } as unknown as TenantScope;

    await expect(
      repository.search({
        query: "atlas",
        scope: invalidScope,
        subscriptionOverview: activeOverview(),
        today: "2026-07-22",
      }),
    ).rejects.toThrow("GLOBAL_SEARCH_ACCESS_DENIED");
    expect(fake.calls).toHaveLength(0);
  });

  it("propagates one source failure instead of returning partial results", async () => {
    const fake = createFakePrisma({ failSource: "tender" });
    const repository = createGlobalSearchPrismaRepository(fake.client);

    await expect(
      repository.search({
        query: "atlas",
        scope: defaultTenantScope,
        subscriptionOverview: activeOverview(),
        today: "2026-07-22",
      }),
    ).rejects.toThrow("TENDER_SOURCE_FAILED");
    expect(fake.calls.map((call) => call.source)).toContain("tender");
  });
});

function invoiceRow(id: string, documentNo: string) {
  return {
    id,
    documentNo,
    counterpartyCode: "CAR-ATLAS",
    counterpartyName: "Atlas Yapı",
    siteCode: "SANT-001",
    siteName: "Atlas Şantiyesi",
    description: "Atlas açıklaması",
    status: "Kaydedildi",
  };
}

function createFakePrisma(
  options: Partial<Record<FakeSourceName, FakeRow[]>> & {
    failSource?: FakeSourceName;
  } = {},
) {
  const calls: SearchCall[] = [];
  const sources = [
    "entityRecord",
    "purchaseInvoice",
    "salesInvoice",
    "cheque",
    "tender",
    "progressPayment",
    "constructionProject",
    "vehicle",
  ] as const satisfies readonly FakeSourceName[];
  const client = Object.fromEntries(
    sources.map((source) => [
      source,
      {
        async findMany(input: SearchCall["input"]) {
          calls.push({ input, source });

          if (options.failSource === source) {
            throw new Error(`${source.toUpperCase()}_SOURCE_FAILED`);
          }

          const where = input.where ?? {};
          const rows = options[source] ?? [];

          return rows.filter(
            (row) =>
              row.tenantId === where.tenantId &&
              row.companyId === where.companyId &&
              row.periodId === where.periodId &&
              (typeof where.slug !== "string" || row.slug === where.slug),
          );
        },
      },
    ]),
  ) as unknown as GlobalSearchPrismaClientLike;

  return { calls, client };
}
