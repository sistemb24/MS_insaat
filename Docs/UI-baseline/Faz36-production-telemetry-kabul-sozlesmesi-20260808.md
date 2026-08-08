# Faz 36 — Production telemetry kabul sözleşmesi

Tarih: 08.08.2026
Durum: Tamamlandı; tek canlı event, alarm ve e-posta escalation doğrulandı

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

## Canlı kabul kanıtı

| Kanıt | Sonuç |
| --- | --- |
| Merge | PR #7; `40df977805da662b692cbc133a2be1403a9a8b89` |
| Production bölgesi | `fra1` |
| Yetkili smoke isteği | `202 Accepted`; yalnız bir kez gönderildi |
| Sentry organizasyon / proje | `ms-insaat` / `noa-insaat-production` (`4511859248791632`) |
| Sentry issue | `NOA-INSAAT-PRODUCTION-1`; issue kimliği `139567519` |
| Event sayısı / kullanıcı | `1` / `0` |
| Ortam / release | `production` / `40df977805da` |
| Kabul etiketi | `noa.smoke=phase36-production-acceptance` |
| Gizlilik etiketleri | `noa.runtime=production`; `noa.telemetry=redacted-errors-only` |
| Switch kapatma | `NOA_OBSERVABILITY_SMOKE_ENABLED` Production secret listesinden kaldırıldı |
| Kapatma doğrulaması | Production health `200`; tam confirmation ile smoke route `404` |

Sanitizer serbest hata mesajını bilerek saklamadığı için issue başlığı `Error`
olarak oluşur. Bu nedenle `NoaProductionObservabilitySmoke` metniyle yapılan ilk
sorgu yanlış negatif üretmiştir. Kabul kanıtı tam
`noa.smoke=phase36-production-acceptance` etiketiyle doğrulanmıştır.

## Alarm/escalation kabul kanıtı

| Kanıt | Sonuç |
| --- | --- |
| Alert kuralı | `Send a notification for high priority issues`; kural kimliği `742702` |
| Bağlı proje | `noa-insaat-production` |
| Canlı event kural geçmişi | 08.08.2026 12:42 UTC; `1 trigger / 1 alert` |
| Trigger | Yeni veya yeniden yüksek öncelikli issue |
| Throttle | Her trigger'da bildir |
| Hedef | Suggested Assignees; bulunamazsa Recently Active Members |
| Kişisel tercih | Issue Alerts `On`; teslim yöntemi `Email` |
| Organizasyon alıcısı | Tek Owner hesabı |
| İlk canlı alert e-postası | İnsan teslim teyidi alınamadı |
| Tekrar gönderim | `Send Test Notification`; provider arayüzünde hata yok |
| İnsan kabulü | Murat Saygı test e-postasını 08.08.2026 tarihinde aldığını teyit etti |

İlk canlı alert e-postasının alınmaması gizlenmez: provider kural geçmişi alert
oluşumunu kanıtlar fakat ilk dispatch'in insan posta kutusuna teslimini
kanıtlamaz. Ayrı kullanıcı onayıyla gönderilen test bildiriminin teslim alınması;
aynı etkin Production kuralı, açık e-posta tercihi, tek Owner hedefi ve provider
e-posta yolunun çalıştığını kanıtlar. Kural veya environment ayarı bu test
sırasında değiştirilmemiştir.

## Kapsam dışında kalanlar

- Custom domain, DNS/TLS, indexing ve trafik değiştirilmedi.

## Ayrı canlı kabul çevrimi

Çevrim ayrı açık onayla tamamlandı: geçici switch açıldı, Production redeploy
yapıldı, tam confirmation ile yalnız bir olay gönderildi, Sentry Production
projesinde redaction/proje/event kanıtı alındı, switch kaldırıldı ve kapalı
artifact yeniden deploy edilerek route'un tekrar `404` olduğu doğrulandı.
