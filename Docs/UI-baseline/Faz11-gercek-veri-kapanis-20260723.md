# Faz 11 Gerçek Veri ve Kapanış Kabulü

> Tarih: 23.07.2026
> Kapsam: `RFC-F11-01` Dilim 5 — Kalıcı Metraj Simülasyon Senaryoları
> Hedef scope: `tenant-noa-demo / company-demo-insaat / period-2026`

## 1. İzole Kabul Verisi

Kabul, mevcut `F8-KABUL-20260722` projesinin kesinleşmiş `F8-HAK-001`
snapshot'ı üzerinde yürütüldü. Kaynak proje, hakediş, metraj, kesinti,
muhasebe bağlantısı ve ledger kayıtları değiştirilmedi.

| Senaryo | Yaşam döngüsü | Revizyonlar | Sonuç |
|---|---|---|---|
| `F11-KABUL-20260723-A` | Accounting oluşturdu/revize etti, admin onayladı | R1: 12 m² / 120.000 TL; R2: 18 m² / 180.000 TL | `APPROVED` |
| `F11-KABUL-20260723-B` | A/R2 snapshot'ından klonlandı, accounting revize etti, admin arşivledi | R1: 18 m² / 180.000 TL; R2: 25 m² / 250.000 TL | `ARCHIVED` |

A/R2 ile B/R2 karşılaştırması poz bazında `+7 m²` ve `+70.000 TL` fark
üretti. Karşılaştırma salt okunur kaldı ve audit üretmedi.

## 2. Rol ve Deep-link Kabulü

- Accounting gerçek UI'da scenario + R1, R2, clone ve compare işlemlerini yaptı.
- Admin `/hakedis?senaryo=<id>` deep-link'iyle A'yı onayladı ve B'yi arşivledi.
- Salt Okur yalnız onaylı A senaryosunu açabildi.
- Salt Okur DOM'unda create, revise, clone, approve ve archive kontrolleri yoktu.
- Salt Okur arşivli B deep-link'inde kontrollü yetki hatası aldı; B içeriği
  görüntülenmedi.
- Onay/arşiv dialog'unda ilk odak ana onay düğmesine gider. Kapanış kabulü,
  pending durumunda erken odak dönüşünün başarısız olduğunu ortaya çıkardı;
  odak dönüşü transition tamamlandıktan sonra tetikleyiciye yapılacak şekilde
  düzeltildi ve regresyon testine bağlandı.

## 3. Scope, Audit ve İzolasyon

Kalıcı `npm run hakedis:scenario:verify` komutu aşağıdaki read-only mutabakatı
tekrarlar:

- A `APPROVED/R2`, B `ARCHIVED/R2`;
- dört normalize revision ve dört line snapshot;
- dört accounting ve iki admin olmak üzere altı mutation auditi;
- sıfır compare auditi;
- yanlış firma, dönem ve proje sorgularında sıfır sonuç;
- audit metadata'sında açıklama/revizyon notu bulunmaması;
- kaynak `F8-HAK-001.updatedAt = 2026-07-22T10:27:14.279Z`;
- bir kaynak snapshot, bir metraj föyü, bir metraj satırı, iki kesinti,
  sıfır ek iş/finans hareketi ve mevcut muhasebe bağlantısının korunması;
- demo döneminin açık, aboneliğin aktif `kurumsal` kalması.

Kapalı dönem, abonelik reddi, viewer create reddi, admin-only transition,
idempotency ve compare-auditsiz davranışlar action/repository hedefli
regresyon paketinde fail-closed doğrulandı. Gerçek kabul sırasında dönem veya
abonelik konfigürasyonu değiştirilmedi.

## 4. Görsel ve Erişilebilirlik Kabulü

- 1440 × 900 koyu masaüstü: semantic tokenlar, tablo ve durum rozetleri temiz.
- 390 × 844 açık mobil: doküman genişliği 375 px, senaryo paneli 275 px ve
  sayfa düzeyinde yatay taşma yok.
- Light/dark tema geçişi gerçek Salt Okur deep-link'inde çalıştı.
- Tarayıcı konsolunda warning/error bulunmadı.
- Print düğmeleri gerçek raporda görünür; global `@media print` sözleşmesi
  shell ve bütün workspace düğmelerini gizler, açık renk tokenlarını zorlar,
  tablo başlık/altlık tekrarını ve satır bölünme korumasını uygular.

## 5. Kapanış Kararı

`RFC-F11-01` Dilim 1–5 tamamlandı. F2-03 kalıcı simülasyon senaryosu kapısı
onaylı kapsamda kapatıldı. Gerçek metraj/hakediş/ledger aktarımı, public
paylaşım, ihale BOQ ve dış entegrasyon eklenmedi.

Sıradaki planlama kapısı F2-04 için `RFC-F12-01` — Kalıcı Import
Staging/Geçmişi'dir. Uygulama, önerilen varsayımlar ayrıca onaylanmadan
başlamaz.
