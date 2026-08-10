# Production Topoloji ve Sahiplik Karar Kaydı

Tarih: 05.08.2026
Faz: 36 / Dilim 1
Durum: Staging kabulü tamam; production ayrı kaynak ve secret temeli hazır,
canlı yayın NO-GO

Sağlayıcı seçimini kolaylaştıran güncel ve resmî kaynaklı karşılaştırma
`Docs/operasyon/production-provider-aday-mimarileri.md` içindedir. Karşılaştırma
öneridir; aşağıdaki `BLOCKER` kararlarını kendiliğinden onaylamaz.

RPO/RTO, backup, retention, incident ve yalın rol modeli için onay bekleyen
staging önerisi `Docs/operasyon/staging-operasyon-politikasi-taslagi.md`
içindedir. Taslak, kullanıcı onayından önce politika değerlerini yürürlüğe
sokmaz.

## 1. Kayıt kuralları

- Bu belge secret, token, parola, connection string veya credential içermez.
- Bir karar yalnız karar sahibi ve onaylayan ile birlikte `ONAYLANDI` olur.
- Provider paneli, secret store ve sözleşme kayıtları bu belgede linklenebilir;
  gizli değerlerin kendisi yazılmaz.
- `KARAR BEKLİYOR` veya `ATANMADI` olan zorunlu satır canlı yayını engeller.
- Production migration, deployment ve trafik açma ayrıca açık kullanıcı onayı
  olmadan yapılmaz.

## 2. Onaylanmış topoloji ilkeleri

| Karar | Durum | Kaynak |
|---|---|---|
| Development, staging ve production ayrı DB kullanır | ONAYLANDI | RFC-F36-01 varsayım 4 |
| Staging ve production ayrı storage namespace/bucket kullanır | ONAYLANDI | RFC-F36-01 varsayım 4 |
| Staging ve production ayrı secret seti ve domain kullanır | ONAYLANDI | RFC-F36-01 varsayım 4 |
| Staging production ile aynı runtime sınıfı ve release artifact'ini kullanır | ONAYLANDI | RFC-F36-01 varsayım 4 |
| Production DB'de `db push` ve `db seed` çalıştırılmaz | ONAYLANDI | RFC-F36-01 varsayım 5 |
| Canlı deployment/migration/trafik ayrı açık onay ister | ONAYLANDI | RFC-F36-01 varsayım 10 |

## 3. Ortam topolojisi

| Alan | Development — doğrulanan mevcut durum | Staging | Production |
|---|---|---|---|
| Uygulama runtime | Yerel Next.js | Vercel `murat-saygis-projects/insaat-yonetim`; `fra1`; Preview deployment doğrulandı | Aynı Vercel proje, ayrı Production environment; 19 encrypted değişken hazır, deploy yok |
| Domain | `http://localhost:3000` örnek değeri | Geçici korumalı Vercel Preview hostname doğrulandı | `insaatyonet.com` onaylı; DNS/TLS kabulü bekliyor |
| PostgreSQL | Yerel geliştirme bağlantısı | Neon `noa-insaat-staging`; AWS Frankfurt `eu-central-1` | Neon `noa-insaat-production`; AWS Frankfurt `eu-central-1`; boş/migration bekliyor |
| Secret injection | Yerel environment | Vercel Preview secret seti ayrıldı; değerler yalnız provider yüzeyinde | Ayrı Vercel Production ve GitHub encrypted secret setleri hazır |
| Doküman storage | Local adapter, tek instance | R2 `noa-insaat-staging-eu`; EU jurisdiction; private | R2 `noa-insaat-production-eu` ve ayrı backup bucket; private, EU |
| Monitoring | Provider yok | Sentry `javascript-nextjs`; DE; redacted error, staging email dispatch ve insan kabulü doğrulandı | Sentry production telemetry/e-posta kabulü tamam; GitHub freshness Issue alarm sözleşmesi kod hazır, canlı teslim bekliyor |
| Trafik/TLS | Uygulanmaz | Vercel TLS adayı; domain/DNS sahibi bekliyor | DNS/TLS/indexing/trafik değiştirilmedi |
| Release artifact | Yerel build | Vercel build artifact adayı; deployment/rehearsal yapılmadı | Staging ile aynı artifact adayı; production deployment bekliyor |

Development sütunu production yeterliliği anlamına gelmez. `.env.example`
içindeki localhost değeri yalnız örnektir ve production domain kararı sayılmaz.

