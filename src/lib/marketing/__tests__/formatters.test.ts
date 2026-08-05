import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatCurrency, formatDate } from "../formatters";

const FC_CONFIG = { numRuns: 100 };

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

describe("formatCurrency", () => {
  // Feature: noa-landing-marketing-pages, Property 12: Turkish currency formatter produces ₺ symbol with tr-TR conventions
  it("₺ sembolü içerir", () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        (amount) => {
          const result = formatCurrency(amount);
          expect(result).toContain("₺");
        },
      ),
      FC_CONFIG,
    );
  });

  it("tr-TR ondalık ayırıcı virgül kullanır (tam sayı olmayan değerler için)", () => {
    // 1.5 → "₺1,50" (tr-TR virgül ondalık)
    const result = formatCurrency(1.5);
    expect(result).toMatch(/,\d{2}/);
  });

  it("₺0,00 — sıfır değeri", () => {
    expect(formatCurrency(0)).toBe("₺0,00");
  });

  it("₺1.250,00 — binlik nokta", () => {
    expect(formatCurrency(1250)).toBe("₺1.250,00");
  });
});

describe("formatDate", () => {
  // Feature: noa-landing-marketing-pages, Property 13: Turkish date formatter produces DD MMMM YYYY with valid Turkish month name
  it("DD MMMM YYYY kalıbında geçerli Türkçe ay adı içerir", () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") }),
        (date) => {
          const result = formatDate(date.toISOString());
          const parts = result.split(" ");
          expect(parts).toHaveLength(3);
          const [day, month, year] = parts;
          expect(Number(day)).toBeGreaterThanOrEqual(1);
          expect(Number(day)).toBeLessThanOrEqual(31);
          expect(TURKISH_MONTHS).toContain(month);
          expect(Number(year)).toBeGreaterThanOrEqual(2000);
          expect(Number(year)).toBeLessThanOrEqual(2099);
        },
      ),
      FC_CONFIG,
    );
  });

  it("belirli tarih için doğru format", () => {
    expect(formatDate("2026-07-15T10:00:00.000Z")).toBe("15 Temmuz 2026");
    expect(formatDate("2024-01-01T00:00:00.000Z")).toBe("1 Ocak 2024");
  });
});
