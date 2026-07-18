# NOA İnşaat Ön Muhasebe SaaS Ürün Analizi ve Geliştirme Planı

> Güncelleme tarihi: 24.06.2026  
> Ana ilke: Yeni SaaS üründe birebir korunması gereken şey eski pencere görünümü değil, iş akışıdır.  
> Kaynak önceliği: 1. ekran görüntüleri, 2. video başlıkları ve eğitim akışları, 3. `stitch_HTML_sablonlar` HTML havuzu, 4. resmi ürün/kılavuz kaynakları, 5. modern SaaS mimari yorumu.

## 1. Bu Belgenin Kullanım Amacı

Bu belge, uzun süreli geliştirme boyunca bağlamı kaybetmemek için ana referans dokümandır. Yeni proje oluşturulurken her modül, ekran, veri modeli, iş kuralı ve sprint kararı bu dokümana geri bağlanmalıdır.

Ürün yeniden yapılırken hedef eski Windows arayüzünü web üzerinde kopyalamak değildir. Hedef, demo uygulamadaki kullanıcı davranışını ve operasyonel muhasebe mantığını korumaktır:

- Kullanıcı az tıklama ile kayıt açabilmeli.
- Liste, filtre, arama, Excel, yazdırma ve detay işlemleri her yerde aynı çalışmalı.
- Şantiye, taşeron, personel, tedarikçi, kasa/banka, stok, çek, fatura, hakediş ve puantaj tek finansal hareket çekirdeğine bağlanmalı.
- Masaüstü uygulamadaki veri yoğunluğu korunmalı; modern tasarım bu yoğunluğu sadeleştirmeli ama saklamamalı.
- Her karar ekran görüntüsü kanıtına, video akışına veya açık ürün gereksinimine bağlanmalı.

## 2. Kaynak Hiyerarşisi

### 2.1 Birincil kaynak: ekran görüntüleri

Klasör: `D:\Projeler\NOA-InsaatYonetim\NOA-insaat-SS görseller`

Ekran görüntüleri bu belgenin ana kanıtıdır. Çünkü ekranlar, gerçek uygulamada hangi modüllerin, hangi aksiyonların, hangi alanların ve hangi liste düzenlerinin bulunduğunu gösterir.

| Kaynak grubu | Dosya sayısı | Plan içindeki görevi |
| --- | ---: | --- |
| `Ana Sayfa.png` | 1 | Uygulama kabuğu, menü, ribbon ve durum çubuğu |
| `Arayüz yerleşimi(layout).png` | 1 | Başlık çubuğu, menü, toolbar, sekme, aksiyon bar, sol panel, grid, durum barı |
| `Araç Çubuğu Hızlı Erişim Menüsü` | 106 | Modül ana ekranları, işlem menüleri, form ve hareket ekranları |
| `Menü Çubuğu` | 54 | Tanımlar, hareketler, raporlar, parametreler, yardım ve mesajlar |

Ekran görüntüsü yorumlama kuralları:

- Klasör adı modül veya ekran ailesi olarak kabul edilir.
- Dosya adı işlev ipucu olarak kabul edilir.
- Aynı ekranın farklı görselleri varsa, tüm varyasyonlar birleşik gereksinim olarak ele alınır.
- Ekranda görülen alanlar MVP için “aday gereksinim”, sık tekrar eden kalıplar ise “çekirdek platform standardı” sayılır.
- Ekranda görülen masaüstü pencere, ikon veya renk birebir kopyalanmaz; akış, veri alanı, işlem sırası ve kayıt etkisi korunur.

### 2.2 İkincil kaynak: video kaynakları

YouTube videoları uygulamanın eğitim sırasını ve kullanıcının modüller arasında nasıl düşündüğünü anlamak için kullanılır. Video başlıkları ve kanal bilgisi doğrulandı; kanal `Hayri Çelik`.

| Sıra | Video | Doğrulanan başlık | Desteklediği ürün alanı |
| --- | --- | --- | --- |
| 1 | `https://www.youtube.com/watch?v=1g4QmXuxpcI` | İnşaat Muhasebe Programı | Genel program mantığı |
| 2 | `https://www.youtube.com/watch?v=kAKk8pa1DZw` | Fatura Girişi - İnşaat Muhasebe Programı | Fatura girişi |
| 3 | `https://www.youtube.com/watch?v=KzrZWV_hvAI` | İnşaat Muhasebe Programı - Çek İşlemleri | Çek işlemleri |
| 4 | `https://www.youtube.com/watch?v=1XqSUjPaglQ` | İnşaat Muhasebe Programı - Hakediş Ekleme | Hakediş |
| 5 | `https://www.youtube.com/watch?v=1w_D8nC6VF0` | NOA İnşaat Ön Muhasebe Programı Eğitim Videosu | Genel eğitim |
| 6 | `https://www.youtube.com/watch?v=XndgHsX9eN0` | NOA İNŞAAT MUHASEBE PROGRAMI ALIŞ FATURA GİRİŞ EĞİTİMİ | Alış faturası |
| 7 | `https://www.youtube.com/watch?v=12MgDPLe6VM` | NOA İNŞAAT MUHASEBE PROGRAMI - ÇEK İŞLERİMİ EĞİTİMİ | Çek portföyü |
| 8 | `https://www.youtube.com/watch?v=AOntUy7L9lA` | NOA İNŞAAT MUAHSEBE PROGRAM - PUANTAJ GİRİŞİ EĞİTİMİ | Puantaj |
| 9 | `https://www.youtube.com/watch?v=yLbGaR-hNxc` | NOA İNŞAAT MUHASEBE PROGRAMI - GİDER KAYDI EĞİTİM VİDEOSU | Gider kaydı |
| 10 | `https://www.youtube.com/watch?v=sPBxbD48nZc` | NOA İNŞAAT ÖN MUHASEBE PROGRAMI - DEPO TAKİP | Depo ve stok |
| 11 | `https://www.youtube.com/watch?v=13jDlElkgYo` | NOA İNŞAAT ÖN MUHASEBE PROGRAMI TANITIM VİDEOSU | Genel tanıtım |

Video kullanım kararı:

- Videolar, modüllerin eğitim ve kullanım sırasını destekler.
- Video başlığı bir ekran görüntüsünde görülen formu doğruluyorsa gereksinim güçlenir.
- Video ile ekran görüntüsü arasında öncelik çatışması olursa ekran görüntüsü esas alınır.
- Altyazı/transkript otomatik çekilemediği durumlarda video içeriği kesin metin olarak değil, konu ve akış destekleyicisi olarak kullanılır.

### 2.3 Üçüncül kaynak: HTML şablon havuzu

Klasör: `D:\Projeler\NOA-InsaatYonetim\stitch_HTML_sablonlar`

Bu klasör, yeni SaaS ürünün görsel ve etkileşimsel prototip havuzudur. Havuzda 139 HTML ve 2 markdown dosyası bulunur. Şablonlar iş akışını belirleyen birincil kaynak değildir; ekran görüntülerinden ve videolardan çıkarılan iş akışlarını modern SaaS arayüzünde tutarlı şekilde uygulamak için kullanılacak tasarım ve sayfa kalıbı kaynağıdır.

HTML havuzunun kaynak rolü:

- Ekran görüntülerindeki masaüstü akışları modern web sayfasına dönüştürmek.
- Modül bazlı liste, form, dashboard, rapor, PDF önizleme ve mobil ekran kalıplarını hızlandırmak.
- Sayfalar arası görsel tutarlılık için ortak tasarım dili çıkarmak.
- P0/P1/P2 modüllerinde kullanılacak aday ekran tasarımlarını önceden belirlemek.

HTML havuzunun sınırı:

- Statik HTML dosyaları doğrudan uygulamaya kopyalanmayacak.
- CDN üzerinden gelen Tailwind yapılandırması üretim koduna bu haliyle taşınmayacak.
- Sayfa bazlı tekrar eden renk, spacing ve component tanımları merkezi design system'e dönüştürülecek.
- Şablonda görünen örnek veri gerçek domain modeli yerine geçmeyecek.
- Şablon bir iş akışını ekran görüntüsüyle çelişirse, ekran görüntüsü ve finansal iş kuralı esas alınacak.

Havuzun teknik ortak özellikleri:

| Özellik | Gözlem |
| --- | --- |
| HTML dosyası | 139 |
| Markdown dosyası | 2 |
| Tailwind kullanımı | 139/139 |
| Inter font kullanımı | 139/139 |
| Material Symbols kullanımı | 137/139 |
| JetBrains Mono kullanımı | 137/139 |
| Dark mode izi | 139/139 |
| Form/input içeren şablon | 115 |
| PDF/yazdırma/önizleme izi | 65 |
| Mobil veya responsive ekran izi | 91 |

Şablon kullanım kararı:

- HTML havuzu P0 geliştirme için “uygulama hazır UI haritası” kabul edilir.
- Her şablon önce bileşenlere ayrılır: layout, toolbar, grid, filter bar, form section, summary card, status badge, PDF preview.
- Sonra iş akışıyla eşleştirilir: örneğin `al_faturasi_ekle.html` yalnızca görsel form değil, alış faturası domain akışına bağlanacak bir sayfa adaydır.
- Ortak stil token'ları tek yerde tanımlanır; sayfalar kendi içinde ayrı Tailwind config taşımamalıdır.
- Desktop ve mobil şablonlar aynı domain işlemin iki farklı yüzü olarak ele alınır.

### 2.4 Destek kaynakları

Ürün ve teknik kararları desteklemek için referans alınacak kaynak aileleri:

- NOA ürün web sitesi ve kullanım kılavuzu.
- GİB e-Belge portalı.
- Next.js, React, PostgreSQL, Prisma ve OpenTelemetry resmi dokümantasyonları.
- OWASP ASVS güvenlik kontrol listesi.
- Stripe Billing veya yerel abonelik/faturalama alternatifi.

Bu kaynaklar ekran görüntülerinin yerine geçmez. Sadece eksik kalan alanlarda terminoloji, regülasyon ve modern SaaS yaklaşımı için kullanılır.

