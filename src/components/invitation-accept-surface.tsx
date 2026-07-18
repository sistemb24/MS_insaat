"use client";

import { useState } from "react";

import type {
  UserInvitationAcceptValues,
  UserInvitationResult,
} from "@/lib/user-invitation-service";

type InvitationAcceptSurfaceProps = {
  acceptAction: (
    values: UserInvitationAcceptValues,
  ) => Promise<UserInvitationResult<{ email: string; sessionId: string }>>;
  initialToken: string;
};

export function InvitationAcceptSurface({
  acceptAction,
  initialToken,
}: InvitationAcceptSurfaceProps) {
  const [fullName, setFullName] = useState("");
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const token = initialToken.trim();

  async function handleAcceptInvitation() {
    const result = await acceptAction({
      fullName,
      password,
      passwordConfirm,
      token,
    });

    if (result.ok) {
      setNotice(
        `Davet kabul edildi: ${result.data.email}. Giriş ekranından şifrenizle devam edebilirsiniz.`,
      );

      return;
    }

    setNotice(result.errors.join(" "));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4 py-10 text-[var(--on-surface)]">
      <section className="w-full max-w-[460px] rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--primary)] text-sm font-bold text-white">
            NOA
          </div>
          <div>
            <h1 className="text-lg font-semibold">Daveti Kabul Et</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">
              NOA İnşaat hesabınızı oluşturun
            </p>
          </div>
        </div>

        {!token ? (
          <div
            className="rounded-[var(--radius-panel)] border border-[var(--mandatory-indicator)] bg-red-50 p-3 text-sm font-semibold text-[var(--mandatory-indicator)]"
            role="alert"
          >
            Davet bağlantısı geçersiz veya eksik.
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAcceptInvitation();
            }}
          >
            <input name="token" type="hidden" value={token} />
            {notice ? (
              <div
                className="rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-3 text-sm font-semibold"
                role="status"
              >
                {notice}
              </div>
            ) : null}
            <label className="block space-y-2 text-sm font-semibold">
              Ad Soyad
              <input
                autoComplete="name"
                className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--primary)]"
                onChange={(event) => setFullName(event.target.value)}
                type="text"
                value={fullName}
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Şifre
              <input
                autoComplete="new-password"
                className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--primary)]"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold">
              Şifre Tekrar
              <input
                autoComplete="new-password"
                className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--primary)]"
                onChange={(event) => setPasswordConfirm(event.target.value)}
                type="password"
                value={passwordConfirm}
              />
            </label>
            <button
              className="h-10 w-full rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
              type="submit"
            >
              Daveti Kabul Et
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
