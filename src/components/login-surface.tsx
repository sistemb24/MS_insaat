import type { SessionOption } from "@/lib/session-options";

type LoginSurfaceProps = {
  loginAction: (formData: FormData) => void | Promise<void>;
  loginError?: boolean;
  rateLimitError?: boolean;
  sessionOptions: SessionOption[];
};

export function LoginSurface({
  loginAction,
  loginError = false,
  rateLimitError = false,
  sessionOptions,
}: LoginSurfaceProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--ds-surface)] px-4 py-10 text-content">
      <section className="w-full max-w-[420px] rounded-ui-panel border border-divider bg-surface-raised p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-ui-panel bg-brand-primary text-sm font-bold text-on-brand">
            NOA
          </div>
          <div>
            <h1 className="text-lg font-semibold">NOA İnşaat</h1>
            <p className="text-sm text-content-subtle">
              İnşaat Yönetim SaaS
            </p>
          </div>
        </div>

        <form action={loginAction} autoComplete="off" className="space-y-4">
          {loginError ? (
            <div className="rounded-ui-panel border border-[var(--ds-danger)] bg-danger-subtle p-3 text-sm font-semibold text-[var(--ds-danger)]">
              E-posta veya şifre hatalı.
            </div>
          ) : null}
          {rateLimitError ? (
            <div className="rounded-ui-panel border border-[var(--ds-danger)] bg-danger-subtle p-3 text-sm font-semibold text-[var(--ds-danger)]">
              Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.
            </div>
          ) : null}
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-content-subtle"
              htmlFor="email"
            >
              E-posta
            </label>
            <input
              autoComplete="off"
              className="h-10 w-full rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-semibold outline-none transition focus:border-brand-primary"
              id="email"
              name="email"
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-content-subtle"
              htmlFor="password"
            >
              Şifre
            </label>
            <input
              autoComplete="new-password"
              className="h-10 w-full rounded-ui-control border border-divider bg-surface-muted px-3 text-sm font-semibold outline-none transition focus:border-brand-primary"
              id="password"
              name="password"
              type="password"
            />
          </div>
          <button
            className="h-10 w-full rounded-ui-control bg-brand-primary px-4 text-sm font-semibold text-on-brand transition hover:bg-brand-primary-strong"
            type="submit"
          >
            Giriş Yap
          </button>
        </form>

        {sessionOptions.length > 0 ? (
          <div className="mt-5 rounded-ui-panel border border-divider bg-surface-muted p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-content-subtle">
              Demo hesaplar
            </p>
            <ul className="space-y-1 text-sm">
              {sessionOptions.map((option) => (
                <li className="font-semibold" key={option.id}>
                  {option.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-content-subtle">
              Şifre: Demo123!
            </p>
            <p className="mt-2 text-xs leading-5 text-content-subtle">
              Yeni şantiye ve diğer kayıt işlemleri için Muhasebe hesabı:
              <br />
              <span className="font-semibold">muhasebe@noa.local</span>
              <br />
              <span className="font-semibold">Demo123!</span>
            </p>
            <p className="mt-2 text-xs leading-5 text-warning">
              Salt Okur hesabında tüm yazma butonları güvenlik gereği pasiftir.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-ui-panel border border-divider bg-surface-muted p-4 text-sm text-content-subtle">
            Aktif oturum bulunamadı.
          </div>
        )}
      </section>
    </main>
  );
}
