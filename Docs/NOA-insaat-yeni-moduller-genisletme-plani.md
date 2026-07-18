# NOA İnşaat Ön Muhasebe SaaS — Yeni Modüller Genişletme Planı

> Güncelleme tarihi: 02.07.2026  
> Bağlam: Bu belge, `NOA-insaat-on-muhasebe-saas-analiz-ve-gelistirme-plani.md` (ana plan) üzerine **ek** olarak hazırlanmıştır.  
> Ana ilke: Mevcut plana hiçbir dokunma yapılmaz. Bu belge yalnızca yeni modülleri tanımlar ve mevcut çekirdeğe nasıl bağlanacaklarını belirler.  
> Görsel kaynak: `C:\Users\SisteM\Pictures\Screenshots\Parsek-insaat` klasöründeki ekran görüntüleri (Parsek ERP v4.0.3 BETA).

---

## İçindekiler

1. [Bu Belgenin Amacı ve Kapsamı](#1-bu-belgenin-amacı-ve-kapsamı)
2. [Ekran Görüntüsü Havuzu Envanteri](#2-ekran-görüntüsü-havuzu-envanteri)
3. [Yeni Modül Özeti](#3-yeni-modül-özeti)
4. [Mevcut Çekirdekle Uyum Kuralları](#4-mevcut-çekirdekle-uyum-kuralları)
5. [Modül 1: Firmalar Yönetimi (Müşteri, Taşeron, Tedarikçi)](#5-modül-1-firmalar-yönetimi-müşteri-taşeron-tedarikçi)
6. [Modül 2: İhale Yönetimi](#6-modül-2-ihale-yönetimi)
7. [Modül 3: Döküman Yönetimi](#7-modül-3-döküman-yönetimi)
8. [Modül 4: Ayarlar ve Sistem Yönetimi (Genişletilmiş)](#8-modül-4-ayarlar-ve-sistem-yönetimi-genişletilmiş)
9. [Modül 5: Parsek Platform Katmanı (Abonelik, Destek, API)](#9-modül-5-parsek-platform-katmanı-abonelik-destek-api)
10. [Modül 6: İSG / İş Güvenliği](#10-modül-6-işg--iş-güvenliği)
11. [Modül 7: Araç ve Filo Yönetimi (Arvento Entegrasyonu)](#11-modül-7-araç-ve-filo-yönetimi-arvento-entegrasyonu)
12. [Modül 8: Banka Entegrasyonu (Open Banking)](#12-modül-8-banka-entegrasyonu-open-banking)
13. [Modül 9: Personel ve İK Yönetimi (Genişletilmiş)](#13-modül-9-personel-ve-işk-yönetimi-genişletilmiş)
14. [Platform Standartlarına Uyumluluk](#14-platform-standartlarına-uyumluluk)
15. [Ekran Görüntüsü–Modül Eşleştirme Matrisi](#15-ekran-görüntüsümodül-eşleştirme-matrisi)
16. [Veri Modeli Genişletmeleri](#16-veri-modeli-genişletmeleri)
17. [Öncelik ve Faz Planı](#17-öncelik-ve-faz-planı)
18. [Geliştirme Bağımlılık Haritası](#18-geliştirme-bağımlılık-haritası)
19. [Riskler ve Ürün Kararları](#19-riskler-ve-ürün-kararları)
20. [Kabul Kriterleri](#20-kabul-kriterleri)

---

## 1. Bu Belgenin Amacı ve Kapsamı

### 1.1 Amaç

Ana plan (`NOA-insaat-on-muhasebe-saas-analiz-ve-gelistirme-plani.md`), P0 çekirdek ürünü ve 12 haftalık geliştirme sürecini tanımlar. Bu belge ise ana plandaki P1/P2 fazlarında veya sonrasında geliştirilecek **yeni modülleri** detaylı şekilde tanımlar.

Bu belgenin üç temel görevi vardır:

1. **Parsek ERP ekran görüntülerinden** çıkarılan yeni modül gereksinimlerini yapılandırmak.
2. Her yeni modülün **mevcut çekirdeğe nasıl bağlanacağını** (iş akışı, veri modeli, finansal etki, UI standardı) belirlemek.
3. Geliştirme önceliği, bağımlılık ve kabul kriterlerini netleştirmek.

### 1.2 Kapsam dışı

- P0 çekirdek modüllerin yeniden tanımı (ana planda mevcuttur).
- HTML şablon havuzunun baştan dağılımı (ana plan §8'de mevcuttur).
- Teknoloji yığını ve mimari kararları (ana plan §10'da mevcuttur).

### 1.3 Bağlam korunması prensibi

Her yeni modül geliştirilirken ana planın §15 "Bağlamı Koruma Kuralları" aynen uygulanır. Ek olarak bu belgenin §4 "Mevcut Çekirdekle Uyum Kuralları" yeni modüller için zorunludur.

---

## 2. Ekran Görüntüsü Havuzu Envanteri

### 2.1 Klasör yapısı

Klasör: `C:\Users\SisteM\Pictures\Screenshots\Parsek-insaat`

| Klasör | Dosya Sayısı | İçerik |
| --- | ---: | --- |
| `Ayarlar` | 35 | Rol yönetimi, kullanıcı yönetimi, firma bilgileri, banka entegrasyonu, Arvento filo takip, denetim günlüğü, bildirim ayarları, finans ayarları |
| `Döküman Yönetimi` | 6 | Dosya yönetimi, klasör yapısı, depolama, sürükle-bırak yükleme |
| `Firmalar` | 17 | Dashboard, müşteri/taşeron/tedarikçi liste ve formları, Excel içe aktarma şablonları |
| `İhale Yönetimi` | 5 | İhale dashboard, liste, yeni ihale formu (3 sekme: Genel & Takvim, Maliyet & Teklif, BOQ/Poz) |
| `Parsek` | 18 | API dokümantasyonu, bilgi merkezi, destek merkezi, paket/abonelik yönetimi, davet et & kazan |

**Toplam: 81 dosya** (76 ekran görüntüsü + 3 Excel şablonu + 2 destek materyali)

### 2.2 Ekran görüntüsü yorumlama kuralları (ana plan kurallarına ek)

- Parsek ERP ekranları bir **modern SaaS referans uygulamasıdır**. Eski NOA masaüstü uygulaması gibi birebir kopyalanmaz.
- Parsek'te görülen modül adı, alan adı ve akış aday gereksinimdir.
- Parsek'te görülen görsel tasarım (renk, layout, kart yapısı) NOA tasarım diliyle **çelişirse** NOA tasarım dili önceliklidir.
- Parsek'te görülen bir özellik ana plandaki çekirdek finansal mantıkla çelişirse finansal mantık korunur.
- Ekran görüntülerindeki "SİSTEM", "BETA", "Yakında" etiketleri geliştirme fazı planlaması için ipucu kabul edilir.

### 2.3 Parsek ERP modül haritası

Parsek ERP'nin sol menüsünde görülen ana modül yapısı:

```
Dashboard
Firma Özeti
İş Akışı
Döküman Yönetimi
İhale Yönetimi
Personel (alt menü)
Araç Parkı (alt menü)
Firmalar
  ├── Dashboard
  ├── Taşeronlar
  ├── Müşteriler
  └── Tedarikçiler
Ürün Yönetimi
Stok/Depo
Talep & Tedarik
Teklif & Satış
Proje Yönetimi
Üretim
Cari İşlemleri
Ayarlar
  ├── Kullanıcılar
  ├── Firma Bilgileri
  ├── Filo Takip (Arvento)
  ├── Banka Entegrasyonu
  ├── Denetim Günlüğü
  ├── Bildirim Ayarları
  ├── Finans Ayarları
  └── Rol Yönetimi
Parsek
  ├── Destek Merkezi
  ├── Bilgi Merkezi
  ├── API Dokümantasyonu
  ├── Paketim
  └── Davet Et & Kazan
```

Bu modül haritası, NOA ürününün hangi alanları **yeni modül** olarak değerlendireceğini belirler.

---

## 3. Yeni Modül Özeti

Parsek ERP ekran görüntülerinden ve ürün bağlamından çıkarılan **yeni modüller** şunlardır:

| # | Modül | Kaynak Ekran(lar) | Öncelik | Ana Plan Bağlantısı |
| --- | --- | --- | :---: | --- |
| 1 | **Firmalar Yönetimi** (Müşteri/Taşeron/Tedarikçi birleşik) | `Firmalar/*` | P1 | Ana plan §6.2 (Taşeron), §6.4 (Tedarikçi) |
| 2 | **İhale Yönetimi** | `İhale Yönetimi/*` | P1/P2 | Ana plan §6.10 (Teklif P1 ile ilişkili) |
| 3 | **Döküman Yönetimi** | `Döküman Yönetimi/*` | P1 | Ana plan §6.10 (Evrak P1) |
| 4 | **Ayarlar ve Sistem Yönetimi** (genişletilmiş) | `Ayarlar/*` | P0'da temel, P1'de genişletme | Ana plan §4.5 (Parametreler) |
| 5 | **Parsek Platform Katmanı** (Abonelik/Destek/API) | `Parsek/*` | P2 | Ana plan §9.3 (Abonelik P2) |
| 6 | **İSG / İş Güvenliği** | Bilgi Merkezi duyurusu | P2 | Ana plan §8.6 (İSG kontrol listesi P2) |
| 7 | **Araç ve Filo Yönetimi** (Arvento) | `Ayarlar/Arvento Filo Takip-*` | P2 | Ana plan §6.10 (Araçlar P2) |
| 8 | **Banka Entegrasyonu** (Open Banking) | `Ayarlar/Ayarlar-Banka Entegrasyonu.png` | P2 | Ana plan §9.3 (Banka entegrasyonu P2) |
| 9 | **Personel ve İK Yönetimi** (genişletilmiş) | `Ayarlar/Kullanıcı Yönetimi`, `Ayarlar/Rol Yönetimi` | P1 | Ana plan §6.3 (Personel P0) + genişletme |

### 3.1 Öncelik değerlendirme mantığı

- **P1**: P0 çekirdek tamamlandıktan sonra hemen devreye alınacak modüller. Operasyonel verimlilik ve kullanıcı deneyimini doğrudan artırır.
- **P2**: Ürün ölçeklendikçe ve rekabet avantajı gerektikçe devreye alınacak modüller. Dış entegrasyon, ileri analiz ve endüstriye özel derinlik içerir.

---

## 4. Mevcut Çekirdekle Uyum Kuralları

Bu bölüm, her yeni modülün geliştirilmesi sırasında **zorunlu** olarak uygulanacak kurallardır.

### 4.1 İş akışı bütünlüğü

- Her yeni modül, ana planın finansal hareket motoruyla (ledger) bağlantılıysa bu bağlantı **ilk gün** kurulur.
- Finansal etki üreten modüller (İhale→Proje, Döküman→Fatura eki, Banka→Kasa) hareketi belge düzeyinde üretir, defter düzeyinde yansıtır.
- Hiçbir modül kendi finansal hareketini bağımsız hesaplamaz; ortak çekirdek kullanılır.

### 4.2 UI tutarlılığı

- Tüm yeni modüller ana planın §7 "Platform Standartları" listesi/form/grid kurallarına uyar.
- Parsek'te görülen dashboard kartı, filtre barı, aksiyon toolbar'ı görsel ilham olabilir ama NOA tasarım dili önceliklidir.
- Aynı modüldeki tüm sayfalarda aynı başlık, toolbar ve filtre düzeni kullanılır.
- Liste→Form→Detay akışı tüm modüllerde aynıdır.

### 4.3 Veri modeli bütünlüğü

- Tüm yeni varlıklarda `tenantId`, `companyId`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `deletedAt`/`status` alanları zorunludur.
- Cari nitelikli varlıklar (müşteri, tedarikçi, taşeron) mevcut `Supplier`, `Subcontractor` varlıklarıyla ilişkilendirilir; ayrı sil tablolar açılmaz.
- Kod/evrak no üretimi ortak `NumberSeries` servisini kullanır.

### 4.4 Yetki ve güvenlik

- Her yeni modül, ana planın §11 yetki boyutlarına (modül erişimi, oluşturma, düzenleme, iptal, dışa aktarma, fiyat görme) bağlanır.
- Rol yönetimi genişletilerek her yeni modül için ayrı yetki matrisi tanımlanır.
- Denetim günlüğü her yeni modülün CRUD işlemlerini kapsar.

### 4.5 Ekran görüntüsü entegrasyon koşulları

Ekran görüntüleri, modül geliştirme sırasında şu koşullarla kullanılır:

1. **Mevcut iş akışı korunur**: Parsek'te görülen akış, NOA'nın çekirdek finansal mantığıyla çelişmezse aynen alınır.
2. **Sayfalar arası uyum ve tutarlılık**: Bir modülde kullanılan liste/form/grid düzeni diğer modüllerde de kullanılır.
3. **Yalnızca yeni modüller kapsamında**: P0 çekirdek modüllerin ekranları bu belgeden etkilenmez; P0 ekranları ana planın kaynaklarına bağlı kalır.

---

## 5. Modül 1: Firmalar Yönetimi (Müşteri, Taşeron, Tedarikçi)

### 5.1 Kaynak ekranlar

- `Firmalar/Firmalar-Dashboard-01.png` ve `-02.png`
- `Firmalar/Firmalar-Müşteriler.png`
- `Firmalar/Firmalar-Müşteriler-Yeni Müşteri-01.png`, `-02.png`, `-03.png`
- `Firmalar/Firmalar-Taşeronlar.png`
- `Firmalar/Firmalar-Taşeronlar-Yeni Taşeron-01.png`, `-02.png`, `-03.png`
- `Firmalar/Firmalar-Tedarikçiler.png`
- `Farmalar/Firmalar-Tedarikçiler-Yeni Tedarikçi-01.png`, `-02.png`, `-03.png`
- `Firmalar/parsek_customers_sablon.xlsx`
- `Firmalar/parsek_subcontractors_sablon.xlsx`
- `Firmalar/parsek_vendors_sablon.xlsx`

### 5.2 Modül amacı

Müşteri, taşeron ve tedarikçi kartlarını tek bir birleşik "Firmalar" modülü altında toplamak. Ana planda bu üç varlık ayrı modüller olarak tanımlıdır; bu belgede Parsek'in birleşik dashboard yaklaşımı benimsenerek üç alt tip tek çatı altında yönetilir.

### 5.3 Dashboard (Firmalar Dashboard)

**Kaynak**: `Firmalar-Dashboard-01.png`, `-02.png`

Parsek'te görülen dashboard yapısı:

- **Zaman filtresi**: Bugün, Bu Hafta, Bu Ay (aktif), Bu Yıl.
- **Üst istatistik kartları** (4 adet):
  - Toplam Firma (turuncu)
  - Taşeronlar (mavi)
  - Müşteriler (yeşil)
  - Tedarikçiler (mor)
- **Finansal kartlar** (4 adet):
  - Taşeron Ödemeleri (₺)
  - Müşteri Tahsilatı (₺)
  - Tedarikçi Ödemeleri (₺)
  - Net Nakit Akışı (₺)
- **Grafikler**:
  - Firma Tipi Dağılımı (pasta grafik)
  - Aylık Yeni Firma Trendi (sütun grafik, son 6 ay)
  - En Aktif Firmalar (işlem sayısına göre)
  - Son Eklenen Firmalar (tablo: firma adı, tür, bakiye, tarih)

**NOA uyarlaması**:
- Dashboard kartları NOA tasarım token'larıyla (ana plan §8.3) render edilir.
- Finansal kartlar mevcut ledger çekirdeğinden beslenir.
- Renk kodlaması: tür bazlı renk ayırımı korunur (taşeron=mavi, müşteri=yeşil, tedarikçi=mor).

### 5.4 Liste ekranı (ortak)

**Kaynak**: Müşteriler, Taşeronlar, Tedarikçiler liste ekranları

Parsek'te görülen ortak liste yapısı:

- **Başlık + alt başlık** (örn: "Taşeronlar — Taşeron firma yönetimi")
- **Breadcrumb**: Ana Sayfa > Firmalar > [Müşteriler/Taşeronlar/Tedarikçiler]
- **Üst aksiyon butonları**:
  - `+ Yeni [Müşteri/Taşeron/Tedarikçi]` (yeşil)
  - `İçe Aktar` (Excel şablonu ile toplu yükleme)
  - `Excel` (dışa aktarma)
  - `PDF` (dışa aktarma)
  - `Yazdır`
  - `Yenile`
- **Arama kutusu**: "Ara... (N alan)" — çoklu alanda arama
- **Tablo kolonları**:

| Kolon | Müşteri | Taşeron | Tedarikçi |
| --- | :---: | :---: | :---: |
| Kod | ✓ | ✓ | ✓ |
| Firma Adı | ✓ | ✓ | ✓ |
| Yetkili | ✓ | ✓ | — (İletişim) |
| Telefon | ✓ | ✓ | ✓ |
| Şehir | ✓ | — | — |
| Kategori | — | — | ✓ |
| Sözleşme | — | ✓ (başlangıç-bitiş) | — |
| Personel | — | ✓ (sayı) | — |
| Araçlar | — | ✓ (sayı) | — |
| Durum | ✓ (Aktif/Pasif) | ✓ | ✓ |
| İşlemler | ✓ | ✓ | ✓ |

- **Satır içi işlemler**: Görüntüle (göz), Düzenle (kalem), Sil (çöp kutusu)
- **Durum etiketi**: Aktif (yeşil rozet), Pasif (gri/kırmızı rozet)
- **Kod öneki**: Müşteri=`CUS-`, Taşeron=`TAS-` veya `SUB-`, Tedarikçi=`TED-` veya `VND-`

### 5.5 Form ekranı (ortak)

**Kaynak**: Yeni Müşteri/Taşeron/Tedarikçi formları

Parsek'te görülen form yapısı — **tek sayfa, bölümlere ayrılmış** (sekme değil):

#### Bölüm 1: Genel Bilgiler
- Firma Adı * (zorunlu)
- Yetkili Kişi
- Telefon
- E-posta
- Şehir
- Adres (textarea)
- Durum (dropdown: Aktif varsayılan)

#### Bölüm 2: Vergi Bilgileri
- Vergi Numarası
- Vergi Dairesi

#### Bölüm 3: Banka Bilgileri
- IBAN
- Banka Adı
- Banka Lokasyonu (şube)

#### Bölüm 4: Notlar
- Notlar (textarea)

**Butonlar**: İptal, `[Müşteri/Taşeron/Tedarikçi] Oluştur` (yeşil)

### 5.6 Tür bazlı farklılaşmalar

Parsek'te görüldüğü gibi, üç tür **aynı form iskeletini** kullanır ama tür bazlı ek alanlar ve ilişkiler taşır:

#### Müşteriye özgü
- Şehir alanı listede gösterilir.
- Müşteri = ürün/hizmet satın alan taraf.
- Şantiye satış faturalarıyla ilişkilendirilir.
- Ana planın "Tedarikçi" kartındaki alış faturası ilişkisinin müşteri tarafındaki karşılığı: satış faturası.

#### Taşeron'a özgü
- **Sözleşme** tarihi aralığı (başlangıç-bitiş) listede gösterilir.
- **Personel** sayısı (bağlı işçi/ekip sayısı) listede gösterilir.
- **Araçlar** sayısı (bağlı araç/iş makinası sayısı) listede gösterilir.
- Taşeron kartında iş kolu, faaliyet alanı, SGK işveren sicil numarası, MERSİS, ticaret sicil no ek alanlar olarak veri modelinde yer alır (NOA önerisi, Parsek'te henüz tam görünmüyor).

#### Tedarikçi'ye özgü
- **Kategori** (hizmet türü etiketi: "Yemek Servisi", "Temizlik", "Ofis Malzemesi" vb.) listede gösterilir.
- Tedarikçi = malzeme/hizmet alınan taraf.
- Alış faturası ve irsaliye bağlantıları ana plan §6.4 ile uyumludur.

### 5.7 Excel içe/dışa aktarma

**Kaynak**: `parsek_customers_sablon.xlsx`, `parsek_subcontractors_sablon.xlsx`, `parsek_vendors_sablon.xlsx`

Parsek'te görülen **3 adımlı içe aktarma sihirbazı**:

1. **Şablon & Yükle**: Sistem tarafından sağlanan Excel şablonu indirilir, doldurulur, yüklenir (.xlsx, maksimum 15 MB).
2. **Önizleme**: Yüklenen veriler kullanıcıya gösterilir, eşleşmeyen sütunlar dropdown ile manuel eşlenir.
3. **Sonuç**: Başarılı ve hatalı kayıtlar raporlanır.

**NOA uyarlaması**:
- Her tür için ayrı Excel şablonu (farklı kolon setleri).
- Şablon indir → doldur → yükle → önizleme → eşle → aktar → sonuç raporu.
- Hatalı satırlar kırmızı işaretlenir, kullanıcı düzeltebilir.

### 5.8 Finansal bağlantılar

- Müşteri → Satış faturası, Tahsilat, Şantiye geliri.
- Taşeron → Hakediş faturası, Ödeme, Şantiye gideri, Personel/Araç ilişkisi.
- Tedarikçi → Alış faturası, Ödeme, Şantiye maliyeti, Stok girişi.
- Tümü → Cari hesap ekstresi, Hareket toplamları, Borç/Alacak bakiyesi.

### 5.9 Veri modeli

Ana plandaki `Supplier`, `Subcontractor` varlıkları korunur. Bunlara ek olarak:

- `Customer`: Müşteri kartı (Şantiye satış faturası ilişkisi).
- `PartyProfile` (genel): Üç türün ortak adres, vergi, banka, iletişim verisini taşıyan genişletilebilir profil (isteğe bağlı ortak tablo).

---

## 6. Modül 2: İhale Yönetimi

### 6.1 Kaynak ekranlar

- `İhale Yönetimi-01.png` (Dashboard/Analiz)
- `İhale Yönetimi-02.png` (Liste ekranı)
- `İhale Yönetimi-Yeni ihale-01.png` (Genel & Takvim sekmesi)
- `İhale Yönetimi-Yeni ihale-02.png` (Maliyet & Teklif sekmesi)
- `İhale Yönetimi-Yeni ihale-03.png` (BOQ / Poz sekmesi)

### 6.2 Modül amacı

Kamu ve özel sektör ihalelerinin uçtan uca yönetimi: takip, kârlı teklif hesabı, rakip analizi, kazanılan ihalelerin projeye dönüştürülmesi.

### 6.3 Dashboard (Analiz Panosu)

**Kaynak**: `İhale Yönetimi-01.png`

Parsek'te görülen dashboard yapısı:

- **KPI kartları** (7 adet):
  - Takip (sayı + ₺ tutar)
  - Hazırlanıyor (sayı + ₺)
  - Sunuldu (sayı + ₺)
  - Kazanıldı (sayı + ₺)
  - Kaybedildi (sayı + ₺)
  - İptal (sayı + ₺)
  - Kazanma Oranı (%)

- **Grafikler**:
  - Aylık Trend (12 ay, kazanılan/kaybedilen)
  - İhale Türüne Göre (açık ihale, pazarlık vb.)
  - En Çok İhale Açan Kurumlar (örn: TOKİ, KİPTAŞ vb.)

- **Aksiyonlar**: Listeye Dön, Yeni İhale, Analiz Panosu

### 6.4 Liste ekranı

**Kaynak**: `İhale Yönetimi-02.png`

- **KPI özet kartları**: 7 durum kartı (liste üstünde özet)
- **Aksiyon butonları**: Analiz Panosu, Yeni İhale
- **Arama**: "Ara... (6 alan)"
- **Export**: Excel, PDF, Yenile
- **Tablo kolonları**:

| Kolon | Açıklama |
| --- | --- |
| NO / İKN | İhale numarası / EKAP İhale Kayıt Numarası |
| Başlık | İhale adı/konusu |
| Alt başlık | Kurum (örn: TOKİ) |
| Durum | Takip, Hazırlanıyor, Sunuldu, Kazanıldı, Kaybedildi, İptal |
| Son Teklif | Son teklif tarihi + saat |
| Uyarı | ⏰ "Süre doldu" (tarihi geçmiş ihaleler için kırmızı uyarı) |
| Yaklaşık Bedel | ₺ tutar |

### 6.5 Form ekranı — 3 sekmeli yapı

**Kaynak**: `Yeni ihale-01.png`, `-02.png`, `-03.png`

İhale formu, **3 sekme** içeren kapsamlı bir yapıdır:

#### Sekme 1: Genel & Takvim

| Alan | Tür | Zorunlu | Açıklama |
| --- | --- | :---: | --- |
| Başlık | Metin | ✓ | İhale adı |
| İhale No | Metin | — | Şirket içi takip no |
| EKAP / İKN | Metin | — | EKAP kayıt no (örn: 2026/123456) |
| İhale Makamı | Metin | — | İhaleyi açan kurum |
| İhale Usulü | Dropdown | — | Açık İhale, Belli İstekliler, Pazarlık, Doğrudan Temin vb. |
| İlan Tarihi | Tarih | — | İhalenin ilan edildiği tarih |
| Şartname Satın Alma Son | Tarih | — | Şartname alım son tarihi |
| Soru-Cevap Son | Tarih | — | Soru sorma son tarihi |
| Son Teklif Tarihi | Tarih+Saat | — | Teklif verme deadline |
| İhale Oturum Tarihi | Tarih+Saat | — | Komisyon oturum tarihi |
| Sözleşme İmza Tarihi | Tarih | — | Sözleşme imza tarihi |
| Yer / İl | Metin | — | İhale lokasyonu |
| Açıklama | Textarea | — | Genel notlar |

#### Sekme 2: Maliyet & Teklif

| Alan | Tür | Açıklama |
| --- | --- | --- |
| Para Birimi | Dropdown | TRY (varsayılan), USD, EUR, GBP |
| İdare Yaklaşık Maliyeti | Para | İdarenin belirlediği yaklaşık maliyet |
| Genel Gider (Overhead) % | Sayı | Yüzdelik genel gider oranı |
| Kâr Marjı % | Sayı | Yüzdelik kâr marjı |
| Bizim Teklif Bedeli | Para (otomatik) | BOQ'dan hesaplanan veya manuel |
| Sınır Değer (aşırı düşük) | Para | Aşırı düşük teklif sınırı |

**Kârlılık Simülasyonu** (otomatik hesaplanan, salt okunur):

| Alan | Hesaplama |
| --- | --- |
| Toplam Maliyet (BOQ) | BOQ kalemlerinin maliyet toplamı |
| Önerilen Teklif | Maliyet + Genel Gider + Kâr Marjı |
| BOQ Teklif Toplamı | BOQ kalemlerinin teklif toplamı |
| Kullanılan Teklif | Manuel veya önerilen teklif |
| Kâr | Kullanılan teklif - maliyet |
| Kâr Oranı | % |

**İpucu**: "BOQ sekmesinde poz için malzeme/işçilik/ekipman/taşeron/nakliye maliyetlerini girin; birim maliyet otomatik hesaplanır."

#### Sekme 3: BOQ / Poz (Miktar Cetveli)

**Kaynak**: `Yeni ihale-03.png`

Satır bazlı poz/malzeme grid'i:

| Kolon | Açıklama |
| --- | --- |
| Poz | Poz numarası/kodu |
| Açıklama | İş kalemi açıklaması |
| Birim | Dropdown: adet, m, m², m³, kg, ton, gün, saat |
| Miktar | Sayısal (varsayılan: 1) |
| Malzeme | Kalem başı malzeme maliyeti (₺) |
| İşçilik | Kalem başı işçilik maliyeti (₺) |
| Ekipman | Kalem başı ekipman maliyeti (₺) |
| Taşeron | Kalem başı taşeron maliyeti (₺) |
| Nakliye | Kalem başı nakliye maliyeti (₺) |
| Birim Mal. | Otomatik: malzeme+işçilik+ekipman+taşeron+nakliye |
| Birim Teklif | Manuel girilen birim satış/teklif fiyatı |
| Satır Teklif | Otomatik: miktar × birim teklif |

**Toplamlar**: Maliyet Toplamı, Teklif Toplamı

**Aksiyon**: `+ Poz Ekle`

### 6.6 Durum makinesi

Parsek'te görülen ihale durumları:

```
Takip → Hazırlanıyor → Sunuldu → Kazanıldı / Kaybedildi / İptal
```

- **Takip**: İhale takibe alındı, henüz teklif hazırlanmıyor.
- **Hazırlanıyor**: Teklif hazırlık süreci aktif.
- **Sunuldu**: Teklif ihale makamına sunuldu.
- **Kazanıldı**: İhale kazanıldı → şantiye/projeye dönüştürme akışı tetiklenir.
- **Kaybedildi**: İhale kaybedildi → rakip analizi ve ders çıkarma.
- **İptal**: İhaleden çekilme veya iptal.

### 6.7 İhaleden projeye dönüşüm

İhale kazanıldığında:
1. İhale kaydı "Kazanıldı" durumuna geçer.
2. Sözleşme bedeli ve imza tarihi netleşir.
3. **Şantiye & Proje** kaydı otomatik oluşturulur (ana plan §6.1'e bağlanır).
4. BOQ/Poz kalemleri projenin imalat/hizmet tanımlarına aktarılır.
5. İhale maliyet verileri projenin tahmini maliyet alanına yazılır.

### 6.8 Finansal bağlantı

- İhale aşamasında finansal hareket üretilmez (tahmini maliyet/teklif bilgi amaçlıdır).
- İhale kazanıldığında ve projeye dönüştüğünde, şantiye maliyet bütçesi oluşur.
- Şantiye oluştuktan sonra ana planın finansal hareket motoru devreye girer.

### 6.9 Veri modeli

- `Tender`: İhale ana kaydı (başlık, kurum, usul, tarihler, bedel, durum).
- `TenderLine`: BOQ/Poz satırları (poz, açıklama, birim, miktar, maliyet kırılımı, teklif).
- `TenderStatusHistory`: Durum geçişleri
- `TenderToProject`: İhaleden şantiye/projeye dönüşüm kaydı

---

## 7. Modül 3: Döküman Yönetimi

### 7.1 Kaynak ekranlar

- `Döküman Yönetimi/Döküman Yönetimi-01.png` (Izgara görünümü, sistem klasörleri)
- `Döküman Yönetimi/Döküman Yönetimi-02.png` (Liste görünümü, kolon detayları)
- `Döküman Yönetimi/Döküman Yönetimi-03.png` (Klasör oluşturma, erişim yetkisi)
- `Döküman Yönetimi/Döküman Yönetimi-04.png` (Sürükle-bırak yükleme alanı)
- `Döküman Yönetimi/Döküman Yönetimi-05.png`
- `Döküman Yönetimi/Döküman Yönetimi-06.png`

### 7.2 Modül amacı

İşletmenin tüm dijital belgelerini organize etmek, saklamak ve ERP modülleriyle entegre etmek. Ana planın §6.10'da P1 olarak tanımlanan "Evrak" modülünün tam karşılığıdır.

### 7.3 Depolama yönetimi

Parsek'te görülen depolama yapısı:

- **Depolama kotası**: Plan bazlı (örn: 5GB başlangıç).
- **Kullanım göstergesi**: "- / 5GB (0 dosya)" formatında.
- **Genişletme**: Ek depolama satın alma (örn: +5GB - ₺790/ay).
- **Dosya limiti**: Maksimum dosya boyutu (Parsek'te 5MB görünüyor, NOA'da daha yüksek tutulmalı).

### 7.4 Ana sayfa yapısı

**Sekmeler** (sol üst):
- **Dosyalarım**: Ana çalışma alanı.
- **Yıldızlı**: Favoriye eklenen belgeler.
- **Son Kullanılan**: Son erişilen dosyalar.
- **Çöp Kutusu**: Silinen dosyalar (geri yüklenebilir).

**Görünüm modları**:
- Izgara görünümü (grid — büyük ikonlar halinde klasör/dosya gösterimi).
- Liste görünümü (detaylı tablo).

**Araç çubuğu**:
- `+ Yeni Klasör`
- `Dosya Yükle` (mavi buton)
- Arama: "Dosya veya klasör ara..."
- Filtre ikonu
- Sıralama ikonu (isim, tarih, boyut)

### 7.5 Liste görünümü kolonları

| Kolon | Açıklama |
| --- | --- |
| Seçim kutusu | Toplu işlem için checkbox |
| Ad | Dosya veya klasör adı + SİSTEM etiketi |
| Etiketler | Dökümana atanan özel etiketler |
| Boyut | Dosya boyutu (klasör için boş) |
| Tarih | Oluşturma/son değişiklik tarihi+saat |
| Oluşturan | Yükleyen kullanıcı adı |
| İşlem | Yıldızla, Paylaş/Bağlantı, Kilit |

### 7.6 Sistem klasörleri

Parsek'te otomatik oluşturulan, silinemez sistem klasörleri (SİSTEM etiketli, kilitli):

| # | Klasör Adı | Renk | Bağlı Olduğu Modül |
| ---: | --- | --- | --- |
| 1 | Araç Belgeleri | Turuncu | Araç/Filo |
| 2 | Araçlar | Turuncu | Araç/Filo |
| 3 | Disiplin | Kırmızı | Personel/İK |
| 4 | İrsaliyeler | Yeşil | Stok/Depo |
| 5 | İzin Belgeleri | Mor | Personel/İK |
| 6 | Malzemeler | Gri | Stok/Depo |
| 7 | Masraflar | Turuncu | Gider |
| 8 | Ödeme Dekontları | Yeşil | Kasa/Banka |
| 9 | Personel | Mavi | Personel |
| 10 | Personel Belgeleri | Mavi | Personel/İK |
| 11 | Sözleşmeler | Mor | Şantiye/Taşeron |
| 12 | Stok Demirbaşları | Gri | Stok/Depo |
| 13 | Teklifler | Yeşil | Teklif/İhale |

**NOA'ya ek klasörler** (NOA çekirdeğinden gelen):
- Faturalar (Alış/Satış/Hakediş)
- Çek Belgeleri
- Hakediş Raporları
- Şantiye Belgeleri
- Puantaj Cetvelleri

### 7.7 Dosya yükleme

**Kaynak**: `Döküman Yönetimi-04.png`

Parsek'te görülen sürükle-bırak yükleme:

- **Bilgi notu**: "Dosyaları doğrudan bu alana sürükleyip bırakabilirsiniz."
- **Kesikli çizgili alan**: "Dosya seçin veya sürükleyin — Sürükle bırak veya tıklayarak dosya seç."
- **Limit**: "Maksimum dosya boyutu: 5MB" (NOA'da en az 25MB önerilir).

### 7.8 Klasör oluşturma ve yetkilendirme

**Kaynak**: `Döküman Yönetimi-03.png`

- Yeni klasör oluşturma: İsim gir + "Oluştur" veya "İptal".
- Erişim yetkisi seçici: "Herkes" (dropdown) — klasör erişim seviyesi tanımlanır.
- Sistem klasörleri silinemez, sadece içerik yönetilebilir.

### 7.9 Modül entegrasyonu

Döküman Yönetimi, tüm ERP modülleriyle entegredir:

- Bir alış faturasına belge eklendiğinde → otomatik olarak "Faturalar" klasörüne kaydedilir.
- Personel kaydına belge eklendiğinde → "Personel Belgeleri" klasörüne kaydedilir.
- Sözleşme yüklendiğinde → "Sözleşmeler" klasörüne kaydedilir.
- Belge, ilişkili olduğu modül kaydından hem görüntülenebilir hem de Döküman Yönetimi'nden.

### 7.10 Veri modeli

- `DocumentFile`: Dosya kaydı (ad, boyut, mime type, S3 anahtarı, etiketler, oluşturan).
- `DocumentFolder`: Klasör kaydı (ad, üst klasör, sistem mi, renk, kilitli mi).
- `DocumentLink`: Dosya-modül ilişkisi (fileId, modül adı, kayıt ID).
- `DocumentShare`: Paylaşım kaydı (dosya, kullanıcı, yetki seviyesi, süre).

---

## 8. Modül 4: Ayarlar ve Sistem Yönetimi (Genişletilmiş)

### 8.1 Kaynak ekranlar

- `Ayarlar/Ayarlar-Kullanıcı Yönetimi-01.png`, `-02.png`, `-03.png`
- `Ayarlar/Ayarlar-Rol Yönetimi-01.png` → `-15.png` (15 ekran)
- `Ayarlar/Ayarlar-Firma Bilgileri-01.png`, `-02.png`, `-03.png`
- `Ayarlar/Ayarlar-Finans Ayarlari.png`
- `Ayarlar/Ayarlar-Bildirim Ayarlari-01.png`, `-02.png`, `-03.png`
- `Ayarlar/Ayarlar-Denetim Günlüğü-01.png` → `-08.png` (8 ekran)
- `Ayarlar/Ayarlar-Banka Entegrasyonu.png` (→ Modül 8)
- `Ayarlar/Ayarlar-Arvento Filo Takip-01.png`, `-02.png` (→ Modül 7)

### 8.2 Modül yapısı

Ayarlar modülü, Parsek'te şu alt sayfalardan oluşur:

```
Ayarlar
  ├── Kullanıcılar
  ├── Firma Bilgileri
  ├── Filo Takip (Arvento)     → Modül 7
  ├── Banka Entegrasyonu        → Modül 8
  ├── Denetim Günlüğü
  ├── Bildirim Ayarları
  ├── Finans Ayarları
  └── Rol Yönetimi
```

Ana planın §4.5'teki temel parametreler (firma ayarları, numara serileri, para birimi, KDV) korunur; bu belgede Parsek'ten gelen **genişletilmiş** ayar yetenekleri tanımlanır.

### 8.3 Kullanıcı Yönetimi

**Kaynak**: `Ayarlar-Kullanıcı Yönetimi-01.png`

**Sayfa yapısı**:
- Başlık: "Kullanıcı Yönetimi — Kullanıcıları yönetin ve yetkilendirin"
- Üst aksiyonlar: `Kullanıcı Davet Et`, `Yeni Kullanıcı`

**Tablo kolonları**:

| Kolon | Açıklama |
| --- | --- |
| Ad Soyad | Kullanıcının tam adı |
| E-posta | Kullanıcı e-posta adresi |
| Rol | Yetki seviyesi (Admin/User — rozet olarak) |
| Firma | Bağlı firma adı |
| İşlemler | Düzenle, Sil |

**Davet akışı**:
- Kullanıcı Davet Et → e-posta adresi gir → davet bağlantısı gönderilir.
- Davet durumu: Bekliyor, Kabul Edildi, Süresi Doldu.

**Yeni Kullanıcı akışı**:
- Manuel oluşturma: ad, e-posta, rol, firma, şifre.

### 8.4 Rol Yönetimi

**Kaynak**: `Ayarlar-Rol Yönetimi-01.png` → `-15.png`

**Liste ekranı**:
- Başlık: "Rol Yönetimi — Kullanıcı rollerini ve izinlerini yönetin"
- Aksiyon: `+ Yeni Rol Oluştur`

**Rol kartları**:

| Rol | Tür | Açıklama | Kullanıcı | İzin |
| --- | --- | --- | ---: | ---: |
| Admin | Sistem Rolü | Sistem yöneticisi — Tüm izinlere sahip | 5 | 13+ |
| User | Sistem Rolü | Temel kullanıcı — Sınırlı izinlere sahip | 2 | 46 |

**Rol oluşturma/düzenleme**:
- Modül bazlı yetki matrisi.
- Her modül için CRUD yetkileri (Görüntüle, Ekle, Düzenle, Sil).
- Özel yetenekler: Fiyat görme, Dışa aktarma, Yazdırma, Rapor erişimi.

**NOA'ya ek yetki boyutları** (ana plan §11 ile uyumlu):
- Şantiye bazlı erişim
- Hesap kartı bazlı erişim
- Modül erişimi, fiyat/tutar görme, onay yetkisi

### 8.5 Firma Bilgileri

**Kaynak**: `Ayarlar-Firma Bilgileri-01.png`, `-02.png`, `-03.png`

**Görüntüleme modu**:
- Firma Adı, Telefon, Adres (salt okunur).
- `Düzenle` butonu (mavi).

**Lokasyon Yönetimi**:
- **Lokasyon bazlı çalışma toggle'ı**:
  - Kapalı → "Merkez (Lokasyonsuz)" modu — kayıtlar firma seviyesinde.
  - Açık → çoklu lokasyon/shantiye bazlı organizasyon.
- Açıklama: "Firma organizasyon yapısını belirleyin."

**Düzenleme modundaki alanlar** (NOA önerisi):
- Firma Adı, Ticari Ünvan
- Vergi Numarası, Vergi Dairesi
- MERSİS No, Ticaret Sicil No
- Adres, İl, İlçe, Posta Kodu, Ülke
- Telefon, E-posta, Web Sitesi
- Yetkili Kişi, GSM
- Logo yükleme
- Banka bilgileri (IBAN, Banka Adı, Şube)
- Faaliyet konusu/açıklama

### 8.6 Finans Ayarları

**Kaynak**: `Ayarlar-Finans Ayarlari.png`

**Para Birimi bölümü**:
- Baz Para Birimi: ₺ TRY (dropdown) — tüm raporlar bu para biriminde konsolide olur.
- Çoklu Dövize İzin Ver: toggle (açık → belge formlarında USD, EUR, GBP seçimi).

**KDV Ayarları bölümü**:
- Varsayılan KDV Oranı: %20 (dropdown).
- Varsayılan KDV Modu: "KDV Dahil" / "KDV Hariç" seçimi.
- KDV Dağılımını Göster: toggle (açık → belgelerin altında oran bazlı KDV özet tablosu).

**Bilgi notu**: "Bu ayarlar yeni belgelerde varsayılan olarak uygulanır. Mevcut belgeler etkilenmez. Her belgede tekil olarak farklı KDV oranı / para birimi seçebilirsiniz."

**NOA'ya eklenecek finans ayarları** (ana plan §4.5 ile uyumlu):
- Numara serileri (fatura, hakediş, çek, evrak).
- Stopaj oranları.
- Tevkifat oranları.
- Döviz kuru güncelleme kaynağı.
- Dönem kilidi ayarları.

### 8.7 Bildirim Ayarları

**Kaynak**: `Ayarlar-Bildirim Ayarlari-01.png`, `-02.png`, `-03.png`

**Yapı**: Kategori bazlı bildirim açma/kapama.

**Bildirim kategorileri**:

| Kategori | Açıklama |
| --- | --- |
| 💰 Masraf Yönetimi | Masraf talepleri, onaylar ve redler |
| 💵 Avans Yönetimi | Avans ödemeleri ve takibi |
| 🔄 Transfer İşlemleri | Personel, malzeme ve araç transferleri |
| 📦 Stok Yönetimi | Düşük stok ve envanter uyarıları |
| 🚗 Araç Yönetimi | Sürücü, muayene ve bakım hatırlatmaları |

**NOA'ya eklenecek bildirim kategorileri**:
- Yaklaşan çek vadeleri
- Tedarikçi borçları
- Şantiye bütçe aşımı
- Puantaj bekleyen dönemler
- E-fatura bekleyenler
- İhale son teklif tarihi yaklaşıyor

**Eksik özellikler (NOA'ya eklenmesi önerilen)**:
- Bildirim kanalı seçimi (E-posta, SMS, Push, In-app).
- Kanal bazlı ayar: her kategori için hangi kanaldan bildirim gönderileceği.
- Zamanlama: sessiz saatler, bildirim sıklığı.

### 8.8 Denetim Günlüğü (Audit Log)

**Kaynak**: `Ayarlar-Denetim Günlüğü-01.png` → `-08.png`

**İstatistik kartları**:
- Toplam İşlem (tüm zamanlar)
- Bugün
- Bu Hafta

**Filtreler**:
- Başlangıç Tarihi / Bitiş Tarihi (tarih seçici)
- İşlem Tipi dropdown: Tüm İşlemler, CREATE, UPDATE, DELETE
- Modül dropdown: Tüm Modüller, Personel, Finans, Giderler, Avanslar, Cari Hesaplar, Müşteriler, Tedarikçiler, Taşeronlar, Stok Yönetimi, Malzemeler, Malzeme Zimmeti, Araçlar, Yakıt Kayıtları, Bakım Kayıtları, Üretim vb.
- Serbest arama: Kayıt ID veya E-posta ile

**Tablo kolonları**:

| Kolon | Açıklama |
| --- | --- |
| Tarih/Saat | İşlem zamanı (GG.AA.YYYY SS:DD:SS) |
| Kullanıcı | İşlemi yapan (ad + rol etiketi) |
| İşlem | Eylem tipi etiketi: 🟢 CREATE, 🟡 UPDATE, 🔴 DELETE |
| Modül | Hangi modülde işlem yapıldığı |
| Kayıt ID | Etkilenen kaydın benzersiz ID'si |
| Değişiklik | Kaç alanın değiştirildiği (örn: "16 alan") |
| Detay | 👁️ ikonu — değişiklik geçmişini görüntüleme |

**Export**: CSV İndir butonu.

**Detay görünümü**: Bir kayda tıklandığında alan bazlı değişiklik geçmişi (eski değer → yeni değer).

---

## 9. Modül 5: Parsek Platform Katmanı (Abonelik, Destek, API)

### 9.1 Kaynak ekranlar

- `Parsek/Parsek-Mevcut Paketiniz-01.png` → `-05.png`
- `Parsek/Parsek-Destek Merkezi-01.png` → `-04.png`
- `Parsek/Parsek-Bilgi Merkezi.png`
- `Parsek/Parsek-API Dokumantasyonu-01.png` → `-07.png`
- `Parsek/Parsek-Davet Et & Kazan.png`

### 9.2 Modül amacı

SaaS ürününün platform işletme katmanı: abonelik/faturalama, destek talepleri, bilgi merkezi, API yönetimi ve referans sistemi. Ana planın §9.3'te P2 olarak tanımlanan abonelik/faturalama ve API entegrasyon pazarının karşılığıdır.

### 9.3 Abonelik ve Paket Yönetimi

**Kaynak**: `Parsek-Mevcut Paketiniz-01.png` → `-05.png`

Parsek'te görülen SaaS abonelik modeli:

**Mevcut Paket kartı**:
- Paket adı (deneme sürecinde "Unknown")
- Durum etiketi: "Deneme" (turuncu)
- Başlangıç, Bitiş, Ödeme Tutarı, Sonraki Ödeme tarihleri

**Birleşik Yenileme Sepeti**:
- **Birleşik Fatura Döngüsü** (toggle): Plan yenilendiğinde tüm eklentiler aynı tarihe çekilir.
- **Otomatik Yenileme** (toggle): Süresi bitince kayıtlı karttan otomatik tahsilat.
- **Periyot seçimi**: Aylık / Yıllık (%17 indirim).
- **Toplam tutar**: ₺0,00/ay (kalem sayısı).
- **Sepeti Öde** butonu.
- Bilgi notu: "Birleşik fatura aktif: Plan'ı yalnızca yenileseniz bile aktif eklentileriniz otomatik aynı bitiş tarihine çekilecek (kalan süreleri kısalmaz)."

**Deneme süresi bildirimi**:
- "Deneme süreniz aktif — tüm eklentiler ücretsiz açık."
- Kalan süre: 14 gün.
- "14 günlük deneme süreniz boyunca tüm ek özellikleri ücretsiz kullanabilirsiniz. Süre sonunda satın almadığınız eklentiler otomatik kapanacaktır."

**Modüler eklenti yapısı**:
Sistem "temel plan + modüler eklentiler" mantığıyla çalışır:
- Doküman Yönetimi
- Bakım & Arıza
- Üretim
- Poz Listesi
- Lastik Yönetimi
- İSG / İş Güvenliği
- Arvento Filo Takip
- İhale Yönetimi

**NOA uyarlaması**:
- Temel plan: P0 çekirdek modüller.
- Eklentiler: P1/P2 modülleri.
- 14 günlük deneme süreci.
- Aylık/yıllık faturalama.
- Otomatik yenileme ve birleşik fatura.

### 9.4 Destek Merkezi

**Kaynak**: `Parsek-Destek Merkezi-01.png` → `-04.png`

**İstatistik kartları**:
- Toplam Talepler
- Açık/İşlemde
- Çözüldü
- Kapatıldı

**Filtreler**:
- Arama: "Talep ara..."
- Durum: "Aktif Talepler" (varsayılan)
- Tür: "Tüm Türler"

**Aksiyon**: `+ Yeni Talep` (mavi buton)

**Boş durum**: "Henüz talep bulunmuyor — İlk destek talebinizi oluşturun ve ekibimiz size yardımcı olsun"

**Talep yaşam döngüsü**: Açık → İşlemde → Çözüldü → Kapatıldı

### 9.5 Bilgi Merkezi

**Kaynak**: `Parsek-Bilgi Merkezi.png`

**Kategori filtreleri**:
- Tümü
- Duyurular
- Bakım (planlı kesintiler)
- Güncellemeler (yeni özellikler)
- Haberler (sektörel)

**İçerik kartları** (örnek):
- "Yeni: Parsek İhale Yönetimi modülü yayında!" — YENİ etiketi
- "Yeni: Parsek İSG / İş Güvenliği modülü yayında!" — YENİ etiketi
- "YENİ: Ürün Yönetimi & Pazaryeri Entegrasyonu!" — YENİ etiketi
- "Yeni Eklenti: Arvento Filo Takip" — YENİ etiketi

Her kartta: başlık, açıklama, kategori etiketi, tarih, "Parsek Duyurusu" imzası.

### 9.6 API Dokümantasyonu

**Kaynak**: `Parsek-API Dokumantasyonu-01.png` → `-07.png`

**Sekmeler**:
- **API Kataloğu**: Mevcut API servislerinin listesi.
- **API Anahtarları**: Kimlik doğrulama anahtarlarının yönetimi.

**Mevcut API kategorileri**:
- **e-Fatura / e-Arşiv API**: 7 endpoint — fatura oluşturma, gönderme, sorgulama, iptal.

**NOA'ya eklenecek API kategorileri**:
- Cari Hesap API (müşteri/tedarikçi/taşeron CRUD).
- Fatura API (alış/satış/hakediş oluşturma ve sorgulama).
- Stok API (stok hareketi, depo durumu).
- Proje/Şantiye API.
- Rapor API (rapor sorgulama ve dışa aktarma).
- Webhook: olay bildirimleri (fatura durumu değişti, ödeme alındı vb.).

**Teknik yapı**:
- REST API, JSON format.
- Bearer Token (API Key) ile kimlik doğrulama.
- Rate limiting (günlük/dakikalık istek limiti).

### 9.7 Davet Et & Kazan

**Kaynak**: `Parsek-Davet Et & Kazan.png`

Referans sistemi: mevcut kullanıcı yeni kullanıcı davet eder, davet edilen kullanıcı üye olursa her iki taraf da ödül/indirim kazanır.

### 9.8 Veri modeli

- `Subscription`: Abonelik kaydı (plan, periyot, başlangıç, bitiş, durum).
- `SubscriptionAddon`: Eklenti kaydı (abonelik, modül adı, fiyat, periyot).
- `SupportTicket`: Destek talebi (konu, açıklama, durum, tür, öncelik).
- `SupportTicketMessage`: Talep mesajlaşması.
- `Announcement`: Bilgi merkezi duyurusu (başlık, içerik, kategori, tarih).
- `ApiKey`: API anahtarı (anahtar, ad, scope, son kullanma, rate limit).
- `Referral`: Davet kaydı (davet eden, davet edilen, ödül durumu).

---

## 10. Modül 6: İSG / İş Güvenliği

### 10.1 Kaynak

- Bilgi Merkezi duyurusu: "Yeni: Parsek İSG / İş Güvenliği modülü yayında!" (25.06.2026)
- Ana plan §8.6: `günlük_isg_kontrol_listesi_mobil.html` (P2)

### 10.2 Modül amacı

İş güvenliği süreçlerinin yasal mevzuata uygun yönetimi: iş kazaları, eğitim takibi, saha denetimi, KKD (Kişisel Koruyucu Donanım) zimmeti.

### 10.3 Alt modüller

#### İş Kazası Kaydı
- Kaza tarihi, saati, lokasyonu.
- Etkilenen personel.
- Kaza türü (yaralanma, mal hasarı, near-miss).
- Şiddet seviyesi.
- Olay açıklaması.
- Tanık bilgileri.
- Görsel/fotoğraf eki.
- SGK bildirim durumu.
- Düzeltici/önleyici faaliyet (CAPA).

#### İş Güvenliği Eğitimi Takibi
- Eğitim adı, türü (işbaşı, periyodik, özel).
- Eğitim veren.
- Katılımcı listesi (personel bazında).
- Tarih, süre.
- Katılım belgesi.
- Sonraki eğitim tarihi (hatırlatma).

#### Saha Denetimi
- Denetim tarihi, denetleyen.
- Şantiye/lokasyon.
- Denetim checklist (kategori bazlı).
- Bulgu kaydı (uygunsuzluk, gözlem, iyileştirme).
- Risk seviyesi.
- Aksiyon planı ve sorumlu.
- Kapanış tarihi.

#### KKD Zimmeti
- KKD tipi (baret, yelek, eldiven, gözlük, çelik burun ayakkabı vb.).
- Personel bazında zimmet kaydı.
- Teslim tarihi, iade tarihi.
- Durum: zimmetli, iade edildi, kayıp, kullanılamaz.

### 10.4 Mobil kullanım

İSG modülü sahada mobil kullanım için kritiktir:
- Günlük İSG kontrol listesi (mobil).
- Saha fotoğrafı çekme ve kayda ekleme.
- Çevrimdışı mod (offline kayıt, online senkron).

### 10.5 Entegrasyon

- Personel modülüyle: tüm personelin İSG eğitimi durumu.
- Şantiye modülüyle: şantiye bazlı İSG performansı.
- Döküman Yönetimi ile: eğitim belgeleri, kaza raporları.
- Bildirimler: eğitim yenileme hatırlatması, KKD zimmet süresi dolan personel.

### 10.6 Veri modeli

- `WorkAccident`: İş kazası kaydı.
- `SafetyTraining`: İş güvenliği eğitimi.
- `SafetyTrainingAttendance`: Eğitim katılımı (eğitim-personel).
- `SafetyInspection`: Saha denetimi.
- `SafetyFinding`: Denetim bulgusu.
- `PPEIssuance`: KKD zimmeti.

---

## 11. Modül 7: Araç ve Filo Yönetimi (Arvento Entegrasyonu)

### 11.1 Kaynak ekranlar

- `Ayarlar/Ayarlar-Arvento Filo Takip-01.png`, `-02.png`

### 11.2 Modül amacı

Şirket araçlarının ve iş makinelerinin operasyonel yönetimi: konum takibi, kilometre/puantaj, yakıt takibi, bakım yönetimi. Arvento GPS sistemi ile entegre çalışır.

### 11.3 Arvento entegrasyon ayarları

**Kaynak**: `Ayarlar-Arvento Filo Takip-01.png`

#### Bölüm 1: Arvento Web Servis Bilgileri (API Bağlantısı)

| Alan | Tür | Açıklama |
| --- | --- | --- |
| Kullanıcı Adı (Username) | Metin | Arvento portal kullanıcı adı |
| PIN1 | Şifre | Birincil güvenlik kodu |
| PIN2 | Şifre | İkincil güvenlik kodu |
| Yenileme Aralığı | Dropdown | Veri çekme sıklığı (varsayılan: 10 dakika) |
| Özel Endpoint (opsiyonel) | URL | Varsayılan: `https://ws.arvento.com/v1/report.asmx` |

- Protokol: SOAP Web Service (.asmx).
- Kimlik doğrulama: Username + PIN1 + PIN2.
- `Bağlantıyı Test Et` butonu.

#### Bölüm 2: Takip & Entegrasyon Ayarları

| Ayar | Tür | Açıklama |
| --- | --- | --- |
| Takibi Aktifleştir | Toggle | Master switch — tüm senkronizasyonu açar/kapatır |
| Otomatik Puantaj (KM/Saat) | Toggle | GPS kilometre/motor saati verisi günlük puantaja işlenir; KM-eşikli bakım uyarılarını besler |
| Otomatik Yakıt Takibi (CANbus/OBD) | Toggle | Canlı yakıt seviyesi; dolumlar otomatik yakıt kaydına, ani düşüşler hırsızlık alarmına dönüşür |
| Simülasyon Modu | Toggle | Gerçek bağlantı olmadan test amaçlı sahte veri |

### 11.4 Araç kartı

Ana veri alanları:
- Plaka, araç tipi (kamyon, kamyonet, ekskavatör, forklift, vinç vb.).
- Marka, model, yıl.
- Ruhsat no, Trafik sigortası, Kasko.
- Muayene tarihi, sonraki muayene.
- Bağlı şantiye/proje.
- Bağlı taşeron (varsa).
- Sürücü ataması.
- Yakıt tipi, depo kapasitesi.
- KM sayaç, motor saati sayaç.
- Arvento cihaz ID (entegre ise).

### 11.5 Yakıt takibi

- Manuel yakıt girişi (tarih, litre, tutar, istasyon).
- Otomatik yakıt girişi (CANbus/OBD sensöründen — entegre araçlar için).
- Yakıt verimlilik raporu (L/100km, km/L).
- Hırsızlık alarmı (ani düşüş tespiti).

### 11.6 Bakım yönetimi

- Bakım tipi: periyodik, arıza, hasar.
- KM-eşikli bakım planı (her X km'de bakım).
- Tarih bazlı bakım planı (her X ayda bakım).
- Bakım kaydı: tarih,KM, açıklama, maliyet, parça listesi, servis.
- Bakım uyarısı: yaklaşan bakım (dashboard + bildirim).
- Lastik yönetimi: lastik değişimi, aşınma takibi, mevsimlik değişim.

### 11.7 Filo dashboard

- Toplam araç sayısı (tip bazında).
- Aktif/arızalı/bakımda araç sayısı.
- Yaklaşan bakımlar.
- Yakıt maliyeti özeti (dönem bazlı).
- Araç kullanım oranı.
- Muayene yaklaşıyor uyarıları.

### 11.8 Finansal bağlantı

- Araç giderleri (yakıt, bakım, sigorta, muayene) → hareket grubu → şantiye maliyetine yansır.
- Araç maliyetleri → cari hesap (taşeron/ekipman).
- Bakım maliyeti → ilgili şantiye gideri.

### 11.9 Veri modeli

- `Vehicle`: Araç kartı.
- `VehicleAssignment`: Araç-sürücü-şantiye ataması.
- `FuelRecord`: Yakıt kaydı (manuel/otomatik).
- `MaintenanceRecord`: Bakım kaydı.
- `MaintenancePlan`: Bakım planı (periyodik).
- `TireRecord`: Lastik değişim kaydı.
- `ArventoSyncLog`: Arvento senkronizasyon logu.

---

## 12. Modül 8: Banka Entegrasyonu (Open Banking)

### 12.1 Kaynak ekranlar

- `Ayarlar/Ayarlar-Banka Entegrasyonu.png`

### 12.2 Modül amacı

Banka hesaplarını sistemle bağlamak, banka hareketlerini çekmek ve cari hesaplarla otomatik eşleştirmek. Türkiye Open Banking altyapısı (consentId) ile çalışır.

### 12.3 Sekmeler

#### Sekme 1: Bağlantı & Hesaplar

**Desteklenen bankalar**:

| Banka | Durum |
| --- | --- |
| VakıfBank | Hazır |
| İş Bankası | Hazır |
| QNB Finansbank | Hazır |
| Akbank | Hazır |
| Yapı Kredi | Hazır |
| Ziraat Bankası | Yakında |
| Garanti BBVA | Hazır |

**Bağlantı ayarları**:

| Alan | Açıklama |
| --- | --- |
| Rıza Numarası (consentId) | Bankadan alınan erişim rızası numarası. Sandbox dahil zorunlu. |
| Ortam (Environment) | Sandbox (Test) veya Production (Canlı) |
| Entegrasyonu etkinleştir | Checkbox |
| Otomatik cari eşleştirme | Checkbox (varsayılan: açık) |

**Aksiyonlar**: `Kaydet`, `Bağlantıyı Test Et`

**Hesap özeti & senkron**:
- "Henüz senkronize edilmiş hesap yok" (boş durum).
- Tarih filtreleri: Başlangıç (opsiyonel), Bitiş (opsiyonel).
- `Şimdi Senkronize Et` butonu.

#### Sekme 2: Hareketler & Eşleştirme

- Çekilen banka hareketleri listesi.
- Otomatik eşleştirme: banka hareketi → cari hesap hareketi.
- Manuel eşleştirme: eşleşmeyen hareketleri kullanıcı bağlar.
- Eşleşme durumu: Eşleşti, Bekliyor, Eşleşmedi.

### 12.4 Senkronizasyon akışı

```
Kullanıcı → Bankadan Rıza No alır → Sisteme girer
         → Ortam seçer (Sandbox/Prod)
         → Bağlantıyı Test Et → Doğrulama
         → Şimdi Senkronize Et → Hesapları ve hareketleri çeker
         → Hareketleri cari ile eşleştirir (otomatik/manuel)
```

### 12.5 Finansal bağlantı

- Çekilen banka hareketleri `CashBankTransaction` olarak kaydedilir.
- Eşleşen hareketler ilgili cari hesap hareketiyle bağlanır.
- Eşleşmeyen hareketler "bekleyen" olarak kalır, kullanıcı manuel eşler.
- Senkronizasyon audit log'a yazılır.

### 12.6 Güvenlik

- Rıza numarası şifreli saklanır.
- Banka API'sine erişim sadece backend'den yapılır (frontend'den değil).
- consentId süre dolumu takip edilir, süresi dolan rıza yenilenir.
- Tüm senkronizasyon işlemleri audit log'a yazılır.

### 12.7 Veri modeli

- `BankIntegration`: Banka bağlantı kaydı (banka, consentId, ortam, durum).
- `BankAccount`: Senkronize edilmiş banka hesabı.
- `BankTransaction`: Çekilen banka hareketi (tutar, açıklama, tarih, eşleşme durumu).
- `BankReconciliation`: Eşleştirme kaydı (banka hareketi ↔ sistem hareketi).

---

## 13. Modül 9: Personel ve İK Yönetimi (Genişletilmiş)

### 13.1 Kaynak ekranlar

- `Ayarlar/Ayarlar-Kullanıcı Yönetimi-01.png` → `-03.png`
- `Ayarlar/Ayarlar-Rol Yönetimi-01.png` → `-15.png`
- Ana plan §6.3 (Personel P0) temel alınır, Parsek'in genişletilmiş İK yetenekleri eklenir.

### 13.2 Modül amacı

Ana plandaki Personel modülü (§6.3) puantaj, maaş tahakkuku ve cari hesap bağlamıyla P0 çekirdeğinde tanımlıdır. Bu bölümde Parsek'ten gelen **genişletilmiş İK yetenekleri** tanımlanır:

### 13.3 Personel kartı (genişletilmiş)

Ana plan §6.3'teki alanlara ek olarak:

- **SGK bilgileri**: SGK işveren sicil no, SGK çalışan no, SGK giriş tarihi.
- **İş sözleşmesi**: İşe başlama, deneme süresi, sözleşme tipi (belirli/belirsiz süreli), çalışma şekli (tam zamanlı, yarı zamanlı, mevsimlik).
- **Bölüm/görev**: Bağlı olduğu bölüm, görev unvanı, yönetici.
- **İzin yönetimi**: Yıllık izin bakiyesi, kullanılan izin, kalan izin.
- **Disiplin kaydı**: Uyarı, ihtar, disiplin cezası.
- **Eğitim kayılları**: Tamamlanan eğitimler, İSG eğitimleri (Modül 6 bağlantısı).
- **Zimmet**: Personel'e zimmetlenen araç, ekipman, KKD (Modül 6, 7 bağlantısı).

### 13.4 İzin yönetimi

**Kaynak**: Parsek İSG/İK bağlamı + Döküman Yönetimi "İzin Belgeleri" klasörü.

- İzin talebi oluşturma (personel → yönetici onayı).
- İzin türü: Yıllık izin, mazeret izni, hastalık izni, doğum izni, süt izni vb.
- Başlangıç-bitiş tarihi, gün sayısı.
- Onay akışı: talep → yönetici onayı → onaylandı/reddedildi.
- İzin belgesi yükleme (Döküman Yönetimi'ne bağlanır).
- Otomatik izin bakiyesi hesabı.

### 13.5 Avans yönetimi

**Kaynak**: Parsek bildirim ayarları "Avans Yönetimi" kategorisi.

- Personel avans talebi oluşturma.
- Talep: tutar, tarih, açıklama.
- Onay akışı: talep → yönetici → finans onayı → ödeme.
- Avans → personel cari hesabına borç olarak işlenir.
- Mahsup: maaş tahakkukunda avans düşülür.
- Finansal bağlantı: kasa/banka ödeme hareketi + personel cari hareketi.

### 13.6 Transfer işlemleri

**Kaynak**: Parsek bildirim ayarları "Transfer İşlemleri" kategorisi.

- **Personel transferi**: personelin bir şantiyeden/diğerine taşınması.
- **Malzeme transferi**: şantiyeler arası stok taşıma.
- **Araç transferi**: aracın bir şantiyeden diğerine atanması.
- Her transfer kayıt altına alınır, ilgili modüllerde hareket üretir.
- Transfer onay akışı (yönetici onayı).

### 13.7 İK dashboard

- Toplam personel sayısı.
- Aktif/izinli/ayrılmış personel.
- Şantiye bazlı personel dağılımı.
- Yaklaşan izinler.
- Bekleyen avans talepleri.
- İSG eğitimi yaklaşıyor/eksik personel.
- Puantaj tamamlanmamış dönemler.

### 13.8 Veri modeli

Ana plan `Employee` varlığına ek olarak:
- `EmployeeLeave`: İzin kaydı.
- `EmployeeLeaveBalance`: Yıllık izin bakiyesi.
- `AdvanceRequest`: Avans talebi.
- `EmployeeTransfer`: Transfer kaydı.
- `DisciplinaryRecord`: Disiplin kaydı.

---

## 14. Platform Standartlarına Uyumluluk

### 14.1 Liste standardı (yeni modüller için)

Ana plan §7.1 liste standardı tüm yeni modüllerde uygulanır. Parsek'ten gelen ek standartlar:

- **KPI özet kartları**: Liste üstünde durum bazlı özet kartları (örn: İhale'de 7 durum kartı, Destek'te 4 durum kartı).
- **Çoklu alanda arama**: "Ara... (N alan)" yapısı — her modülde kaç alanda arama yapılacağı belirtilir.
- **İçe Aktar butonu**: Her liste ekranında Excel ile toplu veri yükleme özelliği.
- **Zaman filtresi**: Dashboard'larda Bugün/Bu Hafta/Bu Ay/Bu Yıl seçimi.
- **Boş durum tasarımı**: Veri yokken anlamlı bir boş durum mesajı + ilk adım aksiyon butonu.

### 14.2 Form standardı (yeni modüller için)

Ana plan §7.2 form standardına ek olarak:

- **Sekmeli form yapısı**: Parsek'te İhale formunda görülen 3 sekmeli yapı (Genel & Takvim, Maliyet & Teklif, BOQ/Poz) karmaşık formlarda kullanılır.
- **Otomatik hesaplama paneli**: Finansal formlarda salt okunur hesaplama alanları (kârlılık simülasyonu, toplam maliyet vb.).
- **İpucu/yardım metni**: Form içinde bilgilendirici ipuçları (örn: "BOQ sekmesinde poz maliyetlerini girin...").
- **Dosya yükleme alanı**: Form içinde sürükle-bırak dosya yükleme.

### 14.3 Dashboard standardı

Yeni modüllerin dashboard'ları için ortak yapı:

- **Zaman filtresi**: Bugün, Bu Hafta, Bu Ay (varsayılan), Bu Yıl.
- **İstatistik kartları**: Modüle özgü KPI kartları (4-8 adet).
- **Grafikler**: En az 2 grafik (trend + dağılım).
- **Son kayıtlar tablosu**: En son eklenen/aktif kayıtlar.
- **Boş durum**: Veri yokken anlamlı mesaj.

### 14.4 Renk kodlama standardı

Parsek'te görülen renk kodlama tutarlılığı NOA'ya uyarlanır:

| Renk | Anlam | Kullanım |
| --- | --- | --- |
| Turuncu | Ana/aktif vurgu | Aktif menü, toplam, birincil marka |
| Mavi | Taşeron / bilgi | Taşeron kartları, CREATE işlemi |
| Yeşil | Müşteri / başarı | Müşteri kartları, Aktif durum, onay |
| Mor | Tedarikçi / yasal | Tedarikçi kartları, sözleşme |
| Kırmızı | Uyarı / tehlike | Sil, DELETE işlemi, süre doldu, kritik |
| Amber | Bekleme | İşlemde, bekleyen onay |
| Gri | Nötr | Pasif durum, boş, genel |

---

## 15. Ekran Görüntüsü–Modül Eşleştirme Matrisi

Bu matris, Parsek-insaat klasöründeki her ekran görüntüsünün hangi yeni modüle atandığını gösterir.

### 15.1 Ayarlar (35 dosya)

| Ekran Görüntüsü | Modül | Kullanım |
| --- | --- | --- |
| `Ayarlar-Arvento Filo Takip-01.png` | Modül 7: Araç/Filo | API bağlantı ayarları |
| `Ayarlar-Arvento Filo Takip-02.png` | Modül 7: Araç/Filo | Takip ayarları detay |
| `Ayarlar-Banka Entegrasyonu.png` | Modül 8: Banka | Bağlantı ve hesap yönetimi |
| `Ayarlar-Bildirim Ayarlari-01.png` | Modül 4: Ayarlar | Bildirim kategorileri |
| `Ayarlar-Bildirim Ayarlari-02.png` | Modül 4: Ayarlar | Bildirim detayları |
| `Ayarlar-Bildirim Ayarlari-03.png` | Modül 4: Ayarlar | Bildirim detayları |
| `Ayarlar-Denetim Günlüğü-01.png` → `-08.png` (8 dosya) | Modül 4: Ayarlar | Audit log filtre/kolon/detay |
| `Ayarlar-Finans Ayarlari.png` | Modül 4: Ayarlar | Para birimi ve KDV ayarları |
| `Ayarlar-Firma Bilgileri-01.png` → `-03.png` (3 dosya) | Modül 4: Ayarlar | Firma profili ve lokasyon yönetimi |
| `Ayarlar-Kullanıcı Yönetimi-01.png` → `-03.png` (3 dosya) | Modül 4: Ayarlar / Modül 9: İK | Kullanıcı oluşturma/davet/yönetim |
| `Ayarlar-Rol Yönetimi-01.png` → `-15.png` (15 dosya) | Modül 4: Ayarlar | Rol kartları, yetki matrisi, izin yönetimi |

### 15.2 Döküman Yönetimi (6 dosya)

| Ekran Görüntüsü | Modül | Kullanım |
| --- | --- | --- |
| `Döküman Yönetimi-01.png` | Modül 3: Döküman | Izgara görünümü, sistem klasörleri |
| `Döküman Yönetimi-02.png` | Modül 3: Döküman | Liste görünümü, kolon yapısı |
| `Döküman Yönetimi-03.png` | Modül 3: Döküman | Klasör oluşturma, erişim yetkisi |
| `Döküman Yönetimi-04.png` | Modül 3: Döküman | Sürükle-bırak yükleme alanı |
| `Döküman Yönetimi-05.png` | Modül 3: Döküman | Ek detaylar |
| `Döküman Yönetimi-06.png` | Modül 3: Döküman | Ek detaylar |

### 15.3 Firmalar (17 dosya)

| Ekran Görüntüsü | Modül | Kullanım |
| --- | --- | --- |
| `Firmalar-Dashboard-01.png`, `-02.png` | Modül 1: Firmalar | Birleşik dashboard |
| `Firmalar-Müşteriler.png` | Modül 1: Firmalar | Müşteri liste |
| `Firmalar-Müşteriler-Yeni Müşteri-01.png` → `-03.png` | Modül 1: Firmalar | Müşteri form + Excel içe aktarma |
| `Firmalar-Taşeronlar.png` | Modül 1: Firmalar | Taşeron liste (sözleşme, personel, araç kolonları) |
| `Firmalar-Taşeronlar-Yeni Taşeron-01.png` → `-03.png` | Modül 1: Firmalar | Taşeron form + içe aktarma |
| `Firmalar-Tedarikçiler.png` | Modül 1: Firmalar | Tedarikçi liste (kategori kolonu) |
| `Firmalar-Tedarikçiler-Yeni Tedarikçi-01.png` → `-03.png` | Modül 1: Firmalar | Tedarikçi form + içe aktarma |
| `parsek_customers_sablon.xlsx` | Modül 1: Firmalar | Müşteri Excel şablonu |
| `parsek_subcontractors_sablon.xlsx` | Modül 1: Firmalar | Taşeron Excel şablonu |
| `parsek_vendors_sablon.xlsx` | Modül 1: Firmalar | Tedarikçi Excel şablonu |

### 15.4 İhale Yönetimi (5 dosya)

| Ekran Görüntüsü | Modül | Kullanım |
| --- | --- | --- |
| `İhale Yönetimi-01.png` | Modül 2: İhale | Dashboard/analiz panosu |
| `İhale Yönetimi-02.png` | Modül 2: İhale | Liste ekranı + KPI kartları |
| `İhale Yönetimi-Yeni ihale-01.png` | Modül 2: İhale | Form sekme 1: Genel & Takvim |
| `İhale Yönetimi-Yeni ihale-02.png` | Modül 2: İhale | Form sekme 2: Maliyet & Teklif (kârlılık simülasyonu) |
| `İhale Yönetimi-Yeni ihale-03.png` | Modül 2: İhale | Form sekme 3: BOQ/Poz grid |

### 15.5 Parsek (18 dosya)

| Ekran Görüntüsü | Modül | Kullanım |
| --- | --- | --- |
| `Parsek-API Dokumantasyonu-01.png` → `-07.png` (7 dosya) | Modül 5: Platform | API kataloğu ve anahtar yönetimi |
| `Parsek-Bilgi Merkezi.png` | Modül 5: Platform | Duyuru/güncelleme/haber akışı |
| `Parsek-Davet Et & Kazan.png` | Modül 5: Platform | Referans sistemi |
| `Parsek-Destek Merkezi-01.png` → `-04.png` (4 dosya) | Modül 5: Platform | Destek talebi (ticket) yönetimi |
| `Parsek-Mevcut Paketiniz-01.png` → `-05.png` (5 dosya) | Modül 5: Platform | Abonelik/faturalama/eklenti yönetimi |

---

## 16. Veri Modeli Genişletmeleri

### 16.1 İlke

Tüm yeni varlıklar ana planın §10.4 çok kiracılı yapısına uyar:
- `tenantId`, `companyId`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `deletedAt`/`status`.

### 16.2 Yeni varlıklar özeti

| Varlık | Modül | Açıklama |
| --- | --- | --- |
| `Customer` | 1 | Müşteri kartı |
| `PartyProfile` | 1 | Ortak adres/vergi/banka profili (opsiyonel) |
| `Tender` | 2 | İhale ana kaydı |
| `TenderLine` | 2 | BOQ/Poz satırı |
| `TenderStatusHistory` | 2 | İhale durum geçmişi |
| `TenderToProject` | 2 | İhaleden proje dönüşümü |
| `DocumentFile` | 3 | Dosya kaydı |
| `DocumentFolder` | 3 | Klasör kaydı |
| `DocumentLink` | 3 | Dosya-modül ilişkisi |
| `DocumentShare` | 3 | Paylaşım kaydı |
| `Subscription` | 5 | Abonelik kaydı |
| `SubscriptionAddon` | 5 | Eklenti kaydı |
| `SupportTicket` | 5 | Destek talebi |
| `SupportTicketMessage` | 5 | Talep mesajlaşması |
| `Announcement` | 5 | Duyuru kaydı |
| `ApiKey` | 5 | API anahtarı |
| `Referral` | 5 | Davet kaydı |
| `WorkAccident` | 6 | İş kazası kaydı |
| `SafetyTraining` | 6 | İSG eğitimi |
| `SafetyTrainingAttendance` | 6 | Eğitim katılımı |
| `SafetyInspection` | 6 | Saha denetimi |
| `SafetyFinding` | 6 | Denetim bulgusu |
| `PPEIssuance` | 6 | KKD zimmeti |
| `Vehicle` | 7 | Araç kartı |
| `VehicleAssignment` | 7 | Araç-sürücü-şantiye ataması |
| `FuelRecord` | 7 | Yakıt kaydı |
| `MaintenanceRecord` | 7 | Bakım kaydı |
| `MaintenancePlan` | 7 | Bakım planı |
| `TireRecord` | 7 | Lastik kaydı |
| `ArventoSyncLog` | 7 | Senkronizasyon logu |
| `BankIntegration` | 8 | Banka bağlantısı |
| `BankAccount` | 8 | Senkronize banka hesabı |
| `BankTransaction` | 8 | Banka hareketi |
| `BankReconciliation` | 8 | Eşleştirme kaydı |
| `EmployeeLeave` | 9 | İzin kaydı |
| `EmployeeLeaveBalance` | 9 | İzin bakiyesi |
| `AdvanceRequest` | 9 | Avans talebi |
| `EmployeeTransfer` | 9 | Transfer kaydı |
| `DisciplinaryRecord` | 9 | Disiplin kaydı |

### 16.3 Mevcut varlıklara eklenecek alanlar

| Varlık | Ek Alan | Modül |
| --- | --- | --- |
| `Supplier` | kategori, faaliyet alanı | 1 |
| `Subcontractor` | iş kolu, SGK sicil no, MERSİS, sözleşme başlangıç/bitiş | 1 |
| `Employee` | SGK no, sözleşme tipi, bölüm, yönetici | 9 |
| `Project` | tenderId (ihaleden geldiyse) | 2 |
| `CashBankAccount` | bankIntegrationId (entegre hesapsa) | 8 |

---

## 17. Öncelik ve Faz Planı

### 17.1 Faz tanımları

| Faz | İçerik | Zamanlama |
| --- | --- | --- |
| **P0** | Ana planın 12 haftalık çekirdeği | Ana plan |
| **P1-A** | Ayarlar genişletme + Döküman Yönetimi | P0 sonrası 4-6 hafta |
| **P1-B** | Firmalar Yönetimi + Personel/İK genişletme | P1-A ile paralel |
| **P1-C** | İhale Yönetimi | P1-B sonrası |
| **P2-A** | İSG + Araç/Filo (Arvento) | P1 sonrası |
| **P2-B** | Banka Entegrasyonu + Parsek Platform Katmanı | P2-A ile paralel |

### 17.2 P1 detayı

#### P1-A: Ayarlar Genişletme + Döküman Yönetimi

- Genişletilmiş Rol Yönetimi (yetki matrisi, modül bazlı izinler).
- Kullanıcı Davet Et akışı.
- Finans Ayarları (KDV, para birimi, çoklu döviz).
- Bildirim Ayarları (kategori bazlı, kanal seçimi).
- Denetim Günlüğü (filtre, CSV export, detay görünümü).
- Firma Bilgileri + Lokasyon Yönetimi.
- Döküman Yönetimi (klasörler, yükleme, sistem klasörleri, modül entegrasyonu).

**Gerekli P0 tamamlandı**: Auth, tenant/company/user/role altyapısı, S3 dosya saklama.

#### P1-B: Firmalar Yönetimi + Personel/İK

- Firmalar Dashboard (birleşik istatistikler).
- Müşteri liste/form (ana planın tedarikçi/taşeron kartlarıyla aynı standartta).
- Excel içe/dışa aktarma sihirbazı (3 adımlı).
- Tür bazlı farklılaştırma (taşeron sözleşme/personel/araç; tedarikçi kategori).
- Personel izin yönetimi (talep, onay, bakiye).
- Avans yönetimi (talep, onay, finansal etki).
- Transfer işlemleri (personel, malzeme, araç).

**Gerekli P0 tamamlandı**: Tanımlar, Personel, Taşeron, Tedarikçi, finansal hareket motoru.

#### P1-C: İhale Yönetimi

- İhale Dashboard (analiz panosu, 7 KPI kartı).
- İhale liste ekranı (KPI özetli liste).
- İhale form (3 sekme: Genel & Takvim, Maliyet & Teklif, BOQ/Poz).
- Kârlılık simülasyonu.
- Durum makinesi (Takip→Hazırlanıyor→Sunuldu→Kazanıldı/Kaybedildi/İptal).
- İhaleden projeye dönüşüm.

**Gerekli P0/P1-B tamamlandı**: Şantiye & Proje, tanımlar, finansal çekirdek.

### 17.3 P2 detayı

#### P2-A: İSG + Araç/Filo

- İSG modülü (iş kazası, eğitim, denetim, KKD zimmeti).
- Mobil İSG kontrol listesi.
- Araç kartı ve filo yönetimi.
- Arvento entegrasyonu (SOAP API, otomatik senkronizasyon).
- Yakıt takibi (manuel + CANbus).
- Bakım yönetimi (periyodik, KM-eşikli).
- Lastik yönetimi.

#### P2-B: Banka Entegrasyonu + Parsek Platform Katmanı

- Open Banking entegrasyonu (consentId, çoklu banka).
- Otomatik hareket çekme ve cari eşleştirme.
- Abonelik/faturalama (temel plan + eklenti modeli).
- Destek Merkezi (ticket sistemi).
- Bilgi Merkezi (duyuru/güncelleme akışı).
- API Dokümantasyonu (katalog + anahtar yönetimi).
- Davet Et & Kazan (referans sistemi).

---

## 18. Geliştirme Bağımlılık Haritası

### 18.1 Bağımlılık grafiği

```
P0 Çekirdek (Ana Plan 12 Hafta)
    │
    ├── P1-A: Ayarlar + Döküman
    │       ├── Bağımlılık: Auth, Tenant/Company, S3, Audit log
    │       └── Çıktı: Genişletilmiş sistem yönetimi + Belge yönetimi
    │
    ├── P1-B: Firmalar + İK
    │       ├── Bağımlılık: Tanımlar, Personel, Taşeron, Tedarikçi, Ledger
    │       └── Çıktı: Birleşik firma modülü + İK yetenekleri
    │
    └── P1-C: İhale
            ├── Bağımlılık: Şantiye & Proje (P1-B çıktısı), Tanımlar
            └── Çıktı: İhale yönetimi + Projeye dönüşüm

P1 tamamlandıktan sonra:

    ├── P2-A: İSG + Araç/Filo
    │       ├── Bağımlılık: Personel (P0), Döküman (P1-A), Şantiye (P0)
    │       ├── İSG: İK, Döküman, Şantiye, Mobil altyapı
    │       └── Araç: Arvento API, Şantiye, Kasa/Banka (gider), Bildirim (P1-A)
    │
    └── P2-B: Banka Ent. + Platform
            ├── Bağımlılık: Kasa/Banka (P0), Cari hesap (P0), Audit (P0/P1-A)
            ├── Banka: Open Banking API, Kasa/Banka, Cari
            └── Platform: Abonelik (yeni), API altyapısı (yeni)
```

### 18.2 Kritik yol

En uzun bağımlılık zinciri:

```
P0 (12 hafta) → P1-A (4-6 hafta) → P1-B (4-6 hafta) → P1-C (4-6 hafta) → P2-A (6-8 hafta) → P2-B (6-8 hafta)
```

P1 modülleri kısmen paralel yürütülebilir (P1-A ve P1-B bağımsızdır). P1-C hem P1-A hem P1-B'ye bağımlıdır.

---

## 19. Riskler ve Ürün Kararları

### 19.1 Yeni modül riskleri

| Risk | Etki | Önerilen önlem |
| --- | --- | --- |
| Parsek ekranlarını birebir kopyalayıp NOA kimliğini kaybetmek | Yüksek | Parsek referans olarak kullanılır, NOA tasarım dili önceliklidir |
| İhale modülünü çok erken başlatıp çekirdeği geciktirmek | Yüksek | İhale P1-C'de, P0 ve P1-B tamamlandıktan sonra |
| Arvento SOAP entegrasyonunun karmaşıklığı | Orta | Simülasyon modu ile test, bağlantı testi adımı |
| Open Banking consent sürelerinin dolması | Orta | Süre dolumu takibi, otomatik yenileme hatırlatması |
| Döküman Yönetimi depolama maliyetleri | Orta | Kota yönetimi, esnek genişletme fiyatlandırması |
| İSG mevzuatının değişmesi | Düşük | Sadece operasyonel kayıt, resmi beyan kapsam dışı |
| Banka API'lerinin farklı yapıları | Orta | Soyut banka adaptör katmanı, banka-banka implementasyon |
| Excel içe aktarmada veri kalitesi sorunları | Orta | Önizleme adımı, hata raporu, eşleştirme onayı |

### 19.2 Kesin ürün kararları

- Parsek ERP referans bir uygulamadır; görsel olarak değil, iş akışı olarak referans alınır.
- Müşteri, Taşeron ve Tedarikçi tek bir "Firmalar" modülü altında birleşir; finansal etkileri ayrı kalır.
- İhale modülü finansal hareket üretmez; kazanıldığında projeye dönüşür ve o noktada finansal çekirdek devreye girer.
- Döküman Yönetimi tüm modüllerle entegredir; hiçbir modül kendi dosya saklama sistemini kurmaz.
- Banka entegrasyonu opsiyoneldir; kullanıcı bağlamadan da manuel kasa/banka hareketleri çalışır.
- İSG modülü resmi SGK/İSG beyanları üretmez; operasyonel kayıt ve takip amaçlıdır.
- Araç/Filo modülü Arvento olmadan da manuel olarak çalışır; entegrasyon bir eklentidir.
- Abonelik/faturalama modüler eklenti modelini benimser; kullanıcı ihtiyaca göre modül ekler/çıkartır.
- API erişimi P2 sonunda açılır; erken fazlarda kapalı kalır.

---

## 20. Kabul Kriterleri

### 20.1 Genel kabul kriterleri (tüm yeni modüller için)

Her yeni modül aşağıdaki kriterleri karşılamalıdır:

- [ ] İlgili Parsek ekran görüntüsündeki iş akışı karşılandı mı?
- [ ] Mevcut P0 çekirdek finansal mantıkla tutarlı çalışıyor mu?
- [ ] Tenant/company izolasyonu var mı?
- [ ] Audit log her CRUD işlemi için yazılıyor mu?
- [ ] Rol/Yetki matrisine modül eklenmiş mi?
- [ ] Liste standartları (başlık, arama, filtre, export, yazdır) karşılandı mı?
- [ ] Form standartları (zorunlu alanlar, validasyon, kaydet/vazgeç) karşılandı mı?
- [ ] Boş durum (empty state) tasarımı var mı?
- [ ] Masaüstü ve mobil viewport test edildi mi?
- [ ] Örnek/demo veri kaldı mı?

### 20.2 Modül bazlı kabul kriterleri

#### Modül 1: Firmalar
- [ ] Müşteri, Taşeron ve Tedarikçi listeleri aynı standartta çalışıyor.
- [ ] Birleşik Dashboard 8 istatistik + 4 grafik gösteriyor.
- [ ] Excel içe aktarma sihirbazı 3 adımlı çalışıyor.
- [ ] Tür bazlı farklılaşmalar (sözleşme, personel, araç, kategori) doğru gösteriliyor.
- [ ] Cari ekstre ve hareket toplamları çekirdekten besleniyor.

#### Modül 2: İhale
- [ ] 3 sekme (Genel & Takvim, Maliyet & Teklif, BOQ/Poz) eksiksiz çalışıyor.
- [ ] Kârlılık simülasyonu otomatik hesaplanıyor.
- [ ] BOQ/Poz grid'inde malzeme/işçilik/ekipman/taşeron/nakliye maliyet kırılımı çalışıyor.
- [ ] 7 durum kartı doğru sayım yapıyor.
- [ ] İhaleden projeye dönüşüm akışı şantiye oluşturuyor.

#### Modül 3: Döküman Yönetimi
- [ ] 13 sistem klasörü otomatik oluşturuluyor.
- [ ] Sürükle-bırak ve tıklayarak yükleme çalışıyor.
- [ ] Izgara ve liste görünüm modları çalışıyor.
- [ ] Dosyalar ilgili modüllerden erişilebilir (fatura → belge, personel → belge).
- [ ] Depolama kotası doğru gösteriliyor.

#### Modül 4: Ayarlar (genişletilmiş)
- [ ] Rol yönetiminde modül bazlı yetki matrisi çalışıyor.
- [ ] Kullanıcı davet akışı e-posta gönderiyor.
- [ ] Denetim günlüğü filtre/tarih/CSV export çalışıyor.
- [ ] Finans ayarları KDV/para birimi varsayılanlarını uyguluyor.
- [ ] Bildirim ayarları kategori bazlı açma/kapama çalışıyor.

#### Modül 5: Parsek Platform
- [ ] Abonelik paket ve eklenti yönetimi çalışıyor.
- [ ] Destek talebi açma/takip/kapatma akışı çalışıyor.
- [ ] Bilgi merkezi duyuru akışı kategorize gösteriliyor.
- [ ] API anahtarı oluşturma ve rate limiting çalışıyor.

#### Modül 6: İSG
- [ ] İş kazası kaydı açılıp SGK bildirim durumu takip ediliyor.
- [ ] Eğitim takibinde personel bazlı katılım kaydediliyor.
- [ ] Saha denetiminde bulgu ve aksiyon planı çalışıyor.
- [ ] KKD zimmeti personel bazında takip ediliyor.

#### Modül 7: Araç/Filo
- [ ] Arvento bağlantısı kuruluyor ve test ediliyor.
- [ ] Otomatik KM/saat puantaja işleniyor.
- [ ] Yakıt kayıtları (manuel + otomatik) çalışıyor.
- [ ] Bakım planı ve KM-eşikli uyarı çalışıyor.
- [ ] Araç giderleri şantiye maliyetine yansıyor.

#### Modül 8: Banka Entegrasyonu
- [ ] En az bir bankada sandbox bağlantısı kuruluyor.
- [ ] Hesaplar senkronize ediliyor.
- [ ] Hareketler çekiliyor ve cari eşleştirme yapılıyor.
- [ ] Eşleşmeyen hareketler manuel eşleştirilebiliyor.
- [ ] Tüm senkronizasyon audit log'a yazılıyor.

#### Modül 9: Personel/İK (genişletilmiş)
- [ ] İzin talebi ve onay akışı çalışıyor.
- [ ] İzin bakiyesi otomatik hesaplanıyor.
- [ ] Avans talebi onay sonrası personel cari hesaba borç işliyor.
- [ ] Transfer işlemleri ilgili modüllerde hareket üretiyor.
- [ ] İK dashboard şantiye bazlı personel dağılımı gösteriyor.

---

## 21. Sonuç

Bu belge, Parsek ERP ekran görüntülerinden ve ürün bağlamından çıkarılan **9 yeni modülü** detaylı şekilde tanımlar. Her modül:

- Kaynak ekran görüntülerine bağlanmıştır.
- Mevcut P0 çekirdekle uyum kuralları belirlenmiştir.
- Veri modeli genişletmeleri tanımlanmıştır.
- Faz önceliği ve bağımlılıkları çizilmiştir.
- Kabul kriterleri netleştirilmiştir.

Ana plan olduğu gibi korunur; bu belge onun üstüne **ek** olarak geliştirilecek yeni modülleri yönetir. Ürün, P0 çekirdeğin sağladığı finansal hareket altyapısının üstüne, Parsek'ten ilham alan modern SaaS yetenekleriyle büyür.

**Kritik hatırlatmalar:**

1. Parsek ERP referans bir uygulamadır; görsel değil, iş akışı olarak referans alınır.
2. Hiçbir yeni modül, P0 çekirdeğin finansal tutarlılığını bozmaz.
3. Tüm yeni modüller aynı tasarım dili, aynı liste/form/grid standardını kullanır.
4. Ekran görüntüleri yalnızca yeni modüller kapsamında uygulanır; P0 çekirdek ekranları ana planın kaynaklarına bağlı kalır.
5. Geliştirme acele edilmeden, bağımlılık sırasına göre, her modülün kabul kriterleri karşılanarak ilerler.