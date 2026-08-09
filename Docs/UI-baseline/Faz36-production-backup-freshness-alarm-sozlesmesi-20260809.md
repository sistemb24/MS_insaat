# Faz 36 — Production Backup Freshness ve Alarm Sözleşmesi

Tarih: 09.08.2026
Durum: **MANUEL KABUL TAMAMLANDI / ALARM SÖZLEŞMESİ KOD HAZIR / İLK SCHEDULE VE CANLI ALARM TESLİMİ BEKLİYOR**

## Amaç ve sınır

Bu sözleşme production backup bucket'ındaki en yeni manifestin yaşını ve temel
bütünlük alanlarını salt-okunur denetler. Production DB, document bucket,
migration, restore, backup oluşturma, lifecycle, silme, deployment, Sentry
provider ayarı ve trafik kapsam dışıdır.

## Freshness kararı

- Production günlük backup `02:15 UTC` saatinde planlıdır.
- Freshness kontrolü iki saat sonra `04:15 UTC` / `07:15 Europe/Istanbul`
  saatinde çalışır.
- En yeni geçerli manifestin azami yaşı onaylı RPO hedefiyle aynı, `24 saat`tir.
  Kontrolün backup'tan iki saat sonra çalışması yalnız job tamamlanma payıdır;
  manifest yaş eşiğini genişletmez ve tek başına sözleşmesel garanti değildir.
- Manifest yoksa, JSON/şema bozuksa, backup kimliği ile manifest anahtarı veya
  release eşleşmiyorsa, DB dump boyutu/hash alanı geçersizse, zaman gelecekteyse
  ya da yaş 24 saati aşarsa kontrol fail-closed başarısız olur.
- Denetim yalnız `ListObjectsV2` ve `GetObject` kullanır; `PutObject`,
  `DeleteObject`, DB bağlantısı ve PostgreSQL komutu içermez.

## Event ve credential kapıları

- Schedule tokenı `production-backup-freshness-scheduled`, ayrı manuel kabul
  tokenı `production-backup-freshness-check` değeridir; tokenlar event türleri
  arasında kullanılamaz.
- Workflow yalnız ayrı
  `PRODUCTION_R2_BACKUP_READ_ACCESS_KEY_ID` ve
  `PRODUCTION_R2_BACKUP_READ_SECRET_ACCESS_KEY` secret adlarını kabul eder.
- Read-only credential provider'da oluşturulup GitHub Actions'a tanımlandı.
  Mevcut backup-write credential freshness job'una verilmez.
- Credential yalnız `noa-insaat-production-backups-eu` bucket'ında object
  list/read yetkisiyle oluşturulmalıdır; secret değeri belgeye veya loga
  yazılmaz.
- `NOA Production Backup Freshness Read` credential'ı 09.08.2026 tarihinde
  yalnız bu bucket için `Object Read only` yetkisiyle oluşturuldu ve iki değer
  yalnız GitHub Actions secret yüzeyine kaydedildi.
- İlk manuel kabul run'ı `31308719879`, R2 adımına ulaşmadan Prisma
  `postinstall` işleminin `DATABASE_URL` istemesi nedeniyle paket kurulumunda
  durdu. Production DB secret'ı freshness job'una eklenmedi. Workflow kurulumu
  `pnpm install --frozen-lockfile --ignore-scripts` olarak düzeltildi; freshness
  scripti Prisma generate veya lifecycle scriptlerine ihtiyaç duymaz.
- PR `#17` merge commit `dd578d3d` ile `main` dalına alındı. Ayrı onaylı tekrar
  kabul run'ı `31310479037`, aynı commit üzerinde DB'siz kurulumu ve salt-okunur
  R2 denetimini geçti. En yeni
  `20260809T094027Z-e83a0f8c50d95147c936a4a0e9397213ea3342d9` backup'ı
  `fresh=true`, `status=fresh`, `1,64 saat` yaş, `24 saat` azami yaş,
  `514.690` byte DB ve `0` binary nesne olarak doğrulandı. Credential değerleri
  loglarda maskeli kaldı; production DB bağlantısı, nesne yazma veya silme
  yapılmadı.

## Alarm gerçeği

Stale veya geçersiz sonuç GitHub Actions job'unu kırmızıya düşürür ve makine
tarafında alarm kaynağı oluşturur. Ayrı
`.github/workflows/production-backup-freshness-alarm.yml` workflow'u yalnız
varsayılan daldaki gerçek freshness `schedule` hatasını veya onaylı rehearsal
hatasını dinler. Kaynak hata dışındaki conclusion/event/branch birleşimlerinde
job çalışmaz.

Notifier'ın tek genişletilmiş yetkisi `issues:write`dır; freshness reader
workflow'u `contents: read` sınırında kalır. Notifier sabit
`[PRODUCTION] Backup freshness alarmı` başlığı ve
`ops:backup-freshness` etiketiyle açık issue'yu oluşturur veya günceller. Issue
yalnız workflow adı, event, conclusion, kısa commit, run kimliği/URL'si ve UTC
gözlem zamanını taşır; log, manifest, credential veya serbest production veri
taşımaz.

`.github/workflows/production-backup-freshness-alarm-rehearsal.yml` yalnız tam
`production-backup-freshness-alarm-rehearsal` confirmation ile kasıtlı kırmızı
sonuç üretir. Checkout, secret, DB ve R2 erişimi yoktur; production manifesti
değiştirilmez. Kodun hazır olması insan teslim kabulü değildir. İlk gerçek
schedule, rehearsal issue'su ve Murat Saygı'nın e-posta teslim teyidi ayrıca
kanıtlanmadan operasyon alarmı veya sürekli 24 saat RPO iddiası kurulmaz.

## Kabul sırası

1. Kod ve doküman kalite kapıları geçer.
2. Ayrı onayla commit/push/PR yapılır ve PR ayrıca onayla `main`e merge edilir.
3. Cloudflare R2'de backup bucket için yalnız list/read yetkili ayrı token
   oluşturulur; değerler yalnız GitHub Actions secret yüzeyine girilir.
4. `production-backup-freshness-check` ile manuel salt-okunur kabul koşusu
   çalıştırılır ve mevcut backup `fresh` olarak doğrulanır.
5. Alarm notifier/rehearsal sözleşmesi ayrı PR ile `main`e alınır.
6. İlk gerçek `schedule` koşusu doğrulanır.
7. Tam confirmation ile credential-free rehearsal ayrı canlı onayla
   çalıştırılır; production manifesti değiştirilmez.
8. Dedupe edilmiş GitHub issue'su ve Murat Saygı'nın e-posta teslim teyidi
   kanıtlanır.

## Bu dilimde yapılmayanlar

- Provider'da yalnız onaylı read-only credential oluşturuldu; başka kaynak veya
  secret değiştirilmedi.
- İlk kabul denemesi production DB/R2 kaynağına ulaşmadan kurulumda durdu;
  production veri kaynağı okunmadı veya değiştirilmedi.
- Tekrar kabul koşusu yalnız backup bucket manifestini list/read ile okudu ve
  mevcut backup'ı `fresh` doğruladı.
- Alarm notifier/rehearsal kodu hazırlandı; canlı rehearsal, issue oluşturma ve
  e-posta teslimi çalıştırılmadı.
- Backup/migration/restore/silme yapılmadı.
- İnsan alarm teslimi veya sürekli 24 saat RPO iddiası kurulmadı.
