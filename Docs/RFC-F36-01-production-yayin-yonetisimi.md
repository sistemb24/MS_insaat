# RFC-F36-01 — Production Yayın Yönetişimi

> Tarih: 04.08.2026
> Durum: Onaylandı — Dilim 1 başladı; dış girdiler bekleniyor

## 1. Amaç ve faz sınırı

Faz 35, uygulama içindeki P0/P1 canlıya hazırlık kusurlarını kapattı; gerçek
PostgreSQL izolasyon kabulü, public/tenant/Süper Admin browser smoke'u ve tam
kalite kapıları yeşil sonuçlandı. Kalan engeller kod kusuru değil; production
domaini, hosting topolojisi, secret store, backup/restore hedefi, object
storage, monitoring, operasyon sahipliği, RPO/RTO/SLA, retention/KVKK ve resmi
yayın girdileri gibi dış kararlardır.

Faz 36'nın amacı bu dış kararları sessizce varsaymak veya sağlayıcı seçmek
değildir. Amaç, her kararı atanmış sahibi, doğrulanabilir kabul kanıtı ve geri
dönüş sınırı bulunan bir production yayın sözleşmesine dönüştürmektir.

Bu RFC onaylanmadan provider SDK'sı, credential, production altyapısı,
migration, DNS/TLS değişikliği veya canlı deployment başlatılmaz. Production'a
trafik açmak ayrıca açık kullanıcı onayı gerektirir.

## 2. Mevcut kanıt tabanı

- Faz 35'in sekiz dilimi tamamlandı; açık P0/P1 yazılım kusuru kalmadı.
- `/api/health` ve DB'ye bağlı `/api/readiness` fail-closed çalışıyor.
- CI; test, type-check, Prisma validate, lint ve build kapılarını tanımlıyor.
- Production env/seed/db-push güvenlik sınırları ve security header tabanı var.
- Structured log redaction ve document-storage runtime portu hazır.
- `Docs/operasyon/production-operations-runbook.md` migration, backup/restore,
  rollback, incident ve retention için dry-run sözleşmesini tanımlıyor.
- Sorumlular, sağlayıcılar ve gerçek staging kanıtı henüz atanmadığı için yayın
  kapısı bilinçli olarak fail-closed.

## 3. Karar ve girdi matrisi

| Alan | Gerekli girdi | Kabul kanıtı | Girdi yoksa davranış |
|---|---|---|---|
| Domain ve trafik | Production domaini, DNS sahibi, TLS/CDN/WAF kararı | Staging DNS/TLS ve header doğrulaması | Public yayın kapalı |
| Uygulama hosting | Runtime/topoloji, bölge, ölçek ve release sahibi | Aynı artifact ile staging deploy/rollback provası | Deployment yapılmaz |
| PostgreSQL | Yönetilen DB/hedef, erişim ve DB sorumlusu | İzole backup/restore, migrate status ve tenant smoke | Migration/yayın yapılmaz |
| Secret store | Secret sahibi, injection ve rotation yöntemi | Redacted startup, rotation ve eski secret iptal kanıtı | Credential etkinleştirilmez |
| Object storage | Provider/bucket/bölge, encryption ve erişim modeli | Upload/read/delete, tenant izolasyonu ve restore provası | Local adapter production'da reddedilir |
| Monitoring | Error/metric/log hedefi, DPA ve incident sahibi | Test alarmı, redaction ve escalation kaydı | “İzleniyor” iddiası kapalı |
| Backup/DR | Backup hedefi, sıklık, saklama, RPO ve RTO | Zamanlı backup ve izole restore tatbikatı | “Yedekli” iddiası kapalı |
| Operasyon | Release, DB ve incident sorumluları; destek saati | Go/no-go ve incident masa başı provası | Yayın kapısı kırmızı |
| Hukuk/veri | Resmi kimlik, KVKK, retention ve hesap kapanışı onayı | Yayın metni ve veri yaşam döngüsü imzası | Indexing/yasal yayın kapalı |
| Dış entegrasyonlar | Ayrı provider, credential, DPA ve iş onayı | Entegrasyon başına ayrı RFC ve sandbox kabulü | Fail-closed/sandbox durumu korunur |

## 4. Kapsam dışı alanlar

- Faz 33–35 auth, Super Admin, public gerçeklik ve güvenlik davranışlarını
  yeniden tasarlamak.
- Gerçek SMTP/SMS, PSP, Open Banking, GİB, Arvento veya outbound webhook
  worker'ını bu fazın doğal yan ürünü olarak açmak.
- Sağlayıcı kararı olmadan generic bir “cloud abstraction” üretmek.
- Credential'ı repo, belge, terminal kaydı, ticket veya log içinde taşımak.
- Onaysız DNS, production DB, production migration veya canlı deployment.
- Onaylanmamış SLA, RPO, RTO, yedeklilik, sertifika ya da uyumluluk iddiası.

