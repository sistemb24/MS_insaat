Sen kıdemli bir full-stack web geliştiricisi, UI/UX tasarımcısı, muhasebe yazılım mimarı ve QA mühendisisin.

Görevin, tarayıcı tabanlı eksiksiz bir inşaat muhasebe ve yönetim uygulamasını sıfırdan bağımsız olarak tasarlamak, geliştirmek, çalıştırmak, test etmek, hata ayıklamak ve son rötuşları yapmaktır.

Sadece plan oluşturup kodu açıklamakla yetinme. Kısa bir uygulama planı sunduktan sonra derhal projeyi inşa etmeye başla. Uygulama çalışır durumda olana ve tüm kritik kabul kriterleri karşılanana kadar devam et.

# **PROJE KONSEPTI**

Küçük ve orta ölçekli inşaat firmaları için modern, kapsamlı bir web tabanlı muhasebe ve proje yönetim uygulaması oluştur.

Uygulama adı:

**İnşaatPro — İnşaat Muhasebe & Yönetim Sistemi**

Uygulama, bir inşaat firmasının mali ve operasyonel süreçlerini dijitalleştirmeyi hedefler: şantiye/proje yönetimi, müşteri ilişkileri, ihale takibi, taşeron ve tedarikçi takibi, hakediş yönetimi, gelir-gider muhasebesi, malzeme stok takibi, puantaj (işçi devam) yönetimi, araç ve filo yönetimi, nakit akış kontrolü, abonelik yönetimi ve detaylı raporlama.

Uygulamanın kapsaması gereken temel iş alanları:

* Müşteri (işveren/yatırımcı) kayıt ve yönetimi
* Proje (şantiye) kayıt ve yönetimi
* İhale takibi ve teklif yönetimi
* Taşeron (alt yüklenici) yönetimi
* Tedarikçi (malzeme sağlayıcı) yönetimi
* Hakediş (progress payment) oluşturma ve takibi
* Gelir-gider muhasebesi (cari hesaplar)
* Malzeme stok ve sevkiyat takibi
* Puantaj (günlük işçi devam ve mesai) yönetimi
* Araç ve filo yönetimi (şantiye araçları, iş makineleri)
* Sözleşme yönetimi
* Nakit akış tablosu ve projeksiyon
* Fatura ve ödeme takibi
* Abonelik ve paket yönetimi (SaaS lisanslama)
* API anahtar yönetimi (entegrasyon altyapısı)
* Gösterge paneli (dashboard) ile anlık mali durum özeti
* Detaylı mali ve operasyonel raporlama

Gerçek bir inşaat firmasında kullanılabilecek düzeyde profesyonel bir uygulama hedeflenmektedir.

# **BİRİNCİL HEDEF**

Sonuç, yalnızca güzel görünen bir arayüz değil, eksiksiz ve işlevsel bir inşaat muhasebe ve yönetim uygulaması olmalıdır.

Proje, karmaşık kodlama ve iş mantığı içermelidir:

* Müşteri-proje-taşeron-tedarikçi ilişki yönetimi
* İhale yaşam döngüsü (hazırlanıyor → teklif verildi → kazanıldı → kaybedildi)
* Hakediş yaşam döngüsü (taslak → onay bekliyor → onaylandı → ödendi)
* Gelir-gider kaydı ve cari hesap bakiye hesaplaması
* Otomatik hakediş hesaplama (iş kalemleri × birim fiyat × gerçekleşme oranı)
* Malzeme stok giriş-çıkış takibi (şantiyeye sevkiyat)
* Puantaj hesaplaması (normal mesai, fazla mesai, yevmiye)
* Araç filo yönetimi (yakıt, bakım, görev atama)
* Nakit akış projeksiyonu (planlanan gelir vs. gider)
* KDV ve stopaj hesaplamaları
* Sözleşme ilerleme takibi
* Abonelik ve paket yönetimi (deneme, başlangıç, profesyonel, kurumsal planlar)
* API anahtar oluşturma, yetkilendirme ve kullanım limiti takibi
* Arama ve filtreleme sistemi
* Veri doğrulama (VKN/TCKN formatı, tutar kontrolleri, tarih kontrolleri)
* Dashboard istatistikleri ve grafikler
* Duyarlı (responsive) tasarım
* Güvenilir CRUD işlemleri
* LocalStorage veya IndexedDB ile kalıcı veri saklama

Uygulama baştan sona kullanılabilir durumda olmalıdır.

# **ÖNERİLEN TEKNOLOJİ YIĞINI**

Kararlı bir tarayıcı tabanlı yığın kullan:

* Vite
* TypeScript
* React (veya Vue.js — hangisi projeye daha uygunsa)
* CSS Modules veya Vanilla CSS (modern ve premium görünüm için)
* Chart.js veya Recharts (dashboard grafikleri için)
* LocalStorage veya IndexedDB (kalıcı veri depolama)
* HTML ve CSS (düzen ve stiller için)
* React Router (sayfa yönlendirme için)
* UUID kütüphanesi (benzersiz kimlik oluşturma)
* date-fns veya dayjs (tarih işlemleri için)

Mümkün olduğunca az bağımlılık kullan.

Kullanma:

* Ücretli API'ler
* API anahtarları
* Ücretli varlıklar veya şablonlar
* Harici backend servisleri (tüm veriler istemci tarafında saklanacak)
* Lisansı belirsiz varlıklar
* Açık bir teknik avantaj sağlamadıkça büyük çerçeveler

Tüm veriler istemci tarafında (LocalStorage/IndexedDB) saklanacaktır. Backend gerekmez.

Bir bağımlılık kararlılık sorunu yaratırsa, daha basit bir uygulamayla değiştir ve devam et.

# **GELİŞTİRME DAVRANIŞI**

Uygulamanın tam sahipliği sende.

Şu kuralları izle:

1. Değişiklik yapmadan önce mevcut klasörü incele.
2. Kısa ve öz bir geliştirme planı oluştur.
3. Plandan hemen sonra uygulamaya başla.
4. Gerekli tüm bağımlılıkları kur.
5. Tam proje yapısını oluştur.
6. Projeyi yerel olarak çalıştır.
7. Terminal ve tarayıcı hatalarını incele.
8. Keşfettiğin tüm kritik hataları düzelt.
9. Projeyi mantıksal aşamalarla inşa et.
10. Her büyük aşamadan sonra mevcut sistemleri test et.
11. Yeni özellikler eklerken çalışan özellikleri silme.
12. Kodu modüler ve bakımı kolay tut.
13. Büyük sistemleri TODO yorumları veya sahte uygulamalar olarak bırakma.
14. Uygulamadan bir özelliğin çalıştığını iddia etme.
15. Bir şey başarısız olduğunda, kök nedenini belirle ve düzelt.
16. Gerçek bir harici engelle karşılaşmadıkça onay isteme.
17. Makul teknik kararları bağımsız olarak al.
18. Proje boyunca bir geliştirme günlüğü tut.

Şu isimde bir dosya oluştur:

`GELISTIRME_RAPORU.md`

Bu dosyada şunları kaydet:

* Büyük uygulama aşamaları
* Önemli teknik kararlar
* Karşılaşılan hatalar
* Kök nedenler
* Uygulanan düzeltmeler
* Kalan sınırlamalar
* Son test sonuçları
* Yaklaşık insan müdahalesi düzeyi

