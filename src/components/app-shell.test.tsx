/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppShell } from "./app-shell";
import { defaultTenantScope } from "@/lib/tenant-scope";

afterEach(() => {
  cleanup();
});

describe("AppShell", () => {
  it("renders the active session switcher when options are available", () => {
    render(
      <AppShell
        activeSessionId="demo-viewer"
        context={{
          ...defaultTenantScope,
          userId: "user-viewer",
          userName: "Salt Okur",
          userRole: "viewer",
        }}
        currentPath="/faturalar"
        sessionOptions={[
          {
            companyLabel: "DEMO İNŞAAT / 2026",
            id: "demo-accounting",
            label: "Ana Kullanıcı · DEMO İNŞAAT / 2026",
            roleLabel: "Muhasebe",
            userName: "Ana Kullanıcı",
          },
          {
            companyLabel: "DEMO İNŞAAT / 2026",
            id: "demo-viewer",
            label: "Salt Okur · DEMO İNŞAAT / 2026",
            roleLabel: "Salt Okur",
            userName: "Salt Okur",
          },
        ]}
        signOutAction={() => undefined}
        switchSessionAction={() => undefined}
      >
        <main>İçerik</main>
      </AppShell>,
    );

    expect((screen.getByLabelText("Oturum") as HTMLSelectElement).value).toBe(
      "demo-viewer",
    );
    expect(screen.getByRole("button", { name: "Geç" })).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Çıkış" })).toHaveLength(2);
    expect(screen.getAllByText("Salt Okur").length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toContain(
      "Salt okur · işlemler pasif",
    );
  });

  it("marks planned P1 navigation entries without hiding P0 routes", () => {
    render(
      <AppShell currentPath="/musteriler">
        <main>İçerik</main>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Planlı modüller",
    });

    expect(within(navigation).getByText("Müşteriler")).toBeDefined();
    expect(within(navigation).getByText("İhale Yönetimi")).toBeDefined();
    expect(within(navigation).getByText("Döküman Merkezi")).toBeDefined();
    expect(within(navigation).getAllByText("P1").length).toBeGreaterThanOrEqual(
      3,
    );
    expect(within(navigation).getByText("Tedarikçiler")).toBeDefined();
    expect(within(navigation).getAllByText("P0").length).toBeGreaterThan(0);
    expect(
      within(navigation)
        .getByRole("link", { name: /İhale Yönetimi/ })
        .getAttribute("href"),
    ).toBe("/ihale-yonetimi");
    expect(
      within(navigation)
        .getByRole("link", { name: /Döküman Merkezi/ })
        .getAttribute("href"),
    ).toBe("/dokuman-merkezi");
  });
});

