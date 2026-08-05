import {
  MARKETING_COMPARISON_FEATURES,
  type MarketingComparisonFeature,
} from "@/lib/marketing/subscription-plans";

type ComparisonTableProps = {
  features: MarketingComparisonFeature[];
};

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <span className="text-sm font-medium" style={{ color: "var(--ds-on-surface)" }}>
        {value}
      </span>
    );
  }
  return value ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ds-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ds-outline-variant)" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function ComparisonTable({ features }: ComparisonTableProps) {
  const plans = [
    { key: "baslangic" as const, label: "Başlangıç" },
    { key: "standart" as const, label: "Standart" },
    { key: "profesyonel" as const, label: "Profesyonel" },
    { key: "kurumsal" as const, label: "Kurumsal" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--ds-outline-variant)" }}>
            <th className="py-4 pr-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--ds-text-muted)", minWidth: "200px" }}>
              Özellik
            </th>
            {plans.map((plan) => (
              <th key={plan.key} className="px-4 py-4 text-center text-sm font-bold" style={{ color: "var(--ds-on-surface)", minWidth: "120px" }}>
                {plan.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feat) => (
            <tr key={feat.name} style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}>
              <td className="py-3.5 pr-4 text-sm font-medium" style={{ color: "var(--ds-on-surface)" }}>
                {feat.name}
              </td>
              {plans.map((plan) => (
                <td key={plan.key} className="px-4 py-3.5 text-center">
                  <div className="flex justify-center">
                    <CellValue value={feat[plan.key]} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Varsayılan özellik karşılaştırma verileri.
 * Plan adları subscription-seed.ts ile uyumludur.
 */
export const DEFAULT_COMPARISON_FEATURES = MARKETING_COMPARISON_FEATURES;