# **UYGULAMA GEREKSİNİMLERİ**

## **1. Proje (Şantiye) Yönetimi**

İnşaat projelerini ve şantiyeleri yöneten kapsamlı bir modül oluştur.

Proje kaydı şunları içermelidir:

* Benzersiz proje ID (otomatik oluşturulmalı)
* Proje kodu (kullanıcı tanımlı, örn: PRJ-2025-001)
* Proje adı
* Proje türü (Konut, Ticari, Altyapı, Restorasyon, Kamu İhalesi, Diğer)
* İşveren (proje sahibi) bilgileri (ad, unvan, VKN/TCKN, telefon, adres)
* Sözleşme bedeli (TL)
* Başlangıç tarihi
* Planlanan bitiş tarihi
* Gerçek bitiş tarihi
* Proje durumu (Planlama, Devam Ediyor, Durduruldu, Tamamlandı, İptal)
* Şantiye adresi / konumu
* Proje yöneticisi / şantiye şefi adı
* Fiziksel ilerleme yüzdesi (%)
* Genel notlar

Proje modülü şunları desteklemelidir:

* Yeni proje oluşturma
* Proje bilgilerini düzenleme
* Proje arama (ad, kod, işveren ile)
* Proje detay sayfası (taşeronlar, hakedişler, gelir-gider özeti, malzeme hareketleri ile)
* Proje durumunu güncelleme
* Proje listesini filtreleme ve sıralama (duruma, türe, tarihe göre)
* Proje bazlı kar/zarar özet hesaplaması
* Aktif ve tamamlanmış projelerin ayrı görünümleri

## **2. Taşeron (Alt Yüklenici) Yönetimi**

Projelerde görev alan taşeronları yöneten bir modül oluştur.

Taşeron kaydı şunları içermelidir:

* Benzersiz taşeron ID
* Firma unvanı / kişi adı
* Vergi kimlik numarası (VKN) veya TC kimlik numarası
* Vergi dairesi
* Telefon numarası
* E-posta adresi
* Adres bilgisi
* Uzmanlık alanı (Kaba İnşaat, İnce İşler, Elektrik, Mekanik Tesisat, Boya/Badana, Demir, Kalıp, Hafriyat, Peyzaj, Diğer)
* Banka bilgileri (IBAN)
* Cari hesap bakiyesi (otomatik hesaplanan)
* Kayıt tarihi
* Durum (Aktif, Pasif)
* Notlar

Taşeron modülü şunları desteklemelidir:

* Yeni taşeron ekleme
* Taşeron bilgilerini düzenleme
* Taşeron arama
* Taşeron detay sayfası (atandığı projeler, hakedişler, ödemeler, cari hesap ekstresi)
* Taşeron cari hesap bakiyesini görüntüleme (toplam hakediş − toplam ödeme)
* Taşeron bazlı ekstre raporu
* Taşeronun çalıştığı projeleri listeleme

## **3. Tedarikçi Yönetimi**

Malzeme tedarikçilerini yöneten bir modül oluştur.

Tedarikçi kaydı şunları içermelidir:

* Benzersiz tedarikçi ID
* Firma unvanı
* Vergi kimlik numarası
* Vergi dairesi
* Telefon numarası
* E-posta adresi
* Adres bilgisi
* Tedarik ettiği malzeme kategorileri
* Banka bilgileri (IBAN)
* Cari hesap bakiyesi (otomatik hesaplanan)
* Ödeme vadesi (gün)
* Kayıt tarihi
* Durum (Aktif, Pasif)
* Notlar

Tedarikçi modülü şunları desteklemelidir:

* Yeni tedarikçi ekleme
* Tedarikçi bilgilerini düzenleme
* Tedarikçi arama
* Tedarikçi detay sayfası (alımlar, ödemeler, cari hesap ekstresi)
* Tedarikçi cari hesap bakiyesini görüntüleme (toplam alım − toplam ödeme)
* Tedarikçi bazlı ekstre raporu

## **4. Hakediş Yönetimi**

İnşaat sektörünün en kritik mali süreçlerinden biri olan hakediş sistemini oluştur.

Hakediş kaydı şunları içermelidir:

* Benzersiz hakediş numarası (otomatik, sıralı: HKD-2025-0001)
* İlişkili proje
* Hakediş dönemi (başlangıç tarihi − bitiş tarihi)
* Hakediş sıra numarası (1. hakediş, 2. hakediş, vb.)
* Hakediş türü (İşveren Hakedişi — firmaya gelen, Taşeron Hakedişi — taşerona ödenen)
* İlişkili taşeron (taşeron hakedişi ise)
* Hakediş durumu (Taslak, Onay Bekliyor, Onaylandı, Kısmi Ödeme, Ödendi, Reddedildi)
* Hakediş kalemleri listesi:
  * İş kalemi adı / pozno
  * Birim (m², m³, mt, kg, ton, adet, takım, gün)
  * Sözleşme miktarı
  * Birim fiyat
  * Önceki hakediş toplam miktarı (kümülatif)
  * Bu dönem gerçekleşen miktar
  * Toplam gerçekleşen miktar (kümülatif)
  * Tutar (miktar × birim fiyat)
* Ara toplam
* Stopaj oranı ve tutarı (varsayılan %5)
* KDV oranı ve tutarı (varsayılan %20)
* Önceki hakedişler toplamı (kesinti)
* Net bu dönem hakediş tutarı
* Genel toplam
* Onay tarihi
* Ödeme tarihi
* Notlar

Hakediş modülü şunları desteklemelidir:

* Yeni hakediş oluşturma (proje ve taşeron seçimi ile)
* Hakediş kalemleri ekleme, düzenleme, silme
* Otomatik kümülatif hesaplama (önceki hakedişleri dikkate alarak)
* Hakediş durumunu güncelleme (durum akışına uygun geçişler)
* Hakediş detay görüntüleme
* Hakediş yazdırma / PDF görünümü (profesyonel şablon ile)
* Hakediş listesini filtreleme (projeye, taşerona, duruma, tarihe göre)
* Proje bazlı toplam hakediş özeti
* Stopaj ve KDV otomatik hesaplaması

Durum geçiş kuralları:

* Taslak → Onay Bekliyor, İptal (silme)
* Onay Bekliyor → Onaylandı, Reddedildi
* Onaylandı → Kısmi Ödeme, Ödendi
* Kısmi Ödeme → Ödendi
* Ödendi ve Reddedildi: son durumlar, geri dönüş yok

## **5. Gelir-Gider Muhasebesi**

Firma ve proje bazlı gelir-gider takibi yapan bir muhasebe modülü oluştur.

Muhasebe kaydı şunları içermelidir:

* Benzersiz kayıt ID
* İşlem tarihi
* İşlem türü (Gelir / Gider)
* Kategori:
  * Gelir kategorileri: Hakediş Tahsilatı, Diğer Gelir
  * Gider kategorileri: Taşeron Ödemesi, Malzeme Alımı, İşçilik / Puantaj, Akaryakıt, Kira, Sigorta, Vergi / Harç, Ekipman / Makine, Nakliye, Ofis Giderleri, Diğer Gider
