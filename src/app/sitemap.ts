import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/lib/marketing/blog-posts";
import {
  getPublicSiteConfig,
  publicUrl,
  type PublicSiteConfig,
} from "@/lib/marketing/public-site-config";

const PUBLIC_ROUTES = [
  { path: "/landing", changeFrequency: "weekly", priority: 1 },
  { path: "/ozellikler", changeFrequency: "monthly", priority: 0.8 },
  { path: "/fiyatlandirma", changeFrequency: "monthly", priority: 0.8 },
  { path: "/hakkimizda", changeFrequency: "yearly", priority: 0.5 },
  { path: "/iletisim", changeFrequency: "yearly", priority: 0.4 },
  { path: "/sss", changeFrequency: "monthly", priority: 0.6 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
] as const;

export function createSitemap(config: PublicSiteConfig): MetadataRoute.Sitemap {
  if (!config.indexingEnabled) return [];

  return [
    ...PUBLIC_ROUTES.map((route) => ({
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      url: publicUrl(route.path, config),
    })),
    ...BLOG_POSTS.filter((post) => !post.isDraft).map((post) => ({
      changeFrequency: "monthly" as const,
      lastModified: post.publishedAt,
      priority: 0.6,
      url: publicUrl(`/blog/${post.slug}`, config),
    })),
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return createSitemap(getPublicSiteConfig());
}
