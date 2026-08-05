import { describe, expect, it } from "vitest";

import { createRobots } from "../../../app/robots";
import { createSitemap } from "../../../app/sitemap";
import { getPublicSiteConfig } from "../public-site-config";

describe("public SEO routes", () => {
  it("fails closed and emits no sitemap without publication gates", () => {
    const config = getPublicSiteConfig({});

    expect(createRobots(config)).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
    expect(createSitemap(config)).toEqual([]);
  });

  it("indexes only public marketing routes and published blog posts", () => {
    const config = getPublicSiteConfig({
      APP_BASE_URL: "https://app.noa.example",
      NODE_ENV: "production",
      NOA_RUNTIME_ENV: "production",
      NOA_LEGAL_ADDRESS: "Onaylı adres",
      NOA_LEGAL_COMPANY_NAME: "Onaylı şirket",
      NOA_LEGAL_CONTACT_EMAIL: "legal@noa.example",
      NOA_LEGAL_CONTENT_APPROVED_AT: "2026-08-04",
      NOA_LEGAL_DATA_CONTROLLER: "Onaylı veri sorumlusu",
      NOA_PUBLIC_INDEXING_ENABLED: "true",
    });
    const urls = createSitemap(config).map((entry) => entry.url);

    expect(urls).toContain("https://app.noa.example/landing");
    expect(urls).toContain(
      "https://app.noa.example/blog/noa-insaat-2-santiye-yonetiminde-yeni-donem",
    );
    expect(urls.some((url) => url.includes("e-fatura-entegrasyonu"))).toBe(false);
    expect(urls.some((url) => url.includes("super-admin"))).toBe(false);
    expect(urls.some((url) => url.includes("gizlilik"))).toBe(false);
  });
});
