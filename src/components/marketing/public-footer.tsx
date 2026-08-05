import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Özellikler", href: "/ozellikler" },
  { label: "Fiyatlandırma", href: "/fiyatlandirma" },
  { label: "Blog", href: "/blog" },
] as const;

const SUPPORT_LINKS = [
  { label: "SSS", href: "/sss" },
  { label: "İletişim", href: "/iletisim" },
] as const;

const LEGAL_LINKS = [
  { label: "Gizlilik Politikası", href: "/gizlilik" },
  { label: "Kullanım Koşulları", href: "/kullanim-kosullari" },
  { label: "KVKK", href: "/kvkk" },
] as const;

type FooterLinkGroupProps = {
  label: string;
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
};

function FooterLinkGroup({ label, title, links }: FooterLinkGroupProps) {
  return (
    <nav aria-label={label}>
      <h4 className="mb-4 text-sm font-semibold text-[var(--ds-on-surface-variant)]">
        {title}
      </h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[var(--ds-on-surface-variant)] transition-colors hover:text-[var(--ds-on-surface)] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ds-primary)]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function PublicFooter() {
  return (
    <footer
      style={{
        background: "var(--ds-surface-highest)",
        borderTop: "1px solid var(--ds-outline-variant)",
      }}
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-4 py-16 md:grid-cols-4 md:px-10">
        {/* Col 1: Brand (md:col-span-1) */}
        <div className="md:col-span-1">
          {/* Logotype */}
          <div className="mb-2 text-xl font-bold text-[var(--ds-primary)]">
            NOA İnşaat
          </div>

          {/* Slogan */}
          <p className="mb-4 text-sm text-[var(--ds-on-surface-variant)]">
            İnşaat yönetiminde yeni nesil standart.
          </p>

          {/* Copyright */}
          <p className="text-xs text-[var(--ds-on-surface-variant)]">
            © {new Date().getFullYear()} NOA İnşaat. Tüm hakları saklıdır.
          </p>

          <p className="mt-6 text-xs text-[var(--ds-on-surface-variant)]">
            Doğrulanmış sosyal medya hesabı henüz yayınlanmamıştır.
          </p>
        </div>

        {/* Col 2-4: Link groups */}
        <FooterLinkGroup
          label="Ürün navigasyonu"
          title="Ürün"
          links={PRODUCT_LINKS}
        />
        <FooterLinkGroup
          label="Destek navigasyonu"
          title="Destek"
          links={SUPPORT_LINKS}
        />
        <FooterLinkGroup
          label="Yasal navigasyonu"
          title="Yasal"
          links={LEGAL_LINKS}
        />
      </div>
    </footer>
  );
}
