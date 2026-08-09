# NOA Production Operasyon Runbook'u

Tarih: 09.08.2026
Durum: Production temeli, backup/migration, izole restore, günlük backup ve
freshness manuel kabul kanıtları hazır; alarm sözleşmesi kod hazır, ilk schedule
ve canlı alarm teslimi bekleniyor

Faz 36 sağlayıcı, ortam ve sorumluluk kararlarının tek güncel kaydı
`Docs/operasyon/production-topoloji-ve-sahiplik-karar-kaydi.md` dosyasıdır.
Bu kayıtta `BLOCKER`, `ATANMADI` veya `KARAR BEKLİYOR` kalan zorunlu satırlar
aşağıdaki yayın kapısını kapalı tutar.

## Yayın ön koşulları

1. CI `test`, `type-check`, `db:validate`, `lint` ve `build` kapılarının tamamını
   geçmelidir.
2. Production environment doğrulaması geçmeli; secret değerleri loga veya
   ticket'a kopyalanmamalıdır.
3. `/api/health` HTTP 200 vermeli. `/api/readiness` yalnız DB probe başarılıysa
   HTTP 200; aksi halde 503 vermelidir.
4. Yayın sorumlusu, DB sorumlusu ve incident sorumlusu isimleri atanmalı;
   aşağıdaki `ATANMADI` satırlarından biri bile kalırsa canlı yayın engellenir.
5. Aynı release adayı için doğrulanmış backup/restore provası ve geri dönüş
   kararı kayda bağlanmalıdır.

## Migration dry-run

### Production read-only backup ve migration preflight

GitHub Actions workflow'u
`.github/workflows/production-backup-migration-preflight.yml` yalnız manuel
dispatch ve tam `production-backup-preflight` onay ifadesiyle çalışır. Bu kapı:

- production DB'de public tablo ve `_prisma_migrations` envanterini yalnız
  `SELECT` ile okur;
- iki onaylı private R2 bucket'ında yalnız `HeadBucket` ve sınırlı `List`
  yapar;
- bilinmeyen/başarısız/rollback edilmiş migration veya unmanaged şemada
  fail-closed durur;
- boş DB'yi tüm migration'lar pending olarak raporlar;
- backup oluşturma ve migration uygulama yetkisini daima `false` raporlar.

Workflow'da schedule, `pg_dump`, object write/delete, `db:migrate` veya
`prisma migrate deploy` yoktur. İlk read-only çalıştırma dahi ayrı açık kullanıcı
onayı ister. Sözleşme kanıtı
`Docs/UI-baseline/Faz36-production-backup-migration-preflight-sozlesmesi-20260805.md`
içindedir.

### Production günlük backup

`.github/workflows/production-backup.yml` yalnız varsayılan dalda günlük
`02:15 UTC` (`05:15 Europe/Istanbul`) schedule veya tam
`production-backup-scheduled-once` onaylı manuel kabul koşusuyla çalışır.
Schedule yalnız `production-backup-scheduled` tokenını kabul eder; schedule ve
manual-once tokenları çapraz kullanılamaz. Workflow:

- migration/restore ile ortak `noa-production-recovery` concurrency kilidini
  kullanır ve çalışan recovery işini iptal etmez;
- production DB/R2 preflight'ını backup öncesinde fail-closed çalıştırır;
- PostgreSQL client/server major uyumunu doğrular;
- custom-format DB dumpı ile aynı recovery point'teki document binary'lerini
  ayrı private backup bucket'ına kopyalar;
- manifest, boyut, SHA-256 ve `pg_restore --list` bütünlüğünü doğrular;
- `db:migrate`, restore veya R2 delete komutu çalıştırmaz.

Retention uygulama koduyla silme yapmaz. Provider'da etkin 30 günlük R2 object
lifecycle tek expiry uygulayıcısıdır; fiziksel kaldırma expiry sonrasında
sağlayıcı gecikmesine tabi olabilir. GitHub schedule gecikebildiği veya
düşebildiği için günlük cron tek başına katı 24 saat RPO garantisi değildir;
freshness/alarm bağımsız operasyon kapısıdır. Sözleşme kanıtı
`Docs/UI-baseline/Faz36-production-gunluk-backup-retention-sozlesmesi-20260809.md`
içindedir.

