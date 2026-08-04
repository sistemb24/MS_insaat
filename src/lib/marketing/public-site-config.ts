const FALLBACK_ORIGIN = "http://localhost:3000";

export const REQUIRED_LEGAL_IDENTITY_KEYS = [
  "NOA_LEGAL_COMPANY_NAME",
  "NOA_LEGAL_ADDRESS",
  "NOA_LEGAL_CONTACT_EMAIL",
  "NOA_LEGAL_DATA_CONTROLLER",
  "NOA_LEGAL_CONTENT_APPROVED_AT",
] as const;

export type PublicSiteConfig = {
  indexingEnabled: boolean;
  indexingRequested: boolean;
  legalIdentityReady: boolean;
  missingLegalIdentity: readonly string[];
  origin: string;
  productionOriginReady: boolean;
};

export function getPublicSiteConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): PublicSiteConfig {
  const origin = normalizeOrigin(env.APP_BASE_URL);
  const missingLegalIdentity = REQUIRED_LEGAL_IDENTITY_KEYS.filter(
    (key) => !env[key]?.trim(),
  );
  const productionOriginReady =
    isProductionEnvironment(env) && new URL(origin).protocol === "https:";
  const indexingRequested = env.NOA_PUBLIC_INDEXING_ENABLED === "true";
  const legalIdentityReady = missingLegalIdentity.length === 0;

  return {
    indexingEnabled:
      indexingRequested && productionOriginReady && legalIdentityReady,
    indexingRequested,
    legalIdentityReady,
    missingLegalIdentity,
    origin,
    productionOriginReady,
  };
}

export function publicUrl(path: string, config = getPublicSiteConfig()) {
  return new URL(path, `${config.origin}/`).toString();
}

export function createWebsiteJsonLd(config = getPublicSiteConfig()) {
  if (!config.indexingEnabled) return null;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    inLanguage: "tr-TR",
    name: "NOA İnşaat Yönetimi",
    url: publicUrl("/landing", config),
  } as const;
}

function normalizeOrigin(value: string | undefined) {
  if (!value) return FALLBACK_ORIGIN;

  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

function isProductionEnvironment(
  env: Readonly<Record<string, string | undefined>>,
) {
  return [env.NODE_ENV, env.NOA_RUNTIME_ENV].some(
    (value) => value?.toLowerCase() === "production",
  );
}