## 3. Ürün Tasarım İlkesi

### 3.1 Korunacak şeyler

Yeni ürün şu iş akışı özelliklerini korumalıdır:

- Ana modüllere hızlı erişim.
- Birden fazla ekranı aynı oturumda açık tutma mantığı.
- Modül içinde sol işlem menüsü.
- Liste ekranında hızlı arama, filtre, kolonlar, toplamlar.
- Yeni, düzenle, sil/iptal, yenile, detay, Excel, yazdır gibi standart aksiyonlar.
- Finansal formlarda evrak no, tarih, vade, hesap, şantiye, döviz/kur ve hareket grubu düzeni.
- Satır kalemli fatura/hakediş/stok formları.
- Alt toplam, KDV, iskonto, stopaj, tevkifat, genel toplam hesapları.
- Cari hesap ekstresi ve hareket toplamları.
- Şantiye bazlı gelir/gider ve maliyet analizi.
- Klavye kısayolları ve hızlı veri girişi.

### 3.2 Kopyalanmayacak şeyler

Yeni ürün şu masaüstü unsurları birebir kopyalamamalıdır:

- Windows pencere çerçeveleri.
- Eski ikon seti.
- Çok küçük yazı ve sıkışık form düzeni.
- Modal içinde modal hissi veren karmaşık pencere yığını.
- Menülerin eski masaüstü davranışı.
- Sadece masaüstü çözünürlüğe göre tasarlanmış grid genişlikleri.

### 3.3 Modern SaaS karşılığı

| Eski uygulama kalıbı | SaaS karşılığı |
| --- | --- |
| Başlık çubuğu | Üst uygulama barı: tenant, firma, dönem, kullanıcı, bildirim |
| Menü bar | Sol ana navigasyon + hızlı komut araması |
| Ribbon | Modül kısayolları ve sık kullanılan işlemler |
| Sekmeli aktif ekran | Web tab/workspace veya breadcrumb + son açılanlar |
| Sol işlem paneli | Modül içi aksiyon menüsü |
| Modal form | Sağ çekmece, tam ekran form veya odaklı modal |
| Data grid | Sanallaştırılmış, filtrelenebilir, kolon yönetimli grid |
| Alt durum çubuğu | Sistem/dönem/kullanıcı bilgisi + işlem sonucu toast |
| Excel aktar | CSV/XLSX export, kaydedilmiş rapor görünümü |
| Yazdır | PDF şablonu ve yazdırma önizleme |

## 4. Ekran Görüntüsü Tabanlı Ürün Envanteri

### 4.1 Ana kabuk

Kanıt:

- `Ana Sayfa.png`
- `Arayüz yerleşimi(layout).png`
- `Araç Çubuğu Hızlı Erişim Menüsü/Araç Çubuğu Hızlı Erişim Menüsü.png`

Görülen ana yapı:

- Üstte menüler: Tanımlar, Hareketler, Raporlar, Parametreler, Yardım, Mesajlar, Çıkış.
- İkonlu modül erişimleri: Şantiye & Proje, Taşeron, Personel, Tedarikçi, Kasa/Banka, Hareketler, Puantaj, Maaş, Çek, Teklif, İlerleme, Evrak, YapSat, Araçlar, E-Fatura Yönetimi.
- Geniş çalışma alanı.
- Durum çubuğu: ürün adı, versiyon, kullanıcı, sunucu tarihi, lisans durumu, firma.

SaaS gereksinimi:

- Tenant/firma/dönem bağlamı her sayfada görünür olmalı.
- Modül navigasyonu sabit kalmalı.
- Kullanıcı uzun veri girişi yaparken sayfa bağlamını kaybetmemeli.
- Versiyon ve ortam bilgisi admin kullanıcılara görünmelidir.

### 4.2 Tanımlar menüsü

Kanıt klasörü:

- `Menü Çubuğu/01-Tanımlar`

Görülen tanım aileleri:

- Şantiye tanımları.
- Taşeron tanımları.
- Personel tanımları.
- Tedarikçi tanımları.
- Kasa/Banka hesap tanımları.
- Stok tanımları.
- İmalat/Hizmet tanımları.
- Ürün tanımları.
- Hareket grubu tanımları.
- Diğer tanımlar: banka, görev, stok grubu, stok üretici, depo, birim, satış durumu, ülke, araç/iş makinası.

SaaS gereksinimi:

- Tüm tanımlar ortak liste/form standardı kullanmalı.
- Her tanımda aktif/pasif, açıklama, audit alanları olmalı.
- Kod üretimi otomatik yapılmalı ama yetkili kullanıcı manuel değiştirebilmeli.
- Tanım silme, ilişkili hareket varsa fiziksel silme değil pasife alma olmalıdır.

### 4.3 Hareketler menüsü

Kanıt klasörü:

- `Menü Çubuğu/02-Hareketler`
- `Araç Çubuğu Hızlı Erişim Menüsü/06-Hareketler`

Görülen hareket aileleri:

- Şantiye & Proje hareketleri.
- Taşeron hareketleri.
- Personel hareketleri.
- Tedarikçi hareketleri.
- Kasa hareketleri.

Hareket türleri:

- Tahsilat.
- Ödeme.
- Borç.
- Alacak.
- Gider.
- Alış faturası.
- Satış faturası.
- Hakediş faturası.
- Alış irsaliyesi.
- İade faturası.
- Çek girişi.
- Firma çeki çıkışı.
- Çek çıkışı ciro.
- Kasa virman.
- Döviz alış/satış.
- Şantiye stok/hizmet hareketi.

SaaS gereksinimi:

- Hareketler tek finansal işlem motorundan geçmeli.
- Kullanıcı modülden bağımsız olarak aynı form mantığını görmeli.
- Her hareketin cari, kasa/banka, şantiye, çek ve stok etkileri transaction içinde üretilmeli.
- Hareket düzeltme ve iptal akışı audit log ile tutulmalı.

### 4.4 Raporlar menüsü

Kanıt klasörü:

- `Menü Çubuğu/03-Raporlar`

Görülen rapor aileleri:

- Hesap hareketleri.
- Şantiye raporları.
- Taşeron raporları.
- Personel raporları.
- Tedarikçi raporları.
- Fatura/irsaliye raporu.
- Ödeme/tahsilat takip raporları.
- Kasa raporları.
- Stok raporları.
- İmalat raporları.
- Zimmet raporu.
- Maaş hareketleri raporu.
- Şantiye ilerleme raporu.
- Geçmiş işlem raporları.
- Emlak satış raporları.
- Genel durum raporları.
- Özel raporlar.
- Hatırlatmalar.

SaaS gereksinimi:

- Rapor altyapısı modüllerin sonunda eklenen basit listeler olmamalı; en baştan ortak raporlama katmanı olarak tasarlanmalı.
- Kullanıcı filtreleri kaydedebilmeli.
- Her rapor XLSX, CSV ve PDF dışa aktarabilmeli.
- Raporların tenant, firma, dönem ve yetki filtreleri zorunlu olmalı.

### 4.5 Parametreler, yardım ve mesajlar

Kanıt:

- `Menü Çubuğu/04-Parametreler/Parametreler.png`
- `Menü Çubuğu/05-Yardım/Yardım.png`
- `Menü Çubuğu/06-Mesajlar/Mesajlar.png`

SaaS gereksinimi:

- Firma ayarları, numara serileri, para birimi, depo, KDV ve fatura ayarları yönetilmeli.
- Yardım içerikleri kullanıcı rolüne ve açık sayfaya göre bağlamsal olmalı.
- Mesajlar modülü bildirim, görev, hatırlatma ve sistem duyurusu olarak modernleştirilmeli.

## 5. Video Destekli Temel İş Akışları

### 5.1 Alış faturası

Destek kaynakları:

- Video 2: Fatura Girişi.
- Video 6: Alış Fatura Giriş Eğitimi.
- Ekran kanıtı: `06-Hareketler/Tedarikçi/Alış Faturası`.

Korunacak iş akışı:

1. Kullanıcı tedarikçi hareketlerinden alış faturası açar.
2. Evrak no, tarih, vade, tedarikçi, şantiye, döviz/kur, hareket grubu ve resmi belge durumu girilir.
3. Fatura tek şantiyeyle ilişkiliyse üst bilgide şantiye seçilir.
4. Birden fazla şantiye varsa satır bazında şantiye dağılımı yapılır.
5. Stok/hizmet satırları girilir.
6. Miktar, birim fiyat, iskonto, KDV ve toplamlar hesaplanır.
7. Fatura tedarikçi cari hesabını ve şantiye maliyetini etkiler.
8. Depo takibi açıksa stok giriş hareketi oluşur.
9. E-fatura bilgileri belgeye bağlanabilir.

SaaS tasarım kararı:

- Fatura durumları: taslak, onaylandı, muhasebeleşti, iptal edildi.
- Finansal etki muhasebeleşme anında oluşmalı.
- Satır bazlı şantiye dağılımı MVP içinde bulunmalı.
- Hatalı kayıt düzeltmesi yeni düzeltme kaydıyla veya yetkili revizyonla yapılmalı.

### 5.2 Gider kaydı

Destek kaynakları:

- Video 9: Gider Kaydı Eğitimi.
- Ekran kanıtı: `06-Hareketler/Şantiye & Proje/Ödeme (Gider)`.

Korunacak iş akışı:

1. Kullanıcı şantiye/proje için gider hareketi açar.
2. Şantiye, hareket grubu, ödeme aracı, tarih, evrak no ve tutar girilir.
3. Ödeme kasa, banka, firma çeki veya ciro edilen çekle yapılabilir.
4. Kayıt proje maliyetini artırır.
5. Kasa/banka/çek bakiyesi azalır.
6. Gider raporlarda hareket grubu kırılımında görünür.

SaaS tasarım kararı:

- Hızlı gider girişi masaüstü ve mobilde desteklenmeli.
- Evrak eki ve fotoğraf yükleme erken fazda eklenmeli.
- Onay akışı MVP sonrası, ama veri modeli onaya hazır olmalı.

### 5.3 Çek işlemleri

