# Faz 28 — Tedarikçi Kategori Sözlüğü Gerçek Veri ve Kapanış

> Tarih: 31.07.2026
> Durum: Tamamlandı
> RFC: `Docs/RFC-F28-01-tedarikci-kategori-sozlugu.md`

## Uygulanan kapsam

- Şirket kapsamlı ve dönemden bağımsız `SupplierCategory` modeli ile
  `20260731070000_add_supplier_categories` migration'ı eklendi.
- Mevcut `EntityRecord.payload.category` alanı ve tedarikçi kayıtları
  taşınmadan; yönetilen kategoriler mevcut kart değerleriyle federatif
  birleştirildi.
- Türkçe uyumlu ad normalizasyonu, tekrar koruması, optimistic revision,
  kullanıcı/firma kapsamlı idempotency ve admin-only mutation uygulandı.
- Audit yalnız aksiyon, durum ve revizyon geçişini taşır; kategori adı,
  açıklama ve request key içermez.
- `/ayarlar` yönetim paneli; `/tedarikciler` filtre, yeni/düzenle form seçimi
  ve CSV/XLSX satır doğrulaması aynı effective sözlüğe bağlandı.
- Server action create/update/import akışları istemci doğrulamasına güvenmeden
  kategori sözleşmesini yeniden uygular.

## İzole PostgreSQL kabulü

`npm run supplier-category:acceptance:verify` şu kapsamda tekrar
çalıştırılabilir:

- tenant: `tenant-noa-demo`
- company: `company-f28-kabul-20260731`
- period: `period-f28-kabul-20260731`
- admin/accounting/viewer kabul oturumları

Sonuç:

- iki farklı dönemdeki iki `Hazır Beton` kullanımı tek federatif kategori
  olarak keşfedildi,
- `Malzeme` ve keşfedilmiş `Hazır Beton` yönetilen kategoriye dönüştürüldü,
- aynı request key retry'sı yeni mutation/audit üretmedi,
- normalize duplicate, stale revision ve yetkisiz roller reddedildi,
- kapalı dönem admin yazımı ile firma ve dönem bağımsız okuma geçti,
- `Hazır Beton` pasifleştirildiğinde iki mevcut tedarikçi kartı değişmedi,
- üç başarılı mutation üç redacted audit üretti,
- yabancı firma, tedarikçi kayıtları ve finans/ledger/stok yan etkisi `0`.

## Gerçek UI kabulü

- Yönetici `/ayarlar`: iki yönetilen kategori, `Hazır Beton` kullanım sayısı
  `2`, aktif/pasif durumları ve yönetim kontrolleri görüldü.
- `/tedarikciler`: iki sözlük adı filtrede göründü; mevcut `Hazır Beton`
  tedarikçi kartı kayıpsız gösterildi.
- Yeni tedarikçi formunda yalnız aktif `Malzeme` seçeneği sunuldu; pasif
  `Hazır Beton` yeni atamadan dışlandı.
- Koyu tema `color-scheme: dark` ile etkinleşti; 1280 px görünümde yatay
  taşma ve uygulama konsol hatası görülmedi.
- 390 px responsive davranış; bileşen testleri, mevcut kırılım sınıfları ve
  taşma kontrollü tablo kapsayıcılarıyla doğrulandı. Kullanılan tarayıcı
  sürücüsü viewport'u yeniden boyutlandıramadığı için bu maddede canlı 390 px
  ekran görüntüsü üretilmedi.

## Kalite kapıları

- `npm test`: 309 dosya / 1.727 test geçti.
- `npm run type-check`: geçti.
- `npm run db:validate`: geçti; 59 migration güncel.
- `npm run lint`: uyarısız geçti.
- `npm run build`: Next.js 16.2.9 ile 77 sayfa üretildi.
- `git diff --check`: geçti.

## Korunan sınırlar

Genel lookup motoru, müşteri/taşeron/stok sınıflandırmaları, kategori
hiyerarşisi, çoklu kategori, mevcut tedarikçi backfill'i, yeni API endpoint'i,
satın alma/muhasebe otomasyonu, session/finans/ledger/stok kayıtları ve dış
sağlayıcı durumları değiştirilmedi.
