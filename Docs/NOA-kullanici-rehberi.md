# NOA İnşaat Yönetim — Kullanıcı Rehberi

> Sürüm: Faz 9 kapanış
> Tarih: 22.07.2026
> Kapsam: web uygulamasının standart kullanıcı akışları

## 1. Başlarken

NOA İnşaat Yönetim; firma, dönem, şantiye, cari, finans, personel ve hakediş işlemlerini tek uygulama kabuğunda toplar. Girişten sonra üst çubuktaki oturum alanından yetkili olduğunuz firma ve döneme geçebilirsiniz. Ekrandaki bütün finansal ve operasyonel veriler seçili tenant, firma ve dönem kapsamında yüklenir.

- Sol menü masaüstünde sürekli görünür; mobilde sol üstteki menü düğmesiyle açılır.
- İçeriğe doğrudan geçmek için klavyeyle `İçeriğe geç` bağlantısı kullanılabilir.
- Tema kontrolünden `Sistem`, `Açık` veya `Koyu` seçilebilir. Tercih yalnız kullanılan tarayıcıda saklanır.
- Demo hesap bilgileri ayrı ve erişimi kontrollü `Docs/Giris_Bilgileri.md` belgesindedir; bu rehber parola içermez.

## 2. Roller

| Rol | Temel kullanım |
|---|---|
| `admin` | Firma, kullanıcı, rol, dönem, entegrasyon ve API yönetimi dahil yönetim işlemleri |
| `accounting` | Cari, fatura, kasa/banka, gider, çek, puantaj, bordro ve hakediş işlemleri |
| `viewer` | Yetkili firma/dönemde salt okunur inceleme ve raporlama |

Bir düğmenin görünmemesi veya pasif olması çoğunlukla rol, kapalı muhasebe dönemi, kesinleşmiş/iptal edilmiş belge ya da abonelik özelliği kısıtından kaynaklanır. Yetki kontrolleri yalnız arayüzde değil, sunucu işlemlerinde de uygulanır.

## 3. Sayfa Rehberi

| Grup | Sayfa | Route | Kullanım |
|---|---|---|---|
| Genel | Dashboard | `/` | Nakit akışı, vade, şantiye ve operasyon özetleri |
| Genel | Şantiyeler | `/santiyeler` | Şantiye kartları, gelir/gider, kârlılık ve finans analizi |
| Genel | İhale Yönetimi | `/ihale-yonetimi` | İhale oluşturma, BOQ, liste/Kanban, analiz ve şantiyeye dönüştürme |
| Genel | Döküman Merkezi | `/dokuman-merkezi` | Klasör, dosya yükleme, taşıma, çöp ve geri yükleme |
| Genel | Bildirimler | `/bildirimler` | Okunmamış bildirimler, kategori tercihleri ve ilgili kayda geçiş |
| Finans | Tedarikçiler | `/tedarikciler` | Tedarikçi kartı, alış faturası bağlantısı ve cari ekstre |
| Finans | Müşteriler | `/musteriler` | Müşteri kartı, satış faturası bağlantısı ve cari ekstre |
| Finans | Taşeronlar | `/taseronlar` | Taşeron kartı, hakediş ve ödeme bağlantıları |
| Finans | Kasa/Banka | `/kasa-banka` | Tahsilat, ödeme, virman, ters hareket ve ledger görünürlüğü |
| Finans | Giderler | `/giderler` | Şantiye gideri oluşturma, ödeme aracı ve gider analizi |
| Finans | Faturalar | `/faturalar` | Alış/satış faturası, irsaliye, kesinleştirme, ödeme/tahsilat ve PDF önizleme |
| Finans | Hakediş | `/hakedis` | Finansal hakedişler ile Hakediş Pro proje/poz/metraj/onay/kesinti/muhasebe çalışma alanı |
| Finans | Çek | `/cek` | Çek oluşturma, vade takibi, tahsil ve muhasebe bağlantısı |
| Operasyon | Personel | `/personel` | Personel kartları, zimmetler ve bordro çalışma alanı |
| Operasyon | Stok/Depo | `/stok-depo` | Stok kartı, minimum stok, depo/şantiye hareketi ve transfer |
| Operasyon | Araçlar | `/araclar` | Araç kartı, sigorta/muayene/bakım tarihleri ve sandbox filo özeti |
| Operasyon | Puantaj | `/puantaj` | Aylık puantaj oluşturma, satır girişi, kesinleştirme ve bordro hazırlığı |
| Operasyon | Raporlar | `/raporlar` | Cari, finans, şantiye, stok, personel ve hakediş raporları |
| Sistem | Abonelik | `/abonelik` | Paket, ek özellik, yenileme ve ödeme geçmişi |
| Sistem | API Yönetimi | `/api-yonetimi` | API anahtarı, kapsam, revoke ve webhook endpoint yönetimi |
| Sistem | E-Fatura Yönetimi | `/e-fatura-yonetimi` | Mevcut entegrasyon planı, durum ve audit görünümü |
| Sistem | Ayarlar | `/ayarlar` | Firma, kullanıcı, rol, davet, banka sandbox, ledger, dönem ve audit işlemleri |

