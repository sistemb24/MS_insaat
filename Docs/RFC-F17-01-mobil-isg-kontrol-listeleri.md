# RFC-F17-01 — Mobil İSG Kontrol Listeleri

> Durum: **Faz 17 tamamlandı — mobil İSG kontrol listeleri kabul edildi**
> Tarih: 29.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 17.3

## 1. Amaç

Faz 14'te tamamlanan İSG denetim/bulgu çekirdeğinin üzerinde, saha personelinin
telefon tarayıcısında güvenle tamamlayabileceği mobil öncelikli kontrol listesi
akışı eklenir. Kontrol listesi şablonu, denetim yürütmesi ve satır bazlı
uygun/uygunsuz/uygulanamaz yanıtlar; mevcut `SafetyInspection` ve
`SafetyFinding` iş akışına bağlı, tenant/firma/dönem kapsamlı kalıcı kayıtlar
olarak ele alınır.

Bu faz resmi İSG beyanı, hukuki uygunluk kararı veya native/offline mobil
uygulama değildir. Amaç, saha içi operasyonel kontrolün tutarlı, denetlenebilir
ve erişilebilir biçimde kaydedilmesidir.

## 2. Mevcut altyapıyla uyum

Faz; mevcut `TenantScope`, açık dönem ve `admin`/`accounting` yazma rolü
kararlarını; `SafetyInspection`, `SafetyFinding`, AppShell, merkezi audit ve
İSG lookup'larını yeniden kullanır. Ayrı mobil uygulama, ikinci kimlik sistemi,
yeni dosya saklama alanı veya finansal hareket motoru oluşturulmaz.

| İhtiyaç | İlk karşılık | Sınır |
|---|---|---|
| Kontrol şablonu | Başlık, kategori ve sıralı maddeler | Resmi mevzuat kütüphanesi yok. |
| Saha yürütmesi | Proje/tarih/denetleyen bağlı checklist run | GPS veya cihaz doğrulaması yok. |
| Madde yanıtı | Uygun, uygunsuz, uygulanamaz | Fotoğraf/video/offline kuyruk yok. |
| Uygunsuzluk takibi | İsteğe bağlı mevcut `SafetyFinding` bağlantısı | Otomatik görev/bildirim yok. |

## 3. Önerilen varsayımlar

1. Faz 17, yalnız şirket içi mobil İSG kontrol kaydı sağlar; resmi kurum
   bildirimi, hukuki uygunluk hükmü veya otomatik mevzuat güncellemesi kapsam
   dışıdır.
2. Şablon, yürütme ve yanıtlar tenant/firma/dönem kapsamına bağlıdır; proje ve
   sorumlu personel yalnız aynı aktif kapsamdan seçilir.
3. Additive kalıcılıkta şablon, şablon maddesi ve yürütme/yanıt satırları
   eklenir; mevcut `SafetyInspection` yalnız geriye dönük uyumlu, boş kalabilen
   bir bağlantıyla kullanılabilir. Backfill yapılmaz.
4. `admin` ve `accounting` şablon oluşturabilir, yürütebilir ve tamamlayabilir;
   `viewer` yalnız kapsam içi okumaya devam eder. Yeni mobil/İSG rolü bu fazda
   eklenmez.
5. Şablon `ACTIVE → ARCHIVED`, yürütme `DRAFT → COMPLETED` geçişlerini kullanır;
   tamamlanan yürütme ve arşivlenen şablon silinmez veya tekrar açılmaz.
6. Her yürütme-şablon maddesi çifti tek yanıta sahiptir; aynı istek anahtarının
   tekrarı ikinci yürütme, yanıt veya audit kaydı oluşturmaz.
7. `FAIL` yanıtı tek başına otomatik bulgu, bildirim, ceza, bordro, puantaj,
   stok veya finans hareketi üretmez. Kullanıcı yalnız açıkça isterse mevcut
   `SafetyFinding` akışına bağlantılı bulgu oluşturabilir.
8. Audit yalnız işlem, durum, güvenli kimlik ve sayısal özet taşır; serbest
   kontrol notu, kişisel sağlık verisi veya belge içeriği metadata'ya yazılmaz.
9. UI `/isg` altında mobil öncelikli tek kolon yürütme, büyük dokunma hedefleri,
   metinli durumlar, klavye odağı, deep-link, masaüstü tablo özeti ve print-safe
   çıktı sağlar. Offline/PWA, kamera, konum, dosya yükleme ve push bildirim yoktur.
10. Gerçek kabul yalnız ayrılmış test tenant/firma/döneminde çalışır; Faz 8–16
    kabul kayıtları ve Faz 13 dış sağlayıcı sınırı korunur.

## 4. Veri yaşam döngüsü ve doğrulamalar

