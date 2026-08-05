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

## Alarm/escalation kapanışı

Sentry'deki mevcut `Send a notification for high priority issues` kuralı
`javascript-nextjs` projesinde yalnız `staging` environment'ına daraltıldı.
Kural yeni veya yeniden yüksek öncelikli işaretlenen issue'larda Suggested
Assignees, bulunamazsa Recently Active Members hedefine her trigger'da bildirim
üretir.

Gerçek redacted smoke issue'su kural geçmişinde `1` trigger ve `1` alert
oluşturdu. Organizasyonda tek Owner üye bulunduğu; bu hesabın Issue Alerts
tercihinin `On` ve teslim yönteminin `Email` olduğu provider ekranında
doğrulandı. Kullanıcının bu turdaki açık devam onayıyla `Send Test
Notification` aksiyonu da çalıştırıldı; provider arayüzü hata vermedi.

Bu kanıt Sentry kuralı, staging filtresi, provider-side trigger ve e-posta
dispatch zincirini kapatır. Murat Saygı, test e-postasını aldığını 05.08.2026
tarihinde açıkça onayladı.

Incident masa başı sonucu:

- Senaryo: staging'de sentetik yüksek öncelikli redacted server error.
- Severity: `SEV-3`; production, gerçek kullanıcı veya veri etkisi yok.
- Detection/escalation: Sentry issue → staging alarmı → Owner e-postası → insan
  teslim onayı zinciri geçti.
- Triage: `environment=staging`, doğru release, yalnız `noa.*` etiketleri,
  users `0`, ham olayda PII/request alanı yok; health ve DB readiness yeşil.
- Karar: sentetik prova ve sağlıklı runtime nedeniyle rollback, forward-fix veya
  restore gerekmedi; issue kanıt olarak tutuldu.
- Kapanış: geçici smoke anahtarı silinmiş ve endpoint `404`; tek-sorumlu insan
  riski production öncesi açık kalır.

Staging kabulünde error olayları merkezi ve redacted tutulur; log, trace,
replay ve client telemetry veri minimizasyonu gereği kapalı kalır. Health ve
readiness operasyon sinyalidir. Bu sınırlarla Faz 36 Dilim 4 tamamlandı.
Production deployment, migration, merge veya trafik yetkisi verilmez.
