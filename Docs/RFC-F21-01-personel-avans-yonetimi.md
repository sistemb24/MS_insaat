# RFC-F21-01 — Personel Avans Yönetimi

> Durum: **Tamamlandı — beş uygulama dilimi ve kapanış kabulü geçti**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 13.3,
> 13.5, 13.7, 13.8 ve 17.2; mevcut `/personel`, `EntityRecord`, puantaj,
> bordro, Kasa/Banka, yevmiye ve merkezi audit sözleşmeleri

## 1. Amaç

NOA'nın mevcut personel, puantaj, bordro ve finans akışlarını bozmadan;
personel avans talebi, yönetici ve finans onayı, kontrollü ödeme, kalan alacak
takibi ve kesinleşmiş maaş avans kesintisiyle mahsup bağlantısı sağlayan
kalıcı bir dikey eklenir.

Bu faz kredi, maaş, vergi veya iş hukuku motoru değildir. Banka ödeme emri,
IBAN doğrulama, faiz, taksit planı, yasal kesinti limiti ve dış ödeme
sağlayıcısı varmış gibi davranılmaz.

## 2. Mevcut altyapıyla uyum

Çalışma mevcut `personel` `EntityRecord` kayıtlarını, `CashBankMovement`
hareketlerini ve kesinleşmiş `PayrollAccrualLine.advanceDeduction` değerlerini
yeniden kullanır. Personel kartı, puantaj veya bordro şeması taşınmaz ve
backfill edilmez.

| İhtiyaç | Faz 21 ilk karşılığı | Sınır |
|---|---|---|
| Personel | Mevcut aktif `personel` kaydı | Yeni `Employee` ana modeli yok. |
| Talep ve onay | Scoped `EmployeeAdvanceRequest` | Çalışan self-service hesabı yok. |
| Ödeme | Tek idempotent `CashBankMovement` ve kaynak bağlı yevmiye | Banka API'sine ödeme emri gönderilmez. |
| Personel alacağı | 135 Personel Avansları hesabındaki kaynak bağlı kayıt | Ayrı bir genel personel cari modülü kurulmaz. |
| Maaş mahsubu | Scoped `EmployeeAdvanceSettlement` ile mevcut kesinleşmiş bordro kesintisine tahsis | Bordro satırı otomatik değiştirilmez. |
| UI | `/personel` içinde Avans Yönetimi yüzeyi | Ayrı İK uygulaması veya ikinci AppShell yok. |

## 3. Önerilen varsayımlar

1. Faz 21 yalnız tenant içi **Personel Avans Yönetimi** dikeyidir. Banka
   ödeme emri, IBAN servisi, kredi/faiz, vergi, SGK, yasal kesinti limiti veya
   dış bordro/ödeme sağlayıcısı varmış gibi davranılmaz.
2. Her talep ve mahsup kaydı `tenantId + companyId + periodId` kapsamını taşır.
   Personel, bordro, kasa/banka hesabı ve işlem yapan kullanıcı aktif scope
   içinde yeniden doğrulanır; kapsam dışı kayıt okunamaz veya değiştirilemez.
3. Mevcut `personel` `EntityRecord`, `Timesheet`, `PayrollAccrual` ve
   `CashBankMovement` verileri korunur. Additive `EmployeeAdvanceRequest` ve
   `EmployeeAdvanceSettlement` modelleri eklenir; backfill veya mevcut JSON
   alanlarını dönüştürme yapılmaz.
4. İlk sürüm yalnız `TRY` avansı destekler. Talep ve finans onay tutarı
   sıfırdan büyük, iki ondalıklı ve finans onay tutarı talep tutarını aşmayacak
   şekilde doğrulanır. Kur farkı, dövizli avans, faiz ve taksit planı yoktur.
5. Yaşam döngüsü
   `DRAFT → SUBMITTED → MANAGER_APPROVED → FINANCE_APPROVED → PAID → SETTLED`
   biçiminde ileri ilerler. `SUBMITTED` veya `MANAGER_APPROVED` kayıt
   `REJECTED`; henüz ödenmemiş `FINANCE_APPROVED` kayıt `CANCELLED` olabilir.
   Fiziksel silme, yeniden açma, adım atlama ve ödeme sonrası iptal yoktur.
