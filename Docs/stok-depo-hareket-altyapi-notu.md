# Stok/Depo Hareket Altyapı Notu

Bu not `Stok/Depo` modülünün çalışan SaaS çekirdeğini açıklar. İlke: eski pencere görünümü değil, kaynak belgelerden normalize depo hareketine uzanan iş akışı korunur.

## Kapsam

`/stok-depo`, `Kaydedildi` durumundaki alış faturası, alış irsaliyesi ve `StockMovement` satırlarından ortak okuma modeli üretir. Alış faturasına bağlı kesinleşmiş irsaliye varsa stok kaynağı yalnız irsaliye olur; maliyet bağlı fatura satırından oransal taşınır ve çift giriş engellenir. Normalize hareket tablosu depolar arası transfer ile şantiye çıkışını taslak, kesinleştirme ve iptal yaşam döngüsüyle saklar.

## 02.07.2026 Minimum Stok Ayarı

Bu dilimde stok bakiyesi yine fatura kaynaklı okuma modeli olarak kalır; ancak minimum stok eşiği artık kod içi pilot listeden çıkarıldı. `/stok-depo` özet satırında her depo/stok kombinasyonu için minimum miktar girilebilir.

- Minimum eşikler `StockMinimumSetting` tablosuna tenant/firma/dönem kapsamında yazılır.
- Ayar anahtarı depo + stok kodu, kod yoksa depo + stok adı üzerinden deterministik üretilir.
- Bildirim Merkezi, düşük stok uyarısını bu kalıcı ayarlardan üretir.
- Bu tarihsel dilim yalnız uyarı eşiğini kalıcılaştırmıştı; güncel minimum stok bildirimi normalize hareketlerden hesaplanan mevcut bakiyeyi kullanır.

## 02.07.2026 Stok Kartı Tanımı

`/stok-depo` ekranına stok kartı tanım yüzeyi eklendi. Bu yüzey mevcut Tanımlar CRUD standardını kullanır; ayrı bir pencere mantığı kurmadan stok/depo iş akışının referans kartlarını aynı ekranda yönetir.

- `stok-kartlari` tanımı `STK` kod serisi, stok adı, grup, üretici, birim, varsayılan depo, minimum miktar ve durum alanlarını taşır.
- Stok kartındaki `Varsayılan Depo` + `Minimum Miktar`, Bildirim Merkezi düşük stok üretiminde varsayılan eşik olarak kullanılır.
- `/stok-depo` özet satırındaki minimum girişi karttan gelen değeri ekranda başlangıç değeri olarak gösterir; satır içi `StockMinimumSetting` kaydı varsa bu değer kart eşiğini override eder.
- `/faturalar` satır grid'i aktif stok kartlarını öneri lookup'ı olarak kullanır; kart seçimi stok kodu, stok adı, birim ve varsayılan depo bilgisini satıra doldurur.
- Stok kartı seçimi zorunlu değildir; fatura satırı serbest giriş akışı korunur.
- Karttan gelen stok kodu, kaydedilen fatura satırı üzerinden `/stok-depo` okuma modeline taşınır.

Bağlanan kaynak:

- `PurchaseInvoice.status = Kaydedildi`
- satırda `stockName` dolu
- satırda `warehouse` dolu
- hareket kaynağı `purchase-invoice`
- kesinleşmiş alış irsaliyesi için hareket kaynağı `delivery-note`
- kesinleşmiş depo transferi ve şantiye çıkışı için hareket kaynağı `stock-movement`

Dışarıda bırakılanlar:

- `Taslak` faturalar
- `İptal` faturalar
- deposu boş hizmet/satırlar
- otomatik stok kartı bakiyesi yazımı
- taslak veya iptal edilmiş manuel stok hareketleri

## UI Davranışı

`/stok-depo` placeholder yüzeyden çıkarıldı.

Gösterilen alanlar:

- `Depolu Kalem`
- `Giriş`, `Çıkış` ve `Mevcut Miktar`
- `Stok Değeri`
- `Stok veya evrak ara`
- `Başlangıç tarihi`
- `Bitiş tarihi`
- `Depo filtresi`
- `Depo Stok Özeti`
- `Depo Hareketleri`
- `Depo Stok Özeti` CSV indir
- `Depo Hareketleri` CSV indir
- `Depo Hareketlerini Yazdır`

Arama alanı stok adı, stok kodu, depo, evrak no, şantiye ve tedarikçi metinleri üzerinde çalışır. Depo filtresi, fatura satırlarından gelen depo isimlerinden otomatik oluşur.

Tarih aralığı filtresi fatura tarihi üzerinden çalışır. Başlangıç ve bitiş alanları boş bırakılabilir; sadece dolu olan sınır uygulanır.