İlk manual-once kabulü `main@e83a0f8c` üzerinde run `31306444810` ile geçti.
Backup `20260809T094027Z-e83a0f8c50d95147c936a4a0e9397213ea3342d9`,
`514.690` byte ve binary `0` olarak manifest/DB bütünlük kontrolünden geçti;
preflight 68/68 migration, 0 pending ve 117 tablo bildirdi. Bu koşu migration,
restore veya silme çalıştırmadı. İlk gerçek schedule ve freshness/alarm kanıtı
ayrı operasyon kapısıdır.

### Production backup freshness

`.github/workflows/production-backup-freshness.yml`, günlük backup'tan iki saat
sonra `04:15 UTC` (`07:15 Europe/Istanbul`) çalışır. En yeni manifesti yalnız
backup bucket `List/Get` yetkisiyle okur ve azami `24 saat` yaş sınırını uygular.
Manifest yok/bozuk, kimlik-anahtar-release tutarsız, DB dump bütünlük alanı
geçersiz, zaman gelecekte veya yaş eşik üstündeyse job fail-closed kırmızı olur.

Workflow mevcut backup-write secret'ını kullanmaz. Ayrı
`PRODUCTION_R2_BACKUP_READ_ACCESS_KEY_ID` ve
`PRODUCTION_R2_BACKUP_READ_SECRET_ACCESS_KEY` tanımlanmadan çalıştırılmaz.
Kırmızı job makine alarm kaynağıdır; bildirim kuralı ve insan teslim teyidi ayrı
kabul edilmeden operasyon alarmı tamamlandı sayılmaz. Sözleşme
`Docs/UI-baseline/Faz36-production-backup-freshness-alarm-sozlesmesi-20260809.md`
içindedir.

İlk manuel kabul run'ı `31308719879`, R2 kontrolüne ulaşmadan Prisma
`postinstall` adımında `DATABASE_URL` eksikliğiyle durdu. Freshness job'una DB
secret'ı eklenmez; bağımlılıklar `pnpm install --frozen-lockfile
--ignore-scripts` ile kurulur ve ardından yalnız R2 freshness scripti çalışır.

PR `#17` merge commit `dd578d3d` sonrasındaki ayrı onaylı tekrar kabul run'ı
`31310479037` başarıyla tamamlandı. En yeni
`20260809T094027Z-e83a0f8c50d95147c936a4a0e9397213ea3342d9` backup'ı
`fresh=true`, `1,64 saat` yaş, `24 saat` azami yaş, `514.690` byte DB ve `0`
binary nesne olarak doğrulandı. Koşu yalnız backup bucket list/read erişimi
kullandı; production DB bağlantısı, backup/migration/restore veya silme
çalıştırmadı. İlk gerçek schedule ve insan alarm teslimi ayrı kabul kapısıdır.

### Production backup freshness alarmı

`.github/workflows/production-backup-freshness-alarm.yml` yalnız varsayılan
daldaki `Production Backup Freshness` schedule hatasını veya onaylı
`Production Backup Freshness Alarm Rehearsal` workflow-dispatch hatasını
`workflow_run` ile izler. Freshness reader `contents: read` sınırında kalır;
yalnız notifier `issues: write` alır. Sabit başlık/etiket açık issue üzerinde
dedupe edilir ve yalnız güvenli workflow/run metadata'sı yazılır.

Credential-free rehearsal yalnız
`production-backup-freshness-alarm-rehearsal` confirmation ile kasıtlı kırmızı
sonuç üretir; checkout, secret, DB veya R2 erişimi yoktur. Rehearsal ancak ilk
gerçek schedule doğrulandıktan ve ayrı canlı onay verildikten sonra çalıştırılır.
Operasyon alarmı; GitHub issue'su ile Murat Saygı e-posta teslim teyidi birlikte
kanıtlanmadan tamamlandı sayılmaz.

Staging veya izole restore DB'sinde:

```powershell
$env:NOA_RUNTIME_ENV = "staging"
pnpm db:validate
pnpm exec prisma migrate status --schema prisma/schema.prisma
pnpm db:migrate
pnpm exec prisma migrate status --schema prisma/schema.prisma
```

Production'da `db push` ve `db seed` yasaktır. `migrate deploy` yalnız backup
kanıtı, değişiklik penceresi ve atanmış DB sorumlusu ile çalıştırılır. Migration
başarısızsa aynı migration dosyası değiştirilmez; additive forward-fix hazırlanır.

