import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BLOG_POSTS } from "@/lib/marketing/blog-posts";
import { resolveBlogPost } from "@/lib/marketing/blog-utils";
import { formatDate } from "@/lib/marketing/formatters";
import BlogPostCard from "@/components/marketing/blog-post-card";
import { publicUrl } from "@/lib/marketing/public-site-config";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = resolveBlogPost(slug, false);
  if (!post) return { title: "Sayfa Bulunamadı" };

  return {
    title: `${post.title} — NOA İnşaat Blog`,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: post.coverImageUrl
        ? [{ url: post.coverImageUrl, width: 1200, height: 630, alt: post.coverImageAlt }]
        : [],
    },
    alternates: { canonical: `/blog/${slug}` },
  };
}

export async function generateStaticParams() {
  return BLOG_POSTS.filter((p) => !p.isDraft).map((p) => ({ slug: p.slug }));
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = resolveBlogPost(slug, false);

  if (!post) {
    notFound();
  }
  const canonicalUrl = publicUrl(`/blog/${post.slug}`);

  // İlgili yazılar (aynı kategori, max 3)
  const related = BLOG_POSTS.filter(
    (p) => p.slug !== slug && p.category === post.category && !p.isDraft,
  ).slice(0, 3);

  const CATEGORY_LABELS: Record<string, string> = {
    "sektor-haberleri": "Sektör Haberleri",
    "urun-guncellemeleri": "Ürün Güncellemeleri",
    "ipuclari": "İpuçları",
    "mevzuat": "Mevzuat",
  };

  return (
    <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "48px 16px" }}>
      <div style={{ display: "flex", gap: "48px", alignItems: "flex-start" }}>
        {/* Ana içerik */}
        <article style={{ flex: 1, minWidth: 0, maxWidth: "720px", margin: "0 auto" }}>
          {/* Kategori etiketi */}
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "100px",
                background: "var(--ds-primary-fixed)",
                color: "var(--ds-on-primary-fixed)",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {CATEGORY_LABELS[post.category] ?? post.category}
            </span>
          </div>

          {/* Başlık */}
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 700,
              color: "var(--ds-on-surface)",
              lineHeight: 1.25,
              marginBottom: "16px",
            }}
          >
            {post.title}
          </h1>

          {/* Meta bilgi */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "13px",
              color: "var(--ds-text-muted)",
              marginBottom: "32px",
              flexWrap: "wrap",
            }}
          >
            <span>{post.author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingTimeMinutes} dk okuma</span>
          </div>

          {/* Kapak görseli */}
          {post.coverImageUrl ? (
            <div style={{ position: "relative", height: "360px", borderRadius: "var(--ds-radius-panel)", overflow: "hidden", marginBottom: "40px" }}>
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt}
                fill
                style={{ objectFit: "cover" }}
                priority
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              style={{
                height: "200px",
                background: "var(--ds-surface-container)",
                borderRadius: "var(--ds-radius-panel)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "64px",
                marginBottom: "40px",
                border: "1px solid var(--ds-outline-variant)",
              }}
            >
              📝
            </div>
          )}

          {/* Makale gövdesi */}
          <div
            style={{
              fontSize: "16px",
              lineHeight: 1.8,
              color: "var(--ds-on-surface-variant)",
              maxWidth: "720px",
            }}
          >
            {post.body ? (
              <div dangerouslySetInnerHTML={{ __html: post.body }} />
            ) : (
              <>
                <p style={{ marginBottom: "16px" }}>
                  {post.summary}
                </p>
                <p style={{ marginBottom: "16px" }}>
                  Bu public özet, çalışan tenant domain çekirdeğini tanımlar.
                  Dış e-posta, ödeme, Open Banking, GİB, Arvento ve object
                  storage provider&apos;ları etkin değildir; ilgili ekranlar
                  sandbox, manuel veya provider bekliyor durumundadır.
                </p>

                {/* Inline CTA kartı — 3. bölüm başlığı sonrası */}
                <div
                  style={{
                    margin: "32px 0",
                    padding: "24px",
                    background: "var(--ds-primary-fixed)",
                    borderRadius: "var(--ds-radius-panel)",
                    border: "1px solid var(--ds-outline-variant)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "4px" }}>
                      NOA İnşaat ürün durumunu inceleyin
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--ds-on-surface-variant)", margin: 0 }}>
                      Self-servis kayıt kapalıdır; doğrulanmış kabiliyetleri inceleyin.
                    </p>
                  </div>
                  <Link
                    href="/ozellikler"
                    style={{
                      padding: "8px 20px",
                      borderRadius: "var(--ds-radius-control)",
                      background: "var(--ds-primary)",
                      color: "var(--ds-on-primary)",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Ürün Durumunu İncele
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Sosyal paylaşım */}
          <div
            style={{
              marginTop: "40px",
              paddingTop: "24px",
              borderTop: "1px solid var(--ds-outline-variant)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--ds-on-surface-variant)", fontWeight: 600 }}>
              Paylaş:
            </span>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn'de paylaş"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                border: "1px solid var(--ds-outline-variant)",
                color: "var(--ds-on-surface-variant)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              in
            </a>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter/X'te paylaş"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                border: "1px solid var(--ds-outline-variant)",
                color: "var(--ds-on-surface-variant)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              𝕏
            </a>
          </div>

          {/* Yazar bio */}
          <div
            style={{
              marginTop: "40px",
              padding: "24px",
              background: "var(--ds-surface-low)",
              borderRadius: "var(--ds-radius-panel)",
              border: "1px solid var(--ds-outline-variant)",
              display: "flex",
              gap: "16px",
              alignItems: "flex-start",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "var(--ds-primary-fixed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--ds-on-primary-fixed)",
                flexShrink: 0,
              }}
            >
              {post.author[0]}
            </div>
            <div>
              <p style={{ fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "2px" }}>
                {post.author}
              </p>
              <p style={{ fontSize: "12px", color: "var(--ds-text-muted)", marginBottom: "8px" }}>
                {post.authorRole}
              </p>
              {post.authorBio && (
                <p style={{ fontSize: "13px", color: "var(--ds-on-surface-variant)", lineHeight: 1.5, margin: 0 }}>
                  {post.authorBio}
                </p>
              )}
            </div>
          </div>

          {/* İlgili yazılar */}
          {related.length > 0 && (
            <section
              aria-labelledby="related-heading"
              style={{ marginTop: "48px" }}
            >
              <h2
                id="related-heading"
                style={{ fontSize: "20px", fontWeight: 700, color: "var(--ds-on-surface)", marginBottom: "24px" }}
              >
                İlgili Yazılar
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                {related.map((p) => (
                  <BlogPostCard key={p.slug} post={p} />
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
