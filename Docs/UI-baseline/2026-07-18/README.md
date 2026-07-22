# Faz 0 — Mevcut UI Görsel Baseline

Tarih: 18.07.2026

Kaynak checkpoint: `af42701aa764adccb818f84fde42bccf5d3cfe93`

Branch: `main`

Uzak branch: `origin/main`

Oturum: `muhasebe@noa.local` demo hesabı

Çalıştırma biçimi: Next.js 16.2.9 production build + `next start`

## Amaç

Bu klasör, HTML şablon dönüşümünden önce mevcut uygulamanın görsel durumunu kaydeder. Sonraki pilot dilimlerde aynı route ve viewport'lar “before/after” karşılaştırması için kullanılacaktır.

## Kaydedilen yüzeyler

| Dosya | Route | Görünüm | SHA-256 |
|---|---|---|---|
| `dashboard-desktop-before.jpg` | `/` | 1440 × 1000, full page | `A984FF389773A7BDA9AC8ED44F5C8639B52FBA2976F2C249E22B27FB8E55F30F` |
| `dashboard-mobile-before.jpg` | `/` | 390 × 844, full page | `381FD1786C6EE020DCC87BEB1D5C2B976C32BD11223E5556E4949CB28F1B2FE0` |
| `dashboard-mobile-viewport-before.jpg` | `/` | 390 × 844, viewport | `B2F0FB84BC14D9A6EDB00EB665210256A08F3F3F6D703C9BE81196BAECCC03EB` |
| `musteriler-desktop-before.jpg` | `/musteriler` | 1440 × 1000, full page | `DBCF01CF84AF73ED1AAA517F337BEB87175BADB880174C83570C9E2F6F00C3DE` |
| `ihale-yonetimi-desktop-before.jpg` | `/ihale-yonetimi` | 1440 × 1000, full page | `0CFFA39B8C3D2FB7DAED4A5B007FBD281BA9B02265A4ED74EA25E6F3C63276C8` |
| `kasa-banka-desktop-before.jpg` | `/kasa-banka` | 1440 × 1000, full page | `88A6CBC75C424FB0FF0013875E38C273350A897E7B302C58F7F7459DE9A29B9C` |
| `hakedis-desktop-before.jpg` | `/hakedis` | 1440 × 1000, full page | `449856BF321932A9386601D8496C97501167F42E0C54A4F6107E0F76F192D07C` |

## Teknik doğrulama

- Dashboard başlığı ve gerçek demo verisi desktop ve mobilde render edildi.
- Müşteriler, İhale Yönetimi, Kasa/Banka ve Hakediş route'ları kimlik doğrulanmış oturumla açıldı.
- 390 px Dashboard DOM ölçümünde `scrollWidth=390`, `clientWidth=390`; yatay taşma saptanmadı.
- Bu kayıt sırasında mutasyon aksiyonu çalıştırılmadı ve uygulama verisi değiştirilmedi.

## Kullanım kuralı

- Bu dosyalar eski tasarımı koruma hedefi değildir; regresyon ve görsel ilerleme kanıtıdır.
- Pilot sonrası görüntüler aynı klasör yapısında `*-after.jpg` adıyla tutulmalıdır.
- “After” görüntüsü alınmadan önce ilgili route'un hedefli testleri ve tam kalite kapıları geçmelidir.

## Faz 3 — AppShell v2 Dashboard Pilotu

Gerçek `demo-accounting` oturumuyla Dashboard route'unda yalnız shell dönüşümü uygulanmış, Dashboard içerik surface'i değiştirilmemiştir.

| Dosya | Görünüm | SHA-256 |
|---|---|---|
| `phase-3/dashboard-shell-v2-desktop-1440.png` | 1440 × 1000, viewport | `31EE5FD33BA0974CECD5F1A091DEE347BD57C20736E94820223F67A7A73BB605` |
| `phase-3/dashboard-shell-v2-mobile-390.png` | 390 × 844, viewport | `A855041F24E7B67DE00BC75D6B30135C5CC16559EB17B74CE65E1C8179015A96` |
| `phase-3/dashboard-shell-v2-mobile-drawer-390.png` | 390 × 844, drawer açık | `23F18A5E564E96D6CBB117A7C5036FE4025F0E1DFD725ED6A4B7BFC234E50BA0` |

