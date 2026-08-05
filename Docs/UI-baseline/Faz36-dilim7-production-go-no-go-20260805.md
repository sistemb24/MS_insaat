# Faz 36 Dilim 7 — Production Go/No-Go

Tarih: 05.08.2026
Karar: **NO-GO**
Kapsam: Salt-okunur production hazırlık denetimi ve ayrı canlı yayın onay paketi

## Yönetici özeti

Release adayı kod, CI ve staging kabul kapıları açısından yeşildir. Kullanıcı
Production Aday A'yı, `insaatyonet.com` domain kararını, sahiplik/politika
girdilerini ve resmi yayın kimliğini onayladı. Bu yetkiyle ayrı production
Neon, R2 ve Sentry kaynakları ile Vercel/GitHub secret yüzeyleri hazırlandı.
Ancak gerçek production backup/restore, migration preflight, production-safe
monitoring, deployment, DNS/TLS ve kapalı trafik provası yapılmadığı için
production migration, deployment, indexing ve trafik açma kapalıdır.

Bu karar bir yazılım regresyonu değildir. Production temeli hazırdır; canlı
işlem kapıları ve ölçülmüş production recovery/monitoring kanıtları eksiktir.

## Kanıt indeksi

| Kapı | Sonuç | Kanıt |
|---|---|---|
| Release kaynak kodu | GO / staging | `eae8af205fb8fb00372cd25edbc4b658b6a7ae61` için CI `31022440491` geçti |
| Güncel dokümantasyon commit'i | GO | `74291368979fa4e6f2a8a2252c121c59f5003351` için CI `31024339444` geçti |
| Vercel Preview | GO / staging | `fra1`, health `200/ok`, readiness `200/ready`, kritik UI smoke'ları `200` |
| Migration | GO / staging | 67/67 migration, pending yok; 114 public tablo |
| Tenant ve binary recovery | GO / staging | Workflow `31023428795`; yabancı scope `0`, binary checksum eşleşti |
| RPO/RTO ölçümü | GO / staging | Backup yaşı 116 saniye, izole restore 112 saniye; staging hedefleri içinde |
| Rollback/forward | GO / staging | Önceki güvenli artifact ve güncel artifact üzerinde beş smoke; çevrim 35,8 saniye |
| Monitoring/incident | GO / staging | Redacted Sentry olayı, staging-only alarm, e-posta ve insan kabulü doğrulandı |
| Güvenlik/indexing | GO / staging | CSP, HSTS, `X-Robots-Tag`; indexing ve smoke endpoint'i fail-closed |
| PR | GO / inceleme | Draft PR #1 açık, mergeable; CI ve Vercel kontrolleri yeşil |

Detaylı release provası
`Docs/UI-baseline/Faz36-dilim6-staging-release-rehearsal-20260805.md`
içindedir.

## Production engelleri

| Kimlik | Zorunlu kapı | Salt-okunur mevcut durum | Karar sahibi / onaylayan | Durum |
|---|---|---|---|---|
| P-B01 | Production hosting ve ayrı environment | Vercel Production'da 19 encrypted değişken hazır; deployment ve runtime kabulü yapılmadı | Murat Saygı / Murat Saygı | TEMEL HAZIR / BLOCKER |
| P-B02 | Production domain, DNS ve TLS | `insaatyonet.com` onaylandı; DNS/Vercel bağlama, TLS ve kapalı trafik kabulü yapılmadı | Murat Saygı / Murat Saygı | KARAR TAMAM / BLOCKER |
| P-B03 | Ayrı production PostgreSQL | Neon Frankfurt `noa-insaat-production` hazır; DB boş, migration/preflight yapılmadı | Murat Saygı / Murat Saygı | TEMEL HAZIR / BLOCKER |
| P-B04 | Ayrı production secret seti ve rotation | Vercel Production ve GitHub encrypted secret setleri ayrı hazır; rotation provası yapılmadı | Murat Saygı / Murat Saygı | TEMEL HAZIR / BLOCKER |
| P-B05 | Production object storage ve backup | Ayrı private runtime/backup bucket'ları, ayrık tokenlar ve 30 günlük lifecycle hazır; günlük backup/restore ölçülmedi | Murat Saygı / Murat Saygı | TEMEL HAZIR / BLOCKER |
| P-B06 | Production monitoring ve incident | Ayrı Sentry projesi/DSN hazır; kod staging-only, production redaction/alarm provası yok | Murat Saygı / Murat Saygı | TEMEL HAZIR / BLOCKER |
| P-B07 | Production RPO/RTO, backup retention ve SLA | 24 saat/8 saat, günlük/30 gün ve hafta içi 09:00–18:00 dış SLA yok onaylandı; ölçülmedi | Murat Saygı / Murat Saygı | KARAR TAMAM / BLOCKER |
| P-B08 | KVKK, retention ve hesap kapanışı | Veri/hukuk sahibi atandı; hesap kapanışı, legal hold ve destructive delete prosedürü açık | Murat Saygı / Murat Saygı | KISMİ / BLOCKER |
| P-B09 | Resmi yayın içeriği | Resmi kimlik ve hukuk onay tarihi hazır; gerçek hukuk sayfası içeriği/indexing onayı açık | Murat Saygı / Murat Saygı | KISMİ / BLOCKER |
| P-B10 | Operasyon ayrılığı ve değişiklik penceresi | Tüm roller Murat Saygı; bağımsız yedek yok ve tek-sorumlu riski kabul edildi; pencere/abort yetkisi açık | Murat Saygı / Murat Saygı | KISMİ / BLOCKER |
| P-B11 | Merge ve canlı işlem yetkisi | PR draft; production migration/deployment/DNS/trafik için ayrı açık onay yok | Murat Saygı / Murat Saygı | BLOCKER |

