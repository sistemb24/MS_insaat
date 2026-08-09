# Production İmha Restore-Replay Sentetik Prova Sözleşmesi v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: P-B08 DİLİM 4B YEREL SENTETİK PROVA HAZIR / CANLI KAYNAKLAR KAPALI

## Amaç ve sınır

Bu sözleşme Dilim 4A'daki idempotent imha/replay çekirdeğini kişisel veya
production veri içermeyen bellek içi fixture ile iki tam çevrimde doğrular:
ilk imha ve eski durumdan restore sonrası aynı manifestin yeniden uygulanması.
Prova Prisma, PostgreSQL, Cloudflare R2, backup provider, secret veya workflow
kullanmaz.

## Sentetik fixture

Fixture yalnız `tenant-synthetic-replay-001` kapsamındaki iki kayıt hedefi ve
bir doküman nesnesi modeller. Bu kimlikler hassas manifest içinde tutulur;
rehearsal çıktısına taşınmaz. Manifest:

- `CLOSURE_PENDING`, sıfır session ve sıfır legal hold kapılarını;
- iki onaylı retention kategori/karar/kuralını;
- bir `DocumentFile` ile birebir sentetik nesne hedefini;
- sabit sentetik envanter checksum'ını ve Dilim 4A'nın merge release SHA'sını
  kullanır.

Bellek içi DB/R2 durumları restore kapsamındadır. Hedef referansları ile aynı
manifest checksum'ını eşleyen append-only journal haritası restore kapsamının
dışındadır ve restore sırasında temizlenmez.

## Yürütülen çevrim

1. Manifest ve `PREPARED` checkpoint oluşturulur.
2. R2 hedefi uygulanıp `R2_APPLIED` elde edilir.
3. DB hedefleri uygulanıp `DB_APPLIED` elde edilir.
4. Hedeflerin yokluğu doğrulanıp ilk `VERIFIED` sonucu alınır.
5. Sentetik backup snapshot'ı DB/R2 hedeflerini geri getirir; journal korunur.
6. Aynı manifest yeni `PREPARED` checkpoint ile yeniden uygulanır.
7. Restore-replay çevrimi de `VERIFIED` tamamlanır.

R2 veya DB'de ilk hedef silindikten sonra enjekte edilen tek seferlik kısmi
hatalar checkpoint'i ilerletmez. Aynı checkpoint tekrarlandığında journal'daki
aynı-manifest kanıtı `already-absent` hedefi güvenli kabul ettirir ve çevrim
tamamlanır.

## Güvenli çıktı

Yerel komut:

`npm run production:deletion-replay:rehearsal:synthetic`

Yalnız şu güvenli alanları üretir:

- ilk ve restore-sonrası replay durumları;
- manifest SHA-256 değeri;
- model, kayıt, nesne ve restore sayımları;
- journal entry ve kurtarılan sentetik hata sayısı;
- `synthetic=true`, `sensitiveTargetsIncluded=false` ve
  `syntheticVerificationReady=true`;
- `productionBackupDeletionReplayReady=false`.

Tenant, kayıt, doküman veya storage key çıktıya girmez. Sentetik başarılı sonuç
production hesabı için replay hazırlığı veya silme yetkisi sayılmaz.

## Bu dilimde yapılmayanlar ve sonraki kapı

- Production/staging DB, R2 veya backup okunmadı/değiştirilmedi.
- Prisma/R2 mutation adapter'ı, credential, secret veya workflow eklenmedi.
- Tenant dondurma, session iptali, legal hold, purge veya delete çalıştırılmadı.
- Kalıcı şifreli journal provider'ı veya anahtar yönetimi tasarlanmadı.

Sıradaki ayrı onay kapısı P-B08 Dilim 4C şifreli append-only journal tasarımıdır.
Gerçek adapter, credential ve canlı tenant işlemi daha sonraki bağımsız
kapılardır.
