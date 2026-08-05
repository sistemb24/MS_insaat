import type { PrismaClient } from "@prisma/client";

import {
  buildGlobalSearchDeepLink,
  buildGlobalSearchResponse,
  createNavigationSearchCandidates,
  prepareGlobalSearchQuery,
  type GlobalSearchCandidate,
  type GlobalSearchQueryValidation,
  type GlobalSearchResponse,
} from "./global-search-domain";
import {
  findSubscriptionRouteAccessRow,
  getSubscriptionFeatureKeyForRoute,
} from "./subscription-route-guard";
import type { SubscriptionOverview } from "./subscription-service";
import type { TenantScope, TenantUserRole } from "./tenant-scope";

export const GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT = 24;

type SearchModelName =
  | "entityRecord"
  | "purchaseInvoice"
  | "salesInvoice"
  | "cheque"
  | "tender"
  | "progressPayment"
  | "constructionProject"
  | "vehicle";

export type GlobalSearchPrismaClientLike = Pick<PrismaClient, SearchModelName>;

export type GlobalSearchRepositoryInput = {
  query: string;
  scope: TenantScope;
  subscriptionOverview: SubscriptionOverview;
  today?: string;
};

export type GlobalSearchRepositoryResult =
  | GlobalSearchResponse
  | Exclude<GlobalSearchQueryValidation, { valid: true }>;

export type GlobalSearchRepository = {
  search(input: GlobalSearchRepositoryInput): Promise<GlobalSearchRepositoryResult>;
};

type EntitySearchConfig = {
  dataKeys: readonly string[];
  group: string;
  route: string;
  slug: string;
  subtitleKeys: readonly string[];
};

const entitySearchConfigs: readonly EntitySearchConfig[] = [
  {
    slug: "santiyeler",
    group: "Şantiyeler",
    route: "/santiyeler",
    dataKeys: ["name", "responsible", "status"],
    subtitleKeys: ["responsible"],
  },
  {
    slug: "musteriler",
    group: "Müşteriler",
    route: "/musteriler",
    dataKeys: ["name", "customerType", "status"],
    subtitleKeys: ["customerType"],
  },
  {
    slug: "tedarikciler",
    group: "Tedarikçiler",
    route: "/tedarikciler",
    dataKeys: ["name", "category", "status"],
    subtitleKeys: ["category"],
  },
  {
    slug: "taseronlar",
    group: "Taşeronlar",
    route: "/taseronlar",
    dataKeys: ["name", "responsible", "contractNo", "status"],
    subtitleKeys: ["responsible", "contractNo"],
  },
  {
    slug: "personel",
    group: "Personel",
    route: "/personel",
    dataKeys: ["name", "role", "site", "status"],
    subtitleKeys: ["role", "site"],
  },
  {
    slug: "kasa-banka",
    group: "Kasa/Banka Hesapları",
    route: "/kasa-banka",
    dataKeys: ["name", "type", "currency", "status"],
    subtitleKeys: ["type", "currency"],
  },
  {
    slug: "stok-kartlari",
    group: "Stok Kartları",
    route: "/stok-depo",
    dataKeys: [
      "name",
      "group",
      "manufacturer",
      "unit",
      "defaultWarehouse",
      "status",
    ],
    subtitleKeys: ["group", "manufacturer", "defaultWarehouse"],
  },
] as const;

export const GLOBAL_SEARCH_ENTITY_SLUGS = entitySearchConfigs.map(
  (config) => config.slug,
);

const allowedSearchRoles: readonly TenantUserRole[] = [
  "admin",
  "accounting",
  "viewer",
];

