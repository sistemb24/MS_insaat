# Faz 36 — Production-safe gözlemlenebilirlik sözleşmesi

Tarih: 08.08.2026
Durum: Kod ve kalite kapıları tamam; provider etkinleştirmesi kapalı

## Kapsam

Production sunucu hatalarının ayrı Sentry projesine yalnız doğru ve beklenen
proje kimliğiyle gidebilmesi için fail-closed başlangıç sözleşmesi eklendi.
Bu çalışma Sentry olayı üretmez, provider secret değiştirmez, deployment veya
kullanıcı trafiği başlatmaz.

## Güvenlik sınırı

- `NOA_RUNTIME_ENV=production` için `SENTRY_DSN` HTTPS olmalıdır.
- DSN içindeki sayısal proje kimliği encrypted `SENTRY_EXPECTED_PROJECT_ID` ile
  birebir eşleşmelidir.
- Production, staging proje kimliği `4511394440151120` ile çalışmayı reddeder.
- Eksik DSN, eksik expected-project, geçersiz DSN, beklenmeyen proje veya
  staging/production dışı runtime telemetry'yi kapalı tutar.
- Mevcut sanitizer request, user, cookies, extra, serbest hata mesajları ve
  stack-frame local/context verilerini dışarıda bırakır; yalnız izinli `noa.*`
  etiketleri ve sınırlı stack metadata'sı kalır.
- Trace, log ve varsayılan PII toplama kapalıdır. Staging smoke endpoint'i
  productionda etkinleşmez.

## Doğrulama

| Kapı | Sonuç |
| --- | --- |
| Hedefli observability/route testleri | 2 dosya, 9 test geçti |
| Tam test | 361 dosya, 1.917 test geçti |
| `pnpm type-check` | geçti |
| `pnpm db:validate` | geçti |
| `pnpm lint` | geçti |
| `pnpm build` | geçti; 102 route |

## Bilinçli olarak yapılmayanlar

1. `SENTRY_EXPECTED_PROJECT_ID` provider secret'ı yapılandırılmadı.
2. Production Sentry event/alarmı ve e-posta escalation provası yapılmadı.
3. Production deployment, DNS/TLS, indexing veya kullanıcı trafiği değiştirilmedi.

## Sonraki onay kapısı

Murat Saygı'nın açık onayıyla yalnız Vercel Production secret yüzeyine doğrulanmış
production Sentry proje kimliği girilir; ardından kapalı telemetry kabul provası
ayrı çalıştırılır. Bu onay, deployment veya trafik açma yetkisi vermez.
