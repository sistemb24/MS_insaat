import type { Metadata } from "next";
import Link from "next/link";
import BlogPostCard from "@/components/marketing/blog-post-card";
import NewsletterForm from "@/components/marketing/newsletter-form";
import { BLOG_POSTS } from "@/lib/marketing/blog-posts";
import type { BlogCategory } from "@/lib/marketing/blog-posts";

export const metadata: Metadata = {
  title: "Blog — NOA İnşaat",
  description:
    "Kaynağı doğrulanmış NOA İnşaat ürün güncellemeleri.",
  alternates: { canonical: "/blog" },
};

const CATEGORY_LABELS: Record<BlogCategory, string> = {
  "sektor-haberleri": "Sektör Haberleri",
  "urun-guncellemeleri": "Ürün Güncellemeleri",
  "ipuclari": "İpuçları",
  "mevzuat": "Mevzuat",
};

const CATEGORIES: BlogCategory[] = ["sektor-haberleri", "urun-guncellemeleri", "ipuclari", "mevzuat"];

// Yalnızca taslak olmayan gönderileri göster
const PUBLISHED = BLOG_POSTS.filter((p) => !p.isDraft);
const FEATURED = PUBLISHED.find((p) => p.featured);
const GRID_POSTS = PUBLISHED.filter((p) => !p.featured).slice(0, 8);

export default function BlogPage() {
  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "64px 16px" }}>
      {/* Başlık */}
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "40px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "12px" }}>
          Blog
        </h1>
        <p style={{ fontSize: "16px", color: "var(--ds-on-surface-variant)", maxWidth: "520px" }}>
          Yalnız kaynağı doğrulanmış ürün güncellemeleri yayınlanır. Dış uzman,
          mevzuat ve sektör tahmini taslakları public listede gösterilmez.
        </p>
      </header>

      <div style={{ display: "flex", gap: "48px", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Sol: Blog içerik */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          {/* Kategori filtre barı */}
          <nav
            aria-label="Kategori filtresi"
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "12px",
              marginBottom: "32px",
              borderBottom: "1px solid var(--ds-outline-variant)",
            }}
          >
            <Link
              href="/blog"
              style={{
                padding: "6px 16px",
                borderRadius: "100px",
                background: "var(--ds-primary)",
                color: "var(--ds-on-primary)",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Tümü
            </Link>
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                style={{
                  padding: "6px 16px",
                  borderRadius: "100px",
                  border: "1px solid var(--ds-outline-variant)",
                  background: "var(--ds-surface-raised)",
                  color: "var(--ds-on-surface)",
                  fontSize: "13px",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </span>
            ))}
          </nav>

          {/* Öne çıkan yazı */}
          {FEATURED && (
            <div style={{ marginBottom: "40px" }}>
              <BlogPostCard post={FEATURED} featured />
            </div>
          )}

          {/* Blog grid */}
          {GRID_POSTS.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "24px",
                marginBottom: "32px",
              }}
            >
              {GRID_POSTS.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "var(--ds-surface-low)",
                borderRadius: "var(--ds-radius-panel)",
                border: "1px solid var(--ds-outline-variant)",
              }}
            >
              <p style={{ color: "var(--ds-on-surface-variant)", marginBottom: "16px" }}>
                Bu kategoride henüz içerik bulunmuyor.
              </p>
              <Link href="/blog" style={{ color: "var(--ds-primary)", textDecoration: "none", fontWeight: 600 }}>
                Tüm Yazılara Dön
              </Link>
            </div>
          )}

          {/* Sayfalama placeholder */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "32px" }}>
            <button
              type="button"
              disabled
              aria-label="Önceki sayfa"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--ds-radius-control)",
                border: "1px solid var(--ds-outline-variant)",
                background: "transparent",
                color: "var(--ds-on-surface-variant)",
                cursor: "not-allowed",
                opacity: 0.5,
                fontSize: "18px",
              }}
            >
              ‹
            </button>
            <button
              type="button"
              aria-current="page"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--ds-radius-control)",
                border: "none",
                background: "var(--ds-primary)",
                color: "var(--ds-on-primary)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              1
            </button>
            <button
              type="button"
              disabled
              aria-label="Sonraki sayfa"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--ds-radius-control)",
                border: "1px solid var(--ds-outline-variant)",
                background: "transparent",
                color: "var(--ds-on-surface)",
                cursor: "not-allowed",
                opacity: 0.5,
                fontSize: "18px",
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Sağ: Sidebar */}
        <aside style={{ width: "300px", flexShrink: 0 }}>
          {/* Bülten aboneliği */}
          <div
            style={{
              padding: "24px",
              background: "var(--ds-surface-raised)",
              borderRadius: "var(--ds-radius-panel)",
              border: "1px solid var(--ds-outline-variant)",
              marginBottom: "24px",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "8px" }}>
              Bülten Durumu
            </h2>
            <p style={{ fontSize: "13px", color: "var(--ds-on-surface-variant)", marginBottom: "16px", lineHeight: 1.5 }}>
              Abonelik ve onay teslimat sağlayıcısı henüz etkin değildir.
            </p>
            <NewsletterForm />
          </div>

          {/* Kategoriler */}
          <div
            style={{
              padding: "24px",
              background: "var(--ds-surface-raised)",
              borderRadius: "var(--ds-radius-panel)",
              border: "1px solid var(--ds-outline-variant)",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "16px" }}>
              Kategoriler
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              {CATEGORIES.map((cat) => (
                <li key={cat}>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "var(--ds-on-surface-variant)",
                      fontSize: "14px",
                      padding: "4px 0",
                    }}
                  >
                    <span>{CATEGORY_LABELS[cat]}</span>
                    <span style={{ color: "var(--ds-text-muted)", fontSize: "12px" }}>
                      {PUBLISHED.filter((p) => p.category === cat).length}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