İhale, Döküman Merkezi, Araçlar, E-Fatura, Hakediş ve Çek sayfaları abonelik özelliğiyle korunabilir. Özellik kapalıysa veri yüklenmez ve paket yönlendirmesi gösterilir.

## 4. Temel İş Akışları

### 4.1 Alış faturası ve ödeme

1. `Tedarikçiler` sayfasında cari kartın doğru olduğunu kontrol edin.
2. `Faturalar > Alış Faturaları` bölümünde taslak faturayı oluşturun.
3. Satır, KDV, şantiye ve toplamları doğrulayın.
4. Faturayı kesinleştirin. Kesinleşen belge mevcut muhasebe kurallarına göre ledger kaydı üretir.
5. Ödeme yapılacaksa uygun kasa/banka hesabını seçin.
6. PDF önizlemeden belge dökümünü kontrol edin.

Kesinleşmiş belge doğrudan düzenlenmez. İzin verilen iptal/ters kayıt akışını kullanın; aynı işlemi art arda göndermek kopya muhasebe kaydı üretmemelidir.

### 4.2 Satış faturası ve tahsilat

1. `Müşteriler` sayfasında müşteri kartını doğrulayın.
2. `Faturalar > Satış Faturaları` bölümünde taslak oluşturun.
3. Belgeyi kesinleştirin.
4. Tahsilat sırasında kasa/banka hesabını seçin.
5. Müşteri ekstresi ve ledger bağlantısını kontrol edin.

### 4.3 Gider, kasa/banka ve çek

- Gider kaydında şantiye, tarih, gider hesabı ve ödeme aracını birlikte doğrulayın.
- Kasa/banka hareketlerinde kaynak belge ve ters hareket bağlantısını kontrol edin.
- Virman iki hesap arasında dengeli hareket üretir; aynı hesabı kaynak ve hedef seçmeyin.
- Çeklerde vade ve durum geçişlerini izleyin; tahsil işlemi yalnız uygun durumdaki çeklerde açılır.

### 4.4 İhaleden şantiyeye

1. İhaleyi üç aşamalı formdan oluşturun.
2. BOQ satırlarını ve kârlılık simülasyonunu kontrol edin.
3. Durum geçişlerini teklif sürecine göre ilerletin.
4. Kazanılan ihaleyi `Şantiyeye dönüştür` işlemiyle şantiye kartına bağlayın.

### 4.5 Hakediş Pro

1. Proje ve sözleşme bilgilerini oluşturun.
2. Sözleşme pozlarını ve gerekiyorsa birim fiyat revizyonlarını yönetin.
3. Genel/demir metraj föylerini girin veya önizlemeli toplu aktarımı kullanın.
4. İmalat çarşafı, Yeşil Defter ve miktar kontrolüyle veriyi uzlaştırın.
5. Hakedişi oluşturun; kesinti kurallarını önizleyip yetkiniz varsa uygulayın.
6. Yönetici onayı ve kesinleştirme sonrası finansal hakediş, muhasebe bağlantısı ve ledger belgesini kontrol edin.

