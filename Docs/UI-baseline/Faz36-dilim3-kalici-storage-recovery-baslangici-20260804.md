# Faz 36 Dilim 3 — Kalıcı Storage ve Recovery Başlangıcı

Tarih: 04.08.2026
Durum: Kod ve provider temeli hazır; gerçek backup/restore kanıtı bekleniyor

## Tamamlanan kapsam

- Doküman storage runtime'ına Cloudflare R2'nin S3 API'sini kullanan adapter
  eklendi. `NOA_DOCUMENT_STORAGE_PROVIDER=r2` açık seçimi olmadan staging ve
  production local diske geri düşmez.
- R2 endpoint'i yalnız HTTPS ve onaylı EU jurisdiction hostname'iyle kabul
  edilir; storage key path traversal denemeleri ağ çağrısından önce reddedilir.
- `noa-insaat-staging-eu` doküman bucket'ından ayrı private
  `noa-insaat-staging-backups-eu` backup bucket'ı oluşturuldu.
- Backup bucket'ında nesneleri 14 gün sonra silen lifecycle kuralı provider
  arayüzünde `Enabled` olarak doğrulandı.
- `staging:backup:create`, PostgreSQL custom-format exportu ile doküman
  nesnelerini aynı anonim backup kimliği altında kopyalar; SHA-256 manifestini
  en son commit marker olarak yazar.
- `staging:backup:verify`, en son veya seçilen manifestte DB export ve bütün
  binary nesnelerin boyut/hash değerlerini doğrular ve `pg_restore --list` ile
  arşiv yapısını okur.
- Günlük `01:15 UTC` (`04:15 Europe/Istanbul`) GitHub Actions workflow'u ve
  manuel bütünlük doğrulama girişi eklendi.

## Secret ve yetki sınırı

Runtime credential yalnız doküman bucket'ına erişir. Backup bucket yazma
yetkisi Vercel Preview uygulama runtime'ına konulmadı. Workflow için ayrı,
en-az-yetkili document-read ve backup-read/write credential'ları oluşturuldu
ve doğrudan GitHub Actions repository secret store'a aktarıldı. Credential
değerleri repo veya bu belgeye yazılmadı.

Gerekli GitHub Actions secret adları:

- `STAGING_DATABASE_URL`
- `STAGING_R2_READ_ACCESS_KEY_ID`
- `STAGING_R2_READ_SECRET_ACCESS_KEY`
- `STAGING_R2_BACKUP_ACCESS_KEY_ID`
- `STAGING_R2_BACKUP_SECRET_ACCESS_KEY`

Gerekli, gizli olmayan Actions variable adları:

- `STAGING_R2_BUCKET`
- `STAGING_R2_ENDPOINT`
- `STAGING_R2_BACKUP_BUCKET`
- `STAGING_R2_BACKUP_ENDPOINT`

Beş secret ve dört variable GitHub arayüzünde adlarıyla doğrulandı. İlk
document-read tokenı oluşturma sonucu erişilebilirlik çıktısına yansıdığı için
kullanılmadan kalıcı silindi; yerine yalnız `noa-insaat-staging-eu` bucket'ında
Object Read only yetkili `NOA Staging Backup Document Read v2` oluşturuldu.
`NOA Staging Backup Writer` yalnız `noa-insaat-staging-backups-eu` bucket'ında
Object Read & Write yetkilidir.

## Kabul ve açık kapılar

Doğrulama sonuçları:

| Kapı | Sonuç |
|---|---|
| Hedefli Vitest | 5 dosya / 19 test geçti |
| `npm test` | 355 dosya / 1.884 test geçti |
| `npm run type-check` | Geçti |
| `npm run db:validate` | Prisma şeması geçerli |
| `npm run lint` | Geçti |
| `npm run build` | Next.js 16.2.9; 104 sayfa üretildi |
| `npm run staging:platform:verify` | `fra1`; committed environment değeri yok |
| `npm run security:secret-scan` | 1.354 dosya; yüksek güvenli bulgu yok |

Bu kayıt gerçek restore tatbikatı değildir. Dilim 3'ün kapanması için en az bir
zamanlı backup başarıyla oluşmalı, backup provider'dan okunmalı ve yeni izole
DB/bucket namespace'e restore edilerek migration status, kritik tablo sayımı,
tenant izolasyonu ve doküman read smoke'u ölçülmelidir. Bu ölçüm yapılmadan 24
saat RPO veya 8 saat RTO sağlandı iddiası kurulmaz.

## İlk gerçek backup bütünlük provası — 05.08.2026

İlk GitHub Actions koşusu Neon PostgreSQL `18.4` ile runner `pg_dump` `16.14`
uyumsuzluğunu fail-closed yakaladı; tamamlanmış manifest üretmedi. Workflow
resmi PGDG `postgresql-client-18` kurulumuna alındı ve backup öncesi
client/server major sürüm karşılaştırması eklendi.

[`30999968809`](https://github.com/sistemb24/MS_insaat/actions/runs/30999968809)
koşusunda sürüm kapısı `18/18`, PostgreSQL custom-format exportu ve R2'deki en
son manifestin DB checksum + `pg_restore --list` doğrulaması geçti. Anonim
backup kimliği
`20260805T110458Z-24db5b9687d412c7151d1f9a5e8e039e2137e323`, DB export boyutu
`900` byte ve binary nesne sayısı `0` olarak kaydedildi.

Bu kanıt boş staging içeriğinin backup yazma/okuma bütünlüğünü doğrular; izole
restore tatbikatı değildir. Workflow varsayılan dala alınmadan günlük schedule
çalışmaz. Zamanlı backup, yeni izole DB/bucket namespace'e restore, migration
status, kritik tablo sayımı, tenant izolasyonu ve doküman read smoke'u açık
kaldığından RPO/RTO henüz ölçülmüş sonuç değildir.

## Staging migration ve izole restore provası — 05.08.2026

İlk recovery-source preflight'i GitHub secret hedefinde `0/67` migration,
`0` public tablo ve eksik sekiz kritik tablo saptayıp backup/restore öncesinde
durdu. Kullanıcı onayıyla boş staging DB'ye yalnız `prisma migrate deploy`
uygulandı; `db push` ve seed çalıştırılmadı.

Başarılı [GitHub Actions koşusu
`31003284183`](https://github.com/sistemb24/MS_insaat/actions/runs/31003284183)
şu kanıtları üretti:

- kaynak DB: `67/67` migration, `114` public tablo, eksik kritik tablo yok;
- backup: `499.671` byte custom-format arşiv, checksum ve
  `pg_restore --list` doğrulaması;
- izole restore: sıkı `noa_restore_*` geçici DB, `67/67` migration ve `114`
  public tablo;
- R2: yalnız `restore-rehearsal/` geçici namespace marker yazma/okuma;
- ölçüm: backup yaşı `113` saniye, restore süresi `109` saniye;
- cleanup: geçici DB ve oluşturulan R2 anahtarları silindi.

Kaynak staging DB'de tenant, company, `DocumentFile` ve binary nesne sayıları
sıfırdır. Bu nedenle ölçüm onaylı 24 saat RPO/8 saat RTO hedeflerinin içinde
olsa da gerçek tenant izolasyonu ve binary doküman read smoke'u henüz kanıt
değildir; üretim recovery iddiasına dönüştürülmez.