## 4. Sağlayıcı kararları

| Karar kimliği | Alan | Seçim | Bölge/veri konumu | Karar sahibi | Onaylayan | Durum |
|---|---|---|---|---|---|---|
| F36-PRV-01 | Uygulama hosting/runtime | Vercel Node.js Functions | Frankfurt `fra1` / `eu-central-1` | Murat Saygı | Murat Saygı — 04.08.2026 | KAYNAK HAZIR / DEPLOY BEKLİYOR |
| F36-PRV-02 | PostgreSQL | Neon AWS Europe | Frankfurt `eu-central-1` | Murat Saygı | Murat Saygı — 04.08.2026 | KAYNAK HAZIR / MIGRATION BEKLİYOR |
| F36-PRV-03 | Secret injection | Vercel Preview environment | Frankfurt runtime; ayrı secret seti | Murat Saygı | Murat Saygı — 04.08.2026 | PREVIEW SECRET SETİ HAZIR |
| F36-PRV-04 | Object storage | Cloudflare R2 | `eu` jurisdiction | Murat Saygı | Murat Saygı — 04.08.2026 | RUNTIME VE BACKUP BUCKET HAZIR |
| F36-PRV-05 | Monitoring/error tracking | Sentry | DE region | Murat Saygı | Murat Saygı — 05.08.2026 | STAGING REDACTED ERROR + ALARM + İNSAN KABULÜ TAMAM |
| F36-PRV-06 | DNS/TLS/CDN/WAF | Geçici Vercel hostname; özel DNS ertelendi | Frankfurt runtime | Murat Saygı | Murat Saygı — 04.08.2026 | ONAYLI / HOSTNAME KANITI DİLİM 2 |
| F36-PRV-07 | DB+binary backup hedefi | Neon PITR + bağımsız DB export + R2 binary recovery | EU | Murat Saygı | Murat Saygı — 04.08.2026 | ONAYLI / RESTORE KANITI DİLİM 3 |

Aday A yalnız staging için kullanıcı tarafından onaylandı. Vercel runtime
`fra1`, Neon DB aynı `eu-central-1`, R2 `eu` jurisdiction ve Sentry DE olarak
karara işlendi. Bu karar dış kaynak, hesap, credential veya deployment
oluşturma yetkisi değildir; sahiplik ve politika blocker'ları açık kalır.

04.08.2026 tarihinde kullanıcının ayrıca verdiği açık kaynak/credential
yetkisiyle staging Vercel, Neon, R2 ve Sentry kaynakları oluşturuldu. Secret
değerleri repo veya belgeye yazılmadı. Doküman bucket'ından ayrı
`noa-insaat-staging-backups-eu` backup bucket'ı oluşturuldu ve 14 günlük
lifecycle kuralı etkinleştirildi. Gerçek deployment, migration, backup ve
izole restore yapılmadığından RPO/RTO sağlandı iddiası henüz kurulmaz.

05.08.2026 tarihinde kullanıcı Production Aday A ve `insaatyonet.com`
kararını ayrıca onayladı. Ayrı Neon Frankfurt production projesi, private R2
EU runtime/backup bucket'ları, Sentry DE production projesi ve Vercel
Production/GitHub encrypted secret yüzeyleri hazırlandı. Bu işlem migration,
deployment, DNS/TLS, indexing, PR merge veya trafik açma yetkisi değildir.

SMTP/SMS, PSP, Open Banking, GİB, Arvento ve outbound webhook worker bu
matrisin sağlayıcı seçimine dahil değildir; her biri ayrı RFC ve onay gerektirir.

## 5. Sorumluluk matrisi

