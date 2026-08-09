# Production R2 Journal Provider Rehearsal Otomasyonu v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: P-B08 DİLİM 4E-A KOD HAZIR / PROVIDER KAYNAKLARI KAPALI

## Amaç ve sınır

Bu sözleşme Dilim 4D gerçek R2 adapter'ını canlı provider üzerinde yalnız
sentetik ve şifreli bir journal entry ile doğrulayacak manual rehearsal
otomasyonunu hazırlar. Bu dilimde Cloudflare bucket, Bucket Lock, lifecycle,
credential veya GitHub secret/variable oluşturulmaz; workflow dispatch edilmez.

Production/staging DB, document bucket, backup bucket, tenant kaydı, kullanıcı,
belge, storage key, purge veya delete işlemi yoktur.

## Temporary credential mint

Cloudflare'ın resmî local-signing biçimi Node.js crypto ile uygulanır:

- JWT `HS256` ile parent R2 secret access key kullanılarak imzalanır;
- `sub` exact Cloudflare account ID'dir;
- `iss` parent access key ID'dir;
- `aud` exact EU endpoint hostudur;
- bucket `noa-insaat-production-deletion-journal-eu` olarak sabittir;
- scope `object-read-write` olsa da action allowlist yalnız `GetObject`,
  `ListObjectsV2`, `PutObject` içerir;
- path yalnız `journal/` prefix'idir;
- TTL tam 900 saniyedir;
- temporary secret signed JWT'nin SHA-256 hex özetidir;
- session token `base64("jwt/" + signed-jwt)` biçimindedir.

Parent credential'ın yetkisi child credential'dan dar olamaz. Parent Object
Read & Write tokenı delete yetkisi de taşıdığı için yalnız bir defalık 4E-B
koşusunda GitHub `production` environment secret'ına alınır ve koşu sonrasında
secret ile provider tokenı kaldırılır. Parent credential hiçbir log, output,
artifact veya dosyaya yazılmaz.

Resmî referanslar:

- https://developers.cloudflare.com/r2/api/s3/temporary-credentials/
- https://developers.cloudflare.com/r2/examples/authenticate-r2-temp-credentials/
- https://developers.cloudflare.com/r2/api/tokens/

## Manual workflow kapıları

`.github/workflows/production-deletion-journal-provider-rehearsal.yml` yalnız
`workflow_dispatch` içerir. Koşu ancak:

- ref `refs/heads/main`;
- `expected_sha` çalıştırılan `github.sha` ile birebir;
- confirmation `production-deletion-journal-provider-rehearsal`;
- GitHub environment `production`;
- dedicated concurrency grubu boş

olduğunda başlar. Schedule, otomatik tekrar ve artifact upload yoktur. Kurulum
`--ignore-scripts` ile DB'sizdir.

## Secret ve variable sözleşmesi

4E-B'de oluşturulması planlanan GitHub `production` environment değerleri:

Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `PRODUCTION_DELETION_JOURNAL_R2_BUCKET`
- `PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT`
- `PRODUCTION_DELETION_JOURNAL_PREFLIGHT_KEY_VERSION`

Secrets:

- `PRODUCTION_DELETION_JOURNAL_PREFLIGHT_KEK`
- `PRODUCTION_DELETION_JOURNAL_R2_PARENT_ACCESS_KEY_ID`
- `PRODUCTION_DELETION_JOURNAL_R2_PARENT_SECRET_ACCESS_KEY`

Preflight KEK yalnız sentetik scope içindir; gerçek tenant journal KEK'i olarak
kullanılmaz. Canonical base64 32 byte olur ve güvenli kanıta girmez. Parent iki
secret bir defalık koşudan sonra kaldırılır. Preflight KEK, kilitli sentetik
chain'in sonraki salt-okunur doğrulaması için ayrı karara kadar korunur.

## Sentetik kalıcı kanıt

Rehearsal yalnız `tenant-synthetic-journal-provider-rehearsal` sentetik scope
kimliğini kullanır. Manifest sıfır kayıt ve sıfır object target içerir; gerçek
tenant, kullanıcı, belge veya storage key içermez. Manifest ve checkpoint yine
AES-256-GCM ile şifrelenir.

Her koşu `github.run_id` ve `github.run_attempt` ile tekil event üretir. Aynı
event tekrar kullanılamaz. Akış:

1. Mevcut sentetik encrypted chain okunur ve doğrulanır.
2. Yeni `PREPARED` entry `If-None-Match: *` ile eklenir.
3. Aynı key'e ikinci conditional create denenir ve `already-exists` beklenir.
4. Chain tekrar okunur; sequence, checksum ve son event doğrulanır.
5. Yalnız release SHA, sequence, chain length, entry checksum ve boolean güvenli
   sonuç yazılır.

`journal/` Bucket Lock uygulanmış olacağından başarılı koşunun küçük sentetik
nesnesi en az 1.095 gün tutulur ve koşu sonunda temizlenemez. Bu kalıcılık 4E-B
provider onayının açık parçasıdır. Rehearsal herhangi bir delete çağrısı yapmaz.

## Açık blocker'lar ve sonraki kapı

- EU journal bucket ve 1.095 günlük lock henüz oluşturulmadı.
- Provider parent/read credential'ları ve GitHub değerleri oluşturulmadı.
- Workflow henüz default dalda değildir ve çalıştırılmadı.
- Gerçek production journal KEK'i oluşturulmadı.
- Tenant purge, delete veya backup restore-replay yapılmadı.
- `productionBackupDeletionReplayReady=false` kalır.

Sıradaki kapılar önce bu değişikliklerin commit/push/PR ve merge süreci, ardından
4E-B provider resource/credential kurulumu ile exact-main tek canlı sentetik
rehearsal koşusudur.
