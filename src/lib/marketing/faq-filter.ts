/**
 * FAQ filtre yardımcı fonksiyonu
 *
 * Requirements: 8.4, 8.5
 */

import type { FAQItem } from "./faq-items";

/**
 * Verilen sorgu dizesine göre FAQ öğelerini filtreler.
 *
 * - Büyük/küçük harf duyarsız arama yapar.
 * - Hem `question` hem de `answer` alanında eşleşme arar.
 * - Boş veya yalnızca boşluk içeren query geldiğinde tüm listeyi döndürür.
 */
export function filterFAQItems(items: FAQItem[], query: string): FAQItem[] {
  const trimmed = query.trim();

  if (trimmed === "") {
    return items;
  }

  const lowerQuery = trimmed.toLowerCase();

  return items.filter(
    (item) =>
      item.question.toLowerCase().includes(lowerQuery) ||
      item.answer.toLowerCase().includes(lowerQuery),
  );
}