Destek kaynakları:

- Video 3: Çek İşlemleri.
- Video 7: Çek İşleri Eğitimi.
- Ekran kanıtı: `09-Çek`.

Korunacak iş akışı:

1. Gelen çek veya firma çeki kaydedilir.
2. Çek portföy, ciro, tahsil, ödeme, takas, teminat gibi durumlarda izlenir.
3. Tahsil veya ödeme sırasında kasa/banka seçilir.
4. Çek hareketi cari hesaba ve kasa/bankaya yansır.
5. Tahsil/ödeme hareketi iptal edilirse çek önceki durumuna dönebilir.
6. Vade tarihine göre filtreleme yapılır.

SaaS tasarım kararı:

- Çekler state machine ile yönetilmeli.
- Her durum geçişi audit log ve finansal hareket üretmeli.
- Yaklaşan vadeler dashboard ve bildirimlerde görünmeli.

### 5.4 Hakediş

Destek kaynakları:

- Video 4: Hakediş Ekleme.
- Ekran kanıtları: `Şantiye & Proje/Hakediş Faturası Ekle`, `Taşeron/Hakediş faturası ekle`, `Tedarikçi/Hakediş Faturası`.

Korunacak iş akışı:

1. Hakediş şantiye, taşeron, tedarikçi veya personel bağlamından açılabilir.
2. Evrak no, tarih, hesap tipi, hesap tanımı, fatura tipi, döviz/kur ve hareket grubu girilir.
3. İmalat/hizmet kalemleri miktar ve birim fiyatla eklenir.
4. KDV, stopaj, tevkifat, iskonto ve genel toplam hesaplanır.
5. Hakediş ilgili cari hesaba ve şantiye gelir/gider analizine yansır.
6. Metraj veya ilerleme kaydıyla ilişkilendirilebilir.

SaaS tasarım kararı:

- MVP'de temel hakediş faturası bulunmalı.
- Teminat, avans mahsup, SGK kesintisi ve retansiyon ikinci fazda genişletilebilir.
- Hakediş satırları ileride metraj/ilerleme modülüne bağlanacak şekilde modellenmeli.

### 5.5 Puantaj

Destek kaynakları:

- Video 8: Puantaj Girişi Eğitimi.
- Ekran kanıtı: `07-Puantaj`.

Korunacak iş akışı:

1. Şantiye, taşeron, ay ve yıl seçilir.
2. Personeller satır olarak listelenir.
3. Günler 1-31 kolonlarıyla grid üzerinde işaretlenir.
4. Mesai, yevmiye, kazanç, zimmet, borç ve alacak toplamları hesaplanır.
5. Detay menüsünden personel kartı, puantaj hareketleri ve toplu yevmiye girişi açılır.
6. Puantaj maaş tahakkukuna ve şantiye işçilik maliyetine bağlanır.

SaaS tasarım kararı:

- Masaüstünde Excel benzeri grid, mobilde ekip/gün bazlı giriş kullanılmalı.
- Aynı personelin aynı gün farklı şantiyelerde çalışması için uyarı verilmeli.
- Dönem kilitleme olmadan puantaj güvenli değildir.

### 5.6 Depo ve stok takip

Destek kaynakları:

- Video 10: Depo Takip.
- Ekran kanıtları: `Stok Tanımları`, `Depo Tanımları`, `Şantiye Stok-Hizmet Hareketi`.

Korunacak iş akışı:

1. Stok ve depo tanımları yapılır.
2. Alış faturası veya irsaliye ile stok girişi oluşur.
3. Merkez depo, ofis depo ve şantiye deposu ayrılır.
4. Şantiyeler arası stok/hizmet transferi yapılabilir.
5. Kullanılan malzeme şantiye maliyetine yansır.
6. Stok raporunda giriş, çıkış, iade, kullanılan ve kalan miktarlar görünür.

SaaS tasarım kararı:

- Stok hareketleri değiştirilemez hareket defteri mantığıyla tutulmalı.
- MVP'de ağırlıklı ortalama veya manuel birim maliyet yeterlidir.
- FIFO, lot ve seri numarası ikinci faza bırakılabilir.

## 6. Modül Bazlı Kapsam

### 6.1 Şantiye & Proje

Ekran kanıtları:

- `01-Şantiye & Proje/Şantiye & Proje.png`
- `01-Şantiye & Proje/Sol Panel/...`
- `Menü Çubuğu/01-Tanımlar/01-Şantiye Tanımları`

Ana veri alanları:

- Kod, tanım, yetkili, telefon, açıklama.
- Başlangıç tarihi, bitiş tarihi.
- Anlaşma tipi.
- Proje tutarı.
- Tahmini maliyet.
- Döviz/kur.
- Bağlı şantiye.
- Bağlı teklif.
- Vergi dairesi, vergi no, adres.
- Borç, alacak, bakiye.

İşlemler:

- Hareket ekle.
- Gider ekle.
- Hakediş faturası ekle.
- Satış faturası ekle.
- Hareket listesi.
- Hareket toplamları.
- Şantiye ekstresi.
- Gelir/gider listesi.
- Analiz.

SaaS ekranları:

- Şantiye listesi.
- Şantiye formu.
- Şantiye finans özeti.
- Şantiye gelir/gider listesi.
- Şantiye ekstre.
- Şantiye stok/hizmet hareketleri.
- Şantiye hakedişleri.
- Şantiye dashboard.

MVP kararı:

- Şantiye modülü P0 çekirdektir.
- Proje hiyerarşisi, bağlı şantiye ve bağlı teklif alanları veri modelinde bulunmalıdır.
- İlk sürümde görsel Gantt zorunlu değildir; finansal durum ve cari hareketler zorunludur.

### 6.2 Taşeron

Ekran kanıtları:

- `02-Taşeron/Taşeron.png`
- `02-Taşeron/Sol Panel/...`
- `Menü Çubuğu/01-Tanımlar/02-Taşeron Tanımları`

Ana yetenekler:

- Taşeron kartı.
- Taşeron hareketleri.
- Hakediş faturası.
- Ödeme/tahsilat.
- Çek girişi, firma çeki çıkışı, çek ciro.
- Hesap ekstresi.
- Hareket toplamları.

MVP kararı:

- Taşeron P0 kapsamındadır.
- Taşeron hakedişi temel haliyle bulunmalı.
- Kesinti, teminat ve avans mahsup ikinci faz ayrıntısı olabilir, ancak veri modeli bunları taşıyabilecek esneklikte olmalıdır.

### 6.3 Personel

Ekran kanıtları:

- `03-Personel/Personel.png`
- `03-Personel/Sol Panel/...`
- `Menü Çubuğu/01-Tanımlar/03-Personel Tanımları`

Ana veri alanları:

- Kod, ad/ünvan, görev, grup.
- Cep, telefon.
- İşe başlama, işten ayrılma.
- Ücret sistemi.
- Maaş tutarı, yevmiye, mesai ücreti.
- Döviz/kur.
- Taşeron bağlantısı.
- Adres, il/ilçe.
- T.C. kimlik no, doğum tarihi, SSK no.
- Banka, şube kodu, hesap no/IBAN.
- Çalıştığı şantiyeler.

İşlemler:

- Hareket ekle.
- Hakediş faturası ekle.
- Hesap ekstresi.
- Hareket listesi.
- Hareket toplamları.
- Puantaj hareketleri.
- Puantaj durumu.

MVP kararı:

- Personel kartı ve puantaj P0 kapsamındadır.
- Bordro mevzuat derinliği MVP konusu değildir.
- Maaş tahakkuku ön muhasebe hareketi olarak ele alınmalıdır.

### 6.4 Tedarikçi

Ekran kanıtları:

- `04-Tedarikçi/Tedarikçi.png`
- `04-Tedarikçi/Sol Panel/...`
- `06-Hareketler/Tedarikçi/...`
- `Menü Çubuğu/01-Tanımlar/04-Tedarikçi Tanımları`

Ana yetenekler:

- Tedarikçi kartı.
- Alış faturası.
- Alış irsaliyesi.
- İade faturası.
- Satış faturası.
- Hakediş faturası.
- Ödeme/tahsilat.
- Borç/alacak hareketleri.
- Çek işlemleri.
- Hesap ekstresi.

MVP kararı:

- Tedarikçi ve alış faturası P0 kapsamındadır.
- İrsaliye bağlantısı P1 olabilir, ama veri modeli baştan hazırlanmalıdır.
- E-fatura aktarma P1/P2 olabilir, ekran ve veri alanları P0'da düşünülmelidir.

### 6.5 Kasa/Banka

Ekran kanıtları:

- `05-Kasa-Banka/Kasa-Banka.png`
- `05-Kasa-Banka/Sol Panel/...`
- `06-Hareketler/Kasa/Kasa Virman`
- `06-Hareketler/Kasa/Döviz Alış - Satış`
- `Menü Çubuğu/01-Tanımlar/05-Kasa-Banka Hesap Tanımları`

Ana yetenekler:

- Kasa ve banka hesapları.
- Nakit tahsilat/ödeme.
- Banka tahsilat/ödeme.
- Virman.
- Döviz alış/satış.
- Çok para birimli bakiye.

MVP kararı:

- Kasa/Banka P0 kapsamındadır.
- Kur farkı P1'e bırakılabilir, ancak kur alanı P0'da bulunmalıdır.
- Banka entegrasyonu P2 kapsamındadır.

### 6.6 Fatura ve hakediş

Ekran kanıtları:

- `06-Hareketler/Tedarikçi/Alış Faturası`
- `06-Hareketler/Şantiye & Proje/Satış Faturası`
- `06-Hareketler/Şantiye & Proje/Hakediş (Satış) Faturası`
- `06-Hareketler/Tedarikçi/Hakediş Faturası`
- `06-Hareketler/Taşeron/Hakediş Faturası`

Ortak form alanları:

- Evrak no.
- Tarih.
- Vade tarihi.
- Hesap tipi.
- Hesap tanımı.
- Şantiye tanımı.
- Döviz/kur.
- Fatura tipi.
- Hareket grubu.
- Hareket özel grubu.
- Resmi belge işareti.
- Açıklama.
- E-fatura bilgileri.

