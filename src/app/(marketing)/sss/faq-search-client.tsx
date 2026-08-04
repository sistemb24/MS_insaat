"use client";

import { useState, useDeferredValue } from "react";
import FAQAccordion from "@/components/marketing/faq-accordion";
import { filterFAQItems } from "@/lib/marketing/faq-filter";
import type { FAQItem, FAQCategory } from "@/lib/marketing/faq-items";
import Link from "next/link";

type Props = {
  items: FAQItem[];
  categories: FAQCategory[];
  categoryLabels: Record<FAQCategory, string>;
};

export default function FAQSearchClient({ items, categories, categoryLabels }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FAQCategory | "all">("all");
  const deferredQuery = useDeferredValue(query);

  // Önce kategoriye göre filtrele, sonra arama sorgusuna göre
  const categoryFiltered =
    activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);
  const filtered = deferredQuery.trim()
    ? filterFAQItems(categoryFiltered, deferredQuery)
    : categoryFiltered;

  return (
    <>
      {/* Arama kutusu */}
      <div style={{ maxWidth: "600px", margin: "0 auto 32px", position: "relative" }}>
        <label htmlFor="faq-search" className="sr-only">
          Soru veya anahtar kelime arayın
        </label>
        <input
          id="faq-search"
          type="search"
          placeholder="Soru veya anahtar kelime arayın..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px 12px 44px",
            borderRadius: "var(--ds-radius-control)",
            border: "1px solid var(--ds-outline-variant)",
            background: "var(--ds-surface-raised)",
            color: "var(--ds-on-surface)",
            fontSize: "15px",
            outline: "none",
          }}
        />
        {/* Arama ikonu */}
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ds-on-surface-variant)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* Kategori tab filtreleri */}
      <div
        role="group"
        aria-label="Kategori filtresi"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
          marginBottom: "40px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          aria-pressed={activeCategory === "all"}
          style={{
            padding: "8px 20px",
            borderRadius: "100px",
            border: "1px solid",
            borderColor: activeCategory === "all" ? "var(--ds-primary)" : "var(--ds-outline-variant)",
            background: activeCategory === "all" ? "var(--ds-primary)" : "var(--ds-surface-raised)",
            color: activeCategory === "all" ? "var(--ds-on-primary)" : "var(--ds-on-surface)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 160ms ease",
          }}
        >
          Tümü
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            style={{
              padding: "8px 20px",
              borderRadius: "100px",
              border: "1px solid",
              borderColor: activeCategory === cat ? "var(--ds-primary)" : "var(--ds-outline-variant)",
              background: activeCategory === cat ? "var(--ds-primary)" : "var(--ds-surface-raised)",
              color: activeCategory === cat ? "var(--ds-on-primary)" : "var(--ds-on-surface)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 160ms ease",
            }}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Sonuçlar */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--ds-on-surface-variant)",
          }}
        >
          <p style={{ fontSize: "16px", marginBottom: "16px" }}>
            &ldquo;{deferredQuery}&rdquo; için sonuç bulunamadı.
          </p>
          <Link
            href="/iletisim"
            style={{
              color: "var(--ds-primary)",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Sorunuzu bize iletebilirsiniz →
          </Link>
        </div>
      ) : (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <FAQAccordion items={filtered} />
        </div>
      )}
    </>
  );
}
