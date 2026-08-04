/**
 * Şifre gücü değerlendirme modülü
 * NOA İnşaat Yönetim — Marketing Library
 */

export type StrengthCriteria = {
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_CRITERIA: StrengthCriteria[] = [
  {
    label: "En az 8 karakter",
    test: (p) => p.length >= 8,
  },
  {
    label: "En az bir büyük harf",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    label: "En az bir küçük harf",
    test: (p) => /[a-z]/.test(p),
  },
  {
    label: "En az bir rakam veya özel karakter",
    test: (p) => /[\d\W]/.test(p),
  },
];

/**
 * Verilen şifre için gücü değerlendirir.
 *
 * @param password - Değerlendirilecek şifre dizesi
 * @returns score (0–4 arası met kriter sayısı) ve her kriterin karşılanma durumu
 *
 * İnvariant: `score === criteria.filter(c => c.met).length` her zaman doğrudur.
 */
export function evaluatePasswordStrength(password: string): {
  score: number;
  criteria: (StrengthCriteria & { met: boolean })[];
} {
  const criteria = PASSWORD_CRITERIA.map((c) => ({
    ...c,
    met: c.test(password),
  }));

  return {
    score: criteria.filter((c) => c.met).length,
    criteria,
  };
}
