# Production R2 Journal Provider Rehearsal Otomasyonu v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: P-B08 DİLİM 4E-B BAŞARISIZ / 4E-B-R UYUMLULUK DÜZELTMESİ KOD HAZIR

## Amaç ve sınır

Bu sözleşme Dilim 4D gerçek R2 adapter'ını canlı provider üzerinde yalnız
sentetik ve şifreli bir journal entry ile doğrulayacak manual rehearsal
otomasyonunu hazırlar. Bu dilimde Cloudflare bucket, Bucket Lock, lifecycle,
credential veya GitHub secret/variable oluşturulmaz; workflow dispatch edilmez.

Production/staging DB, document bucket, backup bucket, tenant kaydı, kullanıcı,
belge, storage key, purge veya delete işlemi yoktur.

## Temporary credential mint

Cloudflare'ın resmî local-signing biçimi doğrudan `jose.SignJWT` ile uygulanır:

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

Signer; Cloudflare'ın yayımladığı örnekteki `setSubject`, `setIssuer`,
`setAudience`, `setIssuedAt` ve `setExpirationTime` zincirini kullanır. Böylece
JWT serializasyonu ve HS256 imzası el yazımı bir uygulamaya bırakılmaz.

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

## 4E-B canlı sonuç ve 4E-B-R düzeltmesi

09.08.2026 tarihinde EU jurisdiction bucket
`noa-insaat-production-deletion-journal-eu` oluşturuldu. `journal/` prefix'i
için `journal-lock-1095d` adlı 1.095 günlük Bucket Lock, herhangi bir nesne
yazılmadan önce etkinleştirildi. Public access, custom domain ve event
notification kapalı; çakışan lifecycle delete kuralı yoktur.

Onaylanan `main@512927e9272feff7e7a5e1326d36559a81fe93f1` üzerinde yalnız
GitHub Actions run `31328146354`, attempt `1` çalıştırıldı. Cloudflare ilk R2
erişimini `InvalidArgument: X-Amz-Security-Token`, HTTP `400` ile reddetti.
Otomatik veya manuel tekrar yapılmadı. Bucket `0 B` kaldı ve sentetik nesne
oluşmadı. Geçici parent credential provider'dan iptal edildi; iki parent GitHub
environment secret'ı silindi. Ayrı object-read-only credential, preflight KEK
ve provider variable'ları korundu.

4E-B-R düzeltmesi üç fail-closed katman ekler:

1. Local signing, Cloudflare'ın resmî `jose.SignJWT` örneğiyle birebir kurulur.
2. Append veya encrypted body okumasından önce yalnız `journal/` prefix'ine
   `ListObjectsV2` ve `MaxKeys=1` credential probe uygulanır.
3. Provider hataları ham mesaj veya credential taşımadan yalnız `phase`, güvenli
   provider code ve HTTP status olarak sınıflandırılır.

Probe başarısızsa `PutObject`, `GetObject` veya encrypted append başlamaz.
Workflow manual, exact-main, exact-SHA, dedicated production environment ve
no-retry sözleşmesini korur. Bu kod diliminde yeni provider credential/secret
oluşturulmaz ve workflow çalıştırılmaz.

## Açık blocker'lar ve sonraki kapı

- EU journal bucket ve 1.095 günlük lock oluşturuldu; bucket boştur.
- Read-only credential ile preflight KEK/GitHub variable'ları hazırdır.
- Geçici parent credential ve parent GitHub secret'ları temizlenmiştir.
- İlk workflow run'ı başarısızdır; tekrar çalıştırılmamıştır.
- Gerçek production journal KEK'i oluşturulmadı.
- Tenant purge, delete veya backup restore-replay yapılmadı.
- `productionBackupDeletionReplayReady=false` kalır.

Sıradaki kapılar önce 4E-B-R değişikliklerinin commit/push/PR ve merge süreci,
ardından yeni exact-bucket parent credential ile ayrıca onaylanmış tek canlı
credential probe + sentetik rehearsal koşusudur.
