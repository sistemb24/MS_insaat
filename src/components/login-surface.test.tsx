/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LoginSurface } from "./login-surface";

afterEach(() => {
  cleanup();
});

describe("LoginSurface", () => {
  it("renders credential fields and demo account hints", () => {
    render(
      <LoginSurface
        loginAction={() => undefined}
        loginError={false}
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
      />,
    );

    expect(screen.getByRole("heading", { name: "NOA İnşaat" })).toBeDefined();
    expect(screen.getByLabelText("E-posta")).toBeDefined();
    expect(screen.getByLabelText("Şifre")).toBeDefined();
    expect(screen.getByRole("button", { name: "Giriş Yap" })).toBeDefined();
    expect(screen.getByText("Ana Kullanıcı · DEMO İNŞAAT / 2026")).toBeDefined();
    expect(screen.getByText("Salt Okur · DEMO İNŞAAT / 2026")).toBeDefined();
    expect(screen.getByText("muhasebe@noa.local")).toBeDefined();
    expect(
      screen.getByText("Salt Okur hesabında tüm yazma butonları güvenlik gereği pasiftir."),
    ).toBeDefined();
  });

  it("shows credential errors", () => {
    render(
      <LoginSurface
        loginAction={() => undefined}
        loginError
        sessionOptions={[]}
      />,
    );

    expect(screen.getByText("E-posta veya şifre hatalı.")).toBeDefined();
  });

  it("shows an empty state when no sessions are available", () => {
    render(
      <LoginSurface
        loginAction={() => undefined}
        loginError={false}
        sessionOptions={[]}
      />,
    );

    expect(screen.getByText("Aktif oturum bulunamadı.")).toBeDefined();
  });
});