| Sorumluluk | Uygulayan/sorumlu | Onaylayan | Yedek/escalation | Durum |
|---|---|---|---|---|
| Uygulama release ve rollback | Murat Saygı | Murat Saygı | YOK — staging tek-sorumlu riski | ONAYLI / STAGING |
| PostgreSQL migration ve restore | Murat Saygı | Murat Saygı | YOK — staging tek-sorumlu riski | ONAYLI / STAGING |
| Hosting, DNS/TLS ve secret store | Murat Saygı | Murat Saygı | YOK — staging tek-sorumlu riski | ONAYLI / STAGING |
| Object storage ve binary recovery | Murat Saygı | Murat Saygı | YOK — staging tek-sorumlu riski | ONAYLI / STAGING |
| Monitoring ve incident koordinasyonu | Murat Saygı | Murat Saygı | YOK — staging tek-sorumlu riski | ONAYLI / STAGING |
| KVKK, retention ve hesap kapanışı | Murat Saygı | Murat Saygı | YOK — production öncesi yeniden karar | ONAYLI / STAGING |
| Resmi şirket/yayın içeriği | Murat Saygı | Murat Saygı | YOK — production öncesi yeniden karar | ONAYLI / STAGING |
| Production release, hosting ve DNS/TLS | Murat Saygı | Murat Saygı | YOK — tek-sorumlu riski kabul edildi | ONAYLI / PRODUCTION KARARI |
| Production DB recovery ve storage | Murat Saygı | Murat Saygı | YOK — tek-sorumlu riski kabul edildi | ONAYLI / PRODUCTION KARARI |
| Production veri/hukuk | Murat Saygı | Murat Saygı | YOK — tek-sorumlu riski kabul edildi | ONAYLI / PRODUCTION KARARI |

Rol aynı kişide birleşecekse hem sorumlu hem onaylayan hücresinde açıkça
gösterilir; boş veya örtük sahiplik kabul edilmez.

## 6. Politika kararları

| Karar | Onaylı değer | Sahip/onaylayan | Durum |
|---|---|---|---|
| Staging hedef RPO | 24 saat | Murat Saygı / Murat Saygı | ONAYLANDI |
| Staging hedef RTO | 8 saat | Murat Saygı / Murat Saygı | ONAYLANDI |
| Staging backup sıklığı ve retention | Günlük; 14 gün | Murat Saygı / Murat Saygı | ONAYLANDI |
| Staging veri/log/session retention | En fazla 30 gün | Murat Saygı / Murat Saygı | ONAYLANDI |
| Staging hesap kapatma ve legal hold | Sentetik veri; production kararı değildir | Murat Saygı / Murat Saygı | ONAYLANDI / STAGING |
| Staging destek saatleri ve SLA | Hafta içi 09:00–18:00; dış SLA yok | Murat Saygı / Murat Saygı | ONAYLANDI |
| Staging incident severity/escalation | SEV-1/2/3; tek sorumlu Murat Saygı | Murat Saygı / Murat Saygı | ONAYLANDI / TEK-SORUMLU RİSKİ |
| Production hedef RPO | 24 saat | Murat Saygı / Murat Saygı | ONAYLANDI / İLK DAILY+FRESHNESS SCHEDULE KABULÜ TAMAM; ALARM TESLİMİ BEKLİYOR |
| Production hedef RTO | 8 saat | Murat Saygı / Murat Saygı | ONAYLANDI / DB-ONLY İZOLE RESTORE 188 SANİYE |
| Production backup sıklığı ve retention | Günlük; 30 gün | Murat Saygı / Murat Saygı | ONAYLANDI / WORKFLOW AKTİF; İLK DAILY+FRESHNESS SCHEDULE KABULÜ GEÇTİ |
| Production destek saatleri ve SLA | Hafta içi 09:00–18:00; dış SLA yok | Murat Saygı / Murat Saygı | ONAYLANDI |
| Production resmi yayın kimliği | MS İNŞAAT; Atakum-Samsun; `info@msinsaat.com`; veri sorumlusu Murat Saygı; hukuk onayı 05.08.2026 | Murat Saygı / Murat Saygı | ONAYLANDI / İÇERİK KABULÜ BEKLİYOR |

Staging RPO 24 saat, RTO 8 saat, günlük backup/14 gün retention, sentetik
staging veri/log retention üst sınırı 30 gün, dış SLA yok ve hafta içi
09:00–18:00 Europe/Istanbul iç destek penceresi kullanıcı tarafından
04.08.2026 tarihinde onaylandı.

09.08.2026 tarihinde `main@cbc5a360` için production preflight 67/68 migration
ve 114 tabloyu doğruladı. Aynı-release `499.682` byte backup oluşturulup
bütünlük kontrolünden geçirildi, tek additive migration sonrasında production
68/68 migration ve 117 tabloya ulaştı. Migration öncesi recovery point'i izole
DB'ye 188 saniyede 67 migration/114 tablo olarak geri yüklendi ve geçici DB
silindi. Document bucket boş olduğundan binary sayısı `0`dır. Günlük workflow
PR `#14` ile `main@e83a0f8c` üzerine merge edildi; ilk manual-once kabul run'ı
`31306444810`, `514.690` byte backup'ı 68/68 migration, 0 pending ve 117 tablo
envanteriyle doğruladı. Bu koşular RTO hedefinin içinde DB-only kanıttır.

