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
      NOA_RUNTIME_ENV: "production",
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

  it("uses the stable Vercel branch URL for staging metadata without enabling indexing", () => {
    const config = getPublicSiteConfig({
      APP_BASE_URL: "not-a-url",
      NODE_ENV: "production",
      NOA_LEGAL_ADDRESS: "Onaylı adres",
      NOA_LEGAL_COMPANY_NAME: "Onaylı şirket",
      NOA_LEGAL_CONTACT_EMAIL: "legal@noa.example",
      NOA_LEGAL_CONTENT_APPROVED_AT: "2026-08-05",
      NOA_LEGAL_DATA_CONTROLLER: "Onaylı veri sorumlusu",
      NOA_RUNTIME_ENV: "staging",
      NOA_PUBLIC_INDEXING_ENABLED: "true",
      VERCEL_BRANCH_URL: "insaat-yonetim-git-staging.example.vercel.app",
      VERCEL_URL: "insaat-yonetim-immutable.example.vercel.app",
    });

    expect(config).toMatchObject({
      indexingEnabled: false,
      indexingRequested: true,
      origin: "https://insaat-yonetim-git-staging.example.vercel.app",
      productionOriginReady: false,
    });
  });

  it("does not trust arbitrary staging hostnames as provider metadata", () => {
    expect(
      getPublicSiteConfig({
        NOA_RUNTIME_ENV: "staging",
        VERCEL_BRANCH_URL: "attacker.example",
      }).origin,
    ).toBe("http://localhost:3000");
  });
});
