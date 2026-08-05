# Faz 35 Dilim 7 — Operasyon ve Deployment Hazırlığı

Tarih: 04.08.2026
Durum: Tamamlandı; external production sahipleri/provider'ları bloklu

## Uygulanan sınırlar

- `/api/health` bağımlılıksız liveness, `/api/readiness` sabit DB probe'lu
  fail-closed readiness olarak eklendi. Yanıtlar `no-store`, ayrıntısız ve
  readiness başarısızlığında HTTP 503'tür.
- Structured log sınırı JSON line üretir; authorization, cookie, parola,
  secret, token, OTP/TOTP, session, API key ve database URL anahtarlarını iç
  içe yapılarda redacted eder. `Error` yalnız adıyla serileştirilir.
- Doküman yükleme ve indirme aynı `createDocumentStorageRuntime` portundan
  adapter alır. Mevcut adapter açıkça `local` kalır; bulut/object storage varmış
  gibi gösterilmez.
- `.github/workflows/ci.yml` PostgreSQL 17 servisi üzerinde frozen pnpm install,
  generate/validate/migrate, test, type-check, lint ve build kapılarını tanımlar.
  Workflow bu çalışma kapsamında uzak GitHub üzerinde çalıştırılmamıştır.
- `Docs/operasyon/production-operations-runbook.md` migrate, backup/restore,
  rollback, incident, retention ve hesap kapanışı dry-run'ını; atanmadığı sürece
  yayını bloklayan sorumluluk matrisini tanımlar.

## Kabul kanıtı

- Hedefli kapılar: 7 test dosyası, 13 test; type-check ve lint PASS.
- Canlı Next.js 16.2.9 HTTP kabulü:
  - `/api/health`: HTTP 200, `{"status":"ok"}`
  - `/api/readiness`: HTTP 200, DB `ready`
  - iki route da `Cache-Control: no-store, max-age=0`
- Readiness negatif testi DB hatasında ayrıntı sızdırmadan HTTP 503 üretir ve
  redacted operasyon eventi yazar.
- Geliştirme sunucusu kabul sonunda kapatıldı.

## External blocker'lar

Hosting/TLS/secret store, monitoring, PostgreSQL backup/restore sahibi, object
storage ve binary backup, incident sahibi, RPO/RTO/SLA ile retention/KVKK onayı
atanmamıştır. Bu dilim deployment yapmaz ve production-ready iddiası üretmez.

## Rollback sınırı

Health/readiness route'ları, logger, storage factory, CI ve belgeler bağımsız
geri alınabilir. Local adapter davranışı ve document metadata şeması değişmedi;
migration veya veri dönüşümü yoktur.