* İlişkili proje (opsiyonel — genel firma giderleri proje bağımsız olabilir)
* İlişkili taşeron veya tedarikçi (opsiyonel)
* Açıklama
* Tutar (TL)
* KDV tutarı (opsiyonel)
* Ödeme yöntemi (Nakit, Banka Havale/EFT, Kredi Kartı, Çek, Senet)
* Belge / Fatura numarası (opsiyonel)
* Belge tarihi
* Notlar

Muhasebe modülü şunları desteklemelidir:

* Gelir kaydı ekleme
* Gider kaydı ekleme
* Kayıt düzenleme
* Kayıt silme (onay ile)
* Proje bazlı gelir-gider özeti ve kar/zarar hesaplaması
* Firma geneli gelir-gider özeti
* Tarih aralığına göre filtreleme
* Kategoriye göre filtreleme
* Taşeron / tedarikçi cari hesap hareketlerini otomatik güncelleme
* Aylık gelir-gider karşılaştırma tablosu
* Kümülatif bakiye hesaplama

## **6. Malzeme Stok ve Sevkiyat Yönetimi**

Şantiyelerde kullanılan malzemelerin stok ve sevkiyat takibini yapan bir modül oluştur.

Malzeme kaydı şunları içermelidir:

* Benzersiz malzeme ID
* Malzeme kodu
* Malzeme adı
* Kategori (Çimento, Demir/Çelik, Kum/Çakıl, Tuğla/Blok, Beton, Kereste, Boru/Tesisat, Elektrik Malzemesi, Boya, İzolasyon, Seramik/Fayans, Çivi/Vida/Bağlantı, Diğer)
* Birim (Ton, Kg, M³, M², Mt, Adet, Torba, Paket, Litre)
* Birim fiyat (alış)
* Birim fiyat (satış/yansıtma)
* Toplam stok miktarı (tüm şantiyeler)
* Minimum stok seviyesi
* Tedarikçi referansı (opsiyonel)

Stok hareket kaydı:

* Hareket türü (Giriş — Alım, Çıkış — Şantiyeye Sevk, Transfer — Şantiyeler Arası, İade)
* İlişkili proje / şantiye
* İlişkili tedarikçi (giriş ise)
* Tarih
* Miktar
* Birim fiyat
* Toplam tutar
* İrsaliye / Belge numarası (opsiyonel)
* Notlar

Stok modülü şunları desteklemelidir:

* Yeni malzeme tanımlama
* Malzeme bilgilerini düzenleme
* Malzeme arama (kod, ad, kategori ile)
* Stok giriş işlemi (tedarikçiden alım)
* Stok çıkış işlemi (şantiyeye sevkiyat)
* Şantiyeler arası transfer
* İade işlemi
* Proje bazlı malzeme tüketim raporu
* Minimum stok altındaki malzemeler için uyarı gösterimi
* Malzeme hareket geçmişi (giriş-çıkış ekstresi)
* Stok durumu özet raporu

## **7. Puantaj (İşçi Devam) Yönetimi**

Günlük işçi devam ve mesai takibi yapan bir modül oluştur.

İşçi kaydı şunları içermelidir:

* Benzersiz işçi ID
* Ad soyad
* TC kimlik numarası
* Telefon numarası
* Uzmanlık / pozisyon (Düz İşçi, Kalfa, Usta, Operatör, Kalıpçı, Demirci, Elektrikçi, Tesisatçı, Boyacı, Diğer)
* Günlük yevmiye (TL)
* Fazla mesai saat ücreti (TL)
* İlişkili proje / şantiye
* SGK durumu (opsiyonel bilgi)
* Durum (Aktif, Pasif)
* Giriş tarihi
* Notlar

Puantaj kaydı şunları içermelidir:

* Tarih
* İşçi referansı
* Proje referansı
* Çalışma durumu (Tam Gün, Yarım Gün, Fazla Mesai, İzinli, Raporlu, Devamsız)
* Normal çalışma saati
* Fazla mesai saati
* Günlük hak edilen tutar (otomatik hesaplanan)
* Notlar

Puantaj modülü şunları desteklemelidir:

* İşçi kaydı ekleme ve düzenleme
* Günlük puantaj girişi (tarih ve proje seçerek toplu giriş)
* Takvim görünümünde puantaj tablosu
* Aylık puantaj özet tablosu (işçi bazlı)
* Proje bazlı puantaj raporu
* Aylık işçilik maliyet hesaplaması
* Haftalık / aylık toplam çalışma günü ve ücreti
* İşçi bazlı ödeme raporu

## **8. Sözleşme Yönetimi**

Proje ve taşeron sözleşmelerini takip eden bir modül oluştur.

Sözleşme kaydı şunları içermelidir:

* Benzersiz sözleşme ID
* Sözleşme numarası
* Sözleşme türü (İşveren Sözleşmesi, Taşeron Sözleşmesi, Tedarik Sözleşmesi)
* İlişkili proje
* İlişkili taşeron veya tedarikçi (varsa)
* Sözleşme konusu / kapsamı
* Sözleşme bedeli (TL)
* KDV dahil/hariç bilgisi
* Avans oranı ve tutarı (varsa)
* Teminat oranı ve tutarı (varsa)
* İmza tarihi
* Başlangıç tarihi
* Bitiş tarihi
* Sözleşme durumu (Taslak, Aktif, Askıda, Tamamlandı, Feshedildi)
* Ödeme koşulları (açıklama)
* Notlar

Sözleşme modülü şunları desteklemelidir:

* Yeni sözleşme oluşturma
* Sözleşme bilgilerini düzenleme
* Sözleşme detay sayfası (ilişkili hakedişler ve ödemelerle)
* Sözleşme durumunu güncelleme
* Sözleşme ilerleme oranı (toplam hakediş / sözleşme bedeli)
* Sözleşme listesini filtreleme (projeye, türe, duruma göre)
* Süresi yaklaşan ve dolan sözleşmeler için uyarı

## **9. Nakit Akış Yönetimi**

Firmanın nakit akışını takip eden ve geleceğe yönelik projeksiyon sunan bir modül oluştur.

Nakit akış modülü şunları desteklemelidir:

* Banka / kasa bazlı nakit durumu gösterimi
* Planlanan gelir ve gider kayıtları (gelecek tarihli)
* Gerçekleşen gelir ve gider kayıtları
* Haftalık / aylık nakit akış tablosu
* Nakit akış projeksiyonu grafiği (gelecek 3 ay)
* Vadesi gelen çek ve senet takibi
* Tahsilat ve ödeme takvimi
* Nakit açık/fazla uyarıları

## **10. Müşteri Yönetimi**

İnşaat firmalarının çalıştığı işverenleri (yatırımcıları) ve kurumsal müşterileri yöneten bir modül oluştur.

Müşteri kaydı şunları içermelidir:

