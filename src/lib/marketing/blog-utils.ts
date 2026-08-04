/**
 * Blog yardımcı fonksiyonları.
 *
 * Bu dosya `prisma`, `app-shell` veya `server-active-scope` import etmez.
 */

import { BLOG_POSTS, type BlogPost } from "./blog-posts";

// ---------------------------------------------------------------------------
// paginatePosts
// ---------------------------------------------------------------------------

/**
 * Gönderileri sayfalara böler.
 *
 * - 0 gönderi → `[[]]` (1 boş sayfa)
 * - Her sayfada en fazla `pageSize` gönderi bulunur
 * - Toplam gönderi sayısı tüm sayfalardaki toplamına eşittir
 */
export function paginatePosts(
  posts: BlogPost[],
  pageSize: number,
): BlogPost[][] {
  if (posts.length === 0) {
    return [[]];
  }

  const pageCount = Math.ceil(posts.length / pageSize);
  const pages: BlogPost[][] = [];

  for (let i = 0; i < pageCount; i++) {
    pages.push(posts.slice(i * pageSize, (i + 1) * pageSize));
  }

  return pages;
}

// ---------------------------------------------------------------------------
// resolveBlogPost
// ---------------------------------------------------------------------------

/**
 * Slug ile eşleşen blog gönderisini döndürür.
 *
 * - Gönderi bulunamazsa `null` döner
 * - `isDraft: true` olan gönderi, kimliği doğrulanmamış ziyaretçiler için `null` döner
 * - Kimliği doğrulanmış kullanıcı taslak gönderiyi görebilir
 */
export function resolveBlogPost(
  slug: string,
  isAuthenticated: boolean,
): BlogPost | null {
  const post = BLOG_POSTS.find((p) => p.slug === slug) ?? null;

  if (post === null) {
    return null;
  }

  if (post.isDraft === true && !isAuthenticated) {
    return null;
  }

  return post;
}
