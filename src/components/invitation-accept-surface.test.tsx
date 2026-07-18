/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { InvitationAcceptSurface } from "./invitation-accept-surface";

afterEach(() => {
  cleanup();
});

describe("InvitationAcceptSurface", () => {
  test("submits invitation token and password fields to the accept action", async () => {
    const acceptAction = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        email: "isg@example.com",
        sessionId:
          "tenant-noa-demo::company-demo-insaat::period-2026::session::isg-example-com",
      },
    });

    render(
      <InvitationAcceptSurface
        acceptAction={acceptAction}
        initialToken="invite-token"
      />,
    );

    fireEvent.change(screen.getByLabelText("Ad Soyad"), {
      target: { value: "İSG Kullanıcısı" },
    });
    fireEvent.change(screen.getByLabelText("Şifre"), {
      target: { value: "Strong123!" },
    });
    fireEvent.change(screen.getByLabelText("Şifre Tekrar"), {
      target: { value: "Strong123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Daveti Kabul Et" }));

    await waitFor(() => {
      expect(acceptAction).toHaveBeenCalledWith({
        fullName: "İSG Kullanıcısı",
        password: "Strong123!",
        passwordConfirm: "Strong123!",
        token: "invite-token",
      });
    });
    expect(screen.getByRole("status").textContent).toBe(
      "Davet kabul edildi: isg@example.com. Giriş ekranından şifrenizle devam edebilirsiniz.",
    );
  });

  test("shows token missing state without rendering the password form", () => {
    render(<InvitationAcceptSurface acceptAction={vi.fn()} initialToken="" />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Davet bağlantısı geçersiz veya eksik.",
    );
    expect(screen.queryByRole("button", { name: "Daveti Kabul Et" })).toBeNull();
  });
});