* Benzersiz müşteri ID (otomatik oluşturulmalı)
* Müşteri türü (Bireysel, Kurumsal, Kamu Kurumu)
* Ad soyad veya firma unvanı
* Vergi kimlik numarası (VKN) veya TC kimlik numarası
* Vergi dairesi
* Telefon numarası (format doğrulaması ile)
* E-posta adresi
* Adres bilgisi (il, ilçe, açık adres)
* Yetkili kişi adı (kurumsal müşterilerde)
* Yetkili kişi telefonu
* Sektör (İnşaat, Gayrimenkul, Kamu, Sanayi, Diğer)
* Müşteri notu / özel açıklamalar
* Cari hesap bakiyesi (otomatik hesaplanan — toplam sözleşme vs. toplam ödeme)
* Kayıt tarihi
* Durum (Aktif, Pasif)

Müşteri modülü şunları desteklemelidir:

* Yeni müşteri ekleme
* Müşteri bilgilerini düzenleme
* Müşteri arama (ad, VKN, telefon ile)
* Müşteri detay sayfası (projeleri, sözleşmeleri, hakedişleri, ödeme geçmişi ile)
* Müşteri bazlı cari hesap ekstresi
* Müşteri silme (ilişkili projeler varsa uyarı göster)
* Müşteri listesini filtreleme ve sıralama (türe, duruma, sektöre göre)
* Müşteri bazlı toplam sözleşme bedeli ve tahsilat özeti
* En aktif müşteriler raporu

## **11. İhale Yönetimi**

Kamu ve özel sektör ihalelerini takip eden, teklif hazırlama sürecini yöneten bir modül oluştur.

İhale kaydı şunları içermelidir:

* Benzersiz ihale ID (otomatik oluşturulmalı)
* İhale kodu / kayıt numarası
* İhale adı
* İhale türü (Kamu Açık İhale, Kamu Davetiye, Özel Sektör, Doğrudan Temin, Pazarlık Usulü)
* İhale makamı / kurumu (müşteri referansı veya serbest metin)
* İhale konusu / kapsamı (açıklama)
* Tahmini bedel (TL)
* Teklif verme son tarihi ve saati
* İhale tarihi
* İhale yeri
* Geçici teminat tutarı
* Kesin teminat tutarı (kazanılırsa)
* İhale durumu (Araştırılıyor, Hazırlanıyor, Teklif Verildi, Değerlendirmede, Kazanıldı, Kaybedildi, İptal)
* Teklif edilen bedel (TL)
* Kazanılan bedel (TL — kazanılırsa)
* İlişkili proje (kazanılırsa otomatik proje oluşturma)
* Sorumlu kişi
* Notlar

İhale kalem detayları:

* İş kalemi adı / pozno
* Birim (m², m³, mt, kg, ton, adet, gün, vb.)
* Tahmini miktar
* Birim fiyat (teklif edilen)
* Toplam tutar

İhale modülü şunları desteklemelidir:

* Yeni ihale kaydı oluşturma
* İhale kalem listesi ekleme (birim fiyat analizi)
* İhale durumunu güncelleme (durum akışına uygun geçişler)
* Kazanılan ihaleden otomatik proje ve sözleşme oluşturma
* İhale takvimi görünümü (yaklaşan son tarihler)
* İhale listesini filtreleme (duruma, türe, tarihe göre)
* İhale detay sayfası
* Kazanma oranı istatistiği (kazanılan / toplam teklif verilen)
* Teklif verilen vs. kazanılan bedel karşılaştırması
* Yaklaşan ihale son tarihleri için uyarı bildirimi

Durum geçiş kuralları:

* Araştırılıyor → Hazırlanıyor, İptal
* Hazırlanıyor → Teklif Verildi, İptal
* Teklif Verildi → Değerlendirmede, İptal
* Değerlendirmede → Kazanıldı, Kaybedildi
* Kazanıldı → (proje oluşturulur, son durum)
* Kaybedildi ve İptal: son durumlar, geri dönüş yok

## **12. Araç ve Filo Yönetimi**

Şantiye araçlarını, iş makinelerini ve firma araçlarını yöneten bir modül oluştur.

Araç kaydı şunları içermelidir:

* Benzersiz araç ID
* Plaka numarası (Türk plaka formatı doğrulaması)
* Araç türü (Binek, Kamyon, Kamyonet, Pikap, Minibüs, TIR, Kepçe, Ekskavatör, Dozer, Vinç, Forklift, Mikser, Pompa, Jeneratör, Kompresör, Diğer)
* Marka ve model
* Model yılı
* Şasi numarası (opsiyonel)
* Motor numarası (opsiyonel)
* Yakıt türü (Dizel, Benzin, LPG, Elektrik)
* Güncel kilometre / çalışma saati
* Ruhsat sahibi (Firma, Kiralık)
* Kiralık ise: kiralayan firma, aylık kira bedeli, kira bitiş tarihi
* Sigorta bitiş tarihi
* Muayene bitiş tarihi
* Atandığı proje / şantiye (opsiyonel)
* Sorumlu sürücü / operatör
* Durum (Aktif, Bakımda, Arızalı, Pasif)
* Kayıt tarihi
* Notlar

Yakıt kaydı:

* Tarih
* Araç referansı
* Yakıt miktarı (litre)
* Tutar (TL)
* Kilometre / çalışma saati (o anki)
* İstasyon / tedarikçi
* İlişkili proje

Bakım kaydı:

* Tarih
* Araç referansı
* Bakım türü (Periyodik Bakım, Arıza Onarımı, Lastik Değişimi, Yağ Değişimi, Diğer)
* Açıklama
* Tutar (TL)
* Servis / yapan firma
* Sonraki bakım km / tarihi
* İlişkili proje

Araç ve filo modülü şunları desteklemelidir:

* Yeni araç ekleme ve düzenleme
* Araç arama (plaka, tür, proje ile)
* Araç detay sayfası (yakıt geçmişi, bakım geçmişi, görev geçmişi)
* Yakıt kaydı ekleme
* Bakım kaydı ekleme
* Araç-proje atama ve transfer
* Sigorta ve muayene bitiş tarihi yaklaşan araçlar için uyarı
* Kira bitiş tarihi yaklaşan araçlar için uyarı
* Araç bazlı toplam maliyet raporu (yakıt + bakım + kira)
* Proje bazlı araç maliyet raporu
* Filo özet tablosu (tüm araçların durumu, konumu)
* Aylık yakıt tüketim raporu
* Km/litre verim hesaplaması

## **13. Gösterge Paneli (Dashboard)**

Uygulamanın ana sayfası olarak kapsamlı bir mali ve operasyonel gösterge paneli oluştur.

Gösterge panelinde şunlar gösterilmelidir:

* Aktif proje sayısı
* Toplam müşteri sayısı ve yeni müşteri (bu ay)
* Aktif ihale sayısı ve yaklaşan ihale son tarihleri
* Toplam sözleşme bedeli (aktif projeler)
* Bu ayki toplam gelir ve gider
* Firma genel kar/zarar durumu (bu ay ve kümülatif)
* Tahsil edilmemiş (açık) hakediş tutarı
* Ödenmemiş taşeron/tedarikçi borcu
* Nakit pozisyonu (kasa + banka)
* Minimum stok altındaki malzeme sayısı ve uyarısı
* Aktif araç sayısı ve toplam filo maliyeti (bu ay)
* Bugünkü şantiye puantaj özeti (kaç işçi çalışıyor)
* Son eklenen gelir-gider kayıtları (son 10)
* Proje bazlı kar/zarar özet tablosu
* Aylık gelir-gider trend grafiği (çizgi veya çubuk grafik)
* Gider kategorisi dağılımı (pasta grafik)
* Proje ilerleme durumu özeti (çubuk grafik)
* İhale kazanma oranı göstergesi
* Yaklaşan ödemeler listesi (bu hafta)
* Abonelik durumu ve kalan gün bilgisi
* API kullanım özeti (bugünkü istek sayısı / limit)
* Hızlı erişim butonları (yeni gelir/gider kaydı, yeni hakediş, yeni puantaj girişi, yeni ihale)