export function createGlobalSearchPrismaRepository(
  prisma: GlobalSearchPrismaClientLike,
): GlobalSearchRepository {
  return {
    async search(input) {
      const preparedQuery = prepareGlobalSearchQuery(input.query);

      if (!preparedQuery.valid) {
        return preparedQuery;
      }

      if (!allowedSearchRoles.includes(input.scope.userRole)) {
        throw new Error("GLOBAL_SEARCH_ACCESS_DENIED");
      }

      const canAccessRoute = (route: string) =>
        isRouteAccessible(
          input.subscriptionOverview,
          routeSlugFromHref(route),
          input.today,
        );
      const navigationCandidates = createNavigationSearchCandidates().filter(
        (candidate) => canAccessRoute(candidate.href),
      );
      const query = preparedQuery.query.normalize("NFKC");
      const sourceTasks: Array<Promise<GlobalSearchCandidate[]>> =
        entitySearchConfigs.map((config) =>
          searchEntityRecords(prisma, input.scope, query, config),
        );

      sourceTasks.push(
        searchPurchaseInvoices(prisma, input.scope, query),
        searchSalesInvoices(prisma, input.scope, query),
      );

      if (canAccessRoute("/cek")) {
        sourceTasks.push(searchCheques(prisma, input.scope, query));
      }

      if (canAccessRoute("/ihale-yonetimi")) {
        sourceTasks.push(searchTenders(prisma, input.scope, query));
      }

      if (canAccessRoute("/hakedis")) {
        sourceTasks.push(
          searchProgressPayments(prisma, input.scope, query),
          searchConstructionProjects(prisma, input.scope, query),
        );
      }

      if (canAccessRoute("/araclar")) {
        sourceTasks.push(searchVehicles(prisma, input.scope, query));
      }

      const sourceCandidates = (await Promise.all(sourceTasks)).flat();

      return buildGlobalSearchResponse(preparedQuery, [
        ...navigationCandidates,
        ...sourceCandidates,
      ]);
    },
  };
}

