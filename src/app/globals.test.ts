import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const globalCss = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
function readHexTokens(selector: string) {
  const escapedSelector = selector === ":root.dark" ? ":root\\.dark" : ":root";
  const block = globalCss.match(
    new RegExp(escapedSelector + "\\s*\\{([\\s\\S]*?)\\n\\}"),
  )?.[1];

  if (!block) {
    throw new Error("CSS block not found: " + selector);
  }

  return Object.fromEntries(
    [...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [
      match[1].replace(/^ds-/, ""),
      match[2],
    ]),
  );
}

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  );
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

describe("Template Standard v1 global CSS contract", () => {
  test("defines canonical semantic tokens without legacy aliases", () => {
    expect(globalCss).toContain("--ds-primary: #3525cd;");
    expect(globalCss).not.toContain("--legacy-primary:");
    expect(globalCss).not.toContain("--primary:");
    expect(globalCss).toContain("--radius-ui-panel: var(--ds-radius-panel);");
  });

  test("keeps accessibility and print foundations in the global layer", () => {
    expect(globalCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalCss).toContain("@media print");
    expect(globalCss).toContain('[data-print-hidden="true"]');
    expect(globalCss).toContain(':focus-visible');
  });

  test("defines class-based dark semantic tokens and a light print override", () => {
    expect(globalCss).toContain(":root.dark {");
    expect(globalCss).toContain("--ds-background: #111318;");
    expect(globalCss).toContain("--ds-on-status: #111318;");
    expect(globalCss).toMatch(/@media print[\s\S]*:root\.dark/);
  });

  test.each([":root", ":root.dark"])(
    "%s semantic text pairs meet WCAG AA contrast",
    (selector) => {
      const tokens = readHexTokens(selector);
      const pairs = [
        ["on-surface", "background"],
        ["on-surface-variant", "surface-raised"],
        ["text-muted", "surface-raised"],
        ["on-primary", "primary"],
        ["success", "success-container"],
        ["warning", "warning-container"],
        ["danger", "danger-container"],
        ["info", "info-container"],
        ["accent-violet", "accent-violet-container"],
        ["accent-orange", "accent-orange-container"],
      ] as const;

      for (const [foreground, background] of pairs) {
        expect(
          contrastRatio(tokens[foreground], tokens[background]),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  test("resets dark semantic colors and shell chrome for print", () => {
    expect(globalCss).toMatch(
      /@media print[\s\S]*:root\.dark[\s\S]*--ds-primary: #3525cd;/,
    );
    expect(globalCss).toMatch(
      /@media print[\s\S]*:root\.dark[\s\S]*--ds-success: #047857;/,
    );
    expect(globalCss).toContain('[data-shell-body="true"]');
    expect(globalCss).toContain(
      '[data-ui-workspace="true"] :where(thead)',
    );
    expect(globalCss).toContain(
      '[data-ui-workspace="true"] button',
    );
  });
  test("does not load a runtime font or icon CDN", () => {
    expect(globalCss).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(globalCss).not.toContain("material-symbols");
  });
});