| Varlık | Temel alanlar | Yaşam döngüsü |
|---|---|---|
| Kontrol şablonu | başlık, açıklama, aktiflik, sıra | `ACTIVE → ARCHIVED` |
| Şablon maddesi | kategori, başlık, sıra | aktif şablon içinde değişmez sıra |
| Kontrol yürütmesi | şablon, proje, denetleyen, tarih, durum | `DRAFT → COMPLETED` |
| Madde yanıtı | yürütme, madde, sonuç, kısa not | yürütme-madde bazında tekil |

Şablon ve madde metinleri doğrulanmış uzunluk/sıra sınırlarında tutulur.
Tamamlama, yürütmedeki tüm maddelerin yanıtlanmasını gerektirir. Uygunsuz bir
yanıttan bulgu oluşturulacaksa, bulgu yalnız aynı kapsamda ve açık kullanıcı
aksiyonu ile mevcut denetim/bulgu sözleşmesine bağlanır.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain çekirdeği | DTO, yanıt/yaşam döngüsü/izin/idempotency kuralları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve repository | Additive checklist model ailesi, scoped repository ve migration | Backfill yok; yanlış scope sıfır. |
| 3 — Action ve audit | Rol/kapalı dönem guard'ları, yürütme/yanıt/tamamlama | Hassas metadata ve yan etki yok. |
| 4 — Mobil İSG UI | Şablon, yürütme, madde yanıtı ve deep-link | Mobil/tema/print; viewer yazamaz. |
| 5 — İzole gerçek veri ve kapanış | Ayrılmış kabul kaydı, scope/audit/idempotency ve tam kapılar | Faz 8–16/F13 değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem, kapalı dönem ve yetkisiz rol kayıt yazmadan
  reddedilir.
- Aynı yürütme-madde çifti ikinci yanıt satırı üretmez; eksik yanıtlı yürütme
  tamamlanamaz.
- Uygunsuz yanıt, açık kullanıcı aksiyonu olmadan bulgu ya da çapraz modül
  etkisi oluşturmaz.
- UI; boş/yükleniyor/hata durumları, klavye odağı, renkten bağımsız durumlar,
  390 px mobil taşma ve print-safe çıktıyı karşılar.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

İSG-KATİP/SGK entegrasyonu, native/offline mobil uygulama, fotoğraf/video,
konum/GPS doğrulaması, elektronik imza, sağlık verisi, otomatik görev/bildirim,
otomatik bulgu oluşturma, stok düşümü, bordro/puantaj/finans hareketi ve dış
eğitim veya mevzuat platformu entegrasyonu bu RFC'nin dışındadır.

## 8. Uygulama onayı

Faz 17 uygulamasına geçmek için kullanıcı Bölüm 3'teki on varsayımı onaylar.
Onay sonrası yalnız Dilim 1 Domain çekirdeğiyle başlanır; her sonraki dilim
bağımsız kabulden sonra ilerler.

### Onay ve Dilim 1 kapanış kaydı — 30.07.2026

Kullanıcı Bölüm 3'teki on varsayımı onayladı. `src/lib/mobile-safety-checklist.ts`,
kontrol şablonu/madde, saha yürütmesi ve madde yanıtı için saf DTO/doğrulama
sözleşmelerini; metin-tarih-madde sayısı sınırlarını, madde tekilliğini,
deterministic yürütme ve yürütme-madde anahtarlarını, eksiksiz yanıt olmadan
tamamlama reddini, yalnız `ACTIVE → ARCHIVED` ve `DRAFT → COMPLETED` geçişlerini
ve role/kapalı dönem izin kararını içerir. Şablon, migration, action, UI veya
gerçek veri bu dilimde değişmedi. `src/lib/mobile-safety-checklist.test.ts`
hedefli paketi 8 testle; type-check, Prisma validate ve lint ile geçti.

### Dilim 2 kapanış kaydı — 30.07.2026

`SafetyChecklistTemplate`, `SafetyChecklistTemplateItem`, `SafetyChecklistRun`
ve `SafetyChecklistResponse` additive Prisma modelleri; tenant/firma/dönem
foreign key'leri, template-madde sıra tekilliği, scoped yürütme/yanıt
idempotency anahtarları, tek yürütme-madde yanıtı ve isteğe bağlı tek bulgu
bağlantısıyla eklendi. `SafetyChecklistRun` mevcut `SafetyInspection`'a boş
kalabilen tekil bağlantı taşıyabilir; mevcut denetim veya bulgu verisi için
backfill yapılmadı. `20260730093000_add_mobile_safety_checklists` migration'ı
yerel `insaatMuhasebe` geliştirme veritabanına uygulandı.
`mobile-safety-checklist-prisma-repository`, her alt yüzeyi yalnız aktif
scope'ta listeleyen create/update ve UTC date-only dönüşüm köprüsünü sağlar;
bilinmeyen kalıcı durumları güvenli varsayımlara eşler. Domain/repository
hedefli paketi 11 testle, Prisma client üretimi, Prisma validate, type-check
ve lint ile geçti. Server action, audit, UI ve gerçek kabul verisi sonraki
dilimlere bırakıldı.

