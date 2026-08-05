/**
 * Yıllık faturalandırma hesaplayıcısı — marketing sayfaları için.
 *
 * Bu dosya harici bağımlılık içermez.
 * Requirements: 4.2, 4.3
 *
 * İnvariantlar (monthlyPrice > 0 için):
 *   - effectiveMonthly < monthlyPrice
 *   - annualSaving > 0
 */

/**
 * Yıllık faturalandırma sonuçlarını temsil eder.
 */
export type YearlyBillingResult = {
  /** Yıllık ödeme planındaki efektif aylık maliyet */
  effectiveMonthly: number;
  /** Toplam yıllık ödeme tutarı */
  yearlyTotal: number;
  /** Aylık × 12'ye kıyasla elde edilen yıllık tasarruf */
  annualSaving: number;
};

/**
 * Verilen aylık fiyat için yıllık faturalandırma değerlerini hesaplar.
 *
 * %20 yıllık indirim uygulanır.
 *
 * @param monthlyPrice - Aylık fiyat (TL). Sıfır veya negatif için sıfır değerleri döner.
 *
 * @example
 * calculateYearlyBilling(1299)
 * // { effectiveMonthly: 1039.2, yearlyTotal: 12470.4, annualSaving: 3117.6 }
 *
 * calculateYearlyBilling(0)
 * // { effectiveMonthly: 0, yearlyTotal: 0, annualSaving: 0 }
 */
export function calculateYearlyBilling(
  monthlyPrice: number,
): YearlyBillingResult {
  if (monthlyPrice <= 0) {
    return { effectiveMonthly: 0, yearlyTotal: 0, annualSaving: 0 };
  }

  const DISCOUNT_RATE = 0.2; // %20 yıllık indirim
  const yearlyTotal = monthlyPrice * 12 * (1 - DISCOUNT_RATE);
  const effectiveMonthly = yearlyTotal / 12;
  const annualSaving = monthlyPrice * 12 - yearlyTotal;

  return {
    effectiveMonthly,
    yearlyTotal,
    annualSaving,
  };
}