## Backup ve restore dry-run

Komutlar provider seçildikten sonra bağlantı değerleri secret store'dan enjekte
edilir; komut satırı, terminal kaydı veya belgeye credential yazılmaz.

1. PostgreSQL custom-format backup al.
2. Dosya boyutu ve SHA-256 checksum kaydet.
3. Yeni, izole bir restore DB oluştur.
4. Backup'ı `pg_restore --clean --if-exists --no-owner` ile izole DB'ye yükle.
5. Migration status, tablo sayımı ve kritik tenant-scope smoke testlerini çalıştır.
6. Restore DB'yi production uygulamasına bağlama; kanıt sonrası kontrollü sil.

Production document ve backup storage, ayrı least-privilege kimliklerle private
Cloudflare R2 EU bucket'larında çalışır. Production backup kapsamı DB ile aynı
recovery point'e bağlı document binary'lerini de içerir; binary sayısı sıfırsa
manifestte açıkça `0` olarak doğrulanır.

## Rollback kararı

- Uygulama kodu geriye alınabilir; destructive DB rollback çalıştırılmaz.
- Additive migration uygulandıysa eski kodun yeni şemayla uyumu doğrulanır.
- Uyum yoksa trafik durdurulur ve forward-fix tercih edilir. Restore yalnız veri
  kaybı etkisi, recovery point ve incident sorumlusu onayıyla son çaredir.
- Rollback öncesi yeni backup/checksum alınır; auth güvenlik hardening'i ve
  fail-closed provider sınırları gevşetilmez.

### Staging release rehearsal

1. Tek release SHA için GitHub CI ve Vercel Preview check'in yeşil olduğunu,
   Vercel deployment kimliği ile `fra1` runtime'ını kaydet.
2. `staging-recovery-rehearsal.yml` workflow'unu yalnız
   `confirmation=staging-recovery` girdisiyle çalıştır. Takipli 144 bayt
   fixture private document bucket'ında aynı kesin anahtarla bulunmalıdır;
   eksikse workflow fail-closed durur.
3. `migrate deploy`, migration/table preflight, sentetik tenant+binary backup,
   checksum, yabancı scope `0`, izole restore ve cleanup kanıtlarını aynı run
   kimliğinden al.
4. Güncel ve seçilen önceki güvenli Vercel artifact'ında `/landing`, `/giris`,
   `/super-admin/giris`, health ve readiness smoke'larını ayrı ayrı geçir.
5. Yalnız staging aliasını önceki güvenli artifact'a bağla. Destructive DB
   rollback çalıştırma; schema uyumsuzsa rollback yerine trafik durdurma ve
   forward-fix kararı ver.
6. Alias geri dönüşünü `finally` benzeri zorunlu cleanup ile güncel artifact'a
   yap; aynı smoke'ları ve security/indexing başlıklarını yeniden doğrula.
7. Sentetik DB/R2 kaynak fixture'larını sil; backup kopyasını onaylı 14 günlük
   staging retention kapsamında bırak. Credential veya bypass değeri kanıta
   yazma.

Bu prosedür production aliası, domaini, migration'ı veya trafiği için yetki
vermez. Her hedef deployment ve alias tam hostname ile önceden doğrulanır.

## Incident akışı

1. Alarmı/şikayeti zaman, route, release kimliği ve redacted correlation bilgisi
   ile kaydet; secret, cookie, token, ham auth header veya kişisel veri ekleme.
2. Etkiyi tenant, firma ve dönem kapsamına göre sınıflandır; başka tenant verisini
   inceleme kaydına taşımama.
3. Readiness 503 ise trafiği açma; DB ve migration durumunu salt-okunur kontrol et.
4. Incident sorumlusu rollback/forward-fix/restore kararını ve gerekçesini kaydeder.
5. Kapanışta timeline, etki, kök neden, veri bütünlüğü sonucu ve takip işi yazılır.

Production hedefleri 24 saat RPO, 8 saat RTO, günlük backup/30 gün retention ve
hafta içi 09:00–18:00 iç destek penceresi olarak onaylıdır; dış SLA yoktur.
09.08.2026 tarihli izole DB restore adımı 188 saniyede tamamlanmıştır. Bu kanıt
binary sayısı `0` olan recovery point içindir; günlük cron merge edilip ilk
acceptance koşusu geçmeden sürdürülebilir 24 saat RPO iddiası kurulmaz.