Kesinti kuralı yönetimi `admin`; kural önizleme/uygulama ve muhasebe işlemleri `admin` veya `accounting` rolü içindir. Kesinleşmiş snapshot geçmişi sonradan yeniden fiyatlanmaz.

### 4.6 Personel, puantaj ve bordro

1. Personel kartını ve şantiye bağlantısını kontrol edin.
2. `Puantaj` sayfasında dönem ve personel satırlarını oluşturun.
3. Normal gün, fazla mesai ve kesinti değerlerini doğrulayın.
4. Puantajı kesinleştirin.
5. `Personel` içindeki bordro alanından tahakkuku oluşturup kesinleştirin; ödeme adımında kasa/banka hesabını seçin.

### 4.7 Stok ve depo

- Stok kartı ile minimum stok seviyesini tanımlayın.
- Giriş/çıkış/transfer hareketinde kaynak ve hedef konumu doğrulayın.
- Taslak hareket kesinleştirilmeden stok etkisi oluşmuş kabul edilmez.
- Hatalı kesinleşmiş hareket için mevcut iptal/ters kayıt akışını kullanın.

## 5. Ayarlar ve Yönetim

`Ayarlar` sayfası yönetim ve muhasebe araçlarını tek çalışma alanında toplar:

- Kullanıcı daveti, rol değişikliği ve erişim pasifleştirme.
- Firma/dönem bağlamı ve muhasebe dönemi açma-kapatma.
- Dengeli manuel yevmiye fişi ve mizan görünümü.
- Banka sandbox bağlantı testi, hareket eşleştirme ve recovery kayıtları.
- Audit günlüğü filtreleme ve detay inceleme.

Dönem kapatma/açma, API anahtarı ve entegrasyon bağlantı testleri gibi kritik sistem işlemleri yalnız `admin` rolündedir.

## 6. Çıktı, Mobil Kullanım ve Erişilebilirlik

- Yazdırma sırasında global header, sidebar ve interaktif düğmeler otomatik gizlenir.
- Koyu tema kullanılsa bile print çıktısı açık ve yüksek kontrastlı palete döner.
- Geniş finans tabloları mobilde kendi alanında yatay kayabilir; sayfanın tamamı yatay taşmaz.
- Modal pencereler Escape ile kapanır, odak modal içinde kalır ve kapanınca açan düğmeye döner.
- Form hata mesajını okuyun; yalnız placeholder metnine güvenmeden alan etiketlerini izleyin.

## 7. Sandbox ve Dış Entegrasyon Sınırları

- Banka ve araç entegrasyonları sandbox/plan görünümündedir.
- Gerçek Open Banking, Arvento GPS, GİB provider, ödeme sağlayıcısı veya dış webhook worker kimlik bilgileri varmış gibi kabul edilmez.
- E-Fatura ve API sayfalarındaki durum bilgileri mevcut proje planı ve audit kayıtlarını gösterir; gerçek sağlayıcı bağlantısı kanıtı değildir.

## 8. Sorun Giderme

| Durum | Kontrol |
|---|---|
| Kayıt düğmesi görünmüyor | Rolünüzü, abonelik özelliğini ve belge durumunu kontrol edin. |
| İşlem kapalı dönem hatası veriyor | Üst çubuktaki dönemi ve Ayarlar içindeki dönem durumunu kontrol edin. |
| Veri beklenenden farklı | Aktif tenant/firma/dönem seçimini kontrol edin. |
| Belge değiştirilemiyor | Belge kesinleşmiş, iptal edilmiş veya başka bir durum guard'ında olabilir. |
| Entegrasyon çalışmıyor | Ekranın sandbox/plan etiketi taşıyıp taşımadığını kontrol edin. |
| Mobilde tablo dar | Tablo alanını yatay kaydırın; ana sayfa taşması oluşmamalıdır. |

Kalıcı hata durumunda işlem zamanı, seçili firma/dönem, belge numarası ve görünen güvenli hata mesajıyla yöneticinize başvurun. Gizli anahtar, parola veya ham teknik exception paylaşmayın.