Filtreler uygulandığında:

- metrikler filtrelenmiş fatura hareketlerine göre yeniden hesaplanır
- `Depo Stok Özeti` sadece ilgili depo/stok satırlarını gösterir
- `Depo Hareketleri` sadece ilgili kaynak belge ve normalize hareket satırlarını gösterir
- `Depo Stok Özeti` CSV çıktısı filtrelenmiş özet satırlarını indirir
- `Depo Hareketleri` CSV çıktısı filtrelenmiş hareket satırlarını indirir
- `Depo Hareketlerini Yazdır` aksiyonu aynı filtrelenmiş hareket kapsamını tarayıcı yazdırma akışına gönderir
- boş sonuçlarda kullanıcıya filtreye özel boş durum metni gösterilir

`Depo Stok Özeti` kolonları:

- Depo
- Stok/Hizmet
- Kod
- Miktar
- Net Değer

`Depo Hareketleri` kolonları:

- Tarih
- Evrak No
- Depo
- Stok/Hizmet
- Şantiye
- Tedarikçi
- Bakiye Etkisi
- Net

## Hesaplama

Net değer mevcut fatura satır hesaplama sözleşmesiyle hesaplanır:

- brüt = miktar * birim fiyat
- iskonto 1 ve iskonto 2 uygulanır
- net toplam depo değerine alınır
- KDV stok değerine dahil edilmez

Kesinleşmiş manuel hareketlerde değer `miktar * birim maliyet` üzerinden hesaplanır. Transfer kaynak depoda eksi, hedef depoda artı değer üretir; şantiye çıkışı yalnız kaynak depoyu azaltır. Kesinleştirme, kaynak depodaki mevcut bakiyeyi aşan çıkışı reddeder.

Ekranda filtre kullanıldığında özet satırları ana toplamdan kesilmez; önce fatura hareketleri daraltılır, sonra depo/stok özeti bu filtrelenmiş hareketlerden yeniden üretilir. Bu karar tarih aralığı raporlarında metrik, özet ve hareket tablolarının aynı kapsamı göstermesi için bilinçlidir.

## Bilinçli Sınırlar

- Stok kartına otomatik bakiye yazımı yok
- Sayım ve fire için ayrı hareket türleri henüz yok
- Bağlantısız alış irsaliyesinde uydurma stok maliyeti üretilmez; miktar hareketi değer `0` ile görünür
- Fatura satırında stok kartı seçimi öneri amaçlıdır; stok kartı zorunlu tutulmaz
- P0 yazdırma davranışı özel PDF üretmez; filtreli fatura kaynaklı depo girişleri için tarayıcı `print` akışını kullanır. CSV çıktıları P0 `Para Birimi=TL` kolonu taşır ve ekranda görünen filtreli kapsamdan üretilir

Fatura, irsaliye veya manuel hareket kesinleşmeden depo değerine etki etmez; normalize tablo bu belge yaşam döngüsünü bozmadan ortak read-model'e katılır.

## Doğrulama Kapsamı

Eklenen testler:

- `src/lib/stock-depot-service.test.ts`
- `src/components/stock-depot-surface.test.tsx`
- `src/lib/stock-movement-service.test.ts`
- `src/components/stock-movement-surface.test.tsx`

Kapsanan davranış:

- yalnız `Kaydedildi` faturalar stok/depo okuma modeline girer
- depo alanı boş satırlar dışarıda kalır
- aynı depo/stok/birim satırları özetlenir
- `/stok-depo` yüzeyi depo stok özeti ve fatura kaynaklı girişleri gösterir
- `/stok-depo` yüzeyi stok kartı tanımlarını aynı ekranın üstünde yönetir
- `/faturalar` satır grid'i stok kartı seçimiyle stok kodu/adı/birim/depo önerisini doldurur ve serbest girişi korur
- `/stok-depo` yüzeyi depo filtresi ve arama metniyle özet/hareket satırlarını daraltır
- `/stok-depo` yüzeyi başlangıç/bitiş tarihine göre hareketleri daraltır ve metrikleri filtrelenmiş hareketlerden yeniden hesaplar
- kullanıcı `Depo Hareketlerini Yazdır` aksiyonuyla filtrelenmiş hareket kapsamını yazdırma akışına gönderir
- kullanıcı filtrelenmiş depo stok özeti ve depo hareketlerini CSV olarak indirebilir
- stok/depo CSV çıktıları giriş/çıkış/bakiye kolonlarını, hücre kaçışını, miktar/tutar formatını ve P0 `Para Birimi=TL` sözleşmesini korur
- depo transferi ve şantiye çıkışı yalnız kesinleştiğinde bakiyeye yansır; yetersiz kaynak bakiyesi ve güvenli olmayan transfer iptali engellenir
