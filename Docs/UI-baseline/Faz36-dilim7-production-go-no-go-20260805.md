# Faz 36 Dilim 7 — Production Go/No-Go

Tarih: 05.08.2026
Karar: **NO-GO**
Kapsam: Salt-okunur production hazırlık denetimi ve ayrı canlı yayın onay paketi

## Yönetici özeti

Release adayı kod, CI, staging runtime, migration, tenant izolasyonu,
DB+binary recovery, redacted monitoring ve uygulama rollback provası açısından
yeşildir. Bu kanıtlar yalnız staging kapsamındadır. Production kaynakları,
politikaları, sahiplik imzaları ve resmi yayın girdileri tamamlanmadığı için
production migration, deployment, domain/DNS değişikliği, indexing ve trafik
açma kapalıdır.

Bu karar bir yazılım regresyonu değildir. Eksikler dış karar ve production
altyapısı eksikleridir; staging değerleri production taahhüdü sayılmamıştır.

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
| P-B01 | Production hosting ve ayrı environment | Vercel Production'da environment variable yok; tek production deployment `dpl_ArfCNdipMAxoTp2asvu9F1idRBBg` `Error` | ATANMADI / ATANMADI | BLOCKER |
| P-B02 | Production domain, DNS ve TLS | Hesapta `insaatyonet.com` var; production domaini olarak onaylanmadı, DNS yapılandırması eksik ve hostname çözülmüyor | ATANMADI / ATANMADI | BLOCKER |
| P-B03 | Ayrı production PostgreSQL | Provider, bölge, kaynak ve erişim kararı yok | ATANMADI / ATANMADI | BLOCKER |
| P-B04 | Ayrı production secret seti ve rotation | Production secret seti yok; staging credential'ları taşınamaz | ATANMADI / ATANMADI | BLOCKER |
| P-B05 | Production object storage ve backup | Ayrı bucket/credential, encryption/retention ve ortak DB+binary recovery point kararı yok | ATANMADI / ATANMADI | BLOCKER |
| P-B06 | Production monitoring ve incident | Production Sentry/DPA/alarm/escalation hedefi yok | ATANMADI / ATANMADI | BLOCKER |
| P-B07 | Production RPO/RTO, backup retention ve SLA | Yalnız staging için 24 saat/8 saat/14 gün ve dış SLA yok kararı var | ATANMADI / ATANMADI | BLOCKER |
| P-B08 | KVKK, retention ve hesap kapanışı | Production süreleri, legal hold ve destructive delete yetkisi onaylanmadı | ATANMADI / ATANMADI | BLOCKER |
| P-B09 | Resmi yayın içeriği | Şirket adı, adres, resmi iletişim, veri sorumlusu ve hukuk onay tarihi yayın girdileri yok | ATANMADI / ATANMADI | BLOCKER |
| P-B10 | Operasyon ayrılığı ve değişiklik penceresi | Tüm staging rolleri tek kişide; production rolleri ve yedek/escalation atanmadı | ATANMADI / ATANMADI | BLOCKER |
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
- Production değişikliği: yapılmadı.
- Production verisi: okunmadı veya kopyalanmadı.
- Domain/DNS/TLS/trafik: değiştirilmedi.
- PR: merge edilmedi; draft durumda bırakıldı.
- Yeniden değerlendirme: P-B01–P-B11 kapatılıp sorumlu imzaları kaydedildikten
  sonra yapılır.
