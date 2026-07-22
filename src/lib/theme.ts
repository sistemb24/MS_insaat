export const THEME_STORAGE_KEY = "noa-theme";

export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && themePreferences.includes(value as ThemePreference);
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return preference;
}

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const root = document.documentElement;
  let preference = "system";
  try {
    const stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (stored === "light" || stored === "dark" || stored === "system") preference = stored;
  } catch {}
  const systemPrefersDark = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = preference === "dark" || (preference === "system" && systemPrefersDark) ? "dark" : "light";
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;
})();`;