Teknik kabul:

- `data-shell-variant="v2-dashboard-pilot"` yalnız `/` route'unda doğrulandı.
- Desktop navigasyonda 22 gerçek route ve aktif Dashboard için `aria-current="page"` var.
- Global arama input'u bulunmuyor.
- Desktop ve mobilde `scrollWidth - clientWidth = 0`.
- Açık mobil drawer 844 px viewport yüksekliğini kaplıyor; açılış odağı `Menüyü kapat` düğmesinde.
- Görsel kayıt sırasında mutasyon aksiyonu çalıştırılmadı ve uygulama verisi değiştirilmedi.

## Faz 4 — Dashboard İçerik Pilotu

Gerçek `demo-accounting` oturumuyla Dashboard içeriği Template Standard v1 ve
`noa_i_n_aat_dashboard.html` kompozisyonuna taşındı. Şablondaki statik
projeksiyon değerleri kullanılmadı; dönem filtresi, yönetici kartları ve finansal
akış grafiği mevcut Raporlar servisinin kesinleşmiş verileriyle çalışır.

| Dosya | Görünüm | SHA-256 |
|---|---|---|
| `phase-4/dashboard/dashboard-pilot-desktop-1440.png` | 1440 × 1200, viewport | `FFAF7007E30ACBCFC3F1E9739F5B5D5D399F46D27EEC30CA20FF276BE789E45A` |
| `phase-4/dashboard/dashboard-pilot-mobile-390.png` | 390 × 1200, üst viewport | `982E8B51865E3A8F2BDAE8B037D8A1DD9848D5FE1A1B11FFDC9F3520CF7DD44A` |
| `phase-4/dashboard/dashboard-pilot-mobile-flow-390.png` | 390 × 1200, akış/ihale viewport | `E447708CD220CA370A4B3CCEDF71277FE42A1BF98243F6877C07C0BA22129C0` |

Teknik kabul:

- Desktop ve mobilde tek `h1`, dört yönetici kartı, altı ortak `Panel` yüzeyi ve
  aktif `Bu Ay` dönem filtresi doğrulandı.
- Desktop finansal akış genişliği 726,66 px; mobilde 356 px olarak ölçüldü.
- 1440 px ve 390 px viewport'larda `scrollWidth - clientWidth = 0`.
- Rapor yazdırma, gerçek route bağlantıları, ihale uyarıları, firma analitiği ve
  son hareket veri sözleşmeleri korunmuştur.
- Görsel kayıt sırasında mutasyon aksiyonu çalıştırılmadı ve uygulama verisi
  değiştirilmedi.

## Faz 4 — Müşteriler İçerik Pilotu

Dashboard görsel kabulünün ardından gerçek `demo-accounting` oturumuyla
`/musteriler` route'u AppShell v2 ve Template Standard v1'e taşındı. Statik
şablon verisi eklenmedi; cari kart, tahsilat/ödeme ve ekstre akışları mevcut
gerçek servis/action sözleşmeleriyle çalışmaya devam eder.

| Dosya | Görünüm | SHA-256 |
|---|---|---|
| `phase-4/customers/customers-pilot-desktop-1440.png` | 1440 × 1200, liste ve cari hareket | `65144F8E4AA1661CFA0F15BAD8EB17844305A296DCD31BF6FB03541DF0BCABD1` |
| `phase-4/customers/customers-pilot-create-panel-1440.png` | 1440 × 1200, yeni müşteri paneli açık | `479D8C5E12A8D74C22B7A1B09270179A66103485D1C3D04C06A22111695816AE` |
| `phase-4/customers/customers-pilot-statement-1440.png` | 1440 × 1200, hesap ekstresi | `06CFC388F529FA34BA4FF00F1D171D1952154DA6C9D8FF54806A1615146EBA7F` |
| `phase-4/customers/customers-pilot-mobile-390.png` | 390 × 1200, üst viewport | `070D13FE59D9F1600AC0BC8195285171B262A6261C819C5D519F755B8B0C2BA1` |
| `phase-4/customers/customers-pilot-mobile-list-390.png` | 390 × 1200, liste/cari/ekstre akışı | `2A735575248159C828190E6C66AE6AB654A4E0FC8058343598946329A120F718` |

