import {
  navigationItems,
  type NavigationItem,
} from "./navigation";

export const GLOBAL_SEARCH_MIN_QUERY_LENGTH = 2;
export const GLOBAL_SEARCH_MAX_QUERY_LENGTH = 80;
export const GLOBAL_SEARCH_MAX_RESULTS = 24;
export const GLOBAL_SEARCH_MAX_RESULTS_PER_GROUP = 4;

export type GlobalSearchResultType =
  | "navigation"
  | "entity"
  | "purchase-invoice"
  | "sales-invoice"
  | "cheque"
  | "tender"
  | "progress-payment"
  | "construction-project"
  | "vehicle";

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  group: string;
  code: string;
  title: string;
  subtitle?: string;
  status?: string;
  href: string;
  score: number;
};

export type GlobalSearchResponse = {
  query: string;
  results: GlobalSearchResult[];
  truncated: boolean;
};

export type GlobalSearchCandidate = Omit<GlobalSearchResult, "score"> & {
  searchTerms?: {
    codes?: readonly string[];
    titles?: readonly string[];
    secondary?: readonly string[];
    modules?: readonly string[];
  };
};

export type PreparedGlobalSearchQuery = {
  valid: true;
  query: string;
  normalizedQuery: string;
};

export type InvalidGlobalSearchQuery = {
  valid: false;
  query: string;
  reason: "too-short" | "too-long";
};

export type GlobalSearchQueryValidation =
  | PreparedGlobalSearchQuery
  | InvalidGlobalSearchQuery;

const rankingScores = {
  exactCode: 100,
  codePrefix: 80,
  exactTitle: 70,
  exactModule: 60,
  titlePrefix: 55,
  modulePrefix: 45,
  textContains: 30,
  moduleContains: 20,
} as const;

export function normalizeGlobalSearchText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

export function toPlainGlobalSearchText(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildGlobalSearchDeepLink(
  route: string,
  searchText: string,
  recordId: string,
) {
  if (!isSafeInternalHref(route)) {
    return route;
  }

  const safeSearchText = toPlainGlobalSearchText(searchText).slice(
    0,
    GLOBAL_SEARCH_MAX_QUERY_LENGTH,
  );
  const safeRecordId = toPlainGlobalSearchText(recordId).slice(0, 128);

  if (!safeSearchText || !safeRecordId) {
    return route;
  }

  const params = new URLSearchParams({
    ara: safeSearchText,
    kayit: safeRecordId,
  });

  return `${route}?${params.toString()}`;
}

export function parseGlobalSearchDeepLinkParams(input: {
  ara?: string | string[];
  kayit?: string | string[];
}) {
  const rawQuery = Array.isArray(input.ara) ? input.ara[0] : input.ara;
  const rawRecordId = Array.isArray(input.kayit) ? input.kayit[0] : input.kayit;
  const query = prepareGlobalSearchQuery(rawQuery ?? "");
  const recordId = toPlainGlobalSearchText(rawRecordId ?? "").slice(0, 128);

  if (!query.valid || !recordId) {
    return undefined;
  }

  return {
    query: query.query,
    recordId,
  };
}

export function prepareGlobalSearchQuery(
  rawQuery: string,
): GlobalSearchQueryValidation {
  const query = rawQuery.trim();
  const length = Array.from(query).length;

  if (length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) {
    return { valid: false, query, reason: "too-short" };
  }

  if (length > GLOBAL_SEARCH_MAX_QUERY_LENGTH) {
    return { valid: false, query, reason: "too-long" };
  }

  return {
    valid: true,
    query,
    normalizedQuery: normalizeGlobalSearchText(query),
  };
}

export function rankGlobalSearchCandidate(
  candidate: GlobalSearchCandidate,
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return 0;
  }

  const terms = candidate.searchTerms;
  const codeTerms = terms?.codes ?? [candidate.code];
  const titleTerms = terms?.titles ?? [candidate.title];
  const secondaryTerms = terms?.secondary ??
    (candidate.subtitle ? [candidate.subtitle] : []);
  const moduleTerms = terms?.modules ?? [candidate.group];
  let score = 0;

  for (const term of codeTerms) {
    const normalizedTerm = normalizeGlobalSearchText(term);

    if (normalizedTerm === normalizedQuery) {
      score = Math.max(score, rankingScores.exactCode);
    } else if (normalizedTerm.startsWith(normalizedQuery)) {
      score = Math.max(score, rankingScores.codePrefix);
    }
  }

  for (const term of titleTerms) {
    const normalizedTerm = normalizeGlobalSearchText(term);

    if (normalizedTerm === normalizedQuery) {
      score = Math.max(score, rankingScores.exactTitle);
    } else if (normalizedTerm.startsWith(normalizedQuery)) {
      score = Math.max(score, rankingScores.titlePrefix);
    } else if (normalizedTerm.includes(normalizedQuery)) {
      score = Math.max(score, rankingScores.textContains);
    }
  }

  for (const term of secondaryTerms) {
    if (normalizeGlobalSearchText(term).includes(normalizedQuery)) {
      score = Math.max(score, rankingScores.textContains);
    }
  }

  for (const term of moduleTerms) {
    const normalizedTerm = normalizeGlobalSearchText(term);

    if (normalizedTerm === normalizedQuery) {
      score = Math.max(score, rankingScores.exactModule);
    } else if (normalizedTerm.startsWith(normalizedQuery)) {
      score = Math.max(score, rankingScores.modulePrefix);
    } else if (normalizedTerm.includes(normalizedQuery)) {
      score = Math.max(score, rankingScores.moduleContains);
    }
  }

  return score;
}

