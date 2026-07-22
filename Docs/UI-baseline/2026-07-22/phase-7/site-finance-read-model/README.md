# Faz 7 — Şantiye finans read-model panosu

Bu klasör, `/santiyeler` route'undaki finans özetinin production build ve
gerçek `demo-accounting` kapsamıyla alınan görsel doğrulama paketidir.

## Görseller

- `desktop-site-finance-1440x1000.png`: masaüstü özet kartları, finans tablosu,
  işçilik kırılımı ve kârlılık raporu bağlantısı.
- `mobile-site-finance-390x844.png`: mobil başlık, aksiyonlar ve özet kartlarının
  tek sütun akışı.

## Doğrulanan davranışlar

- Yalnız `Kaydedildi` durumundaki fatura, gider ve hakedişler hesaplamaya girer.
- Bordro tahakkukları ile bordroya kaynak olan puantajlar mükerrer sayılmaz.
- İşçilik toplam maliyet ve net sonuç hesabına katılır ve tabloda ayrı görünür.
- Şantiye tablosu ile Raporlar kârlılık görünümü aynı ortak read-modeli kullanır.
- `Kârlılık raporu` aksiyonu `/raporlar#santiye-karlilik` bölümüne yönlenir.
- Masaüstü ve mobilde tek `h1`; belge/finans bölümü yatay taşması ve tarayıcı
  konsol hatası yoktur.
- Görsel doğrulama sırasında veri mutasyonu gönderilmemiştir.
- Prisma şeması, migration, API, action ve kalıcı veri değiştirilmemiştir.

Bu baseline kullanıcı görsel kabulü bekler. Kabul sonrasında kalan Faz 7
adaylarının altyapı/UI/test kapanış matrisi ele alınacaktır.