## 5. Önerilen 10 temel varsayım

1. Faz 36 yalnız production yayın yönetişimi ve gerekli provider adaptasyonunu
   kapsar; Faz 35'in tamamlanmış ürün yüzeyleri gerçek defect olmadan açılmaz.
2. Kullanıcı tarafından sağlayıcı adı verilmedikçe hosting, PostgreSQL, object
   storage, monitoring, CDN/WAF veya secret store seçimi yapılmaz.
3. Her dış alan için en az bir uygulayan/sorumlu ve bir onaylayan atanır; aynı
   kişi iki rolü taşıyabilirse bu durum karar kaydında açıkça belirtilir.
4. Staging, production ile aynı runtime sınıfı ve artifact'i kullanır; ancak
   ayrı DB, storage namespace, secret seti, domain ve erişim sınırına sahiptir.
5. Production DB'de `db push` ve `db seed` yasak kalır; migration yalnız
   doğrulanmış backup, değişiklik penceresi ve atanmış DB sorumlusuyla çalışır.
6. Object storage adaptasyonu mevcut runtime portundan yapılır; binary ile DB
   metadata'sının ortak recovery point'i kanıtlanmadan local adapter kapatılmaz
   ve “kurtarılabilir” iddiası kurulmaz.
7. Monitoring entegrasyonu ham secret, cookie, token, auth header, tam IP,
   e-posta veya keyfi kişisel veri göndermez; test alarmı redaction ile geçer.
8. RPO, RTO, SLA, retention ve hesap kapatma süreleri kullanıcı/operasyon/hukuk
   girdisidir; Codex bu değerleri ürün davranışından türetmez.
9. Gerçek dış entegrasyonların her biri ayrı kapsam ve onay ister; Faz 36
   altyapısının tamamlanması bu entegrasyonları otomatik etkinleştirmez.
10. Production'a trafik açma, production migration ve irreversible dış işlem
    ayrı açık kullanıcı onayı gerektirir; tüm ön kapılar yeşil olsa bile otomatik
    canlı yayın yapılmaz.

## 6. Önerilen yürütme sırası

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 0 — Karar Kapısı | Bu RFC, karar matrisi, 10 varsayım ve yürütme sırası | Yalnız dokümantasyon; kullanıcı onayı beklenir |
| 1 — Sahiplik ve Topoloji | Release/DB/incident/hukuk sahipleri; staging/production topolojisi; sağlayıcı karar kaydı | Credential veya dış kaynak değişikliği yok |
| 2 — Staging Temeli | Seçilen hosting, PostgreSQL ve secret store için minimum staging kurulumu; aynı artifact release hattı | Production domaini/DB'si/trafiği değişmez |
| 3 — Kalıcı Storage ve Kurtarma | Object storage adapter/config; DB+binary backup/restore tatbikatı; ölçülmüş RPO/RTO sonucu | Sağlayıcı ve retention kararı olmadan başlamaz |
| 4 — Gözlemlenebilirlik ve Incident | Redacted error/metric/log aktarımı; alarm ve escalation provası; runbook sahipliği | DPA/secret/incident sahibi olmadan entegrasyon açılmaz |
| 5 — Domain, TLS ve Yayın İçeriği | Canonical production domaini, DNS/TLS/header kabulü; resmi kimlik/KVKK/retention girdileri | Resmi/yasal onay eksikse indexing kapalı kalır |
| 6 — Staging Release Rehearsal | CI artifact, migrate deploy, health/readiness, tenant izolasyonu, smoke, rollback ve restore kanıt paketi | Gerçekçi staging verisi; production verisi kopyalanmaz |
| 7 — Production Go/No-Go | Kanıt indeksi, açık riskler, sorumlu imzaları ve ayrı canlı yayın talebi | Açık kullanıcı onayı olmadan deploy/migration/trafik yok |

## 7. Dilim 1 için gerekli kullanıcı girdileri

Dilim 1'in uygulanabilmesi için en az aşağıdaki kararların verilmesi gerekir:

1. Production domaini ve DNS'i yönetecek kişi/kurum.
2. Hosting/runtime sağlayıcısı ve tercih edilen bölge.
3. PostgreSQL sağlayıcısı veya işletim sorumlusu.
4. Secret store yöntemi.
5. Object storage sağlayıcısı ve veri bölgesi.
6. Monitoring/error tracking tercihi ve incident sorumlusu.
7. Release, DB ve hukuki/veri yaşam döngüsü sahipleri.
8. Hedef RPO/RTO, backup retention ve destek/SLA beklentisi.
9. Resmi şirket kimliği, iletişim ve KVKK yayın girdilerinin sahibi.

