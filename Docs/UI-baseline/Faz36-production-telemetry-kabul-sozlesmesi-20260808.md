# Faz 36 — Production telemetry kabul sözleşmesi

Tarih: 08.08.2026
Durum: Kod ve kalite kapıları tamam; gerçek telemetry olayı kapalı

## Amaç

Production Sentry entegrasyonunu kullanıcı verisi veya gerçek bir uygulama
hatası kullanmadan, tek sabit ve redacted sentetik olayla doğrulayacak geçici
bir kabul kapısı hazırlamaktır.

## Fail-closed yetki koşulları

Production smoke yalnız aşağıdaki koşulların tamamında çalışır:

1. `NOA_RUNTIME_ENV=production`.
2. Geçici `NOA_OBSERVABILITY_SMOKE_ENABLED=true` switch'i.
3. Tam `x-noa-observability-confirmation: production-observability` header'ı.
4. Geçerli HTTPS `SENTRY_DSN`.
5. DSN proje kimliğinin `SENTRY_EXPECTED_PROJECT_ID` ile birebir eşleşmesi.
6. Proje kimliğinin staging kimliği `4511854028456016` olmaması.

Koşullardan biri eksikse route `404` döner ve `captureException` çağrılmaz.
Production olayı yalnız `NoaProductionObservabilitySmoke` sabit adını ve
`noa.smoke=phase36-production-acceptance` etiketini taşır. Mevcut sanitizer;
request, user, cookies, serbest metin, local variables ve PII alanlarını dışarıda
tutmaya devam eder.

## Doğrulama

| Kapı | Sonuç |
| --- | --- |
| Hedefli guard + route testleri | 2 dosya, 12 test geçti |
| Tam test | 361 dosya, 1.920 test geçti |
| `pnpm type-check` | geçti |
| `pnpm db:validate` | geçti |
| `pnpm lint` | geçti |
| `pnpm build` | geçti; 102 route |

## Bilinçli olarak yapılmayanlar

- Production geçici switch'i eklenmedi.
- Sentry olayı veya alarmı üretilmedi.
- Production redeploy, custom domain, DNS/TLS, indexing ve trafik değiştirilmedi.

## Ayrı canlı kabul çevrimi

Kod merge edildikten sonra ayrıca açık onayla sırasıyla geçici switch açılır,
Production redeploy yapılır, tam confirmation ile yalnız bir olay gönderilir,
Sentry production projesinde redaction/proje/alarm kanıtı alınır, switch kapatılır
ve kapalı artifact yeniden deploy edilerek route'un tekrar `404` olduğu doğrulanır.
