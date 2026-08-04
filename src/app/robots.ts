import type { MetadataRoute } from "next";

import {
  getPublicSiteConfig,
  publicUrl,
  type PublicSiteConfig,
} from "@/lib/marketing/public-site-config";

export function createRobots(config: PublicSiteConfig): MetadataRoute.Robots {
  if (!config.indexingEnabled) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    host: config.origin,
    rules: {
      userAgent: "*",
      allow: [
        "/landing",
        "/ozellikler",
        "/fiyatlandirma",
        "/hakkimizda",
        "/iletisim",
        "/sss",
        "/blog",
      ],
      disallow: [
        "/api/",
        "/super-admin/",
        "/giris",
        "/kayit",
        "/davet",
        "/eposta-dogrulama",
        "/sifremi-unuttum",
        "/sifre-sifirla",
      ],
    },
    sitemap: publicUrl("/sitemap.xml", config),
  };
}

export default function robots(): MetadataRoute.Robots {
  return createRobots(getPublicSiteConfig());
}
