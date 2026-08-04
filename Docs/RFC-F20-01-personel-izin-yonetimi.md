# RFC-F20-01 — Personel İzin Yönetimi

> Durum: **Tamamlandı — beş uygulama dilimi ve kapanış kabulü geçti**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 13.3,
> 13.4, 13.7, 13.8 ve 17.2; mevcut `/personel`, `EntityRecord`, AppShell,
> Doküman Merkezi ve merkezi audit sözleşmeleri

## 1. Amaç

NOA'nın mevcut personel, puantaj ve bordro akışlarını bozmadan; personel izin
talebi, kontrollü onay/red, yıllık operasyonel bakiye ve izin takvimi
görünürlüğü sağlayan ilk kalıcı İK dikeyi eklenir.

Bu faz iş hukuku, SGK bildirimi veya bordro mevzuatı motoru gibi davranmaz.
İzin gün sayısı ve bakiye, tenant içindeki operasyonel planlama kaydıdır.
Resmî tatil takvimi, kıdemden otomatik hak ediş ve yasal uygunluk hesabı ayrıca
ürün kararı gerektirir.

## 2. Mevcut altyapıyla uyum

Çalışma mevcut `personel` `EntityRecord` kayıtlarını yeniden kullanır. Personel
kartları yeni modele taşınmaz ve backfill edilmez. İzin kayıtları additive
modellerle tenant/firma/dönem kapsamında tutulur; personel referansı Server
Action ve repository sınırında aynı scope'ta doğrulanır.

| İhtiyaç | Faz 20 ilk karşılığı | Sınır |
|---|---|---|
| Personel | Mevcut aktif `personel` kaydı | Yeni `Employee` ana modeli veya veri taşıma yok. |
| İzin talebi | Scoped `EmployeeLeaveRequest` | Personel self-service hesabı yok. |
| Bakiye | Yıl/personel bazlı `EmployeeLeaveBalance` | Yasal hak ediş motoru yok. |
| Belge | İsteğe bağlı aynı kapsamlı `DocumentFile` referansı | Yeni yükleme/depolama akışı yok. |
| UI | `/personel` içinde İzin Yönetimi yüzeyi | Ayrı İK uygulaması veya ikinci AppShell yok. |

## 3. Önerilen varsayımlar

1. Faz 20 yalnız tenant içi **Personel İzin Yönetimi** dikeyidir. SGK,
   e-Devlet, bordro mevzuatı, resmî tatil servisi veya dış İK sağlayıcısı
   varmış gibi davranılmaz.
2. Her izin ve bakiye kaydı `tenantId + companyId + periodId` kapsamını taşır.
   Personel, belge ve işlem yapan kullanıcı aktif scope içinde yeniden
   doğrulanır; scope dışı kayıt okunamaz veya değiştirilemez.
3. Mevcut `personel` `EntityRecord` verileri korunur. Additive
   `EmployeeLeaveRequest` ve `EmployeeLeaveBalance` modelleri eklenir; personel
   JSON'u, puantaj ve bordro kayıtları backfill edilmez.
4. İzin türleri ilk sürümde `ANNUAL`, `EXCUSE`, `SICK`, `MATERNITY`,
   `PATERNITY`, `UNPAID` ile sınırlıdır. UI renk yanında Türkçe tür ve durum
   metnini her zaman gösterir.
5. Yaşam döngüsü
   `DRAFT → SUBMITTED → APPROVED | REJECTED` ve yalnız onaylı kayıttan
   `APPROVED → CANCELLED` şeklinde ileri ilerler. Fiziksel silme, yeniden açma
   ve onaylanmış kaydı sessizce düzenleme yoktur.
6. `admin` ve `accounting` taslak oluşturup düzenleyebilir ve gönderebilir;
   yalnız `admin` onaylar, reddeder veya onaylı izni iptal eder. `viewer`
   salt okunurdur. Personel–AppUser kimlik bağı bulunmadığı için çalışan
   self-service talebi ilk sürümde yoktur.
7. Gün hesabı kullanıcı tarafından girilen `chargeableDays` üzerinden yapılır;
   değer seçilen başlangıç/bitiş aralığının takvim günü sayısını aşamaz.
   Hafta sonu, resmî tatil, kıdem ve yasal hak ediş otomasyonu yapılmaz.
   `ANNUAL` onayında bakiye yetersizse işlem reddedilir; onaylı yıllık izin
   iptalinde kullanılan bakiye atomik olarak geri alınır.
8. Aynı personel için `SUBMITTED` veya `APPROVED` tarih aralığı çakışması
   reddedilir. Oluşturma, gönderme, onay/red ve iptal request key ile
   idempotent; bakiye güncellemesi ile durum geçişi tek transaction'dır.
9. Audit yalnız işlem/entity kimliği, personel kodu, izin türü, gün sayısı ve
   güvenli durum geçişini taşır. Serbest açıklama, sağlık bilgisi, belge adı,
   belge yolu veya request key metadata'ya yazılmaz. İzin türü `SICK` olsa da
   teşhis/sağlık ayrıntısı tutulmaz.
10. UI `/personel` içinde sayaçlar, arama, tür/durum/yıl filtresi, izin/bakiye
    listesi, form ve `?leave=<id>` detay deep-link'i sağlar. Admin kontrolleri
    yetkisiz DOM'a eklenmez; mobil, tema ve print standartları korunur.
    Onay otomatik puantaj, bordro, bildirim veya finans hareketi üretmez.

