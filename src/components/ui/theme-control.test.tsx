/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { THEME_STORAGE_KEY } from "@/lib/theme";

import { ThemeControl } from "./theme-control";

let systemPrefersDark = false;
const mediaListeners = new Set<() => void>();

beforeEach(() => {
  systemPrefersDark = false;
  mediaListeners.clear();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.themePreference;
  document.documentElement.style.colorScheme = "";
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      addEventListener: (_event: string, listener: () => void) => mediaListeners.add(listener),
      matches: systemPrefersDark,
      media: "(prefers-color-scheme: dark)",
      removeEventListener: (_event: string, listener: () => void) => mediaListeners.delete(listener),
    })),
  });
});

afterEach(() => {
  cleanup();
});

describe("ThemeControl", () => {
  test("restores a stored dark preference and applies it to the document root", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(<ThemeControl />);

    await waitFor(() => {
      expect(
        (screen.getByRole("combobox", { name: "Renk teması" }) as HTMLSelectElement).value,
      ).toBe("dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreference).toBe("dark");
  });

  test("synchronizes multiple controls and persists a user preference", async () => {
    render(
      <>
        <ThemeControl />
        <ThemeControl compact />
      </>,
    );

    const controls = screen.getAllByRole("combobox", { name: "Renk teması" });
    fireEvent.change(controls[0], { target: { value: "dark" } });

    await waitFor(() => {
      expect((controls[1] as HTMLSelectElement).value).toBe("dark");
    });
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("follows operating-system changes only while the system preference is active", async () => {
    render(<ThemeControl />);

    await waitFor(() => {
      expect(document.documentElement.dataset.themePreference).toBe("system");
    });

    systemPrefersDark = true;
    mediaListeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.change(screen.getByRole("combobox", { name: "Renk teması" }), {
      target: { value: "light" },
    });
    systemPrefersDark = false;
    mediaListeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