6. `admin` ve `accounting` taslak oluşturup düzenleyebilir ve gönderebilir;
   yalnız `admin` yönetici onayı/red, yalnız `accounting` finans
   onayı/red/iptal, ödeme ve mahsup yapar. `viewer` salt okunurdur.
   Personel–AppUser kimlik bağı bulunmadığı için çalışan self-service talebi
   ilk sürümde yoktur.
7. Ödeme, finans onay tutarının tamamı için aynı kapsamlı seçili kasa/banka
   hesabında tek `Avans Ödemesi` çıkışı üretir. Kaynak kimliği
   `employee-advance + talep id` ile idempotenttir; karşılığında 135 Personel
   Avansları borç ve seçili kasa/banka hesabı alacak yevmiye kaydı oluşturulur.
   Hareketlerden biri eksik kalırsa tekrar deneme eksik kardeşi tamamlar,
   ikinci finansal kayıt üretmez.
8. Maaş mahsubu bordro hesaplamasını değiştirmez. Muhasebe rolü yalnız
   kesinleşmiş ve aynı personeli içeren bir bordro satırındaki mevcut
   `advanceDeduction` tutarını avansa tahsis eder. Aynı bordro/personel
   kesintisine yapılan toplam tahsis kesintiyi, avans toplam tahsisi de kalan
   alacağı aşamaz. Bordro yevmiyesi 135 hesabını zaten kapattığı için tahsis
   ikinci kasa/banka veya yevmiye kaydı üretmez.
9. Oluşturma, gönderme, her onay/red/iptal, ödeme ve mahsup request key ile
   idempotent; revision kontrollü ve fail-closed'dur. Audit yalnız
   işlem/entity kimliği, personel kodu, güvenli tutar/durum ve finansal kaynak
   kimliklerini taşır; açıklama, ret gerekçesi, hesap adı/numarası veya request
   key taşımaz.
10. UI `/personel` içinde sayaçlar, arama, durum/tarih filtresi, talep/mahsup
    formları, bakiye görünümü ve `?advance=<id>` detay deep-link'i sağlar.
    Rol dışı mutation kontrolleri DOM'a eklenmez; boş/yükleniyor/hata, mobil,
    açık/koyu tema ve print standartları korunur. Otomatik bildirim üretilmez.

## 4. Veri ve finans yaşam döngüsü

| Durum | Değişebilir alanlar | Finans etkisi | İzinli işlem |
|---|---|---|---|
| `DRAFT` | Personel, tarih, tutar, kısa açıklama | Yok | Düzenle, gönder |
| `SUBMITTED` | Yok | Yok | Yönetici onayı veya red |
| `MANAGER_APPROVED` | Yok | Yok | Finans onayı veya red |
| `FINANCE_APPROVED` | Finans onay tutarı kilitli | Henüz yok | Öde veya iptal |
| `PAID` | Yok | Kasa/banka çıkışı ve 135 borç kaydı | Bordro mahsubu tahsis et |
| `SETTLED` | Yok | Mevcut bordro yevmiyesiyle bakiye kapanmıştır | Salt okunur |
| `REJECTED` / `CANCELLED` | Yok | Yok | Salt okunur |

`EmployeeAdvanceRequest`; talep ve onay tutarı, personel snapshot'ı, yaşam
döngüsü, revision, idempotency anahtarları, ödeme hareketi/yevmiye kaynak
bağları ve kalan tutarı taşır.

`EmployeeAdvanceSettlement`; avans, bordro tahakkuku, bordro satırı/personel,
mahsup tarihi ve tutarını append-only kaydeder. Bir avans birden çok bordroda,
bir bordro kesintisi de sınırları aşmadan birden çok avansa tahsis edilebilir.
Kalan tutar sıfıra ulaştığında talep atomik olarak `SETTLED` olur.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | DTO, durum/tutar, rol, geçiş, ödeme ve mahsup kararları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve Repository | Additive talep/mahsup modelleri, migration ve scoped repository | Backfill yok; optimistic revision ve transaction. |
| 3 — Server Action, Finans Bağlantısı ve Audit | Oturum/scope/rol/dönem guard'ları, idempotent ödeme/yevmiye, bordro tahsisi | Çift finansal kayıt ve içerik sızıntısı yok. |
| 4 — Personel Avans UI | Liste, form, filtre, bakiye ve detay deep-link'i | Mobil/tema/print ve rol DOM sınırı. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış admin/accounting/viewer, ödeme ve kısmi/tam mahsup kabulü | Önceki fazlar ve mevcut bordro hesabı değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem personel, talep, bordro, mahsup veya kasa/banka
  referansına erişemez.
