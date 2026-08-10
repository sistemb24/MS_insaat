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

## 4E-B canlı sonuçlar ve 4E-B-R3 tanılama kapısı

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

4E-B-R merge edildikten sonra onaylanan
`main@45bda9f05439433ac1e09eb12df290ca6f8f80a1` üzerinde yalnız GitHub Actions
run `31331024346`, attempt `1` çalıştırıldı. Resmî `jose.SignJWT` signer aktif
olmasına rağmen Cloudflare ilk temporary credential probe'unu yine
`InvalidArgument`, HTTP `400` ile reddetti. Tekrar yapılmadı; bucket `0 B`
kaldı ve hiçbir nesne oluşmadı. Geçici parent credential provider'dan silindi,
iki parent GitHub environment secret'ı kaldırıldı; read-only credential,
preflight KEK ve provider variable'ları korundu.

4E-B-R3, sorunun parent credential aktarımında mı yoksa temporary credential
üretim/kullanımında mı olduğunu yazma yapmadan ayırır:

1. Parent Access Key ID ve Secret Access Key, session token olmadan yalnız
   `journal/` üzerinde `ListObjectsV2(MaxKeys=1)` ile sınanır.
2. Parent probe geçerse mevcut 900 saniyelik exact-action local-signing
   temporary credential üretilir ve aynı salt-okunur probe uygulanır.
3. İki probe da geçmeden encrypted chain okuması veya `PutObject` başlamaz.

Güvenli hata fazları yalnız `parent-credential-probe`,
`temporary-credential-probe` ve `encrypted-append-read` değerlerinden biridir.
Provider mesajı, credential, JWT veya session token loglanmaz. R3 kod dilimi
provider credential/secret oluşturmaz ve canlı workflow çalıştırmaz.

R3-L merge edildikten sonra onaylanan
`main@554f6850cd509bc25a6bff7f4480a38ce3d6f443` üzerinde yalnız GitHub Actions
run `31363865384`, attempt `1` çalıştırıldı. Parent credential aynı EU bucket ve
`journal/` prefix'i için başarıyla listelendi; aynı parent'tan resmî algoritmayla
üretilen temporary credential yine `InvalidArgument`, HTTP `400` ile reddedildi.
Encrypted append/read başlamadı, bucket boş kaldı, otomatik tekrar yapılmadı ve
geçici parent credential ile iki GitHub environment secret'ı temizlendi.

## 4E-B-R3-M protokol farkı tanısı

10.08.2026 salt-okunur kaynak ve taşıma analizinde local signer'ın Cloudflare
resmî örneğiyle eşdeğer olduğu, AWS SDK v3'ün base64 session token'ı
`x-amz-security-token` başlığına byte-for-byte değiştirmeden eklediği
deterministik testle doğrulandı. Ancak mevcut AWS SDK varsayılan adreslemesi
bucket'ı hostname'e taşıyıp request path'ini `/` yaparken Cloudflare'ın resmî
`aws4fetch` örneği account EU hostname'i üzerinde `/<bucket>/` path-style
adresleme kullanır. Bu fark önceki HTTP `400` sonucunun en güçlü yerel kök neden
adayıdır; canlı kanıt değildir.

R3-M ayrı manual workflow ile şu fail-closed karşılaştırmayı hazırlar:

1. Parent credential yalnız AWS SDK v3 ile `ListObjectsV2(MaxKeys=1,
   Prefix=journal/)` işleminden geçirilir.
2. Parent gate geçerse bellekte tek 900 saniyelik exact-action temporary
   credential üretilir.
3. Aynı credential önce resmî `aws4fetch`, sonra `forcePathStyle=true` AWS SDK
   v3 istemcisiyle aynı salt-okunur path-style istekte sınanır.
4. İki istemcide de otomatik retry kapalıdır; ikisi de planlanan farklı probe
   olduğundan ilk temporary probe sonucu ikincisinin güvenli tanı sonucunu
   bastırmaz.
5. Yalnız client adı, passed/failed, güvenli provider code ve HTTP status
   raporlanır; response message, JWT, session token, credential ve imzalı
   header loglanmaz.

Bu workflow `PutObject`, `GetObject`, delete, database, backup, migration,
restore veya artifact işlemi içermez. Kod dilimi provider credential/secret
oluşturmaz ve workflow'u çalıştırmaz. Temporary Credentials API, explicit
action allowlist'ini desteklemediği için append credential alternatifi değildir.

### İlk canlı R3-M sonucu ve redacted provider escalation

PR `#30` merge commit'i
`1e3ddce4be0c1346fe10a4860870d7bae7b41756` için post-merge CI run
`31390743640` başarıyla tamamlandı. Ayrı onaylanan aynı `main` SHA'sında yalnız
GitHub Actions run `31392513374`, attempt `1` çalıştırıldı. Parent credential
`ListObjectsV2(MaxKeys=1, Prefix=journal/)` gate'ini geçti ve bellekte tek 900
saniyelik exact-action temporary credential üretildi. Aynı credential ile
planlanan iki salt-okunur path-style probe da `InvalidArgument`, HTTP `400`
sonucu verdi:

- `aws4fetch`: `failed`, provider code `InvalidArgument`, HTTP `400`
- `aws-sdk-v3` (`forcePathStyle=true`): `failed`, provider code
  `InvalidArgument`, HTTP `400`

Bu sonuç path-style adresleme farkının tek başına kök neden olmadığını gösterir;
Cloudflare EU endpoint/local-signing temporary credential uyumluluğu veya
belgelenmemiş provider kısıtı açık blocker'dır. Otomatik ya da manuel tekrar
yapılmadı; append/read ve nesne yazma başlamadı, bucket `0 B` kaldı. Geçici
exact-bucket parent provider tokenı ile iki parent GitHub `production`
environment secret'ı koşu sonrasında silindi ve yoklukları doğrulandı.

Free plan teknik support case açmadığı için credential, account ID, bucket adı,
endpoint, JWT, session token, imzalı header ve ham provider response içermeyen
İngilizce redacted konu Cloudflare Community `Developers / Storage`
kategorisine gönderildi. Konu 10.08.2026 tarihinde moderasyondan çıkarak
`https://community.cloudflare.com/t/r2-local-temporary-credentials-return-invalidargument-400-on-eu-endpoint/947392/1`
adresinde yayımlandı; henüz yanıt yoktur. Provider/Community yanıtı gelmeden
yeni credential, workflow retry, Temporary Credentials API geçişi veya sentetik
append/read planlanmaz.

## Açık blocker'lar ve sonraki kapı

- EU journal bucket ve 1.095 günlük lock oluşturuldu; bucket boştur.
- Read-only credential ile preflight KEK/GitHub variable'ları hazırdır.
- Geçici parent credential ve parent GitHub secret'ları temizlenmiştir.
- Dört workflow run'ı da temporary credential kullanımında başarısızdır; hiçbir koşu
  tekrarlanmamıştır.
- Gerçek production journal KEK'i oluşturulmadı.
- Tenant purge, delete veya backup restore-replay yapılmadı.
- `productionBackupDeletionReplayReady=false` kalır.

Sıradaki kapı Cloudflare provider/Community yanıtının redacted olarak alınması
ve deterministic yerel kanıtla karşılaştırılmasıdır. Yanıtın önerdiği herhangi
bir kod, endpoint, credential, workflow veya canlı retry değişikliği ayrı plan
ve açık kullanıcı onayı gerektirir. Sentetik append/read rehearsal bu tanıdan
bağımsız ve daha sonraki ayrı açık onay kapısıdır.
