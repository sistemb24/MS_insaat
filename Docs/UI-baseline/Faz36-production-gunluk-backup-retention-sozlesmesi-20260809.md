# Faz 36 — Production Günlük Backup ve Retention Sözleşmesi

Tarih: 09.08.2026
Durum: **MERGE VE İLK MANUEL KABUL TAMAMLANDI / İLK SCHEDULE VE FRESHNESS BEKLİYOR**

## Karar ve kapsam

Murat Saygı production backup sıklığını günlük, retention süresini 30 gün,
hedef RPO'yu 24 saat ve hedef RTO'yu 8 saat olarak onayladı. Bu sözleşme yalnız
production DB ile aynı recovery point'teki document binary'lerinin günlük
backup'ını otomatikleştirir. Migration, restore, provider lifecycle değişikliği,
domain, DNS, deployment, indexing ve trafik kapsam dışıdır.

## Fail-closed çalışma modeli

- `.github/workflows/production-backup.yml` günlük `02:15 UTC` /
  `05:15 Europe/Istanbul` schedule kullanır.
- Schedule yalnız varsayılan daldaki workflow sürümünü çalıştırır.
- Schedule tokenı `production-backup-scheduled`, ayrı manual acceptance tokenı
  `production-backup-scheduled-once` değeridir.
- Scheduled ve manual-once tokenlar yalnız kendi GitHub event türlerinde kabul
  edilir; mevcut `production-backup-execute` migration workflow'una ayrılmıştır.
- Tüm production backup, migration ve restore işleri ortak
  `noa-production-recovery` concurrency grubunda seri çalışır ve aktif işi iptal
  etmez.
- Backup öncesinde production migration/R2 preflight'ı ve PostgreSQL
  client/server major uyumu doğrulanır.
- Backup; custom-format DB dumpı, document binary kopyaları, manifest, SHA-256,
  boyut ve `pg_restore --list` bütünlük kontrolünü aynı koşuda tamamlar.
- Workflow migration, restore ve R2 delete komutu içermez.

## Retention sınırı

`noa-insaat-production-backups-eu` bucket'ında etkin 30 günlük delete lifecycle
tek expiry uygulayıcısıdır. Uygulama veya GitHub workflow'u eski backup
nesnelerini silmez. Cloudflare R2 davranışına göre nesneler expiry değerinden
sonra tipik olarak 24 saat içinde kaldırılır; bu yüzden 30 gün kararının fiziksel
silinmesi sağlayıcı gecikmesine tabi olabilir:

- <https://developers.cloudflare.com/r2/buckets/object-lifecycles/>

## Zamanlama sınırı

GitHub scheduled workflow'ları yoğunlukta gecikebilir veya düşebilir ve yalnız
default branch'teki workflow dosyasını çalıştırır. `:15` dakikası saat başı yük
riskinden kaçınmak için seçilmiştir. Günlük cron bu nedenle tek başına katı 24
saat RPO garantisi değildir; backup freshness/alarm ayrı görevdir:

- <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>

## Mevcut recovery kanıtı

`main@cbc5a360` ve `main@e83a0f8c` için 09.08.2026 tarihinde:

- read-only preflight: run `31304920054`, 67 applied / 1 pending migration,
  114 tablo;
- backup+migration: run `31305021827`, backup
  `20260809T090451Z-cbc5a360f969c587e2ebffadcabda81791008eb1`, `499.682`
  byte, binary `0`, backup verified; sonrasında 68/68 migration ve 117 tablo;
- isolated restore: run `31305149716`, recovery point 67 migration/114 tablo,
  restore adımı 188 saniye, geçici DB cleanup başarılı.
- günlük workflow merge: PR `#14`, merge commit
  `e83a0f8c50d95147c936a4a0e9397213ea3342d9`;
- ilk manual-once kabul backup'ı: run `31306444810`, backup
  `20260809T094027Z-e83a0f8c50d95147c936a4a0e9397213ea3342d9`,
  `514.690` byte, binary `0`, manifest ve DB bütünlüğü verified; preflight
  68/68 migration, 0 pending ve 117 tablo.

Bu kanıt DB-only ve binary sayısı `0` olan recovery point içindir. Günlük
workflow varsayılan dalda aktiftir ve ilk manual-once kabul koşusu geçmiştir.
Henüz gerçek schedule olayı ile freshness/alarm kanıtı bulunmadığından bu tek
başarılı koşu sürdürülebilir 24 saat RPO garantisi sayılmaz.

## Yerel doğrulama

- Hedefli sözleşme: 3 dosya / 17 test geçti.
- Tam test: 365 dosya / 1.939 test geçti.
- Type-check, Prisma schema validate ve ESLint geçti.
- Next.js 16.2.9 production build'i 102 sayfa ile geçti.
- Secret scan 1.402 dosyada yüksek güvenli bulgu `0` verdi.
- `git diff --check` geçti.

Bu doğrulama production backup çalıştırmadı, provider lifecycle ayarını
değiştirmedi ve workflow'u etkinleştirmedi.

## Kabul sırası

1. Hedefli ve tam kalite kapıları geçti.
2. Sözleşme dosyaları ayrı onayla commit/push edilip PR `#14` olarak açıldı.
3. PR ayrıca onaylanarak `main` dalına merge edildi.
4. `production-backup-scheduled-once` ile ilk manual acceptance backup'ı ayrı
   onayla çalıştırıldı.
5. Backup kimliği, checksum/boyut, binary sayısı ve workflow sonucu doğrulandı.
6. İlk schedule koşusu ve sonraki freshness/alarm görevi ayrı kanıtlanacak.