export function createNavigationSearchCandidates(
  items: readonly NavigationItem[] = navigationItems,
): GlobalSearchCandidate[] {
  return items.map((item) => {
    const routeCode = item.href === "/" ? "dashboard" : item.href.slice(1);

    return {
      id: `module:${routeCode}`,
      type: "navigation",
      group: "Modüller",
      code: routeCode,
      title: item.label,
      subtitle: item.description,
      href: item.href,
      searchTerms: {
        codes: [],
        titles: [],
        secondary: [item.description],
        modules: [item.label],
      },
    };
  });
}

export function buildGlobalSearchResponse(
  query: PreparedGlobalSearchQuery,
  candidates: readonly GlobalSearchCandidate[],
  options: {
    maxResults?: number;
    maxResultsPerGroup?: number;
  } = {},
): GlobalSearchResponse {
  const maxResults = options.maxResults ?? GLOBAL_SEARCH_MAX_RESULTS;
  const maxResultsPerGroup =
    options.maxResultsPerGroup ?? GLOBAL_SEARCH_MAX_RESULTS_PER_GROUP;
  const rankedResults = candidates
    .map((candidate) => sanitizeAndRankCandidate(candidate, query.normalizedQuery))
    .filter((result): result is GlobalSearchResult => result !== null)
    .sort(compareGlobalSearchResults);
  const results: GlobalSearchResult[] = [];
  const groupCounts = new Map<string, number>();

  for (const result of rankedResults) {
    if (results.length >= maxResults) {
      break;
    }

    const groupKey = normalizeGlobalSearchText(result.group);
    const groupCount = groupCounts.get(groupKey) ?? 0;

    if (groupCount >= maxResultsPerGroup) {
      continue;
    }

    results.push(result);
    groupCounts.set(groupKey, groupCount + 1);
  }

  return {
    query: query.query,
    results,
    truncated: results.length < rankedResults.length,
  };
}

export function searchNavigationItems(
  rawQuery: string,
  items: readonly NavigationItem[] = navigationItems,
): GlobalSearchResponse | InvalidGlobalSearchQuery {
  const query = prepareGlobalSearchQuery(rawQuery);

  if (!query.valid) {
    return query;
  }

  return buildGlobalSearchResponse(query, createNavigationSearchCandidates(items));
}

function sanitizeAndRankCandidate(
  candidate: GlobalSearchCandidate,
  normalizedQuery: string,
): GlobalSearchResult | null {
  if (!isSafeInternalHref(candidate.href)) {
    return null;
  }

  const group = toPlainGlobalSearchText(candidate.group);
  const code = toPlainGlobalSearchText(candidate.code);
  const title = toPlainGlobalSearchText(candidate.title);

  if (!candidate.id || !group || !title) {
    return null;
  }

  const subtitle = candidate.subtitle
    ? toPlainGlobalSearchText(candidate.subtitle)
    : undefined;
  const status = candidate.status
    ? toPlainGlobalSearchText(candidate.status)
    : undefined;
  const sanitizedCandidate: GlobalSearchCandidate = {
    ...candidate,
    group,
    code,
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(status ? { status } : {}),
    searchTerms: candidate.searchTerms
      ? {
          codes: candidate.searchTerms.codes?.map(toPlainGlobalSearchText),
          titles: candidate.searchTerms.titles?.map(toPlainGlobalSearchText),
          secondary: candidate.searchTerms.secondary?.map(toPlainGlobalSearchText),
          modules: candidate.searchTerms.modules?.map(toPlainGlobalSearchText),
        }
      : undefined,
  };
  const score = rankGlobalSearchCandidate(sanitizedCandidate, normalizedQuery);

  if (score === 0) {
    return null;
  }

  return {
    id: candidate.id,
    type: candidate.type,
    group,
    code,
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(status ? { status } : {}),
    href: candidate.href,
    score,
  };
}

function compareGlobalSearchResults(
  left: GlobalSearchResult,
  right: GlobalSearchResult,
) {
  return (
    right.score - left.score ||
    compareDeterministic(left.type, right.type) ||
    compareDeterministic(left.code, right.code) ||
    compareDeterministic(left.id, right.id)
  );
}

function compareDeterministic(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function isSafeInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("\\");
}