GitHub Actions'ın `actions/checkout@v4`, `actions/setup-node@v4` ve
`pnpm/action-setup@v4` adımlarındaki Node.js 20 deprecation uyarısı koşuyu
bozmamaktadır; runner Node.js 24 ile yeşildir. Bu kayıt düşük öncelikli
operasyon borcudur ve yukarıdaki blocker'ların yerine geçmez.

## GO için gerekli karar paketi

Aşağıdaki girdiler açıkça onaylanmadan karar yeniden değerlendirilemez:

1. Production domaini, DNS uygulayanı ve onaylayanı.
2. Hosting/runtime, PostgreSQL, secret store, object storage ve monitoring
   sağlayıcıları ile bölgeleri; staging kaynaklarının aynısı değil ayrı
   production kaynak adları.
3. Release, DB recovery, hosting/secret, monitoring/incident, storage ve
   hukuk/veri yaşam döngüsü için sorumlu, onaylayan ve yedek/escalation.
4. Production RPO, RTO, backup sıklığı/retention, log/audit/session/doküman
   retention, hesap kapanışı/legal hold, destek saatleri ve SLA.
5. Resmi şirket adı, adres, iletişim e-postası, veri sorumlusu ve hukuk içerik
   onay tarihi. Bu girdiler sağlansa bile indexing ayrıca açıkça onaylanır.
6. Değişiklik penceresi, beklenen ilk trafik/veri kapsamı ve abort eşiği.

## Ayrı canlı yayın talebinin sınırı

Yukarıdaki kararların onayı yalnız production temelini hazırlama yetkisi olarak
yorumlanır. Aşağıdaki işlemler her hedef ve sıra açıkça belirtilerek ayrıca
onaylanır:

1. production kaynaklarını oluşturma ve credential'ları yalnız provider secret
   yüzeylerine yazma;
2. ilk production backup/checksum ve migration preflight;
3. `prisma migrate deploy` çalıştırma;
4. production deployment ve kapalı trafik smoke'u;
5. domain/DNS/TLS değişikliği;
6. indexing ve kullanıcı trafiğini açma.

`db push`, `db seed`, destructive schema rollback ve staging credential'ını
production'a kopyalama yasaktır. Readiness `503`, migration uyumsuzluğu,
backup/checksum eksikliği, tenant-scope hatası veya PII sızıntısında yayın
durdurulur; trafik açılmaz. Uygulama rollback'i son güvenli artifact'a yapılır,
DB için additive forward-fix tercih edilir; restore ancak kayıtlı incident ve
yetkili onayla son çaredir.

## Karar kaydı

- Mevcut karar: **NO-GO**.
- Production temel kaynakları ve secret yüzeyleri: hazırlandı; kanıt
  `Docs/UI-baseline/Faz36-production-temeli-20260805.md` içindedir.
- Production canlı işlemi: yapılmadı.
- Production verisi: okunmadı veya kopyalanmadı.
- Domain/DNS/TLS/trafik: değiştirilmedi.
- PR: merge edilmedi; draft durumda bırakıldı.
- Yeniden değerlendirme: P-B01–P-B11 kapatılıp sorumlu imzaları kaydedildikten
  sonra yapılır.
