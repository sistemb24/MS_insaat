const SUPER_ADMIN_AUTH_PATHS = new Set([
  "/super-admin/giris",
  "/super-admin/ilk-kurulum",
]);

export function sanitizeSuperAdminReturnTo(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate, "http://noa.local");
  } catch {
    return null;
  }
  if (parsed.origin !== "http://noa.local") return null;
  if (parsed.pathname !== "/super-admin" && !parsed.pathname.startsWith("/super-admin/")) {
    return null;
  }
  if (SUPER_ADMIN_AUTH_PATHS.has(parsed.pathname)) return null;
  return `${parsed.pathname}${parsed.search}`;
}
