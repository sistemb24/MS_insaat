# Faz 6 — Kesinti, Tutanaklı İşler ve Fiyat Revizyonu

Bu baz çizgi, production build üzerinde `muhasebe@noa.local` demo oturumuyla,
kapalı `E2E-KUM-20260717-01` projesinin kesinleşmiş `E2E-HAK-002` hakedişinde
salt-okunur olarak kaydedildi. Görsel doğrulama sırasında form gönderilmedi ve
uygulama verisi değiştirilmedi.

## Doğrulanan gerçek veri

- Hakediş detay özeti: 1.625,00 TL toplam kesinti ve 30.875,00 TL ödenecek.
- Tutanaklı iş, belge bazlı kesinti ve finansal hareket alt listeleri: boş gerçek durum.
- Sözleşme pozları: `BETON-C30` ve `DEMIR-B420C`.
- Ek fiyat revizyonu: 0; proje kapalı olduğu için görünüm salt okunur.
- Güncel sözleşme poz toplamı: 650.000,00 TL.

## Görseller

- `desktop-extra-works.png` — 1440 × 1000 Tutanaklı İşler sekmesi.
- `desktop-deductions.png` — 1440 × 1000 Kesintiler sekmesi.
- `desktop-price-revision.png` — 1440 × 1000 Fiyat Revizyonu alanı.
- `mobile-extra-works.png` — 390 × 844 Tutanaklı İşler görünümü.
- `mobile-deductions.png` — 390 × 844 Kesintiler görünümü.
- `mobile-price-revision.png` — 390 × 844 Fiyat Revizyonu görünümü.

## Kabul kontrolleri

- Tek `h1` doğrulandı.
- Belge `scrollWidth === clientWidth`: masaüstünde 1425/1425, mobilde 375/375.
- Tarayıcı konsolunda hata bulunmadı.
- Mobilde geniş tablolar panel içi yatay kaydırma alanında tutuldu; çalışma
  alanları `min-w-0` ile viewport dışına taşmadı.
- Otomatik kesinti kuralı için kalıcı model bulunmadığından sahte toggle veya
  kural kaydetme kontrolü eklenmedi.
