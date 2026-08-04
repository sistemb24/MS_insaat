import type { ReactNode } from "react";

import PublicFooter from "@/components/marketing/public-footer";
import PublicNavbar from "@/components/marketing/public-navbar";
import {
  createWebsiteJsonLd,
  getPublicSiteConfig,
} from "@/lib/marketing/public-site-config";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  const jsonLd = createWebsiteJsonLd(getPublicSiteConfig());

  return (
    <>
      {jsonLd ? (
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
          type="application/ld+json"
        />
      ) : null}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:top-4 focus:left-4 focus:rounded focus:bg-[var(--ds-primary)] focus:text-[var(--ds-on-primary)] focus:font-semibold"
      >
        İçeriğe geç
      </a>
      <PublicNavbar />
      <main id="main-content">{children}</main>
      <PublicFooter />
    </>
  );
}
