import type { LegalDocument } from "@/lib/marketing/legal-documents";
import { LEGAL_CONTACT_EMAIL } from "@/lib/marketing/legal-documents";

export default function LegalDocumentPage({
  document,
}: {
  document: LegalDocument;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <header className="mb-10 border-b pb-8" style={{ borderColor: "var(--ds-outline-variant)" }}>
        <p
          className="mb-3 text-xs font-bold uppercase tracking-wide"
          style={{ color: "var(--ds-primary)" }}
        >
          Sürümlü yasal içerik
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: "var(--ds-on-surface)" }}>
          {document.title}
        </h1>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <LegalMeta label="Sürüm" value={document.version} />
          <LegalMeta label="Yürürlük" value={formatLegalDate(document.effectiveDate)} />
          <LegalMeta
            label="İletişim"
            value={LEGAL_CONTACT_EMAIL}
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
          />
        </dl>
      </header>

      <div className="space-y-10">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-4 text-xl font-semibold" style={{ color: "var(--ds-on-surface)" }}>
              {section.heading}
            </h2>
            <div className="space-y-4 text-sm leading-7" style={{ color: "var(--ds-on-surface-variant)" }}>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function LegalMeta({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <dt className="font-semibold" style={{ color: "var(--ds-on-surface)" }}>
        {label}
      </dt>
      <dd className="mt-1" style={{ color: "var(--ds-on-surface-variant)" }}>
        {href ? <a className="underline" href={href}>{value}</a> : value}
      </dd>
    </div>
  );
}

function formatLegalDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