Bu girdilerden eksik olanlar `ATANMADI`/`KARAR BEKLİYOR` olarak kalır; Codex
yerlerine tahminde bulunmaz. Kısmi girdilerle yalnız bağımsız ve geri alınabilir
alt işler yürütülebilir.

## 8. Faz kapanış ölçütü

Faz 36 ancak aşağıdakilerin tamamı kanıtlandığında kapanabilir:

- Sorumluluk matrisi ve dış karar kaydı eksiksizdir.
- Staging release/rollback ve DB+binary restore tatbikatı tekrarlanabilirdir.
- Health/readiness, redacted monitoring ve incident escalation kabulü geçer.
- Domain/TLS/security header ve resmi yayın/indexing kapıları doğrulanır.
- Tam repo kapıları ve tenant izolasyon kabulü release artifact'i üzerinde geçer.
- Production go/no-go paketi açık riskleri ve geri dönüş sınırını listeler.

Fazın kapanması production'a otomatik yayın yetkisi vermez. Canlı deployment,
production migration ve trafik açma için ayrıca açık kullanıcı talimatı gerekir.

## 9. Uygulama durumu

**Dilim 0 tamamlandı — 04.08.2026:** Bölüm 5'teki 10 varsayım ve Bölüm 6'daki
yürütme sırası kullanıcı tarafından onaylandı.

**Dilim 1 başladı — 04.08.2026:** Repo taramasında localhost geliştirme
sözleşmesi dışında doğrulanmış production domaini, hosting, PostgreSQL, secret
store, object storage veya monitoring sağlayıcısı ve atanmış operasyon sahibi
bulunmadı. Onaylı çevre izolasyonu, sorumluluk rolleri, sağlayıcı kararları ve
yayın kapıları `Docs/operasyon/production-topoloji-ve-sahiplik-karar-kaydi.md`
içinde tek kayıt altında toplandı. Dış girdiler tahmin edilmedi; atanması gereken
alanlar `KARAR BEKLİYOR` ve `ATANMADI` durumunda fail-closed kalır.

**Dilim 1 provider kararı — 04.08.2026:** Kullanıcı Aday A'yı yalnız staging
için onayladı. Vercel Node.js Functions `fra1` Frankfurt, Neon AWS Frankfurt
`eu-central-1`, Cloudflare R2 `eu` jurisdiction ve Sentry DE karar kaydına
işlendi. Vercel'in veri kaynağına yakın runtime önerisi ve Neon aynı-bölge
ölçümü nedeniyle Türkiye için `fra1`, kullanıcı yakınlığı ile DB gecikmesini
birlikte gözeten seçimdir. Dış kaynak oluşturulmadı; operasyon sahipleri,
staging domaini, RPO/RTO, retention ve SLA eksik olduğundan Dilim 1 kapanmadı.

**Dilim 1 operasyon politikası önerisi — 04.08.2026:** Aday A staging için
provider yetenekleri resmî kaynaklardan doğrulandı. 24 saat RPO, 8 saat RTO,
14 gün backup retention, 30 gün sentetik staging veri/log üst sınırı, dış SLA
olmayan hafta içi iç destek penceresi, aylık izole restore provası ve dört
etiketli yalın rol modeli önerildi. Ayrıntı
`Docs/operasyon/staging-operasyon-politikasi-taslagi.md` içindedir. Kullanıcı
onayı ve rol ataması olmadan değerler yürürlüğe girmez; dış kaynak açılmaz.

**Dilim 1 staging karar kapısı tamamlandı — 04.08.2026:** Kullanıcı 24 saat
RPO, 8 saat RTO, günlük backup/14 gün retention, 30 gün staging veri/log üst
sınırı ve dış SLA olmayan destek politikasını onayladı. `PROJE_SAHIBI`,
`TEKNIK_OPERASYON`, `DB_RECOVERY` ve `VERI_HUKUK` rollerinin tamamına Murat
Saygı atandı; uygulayan ve onaylayanın aynı kişi olduğu, yedek insan sorumlu
bulunmadığı staging tek-sorumlu riski kayda alındı. Domain alanındaki isim
domain karar sahibi olarak yorumlandı; özel DNS verilene kadar ayrı Vercel
staging environment'ın geçici hostname'i kullanılacak. Production kararları
açık kalır; sıradaki bağımsız çalışma **Dilim 2 — Staging Temeli**dir.

**Dilim 2 yerel başlangıç — 04.08.2026:** Next.js 16.2.9 yerel deployment,
environment ve region belgeleri okundu. Node.js route'larına Edge'e özgü
`preferredRegion` dağıtılmadı; Vercel proje sözleşmesi kök `vercel.json`
üzerinden yalnız `fra1` Frankfurt'a sabitlendi. Testli
`staging:platform:verify` preflight'i farklı/çoklu region, function override,
onaysız failover ve config içine environment değeri yazılmasını reddeder. Dış
hesap, kaynak, credential, hostname veya deployment oluşturulmadı.