- Viewer mutation yapamaz; accounting yönetici onayı, admin finans
  onayı/ödeme/mahsup yapamaz.
- Kapalı dönemde okuma sürer; tüm talep, onay, ödeme ve mahsup mutasyonları
  fail-closed reddedilir.
- Gönderilmiş talep düzenlenemez; yaşam döngüsü geri alınamaz veya atlanamaz.
- Aynı request key ikinci talep, geçiş, ödeme, yevmiye, mahsup veya audit
  üretmez.
- Ödeme finans onay tutarıyla birebir eşleşir ve yalnız bir kasa/banka çıkışı
  ile kaynak bağlı bir dengeli yevmiye oluşturur.
- Mahsup yalnız mevcut kesinleşmiş bordro avans kesintisini tahsis eder;
  bordro satırı, net ücret ve bordro yevmiyesi değiştirilmez.
- Kısmi mahsup kalan alacağı doğru azaltır; son mahsup talebi `SETTLED` yapar.
- Audit açıklama, ret gerekçesi, hesap ayrıntısı veya request key taşımaz.
- UI 390 px mobilde global taşma olmadan ve print-safe çalışır.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

Çalışan self-service portalı, AppUser–personel kimlik bağı, çok yöneticili
organizasyon şeması, otomatik e-posta/SMS/push, IBAN ve banka ödeme emri,
otomatik ödeme mutabakatı, kredi/faiz/taksit, döviz, yasal kesinti limiti,
otomatik puantaj/bordro satırı üretimi, bordro yeniden hesaplama, nakit iade,
avans devri, toplu avans, Excel içe aktarma ve dış İK/bordro sağlayıcısı bu
RFC'nin dışındadır.

## 8. Kuyruk kararı, uygulama onayı ve kapanış

Faz 13 Open Banking sağlayıcı/ürün ve resmi sandbox bilgisi hazır olana kadar
bekler. “Davet Et & Kazan” dikeyi de yeni tenant kayıt akışı ile gerçek
ödül/indirim politikası tanımlanana kadar ürün kararı kuyruğunda tutulur.

Kullanıcı 30.07.2026 tarihinde Bölüm 3'teki on varsayımı ve Faz 21'in tüm
dilimlerinin tekrar onay alınmadan tamamlanmasını onayladı.

- **Dilim 1 — Domain Çekirdeği:** Durum/tutar, rol, ileri yaşam döngüsü,
  ödeme/mahsup kapasitesi ve içeriksiz idempotency sözleşmesi tamamlandı.
- **Dilim 2 — Şema ve Repository:** Additive `EmployeeAdvanceRequest` ve
  `EmployeeAdvanceSettlement` modelleri,
  `20260731010000_add_employee_advance_management` migration'ı ve scoped,
  optimistic revision duyarlı repository tamamlandı. Backfill yapılmadı.
- **Dilim 3 — Server Action, Finans Bağlantısı ve Audit:** Aktif oturum,
  personel/hesap/bordro scope'u, rol ve dönem guard'ları; atomik ödeme,
  dengeli 135 yevmiyesi, bordro kesintisi tahsisi ve içeriksiz audit
  tamamlandı.
- **Dilim 4 — Personel Avans UI:** `/personel` içinde sayaç, kart, arama/durum
  filtresi, talep/onay/ödeme/mahsup formları, rol DOM sınırı ve
  `?advance=<id>` deep-link'i mobil/tema/print sözleşmesiyle tamamlandı.
- **Dilim 5 — İzole Gerçek Veri ve Kapanış:** Ayrılmış F21 kapsamında dört
  avans, iki mahsup, tek kasa çıkışı, tek dengeli yevmiye, 16 audit,
  tekrar çalıştırma, yanlış scope/rol/kapalı dönem ve sıfır istenmeyen çapraz
  modül yan etkisi doğrulandı. In-app browser yerel URL güvenlik politikası
  nedeniyle interaktif ekran görüntüsü kabulü çalıştırılamadı; rol DOM,
  deep-link, responsive ve print sözleşmeleri bileşen testleri, type-check ve
  production build ile doğrulandı.

Ayrıntılı kanıt
`Docs/UI-baseline/Faz21-gercek-veri-kapanis-20260730.md` içindedir. Faz 21
tamamlanmıştır.
