# Production Şifreli Append-Only İmha Journal Sözleşmesi v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: P-B08 DİLİM 4C YEREL KRİPTO/JOURNAL SÖZLEŞMESİ HAZIR / PROVIDER KAPALI

## Amaç ve sınır

Bu sözleşme hassas imha manifesti ve checkpoint geçişlerinin eski bir backup
restore edildikten sonra da doğrulanabilmesi için şifreli, sıralı ve
append-only journal biçimini tanımlar. Dilim yalnız saf Node.js kriptografi
çekirdeği, object-store portu ve bellek içi adapter içerir. Cloudflare bucket,
lock, lifecycle, API token, GitHub secret veya workflow oluşturmaz.

## Aday provider sınırı

Canlı aşamada backup bucket'tan ayrı,
`noa-insaat-production-deletion-journal-eu` adlı EU-jurisdiction R2 bucket
önerilir. `journal/` prefix'i en az `1.095` gün Bucket Lock altında tutulur;
backup bucket'ın 30 günlük lifecycle'ı journal'a uygulanmaz.

Cloudflare'ın güncel resmi sınırları:

- R2 Bucket Lock nesnelerin silinmesini/üzerine yazılmasını süreli veya süresiz
  engeller ve lifecycle kuralından önceliklidir:
  https://developers.cloudflare.com/r2/buckets/bucket-locks/
- S3 uyumluluk tablosu `PutObject` için `If-None-Match` conditional operation'ı
  destekler; S3 Object Lock header'ları ise desteklenmez:
  https://developers.cloudflare.com/r2/api/s3/api/
- R2 tüm nesneleri provider-yönetimli AES-256 ile at-rest şifreler; hassas
  journal sınırı ayrıca istemci tarafı şifreleme kullanır:
  https://developers.cloudflare.com/r2/reference/data-security/

Bucket Lock kuralı hesap yöneticisi tarafından yeniden yapılandırılabilir;
mutlak account-admin WORM sınırı olarak yorumlanmaz. Canlı provider kapısında
bucket-config yetkisi journal append/read credential'larından ayrı tutulmalıdır.

## Kriptografi sözleşmesi

Her entry için:

- 32 byte sürümlü KEK yalnız secret ortamından okunur;
- rastgele 32 byte salt ve 12 byte IV üretilir;
- HKDF-SHA256 ile entry'ye özgü 32 byte anahtar türetilir;
- hassas payload AES-256-GCM ile şifrelenir ve 16 byte authentication tag taşır;
- object key, algoritma, şema/key sürümü, HMAC scope hash ve sequence AAD olarak
  doğrulanır;
- envelope ciphertext dâhil SHA-256 checksum taşır.

Payload exact manifest, checkpoint, event kimliği, sıra, kayıt zamanı ve önceki
entry checksum'ını içerir. Tenant, kayıt kimliği veya storage key plaintext
object key/envelope içine girmez.

Tenant prefix'i KEK'ten ayrı HKDF domain'iyle türetilen HMAC-SHA256 scope
anahtarıyla takma adlandırılır. Key rotation yeni key-version scope'u açar;
eski chain'lerin okunması için eski KEK sürümleri üç yıllık kanıt süresince
keyring'de tutulmalıdır. Çok-sürümlü provider discovery/rotation adapter'ı bu
dilimin kapsamında değildir.

## Append-only ve hash-chain sözleşmesi

Object key biçimi:

`journal/v1/<scope-hash>/<12-haneli-sequence>-<opaque-event-id>.json.enc`

Her yazma `If-None-Match: *` ister. Aynı key varsa overwrite reddedilir. Entry
payload'ı önceki encrypted-envelope checksum'ını taşır. Okuma sırasında bütün
entry'ler açılır, manifest/checkpoint eşleşmesi yeniden doğrulanır ve:

- sequence 1'den başlamıyorsa veya boşluk varsa;
- aynı sequence için birden fazla event varsa (fork);
- previous checksum zinciri kırılmışsa;
- envelope checksum, ciphertext, GCM tag, AAD, object key veya tenant scope
  eşleşmiyorsa

işlem fail-closed durur. Conditional create tek başına farklı event ID'li aynı
sequence fork'unu engellemez; hash-chain doğrulaması bunu yakalar. Canlı writer
ayrıca tek-writer concurrency kilidi kullanmalıdır.

## Secret ve erişim modeli

Yerel config yalnız aşağıdaki adların biçimini doğrular; değer oluşturmaz:

- `PRODUCTION_DELETION_JOURNAL_KEY_VERSION`
- `PRODUCTION_DELETION_JOURNAL_KEK`

KEK canonical base64 ve tam 32 byte olmalıdır. Değer log, artifact, doküman,
exception veya DB alanına yazılmaz. Canlı tasarımda:

- append credential yalnız ayrı journal bucket'ına list/get/put;
- read credential yalnız list/get;
- bucket lock/config token yalnız provider yönetim adımına;
- hiçbir runtime credential delete veya bucket-config yetkisine

sahip olmamalıdır. Gerçek secret adları/izinleri provider diliminde ayrıca
onaylanır.

## Bu dilimde yapılmayanlar ve sonraki kapı

- Production/staging DB, R2, backup veya journal okunmadı/değiştirilmedi.
- Bucket, Bucket Lock, lifecycle, credential veya GitHub secret oluşturulmadı.
- R2 adapter, workflow, scheduler veya canlı key rotation eklenmedi.
- Tenant dondurma, session iptali, legal hold, purge veya delete çalıştırılmadı.
- `productionBackupDeletionReplayReady` açılmadı.

Sıradaki ayrı onay kapısı P-B08 Dilim 4D gerçek R2 journal adapter'ı ve provider
preflight sözleşmesidir. Bucket/lock/credential oluşturma ve sentetik provider
rehearsal bundan sonra ayrıca açık onay gerektirir.