Yerel preflight doğrulamasında `staging:platform:verify`, hedefli 3 test, tam
353 test dosyası/1.872 test, type-check, Prisma validate, lint, Next.js 16.2.9
build/104 sayfa ve 1.345 dosyalık secret scan geçti. Ayrıntı
`Docs/UI-baseline/Faz36-dilim2-yerel-staging-preflight-20260804.md` içindedir.
Dilim 2'nin dış Vercel/Neon/R2/Sentry kaynak ve gerçek staging rehearsal kapısı
açık kalır.

**Dilim 2 dış kaynak hazırlığı — 04.08.2026:** Kullanıcının açık yetkisiyle
Vercel CLI oturumu açıldı. Yeni proje yerine mevcut
`murat-saygis-projects/insaat-yonetim` Next.js projesi doğrulanıp repoya
bağlandı. Mevcut `DATABASE_URL` ve `AUTH_SECRET` Production/Preview/Development
ortamlarında ortak kapsamlıdır; değerleri okunmadı ve ayrı staging DB/secret
oluşmadan değiştirilmedi. Neon, Cloudflare ve Sentry oturumları açık olmadığı
için dashboard giriş sekmeleri kullanıcıya bırakıldı; kaynak, credential,
ödeme veya deployment oluşturulmadı.

**Dilim 2 dış staging temeli — 04.08.2026:** Vercel
`murat-saygis-projects/insaat-yonetim` projesi `fra1` runtime sözleşmesiyle
bağlandı. Neon `noa-insaat-staging` Frankfurt DB, private EU-jurisdiction R2
`noa-insaat-staging-eu` bucket'ı ve Sentry DE `MS-INSAAT/noa-insaat-staging`
projesi oluşturuldu. DB, R2 ve Sentry değerleri yalnız Vercel Preview secret
yüzeyine yazıldı; production kapsamı değiştirilmedi. Deployment, migration,
hostname ve release rehearsal kanıtı Dilim 6'da açık kalır.

**Dilim 3 kalıcı storage ve recovery başlangıcı — 04.08.2026:** Doküman
runtime portuna AWS SDK v3 tabanlı R2 adapter eklendi; staging ve production
runtime'ında local storage fail-closed reddedilir. Ayrı private EU-jurisdiction
`noa-insaat-staging-backups-eu` bucket'ı oluşturuldu ve 14 günlük lifecycle
kuralı doğrulandı. Günlük GitHub Actions workflow'u, custom-format PostgreSQL
exportu, binary checksum manifesti ve backup bütünlük doğrulaması kodlandı.
Backup credential'ını uygulama runtime'ına vermeden beş hassas değer GitHub
Actions repository secret store'a, dört hassas olmayan R2 ayarı Actions
variable store'a girildi. Document-read ve backup-read/write tokenları ayrı
bucket'lara sınırlandı; sonuç çıktısına yansıyan ilk document-read tokenı
kullanılmadan silinip döndürüldü. Workflow varsayılan dala henüz
gönderilmediğinden gerçek zamanlı backup ve izole restore tatbikatı yapılmadı.
RPO/RTO sonucu bu kanıtlar tamamlanana kadar ölçülmüş sayılmaz.
Hedefli 19 test ile tam 355 dosya/1.884 test, type-check, Prisma validate,
lint, 104 sayfalık Next.js build, `fra1` preflight ve 1.354 dosyalık secret
scan yeşildir.

**Dilim 3 ilk gerçek backup bütünlük provası — 05.08.2026:** İlk koşuda Neon
PostgreSQL 18.4 ile Ubuntu runner `pg_dump` 16.14 sürüm uyumsuzluğu fail-closed
yakalandı; tamamlanmış manifest oluşmadı. Workflow resmi PGDG
`postgresql-client-18` kurulumuna ve client/server major sürüm kapısına
alındı. GitHub Actions `30999968809` koşusunda PostgreSQL 18/18 kapısı,
custom-format export ve R2 manifest bütünlük doğrulaması geçti. `900` byte DB
exportu ve `0` binary nesne, boş staging içeriği sınırında doğrulandı. Bu sonuç
backup yazma/okuma kanıtıdır; varsayılan daldaki zamanlı çalışma ve izole
DB/bucket restore tatbikatı tamamlanmadığından 24 saat RPO/8 saat RTO henüz
ölçülmüş sonuç değildir. Koşu kanıtı:
https://github.com/sistemb24/MS_insaat/actions/runs/30999968809
