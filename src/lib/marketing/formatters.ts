/**
 * Para birimi ve tarih formatlayıcıları — marketing sayfaları için.
 *
 * Bu dosya harici bağımlılık içermez; yalnızca yerleşik Intl API kullanılır.
 * Requirements: 23.2, 23.3
 */

// ---------------------------------------------------------------------------
// Para Birimi Formatlayıcı
// ---------------------------------------------------------------------------

const CURRENCY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  currencyDisplay: "narrowSymbol", // ₺ sembolü
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Sayısal tutarı Türk Lirası formatına dönüştürür.
 *
 * - `tr-TR` locale: nokta binlik ayırıcı, virgül ondalık ayırıcı
 * - ₺ sembolü ile başlar
 *
 * @example
 * formatCurrency(1250)     // "₺1.250,00"
 * formatCurrency(0)        // "₺0,00"
 * formatCurrency(1299.99)  // "₺1.299,99"
 */
export function formatCurrency(amount: number): string {
  return CURRENCY_FORMATTER.format(amount);
}

// ---------------------------------------------------------------------------
// Tarih Formatlayıcı
// ---------------------------------------------------------------------------

const TURKISH_MONTHS: readonly string[] = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/**
 * ISO 8601 tarih dizesini "DD MMMM YYYY" Türkçe formatına dönüştürür.
 *
 * Yanlış saat dilimi kaymalarını önlemek için UTC değerleri kullanılır.
 *
 * @example
 * formatDate("2026-07-15T10:00:00.000Z") // "15 Temmuz 2026"
 * formatDate("2024-01-01")               // "1 Ocak 2024"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = TURKISH_MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
