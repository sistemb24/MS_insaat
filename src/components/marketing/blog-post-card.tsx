import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/lib/marketing/blog-posts";
import { formatDate } from "@/lib/marketing/formatters";

const CATEGORY_LABELS: Record<BlogPost["category"], string> = {
  "sektor-haberleri": "Sektör Haberleri",
  "urun-guncellemeleri": "Ürün Güncellemeleri",
  "ipuclari": "İpuçları",
  "mevzuat": "Mevzuat",
};

type BlogPostCardProps = {
  post: BlogPost;
  /** Öne çıkan kart olarak gösterilsin mi (tam genişlik, büyük kapak görseli) */
  featured?: boolean;
};

export default function BlogPostCard({ post, featured = false }: BlogPostCardProps) {
  const categoryLabel = CATEGORY_LABELS[post.category] ?? post.category;
  const formattedDate = formatDate(post.publishedAt);
  const href = `/blog/${post.slug}`;

  if (featured) {
    return (
      <article
        style={{
          borderRadius: "var(--ds-radius-panel)",
          border: "1px solid var(--ds-outline-variant)",
          background: "var(--ds-surface-raised)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Kapak görseli — geniş */}
        <div style={{ position: "relative", height: "280px", width: "100%" }}>
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt={post.coverImageAlt}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                background: "var(--ds-surface-highest)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ds-outline-variant)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* İçerik */}
        <div style={{ padding: "24px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "100px",
                background: "var(--ds-primary-fixed)",
                color: "var(--ds-on-primary-fixed)",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Öne Çıkan
            </span>
            <span
              style={{
                padding: "2px 10px",
                borderRadius: "100px",
                background: "var(--ds-surface-container)",
                color: "var(--ds-on-surface-variant)",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              {categoryLabel}
            </span>
          </div>

          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "8px", lineHeight: 1.4 }}>
            <Link
              href={href}
              style={{
                color: "inherit",
                textDecoration: "none",
              }}
            >
              {post.title}
            </Link>
          </h2>

          <p style={{ fontSize: "14px", color: "var(--ds-on-surface-variant)", lineHeight: 1.6, marginBottom: "16px" }}>
            {post.summary.slice(0, 160)}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--ds-text-muted)" }}>
            <span>{post.author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{formattedDate}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingTimeMinutes} dk okuma</span>
          </div>
        </div>
      </article>
    );
  }

  // Normal kart
  return (
    <article
      style={{
        borderRadius: "var(--ds-radius-panel)",
        border: "1px solid var(--ds-outline-variant)",
        background: "var(--ds-surface-raised)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Kapak görseli */}
      <div style={{ position: "relative", height: "180px", width: "100%", flexShrink: 0 }}>
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt={post.coverImageAlt}
            fill
            style={{ objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "100%",
              background: "var(--ds-surface-highest)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ds-outline-variant)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* İçerik */}
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Kategori etiketi */}
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: "100px",
            background: "var(--ds-surface-container)",
            color: "var(--ds-on-surface-variant)",
            fontSize: "11px",
            fontWeight: 500,
            marginBottom: "8px",
            alignSelf: "flex-start",
          }}
        >
          {categoryLabel}
        </span>

        {/* Başlık */}
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--ds-on-surface)", marginBottom: "8px", lineHeight: 1.4, flex: 1 }}>
          <Link
            href={href}
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            {post.title}
          </Link>
        </h3>

        {/* Özet */}
        <p
          style={{
            fontSize: "13px",
            color: "var(--ds-on-surface-variant)",
            lineHeight: 1.5,
            marginBottom: "12px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.summary.slice(0, 160)}
        </p>

        {/* Meta bilgi */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--ds-text-muted)", flexWrap: "wrap" }}>
          <span>{post.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt}>{formattedDate}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingTimeMinutes} dk</span>
        </div>
      </div>
    </article>
  );
}