async function searchEntityRecords(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
  config: EntitySearchConfig,
) {
  const rows = await prisma.entityRecord.findMany({
    where: {
      ...scopeWhere(scope),
      slug: config.slug,
      OR: [
        { code: contains(query) },
        ...config.dataKeys.map((key) => ({
          data: {
            path: [key],
            mode: "insensitive" as const,
            string_contains: query,
          },
        })),
      ],
    },
    select: {
      code: true,
      data: true,
      id: true,
      slug: true,
    },
    orderBy: { code: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map<GlobalSearchCandidate>((row) => {
    const data = readJsonObject(row.data);
    const secondary = joinSearchText(
      config.subtitleKeys.map((key) => data[key] ?? ""),
    );

    return {
      id: row.id,
      type: "entity",
      group: config.group,
      code: row.code,
      title: data.name || row.code,
      ...(secondary ? { subtitle: secondary } : {}),
      ...(data.status ? { status: data.status } : {}),
      href: config.route,
      searchTerms: {
        codes: [row.code],
        titles: [data.name],
        secondary: config.dataKeys
          .filter((key) => key !== "name" && key !== "status")
          .map((key) => data[key] ?? ""),
        modules: [config.group],
      },
    };
  });
}

async function searchPurchaseInvoices(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
) {
  const rows = await prisma.purchaseInvoice.findMany({
    where: {
      ...scopeWhere(scope),
      OR: invoiceSearchWhere(query),
    },
    select: invoiceSelect(),
    orderBy: { documentNo: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map((row) => invoiceCandidate(row, "purchase-invoice"));
}

async function searchSalesInvoices(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
) {
  const rows = await prisma.salesInvoice.findMany({
    where: {
      ...scopeWhere(scope),
      OR: invoiceSearchWhere(query),
    },
    select: invoiceSelect(),
    orderBy: { documentNo: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map((row) => invoiceCandidate(row, "sales-invoice"));
}

async function searchCheques(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
) {
  const rows = await prisma.cheque.findMany({
    where: {
      ...scopeWhere(scope),
      OR: [
        { documentNo: contains(query) },
        { checkNo: contains(query) },
        { drawerName: contains(query) },
        { bankName: contains(query) },
        { branchName: contains(query) },
        { description: contains(query) },
      ],
    },
    select: {
      bankName: true,
      branchName: true,
      checkNo: true,
      description: true,
      documentNo: true,
      drawerName: true,
      id: true,
      status: true,
    },
    orderBy: { documentNo: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map<GlobalSearchCandidate>((row) => ({
    id: row.id,
    type: "cheque",
    group: "Çekler",
    code: row.documentNo,
    title: row.drawerName,
    subtitle: joinSearchText([
      row.checkNo,
      row.bankName,
      row.branchName,
      row.description,
    ]),
    status: row.status,
    href: buildGlobalSearchDeepLink("/cek", row.documentNo, row.id),
    searchTerms: {
      codes: [row.documentNo, row.checkNo],
      titles: [row.drawerName],
      secondary: [row.bankName, row.branchName ?? "", row.description ?? ""],
      modules: ["Çekler"],
    },
  }));
}

async function searchTenders(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
) {
  const rows = await prisma.tender.findMany({
    where: {
      ...scopeWhere(scope),
      OR: [
        { tenderNo: contains(query) },
        { ikn: contains(query) },
        { title: contains(query) },
        { authorityName: contains(query) },
        { city: contains(query) },
        { description: contains(query) },
      ],
    },
    select: {
      authorityName: true,
      city: true,
      description: true,
      id: true,
      ikn: true,
      status: true,
      tenderNo: true,
      title: true,
    },
    orderBy: { tenderNo: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map<GlobalSearchCandidate>((row) => ({
    id: row.id,
    type: "tender",
    group: "İhaleler",
    code: row.tenderNo,
    title: row.title,
    subtitle: joinSearchText([row.ikn, row.authorityName, row.city, row.description]),
    status: row.status,
    href: buildGlobalSearchDeepLink(
      "/ihale-yonetimi",
      row.tenderNo,
      row.id,
    ),
    searchTerms: {
      codes: [row.tenderNo, row.ikn],
      titles: [row.title],
      secondary: [row.authorityName, row.city ?? "", row.description ?? ""],
      modules: ["İhaleler", "İhale Yönetimi"],
    },
  }));
}

async function searchProgressPayments(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
) {
  const rows = await prisma.progressPayment.findMany({
    where: {
      ...scopeWhere(scope),
      OR: [
        { documentNo: contains(query) },
        { counterpartyCode: contains(query) },
        { counterpartyName: contains(query) },
        { siteCode: contains(query) },
        { siteName: contains(query) },
        { description: contains(query) },
      ],
    },
    select: {
      counterpartyCode: true,
      counterpartyName: true,
      description: true,
      documentNo: true,
      id: true,
      siteCode: true,
      siteName: true,
      status: true,
    },
    orderBy: { documentNo: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map<GlobalSearchCandidate>((row) => ({
    id: row.id,
    type: "progress-payment",
    group: "Hakedişler",
    code: row.documentNo,
    title: row.counterpartyName,
    subtitle: joinSearchText([
      row.counterpartyCode,
      row.siteCode,
      row.siteName,
      row.description,
    ]),
    status: row.status,
    href: "/hakedis",
    searchTerms: {
      codes: [row.documentNo],
      titles: [row.counterpartyName],
      secondary: [
        row.counterpartyCode,
        row.siteCode,
        row.siteName,
        row.description ?? "",
      ],
      modules: ["Hakedişler", "Hakediş"],
    },
  }));
}

async function searchConstructionProjects(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
) {
  const rows = await prisma.constructionProject.findMany({
    where: {
      ...scopeWhere(scope),
      OR: [
        { code: contains(query) },
        { name: contains(query) },
        { siteCode: contains(query) },
        { siteName: contains(query) },
        { contractNo: contains(query) },
        { counterpartyCode: contains(query) },
        { counterpartyName: contains(query) },
      ],
    },
    select: {
      code: true,
      contractNo: true,
      counterpartyCode: true,
      counterpartyName: true,
      id: true,
      name: true,
      siteCode: true,
      siteName: true,
      status: true,
    },
    orderBy: { code: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map<GlobalSearchCandidate>((row) => ({
    id: row.id,
    type: "construction-project",
    group: "Hakediş Pro Projeleri",
    code: row.code,
    title: row.name,
    subtitle: joinSearchText([
      row.contractNo,
      row.siteCode,
      row.siteName,
      row.counterpartyCode,
      row.counterpartyName,
    ]),
    status: row.status,
    href: "/hakedis",
    searchTerms: {
      codes: [row.code, row.contractNo ?? ""],
      titles: [row.name],
      secondary: [
        row.siteCode,
        row.siteName,
        row.counterpartyCode ?? "",
        row.counterpartyName ?? "",
      ],
      modules: ["Hakediş Pro Projeleri", "Hakediş"],
    },
  }));
}

async function searchVehicles(
  prisma: GlobalSearchPrismaClientLike,
  scope: TenantScope,
  query: string,
) {
  const rows = await prisma.vehicle.findMany({
    where: {
      ...scopeWhere(scope),
      OR: [
        { plate: contains(query) },
        { brand: contains(query) },
        { modelName: contains(query) },
        { siteCode: contains(query) },
        { siteName: contains(query) },
        { vehicleType: contains(query) },
      ],
    },
    select: {
      brand: true,
      id: true,
      modelName: true,
      plate: true,
      siteCode: true,
      siteName: true,
      status: true,
      vehicleType: true,
    },
    orderBy: { plate: "asc" },
    take: GLOBAL_SEARCH_SOURCE_CANDIDATE_LIMIT,
  });

  return rows.map<GlobalSearchCandidate>((row) => ({
    id: row.id,
    type: "vehicle",
    group: "Araçlar",
    code: row.plate,
    title: joinSearchText([row.brand, row.modelName]) || row.plate,
    subtitle: joinSearchText([row.vehicleType, row.siteCode, row.siteName]),
    status: row.status,
    href: "/araclar",
    searchTerms: {
      codes: [row.plate],
      titles: [joinSearchText([row.brand, row.modelName])],
      secondary: [row.vehicleType, row.siteCode ?? "", row.siteName],
      modules: ["Araçlar"],
    },
  }));
}

type InvoiceSearchRow = {
  counterpartyCode: string;
  counterpartyName: string;
  description: string | null;
  documentNo: string;
  id: string;
  siteCode: string;
  siteName: string;
  status: string;
};

function invoiceCandidate(
  row: InvoiceSearchRow,
  type: "purchase-invoice" | "sales-invoice",
): GlobalSearchCandidate {
  const isPurchase = type === "purchase-invoice";

  return {
    id: row.id,
    type,
    group: isPurchase ? "Alış Faturaları" : "Satış Faturaları",
    code: row.documentNo,
    title: row.counterpartyName,
    subtitle: joinSearchText([
      row.counterpartyCode,
      row.siteCode,
      row.siteName,
      row.description,
    ]),
    status: row.status,
    href: buildGlobalSearchDeepLink("/faturalar", row.documentNo, row.id),
    searchTerms: {
      codes: [row.documentNo],
      titles: [row.counterpartyName],
      secondary: [
        row.counterpartyCode,
        row.siteCode,
        row.siteName,
        row.description ?? "",
      ],
      modules: [isPurchase ? "Alış Faturaları" : "Satış Faturaları", "Faturalar"],
    },
  };
}

function invoiceSearchWhere(query: string) {
  return [
    { documentNo: contains(query) },
    { counterpartyCode: contains(query) },
    { counterpartyName: contains(query) },
    { siteCode: contains(query) },
    { siteName: contains(query) },
    { description: contains(query) },
  ];
}

function invoiceSelect() {
  return {
    counterpartyCode: true,
    counterpartyName: true,
    description: true,
    documentNo: true,
    id: true,
    siteCode: true,
    siteName: true,
    status: true,
  } as const;
}

function scopeWhere(scope: TenantScope) {
  return {
    tenantId: scope.tenantId,
    companyId: scope.companyId,
    periodId: scope.periodId,
  };
}

function contains(query: string) {
  return {
    contains: query,
    mode: "insensitive" as const,
  };
}

function isRouteAccessible(
  overview: SubscriptionOverview,
  routeSlug: string,
  today?: string,
) {
  if (!getSubscriptionFeatureKeyForRoute(routeSlug)) {
    return true;
  }

  return findSubscriptionRouteAccessRow(overview, routeSlug, today)?.enabled ?? false;
}

function routeSlugFromHref(href: string) {
  return href.split("?", 1)[0].replace(/^\//, "");
}

function readJsonObject(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, String(item ?? "")]),
  );
}

function joinSearchText(values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(" · ");
}
