# Faz 5 — Stok/Depo Görsel Baseline

Tarih: 19.07.2026
Route: `/stok-depo`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3023`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `stock-depot-desktop-1440.png` | 1440 × 1200 stok/depo üst çalışma alanı, gerçek kartlar, filtreler ve özet | `6aeefe56cf1d57bf51395bf0a084962f63e43134912dd9a1755870bbe878b308` |
| `stock-depot-search-desktop-1440.png` | 1440 × 1200 gerçek Çimento arama filtresi uygulanmış stok/depo kapsamı | `11d3237a9a997db11d31f0e283223d324b6004a3d866433f78e6cd1982beb7ac` |
| `stock-transfer-form-desktop-1440.png` | 1440 × 1200 mevcut Yeni Transfer formu açıkken stok hareketi yüzeyi | `7b2c2511fa884ceb7a8ae8cca1519ee7dded626e4307e30dacefe6db88fd2cf9` |
| `stock-depot-mobile-390.png` | 390 × 1200 mobil stok/depo üst görünüm, kartlar ve filtreler | `3ea1b56c49252fde359a949630ee76fbd658d9d12ff0ffe07880759bf597163b` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-stock-depot-pilot`.
- Masaüstü ve mobilde tek `h1`, dört gerçek özet kartı ve belge düzeyinde `0` px yatay taşma.
- Arama, tarih ve depo filtresi; özet, hareket listesi, CSV ve yazdırma kapsamını birlikte değiştirir.
- Stok kartı CRUD/import/export ile transfer/şantiye çıkışı taslak, kesinleştirme, iptal ve audit yaşam döngüsü korunur.
- Minimum stok ayarı depo/stok kartı bağlamında mevcut scoped servisle kaydedilir; görsel kontrol sırasında mutasyon gönderilmedi.
- Production build doğrulandı; şema, migration, veri ve stok/depo service-action sözleşmelerinde değişiklik yoktur.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Personel dilimine geçilmez.