### Dilim 3 kapanış kaydı — 30.07.2026

`mobile-safety-checklist-actions`, her doğrudan çağrıda aktif oturum ile
tenant/firma/dönem kapsamını yeniden kurar. Viewer ve kapalı dönem yazımı,
proje/denetim/bulgu referans sorgularından önce fail-closed reddedilir; proje
yalnız açık kapsamda, isteğe bağlı denetim aynı proje-kapsamında ve açıkça
bağlanacak bulgu aynı kapsamda doğrulanır. Şablon oluşturma/arsivleme, yürütme
oluşturma, madde yanıtı, eksiksiz tamamlanma ve yalnız `FAIL` yanıtının açık
bulgu bağlantısı ortak service üzerinden merkezi audit'e gider. Audit metadata
serbest kontrol notu, şablon metni veya sağlık ayrıntısı taşımaz; idempotent
tekrarlar ikinci satır/audit üretmez. Başarılı mutation `/isg` ve dinamik
module route'unu revalidate eder. Finans, stok, bordro, puantaj, bildirim veya
otomatik bulgu üretimi eklenmedi. Domain/repository/service/action hedefli
paketi 23 test, type-check, Prisma validate ve lint ile geçti. UI ve gerçek
kontrol listesi kabulü sonraki dilimlere bırakıldı.

### Dilim 4 kapanış kaydı — 30.07.2026

Mevcut `/isg` denetim/bulgu merkezi korunarak ikinci bir Mobil İSG Kontrol
Listeleri yüzeyi eklendi. Aktif şablonlar, saha yürütme özeti ve cevap sayıları
masaüstünde yatay kaydırılabilir tablo ile; seçilen yürütme ise
`/isg?checklist=<runId>` derin bağlantısıyla açılan tek kolonlu detay çekmecesi
ile sunulur. Madde başına metinli ve büyük dokunma hedefli `Uygun`, `Uygunsuz`
ve `Uygulanamaz` kontrolleri ile isteğe bağlı kısa not bulunur; yalnız
`Uygunsuz` cevabı, açık kullanıcı aksiyonuyla mevcut aynı-kapsamlı bulguya
bağlanabilir. Şablon ve yürütme formu erişilebilir etiketlere, boş/yükleniyor/
hata durumlarına ve kapatma odağına sahiptir.

Yazma kontrolleri yalnız yazma yetkili ve açık dönem kullanıcılarına DOM'da
sunulur; viewer veya kapalı dönemde aksiyonların sunucu tarafındaki fail-closed
koruması değişmeden kalır. Proje, denetim ve bulgu seçenekleri mevcut scoped
İSG lookup'larından gelir; otomatik bulgu, dış servis veya çapraz modül etkisi
eklenmedi. Kontrol kontrolleri print dışı tutulur; tablo ve durum metinleri
print/mobil uyumluluğunu korur. Bileşen/domain/repository/service/action
hedefli paketi 5 dosya/26 test, type-check, Prisma validate ve lint ile geçti.
İzole gerçek veri, geniş ekran/mobil/tema/print görsel kabulü ve tam kalite
kapıları Dilim 5'te kapatılacaktır.

### Dilim 5 kapanış kaydı — 30.07.2026

`company-f17-kabul-20260730` / `period-f17-kabul-20260730` ayrılmış kabul
kapsamında tek aktif şablon, üç madde, tek tamamlanmış yürütme ve
`PASS`/`FAIL`/`NOT_APPLICABLE` yanıtları üretildi. Yalnız uygunsuz yanıt,
mevcut açık İSG bulgusuna açık aksiyonla bağlandı. Kabul komutu iki kez aynı
sonuçla çalıştı; yürütme, yanıt, bulgu bağlantısı ve tamamlama retry'ları yeni
kayıt/audit üretmedi. Merkezi audit 7 beklenen aksiyonla sınırlı kaldı ve
serbest kontrol metni taşımadı. Yanlış firma/dönem/proje ile kasa/banka,
gider, yevmiye, bordro, stok ve puantaj sayıları `0` kaldı.

Gerçek Prisma kabulü `SafetyChecklistResponse.templateItemId` alanının
repository DTO'sunda `checklistItemId` olarak eşlenmediğini ortaya çıkardı;
eşleme düzeltildi ve regresyon testi kalıcılaştırıldı. 1440×900 koyu/açık
tema, 390×844 mobil, deep-link, kullanıcı dostu proje etiketi, print sözleşmesi
ve gerçek viewer DOM sınırı doğrulandı; global yatay taşma veya konsol
hata/uyarısı görülmedi. Faz 8/11/12 ve Faz 14–16 kabul komutları tekrar geçti.
Tam kapılar 255 dosya/1490 test, type-check, Prisma validate, lint, production
build ve `git diff --check` ile yeşildir. Ayrıntılı kanıt
`Docs/UI-baseline/Faz17-gercek-veri-kapanis-20260730.md` içindedir. Faz 17
tamamlandı.
