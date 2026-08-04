import { describe, expect, it } from "vitest";

import {
  createWebsiteJsonLd,
  getPublicSiteConfig,
  publicUrl,
} from "../public-site-config";

describe("public site config", () => {
  it("fails closed without an explicit production origin and legal identity", () => {
    expect(getPublicSiteConfig({})).toMatchObject({
      indexingEnabled: false,
      legalIdentityReady: false,
      origin: "http://localhost:3000",
      productionOriginReady: false,
    });
  });

  it("enables indexing only after all explicit publication gates pass", () => {
    const config = getPublicSiteConfig({
      APP_BASE_URL: "https://app.noa.example/path",
      NODE_ENV: "production",
      NOA_LEGAL_ADDRESS: "Onaylı adres",
      NOA_LEGAL_COMPANY_NAME: "Onaylı şirket",
      NOA_LEGAL_CONTACT_EMAIL: "legal@noa.example",
      NOA_LEGAL_CONTENT_APPROVED_AT: "2026-08-04",
      NOA_LEGAL_DATA_CONTROLLER: "Onaylı veri sorumlusu",
      NOA_PUBLIC_INDEXING_ENABLED: "true",
    });

    expect(config).toMatchObject({
      indexingEnabled: true,
      legalIdentityReady: true,
      origin: "https://app.noa.example",
      productionOriginReady: true,
    });
    expect(publicUrl("/blog/example", config)).toBe(
      "https://app.noa.example/blog/example",
    );
    expect(createWebsiteJsonLd(config)).toMatchObject({
      "@type": "WebSite",
      url: "https://app.noa.example/landing",
    });
  });
});
