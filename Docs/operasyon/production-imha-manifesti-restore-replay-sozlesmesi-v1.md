# Production İmha Manifesti ve Restore-Sonrası Replay Sözleşmesi v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: P-B08 DİLİM 4A YEREL ÇEKİRDEK HAZIR / CANLI ADAPTER VE PROVA KAPALI

## Amaç ve sınır

Bu sözleşme, onaylı retention kararları uyarınca imha edilen tenant verisinin
eski bir backup restore edildiğinde geri gelmesini önleyecek idempotent replay
çekirdeğini tanımlar. Dilim yalnız saf TypeScript sözleşmesi, sentetik test ve
güvenli kanıt özeti üretir. Production DB, R2 veya backup kaynağına bağlanmaz;
Prisma/R2 mutasyon adapter'ı, GitHub Actions workflow'u veya scheduler içermez.

## İki katmanlı manifest

Hassas yürütme manifesti exact tenant kapsamındaki kayıt kimliklerini ve
`DocumentFile` ile birebir eşleşen R2 storage key'lerini taşıyabilir. Bu içerik
kişisel/operasyonel veri kabul edilir ve güvenli kanıt çıktısına, log'a,
workflow artifact'ına ya da dokümana yazılamaz. Manifest:

- exact 40 karakter release SHA, güvenli tenant/manifest kimliği ve envanter
  SHA-256 değerini;
- `CLOSURE_PENDING` yaşam döngüsü ile sıfır aktif oturum/legal hold kapısını;
- katalogdaki exact kategori, karar ve kural kimliklerini;
- üretim zamanından ileri olmayan ayrı imha uygunluk kanıtını;
- model/kategori eşleşmeli exact kayıt hedeflerini;
- `DocumentFile` kayıtlarıyla birebir eşleşen normalize R2 hedeflerini taşır.

Canonical ve sıralı payload SHA-256 ile imzalanır. Her kullanımda checksum
yeniden hesaplanır; değiştirilmiş manifest veya başka manifestten checkpoint
fail-closed reddedilir.

Güvenli kanıt özeti yalnız manifest/checksum, tenant/release, retention sürümü,
kategori/model/kayıt/nesne sayıları ve toplam byte değerini taşır.
`sensitiveTargetsIncluded=false` sabittir; kayıt kimliği veya storage key
çıktıya girmez.

## İdempotent yürütme ve replay

Yerel çekirdek tek seferde yalnız bir kalıcı checkpoint geçişi yapar:

1. `PREPARED`: exact R2 hedefleri uygulanır.
2. `R2_APPLIED`: exact DB kayıt hedefleri uygulanır.
3. `DB_APPLIED`: DB ve R2'de hedeflerin yokluğu doğrulanır.
4. `VERIFIED`: tekrar çağrı yan etkisiz sonuçlanır.

Port sonucu eksik veya fazla hedef taşıyamaz. Bir hedef zaten yoksa ancak aynı
manifest checksum'ına bağlı idempotency kanıtı varsa kabul edilir; aksi durum
drift sayılır. Kısmi hata checkpoint'i ilerletmez ve aynı manifestle güvenli
tekrar yapılabilmesine izin verir. `VERIFIED` checkpoint ve checksum eşleşmesi
olmadan `backupDeletionReplayReady=true` kanıtı üretilemez.

## Retention ve güvenlik kapıları

- Tenant kök kaydı manifest hedefi değildir ve silinmez.
- Aktif session veya legal hold manifest üretimini durdurur.
- Model/kategori drift'i ile katalog dışı karar/kural kimliği reddedilir.
- Uygunluk zamanı gelecekte olan hedef reddedilir.
- `DocumentFile`/R2 hedefleri birebir değilse manifest oluşmaz.
- Production backup nesneleri tek tek silinmez; 30 günlük lifecycle korunur.
- Hesap kapatma çekirdeğindeki `purgeAllowed` ve
  `destructiveDeleteAllowed` bu dilimde değişmez ve kapalı kalır.

## Bu dilimde yapılmayanlar ve sonraki kapılar

- Production veya staging DB/R2/backup okunmadı ve değiştirilmedi.
- Gerçek credential, secret, provider kaynağı veya workflow oluşturulmadı.
- Tenant dondurma, session iptali, legal hold, purge veya delete çalıştırılmadı.
- Hassas manifest için kalıcı şifreli journal adapter'ı eklenmedi.
- Prisma transaction ve R2 delete adapter'ları eklenmedi.

Sıradaki ayrı onay kapısı kişisel/production veri içermeyen sentetik fixture ile
gerçek adapter içermeyen durum makinesi provası ve ardından ayrıca onaylanacak
şifreli append-only journal tasarımıdır. Canlı adapter, credential ve gerçek
tenant işlemi daha sonraki bağımsız kapılardır.
