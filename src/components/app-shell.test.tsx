/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
        currentPath="/personel"
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
    expect(screen.getAllByRole("button", { name: "Çıkış" })).toHaveLength(1);
    expect(screen.getAllByText("Salt Okur").length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toContain(
      "Salt okur · işlemler pasif",
    );
  });

  it("uses the standard responsive shell for all routes", () => {
    render(
      <AppShell currentPath="/api-yonetimi">
        <main>İçerik</main>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Ana modüller",
    });

    expect(within(navigation).getByText("Müşteriler")).toBeDefined();
    expect(within(navigation).getByText("İhale Yönetimi")).toBeDefined();
    expect(within(navigation).getByText("Döküman Merkezi")).toBeDefined();
    expect(within(navigation).getByText("Tedarikçiler")).toBeDefined();
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
    expect(document.querySelector('[data-shell-variant="standard"]')).toBeTruthy();
    expect(document.querySelector('[data-shell-body="true"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-print-hidden="true"]')).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Menüyü aç" })).toBeDefined();
  });

  it("enables standard AppShell for the Dashboard route", () => {
    render(
      <AppShell currentPath="/" notificationUnreadCount={0}>
        <div>Dashboard içeriği</div>
      </AppShell>,
    );

    expect(document.querySelector('[data-shell-variant="standard"]')).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    expect(screen.getByRole("main").textContent).toContain("Dashboard içeriği");
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(22);
    expect(
      within(navigation).getByRole("link", { name: "Dashboard" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.queryByPlaceholderText(/ara|search/i)).toBeNull();
    expect(screen.getAllByRole("link", { name: "Bildirimler" })).toHaveLength(2);
  });

  it("extends standard AppShell to the accepted customer route", () => {
    render(
      <AppShell currentPath="/musteriler" notificationUnreadCount={0}>
        <div>Müşteriler içeriği</div>
      </AppShell>,
    );

    expect(document.querySelector('[data-shell-variant="standard"]')).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation).getByRole("link", { name: "Müşteriler" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain("Müşteriler içeriği");
  });

  it("extends standard AppShell to the tender route", () => {
    render(
      <AppShell currentPath="/ihale-yonetimi" notificationUnreadCount={0}>
        <div>İhale Yönetimi içeriği</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "İhale Yönetimi" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain(
      "İhale Yönetimi içeriği",
    );
  });

  it("extends standard AppShell to the cash bank route", () => {
    render(
      <AppShell currentPath="/kasa-banka" notificationUnreadCount={0}>
        <div>Kasa/Banka içeriği</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Kasa/Banka" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain("Kasa/Banka içeriği");
  });

  it("extends standard AppShell to the supplier route", () => {
    render(
      <AppShell currentPath="/tedarikciler" notificationUnreadCount={0}>
        <div>Tedarikçiler içeriği</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Tedarikçiler" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain("Tedarikçiler içeriği");
  });

  it("extends standard AppShell to the subcontractor route", () => {
    render(
      <AppShell currentPath="/taseronlar" notificationUnreadCount={0}>
        <div>Taşeronlar içeriği</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Taşeronlar" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain("Taşeronlar içeriği");
  });

  it("extends standard AppShell to the site route", () => {
    render(
      <AppShell currentPath="/santiyeler" notificationUnreadCount={0}>
        <div>Şantiyeler içeriği</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Şantiyeler" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain("Şantiyeler içeriği");
  });

  it("extends standard AppShell to the invoice route", () => {
    render(
      <AppShell currentPath="/faturalar" notificationUnreadCount={0}>
        <div>Fatura ve irsaliye içeriği</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Faturalar" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain(
      "Fatura ve irsaliye içeriği",
    );
  });

  it("extends standard AppShell to the expense route", () => {
    render(
      <AppShell currentPath="/giderler" notificationUnreadCount={0}>
        <div>Gider içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Giderler" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(screen.getByRole("main").textContent).toContain("Gider içerikleri");
  });
  it("extends standard AppShell to the cheque route", () => {
    render(
      <AppShell currentPath="/cek" notificationUnreadCount={0}>
        <div>Çek içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Çek" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the reports route", () => {
    render(
      <AppShell currentPath="/raporlar" notificationUnreadCount={0}>
        <div>Rapor içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Raporlar" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the stock depot route", () => {
    render(
      <AppShell currentPath="/stok-depo" notificationUnreadCount={0}>
        <div>Stok depo içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Stok/Depo" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the personnel route", () => {
    render(
      <AppShell currentPath="/personel" notificationUnreadCount={0}>
        <div>Personel içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Personel" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the timesheet route", () => {
    render(
      <AppShell currentPath="/puantaj" notificationUnreadCount={0}>
        <div>Puantaj içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Puantaj" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the document center workspace", () => {
    render(
      <AppShell currentPath="/dokuman-merkezi" notificationUnreadCount={0}>
        <div>Doküman Merkezi içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Döküman Merkezi" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the notification center workspace", () => {
    render(
      <AppShell currentPath="/bildirimler" notificationUnreadCount={4}>
        <div>Bildirim Merkezi içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Bildirimler" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the subscription workspace", () => {
    render(
      <AppShell currentPath="/abonelik" notificationUnreadCount={0}>
        <div>Abonelik ve Paketler içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Abonelik" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the vehicle fleet workspace", () => {
    render(
      <AppShell currentPath="/araclar" notificationUnreadCount={0}>
        <div>Araç ve Filo Yönetimi içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Araçlar" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the settings workspace", () => {
    render(
      <AppShell currentPath="/ayarlar" notificationUnreadCount={0}>
        <div>Ayarlar içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Ayarlar" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("extends standard AppShell to the Hakediş Pro workspace", () => {
    render(
      <AppShell currentPath="/hakedis" notificationUnreadCount={0}>
        <div>Hakediş Pro içerikleri</div>
      </AppShell>,
    );

    expect(
      document.querySelector('[data-shell-variant="standard"]'),
    ).toBeTruthy();
    expect(document.querySelector('[data-shell-variant="legacy"]')).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Ana modüller" });
    expect(
      within(navigation)
        .getByRole("link", { name: "Hakediş" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("preserves session, notification, viewer and sign-out context in the standard shell", () => {
    render(
      <AppShell
        activeSessionId="demo-viewer"
        context={{
          ...defaultTenantScope,
          userId: "user-viewer",
          userName: "Salt Okur",
          userRole: "viewer",
        }}
        currentPath="/"
        notificationUnreadCount={4}
        sessionOptions={[
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
        <div>Dashboard</div>
      </AppShell>,
    );

    expect((screen.getByLabelText("Oturum") as HTMLSelectElement).value).toBe("demo-viewer");
    expect(screen.getByRole("link", { name: "4 okunmamış bildirim" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Salt okur · işlemler pasif");
    expect(screen.getByRole("button", { name: "Çıkış" })).toBeTruthy();
    expect(screen.getByText("SO")).toBeTruthy();
  });

  it("moves focus into the mobile drawer and returns it after Escape", () => {
    render(
      <AppShell
        activeSessionId="demo-accounting"
        context={defaultTenantScope}
        currentPath="/"
        sessionOptions={[
          {
            companyLabel: "DEMO İNŞAAT / 2026",
            id: "demo-accounting",
            label: "Ana Kullanıcı · DEMO İNŞAAT / 2026",
            roleLabel: "Muhasebe",
            userName: "Ana Kullanıcı",
          },
        ]}
        signOutAction={() => undefined}
        switchSessionAction={() => undefined}
      >
        <div>Dashboard</div>
      </AppShell>,
    );

    const trigger = screen.getByRole("button", { name: "Menüyü aç" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "NOA İnşaat" });
    const closeButton = within(dialog).getByRole("button", { name: "Menüyü kapat" });
    expect(document.activeElement).toBe(closeButton);
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(dialog).getByText(defaultTenantScope.companyName)).toBeTruthy();
    expect(within(dialog).getByRole("navigation", { name: "Mobil ana modüller" })).toBeTruthy();
    expect((within(dialog).getByLabelText("Oturum") as HTMLSelectElement).value).toBe(
      "demo-accounting",
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "NOA İnşaat" })).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
  });
});