Dashboard verileri gerçek verilerden hesaplanmalıdır.

## **14. Arayüz Tasarımı**

Modern, profesyonel ve kullanımı kolay bir arayüz oluştur.

### **Genel Tasarım İlkeleri**

* Koyu tema (dark mode) varsayılan olmalı, açık tema seçeneği ile
* Sol tarafta sabit kenar çubuğu (sidebar) navigasyonu
* Üst başlık çubuğu (arama, bildirimler, firma adı)
* Duyarlı tasarım (masaüstü ve tablet uyumlu)
* Tutarlı renk paleti ve tipografi
* Modern kart tabanlı düzen
* Anlamlı ikonlar (emoji veya SVG ikonlar)
* Yükleme durumları ve boş durum mesajları
* Form doğrulama geri bildirimleri
* Başarı ve hata bildirimleri (toast mesajları)
* Modal diyaloglar (silme onayı, hızlı düzenleme)
* Büyük tablolarda yatay kaydırma desteği
* Para birimlerinin doğru formatlanması (₺ 1.250.000,00)

### **Navigasyon Yapısı**

* 🏠 Gösterge Paneli
* 👥 Müşteriler
* 🏗️ Projeler
* 📋 İhaleler
* 👷 Taşeronlar
* 🏭 Tedarikçiler
* 📑 Hakedişler
* 💰 Gelir-Gider
* 📦 Malzeme Stok
* 👷‍♂️ Puantaj
* 🚛 Araç / Filo
* 📄 Sözleşmeler
* 💵 Nakit Akış
* 📊 Raporlar
* 💎 Abonelik
* 🔑 API Anahtarları
* ⚙️ Ayarlar

### **Raporlar Sayfası**

* Proje bazlı kar/zarar raporu
* Tarih aralığına göre gelir-gider raporu
* Taşeron cari hesap ekstresi
* Tedarikçi cari hesap ekstresi
* Malzeme tüketim raporu (proje bazlı)
* Puantaj maliyet raporu (aylık)
* Hakediş özet raporu
* Nakit akış raporu
* KDV ve stopaj özet raporu
* Proje ilerleme ve karşılaştırma raporu
* İhale kazanma oranı ve teklif analizi raporu
* Araç filo maliyet raporu (yakıt + bakım + kira)
* Müşteri bazlı gelir ve sözleşme raporu

### **Ayarlar Sayfası**

* Firma bilgileri (unvan, adres, telefon, VKN, vergi dairesi — hakediş ve fatura şablonlarında kullanılacak)
* KDV oranı ayarı (varsayılan %20)
* Stopaj oranı ayarı (varsayılan %5)
* Para birimi ve sayı formatı
* Tema seçimi (koyu/açık)
* Veri yedekleme (JSON olarak dışa aktarma)
* Veri geri yükleme (JSON dosyasından içe aktarma)
* Tüm verileri sıfırlama (onay ile)

### **Abonelik ve Paketler Sayfası**

Uygulamanın SaaS modeli ile lisanslanmasını yöneten bir modül oluştur.

Abonelik planları:

* **Deneme (Trial)**: 14 gün ücretsiz, tüm özellikler açık, 1 kullanıcı, 2 proje limiti
* **Başlangıç (Starter)**: Aylık ₺499 / Yıllık ₺4.990, 3 kullanıcı, 5 proje, temel raporlar, e-posta destek
* **Profesyonel (Pro)**: Aylık ₺999 / Yıllık ₺9.990, 10 kullanıcı, sınırsız proje, gelişmiş raporlar, API erişimi (1.000 istek/gün), öncelikli destek
* **Kurumsal (Enterprise)**: Aylık ₺2.499 / Yıllık ₺24.990, sınırsız kullanıcı, sınırsız proje, tüm özellikler, API erişimi (sınırsız), özel entegrasyon desteği, SLA garantisi

Abonelik kaydı şunları içermelidir:

* Aktif plan adı ve tipi
* Abonelik başlangıç tarihi
* Abonelik bitiş tarihi
* Ödeme periyodu (Aylık, Yıllık)
* Ödeme durumu (Aktif, Gecikmiş, İptal, Askıda)
* Kalan gün sayısı
* Kullanıcı limiti ve mevcut kullanıcı sayısı
* Proje limiti ve mevcut proje sayısı
* API istek limiti ve kullanılan miktar
* Ödeme geçmişi listesi (tarih, tutar, durum, yöntem)

Abonelik modülü şunları desteklemelidir:

* Mevcut plan bilgilerini gösterme
* Plan karşılaştırma tablosu (feature matrix)
* Plan yükseltme (upgrade) ve düşürme (downgrade)
* Ödeme geçmişi görüntüleme
* Abonelik yenileme ve iptal
* Deneme süresi dolduğunda uyarı ve yönlendirme
* Limit aşımı uyarıları (proje sayısı, kullanıcı sayısı, API kullanımı)
* Fatura oluşturma (abonelik ödemesi için)
* Kupon / indirim kodu uygulama

### **API Anahtar Yönetimi Sayfası**

Harici sistemlerle entegrasyon için API anahtar yönetim modülü oluştur.

API anahtar kaydı şunları içermelidir:

* Benzersiz anahtar ID
* Anahtar adı (kullanıcı tanımlı, örn: "Muhasebe Entegrasyonu", "Mobil Uygulama")
* API anahtarı (otomatik oluşturulan, güvenli, rastgele string — gösterildiğinde maskelenmeli)
* Gizli anahtar (secret key — yalnızca oluşturulduğunda bir kez gösterilmeli)
* Oluşturulma tarihi
* Son kullanılma tarihi (opsiyonel — süresiz veya tarihli)
* Durum (Aktif, Pasif, İptal, Süresi Dolmuş)
* İzin kapsamı (scope):
  * Okuma: Projeler, Müşteriler, Hakedişler, Stok, Raporlar
  * Yazma: Gelir-Gider Kaydı, Stok Hareketi, Puantaj Girişi
  * Yönetim: Tam erişim
* Günlük istek limiti (abonelik planına göre)
* Bugünkü kullanılan istek sayısı
* Toplam kullanılan istek sayısı (kümülatif)
* IP kısıtlaması (opsiyonel — izin verilen IP listesi)
* Son kullanım tarihi ve saati
* Notlar

API kullanım logu:

* Tarih ve saat
* Endpoint (çağrılan API yolu)
* HTTP metodu (GET, POST, PUT, DELETE)
* Yanıt durumu (200, 400, 401, 403, 429, 500)
* İstek süresi (ms)
* IP adresi

API anahtar modülü şunları desteklemelidir:

* Yeni API anahtarı oluşturma (ad, kapsam, limit seçimi ile)
* Anahtar oluşturulduğunda bir kez tam gösterim (kopyalama butonu ile)
* Oluşturulan anahtarın sonradan maskelenmiş gösterimi
* Anahtarı devre dışı bırakma (Pasif yapma)
* Anahtarı silme (onay ile, geri alınamaz)
* Anahtar bazlı kullanım istatistikleri (günlük, haftalık, aylık)
* Kullanım limiti aşımında uyarı gösterimi
* API kullanım logu görüntüleme (son 100 istek)
* API dokümantasyon sayfası (endpoint listesi, örnek istek/yanıtlar)
* Toplam API kullanım özeti (tüm anahtarlar)

## **15. Kalıcı Veri Yönetimi**

LocalStorage veya IndexedDB kullanarak tüm verileri kalıcı olarak sakla.

Saklanacak veri kümeleri:

* Müşteriler
* Projeler
* İhaleler ve ihale kalemleri
* Taşeronlar
* Tedarikçiler
* Hakedişler ve hakediş kalemleri
* Gelir-gider kayıtları
* Malzemeler ve stok hareketleri
* İşçiler ve puantaj kayıtları
* Araçlar, yakıt ve bakım kayıtları
* Sözleşmeler
* Nakit akış kayıtları
* Abonelik bilgileri ve ödeme geçmişi
* API anahtarları ve kullanım logları
* Uygulama ayarları

Veri yönetimi kuralları:

* Veriler JSON formatında saklanmalıdır
* İlişkisel bütünlük korunmalıdır (proje silinince ilişkili kayıtlara ne olacak? — uyarı ver)
* Büyük veri setleri için IndexedDB tercih edilmelidir
* LocalStorage boş veya kullanılamaz olduğunda uygulama çalışmaya devam etmelidir
* Veri dışa aktarma (backup) ve içe aktarma (restore) özelliği olmalıdır
* İlk çalıştırmada örnek demo veriler yüklenmelidir (uygulama boş açılmasın)
* Demo veriler gerçekçi olmalı: birkaç müşteri, 2-3 proje, birkaç ihale, taşeron/tedarikçi, araçlar, örnek hakedişler, gelir-gider kayıtları, aktif abonelik planı, örnek API anahtarı

# **GÖRSEL GEREKSİNİMLER**

Profesyonel ve modern bir SaaS / ERP uygulaması görünümü oluştur.

Gerekli görsel öğeler:

* Koyu tema arka plan (koyu gri / lacivert tonları)
* Aksan renkleri: turuncu (inşaat teması) ve yeşil (mali pozitif) tonları
* Kart tabanlı bileşenler (hafif gölge ve yuvarlatılmış köşeler)
* Duruma göre renkli etiketler (badge):
  * Proje: Planlama=gri, Devam=mavi, Durduruldu=turuncu, Tamamlandı=yeşil, İptal=kırmızı
  * Hakediş: Taslak=gri, Onay Bekliyor=sarı, Onaylandı=mavi, Ödendi=yeşil, Reddedildi=kırmızı
  * İhale: Araştırılıyor=gri, Hazırlanıyor=mavi, Teklif Verildi=sarı, Kazanıldı=yeşil, Kaybedildi=kırmızı
  * Araç: Aktif=yeşil, Bakımda=sarı, Arızalı=kırmızı, Pasif=gri
  * Abonelik: Aktif=yeşil, Gecikmiş=turuncu, İptal=kırmızı
  * API Anahtar: Aktif=yeşil, Pasif=gri, Süresi Dolmuş=kırmızı
  * Gelir=yeşil arka plan, Gider=kırmızı arka plan
* Modern tipografi (Google Fonts: Inter veya Roboto)
* Tablo satırlarında hover efekti
* Butonlarda tıklama ve hover animasyonları
* Sayfa geçişlerinde yumuşak animasyonlar
* Boş durum mesajları
* Form alanlarında odaklanma (focus) stilleri
* Yükleme göstergeleri (spinner veya skeleton)
* Responsive grid sistemi
* Profesyonel hakediş yazdırma şablonu
* Sidebar'da aktif sayfa vurgulama
* Dashboard kartlarında renkli ikonlar ve büyük rakamlar
* Grafiklerde inşaat temasına uygun renk paleti
* Para tutarlarında yeşil (gelir) ve kırmızı (gider) renk kodlaması

Ortamı, normal masaüstü tarayıcıda sorunsuz çalışacak şekilde optimize et.

Aşırı görsel detay uğruna uygulama kararlılığını feda etme.

# **KOD MİMARİSİ**

Kodu net modüller halinde organize et.

Önerilen sorumluluklar:

* Uygulama başlatma (App bootstrap)
* Yönlendirme (Router)
* Sayfa bileşenleri (Pages — Dashboard, Müşteriler, Projeler, İhaleler, Taşeronlar, Tedarikçiler, Hakedişler, GelirGider, Stok, Puantaj, AraçFilo, Sözleşmeler, NakitAkış, Raporlar, Abonelik, APIAnahtarları, Ayarlar)
* Ortak UI bileşenleri (Components — Button, Modal, Table, Card, Badge, Input, Select, DatePicker, TextArea, Tabs, Pagination, Toast, EmptyState, vb.)
* Veri modelleri ve tipleri (Types/Models)
* Veri katmanı / servis modülleri (Services — CRUD işlemleri, hesaplama mantıkları)
* Depolama yöneticisi (StorageManager — LocalStorage/IndexedDB soyutlaması)
* Durum yönetimi (State management — Context API veya basit store)
* Yardımcı fonksiyonlar (Utils — tarih formatlama, para formatlama, VKN doğrulama, plaka doğrulama, yüzde hesaplama)
* Muhasebe hesaplama modülü (AccountingUtils — KDV, stopaj, bakiye, kar/zarar hesaplamaları)
* Hook'lar (Custom Hooks — useProjects, useCustomers, useTenders, useFleet, useAccounting, useSubscription, vb.)
* Abonelik ve lisans yönetimi modülü (SubscriptionManager — plan kontrolleri, limit doğrulama)
* API anahtar yönetimi modülü (APIKeyManager — oluşturma, doğrulama, kullanım takibi)
* Sabit değerler ve yapılandırma (Constants/Config — kategoriler, birimler, varsayılan oranlar, plan tanımları)
* Demo veri üretici (Seed Data)

Tüm projeyi tek bir dosyaya koymaktan kaçın.

Büyük sistemler için TypeScript tipleri kullan.

Açık adlandırma ve karmaşık mantık için kısa açıklamalar kullan.

# **TEST GEREKSİNİMLERİ**

Render gerektirmeden test edilebilecek mantık için otomatik testler oluştur.

En azından şunları test et:

* Müşteri CRUD işlemleri ve cari hesap bakiyesi
* Proje CRUD işlemleri
* İhale durum geçiş kuralları (geçersiz geçişler engellenmeli)
* İhale kalem toplam hesaplaması
* Kazanılan ihaleden proje oluşturma
* Taşeron-proje ilişki bütünlüğü
* Hakediş kümülatif hesaplaması (önceki hakedişleri doğru dikkate alması)
* Hakediş durum geçiş kuralları (geçersiz geçişler engellenmeli)
* Stopaj ve KDV hesaplaması
* Gelir-gider kaydı sonrası cari hesap bakiyesi güncellemesi
* Stok giriş-çıkış sonrası miktar doğruluğu
* Puantaj günlük tutar hesaplaması (normal + fazla mesai)
* Araç yakıt tüketim ve maliyet hesaplaması
* Nakit akış bakiyesi hesaplaması
* VKN format doğrulaması
* Plaka format doğrulaması
* Para tutarı formatlama (₺ 1.250.000,00)
* Tarih aralığı filtreleme fonksiyonları
* Proje kar/zarar hesaplaması
* Abonelik plan limiti kontrolleri (proje sayısı, kullanıcı sayısı)
* API anahtar oluşturma ve maskeleme
* API günlük istek limiti kontrolü

Ayrıca manuel çalışma zamanı kontrolleri yap.

Doğrula:

* Geliştirme sunucusu başlıyor.
* Proje başarıyla derleniyor.
* Uygulama kritik konsol hataları olmadan yükleniyor.
* Dashboard doğru verilerle ve grafiklerle açılıyor.
* Müşteri eklenebiliyor, düzenlenebiliyor ve aranabiliyor.
* Yeni proje oluşturulabiliyor ve müşteriye bağlanabiliyor.
* İhale kaydı oluşturulabiliyor, kalemler eklenebiliyor.
* İhale durumu güncellenebiliyor ve kazanılan ihaleden proje oluşturulabiliyor.
* Taşeron ve tedarikçi eklenebiliyor.
* Hakediş oluşturulabiliyor ve kalemler eklenebiliyor.
* Hakediş kümülatif hesaplaması doğru çalışıyor.
* Hakediş durumu güncellenebiliyor.
* Gelir ve gider kaydı eklenebiliyor.
* Cari hesap bakiyeleri doğru hesaplanıyor.
* Malzeme stok giriş/çıkışı yapılabiliyor.
* Stok miktarı doğru güncelleniyor.
* Puantaj girişi yapılabiliyor.
* İşçi maliyet hesaplaması doğru.
* Araç eklenebiliyor, yakıt ve bakım kaydı girilebiliyor.
* Araç maliyet raporu doğru hesaplanıyor.
* Sözleşme eklenebiliyor ve ilerleme görünüyor.
* Raporlar doğru verilerle oluşuyor.
* Abonelik planı görüntülenebiliyor ve değiştirilebiliyor.
* Plan limitleri doğru kontrol ediliyor.
* API anahtarı oluşturulabiliyor ve yönetilebiliyor.
* API kullanım istatistikleri görüntülenebiliyor.
* Arama ve filtreleme tüm modüllerde çalışıyor.
* Sayfa yenilendikten sonra tüm veriler korunuyor.
* Tema değiştirme çalışıyor.
* Veri dışa aktarma ve içe aktarma çalışıyor.
* Demo veriler ilk açılışta yükleniyor.
* Hakediş yazdırma görünümü profesyonel görünüyor.
* Responsive tasarım tablet boyutunda düzgün görünüyor.

Projeyi tamamlanmış ilan etmeden önce üretim derlemesini çalıştır.

# **PERFORMANS GEREKSİNİMLERİ**

Sorunsuz masaüstü tarayıcı performansı hedefle.

Şunlarla optimize et:

* Büyük listelerde sayfalama (pagination) veya sanal kaydırma
* Gereksiz yeniden render'ları önleme (React.memo, useMemo, useCallback)
* Arama işlemlerinde debounce kullanma
* Grafik bileşenlerinin lazy loading ile yüklenmesi
* CSS animasyonlarının GPU hızlandırmalı olması (transform, opacity)
* Olay dinleyicilerinin ve zamanlayıcıların temizlenmesi
* Büyük veri setlerinin verimli filtrelenmesi
* Sayfa bileşenlerinin lazy loading (tembel yükleme) ile yüklenmesi
* Muhasebe hesaplamalarının önbelleğe alınması (memoization)
* IndexedDB işlemlerinin asenkron yapılması

# **YOUTUBE VİDEOSU İÇİN GELİŞTİRME**

Bu proje, ham yapay zeka kodlama sürecini gösteren bir YouTube videosu için kullanılacaktır.

İlerlemeyi gözlemlemeyi kolaylaştır.

Geliştirme sırasında:

* Her uygulama aşamasını net olarak duyur.
* Ne değiştirmek üzere olduğunu kısaca belirt.
* Bir hata oluştuğunda, düzeltmeden önce kök nedenini açıkla.
* Başarısızlıkları gizleme.
* Anlamlı ilerlemeyi `GELISTIRME_RAPORU.md` dosyasında koru.
* Terminal çıktısını anlaşılır tut.
* Sonunda, ne inşa edildiğine dair kısa bir özet sun.

Aşırı anlatıma zaman harcama. Uygulamaya öncelik ver.

# **UYGULAMA AŞAMALARI**

Teknik bir bağımlılık küçük bir ayarlama gerektirmedikçe bu sırayı izle.

## **Aşama 1 — Temel Yapı**

* Ortamı incele
* Plan oluştur
* Vite ve TypeScript ile projeyi başlat
* React ve gerekli bağımlılıkları kur
* Proje yapısını oluştur
* Temel sayfa iskeletini ve yönlendirmeyi kur
* Geliştirme sunucusu ve üretim derlemesini doğrula

## **Aşama 2 — Veri Katmanı ve Modeller**

* TypeScript veri modellerini tanımla (Müşteri, Proje, İhale, Taşeron, Tedarikçi, Hakediş, GelirGider, Malzeme, İşçi, Puantaj, Araç, Sözleşme, NakitAkış, Abonelik, APIAnahtar)
* Depolama yöneticisini oluştur (LocalStorage/IndexedDB)
* CRUD servis modüllerini oluştur
* Muhasebe hesaplama yardımcılarını oluştur (KDV, stopaj, bakiye, kümülatif hakediş)
* Abonelik plan tanımları ve limit kontrol mantığını oluştur
* API anahtar oluşturma ve doğrulama mantığını oluştur
* Demo başlangıç verilerini oluştur (müşteriler, 2-3 gerçekçi proje, ihaleler, araçlar, aktif abonelik, örnek API anahtarı ile)
* Veri ilişkilerini kur (müşteri → proje → taşeron → hakediş → gelir-gider)
* Veri dışa/içe aktarma fonksiyonlarını ekle

## **Aşama 3 — Ortak UI Bileşenleri**

* Tasarım sistemi ve tema ayarları (koyu/açık tema)
* Sidebar navigasyon bileşeni
* Üst başlık çubuğu
* Tablo bileşeni (sıralama, sayfalama, yatay kaydırma)
* Form bileşenleri (Input, Select, DatePicker, TextArea, CurrencyInput)
* Modal diyalog bileşeni
* Toast bildirim sistemi
* Kart bileşeni
* Badge (durum etiketi) bileşeni
* Tabs (sekme) bileşeni
* Boş durum bileşeni
* Yükleme göstergesi
* Para formatı bileşeni

## **Aşama 4 — Müşteri, Proje, İhale, Taşeron ve Tedarikçi Modülleri**

