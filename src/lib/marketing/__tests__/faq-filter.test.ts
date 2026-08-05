import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { filterFAQItems } from "../faq-filter";
import type { FAQItem } from "../faq-items";

const FC_CONFIG = { numRuns: 100 };

const faqItem = fc.record({
  id: fc.uuid(),
  question: fc.string({ minLength: 1, maxLength: 100 }),
  answer: fc.string({ minLength: 1, maxLength: 200 }),
  category: fc.constantFrom(
    "genel" as const,
    "fiyatlandirma" as const,
    "teknik" as const,
    "guvenlik-gizlilik" as const,
    "destek" as const,
  ),
});

describe("filterFAQItems", () => {
  // Feature: noa-landing-marketing-pages, Property 4: FAQ filter returns only items containing query string (case-insensitive)
  it("yalnızca eşleşen öğeleri döndürür (false positive yok)", () => {
    fc.assert(
      fc.property(
        fc.array(faqItem, { minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (items, query) => {
          const result = filterFAQItems(items, query);
          const lower = query.trim().toLowerCase();
          for (const item of result) {
            const matches =
              lower === "" ||
              item.question.toLowerCase().includes(lower) ||
              item.answer.toLowerCase().includes(lower);
            expect(matches).toBe(true);
          }
        },
      ),
      FC_CONFIG,
    );
  });

  it("eşleşen hiçbir öğeyi kaçırmaz (false negative yok)", () => {
    fc.assert(
      fc.property(
        fc.array(faqItem, { minLength: 0, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (items, query) => {
          const result = filterFAQItems(items, query);
          const lower = query.trim().toLowerCase();
          const expected =
            lower === ""
              ? items
              : items.filter(
                  (i) =>
                    i.question.toLowerCase().includes(lower) ||
                    i.answer.toLowerCase().includes(lower),
                );
          expect(result.length).toBe(expected.length);
        },
      ),
      FC_CONFIG,
    );
  });

  it("boş query tüm öğeleri döndürür", () => {
    const items: FAQItem[] = [
      { id: "1", category: "genel", question: "Soru 1", answer: "Cevap 1" },
      { id: "2", category: "teknik", question: "Soru 2", answer: "Cevap 2" },
    ];
    expect(filterFAQItems(items, "")).toHaveLength(2);
    expect(filterFAQItems(items, "   ")).toHaveLength(2);
  });
});
