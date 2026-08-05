export const SUPER_ADMIN_AUTH_PATHS = {
  login: "/super-admin/giris",
  setup: "/super-admin/ilk-kurulum",
  passwordResetRequest: "/super-admin/sifremi-unuttum",
  passwordReset: "/super-admin/sifre-sifirla",
  otp: "/super-admin/dogrulama-kodu",
  totp: "/super-admin/iki-faktor-dogrulama",
  accountLocked: "/super-admin/hesap-kilitlendi",
  sessionExpired: "/super-admin/oturum-suresi-doldu",
  maintenance: "/super-admin/bakim-modu",
} as const;

export type SuperAdminSecurityFeatures = {
  passwordResetDelivery: boolean;
  otpDelivery: boolean;
  totpCrypto: boolean;
};

/** Server-only, fail-closed capability detection. */
export function getSuperAdminSecurityFeatures(
  env: NodeJS.ProcessEnv = process.env,
): SuperAdminSecurityFeatures {
  return {
    // Phase 34 intentionally ships without a real delivery adapter.
    passwordResetDelivery: false,
    otpDelivery: false,
    totpCrypto: Boolean(env.SUPER_ADMIN_TOTP_ENCRYPTION_KEY),
  };
}

export function getSuperAdminPublicPaths(): readonly string[] {
  // Feature routes also require a DB challenge. Proxy cannot validate it, so
  // only the Phase 33 bootstrap/login pair is public at the network boundary.
  return [SUPER_ADMIN_AUTH_PATHS.login, SUPER_ADMIN_AUTH_PATHS.setup] as const;
}

export function isExactSuperAdminPublicPath(
  pathname: string,
  paths: readonly string[] = getSuperAdminPublicPaths(),
): boolean {
  return paths.includes(pathname);
}
