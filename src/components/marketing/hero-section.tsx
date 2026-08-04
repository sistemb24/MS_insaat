import Link from "next/link";

type HeroSectionProps = {
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref: string;
  ctaSecondaryLabel: string;
  headline: string;
  subheadline: string;
};

export default function HeroSection({
  ctaPrimaryHref,
  ctaPrimaryLabel,
  ctaSecondaryHref,
  ctaSecondaryLabel,
  headline,
  subheadline,
}: HeroSectionProps) {
  return (
    <section
      className="hero-section relative overflow-hidden border-b px-4 pb-20 pt-32 md:px-10"
      style={{ borderColor: "var(--ds-outline-variant)" }}
    >
      {/* Dekoratif arka plan şekilleri — mobile'da gizli */}
      <div
        className="pointer-events-none absolute inset-0 hidden md:block"
        aria-hidden="true"
      >
        <div
          className="absolute left-[-10%] top-[-10%] h-[400px] w-[400px] rounded-full opacity-10"
          style={{ background: "var(--ds-primary)", filter: "blur(80px)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-10"
          style={{ background: "var(--ds-secondary-container)", filter: "blur(100px)" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] text-center">
        <h1
          className="hero-animate mb-6 text-5xl font-bold leading-tight md:text-6xl"
          style={{ color: "var(--ds-on-surface)", animationDelay: "0ms" }}
        >
          {headline}
        </h1>

        <p
          className="hero-animate mx-auto mb-10 max-w-3xl text-xl"
          style={{ color: "var(--ds-on-surface-variant)", animationDelay: "100ms" }}
        >
          {subheadline}
        </p>

        <div
          className="hero-animate flex flex-col justify-center gap-4 sm:flex-row"
          style={{ animationDelay: "200ms" }}
        >
          {/* Birincil CTA — filled */}
          <Link
            href={ctaPrimaryHref}
            className="hero-cta-primary inline-flex items-center justify-center rounded px-8 py-3 text-base font-semibold"
            style={{
              background: "var(--ds-primary)",
              color: "var(--ds-on-primary)",
              textDecoration: "none",
            }}
          >
            {ctaPrimaryLabel}
          </Link>

          {/* İkincil CTA — outlined */}
          <Link
            href={ctaSecondaryHref}
            className="hero-cta-secondary inline-flex items-center justify-center rounded border px-8 py-3 text-base font-semibold"
            style={{
              background: "var(--ds-surface)",
              color: "var(--ds-primary)",
              borderColor: "var(--ds-primary)",
              textDecoration: "none",
            }}
          >
            {ctaSecondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
