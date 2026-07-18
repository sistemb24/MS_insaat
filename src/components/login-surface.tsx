import type { SessionOption } from "@/lib/session-options";

type LoginSurfaceProps = {
  loginAction: (formData: FormData) => void | Promise<void>;
  loginError?: boolean;
  sessionOptions: SessionOption[];
};

export function LoginSurface({
  loginAction,
  loginError = false,
  sessionOptions,
}: LoginSurfaceProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface)] px-4 py-10 text-[var(--on-surface)]">
      <section className="w-full max-w-[420px] rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-lowest)] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-panel)] bg-[var(--primary)] text-sm font-bold text-white">
            NOA
          </div>
          <div>
            <h1 className="text-lg font-semibold">NOA İnşaat</h1>
            <p className="text-sm text-[var(--on-surface-variant)]">
              İnşaat Yönetim SaaS
            </p>
          </div>
        </div>

        <form action={loginAction} autoComplete="off" className="space-y-4">
          {loginError ? (
            <div className="rounded-[var(--radius-panel)] border border-[var(--mandatory-indicator)] bg-red-50 p-3 text-sm font-semibold text-[var(--mandatory-indicator)]">
              E-posta veya şifre hatalı.
            </div>
          ) : null}
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-[var(--on-surface-variant)]"
              htmlFor="email"
            >
              E-posta
            </label>
            <input
              autoComplete="off"
              className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--primary)]"
              id="email"
              name="email"
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-[var(--on-surface-variant)]"
              htmlFor="password"
            >
              Şifre
            </label>
            <input
              autoComplete="new-password"
              className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] px-3 text-sm font-semibold outline-none transition focus:border-[var(--primary)]"
              id="password"
              name="password"
              type="password"
            />
          </div>
          <button
            className="h-10 w-full rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
            type="submit"
          >
            Giriş Yap
          </button>
        </form>

        {sessionOptions.length > 0 ? (
          <div className="mt-5 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--on-surface-variant)]">
              Demo hesaplar
            </p>
            <ul className="space-y-1 text-sm">
              {sessionOptions.map((option) => (
                <li className="font-semibold" key={option.id}>
                  {option.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[var(--on-surface-variant)]">
              Şifre: Demo123!
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--on-surface-variant)]">
              Yeni şantiye ve diğer kayıt işlemleri için Muhasebe hesabı:
              <br />
              <span className="font-semibold">muhasebe@noa.local</span>
              <br />
              <span className="font-semibold">Demo123!</span>
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              Salt Okur hesabında tüm yazma butonları güvenlik gereği pasiftir.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-[var(--radius-panel)] border border-[var(--grid-border)] bg-[var(--surface-container-low)] p-4 text-sm text-[var(--on-surface-variant)]">
            Aktif oturum bulunamadı.
          </div>
        )}
      </section>
    </main>
  );
}
