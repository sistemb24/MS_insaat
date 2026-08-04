type TestimonialCardProps = {
  quote: string;
  name: string;
  role: string;
  rating?: number;
};

export function TestimonialCard({ quote, name, role, rating = 5 }: TestimonialCardProps) {
  return (
    <figure
      className="group flex flex-col rounded-ui-panel border p-6 transition-shadow hover:shadow-lg sm:p-8"
      style={{
        margin: 0,
        background: "var(--ds-surface-raised)",
        borderColor: "var(--ds-outline-variant)",
      }}
    >
      {/* Yıldızlar */}
      <div className="mb-4 flex gap-1" aria-label={`${rating} yıldız`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={i < rating ? "var(--ds-warning)" : "var(--ds-outline-variant)"}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>

      {/* Alıntı */}
      <blockquote
        className="flex-1 text-sm leading-relaxed sm:text-base"
        style={{
          margin: 0,
          color: "var(--ds-on-surface)",
          fontStyle: "italic",
          lineHeight: 1.7,
        }}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Kişi bilgisi */}
      <figcaption className="mt-5 flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: "var(--ds-primary)",
            color: "var(--ds-on-primary)",
          }}
        >
          {name.charAt(0)}
        </div>
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--ds-on-surface)" }}
          >
            {name}
          </p>
          <p className="text-xs" style={{ color: "var(--ds-on-surface-variant)" }}>
            {role}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
