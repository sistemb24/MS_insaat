"use client";

import { useEffect, useState } from "react";

import {
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

const THEME_CHANGE_EVENT = "noa-theme-change";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

type ThemeControlProps = {
  className?: string;
  compact?: boolean;
};

export function ThemeControl({ className = "", compact = false }: ThemeControlProps) {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const storedPreference = readStoredPreference();
    let isActive = true;
    queueMicrotask(() => {
      if (isActive) setPreference(storedPreference);
    });
    applyTheme(storedPreference);

    const mediaQuery = getSystemThemeQuery();
    const handleSystemThemeChange = () => {
      if (readStoredPreference() === "system") {
        applyTheme("system");
      }
    };
    const handleThemeChange = (event: Event) => {
      const nextPreference = (event as CustomEvent<ThemePreference>).detail;
      if (isThemePreference(nextPreference)) {
        setPreference(nextPreference);
        applyTheme(nextPreference);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const nextPreference = isThemePreference(event.newValue) ? event.newValue : "system";
      setPreference(nextPreference);
      applyTheme(nextPreference);
    };

    mediaQuery?.addEventListener("change", handleSystemThemeChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      isActive = false;
      mediaQuery?.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function handlePreferenceChange(nextPreference: ThemePreference) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch {
      // The theme still applies for the current document when storage is unavailable.
    }
    setPreference(nextPreference);
    applyTheme(nextPreference);
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: nextPreference }));
  }

  return (
    <label
      className={`min-w-0 ${compact ? "inline-flex items-center" : "block"} ${className}`.trim()}
      data-theme-control="true"
    >
      <span className={compact ? "sr-only" : "mb-1 block text-[11px] font-semibold text-content-subtle"}>
        Görünüm
      </span>
      <select
        aria-label="Renk teması"
        className={`${compact ? "h-10 w-[108px]" : "h-10 w-full"} rounded-ui-control border border-divider bg-surface-muted px-2 text-xs font-semibold text-content outline-none transition-colors focus:border-brand-primary`}
        onChange={(event) => handlePreferenceChange(event.target.value as ThemePreference)}
        value={preference}
      >
        <option value="system">Sistem</option>
        <option value="light">Açık</option>
        <option value="dark">Koyu</option>
      </select>
    </label>
  );
}

function applyTheme(preference: ThemePreference) {
  const resolvedTheme = resolveTheme(preference, getSystemThemeQuery()?.matches ?? false);
  const root = document.documentElement;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolvedTheme;
}

function getSystemThemeQuery() {
  return typeof window.matchMedia === "function" ? window.matchMedia(SYSTEM_THEME_QUERY) : null;
}

function readStoredPreference(): ThemePreference {
  try {
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system";
  }
}
