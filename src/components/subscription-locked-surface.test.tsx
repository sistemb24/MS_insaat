/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { SubscriptionLockedSurface } from "./subscription-locked-surface";

describe("SubscriptionLockedSurface", () => {
  test("shows the locked route reason and subscription management link", () => {
    render(
      <SubscriptionLockedSurface
        access={{
          enabled: false,
          key: "progress-payments",
          label: "Hakediş",
          reason: "Profesyonel pakete yükseltme gerekir.",
          requiredPlan: "Profesyonel",
          source: "upgrade-required",
        }}
        routeLabel="Hakediş"
      />,
    );

    expect(screen.getByRole("heading", { name: "Paket yükseltme gerekli" })).toBeTruthy();
    expect(
      screen.getByText("Hakediş için Profesyonel pakete yükseltme gerekir."),
    ).toBeTruthy();
    expect(screen.getByText("Gereken paket: Profesyonel")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Aboneliği Yönet" }).getAttribute("href"),
    ).toBe("/abonelik");
  });
});
