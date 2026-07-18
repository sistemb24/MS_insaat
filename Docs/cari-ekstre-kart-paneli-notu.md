# Cari Ekstre Kart Paneli Notu

Bu not `/tedarikciler`, `/musteriler` ve `/taseronlar` tanım ekranlarında eklenen ortak hesap ekstresi panelini açıklar.

## Amaç

Eski NOA ekranlarındaki tedarikçi/müşteri/taşeron ekstre iş akışı, ilk aşamada ayrı bir tam sayfa modül olarak değil, seçili kartın altında okunabilir bir panel olarak uygulanır. Böylece kullanıcı kart listesinden cariyi seçtiğinde aynı ekranda belge, ödeme, tahsilat ve yürüyen bakiye akışını görebilir.

## Veri Sözleşmesi

Panel yeni bir tablo veya migration açmaz. `/raporlar` modülünde kullanılan `summarizeOperationalReports` çıktısındaki `counterpartyStatementDetailRows` satırlarını kullanır.

Kaynaklar:

- kesinleşmiş alış faturaları
- kesinleşmiş hakedişler
- kesinleşmiş maaş tahakkukları
- kasa/banka hareketleri

Seçili kartın `name` alanı, ekstre satırındaki `counterpartyName` ile eşleştiğinde hareket panelde gösterilir.

## Ekran Davranışı

- Panel yalnız route tarafından `statementRows` verisi sağlandığında görünür.
- `src/lib/navigation.test.ts` ekstre paneli veri yükleyen kart route'larını `tedarikciler`, `musteriler`, `taseronlar` olarak sabitler.
- Seçili cari değiştiğinde panel aynı ekranda o carinin hareketlerine daralır.
- Hareket yoksa panel boş durum gösterir.
- Pozitif tutarlar alacak/ödeme yönünü, negatif tutarlar borç/tahsilat yönünü gösteren mevcut rapor sözleşmesini izler.
- Evrak numarası `Evraka Git` bağlantısı olarak çalışır ve ilgili modül route'una `evrak` query değeriyle gider.

Hedef route eşleşmeleri:

- fatura hareketleri: `/faturalar?evrak={documentNo}`
- hakediş hareketleri: `/hakedis?evrak={documentNo}`
- kasa/banka hareketleri: `/kasa-banka?evrak={documentNo}`
- maaş hareketleri: `/personel?evrak={documentNo}`

Hedef işlem ekranı `evrak` query değerini okur ve eşleşen tablo satırını vurgulu açar. Bu davranış eski pencere görünümünü kopyalamadan cari ekstreden asıl belgeye dönme iş akışını korur.

Panelde görünen seçili cari hareketleri CSV olarak indirilebilir. CSV çıktısı ekranda filtrelenen satırları temel alır ve rapor ekranındaki `Cari Hareket Ekstresi` CSV sözleşmesiyle aynı kolonları kullanır: tarih, cari, kaynak, evrak no, işlem, tutar, yürüyen bakiye ve para birimi. P0 kapsamında `Para Birimi` kolonu her satırda `TL` değerini taşır.

## Bilinçli Sınırlar

- Hedef işlem ekranında query değerine göre satır vurgusu vardır; otomatik düzenleme formu açma yoktur.
- Cari ekstre CSV başlangıcı vardır; PDF/XLSX ekstre çıktısı yoktur.
- Ayrı tedarikçi, müşteri veya taşeron detay sayfası yok.
- Açılış bakiyesi ve devir fişi ayrı bir ledger satırı olarak modellenmedi.

## Doğrulama

- `src/components/entity-list-surface.test.tsx` seçili tedarikçi ve müşteri için hesap ekstresi panelini, başka cari hareketlerinin gizlendiğini, CSV çıktısını ve evrak bağlantısını doğrular.
- `src/lib/navigation.test.ts` ekstre paneli veri yükleyen kart route'larını `tedarikciler`, `musteriler`, `taseronlar` olarak sabitler.
- `src/lib/report-export.test.ts` CSV kolon sırası, sayı formatı, P0 `Para Birimi=TL` kolonu ve hücre kaçışlarını doğrular.
- `src/components/purchase-invoice-surface.test.tsx`, `src/components/progress-payment-surface.test.tsx`, `src/components/cash-bank-surface.test.tsx` ve `src/components/payroll-accrual-surface.test.tsx` hedef evrak satırının vurgulandığını doğrular.
- TypeScript kontrolü route seviyesinde ekstre verisinin doğru prop ile taşındığını doğrular.