* Müşteri listesi ve detay sayfası
* Müşteri ekleme/düzenleme formu
* Müşteri cari hesap ekstresi
* Proje listesi ve detay sayfası
* Proje ekleme/düzenleme formu (müşteriye bağlı)
* İhale listesi ve detay sayfası
* İhale oluşturma formu (kalemler ile)
* İhale durumu güncelleme ve ihaleden proje oluşturma
* Taşeron listesi ve detay sayfası
* Taşeron ekleme/düzenleme formu
* Tedarikçi listesi ve detay sayfası
* Tedarikçi ekleme/düzenleme formu
* İlişkilendirme ve cari hesap bakiyesi
* Arama ve filtreleme

## **Aşama 5 — Hakediş ve Muhasebe Modülleri**

* Hakediş listesi sayfası
* Hakediş oluşturma formu (kalemler ile)
* Hakediş detay sayfası
* Kümülatif hesaplama mantığı
* Stopaj ve KDV hesaplaması
* Durum güncelleme (geçiş kuralları ile)
* Hakediş yazdırma şablonu
* Gelir-gider kayıt ekleme sayfası
* Gelir-gider listesi ve filtreleme
* Cari hesap ekstresi

## **Aşama 6 — Stok, Puantaj, Araç Filo ve Sözleşme Modülleri**

* Malzeme tanımlama ve stok listesi
* Stok giriş/çıkış/transfer işlemleri
* Minimum stok uyarıları
* İşçi kaydı ekleme/düzenleme
* Puantaj giriş ekranı (günlük toplu giriş)
* Puantaj takvim ve özet görünümü
* Araç ekleme ve düzenleme
* Yakıt ve bakım kaydı ekleme
* Araç-proje atama
* Filo özet tablosu ve maliyet raporu
* Sözleşme ekleme ve detay sayfası
* Sözleşme ilerleme takibi

## **Aşama 7 — Nakit Akış, Dashboard ve Raporlar**

* Nakit akış tablosu ve projeksiyon
* Gösterge paneli istatistik kartları
* Grafik bileşenleri (Chart.js/Recharts)
* Gelir-gider trend grafiği
* Gider dağılım pasta grafiği
* Proje ilerleme grafiği
* Raporlar sayfası (tüm rapor türleri)
* Hızlı erişim butonları

## **Aşama 7.5 — Abonelik ve API Anahtar Modülleri**

* Abonelik planları tanımlama ve karşılaştırma tablosu
* Aktif plan bilgisi gösterimi
* Plan yükseltme/düşürme işlemi
* Ödeme geçmişi
* Limit kontrol entegrasyonu (proje sayısı, API kullanımı)
* API anahtar oluşturma sayfası
* Anahtar listesi ve yönetimi
* Kullanım istatistikleri
* API dokümantasyon sayfası

## **Aşama 8 — Cilalama ve QA**

* Tema değiştirme (koyu/açık)
* Ayarlar sayfası (firma bilgileri, oranlar, yedekleme)
* Responsive tasarım iyileştirmeleri
* Animasyonlar ve geçişler
* Otomatik testleri çalıştır
* Üretim derlemesini çalıştır
* Çalışma zamanı hatalarını incele
* Tam bir iş akışını test et (müşteri → ihale → proje → taşeron → hakediş → ödeme → cari hesap)
* Araç filo iş akışını test et (araç → yakıt → bakım → maliyet raporu)
* Abonelik iş akışını test et (plan seçimi → limit kontrolü → yükseltme)
* API anahtar iş akışını test et (oluşturma → kullanım → limit → devre dışı bırakma)
* Muhasebe hesaplamalarını doğrula
* Veri yedekleme/geri yükleme test et
* Sayfa yenilemesinde veri kalıcılığını test et
* Kritik ve yüksek öncelikli sorunları düzelt

# **TAMAMLANMA TANIMI**

Aşağıdakiler sağlanmadıkça görevi tamamlanmış kabul etme:

* Uygulama çalışan ve doğru verilerle dolu bir dashboard ile açılıyor.
* Müşteri eklenebiliyor, düzenlenebiliyor, aranabiliyor ve cari hesap görüntülenebiliyor.
* Proje oluşturulabiliyor, düzenlenebiliyor, müşteriye bağlanabiliyor ve aranabiliyor.
* İhale kaydı oluşturulabiliyor, kalemler eklenebiliyor ve durumu güncellenebiliyor.
* Kazanılan ihaleden otomatik proje oluşturulabiliyor.
* Taşeron ve tedarikçi eklenebiliyor ve yönetilebiliyor.
* Hakediş oluşturulabiliyor, kalemler eklenebiliyor ve kümülatif hesaplama doğru çalışıyor.
* Hakediş durum geçiş kuralları doğru çalışıyor.
* Stopaj ve KDV doğru hesaplanıyor.
* Hakediş yazdırma görünümü profesyonel görünüyor.
* Gelir-gider kaydı eklenebiliyor ve cari hesap bakiyeleri doğru güncelleniyor.
* Proje bazlı kar/zarar hesaplaması doğru çalışıyor.
* Malzeme stok yönetimi çalışıyor (tanımlama, giriş, çıkış, uyarı).
* Puantaj girişi yapılabiliyor ve maliyet hesaplanıyor.
* Araç eklenebiliyor, yakıt ve bakım kaydı girilebiliyor.
* Araç filo maliyet raporu doğru hesaplanıyor.
* Sigorta/muayene/kira bitiş uyarıları çalışıyor.
* Sözleşme kaydı ve ilerleme takibi çalışıyor.
* Abonelik planı görüntülenebiliyor ve plan değiştirilebiliyor.
* Plan limitleri (proje, kullanıcı, API) doğru kontrol ediliyor.
* API anahtarı oluşturulabiliyor, maskeleniyor ve yönetilebiliyor.
* API kullanım istatistikleri ve limit kontrolü çalışıyor.
* Dashboard gerçek verilerle doğru istatistikler ve grafikler gösteriyor.
* Raporlar doğru verilerle oluşuyor.
* Arama ve filtreleme tüm modüllerde çalışıyor.
* Sayfa yenilendikten sonra tüm veriler korunuyor.
* Tema değiştirme çalışıyor.
* Veri dışa aktarma ve içe aktarma çalışıyor.
* Demo veriler ilk açılışta yükleniyor.
* Para tutarları doğru formatlanıyor (₺).
* Proje kritik hata olmadan derleniyor.
* Temel mantık testleri geçiyor.
* Uygulama profesyonel ve modern bir ERP/muhasebe yazılımı gibi görünüyor.
* `GELISTIRME_RAPORU.md` dürüst bir son rapor içeriyor.

# **SON YANIT FORMATI**

Projeyi tamamladıktan sonra şunları sun:

1. Son uygulamanın kısa bir özeti
2. Kullanılan teknoloji yığını
3. Uygulanan modüller ve özellikler
4. Karşılaşılan önemli sorunlar ve nasıl çözüldükleri
5. Yapılan otomatik ve manuel testler
6. Bilinen sınırlamalar
7. Projeyi çalıştırmak için gereken komutlar
8. Üretim derleme sonucu
9. Gereken yaklaşık insan müdahalesi
10. `GELISTIRME_RAPORU.md` dosyasının tam konumu

Mevcut dizini inceleyerek ve kısa bir uygulama planı sunarak başla.

Ardından derhal uygulamaya geç.
