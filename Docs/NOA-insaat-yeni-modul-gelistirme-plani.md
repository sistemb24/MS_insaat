# NOA İnşaat SaaS — Yeni Modüller Geliştirme Planı

> Oluşturulma tarihi: 28.06.2026
> Son yalın plan revizyonu: 14.07.2026
> Baz plan: `NOA-insaat-on-muhasebe-saas-analiz-ve-gelistirme-plani.md` (dokunulmadı)
> Ekran görüntüsü kaynağı: `C:\Users\SisteM\Pictures\Screenshots\Parsek-insaat`
> Ana NOA iş akışı ekran havuzu: `D:\Projeler\NOA-InsaatYonetim\NOA-insaat-SS görseller`
> Ana ilke: Mevcut iş akışı korunur; sayfalar arası uyum sağlanır; yalnızca yeni modüller kapsamında uygulanır.

---

## 1. Bu Belgenin Amacı ve Kapsamı

Bu belge, **mevcut P0/P1/P2 geliştirme planında yer almayan veya yalnızca kısa bir not olarak geçen** ancak Parsek ERP ekran görüntüleri incelenerek proje için değerli görülen yeni modüllerin tam tasarım ve geliştirme planıdır.

**Mevcut planla ilişki:**
- Mevcut plan (analiz-ve-gelistirme-plani.md) **hiç değiştirilmedi**.
- Bu yeni plan, mevcut planın **üzerine eklenen, onu tamamlayan** ikinci katmandır.
- Mevcut plandaki platform standartları (liste standardı, form standardı, finansal form standardı, design system, audit log, tenant izolasyonu) tam geçerlidir.
- Buradaki her modül, mevcut plan bölüm 7'deki platform standartlarına uymalıdır.

---

## 2. Parsek Ekran Görüntüsü Analiz Özeti

### 2.1 İncelenen Klasörler

| Klasör | Dosya Sayısı | İçerik Özeti |
|---|---|---|
| `Firmalar` | 14 görsel + 3 xlsx | Dashboard, Müşteriler, Taşeronlar, Tedarikçiler |
| `İhale Yönetimi` | 5 görsel | Liste + analiz panosu, Yeni İhale (3 sekme) |
| `Döküman Yönetimi` | 6 görsel | Klasör ağacı, liste/ızgara, yükleme, filtreler |
| `Ayarlar` | 36 görsel | Firma Bilgileri, Kullanıcılar, Roller, Denetim, Finans, Banka, Bildirimler, Arvento |
| `Parsek` | 18 görsel | API Dokümantasyonu, Abonelik paketleri |
| `NOA-insaat-SS görseller` | 162 görsel | Ana Sayfa, toolbar/ribbon, menü çubuğu, tanımlar, hareketler, raporlar, parametreler ve modül bazlı NOA iş akışları |

### 2.2 Temel Gözlemler

**Firmalar:** Taşeron kartında Sözleşme No/Başlangıç/Bitiş alanları; Tedarikçide Kategori alanı; tüm cari kartlarda 3 adımlı Excel içe aktar (Şablon & Yükle → Önizleme → Sonuç).

**İhale Yönetimi:** Analiz panosu (Kazanma Oranı, Toplam, Kazanılan Değer, Sözleşme Bedeli); liste durum sayaçları (Takip/Hazırlanıyor/Sunuldu/Kazanıldı/Kaybedildi/İptal); BOQ/Poz sekmesi (Poz, Birim, Miktar, Malzeme, İşçilik, Ekipman, Taşeron, Nakliye); Karlılık Simülasyonu.

**Döküman Yönetimi:** 13 sistem klasörü (SİSTEM rozeti); ızgara/liste görünüm; dosya türü filtresi; 5MB limit; Yıldızlı/Son Kullanılan/Çöp Kutusu sekmeleri; klasör bazlı yetki.

**Ayarlar:** Lokasyon tipleri (Şube/Şantiye/Ofis/Merkez); kullanıcı tipleri (Lokasyona Bağlı/RBAC/İSG/Admin); rol izin matrisi; denetim günlüğü tam modül listesi; Finans Ayarları (KDV modu, döviz); Banka Entegrasyonu (7 banka, Open Banking rıza No); Bildirim kategorileri (13 kategori); Arvento Filo Takip (GPS, CANbus/OBD).

**Parsek Paketleri:** Basic $25, Standart $45, Professional $89, Ultimate $134, Enterprise $178.

---

## 3. Yeni Modüller: Öncelik Haritası

| Yeni Modül | Mevcut Plandaki Durumu | Bu Plan |
|---|---|---|
| Firmalar Dashboard | Yok | P1 |
| Cari Kart — Müşteri tipi | P1 başlangıç kartı uygulandı | P1 |
| Taşeron — Sözleşme Bilgileri | Uygulandı | P0 eki |
| Tedarikçi — Kategori | Uygulandı | P0 eki |
| Excel ile Toplu İçe Aktar | Native XLSX şablon + temel XLSX önizleme/import başladı | P1 |
| İhale Yönetimi (tam) | Kısa not | P1 |
| BOQ/Poz Cetveli | Yok | P1 |
| Karlılık Simülasyonu | Yok | P1 |
| Döküman / Evrak Merkezi | Kısa not | P1 |
| Sistem Klasörleri | Yok | P1 |
| Lokasyon Yönetimi ayarı | P0 sözleşmesi uygulandı | P0 eki |
| Kullanıcı Tipleri (İSG vb.) | Yok | P1 |
| Rol Kaynak-Aksiyon Matrisi UI | P0 salt-okunur uygulandı | P0 eki |
| Finans Ayarları KDV detayı | P0 sözleşmesi uygulandı | P0 eki |
| Bildirim Ayarları (kategori) | Kısa not | P1 |
| Banka Entegrasyonu | Kısa not | P2 |
| Arvento Filo Takip | P2 araçlar | P2 |
| Abonelik / Paket Yönetimi | Kısa not | P2 |
| API Altyapısı | Yok | P2 |

## 3A. Yalın Yürütme Özeti ve 14.07.2026 Revizyonu

Bu bölüm, uzun uygulama kayıtlarından bağımsız olarak **hangi hattın tamamlandığını, hangi sınırın bilinçli ertelendiğini ve sıradaki kararın ne olduğunu** gösteren tek sayfalık yürütme özetidir. Ayrıntılı `Uygulama durumu` kayıtları tarihçe ve kanıt olarak korunur; sıradaki iş seçimi bu bölümden yapılır.

| Hat | Yalın durum | Revizyon kararı |
|---|---|---|
| P0 ekleri | Tamamlandı | Temel tenant/firma/dönem, ayarlar, finans KDV, rol matrisi ve audit sözleşmesi korunur. |
| P1 modülleri | Çekirdek yüzeyler çalışıyor | Müşteri, dashboard, ihale/BOQ, doküman, bildirim ve kullanıcı akışları mevcut; gelişmiş XLSX eşleme, bulut storage, gerçek e-posta teslimatı ve granular RBAC ayrı backlog'da tutulur. |
| P2-S1 Banka/Ledger | Sandbox banka hattı + tam ledger çekirdeği çalışıyor | Gerçek Open Banking ve worker açılmaz; `BankLedgerEntry` köprüsü ile `LedgerEntry/LedgerLine` muhasebe çekirdeği ayrı sorumluluklarda korunur. |
| P2-S2 Abonelik | Sandbox ve enforcement çalışıyor | Gerçek ödeme sağlayıcısı, canlı tahsilat ve dış webhook doğrulaması açılmaz. |
| P2-S3 Araç/Filo | Kalıcı araç kartı yaşam döngüsü ve sandbox takip read-model'i çalışıyor | Oluşturma, düzenleme, pasife alma ve tekrar aktifleştirme tamamdır; gerçek Arvento/GPS/CANbus erişimi açılmaz. |
| P2-S4 API | Salt-okunur faz kapalı | 30 scope, route filtreleri, Bearer guard ve tenant izolasyonu tamamdır; yeni endpoint eklenmez. |

### Yalın yürütme sırası

1. **Plan kapısı:** Önce bu bölümdeki durum, öncelik ve ertelenen sınırlar güncellenir.
2. **Sağlık kapısı:** `npm test`, `npm run type-check`, `npm run db:validate`, `npm run lint` ve `npm run build` birlikte yeşil olmadan yeni ayrıntı dilimine geçilmez.
3. **Tek sonraki dilim:** Sağlık kapısından sonra yalnız bir küçük, gerçek iş akışı eksikliği seçilir; sayaç/rozet/etiket zinciri tek başına yeni dilim sayılmaz.
4. **Detay backlog'u:** Gerçek dış entegrasyon ve gelişmiş UX maddeleri planın ana sırasını değiştirmeden ilgili modül altında tutulur; RBAC ve tam muhasebe çekirdeği tamamlanmış kabul edilir.

### Sıradaki yalın dilim ve çekirdek backlog

1. **Tamamlandı — cari karttan tahsilat/ödeme:** Seçili müşteri, tedarikçi veya taşeron kartından mevcut `CashBankMovement` altyapısına doğrudan tahsilat/ödeme kaydı açılır; action doğrulaması ve UI testi vardır. Ayrı borç/alacak muhasebe çekirdeği açılmadı.
2. **Tamamlandı — araç uygunluk bildirimleri:** Kalıcı aktif araçların sigorta, muayene ve bakım tarihleri mevcut Bildirim Merkezi read-model'ine bağlandı; dış Arvento çağrısı veya otomatik görev açılmadı.
3. **Tamamlandı — kullanıcı klasörü yaşam döngüsü:** Döküman Merkezi'ndeki kullanıcı klasörleri oluşturma, boş klasör silme ve yeniden adlandırma akışlarına; sistem, dolu klasör ve duplicate ad guard'larıyla bağlandı.
4. **Tamamlandı — RBAC ve ledger çekirdeği:** Ortak izin sözleşmesi, çift taraflı `LedgerEntry/LedgerLine` kalıcılığı, dengeli fiş/post, dönem kapatma-açma, audit, mizan, CSV ve özel `ledger` scope korumalı read-model birlikte çalışıyor.
5. **Tamamlandı — P0 şantiye finans analizi:** `/santiyeler` genel kart fallback’inden özel çalışma alanına taşındı; scoped hakediş ve satış faturası geliri ile gider, alış faturası ve taşeron/tedarikçi hakediş maliyetleri şantiye kodunda birleşerek toplam ve net sonucu gösteriyor, iptal kayıtları hesaba alınmıyor.
6. **Tamamlandı — P0/P1 cari yönetim özeti:** `/tedarikciler`, `/taseronlar` ve `/musteriler` genel tanım kabuğundan ortak cari çalışma alanına taşındı; dönem hareketlerinden toplam alacak, borç, hareket sayısı ve cari bazlı bakiye üretilirken mevcut kart, ekstre ve tahsilat/ödeme akışları korunuyor.
7. **Tamamlandı — P0 satış faturası:** Ayrı Prisma kalıcılığı, müşteri doğrulaması, taslak/kesinleştirme/iptal yaşam döngüsü, audit, Faturalar sekmesi ve yazdırılabilir PDF önizlemesi hazır; kesinleşen satışlar müşteri alacağına, şantiye gelirine ve raporlara yansıyor.
8. **Tamamlandı — P0 alış irsaliyesi:** Ayrı Prisma kalıcılığı, taslak/kesinleştirme/iptal yaşam döngüsü, alış faturası satır devri, audit ve Faturalar sekmesi hazır; kesinleşen irsaliye stok girişine ve irsaliye raporuna yansıyor, bağlı fatura ile çift stok girişi engelleniyor.
9. **Tamamlandı — P0 personel zimmeti:** Personel bazlı KKD, ekipman, elektronik ve demirbaş kalıcılığı; aktif personel/seri no doğrulaması, iade hedefi, iade/kayıp/kullanılamaz yaşam döngüsü, audit ve Personel çalışma alanı hazır.
10. **Tamamlandı — P0 normalize stok hareketi:** `StockMovement` kalıcılığıyla depolar arası transfer ve şantiye çıkışı; taslak/kesinleştirme/iptal yaşam döngüsü, kaynak bakiye koruması ve audit ile çalışıyor. Fatura, irsaliye ve manuel hareketler tek giriş/çıkış/bakiye read-model'inde birleşiyor; CSV ve minimum stok bildirimi mevcut bakiyeyi kullanıyor.

### 14.07.2026 yalın revizyon kaydı

- Lint'teki üç kullanılmayan seed importu temizlendi; proje sağlık kapısı uyarısız hale geldi.
- P2-S1 banka entegrasyon hattının sınırı netleştirildi: bağlantı/senkronizasyon/eşleştirme, recovery görünürlüğü ve mutabakat kontrolleri çalışır; gerçek banka erişimi ertelenir. Bağımsız çift taraflı `LedgerEntry/LedgerLine` muhasebe çekirdeği tamamlanmıştır.
- Planın sonundaki ayrıntılı uygulama kayıtları tarihçe olarak korunur; yeni mikro görünürlük maddeleri yalın yürütme özetine taşınmadan ana öncelik kabul edilmez.


---

## 4. P0 Ekleri — Mevcut Çekirdeğe Eklenen Alanlar

Bu başlık altındakiler bağımsız yeni modül değil, mevcut P0 modüllerinde tespit edilen eksik alan ve davranışlardır.

### 4.1 Taşeron Kartı — Sözleşme Bilgileri

**Kanıt:** `Firmalar/Firmalar-Taşeronlar-Yeni Taşeron-02.png`

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `contractNo` | string | Hayır | Sözleşme numarası (SZL-2025-001) |
| `contractStartDate` | date | Hayır | Sözleşme başlangıç tarihi |
| `contractEndDate` | date | Hayır | Sözleşme bitiş tarihi |

Sözleşme bitiş tarihi yaklaşınca "Sözleşme Yönetimi" kategorisinden bildirim üretilir.

**Uygulama notu:** P0 tanımlar standardında `src/lib/entities.ts` taşeron kartı için `contractNo`, `contractStartDate` ve `contractEndDate` kolonlarını taşır. Bu alanlar ortak liste/form/CSV ve Prisma JSON payload hattından otomatik geçer; bildirim üretimi P1 bildirim merkezi dilimine bırakılmıştır.

### 4.2 Tedarikçi Kartı — Kategori

**Kanıt:** `Firmalar/Firmalar-Tedarikçiler-Yeni Tedarikçi-01.png`

| Alan | Tip | Açıklama |
|---|---|---|
| `category` | string (lookup) | Yemek Servisi, Malzeme, Ekipman, Nakliye, Hizmet vb. |

**Uygulama notu:** P0 tanımlar standardında `src/lib/entities.ts` tedarikçi kartı için `category` kolonunu taşır. İlk örnek kategori `Malzeme` olarak gelir; lookup sözlüğü ve toplu içe aktar şablonu P1 cari kart genişletmesine bırakılmıştır.

### 4.3 Lokasyon Yönetimi — Firma Bilgileri Ayarı

**Kanıt:** `Ayarlar/Ayarlar-Firma Bilgileri-01.png` → `03.png`

Lokasyon tipleri: **Şube** (farklı şehirler), **Şantiye** (inşaat projeleri/sahalar), **Ofis** (yönetim birimleri), **Merkez** (ana merkez, otomatik).

Eklenecek ayar: `CompanySettings.locationMode = "centralized" | "multi-location"`

NOA şantiye bazlı çalıştığından başlangıç değeri `multi-location`. P0'da yalnızca `multi-location` desteklenir ama alan veri modelinde bulunmalıdır.

> **Önemli Uyarı (Parsek'ten):** Lokasyon modunu değiştirmek tüm kullanıcıları ve kayıtları etkiler.

**Uygulama notu:** P0 ayarlar sözleşmesinde `src/lib/settings-contract.ts` `company.locationMode = "multi-location"` değerini ve desteklenen tipleri (`Merkez`, `Şantiye`, `Şube`, `Ofis`) taşır. Ayarlar ekranı bu değeri görünür fakat kilitli gösterir; lokasyon modu değiştirme ve kullanıcı/kayıt etkisi uyarıları kalıcı ayar servisi dilimine bırakılmıştır.

### 4.4 Finans Ayarları — KDV Modu ve Çoklu Döviz

**Kanıt:** `Ayarlar/Ayarlar-Finans Ayarlari.png`

| Ayar | Alan | Varsayılan | Öncelik |
|---|---|---|---|
| Baz Para Birimi | `baseCurrency` | TRY | P0 |
| Çoklu Dövize İzin Ver | `multiCurrencyEnabled` | false | P0 (P1'de aktif) |
| Varsayılan KDV Oranı | `defaultVatRate` | %20 | P0 |
| KDV Modu | `vatMode` | "excluded" | P0 |
| KDV Dağılımı Göster | `showVatBreakdown` | true | P0 |

**Uygulama notu:** P0 ayarlar sözleşmesinde `financePolicyRows` artık KDV ve döviz davranışını makine tarafından okunabilir satırlar olarak taşır. `/ayarlar` ekranındaki `P0 Finans KDV Detayları` tablosu `defaultVatRate`, `vatMode`, `showVatBreakdown` ve `multiCurrencyEnabled` alanlarının kullanıcıya görünen değerini ve işlem ekranlarına etkisini birlikte gösterir. Alış faturası ve hakediş yeni satır varsayımı `%20`, hesaplama modu `KDV hariç`, KDV dağılımı aktif ve P0 işlem para birimi `TL` sınırı korunur; kalıcı finans ayarı yazımı sonraki ayar servisi dilimine bırakılmıştır.

### 4.5 Rol Yönetimi — Kaynak-Aksiyon Matrisi UI

**Kanıt:** `Ayarlar/Ayarlar-Rol Yönetimi-01.png` → `15.png`

Her modül-kaynak için kolon yapısı: **Oluştur | Sil | Düzenle | Görüntüle | [Özel Aksiyonlar]**

Özel aksiyon örnekleri (Parsek'ten): `early_close` (Ödemeleri erken kapat), `pay` (Ödeme yap), `approve` (Masrafları onayla).

Rol oluşturma formunda `Rol Adı` + `Açıklama` + İzinler matrisi. Modül grupları: Şube Giderleri, Firmalar, Cari İşlemler, Dashboard vb.

**Uygulama notu:** P0 ayarlar sözleşmesinde `src/lib/settings-contract.ts` `rolePermissionRows` alanı ile kaynak-aksiyon matrisi taşınır. `/ayarlar` ekranı bunu `P0 Kaynak-Aksiyon Matrisi` tablosunda `Oluştur`, `Sil`, `Düzenle`, `Görüntüle` ve `Özel Aksiyonlar` kolonlarıyla salt okunur gösterir. Kalıcı rol oluşturma/düzenleme ve server action authorization enforcement ayrı güvenlik servisi dilimine bırakılmıştır.

---

## 5. P1 Yeni Modül: Firmalar Dashboard

### 5.1 Modül Amacı

**Kanıt:** `Firmalar/Firmalar-Dashboard-01.png`, `Firmalar-Dashboard-02.png`

Tedarikçi, taşeron ve müşteri ilişkilerinin birleşik analiz panelidir. Mevcut planda şantiye/taşeron/tedarikçi ayrı ayrı modül; bu dashboard bunların analitik katmanını ekliyor.

### 5.2 Dashboard Kartları

| Kart | Metrik | Dönem Filtresi |
|---|---|---|
| Toplam Firma | Tüm cari kartlar | — |
| Taşeronlar | Toplam sayı | — |
| Müşteriler | Toplam sayı | — |
| Tedarikçiler | Toplam sayı | — |
| Taşeron Ödemeleri | Dönem toplamı | Bugün/Hafta/Ay/Yıl |
| Müşteri Tahsilatı | Dönem toplamı | Bugün/Hafta/Ay/Yıl |
| Tedarikçi Ödemeleri | Dönem toplamı | Bugün/Hafta/Ay/Yıl |
| Net Nakit Akışı | Tahsilat − Ödeme | Dönemsel |
| Firma Tipi Dağılımı | Pasta grafik | — |
| Aylık Yeni Firma Trendi | Bar grafik (6 ay) | — |
| En Aktif Firmalar | İşlem sayısına göre | Dönemsel |
| Son Eklenen Firmalar | Tarih sırası | — |

### 5.3 SaaS Gereksinimleri

- Kartlar tıklanabilir; ilgili liste sayfasına yönlendirir.
- Tüm metrikler tenant/company/dönem filtresiyle çalışır.
- Boş durum mesajı açıkça gösterilir.

### 5.4 Uygulama Notu — P1-S2 Başlangıç

- [x] Ana `Dashboard` yüzeyine `Firmalar Dashboard` sayaç bandı eklendi.
- [x] Sayaçlar canlı tenant/firma/dönem kapsamındaki `Müşteriler`, `Tedarikçiler` ve `Taşeronlar` tanım listelerinden beslenir.
- [x] `Toplam Firma` değeri üç cari kart tipinin toplamıdır; kategori kartları `/musteriler`, `/tedarikciler`, `/taseronlar` rotalarına tıklanabilir geçiş verir.
- [x] `Müşteri Tahsilatı`, `Tedarikçi Ödemeleri`, `Taşeron Ödemeleri` ve `Net Nakit Akışı` kartları mevcut operasyon raporu hesaplarından ana dashboarddaki Firmalar Dashboard bandına eklendi.
- [x] `Firma Tipi Dağılımı`, `En Aktif Firmalar` ve `Son Eklenen Firmalar` özetleri aynı bantta gösterilir; en aktif firmalar işlem sayısına, son eklenenler `createdAt` sırasına göre hesaplanır.
- [x] `Aylık Yeni Firma Trendi` son 6 ay için müşteri/tedarikçi/taşeron `createdAt` değerlerini ay bazında gruplayarak ana dashboarddaki Firmalar Dashboard bandına eklendi.
- [x] Firmalar Dashboard dönem filtresi `Bugün`, `Bu Hafta`, `Bu Ay`, `Bu Yıl` seçenekleriyle URL query üzerinden çalışır; finansal firma metrikleri ve `En Aktif Firmalar` listesi seçili dönem aralığındaki operasyon hareketlerinden hesaplanır.
- [x] Daha zengin grafik bileşenleri ilk P1-S2 kapsamında eklendi: `Firma Tipi Dağılımı` erişilebilir donut grafik, `Aylık Yeni Firma Trendi` erişilebilir 6 aylık kolon grafik olarak görünür; mevcut metin/yüzde/sayı özetleri korunur.
---

## 6. P1 Yeni Modül: Müşteri Cari Kartı

### 6.1 Modül Amacı

**Kanıt:** `Firmalar/Firmalar-Müşteriler.png`, `Firmalar-Müşteriler-Yeni Müşteri-01.png`, `02.png`

Şantiyeye iş veren taraf (işveren/proje sahibi) için cari hesap yönetimi. Hakediş alacakları, tahsilat, sözleşme takibi.

### 6.2 Form Bölümleri ve Alanlar

**Firma Bilgileri:**

| Alan | Tip | Zorunlu |
|---|---|---|
| Firma Adı | string | Evet |
| Yetkili Kişi | string | Hayır |
| Telefon | string | Hayır |
| Email | email | Hayır |
| Adres | text | Hayır |
| Şehir | string | Hayır |
| Durum | enum: Aktif/Pasif | Evet |

**Vergi Bilgileri:**

| Alan | Tip |
|---|---|
| Vergi Numarası | string (10 hane) |
| Vergi Dairesi | string |

**Banka Bilgileri:**

| Alan | Tip |
|---|---|
| IBAN | string |
| Banka Adı | string |
| Banka Lokasyonu | string |

**Notlar:** text (serbest)

### 6.3 Liste Kolonları

| Kolon | Sıralama | Filtre |
|---|---|---|
| KOD (MUS-XXXX) | Evet | Hayır |
| FİRMA ADI | Evet | Evet |
| YETKİLİ | Hayır | Hayır |
| TELEFON | Hayır | Hayır |
| ŞEHİR | Evet | Evet |
| DURUM | Evet | Evet |
| İŞLEMLER | Hayır | Hayır |

**Araç çubuğu:** İçe Aktar | + Yeni Müşteri | Excel | PDF | Yazdır | Yenile

**Uygulama notu:** İlk P1 başlangıcı olarak `musteriler` route'u genel Tanımlar standardına bağlandı. `src/lib/entities.ts` içinde `MUS-XXXX` kodlu müşteri cari kartı; müşteri tipi, vergi no, telefon, e-posta, bakiye ve durum kolonlarıyla görünür. `/musteriler` sol navigasyonda P1 etiketiyle açılır; `Yeni`, `Düzenle`, `Pasifleştir`, `Yenile`, `Şablon`, `Excel` ve `Yazdır` davranışları mevcut generic Tanımlar hattını kullanır. Bu dilimde satış faturası, tahsilat/ödeme hareketi, gelişmiş XLSX kolon eşleme ve ayrı müşteri detay sayfası açılmadı; iş akışı önce müşteri kartı/liste standardı olarak sabitlendi. Seçili müşteri kartı artık ortak `Hesap Ekstresi` panelinden hakediş alacağı, tahsilat ve diğer cari hareketlerini okuyabilir; panel verisi `counterpartyStatementRouteSlugs` sözleşmesiyle `/musteriler` için de yüklenir. Kart listesindeki `Bakiye` kolonu statik demo değerine bağlı kalmaz; aynı cari için oluşan ekstre hareketlerinin son yürüyen bakiyesi görünür listeye ve Excel CSV çıktısına yansıtılır. Bu karar eski pencere görünümünü kopyalamadan, cari kartın hareketlerden beslenen güncel bakiye iş akışını korur.

### 6.4 Müşteri İşlemleri

- Hareket ekle (tahsilat, ödeme, borç, alacak).
- Hakediş faturası ekle (alacak tarafı).
- Satış faturası ekle.
- Hesap ekstresi ve hareket toplamları.

### 6.5 Excel ile Toplu İçe Aktar (Üç Cari Kart İçin Standart)

**Kanıt:** `Firmalar-Müşteriler-Yeni Müşteri-03.png`, `Firmalar-Tedarikçiler-Yeni Tedarikçi-03.png`

**Adım 1 — Şablon & Yükle:**
- `Şablon` toolbar aksiyonu artık native `.xlsx` workbook indirir; veri sayfası kolonları `EntityDefinition.columns` sözleşmesinden gelir, ilk satır `MUS-0001`, `Zorunlu`, `Opsiyonel`, `Aktif` örnek değerlerini taşır.
- İndirilen workbook ikinci `Açıklamalar` sayfasında kolon bazlı zorunlu/opsiyonel bilgisi ve giriş kurallarını taşır. CSV dosyası seçme ve CSV metin yapıştırma geriye dönük uyumluluk için import panelinde korunur.
- `.xlsx` dosya seçme veya sürükle-bırak ilk çalışma sayfasını okuyarak aynı kolon sözleşmesine göre önizleme üretir; yalnızca `.xlsx` uzantısı ve 15 MB sınırı kabul edilir. Başlık adları doğru olduğu sürece kolon sırası farklı gelen XLSX dosyaları tanım kolonlarına göre yeniden hizalanır. Kullanıcı kontrollü gelişmiş kolon eşleme ve server-side workbook işleme sonraki XLSX import sihirbazı diliminde eklenecek.

**Adım 2 — Önizleme:**
- `İçe Aktar` toolbar aksiyonu CSV metin/dosya ve XLSX dosya önizlemesini aynı import panelinde toplar; CSV ayrıştırma çekirdeği `src/lib/entity-import.ts`, XLSX adaptörü `src/lib/entity-xlsx-import.ts` içindedir.
- Yüklenecek kayıtların listesi geçerli/hatalı satır sayısı ile özetlenir; kod/tanım zorunluluğu, mevcut kod çakışması, dosya içi kod tekrarı ve durum değeri kontrol edilir. XLSX tarafında ilk sheet başlıkları `EntityDefinition.columns` etiketleriyle eşleşmeden satır validasyonuna geçilmez. Kullanıcı `.xlsx` dosyasını input ile seçebilir veya aynı panele sürükle-bırak yapabilir; iki yol da aynı önizleme ve validasyon hattını kullanır. Önizleme panelinde satır durum tablosu görünür; geçerli satırlar yeşil onay, hatalı satırlar kırmızı uyarı sınıfıyla ayrılır. Hatalı satır varsa `Önizleme hata raporu CSV indir` bağlantısıyla satır no, kod, tanım ve hata açıklamaları indirilebilir.
- Hatalı satırı atlayarak devam davranışı `Geçerli Satırları Uygula` ile çalışır; CSV veya temel XLSX önizlemesinden gelen geçerli satırlar persistence bağlı ekranlarda `importEntityRowsAction` / `EntityCrudService.importMany` hattından tek servis operasyonuyla kalıcı kaynağa yazılır, bulk action verilmeyen demo modda lokal listeye eklenir. XLSX tarafında gelişmiş kolon eşleme ve server-side workbook işleme sonraki P1 diliminde derinleşecektir.
- Tenant izolasyonu hem `EntityPrismaRepository` sorgu kapsamıyla hem de `EntityCrudService` içinde repository çıktısını yeniden aktif tenant/firma/döneme filtreleyen savunmalı katmanla korunur; karışık repository çıktısı gelse bile başka tenant kaydı listeye ve next-code hesabına dahil edilmez.
- Tanım CRUD mutasyonları `EntityCrudService` içinde opsiyonel `AuditLogRepository` ile kayıt altına alınır; server action hattında `createAuditLogPrismaRepository` bağlıdır. Tekil oluşturma ve toplu içe aktarma satırları `entity.create`, güncelleme `entity.update`, pasifleştirme `entity.delete` aksiyonlarıyla `entity-record` tipi, `slug:code` kimliği, görünür etiket ve status geçiş metadata bilgisiyle yazılır.

**Adım 3 — Sonuç:**
- Başarıyla içe aktarılan kayıt sayısı.
- Atlanan kayıtların özeti sonuç panelinde görünür; hatalı satır varsa `Hata raporu CSV indir` bağlantısı önizlemedeki aynı satır no, kod, tanım ve hata açıklamalarıyla CSV raporu üretir.

`BulkImportService` ortak servisi; modüle özgü validation şeması ayrı tutulacak.
Bu UI: Müşteri, Taşeron ve Tedarikçi'de özdeş. Yalnızca şablon sütunları farklılaşır.

### 6.6 Veri Modeli

```
Customer {
  id: uuid
  tenantId: uuid
  companyId: uuid
  code: string          // otomatik: MUS-XXXX
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  taxNo?: string
  taxOffice?: string
  iban?: string
  bankName?: string
  bankLocation?: string
  notes?: string
  status: "active" | "passive"
  createdBy: uuid
  updatedBy: uuid
  createdAt: datetime
  updatedAt: datetime
  deletedAt?: datetime
}
```


---

## 7. P1 Yeni Modül: İhale Yönetimi

### 7.1 Modül Amacı

**Kanıt:** `İhale Yönetimi/İhale Yönetimi-01.png` → `İhale Yönetimi-Yeni ihale-03.png`

İnşaat firmaları proje başlamadan önce ihaleleri takip eder; ihale kazanılırsa proje (şantiye) oluşur. Mevcut plandaki "Teklif: P1" notunun genişletilmiş halidir. Türkiye yapım ihalesi süreçlerine (EKAP/İKN) uygun tasarım.

### 7.2 İhale Analiz Panosu

**Özet kartlar:**

| Kart | Metrik |
|---|---|
| Kazanma Oranı | Kazanılan / Toplam (%) |
| Toplam İhale | Toplam kayıt sayısı |
| Kazanılan Değer | Kazanılan teklif bedeli toplamı |
| Sözleşme Bedeli | İmzalanan sözleşmeler toplamı |

**Grafikler:**
- Aylık Trend (12 ay): İhale değeri çizgi grafiği.
- İhale Türüne Göre: Açık / Kapalı / Pazarlık dağılımı.
- En Çok İhale Açan Kurumlar: Kurum adı, ihale sayısı, kazanma sayısı.

Geçiş: "Listeye Dön" / "Analiz Panosu" toggle butonu.

### 7.3 İhale Listesi

**Durum filtreleri (tıklanabilir sekme sayaçları):**

| Durum | Açıklama |
|---|---|
| Takip | İlan takip ediliyor |
| Hazırlanıyor | Teklif hazırlığı devam ediyor |
| Sunuldu | Teklif sunuldu, sonuç bekleniyor |
| Kazanıldı | İhale kazanıldı |
| Kaybedildi | İhale kaybedildi |
| İptal | İhale iptal edildi |

**Araç çubuğu:** Arama (6 alan) | Excel | PDF | Analiz Panosu | + Yeni İhale

**Liste kolonları:**

| Kolon | Açıklama |
|---|---|
| NO / İKN | İhale No + EKAP Kayıt Numarası |
| BAŞLIK | İhale konusu |
| İHALE MAKAMI | İhaleyi açan kurum |
| DURUM | Rozet |
| SON TEKLİF | Tarih + varsa "Süre doldu" rozeti |
| YAKLAŞIK BEDEL | İdarenin yaklaşık maliyeti |
| İŞLEMLER | Düzenle, detay |

**Uygulama durumu — 01.07.2026 P1-S3 temel başlangıç:**
- `/ihale-yonetimi` rotası P1 menüye eklendi; ekran `src/components/tender-management-surface.tsx` üzerinden ayrı bir ihale çalışma alanı olarak açılır.
- İlk dilim kalıcı yazma yapmaz; `src/lib/tender-service.ts` içindeki demo read-model ile durum sayaçları, kazanma oranı, kazanılan değer, sözleşme bedeli, yaklaşan son teklif ve süresi dolan açık ihale özetleri hesaplanır.
- Liste görünümü plan kolonlarıyla başladı: NO/İKN, Başlık, İhale Makamı, Durum, Son Teklif, Yaklaşık Bedel, İşlemler.
- Durum sekme sayaçları `Takip / Hazırlanıyor / Sunuldu / Kazanıldı / Kaybedildi / İptal` sözleşmesini korur. Sayaçlar okuma/analiz başlangıcı olarak açıldı; 01.07.2026 devam dilimlerinde form sekmeleri, kalıcı durum geçişleri, audit bağlantısı, tıklanabilir liste filtresi ve `Analiz Panosu` / `Listeye Dön` görünüm geçişi tamamlandı. Aktif durum filtresi aynı sayaca tekrar basılarak temizlenir.

### 7.4 Yeni İhale Formu — 3 Sekme

**Sekme 1: Genel & Takvim**

| Alan | Tip | Zorunlu |
|---|---|---|
| Başlık | string | Evet |
| İhale No | string | Hayır |
| EKAP / İKN | string | Hayır |
| İhale Makamı | string | Hayır |
| İhale Usulü | enum: Açık/Kapalı/Pazarlık | Hayır |
| İlan Tarihi | date | Hayır |
| Şartname Satın Alma Son | date | Hayır |
| Soru-Cevap Son | date | Hayır |
| Son Teklif Tarihi | datetime (saat dahil) | Hayır |
| İhale Oturum Tarihi | datetime | Hayır |
| Sözleşme İmza Tarihi | date | Hayır |
| Yer / İl | string | Hayır |
| Açıklama | text | Hayır |

**Sekme 2: Maliyet & Teklif**

| Alan | Tip | Açıklama |
|---|---|---|
| Para Birimi | enum: TRY/USD/EUR | Varsayılan TRY |
| İdare Yaklaşık Maliyeti | decimal | KDV dahil tahmin |
| Genel Gider (Overhead) % | decimal | Firmanın genel gider oranı |
| Kâr Marjı % | decimal | Hedeflenen kâr marjı |
| Bizim Teklif Bedeli | decimal | Manuel veya kullanıcı kontrollü BOQ aktarımı |
| Sınır Değer (aşırı düşük) | decimal | Aşırı düşük teklif sınır değeri |

**Uygulama durumu — 01.07.2026 P1-S3 form başlangıcı:**
- `+ Yeni İhale` aksiyonu aynı çalışma alanında 3 sekmeli form iskeletini açar: `Genel & Takvim`, `Maliyet & Teklif`, `BOQ / Poz`.
- Sekme 1 ve Sekme 2 plan alanları UI'ya bağlandı; `Başlık` zorunlu validasyonuyla taslak oluşturma yapılır.
- `Taslak Kaydet`, 3. sekme tamamlanmadan `Hazırlanıyor` durumunda ihale taslağı oluşturur. İlk adımda lokal liste davranışıyla kanıtlandı; 01.07.2026 kalıcı kayıt diliminde `Tender` Prisma modeli, tenant/firma/dönem kapsamlı repository, servis, server action ve `tender.create` audit kaydı eklendi.
- Kalıcı oluşturma `src/app/actions/tender-actions.ts` üzerinden çalışır; `viewer` rolü ihale oluşturamaz, `admin/accounting` oluşturabilir. Aynı dönem içinde aynı `İhale No` tekrar kullanılamaz.
- 01.07.2026 durum geçiş diliminde `Takip -> Hazırlanıyor -> Sunuldu -> Kazanıldı/Kaybedildi/İptal` sırası servis sözleşmesine alındı. Liste satırında yalnız izinli sonraki durum butonları görünür; geçişler `transitionTenderStatusAction` ile Prisma `Tender` kaydına yazılır ve `tender.status.transition` audit metadata'sında `statusFrom/statusTo` tutulur. Geriye dönüş ve `viewer` rolü reddedilir.
- 01.07.2026 P1-S4 başlangıcında `BOQ / Poz` sekmesi placeholder olmaktan çıkarıldı. Form state üzerinde Poz, İş Kalemi, Birim, Miktar, Malzeme, İşçilik, Ekipman, Taşeron, Nakliye ve Birim Teklif alanları girilebilir; Toplam Maliyet, BOQ Teklif Toplamı, Önerilen Teklif, Kâr ve Kâr Oranı canlı hesaplanır.
- 01.07.2026 P1-S4 kalıcı başlangıcında `TenderBoqLine` Prisma modeli, `Tender.lines` ilişkisi ve nested repository mapping'i eklendi. Yeni ihale kaydı oluşturulurken BOQ satırları kalıcı kaynağa yazılır; liste tekrar yüklendiğinde satırlar `lineNo` sırasıyla geri okunur.
- `tender.create` audit metadata'sı artık `boqLineCount`, `boqBidTotal`, `totalCost`, `profitAmount` ve `profitRate` değerlerini taşır.
- 01.07.2026 P1-S4 devamında mevcut ihale satırından `BOQ` aksiyonu ile editör açılır. Kullanıcı BOQ satırı ekleyebilir, kopyalayabilir, silebilir ve `BOQ Kaydet` ile kalıcı kaynağa yazabilir. Bu update `tender.boq.update` audit kaydı üretir ve BOQ toplamlarını metadata'da taşır.
- 01.07.2026 P1-S4 kontrollü aktarım diliminde `BOQ Toplamını Teklife Aktar` aksiyonu eklendi. Yeni ihale formunda BOQ Teklif Toplamı `Bizim Teklif Bedeli` alanına kullanıcı onayıyla taşınır; mevcut ihale BOQ editöründe aynı aktarım `BOQ Kaydet` ile `updateTenderBoqAction` hattından kalıcı kaynağa yazılır.
- 01.07.2026 P1-S4 şantiye dönüşüm diliminde `Kazanıldı` durumundaki ve henüz bağlanmamış ihale satırına `Şantiye Aç` aksiyonu eklendi. Sihirbaz `santiyeler` tanım kartını oluşturur, ihale kaydını `convertedSiteCode`, `convertedSiteName`, `convertedToSiteAt` alanlarıyla bağlar ve `tender.site.convert` audit kaydı üretir.

**Karlılık Simülasyonu (otomatik hesaplanan, anlık güncellenen):**

| Metrik | Formül |
|---|---|
| Toplam Maliyet (BOQ) | BOQ satır maliyetleri toplamı |
| Önerilen Teklif | BOQ Maliyet × (1 + OH%) × (1 + Kâr%) |
| BOQ Teklif Toplamı | BOQ birim teklif × miktar toplamı |
| Kullanılan Teklif | Manuel değer veya kullanıcı kontrollü BOQ aktarımı |
| Kâr | Kullanılan Teklif − Toplam Maliyet |
| Kâr Oranı % | Kâr / Kullanılan Teklif × 100 |

**Sekme 3: BOQ / Poz — Birim Fiyat / Poz Cetveli (maliyet kırılımlı)**

| Kolon | Tip | Açıklama |
|---|---|---|
| Poz | string | Poz numarası (01.001) |
| Açıklama | string | İş kalemi açıklaması |
| Birim | string (lookup) | adet, m², m³, ton, kg, km vb. |
| Miktar | decimal | |
| Malzeme | decimal | Birim malzeme maliyeti |
| İşçilik | decimal | Birim işçilik maliyeti |
| Ekipman | decimal | Birim ekipman maliyeti |
| Taşeron | decimal | Birim taşeron maliyeti |
| Nakliye | decimal | Birim nakliye maliyeti |
| Birim Mal. | decimal (hesaplanan) | 5 maliyetin toplamı |
| Birim Teklif | decimal | Satışa sunulan birim fiyat |
| Satır Teklif | decimal (hesaplanan) | Miktar × Birim Teklif |

"+ Poz Ekle" ile satır eklenir. Alt satırda Maliyet Toplam ve Teklif Toplam sürekli hesaplanır.

**Uygulama durumu — 01.07.2026 P1-S4 başlangıcı:**
- `src/lib/tender-service.ts` içinde `calculateTenderBoqSimulation` sözleşmesi eklendi. Hesaplama satır bazında `Birim Mal. = Malzeme + İşçilik + Ekipman + Taşeron + Nakliye`, `Satır Maliyet = Miktar × Birim Mal.`, `Satır Teklif = Miktar × Birim Teklif` mantığını izler.
- `Önerilen Teklif = Toplam Maliyet × (1 + Genel Gider %) × (1 + Kâr Marjı %)` olarak hesaplanır.
- `Kullanılan Teklif`, manuel `Bizim Teklif Bedeli` girilmişse onu, girilmemişse BOQ Teklif Toplamını baz alır; Kâr ve Kâr Oranı buradan türetilir.
- `src/components/tender-management-surface.tsx` içinde BOQ satır editörü ve canlı özet metrikleri eklendi. Bu davranış eski pencere görünümünü değil, poz cetveli ile teklif/kârlılık iş akışını korur.
- `src/lib/tender-prisma-repository.ts` içinde BOQ satırları `createMany` ile yazılır, update sırasında replace edilir ve listede `lineNo asc` ile include edilir.
- `src/app/actions/tender-actions.ts` içinde `updateTenderBoqAction` eklendi; action scope/tenant güvenliğini korur ve `/ihale-yonetimi` rotasını revalidate eder.
- `createTenderService().updateBoq` artık yalnız açıkça gönderilen `bidValue` değerini teklif bedeline uygular; `tender.boq.update` audit metadata'sında güncel teklif bedeliyle birlikte `previousBidValue` da taşınır.
- Local PostgreSQL `insaatMuhasebe` veritabanı `TenderBoqLine` modeli için `prisma db push` ile senkronlandı.

### 7.5 Durum Geçiş İş Akışı

```
[Takip] ──► [Hazırlanıyor] ──► [Sunuldu] ──► [Kazanıldı]
                                         ├──► [Kaybedildi]
                                         └──► [İptal]
```

- Her geçiş audit log yazar.
- **Kazanıldı:** "Bu ihaleden şantiye oluştur" sihirbazı açılır; şantiye kartı `santiyeler` tanım modülüne yazılır ve ihale satırında şantiye kodu görünür.
- **Kaybedildi:** Kaybetme nedeni notu tutulabilir.
- Son Teklif Tarihi geçince "Süre doldu" rozeti görünür (kırmızı/amber — çek vade rozetiyle aynı).

### 7.6 İhale Dashboard Uyarıları

Mevcut planın ana dashboard'una eklenecekler:
- Yaklaşan son teklif tarihleri (7 gün içinde).
- Sonuç bekleyen ihaleler (Sunuldu + süre dolmuş).
- Bu ayki kazanma oranı özeti.

**Uygulama durumu — 01.07.2026:** Ana `/` dashboard yüzeyine `İhale Uyarıları` bandı eklendi. Bant `src/lib/tender-service.ts` içindeki `summarizeTenderDashboardAlerts` read-model'ini kullanır; `listTendersAction` ile aktif tenant/firma/dönem kapsamındaki kalıcı ihale satırları açılış ekranına taşınır. Eski pencere görünümü kopyalanmadı; kullanıcı iş akışı korunarak yalnız karar gerektiren üç bilgi gösterilir: 7 gün içinde son teklif tarihi gelen açık ihaleler, `Sunuldu` durumunda olup son teklif tarihi geçmiş sonuç bekleyen ihaleler ve bu ay sonuçlanmış ihalelerden kazanma oranı.

### 7.7 Veri Modeli

```
Tender {
  id, tenantId, companyId
  title: string
  tenderNo?: string
  ekapNo?: string
  authority?: string
  method?: "open" | "restricted" | "negotiated"
  announcementDate?, specificationDeadline?, questionDeadline?
  submissionDeadline?: datetime
  sessionDate?: datetime
  contractSignDate?: date
  location?: string
  description?: text
  currency: string (default "TRY")
  estimatedCost?, overheadPercent?, profitPercent?
  ourBidAmount?, abnormallyLowThreshold?
  status: "tracking"|"preparing"|"submitted"|"won"|"lost"|"cancelled"
  lostReason?: text
  projectId?: uuid       // Kazanıldı → şantiye bağlantısı
  createdBy, updatedBy, createdAt, updatedAt
}

TenderBoqLine {
  id, tenderId
  pozNo?: string
  description: string
  unit?: string
  quantity: decimal
  materialCost, laborCost, equipmentCost, subcontractorCost, shippingCost: decimal
  // unitCost = sum (hesaplanan)
  unitBidPrice: decimal
  // lineBidTotal = quantity × unitBidPrice (hesaplanan)
  sortOrder: int
}
```

**Uygulama durumu — 01.07.2026:** `prisma/schema.prisma` içinde `Tender` ve P1-S4 devamında `TenderBoqLine` modeli eklendi; local PostgreSQL `insaatMuhasebe` veritabanı `prisma db push` ile senkronlandı. BOQ satırları `Tender.lines` ilişkisiyle cascade silinir ve `lineNo` sırasıyla okunur. Mevcut ihale üzerinde satır ekleme/düzenleme/silme/kopyalama `BOQ` editörü ve `updateTenderBoqAction` hattıyla çalışır.

---

## 8. P1 Yeni Modül: Döküman / Evrak Merkezi

### 8.1 Modül Amacı

**Kanıt:** `Döküman Yönetimi/Döküman Yönetimi-01.png` → `06.png`

Mevcut plandaki "Evrak: P1. Dosya eki altyapısı P0'da" notunun tam uygulama planıdır.

### 8.2 Arayüz Yapısı

**Üst bilgi:** Kullanılan/toplam depo göstergesi | "+5GB · ₺790/ay" ek alan seçeneği | "Yeni Klasör" | "Dosya Yükle"

**Sekme navigasyonu:** Dosyalarım | Yıldızlı | Son Kullanılan | Çöp Kutusu

**Görünüm modları:**
- **Izgara (kart):** Renkli klasör ikonları, SİSTEM rozeti, klasör adı.
- **Liste:** Ad, Etiketler, Boyut, Tarih, Oluşturan, Yıldız/Paylaş/Kilitle ikonları.

**Filtreler:** Tümü | Resimler | PDF | Dökümanlar | Tablolar

### 8.3 Sistem Klasörleri (Otomatik Oluşturulan, Silinemez)

| Klasör Adı | Amacı | Renk |
|---|---|---|
| Araç Belgeleri | Araç ruhsatları, muayene, sigorta | Turuncu |
| Araçlar | Araç fotoğrafları | Turuncu |
| Disiplin | Disiplin tutanakları | Kırmızı |
| İrsaliyeler | Alış irsaliyesi PDF'leri | Yeşil |
| İzin Belgeleri | Personel izin formları | Mor |
| Malzemeler | Teknik şartnameler | Gri |
| Masraflar | Masraf dekontları ve fotoğrafları | Sarı |
| Ödeme Dekontları | Ödeme dekontları | Yeşil |
| Personel | Personel fotoğrafları | Mavi |
| Personel Belgeleri | Kimlik, sertifika, SGK | Mavi |
| Sözleşmeler | İhale ve taşeron sözleşmeleri | Mor |
| Stok Demirbaşları | Demirbaş fotoğraf ve belgeleri | Lacivert |
| Teklifler | Teklif PDF'leri | Yeşil |

Sistem klasörleri: **silinemez, yeniden adlandırılamaz**, "SİSTEM" rozeti taşır.

**Uygulama durumu — 01.07.2026 P1-S5 başlangıcı:** `/dokuman-merkezi` rotası P1 menüye eklendi ve `src/components/document-center-surface.tsx` üzerinden ilk çalışma yüzeyi açıldı. `src/lib/document-center-service.ts` içindeki read-model plan sırasındaki 13 sistem klasörünü üretir; tüm sistem klasörleri `SİSTEM` rozeti taşır, `canDelete=false` ve `canRename=false` sözleşmesiyle silme/yeniden adlandırma akışına kapalıdır. Bu başlangıç dilimi eski pencere görünümünü değil sistem klasörü ve merkezi evrak iş akışını yeni SaaS kabuğunda başlattı; sonraki dilimlerde kalıcı `DocumentFolder` / `DocumentFile`, binary local storage köprüsü ve `deletedAt` soft-delete akışı bu zemine eklendi.

### 8.4 Dosya Yükleme

- Sürükle-bırak alanı (drag & drop).
- "Dosya Seç" butonu.
- Maksimum dosya boyutu: **5MB** (temel plan). Ek alan satın alınırsa artar (P2 abonelik bağlantısı).

**Uygulama durumu — 01.07.2026 P1-S5 dosya seçme dilimi:** `Dosya Yükle` aksiyonu hedef klasör seçimi ve `Dosya Seç` alanı olan testli yükleme paneline bağlandı. `src/lib/document-center-service.ts` içinde `DOCUMENT_FILE_UPLOAD_LIMIT_BYTES = 5MB`, `createDocumentFileDraft`, `classifyDocumentFileKind` ve `insertDocumentFileIntoFolder` sözleşmeleri eklendi. Geçerli dosya yerel `DocumentFileRow` taslağına dönüşür; MIME/uzantı üzerinden `image/pdf/document/spreadsheet/other` türüne ayrılır, yüklenen dosya listesinde görünür ve hedef klasörün dosya sayısı/boyut sayaçları güncellenir. 5MB üstü dosyalar `Dosya boyutu 5MB sınırını aşamaz.` hatasıyla reddedilir. Bu dilim kalıcı `DocumentFile` tablosuna veya object storage'a yazmaz; gerçek storage, audit, indirme ve sürükle-bırak davranışı sonraki P1-S5 kalıcı dosya diliminde tamamlanacaktır.

**Uygulama durumu — 01.07.2026 P1-S5 kalıcı metadata başlangıcı:** `prisma/schema.prisma` içinde `DocumentFolder` ve `DocumentFile` modelleri eklendi. `DocumentFolder` tenant/firma/dönem scope'u, sistem klasörü anahtarı, yetki seviyesi, silme/yeniden adlandırma korumaları, dosya sayısı ve `BigInt` boyut sayaçlarını taşır. `DocumentFile` klasör bağlantısı, dosya türü, MIME tipi, uzantı, `storageKey`, `BigInt` boyut, audit kullanıcı alanları ve `deletedAt` çöp kutusu hazırlığını taşır. `src/lib/document-center-service.ts` içinde `createDocumentCenterService` sistem klasörlerini DB'de idempotent garanti eder, dosya metadata yazımında 5MB validasyonunu ve hedef klasör sayaç artışını korur. `src/lib/document-center-prisma-repository.ts` Prisma mapping katmanıdır. `src/app/actions/document-center-actions.ts` aktif tenant scope ile `listDocumentCenterAction` ve `createDocumentFileMetadataAction` başlangıcını açar. `/dokuman-merkezi` route'u artık DB'de sistem klasörlerini garanti edip kalıcı klasör/dosya metadata'sını ilk render'a taşıyabilir. UI artık `createDocumentFileAction` ile gerçek `File` içeriğini server action'a taşır; geliştirme ortamında binary içerik güvenli local storage adapter'a, metadata ise `DocumentFile` tablosuna yazılır. Üretim S3/R2/Azure Blob adaptörü, imzalı indirme URL'leri ve orphan cleanup stratejisi sonraki storage sertleştirme dilimindedir.

**Uygulama durumu — 01.07.2026 P1-S5 UI metadata action bağlantısı:** `src/components/document-center-surface.tsx` içine `persistence.createFileMetadata` sözleşmesi eklendi. `Dosya Seç` akışı önce client tarafındaki 5MB ve dosya adı validasyonunu korur; persistence prop'u varsa `createDocumentFileMetadataAction` çağrısına plain file metadata (`name`, `size`, `type`, `lastModified`), hedef klasör ve deterministik `document-center/{folder}/{lastModified}-{dosya}` formatında `storageKey` gönderir. Action başarılı dönerse UI action'dan gelen kalıcı `DocumentFileRow` satırını listeye ekler ve hedef klasör sayaçlarını artırır; hata dönerse dosya listeye eklenmeden mesaj gösterilir. Bu ara sözleşme korunur; asıl UI yolu artık gerçek `File` içeriğini `createDocumentFileAction` ile local storage adapter'a yazar ve `storageKey` değerini kalıcı metadata referansı olarak saklar.

**Uygulama durumu — 02.07.2026 P1-S5 sürükle-bırak yükleme dilimi:** `/dokuman-merkezi` yükleme panelindeki dosya alanı artık hem `Dosya Seç` hem de sürükle-bırak davranışını destekler. Kullanıcı dosyayı alana bıraktığında aynı `handleUploadFile` hattı çalışır; 5MB validasyon, hedef klasör, bağlı modül metadata'sı, local storage/server action persistence ve liste/sayaç güncellemesi butonla seçme akışıyla birebir korunur.

**Uygulama durumu — 02.07.2026 P1-S5 kaynak kayıt bağlantısı navigasyon dilimi:** `/dokuman-merkezi` dosya listesinde `Bağlantı` kolonu artık `linkedModule` ve `linkedRecordLabel` varsa kaynak modüle giden tıklanabilir link üretir. Link hedefi `/{modül}?evrak={kayıt}` formatındadır; böylece yüklenen evrak fatura, gider, hakediş, ihale, kasa/banka, personel, puantaj veya şantiye kaydıyla ilişkilendirildiğinde kullanıcı aynı iş akışını bozmadan ilgili modül ekranına geçebilir. Bağlantısız dosyalarda `-` gösterimi korunur; gelişmiş kayıt arama/seçici ayrı UX diliminde ele alınacaktır.

### 8.5 Yeni Klasör Oluşturma

- Klasör adı metin alanı.
- Erişim seçeneği: "Herkes" | Belirli kullanıcı/rol seçimi.

**Uygulama durumu — 01.07.2026 P1-S5 yeni klasör dilimi:** `Döküman / Evrak Merkezi` yüzeyinde `Yeni Klasör` aksiyonu testli form akışına bağlandı. Kullanıcı klasör adı girer, erişimi `Herkes` veya `Belirli kullanıcı/rol` olarak seçer ve `Klasör Oluştur` ile yeni kullanıcı klasörünü mevcut listeye ekler. `src/lib/document-center-service.ts` içindeki `createDocumentUserFolder` helper'ı boş ad ve mevcut klasör adı tekrarını reddeder; oluşan kullanıcı klasörü `isSystem=false`, `canDelete=true`, `canRename=true` sözleşmesi taşır. Bu dilim halen kalıcı `DocumentFolder` tablosuna yazmaz; kalıcılaştırma ve detaylı rol seçimi sonraki server action/model diliminde ele alınacaktır.

**Uygulama durumu — 02.07.2026 P1-S5 kullanıcı klasörü kalıcılık dilimi:** `createDocumentCenterService.createUserFolder` ve `createDocumentFolderAction` eklendi. `/dokuman-merkezi` yüzeyindeki `Yeni Klasör -> Klasör Oluştur` akışı artık persistence verildiğinde aktif tenant/firma/dönem scope'u ile `DocumentFolder` kaydını kalıcı kaynağa yazar; sistem klasörleri önceden garanti edilir, boş/mükerrer ad validasyonu korunur ve `viewer` rolü aynı Döküman Merkezi mutasyon yetkisiyle reddedilir. Persistence olmayan test/demo kullanımında eski lokal state davranışı devam eder.

### 8.6 Klasör Yetki Modeli

Her klasörde iki düzey:
- **Görüntüleme:** Dosyaları listeleleyip indirebilir.
- **Yazma:** Dosya ekleyebilir.

Normal kullanıcılar sistem klasörüne dosya yükleyebilir ama silemez. Silme: Admin veya ilgili modül yetkilisi.

### 8.7 Dosya Bağlantısı (Diğer Modüllere)

| Kaynak Modül | Bağlantı |
|---|---|
| Fatura | Fatura PDF, dekont, irsaliye |
| Hakediş | Hakediş belgesi |
| Taşeron | Sözleşme |
| Personel | Kimlik, sertifika |
| Araç | Ruhsat, muayene, sigorta |
| İhale | Şartname, teknik özellik |
| Gider | Masraf fişi, fotoğraf |

`Attachment` tablosu mevcut planın veri modelinde mevcuttur. Evrak Merkezi bu tablonun merkezi UI'ıdır.

### 8.8 Veri Modeli

```
DocumentFolder {
  id, tenantId, companyId
  name: string
  isSystem: boolean          // sistem klasörü silinemez
  systemKey?: string         // "contracts" | "vehicles" vb.
  parentFolderId?: uuid      // iç içe klasörler
  color?: string
  isStarred: boolean
  accessLevel: "public" | "restricted"
  createdBy, createdAt, updatedAt, deletedAt?
}

DocumentFile {
  id, tenantId, companyId, folderId
  name: string
  fileType: "image"|"pdf"|"document"|"spreadsheet"|"other"
  mimeType: string
  sizeBytes: bigint
  storageKey: string         // S3/R2 object key
  isStarred: boolean
  tags?: string[]
  linkedEntityType?: string  // "invoice"|"tender"|"employee" vb.
  linkedEntityId?: uuid
  createdBy, createdAt, updatedAt
  deletedAt?: datetime       // Çöp Kutusu; 30 gün sonra kalıcı silme
}
```


---

## 9. P1 Yeni Modül: Bildirim Merkezi ve Bildirim Ayarları

### 9.1 Modül Amacı

**Kanıt:** `Ayarlar/Ayarlar-Bildirim Ayarlari-01.png`, `02.png`, `03.png`

Mevcut plandaki "Bildirimler ve hatırlatmalar: P1" notunun tam uygulama planıdır.

### 9.2 Bildirim Kategorileri

Her kullanıcı hangi kategorilerden bildirim alacağını ayrı ayrı açıp kapatabilir:

| Kategori | Tetikleyici Olaylar |
|---|---|
| Masraf Yönetimi | Yeni masraf talebi, onay/ret |
| Avans Yönetimi | Avans ödeme tarihi, geri ödeme hatırlatması |
| Transfer İşlemleri | Personel, malzeme ve araç transferleri |
| Stok Yönetimi | Düşük stok uyarısı, minimum seviye aşımı |
| Araç Yönetimi | Sigorta, muayene, bakım hatırlatmaları |
| Risk Limitleri | Cari hesap risk limiti aşımı |
| Vade Bildirimleri | Çek, senet, ödeme vaadesi yaklaşan |
| Sözleşme Yönetimi | Sözleşme yenileme tarihi, ceza bildirimi |
| Board & Görevler | Görev ataması, deadline uyarısı |
| Tedarik & Satın Alma | Satın alma talebi, sipariş onayı |
| Bütçe Yönetimi | Yemek ve şantiye bütçe aşımı |
| İnsan Kaynakları | Puantaj ve bordro bildirimleri |
| Destek Sistemi | Destek talebi yanıtı |

### 9.3 Bildirim İstatistikleri

Sayfanın alt bölümünde:
- Toplam Bildirim / Okunmamış / Bugün / Bu Hafta sayaçları.
- Öncelik dağılımı: Düşük / Normal / Yüksek / Kritik.

### 9.4 Bildirim Yöntemleri

| Yöntem | Öncelik |
|---|---|
| Uygulama içi (in-app) | P1 |
| Email | P1 |
| Tarayıcı push bildirimi | P2 |
| SMS | P2 |
| Mobil push | P2 |

### 9.5 Veri Modeli

```
Notification {
  id, tenantId, companyId, userId
  category: NotificationCategory
  title: string
  body: string
  priority: "low"|"normal"|"high"|"critical"
  isRead: boolean
  readAt?: datetime
  linkedEntityType?: string
  linkedEntityId?: uuid
  createdAt: datetime
}

NotificationPreference {
  id, tenantId, userId
  category: NotificationCategory
  inAppEnabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
}
```

**Uygulama durumu — 02.07.2026 P1-S6 persistence dilimi:** `Notification` ve `NotificationPreference` Prisma modelleri açıldı. `/bildirimler` rotası `listNotificationCenterAction` ile DB kaynaklı bildirimleri ve kullanıcı kategori tercihlerini okur; seed bildirimler idempotent upsert edilir. Kategori aç/kapat akışı `setNotificationPreferenceAction`, okundu işaretleme `markNotificationAsReadAction`, üst bar okunmamış sayaçları `getNotificationUnreadCountAction` üzerinden çalışır. Email/push/SMS teslimat kanalları plan gereği sonraki entegrasyon dilimlerinde kalır.

**Uygulama durumu — 02.07.2026 P1-S6 domain üretim dilimi:** `createOperationalNotificationRows` çek vadesi, taşeron sözleşme bitişi ve stok minimum uyarılarını gerçek kayıt read-model'lerinden üretir. `listNotificationCenterAction` artık `listChequesAction`, `listEntityRowsAction("taseronlar")`, `listPurchaseInvoicesAction`/`summarizeStockDepotFromInvoices` ve `StockMinimumSetting` kayıtlarını kullanarak domain bildirimlerini idempotent `Notification` upsert akışına bağlar. Üretilen bildirim tekrar upsert edildiğinde kullanıcının `readAt` okundu durumu korunur. Stok minimum eşikleri `/stok-depo` özet satırından tenant/firma/dönem scoped kalıcı ayar olarak yazılır.

**Uygulama durumu — 02.07.2026 stok minimum ayar dilimi:** `StockMinimumSetting` Prisma modeli, `stock-minimum-setting-service`, Prisma repository ve `saveStockMinimumSettingAction` eklendi. `/stok-depo` yüzeyi fatura kaynaklı depo/stok özetinde her satır için minimum miktar girişi gösterir; kaydedilen ayarlar Bildirim Merkezi düşük stok üretiminde pilot sabit liste yerine kullanılır.

**Uygulama durumu — 02.07.2026 stok kartı tanım dilimi:** `stok-kartlari` tanımı P0 Tanımlar CRUD standardına eklendi. Kart alanları stok kodu, tanım, grup, üretici, birim, varsayılan depo, minimum miktar ve durumdur. `/stok-depo` ekranı stok kartı tanımlarını aynı sayfada gösterir; minimum miktar özet satırında başlangıç değeri olarak kullanılır. Bildirim Merkezi düşük stok üretiminde stok kartı eşiklerini temel alır, `StockMinimumSetting` satır özelinde override eder.

**Uygulama durumu — 02.07.2026 alış faturası stok kartı lookup dilimi:** `/faturalar` satır grid'i aktif `stok-kartlari` kayıtlarını seçim listesi olarak okur. Kullanıcı kart seçtiğinde stok kodu, stok/hizmet adı, birim ve varsayılan depo satıra doldurulur; serbest giriş akışı korunur. Kaydedilen satır `stockCode` değerini taşıdığı için `/stok-depo` okuma modeli ve düşük stok bildirimleri kodlu stok kartlarıyla daha tutarlı eşleşir.

---

## 10. P1 Yeni Modül: Genişletilmiş Kullanıcı Yönetimi

### 10.1 Modül Amacı

**Kanıt:** `Ayarlar/Ayarlar-Kullanıcı Yönetimi-01.png`, `02.png`, `03.png`

### 10.2 Kullanıcı Tipleri

| Tip | Açıklama | Yetki Seviyesi |
|---|---|---|
| Admin (Tüm Yetkiler) | Tüm modüller, sistem ayarları | Tam |
| Özel (RBAC ile Yönetilen) | Rol ekranında elle tanımlanmış izinler | Granüler |
| Kullanıcı (Lokasyona Bağlı) | Atandığı lokasyona ait kayıtlar | Lokasyon bazlı |
| İSG Uzmanı | Yalnızca İSG modülü | Modül bazlı |
| İşyeri Hekimi | Yalnızca sağlık ve iş kazası kayıtları | Modül bazlı |
| İşveren (Görüntüleme) | Salt okunur, finansal raporlar | Salt okunur |

### 10.3 Yeni Kullanıcı Oluşturma

| Alan | Tip | Zorunlu |
|---|---|---|
| E-posta | email | Evet |
| Şifre | password (min 8 karakter) | Evet |
| Ad Soyad | string | Evet |
| Kullanıcı Tipi | enum (yukarıdaki 6 tip) | Evet |

### 10.4 Kullanıcı Davet Akışı

**Kanıt:** `Ayarlar-Kullanıcı Yönetimi-03.png`

1. "Kullanıcı Davet Et" butonu.
2. Modal: Email adresi + Rol seçimi.
3. "Davet linki 7 gün geçerlidir" bilgilendirmesi.
4. "Davet Gönder" → kullanıcıya davet maili gönderilir.
5. Kullanıcı linke tıklayıp şifresini belirler ve sisteme katılır.

**Uygulama durumu — 02.07.2026 P1-S7 başlangıç dilimi:** `/ayarlar` yüzeyi `src/lib/settings-contract.ts` içindeki tek kaynaklı ayar sözleşmesinden 6 kullanıcı tipini ve davet politikasını okumaya başladı. `Kullanıcı Yönetimi` bölümü `Admin`, `Özel`, `Kullanıcı (Lokasyona Bağlı)`, `İSG Uzmanı`, `İşyeri Hekimi` ve `İşveren (Görüntüleme)` tiplerini plan açıklamaları ve yetki seviyeleriyle listeler. `Kullanıcı Davet Et` aksiyonu e-posta + rol seçimi olan davet panelini açar; `Davet linki 7 gün geçerlidir` bilgisi ve `Davet Gönder` taslak akışı görünürdür. Bu dilim eski pencere düzenini değil kullanıcı tipi seçimi ve davet iş akışını yeni SaaS ayarlar yüzeyine taşır; kalıcı kullanıcı modeli, token üretimi, e-posta gönderimi ve davet kabul ekranı sonraki server action/auth diliminde tamamlanacaktır.

**Uygulama durumu — 02.07.2026 P1-S7 kalıcı davet başlangıcı:** `UserInvitation` Prisma modeli, `createUserInvitationService`, `createUserInvitationPrismaRepository` ve `createUserInvitationAction` eklendi. `/ayarlar` içindeki davet paneli artık route tarafından persistence verildiğinde server action'a e-posta + kullanıcı tipi gönderir; servis e-postayı normalize eder, yalnız `admin` rolünün davet oluşturmasına izin verir, kullanıcı tipini ayar sözleşmesindeki 6 tipten biriyle sınırlar, 7 gün geçerli token üretir ve yalnız token hash'ini saklar. UI başarılı kayıtta davetin hangi tarihe kadar geçerli olduğunu gösterir; persistence verilmezse önceki test/demo taslak mesajı korunur. E-posta teslimatı, davet linkiyle şifre belirleme/kabul ekranı ve aktif kullanıcı listesi sonraki P1-S7 auth diliminde tamamlanacaktır.

**Uygulama durumu — 02.07.2026 P1-S7 davet kabul başlangıcı:** `/davet?token=...` route'u ve `InvitationAcceptSurface` eklendi. Kullanıcı davet linkinden geldiğinde ad soyad, şifre ve şifre tekrarını girerek daveti kabul eder; servis token'ın yalnız hash karşılığıyla pending daveti bulur, süresi dolmuş veya daha önce kabul edilmiş davetleri reddeder, şifre kurallarını uygular, `AppUser`, `AppSession`, `AppUserScopeAccess` ve `AppCredential` kayıtlarını oluşturur ve daveti `accepted` durumuna taşır. Bu dilimde eski masaüstü pencere görünümü kopyalanmaz; korunması gereken iş akışı olan "davet gönder → linkten şifre belirle → sisteme kullanıcı olarak katıl" SaaS kimlik zeminine aktarılır. E-posta teslimatı, otomatik giriş, aktif kullanıcı listesi ve detaylı RBAC yetki matrisi sonraki P1-S7/P1-S8 dilimlerine bırakılmıştır.

**Uygulama durumu — 02.07.2026 P1-S7 aktif kullanıcı listesi:** `createUserManagementService`, `createUserManagementPrismaRepository` ve `listUserManagementOverviewAction` eklendi. `/ayarlar` sayfası yalnız aktif tenant/firma/dönem için `AppUserScopeAccess` kayıtlarından aktif kullanıcıları, `UserInvitation` kayıtlarından son davet geçmişini okur. `Kullanıcı Yönetimi` paneli artık kullanıcı tipi sözleşmesinin altında aktif kullanıcı sayısı, bekleyen/kabul edilen davet sayaçları, `Ad Soyad / E-posta / Rol / Firma / Durum / İşlemler` kolonlu aktif kullanıcı tablosu ve `E-posta / Rol / Durum / Geçerlilik` kolonlu davet geçmişi tablosu gösterir. `Düzenle / Devre Dışı Bırak` metni bu turda bilinçli olarak salt okunur aksiyon placeholder'ıdır; gerçek kullanıcı düzenleme, devre dışı bırakma audit kaydı ve granular RBAC yetki matrisi sonraki güvenlik diliminde uygulanacaktır.

**Uygulama durumu — 02.07.2026 P1-S7 kullanıcı devre dışı bırakma başlangıcı:** Aktif kullanıcı tablosundaki işlem kolonu artık `Devre Dışı Bırak` aksiyonunu çalıştırır. `deactivateUserAccessAction`, aktif tenant/firma/dönem scope'unu garanti eder; servis yalnız `admin` rolüne izin verir, aktif kullanıcının kendi erişimini kapatmasını engeller, `AppUserScopeAccess.isActive=false` yazar ve `user-management.deactivate` audit kaydı üretir. UI başarılı işlemden sonra satırı aktif kullanıcı listesinden düşürür ve kullanıcıya durum mesajı gösterir. Bu dilim kullanıcı kimliğini, credential kaydını veya diğer firma/dönem erişimlerini silmez; rol düzenleme, çoklu kapsam devre dışı bırakma, geri alma ve detaylı RBAC ekranı sonraki güvenlik yönetimi dilimine bırakılmıştır.

**Uygulama durumu — 02.07.2026 P1-S7 davet iptali başlangıcı:** Davet geçmişi tablosundaki bekleyen davetler için `İptal Et` aksiyonu eklendi. `revokeUserInvitationAction`, aktif tenant/firma/dönem scope'unu garanti eder; servis yalnız `admin` rolüne izin verir, sadece `pending` durumundaki davetleri iptal eder, `UserInvitation.status=revoked`, `revokedAt` ve `updatedAt` alanlarını yazar. UI başarılı işlemden sonra davet durumunu `İptal Edildi` olarak günceller ve bekleyen davet sayacını düşürür. Kabul edilmiş veya daha önce iptal edilmiş davetlerin iptali reddedilir; e-posta teslimatı, davet yeniden gönderme ve davet audit ekranı sonraki güvenlik/iletişim dilimine bırakılmıştır.

**Uygulama durumu — 02.07.2026 P1-S7 kullanıcı audit geçmişi başlangıcı:** `listUserManagementOverviewAction` artık aynı kullanıcı yönetimi overview'ü içinde `user-access` audit kayıtlarını da okur. `createUserManagementService`, `AuditLogReadRepository` üzerinden son 20 kullanıcı erişimi audit hareketini `Kullanıcı Audit Geçmişi` tablosuna uygun satıra dönüştürür; `/ayarlar` kullanıcı yönetimi paneli bu kayıtları `Tarih / Aksiyon / Kayıt / Detay` kolonlarıyla davet geçmişinin altında gösterir. `user-management.deactivate` hareketinde `active -> inactive` detay metni görünür hale geldi. Bu dilim eski pencere görünümünü değil, güvenlik iş akışının zorunlu parçası olan "erişim kapatıldı mı, kimde, hangi hareketle iz bırakıldı" denetim görünürlüğünü SaaS ayarlar yüzeyine taşır; filtreli tam denetim günlüğü ekranı sonraki güvenlik/audit diliminde genişletilecektir.

**Uygulama durumu — 13.07.2026 P1-S7 kullanıcı audit geçmişi filtreleri:** `/ayarlar` Kullanıcı Audit Geçmişi artık aksiyon, kayıt ve detay metni üzerinden client-side arama; ayrıca aksiyon seçimi filtresi ve bağlamsal temizleme düğmesi sunuyor. Gösterilen/toplam kayıt sayacı ve filtreye uyan kayıt yok durumu aynı scoped son 20 audit read-model’i üzerinden hesaplanıyor; audit yazımı, erişim mutasyonu ve tenant/firma/dönem kapsamı değişmiyor. UI testi arama, sonuç daraltma ve temizleme davranışını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P1-S7 kullanıcı audit tarih aralığı:** Kullanıcı Audit Geçmişi filtre bandına başlangıç/bitiş tarihi eklendi. Tarih filtresi scoped son 20 audit kaydının `occurredAt` gününü karşılaştırarak arama ve aksiyon filtresiyle birlikte çalışıyor; ters aralıkta kontrollü uyarı ve sıfır sonuç gösteriliyor, temizleme düğmesi tarihleri de sıfırlıyor. Bu dilim audit kalıcılığı, yetki ve tenant/firma/dönem izolasyonunu değiştirmiyor.

**Uygulama durumu — 02.07.2026 P1-S7 davet audit genişletmesi:** Davet oluşturma ve davet iptali artık merkezi audit log'a yazılır. `createUserInvitationService`, `user-invitation.create` hareketinde e-posta, rol, geçerlilik tarihi ve `pending` durumunu; `user-invitation.revoke` hareketinde e-posta, rol ve `pending -> revoked` durum geçişini metadata olarak kaydeder. `createUserInvitationAction` ve `revokeUserInvitationAction` aynı Prisma audit repository'siyle çalışır. `Kullanıcı Audit Geçmişi` tablosu artık `user-access` ve `user-invitation` kayıtlarını birlikte, tarihe göre son 20 hareket olarak gösterir. Böylece "davet gönderildi mi, iptal edildi mi, hangi roldeydi" soruları ayrı eski pencere kopyası olmadan ayarlar içindeki güvenlik iş akışında görülebilir.

**Uygulama durumu — 02.07.2026 P1-S7 davet kabul audit izi:** Davet linkinden şifre belirleyerek sisteme katılma akışı da `user-invitation.accept` audit hareketi üretir. Audit actor değeri bu aşamada daveti kabul eden yeni kullanıcı id'sidir; metadata e-posta, kullanıcı tipi, oluşturulan session id, `pending -> accepted` durum geçişi ve kullanıcı id'sini taşır. Böylece davet yaşam döngüsü `create -> accept` veya `create -> revoke` olarak aynı `Kullanıcı Audit Geçmişi` tablosunda uçtan uca izlenebilir.

**Uygulama durumu — 02.07.2026 P1-S7 davet süre sonu görünürlüğü:** `createUserManagementService` ayarlar read-model'inde `pending` durumundaki davetin `expiresAt` değeri aktif zamana eşit veya geçmişse satırı `expired / Süresi Doldu` olarak gösterir. Bu davranış veritabanındaki davet satırını yazmadan değiştirir; amaç `/ayarlar` ekranında kullanıcıya doğru iş durumunu göstermektir. Süresi dolmuş davetler bekleyen davet sayacına dahil edilmez ve `Davet Geçmişi` tablosunda `İptal Et` aksiyonu görünmez. Böylece "Davet linki 7 gün geçerlidir" kuralı yalnız kabul formunda değil, yönetici listesindeki durum ve aksiyon davranışında da korunur.

**Uygulama durumu — 02.07.2026 P1-S7 davet yeniden gönderme başlangıcı:** `resendUserInvitationAction` ve `createUserInvitationService.resendInvitation` eklendi. Yönetici, süresi dolmuş veya iptal edilmiş daveti `Davet Geçmişi` tablosundan `Yeniden Gönder` aksiyonuyla tekrar `pending` duruma alabilir; servis yeni token üretir, yalnız token hash'ini saklar, `expiresAt` değerini 7 gün ileri taşır, `revokedAt/acceptedAt` alanlarını temizler ve `user-invitation.resend` audit hareketi yazar. UI başarılı işlemden sonra davet satırını `Bekliyor` yapar, yeni geçerlilik tarihini gösterir, bekleyen davet sayacını artırır ve tekrar `İptal Et` aksiyonunu açar. `Kullanıcı Audit Geçmişi` içindeki `user-invitation.resend` detayı da yeni geçerlilik tarihini `Geçerlilik: gg.aa.yyyy` biçiminde gösterir. E-posta teslimatı hâlâ ayrı iletişim entegrasyonu dilimidir; bu başlangıç dilimi eski pencere kopyası değil, davet yaşam döngüsünün güvenli yeniden başlatma iş akışıdır.

**Uygulama durumu — 13.07.2026 P1-S7 kendi kullanıcı erişimi UI guard görünürlüğü:** Aktif kullanıcı read-model’i `userId` bilgisini taşır; `/ayarlar` kullanıcı yönetimi tablosu oturum sahibinin kendi satırındaki erişim kapatma düğmesini disabled gösterip `Kendi erişiminiz` etiketi ve açıklaması sunar. Server tarafındaki `Aktif kullanıcı kendi erişimini devre dışı bırakamaz.` guard değişmeden korunur; bu dilim yalnız güvenlik kararını mutasyon öncesinde görünür kılar ve tenant/firma/dönem izolasyonunu değiştirmez.

**Uygulama durumu — 13.07.2026 P1-S7 aktif kullanıcı rol dağılımı özeti:** `/ayarlar` Kullanıcı Yönetimi özet bandı mevcut scoped aktif kullanıcı listesinden rol bazlı sayaçları (`Rol {rol}: {adet}`) üretip gösteriyor. Bu read-model özeti rol değiştirme, RBAC mutasyonu veya erişim yazımı açmaz; aktif kullanıcı araması, kendi erişimi guard’ı ve tenant/firma/dönem kapsamı korunuyor.

**Uygulama durumu — 13.07.2026 P1-S7 davet yaşam döngüsü durum özeti:** `/ayarlar` Kullanıcı Yönetimi özet bandı mevcut davet read-model’inden bekleyen/kabul edilen sayaçlara ek olarak `Süresi dolmuş davet` ve `İptal edilmiş davet` adetlerini de gösteriyor. Bu salt-okunur görünürlük, davet aksiyonlarını, e-posta teslimatını, audit yazımını ve tenant/firma/dönem izolasyonunu değiştirmiyor.

**Uygulama durumu — 13.07.2026 P1-S7 aktif kullanıcı arama görünürlüğü:** `/ayarlar` Aktif Kullanıcılar tablosu artık ad soyad, e-posta, rol, firma ve durum alanlarını kapsayan client-side arama, `X / Y kullanıcı` sayacı, eşleşmeyen sonuç boş durumu ve bağlamsal temizleme düğmesi sunuyor. Arama yalnız mevcut scoped kullanıcı read-model’ini daraltıyor; erişim kapatma, rol değiştirme, kullanıcı repository yazımı ve tenant/firma/dönem izolasyonu değişmiyor.

**Uygulama durumu — 13.07.2026 P1-S7 davet geçmişi arama görünürlüğü:** `/ayarlar` Davet Geçmişi tablosu artık e-posta, rol ve durum etiketlerinde client-side arama, `X / Y davet` sayacı, eşleşmeyen sonuç boş durumu ve bağlamsal temizleme düğmesi sunuyor. Bekleyen, kabul edilen, süresi dolmuş ve iptal edilmiş davet aksiyonları aynı kalıyor; bu dilim davet mutasyonu, e-posta kuyruğu, audit yazımı veya tenant/firma/dönem izolasyonu değiştirmiyor.

**Uygulama durumu — 13.07.2026 P1-S7 davet e-posta kuyruğu arama görünürlüğü:** `/ayarlar` Davet E-posta Kuyruğu tablosu artık alıcı, şablon, konu ve teknik/Türkçe durum alanlarında client-side arama, `X / Y ileti` sayacı, eşleşmeyen sonuç boş durumu ve temizleme düğmesi sunuyor. Bu yalnız mevcut e-posta outbox read-model’ini daraltır; gerçek e-posta teslimatı, retry worker’ı, kuyruk mutasyonu ve audit/tenant kapsamı değişmez.

**Uygulama durumu — 13.07.2026 P1-S7 davet e-posta kuyruğu durum özeti:** `/ayarlar` Davet E-posta Kuyruğu bandı artık filtre sonucundan bağımsız `Bekliyor`, `Gönderildi` ve `Hatalı` ileti sayaçlarını gösteriyor. Sayaçlar mevcut scoped outbox read-model’inden türetiliyor; gerçek teslimat/retry, kuyruk yazımı ve audit davranışı değişmiyor.

**Uygulama durumu — 03.07.2026 P1-S7 davet e-posta outbox başlangıcı:** Davet oluşturma ve davet yeniden gönderme akışları artık `EmailOutbox` kalıcı kuyruğuna `pending` e-posta işi yazar. `createUserInvitationService`, başarılı `user-invitation.create` ve `user-invitation.resend` işlemlerinden sonra token içeren `/davet?token=...` linkini, rol bilgisini, geçerlilik tarihini, davet id'sini ve aksiyon metadata'sını outbox mesajına koyar. `createEmailOutboxPrismaRepository` bu mesajı tenant/firma/dönem scoped olarak Prisma'ya kaydeder; `createUserInvitationAction` ve `resendUserInvitationAction` aynı servis kurulumunda outbox repository'siyle çalışır. Bu dilim gerçek SMTP teslimatı değildir; iş akışını koruyan, dış mail sağlayıcısı veya worker entegrasyonu geldiğinde güvenli şekilde işlenebilecek kalıcı gönderim kuyruğudur.

**Uygulama durumu — 03.07.2026 P1-S7 davet e-posta kuyruğu görünürlüğü:** `createUserManagementService` ve `createUserManagementPrismaRepository` artık aktif tenant/firma/dönem scope'u için son 20 `EmailOutbox` davet e-posta işini de kullanıcı yönetimi overview'üne ekler. `/ayarlar` içindeki `Kullanıcı Yönetimi` paneli `Davet E-posta Kuyruğu` tablosunda oluşturma tarihi, alıcı e-posta, şablon, konu ve durum bilgisini salt okunur gösterir. `pending` durum `Bekliyor`, ileride worker tarafından yazılacak `sent` ve `failed` durumları `Gönderildi` ve `Hatalı` olarak okunur. Bu dilim dış mail sağlayıcısı bağlamaz; amaç yöneticinin "davet maili kuyruğa düştü mü" sorusunu eski pencere kopyası olmadan SaaS ayarlar yüzeyinden izleyebilmesidir.

### 10.5 Liste Kolonları

| Kolon | Açıklama |
|---|---|
| Ad Soyad | — |
| E-posta | — |
| Rol | Atanmış rol rozeti |
| Firma | Hangi firmaya atanmış |
| İşlemler | Düzenle, devre dışı bırak |

---

## 11. P2 Yeni Modül: Banka Entegrasyonu

### 11.1 Modül Amacı

**Kanıt:** `Ayarlar/Ayarlar-Banka Entegrasyonu.png`

Mevcut plandaki "Banka entegrasyonu: P2" notunun tam tasarım planıdır.

### 11.2 Desteklenen Bankalar

| Banka | Durum |
|---|---|
| VakıfBank | Mevcut |
| İş Bankası | Mevcut |
| QNB Finansbank | Mevcut |
| Akbank | Mevcut |
| Yapı Kredi | Mevcut |
| Garanti BBVA | Mevcut |
| Ziraat Bankası | Yakında |

### 11.3 Bağlantı Ayarları

| Alan | Tip | Açıklama |
|---|---|---|
| Banka Seçimi | enum | Desteklenen bankalar listesi |
| Rıza Numarası (consentId) | string | Bankadan alınan Open Banking rıza No |
| Ortam | enum: Sandbox/Canlı | Test ortamı |
| Entegrasyonu Etkinleştir | boolean | |
| Otomatik Cari Eşleştirme | boolean | Gelen hareketi mevcut cari kartlarla otomatik eşleştir |

"Bağlantıyı Test Et" butonu ile sandbox'ta doğrulama yapılır.

**Uygulama durumu — 03.07.2026 P2-S1 sandbox başlangıç dilimi:** `/ayarlar` yüzeyine `Banka Entegrasyonu` paneli eklendi. `BankIntegrationConnection` Prisma modeli tenant/firma/dönem scope'u, banka kodu/adı, ortam, rıza numarası, bağlantı durumu, son test zamanı/mesajı ve createdBy/updatedBy alanlarını taşır. `createBankIntegrationService`, desteklenen banka sözleşmesini planla aynı sırada üretir; admin rolü `testBankSandboxConnectionAction` üzerinden sandbox rıza numarasını kalıcı bağlantı kaydına yazar ve `bank-integration.sandbox-test` audit izi üretir. Bu dilimde gerçek Open Banking API çağrısı, hesap hareketi senkronizasyonu ve eşleştirme açılmaz; amaç P2 banka entegrasyonu için güvenli bağlantı kaydı/test sonucu ve ayarlar görünürlüğünü başlatmaktır.

### 11.4 Hesap Özeti ve Senkronizasyon

- Başlangıç ve bitiş tarihi filtreleri.
- "Şimdi Senkronize Et" butonu.
- Senkronize edilen hesapların bakiyesi ve son hareket tarihi.

**Uygulama durumu — 03.07.2026 P2-S1 hareket senkronizasyon başlangıcı:** `BankTransaction` geçici Prisma modeli eklendi. `syncBankSandboxTransactionsAction`, admin rolüyle bağlı sandbox banka kaydından deterministik örnek banka hareketleri üretir, `tenant/company/period + bankConnectionId + externalId` kimliğiyle idempotent upsert eder ve `/ayarlar` içindeki `Son Banka Hareketleri` tablosunda tarih, banka, açıklama, yön, tutar ve durum bilgisiyle gösterir. Bu dilim gerçek banka API adaptörü değildir; `BankAdapter` bağlandığında aynı tablo ve eşleştirme hazırlığı gerçek hareketlerle beslenecek şekilde geçici senkronizasyon zemini kurar. Hareketler henüz kasa/banka ledger kaydına dönüşmez. 03.07.2026 devamında senkronizasyon tarih aralığı (`dateFrom/dateTo`) kabul eder; adapter çağrısı, servis filtresi, audit metadata ve `/ayarlar` tarih inputları aynı aralık sözleşmesini taşır. Başlangıç tarihi bitiş tarihinden sonra seçilirse UI persistence çağrısı yapmadan kullanıcıya kontrollü hata gösterir; servis katmanı da aynı guard ile adapter/upsert çalıştırmadan reddeder. Direct server action/service çağrılarında malformed tarih değeri de `YYYY-AA-GG` format guardı ile adapter çağrısından önce reddedilir; 04.07.2026 devamında regexe uyan ama takvimde var olmayan günler de aynı guard kapsamında adapter çağrısından önce yan etkisiz kesilir. 04.07.2026 sertleştirmesinde adapterdan gelen banka hareketlerinin `occurredAt` alanı da ISO tarih başlangıcı, gerçek takvim günü ve parse edilebilirlik açısından doğrulanır; bozuk hareket tarihi `bank-integration.transaction-sync-reject` audit iziyle upsert öncesinde yan etkisiz reddedilir. Adapterın `updatedAt` güncelleme izi de aynı tarih standardına bağlıdır ve `occurredAt` işlem tarihinden önce olamaz; bozuk veya geriye düşen güncelleme tarihi idempotent upsert, durum koruma sayacı ve denetim izi kirlenmeden reddedilir. Aynı sertleştirme hattında adapterın yeni hareketleri yalnız `pending` statüsüyle getirmesi zorunlu kılındı; `matched/ignored` gibi yerel muhasebe durumları yalnız uygulama içi eşleştirme, yoksayma ve geri alma aksiyonlarıyla oluşur. P0 işlem para birimi sözleşmesi runtime adapter sınırında da korunur; `TRY` dışı banka hareketi sync yazımı, eşleştirme ve kasa/banka taslakları oluşmadan audit izli şekilde reddedilir. Adapter yönü yalnız `inflow/outflow` olabilir ve tutar bu yöne uygun işaret taşımalıdır; geçersiz yön, sıfır veya ters işaretli tutarlar ledger köprüsüne ve kasa/banka taslaklarına ulaşmadan reddedilir. Adapter tutarı ayrıca sonlu sayı olmak zorundadır; `NaN` veya sonsuz tutarlar yön/tutar kontrolüne, ledger köprüsüne ve kasa/banka taslaklarına ulaşmadan `transaction-sync-reject` audit iziyle kesilir. Adapter `externalId` değeri boş, whitespace veya baş/son boşluklu olamaz; idempotent upsert kimliği, duplicate kontrolü ve audit izlenebilirliği güvenilir kalmazsa paket yazılmadan reddedilir. Adapterın kalıcı `BankTransaction.id` değeri de boş, baş/son boşluklu veya aynı senkronizasyon paketinde tekrar eden değer olamaz; dış adapter hatalı kimlik üretirse hareket repository yazımına ulaşmadan kesilir. Adapter hareket açıklaması boş, whitespace veya baş/son boşluklu olamaz; son hareket görünürlüğü, otomatik eşleştirme açıklama benzerliği ve kasa/banka taslak açıklaması anlamsız ya da kirli veriyle kalacaksa paket yazılmadan audit izli reddedilir. Adapterın hareket üzerindeki `bankName` değeri aktif bağlantının banka adıyla aynı olmalıdır; yanlış banka etiketiyle son hareket görünürlüğü, hesap varsayılanı ve audit izi kirlenmeden paket reddedilir.

### 11.5 Hareketler ve Eşleştirme (2. Sekme)

| Kolon | Açıklama |
|---|---|
| Tarih | İşlem tarihi |
| Açıklama | Banka işlem açıklaması |
| Tutar | + / − |
| Durum | Eşleştirildi / Bekliyor / Yoksayıldı |
| Eşleşen Kayıt | Tahsilat/ödeme kaydı bağlantısı |

Otomatik eşleştirme kuralı: Tutar + tarih + açıklama benzerlik skoru >%80 ise öneri sunulur.
Manuel eşleştirme ve "yeni hareket olarak kayıt" seçeneği de mevcut.

**Uygulama durumu — 03.07.2026 P2-S1 otomatik eşleşme önerisi başlangıcı:** `buildBankTransactionMatchSuggestions`, bekleyen `BankTransaction` hareketlerini mevcut `CashBankMovement` kayıtlarıyla aynı tarih, aynı yön, mutlak tutar eşitliği ve açıklama token benzerliği üzerinden salt okunur öneriye dönüştürür. `/ayarlar` içindeki `Otomatik Eşleşme Önerileri` tablosu banka açıklaması, kasa/banka belge no, kaynak kayıt, tarih, tutar, skor ve durum bilgisini gösterir. Bu dilimde öneri onayı, manuel eşleştirme ve ledger/kasa-banka mutasyonu bilinçli olarak açılmadı; sonraki P2-S1 sertleştirme dilimi onay akışı, çakışma kontrolü, audit izi ve gerçek Open Banking adaptörüyle birlikte ele alınacaktır.

**Uygulama durumu — 03.07.2026 P2-S1 eşleşme onayı başlangıcı:** `/ayarlar` içindeki otomatik eşleşme önerisi satırlarına `Onayla` aksiyonu eklendi. `approveBankTransactionMatchAction`, aktif tenant/firma/dönem scope'unda kasa/banka hareketlerini yeniden okuyup `approveMatchSuggestion` servis kontrolünden geçirir; yalnız `admin` ve `accounting` rolleri onay verebilir. Onaylanan hareket `BankTransaction.status = matched` durumuna alınır, öneri UI listesinden düşer ve `bank-integration.match-approve` audit kaydı banka hareketi id'si, kasa/banka hareket id'si, belge no, kaynak kayıt, skor ve `pending -> matched` geçiş metadata'sıyla yazılır. `reopenBankTransactionMatchAction` ile eşleşmiş banka hareketi tekrar `pending` durumuna alınabilir; bu geri alma `bank-integration.match-reopen` audit iziyle `matched -> pending` geçişini kaydeder ve `/ayarlar` son banka hareketleri tablosunda `Geri Al` aksiyonu olarak görünür. `approveManualBankTransactionMatchAction` ve `approveManualMatch` ile otomatik öneri üretmeyen bekleyen banka hareketleri için uyumlu kasa/banka hareketi manuel seçilebilir; ilk güvenlik sınırı olarak yön ve mutlak tutar eşitliği aranır, başarılı seçim `bank-integration.manual-match-approve` audit iziyle `pending -> matched` yazar. Bu dilim mevcut kasa/banka hareketini banka hareketiyle işaretler; farklı tutarlı gelişmiş/parçalı mutabakat sonraki P2-S1 sertleştirme adımında açılacaktır.

**Uygulama durumu — 03.07.2026 P2-S1 ledger bağlantısı başlangıcı:** `BankLedgerEntry` Prisma modeli eklendi ve local PostgreSQL `insaatMuhasebe` şeması `prisma db push` ile senkronlandı. Otomatik veya manuel banka eşleşmesi onaylandığında `createBankLedgerEntry` deterministik `bankTransactionId::ledger::cashBankMovementId` id'siyle tenant/firma/dönem scoped ledger satırı üretir; satır kasa/banka hareket belgesini, banka hareketini, kasa/banka hesap kodu/adını, tutarı, para birimini, hareket tarihini ve banka hesabı yönünü (`inflow -> debit`, `outflow -> credit`) taşır. Eşleşme geri alındığında `BankLedgerEntry.status = voided` yapılır; böylece banka hareketi tekrar `pending` olurken defter başlangıç kaydı da pasife alınır. Bu başlangıç tam çift taraflı `LedgerEntry/LedgerLine` muhasebe motoru değildir; P2-S1'in güvenli ara adımı olarak banka eşleşmesi ile defter izi arasındaki kalıcı köprüyü kurar.

**Uygulama durumu — 03.07.2026 P2-S1 aktif ledger çakışma kontrolü:** Otomatik ve manuel eşleşme onayları artık mutasyondan önce `BankLedgerEntry` üzerinde tenant/firma/dönem scoped `cashBankMovementId + status=active` araması yapar. Aynı kasa/banka hareketi farklı bir aktif banka hareketine bağlıysa onay reddedilir; `BankTransaction.status`, audit log ve ledger satırı değiştirilmez. Geri alma akışı ilgili ledger satırını `voided` yaptığı için aynı kasa/banka hareketi daha sonra yeniden eşleştirilebilir. Prisma şemasındaki `BankLedgerEntry` sorgu indeksi de `tenantId, companyId, periodId, cashBankMovementId, status` hizasına çekildi.

**Uygulama durumu — 03.07.2026 P2-S1 kısmi mutabakat görünürlüğü başlangıcı:** `/ayarlar` son banka hareketleri tablosundaki manuel eşleştirme seçimi artık aynı yönlü tüm kasa/banka adaylarını gösterir. Tutarı tam eşleşen adaylar normal `Manuel Eşleştir` onay akışını korur; tutarı farklı adaylar `Kısmi taslak` etiketi ve TL fark bilgisiyle görünür, fakat onay butonu pasif kalır. Böylece kullanıcı parçalı mutabakat ihtiyacını ekranda görebilirken sistem henüz eksik muhasebe kaydı veya yanlış ledger satırı üretmez. `evaluateManualBankTransactionMatchCandidates` domain fonksiyonu aynı yön filtresi, tam/kısmi sınıflandırma, fark tutarı, `canApprove` bayrağı ve sıralama kuralını servis katmanında tek sözleşmeye bağlar; UI artık bu sonucu gösterir. `buildBankTransactionPartialReconciliationDrafts` aynı domain çıktısından bekleyen banka hareketleri için salt okunur `Kısmi Mutabakat Taslakları` tablosunu üretir; tablo banka açıklaması/tutarı, kasa-banka belge no, kaynak kayıt, kasa-banka tutarı, fark ve `Kısmi Taslak` durumunu ayrı bir read-model olarak gösterir. `approveManualMatch` doğrudan çağrılsa bile kısmi adayları ledger/audit/banka hareketi yazmadan `Kısmi mutabakat onayı henüz açılmadı` mesajı ve fark tutarıyla reddeder. Kısmi onayın parça tutarı, kalan bakiye ve çoklu hareket bağlantısı sonraki P2-S1 mutabakat çekirdeğinde açılacaktır.
**Uygulama durumu — 03.07.2026 P2-S1 banka hareketi yoksayma başlangıcı:** `/ayarlar` son banka hareketleri tablosundaki bekleyen hareketlere `Yoksay` aksiyonu eklendi. `ignoreBankTransactionAction`, aktif tenant/firma/dönem scope'unda yalnız `admin` ve `accounting` rollerine izin verir; sadece `pending` durumdaki banka hareketini `ignored` durumuna taşır ve `bank-integration.transaction-ignore` audit izi üretir. `reopenIgnoredBankTransactionAction` ile yoksayılmış hareket tekrar `pending` durumuna alınabilir; bu geri alma `bank-integration.transaction-ignore-reopen` audit izi üretir ve ledger/kasa-banka kayıtlarına dokunmaz. Bu akış kasa/banka hareketi, `BankLedgerEntry`, otomatik öneri onayı veya kısmi mutabakat taslağı üretmez; amaç gerçek banka akışında muhasebeye alınmayacak hareketleri izlenebilir ve yan etkisiz biçimde ayırıp gerektiğinde güvenli geri almaktır.

**Uygulama durumu — 03.07.2026 P2-S1 yeni kasa/banka hareket taslağı başlangıcı:** `buildBankTransactionCashBankMovementDrafts`, bekleyen banka hareketlerini salt okunur `Yeni Kasa/Banka Hareket Taslakları` read-model'ine dönüştürür. `/ayarlar` Banka Entegrasyonu paneli banka açıklaması, önerilen hareket tipi (`Tahsilat`/`Ödeme`), yön, tarih, mutlak tutar, taslak açıklama ve `Kayıt Taslağı` durumunu gösterir. Read-model aynı banka hareketi id'sini tekilleştirir; eşleşmiş veya yoksayılmış hareketler yeni kayıt taslağına düşmez. Bu dilimde gerçek `CashBankMovement` oluşturma, hesap kodu seçimi, audit/ledger yazımı ve banka hareketini otomatik `matched` yapma bilinçli olarak açılmadı; amaç "yeni hareket olarak kayıt" iş akışının yazma öncesi görünürlüğünü kurmaktır.

**Uygulama durumu — 03.07.2026 P2-S1 banka hareketinden kasa/banka kaydı oluşturma başlangıcı:** `createCashBankMovementFromTransaction`, bekleyen banka hareketini deterministik `sourceType=bank-transaction` kaynaklı `CashBankMovement` satırına dönüştürür. `/ayarlar` içindeki `Yeni Kasa/Banka Hareket Taslakları` tablosuna `Kayda Çevir` aksiyonu eklendi; başarılı işlem banka hareketini `matched` durumuna taşır, taslak satırını listeden düşürür, `bank-integration.cash-bank-movement-create` audit izi üretir ve `BankLedgerEntry` başlangıç satırını oluşturur. Aynı banka hareketinden ikinci kasa/banka kaydı oluşturma duplicate guard ile reddedilir. Hesap seçimi bu başlangıçta güvenli varsayılan `102.01 / {Banka} TL` ile yapılır; kullanıcı kontrollü banka hesap eşleme, belge no şablonu ve parçalı yeni kayıt akışı sonraki P2-S1 sertleştirme dilimindedir.

**Uygulama durumu — 03.07.2026 P2-S1 yeni kayıt hesap seçimi:** `/ayarlar` Banka Entegrasyonu paneli, `Yeni Kasa/Banka Hareket Taslakları` satırlarında aktif `kasa-banka` tanımlarından hesap seçimi gösterir. `Kayda Çevir` action'ı seçilen `{code, name}` hesabını server action'a taşır; server tarafı hesabı aktif kasa/banka tanımlarında yeniden doğrular ve doğrulanmış hesabı `createCashBankMovementFromTransaction` servisine gönderir. Servis seçilen hesabı hem `CashBankMovement.accountCode/accountName` hem de `BankLedgerEntry.cashBankAccountCode/cashBankAccountName` alanlarına yazar. Hesap seçilmezse önceki güvenli varsayılan davranış korunur; belge no şablonu ve parçalı yeni kayıt akışı sonraki P2-S1 sertleştirme dilimindedir.

**Uygulama durumu — 03.07.2026 P2-S1 banka hareketi belge no tekilleştirme:** Banka hareketinden oluşturulan yeni kasa/banka kayıtlarında belge no artık yalnız tarih ve yön bilgisinden oluşmaz. `createCashBankMovementFromTransaction`, `BNK-YYYYMMDD-DIRECTION-HASH` formatını kullanır; `HASH` değeri banka hareketinin `externalId` bilgisinden deterministik üretilir. Böylece aynı gün aynı yönde birden fazla banka hareketi `Kayda Çevir` akışından geçtiğinde okunabilir belge no korunur, fakat `CashBankMovement.documentNo`, audit metadata ve `BankLedgerEntry.documentNo` aynı güne/yöne düşen hareketler arasında çakışmaz. Parçalı yeni kayıt akışı sonraki P2-S1 sertleştirme dilimindedir.

**Uygulama durumu — 03.07.2026 P2-S1 banka-rıza bazlı varsayılan hesap eşleme:** `/ayarlar` Banka Entegrasyonu panelindeki `Yeni Kasa/Banka Hareket Taslakları`, bağlı `BankIntegrationConnection` ve bekleyen banka hareketinin banka adını aktif kasa/banka hesap adıyla eşleştirerek satır bazında otomatik hesap varsayılanı seçer. Örneğin İş Bankası rızasından gelen hareket için seçenek listesinde `İş Bankası TL` hesabı varsa, bu hesap ilk seçenek olmasa bile select değeri olarak atanır ve kullanıcı değişiklik yapmadan `Kayda Çevir` çalıştırıldığında aynı `{code, name}` action'a gider. Kullanıcı seçimi hâlâ önceliklidir; elle seçilen hesap varsayılanı ezer ve server tarafındaki aktif hesap doğrulaması korunur. Parçalı yeni kayıt akışı sonraki P2-S1 sertleştirme dilimindedir.

**Uygulama durumu — 03.07.2026 P2-S1 parçalı yeni kayıt taslağı çekirdeği:** `buildBankTransactionPartialCashBankMovementDrafts`, mevcut kısmi mutabakat adaylarından banka hareketi ile kasa/banka kaydı arasındaki farkı ayrı bir read-model'e dönüştürür. `/ayarlar` Banka Entegrasyonu panelinde `Parçalı Yeni Kayıt Taslakları` tablosu banka açıklaması, banka tutarı, mevcut kasa/banka belgesi, mevcut tutar, önerilen yeni kayıt tutarı, taslak açıklama ve `Parçalı Kayıt Taslağı` durumunu gösterir. Bu dilim bilinçli olarak `CashBankMovement`, `BankLedgerEntry`, audit veya banka hareketi statüsü yazmaz; amaç parçalı mutabakatta kalan fark için oluşturulacak yeni kayıt tutarını kullanıcıya ve ilerideki server action'a aynı domain sözleşmesiyle görünür kılmaktır. Parçalı yeni kayıt onayı, belge no üretimi, aktif ledger çakışma kontrolü ve çoklu bağlantı yazımı sonraki P2-S1 yazma dilimindedir.

**Uygulama durumu — 03.07.2026 P2-S1 parçalı fark kaydı oluşturma başlangıcı:** `createPartialCashBankMovementFromTransaction`, bekleyen banka hareketi ve aynı yönlü/farklı tutarlı mevcut kasa/banka hareketi üzerinden yalnız kalan fark kadar yeni `CashBankMovement` üretir. `/ayarlar` içindeki `Parçalı Yeni Kayıt Taslakları` tablosuna hesap seçimi ve `Kayda Çevir` aksiyonu eklendi; server action aktif `kasa-banka` hesabını tekrar doğrular, `bank-transaction-partial` kaynaklı fark kaydını oluşturur ve `bank-integration.partial-cash-bank-movement-create` audit izi yazar. Bu devam diliminde banka hareketi, mevcut kasa/banka hareketi + yeni fark hareketi toplamı ile kapanınca `matched` durumuna taşınır; hem mevcut hareket hem de oluşturulan fark hareketi için `BankLedgerEntry` satırı yazılır. `BankLedgerEntry` tekilliği banka hareketi başına tek satırdan `bankTransactionId + cashBankMovementId` çiftine genişletildiği için tek banka hareketi birden fazla kasa/banka hareketiyle denetlenebilir şekilde bağlanabilir. Aynı banka hareketi/mevcut kasa-banka hareketi çifti için daha önce `bank-transaction-partial` kaynaklı fark hareketi oluşturulduysa `Kısmi Mutabakat Taslakları` ve `Parçalı Yeni Kayıt Taslakları` tekrar aynı çifti üretmez; başarılı `Kayda Çevir` sonrası ilgili manuel aday client state'ten de düşürülür. Böylece kullanıcı aynı farkı ikinci kez kayda çeviremez.

### 11.6 Teknik Yaklaşım

- Open Banking API (BDDK düzenlemeli).
- Her banka için ayrı adaptör katmanı (`BankAdapter` interface).
- Banka hareketleri `BankTransaction` geçici tablosunda; eşleştirme sonrası `LedgerEntry`'ye bağlanır.
- Senkronizasyon arka planda çalışır (worker job).

**Uygulama durumu — 03.07.2026 P2-S1 BankAdapter sözleşmesi başlangıcı:** Banka hareketi senkronizasyonu artık servis içine gömülü sandbox üreticiye doğrudan bağlı değildir. `BankAdapter` sözleşmesi `connection + timestamp` girdisiyle banka hareketlerini döndürür; `createBankIntegrationService` varsayılan olarak sandbox adaptörünü kullanır, fakat test ve ileride gerçek Open Banking bağlayıcıları için adaptör enjekte edilebilir. Mevcut `/ayarlar` Banka Entegrasyonu akışı ve audit metadata'sı korunurken, gerçek banka adaptörleri aynı `BankTransactionRow` sözleşmesine bağlanabilecek hale getirilmiştir.

**Uygulama durumu — 03.07.2026 P2-S1 BankAdapter scope güvenliği:** Enjekte edilen banka adaptöründen gelen hareketler kalıcı yazımdan önce aktif `BankIntegrationConnection` sınırına göre doğrulanır. `bankConnectionId`, `tenantId`, `companyId` veya `periodId` aktif bağlantıyla eşleşmezse senkronizasyon reddedilir; ayrıca hareketin `bankName` değeri de aktif bağlantının banka adıyla aynı olmalıdır. `BankTransaction` upsert ve audit yazımı yapılmaz. Böylece gerçek banka adaptörü hatalı, çapraz tenant veya yanlış banka etiketli veri döndürse bile SaaS izolasyonu ve kullanıcıya görünen banka bağlamı servis katmanında korunur.

**Uygulama durumu — 03.07.2026 P2-S1 BankAdapter veri bütünlüğü:** Adaptör çıktısı aynı senkronizasyon paketinde tekrar eden `externalId` veya `BankTransaction.id` taşıyamaz; kimlikler boş ya da baş/son boşluklu olamaz. Ayrıca hareket açıklaması boş ya da baş/son boşluklu olamaz. `occurredAt` ve `updatedAt` parse edilebilir, gerçek takvim gününe dayalı ISO tarih değerleri olmalıdır; `updatedAt`, `occurredAt` değerinden önce olamaz. Hareket yönü yalnız `inflow` veya `outflow` olabilir; `inflow` hareketler pozitif, `outflow` hareketler negatif tutar taşımak zorundadır. Geçersiz yön, sıfır veya ters işaretli hareketler senkronizasyonu reddeder. Bu doğrulama repository yazımından ve audit kaydından önce çalışır; böylece eşleştirme, kısmi mutabakat ve yeni kasa/banka hareket taslakları hatalı kimlik, açıklama, tarih veya yön/tutar verisiyle beslenmez.

**Uygulama durumu — 03.07.2026 P2-S1 sync idempotency / durum koruma:** Banka hareketi senkronizasyonu aynı `externalId`/deterministik id ile daha önce alınmış bir hareketi tekrar gördüğünde banka verilerini (`amount`, `description`, `occurredAt`, `updatedAt`) güncelleyebilir; ancak yerel muhasebe iş akışının verdiği `matched` veya `ignored` durumunu tekrar `pending`e çekemez. `repository.upsertTransactions` sync yolunda `preserveExistingStatus` niyetiyle çağrılır; manuel eşleştirme, yoksayma ve geri alma aksiyonları ise bilinçli durum değişikliği yapmaya devam eder.

**Uygulama durumu — 03.07.2026 P2-S1 sync durum koruma görünürlüğü:** Senkronizasyon sonucu artık `preservedStatusCount` değerini döndürür ve `bank-integration.transaction-sync` audit metadata'sına aynı sayı yazılır. `/ayarlar` Banka Entegrasyonu paneli sync sonrası "N hareket, K durum korundu" bildirimini gösterir; böylece tekrar sync çalıştırıldığında eşleşmiş veya yoksayılmış hareketlerin durumunun korunup korunmadığı kullanıcı ve denetim izi tarafından görülebilir.

**Uygulama durumu — 03.07.2026 P2-S1 adapter sync reject audit:** Adaptör scope veya veri bütünlüğü doğrulamasına takılan senkronizasyon denemeleri artık sessizce kaybolmaz. `BankTransaction` upsert yapılmadan önce `bank-integration.transaction-sync-reject` audit izi üretilir; metadata `bankCode`, `consentId`, hata mesajları, reddedilen hareket sayısı ve ilgili `externalId` listesini taşır. Böylece gerçek Open Banking adaptörü hatalı veri döndürdüğünde hem tenant izolasyonu korunur hem de operasyon ekibi başarısız sync nedenini denetim günlüğünden izleyebilir.

**Uygulama durumu — 03.07.2026 P2-S1 bankaya özel adapter registry:** `createBankIntegrationService` artık tek `bankAdapter` fallback'ine ek olarak `bankAdapters` registry'si kabul eder. Senkronizasyon sırasında aktif bağlantının `bankCode` değerine karşılık gelen adaptör varsa önce o kullanılır; yoksa mevcut sandbox/fallback adaptörü çalışır. Bu, İş Bankası, VakıfBank, QNB vb. gerçek Open Banking bağlayıcılarının aynı servis sözleşmesine bankaya özel takılmasını sağlar ve mevcut sandbox akışını geriye dönük uyumlu bırakır.

**Uygulama durumu — 03.07.2026 P2-S1 adapter hata yönetimi:** Seçilen banka adaptörü exception fırlatırsa hata artık servis dışına taşmaz. Senkronizasyon `ok:false` ve kontrollü kullanıcı mesajı ile döner; `BankTransaction` upsert yapılmaz. Aynı anda `bank-integration.transaction-sync-error` audit izi üretilir ve metadata `bankCode`, `consentId` ve adapter hata mesajını taşır. Bu davranış gerçek Open Banking zaman aşımı, servis kesintisi veya sağlayıcı hata dönüşleri için güvenli başlangıç noktasıdır.

**Uygulama durumu — 03.07.2026 P2-S1 sync hata mesajı görünürlüğü:** `/ayarlar` Banka Entegrasyonu paneli adapter exception, scope reddi veya veri bütünlüğü reddi gibi `ok:false` senkronizasyon sonuçlarını ham hata metni olarak bırakmaz; kullanıcıya `Banka hareketleri senkronize edilemedi: ...` bağlamıyla gösterir. Böylece operasyon kullanıcısı hatanın banka hareketi senkronizasyonu sırasında oluştuğunu ekrandan ayırt ederken, detaylı teknik neden audit izinde korunmaya devam eder.

---

## 12. P2 Yeni Modül: Arvento Filo Takip Entegrasyonu

### 12.1 Modül Amacı

**Kanıt:** `Ayarlar/Ayarlar-Arvento Filo Takip-01.png`, `02.png`

Mevcut plandaki "Araçlar: P2" kapsamında GPS filo takip entegrasyonu.

### 12.2 Bağlantı Ayarları

| Alan | Tip | Açıklama |
|---|---|---|
| Kullanıcı Adı | string | Arvento web servis kullanıcı adı |
| PIN1 | password | |
| PIN2 | password | |
| Yenileme Aralığı | enum | 5 / 10 / 15 / 30 dk / 1 saat |
| Özel Endpoint | url | Opsiyonel (varsayılan: ws.arvento.com) |

"Bağlantıyı Test Et" butonu: başarılı/başarısız mesajı döner.

### 12.3 Entegrasyon Özellikleri

| Özellik | Açıklama |
|---|---|
| Takibi Aktifleştir | Araçlar periyodik olarak senkronize edilir |
| Otomatik Puantaj (KM/Saat) | GPS KM/motor saati verisi günlük puantaja işlenir; KM-eşikli bakım uyarısı üretir |
| Otomatik Yakıt Takibi (CANbus/OBD) | Anlık yakıt seviyesi; dolum → yakıt kaydı; ani düşüş → hırsızlık alarmı |
| Simülasyon Modu | Test amaçlı sahte GPS verisi üretir |

### 12.4 Araç Modülüyle Bağlantı

- Araç kartında GPS konumu ve son hareket saati gösterilir.
- Günlük KM verisi araç gider analizi ve bakım takvimini besler.
- Yakıt dolumleri otomatik yakıt gideri kaydı oluşturur.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento başlangıç/read-model dilimi:** `/ayarlar` yüzeyine `Arvento Filo Takip` paneli eklendi. `src/lib/arvento-fleet-service.ts` ilk read-model sözleşmesini üretir: P2 sandbox hazırlık durumu, varsayılan `ws.arvento.com` endpoint'i, 15 dk yenileme aralığı, simülasyon modu ve GPS / otomatik puantaj / CANbus-OBD yakıt takibi yetenek tablosu. Bu dilimde Arvento web servis kullanıcı adı, PIN1/PIN2, canlı bağlantı testi, kalıcı Prisma modeli, araç kartı GPS konumu, yakıt gideri yazımı veya puantaj/bakım otomasyonu açılmadı; amaç eski pencere görünümünü değil, filo takip ayar iş akışının SaaS ayarlar yüzeyindeki başlangıç sözleşmesini kurmaktır.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento abonelik erişim kilidi:** `/ayarlar` içindeki `Arvento Filo Takip` paneli artık abonelik feature access satırını alır. Kurumsal erişim kapalıysa GPS/yakıt/puantaj sandbox hazırlık tablosu ve `Arvento Bağlantısını Test Et` aksiyonu gösterilmez; kullanıcıya `Kurumsal paket gerekli`, kilit nedeni ve gereken paket bilgisi gösterilir. `/ayarlar` server page'i aynı `findSubscriptionFeatureAccessRow(..., "arvento-fleet")` kararını client yüzeye taşır. Bu dilim canlı Arvento action guard'ı veya credential persistence açmaz; P2-S3 görünürlük ve satın alma öncesi kilit davranışını P2-S2 abonelik matrisiyle uyumlu hale getirir.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento sandbox bağlantı testi:** `src/app/actions/arvento-fleet-actions.ts` içinde `testArventoSandboxConnectionAction` açıldı ve `arvento-fleet` abonelik guard'ına bağlandı. Kurumsal erişim yoksa action aynı feature guard hata sözleşmesini döndürür; erişim varsa `src/lib/arvento-fleet-service.ts` sandbox read-model sonucunu `Aktif` durumuyla üretir ve `/ayarlar` ile genel modül sayfasını revalidate eder. `SettingsSurface` artık `persistence.testArventoConnection` verildiğinde `Arvento Bağlantısını Test Et` butonundan bu action sözleşmesini çağırır; gerçek Arvento API çağrısı, PIN1/PIN2 kaydı, canlı credential persistence ve araç kartına GPS/yakıt/puantaj yazımı hala açılmadı. Bu adım eski pencere görünümünü değil, NOA'daki filo takip bağlantı testi iş akışını SaaS abonelik ve action mimarisine taşıyan kontrollü başlangıçtır.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento credential hazırlık alanları:** `SettingsSurface` içindeki `Arvento Filo Takip` paneline `Arvento Kullanıcı Adı`, `PIN1` ve `PIN2` alanları eklendi. PIN alanları maskeli input olarak kalır; bağlantı testi öncesinde kullanıcı adı ve iki PIN için client-side zorunluluk kontrolü yapılır. Bu dilimde bu değerler server action parametresi olarak gönderilmez, audit/log çıktısına yazılmaz, Prisma modeline kaydedilmez ve canlı Arvento API'ye iletilmez. Amaç eski NOA ekranındaki bağlantı hazırlık iş akışını görünür kılmak, secret persistence kararını ayrı güvenlik/audit dilimine bırakmaktır.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento credential draft doğrulama sözleşmesi:** `src/lib/arvento-fleet-service.ts` içine `validateArventoCredentialDraft` eklendi. Kullanıcı adı, `PIN1` ve `PIN2` değerleri trim edilerek alan bazlı zorunluluk hataları üretilir; `SettingsSurface` bağlantı testi öncesinde bu domain sözleşmesini kullanır. Bu adım UI içindeki dağınık kontrolü merkezi ve testlenebilir hale getirir; secret değerler yine server action'a parametre olarak gönderilmez, kalıcı veritabanına yazılmaz ve canlı Arvento API entegrasyonuna açılmaz.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento credential readiness göstergesi:** `getArventoCredentialReadiness` ile bağlantı hazırlık durumu domain servisinde özetlenir. `SettingsSurface` panelinde `Eksik bilgi` / `Test için hazır` satırı gösterilir ve eksik alanlar sadece alan adı olarak listelenir; PIN veya kullanıcı adı değerleri özet/metin alanlarına yansıtılmaz. Bu adım eski NOA bağlantı hazırlığı iş akışını kullanıcıya görünür kılar, fakat secret persistence, audit log yazımı ve canlı API çağrısı hâlâ kapalıdır.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento no-secret audit redaction sözleşmesi:** `redactArventoCredentialDraftForAudit` helper'ı eklendi. Gelecekte credential kaydetme/test denemesi audit'e bağlandığında payload içinde gerçek kullanıcı adı, `PIN1` veya `PIN2` değeri taşımak yerine her alan için sadece `girildi` / `eksik` durumu üretilecek. Bu dilim audit log kaydı, secret vault, Prisma persistence veya canlı Arvento çağrısı açmaz; yalnızca ileride açılacak güvenlik/audit katmanı için sızıntısız domain sözleşmesini sabitler.

**Uygulama durumu — 05.07.2026 P2-S3 Arvento audit event draft hazırlığı:** `buildArventoCredentialAuditEventDraft` helper'ı eklendi. Bu helper credential preflight için `arvento.credentials.preflight` aksiyon adı, readiness özeti ve redacted credential durumlarını tek sızıntısız payload altında toplar. Gerçek audit repository yazımı, secret vault, Prisma persistence ve canlı API çağrısı hâlâ kapalıdır; amaç ileride audit açıldığında kullanılacak payload biçimini bugünden testlenebilir ve secret-safe hale getirmektir.

**Uygulama durumu — 05.07.2026 P2-S3 Araçlar route başlangıcı:** Sol navigasyona `/araclar` P2 route'u eklendi ve route `arvento-fleet` abonelik özelliğine bağlandı. `ModuleSurface` üzerinden `Araç / Filo Yönetimi` placeholder içeriği görünür; modül GPS konumu, son hareket zamanı, bakım takvimi ve Arvento bağlantısı iş akışını plan düzeyinde taşır. Kurumsal erişim kapalıysa mevcut subscription locked surface devreye girer. Bu dilimde canlı GPS verisi, araç kartı Prisma modeli, yakıt gideri otomasyonu veya bakım/puantaj yazımı açılmadı; amaç Arvento hazırlığından araç modülü görünürlüğüne kontrollü geçiş yapmaktır.

**Uygulama durumu — 05.07.2026 P2-S3 Araç takip sandbox read-model yüzeyi:** `src/lib/arvento-fleet-service.ts` içine `getDefaultArventoVehicleFleetOverview` eklendi ve `/araclar` route'u `VehicleFleetSurface` ile bu read-model'i göstermeye başladı. Yüzey toplam araç, hareket/park/sinyal kaybı, ortalama yakıt, plaka, şantiye, sürücü, konum, son sinyal, KM ve bakım durumu alanlarını listeler. Veriler sandbox/simülasyon amaçlıdır; canlı Arvento GPS API çağrısı, araç kartı Prisma modeli, yakıt gideri oluşturma, bakım görevi üretme veya puantaj otomasyonu bu dilimde açılmadı.

**Uygulama durumu — 05.07.2026 P2-S3 Araç takip uyarı read-model'i:** Araç takip sandbox read-model'i GPS sinyal kaybı, yaklaşan bakım ve yüzde 55 altı yakıt izleme durumlarından `alerts` listesi üretir. `/araclar` yüzeyi uyarı sayısı, kritik uyarı sayısı ve `Arvento Araç Uyarıları` tablosuyla operatöre önce kritik sinyal kaybını, sonra bakım ve yakıt izleme kayıtlarını gösterir. Bu dilimde uyarıdan görev oluşturma, bakım emri yazma, yakıt gideri kaydı, bildirim merkezi entegrasyonu veya canlı Arvento API alarmı açılmadı; amaç eski ekran görünümünü değil, araç takipte önceliklendirme iş akışını SaaS yüzeyine taşımaktır.

**Uygulama durumu — 05.07.2026 P2-S3 Vehicle kalıcı model başlangıcı:** Araç kartlarının ileride sandbox read-model yerine veritabanından beslenebilmesi için `Vehicle` Prisma modeli, `202607050001_add_vehicles` migration'ı, `vehicle-service` domain sözleşmesi ve `vehicle-prisma-repository` başlangıcı eklendi. Model tenant/firma/dönem scope'u, plaka tekilliği, araç tipi, marka/model/yıl, şantiye etiketi, sürücü etiketi, Arvento cihaz ID ve aktif/pasif durumunu taşır. Bu dilimde `/araclar` ekranı henüz bu repository'den veri okumaz; `VehicleAssignment`, bakım kayıtları, yakıt gideri, Arvento sync log, bildirim üretimi ve canlı GPS senkronizasyonu ayrı dilimlere bırakıldı.

**Uygulama durumu — 08.07.2026 P2-S3 Araçlar DB fallback bağlantısı:** `/araclar` route'u artık `listArventoVehicleFleetOverviewAction` üzerinden `Vehicle` repository satırlarını okumayı dener; Kurumsal Arvento erişimi yoksa mevcut abonelik guard sonucu döner ve araç repository'si çağrılmaz. Repository kapsamda araç kartı döndürürse `getArventoVehicleFleetOverview` bu kartları filo takip yüzeyindeki satırlara çevirir; hiç kayıt yoksa önceki sandbox/simülasyon read-model'i fallback olarak korunur. Bu dilimde canlı Arvento GPS senkronizasyonu, cihazdan yakıt/KM yazımı, bakım görevi, yakıt gideri veya bildirim üretimi açılmadı; amaç kalıcı araç kartı zeminini mevcut takip ekranına riskli veri yazımı olmadan bağlamaktır.

**Uygulama durumu — 08.07.2026 P2-S3 Araç kartı create action başlangıcı:** `createVehicleCardAction` eklendi; action `arvento-fleet` abonelik guard'ını kullanır, `vehicle-service` ile plaka/araç tipi/şantiye/model yılı validasyonu yapar, geçerli taslağı deterministic `Vehicle` satırına çevirip `vehicle-prisma-repository.upsert` ile kalıcılaştırır ve `/araclar` ile genel modül route cache'ini yeniler. Kurumsal erişim yoksa repository çağrılmaz; validasyon hatasında da DB yazımı ve revalidate yan etkisi oluşmaz. Bu dilimde araç kartı form UI, toplu içe aktarma, canlı Arvento cihaz eşleştirme, bakım/yakıt/bildirim otomasyonu açılmadı.

**Uygulama durumu — 08.07.2026 P2-S3 Araç kartı form UI bağlantısı:** `VehicleFleetSurface` artık `/araclar` yüzeyinde `createVehicleCardAction` persistence adapter'ı verildiğinde `Plaka`, `Araç Tipi`, `Şantiye`, `Sürücü` ve `Arvento Cihaz ID` alanlarından araç kartı taslağı toplar. Form alanları client tarafında kırpılarak action sözleşmesine gönderilir; başarılı kayıt sonrası form temizlenir, validasyon hataları aynı yüzeyde gösterilir. Salt-okunur tablo ve sandbox fallback korunur; canlı GPS senkronizasyonu, Arvento cihazından yakıt/KM yazımı, bakım görevi, yakıt gideri, bildirim üretimi ve toplu içe aktarma bu dilimde açılmadı.

**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı kayıt sonrası liste tazeleme:** `VehicleFleetSurface`, başarılı `createVehicleCardAction` sonucunda `router.refresh()` çağırarak `/araclar` server route verisini yeniden ister. Böylece yeni araç kartı DB'ye yazıldıktan sonra kullanıcı aynı ekranda güncel filo read-model'ine döner; validasyon hatasında refresh yapılmaz ve mevcut form hata durumu korunur. Bu adım yalnız kayıt sonrası tazeleme davranışını açar; canlı Arvento GPS senkronizasyonu, cihazdan yakıt/KM yazımı, bakım görevi, yakıt gideri, bildirim üretimi ve toplu içe aktarma hâlâ sonraki P2-S3 dilimlerindedir.

**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı form alan kapsamı:** `/araclar` araç kartı formu artık `Marka`, `Model` ve `Model Yılı` alanlarını da toplar ve `createVehicleCardAction` sözleşmesine `brand`, `modelName`, `modelYear` olarak gönderir. Böylece `Vehicle` kalıcı modelindeki plaka/araç tipi/şantiye/sürücü/Arvento cihaz ID alanlarının yanında marka-model-yıl bilgisi de UI'dan girilebilir hale geldi. Model yılı validasyonu yine `vehicle-service` domain sözleşmesinde kalır; bu adım canlı Arvento cihaz eşleştirme, GPS senkronizasyonu, bakım/yakıt/bildirim otomasyonu veya toplu içe aktarma açmaz.

**Uygulama durumu — 09.07.2026 P2-S3 Araç takip listesi araç tanımı:** `getArventoVehicleFleetOverview` artık kalıcı `Vehicle` kartlarından `vehicleLabel` üretir; etiket araç tipi, marka, model ve model yılını `Kamyonet / Ford Transit 2024` biçiminde birleştirir. `/araclar` takip tablosuna `Araç` kolonu eklendi; böylece kayıt sonrası tazelenen listede plakanın yanında araç tanımı da görünür. Sandbox fallback satırları da aynı alanı taşır. Bu adım hâlâ canlı GPS, yakıt/KM sync, bakım görevi, yakıt gideri veya bildirim üretimi açmaz.

**Uygulama durumu — 09.07.2026 P2-S3 Aktif filo takip filtresi:** `getArventoVehicleFleetOverview`, kalıcı `Vehicle` kartları geldiğinde yalnız `Aktif` durumundaki araçları takip read-model'ine alır. DB'de hiç araç yoksa eski sandbox fallback korunur; fakat kayıt var ve tamamı `Pasif` ise takip özeti gerçek boş liste döndürür. Böylece pasife alınmış araçlar canlı takip ekranında, uyarı sayılarında ve filo özet metriklerinde görünmez. Bu adım pasife alma UI/action'ı açmaz; yalnız mevcut `Vehicle.status` alanının takip read-model kararını sabitler.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı pasife alma backend başlangıcı:** `VehicleRepository.setStatus` sözleşmesi ve Prisma adapter uygulaması eklendi; araç statüsü yalnız aktif tenant/firma/dönem scope'u içinde `findFirst` ile doğrulandıktan sonra `Pasif` yapılır, scope dışında kalan kayıt için `null` döner ve update çalışmaz. `deactivateVehicleCardAction` aynı `arvento-fleet` abonelik guard'ını kullanır, boş araç kimliğini reddeder, bulunmayan aracı kullanıcıya `Araç kartı bulunamadı.` hatasıyla döndürür, başarılı pasife almada `/araclar` ve genel modül route cache'ini yeniler. Bu dilim henüz `/araclar` üzerinde pasife al butonu/confirm modalı açmaz; ancak önceki aktif takip filtresinin tüketeceği gerçek backend iş akışını hazırlar.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı pasife alma UI bağlantısı:** `/araclar` üzerindeki `VehicleFleetSurface` takip listesi, `deactivateVehicleCardAction` persistence adapter'ı verildiğinde her araç satırında `Pasife Al` işlemini gösterir. Buton satırın takip read-model `id` değerini server action'a gönderir; başarılı sonuçta `Araç kartı pasife alındı.` mesajı gösterilir ve `router.refresh()` ile route verisi yeniden istenir. Böylece önceki `Vehicle.status=Pasif` backend sözleşmesi ve aktif filo takip filtresi kullanıcı iş akışına bağlandı. Bu dilim toplu pasife alma, geri aktifleştirme, confirm modalı, bakım/yakıt otomasyonu veya canlı Arvento cihaz eşleştirmesi açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı pasife alma onayı:** `/araclar` takip listesindeki `Pasife Al` işlemi artık server action'ı tek tıkla çağırmaz; önce `Araç pasife alma onayı` diyaloğunu açar ve kullanıcının araç plakasını görerek ikinci `Pasife Al` onayı vermesini ister. Diyalogdaki `Vazgeç` işlemi mutasyon üretmeden kapanır; onay sonrası mevcut `deactivateVehicleCardAction`, başarı mesajı ve `router.refresh()` akışı korunur. Bu karar eski pencere görünümünü değil, riskli statü değişikliklerinde kontrollü iş akışını koruma ilkesine uygundur.
**Uygulama durumu — 09.07.2026 P2-S3 Pasife alma onayı bağlam bilgisi:** `Araç pasife alma onayı` diyaloğu artık yalnız plaka bilgisini değil, takip satırındaki `vehicleLabel` ve `siteName` bilgisini de gösterir. Kullanıcı `34 NOA 101` gibi plakayı, araç tanımını ve bağlı şantiyeyi aynı onay yüzeyinde görerek karar verir; mutasyon yine yalnız ikinci `Pasife Al` onayından sonra çalışır. Bu küçük UI sertleştirmesi, eski pencere görünümünü kopyalamadan riskli statü değişikliğinde bağlamı görünür kılma ilkesini destekler.
**Uygulama durumu — 09.07.2026 P2-S3 Pasife alma onayı klavye kapanışı:** `Araç pasife alma onayı` diyaloğu açıkken `Escape` tuşu artık diyaloğu kapatır; bu kapanış `deactivateVehicleCardAction`, `router.refresh()` veya başka mutasyon üretmez. Böylece masaüstü ERP alışkanlığına uygun hızlı vazgeçme davranışı eklenirken riskli statü değişikliği yine yalnız açık onay butonuyla çalışır.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı tekrar aktifleştirme backend başlangıcı:** `activateVehicleCardAction` eklendi; action `arvento-fleet` abonelik guard'ını, boş araç kimliği validasyonunu, scope güvenli `VehicleRepository.setStatus` çağrısını ve `/araclar` + genel modül route revalidation sözleşmesini pasife alma akışıyla simetrik kullanır. Başarılı durumda `Vehicle.status` yeniden `Aktif` yapılır; scope dışında kalan ya da bulunamayan araçta repository update ve revalidate çalışmaz. Bu dilim henüz pasif araçları listeleyen yönetim yüzeyi veya `Aktifleştir` UI butonu açmaz; sonraki araç kartı yönetim ekranı için backend iş akışını hazırlar.

---

## 13. P2 Yeni Modül: Abonelik ve Paket Yönetimi

### 13.1 Modül Amacı

**Kanıt:** `Parsek/Parsek-Mevcut Paketiniz-01.png` → `05.png`, `Parsek/Parsek-Destek Merkezi-01.png` → `04.png`, `Parsek/Parsek-Bilgi Merkezi.png`, `Parsek/Parsek-Davet Et & Kazan.png`

Mevcut plandaki "Abonelik/faturalama: P2" notunun tam planıdır.

### 13.2 Önerilen NOA Paket Yapısı (Parsek Referanslı)

| Paket | Dahil Modüller |
|---|---|
| Başlangıç | Şantiye, Tedarikçi, Kasa/Banka, Gider, Temel Raporlar |
| Standart | Başlangıç + Taşeron, Personel/Puantaj, Stok/Depo, Alış/Satış Faturası |
| Profesyonel | Standart + Hakediş, Çek, İhale, Döküman Merkezi, E-Fatura |
| Kurumsal | Profesyonel + Banka Entegrasyonu, Araç/Filo, AI Analiz |

### 13.3 Ek Özellikler (Add-on)

| Ek Özellik | Açıklama |
|---|---|
| Döküman Yönetimi (+5GB) | Ek bulut depolama alanı |
| E-Fatura/E-Arşiv | GİB entegrasyonu |
| Banka Entegrasyonu | Open Banking |
| Arvento Filo Takip | GPS araç takibi |
| AI Analiz | Metraj, risk, görsel ilerleme |
| Barkod & QR Tarayıcı | Stok giriş/çıkış |

### 13.4 UI Bileşenleri

- Mevcut paket özeti kartı (başlangıç, bitiş, tutar, otomatik yenileme).
- Birleşik Yenileme Sepeti — Aylık / Yıllık periyot seçimi (yıllık %17 indirim).
- Paketleri Yükselt bölümü: yan yana paket kartları, dahil özellikler, Yükselt butonu.
- Ek Özellikler bölümü: kart, fiyat, Satın Al butonu.
- Ödeme Geçmişi: geçmiş fatura listesi.

### 13.5 Teknik Yaklaşım

- Stripe veya yerel ödeme sistemi (Iyzico, PayTR).
- `TenantSubscription`, `SubscriptionPlan`, `Addon`, `Invoice` varlıkları.
- Feature flag sistemi: abonelik değişikliğinde modül erişimi güncellenir.
- Tenant scope sorguları aboneliğe göre modül erişimini kontrol eder.

**Uygulama durumu — 04.07.2026 P2-S2 başlangıç dilimi:** `/abonelik` rotası P2 menüye eklendi ve mevcut dinamik modül shell'i üzerinden açıldı. İlk yüzey eski pencere düzenini kopyalamadan `Mevcut Paketiniz`, destek/bilgi merkezi ve davet referanslarındaki SaaS abonelik iş akışını görünür kılar: mevcut paket özeti, aylık/yıllık yenileme sepeti, paket yükseltme, ek özellikler ve ödeme geçmişi aksiyonları ortak toolbar/read-model sözleşmesine işlendi. Bu dilimde ödeme sağlayıcı entegrasyonu, kalıcı `TenantSubscription` modeli, invoice persistence ve feature flag enforcement açılmadı; sonraki P2-S2 dilimi abonelik domain servisleri ve erişim kontrolüyle devam edecektir.

**Uygulama durumu — 04.07.2026 P2-S2 read-model/yüzey dilimi:** `src/lib/subscription-service.ts` abonelik read-model'ini açtı: mevcut `Profesyonel` paket özeti, Başlangıç/Standart/Profesyonel/Kurumsal paket kataloğu, %17 indirimli yıllık fiyat hesapları, 6 ek özellik ve 3 satırlı ödeme geçmişi tek sözleşmeden üretilir. `/abonelik` artık genel placeholder yerine `SubscriptionSurface` ile açılır; kullanıcı aylık/yıllık dönem arasında geçiş yapabilir, yenileme sepetini, paketleri, ek özellikleri ve ödeme geçmişini aynı ekranda görebilir. Bu dilim hâlâ read-only çalışır; sağlayıcı seçimi, kalıcı `TenantSubscription`/`Invoice` modelleri, satın alma server action'ları ve abonelik bazlı modül erişim enforcement sonraki P2-S2 kalıcı domain dilimine bırakılmıştır.

**Uygulama durumu — 04.07.2026 P2-S2 feature access matrisi:** Abonelik read-model'i artık yalnız paket/fiyat göstermez; `listSubscriptionFeatureAccessRows` ve `canUseSubscriptionFeature` sözleşmeleriyle özellik erişim kararını da üretir. Mevcut `Profesyonel` paket Hakediş, Çek, İhale, Döküman Merkezi ve dahil E-Fatura erişimini aktif gösterir; Banka Entegrasyonu, Arvento Filo Takip ve AI Analiz için `Kurumsal` yükseltme gereksinimini döndürür. `/abonelik` ekranına `Abonelik Erişim Matrisi` tablosu eklendi; bu tablo gelecekteki route/server action enforcement için kullanıcıya görünen karar kaynağıdır. Bu dilimde modül erişimi henüz engellenmez; kalıcı abonelik modeli ve middleware/server action guard entegrasyonu sonraki P2-S2 enforcement diliminde tamamlanacaktır.

**Uygulama durumu — 04.07.2026 P2-S2 server action guard sözleşmesi:** Next.js server action'larının doğrudan POST ile çağrılabileceği dikkate alınarak abonelik enforcement için `requireSubscriptionFeature` sonucu eklendi. Bu fonksiyon aktif özelliklerde `{ ok: true }`, kilitli özelliklerde mevcut action kalıbıyla uyumlu `{ ok: false, errors, featureLabel, requiredPlan }` döndürür; örneğin `AI Analiz` için `Kurumsal` paket hatası üretir. Bu sayede sonraki dilimde satın alma, banka entegrasyonu, Arvento veya AI gibi P2 action'ları UI durumuna güvenmeden aynı abonelik kararını server tarafında kullanabilecektir. Canlı route/action engellemesi hâlâ bilinçli olarak açılmadı.

**Uygulama durumu — 04.07.2026 P2-S2 action bridge dilimi:** `/abonelik` sayfası artık read-model'i doğrudan servis import'u ile değil `listSubscriptionOverviewAction` üzerinden alır. `src/app/actions/subscription-actions.ts`, aktif tenant scope'u okuyup abonelik overview'ini ve scope bilgisini `{ ok: true, data }` formatında döndürür; ayrıca `requireSubscriptionFeatureAction` server action katmanından aynı guard sonucunu üretir. Bu köprü, kalıcı `TenantSubscription` repository'si geldiğinde UI/route sözleşmesini değiştirmeden action içinden veri kaynağını değiştirmeyi sağlar. Henüz ödeme, satın alma veya canlı erişim kapatma mutasyonu eklenmedi.

**Uygulama durumu — 04.07.2026 P2-S2 persistence başlangıcı:** `prisma/schema.prisma` içine `SubscriptionPlan`, `SubscriptionAddon`, `TenantSubscription`, `SubscriptionInvoice` ve `TenantSubscriptionAddon` modelleri eklendi. `src/lib/subscription-prisma-repository.ts`, aktif tenant/firma/dönem scope'u için `active` abonelik satırını ve son 12 fatura kaydını okuyup mevcut `/abonelik` read-model sözleşmesine dönüştürür. `listSubscriptionOverviewAction` artık tenant scope bootstrap sonrası repository snapshot'ını kullanır; kayıt yoksa mevcut `Profesyonel` demo read-model'i korunur, kayıt varsa `integrationMode=persistence-read` ile aynı sayfa sözleşmesi DB kaynaklı çalışır. Bu dilim hâlâ read-only'dir: ödeme sağlayıcı seçimi, paket yükseltme/satın alma mutasyonları, fatura üretimi ve canlı modül erişimi kapatma sonraki P2-S2 domain/enforcement diliminde tamamlanacaktır.

**Uygulama durumu — 04.07.2026 P2-S2 checkout/fatura taslağı dilimi:** Paket kartlarındaki `Yükselt` aksiyonu artık `createSubscriptionPlanChangeCheckoutAction` server action köprüsüne bağlıdır. `createSubscriptionPlanChangeCheckout`, admin veya muhasebe rolüyle hedef paketi doğrular, mevcut paket için tekrar taslak oluşturmayı reddeder, aylık/yıllık seçime göre tutarı hesaplar ve `SUB-YYYYAAGG-PAKET-DONEM` formatında `Bekliyor` durumlu fatura taslağı döndürür. Aynı akış `subscription.checkout-draft.create` audit izi üretir ve metadata içinde `planFrom`, `planTo`, `billingCycle`, `amount`, `currency=TRY` ve `paymentProviderStatus=not-started` bilgilerini taşır. Bu dilimde ödeme sağlayıcı çağrısı, tahsilat, gerçek paket değiştirme ve modül erişimi kapatma hâlâ açılmadı; ekrandaki durum mesajı kullanıcıya fatura taslağı numarasını gösterir.

**Uygulama durumu — 04.07.2026 P2-S2 sandbox ödeme aktivasyonu:** Checkout taslağı hazırlandıktan sonra `/abonelik` yüzeyinde `Sandbox Ödeme Onayla` aksiyonu görünür. `activateSubscriptionPlanChangeAction`, aktif tenant scope'u ve mevcut abonelik snapshot'ını okuyup `activateSubscriptionPlanChange` domain akışını çalıştırır; viewer rolü reddedilir, mevcut paket tekrar aktive edilemez. `createSubscriptionPrismaRepository.activatePlanChange`, hedef paket katalog kaydını upsert eder, aynı tenant/firma/dönemdeki eski `active` abonelikleri `inactive` yapar, yeni `TenantSubscription` kaydını `active` açar ve `SubscriptionInvoice` kaydını `paid` + provider ref ile upsert eder. Akış `subscription.plan-change.activate` audit izi üretir ve kullanıcıya yeni aboneliğin bitiş tarihini gösterir. Bu hâlâ sandbox onay akışıdır; Iyzico/PayTR/Stripe webhook doğrulaması, ödeme başarısızlığı telafisi, gerçek paket değişikliği e-postası ve route/action bazlı canlı erişim kapatma sonraki P2-S2 ödeme/enforcement dilimine bırakılmıştır.

---

## 14. P2 Yeni Özellik: API Altyapısı

### 14.1 Kapsam

**Kanıt:** `Parsek/Parsek-API Dokumantasyonu-01.png` → `07.png`

| API Kategorisi | Endpoint (Hedef) | Öncelik |
|---|---|---|
| e-Fatura / e-Arşiv | 7 | P2 |
| Fatura (CRUD) | 5 | P2 |
| Cari Hesaplar | 4 | P2 |
| Stok | 4 | P2 |
| Proje/Şantiye | 3 | P2 |
| Webhook (bildirim push) | 2 | P2 |

### 14.2 API Anahtar Yönetimi

- Yeni anahtar oluştur, listele, iptal et.
- Her anahtar için kapsam seçimi (hangi API gruplarına erişim).
- Son kullanım tarihi ve rate limiting (istek/saniye).

**Uygulama durumu — 11.07.2026 P2-S4 API anahtar yönetimi başlangıç dilimi:** Araç fazının kapanışından sonra sprint sırasındaki `/api-yonetimi` P2 route'u ve navigasyon kaydı açıldı. `ApiKey` Prisma modeli tenant/firma/dönem kapsamı, ad, yalnız gösterilebilir önek, SHA-256 anahtar özeti, API kapsamları, saniyelik istek limiti, son kullanım tarihi, son kullanılma zamanı ve iptal yaşam döngüsünü taşır; `20260711120000_add_api_keys` migration'ı `insaatMuhasebe` veritabanına uygulandı. Admin kullanıcı `e-Fatura / e-Arşiv`, `Faturalar`, `Cari Hesaplar`, `Stok`, `Proje / Şantiye` ve `Webhook` kapsamlarından en az birini seçerek anahtar oluşturabilir; açık `noa_live_...` değeri yalnız başarılı oluşturma sonucunda bir kez gösterilir, repository ve audit log'a hiçbir zaman yazılmaz. Liste yalnız aktif tenant/firma/dönem kayıtlarını önek, kapsam, limit, son kullanım ve `Aktif / Süresi Doldu / İptal` durumuyla gösterir. İptal işlemi açık onay diyaloğu, scoped repository koşulu ve `api-key.revoke` audit iziyle çalışır; oluşturma da secret-safe `api-key.create` audit metadata'sı üretir. API anahtarı listesinde istemci tarafı arama, durum filtresi, kapsam filtresi ve son kullanım tarihi filtresi de açıldı; ad, önek, kapsam, son kullanım ve durum üzerinden ayıklama yapılabiliyor, boş sonuç ve temizleme davranışı aynı yüzeyde korunuyor. `Bearer` doğrulama helper'ı, `/api/entegrasyon/durum` diagnostic route'u, ilk korumalı kaynak endpoint'i olan `/api/faturalar`, birleşik cari okuma endpoint'i `/api/cari-hesaplar`, stok depo okuma endpoint'i `/api/stok-depo`, şantiye kartları okuma endpoint'i `/api/santiyeler`, e-Fatura başlangıç durum endpoint'i `/api/e-fatura/durum`, `E-Fatura Yönetimi` modül başlangıcı, e-Fatura status yüzeyi, `e-fatura-service` durum modeli ve sağlayıcı bağlantı planı eklendi; başarılı doğrulamada key özetleniyor, `lastUsedAt` güncelleniyor ve fatura/cari/stok/şantiye/e-Fatura erişim yüzeyleri tenant/firma/dönem kapsamıyla taşınıyor. Atomik rate-limit sayacı tamamlandı; webhook teslimatı ve e-Fatura sağlayıcı bağlantısı sonraki P2-S4 dilimlerindedir.


---

## 15. Ekranlar Arası Tutarlılık Kuralları

Mevcut planın bölüm 8.7'si yeni modüller için özelleştirilmiştir.

### 15.1 Firmalar Ailesi (Müşteri / Taşeron / Tedarikçi)

- **Araç çubuğu standardı:** İçe Aktar | + Yeni [Varlık] | Excel | PDF | Yazdır | Yenile — üç modülde özdeş.
- **Form bölüm sırası:** Firma Bilgileri → İletişim → Vergi → Banka → [Sözleşme (yalnızca Taşeron)] → Notlar → Kaydet/İptal.
- **Excel içe aktar:** Üç modülde aynı 3 adım UI; yalnızca şablon sütunları farklı.
- **Otomatik kod formatları:** MUS-XXXX (Müşteri), TAS-XXXX (Taşeron), TED-XXXX (Tedarikçi).

### 15.2 İhale Yönetimi Rozet Renkleri

(Mevcut plan bölüm 8.3 renk standardıyla uyumlu)

| Durum | Renk |
|---|---|
| Takip | Gri |
| Hazırlanıyor | Mavi |
| Sunuldu | Turuncu/Amber |
| Kazanıldı | Yeşil |
| Kaybedildi | Kırmızı |
| İptal | Koyu gri |

"Süre doldu" rozeti: çek vade rozetiyle aynı kırmızı/amber gösterimi.

### 15.3 Döküman Merkezi

- Dosya yükleme alanı, gider kaydındaki "evrak eki" deneyimiyle tutarlı.
- Çöp Kutusu: silinen dosyalar 30 gün bekletilir, sonra kalıcı silinir (mevcut planın "silme yerine iptal" prensibinin evrak uyarlaması).

### 15.4 Ayarlar Modülleri

- **Tüm ayar sayfaları breadcrumb:** Ana Sayfa → Ayarlar → [Sayfa Adı].
- **Sol kenar çubuğu sırası:** Kullanıcılar, Firma Bilgileri, Filo Takip, Banka Entegrasyonu, Denetim Günlüğü, Bildirim Ayarları, Finans Ayarları, Rol Yönetimi.
- **Aksiyon konumu:** Görüntüleme: sağ üst "Düzenle" butonu. Form: alt sağ "Kaydet" + "İptal".

---

## 16. Denetim Günlüğü — Yeni Modüllerin Entegrasyonu

**Kanıt:** `Ayarlar/Ayarlar-Denetim Günlüğü-01.png` → `08.png`

Parsek'in denetim günlüğü modül filtresi listesi (referans alınan tam liste):
Personel, Finans, Giderler, Avanslar, Cari Hesaplar, Müşteriler, Tedarikçiler, Taşeronlar, Stok Yönetimi, Malzemeler, Malzeme Zimmeti, Araçlar, Yakıt Kayıtları, Bakım Kayıtları, Üretim, Üretim Emirleri, Projeler, Sözleşmeler, Şubeler, Kullanıcılar, Ödemeler, Bordro, Puantaj, Yemek Kayıtları, Raporlar.

Mevcut NOA denetim günlüğüne **eklenen** yeni modüller:

| Eklenen Modül | Tetikleyen Aksiyonlar |
|---|---|
| Müşteri | Oluşturma, düzenleme, silme, içe aktarma |
| İhale | Oluşturma, durum değişikliği, BOQ düzenleme, şantiyeye çevirme |
| Döküman | Klasör oluşturma, dosya yükleme, dosya silme, paylaşım değişikliği |
| Banka Entegrasyonu | Bağlantı kurma, senkronizasyon, işlem eşleştirme |
| Arvento | Bağlantı aktivasyon/deaktivasyon |
| Rol | Oluşturma, izin değişikliği, atama |
| Abonelik | Paket yükseltme, ek özellik satın alma, iptal |
| API Anahtarı | Oluşturma, iptal |

---

## 17. Geliştirme Sırası ve Sprint Planı

### 17.1 P0 Ekleri — Mevcut P0 Sprintlerine Dahil

| P0 Eki | Eklendiği Hafta (Mevcut Plan) |
|---|---|
| Taşeron — Sözleşme Bilgileri (3 alan) | Hafta 2 (Tanımlar standardı) |
| Tedarikçi — Kategori alanı | Hafta 2 |
| CompanySettings.locationMode | Hafta 1 (Proje iskeleti) |
| Finans Ayarları KDV detayları | Hafta 1 |
| Rol Yönetimi kaynak-aksiyon matrisi UI | Hafta 1 |
| Denetim Günlüğü modül filtresi genişletme | Hafta 11 (UX sertleştirme) |

### 17.2 P1 Yeni Modüller — Sprint Sırası

P0 tamamlandıktan (Hafta 12 pilot) sonra başlayacak blok:

| Sprint | Modül | Tahmini Süre | Yalın durum |
|---|---|---|---|
| P1-S1 | Müşteri Cari Kartı + Excel Toplu İçe Aktar | 2 hafta | Çekirdek çalışıyor; gelişmiş XLSX eşleme backlog'da |
| P1-S2 | Firmalar Dashboard | 1 hafta | Tamamlandı |
| P1-S3 | İhale Yönetimi — Temel (Liste, Form Sekme 1-2, Durum geçişleri) | 2 hafta | Tamamlandı |
| P1-S4 | İhale Yönetimi — BOQ/Poz + Karlılık Simülasyonu | 2 hafta | Tamamlandı |
| P1-S5 | Döküman / Evrak Merkezi (Klasör, Sistem Klasörleri, Yükleme, Yetki) | 2 hafta | Çekirdek çalışıyor; bulut storage/scheduler backlog'da |
| P1-S6 | Bildirim Merkezi + Bildirim Ayarları | 1 hafta | Çekirdek tamamlandı; dış teslimat kanalları backlog'da |
| P1-S7 | Kullanıcı Tipleri Genişletme + Davet Akışı | 1 hafta | Çekirdek çalışıyor; granular RBAC/auth backlog'da |

**P1 toplam: ~11 hafta** (paralel geliştirme mümkünse daha kısa)

### 17.3 P2 Yeni Modüller — Sprint Sırası

| Sprint | Modül | Tahmini Süre | Yalın durum |
|---|---|---|---|
| P2-S1 | Banka Entegrasyonu (bağlantı, senkron, eşleştirme) | 3 hafta | Sandbox/read-model/recovery çalışıyor; gerçek banka/worker/tam ledger ertelendi |
| P2-S2 | Abonelik ve Paket Yönetimi | 3 hafta | Sandbox ve enforcement çalışıyor; gerçek ödeme sağlayıcısı ertelendi |
| P2-S3 | Araç/Filo + Arvento Filo Takip | 2 hafta | Kalıcı araç kartı yaşam döngüsü tamamlandı; gerçek Arvento erişimi ertelendi |
| P2-S4 | API Altyapısı + e-Fatura API | 2 hafta | Salt-okunur API fazı kapandı; yeni endpoint yok |

---

## 18. Kabul Kriterleri — Yeni Modüller

### 18.1 Firmalar Ailesi (Müşteri)

- [x] Müşteri oluşturulabilir, düzenlenebilir, pasife alınabilir (fiziksel silme yok).
- [x] Otomatik kod üretilir (MUS-XXXX), yetkili kullanıcı değiştirebilir.
- [x] Native XLSX şablonu indirilebilir; veri ve açıklamalar sayfaları tanım kolonlarından üretilir.
- [x] CSV içe aktarım önizlemesi geçerli/hatalı satır ayrımıyla çalışır.
- [x] Geçerli CSV satırları persistence bağlı ekranda `importEntityRowsAction` / `EntityCrudService.importMany` hattıyla kalıcı kaynağa eklenir.
- [~] XLSX şablonu, dosya yükleme ve 3 adımda kalıcı içe aktarım çalışır. Bu dilimde native `.xlsx` şablon, açıklamalar sayfası, başlık/satır önizleme, input ile dosya seçme, sürükle-bırak, başlık adına göre temel kolon sırası eşleme ve geçerli satırları aynı persistence hattından uygulama başladı. Çok sayfalı çalışma kitaplarında kullanıcı artık içe aktarılacak sayfayı seçebilir; seçilen sayfanın başlıkları, otomatik eşlemesi ve önizlemesi birlikte yenilenir. Gelişmiş eşlemenin domain sözleşmesi kaynak başlığı hedef tanım başlığına one-to-one map edebiliyor, eksik/çift kaynak eşlemeyi reddediyor ve XLSX kolon eşleme UI'siyle kullanıcı seçimine açılıyor.
- [x] Hatalı satırlar önizlemede kırmızı uyarı, geçerli satırlar yeşil onay satırıyla gösterilir.
- [x] Müşteri bakiyesi hareket girişleriyle güncellenir; liste/Excel görünümü ekstre hareketlerinin son yürüyen bakiyesini gösterir.
- [x] Tenant izolasyonu: başka tenant/firma/dönem kapsamındaki müşteri ve tanım kayıtları servis listesine sızmaz.
- [x] Audit log: tanım kayıtlarında tekil CREATE, toplu içe aktarım CREATE, UPDATE ve pasifleştirme/DELETE işlemleri tenant/firma/dönem ve kullanıcı bilgisiyle kaydedilir.

### 18.1A Firmalar Dashboard Başlangıç

- [x] Ana dashboard üzerinde `Firmalar Dashboard` bandı görünür.
- [x] Toplam firma, müşteri, tedarikçi ve taşeron sayaçları canlı liste verilerinden hesaplanır.
- [x] Müşteri, tedarikçi ve taşeron sayaç kartları ilgili liste rotasına link verir.
- [x] Finansal firma metrikleri ana dashboard bandında görünür: müşteri tahsilatı, tedarikçi ödemeleri, taşeron ödemeleri ve net nakit akışı.
- [x] Firma tipi dağılımı, en aktif firma listesi ve son eklenen firma listesi ana dashboard bandında görünür.
- [x] Aylık yeni firma trendi son 6 ay `createdAt` gruplamasıyla ana dashboard bandında görünür.
- [x] Dönem filtresi `period=day|week|month|year` query değeriyle paylaşılabilir şekilde çalışır ve geçersiz değerler güvenli biçimde `Bu Ay` varsayılanına düşer.
- [x] Daha zengin grafik bileşenleri erişilebilir SVG katmanı olarak tamamlandı; dağılım ve aylık trend grafiklerinde metinsel özetler korunur.
### 18.2 İhale Yönetimi

- [x] P1-S3 temel yüzeyi açıldı: `/ihale-yonetimi` rota/menü kaydı, analiz özet kartları, durum sayaçları, plan kolonlarına uygun ihale listesi ve yaklaşan/süresi dolan son teklif uyarıları görünür.
- [x] İhale oluşturulabilir (3 sekme tamamlanmadan da kaydedilebilir). Sekme 1-2 UI, server action, Prisma `Tender` modeli, tenant/firma/dönem kapsamı, duplicate ihale no kontrolü, rol kontrolü ve `tender.create` audit kaydı tamamlandı.
- [x] BOQ satırları eklenip düzenlenebilir; toplamlar otomatik hesaplanır. Yeni ihale formunda ve mevcut ihale `BOQ` editöründe satır ekleme, kopyalama, silme, canlı toplamlar ve Prisma ilişkili kalıcı create/update/list hattı tamamlandı.
- [x] Karlılık simülasyonu anlık güncellenir. Toplam Maliyet, BOQ Teklif Toplamı, Önerilen Teklif, Kâr ve Kâr Oranı UI üzerinde canlı hesaplanır; create ve `tender.boq.update` audit metadata'sında BOQ toplamları tutulur. Teklif bedeline aktarım otomatik değil, `BOQ Toplamını Teklife Aktar` aksiyonuyla kullanıcı kontrollü yapılır.
- [x] Durum geçişleri doğru sırada çalışır: `Takip -> Hazırlanıyor -> Sunuldu -> Kazanıldı/Kaybedildi/İptal`; geriye dönüş reddedilir ve geçiş audit log'a yazılır.
- [x] Son teklif tarihi geçince "Süre doldu" rozeti görünür. Demo read-model listesinde başladı; kalıcı ihale verisi ve dashboard entegrasyonunda da aynı kırmızı/amber rozet görünür ve ihale listesindeki istemci tarafı son teklif filtresiyle birlikte operatörün süresi dolan/ yaklaşan kayıtları hızlıca daraltması sağlanır.
- [x] Kazanılan ihaleden şantiye oluşturma sihirbazı açılır. `Şantiye Aç` aksiyonu yalnız `Kazanıldı` durumunda ve daha önce bağlanmamış ihalede görünür; şantiye kartı oluşturulur, ihale satırında şantiye kodu görünür ve dönüşüm audit log'a yazılır.
- [x] Analiz panosu ve liste görünümü arasında geçiş çalışır. `Analiz Panosu` görünümünde açık/sonuçlanan/süresi dolan ihale özeti, durum dağılımı ve en çok ihale açan kurumlar görünür; `Listeye Dön` ile tablo ve uyarı paneline dönülür. Durum sayaçları liste filtresi olarak çalışır.
- [x] Dashboard'da yaklaşan son teklif tarihleri görünür. Ana `/` yüzeyindeki `İhale Uyarıları` bandı yaklaşan son teklifleri, sonuç bekleyen `Sunuldu` ihaleleri ve bu ay kazanma oranını gösterir.

### 18.3 Döküman Merkezi

- [x] Sistem klasörleri otomatik oluşur, silinemez. İlk P1-S5 diliminde `/dokuman-merkezi` rotası, P1 menü kaydı, 13 sistem klasörü read-model'i, `SİSTEM` rozeti ve silme/yeniden adlandırma koruma sözleşmesi tamamlandı.
- [x] Kullanıcı yeni klasör oluşturabilir, erişim belirleyebilir. UI formu klasör adı ve `Herkes` / `Belirli kullanıcı/rol` seçimini alır; boş ve mükerrer adlar servis helper'ında reddedilir. Persistence bağlı `/dokuman-merkezi` akışı `createDocumentFolderAction` ile kalıcı `DocumentFolder` kaydı oluşturur.
- [x] Dosya buton veya sürükle-bırak ile yüklenebilir (max 5MB). `Dosya Seç` ve sürükle-bırak akışları testlidir; seçilen veya bırakılan dosya aynı `handleUploadFile` hattından `FormData` ile server action'a gider, dosya türü sınıflandırılır, metadata kalıcı yazılır ve hedef klasör sayaçları güncellenir.
- [x] Kalıcı `DocumentFolder` / `DocumentFile` metadata modeli açılır. Prisma modelleri, scope bazlı servis, repository mapping, sistem klasörü idempotent seed, dosya metadata sayaç artışı, audit kaydı ve UI'dan `createDocumentFileAction` bağlantısı testlidir.
- [x] Binary storage köprüsü açılır. Geliştirme ortamında `.noa-storage/documents` varsayılan köklü güvenli local storage adapter çalışır; `NOA_DOCUMENT_STORAGE_DIR` ile değiştirilebilir ve action katmanı bu override'ı kullanır. Local adapter dosya yazma, okuma ve `deleteObject` ile fiziksel silme destekler; doküman listesinde indir bağlantısı artık storage key üzerinden attachment route'una gider, satırlarda `Yerel Depo` / `Metaveri` etiketiyle storage görünürlüğü sunulur ve aynı görünürlük client-side filtreyle daraltılabilir; `cleanupDocumentStorageObjects` purge çıktısındaki storage key listesini idempotent fiziksel temizliğe bağlar. Üretim S3/R2/Azure Blob adapter, imzalı indirme URL'leri, production scheduler ve orphan cleanup/compensation stratejisi sonraki storage sertleştirme diliminde tamamlanacaktır.
- [x] Izgara ve liste görünümleri arasında geçiş çalışır. Sistem klasörü rozetleri ve liste kolonları görünüm geçişinde korunur.
- [x] Dosya türü filtreleme çalışır. `Tümü`, `Resimler`, `PDF`, `Dökümanlar`, `Tablolar` kontrolleri yüklenen dosya listesini `DocumentFileKind` değerine göre daraltır; eşleşme yoksa boş durum mesajı görünür.
- [x] Silinen dosyalar çöp kutusuna gider, 30 gün sonra kalıcı silinir. UI + server action + repository soft-delete, geri alma, 30 gün eşiğine göre metadata purge çekirdeği ve local storage fiziksel silme köprüsü tamamlandı: dosya tablosundaki `Sil` aksiyonu `moveDocumentFileToTrashAction` üzerinden scoped `deletedAt` yazar, aktif liste `deletedAt=null`, `Çöp Kutusu` listesi `deletedAt!=null` koşuluyla ayrılır, server'dan gelen silinmiş dosyalar yalnızca çöp sekmesinde görünür, `Geri Al` aksiyonu `restoreDocumentFileFromTrashAction` üzerinden dosyayı tekrar aktif listeye döndürür, `purgeExpiredTrash` varsayılan 30 gün eşiğini aşmış metadata kayıtlarını scoped olarak silip `purgedStorageKeys` döndürür ve `cleanupDocumentStorageObjects` bu keyleri local adapter üzerinden fiziksel temizler. Çöp sekmesi artık 30 günlük kalıcılık süresini görünür şekilde de belirtir. Production scheduler ve bulut object storage adapter işi sonraki storage/job sertleştirme dilimindedir.
- [x] Dosyalar diğer modül kayıtlarına bağlanabilir. `DocumentFile` metadata'sı opsiyonel `linkedModule`, `linkedRecordId`, `linkedRecordLabel` alanlarını taşır; `/dokuman-merkezi` yükleme paneli `Bağlı Modül` ve `Evrak No / Kayıt` bilgisiyle dosyayı fatura, gider, hakediş, ihale, kasa/banka, personel, puantaj veya şantiye gibi kaynak kayıtlarla ilişkilendirir. Dosya listesindeki `Bağlantı` kolonu bağlı kayıtlarda `/{modül}?evrak={kayıt}` hedefli tıklanabilir kaynak modül linki üretir, bağlı olmayan dosyada `-` gösterir. Gelişmiş kayıt arama/seçici sonraki UX dilimine bırakılmıştır.

### 18.4 Bildirim Merkezi

- [x] Her kategori ayrı açılıp kapatılabilir. `/bildirimler` yüzeyi 13 plan kategorisini checkbox olarak gösterir; kategori kapatılınca ilgili bildirimler ve görünür sayaçlar anlık daralır. Kullanıcı tercihi artık `NotificationPreference` tablosuna `setNotificationPreferenceAction` ile tenant/user scoped kalıcı yazılır.
- [x] Bildirim istatistikleri doğru sayılar gösterir. `buildNotificationCenterModel` toplam, okunmamış, bugün, bu hafta ve Düşük/Normal/Yüksek/Kritik öncelik dağılımını testli olarak hesaplar.
- [x] Bildirimlere tıklanınca ilgili kayıt açılır. Her bildirim `targetHref` ve `targetLabel` sözleşmesiyle `/cek`, `/stok-depo`, `/giderler`, `/taseronlar` gibi kaynak modül kayıtlarına link verir; bildirim kayıtları `Notification` tablosundan okunur.
- [x] Okunmamış bildirimler üst çubukta sayaçla gösterilir. `AppShell` okunmamış sayıyı `/bildirimler` linki olarak üst barda gösterir; sayaç `getNotificationUnreadCountAction` ile DB kaynaklı `readAt` alanından gelir. `markNotificationAsReadAction` okundu durumunu kalıcı yazar.
- [x] Domain kayıtlarından otomatik bildirim üretimi çalışır. Çek vadesi yaklaşan `Portföyde` çekler, `contractEndDate` tarihi yaklaşan aktif taşeronlar ve `StockMinimumSetting` minimum eşiğinin altındaki stok özetleri ilgili bildirim kategorilerine dönüştürülür.
- [x] Stok minimum eşikleri kalıcıdır. `/stok-depo` depo stok özetindeki satır içi minimum miktar girişi `saveStockMinimumSettingAction` ile `StockMinimumSetting` tablosuna yazılır ve Bildirim Merkezi aynı ayarı okur.
- [x] Stok kartı minimum eşiğe kaynak olur. `stok-kartlari` tanımındaki aktif kartlar varsayılan depo ve minimum miktar taşıdığında düşük stok uyarısı üretiminde kullanılır; satır özelinde kaydedilmiş minimum ayar kart değerini override eder.
- [x] Alış faturası satırında stok kartı önerisi çalışır. Kart seçimi stok kodu, stok adı, birim ve varsayılan depo bilgisini satıra doldurur; serbest stok/hizmet girişi korunur.

### 18.5 Genişletilmiş Kullanıcı Yönetimi

- [x] 6 kullanıcı tipi merkezi ayar sözleşmesinden görünür. `/ayarlar` içindeki `Kullanıcı Yönetimi` bölümü planın `Admin`, `Özel (RBAC ile Yönetilen)`, `Kullanıcı (Lokasyona Bağlı)`, `İSG Uzmanı`, `İşyeri Hekimi` ve `İşveren (Görüntüleme)` tiplerini açıklama ve yetki seviyesi kolonlarıyla listeler.
- [x] Davet paneli açılır ve rol seçimi yapılabilir. `Kullanıcı Davet Et` aksiyonu e-posta + rol seçimi içeren paneli açar, `Davet linki 7 gün geçerlidir` bilgisini gösterir ve `Davet Gönder` ile testli davet taslağı mesajı üretir.
- [x] Davet kaydı server action üzerinden kalıcı kaynağa yazılır. `UserInvitation` modeli tenant/firma/dönem, e-posta, kullanıcı tipi, durum, token hash'i, davet eden kullanıcı ve 7 gün `expiresAt` alanlarını taşır; `createUserInvitationAction` aktif scope'u garanti eder ve servis yalnız `admin` rolüne davet oluşturma izni verir. E-posta gönderimi, davet kabul ekranı ve kullanıcı listesi sonraki auth diliminde tamamlanacaktır.
- [x] Davet linki kabul ekranı açılır. `/davet?token=...` sayfası token'ı server component üzerinden okur, `InvitationAcceptSurface` ad soyad + şifre + şifre tekrar formunu gösterir ve token eksikse parola formunu kapatıp geçersiz bağlantı uyarısı verir.
- [x] Davet kabulü login kayıtlarını oluşturur. `acceptUserInvitationAction` token hash kontrolünden sonra kullanıcı, varsayılan session, scope erişimi ve credential kayıtlarını oluşturur; `Admin (Tüm Yetkiler)` dışındaki kullanıcı tipleri granular RBAC tamamlanana kadar güvenli `viewer` rolüyle başlatılır.
- [x] Aktif kullanıcı ve davet geçmişi listelenir. `listUserManagementOverviewAction` aktif scope için `AppUserScopeAccess` ve `UserInvitation` kayıtlarını okur; `/ayarlar` kullanıcı yönetimi paneli aktif kullanıcı, bekleyen davet ve kabul edilen davet sayaçlarını, aktif kullanıcı tablosunu ve davet geçmişi tablosunu gösterir.
- [x] Aktif kullanıcı scope erişimi devre dışı bırakılır. `deactivateUserAccessAction` yalnız admin için çalışır, self-disable durumunu reddeder, aktif scope içindeki `AppUserScopeAccess` satırını pasifleştirir ve audit log'a `user-management.deactivate` kaydı yazar.
- [x] Bekleyen davet iptal edilir. `revokeUserInvitationAction` yalnız admin için çalışır, aktif scope içindeki bekleyen daveti `revoked` durumuna taşır ve `/ayarlar` davet geçmişi tablosu iptal sonrası durum/sayaç bilgisini anlık günceller.
- [x] Kullanıcı yönetimi audit geçmişi görünür. `listUserManagementOverviewAction` aktif scope için `user-access` audit kayıtlarını okur; `/ayarlar` içindeki `Kullanıcı Audit Geçmişi` tablosu tarih, aksiyon, kayıt ve detay kolonlarıyla son kullanıcı erişimi hareketlerini gösterir.
- [x] Davet audit hareketleri görünür. Davet oluşturma `user-invitation.create`, davet iptali `user-invitation.revoke` hareketi olarak audit log'a yazılır; kullanıcı yönetimi audit geçmişi `user-access` ve `user-invitation` kayıtlarını birleşik son hareket akışında gösterir.
- [x] Davet kabul audit izi tutulur. `/davet?token=...` kabul akışı kullanıcı/session/access/credential kayıtlarını oluşturduktan sonra `user-invitation.accept` hareketini audit log'a yazar ve davet yaşam döngüsünü son kullanıcı katılımına kadar izlenebilir hale getirir.
- [x] Süresi dolmuş davet doğru görünür. Ayarlar read-model'i geçerlilik tarihi geçmiş pending davetleri `Süresi Doldu` olarak gösterir, bekleyen davet sayacından çıkarır ve iptal aksiyonunu kapatır.
- [x] Süresi dolmuş veya iptal edilmiş davet yeniden gönderilir. `resendUserInvitationAction` yeni token/hash ve 7 günlük yeni geçerlilik üretir, daveti tekrar `pending` yapar, audit log'a `user-invitation.resend` yazar, audit detayında yeni geçerlilik tarihini gösterir ve `/ayarlar` satırını anlık günceller.
- [x] Davet e-posta işleri kalıcı outbox'a yazılır. `EmailOutbox` tenant/firma/dönem scoped mail kuyruğu olarak açılır; davet oluşturma ve yeniden gönderme akışları SMTP'ye doğrudan bağlanmadan `pending` davet maili işi üretir.
- [x] Davet e-posta kuyruğu görünür. `listUserManagementOverviewAction` aktif scope için son `EmailOutbox` davet maili işlerini okur; `/ayarlar` içindeki `Davet E-posta Kuyruğu` tablosu alıcı, şablon, konu, tarih ve durum bilgisini salt okunur gösterir.

### 18.6 Banka Entegrasyonu (P2)

- [~] Sandbox modunda bağlantı test edilebilir. İlk P2-S1 diliminde `/ayarlar` içindeki `Banka Entegrasyonu` paneli desteklenen banka listesini, rıza numarası girişini ve kalıcı `BankIntegrationConnection` sandbox test kaydını açtı; admin dışı roller reddedilir ve test sonucu audit log'a yazılır. P2-S2 abonelik enforcement başlangıcıyla banka entegrasyonu mutasyon action'ları aktif tenant aboneliğini `createSubscriptionPrismaRepository` üzerinden okuyup `bank-integration` özelliği yoksa repository yazımı, audit ve cache revalidation yapmadan reddeder. Bu guard bağlantı testi, hareket senkronizasyonu, otomatik/manuel eşleştirme, banka hareketinden kasa/banka kaydı üretme, yoksayma ve geri alma aksiyonlarını kapsar. Aynı karar `/ayarlar` render akışında da okunur; erişim kapalıysa Banka Entegrasyonu paneli işlem tablolarını ve butonları göstermeden `Kurumsal paket gerekli` kilit yüzeyiyle açılır. Gerçek banka sandbox API adaptörü sonraki P2-S1 bağlantı sertleştirme dilimindedir.
- [~] Banka hareketleri senkronize edilir. İlk P2-S1 devam diliminde sandbox bağlantısından deterministik hareket üretimi, `BankTransaction` geçici tablosuna idempotent upsert ve `/ayarlar` son banka hareketleri görünürlüğü tamamlandı. Bekleyen hareketler artık audit izli `Yoksay` aksiyonuyla `ignored` durumuna alınabilir; yoksayılmış hareketler audit izli geri alma ile tekrar `pending` olur. Bekleyen banka hareketleri ayrıca `Yeni Kasa/Banka Hareket Taslakları` tablosunda önerilen tahsilat/ödeme kaydı olarak görünür ve aktif kasa/banka hesabı seçilerek `Kayda Çevir` aksiyonuyla `CashBankMovement`, `BankLedgerEntry` ve `matched` banka hareketi başlangıcına bağlanır. Bu yeni kayıt akışı `BNK-YYYYMMDD-DIRECTION-HASH` belge no şablonuyla aynı gün/yön çakışmasını engeller ve bağlı banka/rıza adına göre aktif kasa/banka hesap seçeneklerinden otomatik varsayılan hesap seçer. Kısmi mutabakat adaylarından kalan fark için `Parçalı Yeni Kayıt Taslakları` görünürlüğü ve kalan fark kadar `bank-transaction-partial` kaynaklı `CashBankMovement` oluşturma başlangıcı açıldı; aynı çift için oluşturulmuş fark kaydı varsa kısmi/parçalı taslaklar tekrar üretilmez. Parçalı fark oluşturma akışı artık mevcut hareket + fark hareketi toplamı banka hareketini kapattığında `matched` yazar ve iki `BankLedgerEntry` satırı üretir. Hareket senkronizasyonunda tarih filtresi başlangıcı açıldı; seçilen tarih aralığı artık giriş alanlarının altında görünür bir filtre özeti olarak da gösterilir. Son banka hareketleri tablosuna istemci tarafı durum filtresi eklendi; `Bekliyor`, `Eşleştirildi` ve `Yoksayıldı` kayıtları tek tıkla daraltılabiliyor ve boş filtre durumunda daha doğru bir boş durum metni gösteriliyor. Gerçek Open Banking adaptörü, arka plan worker ve gelişmiş parçalı mutabakat onay ekranı sonraki sertleştirme dilimindedir.
- [~] Otomatik eşleştirme önerileri gösterilir, kullanıcı onaylayabilir. Bekleyen banka hareketleri için tarih + yön + tutar + açıklama benzerliğiyle öneri tablosu, `Onayla` aksiyonu ve `Geri Al` başlangıcı tamamlandı; onay `BankTransaction.status = matched`, geri alma `pending` yazar ve iki yön de audit izi üretir. Onaydan önce aynı kasa/banka hareketine ait aktif `BankLedgerEntry` aranır; farklı banka hareketine bağlı aktif satır varsa işlem yan etkisiz reddedilir. Gelişmiş/parçalı onay sonraki P2-S1 eşleştirme sertleştirme adımındadır.
- [~] Manuel eşleştirme çalışır. İlk dilimde `/ayarlar` son banka hareketleri satırında bekleyen hareket için yön + mutlak tutar uyumlu kasa/banka hareketi seçilip `Manuel Eşleştir` ile onaylanabilir; `BankTransaction.status = matched` yazılır, `BankLedgerEntry` başlangıç satırı oluşur ve `bank-integration.manual-match-approve` audit izi üretilir. Aktif ledger çakışması varsa manuel seçim de yan etkisiz reddedilir. Aynı yönlü fakat farklı tutarlı adaylar artık servis katmanındaki `evaluateManualBankTransactionMatchCandidates` çıktısıyla `Kısmi taslak`, fark bilgisi ve `canApprove=false` olarak görünür; `buildBankTransactionPartialReconciliationDrafts` bu adayları ayrı `Kısmi Mutabakat Taslakları` read-only tablosuna taşır. Onay butonu pasiftir ve backend doğrudan çağrıda da kısmi onayı fark tutarıyla yan etkisiz reddeder. Manuel aday özetinde tam/kısmi eşleşme sayıları artık satır üstünde görünür.
- [~] Eşleştirme sonrası ledger hareketi oluşturulur. İlk dilimde otomatik/manuel tam tutar onayı `BankLedgerEntry` satırı üretir, geri alma bu satırı `voided` yapar ve aktif satır kontrolüyle aynı kasa/banka hareketinin iki farklı aktif banka hareketine bağlanması engellenir. Tam çift taraflı `LedgerEntry/LedgerLine` ve finansal raporların bu yeni defter tablosundan beslenmesi sonraki ledger çekirdeği kapsamındadır; parçalı banka mutabakatı için başlangıç çoklu `BankLedgerEntry` yazımı açılmıştır.

### 18.7 Abonelik ve Paket Yönetimi (P2)

- [~] Abonelik sayfası mevcut paket, paket kataloğu, ek özellikler ve ödeme geçmişini gösterir. İlk P2-S2 diliminde `/abonelik` rotası, `SubscriptionSurface` ve read-model sözleşmesi açıldı; sonraki dilimde aynı sözleşme server action köprüsüne taşındı. Ek özellik kartlarındaki satın alma başlangıcı artık ödeme almadan add-on fatura taslağı ve audit izi üretir. Ödeme geçmişi ve ödeme sağlayıcı olayları tablolarına istemci tarafı durum filtresi eklenerek `Ödendi`, `Bekliyor`, `Başarısız` ve sağlayıcı olay durumları hızlıca ayrıştırılabilir hale geldi; seçili filtrede kayıt yoksa uygun boş durum mesajı gösteriliyor.
- [~] Paket bazlı özellik erişim matrisi görünür. `listSubscriptionFeatureAccessRows`, mevcut `Profesyonel` paket için aktif/kilitli özellik kararlarını üretir; `requireSubscriptionFeature` ve `requireSubscriptionFeatureAction` server action katmanında aynı kararı döndürür. İlk canlı enforcement dilimi banka entegrasyonu mutasyonlarını ve `/ayarlar` Banka Entegrasyonu panel kilidini bu persistence-read abonelik kararına bağladı; diğer Kurumsal özelliklere guard yayılımı sonraki P2-S2 sertleştirme dilimindedir. Abonelik checkout, sandbox aktivasyon ve sandbox ödeme başarısızlığı aksiyonları artık `/abonelik`, `/ayarlar` ve dinamik `/[module]` page pattern'ini birlikte revalidate eder; paket erişim kararını kullanan ekranlar sonraki ziyaret/renderda güncel abonelik snapshot'ını okur.
- [~] Route guard sözleşmesi başlatıldı. `subscription-route-guard` helper'ı `hakedis`, `cek`, `ihale-yonetimi` ve `dokuman-merkezi` route slug'larını abonelik özellik anahtarlarına bağlar; banka entegrasyonu panel seviyesinde kilitlendiği için route map'e dahil edilmez. `/ayarlar` Banka Entegrasyonu paneli artık inline erişim araması yerine aynı helper'ın `findSubscriptionFeatureAccessRow` sözleşmesini kullanır. Kilitli paketlerde bu route'lar için ortak `SubscriptionLockedSurface` yüzeyi açıldı; kullanıcıya `Paket yükseltme gerekli`, gereken paket ve `/abonelik` bağlantısı gösterilir. Devam sertleştirmesinde `canLoadSubscriptionGuardedRouteData` ile kapalı guarded route'larda hakediş, çek, ihale ve döküman merkezi domain veri action'ları render guard'dan önce kesildi. Aynı feature kararı `getSubscriptionFeatureActionContext` ile çek, hakediş, ihale ve döküman merkezi server action katmanına taşındı; kilitli planda doğrudan action çağrıları servis, storage, audit ve revalidate yan etkisine girmeden reddedilir.
- [~] Kalıcı abonelik zemini başlatıldı. `SubscriptionPlan`, `SubscriptionAddon`, `TenantSubscription`, `SubscriptionInvoice` ve `TenantSubscriptionAddon` Prisma modelleri eklendi; `createSubscriptionPrismaRepository` aktif scope için abonelik/fatura snapshot'ı okuyup `/abonelik` sayfasının mevcut read-model formatına dönüştürür. Satın alma, ödeme sağlayıcı entegrasyonu, fatura üretimi ve abonelik değişikliği audit akışı sonraki P2-S2 domain dilimindedir.
- [~] Paket yükseltme checkout/fatura taslağı çalışır. `/abonelik` paket kartındaki `Yükselt` aksiyonu server action üzerinden fatura taslağı ve audit izi oluşturur; kullanıcıya taslak fatura numarası gösterilir. Devam diliminde kalıcı aktif abonelik satırı varsa aynı checkout `SubscriptionInvoice.status=pending`, `method=Ödeme sağlayıcı seçilecek` ve `invoiceNo` benzersizliğiyle ödeme geçmişine yazılır; sandbox ödeme onayı aynı `invoiceNo` üzerinden pending satırı `paid` durumuna yükseltir ve yeni aktif aboneliğe bağlar. P2-S2 webhook başlangıcıyla imzalı ödeme sağlayıcı olayları aynı aktivasyon/hata telafi domain fonksiyonlarına yönlendirilir; devamında `SubscriptionPaymentWebhookEvent` idempotency kaydı eklendi ve aynı provider event tekrar geldiğinde abonelik snapshot, audit, aktivasyon/fail telafisi ve cache revalidation yan etkilerine girilmeden `duplicate` sonucu döner. Provider özel hata eşleme başlangıcı eklendi; webhook failure event'leri `providerFailureCode` gönderdiğinde `insufficient_funds`, `card_declined`, `expired_card` ve `invalid_cvc` kodları kararlı Türkçe hata nedenlerine çevrilir ve audit metadata'sına kodla birlikte işlenir. Canlı sağlayıcı adaptörü sonraki ödeme sertleştirme dilimindedir.
- [~] Sandbox ödeme onayıyla abonelik aktive edilir. Checkout taslağından sonra `Sandbox Ödeme Onayla` aksiyonu hedef paketi `TenantSubscription.active`, faturayı `SubscriptionInvoice.paid` olarak yazar ve eski aktif abonelikleri `inactive` durumuna alır. Devam diliminde `Sandbox Ödeme Hatası` aksiyonu aynı checkout faturasını `SubscriptionInvoice.failed`, `method=Ödeme sağlayıcı hata döndü` ve provider hata referansıyla işaretler; hedef paket aktive edilmez ve mevcut aktif abonelik korunur. `processSubscriptionPaymentWebhook` ve `/api/subscription/webhook` route'u raw body + `x-noa-payment-signature` HMAC doğrulamasıyla success/failure event'lerini işler ve başarılı event sonrası `/abonelik`, `/ayarlar`, `/[module]` yüzeylerini revalidate eder. Devam diliminde abonelik süresi dolma guardı feature access kararının merkezine eklendi; `endsAt < today` olduğunda paket seviyesi Kurumsal olsa bile özellik matrisi, route guard ve server action guard kapalı döner. Canlı sağlayıcı adaptörü ve otomatik yenileme/tahsilat denemesi sonraki dilimdedir.
- [x] Abonelik süresi dolmuş aktif pakette yüzey uyarısı görünür. `SubscriptionSurface` artık `today` sözleşmesiyle süresi dolmuş abonelikleri panel seviyesinde `Süresi doldu` rozeti ve neden satırıyla gösteriyor; böylece feature access kilidi yalnız backend guard'da değil, kullanıcı yüzeyinde de görünür hale geliyor.

### 18.8 API Altyapısı (P2)

- [x] API anahtarı oluşturma, scoped listeleme ve iptal etme akışı açıldı. `/api-yonetimi` route'u, kalıcı `ApiKey` modeli, admin rol kontrolü, açık onaylı iptal ve tenant/firma/dönem izolasyonu testlidir.
- [x] Anahtar açık değeri yalnız oluşturma sonucunda bir kez gösterilir. Veritabanı yalnız SHA-256 özeti ve güvenli öneki saklar; liste ve audit metadata'sı açık anahtar değerini taşımaz.
- [x] Kapsam, son kullanım tarihi ve saniyelik istek limiti doğrulanır. En az bir plan kategorisi seçilir, tarih gerçek takvim günü ve gelecekte olmalıdır, limit `1..100` aralığında tam sayıdır.
- [x] Anahtar yaşam döngüsü audit log'a yazılır. Oluşturma `api-key.create`, iptal `api-key.revoke` aksiyonlarıyla anahtar öneki ve gizli olmayan operasyon metadata'sı izlenir.
- [x] API altyapısının korumalı okuma yüzeyi tamamlandı. Bearer doğrulama ve atomik rate limiting sözleşmeleri korunarak tüm planlı modül read-model'leri için tenant/firma/dönem scoped liste ve gerekli özet/filtre endpoint'leri açıldı; API anahtar sözleşmesi 30 tekil scope ile route'larla eşlendi ve integration tanılama için ayrı scope guard'ı eklendi. Endpoint'ler secret/token döndürmez, yalnızca mevcut persistence read-model'lerini taşır ve dış sağlayıcı, webhook teslim worker'ı, e-Fatura/Open Banking canlı adaptörü veya finansal mutasyon başlatmaz. Route, scope, filtre, tenant izolasyonu ve yetkisiz Bearer davranışları hedefli testlerle güvenceye alındı. Canlı sağlayıcı adaptörleri ve gerçek outbound worker'lar bilinçli olarak kapsam dışıdır.

---

## 19. Parsek Ekran Görüntüsü — Kapsam Dışı Bırakılan Öğeler

Parsek'in NOA'nın inşaat odağıyla örtüşmeyen modülleri:

| Modül | Neden Dışarıda |
|---|---|
| Yemek Takibi | Şirket yemeği gider türü olarak ele alınır, ayrı modül değil |
| Üretim Modülü / Üretim Emirleri | İmalat odaklı; inşaat için geçerli değil |
| Marketplace Entegrasyonu (n11, Hepsiburada) | Perakende; kapsam dışı |
| Lastik Yönetimi | P2 araç yönetiminin alt detayı olarak tekrar değerlendirilir |
| Barkod & QR Tarayıcı (fiziksel cihaz) | P2 stok genişletmede ayrıca ele alınır |

**Seçici alınan öğeler (mantık değil UI/tasarım):**
- Rol yönetimi kaynak-aksiyon matris **UI yapısı** (mantık mevcut plandan).
- Denetim günlüğü **modül filter listesi** (Parsek dropdown referans).
- Banka entegrasyonunda **banka logoları ve bağlantı akışı** referans.
- Bildirim ayarlarında **kategori isimleri ve yönetim mantığı**.
- İhale formunun **3 sekme yapısı ve BOQ kolon isimleri**.

---

## 20. Bu Belgenin Canlılık Kuralları

1. Her yeni modül geliştirmeye başlanmadan önce bu belgede ilgili bölüm gözden geçirilir.
2. Yeni referans ekran görüntüleri eklenirse "Kanıt" satırları güncellenir.
3. Kapsam değişikliği işaretleme: P1 → P2, P2 → Kapsam Dışı.
4. **Mevcut planda (analiz-ve-gelistirme-plani.md) hiçbir değişiklik yapılmaz**; yalnızca bu belge güncellenir.
5. Geliştirme kararları bu belgede `> **Karar:** açıklama` formatıyla kayıt altına alınır.
6. Test senaryoları Bölüm 18 kriterleriyle karşılaştırılır.

---

*Son güncelleme: 03.07.2026 — Tüm Parsek-insaat ekran görüntüleri (Firmalar 14+3, İhale 5, Döküman 6, Ayarlar 36, Parsek 18 görsel) ve ana NOA iş akışı ekran havuzu (`NOA-insaat-SS görseller`: 162 görsel; Ana Sayfa 1, Arayüz yerleşimi 1, Toolbar/Ribbon 106, Menü Çubuğu 54) temel alınmış; P1-S5 Döküman Merkezi dosya seçme, 5MB validasyon, kalıcı metadata, UI FormData action bağlantısı, local storage adapter yazma/okuma/silme köprüsü, dosya türü filtreleme, Çöp Kutusu `deletedAt` soft-delete, geri alma, 30 gün metadata purge çekirdeği, diğer modül kayıtlarına bağlantı metadata'sı ve P1-S6 Bildirim Merkezi read-model/UI sayaç, kategori toggle, kayıt linki, üst bar okunmamış sayaç, Prisma `Notification` / `NotificationPreference` persistence, preference upsert, okundu işaretleme action akışı, çek/taşeron/stok domain bildirim üretimi, kalıcı `StockMinimumSetting` eşikleri, `stok-kartlari` kaynaklı minimum stok uyarıları ve P1-S7 Genişletilmiş Kullanıcı Yönetimi kullanıcı tipi/davet paneli + kalıcı davet token başlangıcı + davet kabul ekranı ve credential/session oluşturma + aktif kullanıcı/davet geçmişi read-model + kullanıcı devre dışı bırakma audit akışı + bekleyen davet iptali + kullanıcı/davet audit geçmişi görünürlüğü + davet kabul audit izi + davet süre sonu görünürlüğü + davet yeniden gönderme başlangıcı + resend audit geçerlilik detayı + davet e-posta outbox başlangıcı + davet e-posta kuyruğu görünürlüğü uygulama durumuna işlenmiştir.*

*Ek güncelleme: 03.07.2026 — P2-S1 Banka Entegrasyonu sandbox bağlantı/test kaydı, `BankIntegrationConnection` kalıcı modeli, `/ayarlar` Banka Entegrasyonu paneli, `bank-integration.sandbox-test` audit başlangıcı, `BankTransaction` geçici hareket modeli, sandbox hareket senkronizasyon görünürlüğü, `CashBankMovement` tabanlı otomatik eşleşme önerisi, audit izli eşleşme onayı, eşleşme geri alma başlangıcı, yön/tutar uyumlu manuel eşleştirme başlangıcı, `BankLedgerEntry` defter bağlantısı başlangıcı, aktif ledger çakışma kontrolü, kısmi mutabakat görünürlüğü başlangıcı, manuel aday değerlendirme domain sözleşmesi, backend kısmi onay guard'ı, read-only kısmi mutabakat taslakları tablosu, audit izli banka hareketi yoksayma aksiyonu, yoksayma geri alma akışı, yeni kasa/banka hareket taslakları, banka hareketinden `CashBankMovement` oluşturma başlangıcı, yeni kayıt hesap seçimi, banka hareketi belge no tekilleştirme, banka-rıza bazlı varsayılan hesap eşleme, parçalı yeni kayıt taslağı read-model'i, parçalı fark `CashBankMovement` oluşturma başlangıcı, parçalı fark duplicate taslak guardı, parçalı fark sonrası client taslak temizliği, parçalı fark sonrası matched statüsü ve çoklu `BankLedgerEntry` yazımı, banka hareketi tarih aralıklı senkronizasyon başlangıcı, ters tarih aralığı guardı, malformed tarih formatı guardı, takvim günü tarih guardı, adapter `occurredAt` takvim günü hareket tarihi guardı, adapter `updatedAt` güncelleme tarihi guardı, adapter `updatedAt >= occurredAt` sıralama guardı, adapter `pending` statü guardı, adapter `TRY` para birimi guardı, adapter direction enum guardı, adapter sonlu tutar guardı, adapter boş `externalId` guardı, adapter kırpılmamış `externalId` guardı, adapter boş hareket kimliği guardı, adapter kırpılmamış hareket kimliği guardı, adapter tekrar eden hareket kimliği guardı, adapter boş hareket açıklaması guardı, adapter kırpılmamış hareket açıklaması guardı, adapter bağlantı banka adı uyum guardı, enjekte edilebilir `BankAdapter` senkronizasyon sözleşmesi, adaptör scope güvenlik doğrulaması, adaptör veri bütünlüğü kontrolleri, sync idempotency durum koruması, sync durum koruma görünürlüğü, adapter sync reject audit izi, bankaya özel adapter registry, adapter hata yönetimi ve sync hata mesajı görünürlüğü uygulama durumuna işlenmiştir.*

*Ek güncelleme: 04.07.2026 — P2-S2 Abonelik enforcement başlangıcı uygulama durumuna işlenmiştir: banka entegrasyonu mutasyon server action'ları aktif tenant aboneliğini persistence-read snapshot'tan okuyup `bank-integration` özelliğini zorunlu tutar; Kurumsal abonelik yoksa bağlantı, senkronizasyon, eşleştirme, kasa/banka hareketi üretme, yoksayma, geri alma, audit izi ve cache revalidation yan etkisiz reddedilir, Kurumsal abonelik varsa mevcut banka iş akışları korunur. Devamında `/ayarlar` route'u aynı abonelik erişim satırını `SettingsSurface` içine taşır; kilitli planda panel yalnız yükseltme gerekçesini gösterir ve banka işlem butonlarını/taslak tablolarını render etmez.*

*Ek güncelleme: 04.07.2026 — P2-S2 Route guard sözleşmesi uygulama durumuna işlenmiştir: `subscription-route-guard` helper'ı paket kontrollü route slug'larını abonelik özellik anahtarlarıyla eşler, navigasyon sırasına göre guard listesi üretir ve ortak feature access satırı bulma fonksiyonunu `/ayarlar` Banka Entegrasyonu panel kilidinde kullanıma alır.*

*Ek güncelleme: 04.07.2026 — P2-S2 Kilitli route yüzeyi uygulama durumuna işlenmiştir: `SubscriptionLockedSurface`, paket erişimi kapalı route'larda ortak `Paket yükseltme gerekli` ekranını sunar; `/[module]` render sırası bu yüzeyi modül yüzeylerinden önce çalıştıracak şekilde bağlandı.*

*Ek güncelleme: 04.07.2026 — P2-S2 Kilitli route veri yükü sertleştirmesi uygulama durumuna işlenmiştir: `canLoadSubscriptionGuardedRouteData` helper'ı kapalı abonelik erişim satırında domain veri yüklemeyi durdurur; `/[module]` guarded route koşulları bu helper'a bağlandı.*

*Ek güncelleme: 04.07.2026 — P2-S2 Guarded domain server action enforcement uygulama durumuna işlenmiştir: `getSubscriptionFeatureActionContext` helper'ı aktif scope + kalıcı abonelik snapshot'ı + feature guard kararını tek sözleşmede toplar; çek, hakediş, ihale yönetimi ve döküman merkezi action'ları bu context üzerinden çalışır ve kilitli planda domain servis/storage/audit/revalidate yan etkisi oluşmadan erken reddedilir.*

*Ek güncelleme: 04.07.2026 — P2-S2 Checkout fatura kalıcılığı uygulama durumuna işlenmiştir: paket yükseltme checkout aksiyonu kalıcı aktif abonelik satırı bulunduğunda pending `SubscriptionInvoice` taslağı yazar; repository invoice upsert anahtarını tenant/firma/dönem + `invoiceNo` benzersizliğine taşıdı, böylece sandbox ödeme onayı aynı fatura numarasını `paid` durumuna yükselterek yeni aktif aboneliğe bağlar.*

*Ek güncelleme: 04.07.2026 — P2-S2 Sandbox ödeme başarısızlığı telafisi uygulama durumuna işlenmiştir: abonelik checkout akışına `failSubscriptionPlanChangeCheckout` domain fonksiyonu, repository `markCheckoutInvoicePaymentFailed` upsert'i, server action köprüsü ve `/abonelik` üzerinde `Sandbox Ödeme Hatası` butonu eklendi; bu akış faturayı `failed` durumuna alır, audit izi üretir ve hedef paketi aktive etmeden mevcut aboneliği korur.*

*Ek güncelleme: 04.07.2026 — P2-S2 Abonelik cache revalidation sertleştirmesi uygulama durumuna işlenmiştir: checkout, sandbox ödeme onayı ve sandbox ödeme hatası action'ları ortak `revalidateSubscriptionSurfaces` helper'ı üzerinden `/abonelik`, `/ayarlar` ve `/[module]` page pattern'ini revalidate eder; böylece paket erişim matrisi, banka panel kilidi ve guarded modül yüzeyleri abonelik değişikliğinden sonra aynı karar setine döner.*

*Ek güncelleme: 04.07.2026 — P2-S2 ödeme webhook doğrulama başlangıcı uygulama durumuna işlenmiştir: `subscription-payment-webhook` domain modülü `subscription.payment.succeeded` ve `subscription.payment.failed` event'lerini raw body HMAC imzasıyla doğrular, imza geçersizse snapshot/repository/audit yan etkisine girmeden reddeder, imza geçerliyse mevcut `activateSubscriptionPlanChange` veya `failSubscriptionPlanChangeCheckout` akışlarına yönlendirir. `/api/subscription/webhook` Route Handler `NOA_PAYMENT_WEBHOOK_SECRET` ve `x-noa-payment-signature` sözleşmesiyle bu domain fonksiyonunu dış dünyaya açar; başarılı webhook sonrası abonelik, ayarlar ve guarded modül cache yüzeyleri yenilenir.*
*Ek güncelleme: 04.07.2026 — P2-S2 ödeme webhook idempotency sertleştirmesi uygulama durumuna işlenmiştir: `SubscriptionPaymentWebhookEvent` Prisma modeli ve migration zemini eklendi; repository `claimPaymentWebhookEvent` ile tenant bazlı `eventId` tekilliğini kontrol eder, ilk event'i `processing` olarak claim eder, duplicate event'i domain mutasyonlarına girmeden `duplicate` sonucuyla döndürür ve `completePaymentWebhookEvent` ile processed/failed sonucu kalıcı kayda işler. `/api/subscription/webhook` duplicate sonuçta abonelik yüzeylerini revalidate etmez; gerçek durum değişikliği üreten success/failure event'lerinde mevcut revalidation korunur.*
*Ek güncelleme: 04.07.2026 — P2-S2 abonelik süresi dolma guardı uygulama durumuna işlenmiştir: `listSubscriptionFeatureAccessRows`, `canUseSubscriptionFeature`, `requireSubscriptionFeature`, `findSubscriptionFeatureAccessRow` ve `findSubscriptionRouteAccessRow` artık opsiyonel tarih parametresiyle aboneliğin `endsAt` değerini kontrol eder; süre dolduysa plan Kurumsal/Profesyonel olsa dahi feature erişimi `enabled=false` döner, kilit nedeni `Abonelik süresi ... tarihinde doldu. Paketi yenilemek gerekir.` olarak gösterilir ve server action guard hata metni paket yükseltme yerine yenileme gereğini bildirir.*
*Ek güncelleme: 04.07.2026 — P2-S2 ödeme provider hata kodu eşleme başlangıcı uygulama durumuna işlenmiştir: `subscription.payment.failed` webhook payload'ı opsiyonel `providerFailureCode` alanını kabul eder; bilinen provider kodları kullanıcı/audit için kararlı Türkçe `failureReason` metnine normalize edilir, bilinmeyen kodlarda provider kodu korunarak genel ret metni üretilir ve `failSubscriptionPlanChangeCheckout` audit metadata'sına `paymentProviderFailureCode` olarak yazılır. İşlenmiş başarısız ödeme event'lerinde aynı normalize neden `SubscriptionPaymentWebhookEvent.errorMessage` alanında saklanır; böylece provider event satırı `processed/failed` kalsa bile operasyon ekranları kullanıcıya/audit'e gösterilen ret nedenini kaybetmez.*
*Ek güncelleme: 04.07.2026 — P2-S2 ödeme sağlayıcı olay görünürlüğü uygulama durumuna işlenmiştir: abonelik read-model'i artık son 8 `SubscriptionPaymentWebhookEvent` kaydını `paymentProviderEvents` olarak taşır; Prisma repository bu listeyi tenant/firma/dönem scope'una göre `receivedAt desc` sıralamasıyla okur ve `/abonelik` yüzeyi `Ödeme Sağlayıcı Olayları` tablosunda event id, tip, fatura, işleme durumu, normalize hata nedeni ve alınma zamanını gösterir. Bu sayede webhook idempotency/failure kayıtları yalnız teknik log olarak kalmaz, SaaS operasyon ekranında ödeme geçmişinden ayrı ama aynı abonelik bağlamında izlenebilir.*
*Ek güncelleme: 04.07.2026 — P2-S2 sandbox ödeme sağlayıcı session adapter uygulama durumuna işlenmiştir: paket yükseltme checkout akışı artık opsiyonel `SubscriptionPaymentProvider` adapter sözleşmesini kabul eder; server action katmanı sandbox adapter ile `providerSession` üretir ve `/abonelik` yüzeyi checkout taslağı hazırlandığında `Ödeme Sağlayıcıya Git` bağlantısını gösterir. Bu dilim canlı Iyzico/PayTR/Stripe entegrasyonu değildir; canlı sağlayıcılar için değişmeyecek domain sınırını, provider ref üretimini, session expiry bilgisini ve UI redirect sözleşmesini hazırlar.*
*Ek güncelleme: 04.07.2026 — P2-S2 provider ref fatura taslağı kalıcılığı uygulama durumuna işlenmiştir: sandbox ödeme sağlayıcı session üretildiğinde dönen `providerRef` artık pending `SubscriptionInvoice.providerRef` alanına yazılır; aynı invoice upsert update kolu da bu ref değerini korur. Böylece checkout taslağı, provider redirect/session ve sonraki webhook eventleri aynı fatura numarası yanında provider referansı üzerinden de izlenebilir.*
*Ek güncelleme: 04.07.2026 — P2-S2 ödeme sağlayıcı session expiry görünürlüğü uygulama durumuna işlenmiştir: sandbox provider session `expiresAt` bilgisini üretmeye devam eder ve `/abonelik` checkout banner'ı ödeme sağlayıcı bağlantısının yanında `Geçerli:` zamanını gösterir. Böylece kullanıcı geçici ödeme linkinin süresini görür; operasyon tarafı provider session, pending fatura ve webhook event izini aynı ödeme akışında okuyabilir.*
*Ek güncelleme: 04.07.2026 — P2-S2 sandbox ödeme sağlayıcı redirect korelasyonu uygulama durumuna işlenmiştir: sandbox checkout URL sözleşmesi artık `checkout`, `provider` ve URL-encode edilmiş `providerRef` parametrelerini birlikte taşır. Böylece kullanıcı ödeme sağlayıcıya yönlendirildiğinde görünen redirect/session bilgisi, pending `SubscriptionInvoice.providerRef` kalıcılığı ve sonraki webhook event korelasyonu aynı referans üzerinden okunur; canlı sağlayıcı entegrasyonlarında da eski pencere görünümü değil, bu ödeme takip iş akışı korunacaktır.*
*Ek güncelleme: 05.07.2026 — P2-S2 sandbox ödeme UI korelasyonu uygulama durumuna işlenmiştir: `/abonelik` üzerindeki `Sandbox Ödeme Onayla` ve `Sandbox Ödeme Hatası` aksiyonları artık checkout draft içindeki `providerSession.providerRef` değerini aktivasyon/hata server action çağrılarına taşır; provider session yoksa eski sandbox fallback korunur. Böylece ödeme sağlayıcı redirect linki, pending fatura `providerRef`, manuel sandbox onay/hata simülasyonu ve webhook korelasyonu aynı ödeme referansı etrafında birleşir.*
*Ek güncelleme: 05.07.2026 — P2-S2 ödeme sağlayıcı referans görünürlüğü uygulama durumuna işlenmiştir: `/abonelik` içindeki `Ödeme Sağlayıcı Olayları` tablosu artık event id, tip, fatura, durum, neden ve alınma zamanı yanında `providerRef` değerini de gösterir. Böylece sandbox redirect/session, pending fatura, manuel sandbox onay/hata simülasyonu ve webhook event kayıtları operasyon ekranında aynı sağlayıcı referansı üzerinden takip edilebilir.*
*Ek güncelleme: 05.07.2026 — P2-S2 ödeme geçmişi başarısız fatura görünürlüğü uygulama durumuna işlenmiştir: kalıcı `SubscriptionInvoice.status=failed` kayıtları artık abonelik read-model ödeme geçmişine `Başarısız` olarak map edilir ve `/abonelik` ödeme geçmişi tablosunda bekleyen ödeme gibi görünmez. Böylece sandbox hata telafisi ve provider failure webhook akışlarında kullanıcı aynı faturanın başarısız olduğunu ödeme geçmişinden de okuyabilir.*
*Ek güncelleme: 05.07.2026 — P2-S2 ödeme geçmişi yöntem görünürlüğü uygulama durumuna işlenmiştir: `/abonelik` ödeme geçmişi tablosu artık fatura, tarih, tutar ve durum yanında `method` bilgisini `Yöntem` kolonu olarak gösterir. Böylece başarısız ödeme telafisi sonrası kullanıcı yalnız `Başarısız` durumunu değil, satırın `Ödeme sağlayıcı hata döndü` yöntemiyle kapandığını da okuyabilir; ödeme sağlayıcı olayları ve ödeme geçmişi aynı fatura bağlamında birbirini tamamlar.*
*Ek güncelleme: 05.07.2026 — P2-S2 ödeme geçmişi sağlayıcı referansı görünürlüğü uygulama durumuna işlenmiştir: `SubscriptionInvoice.providerRef` artık abonelik ödeme geçmişi read-model satırına taşınır ve `/abonelik` ödeme geçmişi tablosunda `Sağlayıcı Ref` kolonu olarak gösterilir. Böylece ödeme geçmişi, ödeme sağlayıcı olayları, sandbox redirect/session ve webhook kayıtları aynı provider referansı üzerinden karşılaştırılabilir; provider ref yoksa satır `-` ile boşluğu açıkça gösterir.*
*Ek güncelleme: 05.07.2026 — P2-S2 ödeme geçmişi boş durum görünürlüğü uygulama durumuna işlenmiştir: `/abonelik` ödeme geçmişi tablosu artık persistence-read snapshot ödeme satırı döndürmediğinde boş tbody bırakmaz; `Kayıtlı ödeme geçmişi yok.` satırıyla faturasız/yeni tenant durumunu açık gösterir. Böylece ödeme geçmişi, provider ref ve webhook olayları yokken de SaaS ekranı kullanıcıyı boş tabloyla karşılamaz.*
*Ek güncelleme: 05.07.2026 — P2-S2 ek özellik checkout taslağı başlangıcı uygulama durumuna işlenmiştir: `/abonelik` ek özellik kartlarındaki `Satın Al` aksiyonu artık `createSubscriptionAddonCheckoutAction` server action köprüsüne bağlıdır. `createSubscriptionAddonCheckout`, viewer rolünü reddeder, dahil ek özellik için tekrar satın alma taslağı oluşturmaz, seçilen add-on için `ADD-YYYYAAGG-ADDON-MONTHLY` formatında `Bekliyor` fatura taslağı döndürür ve `subscription.addon-checkout-draft.create` audit izi üretir. Devam diliminde aktif abonelik satırı varsa aynı add-on checkout `SubscriptionInvoice.status=pending`, `method=Ödeme sağlayıcı seçilecek`, `providerRef=null` ve tenant/firma/dönem + `invoiceNo` benzersizliğiyle ödeme geçmişine yazılır. Bu dilim ödeme tahsilatı veya `TenantSubscriptionAddon` kalıcı aktivasyonu yapmaz; eski pencere görünümü değil, ek özellik satın alma başlangıç iş akışı korunur.*
*Ek güncelleme: 05.07.2026 — P2-S2 ek özellik sandbox aktivasyon backend başlangıcı uygulama durumuna işlenmiştir: `activateSubscriptionAddonCheckout`, `activateSubscriptionAddonCheckoutAction` ve repository `activateAddon` köprüsü eklendi. Sandbox onayında seçilen add-on katalog satırı upsert edilir, aktif aboneliğe bağlı `TenantSubscriptionAddon.status=active` satırı tenant/firma/dönem + abonelik + add-on benzersizliğiyle yazılır ve aynı invoiceNo `SubscriptionInvoice.status=paid`, `method=Sandbox ödeme onayı`, `providerRef` ile kapatılır. Akış `subscription.addon.activate` audit izi üretir. Bu dilim henüz `/abonelik` UI üzerinde add-on sandbox onay butonu veya webhook yönlendirmesi açmaz; sonraki adım kullanıcı yüzeyi ve provider event entegrasyonudur.*
*Ek güncelleme: 05.07.2026 — P2-S2 ek özellik sandbox aktivasyon UI başlangıcı uygulama durumuna işlenmiştir: `/abonelik` ek özellik `Satın Al` aksiyonundan sonra oluşan checkout taslağı artık client state'te tutulur ve `Sandbox Ek Özellik Onayla` butonu görünür. Bu buton `activateSubscriptionAddonCheckoutAction` server action köprüsüne `addonId`, `invoiceNo` ve `sandbox-addon-ui-confirmation` provider referansı gönderir; başarılı sonuçta kullanıcıya ek özelliğin aktivasyon başlangıç tarihi gösterilir. Bu hâlâ sandbox manuel onaydır; provider redirect/session ve webhook ile add-on aktivasyonu sonraki ödeme entegrasyonu dilimine bırakılmıştır.*
*Ek güncelleme: 05.07.2026 — P2-S2 aktif ek özellik read-model ve erişim kararı uygulama durumuna işlenmiştir: `createSubscriptionPrismaRepository.getCurrentSnapshot` artık aktif aboneliğe bağlı `TenantSubscriptionAddon.status=active` satırlarını okuyup `activeAddonIds` olarak abonelik snapshot'ına taşır. `listSubscriptionOverview` bu bilgiyle ek özellik kartını `active` statüsüne çevirir; `/abonelik` kartı `aktif` etiketi ve kilitli `Aktif` butonuyla yeniden satın almayı engeller. Feature access matrisi aktif add-on'u `addon-included` kaynağıyla erişim açıcı kabul eder; örneğin aktif `bank-integration` ek özelliği Kurumsal paket yükseltmesi olmadan Banka Entegrasyonu erişimini açar.*

*Ek güncelleme: 05.07.2026 — P2-S2 Banka Entegrasyonu aktif add-on guard doğrulaması uygulama durumuna işlenmiştir: banka entegrasyonu mutation server action'ları `getBankIntegrationMutationContext` üzerinden abonelik snapshot'ını okuduğu için aktif `TenantSubscriptionAddon.status=active` + `addonId=bank-integration` satırı Profesyonel plan üzerinde de bağlantı testi ve sonraki banka iş akışı mutasyonlarını açar. Kurumsal paket zorunluluğu korunur, ancak satın alınmış add-on aynı iş akışını `addon-included` kaynağıyla yetkilendirir; action testi bu davranışı kalıcı olarak kilitler ve kilitli planda repository/audit/revalidate yan etkisiz ret sözleşmesi değişmeden kalır.*

*Ek güncelleme: 05.07.2026 — P2-S2 ek özellik ödeme sağlayıcı session korelasyonu uygulama durumuna işlenmiştir: `createSubscriptionAddonCheckout` artık paket yükseltme checkout akışıyla aynı sandbox payment provider adapter'ını kullanarak add-on faturası için `providerSession`, `providerRef`, redirect URL ve session expiry üretir. Aktif abonelik satırı varsa pending `SubscriptionInvoice.providerRef` artık `null` kalmaz; audit metadata'sı `paymentProviderStatus=created`, provider ve providerRef bilgisini taşır. `/abonelik` yüzeyi add-on checkout sonrası `Ek Özellik Ödeme Sağlayıcıya Git` bağlantısını gösterir ve `Sandbox Ek Özellik Onayla` aksiyonu fallback yerine aynı providerRef'i aktivasyon action'ına gönderir; böylece add-on satın alma taslağı, ödeme sağlayıcı redirect'i, sandbox onay ve sonraki ödeme geçmişi/webhook korelasyonu tek referans üzerinden izlenir.*

*Ek güncelleme: 05.07.2026 — P2-S2 ek özellik success webhook aktivasyonu uygulama durumuna işlenmiştir: `subscription.payment.succeeded` webhook payload'ı artık `targetPlanId` yerine `addonId` taşıdığında paket değişikliği yoluna değil `activateSubscriptionAddonCheckout` akışına yönlenir. İmzalı provider success event'i aktif abonelik snapshot'ını okur, add-on katalog + `TenantSubscriptionAddon.status=active` + paid `SubscriptionInvoice.providerRef` kalıcılığını aynı providerRef ile yazar, `subscription.addon.activate` audit izi üretir ve webhook event satırını `processed/activated` olarak kapatır. Failure webhook akışı bu dilimde hâlâ plan checkout başarısızlığına bağlıdır; add-on failure telafisi sonraki dar dilime bırakılmıştır.*

*Ek güncelleme: 05.07.2026 — P2-S2 ek özellik failure webhook telafisi uygulama durumuna işlenmiştir: `subscription.payment.failed` webhook payload'ı `addonId` taşıdığında artık hedef paket kimliği aramaz; `failSubscriptionAddonCheckout` domain akışı pending add-on faturasını aynı `providerRef` ile `SubscriptionInvoice.status=failed`, `method=Ödeme sağlayıcı hata döndü` olarak kapatır. Akış `subscription.addon-checkout-payment.fail` audit izi üretir, provider hata kodunu normalize edilmiş neden ile metadata'ya yazar ve webhook event satırını `processed/failed` + hata nedeni ile tamamlar. Böylece add-on success, add-on failure, ödeme geçmişi ve ödeme sağlayıcı olayları aynı provider referansı üzerinden izlenebilir.*

*Ek güncelleme: 05.07.2026 — P2-S2 ek özellik manuel sandbox failure UI/action uygulama durumuna işlenmiştir: `failSubscriptionAddonCheckoutAction` server action köprüsü eklendi ve `/abonelik` yüzeyi add-on checkout taslağı hazırlandığında `Sandbox Ek Özellik Hatası` aksiyonunu gösterir. Bu aksiyon checkout içindeki `providerSession.providerRef` değerini kullanarak aynı pending add-on faturasını `failed` kapatır, `subscription.addon-checkout-payment.fail` audit izini üretir ve abonelik/ayarlar/guarded modül yüzeylerini revalidate eder. Böylece provider webhook beklemeden add-on ödeme hatası manuel sandbox senaryosunda da uçtan uca denenebilir.*

*Ek güncelleme: 05.07.2026 — P2-S2 süresi dolmuş ek özellik erişim sertleştirmesi uygulama durumuna işlenmiştir: `createSubscriptionPrismaRepository.getCurrentSnapshot`, `TenantSubscriptionAddon.status=active` olsa bile `endsAt` günü bugünden önce olan add-on satırlarını `activeAddonIds` içine taşımaz. Böylece ödeme/iptal/gecikmiş bakım sebebiyle DB'de aktif statüsü kalmış eski add-on satırları Banka Entegrasyonu gibi guarded özellikleri yanlışlıkla açamaz; `endsAt=null` ise süresiz add-on kabul edilir ve mevcut providerRef/audit/payment history korelasyonu değişmeden korunur.*

*Ek güncelleme: 05.07.2026 — P2-S2 gelecekte başlayacak ek özellik erişim sertleştirmesi uygulama durumuna işlenmiştir: `TenantSubscriptionAddon.status=active` olsa bile `startsAt` günü bugünden sonra olan add-on satırları `activeAddonIds` içine taşınmaz. Böylece ileri tarihli aktivasyon, provider gecikmesi veya planlı add-on başlangıcı durumlarında Banka Entegrasyonu gibi guarded özellikler erken açılmaz; add-on yalnız `startsAt <= bugün <= endsAt` aralığında erişim açıcı kabul edilir.*
*Ek güncelleme: 05.07.2026 — P2-S2 ödeme webhook hedef belirsizliği sertleştirmesi uygulama durumuna işlenmiştir: imzalı provider event payload'ı aynı anda hem `targetPlanId` hem `addonId` taşıyorsa event artık snapshot, invoice, audit veya aktivasyon repository'lerine dokunmadan reddedilir. Böylece paket yükseltme ve ek özellik satın alma iş akışları aynı provider referansı içinde karışmaz; her ödeme event'i yalnız tek hedef türünü işleyebilir.*
*Ek güncelleme: 05.07.2026 — doğrulama zemini sertleştirmesi uygulama durumuna işlenmiştir: büyüyen React/jsdom yüzey testleri full suite içinde varsayılan 5 saniyelik Vitest test timeout'una takıldığı için repo test timeout'u 15 saniyeye çıkarıldı. İzole geçen ağır UI testleri ve `--testTimeout=15000` full suite kanıtı sonrası bu ayar kalıcılaştırıldı; ayrıca Banka Entegrasyonu ayar yüzeyi testindeki ardışık async status mesajları kullanıcıya görünen DOM güncellemesini `waitFor` ile bekleyecek şekilde sertleştirildi. Amaç ürün davranışını değiştirmek değil, planlı geliştirme dilimlerinde güvenilir tam regresyon alabilmektir.*














**Uygulama durumu — 09.07.2026 P2-S3 Pasif araç kartları UI ve aktifleştirme başlangıcı:** `/araclar` artık `listArventoVehicleFleetOverviewAction` payload'ında tüm `vehicleCards` satırlarını taşır; canlı takip overview'u yalnız `Aktif` araçları göstermeye devam eder. `VehicleFleetSurface` `status=Pasif` kartları ayrı `Pasif Araç Kartları` bandında listeler ve `activateVehicleCardAction` adapter'ı ile tek satır aktifleştirme sağlar. Başarılı aktifleştirmede `Araç kartı aktifleştirildi.` mesajı gösterilir ve `router.refresh()` çalışır. Bu dilim toplu aktifleştirme, aktifleştirme onay modalı, pasif arşiv filtreleri veya canlı Arvento cihaz eşleştirmesi açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı aktifleştirme onayı:** `/araclar` pasif araç bandındaki `Aktifleştir` işlemi artık server action'ı tek tıkla çağırmaz; önce `Araç aktifleştirme onayı` diyaloğunu açar. Diyalog plaka, araç tanımı ve şantiye bilgisini gösterir; `Vazgeç` ve `Escape` mutasyon üretmeden kapanır. İkinci `Aktifleştir` onayı verildiğinde mevcut `activateVehicleCardAction` çalışır, başarıda `Araç kartı aktifleştirildi.` mesajı gösterilir ve `router.refresh()` ile aktif takip read-model'i yeniden istenir. Bu adım eski pencere görünümünü değil, statü değişikliğinde kontrollü iş akışını korur; toplu aktifleştirme, pasif arşiv filtreleri ve canlı Arvento cihaz eşleştirmesi açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Pasif araç kartları arama ve sayaç:** `/araclar` pasif araç bandı artık toplam pasif kart sayısını `N pasif kart` rozetiyle gösterir ve `Pasif araçlarda ara` alanı ile plaka, araç tanımı, şantiye ve sürücü üzerinden client-side filtreleme yapar. Arama yalnız pasif kart yönetim bandını etkiler; aktif Arvento takip read-model'i, uyarı tabloları ve server action payload'ları değişmez. Sonuç bulunamadığında tablo içinde `Pasif araç bulunamadı.` boş durum satırı gösterilir. Bu dilim pasif kartların daha büyük listelerde yönetilebilir olmasını sağlar; server-side arama, sayfalama, pasif arşiv raporu veya toplu aktifleştirme açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı şantiye önerileri:** `/araclar` araç kartı formundaki `Şantiye` alanı artık `vehicle-site-suggestions` datalist'i ile mevcut takip read-model satırlarından ve pasif/aktif araç kartlarından gelen şantiye adlarını önerir. Alan serbest metin davranışını korur; kullanıcı öneriden seçim yapabilir veya yeni şantiye adı yazabilir. Seçilen/yazılan değer mevcut `createVehicleCardAction` payload'ına `siteName` olarak gider. Bu adım şantiye bağlamını daha tutarlı girmeye yardımcı olur; zorunlu şantiye lookup'ı, server-side şantiye doğrulaması, şantiye kodu eşleştirme veya ayrı şantiye seçim modalı açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı araç tipi önerileri:** `/araclar` araç kartı formundaki `Araç Tipi` alanı artık `vehicle-type-suggestions` datalist'i ile mevcut takip read-model'indeki araç etiketlerinden ve pasif/aktif araç kartlarından gelen tipleri önerir. Alan serbest metin davranışını korur; kullanıcı `Kamyon`, `Kamyonet`, `Binek` gibi önerilerden seçim yapabilir veya yeni tip yazabilir. Seçilen/yazılan değer mevcut `createVehicleCardAction` payload'ına `vehicleType` olarak gider. Bu adım araç tipi raporlamasını daha tutarlı girmeye yardımcı olur; zorunlu tip katalog yönetimi, server-side tip doğrulaması, tip kodu eşleştirme veya ayrı araç tipi ayar ekranı açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı marka önerileri:** `/araclar` araç kartı formundaki `Marka` alanı artık `vehicle-brand-suggestions` datalist'i ile mevcut takip read-model'indeki araç etiketlerinden ve pasif/aktif araç kartlarından gelen markaları önerir. Alan serbest metin davranışını korur; kullanıcı `Mercedes`, `Ford`, `Renault` gibi önerilerden seçim yapabilir veya yeni marka yazabilir. Seçilen/yazılan değer mevcut `createVehicleCardAction` payload'ına `brand` olarak gider. Bu adım marka raporlamasını daha tutarlı girmeye yardımcı olur; zorunlu marka katalog yönetimi, server-side marka doğrulaması, marka kodu eşleştirme veya ayrı marka ayar ekranı açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı model önerileri:** `/araclar` araç kartı formundaki `Model` alanı artık `vehicle-model-suggestions` datalist'i ile mevcut takip read-model'indeki araç etiketlerinden ve pasif/aktif araç kartlarından gelen model adlarını önerir. Alan serbest metin davranışını korur; kullanıcı `Arocs`, `Transit`, `Megane` gibi önerilerden seçim yapabilir veya yeni model yazabilir. Seçilen/yazılan değer mevcut `createVehicleCardAction` payload'ına `modelName` olarak gider. Bu adım model raporlamasını daha tutarlı girmeye yardımcı olur; zorunlu model katalog yönetimi, marka-model bağımlı doğrulama, server-side model doğrulaması veya ayrı model ayar ekranı açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç kartı öneri helper standardizasyonu:** `/araclar` araç kartı formundaki `Şantiye`, `Araç Tipi`, `Marka` ve `Model` datalist kaynakları artık ortak `buildSuggestionList` helper'ı ile trim edilir, boş değerlerden arındırılır, Türkçe locale sıralanır ve büyük/küçük harf farkına duyarsız tekilleştirilir. Böylece `Mercedes` / `mercedes`, `Arocs` / `arocs`, `Merkez Şantiye` / `merkez şantiye` gibi varyantlar kullanıcıya iki ayrı öneri olarak görünmez. Bu adım yalnız öneri listesi üretimini standardize eder; kayıt payload'ı, server action sözleşmesi, zorunlu katalog doğrulaması veya ayrı ayar ekranı açmaz.
**Uygulama durumu — 09.07.2026 P2-S3 Araç etiketi marka/model parser sertleştirmesi:** `/araclar` araç kartı önerileri için takip read-model'indeki `vehicleLabel` ayrıştırması artık tek `parseVehicleLabelDetails` helper'ından geçer. Parser `Mercedes Benz Arocs 1848 2022` gibi iki kelimeli marka örneklerinde marka önerisini `Mercedes Benz`, model önerisini `Arocs 1848` olarak ayırır ve sondaki dört haneli model yılını model adından düşürür. Bu adım öneri listelerinin doğruluğunu artırır; araç kartı kayıt payload'ı, kalıcı veri modeli, server-side marka/model doğrulaması veya marka-model katalog yönetimi açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı model yılı doğrulama sertleştirmesi:** `/araclar` araç kartı formundaki opsiyonel `Model Yılı` alanı artık mobil/sayısal klavye için `inputMode=numeric`, dört karakter sınırı ve dört haneli sayı pattern'i taşır. Domain doğrulaması `20AB`, `2024.5`, `NaN` ve sonsuz değerlerin karşılaştırmadan kaçmasını engelleyen sonlu tam sayı kontrolüyle sertleştirilmiştir; dolu geçerli yıllarda mevcut `1900–2100` aralık kuralı korunur. Böylece istemci girişi yönlendirilirken server action sınırındaki doğrulama asıl güvenlik katmanı olmaya devam eder; model yılı zorunlu yapılmaz, veri modeli veya araç kartı kayıt sözleşmesi değiştirilmez.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı sürücü önerileri:** `/araclar` araç kartı formundaki opsiyonel `Sürücü` alanı artık `vehicle-driver-suggestions` datalist'i ile aktif takip read-model satırlarından ve pasif/aktif araç kartlarından gelen atanmış sürücü adlarını önerir. Öneriler ortak `buildSuggestionList` standardıyla trim edilir, Türkçe locale sıralanır ve büyük/küçük harf farkına duyarsız tekilleştirilir; takip sistemindeki boş atama göstergesi `Atanmamış` seçilebilir sürücü önerisi olarak gösterilmez. Alan serbest metin davranışını korur ve yeni sürücü adı mevcut `createVehicleCardAction` payload'ına `driverName` olarak gider. Bu adım personel kartı lookup'ı, sürücü yetkinlik doğrulaması, zorunlu atama veya ayrı sürücü katalog yönetimi açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Arvento cihaz kimliği benzersizlik koruması:** `/araclar` araç kartı kaydındaki opsiyonel `arventoDeviceId` artık trim ve Türkçe büyük harf normalizasyonundan geçer. `createVehicleCardAction`, aynı tenant/firma/dönem içinde farklı bir araç kartına atanmış cihaz kimliğini persistence öncesinde reddeder; aynı plaka kartının kendi cihaz kimliğiyle güncellenmesi korunur. PostgreSQL katmanına `Vehicle(tenantId, companyId, periodId, arventoDeviceId)` birleşik unique kuralı eklenmiş, eşzamanlı istek yarışında oluşabilecek Prisma `P2002` hatası da kullanıcıya `Arvento cihaz ID başka bir araç kartında kullanılıyor` form hatası olarak çevrilmiştir. `arventoDeviceId=null` olan cihazsız kartlar çoğul kalabilir. Bu dilim canlı Arvento API cihaz doğrulaması, cihaz envanteri senkronizasyonu, cihaz değiştirme geçmişi veya ayrı eşleştirme ekranı açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı kontrollü düzenleme başlangıcı:** `/araclar` aktif takip tablosunda yalnız kalıcı `vehicleCards` karşılığı bulunan satırlar ve pasif araç kartları artık `Düzenle` aksiyonu taşır; sandbox takip satırları düzenlenebilir kart gibi gösterilmez. Aksiyon mevcut araç tipi, marka, model, model yılı, şantiye, sürücü ve Arvento cihaz kimliğini ortak forma yükler, plaka kimliğini değişiklik boyunca kilitler ve `Vazgeç` ile formu yeni kayıt moduna döndürür. Güncelleme mevcut `createVehicleCardAction` upsert köprüsünü kullanır; server action aynı plaka kartının `status`, `createdAt` ve `createdBy` değerlerini koruduğu için pasif kart düzenleme sırasında kendiliğinden aktife dönmez. Başarı mesajı `Araç kartı güncellendi.` olarak yeni kayıttan ayrılır ve gizli `siteCode` değeri düzenlemede kaybolmaz. Bu dilim plaka değiştirme, ayrı edit route/modalı, alan bazlı audit geçmişi veya optimistic concurrency sürüm kontrolü açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı create/update action ayrımı:** kontrollü düzenleme başlangıcındaki geçici `createVehicleCardAction` upsert kullanımı ayrıştırılmıştır. Yeni kayıt action'ı artık aynı tenant/firma/dönemde mevcut plakayı sessizce güncellemez; `Araç plakası bu dönem için zaten kullanılıyor` hatasıyla reddeder ve eşzamanlı oluşturmalarda PostgreSQL `P2002` plaka çakışmasını aynı form hatasına dönüştürür. Yeni `updateVehicleCardAction(vehicleId, values)` önce abonelik/tenant scope kontrolünü uygular, kartı kimliğiyle aktif scope içinde bulur, istemciden farklı plaka gönderilse bile kalıcı plaka kimliğini korur ve mevcut `status`, `createdAt`, `createdBy` değerleriyle günceller. `/araclar` düzenleme modu yalnız bu update adapter'ını çağırır; böylece oluşturma ve güncelleme niyeti server action sınırında açıkça ayrılmıştır. Bu dilim optimistic concurrency sürümü, alan bazlı audit diff'i veya plaka değiştirme iş akışı açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı create/update audit izi:** başarılı `createVehicleCardAction` ve `updateVehicleCardAction` işlemleri artık ortak Prisma audit repository üzerinden sırasıyla `vehicle.create` ve `vehicle.update` kayıtları üretir. Audit satırı tenant/firma/dönem ve aktör kullanıcı bağlamını, `entityType=vehicle`, araç kimliği/plaka etiketi ve işlem zamanını taşır; metadata yalnız operasyonel özet olarak araç tipi, şantiye, statü ve Arvento cihaz kimliğini içerir. Doğrulama, mevcut plaka, cihaz çakışması veya scope dışı kart reddinde persistence, audit ve revalidate yan etkisi oluşmaz. Bu dilim eski-yeni alan değerlerinin tam diff'ini, araç audit geçmişi UI'ını, durum değişikliği audit'ini veya transaction/outbox tabanlı audit teslim garantisini açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç statü değişikliği audit izi:** başarılı `deactivateVehicleCardAction` ve `activateVehicleCardAction` işlemleri artık sırasıyla `vehicle.deactivate` ve `vehicle.activate` audit kayıtları üretir. Kayıtlar tenant/firma/dönem ve aktör bağlamına ek olarak araç kimliği/plaka, sonuç statüsü, araç tipi, şantiye ve Arvento cihaz kimliği özetini taşır; `occurredAt` kalıcı araç satırının `updatedAt` değeriyle koreledir. Abonelik guard reddi, boş kimlik veya aktif scope dışında kart durumlarında statü persistence'ı, audit ve revalidate çalışmaz. Böylece create, update, activate ve deactivate araç yaşam döngüsü action'ları aynı `entityType=vehicle` audit sözleşmesinde birleşmiştir. Bu dilim audit geçmişi UI'ını, durum nedeni/açıklaması alanını veya transaction/outbox teslim garantisini açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç işlem geçmişi read-model ve UI:** `listArventoVehicleFleetOverviewAction`, araç kartlarıyla birlikte ortak audit repository'den aktif tenant/firma/dönem scope'undaki son 20 `entityType=vehicle` kaydını `occurredAt desc, createdAt desc` sırasıyla okur ve `auditEntries` olarak `/araclar` yüzeyine taşır. Yeni `Araç İşlem Geçmişi` tablosu zaman, plaka, işlem, sonuç statüsü ve aktör kullanıcı sütunlarını gösterir; `vehicle.create`, `vehicle.update`, `vehicle.activate`, `vehicle.deactivate` kodları Türkçe operasyon etiketlerine çevrilir, bilinmeyen kodlar izlenebilirlik için ham haliyle görünür kalır. Kayıt yoksa `Araç işlem geçmişi bulunamadı.` boş durumu aynı tablo düzeninde gösterilir. Bu dilim geçmiş araması/filtrelemesi, sayfalama, satır detay diff'i, dışa aktarma veya ayrı audit merkezi açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç işlem geçmişi client-side filtreleri:** `/araclar` içindeki `Araç İşlem Geçmişi` tablosu artık server'dan gelen son 20 scoped audit satırını yeni istek veya mutasyon üretmeden plaka, işlem kodu ve aktör kullanıcı kimliğine göre client-side daraltır. Plaka ve kullanıcı aramaları trim edilmiş, büyük/küçük harf duyarsız kısmi eşleşme kullanır; Türkçe `I/ı` ile ASCII kullanıcı kimlikleri arasındaki arama farkı normalize edilir. İşlem filtresi mevcut audit payload'ındaki bilinen ve bilinmeyen action kodlarından dinamik seçenek üretir; bilinen kodlar Türkçe etiketle, bilinmeyenler ham kodla izlenebilir kalır. Aktif filtrede `eşleşen / toplam işlem` sayacı ve sonuç yoksa `Filtrelerle eşleşen araç işlemi bulunamadı.` boş durumu gösterilir; filtresiz gerçek boş durumda önceki mesaj korunur. Bu dilim server-side arama, sayfalama, tarih aralığı, dışa aktarma veya audit satır diff'i açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç güncelleme audit alan özeti:** `updateVehicleCardAction`, başarılı persistence sonucunu güncelleme öncesindeki scoped araç kartıyla karşılaştırır ve `vehicle.update` audit metadata'sına yalnız değişen alanların kararlı anahtarlarını `changedFields` olarak yazar. İzlenen kapsam araç tipi, marka, model, model yılı, şantiye kodu/adı, sürücü ve Arvento cihaz kimliğidir; değiştirilemeyen plaka, korunan statü ve teknik zaman/kullanıcı alanları diff'e alınmaz. Eski-yeni serbest metin değerleri metadata'ya kopyalanmadığı için audit yükü kontrollü kalır. `Araç İşlem Geçmişi` tablosundaki yeni `Değişiklikler` kolonu bilinen anahtarları Türkçe operasyon etiketlerine çevirir, bilinmeyen anahtarları ham gösterir, eski kayıtlarda `-`, değişikliksiz update kaydında `Bilgi değişmedi` gösterir. Bu dilim eski/yeni değerlerin tam diff'ini, değişiklik detayı modalını, optimistic concurrency veya transaction/outbox audit teslim garantisini açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı optimistic concurrency koruması:** `/araclar` düzenleme modu kart formu açılırken kalıcı `Vehicle.updatedAt` sürümünü saklar ve `updateVehicleCardAction` çağrısına araç kimliğiyle birlikte taşır. Server Action sürüm bilgisini geçerli ISO zamana normalize eder, aktif tenant/firma/dönem listesindeki mevcut sürümle ön kontrol yapar ve repository yazımını `id + tenantId + companyId + periodId + expected updatedAt` koşuluyla atomik Prisma `update` üzerinden gerçekleştirir. Kayıt form açıldıktan sonra veya ön kontrol ile yazım arasındaki yarış penceresinde başka bir işlem tarafından değiştirildiyse Prisma `P2025` sonucu güvenli çakışmaya çevrilir; araç verisi, `vehicle.update` audit kaydı ve cache revalidation üretilmeden kullanıcıya `Güncel bilgileri yükleyip tekrar deneyin.` yönlendirmesi gösterilir. Başarılı güncelleme, kontrollü audit `changedFields` özeti ve route refresh akışı değişmeden korunur. Bu dilim alan bazlı merge, otomatik yeniden yükleme/yeniden uygulama, pessimistic lock veya transaction/outbox audit teslim garantisi açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç güncelleme çakışması kurtarma UX'i:** optimistic concurrency reddi artık genel validasyon metninden ayrılan kararlı `VEHICLE_UPDATE_CONFLICT` action kodunu taşır. `VehicleFleetSurface` yalnız bu kod döndüğünde hata mesajının yanında `Güncel Kaydı Yükle` aksiyonunu gösterir; kullanıcı bu işlemi seçtiğinde eski form taslağı, araç kimliği ve `updatedAt` sürümü temizlenir, düzenleme modu kapanır ve `router.refresh()` ile scoped server read-model'i yeniden istenir. Kullanıcı güncel satırı tekrar `Düzenle` ile açarak yeni sürüm üzerinden kontrollü değişiklik yapabilir. Diğer domain validasyonu, plaka/cihaz benzersizliği, aktivasyon ve pasifleştirme hataları kurtarma butonu üretmez. Bu dilim kullanıcının eski taslağını otomatik yeniden uygulamaz, alan bazlı merge veya çakışma karşılaştırma modalı açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç işlem geçmişi filtreli CSV dışa aktarma:** `Araç İşlem Geçmişi` başlığına `CSV Dışa Aktar` bağlantısı eklendi. İndirme payload'ı server'dan gelen tüm audit listesini değil, kullanıcının plaka/işlem/kullanıcı filtrelerinden sonra tabloda gördüğü `filteredAuditEntries` satırlarını kullanır; sonuç yoksa bağlantı `aria-disabled` görünümüne geçer ve boş dosya indirmez. Yeni `vehicle-audit-export` helper'ı zaman, plaka, Türkçe işlem etiketi, son durum, değişiklik özeti ve kullanıcı kolonlarını semikolon ayrımlı CSV'ye dönüştürür; noktalı virgül, çift tırnak ve satır sonlarını güvenli kaçırır, Excel/Türkçe karakter uyumu için UTF-8 BOM'lu `data:text/csv` href ve kararlı `arac-islem-gecmisi.csv` dosya adı üretir. Tablo ve dışa aktarma aynı action/değişiklik sunum helper'larını kullandığı için bilinen Türkçe etiketler ve bilinmeyen ham kod davranışı ayrışmaz. Bu dilim XLSX üretimi, server-side export, tarih aralığı veya 20 kayıttan büyük audit sayfalaması açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç işlem geçmişi tarih aralığı filtresi:** `/araclar` audit filtre bandına `Başlangıç tarihi` ve `Bitiş tarihi` kontrolleri eklendi. Filtre, audit kaydının `occurredAt` zamanını kullanıcının ekranda gördüğü yerel takvim gününe dönüştürür ve başlangıç/bitiş günlerini dahil ederek mevcut plaka, işlem ve kullanıcı koşullarıyla birlikte uygular. Sayaç, tablo boş durumu ve `CSV Dışa Aktar` payload'ı aynı `filteredAuditEntries` sonucunu tüketir; böylece dışa aktarılan kayıtlar tarih filtresinden kaçamaz. Başlangıç tarihi bitiş tarihinden sonraysa erişilebilir `role=alert` mesajı gösterilir, tablo açık hata satırına döner ve CSV bağlantısı pasifleşir. Bu dilim server-side tarih sorgusu, 20 kayıttan büyük audit sayfalaması, saat aralığı veya kayıt saklama politikası açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı yakıt türü dikey dilimi:** Referans araç ekranındaki `Yakıt` bilgisinin SaaS iş akışındaki karşılığı olarak kalıcı `Vehicle.fuelType` alanı ve PostgreSQL migration'ı eklendi. `/araclar` araç kartı formundaki opsiyonel `Yakıt Türü` alanı `Benzin`, `Dizel`, `Elektrik`, `Hibrit` ve `LPG` standart önerilerini mevcut araç kartlarındaki değerlerle birleştiren serbest metin datalist'i kullanır; değer create/update sınırında trim edilir, düzenleme formuna geri yüklenir ve aktif/pasif araç listelerinde görünür. Create, update, activate ve deactivate audit metadata özetleri yakıt türünü taşır; güncelleme diff'i `fuelType` değişikliğini izler ve işlem geçmişi/CSV sunumu bunu `Yakıt türü` etiketiyle gösterir. Bu dilim yakıt tüketimi, litre/maliyet hareketleri, depo/fiş yönetimi, zorunlu yakıt kataloğu veya canlı Arvento yakıt telemetrisi açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı şase numarası kimlik koruması:** Referans araç ekranındaki `Şase No` iş akışının SaaS karşılığı olarak opsiyonel kalıcı `Vehicle.chassisNumber` alanı ve PostgreSQL migration'ı eklendi. Değer create/update domain sınırında trim edilip Türkçe büyük harfe normalize edilir, düzenleme formuna geri yüklenir, pasif araç aramasına katılır ve aktif/pasif araç listelerinde görünür. Aynı tenant/firma/dönem içindeki dolu şase numarası hem action ön kontrolünde hem birleşik PostgreSQL unique kuralıyla tek araca bağlanır; eşzamanlı `P2002` yarışı `Şase no başka bir araç kartında kullanılıyor` form hatasına çevrilir, `null` olan şase numarasız kartlar çoğul kalabilir. Create, update, activate ve deactivate audit metadata özetleri şase numarasını taşır; update diff'i alanı izler ve işlem geçmişi/CSV sunumu `Şase no` etiketini kullanır. Bu dilim şase numarası uzunluk/üretici standardı doğrulaması, VIN çözümleme, dış servis sorgusu, ruhsat belgesi OCR'ı veya motor numarası alanını açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı motor numarası dikey dilimi:** Referans araç ekranındaki `Motor No` iş akışının SaaS karşılığı olarak opsiyonel kalıcı `Vehicle.engineNumber` alanı ve PostgreSQL migration'ı eklendi. Değer create/update domain sınırında trim edilip Türkçe büyük harfe normalize edilir, düzenleme formuna geri yüklenir, pasif araç aramasına katılır ve aktif/pasif araç listelerinde görünür. Create, update, activate ve deactivate audit metadata özetleri motor numarasını taşır; update diff'i alan değişikliğini izler ve işlem geçmişi/CSV sunumu `Motor no` etiketini kullanır. Motor değişimi ve yenileme operasyonlarında yeni motor bilgisinin başka bir kartı kilitlememesi için bu alan şase numarasından farklı olarak tenant/firma/dönem unique kuralı taşımaz. Bu dilim motor değişim geçmişi, eski-yeni motor seri arşivi, üretici format doğrulaması, dış servis sorgusu, ruhsat OCR'ı veya bakım hareketi oluşturmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı giriş kilometresi dikey dilimi:** Referans araç ekranındaki `Giriş KM` iş akışının SaaS karşılığı olarak opsiyonel kalıcı `Vehicle.entryOdometerKm` alanı ve PostgreSQL migration'ı eklendi. Form alanı mobil/sayısal klavye için `inputMode=numeric` ve yalnız rakam pattern'i taşır; asıl domain doğrulaması dolu değerin sonlu, tam sayı ve negatif olmamasını zorunlu kılar. PostgreSQL check constraint'i de doğrudan veri katmanı yazımlarında negatif kilometreyi engeller. Değer create/update akışında normalize edilir, düzenleme formuna geri yüklenir, pasif araç aramasına katılır ve aktif/pasif listelerde `Giriş KM` olarak mevcut Arvento `KM` değerinden ayrı gösterilir. Create, update, activate ve deactivate audit metadata özetleri başlangıç kilometresini taşır; update diff'i alanı izler ve işlem geçmişi/CSV sunumu `Giriş KM` etiketini kullanır. Bu dilim güncel kilometreyi elle değiştirme, Arvento kilometre senkronizasyonu, geriye kilometre düşme kontrolü, kilometre hareket geçmişi veya kilometre bazlı otomatik bakım üretimi açmaz.
**Uygulama durumu — 10.07.2026 P2-S3 Araç kartı alındığı/kiralandığı tarih dikey dilimi:** Referans araç ekranındaki `Alındığı/Kiralandığı Tarih` ve liste `A.Tarihi` iş akışının SaaS karşılığı olarak opsiyonel `Vehicle.acquisitionDate @db.Date` alanı ve PostgreSQL migration'ı eklendi. Form yerel `type=date` kontrolüyle `YYYY-MM-DD` değeri üretir; domain doğrulaması biçimin yanında takvimde gerçekten var olan günü kontrol eder ve `2026-02-29`, `01.07.2026`, `2026-13-01` gibi değerleri reddeder. Repository alanı PostgreSQL `DATE` olarak yazar ve istemciye yalnız tarih anahtarı döndürür; saat/zaman dilimi kaynaklı gün kayması oluşmaz. Değer düzenleme formuna geri yüklenir, pasif araç aramasına katılır ve aktif/pasif listelerde `A.Tarihi` olarak gösterilir. Create, update, activate ve deactivate audit metadata özetleri tarihi taşır; update diff'i alanı izler ve işlem geçmişi/CSV sunumu `Alındığı/kiralandığı tarih` etiketini kullanır. Bu dilim satıldığı/iade tarihi, kiralama sözleşmesi, sahiplik türü, süre hesabı, kira tahakkuku veya tarih bazlı otomatik statü değişimi açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Araç kartı satıldığı/iade tarihi dikey dilimi:** Referans araç ekranındaki `Satıldığı/İade Tarihi` ve liste `S.Tarihi` iş akışının SaaS karşılığı olarak opsiyonel `Vehicle.dispositionDate @db.Date` alanı ve PostgreSQL migration'ı eklendi. Form yerel `type=date` kontrolüyle `YYYY-MM-DD` değeri üretir; domain doğrulaması biçimin yanında takvimde gerçekten var olan günü kontrol eder ve `2026-02-29`, `01.07.2026`, `2026-13-01` gibi değerleri reddeder. `dispositionDate`, `acquisitionDate` doluyken ondan önce olamaz; repository alanı PostgreSQL `DATE` olarak yazar ve istemciye yalnız tarih anahtarı döndürür, liste ve düzenleme formuna geri yüklenir. Pasif araç araması, aktif/pasif listeler, create/update/activate/deactivate audit özetleri ve araç işlem geçmişi görünümü bu tarihi taşır; update diff'i alanı izler ve CSV sunumu `Satıldığı/iade tarihi` etiketini kullanır. Bu dilim otomatik pasife alma, satış muhasebesi, kira kapanışı, sözleşme bitiş otomasyonu veya tarih bazlı statü değişimi açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Araç kartı sigorta bitiş tarihi dikey dilimi:** Referans araç ekranındaki `Sigorta Bitiş Tarihi` ve liste `Sigorta Bit.` iş akışının SaaS karşılığı olarak opsiyonel `Vehicle.insuranceEndDate @db.Date` alanı ve PostgreSQL migration'ı eklendi. Form yerel `type=date` kontrolüyle `YYYY-MM-DD` değeri üretir; domain doğrulaması biçimin yanında takvimde gerçekten var olan günü kontrol eder ve `2026-02-29`, `01.07.2026`, `2026-13-01` gibi değerleri reddeder. Repository alanı PostgreSQL `DATE` olarak yazar ve istemciye yalnız tarih anahtarı döndürür, liste ve düzenleme formuna geri yüklenir. Pasif araç araması, aktif/pasif listeler, create/update/activate/deactivate audit özetleri ve araç işlem geçmişi görünümü bu tarihi taşır; update diff'i alanı izler ve CSV sunumu `Sigorta bitiş tarihi` etiketini kullanır. Bu dilim sigorta poliçesi yenileme otomasyonu, hasar takibi, poliçe ödeme planı veya tarih bazlı statü değişimi açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Araç kartı muayene bitiş tarihi dikey dilimi:** Referans araç ekranındaki `Muayene Bitiş Tarihi` ve liste `Muay. Bit.` iş akışının SaaS karşılığı olarak opsiyonel `Vehicle.inspectionEndDate @db.Date` alanı ve PostgreSQL migration'ı eklendi. Form yerel `type=date` kontrolüyle `YYYY-MM-DD` değeri üretir; domain doğrulaması biçimin yanında takvimde gerçekten var olan günü kontrol eder ve `2026-02-29`, `01.07.2026`, `2026-13-01` gibi değerleri reddeder. Repository alanı PostgreSQL `DATE` olarak yazar ve istemciye yalnız tarih anahtarı döndürür, liste ve düzenleme formuna geri yüklenir. Pasif araç araması, aktif/pasif listeler, create/update/activate/deactivate audit özetleri ve araç işlem geçmişi görünümü bu tarihi taşır; update diff'i alanı izler ve CSV sunumu `Muayene bitiş tarihi` etiketini kullanır. Bu dilim muayene randevu otomasyonu, hasar takibi, servis iş emri veya tarih bazlı statü değişimi açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Araç kartı tescil tarihi dikey dilimi:** Referans araç ekranındaki `Tescil Tarihi` ve liste `Tescil` iş akışının SaaS karşılığı olarak opsiyonel `Vehicle.registrationDate @db.Date` alanı ve PostgreSQL migration'ı eklendi. Form yerel `type=date` kontrolüyle `YYYY-MM-DD` değeri üretir; domain doğrulaması biçimin yanında takvimde gerçekten var olan günü kontrol eder ve `2026-02-29`, `01.07.2026`, `2026-13-01` gibi değerleri reddeder. Repository alanı PostgreSQL `DATE` olarak yazar ve istemciye yalnız tarih anahtarı döndürür, liste ve düzenleme formuna geri yüklenir. Pasif araç araması, aktif/pasif listeler, create/update/activate/deactivate audit özetleri ve araç işlem geçmişi görünümü bu tarihi taşır; update diff'i alanı izler ve CSV sunumu `Tescil tarihi` etiketini kullanır. Bu dilim ruhsat otomasyonu, tescil yenileme takibi, belge arşivi veya tarih bazlı statü değişimi açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Araç işlem geçmişi bilinmeyen action görünürlüğü:** Araç işlem geçmişi helper'ları ve yüzeyi, sözleşmede henüz özel etiketi olmayan audit action kodlarını da izlenebilir tutar; CSV, tablo ve filtre seçenekleri ham action kodunu görünür bırakır. Böylece `vehicle.transfer` gibi gelecekte eklenecek fakat henüz Türkçe etiketi olmayan yaşam döngüsü kodları "gizli" kalmaz, kullanıcı filtreleyebilir ve dışa aktarabilir. Bu küçük sertleştirme yalnız label fallback ve test kapsamını genişletir; yeni audit action sözleşmesi, yeni workflow veya ayrı yönetim ekranı açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Araç işlem geçmişi filtre temizleme kısayolu:** `Araç İşlem Geçmişi` bandına `Filtreleri Temizle` kısayolu eklendi. Plaka, işlem, kullanıcı ve tarih alanlarından biri doluysa tek tıkla tüm filtreler sıfırlanır, kullanıcı tekrar `Son X işlem` görünümüne döner ve CSV bağlantısı varsayılan tüm scoped satırları göstermeye hazırlanır. Bu küçük UX iyileştirmesi yalnız mevcut client-side filtreleri toparlar; yeni server-side arama, kayıt saklama politikası veya ayrı filtre yönetim ekranı açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Aktif araç listesi client-side arama:** `/araclar` aktif takip listesi artık plaka, araç tanımı, şantiye, sürücü, konum ve güncel teknik kolonlar üzerinden client-side aranabilir. `Aktif araçlarda ara` alanı server action çağırmadan mevcut satırları daraltır; eşleşme yoksa `Aktif araç bulunamadı.` boş durumu gösterilir. Bu küçük UX genişletmesi yalnız mevcut takip listesini filtreler; yeni server-side sorgu, sayfalama, dışa aktarma veya farklı bir araç havuzu açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Aktif araç listesi arama sayacı ve temizleme kısayolu:** Aktif takip listesinin filtre bandı artık arama sonucunu `X / Y araç` sayacıyla gösterir ve `Aramayı Temizle` kısayolu ile tek tıkta varsayılan görünümüne döner. Bu davranış kullanıcıyı filtre durumunda bırakmaz; mevcut client-side aramayı pratik olarak toparlar. Yeni server-side sorgu, kalıcı filtre ayarı veya farklı liste kaynağı açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Pasif araç listesi arama sayacı ve temizleme kısayolu:** Pasif araç bandı da artık arama sonucunu `X / Y pasif kart` sayacıyla gösterir ve `Aramayı Temizle` kısayolu ile tek tıkta tüm pasif kart görünümüne döner. Bu küçük UX uyarlaması pasif arama akışını aktif listeyle tutarlı hale getirir; yeni server-side sorgu, sayfalama ya da farklı bir pasif arşiv mekanizması açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Arvento uyarıları client-side arama:** `Arvento Araç Uyarıları` tablosu artık öncelik, uyarı metni, plaka ve operasyon notu üzerinden client-side aranabilir. `Uyarılarda ara` alanı uzun uyarı listelerinde yalnız ilgili satırları gösterir; eşleşme yoksa `Uyarı bulunamadı.` boş durumu görünür. Bu küçük UX genişletmesi yalnız tabloyu filtreler; yeni alarm üretimi, server-side sorgu, sayfalama veya ayrı uyarı yönetim ekranı açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Arama temizleme butonları bağlamlılaştırma:** Aktif araç, pasif araç ve uyarı arama alanlarının temizleme butonları artık bağlamlarına göre adlandırıldı; böylece aynı ekranda birden çok arama etkin olduğunda ekran okuyucular ve kullanıcılar hangi aramayı temizlediklerini net görür. Bu yalnız erişilebilirlik ve gezinme netliği sağlar; yeni iş akışı, yeni veri kaynağı veya ek filtre mantığı açmaz.
**Uygulama durumu — 11.07.2026 P2-S3 Arama temizleme butonları erişilebilirlik etiketi sıkılaştırma:** Aktif araç, pasif araç ve uyarı arama alanlarının temizleme butonları artık görünür metne ek olarak bağlama özel `aria-label` taşıyor; böylece ekran okuyucu adı ile görsel etiket ayrışmıyor ve testler daha kararlı hale geliyor. Bu yalnız erişilebilirlik netliği sağlar; yeni iş akışı, yeni veri kaynağı veya ek filtre mantığı açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura route kilidi sayfa testi:** `/e-fatura-yonetimi` için sayfa seviyesi test eklendi; abonelik erişimi kapalı olduğunda ortak `Paket yükseltme gerekli` yüzeyi render ediliyor, `Aboneliği Yönet` bağlantısı korunuyor ve `EFaturaSurface` dalı açılmıyor. Bu sertleştirme yalnız route guard ile modül yüzeyi arasındaki kilit sözleşmesini doğrular; e-Fatura provider/webhook iş akışını genişletmez.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura status payload refactor:** `/api/e-fatura/durum` response’u artık `buildDefaultEFaturaStatusPayload` yardımcı fonksiyonundan üretiliyor; endpoint, status label ve provider metadata’sı `e-fatura-service` içindeki tek sözleşmeden geliyor. Böylece route ile servis arasında hard-coded tekrar azalıyor ve e-Fatura başlangıç durumu testleri aynı payload şemasını kilitliyor. Bu refactor yalnız mevcut planned durum sözleşmesini birleştirir; canlı sağlayıcı adaptörü veya webhook iş akışı açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura status response genişletmesi:** `/api/e-fatura/durum` yanıtı artık planlı sağlayıcı bağlantı kartını da tek payload içinde döndürüyor; `eInvoice` başlangıç durumu ile `providerPlan` aynı servis helper ailesinden üretiliyor. Bu küçük genişleme API status şemasını UI’daki plan kartıyla tutarlı kılar; canlı sağlayıcı adaptörü veya webhook iş akışı açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura sağlayıcı işlem planı:** `providerPlan` artık GİB bağlantısı için planlanan işlemleri de taşıyor; fatura gönderimi, durum sorgulama ve iptal bildirimi ayrı `e-fatura-provider-adapter` sözleşmesinden üretiliyor ve `/e-fatura-yonetimi` kartında etiketlenmiş halde okunuyor. Bu küçük adım gerçek sağlayıcı adaptörünü açmaz; yalnızca sonraki entegrasyon iş akışının neyi kapsayacağını görünür kılar.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook iskeleti:** `/api/e-fatura/webhook` için imzalı ama şimdilik yan etkisiz bir giriş noktası eklendi. `e-fatura-webhook` helper’ı HMAC imzasını doğruluyor, eventId/fatura/providerRef/providerStatus alanlarını parse ediyor ve accepted sonucu döndürüyor; geçersiz imza veya bozuk gövde güvenli şekilde reddediliyor. Bu iskelet canlı sağlayıcı adapter’ına geçiş için sözleşme zemini sağlar, ancak kalıcı e-Fatura işleme veya muhasebe yan etkisi üretmez.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook hazırlık kartı:** `/api/e-fatura/durum` ve `/e-fatura-yonetimi` yüzeyi artık webhook plan kartını da gösteriyor; endpoint, secret adı ve HMAC transport bilgisi status sözleşmesiyle birlikte görünür. Bu küçük UI/API eşleştirmesi yalnız hazırlık bilgisini netleştirir; canlı sağlayıcı adaptörü veya olay işleme akışı açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook plan adaptörü:** Webhook hazırlık kartı artık ayrı `e-fatura-webhook-adapter` sözleşmesinden üretiliyor; endpoint, secret adı, transport ve desteklenen event türleri aynı plan helper’ından besleniyor. Bu küçük merkezileştirme yalnız tekrarları azaltır; canlı olay işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook event türü sözleşmesi:** Kabul edilen webhook event türleri artık `e-fatura-webhook-event-types` içinde tek kaynakta tutuluyor; parser, plan kartı ve etiket formatı aynı listeyi ve aynı label helper’ını kullanıyor. Bu küçük merkezileştirme yalnız sözleşme tekrarını kaldırır; yeni event işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura capabilities sözleşmesi:** `/api/e-fatura/durum` içindeki desteklenen aksiyonlar artık `e-fatura-capabilities` kaynağından okunuyor; durum payload’ı ve testler aynı sabit listeyi paylaşıyor. Bu küçük merkezileştirme yalnız aksiyon tekrarını kaldırır; yeni iş akışı açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook audit helper’ı:** `/e-fatura-yonetimi` yüzeyindeki webhook arama metni ve olay türü etiketi artık tek `e-fatura-webhook-audit` helper’ından üretiliyor; component içindeki tekrar azaltıldı ve görünüm sözleşmesi sadeleşti. Bu küçük refactor yalnız UI mantığını toplar; yeni olay işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook reddetme sertleştirmesi:** `e-fatura-webhook` helper’ı ve `/api/e-fatura/webhook` route’u artık yalnız geçerli imzalı ve izinli event türlerini kabul ediyor; bozuk imza ve bilinmeyen event türleri 400 ile reddediliyor, testler bu davranışı kilitliyor. Bu sertleştirme yalnız giriş doğrulamasını güçlendirir; kalıcı olay işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook event türü görünürlüğü:** `e-fatura-webhook` plan kartı artık kabul edilen event türlerini de listeliyor; `e-fatura.invoice.sent` ve `e-fatura.invoice.status.changed` türleri status endpoint ve modül yüzeyinde aynı helper sözleşmesiyle görünür. Bu yalnız operasyonel görünürlük sağlar; yeni event türü işleme veya kalıcı entegrasyon açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook etiket merkezileştirme:** Kabul edilen webhook event türlerinin Türkçe etiketleri artık `e-fatura-service` içindeki tek helper’dan üretiliyor; status endpoint ve `/e-fatura-yonetimi` yüzeyi aynı label sözlüğünü paylaşıyor. Bu küçük refactor yalnız metin tutarlılığını artırır; yeni event işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook audit izi:** Geçerli e-Fatura webhook event’leri artık `e-fatura.webhook.accepted` audit kaydı üretiyor; event id, fatura numarası, provider ref, provider status ve event türü metadata’ya yazılıyor. Bu dilim dış sağlayıcı akışını izlenebilir kılar; muhasebe veya iş kuralı yan etkisi eklemez.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook audit görünürlüğü:** `/e-fatura-yonetimi` yüzeyi, aktif tenant/firma/dönem kapsamındaki son beş kabul edilmiş webhook audit kaydını ayrı tabloda gösteriyor. Fatura numarası, olayın Türkçe etiketi, sağlayıcı durumu ve sağlayıcı referansı tek bakışta görünür; kayıt yoksa açık boş durum korunur. Bu dilim yalnız operasyonel izleme sağlar; yeni webhook olayı işleme, muhasebe kaydı veya sağlayıcı adaptörü açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook idempotency:** Sağlayıcının aynı `eventId` ile yaptığı tekrar teslimler için kalıcı `EFaturaWebhookEvent` kaydı ve PostgreSQL tenant+event unique kuralı eklendi. Geçerli imzalı olay önce tenant/firma/dönem kapsamıyla atomik olarak claim edilir; unique yarışı `duplicate` başarılı sonucu üretir ve ikinci audit kaydını engeller. Bu dilim tekrar teslim güvenliğini sağlar; fatura muhasebeleştirme, belge üretimi veya canlı sağlayıcı adaptörü açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook boş kimlik alanı sertleştirmesi:** İmzalı webhook gövdesindeki event id, fatura numarası, sağlayıcı referansı/durumu ve tenant/firma/dönem kimlikleri artık boş veya yalnız boşluk değeri taşıyamaz. Bu doğrulama claim ve audit yazımından önce çalışır; hatalı sağlayıcı payload’larının kalıcı event/audit verisi üretmesini engeller. Bu dilim yeni event türü veya fatura işleme kuralı açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook filtre ve detay görünürlüğü:** `/e-fatura-yonetimi` yüzeyindeki kabul edilmiş webhook olayları artık istemci tarafında fatura/ref metni, olay tipi, sağlayıcı durumu ve tarih aralığı ile filtrelenebilir; her satırda seçili olay detayı paneli açılabilir. Filtre sayacı, boş-filtre durumu, temizleme aksiyonu ve detay paneli aynı tablonun içinde tutulur; böylece operasyon ekibi sayfadan ayrılmadan yalnız ilgilendiği kayıtları ayıklayıp inceleyebilir. Bu dilim yeni event işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook filtre seçenekleri standardizasyonu:** Webhook denetim tablosundaki olay tipi ve sağlayıcı durumu filtre seçenekleri artık ortak audit helper’ı tarafından boş değerler dışlanarak, Türkçe locale ile ve büyük/küçük harf farkına duyarsız biçimde sıralanır. Böylece seçenek sırası webhook kayıtlarının geliş sırasına bağlı kalmaz; tablo boş durum satırları da altı sütunlu yapıyla hizalıdır. Bu dilim yalnız operasyonel filtre deneyimini tutarlılaştırır; yeni olay işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook geçmişi genişletmesi:** `/e-fatura-yonetimi` route adapter’ı aktif tenant/firma/dönem kapsamındaki son beş yerine son yirmi kabul edilmiş webhook audit kaydını okur. Mevcut istemci tarafı arama, olay/durum ve tarih filtreleri daha yararlı bir geçmiş üzerinde çalışır; sorgu entity type ve scope sınırlarını korur. Bu dilim yeni webhook işleme, sayfalama veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook olay kimliği görünürlüğü:** Webhook denetim tablosu artık fatura, olay türü, sağlayıcı durumu ve referansına ek olarak kalıcı event id değerini ayrı sütunda gösterir. Böylece operasyon ekibi sağlayıcı tekrar teslimi/idempotency sonucu ile görünen audit satırını detay paneli açmadan eşleştirebilir; boş durum satırlarının sütun hizası yeni yedi sütunlu yapıyla korunur. Bu dilim yalnız izlenebilirliği geliştirir; webhook işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook audit hata telafisi:** Webhook event’i idempotency için claim edildikten sonra audit kalıcılığı geçici hata verirse claim kaydı tenant + event kimliğiyle serbest bırakılır ve route sağlayıcıya tekrar teslimi teşvik eden `500` + `retryable` yanıtını döndürür. Böylece sonraki aynı event teslimi yanlışlıkla duplicate sayılıp audit görünürlüğünü kaybetmez; geçerli audit yazımında mevcut tekil claim ve duplicate davranışı korunur. Bu dilim yeni fatura/muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook olay ID araması:** `/e-fatura-yonetimi` içindeki webhook geçmişi araması artık görünür `event id` sütununu da kapsıyor; fatura numarası, olay kimliği, sağlayıcı referansı ve kullanıcı kimliği aynı client-side arama sözleşmesinde birleşti. Böylece operasyon ekibi ekranda gördüğü olay kimliğini yazarak satıra doğrudan ulaşabiliyor; filtreleme, detay paneli ve server scope davranışı değişmiyor. Bu dilim yeni webhook işleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook boş durum testi:** Webhook geçmişi tablosunun kayıt yokken açık boş durum gösterebildiği ve seçili detay panelini yanlışlıkla açık bırakmadığı ekran testi eklendi. Bu yalnız boş liste sözleşmesini kilitler; webhook işleme, filtreleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook detay başlığında olay ID görünürlüğü:** Seçili webhook detay panelinin başlığı artık olay numarasıyla birlikte `entityLabel · olay türü · event id` biçiminde okunuyor; liste ve detay görünümü aynı kayıt kimliğini paylaşarak operatörün kaydı daha hızlı eşleştirmesini sağlıyor. Bu yalnız görünürlük iyileştirmesidir; yeni webhook işleme, filtreleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook satır seçimi kolaylaştırması:** Webhook geçmişindeki tüm satırlar artık tıklanabilir ve klavye ile seçilebilir hale getirildi; operatör satırın tamamına tıklayarak ya da Enter/Boşluk ile aynı detay panelini açabiliyor. `Detay` butonu korunuyor, ancak satırın kendisi de erişilebilir seçim hedefi olarak çalışıyor. Bu yalnız etkileşim kolaylığı sağlar; webhook işleme, filtreleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook satır seçimi seçili durum görünürlüğü:** Seçili webhook satırı artık `aria-pressed` ve belirgin odak/seçim vurgusuyla görünür hale getirildi; böylece klavye veya fare ile seçilen kayıt, tabloda ve erişilebilirlik ağacında açık bir aktif durum taşıyor. Bu yalnız arayüz geri bildirimi sağlar; webhook işleme, filtreleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook seçili kayıt konumu:** Seçili webhook detay paneli artık açık kaydın filtrelenmiş listedeki konumunu `Seçili kayıt X / Y` olarak gösteriyor; böylece operatör hangi satırı açtığını ve filtrenin toplam kaç kayıt taşıdığını aynı panelde görür. Bu yalnız bağlam bilgisini güçlendirir; webhook işleme, filtreleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook seçili satır etiketi:** Seçili webhook satırının eylem düğmesi artık `Açık` etiketiyle görünür; böylece açık kayıt tablo içinde de doğrudan ayırt edilebilir. `Detay` etiketi diğer satırlarda korunur. Bu yalnız görünürlük iyileştirmesidir; webhook işleme, filtreleme veya muhasebe yan etkisi açmaz.
**Uygulama durumu — 11.07.2026 P2-S4 e-Fatura webhook sayaç ve seçim birleşimi:** Webhook geçmişi üst sayacı artık filtre sonucu ile birlikte seçili kaydın konumunu da tek satırda gösteriyor; `Son X / Y olay · Seçili A / B` biçimi operatöre hem toplamı hem açık kaydı aynı bakışta veriyor. Bu yalnız görünürlük iyileştirmesidir; webhook işleme, filtreleme veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 e-Fatura webhook filtre sıfırlama durumu:** Webhook geçmişindeki `Filtreleri temizle` aksiyonu artık yalnız arama, olay/durum, tarih ölçütlerinden en az biri seçildiğinde etkinleşir; boş filtre durumunda pasif görünerek gereksiz tıklamayı önler. Temizleme sonrası aynı aksiyon yeniden pasifleşir; bu yalnız arayüz geri bildirimi iyileştirmesidir, webhook işleme veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 e-Fatura webhook aktif filtre özeti:** Webhook geçmişi, seçili arama, olay/durum ve tarih ölçütlerini artık tek satırda `Aktif filtreler` özeti olarak gösterir ve değişikliği erişilebilir durum alanından duyurur. Temizleme sonrasında özet kaybolur; bu yalnız filtre bağlamını görünür kılar, webhook işleme veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 e-Fatura webhook filtre bağlamı erişilebilirliği:** Aktif filtre özeti artık webhook tablosuna `aria-describedby` ile bağlanır; operatör ekran okuyucuyla tabloya girdiğinde görünür sonuç listesinin hangi ölçütlerle daraltıldığını da alır. Filtre temizlenince ilişki kaldırılır; bu yalnız erişilebilir bağlam iyileştirmesidir, webhook işleme veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 e-Fatura webhook claim hata telafisi:** İdempotency claim kalıcılığı geçici hata verirse webhook artık kontrolsüz hata yerine `500` ve `retryable` sözleşmesi döndürüyor; audit kaydı yazılmadan sağlayıcının aynı olayı yeniden teslim etmesi isteniyor. Claim henüz başarıyla oluşmadığı için release çağrısı yapılmıyor; bu dilim yeni fatura veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 e-Fatura webhook görünüm yenilemesi:** Kabul edilen ve ilk kez işlenen e-Fatura webhook olayı artık `/e-fatura-yonetimi` rotasını revalidate eder; böylece sonraki görünümde audit geçmişi güncel kaydı taşır. Duplicate veya reddedilen olaylarda revalidation yapılmaz. Bu dilim yalnız operasyonel görünüm tutarlılığını sağlar; yeni fatura veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 e-Fatura sağlayıcı durum etiketi normalizasyonu:** Webhook audit ekranı `delivered`, `approved`, `rejected` ve `cancelled` gibi teknik sağlayıcı durumlarını metadata değerini değiştirmeden kararlı Türkçe etiketlerle gösterir; filtre seçeneği etiketi, aktif filtre özeti, tablo ve detay paneli aynı helper fonksiyonunu kullanır. Detay paneli ayrıca seçili olay için basit bir `Tekrar deneme` rehberi üretir, üstteki küçük sayaç bu rehber gerektiren kayıtları özetler, filter satırında `Tekrar deneme` seçimiyle bu kayıtlar hızlıca ayrıştırılabilir ve tablo artık aynı bilgiyi satır düzeyinde de taşır. Bilinmeyen durumlar olduğu gibi görünür. Bu yalnız operasyonel okunabilirliği artırır; webhook işleme veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 genel webhook bildirim push başlangıcı:** e-Fatura akışından bağımsız `/api/webhooks/durum` Route Handler açıldı. Yalnız `webhooks` kapsamlı Bearer API anahtarıyla okunan bu endpoint, planlı teslimat transportunu, sıfır yapılandırılmış endpoint sayısını ve sonraki endpoint kaydı/imzalı worker/retry politikasını tek sözleşmede döndürür. Bu başlangıç dilimi dış URL saklamaz veya bildirim göndermez; genel webhook push iş akışının güvenli API sınırını hazırlar.

**Uygulama durumu — 12.07.2026 P2-S4 genel webhook olay sözleşmesi:** Outbound webhook başlangıcı için `invoice.created`, `invoice.status.changed` ve `bank.transaction.matched` olay türleri tek kaynaklı sözleşmeye alındı; durum endpointi bu türleri Türkçe etiketleriyle döndürür. Bu dilim endpoint kaydı veya teslimat çalıştırmaz; sonraki worker ve abonelik akışının olay kimliklerini sabitler.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint kayıt zemini:** Tenant/firma/dönem kapsamlı `WebhookEndpoint` Prisma modeli ve `20260712100000_add_webhook_endpoints` migration'ı eklendi. Kayıt adı tekilliği, URL, secret özeti/öneki, event türleri, aktiflik ve oluşturan kullanıcı alanları kalıcı zemine alındı; bu dilim henüz dış URL kaydetme UI'ı, secret gösterimi veya teslimat worker'ı açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint servis zemini:** `WebhookEndpoint` kayıtları için admin kontrollü servis ve Prisma repository katmanı açıldı; kayıt adı, HTTPS/localhost URL doğrulaması, planlı event türü normalizasyonu, secret hashleme/önekleme ve `webhook-endpoint.create` audit izi tek sözleşmede toplandı. `/api/webhooks/durum` artık tenant/firma/dönem scope'u içindeki aktif endpoint sayısını repository'den okuyup `configuredEndpointCount` alanına taşıyor; bu dilim henüz dış webhook gönderimi veya yönetim UI'ı açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint görünürlüğü:** API yönetimi yüzeyine salt okunur `Webhook Endpoint Kayıtları` bölümü eklendi; endpoint listesi tenant/firma/dönem kapsamlı servis sonucundan okunuyor, aktif/pasif sayaçları ve olay türü/URL/secret önekiyle birlikte gösteriliyor. `api-yonetimi` modül page adapter'ı artık bu overview'u da yüklüyor; bu dilim henüz endpoint oluşturma formu, pasifleştirme aksiyonu veya teslimat worker'ı açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint oluşturma akışı:** `api-yonetimi` yüzeyine admin kontrollü `Webhook Endpoint Oluştur` formu eklendi; endpoint adı, HTTPS URL, desteklenen olay seçimi, secret üretimi ve kayıt sonrası tabloya anlık ekleme akışı tek server action sözleşmesiyle çalışıyor. `createWebhookEndpointAction` başarıda `/api-yonetimi` ve `[module]` yolunu yeniden doğruluyor; bu dilim henüz pasifleştirme, düzenleme veya imzalı delivery worker'ı açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint pasifleştirme akışı:** Webhook endpoint satırlarına admin kontrollü `Pasifleştir` aksiyonu eklendi; endpoint, tenant/firma/dönem scope'u içinde `isActive=false` olarak güncelleniyor, `webhook-endpoint.deactivate` audit izi üretiliyor ve satır local tabloda pasif duruma düşüyor. `deactivateWebhookEndpointAction` başarıda `/api-yonetimi` ve `[module]` yolunu yeniden doğruluyor; bu dilim henüz endpoint düzenleme formu veya imzalı delivery worker'ı açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint düzenleme akışı:** Webhook endpoint satırlarına admin kontrollü `Düzenle` aksiyonu eklendi; kayıt adı, URL ve olay seçimi mevcut kayıttan doldurulan formda güncelleniyor, secret korunuyor, `webhook-endpoint.update` audit izi üretiliyor ve tablo satırı yerinde yenileniyor. `updateWebhookEndpointAction` başarıda `/api-yonetimi` ve `[module]` yolunu yeniden doğruluyor; bu dilim henüz endpoint secret yenileme veya imzalı delivery worker'ı açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint filtreleme iyileştirmesi:** Webhook endpoint listesi artık istemci tarafında arama ve aktif/pasif durum filtresiyle daraltılabiliyor; filtre özeti, temizleme aksiyonu ve filtreye uyan kayıt yoksa açık boş durum aynı yönetim yüzeyinde gösteriliyor. Bu küçük iyileştirme endpoint kayıtlarını daha okunur hale getirir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint secret yenileme akışı:** Webhook endpoint satırlarına admin kontrollü `Secret Yenile` aksiyonu eklendi; endpoint secret prefix/hash güncelleniyor, yeni secret bir kez gösteriliyor ve `webhook-endpoint.rotate-secret` audit izi üretiliyor. Bu küçük güvenlik adımı endpoint kayıt yapısını değiştirmez; yalnız gizli anahtarın operasyonel rotasyonunu sağlar.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook durum sözleşmesi genişletmesi:** `/api/webhooks/durum` artık aktif endpoint sayısına ek olarak aktif endpointlerde kullanılan event türü kümesini de döndürüyor; status helper sözleşmesi `configuredEventTypes` alanıyla worker hazırlığına biraz daha görünürlük ekliyor. Bu küçük genişleme endpoint saklama veya teslimat iş akışını başlatmaz; yalnız planlı webhook iş akışının hangi türlerde yapılandığını okunur kılar.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook retry sözleşmesi genişletmesi:** `/api/webhooks/durum` status cevabı artık worker öncesi imzalama ve retry hazırlığını da görünür kılıyor; `deliverySignatureHeaderName` ve küçük bir `retryPolicy` bloğu sözleşmeye eklendi. Bu genişleme hâlâ dış teslimat çalıştırmaz; yalnız daha sonra açılacak worker’ın beklenen başlık ve yeniden deneme davranışını netleştirir.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook dispatch taslağı:** `webhook-delivery-dispatch` helper'ı endpoint, event türü, imzalı body, `x-noa-webhook-signature` başlığı ve retry zarfını tek saf draft'ta topluyor. Bu helper henüz dış HTTP isteği atmaz; yalnız worker açıldığında kullanılacak imza ve deneme sözleşmesini hazırlar.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook hedef planlayıcı:** `webhook-delivery-planner` helper'ı aktif webhook endpointlerini event türüne göre sıralı biçimde seçiyor ve worker'a aktarılabilecek teslimat hedef listesini üretüyor. Bu küçük katman hâlâ dış teslimat yapmaz; yalnız hangi endpointlerin sıraya gireceğini saf biçimde belirler.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook dry-run raporu:** `webhook-delivery-batch` helper'ı planlayıcı çıktısını ve işçi öncesi imzasız teslimat zarfını tek dry-run raporunda topluyor; alanlar preparedAt, body preview, header sözleşmesi ve hedef listesi şeklinde okunabiliyor. Bu katman hâlâ dış HTTP isteği atmaz; worker açıldığında hangi teslimatların hazırlanacağını görünür kılar.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook durum hazırlık özeti:** `/api/webhooks/durum` artık planlı event türleri için hazırlanabilir teslimat sayısını ve ulaşılamaz türleri de salt okunur `deliveryReadiness` bloğunda döndürüyor; bu özet mevcut endpoint planlayıcısından türetiliyor ve hâlâ dış teslimat başlatmıyor. Böylece worker açılmadan önce hangi event türlerinin sıraya girebildiği tek endpoint cevabında görünür oluyor.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint olay filtresi:** API yönetimi yüzeyindeki webhook kayıtları artık olay türüne göre de istemci tarafında daraltılabiliyor; arama, durum ve olay filtresi birlikte çalışıyor, filtre özeti ve temizleme aksiyonu aynı satırda kalıyor. Bu küçük iyileştirme endpoint kayıtlarını daha okunur hale getirir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint listesi sayaç görünürlüğü:** Webhook kayıtları bölümüne görünür bir `Gösterilen X / Y webhook endpoint` sayacı eklendi; böylece arama, durum ve olay filtresinin listede kaç kaydı tuttuğu tek bakışta okunabiliyor. Bu yalnız görünürlük iyileştirmesidir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint olay türü özet kartı:** Webhook kayıtları bölümünün üst özetine `Olay türü` metriği eklendi; tenant/firma/dönem kapsamındaki benzersiz olay türü sayısı artık toplam/aktif/pasif yanında okunabiliyor. Bu yalnız görünürlük iyileştirmesidir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint boş durum rehberi:** Webhook kayıtları hiç yokken listenin üstünde kısa bir onboarding kutusu gösteriliyor; operatör ilk endpointi oluşturmak için formu kullanacağını ve kaydın sonra bu listede görüneceğini hemen anlayabiliyor. Bu yalnız görünürlük ve yönlendirme iyileştirmesidir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint güncelleme zamanı sütunu:** Webhook endpoint tablosu artık son güncellenme zamanını da ayrı bir sütunda gösteriyor; operatör kayıt değişikliklerini liste içinde doğrudan görebiliyor. Bu yalnız görünürlük iyileştirmesidir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint olay sayısı sütunu:** Webhook endpoint tablosu artık her satırda kaç webhook olayını kapsadığını da gösteriyor; operatör kapsamı tek satırda ve Türkçe biçimde okuyabiliyor. Bu yalnız görünürlük iyileştirmesidir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint filtre boş durum rehberi:** Filtreler sonucu kayıtları gizlediğinde webhook tablo hücresi artık kısa bir yönlendirme de gösteriyor; kullanıcı isterse filtreleri temizleyerek tüm endpointleri tekrar görebileceğini anlıyor. Bu yalnız yönlendirme iyileştirmesidir; endpoint saklama veya teslimat iş akışını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook endpoint aktifleştirme akışı:** Pasif webhook endpoint satırlarına admin kontrollü `Aktifleştir` aksiyonu eklendi; kayıt tenant/firma/dönem kapsamı içinde yalnız pasif durumdan aktife döner, `webhook-endpoint.activate` audit izi üretilir ve satır yerinde güncellenir. Aynı kapsam doğrulaması pasifleştirme için de aktif kayıt kontrolüyle netleştirildi; başarıda `/api-yonetimi` ve dinamik modül yüzeyleri revalidate edilir. Bu dilim dış teslimat worker'ı başlatmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook scoped dry-run endpointi:** `POST /api/webhooks/dry-run`, yalnız `webhooks` kapsamlı Bearer API anahtarıyla event türü ve isteğe bağlı JSON payload kabul ederek aktif tenant/firma/dönem endpointlerinden teslimat planı üretir. Cevap hedefler, body, imza başlığı ve retry sözleşmesini taşır; gerçek secret veya dış HTTP çağrısı içermez. Geçersiz JSON, event türü veya payload veritabanı okumasına geçmeden `400` döner; bu dilim gerçek delivery worker'ını açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook dry-run keşif sözleşmesi:** `/api/webhooks/durum` cevabı artık `dryRunEndpoint=/api/webhooks/dry-run` alanını taşıyor ve sonraki adım metni gerçek imzalı teslimat worker'ına daraltılıyor. Böylece API tüketicisi desteklenen event türleri, yapılandırılmış olay etiketi listesi, planlanan ve çalışmayan olay etiketleri, hazır hedef sayıları ve ağ çağrısı yapmayan tanı endpointini tek durum cevabından keşfedebiliyor.
**Uygulama durumu — 12.07.2026 P2-S4 genel webhook canonical olay zarfı:** Dry-run gövdesi artık `eventId`, `eventType`, `occurredAt`, `version=2026-07` ve `data` alanlarını taşıyan tek canonical JSON zarfından üretiliyor; aynı zarf cevapta `eventEnvelope` olarak structured biçimde de taşınıyor. Çağıran taraf 1..120 karakterlik olay kimliğini verebilir, vermezse sunucu UUID üretir; böylece sonraki imzalı worker ve idempotency katmanı aynı olay kimliğini kullanabilir. Bu dilim hâlâ dış HTTP teslimatı veya kalıcı event kaydı açmaz.
**Uygulama durumu — 12.07.2026 P2-S4 e-Fatura webhook bilinmeyen durum sertleştirmesi:** Webhook audit yardımcıları ve `/e-fatura-yonetimi` yüzeyi, sözleşmede açık etiketi olmayan provider status değerlerini de görünür tutacak şekilde testlerle güçlendirildi; retry ipucu ve tablodaki status hücresi bilinmeyen kodu saklamadan gösteriyor. Bu küçük sertleştirme yalnız okunabilirliği ve geriye dönük gözlemlenebilirliği artırır; webhook işleme veya muhasebe yan etkisi açmaz.

**Uygulama durumu — 12.07.2026 P2-S4 genel webhook eksik olay kapsamı görünürlüğü:** `/api/webhooks/durum` durum sözleşmesi artık desteklenen fakat aktif endpointlerde yapılandırılmamış event türlerini de kod ve Türkçe etiket listesi olarak döndürüyor. Böylece worker açılmadan önce entegrasyon sahibi, teslimat planındaki mevcut hedeflerden ayrı olarak hangi destekli olayların endpoint kapsamı dışında kaldığını görebiliyor. Bu salt-okunur genişleme endpoint kaydı, dış HTTP teslimatı veya retry yürütmesi başlatmaz.

**Uygulama durumu — 12.07.2026 P2-S2 abonelik yenileme takvimi görünürlüğü:** `/abonelik` mevcut paket kartı, aktif abonelik için bitiş tarihine göre `Yenilemeye X gün kaldı` bilgisini gösteriyor; yenileme günü geldiğinde mesaj `Yenileme bugün gerekli` olur. Süresi dolmuş abonelikte mevcut kritik uyarı korunur ve takvim satırı gösterilmez. Bu dilim otomatik tahsilat, yenileme mutasyonu veya sağlayıcı çağrısı yapmaz; sonraki otomatik yenileme çalışmasından önce kullanıcıya zamanlama görünürlüğü sağlar.

**Uygulama durumu — 12.07.2026 P2-S2 abonelik istemci snapshot yenilemesi:** `/abonelik` checkout taslağı, sandbox onayı ve sandbox hata akışlarında başarılı server action sonrasında `router.refresh()` çağırıyor. Sunucudaki mevcut `revalidatePath` davranışıyla birlikte bu sayede kullanıcı yeni ödeme geçmişi, sağlayıcı olayı ve aktiflik snapshot'ını aynı rota üzerinde yeniden okuyabiliyor; mevcut istemci taslak/notice durumu korunuyor. Bu dilim ödeme kuralı veya provider protokolünü değiştirmez.

**Uygulama durumu — 12.07.2026 P2-S2 abonelik yenileme dönemi doğruluğu:** `/abonelik` mevcut paket kartındaki yenileme tutarı artık sabit yıllık ek yerine kalıcı aboneliğin `billingCycle` değerini kullanarak `/ ay` veya `/ yıl` etiketiyle gösteriliyor. Böylece aylık abonelikte tutar yıllıkmış gibi sunulmaz; hesaplama, ödeme mutasyonu ve provider akışı değişmeden kalır.

**Uygulama durumu — 12.07.2026 P2-S2 ödeme sağlayıcı bilinmeyen durum görünürlüğü:** `/abonelik` ödeme sağlayıcı olayları tablosu bilinen `processing`, `processed` ve `failed` durumları için Türkçe operasyon etiketlerini koruyor; sağlayıcıdan beklenmeyen yeni bir durum geldiğinde ise bunu `İşleniyor` diye maskelemeden ham koduyla gösteriyor. Bu salt-okunur sertleştirme, webhook işleme ve ödeme durum geçişlerini değiştirmez.

**Uygulama durumu — 12.07.2026 P2-S2 sonuçsuz işlenmiş ödeme olayı etiketi:** Ödeme sağlayıcı olayı `processed` durumuna ulaşıp henüz bir `resultStatus` taşımıyorsa `/abonelik` tablosu ham teknik durum yerine `İşlendi` etiketi gösteriyor. Aktive veya başarısız sonuç taşıyan işlenmiş olayların daha ayrıntılı etiketleri, processing ve bilinmeyen durum davranışı korunur.

**Uygulama durumu — 12.07.2026 P2-S2 otomatik yenileme rozet durumu:** `/abonelik` mevcut paket kartında otomatik yenileme açık olduğunda başarı rozeti korunur; kapalı olduğunda rozet nötr taslak rengine döner. Böylece kapalı yenileme ayarı görsel olarak başarılı/etkin bir operasyon gibi sunulmaz; tahsilat veya abonelik ayarı mutasyonu eklenmez.

**Uygulama durumu — 12.07.2026 P2-S2 ödeme sağlayıcı olay sayaçları:** `/abonelik` ödeme sağlayıcı olayları tablosu, filtre sonucundan bağımsız olarak toplam olay yanında `İşleniyor` ve `Hatalı` olay adetlerini gösteriyor. Böylece operatör filtre seçmeden bekleyen işlem ve hata yükünü görebiliyor; event işleme, retry veya provider mutasyonu açılmıyor.

**Uygulama durumu — 12.07.2026 P2-S1 yakında banka seçim guardı testi:** Banka Entegrasyonu yüzeyindeki `Yakında` durumlu bankaların sandbox seçim kutusunda disabled kalması hedefli UI testiyle kilitlendi. Domain servisinin `Mevcut` olmayan bankaları reddetmesiyle birlikte kullanıcı yüzeyi de desteklenmeyen bağlantı denemesini baştan kapalı tutuyor; banka adaptörü veya dış API çağrısı değişmedi.

**Uygulama durumu — 12.07.2026 P2-S1 banka destek durumu özeti:** Banka Entegrasyonu desteklenen bankalar bandı artık `Kullanılabilir` ve `Yakında` adetlerini birlikte gösteriyor. Bu salt-okunur özet, seçimde disabled olan bankaların neden bağlantı testine gidemediğini görünür kılar; banka bağlantısı veya senkronizasyon mutasyonu oluşturmaz.

**Uygulama durumu — 12.07.2026 P2-S1 sandbox bağlantı durum özeti:** Banka Entegrasyonu `Sandbox Bağlantıları` bandı artık `Bağlı` ve `Hatalı` bağlantı adetlerini de gösteriyor. Operatör bağlantı tablosuna inmeden genel sağlık durumunu okuyabiliyor; bağlantı testi, senkronizasyon ve audit akışları değişmiyor.

**Uygulama durumu — 12.07.2026 P2-S1 banka hareket durum özeti:** `Son Banka Hareketleri` bandı artık mevcut read-model içindeki bekleyen, eşleştirilen ve yoksayılan hareket adetlerini filtre sonucundan bağımsız gösteriyor. Filtre, eşleştirme, yoksayma ve geri alma mutasyonları aynı kalıyor; ek özet yalnız operasyonel görünürlüğü artırıyor.

**Uygulama durumu — 12.07.2026 P2-S1 boş banka bağlantısı rehberi:** Sandbox bağlantı tablosu boşken mevcut boş durumun altına, kullanılabilir banka ve rıza numarası seçilerek ilk bağlantı testinin nasıl başlatılacağını açıklayan kısa yönlendirme eklendi. Bu yalnız onboarding görünürlüğüdür; bağlantı veya senkronizasyon yazımı açmaz.

**Uygulama durumu — 12.07.2026 P2-S2 manuel yenileme gereği görünürlüğü:** Otomatik yenilemesi kapalı ve süresi dolmamış aboneliklerde `/abonelik` mevcut paket kartı, otomatik tahsilat planlanmadığını ve yenilemenin manuel başlatılması gerektiğini açıkça belirtiyor. Bu yalnızca durum bilgilendirmesidir; abonelik veya ödeme mutasyonu açmaz.

**Uygulama durumu — 12.07.2026 P2-S2 manuel abonelik yenileme akışı:** `/abonelik` Birleşik Yenileme Sepeti artık admin/muhasebe kontrollü `Manuel Yenilemeyi Başlat` aksiyonuyla mevcut paket ve seçilen aylık/yıllık dönem için `REN-YYYYAAGG-PLAN-CYCLE` pending fatura taslağı ve sandbox ödeme sağlayıcı session'ı üretir. Sandbox onayı aynı tenant/firma/dönem kapsamındaki aktif `TenantSubscription` kimliğini ve add-on bağlarını koruyarak `billingCycle`, `renewalAmount` ve `endsAt` alanlarını günceller; dönem henüz bitmediyse mevcut bitişten, süresi dolmuşsa onay gününden uzatır. Aynı invoice paid duruma geçirilir, provider ref saklanır ve `subscription.renewal-checkout-draft.create` ile `subscription.renewal.activate` audit izleri yazılır. Server action başarılı mutasyonda abonelik, ayarlar ve guarded modül yüzeylerini revalidate eder; canlı ödeme sağlayıcısı, otomatik tahsilat worker'ı ve kart saklama bu dilimde açılmaz.

**Uygulama durumu — 12.07.2026 P2-S2 manuel yenileme webhook korelasyonu:** İmzalı `subscription.payment.succeeded` ve `subscription.payment.failed` olaylarında mevcut paket kimliğini taşıyan `REN-YYYYAAGG-PLAN-CYCLE` faturaları paket değişikliği yolundan ayrıştırılarak yenileme aktivasyon/failure akışına yönlendiriliyor. Başarılı olay mevcut abonelik satırını aynı kimlikle uzatıyor; başarısız olay pending faturayı provider hata nedeni ile kapatıyor. Claim/idempotency, tenant/firma/dönem kapsamı, provider ref ve webhook event audit görünürlüğü korunuyor; belirsiz plan + add-on hedef guard'ı ve gerçek dış HTTP worker kapsamı değişmiyor.

**Uygulama durumu — 12.07.2026 P2-S2 yenileme failure telafisi:** Manuel yenileme checkout taslağında `Sandbox Ödeme Hatası` aksiyonu artık yenilemeye özel server action ve `failSubscriptionRenewalCheckout` domain akışını kullanıyor. Pending `REN-...` faturası `failed` + provider ref ile kapanıyor; `subscription.renewal-checkout-payment.fail` audit izi plan değişikliği action'ından ayrışıyor. Aynı yenileme failure domain'i imzalı provider failure webhook'unda da kullanılıyor; mevcut abonelik süresi veya add-on aktivasyonu mutasyona uğramıyor.

**Uygulama durumu — 12.07.2026 P2-S2 yenileme failure doğrulama kapsamı:** Yenileme failure server action'ı, sandbox UI hata butonu, domain audit sözleşmesi ve imzalı webhook yolu hedefli testlerle birlikte güvenceye alındı. Hata akışında abonelik `update/create` mutasyonu oluşmadığı, yalnız scoped invoice kapanışı + audit + revalidation yan etkilerinin çalıştığı doğrulanıyor.

**Uygulama durumu — 12.07.2026 P2-S1 parçalı banka kaydı çakışma telafisi:** Parçalı fark `CashBankMovement` oluşturma akışı, önceki read guard'a ek olarak repository unique/yarış çakışmasını kontrollü duplicate sonucu olarak ele alıyor. Çakışma halinde banka hareketi `matched` yapılmıyor, ledger veya audit yazılmıyor ve kullanıcıya aynı banka/kasa çifti için fark kaydının zaten oluşturulduğu söyleniyor. Bu sertleştirme yeni parçalı mutabakat modeli veya dış banka erişimi açmaz.

**Uygulama durumu — 12.07.2026 P2-S1 parçalı kayıt exception ayrımı:** Parçalı fark kaydı çakışma telafisi yalnız Prisma `P2002` veya açık unique/duplicate constraint hatalarını duplicate kabul ediyor; bağlantı/veritabanı gibi diğer repository hataları artık ayrı kontrollü kayıt oluşturma hatasıyla dönüyor. Her iki durumda da banka hareketi, ledger ve audit yazımı create adımından önce gerçekleşmiyor.

**Geliştirme ortamı seed düzeltmesi — 12.07.2026:** Tüm demo firmalarının abonelikleri artık uygulamanın gerçek `kurumsal` plan kimliğiyle seed ediliyor; eski `enterprise` kimlik uyumsuzluğu kaldırıldı. Seed sonrası demo kullanıcılar hangi firma/session kapsamına geçerse geçsin en üst paket erişim matrisiyle tüm modülleri görebilir. Bu değişiklik yalnız `npm run db:seed` ile oluşturulan demo başlangıç verisini etkiler; canlı tenant abonelik kararlarını bypass etmez.

**Geliştirme ortamı erişim matrisi doğrulaması — 12.07.2026:** `kurumsal` plan kataloğunun dahil modülleri artık Profesyonel kapsamı tek bir üst etiketle değil, Hakediş/Çek/İhale/Döküman/E-Fatura ile Banka/Arvento/AI modüllerini açıkça içeriyor. Böylece feature access helper’ı demo üst paketinde tüm guarded özellikleri gerçekten `enabled=true` üretir; bu ayar canlı abonelik guard’ını gevşetmez.

**Geliştirme ortamı plan seed sözleşmesi — 12.07.2026:** `subscription-seed` artık uygulama plan kataloğundaki dört kimliği (`baslangic`, `standart`, `profesyonel`, `kurumsal`), adları, fiyatları, limitleri ve sıralamayı aynı kaynakla hizalar. Böylece Prisma plan kayıtları ile `/abonelik` read-model'i arasında `starter/enterprise` gibi eski kimlik ve fiyat ayrışması kalmaz; demo seed tüm firmalarda Kurumsal aktif aboneliği korurken diğer planlar da tutarlı katalog verisi olarak kalır.

**Uygulama durumu — 12.07.2026 P2-S1 parçalı mutabakat onay koruması:** `/ayarlar` Parçalı Yeni Kayıt Taslakları tablosundaki `Kayda Çevir` aksiyonu artık doğrudan mutasyon üretmiyor; banka açıklaması, mevcut kasa/banka belgesi ve kalan fark tutarını gösteren `Parçalı mutabakat onayı` adımı açıyor. `Vazgeç` ve `Escape` kapanışları repository, ledger, audit ve banka statüsü yan etkisi üretmez; ikinci `Kısmi Mutabakatı Onayla` adımı mevcut hesap seçimiyle parçalı kayıt action'ını çağırır. Bu dilim çoklu muhasebe dağıtımı veya tam ledger çekirdeği açmaz.

**Uygulama durumu — 12.07.2026 P2-S3 araç uygunluk uyarıları:** Kalıcı aktif araç kartlarındaki `insuranceEndDate` ve `inspectionEndDate` artık Arvento filo read-model uyarılarına bağlanıyor. Bugün geçmiş tarihler `Kritik`, önümüzdeki 30 gün içindeki tarihler `Uyarı` olarak mevcut `Arvento Araç Uyarıları` bandında görünür; pasif kartlar ve geçersiz tarih değerleri değerlendirmeye alınmaz. Bu dilim poliçe/servis yenileme mutasyonu, otomatik pasife alma, dış Arvento çağrısı veya bildirim üretimi açmaz.

**Uygulama durumu — 12.07.2026 P2-S3 araç uygunluk özeti:** Arvento filo read-model özeti artık aktif araçlardaki sigorta ve muayene uygunluk uyarılarını ayrı sayaçlar olarak taşıyor. `/araclar` metrik bandında `Sigorta uyarısı` ve `Muayene uyarısı` adetleri, toplam/kritik uyarı sayılarıyla birlikte gösteriliyor; pasif araçlar, geçersiz tarihler ve 30 günden uzak tarihler kapsam dışında kalıyor. Bu dilim yalnız operasyonel read-model görünürlüğünü ilerletir; poliçe/servis yenileme mutasyonu, otomatik görev, bildirim veya dış Arvento çağrısı açmaz.

**Uygulama durumu — 12.07.2026 P2-S3 araç uyarı türü filtresi:** `/araclar` Arvento Araç Uyarıları tablosuna sigorta, muayene, sinyal, bakım ve yakıt türü filtresi eklendi. Tür filtresi mevcut metin aramasıyla birlikte çalışıyor; sayaç, temizleme aksiyonu ve boş durum seçili birleşik sonucu yansıtıyor. Bu dilim yalnız mevcut filo read-model risklerini operasyonel olarak ayırır; yeni alarm üretimi, görev, bildirim veya dış Arvento çağrısı açmaz.

**Uygulama durumu — 12.07.2026 P2-S1 parçalı kayıt sayaç görünürlüğü:** `/ayarlar` Son Banka Hareketleri özet satırı artık mevcut bekleyen/eşleştirilen/yoksayılan sayaçlarına ek olarak `Parçalı kaydedildi` adetini de gösteriyor. Sayaç tenant/firma/dönem kapsamındaki kasa-banka adaylarında `bank-transaction-partial` kaynaklı kayıtları sayıyor; bu görünürlük mevcut mutasyonları değiştirmiyor ve tam çift taraflı ledger çekirdeği açmıyor.

**Uygulama durumu — 13.07.2026 P2-S1 parçalı hareket durum filtresi:** `/ayarlar` Son Banka Hareketleri durum filtrelerine `Parçalı` seçeneği eklendi. Filtre, kasa-banka adaylarındaki `bank-transaction-partial` kaynak kimliğini banka hareketiyle eşleştirerek parçalı kayda dönüşmüş hareketleri `Eşleştirildi` grubundan ayrı gösteriyor; mevcut bekleyen/eşleştirilen/yoksayılan filtreleri korunuyor. Bu dilim yalnız scoped read-model filtrelemesidir; yeni mutasyon, ledger veya dış banka erişimi açmaz.

**Uygulama durumu — 13.07.2026 P2-S1 parçalı kaynak eşleme helper’ı:** `isPartialCashBankMovementForTransaction` helper’ı, parçalı kasa/banka kaynağının yalnız kendi banka hareketi kimliğiyle eşleşmesini tek domain sözleşmesine aldı. Ayarlar `Parçalı` filtresi artık gevşek prefix araması yerine deterministik `transactionId::cashBankMovementId` anahtarını doğruluyor; yanlış hareketin parçalı olarak görünmesi hedefli servis testiyle engellendi. Bu refactor mevcut mutasyonları veya ledger çekirdeğini genişletmez.

**Uygulama durumu — 13.07.2026 P2-S1 parçalı filtre durum guard’ı:** `Parçalı` banka hareketi filtresi yalnız `BankTransaction.status=matched` olan kaynakları gösteriyor. Eşleşme geri alınıp hareket tekrar `pending` olduğunda, geçmiş parçalı kaynak adayı kalmış olsa bile kayıt artık tamamlanmış parçalı listesine sızmıyor; bu davranış ayarlar ekranı testiyle güvenceye alındı. Yeni mutasyon veya ledger davranışı açılmadı.

**Uygulama durumu — 13.07.2026 P2-S1 son banka ledger izi tablosu:** `/ayarlar` Banka Entegrasyonu paneli, scoped read-model’den gelen son `BankLedgerEntry` kayıtlarını ayrı bir salt-okunur tabloda gösteriyor. Belge, açıklama, kasa/banka hesabı, tutar, borç/alacak yönü ve aktif/iptal durumu Türkçe operasyon etiketleriyle görünür; kayıt yoksa açık boş durum metni sunuluyor. Ledger özetiyle birlikte bu dilim, parçalı ve eşleşmiş banka hareketlerinden oluşan muhasebe izini kullanıcıya doğrudan okutur; yeni ledger mutasyonu, tam çift taraflı muhasebe çekirdeği veya dış banka erişimi açmaz.

**Uygulama durumu — 13.07.2026 P2-S1 ledger read-model sıralama kararlılığı:** Prisma banka ledger repository’sinin scoped `listEntries` sorgusu artık aynı `entryDate` içindeki kayıtları `createdAt desc` ikinci anahtarıyla deterministik sıralıyor ve 20 kayıt sınırını koruyor. Böylece `/ayarlar` son ledger tablosunda eşit işlem günündeki yeni kayıtların görünüm sırası veritabanı doğal sırasına bağlı kalmıyor; tenant/firma/dönem filtresi ve yazma davranışı değişmiyor. Repository kapsam/sıralama sözleşmesi hedefli testle güvenceye alındı.

**Uygulama durumu — 13.07.2026 P2-S1 ledger durum filtresi:** `/ayarlar` Son Ledger İzleri tablosu artık `Tümü`, `Aktif` ve `İptal` durum filtreleriyle çalışıyor. Filtre, mevcut scoped ledger read-model kayıtlarını yalnızca client-side daraltıyor; gösterilen/toplam sayaç, filtre boş durumu ve aktif/iptal Türkçe etiketleri aynı panelde korunuyor. Bu dilim ledger yazma, geri alma, audit veya tam çift taraflı muhasebe mutasyonu açmaz.

**Uygulama durumu — 13.07.2026 P2-S3 bakım uyarısı özeti:** Arvento filo read-model özeti, mevcut `Yaklaşan bakım` uyarılarını da ayrı `maintenanceAlertCount` sayacıyla taşıyor. `/araclar` metrik bandı sigorta ve muayene sayaçlarına ek olarak `Bakım uyarısı` adetini gösteriyor; sandbox bakım read-model’i korunuyor, bakım emri/yakıt gideri veya canlı Arvento telemetrisi açılmıyor.

**Uygulama durumu — 13.07.2026 P2-S3 araç bakım tarihi dikey dilimi:** `Vehicle.maintenanceDueDate` alanı tenant/firma/dönem kapsamlı kalıcı araç kartı modeline ve repository mapping’ine eklendi. `/araclar` kart formu bakım tarihini alıyor; geçersiz tarih domain seviyesinde reddediliyor, dolu tarih Arvento uygunluk read-model’inde `Yaklaşan bakım` veya `Kritik` uyarısına bağlanıyor ve araç audit değişiklik sözleşmesi alanı tanıyor. Bu dilim bakım emri, otomatik görev, yakıt gideri veya canlı Arvento telemetrisi üretmez.

**Uygulama durumu — 13.07.2026 P2-S3 bakım tarihi liste görünürlüğü:** Kalıcı `maintenanceDueDate` artık `/araclar` aktif ve pasif araç tablolarında `Bakım` sütununda gösteriliyor; boş tarih `-` olarak kalıyor ve mevcut liste arama/işlem akışları korunuyor. Bu dilim yalnız araç kartı read-model görünürlüğünü tamamlar; bakım emri, otomatik görev veya dış Arvento çağrısı açmaz.

**Uygulama durumu — 13.07.2026 P2-S3 bakım tarihi arama kapsamı:** Aktif ve pasif araç client-side aramaları artık sigorta, muayene, bakım ve tescil tarihlerini de kapsıyor. Operasyon kullanıcısı kart listesinden ayrılmadan `YYYY-AA-GG` tarih anahtarıyla uygunluk kaydını bulabiliyor; server-side sorgu veya yeni veri yazımı açılmıyor.

**Uygulama durumu — 13.07.2026 P2-S3 bakım tarihi audit diff görünürlüğü:** `vehicle.create`, `vehicle.update`, `vehicle.activate` ve `vehicle.deactivate` audit metadata özetleri `maintenanceDueDate` alanını taşıyor; update diff alanları da bakım tarihi değişikliğini `changedFields` içinde izliyor. Böylece bakım tarihi değişiklikleri araç işlem geçmişi ve CSV etiket sözleşmesinde kaybolmuyor.

**Uygulama durumu — 13.07.2026 P2-S3 bakım tarihi CSV doğrulaması:** Araç işlem geçmişi CSV helper testi, `maintenanceDueDate` değişikliğinin `Bakım tarihi` etiketiyle dışa aktarıldığını kilitliyor. Böylece yeni bakım alanı form ve audit metadata’dan sonra operatörün mevcut Excel uyumlu raporunda da okunabilir kalıyor.

**Uygulama durumu — 13.07.2026 P2-S3 bakım tarihi domain guard testi:** `validateVehicleCardDraft`, `2026-02-29` gibi takvimde bulunmayan bakım tarihlerini repository/action yazımına ulaşmadan `Bakım tarihi geçerli bir tarih olmalıdır.` hatasıyla reddediyor. Böylece bakım alanı sigorta, muayene ve tescil tarihleriyle aynı gerçek-takvim günü sözleşmesini paylaşıyor.

**Uygulama durumu — 13.07.2026 P2-S3 geçmiş bakım uyarısı:** Arvento araç uygunluk read-model’i, geçmiş `maintenanceDueDate` değerlerini `Kritik` seviyesinde `Yaklaşan bakım` uyarısı olarak üretiyor; uyarı detayı dolum tarihini taşıyor ve bakım sayaçlarına dahil oluyor. Bu yalnız risk görünürlüğüdür; bakım emri, otomatik görev veya bildirim mutasyonu açmaz.

**Uygulama durumu — 13.07.2026 P2-S3 bakım durum etiketi tutarlılığı:** Aktif araç takip satırındaki `Bakım` etiketi, dolu bakım tarihi 30 gün içinde veya geçmişse `Yaklaşan bakım` olarak read-model’e yansıyor. Tarih kaynaklı bakım uyarısı, sandbox satırının genel bakım uyarısıyla çift sayılmıyor; geçmiş tarih için kritik detay ve tekil sayaç korunuyor.

**Uygulama durumu — 13.07.2026 P2-S3 araç uygunluk uyarısı sıralama kararlılığı:** Arvento uygunluk read-model’i aynı öncelikteki uyarıları artık uyarı türü, plaka ve deterministik kimlik ile kararlı sıraya koyuyor. Böylece aynı kapsam ve tarihlerdeki aktif araç uyarıları giriş/DB sırasına bağlı olarak yer değiştirmiyor; kritik/uyarı önceliği, sayaçlar ve yeni mutasyon/dış Arvento davranışı değişmiyor. Bu sözleşme servis testiyle güvenceye alındı.

**Uygulama durumu — 13.07.2026 P2-S3 uygunluk uyarısı tarih read-model’i:** Sigorta, muayene ve bakım kaynaklı Arvento uygunluk uyarıları artık son tarihi `dueDate` alanıyla yapılandırılmış olarak taşıyor; `/araclar` uyarı tablosu bu tarihi ayrı `Son Tarih` sütununda gösteriyor. Sinyal/yakıt gibi tarih taşımayan operasyon uyarılarında `-` görünümü korunuyor; serbest detay metni, sayaçlar ve dış Arvento/bakım mutasyonu değişmiyor.

**Uygulama durumu — 13.07.2026 P2-S3 uygunluk tarihi arama kapsamı:** `/araclar` Arvento uyarı araması artık yapılandırılmış `dueDate` değerini de arama metnine dahil ediyor. Operatör `YYYY-AA-GG` ile sigorta, muayene veya bakım uyarısını doğrudan bulabiliyor; mevcut tür filtresi, temizleme davranışı ve dış Arvento/iş emri kapsamı değişmiyor. UI testi tarih araması ve eşleşmeyen uyarının elenmesini güvenceye alıyor.

**Uygulama durumu — 13.07.2026 P2-S1 banka ledger read-model özeti:** Banka entegrasyonu overview’ü artık tenant/firma/dönem kapsamındaki son `BankLedgerEntry` satırlarını opsiyonel read-model olarak taşıyor. `/ayarlar` Son Banka Hareketleri özetinde toplam ledger izi, aktif ve iptal edilmiş kayıt sayaçları gösteriliyor; listEntries desteği olmayan test/demo repository’lerinde mevcut overview sözleşmesi geriye dönük korunuyor. Bu dilim ledger yazma, tam çift taraflı muhasebe veya dış banka erişimi açmaz.

**Uygulama durumu — 13.07.2026 P1-S7 davet durum filtresi:** `/ayarlar` Davet Geçmişi tablosuna `Tümü`, `Bekliyor`, `Kabul Edildi`, `Süresi Doldu` ve `İptal Edildi` durum filtresi eklendi. Durum seçimi mevcut e-posta/rol/metin aramasıyla birlikte çalışıyor; birleşik sonuç sayacı, boş durum ve tek aksiyonlu temizleme davranışı korunuyor. Filtre yalnızca mevcut scoped kullanıcı yönetimi read-model’ini client-side daraltıyor; yeni davet mutasyonu veya e-posta gönderimi açmıyor.

**Uygulama durumu — 13.07.2026 P2-S4 çekler API okuma yüzeyi:** API anahtar sözleşmesine `checks` kapsamı eklendi ve `/api/cekler` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `checks` kapsamıyla çalışıyor; anahtarın tenant/firma/dönem scope'undan `ChequeService.list` read-model'ini `count + rows` biçiminde döndürüyor. Yetkisiz isteklerde mevcut Bearer challenge davranışı korunuyor; endpoint çek oluşturma/tahsil/iptal mutasyonu, dış sağlayıcı veya webhook teslimatı açmıyor. Route testi scope aktarımı ve yetkisiz yanıtı güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 ihale API okuma yüzeyi:** API anahtar sözleşmesine `tenders` kapsamı eklendi ve `/api/ihaleler` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `tenders` kapsamıyla çalışıyor; anahtarın tenant/firma/dönem scope'undan `TenderService.list` read-model'ini `count + rows` biçiminde döndürüyor. Yetkisiz isteklerde mevcut Bearer challenge davranışı korunuyor; endpoint ihale oluşturma, BOQ, durum geçişi veya şantiye dönüşüm mutasyonu açmıyor. Route testi scope aktarımı ve yetkisiz yanıtı güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 hakediş API okuma yüzeyi:** API anahtar sözleşmesine `progress-payments` kapsamı eklendi ve `/api/hakedisler` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `progress-payments` kapsamıyla çalışıyor; anahtarın tenant/firma/dönem scope'undan `ProgressPaymentService.list` read-model'ini `count + rows` biçiminde döndürüyor. Yetkisiz isteklerde mevcut Bearer challenge davranışı korunuyor; endpoint hakediş oluşturma, kaydetme, iptal veya kasa/banka mutasyonu açmıyor. Route testi scope aktarımı ve yetkisiz yanıtı güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 döküman metadata API okuma yüzeyi:** API anahtar sözleşmesine `documents` kapsamı eklendi ve `/api/dokumanlar` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `documents` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan aktif dosya, klasör ve çöp kutusu metadata read-model'ini sayaçlarla birlikte döndürüyor. Storage binary içeriği, indirme anahtarı üretimi, dosya yükleme/silme veya başka bir mutasyon açılmıyor. Route testi scope aktarımı, metadata sayaçları ve yetkisiz yanıtı güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S2 yenileme checkout idempotency guard'ı:** Manuel abonelik yenileme checkout'u aynı tenant/firma/dönem, paket, gün ve faturalama döngüsü için mevcut `pending` fatura geçmişini tespit ediyor. Tekrar tıklamada yeni provider checkout session'ı, yeni pending invoice upsert'i veya yeni audit yan etkisi üretmeden aynı invoice taslağı geri döndürülüyor; ilk checkout, sandbox onay/hata ve canlı provider sınırı korunuyor. Bu dilim otomatik tahsilat veya canlı ödeme adaptörü eklemiyor; yalnız mevcut manuel yenileme akışını yinelenen denemelere karşı deterministik hale getiriyor.

**Uygulama durumu — 13.07.2026 P2-S2 yenileme failure idempotency guard'ı:** Yenileme ödeme hatası akışı aynı scoped `invoiceNo` için mevcut `Başarısız` ödeme geçmişini bulduğunda yeni fatura failure upsert'i veya `subscription.renewal-checkout-payment.fail` audit tekrarı üretmeden mevcut başarısız invoice durumunu döndürüyor. Yeni provider hata referansı yalnız ilk failure yazımında kabul ediliyor; retry/duplicate webhook telafisi ve mevcut abonelik korunuyor. Bu dilim otomatik tahsilat, canlı provider adaptörü veya abonelik uzatma mutasyonu açmıyor.

**Uygulama durumu — 13.07.2026 P2-S3 araç kartı API okuma yüzeyi:** API anahtar sözleşmesine `vehicles` kapsamı eklendi ve `/api/araclar` Route Handler açıldı. Endpoint tenant/firma/dönem scope'u içindeki kalıcı araç kartlarını `count`, `activeCount`, `passiveCount` ve satır listesiyle döndürüyor; bakım, sigorta, muayene ve araç kimliği metadata alanları repository read-model'inde korunuyor. Canlı Arvento GPS çağrısı, cihaz senkronu, yakıt/KM yazımı veya araç statü mutasyonu açılmıyor. Route testi scope aktarımı, aktif/pasif sayaçları ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 gider API okuma yüzeyi:** API anahtar sözleşmesine `expenses` kapsamı eklendi ve `/api/giderler` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `expenses` kapsamıyla çalışıyor; anahtarın tenant/firma/dönem scope'undan `ExpenseService.list` read-model'ini `count + rows` biçiminde döndürüyor. Yetkisiz isteklerde mevcut Bearer challenge davranışı korunuyor; endpoint gider oluşturma, iptal, kasa/banka hareketi veya muhasebe mutasyonu açmıyor. Route testi scope aktarımı ve yetkisiz yanıtı güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 personel API okuma yüzeyi:** API anahtar sözleşmesine `employees` kapsamı eklendi ve `/api/personel` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `employees` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan mevcut `personel` entity read-model'ini `count + rows` biçiminde döndürüyor. Personel oluşturma/düzenleme, bordro, puantaj veya yetki mutasyonu açılmıyor. Route testi scope aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 puantaj API okuma yüzeyi:** API anahtar sözleşmesine `timesheets` kapsamı eklendi ve `/api/puantaj` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `timesheets` kapsamıyla çalışıyor; anahtarın tenant/firma/dönem scope'undan `TimesheetService.list` read-model'ini `count + rows` biçiminde döndürüyor. Yetkisiz isteklerde mevcut Bearer challenge davranışı korunuyor; endpoint puantaj oluşturma, kaydetme/iptal, bordro veya kasa/banka mutasyonu açmıyor. Route testi scope aktarımı ve yetkisiz yanıtı güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 kasa/banka API okuma yüzeyi:** API anahtar sözleşmesine `cash-bank` kapsamı eklendi ve `/api/kasa-banka` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `cash-bank` kapsamıyla çalışıyor; anahtarın tenant/firma/dönem scope'undan `CashBankMovementService.list` read-model'ini `count + rows` biçiminde döndürüyor. Yetkisiz isteklerde mevcut Bearer challenge davranışı korunuyor; endpoint kasa/banka hareketi oluşturma, eşleştirme, ledger veya ödeme mutasyonu açmıyor. Route testi scope aktarımı ve yetkisiz yanıtı güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 bildirim API okuma yüzeyi:** API anahtar sözleşmesine `notifications` kapsamı eklendi ve `/api/bildirimler` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `notifications` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan bildirim satırlarını, okunmamış sayaç özetini, kategori/öncelik modelini ve tercih read-model'ini döndürüyor. Okundu işaretleme, kategori tercihi veya yeni bildirim üretimi mutasyonu açılmıyor. Route testi scope aktarımı, okunmamış özet ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 taşeron API okuma yüzeyi:** API anahtar sözleşmesine `contractors` kapsamı eklendi ve `/api/taseronlar` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `contractors` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan mevcut `taseronlar` entity read-model'ini `count + rows` biçiminde döndürüyor. Taşeron sözleşmesi, hakediş, ödeme veya kayıt mutasyonu açılmıyor. Route testi scope aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 tedarikçi API okuma yüzeyi:** API anahtar sözleşmesine `suppliers` kapsamı eklendi ve `/api/tedarikciler` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `suppliers` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan mevcut `tedarikciler` entity read-model'ini `count + rows` biçiminde döndürüyor. Tedarikçi fatura, ödeme veya kayıt mutasyonu açılmıyor. Route testi scope aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 müşteri API okuma yüzeyi:** API anahtar sözleşmesine `customers` kapsamı eklendi ve `/api/musteriler` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `customers` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan mevcut `musteriler` entity read-model'ini `count + rows` biçiminde döndürüyor. Cari bakiye, tahsilat veya müşteri kayıt mutasyonu açılmıyor. Route testi scope aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 stok kartı API okuma yüzeyi:** API anahtar sözleşmesine `stock-cards` kapsamı eklendi ve `/api/stok-kartlari` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `stock-cards` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan mevcut `stok-kartlari` entity read-model'ini `count + rows` biçiminde döndürüyor. Stok miktarı, minimum eşik, depo hareketi veya kart mutasyonu açılmıyor. Route testi scope aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 abonelik API read-model yüzeyi:** API anahtar sözleşmesine `subscriptions` kapsamı eklendi ve `/api/abonelik` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `subscriptions` kapsamıyla çalışıyor; tenant/firma/dönem scoped kalıcı abonelik snapshot'ını paketler, ek özellikler, aktif abonelik, ödeme geçmişi ve provider olaylarıyla birlikte döndürüyor. Checkout, ödeme onayı/hatası, yenileme veya abonelik mutasyonu açılmıyor. Route testi snapshot scope aktarımını, paket kataloğunu ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 banka hareketleri API okuma yüzeyi:** API anahtar sözleşmesine `bank-transactions` kapsamı eklendi ve `/api/banka-hareketleri` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `bank-transactions` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan banka hareketlerini `count + rows` biçiminde döndürüyor. Senkronizasyon, eşleştirme, yoksayma, geri alma, ledger veya kasa/banka mutasyonu açılmıyor. Route testi scoped transaction aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 API anahtarı metadata okuma yüzeyi:** API anahtar sözleşmesine `api-keys` kapsamı eklendi ve `/api/api-anahtarlari` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `api-keys` kapsamıyla çalışıyor; aynı tenant/firma/dönem içindeki anahtarları secret/token döndürmeden satır ve aktif/süresi dolmuş/iptal edilmiş sayaçlarıyla veriyor. Anahtar oluşturma, iptal, secret yenileme veya audit mutasyonu açılmıyor. Route testi scoped overview aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P1-S7 scoped rol değiştirme:** `/ayarlar` Aktif Kullanıcılar tablosunda rol alanı admin kontrollü seçime dönüştürüldü. `updateUserAccessRoleAction`, yalnız aktif tenant/firma/dönem erişim satırını ve `admin/accounting/viewer` rollerini kabul ediyor; kendi admin rolünü düşürme engelleniyor, rol geçişi `user-management.role-change` audit metadata'sıyla kaydediliyor ve başarı sonrası ayarlar/modül cache'i yenileniyor. Prisma ve bellek repository'leri güncellendi; servis testi rol geçişi, scope ve audit izini güvenceye aldı. Bu dilim tam granular kaynak/RBAC matrisi veya çoklu firma erişimi mutasyonu açmıyor.

**Uygulama durumu — 13.07.2026 P2-S4 bordro API okuma yüzeyi:** API anahtar sözleşmesine `payroll` kapsamı eklendi ve `/api/bordro` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `payroll` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan bordro/tahakkuk read-model'ini `count + rows` biçiminde döndürüyor. Tahakkuk oluşturma, kaydetme, iptal, ödeme veya muhasebe mutasyonu açılmıyor. Route testi scoped aktarım ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 webhook endpoint API okuma yüzeyi:** Mevcut `webhooks` kapsamıyla `/api/webhook-endpointleri` Route Handler açıldı. Endpoint tenant/firma/dönem scoped webhook endpoint satırlarını aktif/pasif sayaçlarıyla döndürüyor; secret hash/token, endpoint oluşturma, aktifleştirme, pasifleştirme, secret rotation veya dış HTTP teslimatı açılmıyor. Route testi scoped overview aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 alış faturaları API okuma yüzeyi:** API anahtar sözleşmesine `purchase-invoices` kapsamı eklendi ve `/api/alis-faturalari` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `purchase-invoices` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan alış faturası read-model'ini `count + rows` biçiminde döndürüyor. Fatura oluşturma, kaydetme, iptal, ödeme veya muhasebe mutasyonu açılmıyor. Route testi scoped aktarım ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 stok minimum eşikleri API okuma yüzeyi:** API anahtar sözleşmesine `stock-minimums` kapsamı eklendi ve `/api/stok-esikleri` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `stock-minimums` kapsamıyla çalışıyor; tenant/firma/dönem scope'undan aktif stok minimum ayarlarını `count + rows` biçiminde döndürüyor. Eşik kaydetme/upsert, stok hareketi veya bildirim mutasyonu açılmıyor. Route testi scoped aktarım ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 audit API okuma yüzeyi:** API anahtar sözleşmesine `audit` kapsamı eklendi ve `/api/audit-kayitlari` Route Handler açıldı. Endpoint `entityType` ve 1..100 arası sınırlandırılmış limit ile tenant/firma/dönem scoped son audit kayıtlarını döndürüyor; `entityType` olmadan veritabanı okuması yapılmıyor. Audit yazımı, silme, düzenleme veya kapsam dışı tenant erişimi açılmıyor. Route testi limit sınırını, zorunlu parametreyi, scoped okuma ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 kullanıcı yönetimi API read-model yüzeyi:** API anahtar sözleşmesine `user-management` kapsamı eklendi ve `/api/kullanici-yonetimi` Route Handler açıldı. Endpoint yalnız geçerli Bearer anahtarı ve `user-management` kapsamıyla çalışıyor; tenant/firma/dönem scoped aktif kullanıcı, davet, audit ve outbox overview'ünü döndürüyor. Kullanıcı rolü/durumu, davet veya e-posta kuyruğu mutasyonu açılmıyor. Route testi scoped overview aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 ihale dashboard özeti API yüzeyi:** Mevcut `tenders` kapsamıyla `/api/ihale-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped ihale satırlarını mevcut `summarizeTenders` read-model hesaplayıcısıyla toplam ve durum özeti olarak döndürüyor; ihale oluşturma, durum geçişi, BOQ veya şantiye dönüşüm mutasyonu açılmıyor. Route testi scoped liste aktarımı, özet hesaplama ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 hakediş özeti API yüzeyi:** Mevcut `progress-payments` kapsamıyla `/api/hakedis-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped hakediş satırlarından toplam kayıt, durum sayaçları ve toplam tutar read-model’ini döndürüyor; hakediş oluşturma, kaydetme/iptal, ödeme veya kasa-banka mutasyonu açılmıyor. Route testi scoped liste aktarımı, durum/tutar özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 kasa/banka özeti API yüzeyi:** Mevcut `cash-bank` kapsamıyla `/api/kasa-banka-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped kasa/banka hareketlerini para birimine göre giriş/çıkış toplamları ve hareket sayaçlarıyla döndürüyor; hareket oluşturma, eşleştirme, yoksayma veya ledger mutasyonu açılmıyor. Route testi scoped aktarım, para birimi ayrımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 çek özeti API yüzeyi:** Mevcut `checks` kapsamıyla `/api/cek-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped çek satırlarından durum sayaçları ve para birimi toplamlarını döndürüyor; çek oluşturma, tahsil, iptal veya kasa/banka mutasyonu açılmıyor. Route testi scoped liste aktarımı, durum/para birimi özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 gider özeti API yüzeyi:** Mevcut `expenses` kapsamıyla `/api/gider-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped gider satırlarından durum sayaçları ve para birimi bazlı toplamları döndürüyor; gider oluşturma/iptal veya kasa-banka mutasyonu açılmıyor. Route testi scoped liste aktarımı, durum/para birimi özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 müşteri özeti API yüzeyi:** Mevcut `customers` kapsamıyla `/api/musteri-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped müşteri entity read-model’inden toplam kayıt ve durum sayaçlarını döndürüyor; cari bakiye, tahsilat veya müşteri kayıt mutasyonu açılmıyor. Route testi scoped liste aktarımı, durum özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 tedarikçi özeti API yüzeyi:** Mevcut `suppliers` kapsamıyla `/api/tedarikci-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped tedarikçi entity read-model’inden toplam kayıt ve durum sayaçlarını döndürüyor; tedarikçi fatura/ödeme veya kayıt mutasyonu açılmıyor. Route testi scoped liste aktarımı, durum özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 taşeron özeti API yüzeyi:** Mevcut `contractors` kapsamıyla `/api/taseron-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped taşeron entity read-model’inden toplam kayıt ve durum sayaçlarını döndürüyor; sözleşme, hakediş, ödeme veya taşeron kayıt mutasyonu açılmıyor. Route testi scoped liste aktarımı, durum özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 personel özeti API yüzeyi:** Mevcut `employees` kapsamıyla `/api/personel-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped personel entity read-model’inden toplam kayıt, rol ve durum sayaçlarını döndürüyor; personel oluşturma/düzenleme, bordro veya puantaj mutasyonu açılmıyor. Route testi scoped liste aktarımı, rol/durum özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 puantaj özeti API yüzeyi:** Mevcut `timesheets` kapsamıyla `/api/puantaj-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped puantaj satırlarından toplam kayıt, durum sayaçları, toplam çalışılan gün ve fazla mesai saatini döndürüyor; puantaj oluşturma/kaydetme/iptal veya bordro mutasyonu açılmıyor. Route testi scoped liste aktarımı, gün/saat özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 şantiye özeti API yüzeyi:** Mevcut `projects` kapsamıyla `/api/santiye-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped şantiye entity read-model’inden toplam kayıt ve durum sayaçlarını döndürüyor; şantiye oluşturma/düzenleme veya stok mutasyonu açılmıyor. Route testi scoped liste aktarımı, durum özeti ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 stok kartı özeti API yüzeyi:** Mevcut `stock-cards` kapsamıyla `/api/stok-karti-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped stok kartı entity read-model’inden toplam kayıt, durum sayaçları ve minimum miktarı yapılandırılmış kart sayısını döndürüyor; stok hareketi veya kart mutasyonu açılmıyor. Route testi scoped liste aktarımı, minimum ayar sayımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 bildirim özeti API yüzeyi:** Mevcut `notifications` kapsamıyla `/api/bildirim-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped bildirim read-model’inden toplam/okunmamış sayaçları ile kategori ve öncelik dağılımını döndürüyor; okundu işaretleme, tercih veya bildirim üretme mutasyonu açılmıyor. Route testi scoped özet aktarımı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 fatura özeti API yüzeyi:** Mevcut `invoices` kapsamıyla `/api/fatura-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped fatura entity read-model’inden toplam kayıt, durum sayaçları ve güvenli sayısal toplam tutarı döndürüyor; fatura oluşturma/kaydetme/iptal veya tahsilat mutasyonu açılmıyor. Route testi scoped liste aktarımı, Türkçe tutar ayrıştırması ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S3 araç uygunluk özeti API yüzeyi:** Mevcut `vehicles` kapsamıyla `/api/arac-ozeti` Route Handler açıldı. Endpoint tenant/firma/dönem scoped araç kartlarından aktif/pasif sayaçları ile sigorta, muayene ve bakım tarihleri için yapılandırılmış/miadı geçmiş özetini döndürüyor; Arvento çağrısı, GPS senkronu, yakıt/KM yazımı veya araç mutasyonu açılmıyor. Route testi scoped liste aktarımı, boş tarih guard'ı ve yetkisiz Bearer yanıtını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 entegrasyon tanılama scope guard'ı:** `/api/entegrasyon/durum` artık API anahtarında özel `integration` kapsamını zorunlu tutuyor. Endpoint yine yalnız güvenli anahtar metadata'sını döndürüyor; dış sağlayıcı çağrısı, entegrasyon mutasyonu veya tenant kapsam genişlemesi yok. Route testi yeni required scope aktarımını ve mevcut Bearer challenge davranışını güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 entegrasyon scope denial testi:** `/api/entegrasyon/durum` route testi, geçerli Bearer olup `integration` kapsamı eksik anahtarı `403` ile reddediyor ve `WWW-Authenticate` başlığı üretmiyor. Böylece entegrasyon metadata'sının kapsam eksikliğinde okunmaması da sözleşmeye kilitlendi; runtime davranışı veya dış entegrasyon değişmedi.

**Uygulama durumu — 13.07.2026 P2-S4 API scope sözleşmesi tekillik testi:** API anahtar sözleşmesi testi, büyüyen `API_KEY_SCOPES` listesindeki anahtarların tekil kalmasını ve entegrasyon tanılama için `integration` kapsamının mevcut olmasını güvenceye aldı. Bu yalnız sözleşme/test sertleştirmesidir; runtime veri erişimi veya mutasyon davranışı değişmedi.

**Uygulama durumu — 13.07.2026 P2-S4 webhook endpoint API filtreleri:** `/api/webhook-endpointleri` salt-okunur yüzeyi opsiyonel `active=true|false` ve `eventType` sorgu filtrelerini destekliyor. Filtreli cevapta sayaçlar yalnız görünür scoped satırlardan yeniden hesaplanıyor; filtresiz mevcut overview sözleşmesi korunuyor. Endpoint oluşturma, aktifleştirme, secret rotation veya dış teslimat davranışı değişmedi; route testi filtre kombinasyonunu güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 API anahtarı metadata filtreleri:** `/api/api-anahtarlari` salt-okunur yüzeyi opsiyonel `status` ve `used=true|false` sorgu filtrelerini destekliyor. Filtreli cevapta aktif/süresi dolmuş/iptal edilmiş sayaçları yalnız görünür scoped satırlardan yeniden hesaplanıyor; secret, oluşturma ve iptal davranışı değişmedi. Route testi filtre kombinasyonunu ve filtresiz geriye dönük overview sözleşmesini güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 bildirim API filtreleri:** `/api/bildirimler` salt-okunur yüzeyi opsiyonel `category`, `priority` ve `unread=true|false` sorgu filtrelerini destekliyor. Filtreli cevapta satırlar, okunmamış sayaç ve bildirim model istatistikleri yalnız görünür scoped satırlardan yeniden hesaplanıyor; filtresiz cevap sözleşmesi, okundu işaretleme ve tercih mutasyonları korunuyor. Route testi filtre kombinasyonunu güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 banka hareketleri API filtreleri:** `/api/banka-hareketleri` salt-okunur yüzeyi opsiyonel `status`, `direction`, `dateFrom` ve `dateTo` sorgu filtrelerini destekliyor. Filtreli cevap yalnız tenant/firma/dönem scoped hareketleri döndürüyor; senkronizasyon, eşleştirme, yoksayma, geri alma veya ledger mutasyonları değişmedi. Route testi durum/yön/tarih birleşimini güvenceye aldı.

**Uygulama durumu — 13.07.2026 P2-S4 API faz kapanışı:** Planlı API read-model yüzeyi tek geçişte tamamlandı. 30 tekil API scope'u, modül liste/özet route'ları, operasyonel filtreler, Bearer kapsam guard'ları ve tenant/firma/dönem izolasyonu birlikte doğrulandı; üretim build'inde tüm route'lar derlendi. API katmanı salt-okunur bırakıldı; canlı ödeme/Open Banking/e-Fatura sağlayıcı çağrısı ve outbound webhook worker'ı açılmadı. Bir sonraki iş akışı P2 ledger çekirdeği veya dış entegrasyon gerektirmeyen küçük domain/UI diliminden seçilecektir.

**Uygulama durumu — 13.07.2026 P2-S1 ledger read-model toplam görünürlüğü:** `/ayarlar` Son Ledger İzleri bandı mevcut aktif/iptal sayaçlarına ek olarak aktif ledger kayıtlarının Borç ve Alacak toplamlarını TL formatında gösteriyor. Toplamlar yalnız scoped read-model içindeki `status=active` kayıtlarından hesaplanıyor; iptal edilmiş izler finansal toplamı etkilemiyor. Bu küçük görünürlük dilimi tam çift taraflı `LedgerEntry/LedgerLine` muhasebe çekirdeği, yeni yazma mutasyonu veya dış banka erişimi açmaz.

**Uygulama durumu — 13.07.2026 P2-S1 ledger hesap dağılımı read-model'i:** Aktif banka ledger izleri artık kasa/banka hesap kodu ve adına göre gruplanarak Borç/Alacak toplam dağılımını `/ayarlar` özet bandında gösteriyor. Gruplama yalnız mevcut scoped ve aktif `BankLedgerEntry` satırlarını kullanıyor; iptal kayıtları ve farklı tenant/firma/dönem satırları hesaba katılmıyor. Bu dilim tam çift taraflı muhasebe çekirdeği veya yeni ledger yazma mutasyonu açmaz.

**Uygulama durumu — 13.07.2026 P2-S1 ledger hesap filtresi:** `/ayarlar` Son Ledger İzleri tablosuna mevcut hesap kodu/adlarından üretilen client-side `Ledger hesap filtresi` eklendi. Durum ve hesap filtreleri birlikte çalışıyor; seçili kombinasyonun gösterim sayacı ve boş durum metni güncelleniyor. Filtre yalnız scoped read-model satırlarını daraltıyor, ledger yazma/iptal veya muhasebe çekirdeği davranışı değişmiyor.

**Uygulama durumu — 13.07.2026 P2-S1 ledger mutabakat kontrolü read-model'i:** `buildBankLedgerReconciliationIssues`, scoped banka hareketleri ile aktif `BankLedgerEntry` izlerini hareket kimliği, durum, toplam tutar ve beklenen Borç/Alacak yönü üzerinden karşılaştırıyor. Eşleşmiş fakat aktif izi eksik olan, tutarı/yönü uyuşmayan, bekleyen veya yoksayılan durumda aktif iz taşıyan ve banka hareketi bulunmayan sahipsiz aktif ledger kayıtları `/ayarlar` içindeki ayrı mutabakat tablosunda görünür hale geldi; iptal izleri kontrol toplamına alınmıyor. Bu dilim yalnız operasyonel read-model ve tutarlılık görünürlüğü sağlar; ledger yazma/onarım mutasyonu, tam çift taraflı `LedgerEntry/LedgerLine` çekirdeği veya dış banka erişimi açmaz.

**Uygulama durumu — 13.07.2026 P2-S1 ledger mutabakat pencere hizalaması:** Banka entegrasyonu overview okuması, ledger izlerini artık bağımsız bir `son 20 ledger` penceresinden değil, tenant/firma/dönem kapsamındaki görünür son banka hareketlerinin kimlikleriyle sorguluyor. Prisma repository tekrar eden hareket kimliklerini tekilleştiriyor ve kimlik filtresi verildiğinde parçalı mutabakatın aynı banka hareketine bağlı tüm ledger satırlarını `take: 20` ile kesmeden döndürüyor. Böylece tarih sırası veya parçalı satır sayısı nedeniyle var olan aktif izlerin read-model dışında kalıp sahte eksik/sahipsiz mutabakat uyarısı üretmesi engelleniyor; dış banka erişimi, ledger yazma/onarım mutasyonu ve tam çift taraflı muhasebe çekirdeği açılmıyor.

**Uygulama durumu — 13.07.2026 P2-S1 eşleştirme ledger hata telafisi:** Mevcut kasa/banka hareketini onaylayan otomatik ve manuel banka eşleştirmeleri ortak `persistMatchedTransactionWithLedger` güvenlik adımına alındı. Banka hareketi `matched` durumuna geçirildikten sonra `BankLedgerEntry` kalıcılığı hata verirse hareket aynı servis çağrısında tekrar `pending` durumuna alınır, kontrollü hata sonucu döner ve başarı audit izi yazılmaz. Bu dar telafi dilimi yeni kasa/banka hareketi veya parçalı fark kaydı oluşturan çoklu yazma akışlarını kapsamaz; onlar kalıcı hareket silme/transaction sınırı gerektirdiği için ayrı bırakılmıştır. Tam çift taraflı muhasebe çekirdeği veya dış banka erişimi açılmaz.

**Uygulama durumu — 13.07.2026 P2-S1 ledger hata telafisi audit izi:** Otomatik ve manuel eşleştirmede ledger kalıcılığı başarısız olup hareket `pending` durumuna geri alındığında `bank-integration.ledger-write-failed` audit kaydı üretiliyor. Kayıt tenant/firma/dönem scope’u içinde banka hareketi, kasa/banka hareketi ve deterministik ledger id’sini; `recovered=true`, `retryable=true` ve `pending -> pending` telafi durumunu taşıyor, ham exception veya secret içermiyor. Audit repository geçici olarak hata verse bile telafi edilmiş pending durumunun kontrollü hata sonucu korunması sağlanıyor; yeni finansal mutasyon veya dış entegrasyon açılmıyor.

**Uygulama durumu — 13.07.2026 P2-S1 yeni kasa/banka kaydı ledger recovery:** Bekleyen banka hareketinden kasa/banka kaydı oluşturma akışı artık ledger yazımını banka hareketini `matched` yapmadan önce tamamlıyor. Ledger yazımı hata verirse banka hareketi `pending` kalıyor, `bank-integration.cash-bank-ledger-write-failed` audit iziyle retryable hata dönüyor ve aynı deterministik `sourceType=bank-transaction` hareketi sonraki denemede duplicate reddi yerine güvenli recovery olarak yeniden kullanılıyor. Başarılı retry yeni kasa/banka satırı üretmeden aynı hareketin ledger izini upsert edip banka hareketini `matched` yapıyor; dış entegrasyon veya parçalı çoklu ledger yazma akışı açılmıyor.

**Uygulama durumu — 13.07.2026 P2-S1 parçalı ledger recovery:** Parçalı yeni kayıt akışı iki `BankLedgerEntry` satırını banka hareketi `matched` olmadan önce sıralı biçimde upsert ediyor. İkinci ledger yazımı hata verirse ilk satır tenant scope’u içinde best-effort void ediliyor, banka hareketi `pending` kalıyor ve `bank-integration.partial-cash-bank-ledger-write-failed` audit izi retryable olarak tutuluyor. Kalıcı parçalı fark hareketi sonraki denemede duplicate reddi üretmek yerine deterministik kaynak kimliğiyle yeniden kullanılıyor; iki ledger upsert’i başarıyla tamamlandığında banka hareketi `matched` ve mevcut başarı audit’i yazılıyor. Bu dilim tam transaction motoru veya dış banka erişimi açmıyor.

**Uygulama durumu — 13.07.2026 P2-S1 retryable ledger recovery read-model’i:** Banka overview servisi, tenant/firma/dönem scope’u içinde son 50 `bank-transaction` audit kaydını okuyup yalnız retryable ledger hata aksiyonlarını güvenli bir recovery görünümüne dönüştürüyor. Eşleştirme, yeni kasa/banka ve parçalı kasa/banka ledger yazım hataları; banka hareketi, kasa/banka hareketi, zaman ve telafi sonucu bilgileriyle `/ayarlar` içindeki salt-okunur `Ledger Recovery İzleri` tablosunda gösteriliyor. Ham exception/secret, yeni finansal mutasyon, retry butonu veya dış entegrasyon açılmadı; read-model yalnız mevcut audit kayıtlarının tenant scoped görünürlüğünü genişletiyor.

**Uygulama durumu — 13.07.2026 P2-S1 recovery durum filtresi:** `/ayarlar` `Ledger Recovery İzleri` tablosuna `Tümü`, `Tekrar denenebilir` ve `Geri alındı` client-side durum filtreleri eklendi. Filtreler yalnız overview’den gelen tenant scoped audit read-model’ini daraltır; görünürlük sayacı ve seçili filtrede boş durum metni güncellenir. Retry/replay aksiyonu, yeni audit yazımı, ledger mutasyonu veya dış entegrasyon açılmadı.

**Uygulama durumu — 13.07.2026 P2-S1 recovery akış etiketi:** Retryable ledger audit read-model’i, hata aksiyonunu `Eşleştirme`, `Yeni kasa/banka` veya `Parçalı kasa/banka` operasyon etiketiyle taşımaya başladı. `/ayarlar` tablosunda akış ayrı kolonda gösteriliyor; ham audit aksiyonu, exception/secret veya yeni mutasyon açılmıyor.

**Uygulama durumu — 14.07.2026 P2-S1 recovery akış filtresi:** `/ayarlar` `Ledger Recovery İzleri` tablosuna `Tümü`, `Eşleştirme`, `Yeni kasa/banka` ve `Parçalı kasa/banka` client-side akış filtreleri eklendi. Akış ve recovery durumu filtreleri birlikte uygulanır; sayaç ve boş durum yalnız mevcut tenant scoped read-model’i yansıtır. Retry/replay, audit yazımı, ledger mutasyonu ve dış entegrasyon davranışı değişmedi.

**Uygulama durumu — 14.07.2026 P2-S1 recovery durum geçişi:** Retryable ledger audit read-model’i, metadata’daki `statusFrom/statusTo` değerlerini `Bekliyor → Bekliyor`, `Eşleştirildi → Bekliyor` gibi güvenli operasyon etiketlerine çeviriyor. `/ayarlar` tablosu bu salt-okunur geçiş bilgisini gösteriyor; eksik veya eski metadata için alan boş bırakılıyor. Audit/ledger/retry mutasyonu ve dış entegrasyon davranışı değişmedi.

**Uygulama durumu — 14.07.2026 P2-S1 recovery durum etiketi guard’ı:** Ledger recovery read-model’i artık yalnız `pending`, `matched` ve `ignored` banka hareketi durumlarını Türkçe etikete çeviriyor; bilinmeyen veya legacy metadata değerleri ham metin olarak tabloya sızmadan geçiş alanını boş bırakıyor. Bu salt-okunur veri sertleştirmesi audit/ledger/retry mutasyonu ve dış entegrasyon davranışını değiştirmiyor.

**Uygulama durumu — 14.07.2026 P2-S1 mutabakat sorun filtresi:** `/ayarlar` Ledger Mutabakat Kontrolü tablosuna tümü, tutar/yön uyumsuzluğu, eksik aktif iz, sahipsiz aktif iz ve eşleşmemiş harekette aktif iz filtreleri eklendi. Filtre yalnız mevcut tenant/firma/dönem scoped read-model sorunlarını daraltır; mutabakat onarımı, ledger yazma/iptal veya dış entegrasyon davranışı değişmedi.

**Uygulama durumu — 14.07.2026 P2-S1 mutabakat sorun etiketi sözleşmesi:** Mutabakat issue type listesi ve Türkçe operasyon etiketleri `bank-integration-service` içinde tek domain sözleşmesine alındı; `/ayarlar` filtresi aynı sözleşmeden besleniyor ve tüm türler hedefli servis testiyle kilitlendi. Bu yalnız read-model/etiket tutarlılığıdır; mutabakat onarımı, ledger mutasyonu veya dış entegrasyon açılmadı.

**Uygulama durumu — 14.07.2026 P2-S1 yinelenen aktif ledger izi kontrolü:** Mutabakat read-model’i artık aynı banka hareketi ve aynı kasa/banka hareketi çiftine bağlı birden fazla aktif `BankLedgerEntry` satırını `duplicate-active-ledger` sorunu olarak işaretliyor. Farklı kasa/banka hareketlerine bölünen geçerli parçalı mutabakat bağlantıları korunuyor; bu dilim yalnız tutarlılık görünürlüğü ve filtre testidir, ledger onarımı/yazımı veya dış entegrasyon açılmıyor.

**Uygulama durumu — 14.07.2026 gerçek işlem E2E ve ledger çekirdeği doğrulaması:** Demo tenant üzerinde şantiye, tedarikçi, müşteri ve stok kartından başlayıp alış faturası, bağlı irsaliye, depo transferi, şantiye tüketimi, satış faturası, tedarikçi ödemesi, kısmi müşteri tahsilatı ve KDV ayrıştırılmış dört dengeli yevmiye fişine uzanan gerçek kayıt zinciri tamamlandı. Test sırasında irsaliye satır yenileme sırası, alış/satış sekmesi state izolasyonu ve cari hareket tarih varsayılanı düzeltildi; ledger formu çok satırlı borç/alacak kaydına açıldı. Mizan 138.000 TL borç ve 138.000 TL alacakla dengeli, viewer rolü fiş post edemez durumda doğrulandı; 1.010 test, tip kontrolü, Prisma doğrulaması, lint ve üretim build’i geçti.

**Uygulama durumu — 14.07.2026 geniş kapsamlı ikinci gerçek işlem E2E senaryosu:** Demo tenant üzerinde şantiye, tedarikçi, müşteri, personel ve taşeron kartları; CRUD güncelleme/pasifleştirme, puantaj, maaş tahakkuku ve ödemesi, taşeron hakedişi ve kısmi ödemesi, alış/satış faturaları, tedarikçi ödemesi, müşteri tahsilatı, şantiye gideri, cari ekstreler, raporlar, RBAC ve audit zinciri gerçek kayıtlarla doğrulandı. Dokuz yeni dengeli yevmiye fişiyle dönem mizanı 1.231.000 TL borç ve alacak toplamında kapandı; senaryo şantiyesi 300.000 TL gelir, 404.500 TL maliyet ve -104.500 TL net sonuç verdi.

**Uygulama durumu — 15.07.2026 kesinleşen alış faturasının otomatik muhasebeleştirilmesi:** Taslaktan kesinleşen alış faturası artık tenant/firma/dönem kapsamlı ve kaynak tekilliği veritabanında korunan `LedgerEntry/LedgerLine` fişini 153 Ticari Mallar borç, KDV varsa 191 İndirilecek KDV borç ve 320 Satıcılar alacak satırlarıyla otomatik üretir; fatura durumu, dengeli fiş ve iki başarı audit izi tek Prisma transaction'ında atomik kaydedilir. Aynı kaynak için tekrar deneme çift fiş/audit üretmeden mevcut sonucu kullanır; viewer, kapalı dönem, kapsam/toplam/tevkifat hataları ve kalıcılık reddi güvenli audit izi bırakır. Kesinleşmiş alış faturası, ters kayıt dilimi uygulanana kadar sunucu ve UI katmanında güncellenemez veya iptal edilemez; eski kesinleşmiş E2E faturaları geriye dönük fişlenmez ve mevcut manuel ledger kayıtları nullable kaynak alanlarıyla korunur. Migration yerel PostgreSQL'e veri silmeden uygulandı; 1.037 test, tip kontrolü, Prisma doğrulaması, lint ve üretim build'i geçti. Satış faturası, tahsilat, ödeme, hakediş, maaş ve gider otomatik fişleri bu dilimde açılmadı; sıradaki mantıklı adım aynı kaynak bağlı atomik kalıbı satış faturası kesinleştirmesine ayrı bir dilim olarak taşımaktır.

**Uygulama durumu — 15.07.2026 kesinleşen satış faturasının otomatik muhasebeleştirilmesi:** Satış faturası kesinleştirmesi alıştaki kaynak bağlı atomik kalıba bağlandı; `sales-invoice` kaynağı için `YVM-SF-*` fişi 120 Alıcılar borç, 600 Yurtiçi Satışlar alacak ve KDV varsa 391 Hesaplanan KDV alacak satırlarını üretir. Fatura durumu, dengeli fiş ve başarı audit izleri aynı transaction/retry/idempotency sözleşmesiyle korunur; server action tam tenant/firma/dönem ve kapalı dönem bilgisini taşır. Kesinleşmiş satış faturası ters kayıt akışı olmadan güncellenemez veya iptal edilemez; UI muhasebe fişi numarasını ve 120/600/391 açıklamasını gösterir. Satış action, servis, ledger çekirdeği ve UI regresyonları dahil 1.039 test; tip kontrolü, Prisma doğrulaması, lint ve üretim build'i geçti. Ters kayıt, tahsilat eşleştirmesi ve diğer otomatik fiş türleri bu dilimde açılmadı.

**Uygulama durumu — 15.07.2026 satış faturası tahsilat hareketi:** Kesinleşmiş satış faturası artık Faturalar yüzeyinden aktif kasa/banka hesabı seçilerek deterministik `THS-<faturaNo>` giriş hareketi oluşturabilir. Hareket `sales-invoice` kaynak türü ve fatura kimliğiyle tekilleştirilir; aynı fatura için ikinci tahsilat, taslak fatura, yetkisiz rol veya kapsam dışı kayıt reddedilir. Kasa/banka ve müşteri/cari yüzeyleri revalidate edilir, UI tahsilat hesabını ve `Tahsil Edildi` durumunu gösterir. Bu dar dilim mevcut manuel cari tahsilat muhasebe çekirdeğini genişletmez, kısmi tahsilat/eşleştirme veya ters kayıt açmaz; 1.043 test, tip kontrolü, Prisma doğrulaması, lint ve üretim build'i geçti.

**Uygulama durumu — 15.07.2026 satış faturası kısmi tahsilat bakiyesi:** Satış faturası tahsilatı artık tutar boş bırakıldığında kalan bakiyeyi, tutar girildiğinde ise yalnız istenen kısmi tutarı oluşturur; aynı `sales-invoice` kaynağı altında birden fazla deterministik `THS-<faturaNo>-<sıra>` hareketi birikir. Servis toplam tahsilatı ve kalan bakiyeyi hesaplar, aşım ve tamamen tahsil edilmiş fatura reddedilir; UI kalan tutarı ve tahsilat tutarı girişini gösterir. Tam tahsilat, cari/kasa-banka revalidate ve mevcut RBAC/scope guard’ları korunur. Kısmi tahsilat muhasebe fişi eşleştirmesi ve ters kayıt bu dilimde açılmadı; 1.043 test, tip kontrolü, Prisma doğrulaması, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 tedarikçi faturasının kısmi ödeme bakiyesi:** Alış faturası ödeme hareketi de aynı kaynak-bakiye sözleşmesine taşındı; tutar boş bırakıldığında kalan borcun tamamı, tutar girildiğinde kısmi ödeme oluşturulur ve aynı `purchase-invoice` kaynağı için `ODM-<faturaNo>-<sıra>` hareketleri birikir. Servis aşım ve tamamen ödenmiş fatura guard’larını uygular; alış faturası UI’sı kalan ödeme tutarını ve ödeme tutarı girişini gösterir, mevcut hesap seçimi/RBAC/scope/revalidate davranışı korunur. Kısmi ödeme muhasebe fişi eşleştirmesi ve ters kayıt bu dilimde açılmadı; 1.044 test, tip kontrolü, Prisma doğrulaması, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kısmi hareket unique sözleşmesi sertleştirmesi:** Kısmi tahsilat ve ödeme sıra numaraları yalnız uygulama belleğinde değil PostgreSQL unique sözleşmesinde de desteklenir hale getirildi. `CashBankMovement` unique anahtarı kaynak + hareket tipi yanında `documentNo` alanını içerir; `20260715010000_allow_partial_invoice_cash_bank_movements` migration’ı mevcut veriyi silmeden uygulandı. Böylece aynı fatura için `THS/ODM-<faturaNo>-<sıra>` hareketleri gerçek Prisma kalıcılığında da yazılabilir; 42 hedefli test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 fatura tahsilat/ödeme ledger eşleştirme çekirdeği:** Yeni satış tahsilatı ve tedarikçi ödeme hareketleri için ortak `cash-bank-movement` kaynaklı idempotent ledger posting servisi eklendi. Satış tahsilatı kasa/banka hesabını 100 Kasa veya 102 Bankalar borç, 120 Alıcılar alacak; tedarikçi ödemesi 320 Satıcılar borç, 100/102 Kasa-Bankalar alacak satırlarıyla dengeli fişe bağlar. Belge numaraları `YVM-THS-*` ve `YVM-ODM-*`, tekrar deneme mevcut kaynak fişini döndürür; kapalı dönem hareket yazılmadan önce reddedilir ve production action’ları ledger audit izi üretir. Eski hareketler geriye dönük fişlenmez; hareket oluşturma ve ledger yazımı bu ilk dilimde ayrı kontrollü adımlar olarak korunur. 1.047 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 fatura hareketinde ledger belge görünürlüğü:** Yeni tahsilat ve ödeme hareketlerinde oluşan `ledgerDocumentNo`, Faturalar tablosundaki ilgili satış/alış satırında gösterilir; eski veya ledger bağlantısı olmayan hareketlerde mevcut hesap/tarih görünümü korunur. Bu salt okunur UI bağlantısı, kaynak fiş görünürlüğünü artırır ve 1.047 test, type-check, Prisma validate, lint ve production build ile doğrulandı.

**Uygulama durumu — 15.07.2026 hareket listesinde ledger bağlantısının kalıcı okunması:** `CashBankMovement` Prisma repository’si artık aktif tenant/firma/dönem için `cash-bank-movement` kaynaklı `LedgerEntry` satırlarını scoped olarak hydrate eder. Böylece sayfa yenilemesinden sonra da ödeme/tahsilat hareketinin ledger id’si ve belge numarası UI’ya taşınır; eski veya bağlantısız hareketler korunur, backfill yapılmaz. Repository ve UI testleri dahil 1.048 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kesinleşmiş faturanın ters kayıtla iptali:** Kaynak `purchase-invoice` veya `sales-invoice` muhasebe fişi bulunan kesinleşmiş alış/satış faturaları artık `YVM-IA-<kaynak fiş no>` belge numaralı, tüm satır yönleri ters çevrilmiş `${sourceType}-reversal` fişiyle kontrollü biçimde iptal edilebilir. Ters kayıt servisi tenant/firma/dönem scoped kaynak araması yapar, kaynak fiş yoksa güvenli red verir ve aynı fatura için tekrar denemede mevcut ters fişi idempotent olarak döndürür; production server action’ları bu servisi bağlarken eski demo/test yüzeyleri `allowPostedCancellation` olmadan kesinleşmiş faturayı kilitli tutar. Fatura durumu güncellemesi ve ters fiş yazımı ayrı fakat yeniden denenebilir adımlardır; backfill veya dış entegrasyon açılmadı. Servis, satış fatura servisi, üretim action’ları ve UI regresyonları dahil 1.050 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 fatura ters kayıt ön koşulu:** Kesinleşmiş faturaya bağlı `sales-invoice` tahsilat veya `purchase-invoice` ödeme hareketi varsa invoice ledger reversal servisi ters fiş üretmeden kontrollü red döndürür. Böylece mevcut kasa/banka hareketi ters kayıt akışı açılmadan fatura iptali, tahsilat/ödeme izini geride bırakmaz; production action’ları aynı scoped hareket repository’sini kullanır, bağlı hareket yoksa önceki idempotent ters kayıt davranışı korunur. 1.051 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 fatura bağlı kasa/banka hareketlerinin ters kaydı:** Faturaya bağlı tahsilat/ödeme hareketleri artık mevcut `cash-bank-movement` kaynak ledger satırlarının yönünü ters çeviren `cash-bank-movement-reversal` fişleriyle idempotent olarak geri alınır; belge numarası `YVM-IA-YVM-THS/ODM-*` kalıbındadır. Tüm bağlı hareket terslenmeden fatura kaynak fişi terslenmez; eksik hareket fişi kontrollü red döndürür. Ayrıca alış/satış iptal action’ları dönem durumunu scoped biçimde okuyup kapalı dönemde iptali reddeder. Hareket kaynak satırları silinmez veya backfill edilmez; 1.053 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 ters kayıt audit izi:** Fatura ve bağlı kasa/banka ters fişleri production `AuditLogRepository` üzerinden standart `ledger.entry.post` audit iziyle kaydedilir; hareket ters kayıtları ile fatura ters kaydı aynı scoped ledger/audit wiring’ini kullanır. Başarısız veya tekrar denenen ters kayıtlar yeni duplicate fiş üretmez; audit kalıcılığı ve idempotency davranışı korunur. 1.053 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 fatura ledger read-model görünürlüğü:** Alış ve satış fatura listeleri artık opsiyonel scoped `LedgerRepository` üzerinden kaynak `purchase-invoice`/`sales-invoice` ve ters kayıt fişlerini hydrate eder. Sayfa yenilendiğinde `Fiş: YVM-*` ve `Ters fiş: YVM-IA-*` numaraları durum hücresinde korunur; eski veya bağlantısız fatura satırları aynı görünümle devam eder. İptal action sonucu da ters fiş numarasını anında UI state’ine taşır; backfill veya yeni finansal mutasyon açılmadı. 1.053 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kasa/banka bakiyesi için karşı hareket:** Fatura iptalindeki bağlı tahsilat/ödeme hareketleri artık ledger ters fişine ek olarak karşı yönlü `cash-bank-movement-reversal` hareketiyle de kalıcılaştırılır. Hareket kimliği ve `YVM-IA-YVM-THS/ODM-*` belge numarası deterministiktir; retry mevcut karşı hareketi tekrar üretmez. Böylece kasa/banka bakiye read-model’i orijinal ve karşı hareketi birlikte toplar, kaynak hareket silinmez; ters hareket kalıcılığı bağlı değilse fatura iptali güvenli red verir. 1.053 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 ters kasa/banka hareketi ledger görünürlüğü:** `CashBankMovement` Prisma repository’si artık hem `cash-bank-movement` hem `cash-bank-movement-reversal` kaynak ledger fişlerini scoped olarak hydrate eder. Orijinal hareket kendi hareket kimliğiyle, karşı hareket kaynak hareket kimliğiyle eşleştirilir; böylece kasa/banka listesinde ters satırın da `ledgerDocumentNo` bağlantısı görünür. Prisma’nın nullable `sourceType` sözleşmesi tip seviyesinde korunur; 1.054 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kasa/banka otomatik hareket ledger kolonu:** Kasa/Banka ekranındaki otomatik hareket tablosuna `Muhasebe fişi` kolonu eklendi. Kaynak veya ters hareket repository’den ledger belge numarasıyla hydrate edildiğinde kullanıcıya doğrudan gösterilir; eski/bağlantısız hareketlerde `-` görünür ve mevcut bakiye/filtre davranışı değişmez. UI ve repository regresyonları dahil 1.054 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 ters hareket operasyon etiketi:** Kasa/Banka otomatik hareket listesi `cash-bank-movement-reversal` satırlarını normal tahsilat/ödeme satırlarından ayırmak için `Ters kayıt` etiketi gösterir. Etiket yalnız mevcut sourceType read-model’inden türetilir; tutar, yön, bakiye hesabı ve ledger belge bağlantısı değişmez. UI regresyonu dahil 1.055 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 fatura iptal revalidation kapsamı:** Alış ve satış faturasının başarılı ters kayıtla iptalinden sonra dashboard, Faturalar, Kasa/Banka, Raporlar, Ayarlar ve ilgili module page cache’leri birlikte revalidate edilir. Böylece karşı hareket ve ledger fişi, manuel sayfa yenilemesi beklenmeden ilgili operasyon yüzeylerine taşınır; kapalı dönem veya başarısız iptalde mevcut cache davranışı korunur. 1.055 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 fatura iptal revalidation regresyonları:** Alış ve satış faturasını iptal eden production action’larının başarılı akışları artık hedeflenen dashboard, Faturalar, Kasa/Banka, Raporlar, Ayarlar ve module page revalidate çağrılarını doğrudan test eder; kapalı dönem ve başarısız ters kayıt senaryolarındaki mevcut red davranışı korunur. 1.057 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 hakedişin otomatik muhasebeleştirilmesi:** Taslaktan kesinleşen hakediş artık `progress-payment` kaynak bağıyla idempotent `LedgerEntry/LedgerLine` fişi üretir. Taşeron hakedişinde net/KDV için 740-191 borç ve 320 alacak; tedarikçi hakedişinde 153-191 borç ve 320 alacak; şantiye gelirinde 120 borç ve 600-391 alacak satırları kullanılır. Fiş ile hakediş durumu aynı Prisma transaction'ında atomik yazılır, aynı kaynak tekrarında mevcut fiş döndürülür; tenant/firma/dönem, kapalı dönem, accounting/admin RBAC ve audit guard'ları korunur. Hakediş listesi kalıcı ledger belge numarasını gösterir, başarılı post action'ı finansal yüzeyleri revalidate eder; action revalidation regresyonları da eklendi. 1.064 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 maaş tahakkukunun otomatik muhasebeleştirilmesi:** Taslaktan kesinleşen maaş tahakkuku artık `payroll-accrual` kaynak bağıyla idempotent `LedgerEntry/LedgerLine` fişi üretir. Brüt ücret 730 Genel Üretim Giderleri borç; net maaş 335 Personele Borçlar, avans kesintisi 135 Personel Avansları ve borç kesintisi 136 Personelden Alacaklar alacak satırlarına ayrılır. Tahakkuk durumu ile fiş aynı Prisma transaction'ında atomik yazılır, aynı kaynak tekrarında mevcut fiş döndürülür; satır kesintisi/toplam tutar doğrulaması, tenant/firma/dönem, kapalı dönem, accounting/admin RBAC ve audit guard'ları korunur. `/personel` listesi kalıcı `YVM-MAAS-*` belge numarasını gösterir ve başarılı post action'ı dashboard/personel/raporlar yüzeylerini revalidate eder. 1.070 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 giderin otomatik muhasebeleştirilmesi:** Gider oluşturma akışı, mevcut `Gider Ödemesi` kasa/banka hareketini koruyarak aynı `expense` kaynağı için idempotent `YVM-GDR-*` muhasebe fişi üretir. Net gider 770 Genel Yönetim Giderleri borç, KDV varsa 191 İndirilecek KDV borç ve seçilen kasa/banka hesabı 100 Kasa veya 102 Bankalar alacak satırına bağlanır. Ledger kaydı mevcut gider/ödeme adımlarından kontrollü ayrı bir adım olarak yürür; eksik ledger veya ödeme hareketi retry sırasında kaynak tekilliğiyle güvenli biçimde tamamlanabilir. Tenant/firma/dönem, kapalı dönem, accounting/admin RBAC, toplam tutar ve ledger audit guard'ları korunur; Giderler listesinde kaynak fiş numarası görünür. 1.073 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 gider ödeme hareketi ledger read-model hizalaması:** `CashBankMovement` Prisma repository’si `sourceType=expense` ödeme satırlarını artık aynı gider kaynak fişi (`YVM-GDR-*`) üzerinden hydrate eder. Böylece Giderler ve Kasa/Banka ekranları aynı muhasebe belge numarasını kalıcı okuma sonrası da gösterir; fatura ve ters hareket eşleştirmeleri korunur. Bu yalnız read-model eşleştirmesidir, yeni finansal mutasyon veya backfill açılmaz. 1.074 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 maaş ödeme hareketi ledger bağlantısı:** `Maaş Ödemesi` kasa/banka çıkışı artık `335 Personele Borçlar` borç ve seçilen hesaba göre `100 Kasa` veya `102 Bankalar` alacak satırlı `YVM-ODM-*` kaynak ledger fişiyle eşleştirilir. Maaş ödeme action’ı kapalı dönem kontrolünü hareket yazmadan önce yapar, ledger belge numarasını hareket sonucuna taşır ve finansal yüzeyleri revalidate eder; tekrar denemede mevcut kaynak fişi idempotent döner. 1.075 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 hakediş ödeme/tahsilat hareketi ledger bağlantısı:** `Hakediş Ödemesi` hareketi `320 → 100/102`, `Hakediş Tahsilatı` hareketi `100/102 → 120` kaynak fişleriyle idempotent biçimde bağlandı. Production pay/collect actions kapalı dönem kontrolünü hareket yazmadan önce yapar, ledger belge numarasını hareket sonucuna taşır ve finansal yüzeyleri revalidate eder. Kasa/Banka repository’si mevcut `cash-bank-movement` source ledger hidrasyonunu korur. 1.077 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 ödeme hareketi ledger UI görünürlüğü:** Hakediş ödeme/tahsilat ve maaş ödeme hareketleri repository’den `ledgerDocumentNo` ile hydrate edildiğinde ilgili Hakediş ve Personel çalışma alanlarında `Muhasebe fişi: YVM-*` olarak gösterilir. Ledger bağlantısı olmayan eski hareketlerde hesap ve tarih görünümü korunur; yeni mutasyon, backfill veya dış entegrasyon açılmaz. 1.079 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 ödeme/tahsilat action ledger regresyonları:** Hakediş ödeme/tahsilat ve maaş ödeme production action’ları, başarılı hareket sonucuna bağlı ledger id/belge numarasını taşımaları ve kapalı dönemde hareket/ledger yazmadan kontrollü red vermeleri açısından test edildi. Başarılı akışların scope, hesap ve finansal revalidation sözleşmeleri korunur; yeni mutasyon veya dış entegrasyon açılmaz. 1.084 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 tekil ödeme hareketi retry idempotency:** Geçerli maaş ödeme, hakediş ödeme ve hakediş tahsilat isteklerinde aynı kaynak hareket zaten varsa servis artık yeni satır üretmeden mevcut hareketi döndürür. Production action bu sonucu aynı scoped ledger posting’e vererek eksik ledger fişini güvenle tamamlayabilir; geçersiz/taslak kaynak guard’ları ve kapalı dönem kontrolü korunur. 1.084 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 maaş/hakediş hareket ledger read-model hydrate kapsamı:** `CashBankMovement` Prisma repository’si, `payroll-accrual` kaynaklı maaş ödemesi ile `progress-payment` kaynaklı hakediş ödeme/tahsilat hareketlerini ortak `cash-bank-movement` ledger fişleri üzerinden scoped biçimde hydrate eder. Sayfa yenilemesinden sonra `YVM-ODM-*` ve `YVM-THS-*` belge numaraları korunur; eski veya bağlantısız hareketler ve kaynak mutasyonları değişmez. 1.085 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 çek tahsilatının otomatik muhasebeleştirilmesi:** `Çek Tahsilatı` kasa/banka hareketi artık seçilen `100 Kasa` veya `102 Bankalar` hesabını borç, `101 Alınan Çekler` hesabını alacak yazan idempotent `YVM-THS-*` fişiyle eşleştirilir. Tahsilat action’ı kapalı dönemde çek/movement mutasyonu yapmadan reddeder; başarılı akışta hareket ledger fişiyle bağlanır, `/cek`, `/kasa-banka`, dashboard ve raporlar revalidate edilir. Çek listesi kaynak ledger fişini hydrate eder ve `Fiş: YVM-*` gösterir; dış entegrasyon açılmaz. İlk tam koşuda mevcut Settings Arvento UI testi flaky kaldı, izole tekrar sonrası 201 test dosyası / 1.090 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kasa/banka virmanının otomatik muhasebeleştirilmesi:** Virmanın çıkış ve giriş hareketleri artık tek dengeli `YVM-VRM-*` fişinde hedef kasa/banka hesabını (`100/102`) borç, kaynak hesabı (`100/102`) alacak olarak eşleştirir. Transfer action’ı kapalı dönemde hareket yazmadan reddeder, iki hareket satırına ortak ledger belge/id bilgisini taşır ve dashboard, Kasa/Banka ve Raporlar yüzeylerini revalidate eder. Kasa/Banka repository’si tek transfer fişini her iki hareket satırına hydrate eder; manuel hareketler ve dış banka entegrasyonu bu dilimde açılmaz. 203 test dosyası / 1.095 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 virman retry ledger recovery:** Aynı virman belgesiyle geçerli tekrar denemede kasa/banka servisi yeni çift üretmeden mevcut çıkış/giriş hareketlerini deterministik sırayla döndürür. Transfer action bu çifti aynı `YVM-VRM-*` posting’e vererek önceki ledger yazımı kesintisinden sonra fişi idempotent biçimde tamamlayabilir; yarım çift ve geçersiz kaynak guard’ları korunur. 203 test dosyası / 1.096 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 manuel/cari kasa-banka kapalı dönem guard’ı:** Manuel ve cari karttan oluşturulan kasa/banka action’ları scoped aktif dönemi movement yazmadan önce kontrol eder; kapalı veya bulunamayan dönemde hesap/cari/movement mutasyonu ve revalidation yapılmaz. Bu akışlar karşı hesap metadata’sı taşımadığı için otomatik ledger dışında tutulur. Hedefli action regresyonları eklendi; 203 test dosyası / 1.098 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 cari hareket ledger eşleştirmesi:** Cari karttan açılan hareketler artık `counterparty-musteriler`, `counterparty-tedarikciler` veya `counterparty-taseronlar` kaynak türünü ve deterministik kaynak kimliğini kaybı olmadan taşır. Müşteri tahsilatı `100/102 → 120` satırlarıyla `YVM-THS-CARI-*`, tedarikçi/taşeron ödemesi `320 → 100/102` satırlarıyla `YVM-ODM-CARI-*` fişine bağlanır; aynı cari hareket tekrarında mevcut movement ve ledger fişi idempotent döner. Kasa/Banka repository’si, cari ekstre UI’ı ve CSV çıktısı fiş numarasını hydrate eder; serbest manuel hareketler karşı hesap metadata’sı olmadığı için otomatik ledger dışında kalır. 203 test dosyası / 1.103 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kısmi fatura hareketleri ledger görünürlüğü:** Alış/satış fatura yüzeyi artık aynı faturaya ait birden fazla kısmi ödeme veya tahsilat hareketinin tamamını ayrı `Muhasebe fişi: YVM-*` satırlarıyla gösterir; toplam kalan/tam ödeme-tahsilat hesapları ve ilk hareketin hesap/tarih özeti korunur. Ledger bağlantısı olmayan eski hareketler görünümde fiş satırı üretmez; yeni mutasyon veya ters kayıt açılmaz. 203 test dosyası / 1.104 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kısmi ödeme/tahsilat action ledger regresyonları:** Alış ödeme ve satış tahsilat production action’ları ikinci kısmi hareket tutarını doğru servis çağrısına taşır, aynı scoped `cash-bank-movement` ledger posting servisini çağırır ve `YVM-ODM-*`/`YVM-THS-*` belge numarasını action sonucuna bağlar. Mevcut toplam bakiye, RBAC, dönem guard’ı ve revalidation sözleşmeleri değişmez. 203 test dosyası / 1.106 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 kısmi invoice ledger recovery:** Alış ödeme veya satış tahsilat hareketi kalıcılaşıp ledger posting adımı kesilirse, sonraki scoped action denemesi aynı kaynak, hesap ve tutardaki ledger’sız mevcut movement’ı yeniden kullanır; yeni sıra numarası üretmeden eksik `YVM-ODM-*`/`YVM-THS-*` fişini tamamlar. Ledger bağlantısı bulunan hareketler ve farklı tutardaki yeni kısmi hareketler normal akışta korunur. Recovery regresyonları dahil 203 test dosyası / 1.108 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 boş tutarlı invoice retry recovery:** Kullanıcı tam veya kalan ödeme/tahsilat için tutar alanını boş bıraktığında da recovery, aynı kaynak ve hesap kapsamındaki tek ledger’sız hareketi yeni sıra oluşturmadan tamamlar. Explicit tutarlı retry eşleşmesi, farklı tutardaki yeni kısmi hareket ve ledger’ı tamamlanmış hareket davranışları korunur. İki action için implicit-tutar regresyonları eklendi; 203 test dosyası / 1.110 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 15.07.2026 ledger dönem action scope sertleştirmesi:** Ledger dönem durumu okuma, journal post öncesi kapalı dönem kontrolü ve kapatma/açma guard’ları artık `periodId` yanında aktif `tenantId` ve `companyId` ile scoped period kaydı arar. Admin yetki kontrolü, id üzerinden güvenli güncelleme, audit metadata’sı ve revalidation sözleşmeleri korunur; cross-tenant/cross-company dönem kaydıyla işlem yapılmaz. Beş action regresyonu eklendi; 204 test dosyası / 1.115 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 16.07.2026 manuel kasa/banka hareketinin otomatik muhasebeleştirilmesi:** Serbest manuel tahsilat ve ödeme formuna hareket tipine göre kontrollü karşı muhasebe hesabı seçimi eklendi. Tahsilat `100/102 → 120/649`, ödeme `320/770 → 100/102` satırlarıyla kaynak hareket kimliğine bağlı, dengeli ve idempotent `YVM-THS-MAN-*` / `YVM-ODM-MAN-*` fişi üretir; ledger sonucu hareket listesine taşınır. Kapalı dönem, tenant/firma/dönem, accounting/admin RBAC ve retry guard’ları korunur; 205 test dosyası / 1.120 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 native kümülatif hakediş dikey dilimi:** İnşaat hakedişi için tenant/firma/muhasebe dönemi kapsamlı `ConstructionProject`, sözleşme pozları, kümülatif snapshot, metraj, onay olayı ve `ConstructionAccountingLink` modelleri ile ilk kümülatif hesaplama çekirdeği eklendi. İlk/ara/kesin zinciri, aktif taslak tekilliği, önceki onaylı snapshot devri, sözleşme aşımı işareti ve DRAFT → SUBMITTED → APPROVED → FINALIZED geçişleri server action katmanına taşındı. Kesinleştirme mevcut `ProgressPayment` projection ve idempotent `progress-payment` ledger posting servisini kullanır; `/hakedis` yüzeyinde native kümülatif zaman çizelgesi gösterilir. Migration yerel PostgreSQL’e uygulandı; hesaplama testleri, type-check ve Prisma validate geçti. Tarihsel Hakedis verisi bu aşamada silinmeden kontrollü `OPENING_BALANCE` import adımına bırakılmıştır.

**Uygulama durumu — 17.07.2026 kümülatif hakediş çalışma yüzeyi ve recovery sertleştirmesi:** `/hakedis` yüzeyi artık inşaat projesi, sözleşme pozu ve ilk/ara/kesin hakediş taslağını native React formlarıyla oluşturur; cari metraj miktarları server-side snapshot hesabına gider. Taslak gönderme, iade, düzeltme, yeniden hesaplama, onay ve kesinleştirme kontrolleri eklendi; önceki ve kümülatif değerler salt okunur gösterilir. Onaylı/kesinleşmiş hakediş değiştirilemez, yalnız `FINAL` türündeki kesinleşme projeyi kapatır. Projection retry, daha önce oluşturulmuş scoped `ProgressPayment` kaydını ve mevcut idempotent ledger fişini yeniden kullanır; construction durum/audit/proje kapanışı kendi transaction'ında tamamlanır. Eski `Hakedis_projesi` PostgreSQL şemasını okuyan import aracı dry-run mutabakatında 4 proje ve 10 pozu inceledi; 3 proje `OPENING_BALANCE` aktarımına hazır, boş/tarihsiz 1 proje kontrollü olarak atlandı. Hedef kapsam parametreleri verilmeden hiçbir yazma yapılmaz. 206 test dosyası / 1.127 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 kümülatif finalize tek transaction sınırı:** Construction finalize projection artık ayrı `ProgressPayment.create` ve posting adımları çalıştırmaz. Transaction-aware adapter, mevcut progress-payment muhasebe komut üreticisini ve ledger repository içi commit fonksiyonunu aynı Prisma transaction callback’i içinde kullanır; finansal hakediş, satırlar, create/post audit kayıtları, ledger entry/lines, `ConstructionAccountingLink`, construction `FINALIZED` durumu, approval event ve yalnız `FINAL` türünde proje kapanışı birlikte commit veya rollback olur. Kapalı dönem hatasında construction link/durum yazılmaz; finalized retry mevcut link ve kaynak ledger fişini döndürür; aynı belge numaralı fakat farklı kapsam/tutardaki finansal projection bağlanmaz. 207 test dosyası / 1.131 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 metraj föyü, tutanak, kesinti ve finansal hareketler:** Kümülatif hakediş alanına scoped `ConstructionMeasurementSheet`, `ConstructionExtraWork`, `ConstructionDeductionMovement`, `ConstructionFinancialMovement` ve `ConstructionContractItemPriceRevision` modelleri eklendi; metraj satır sırası föy bazında tekilleştirildi. `/hakedis` taslak/iade çalışma paneli genel-demir metraj föyü, tutanaklı iş, yemek/malzeme-hizmet-makine/ekipman-imalat/işçilik kesintisi ve avans/teminat/tevkifat/stopaj/ihtiyat/fiyat farkı hareketlerini ekleyip silebilir. Cari ek iş, ilave, kesinti ve ödenecek toplamları server-side yeniden hesaplanır; önceki onaylı özet üzerinden kümülatif devreder. Project retention oranı otomatik kesinti hesabına katılır. Finalize projection cari metraj satırları yanında tutanaklı işler ve ilave finansal hareketleri pozitif `ProgressPaymentLine` olarak, ayrıntılı kesintilerin toplamını efektif kesinti olarak mevcut tek-transaction muhasebe akışına taşır; ayrıntı Construction tablolarında korunur. 40 migration güncel, 207 test dosyası / 1.133 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 KDV snapshot ve native hakediş raporları:** Poz KDV oranı ile önceki/cari/kümülatif KDV tutarları `ConstructionPaymentItemSnapshot` üzerinde tarihsel snapshot olarak saklanır; oran değişikliğinde önceki dönem KDV'si güncel oranla yeniden fiyatlanmaz. Açılış bakiyesi import'u aynı KDV sözleşmesini taşır ve finalize projection KDV oranını güncel sözleşme pozundan değil ilgili hakediş snapshot'ından okur. Tenant/firma/dönem scoped rapor action'ı Yeşil Defter, İmalat Çarşafı, hakediş özeti, metraj föyleri, approval audit izi ve mevcut `ProgressPayment`/ledger bağlantısını tek salt-okunur DTO'da üretir. `/hakedis` zaman çizelgesindeki her dönem için native sekmeli rapor paneli ve yazdırma görünümü eklendi; önceki, cari ve kümülatif değerler tarihsel snapshot'tan gösterilir. 41 migration güncel, 208 test dosyası / 1.135 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 ayrıntılı genel/demir metraj satırları:** Taslak ve iade edilmiş hakedişlerde genel veya demir metraj föyüne scoped sözleşme pozu seçilerek doğrudan miktar ya da boy/en/yükseklik × çarpan hesabıyla satır eklenebilir; negatif doğrudan miktar düzeltme hareketi olarak korunur. Satır veya ikincil föy silme ile satır ekleme, tüm cari metrajı poz bazında toplar ve önceki onaylı snapshot üzerinden miktar, tutar, KDV, kümülatif toplam, sözleşme aşımı ve ödenecek özeti aynı Prisma transaction'ında yeniden üretir. Ana `GEN-1` föyü korunur; özet düzeltme formu artık diğer föyleri silmez, talep edilen toplamdan ayrıntılı satırları düşerek yalnız ana föyde dengeleme satırları oluşturur. Föy-satır foreign key'i cascade silme sözleşmesine alındı; rapor/audit sekmesi satır ölçülerini ve miktarlarını gösterir. 42 migration güncel, 208 test dosyası / 1.137 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 native birim fiyat revizyon geçmişi:** `/hakedis` proje çalışma yüzeyi her sözleşme pozunun güncel revizyon numarası ve birim fiyatını, tarih/gerekçe/fiyat bilgili geçmiş revizyonlarını scoped read-model üzerinden gösterir. Yeni revizyon formu mevcut `createConstructionContractItemPriceRevisionAction` guard'ını kullanır; proje kapalıysa veya DRAFT/SUBMITTED/RETURNED hakediş varsa fiyat değiştirilemez. Revizyon yalnız pozun sonraki hakedişlerde kullanılacak güncel fiyatını artırılmış revizyon numarasıyla günceller; önceki onaylı snapshot miktar, tutar ve KDV değerleri değişmeden kalır, fiyat farkı gerektiğinde ayrı finansal hareket olarak izlenmeye devam eder. 42 migration güncel, 208 test dosyası / 1.137 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 construction merkezi audit ve kabul zinciri:** DRAFT → SUBMITTED → RETURNED → SUBMITTED → APPROVED geçişleri, domain `ConstructionApprovalEvent` kaydıyla birlikte `entityType=construction-progress-payment` merkezi `AuditLog` kaydını aynı Prisma transaction'ında üretir. FINALIZED audit'i finansal `ProgressPayment`, ledger fişi, accounting link, approval event ve proje kapanışıyla aynı finalize transaction'ına alındı; idempotent finalize retry ikinci merkezi audit üretmez. Scoped `listConstructionProgressPaymentAuditLogsAction` approval ve merkezi audit satırlarını birlikte döndürür; native Rapor/Audit sekmesi aksiyon, kullanıcı, tarih ve durum geçişini gösterir. Otomatik kabul regresyonu Hakediş 1 kümülatif devri, Hakediş 2 iade/yeniden gönderme/onay zinciri, fiyat değişiminde geçmiş tutarın korunması, cari finansal projection, dengeli ledger komutu ve FINAL proje kapanış kararını kapsar. 42 migration güncel, 210 test dosyası / 1.141 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 legacy açılış aktarımı güvenlik kapıları:** `hakedis:import` execute modu hedef dönem açıklığına ek olarak kullanıcının aynı tenant/firma/dönemde aktif `admin` veya `accounting` erişimini doğrular. Deterministik proje/poz/hakediş kimlikleri farklı scope'ta mevcutsa aktarım durur; aynı scope'taki mevcut açılış hakedişi kaynak belge, sıra, kümülatif/KDV toplamı ve snapshot sayısıyla mutabık değilse üzerine yazılmaz. Yeni aktarım merkezi `construction-progress-payment.opening-balance-imported` audit'i üretir, poz KDV oranını korur ve işlem sonrasında her açılış hakedişini toplam/KDV/poz sayısıyla yeniden okur. Dry-run halen 4 kaynak proje/10 poz gösterir; 3 proje hazır, tarihsiz ve pozsuz 1 proje kontrollü atlanır. Yerel NOA'da üç açık hedef firma bulunduğundan gerçek execute kullanıcı firma seçimine kadar yapılmadı; hiçbir kaynak veya hedef veri silinmedi. 42 migration güncel, 210 test dosyası / 1.141 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 DEMO İNŞAAT legacy açılış aktarımı tamamlandı:** Kullanıcı seçimiyle hedef kapsam `tenant-noa-demo / company-demo-insaat / period-2026 / user-main` olarak doğrulandı. Aktarım öncesi `backups/noa-before-legacy-hakedis-demo-20260717-191700.dump` PostgreSQL custom-format yedeği alındı ve `pg_restore --list` ile 544 TOC girdili geri yükleme arşivi doğrulandı. Üç hazır kaynak proje 10 sözleşme pozu, 3 `APPROVED` `OPENING_BALANCE` hakedişi, 10 kümülatif snapshot ve 3 merkezi import audit kaydı olarak aktarıldı; toplam kümülatif tutar 51.167.850 TL ve KDV 10.233.570 TL ile kaynak raporuna eşleşti. Tarihsiz/pozsuz `LEGACY-DENEME` atlandı, diğer firma/dönem scope'larına legacy kayıt yazılmadı. Aynı execute komutunun ikinci koşusu `imported=0 / existing=3` sonucu verdi. Legacy sıra numaraları 1, 3 ve 5 olduğundan native UI yeni hakediş sırasını görünür kayıt sayısından değil en yüksek `sequenceNo + 1` üzerinden üretir. 42 migration güncel, 210 test dosyası / 1.142 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 17.07.2026 DEMO İNŞAAT iki dönemli gerçek kümülatif kabul testi:** `E2E-KUM-20260717-01` projesi ve iki sözleşme pozu native `/hakedis` yüzeyinden gerçek veritabanına oluşturuldu. `E2E-HAK-001` ilk hakedişi 10 m3 beton + 2 ton demir ile 65.000 TL cari/kümülatif brüt, 3.250 TL teminat ve 61.750 TL ödenecek olarak onaylandı. `E2E-HAK-002` kesin hakedişi önce 4 m3 + 1 ton olarak gönderildi, `SUBMITTED → RETURNED` akışıyla iade edilip beton 5 m3'e düzeltildi ve önceki miktarlar 10/2, cari miktarlar 5/1, kümülatif miktarlar 15/3 olarak doğrulandı. Finalize projection tek `ProgressPayment` ve tek `YVM-HAK-E2E-HAK-002` ledger fişi üretti; finansal brüt 32.500 TL, teminat 1.625 TL, net 30.875 TL, KDV 6.175 TL ve genel toplam 37.050 TL'dir. Ledger `740=30.875` ve `191=6.175` borç ile `320=37.050` alacak toplamında dengelidir; proje `CLOSED` oldu. Aynı finalize retry `created=false` döndürdü ve finansal belge/ledger/link sayaçları `1/1/1` kaldı. Canlı testte server action'ların ham Prisma `Decimal` nesnesi döndürmesi düz JSON sonuç DTO'larına daraltıldı; taslak düzeltmesi sonrasında ayrıntı özetinin eski state'i göstermemesi için panel `payment.id + updatedAt` anahtarıyla yeniden yüklenir. 210 test dosyası / 1.142 test, type-check, Prisma validate, lint ve production build geçti.

**Uygulama durumu — 22.07.2026 F8 kesinti kuralları önizleme ve uygulama:** RFC-F8-01 Dilim 3 kapsamında admin/accounting yetkili, tenant/firma/dönem/proje scoped ve yalnız taslak/iade hakedişlerde çalışan salt-okunur önizleme ile açık dönem kontrollü atomik uygulama action'ları eklendi. Uygulama kural snapshot'ı, kesinti hareketi, hakediş özeti ve merkezi audit'i tek transaction'da yazar; deterministik application key tekrar denemede kopyayı engeller, değişen hesap aynı application/hareket üzerinde `recalculated` iziyle güncellenir. İlk `TEMINAT` application'ından sonra legacy retention otomatiği devreden çıkar ve çift kesinti önlenir; manuel kesintiler korunur. UI sonraki dilime bırakıldı. 220 test dosyası / 1.219 test, type-check, Prisma validate, lint ve 74 sayfalık production build geçti.

**Uygulama durumu — 22.07.2026 F8 Hakediş Pro kesinti kuralı UI:** `/hakedis` proje kartına admin kontrollü yeni kural, append-only revizyon, pasifleştirme ve tarihsel kural listesi; hakediş Kesintiler sekmesine admin/accounting önizleme-uygulama kontrolü ile gerçekleşen application snapshot tablosu eklendi. Accounting/viewer yönetim alanı salt okunur, `autoApply` açılmadığı için arayüz manuel uygulama etiketlidir. Revizyon eski geçerlilik aralığını transaction içinde kapatıp yeni kayıt ve audit üretir. Kural kaynaklı kesinti UI'dan ve doğrudan action'dan manuel silinemez. Gerçek demo verisi masaüstü ve 390 px mobil görünümde yazma yapmadan doğrulandı; sayfa taşması görülmedi. 221 test dosyası / 1.224 test, type-check, Prisma validate, lint ve 74 sayfalık production build geçti.

**Uygulama durumu — 22.07.2026 F8 görsel ve gerçek veri kabulü:** DEMO İNŞAAT kapsamında izole `F8-KABUL-20260722` projesi, `F8-POZ-01` pozu ve `F8-HAK-001` ilk hakedişi native `/hakedis` arayüzünden gerçek veriye oluşturuldu. Admin rolü `%5` teminat R1'i, 01.08.2026 başlangıçlı `%6` R2 append-only revizyonunu ve 250 TL maktu kesintiyi tanımladı; 31.07.2026 tarihli hakediş doğru biçimde tarihsel R1'i seçerek 5.250 TL kesinti ve 94.750 TL ödenebilir toplam üretti. Muhasebe rolü yönetim formu olmadan önizleme/uygulama/gönderme akışını tamamladı; tekrar uygulamalar 2 snapshot/2 hareket/2 audit seviyesini değiştirmedi. Yönetici onayı ve kesinleştirme sonunda finansal projection 100.000 TL brüt, 5.250 TL kesinti, 94.750 TL net, 18.950 TL KDV ve 113.700 TL genel toplam; `YVM-HAK-F8-HAK-001` fişi ise 113.700 TL borç/alacak dengesi üretti. Finalize retry `created=false` döndürdü ve finansal kayıt/ledger/link/finalized audit sayaçları `1/1/1/1` kaldı. Masaüstü ile 390 × 844 px mobil kilitli snapshot görünümü doğrulandı; mevcut E2E/legacy veri değiştirilmedi. RFC-F8-01'in beş uygulama dilimi tamamlandı. Hedefli F8 paketi 5 dosya/29 test; tam paket 221 dosya/1.224 test, type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti.

**Uygulama durumu — 22.07.2026 kapsamlı UI/UX standardizasyonu:** Sonraki plan dilimine geçmeden önce tüm rotalar ortak AppShell v2 altında birleştirildi; API/e-Fatura dahil legacy kabuk ayrımı kaldırıldı. `PageHeader`, `MetricCard` ve `ActionBar` ortak primitive'leri ile semantic renk/yüzey/radius/control kuralları uygulama geneline yayıldı. Dashboard, API, Puantaj, Personel ve Hakediş masaüstü kabulünde ortak navigasyon, skip-link ve tek `h1` hiyerarşisi doğrulandı; mobil drawer odak/Escape sözleşmesi ve 390 px yerleşim kuralları test kapsamındadır. Domain iş akışları, server action'lar, gerçek veri, RBAC, scope, audit, ledger ve Prisma şeması bu dilimde değiştirilmedi.

**Uygulama durumu — 22.07.2026 Faz 9 dark tema temeli:** Uygulama kabuğuna `Sistem/Açık/Koyu` tema tercihi, hydration öncesi flash önleyici root bootstrap ve `.dark` semantic token karşılıkları eklendi. Tercih yalnız tarayıcıda saklanır; DB, scope ve kullanıcı kayıtları değişmez. Aynı kontrol masaüstü header ile mobil drawer arasında senkron çalışır, sistem renk tercihi canlı izlenir ve print çıktısı açık tema tokenlarına zorlanır. Dashboard ve yoğun Hakediş yüzeyi koyu masaüstü görünümde; Hakediş ayrıca 390 × 844 px mobil görünümde doğrulandı, yatay taşma görülmedi. Hedefli paket 3 dosya/31 test; tam paket 222 dosya/1.229 test, type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti. Faz 9'un sonraki bağımsız dilimi semantic token dışı sabit renklerin ve geçici legacy/v2 kabuk kodunun kontrollü temizliğidir.

**Uygulama durumu — 22.07.2026 Faz 9 semantic renk ve shell temizliği:** Tüm korumalı rotalar tek `standard` AppShell sözleşmesine geçirildi; route bazlı `v2-*-pilot` eşlemeleri, ulaşılamayan legacy kabuk ve geçici pilot adlandırmaları kaldırıldı. Componentlerdeki sabit Tailwind renk paletleri, beyaz/siyah durum renkleri ve grafik hex değerleri semantic `--ds-*` tokenlarına taşındı; artık kullanılmayan legacy CSS alias'ları kaldırıldı. Dashboard, Döküman Merkezi ve Ayarlar gerçek demo verisiyle koyu temada görsel kabulden geçti; çalışma anında sabit palet sınıfı bulunmadı. İş akışı, RBAC/scope/audit/ledger, DB ve gerçek veri değiştirilmedi. Hedefli paket 18 dosya/227 test; tam paket 222 dosya/1.229 test, type-check, Prisma validate, lint ve 74 sayfalık production build ile geçti. Sıradaki Faz 9 dilimi route matrisi genelinde kontrast, tablo/form/modal/grafik ve print kabulüdür.
**Uygulama durumu — 22.07.2026 Faz 9 route matrisi kontrast ve çıktı kabulü:** 22 korumalı route standart shell, tek ana başlık, taşma ve ana içerik semantiği açısından tarandı. Light/dark semantic renk çiftleri WCAG AA eşiğine otomatik testle bağlandı; minimum oranlar light 4.52:1 ve dark 7.11:1 oldu. Yevmiye, mizan, puantaj, hakediş ve fatura tabloları erişilebilir adlara; manuel yevmiye alanları açık form adlarına kavuştu. Fatura PDF modalı ilk odak, odak döngüsü, Escape ve odak dönüşüyle; Dashboard grafikleri koyu temada gerçek veriyle kabul edildi. Print görünümü açık semantic palete dönüyor, global shell/interaktif aksiyonları gizliyor ve tablo sayfa kırılmalarını koruyor. Domain, DB ve iş akışları değişmedi. Hedefli paket 8 dosya/97 test; tam paket 222 dosya/1.232 test, type-check, Prisma validate, lint, diff denetimi ve 74 sayfalık production build ile geçti. Ayrıntılı kabul raporu `Docs/UI-baseline/Faz9-route-matrix-kabul-20260722.md` içindedir. Sıradaki Faz 9 dilimi nihai sayfa matrisi ve kullanıcı dokümantasyonudur.