## 4. Veri yaşam döngüsü ve bakiye

| Durum | Değişebilir alanlar | Bakiye etkisi | İzinli işlem |
|---|---|---|---|
| `DRAFT` | Personel, tür, tarih, gün, kısa açıklama, belge | Yok | Düzenle, gönder |
| `SUBMITTED` | Yok | Bekleyen gün özetinde görünür | Onayla veya reddet |
| `APPROVED` | Yok | `ANNUAL` ise kullanılan gün artar | İptal et |
| `REJECTED` | Yok | Yok | Salt okunur |
| `CANCELLED` | Yok | Önceki yıllık bakiye etkisi geri alınır | Salt okunur |

`EmployeeLeaveBalance`; kişi ve yıl için açılış, manuel kazanılmış/düzeltme,
kullanılan ve kalan günleri taşır. İlk sürümde bakiye yalnız admin tarafından
oluşturulur veya güvenli düzeltme işlemiyle değiştirilir. Onaylanan yıllık izin
`usedDays` değerini transaction içinde artırır.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | DTO, tür/durum, tarih/gün, rol, çakışma ve bakiye kararları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve Repository | Additive izin/bakiye modelleri, migration ve scoped repository | Backfill yok; optimistic revision ve transaction. |
| 3 — Server Action ve Audit | Oturum/scope/rol/dönem guard'ları, yaşam döngüsü ve bakiye | İçerik audit'e sızmaz; yan etki yok. |
| 4 — Personel İzin UI | Liste, bakiye, form, filtre, detay deep-link'i | Mobil/tema/print ve rol DOM sınırı. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış admin/accounting/viewer kabulü ve tam kapılar | Önceki fazlar ve puantaj/bordro değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem personel, izin, bakiye veya belge referansına
  erişemez.
- Viewer mutation yapamaz; accounting onay/red/iptal yapamaz.
- Kapalı dönemde okuma sürer, tüm izin ve bakiye mutasyonları fail-closed
  reddedilir.
- Gönderilmiş/onaylanmış talep düzenlenemez; yaşam döngüsü geri alınamaz veya
  atlanamaz.
- Çakışan aktif izin ve yetersiz yıllık bakiye reddedilir.
- Aynı request key ikinci kayıt, durum geçişi, bakiye etkisi veya audit
  üretmez.
- Audit serbest açıklama, sağlık ayrıntısı veya belge bilgisi taşımaz.
- İzin onayı puantaj, bordro, bildirim, kasa/banka, yevmiye veya stok hareketi
  üretmez.
- UI 390 px mobilde global taşma olmadan ve print-safe çalışır.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

Çalışan self-service portalı, çok kademeli yönetici akışı, e-posta/SMS/push,
otomatik bildirim, SGK/e-Devlet, resmî tatil servisi, yasal/kıdem bazlı hak
ediş, yarım saatlik izin, vardiya hesabı, otomatik puantaj satırı, otomatik
bordro kesintisi, otomatik Doküman Merkezi yüklemesi, elektronik imza ve dış
İK sağlayıcısı bu RFC'nin dışındadır.

## 8. Kuyruk kararı, uygulama onayı ve kapanış

Faz 13 Open Banking sağlayıcı/ürün ve resmi sandbox bilgisi hazır olana kadar
bekler. “Davet Et & Kazan” dikeyi de yeni tenant kayıt akışı ile gerçek
ödül/indirim politikası tanımlanana kadar ürün kararı kuyruğunda tutulur;
mevcut şirket içi `UserInvitation` akışıyla karıştırılmaz.

Kullanıcı 30.07.2026 tarihinde Bölüm 3'teki on varsayımı ve Faz 20'nin tüm
dilimlerinin tekrar onay alınmadan tamamlanmasını onayladı.

- **Dilim 1 — Domain Çekirdeği:** Tür/durum, tarih ve gün sınırları, rol/kapalı
  dönem kararları, ileri yaşam döngüsü, çakışma, operasyonel bakiye ve
  içeriksiz idempotency anahtarları tamamlandı.
- **Dilim 2 — Şema ve Repository:** Additive `EmployeeLeaveRequest` ve
  `EmployeeLeaveBalance` modelleri,
  `20260730235900_add_employee_leave_management` migration'ı ve
  scope/optimistic revision duyarlı repository tamamlandı. Backfill yapılmadı.
- **Dilim 3 — Server Action ve Audit:** Aktif oturum, personel/belge scope'u,
  rol ve dönem guard'ları; atomik izin-bakiye geçişi ve serbest içerik
  taşımayan audit tamamlandı.
- **Dilim 4 — Personel İzin UI:** `/personel` içinde kart akışı, bakiye
  tablosu, arama/filtreler, formlar, rol DOM sınırı ve `?leave=<id>` detay
  deep-link'i mobil/tema/print sözleşmesiyle tamamlandı.
- **Dilim 5 — İzole Gerçek Veri ve Kapanış:** Ayrılmış F20 kapsamında dört
  izin, tek yıllık bakiye, on üç audit, tekrar çalıştırma, çakışma,
  yanlış scope/rol/kapalı dönem ve sıfır çapraz modül yan etkisi doğrulandı.
  Admin, muhasebe ve salt-okur gerçek UI kabulü geçti.

Ayrıntılı kanıt
`Docs/UI-baseline/Faz20-gercek-veri-kapanis-20260730.md` içindedir. Faz 20
tamamlanmıştır.
