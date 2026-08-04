import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { paginatePosts, resolveBlogPost } from "../blog-utils";
const FC_CONFIG = { numRuns: 100 };

const blogPost = fc.record({
  slug: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 80 }),
  summary: fc.string({ minLength: 1, maxLength: 160 }),
  category: fc.constantFrom(
    "sektor-haberleri" as const,
    "urun-guncellemeleri" as const,
    "ipuclari" as const,
    "mevzuat" as const,
  ),
  author: fc.string({ minLength: 1, maxLength: 50 }),
  authorRole: fc.string({ minLength: 1, maxLength: 50 }),
  publishedAt: fc.constant("2024-01-01T00:00:00.000Z"),
  readingTimeMinutes: fc.integer({ min: 1, max: 30 }),
  coverImageAlt: fc.string({ minLength: 1, maxLength: 100 }),
});

describe("paginatePosts", () => {
  // Feature: noa-landing-marketing-pages, Property 6: Blog pagination produces ceil(N/9) pages, all posts appear exactly once
  it("ceil(N/pageSize) sayfa üretir, tüm gönderiler tam bir kez görünür", () => {
    fc.assert(
      fc.property(
        fc.array(blogPost, { minLength: 0, maxLength: 100 }),
        (posts) => {
          const pages = paginatePosts(posts, 9);
          const expectedPageCount = posts.length === 0 ? 1 : Math.ceil(posts.length / 9);
          expect(pages).toHaveLength(expectedPageCount);

          // Her sayfada max 9 gönderi
          for (const page of pages) {
            expect(page.length).toBeLessThanOrEqual(9);
          }

          // Tüm slug'lar tam bir kez yer alır
          const allSlugs = pages.flat().map((p) => p.slug);
          expect(allSlugs.sort()).toEqual(posts.map((p) => p.slug).sort());
        },
      ),
      FC_CONFIG,
    );
  });

  it("0 gönderi için 1 boş sayfa döner", () => {
    const pages = paginatePosts([], 9);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(0);
  });
});

describe("resolveBlogPost", () => {
  // Feature: noa-landing-marketing-pages, Property 7: Draft post returns null for unauthenticated
  it("taslak gönderi unauthenticated için null döner", () => {
    const result = resolveBlogPost("e-fatura-entegrasyonu-rehberi-2025", false);
    expect(result).toBeNull();
  });

  it("geçersiz slug null döner", () => {
    expect(resolveBlogPost("bu-slug-yok", false)).toBeNull();
    expect(resolveBlogPost("bu-slug-yok", true)).toBeNull();
  });

  it("yayınlanmış gönderi unauthenticated için döner", () => {
    const result = resolveBlogPost("noa-insaat-2-santiye-yonetiminde-yeni-donem", false);
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("noa-insaat-2-santiye-yonetiminde-yeni-donem");
  });
});