Satır alanları:

- Stok/hizmet/imalat kodu.
- Tanım.
- Şantiye.
- Birim.
- Miktar.
- Birim fiyat.
- İskonto.
- KDV.
- Stopaj.
- Tevkifat.
- Satır toplamı.

MVP kararı:

- Alış faturası, satış faturası ve hakediş faturası P0 kapsamındadır.
- Fatura satır grid'i güçlü tasarlanmalıdır; sonradan yama kaldırmaz.

### 6.7 Çek

Ekran kanıtları:

- `09-Çek`
- `06-Hareketler/*/Çek Girişi`
- `06-Hareketler/*/Firma Çeki Çıkışı`
- `06-Hareketler/*/Çek Çıkışı Ciro`

Çek ekranı sekmeleri:

- Gelen çekler.
- Firma çekleri.
- Çek ödeme/tahsilat hareketleri.

Filtreler:

- Vade tarih aralığı.
- Portföydekiler.
- Tahsil edilmişler.
- Ciro edilmişler.
- Takastaki çekler.
- Teminattaki çekler.
- Tümü.

MVP kararı:

- Çek P0/P1 sınırındadır; inşaat ön muhasebesi için erken dahil edilmelidir.
- P0'da gelen çek, firma çeki, tahsil, ödeme, ciro bulunmalıdır.
- Takas ve teminat P1 olabilir.

### 6.8 Stok, depo, imalat/hizmet ve ürün

Ekran kanıtları:

- `Menü Çubuğu/01-Tanımlar/06-Stok Tanımları`
- `Menü Çubuğu/01-Tanımlar/07-İmalat-Hizmet Tanımları`
- `Menü Çubuğu/01-Tanımlar/08-Ürün Tanımları`
- `Menü Çubuğu/01-Tanımlar/10-Diğer Tanımlar/05-Depo Tanımları`
- `06-Hareketler/Şantiye & Proje/Şantiye Stok-Hizmet Hareketi`

Ana yetenekler:

- Stok kartı.
- Stok grubu.
- Üretici.
- Birim.
- KDV.
- Depo.
- Şantiye stok/hizmet transferi.
- İmalat/hizmet kalemi.
- Ürün/bağımsız bölüm ilişkisi.

MVP kararı:

- Stok ve depo P0 kapsamındadır.
- İmalat/hizmet tanımı hakediş için P0 kapsamındadır.
- Ürün/YapSat bağlantısı P2 olabilir.

### 6.9 Puantaj ve maaş

Ekran kanıtları:

- `07-Puantaj`
- `08-Maaş`

Ana yetenekler:

- Şantiye, taşeron, ay, yıl seçimi.
- Gün bazlı puantaj grid'i.
- Yevmiye ve mesai detayları.
- Toplu yevmiye girişi.
- Puantajdan maaş tahakkuku.
- Personel borç/alacak ve zimmet etkisi.

MVP kararı:

- Puantaj P0 kapsamındadır.
- Maaş tahakkuku P0 sonunda veya P1 başında tamamlanabilir.
- Bordro mevzuatı ve SGK beyanları kapsam dışıdır.

### 6.10 Teklif, ilerleme, evrak, YapSat, araçlar, e-fatura

Ekran kanıtları:

- `10-Teklif`
- `11-İlerleme`
- `12-Evrak`
- `13-YapSat`
- `14-Araçlar`
- `15-E-Fatura Yönetimi`

Kapsam kararı:

- Teklif: P1. Tekliften şantiye oluşturma değerli ama MVP çekirdeği değildir.
- İlerleme: P1/P2. Hakediş ve metrajla ilişkilendirilecek şekilde tasarlanmalıdır.
- Evrak: P1. Dosya eki altyapısı P0 veri modelinde yer almalıdır.
- YapSat: P2. Ayrı ürün dikeyi kadar büyüyebilir.
- Araçlar: P2. Gider grupları ve şantiye maliyetiyle ilişkili tutulmalıdır.
- E-fatura: P1/P2. Ekran P0'da düşünülmeli, canlı entegrasyon ikinci faza bırakılabilir.

## 7. Platform Standartları

### 7.1 Liste standardı

Her liste sayfasında bulunacaklar:

- Başlık.
- Modül bağlamı.
- Yeni, düzenle, iptal/sil, yenile.
- Excel/CSV/PDF dışa aktar.
- Yazdır.
- Detay menüsü.
- Hızlı arama.
- Gelişmiş filtre.
- Kolon görünürlüğü.
- Kolon sıralama.
- Grup ve toplam satırı.
- Sayfalama veya sanallaştırma.
- Kaydedilebilir görünüm.

### 7.2 Form standardı

Her formda bulunacaklar:

- Otomatik veya manuel kod/evrak no.
- Zorunlu alan göstergeleri.
- Sekmeler.
- Açıklama alanı.
- Ek dosyalar.
- Audit bilgisi.
- Kaydet, kaydet ve yeni, iptal.
- Klavye kısayolları.
- Validasyon özet alanı.

### 7.3 Finansal form standardı

Finansal formlar için ortak alanlar:

- Evrak no.
- Tarih.
- Vade tarihi.
- Hesap tipi.
- Hesap tanımı.
- Şantiye.
- Kasa/banka.
- Döviz.
- Kur.
- Hareket grubu.
- Hareket özel grubu.
- Resmi belge.
- Açıklama.

Ortak hesaplamalar:

- Toplam.
- İskonto toplamı.
- Ara toplam.
- KDV toplamı.
- Stopaj toplamı.
- Tevkifat.
- Alt toplam.
- Genel toplam.

### 7.4 Klavye ve hız standardı

Masaüstü uygulama kullanıcıları hızlı veri girişine alışkındır. SaaS ürün şu kısayolları desteklemelidir:

- `F3`: Yeni.
- `F4`: Düzenle.
- `F5`: Sil veya iptal.
- `F11`: Yenile.
- `Ctrl+E`: Excel aktar.
- `Ctrl+P`: Yazdır.
- `Esc`: Kapat veya vazgeç.
- `Enter`: sonraki alan.
- `Ctrl+S`: kaydet.

Mobilde kısayol yerine hızlı aksiyon butonları ve sade formlar kullanılmalıdır.

## 8. HTML Şablon Havuzu Entegrasyon Planı

### 8.1 Entegrasyon ilkesi

`stitch_HTML_sablonlar` havuzu, yeni ürünün arayüzünü hızlandıracak güçlü bir başlangıç setidir. Ancak bu havuzun doğru kullanımı “HTML dosyasını al, sayfa yap” değildir. Doğru kullanım şudur:

1. Ekran görüntüsündeki iş akışı doğrulanır.
2. Bu iş akışına en yakın HTML şablonu seçilir.
3. Şablondaki layout ve bileşenler çıkarılır.
4. Bileşenler Next.js/React component yapısına taşınır.
5. Örnek veriler domain modeline bağlanır.
6. Sayfa, finansal hareket ve rapor etkisiyle entegre edilir.
7. Desktop ve mobil karşılıkları aynı domain servislerini kullanır.

Bu yüzden HTML şablonları “görsel final” değil, “uygulamaya hazır tasarım ara katmanı” olarak ele alınmalıdır.

### 8.2 Şablonları dönüştürme aşamaları

Her HTML dosyası için uygulanacak dönüşüm sırası:

1. Kaynak HTML okunur.
2. Sayfanın görevi belirlenir: liste, form, detay, dashboard, rapor, PDF, mobil.
3. Kullanılan görsel parçalar ayrıştırılır.
4. Tekrarlayan parçalar ortak bileşene çıkarılır.
5. Tailwind sınıfları design token standardına göre sadeleştirilir.
6. Statik metinler Türkçe ürün terminolojisiyle uyumlu hale getirilir.
7. Örnek veriler kaldırılır.
8. Form alanları Zod/validation şemasına bağlanır.
9. Grid kolonları gerçek veri modeline bağlanır.
10. Kayıt, güncelleme, iptal, export ve yazdırma aksiyonları domain servislerine bağlanır.

React bileşenlerine ayrılacak temel parçalar:

- `AppShell`
- `TopBar`
- `SidebarNav`
- `ModuleHeader`
- `ActionToolbar`
- `FilterBar`
- `DataGrid`
- `GridSummaryRow`
- `StatusBadge`
- `CurrencyCell`
- `DateCell`
- `EntityLookup`
- `FormDrawer`
- `FormSection`
- `LineItemGrid`
- `TotalsPanel`
- `PdfPreview`
- `MobileBottomNav`
- `ApprovalTimeline`
- `AuditPanel`

### 8.3 Design system normalizasyonu

HTML havuzunda ortak bir NOA tasarım dili görünür: Inter, JetBrains Mono, Material Symbols, mavi ana renk, yoğun grid, düşük border radius, açık/koyu tema ve operasyonel dashboard kartları. Bazı dosyalarda farklı mavi tonları, farklı radius ve farklı toolbar yoğunluğu bulunur. Uygulamada tek bir sistem kullanılmalıdır.

Zorunlu normalizasyon kararları:

- Font: Inter ana font, JetBrains Mono sayısal ve kod/evrak alanları için.
- İkon: Material Symbols veya seçilecek tek ikon seti; uygulama içinde karışık ikon ailesi kullanılmamalı.
- Radius: yoğun iş uygulaması için 2-6px aralığı.
- Grid satır yüksekliği: desktop için 32-36px; mobil için kart/list item yaklaşımı.
- Renkler: şantiye/finans ciddiyetini koruyan açık zemin, güçlü mavi birincil renk, durum renkleri.
- Durum renkleri: taslak gri, işlemde mavi, onaylı yeşil, iptal/kritik kırmızı, beklemede amber.
- Form boşlukları: masaüstünde kompakt, mobilde dokunma hedefleri geniş.
- Dark mode: altyapı destekli olmalı, P0'da kullanıcıya açılması zorunlu değildir.

Merkezi token ihtiyacı:

- `colors.primary`
- `colors.surface`
- `colors.gridBorder`
- `colors.statusDraft`
- `colors.statusProcess`
- `colors.statusApproved`
- `colors.statusCancelled`
- `spacing.appHeaderHeight`
- `spacing.sidebarWidth`
- `spacing.dataRowHeight`
- `radius.control`
- `radius.panel`
- `font.body`
- `font.mono`

### 8.4 Modül bazlı şablon eşleştirme matrisi

| NOA modülü | HTML havuzundaki adaylar | Uygulamadaki kullanım |
| --- | --- | --- |
| Ana dashboard | `dashboard.html`, `genel_dashboard.html`, `genel_dashboard_2.html`, `genel_finansal_durum_ve_kar_zarar_özeti.html` | P0 yönetici dashboard ve finansal özet |
| Mobil dashboard | `mobil_dashboard_yönetici_özeti_1.html`, `mobil_dashboard_yönetici_özeti_2.html`, `mobil_dashboard_yönetici_özeti_3.html`, `yönetici_özet_dashboard_mobil.html` | P1 mobil yönetici özeti |
| Şantiye & Proje | `Şantiye_proje_listesi_1.html`, `Şantiye_proje_listesi_2.html`, `Şantiye_proje_listesi_test_turu.html` | P0 şantiye liste ve test turu |
| Şantiye mobil | `Şantiye_proje_listesi_mobil_1.html`, `Şantiye_proje_listesi_mobil_2.html`, `Şantiye_proje_listesi_mobil_3.html` | P1 mobil şantiye liste |
| Şantiye analiz | `Şantiye_maliyet_ve_kar_analizi.html`, `Şantiye_maliyet_ve_kar_analizi_.html`, `proje_bazlı_gider_detay_ve_bütçe_karşlaştırma.html` | P0/P1 şantiye gelir-gider ve bütçe karşılaştırma |
| Alış faturası | `al_faturasi_ekle.html`, `al_faturasi final.html`, `al_faturas_pdf_önizleme.html` | P0 alış faturası formu ve PDF |
| Alış faturası mobil | `yeni_alım_faturası_ekle_mobil_1.html`, `yeni_alım_faturası_ekle_mobil_2.html`, `yeni_alım_faturası_ekle_mobil_3.html` | P1 mobil alış faturası |
| Alış irsaliyesi | `al_irsaliyesi.html` | P1 irsaliye bağlantıları |
| Tedarikçi | `tedarikçi_yönetimi.html`, `tedarikçi_tanımlar_1.html`, `tedarikçi_tanımlar_2.html`, `yeni_tedarikçi_kayıt_formu.html` | P0 tedarikçi liste/form |
| Tedarikçi mobil | `yeni_tedarikçi_kaydı_mobil.html` | P1 mobil tedarikçi kayıt |
| Tedarikçi rapor | `tedarikçi_hesap_ekstresi.html`, `tedarikçi_bazlı_fiyat_analiz_raporu.html` | P0/P1 ekstre ve fiyat analizi |
| Satınalma | `satın_alma_talepleri_yönetimi_merkez_ofis.html`, `satın_alma_siparişi_oluştur.html`, `malzeme_talepleri_yönetimi_merkez_ofis_1.html`, `malzeme_talepleri_yönetimi_merkez_ofis_2.html` | P1 satınalma talep-sipariş akışı |
| Malzeme talebi mobil | `malzeme_talebi_oluştur_mobil_1.html`, `malzeme_talebi_oluştur_mobil_2.html`, `malzeme_talebi_oluştur_mobil_3.html`, `mobil_malzeme_talebi.html` | P1 saha malzeme talebi |
| Teklif/RFQ | `teklif_yönetimi.html`, `teklif_talepleri_yönetimi_rfq.html`, `teklif_karşılaştırma_ve_tedarikçi_seçimi.html`, `tekliften_şantiye_oluşturma_sihirbazı.html` | P1 tekliften proje akışı |
| Taşeron | `taşeron_yönetimi.html`, `taşeron_tanım.html`, `taşeron_tanımlar_1.html`, `taşeron_tanımlar_2.html` | P0 taşeron liste/form |
| Taşeron ekstre | `taşeron_hesap_ekstresi.html`, `taşeron_hesap_ekstresi_ve_raporu.html` | P0 taşeron cari ekstre |
| Hakediş | `hakediş_yönetimi.html`, `hakediş_yönetimi2.html`, `hakediş_faturası_ekle.html`, `hakediş_detay_ve_onay.html`, `hakediş_detay_ve_onay_yönetimi.html` | P0/P1 hakediş form, liste ve onay |
| Hakediş PDF | `hakediş_faturası_pdf_önizleme.html` | P0 hakediş çıktısı |
| Kasa/Banka | `kasa_banka_yönetimi.html`, `banka_kasa_virman_işlemi.html`, `kasa_ve_banka_durum_raporu.html` | P0 kasa/banka, virman ve durum raporu |
| Cari/ekstre mobil | `cari_ekstre_görönüm_mobil_1.html`, `cari_ekstre_görönüm_mobil_2.html`, `cari_ekstre_görönüm_mobil_3.html` | P1 mobil cari ekstre |
| Nakit ve vade | `nakit_ak_ve_vade_takip_raporu.html` | P0/P1 nakit akışı ve vade raporu |
| Tahsilat/ödeme | `ödeme_girişi_test_turu.html`, `müşteri_tahsilat_detay_ve_ödeme_girişi.html`, `personel_ödemeleri_ve_banka_talimat_listesi.html` | P0 ödeme/tahsilat ve banka talimatları |
| Gider | `gider_ve_masraf_yönetimi.html`, `yeni_gider_kaydı_ekle.html`, `gider_analiz_ve_raporlar.html` | P0 gider kayıt ve analiz |
| Gider mobil | `hızl_gider_kaydı_mobil_1.html`, `hızl_gider_kaydı_mobil_2.html`, `hızl_gider_kaydı_mobil_3.html` | P1 hızlı mobil gider |
| Çek | `ek_işlemleri.html`, `ek_bordrosu_pdf_önizleme.html` | P0 çek işlemleri ve bordro PDF |
| Stok/Depo | `stok_listesi.html`, `depo_tanımları.html`, `stok_ve_depo_hareket_raporu.html`, `nite_stok_ve_sat_durumu.html` | P0 stok/depo liste, hareket ve durum |
| Puantaj | `puantaj_girişi.html`, `puantaj_detaylar.html`, `personel_puantaj_cetveli_pdf_önizleme.html` | P0 puantaj grid ve çıktı |
| Puantaj mobil | `mobil_puantaj_girişi_saha_mod_l.html`, `günlük_puantaj_girişi_mobil_1.html`, `günlük_puantaj_girişi_mobil_2.html`, `günlük_puantaj_girişi_mobil_3.html` | P1 saha puantaj |
| Personel/Maaş | `personel_listesi.html`, `personel_maaş_ve_bordro_yönetimi.html`, `maa_tahakkuk_detay_ve_bordro_i_zleme.html`, `personel_maaş_ve_puantaj_raporu.html` | P0/P1 personel, maaş, bordro |
| Personel mobil | `personel_maaş_ve_bordro_yönetimi_mobil.html`, `maa_tahakkuk_detay_mobil.html`, `personel_ödemeleri_mobil.html` | P1 mobil personel/maaş |
| Zimmet | `personel_zimmet_raporu.html` | P1 zimmet raporu |
| E-Fatura | `e_fatura_yönetimi.html`, `e_fatura_entegrasyon_ve_ayarlar.html` | P1/P2 e-fatura yönetimi ve ayarlar |
| Saha raporu | `günlük_saha_raporu_girişi.html`, `günlük_saha_raporu_detay_ve_onay.html`, `günlük_saha_raporlar_yönetimi_merkez_ofis.html` | P1 saha raporu |
| Saha mobil | `günlük_saha_raporu_mobil_1.html`, `günlük_saha_raporu_mobil_2.html`, `günlük_saha_raporu_mobil_3.html`, `saha_mobil_dashboard.html`, `saha_fotoğraf_galerisi_mobil.html` | P1/P2 saha mobil |
| İSG | `günlük_isg_kontrol_listesi_mobil.html` | P2 İSG kontrol listesi |
| İlerleme/metraj | `ilerleme_metrajı_takibi.html`, `metraj_cetveli_detay.html` | P1/P2 metraj ve ilerleme |
| AI analiz | `AI Gorsel ilerleme Dogrulama Paneli.html`, `AI Metraj Cikarma ve Plan Analiz Paneli.html`, `AI Saha Raporu Analiz ve Ozetleme Paneli.html`, `AI Tahmin ve Risk Analizi.html` | P2 AI destekli analiz |
| YapSat/CRM | `yapsat_emlak_satış_yçnetimi.html`, `müşteri_ve_aday_yönetimi_crm.html`, `satış_faturası.html`, `yeni_satış_kaydı_nite_seçimi.html`, `satıs_sözleşmesi_ve_ödeme_planı.html` | P2 YapSat ve CRM |
| Araçlar | `araç_ve_iş_makinası_yönetimi.html`, `araç_detay_ve_analiz.html` | P2 araç/iş makinası |
| Sistem | `firma_ayarlar_ve_parametreler.html`, `firma_ayarlar_ve_parametreler_.html`, `bildirim_ve_onay_merkezi_mobil_1.html`, `bildirim_ve_onay_merkezi_mobil_2.html`, `bildirim_ve_onay_merkezi_mobil_3.html`, `ge_mi_i_lem_raporu_audit_log.html` | P0/P1 ayar, onay, audit |

### 8.5 P0 için öncelikli HTML şablon seti

P0 geliştirme başlarken tüm 139 HTML aynı anda taşınmamalıdır. Önce iş akışını taşıyan çekirdek sayfalar seçilmelidir.

P0 çekirdek şablonları:

- `dashboard.html`
- `genel_finansal_durum_ve_kar_zarar_özeti.html`
- `Şantiye_proje_listesi_1.html`
- `Şantiye_maliyet_ve_kar_analizi.html`
- `tedarikçi_yönetimi.html`
- `yeni_tedarikçi_kayıt_formu.html`
- `al_faturasi_ekle.html`
- `al_faturas_pdf_önizleme.html`
- `taşeron_yönetimi.html`
- `taşeron_hesap_ekstresi.html`
- `hakediş_faturası_ekle.html`
- `hakediş_faturası_pdf_önizleme.html`
- `kasa_banka_yönetimi.html`
- `banka_kasa_virman_işlemi.html`
- `gider_ve_masraf_yönetimi.html`
- `yeni_gider_kaydı_ekle.html`
- `ek_işlemleri.html`
- `stok_listesi.html`
- `depo_tanımları.html`
- `stok_ve_depo_hareket_raporu.html`
- `personel_listesi.html`
- `puantaj_girişi.html`
- `puantaj_detaylar.html`
- `personel_maaş_ve_bordro_yönetimi.html`
- `firma_ayarlar_ve_parametreler.html`
- `ge_mi_i_lem_raporu_audit_log.html`

Bu set, P0 ürünün tanımlar, finansal hareket, fatura, hakediş, kasa/banka, çek, stok/depo, puantaj, rapor ve ayar alanlarını görsel olarak başlatmaya yeterlidir.

### 8.6 P1 ve P2 şablon planı

P1'e alınacaklar:

- Mobil dashboard ve mobil liste/form varyasyonları.
- Malzeme talebi ve satınalma talep-sipariş akışı.
- E-fatura yönetim ekranları.
- Evrak ve onay merkezi.
- Teklif/RFQ ekranları.
- İlerleme/metraj başlangıç ekranları.
- Saha raporu ve saha fotoğraf ekranları.

P2'ye alınacaklar:

- AI tahmin, risk, görsel ilerleme doğrulama ve metraj çıkarma.
- YapSat/CRM.
- Araç/iş makinası detay analizi.
- İSG kontrol listesi.
- Gelişmiş grup şirketi/strateji dashboardları.
- Gelişmiş özel rapor ve analitik ekranları.

### 8.7 Sayfalar arası uyum ve tutarlılık kuralları

Her HTML şablonu entegre edilirken şu kurallar zorunludur:

- Aynı modüldeki tüm sayfalarda aynı başlık, toolbar ve filtre düzeni kullanılmalı.
- Liste ekranındaki aksiyon isimleri tüm modüllerde aynı olmalı.
- “Sil” finansal kayıtlarda “İptal” davranışına bağlanmalı.
- Formların kaydetme davranışı aynı olmalı: kaydet, kaydet ve yeni, vazgeç.
- Para alanları aynı formatta görünmeli.
- Tarih alanları aynı formatta görünmeli.
- Durum rozetleri aynı renk ve metinlerle kullanılmalı.
- Grid kolonları kullanıcı tarafından yönetilebilir olmalı.
- Desktop sayfalar yoğun bilgi gösterebilir; mobil ekranlar tek göreve odaklanmalı.
- PDF önizleme sayfaları yazdırma şablonuyla aynı kaynaktan beslenmeli.
- Her sayfada tenant, firma ve dönem bağlamı korunmalı.

### 8.8 Uygulama sırasında şablon kabul kriteri

Bir HTML şablonu uygulamaya alınmış sayılmak için:

- İlgili ekran görüntüsü iş akışını karşılar.
- Domain verisiyle çalışır.
- Örnek veri kalmamıştır.
- Yetki kontrolü vardır.
- Tenant/company filtreleri vardır.
- Loading, empty, error ve permission denied durumları vardır.
- Form validasyonu vardır.
- Audit gerektiren aksiyon audit yazar.
- Export/yazdırma aksiyonları ürün standardına bağlıdır.
- Desktop ve mobil kırılımlar test edilmiştir.

## 9. MVP Kapsamı

### 9.1 P0 çekirdek

P0, pilot kullanıma çıkacak ilk SaaS ürünüdür.

Dahil modüller:

- Tenant, firma, kullanıcı, rol ve yetki.
- Ana uygulama kabuğu.
- HTML havuzundan çıkarılmış ortak design system.
- P0 HTML şablon setinin React bileşenlerine dönüştürülmesi.
- Tanımlar: şantiye, taşeron, personel, tedarikçi, kasa/banka, stok, depo, birim, hareket grubu, imalat/hizmet.
- Finansal hareket motoru.
- Şantiye & Proje.
- Tedarikçi ve alış faturası.
- Satış faturası.
- Hakediş faturası.
- Kasa/banka tahsilat, ödeme, virman.
- Gider kaydı.
- Stok/depo hareketi.
- Puantaj.
- Temel maaş tahakkuku.
- Çek temel işlemleri.
- Ekstre ve temel raporlar.
- Excel/CSV dışa aktarım.
- PDF/yazdırma altyapısı.
- Audit log.

P0'da kullanılacak HTML yaklaşımı:

- Şablonlar kaynak olarak kullanılır, statik HTML olarak kopyalanmaz.
- İlk hedef görsel bitiş değil, iş akışı ve veri bağlantısı olan tutarlı sayfalardır.
- Dashboard, liste, form, fatura, hakediş, kasa/banka, stok, puantaj ve PDF önizleme için ortak bileşen ailesi P0 içinde oluşur.

### 9.2 P1 genişleme

- İrsaliye bağlantıları.
- E-fatura gelen belge yönetimi.
- Takas ve teminat çek durumları.
- Evrak merkezi.
- Teklif.
- İlerleme/metraj başlangıcı.
- Gelişmiş maaş.
- Bildirimler ve hatırlatmalar.
- Onay akışları.
- Rapor görünümü kaydetme.
- Mobil HTML şablonlarının saha ve yönetici ekranlarına uyarlanması.
- Satınalma, malzeme talebi, e-fatura, teklif ve saha raporu şablonlarının domain servislerine bağlanması.

### 9.3 P2 rekabet ve ölçek

- YapSat/emlak satış.
- Araç/iş makinası operasyonları.
- Banka entegrasyonları.
- Mobil saha uygulaması.
- Gelişmiş özel rapor tasarımcısı.
- E-fatura/e-arşiv tam entegrasyon.
- Abonelik/faturalama.
- API ve entegrasyon pazarı.
- AI analiz, görsel ilerleme doğrulama ve metraj çıkarma şablonlarının kontrollü aktivasyonu.
- Grup şirketi/strateji dashboardlarının ileri yönetim paketi olarak değerlendirilmesi.

### 9.4 MVP kabul kriterleri

P0 tamamlandı sayılmak için:

- Firma ve kullanıcı oluşturulabilir.
- Yetkiler modül ve işlem bazında uygulanır.
- Şantiye, tedarikçi, taşeron, personel, kasa/banka, stok ve depo tanımlanabilir.
- Alış faturası tedarikçi bakiyesi, şantiye maliyeti ve stok girişine yansır.
- Satış/hakediş faturası şantiye gelirine ve cari hesaba yansır.
- Gider kaydı kasa/banka ve şantiye maliyetine yansır.
- Tahsilat/ödeme hareketleri cari ekstrelerde görünür.
- Çek girişi, tahsil, ödeme ve ciro izlenebilir.
- Puantaj girilip maaş tahakkukuna çevrilebilir.
- Şantiye gelir/gider raporu alınabilir.
- Tüm kritik hareketler audit log yazar.
- Tenant izolasyonu testlerle doğrulanır.
- P0 HTML şablon setinden dönüştürülen sayfalarda örnek veri, sayfaya özel Tailwind config ve CDN bağımlılığı kalmaz.
- Ana desktop sayfalar ve P0 için gerekli responsive kırılımlar Playwright ile doğrulanır.

## 10. Önerilen Teknik Mimari

### 10.1 Mimari yaklaşım

Başlangıç için en doğru mimari modüler monolithtir. İnşaat ön muhasebesinde fatura, cari, kasa, çek, stok, puantaj ve rapor etkileri birbirine bağlıdır. Bu nedenle ilk fazda tek transaction sınırı ve güçlü domain servisleri tercih edilmelidir.

Servisler olgunlaştıktan sonra raporlama, e-fatura, bildirim ve dosya işleme worker süreçlerine ayrılabilir.

### 10.2 Teknoloji yığını

Önerilen yığın:

- Next.js App Router.
- React ve TypeScript.
- PostgreSQL.
- Prisma ORM.
- Redis.
- S3 uyumlu dosya saklama.
- Tailwind CSS ve erişilebilir component sistemi.
- Playwright E2E testleri.
- Unit test için Vitest veya Jest.
- OpenTelemetry.
- Docker tabanlı dağıtım.

### 10.3 Katmanlar

- `app`: route, layout, server action veya API handler.
- `features`: modül bazlı UI ve iş akışları.
- `domain`: finansal hareket, fatura, çek, stok, puantaj domain servisleri.
- `db`: Prisma schema, migration ve repository.
- `shared`: para, tarih, kur, KDV, validasyon, yetki ve grid yardımcıları.
- `workers`: rapor, dışa aktarım, e-fatura, bildirim.

### 10.4 Çok kiracılı yapı

Tüm iş tablolarında:

- `tenantId`
- `companyId`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`
- `deletedAt` veya `status`

İzolasyon kuralları:

- Tenant context zorunlu olmalı.
- Tüm sorgular tenant scope ile çalışmalı.
- Admin dışında çapraz tenant sorgusu olmamalı.
- Dosya saklama yolu tenant/company bazlı ayrılmalı.
- Audit log tenant ve company bilgisi taşımalı.

### 10.5 Veri modeli çekirdeği

Ana varlıklar:

- `Tenant`
- `Company`
- `User`
- `Membership`
- `Role`
- `Permission`
- `FiscalPeriod`
- `NumberSeries`
- `Currency`
- `CurrencyRate`
- `Project`
- `ProjectUnit`
- `Supplier`
- `Subcontractor`
- `Employee`
- `CashBankAccount`
- `StockItem`
- `Warehouse`
- `ServiceItem`
- `ManufacturingItem`
- `MovementGroup`
- `LedgerEntry`
- `LedgerLine`
- `Invoice`
- `InvoiceLine`
- `Check`
- `CheckMovement`
- `StockMovement`
- `StockMovementLine`
- `Timesheet`
- `TimesheetDay`
- `PayrollAccrual`
- `Document`
- `Attachment`
- `AuditLog`

### 10.6 Finansal hareket prensibi

Her kullanıcı işlemi iki düzeyde tutulmalıdır:

- Belge düzeyi: fatura, çek, ödeme, gider, stok hareketi, puantaj.
- Defter düzeyi: cari, kasa/banka, şantiye, stok ve rapor etkisini üreten ledger kayıtları.

Örnek:

- Alış faturası belge olarak `Invoice` içinde tutulur.
- Tedarikçi alacağı, şantiye maliyeti, KDV ve stok girişi ilgili ledger/stock hareketleri olarak üretilir.

Bu ayrım, uzun vadede rapor tutarlılığını ve düzeltme denetlenebilirliğini sağlar.

## 11. Yetki ve Güvenlik

Yetki modeli sadece “admin/kullanıcı” olmamalıdır. Ekran görüntülerindeki geniş modül yapısı daha ayrıntılı yetki ister.

Yetki boyutları:

- Modül erişimi.
- Liste görüntüleme.
- Kayıt oluşturma.
- Kayıt düzenleme.
- Kayıt iptal.
- Yazdırma.
- Excel/PDF dışa aktarım.
- Fiyat/tutar görme.
- Şantiye bazlı erişim.
- Hesap tipi bazlı erişim.
- Hesap kartı bazlı erişim.
- Rapor erişimi.
- Parametre yönetimi.

Güvenlik gereksinimleri:

- MFA desteği.
- Rol tabanlı yetki.
- Audit log.
- Hassas verilerde maskeleme.
- Dönem kilidi.
- Kayıt iptali için sebep zorunluluğu.
- OWASP ASVS kontrolleri.
- KVKK uyumlu veri saklama ve silme süreçleri.

## 12. Raporlama Stratejisi

### 12.1 P0 raporları

- Şantiye gelir/gider özeti.
- Şantiye ekstresi.
- Cari hesap ekstresi.
- Hareket listesi.
- Hareket toplamları.
- Kasa/banka hareketleri.
- Tedarikçi borç/alacak raporu.
- Taşeron borç/alacak raporu.
- Personel borç/alacak raporu.
- Çek vade listesi.
- Stok durum raporu.
- Puantaj özeti.

### 12.2 Rapor altyapısı

Raporlar şu ortak özellikleri taşımalıdır:

- Tarih aralığı.
- Şantiye filtresi.
- Hesap tipi filtresi.
- Hesap filtresi.
- Hareket grubu filtresi.
- Para birimi filtresi.
- Durum filtresi.
- Kolon seçimi.
- Toplam satırı.
- Export.
- Yazdırma.
- Kaydedilmiş görünüm.

### 12.3 Dashboard

Ana dashboard kartları:

- Nakit durumu.
- Yaklaşan çekler.
- Açık tedarikçi borçları.
- Taşeron borçları.
- Şantiye bazlı gelir/gider.
- En yüksek maliyetli şantiyeler.
- Stok uyarıları.
- Puantaj bekleyen dönemler.
- E-fatura bekleyenler.

## 13. 12 Haftalık Geliştirme Planı

### Hafta 1: Proje iskeleti ve ürün kabuğu

Hedef:

- Repo, bağımlılıklar, CI, temel uygulama kabuğu ve HTML havuzundan çıkarılmış ortak design system.

İşler:

- Next.js, TypeScript, PostgreSQL, Prisma kurulumu.
- Auth iskeleti.
- Tenant, company, user, role tabloları.
- Ana layout: üst bar, sol navigasyon, çalışma alanı.
- `dashboard.html`, `genel_dashboard.html` ve `puantaj_girişi.html` içindeki ortak token'ların karşılaştırılması.
- Tailwind theme ve design token dosyasının oluşturulması.
- AppShell, TopBar, SidebarNav, ModuleHeader ve ActionToolbar bileşenleri.
- Material Symbols veya seçilecek tek ikon setinin sabitlenmesi.
- Audit log altyapı başlangıcı.

Çıktı:

- Giriş yapılabilen, firma bağlamı olan, HTML havuzuyla uyumlu boş SaaS kabuğu.

### Hafta 2: Tanımlar standardı

Hedef:

- Tanım ekranları için tekrar kullanılabilir liste/form standardı.

İşler:

- Şantiye, tedarikçi, taşeron, personel, kasa/banka temel kartları.
- `Şantiye_proje_listesi_1.html`, `tedarikçi_yönetimi.html`, `taşeron_yönetimi.html`, `personel_listesi.html`, `kasa_banka_yönetimi.html` şablonlarından ortak liste standardı çıkarılması.
- `yeni_tedarikçi_kayıt_formu.html` ve tanım şablonlarından FormDrawer/FormSection bileşenleri.
- Kod üretimi.
- Liste, filtre, kolon, arama.
- Form validasyonları.
- Excel/CSV export başlangıcı.

Çıktı:

- Temel kartlar oluşturulabilir ve listelenebilir.

### Hafta 3: Stok, depo ve referans tanımlar

Hedef:

- Fatura, hakediş ve depo için gereken referans veri.

İşler:

- Stok, stok grubu, üretici, birim.
- Depo.
- İmalat/hizmet.
- Hareket grubu.
- `stok_listesi.html`, `depo_tanımları.html`, `stok_ve_depo_hareket_raporu.html` şablonlarından stok/depo grid düzeni.
- Lookup bileşenleri.

Çıktı:

- Fatura ve hareket formlarında seçilecek referans veriler hazır.

### Hafta 4: Finansal hareket motoru

Hedef:

- Tüm para hareketlerinin ortak çekirdeği.

İşler:

- Ledger veri modeli.
- Tahsilat, ödeme, borç, alacak, gider.
- Kasa/banka etkisi.
- Cari hesap etkisi.
- Şantiye maliyet/gelir etkisi.
- Ekstre sorguları.
- `banka_kasa_virman_işlemi.html`, `kasa_ve_banka_durum_raporu.html`, `tedarikçi_hesap_ekstresi.html`, `taşeron_hesap_ekstresi.html` şablonlarından finans ekran kalıpları.

Çıktı:

- Temel finansal hareketler raporlanabilir.

### Hafta 5: Alış faturası

Hedef:

- Tedarikçi alış faturası ve şantiye maliyet etkisi.

İşler:

- Alış faturası formu.
- Satır grid'i.
- KDV, iskonto ve toplam hesapları.
- Tedarikçi cari etkisi.
- Şantiye maliyet etkisi.
- Stok/depo giriş bağlantısı için altyapı.
- `al_faturasi_ekle.html` ve `al_faturasi final.html` şablonlarından InvoiceForm, LineItemGrid ve TotalsPanel.
- `al_faturas_pdf_önizleme.html` şablonundan PDF önizleme standardı.

Çıktı:

- Alış faturası uçtan uca çalışır.

### Hafta 6: Satış faturası ve hakediş

Hedef:

- Şantiye gelirleri ve hakediş kayıtları.

İşler:

- Satış faturası.
- Şantiye hakediş faturası.
- Taşeron hakediş faturası.
- Stopaj ve tevkifat alanları.
- PDF/yazdırma ilk şablonu.
- `hakediş_faturası_ekle.html`, `hakediş_yönetimi.html`, `hakediş_detay_ve_onay.html` şablonlarından hakediş liste/form/onay yapısı.
- `hakediş_faturası_pdf_önizleme.html` şablonundan çıktı düzeni.
- `satış_faturası.html` şablonundan satış faturası form varyasyonu.

Çıktı:

- Şantiye gelir/gider dengesi oluşur.

### Hafta 7: Çek yönetimi

Hedef:

- Gelen çek ve firma çeki temel döngüsü.

İşler:

- Çek modeli.
- Gelen çek girişi.
- Firma çeki çıkışı.
- Tahsil, ödeme, ciro.
- Vade filtreleri.
- Cari ve kasa/banka etkileri.
- `ek_işlemleri.html` şablonundan çek liste ve durum yönetimi.
- `ek_bordrosu_pdf_önizleme.html` şablonundan çek bordrosu çıktısı.

Çıktı:

- Çek portföyü ve temel durum geçişleri çalışır.

### Hafta 8: Stok/depo hareketleri

Hedef:

- Depo ve şantiye stok/hizmet hareketleri.

İşler:

- Depo giriş/çıkış/transfer.
- Şantiye stok/hizmet hareketi.
- Faturadan stok girişi.
- Stok durum raporu.
- Şantiye stok maliyeti.
- `stok_ve_depo_hareket_raporu.html`, `depo_tanımları.html`, `nite_stok_ve_sat_durumu.html` şablonlarının domain verisine bağlanması.

Çıktı:

- Depo takip MVP seviyesinde çalışır.

### Hafta 9: Puantaj

Hedef:

- Aylık şantiye/personel çalışma takibi.

İşler:

- Puantaj grid'i.
- Şantiye, taşeron, ay, yıl filtreleri.
- Gün işaretleme.
- Toplu yevmiye.
- Mesai detayları.
- Puantaj raporu.
- `puantaj_girişi.html`, `puantaj_detaylar.html`, `personel_puantaj_cetveli_pdf_önizleme.html` şablonlarından desktop puantaj deneyimi.
- Mobil için `mobil_puantaj_girişi_saha_mod_l.html` P1'e hazır olacak şekilde bileşen sözleşmesi.

Çıktı:

- Puantaj girilebilir ve toplamlar hesaplanır.

### Hafta 10: Maaş ve raporlar

Hedef:

- Puantajdan maaş tahakkuku ve ana raporlar.

İşler:

- Maaş tahakkuku.
- Personel ödeme hareketi.
- Şantiye gelir/gider raporu.
- Cari ekstre.
- Kasa/banka raporu.
- Çek vade raporu.
- `personel_maaş_ve_bordro_yönetimi.html`, `maa_tahakkuk_detay_ve_bordro_i_zleme.html`, `personel_maaş_ve_puantaj_raporu.html` şablonlarının maaş akışına uyarlanması.
- `Şantiye_maliyet_ve_kar_analizi.html`, `genel_finansal_durum_ve_kar_zarar_özeti.html`, `nakit_ak_ve_vade_takip_raporu.html` şablonlarından P0 rapor dashboardları.

Çıktı:

- Pilot işletme günlük karar raporlarını alabilir.

### Hafta 11: Evrak, çıktı, UX sertleştirme

Hedef:

- Kullanım kalitesini artırmak.

İşler:

- Evrak eki.
- PDF/yazdırma.
- Kısayollar.
- Bildirimler.
- Form iyileştirmeleri.
- Liste performansı.
- Yetki matrisinin genişletilmesi.
- `firma_ayarlar_ve_parametreler.html` ve `ge_mi_i_lem_raporu_audit_log.html` şablonlarının sistem yönetimine bağlanması.
- `bildirim_ve_onay_merkezi_mobil_1.html`, `bildirim_ve_onay_merkezi_mobil_2.html`, `bildirim_ve_onay_merkezi_mobil_3.html` şablonlarından P1 onay merkezi hazırlığı.
- Tüm P0 sayfalarda HTML havuzu kaynaklı görsel tutarlılık kontrolü.

Çıktı:

- Ürün günlük ofis kullanımına yaklaşır.

### Hafta 12: Test, güvenlik ve pilot hazırlık

Hedef:

- Pilot yayına hazır hale getirmek.

İşler:

- Unit testler.
- Integration testler.
- Playwright E2E.
- Tenant izolasyon testleri.
- Finansal hesaplama testleri.
- Audit ve yetki testleri.
- Performans indeksleri.
- Pilot veri seti.
- HTML şablonlarından dönüştürülen tüm P0 sayfalar için desktop ve mobil viewport görsel kontrolü.
- Statik örnek veri kalmadığına dair tarama.
- CDN bağımlılığı kalmadığına dair tarama.
- Ekran görüntüsü kaynakları ile P0 sayfaların iş akışı eşleştirme kontrolü.

Çıktı:

- Pilot kullanılabilir P0 sürüm.

## 14. Test Stratejisi

### 14.1 Unit testler

- KDV hesaplama.
- İskonto hesaplama.
- Stopaj hesaplama.
- Tevkifat hesaplama.
- Kur dönüşümü.
- Ledger borç/alacak üretimi.
- Çek durum geçişleri.
- Stok miktar hesapları.
- Puantaj toplamları.
- Maaş tahakkuku.

### 14.2 Integration testler

- Alış faturası tedarikçi bakiyesi üretir.
- Alış faturası şantiye maliyetine yansır.
- Alış faturası depo girişine yansır.
- Hakediş faturası şantiye gelirine yansır.
- Ödeme hareketi kasa/banka bakiyesini değiştirir.
- Çek tahsilatı kasa/banka hareketi üretir.
- Puantaj maaş tahakkuku üretir.
- Tenant A kullanıcısı Tenant B verisini göremez.

### 14.3 E2E testler

- Firma oluşturma.
- Kullanıcı daveti.
- Şantiye tanımlama.
- Tedarikçi tanımlama.
- Stok ve depo tanımlama.
- Alış faturası girişi.
- Gider kaydı.
- Hakediş faturası.
- Çek girişi ve tahsil.
- Puantaj girişi.
- Şantiye raporu alma.

### 14.4 HTML şablon dönüşüm testleri

HTML havuzundan dönüştürülen her sayfa için ek doğrulama gerekir:

- Statik örnek veri kalmadı.
- CDN Tailwind script'i kalmadı.
- Sayfaya özel Tailwind config kalmadı.
- Ortak component ve token kullanılıyor.
- Desktop viewport'ta layout taşması yok.
- Mobil viewport'ta temel aksiyonlar erişilebilir.
- Ekran görüntüsündeki iş akışı korunuyor.
- Form validasyonları çalışıyor.
- Yetki kısıtlı kullanıcıda aksiyonlar gizleniyor veya engelleniyor.
- Loading, empty, error ve permission denied durumları görsel olarak test edildi.

## 15. Geliştirme Boyunca Bağlamı Koruma Kuralları

Her yeni modül geliştirilirken şu sıra izlenmelidir:

1. İlgili ekran görüntüsü klasörü açılır.
2. Dosya adlarından ekran ve işlem envanteri çıkarılır.
3. Varsa ilgili video başlığı ve eğitim akışı kontrol edilir.
4. `stitch_HTML_sablonlar` içinde ilgili modüle denk gelen HTML adayları seçilir.
5. HTML adayları liste, form, detay, dashboard, rapor, PDF ve mobil olarak sınıflandırılır.
6. Modülün liste, form, hareket ve rapor gereksinimleri ayrılır.
7. Veri modeli önce tenant/company/audit alanlarıyla tasarlanır.
8. Finansal etkisi varsa ledger etkisi yazılır.
9. HTML şablonu doğrudan kopyalanmaz; ortak React bileşenlerine ayrılır.
10. Test senaryoları modül başlamadan çıkarılır.
11. Uygulama eski pencereyi değil, aynı iş sonucunu üretir.

Modül kabul kontrolü:

- Ekran görüntüsündeki ana aksiyonlar karşılandı mı?
- Video akışındaki kullanıcı amacı karşılandı mı?
- Modern SaaS kullanıcı deneyimi eski akışı hızlandırdı mı?
- Rapor etkileri doğru mu?
- Tenant izolasyonu var mı?
- Audit log var mı?
- Export/yazdırma ihtiyacı karşılandı mı?
- İlgili HTML şablonundaki yararlı layout korunup tekrar eden stil temizlendi mi?
- Örnek veri, CDN bağımlılığı veya sayfaya özel Tailwind config kalmadı mı?
- Desktop ve mobil şablonlar aynı domain akışına bağlandı mı?

## 16. Riskler ve Ürün Kararları

### 16.1 Ana riskler

- Eski ekran görüntüsünü görsel olarak kopyalayıp iş mantığını kaçırmak.
- Finansal hareketleri modül içinde dağınık üretmek.
- Tenant izolasyonunu sonradan eklemeye çalışmak.
- Fatura, stok ve cari etkileri arasında tutarsızlık.
- Çek durum geçişlerinde geri alma senaryolarını unutmak.
- Puantaj grid'ini performanssız tasarlamak.
- Raporları en sona bırakmak.
- E-fatura entegrasyonunu MVP'yi geciktirecek kadar erkene almak.
- HTML şablonlarını doğrudan kopyalayıp component standardı oluşturmamak.
- Aynı işi yapan farklı şablonlardan tutarsız buton, renk, spacing ve form davranışları taşımak.
- Mobil şablonları ayrı ürün gibi geliştirip desktop ile aynı domain servislerine bağlamamak.
- PDF önizleme şablonlarını gerçek yazdırma altyapısından kopuk bırakmak.
- HTML havuzundaki ileri faz ekranlarını P0 kapsamına kontrolsüzce çekmek.

### 16.2 Kesin ürün kararları

- Ekran görüntüleri birincil gereksinim kaynağıdır.
- Videolar kullanıcı akışını destekler.
- Eski pencere görünümü kopyalanmaz.
- Veri yoğunluğu korunur.
- Ledger çekirdeği P0'da kurulur.
- Silme yerine iptal/düzeltme tercih edilir.
- Tenant izolasyonu P0'dan itibaren zorunludur.
- Raporlama P0 parçasıdır.
- E-fatura canlı entegrasyonu P1/P2'dir.
- HTML havuzu, ekran görüntüsü ve video akışlarından çıkarılan gereksinimleri hızlandırmak için kullanılır; gereksinim kaynağının yerine geçmez.
- P0'da yalnızca çekirdek şablon seti dönüştürülür; kalan HTML'ler P1/P2 havuzunda bekletilir.
- Ortak design system tamamlanmadan modül sayfaları çoğaltılmaz.
- Her HTML dönüşümü için “örnek veri yok, CDN yok, tenant scope var, audit var” kontrolü yapılır.

## 17. İlk Uygulama Sırası

Önerilen gerçek geliştirme sırası:

1. SaaS kabuğu, auth, tenant, company, role.
2. HTML havuzundan ortak design system ve component standardı.
3. Platform liste/form/grid standardı.
4. Tanımlar.
5. Ledger ve finansal hareket motoru.
6. Şantiye & Proje.
7. Tedarikçi ve alış faturası.
8. Kasa/banka, ödeme/tahsilat, gider.
9. Satış faturası ve hakediş.
10. Çek.
11. Stok/depo.
12. Personel, puantaj, maaş.
13. Raporlar ve dashboard.
14. Evrak, çıktı, bildirim.
15. Pilot sertleştirme.

Bu sıra, demo uygulamadaki gerçek bağımlılıkları izler. Tanımlar olmadan hareket, hareket olmadan rapor, rapor olmadan pilot doğrulama sağlıklı olmaz.

## 18. Sonuç

Yeni SaaS ürünün başarısı, eski NOA masaüstü uygulamasının pencerelerini web'e taşımakta değil; inşaat ön muhasebesinin günlük operasyon ritmini modern, güvenli ve ölçeklenebilir şekilde yeniden kurmaktadır.

Bu planın nihai yönü şudur:

- Ekran görüntüleri ana kanıttır.
- Videolar eğitim akışını ve kullanıcı niyetini destekler.
- HTML şablon havuzu görsel ve etkileşimsel uygulama katmanını hızlandırır.
- İş akışı görünümden daha önemlidir.
- Şablonlar doğrudan kopyalanmaz; ortak design system ve domain bileşenlerine dönüştürülür.
- Şantiye merkezli finansal hareket çekirdeği ürünün kalbidir.
- MVP, çok geniş görünen modülleri önce doğru çekirdeğe bağlamalıdır.
- Sonraki fazlar bu çekirdeğin üstüne teklif, ilerleme, YapSat, araç, e-fatura ve gelişmiş raporlama olarak büyümelidir.
