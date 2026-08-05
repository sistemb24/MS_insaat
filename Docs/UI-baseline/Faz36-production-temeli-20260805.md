# Faz 36 — Production Temeli Kanıt Kaydı

Tarih: 05.08.2026
Kapsam: Onaylı Production Aday A kaynakları ve secret yüzeyleri
Yayın kararı: **NO-GO — temel hazır, canlı işlem kapalı**

## Onaylanan kararlar

- Production domain adayı `insaatyonet.com`.
- Proje sahibi, teknik operasyon, DB recovery ve veri/hukuk sahibi Murat
  Saygı'dır.
- Bağımsız yedek kişi yoktur; Murat Saygı tek-sorumlu riskini açıkça kabul
  etmiştir.
- Hedef RPO 24 saat, hedef RTO 8 saat, backup günlük ve retention 30 gündür.
- Destek penceresi hafta içi 09:00–18:00 Europe/Istanbul; dış SLA yoktur.
- Resmi yayın girdileri: MS İNŞAAT, Atakum-Samsun,
  `info@msinsaat.com`, veri sorumlusu Murat Saygı; hukuk içerik onayı
  05.08.2026.

Bu onay yalnız production temelini hazırlama yetkisidir. Migration,
deployment, DNS/TLS kaydı, indexing, PR merge ve kullanıcı trafiği ayrıca açık
onay ister.

## Oluşturulan ayrı production kaynakları

| Alan | Kaynak | Bölge / kapsam | Durum |
|---|---|---|---|
| Runtime ve secret injection | Vercel `murat-saygis-projects/insaat-yonetim` Production environment | `fra1` sözleşmesi | 19 encrypted Production değişkeni hazır; deployment yapılmadı |
| PostgreSQL | Neon `noa-insaat-production`, proje `rough-glade-94105893`, branch `production` | AWS Frankfurt `eu-central-1`, PostgreSQL 18 | Boş ve migration uygulanmadı |
| Doküman storage | R2 `noa-insaat-production-eu` | EU jurisdiction, private | Runtime tokenı yalnız bu bucket'a read/write yetkili |
| Backup storage | R2 `noa-insaat-production-backups-eu` | EU jurisdiction, private | 30 günlük delete lifecycle etkin; ayrı backup writer hazır |
| Recovery document reader | Ayrı R2 read tokenı | Yalnız production doküman bucket'ı | GitHub encrypted secret yüzeyinde hazır |
| Monitoring | Sentry `MS-INSAAT/noa-insaat-production` | DE region | DSN Production secret yüzeyinde; uygulama adaptörü henüz production'ı etkinleştirmiyor |

Bucket'larda public access veya custom domain açılmadı. Credential değerleri
repo, belge, komut çıktısı veya sohbet metnine yazılmadı; yalnız sağlayıcıların
encrypted secret yüzeylerine aktarıldı ve geçici aktarım belleği temizlendi.

## Secret ve değişken envanteri

Vercel Production ortamında aşağıdaki 19 encrypted değişken ad düzeyinde
doğrulandı:

`APP_BASE_URL`, `DATABASE_URL`, `AUTH_SECRET`, `NOA_RUNTIME_ENV`,
`NOA_DOCUMENT_STORAGE_PROVIDER`, `NOA_DOCUMENT_STORAGE_DIR`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`,
`SENTRY_DSN`, `SUPER_ADMIN_TOTP_ENCRYPTION_KEY`,
`NOA_LEGAL_COMPANY_NAME`, `NOA_LEGAL_ADDRESS`,
`NOA_LEGAL_CONTACT_EMAIL`, `NOA_LEGAL_DATA_CONTROLLER`,
`NOA_LEGAL_CONTENT_APPROVED_AT`, `NOA_PUBLIC_INDEXING_ENABLED`,
`NOA_TRUST_PROXY`.

GitHub Actions repository secret yüzeyinde şu adlar hazırdır:

`PRODUCTION_DATABASE_URL`, `PRODUCTION_R2_READ_ACCESS_KEY_ID`,
`PRODUCTION_R2_READ_SECRET_ACCESS_KEY`,
`PRODUCTION_R2_BACKUP_ACCESS_KEY_ID`,
`PRODUCTION_R2_BACKUP_SECRET_ACCESS_KEY`.

Hassas olmayan GitHub repository değişkenleri:

`PRODUCTION_R2_BUCKET`, `PRODUCTION_R2_ENDPOINT`,
`PRODUCTION_R2_BACKUP_BUCKET`, `PRODUCTION_R2_BACKUP_ENDPOINT`.

Bu GitHub adları henüz bir production workflow'una bağlanmadı; hiçbir backup,
restore, migration veya deployment tetiklenmedi.

## Açık canlı yayın kapıları

1. Neon Free planın yerleşik geçmişi 6 saattir. Onaylı günlük/30 gün backup
   politikası ancak bağımsız production backup workflow'u çalıştırılıp
   checksum ve izole restore ile ölçüldüğünde karşılanmış sayılır.
2. Production DB boş ve migration uygulanmamıştır. İlk backup/checksum ile
   migration preflight ayrı açık onay bekler.
3. Mevcut Sentry adaptörü staging-only fail-closed davranır. Production DSN
   hazır olsa da production-safe adaptör ve redaction/alarm testi yapılmadan
   monitoring kapısı geçmez.
4. `insaatyonet.com` için DNS çözümü, Vercel domain bağlama, TLS kabulü,
   canonical/header kontrolü ve kapalı trafik smoke'u yapılmamıştır.
5. Yasal kimlik değişkenleri hazırdır; yayın sayfalarının gerçek hukuk içeriği
   doğrulanmadan ve ayrı onay verilmeden indexing açılmaz.
6. Bağımsız yedek/escalation kişisi yoktur. Tek-sorumlu risk kabulü kaydedildi;
   bu durum operasyonel dayanıklılık sağlamaz.

Sonuç: ayrı production kaynak ve secret temeli hazırdır; Production Go/No-Go
kararı **NO-GO** kalır.
