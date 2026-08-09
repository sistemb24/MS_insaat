# Faz 36 — Production Backup Freshness ve Alarm Sözleşmesi

Tarih: 09.08.2026
Durum: **KOD HAZIR / READ-ONLY CREDENTIAL VE MANUEL KABUL BEKLİYOR**

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
- Bu read-only credential henüz provider'da oluşturulup GitHub Actions'a
  tanımlanmadı. Mevcut backup-write credential freshness job'una verilmez.
- Credential yalnız `noa-insaat-production-backups-eu` bucket'ında object
  list/read yetkisiyle oluşturulmalıdır; secret değeri belgeye veya loga
  yazılmaz.

## Alarm gerçeği

Stale veya geçersiz sonuç GitHub Actions job'unu kırmızıya düşürür ve makine
tarafında alarm kaynağı oluşturur. Ancak GitHub/Sentry kuralı, e-posta hedefi ve
insan teslim teyidi bu dilimde yapılandırılmadı. Bu nedenle workflow failure
tek başına insan alarm/escalation kabulü sayılmaz.

## Kabul sırası

1. Kod ve doküman kalite kapıları geçer.
2. Ayrı onayla commit/push/PR yapılır ve PR ayrıca onayla `main`e merge edilir.
3. Cloudflare R2'de backup bucket için yalnız list/read yetkili ayrı token
   oluşturulur; değerler yalnız GitHub Actions secret yüzeyine girilir.
4. `production-backup-freshness-check` ile manuel salt-okunur kabul koşusu
   çalıştırılır ve mevcut backup `fresh` olarak doğrulanır.
5. İlk gerçek `schedule` koşusu doğrulanır.
6. Stale sentetik/dry-run alarmı, bildirim kuralı ve insan teslim teyidi ayrı
   açık onayla kanıtlanır; production manifesti değiştirilmez.

## Bu dilimde yapılmayanlar

- Provider kaynağı veya secret oluşturulmadı/değiştirilmedi.
- Production DB/R2 kaynağı okunmadı veya değiştirilmedi.
- Workflow çalıştırılmadı, backup/migration/restore/silme yapılmadı.
- İnsan alarm teslimi veya sürekli 24 saat RPO iddiası kurulmadı.
