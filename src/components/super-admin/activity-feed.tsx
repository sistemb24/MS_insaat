type ActivityItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
  tone?: "brand" | "success" | "warning" | "danger" | "neutral";
};

type ActivityFeedProps = {
  items: ActivityItem[];
  title?: string;
};

const toneBg: Record<string, string> = {
  brand: "var(--ds-primary-fixed)",
  success: "var(--ds-success-container)",
  warning: "var(--ds-warning-container)",
  danger: "var(--ds-danger-container)",
  neutral: "var(--ds-surface-container)",
};

const toneColor: Record<string, string> = {
  brand: "var(--ds-on-primary-fixed)",
  success: "var(--ds-success)",
  warning: "var(--ds-warning)",
  danger: "var(--ds-danger)",
  neutral: "var(--ds-on-surface-variant)",
};

export type { ActivityItem };

export function ActivityFeed({ items, title = "Son Aktiviteler" }: ActivityFeedProps) {
  return (
    <section
      className="rounded-ui-panel border"
      style={{
        borderColor: "var(--ds-outline-variant)",
        background: "var(--ds-surface-raised)",
      }}
    >
      <header
        className="px-5 py-4"
        style={{ borderBottom: "1px solid var(--ds-outline-variant)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--ds-on-surface)" }}>
          {title}
        </h2>
      </header>
      <div className="divide-y" style={{ borderColor: "var(--ds-outline-variant)" }}>
        {items.length === 0 && (
          <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--ds-text-muted)" }}>
            Henüz aktivite kaydı bulunmuyor.
          </p>
        )}
        {items.map((item) => {
          const tone = item.tone ?? "neutral";
          return (
            <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs"
                style={{
                  background: toneBg[tone],
                  color: toneColor[tone],
                }}
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium" style={{ color: "var(--ds-on-surface)" }}>
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--ds-text-muted)" }}>
                  {item.description}
                </p>
              </div>
              <time
                className="shrink-0 text-xs tabular-nums"
                style={{ color: "var(--ds-text-muted)" }}
              >
                {item.time}
              </time>
            </div>
          );
        })}
      </div>
    </section>
  );
}
