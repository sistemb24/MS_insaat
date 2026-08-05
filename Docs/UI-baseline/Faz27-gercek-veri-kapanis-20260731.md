# Faz 27 — Firma Belge Markalaması Gerçek Veri ve Kapanış

> Tarih: 31.07.2026
> Durum: Tamamlandı
> RFC: `Docs/RFC-F27-01-firma-belge-markalamasi.md`

## Uygulanan kapsam

- `CompanyBrandAsset` şirket kapsamlı ve dönemden bağımsız tekil logo modeli
  ile `20260731060000_add_company_brand_assets` migration'ı eklendi.
- PNG, JPEG ve WebP için MIME + gerçek imza + ölçü + oran + 512 KiB
  doğrulaması server tarafında uygulandı.
- Admin kapalı dönemde optimistic revision ve idempotent request key ile
  yükleme, değiştirme ve kaldırma yapabilir; accounting/viewer salt okunurdur.
- Audit yalnız aksiyon, MIME, boyut, ölçü, durum ve revizyon geçişini taşır;
  binary/base64, SHA-256, dosya adı ve request key taşımaz.
- `/ayarlar` önizleme ve yaşam döngüsü kontrolleri; yeni alış/satış faturası
  PDF/print ve klasik hakediş print başlığı tüketicileri uygulandı.

## İzole PostgreSQL kabulü

`npm run company-brand:acceptance:verify` şu kapsamda tekrar çalıştırılabilir:

- tenant: `tenant-noa-demo`
- company: `company-f27-kabul-20260731`
- period: `period-f27-kabul-20260731`
- admin/accounting/viewer kabul oturumları

Sonuç:

- oluşturma, idempotent retry, kaldırma ve yeniden yükleme sonrası revizyon 3,
- 128 × 64 geçerli PNG,
- üç beklenen audit,
- stale revision, sahte PNG imzası ve yetkisiz roller reddedildi,
- yabancı firma izolasyonu ve dönemler arası şirket master okuması geçti,
- hassas audit değeri, operasyon ve session yan etkisi `0`.

## Gerçek tarayıcı kabulü

- Yönetici `/ayarlar`: revizyon 3, 128 × 64 önizleme, yükleme ve kaldırma
  kontrolleri görüldü.
- `/faturalar`: Alış Faturası PDF önizlemesinde
  `F27 Belge Markalama Kabul Şirketi logosu` belge başlığı içinde görüldü.
- Salt okur `/ayarlar`: aynı önizleme ve revizyon görüldü; yükleme/kaldırma
  kontrolleri DOM'a eklenmedi.
- 375 px istemci genişliğinde logo görünür kaldı ve
  `scrollWidth === clientWidth` ile global yatay taşma oluşmadı.
- Tarayıcı konsolunda uygulama hatası görülmedi.

## Kalite kapıları

- `npm test`: 303 dosya / 1.710 test geçti.
- `npm run type-check`: geçti.
- `npm run db:validate`: geçti.
- `npm run lint`: uyarısız geçti.
- `npm run build`: Next.js 16.2.9 ile 77 sayfa üretildi.
- `git diff --check`: geçti.

## Korunan sınırlar

AppShell ürün markası, `Company.name`, Document Center depolaması,
mevcut/geçmiş belge kayıtları, finans/ledger/stok/bordro/puantaj iş akışları,
e-Fatura/API/webhook sözleşmeleri ve dış sağlayıcı durumları değiştirilmedi.