Teknik kabul:

- `data-shell-variant="v2-customer-pilot"`, aktif Müşteriler route'u ve tek
  `h1` doğrulandı.
- Tümü/Aktif/Pasif filtresi gerçek satır sayılarını gösteriyor; masaüstünde üç
  müşteri ve seçili müşteriye ait iki ekstre hareketi render edildi.
- Yeni müşteri paneli gerçek React etkileşimiyle açıldı; kayıt gönderilmedi.
- 1440 px ve 390 px viewport'larda `scrollWidth - clientWidth = 0`; geniş veri
  tabloları belgeyi taşırmadan kendi kontrollü yatay alanında kalıyor.
- Görsel kayıt sırasında mutasyon aksiyonu çalıştırılmadı, veritabanı şeması ve
  uygulama verisi değiştirilmedi.

## Faz 4 — İhale Yönetimi İçerik Pilotu

Müşteriler görsel kabulünün ardından gerçek `demo-accounting` oturumuyla
`/ihale-yonetimi` route'u AppShell v2 ve Template Standard v1'e taşındı. Liste,
Kanban, analiz, üç sekmeli form, BOQ ve şantiye dönüşüm yüzeyleri mevcut gerçek
ihale kayıtlarını ve server action/service sözleşmelerini kullanır.

| Dosya | Görünüm | SHA-256 |
|---|---|---|
| `phase-4/tenders/tenders-pilot-desktop-list-1440.png` | 1440 × 1200, ihale listesi | `91F5B56F870AD80C5FEB14E22D4D8BF53E5BBABDFC8FF42D1B178C0A6A001084` |
| `phase-4/tenders/tenders-pilot-desktop-kanban-1440.png` | 1440 × 1200, altı durumlu Kanban | `C0F4FBBAE55F8468875FEF7005F6BEE787954FB906A1DBC8CA269196AAE7AC8F` |
| `phase-4/tenders/tenders-pilot-desktop-analysis-1440.png` | 1440 × 1200, analiz panosu | `BACAE41A4B0A99ACD45CE79983377047CD2AE3B9242FF84B671C2DFCA132F027` |
| `phase-4/tenders/tenders-pilot-desktop-form-1440.png` | 1440 × 1200, yeni ihale formu | `7BEEBC9A67E5216A40909C71D43F530F1E36D00847FA08F6BBB2B570DAAC5E32` |
| `phase-4/tenders/tenders-pilot-mobile-390.png` | 390 × 1200, üst viewport | `5EB23EC7145E5F7CE9E15DF789CA8AF8106F42C08B491CDAADA84B6A1DB4F96D` |
| `phase-4/tenders/tenders-pilot-mobile-list-390.png` | 390 × 1200, liste ve uyarı akışı | `A64861A14032FFDCF69EFBCFBBADDF32450D1E036D84ED6039D9E702C954DB02` |

Teknik kabul:

- `data-shell-variant="v2-tender-pilot"`, aktif İhale Yönetimi route'u, tek
  `h1` ve dört gerçek yönetici metriği doğrulandı.
- Liste, Kanban ve analiz aynı dört gerçek ihale kaydını kullanıyor; Kanban'da
  altı durum kolonu ve dört kart render edildi.
- Arama gerçek satırları filtreliyor; CSV çıktısı filtrelenmiş satır setinden
  üretiliyor ve Yazdır/PDF gerçek tarayıcı yazdırma akışını açıyor.
- Yeni ihale panelinde üç sekme ve Başlık alanına otomatik odak doğrulandı;
  kayıt gönderilmedi ve durum geçişi çalıştırılmadı.
- 1440 px ve 390 px viewport'larda `scrollWidth - clientWidth = 0`; geniş
  tablo ve Kanban kendi kontrollü yatay alanında kalıyor.
- Görseller production build üzerinden alındı; Prisma şeması, uygulama verisi
  ve özgün HTML şablonları değiştirilmedi.
