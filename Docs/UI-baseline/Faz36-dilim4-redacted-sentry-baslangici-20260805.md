# Faz 36 Dilim 4 — Redacted Sentry Başlangıç Kanıtı

Tarih: 05.08.2026  
Kapsam: Yalnız staging Preview error monitoring başlangıcı  
Durum: Redacted error aktarımı kanıtlandı; alarm/escalation provası açık

## Uygulanan sınır

- `@sentry/nextjs` yalnız Node.js server instrumentation olarak eklendi.
- Aktivasyon `NOA_RUNTIME_ENV=staging` ve geçerli HTTPS `SENTRY_DSN` ile
  fail-closed yapılır.
- Client telemetry, replay, log ve tracing açılmadı; source-map upload tokenı
  eklenmedi.
- PII, user, request/response header, cookie, query, HTTP body, DB sorgu verisi,
  GraphQL/GenAI payloadı ve stack local değişkenleri SDK düzeyinde kapalıdır.
- Outgoing event allowlist'i exception tipi ve güvenli stack konumu, release,
  environment ve yalnız `noa.*` etiketlerini bırakır.

## Gerçek staging kanıtı

İlk kontrollü smoke çağrısı SDK'nın başlatıldığını ancak Vercel Preview
`SENTRY_DSN` değerinin beklenen Sentry proje kimliğiyle eşleşmediğini gösterdi.
Doğru `javascript-nextjs` proje DSN'si Sentry provider ekranından alınarak
yalnız Vercel Preview sensitive environment alanında güncellendi; secret repo,
log veya belgeye yazılmadı.

Güncel secret ile kontrollü smoke çağrısı aşağıdaki güvenli sonucu verdi:

- `sdkConfigured=true`
- `expectedProjectConfigured=true`
- `flushed=true`
- Sentry issue: `JAVASCRIPT-NEXTJS-1`
- Environment: `staging`
- Release: commit `e4c0082` ile başlayan Vercel commit SHA'sı
- Etiketler: `noa.runtime=staging`, `noa.smoke=phase36-dilim4`,
  `noa.telemetry=redacted-errors-only`
- Event/users: `2 / 0`; iki olay kontrollü tanı ve gizlilik doğrulaması içindir.

Son olayın Sentry ham JSON görünümünde `user`, `request`, `ip_address`, `geo`,
cookie, header, query veya body alanı bulunmadı. Project server-side data
scrubbing ve default scrubber'lar açık; `Prevent Storing of IP Addresses`
ayarı ayrıca etkinleştirildi.

## Kapanış ve geri dönüş

Tek seferlik, dal-sınırlı Preview `NOA_OBSERVABILITY_SMOKE_ENABLED` değişkeni
kanıt sonrası Vercel provider secret ortamından silindi. Kapanış Preview
deployment'ı:

- `https://insaat-yonetim-2bt1j0i55-murat-saygis-projects.vercel.app`
- `/api/health` → `200 {"status":"ok"}`
- `/api/readiness` → `200`, database `ready`
- Yetkili smoke başlığıyla `/api/observability-smoke` → `404 not_found`

Kod kapıları:

- Hedefli observability testleri: 2 dosya / 6 test geçti.
- İlk implementasyon tam kapıları: 359 dosya / 1.899 test, type-check, Prisma
  validate, lint, Next.js 16.2.9 build ve diff-check geçti.
- Tanılama sertleştirmesi GitHub Actions `31011311596`: `validate` geçti.
- Vercel deployment check geçti.

## Açık kapı

Bu kayıt yalnız redacted error aktarımını kapatır. Sentry alarm kuralı,
bildirim hedefi, action-time onaylı alarm testi, escalation teslim kanıtı ve
incident masa başı provası tamamlanmadan Faz 36 Dilim 4 kapanmaz. Production
deployment, migration, merge veya trafik yetkisi verilmez.