10.08.2026 tarihli ilk gerçek daily schedule run'ı `31354396933`,
event=`schedule`, attempt `1` ve `main@554f6850` üzerinde başarılı oldu. Backup
`20260810T040536Z-554f6850cd509bc25a6bff7f4480a38ce3d6f443`, `514.758` byte
DB, binary `0`, 68/68 migration, 0 pending ve 117 tablo olarak doğrulandı.

Freshness sözleşmesi `04:15 UTC` schedule ve azami `24 saat` manifest yaşıyla
hazırlandı. Ayrı read-only R2 credential yalnız backup bucket `List/Get` için
GitHub Actions'a tanımlandı; `main@dd578d3d` manuel kabul run'ı `31310479037`
mevcut backup'ı `fresh=true`, `1,64 saat` yaş ve `24 saat` eşikle doğruladı.
Kırmızı schedule veya credential-free rehearsal sonucunu sabit/dedupe GitHub
Issue alarmına dönüştüren ayrı notifier sözleşmesi kod hazırdır. İlk gerçek
freshness schedule run'ı `31359430834`, event=`schedule`, attempt `1` ve aynı
release üzerinde başarılı oldu; en yeni backup `ageHours=1,6089`,
`maxAgeHours=24`, `fresh=true`, `status=fresh`, `514.758` byte DB ve `0` binary
nesne olarak doğrulandı. Canlı rehearsal issue'su ve insan e-posta teslim
kabulü ayrıca bekler; tek günlük schedule başarısı sürekli 24 saat RPO garantisi
değildir.

## 7. Dilim 1 kabul kapısı

Dilim 1 ancak aşağıdakilerin tamamı sağlandığında tamamlanır:

- F36-PRV-01–07 satırlarının seçim, bölge, sahip ve onaylayan alanları doludur.
- Sorumluluk matrisinde `ATANMADI` kalmamıştır.
- Staging/production domain ve ortam ayrımı somutlaştırılmıştır.
- RPO, RTO, backup retention, incident ve hukuki veri yaşam döngüsü sahipleri
  karara bağlanmıştır.
- Kararlarda credential veya kişisel veri bulunmadığı doğrulanmıştır.

Staging için bu kapı 04.08.2026 tarihinde geçildi. Production sağlayıcı,
domain, sahiplik ve politika kararları açık kalır; Dilim 2 yalnız staging
hazırlığı ve kanıtıyla sınırlıdır.

## 9. Dilim 2 yerel platform preflight durumu

- Repository kökündeki `vercel.json`, Vercel Node.js Functions bölgesini yalnız
  `fra1` olarak sabitler.
- Route/function override, onaysız failover region ve `vercel.json` içine
  environment değeri yazılması testli preflight tarafından reddedilir.
- `npm run staging:platform:verify` secret okumadan yalnız statik platform
  sözleşmesini doğrular.
- Vercel proje/environment, Neon DB, R2 bucket, Sentry proje, staging hostname
  ve credential henüz oluşturulmamıştır.
- Yerel preflight dış kaynak oluşturma veya deployment yetkisi değildir.

Yerel preflight doğrulama kanıtı
`Docs/UI-baseline/Faz36-dilim2-yerel-staging-preflight-20260804.md` içindedir.
353 test dosyası/1.872 test, type-check, Prisma validate, lint, Next.js 16.2.9
build, 1.345 dosyalık secret scan ve `fra1` platform doğrulaması yeşildir.

## 8. Kullanıcı yanıt şablonu

Aşağıdaki alanlar düz metinle doldurulabilir; bilinmeyenler `karar bekliyor`
olarak bırakılabilir:

```text
Production domain / DNS sahibi: karar bekliyor
Hosting sağlayıcısı / bölge: karar bekliyor
PostgreSQL sağlayıcısı / bölge: karar bekliyor
Secret store: karar bekliyor
Object storage / veri bölgesi: karar bekliyor
Monitoring / incident sorumlusu: karar bekliyor
Backup hedefi / sıklık / retention: karar bekliyor
Release sorumlusu / onaylayan: karar bekliyor
DB sorumlusu / onaylayan: karar bekliyor
Hukuk-KVKK sorumlusu / onaylayan: karar bekliyor
Hedef RPO / RTO: karar bekliyor
Destek saatleri / SLA: karar bekliyor
Resmi yayın girdilerinin sahibi: karar bekliyor
```