## Retention ve hesap kapanışı

- Doküman çöpü uygulama sözleşmesinde 30 gündür; production scheduler henüz
  yoktur ve manuel purge otomatik retention kanıtı sayılmaz.
- Audit, auth session, rate-limit, backup, log ve hesap kapanışı süreleri hukuki
  ve operasyonel sahiplerce onaylanana kadar toplu silme yapılmaz.
- Tenant kapanışı export, legal hold, finansal kayıt, doküman binary ve DB scope
  doğrulaması olmadan destructive delete başlatmaz.
- Onaylı preflight sözleşmesi
  `Docs/UI-baseline/Faz36-production-retention-hesap-kapatma-preflight-sozlesmesi-20260809.md`
  içindedir. Yerel değerlendirme çekirdeği yalnız envanter kapılarını raporlar;
  sonuç yeşil olsa bile hesap dondurma, purge veya destructive delete yetkisi
  üretmez. Canlı preflight ve sonraki her yazma aşaması ayrı açık onay ister.
- Dokuz kategori ve genel kurallar
  `Docs/operasyon/production-retention-ve-imha-karar-katalogu-v1.md` içinde
  `2026-08-09.a` sürümüyle onaylıdır. Preflight yalnız katalogdaki exact karar
  kimliklerini kabul eder; bu karar scheduler veya silme yetkisi değildir.

## Sorumluluk matrisi ve yayın kapısı

| Alan | Sorumlu | Onaylayan | Mevcut durum |
|---|---|---|---|
| Uygulama release/rollback | Murat Saygı | Murat Saygı | Tek-sorumlu riski kabul edildi; deployment onayı yok |
| PostgreSQL backup/restore/migration | Murat Saygı | Murat Saygı | 68/68 migration; aynı-release backup ve 188 saniyelik izole restore doğrulandı |
| Hosting, TLS ve secret store | Murat Saygı | Murat Saygı | Temel hazır; DNS/TLS/deployment onayı yok |
| Monitoring ve incident koordinasyonu | Murat Saygı | Murat Saygı | Sentry temeli hazır; production adaptör/alarm kanıtı yok |
| Object storage ve binary backup | Murat Saygı | Murat Saygı | İlk backup doğrulandı; günlük workflow merge/acceptance bekliyor |
| Retention, KVKK ve hesap kapanışı | Murat Saygı | Murat Saygı | Backup 30 gün onaylı; hesap kapanışı/legal hold açık |

Bu satırlar atanıp staging kanıtı oluşmadan “production-ready”, “yedekli”,
“izlenen” veya “SLA'lı” ifadesi kullanılamaz.

### Staging monitoring ve incident devri

- Staging monitoring ve incident koordinasyonunun uygulayanı ve onaylayanı
  Murat Saygı'dır; yedek kişi bulunmaması açık tek-sorumlu riskidir.
- Sentry error olayı yalnız redacted server envelope'u ile gönderilir. Ham olay
  user, request, IP, geo, cookie, header, query ve body içermemelidir.
- Yeni bir olayda önce `environment=staging`, release ve `noa.*` etiketleri
  doğrulanır; PII veya request verisi görülürse aktarım kapatılır ve olay veri
  ihlali şüphesiyle Murat Saygı'ya escalate edilir.
- Yüksek öncelikli issue alarmı yalnız `staging` environment'ına bağlıdır;
  Suggested Assignees, bulunamazsa Recently Active Members hedefi her trigger'da
  e-posta dispatch üretir.
- Provider-side provada redacted issue `1` trigger/`1` alert üretmiş, tek Owner
  üyede Issue Alerts `On` ve teslim yöntemi `Email` doğrulanmış, test bildirimi
  çalıştırılmış ve Murat Saygı e-postayı aldığını onaylamıştır.
- Masa başında olay `SEV-3` sayıldı: production/gerçek kullanıcı etkisi yok,
  health/readiness yeşil ve payload redacted olduğundan rollback, forward-fix
  veya restore gerekmedi. Smoke anahtarı kapalı tutuldu; issue kanıt olarak
  bırakıldı. Tek-sorumlu insan riski production öncesi giderilmelidir.
