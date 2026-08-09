# Production R2 Journal Adapter ve Provider Preflight Sözleşmesi v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: P-B08 DİLİM 4D KOD HAZIR / PROVIDER KAYNAKLARI KAPALI

## Amaç ve sınır

Bu sözleşme P-B08 Dilim 4C şifreli append-only journal portunu gerçek
Cloudflare R2 S3 komutlarına bağlar ve canlı kaynak oluşturulmadan önce provider
metadata'sını fail-closed değerlendiren preflight çekirdeğini tanımlar.

Bu dilimde bucket, Bucket Lock, lifecycle, API token, temporary credential,
GitHub secret, workflow veya scheduler oluşturulmaz. Production/staging R2, DB
ve backup kaynağına bağlanılmaz. Adapter yalnız mock istemcilerle doğrulanır.

## Sabit provider topolojisi

- Bucket: `noa-insaat-production-deletion-journal-eu`
- Jurisdiction: `eu`
- S3 endpoint: `https://<32-hex-account-id>.eu.r2.cloudflarestorage.com`
- Kilit prefix'i: `journal/`
- Asgari Bucket Lock: `1.095` gün / `94.608.000` saniye
- Journal prefix'iyle çakışan lifecycle delete kuralı: yasak
- Doküman ve backup bucket/credential'ları: yeniden kullanılamaz

Cloudflare Bucket Lock nesne silme ve overwrite işlemlerini retention süresince
engeller, lifecycle kuralından önceliklidir. Ancak hesap yöneticisi lock
yapılandırmasını değiştirebildiği için mutlak account-admin WORM garantisi
değildir. Bucket-config credential runtime credential'larından ayrı tutulur.

Resmî referanslar:

- https://developers.cloudflare.com/r2/buckets/bucket-locks/
- https://developers.cloudflare.com/r2/api/s3/api/
- https://developers.cloudflare.com/r2/api/tokens/
- https://developers.cloudflare.com/r2/api/s3/temporary-credentials/

## Gerçek R2 adapter sözleşmesi

Adapter `ProductionDeletionJournalStorePort` arayüzünü yalnız şu komutlarla
uygular:

- `PutObject`: `IfNoneMatch: "*"` ve `ContentType: application/json` zorunlu;
- `ListObjectsV2`: exact tenant-scope hash prefix'i ve tam pagination;
- `GetObject`: listelenmiş exact key'in şifreli envelope gövdesi.

Yalnız `412 PreconditionFailed`, `already-exists` sonucuna çevrilir. Yetki,
network, provider veya diğer HTTP hataları aynen fail-closed yükseltilir.
Adapter `DeleteObject`, `DeleteObjects`, overwrite, copy, multipart veya
bucket-config komutu içermez.

Listeleme/okuma şu durumlarda durur:

- prefix dışı veya biçimi bozuk object key;
- tekrar eden key veya pagination tokenı;
- truncated cevapta eksik continuation token;
- anahtarsız liste kaydı;
- eksik body veya `application/json` dışı content type;
- liste, `Content-Length` ve gerçek UTF-8 byte sayısı uyuşmazlığı;
- tek nesnede `1 MiB` ya da bir scope'ta `10.000` nesne sınırının aşılması.

Object key ve gövdeler uygulama loguna veya preflight kanıtına yazılmaz.

## Credential ve secret sınırı

Cloudflare'ın kalıcı `Object Read & Write` yetkisi yalnız put değildir;
`DeleteObject`, `DeleteObjects` ve `CopyObject` işlemlerini de kapsar. Bu yüzden
append credential kalıcı geniş write tokenı olamaz.

Onaylanan append profili:

- Cloudflare temporary credential, local signing ile üretilmiş;
- yalnız `journal/` prefix'i ve exact journal bucket;
- exact actions: `GetObject`, `ListObjectsV2`, `PutObject`;
- session token zorunlu;
- TTL en az 60 saniye, en fazla Cloudflare sınırı olan 604.800 saniye;
- delete/copy/multipart/bucket-config action'ı yok.

Read credential yalnız `object-read-only`, exact bucket ve `journal/` prefix'i
içindir. Bu dilimde yalnız ad/biçim sözleşmesi vardır; hiçbir değer üretilmez:

- `PRODUCTION_DELETION_JOURNAL_R2_BUCKET`
- `PRODUCTION_DELETION_JOURNAL_R2_ENDPOINT`
- `PRODUCTION_DELETION_JOURNAL_R2_APPEND_ACCESS_KEY_ID`
- `PRODUCTION_DELETION_JOURNAL_R2_APPEND_SECRET_ACCESS_KEY`
- `PRODUCTION_DELETION_JOURNAL_R2_APPEND_SESSION_TOKEN`
- `PRODUCTION_DELETION_JOURNAL_R2_READ_ACCESS_KEY_ID`
- `PRODUCTION_DELETION_JOURNAL_R2_READ_SECRET_ACCESS_KEY`
- isteğe bağlı `PRODUCTION_DELETION_JOURNAL_R2_READ_SESSION_TOKEN`

KEK ve key-version isimleri Dilim 4C sözleşmesindeki gibi ayrı kalır. Credential,
session token, KEK ve plaintext manifest log, artifact, doküman veya DB alanına
yazılmaz.

## Provider preflight kanıtı

Preflight yalnız güvenli provider metadata snapshot'ını değerlendirir:

- exact bucket adı ve `eu` jurisdiction;
- enabled `journal/` Bucket Lock ve en az 94.608.000 saniye/indefinite süre;
- çakışan lifecycle delete kuralının bulunmaması;
- bucket-config credential'ın runtime'a açılmaması;
- append credential'ın exact kısa ömürlü action allowlist'i;
- read credential'ın exact bucket/prefix read-only kapsamı.

Başarılı kanıt yalnız bucket adı, jurisdiction, lock rule kimliği, retention,
exact action adları ve `providerPreflightReady=true` taşır. Access key, secret,
session token, tenant kimliği, object key veya journal gövdesi taşımaz.

## Açık blocker'lar ve sonraki kapı

- Ayrı EU bucket ve Bucket Lock henüz oluşturulmadı.
- Bucket-config, append ve read credential'ları oluşturulmadı.
- Credential local-signing/mint akışı ve tek-writer kilidi eklenmedi.
- GitHub vars/secrets veya workflow eklenmedi.
- Sentetik provider append/read/overwrite provası çalıştırılmadı.
- Production purge, delete veya restore-replay çalıştırılmadı.
- `productionBackupDeletionReplayReady=false` kalır.

Sıradaki ayrı onay kapısı Dilim 4E provider kaynaklarının oluşturulması,
least-privilege credential yapılandırması ve yalnız sentetik şifreli entry ile
canlı R2 append/read/overwrite preflight provasıdır.
