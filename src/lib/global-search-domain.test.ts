import { describe, expect, it } from "vitest";

import type { NavigationItem } from "./navigation";
import {
  buildGlobalSearchDeepLink,
  parseGlobalSearchDeepLinkParams,
  buildGlobalSearchResponse,
  createNavigationSearchCandidates,
  GLOBAL_SEARCH_MAX_QUERY_LENGTH,
  normalizeGlobalSearchText,
  prepareGlobalSearchQuery,
  rankGlobalSearchCandidate,
  searchNavigationItems,
  toPlainGlobalSearchText,
  type GlobalSearchCandidate,
  type PreparedGlobalSearchQuery,
} from "./global-search-domain";

const validQuery = (query: string) => {
  const prepared = prepareGlobalSearchQuery(query);

  if (!prepared.valid) {
    throw new Error(`Expected a valid query, received ${prepared.reason}.`);
  }

  return prepared;
};

const candidate = (
  overrides: Partial<GlobalSearchCandidate> = {},
): GlobalSearchCandidate => ({
  id: "record-1",
  type: "cheque",
  group: "Çekler",
  code: "ÇEK-2026-001",
  title: "Atlas Yapı Çeki",
  subtitle: "VakıfBank Ankara Şubesi",
  status: "Portföyde",
  href: "/cek?kayit=record-1",
  ...overrides,
});

describe("global search domain", () => {
  it("builds encoded deep links only for safe internal routes", () => {
    expect(
      buildGlobalSearchDeepLink("/cek", "ÇEK 001/A", "record 1"),
    ).toBe("/cek?ara=%C3%87EK+001%2FA&kayit=record+1");
    expect(buildGlobalSearchDeepLink("https://example.com", "ÇEK-1", "1")).toBe(
      "https://example.com",
    );
    expect(buildGlobalSearchDeepLink("/cek", " ", "1")).toBe("/cek");
  });

  it("parses only bounded single deep-link values", () => {
    expect(
      parseGlobalSearchDeepLinkParams({
        ara: [" ÇEK-001 ", "ignored"],
        kayit: ["cheque-1", "ignored"],
      }),
    ).toEqual({ query: "ÇEK-001", recordId: "cheque-1" });
    expect(parseGlobalSearchDeepLinkParams({ ara: "a", kayit: "1" })).toBeUndefined();
    expect(parseGlobalSearchDeepLinkParams({ ara: "çek", kayit: "" })).toBeUndefined();
  });
  it("trims and validates query boundaries before repository work", () => {
    expect(prepareGlobalSearchQuery(" a ")).toEqual({
      valid: false,
      query: "a",
      reason: "too-short",
    });
    expect(prepareGlobalSearchQuery(`x${"a".repeat(GLOBAL_SEARCH_MAX_QUERY_LENGTH)}`)).toEqual({
      valid: false,
      query: `x${"a".repeat(GLOBAL_SEARCH_MAX_QUERY_LENGTH)}`,
      reason: "too-long",
    });
    expect(prepareGlobalSearchQuery("  ÇK  ")).toEqual({
      valid: true,
      query: "ÇK",
      normalizedQuery: "çk",
    });
  });

  it("normalizes Turkish casing, Unicode width, and repeated whitespace", () => {
    expect(normalizeGlobalSearchText("  İHALE   IŞI  ")).toBe("ihale ışı");
    expect(normalizeGlobalSearchText("ＡＢＣ-１２３")).toBe("abc-123");
  });

  it("keeps result text plain without markup or control characters", () => {
    expect(
      toPlainGlobalSearchText(" <strong>Atlas</strong>\u0000 <!--gizli--> Yapı "),
    ).toBe("Atlas Yapı");
    expect(rankGlobalSearchCandidate(candidate(), "")).toBe(0);
  });

  it.each([
    ["çek-2026-001", 100],
    ["çek-2026", 80],
    ["atlas yapı çeki", 70],
    ["atlas yapı", 55],
    ["yapı çeki", 30],
    ["ankara", 30],
    ["çekler", 60],
  ])("ranks %s with score %i", (rawQuery, expectedScore) => {
    expect(
      rankGlobalSearchCandidate(
        candidate(),
        normalizeGlobalSearchText(rawQuery),
      ),
    ).toBe(expectedScore);
  });

  it("builds navigation candidates from the canonical navigation source", () => {
    const items: NavigationItem[] = [
      {
        label: "Hakediş",
        href: "/hakedis",
        icon: "HK",
        description: "Hakediş faturası, onay ve çıktı",
        phase: "P0",
      },
      {
        label: "Raporlar",
        href: "/raporlar",
        icon: "RP",
        description: "Ekstre ve şantiye raporu",
        phase: "P0",
      },
    ];

    expect(createNavigationSearchCandidates(items)).toMatchObject([
      {
        id: "module:hakedis",
        type: "navigation",
        group: "Modüller",
        code: "hakedis",
        title: "Hakediş",
        href: "/hakedis",
      },
      {
        id: "module:raporlar",
        title: "Raporlar",
        href: "/raporlar",
      },
    ]);

    expect(searchNavigationItems("hakediş", items)).toMatchObject({
      query: "hakediş",
      truncated: false,
      results: [
        {
          id: "module:hakedis",
          title: "Hakediş",
          score: 60,
          href: "/hakedis",
        },
      ],
    });
  });

  it("sorts deterministically and enforces group and total limits", () => {
    const prepared = validQuery("ortak");
    const candidates = [
      ...Array.from({ length: 6 }, (_, index) =>
        candidate({
          id: `cheque-${index}`,
          code: `ÇEK-${String(6 - index).padStart(2, "0")}`,
          title: `Ortak çek ${index}`,
        }),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        candidate({
          id: `tender-${index}`,
          type: "tender",
          group: "İhaleler",
          code: `İHL-${index}`,
          title: `Ortak ihale ${index}`,
          href: `/ihale-yonetimi?kayit=tender-${index}`,
        }),
      ),
    ];

    const response = buildGlobalSearchResponse(prepared, candidates, {
      maxResults: 5,
      maxResultsPerGroup: 2,
    });

    expect(response.results.map((result) => result.id)).toEqual([
      "cheque-5",
      "cheque-4",
      "tender-0",
      "tender-1",
    ]);
    expect(response.truncated).toBe(true);
  });

  it("drops non-matching and unsafe external targets and returns plain text", () => {
    const query: PreparedGlobalSearchQuery = validQuery("atlas");
    const response = buildGlobalSearchResponse(query, [
      candidate({
        title: "<strong>Atlas</strong> Yapı",
        subtitle: "<!--internal--> Güvenli kayıt",
      }),
      candidate({ id: "external", href: "https://example.com/atlas" }),
      candidate({ id: "unmatched", title: "Başka kayıt" }),
      candidate({ id: "markup-only", title: "<atlas>Başka kayıt</atlas>" }),
    ]);

    expect(response.results).toEqual([
      expect.objectContaining({
        id: "record-1",
        title: "Atlas Yapı",
        subtitle: "Güvenli kayıt",
      }),
    ]);
  });

  it("returns an explicit validation result instead of searching invalid input", () => {
    expect(searchNavigationItems(" ")).toEqual({
      valid: false,
      query: "",
      reason: "too-short",
    });
  });
});
