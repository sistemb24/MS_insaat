# Faz 5 — Giderler Görsel Baseline

Tarih: 19.07.2026
Route: `/giderler`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3018`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `expenses-desktop-1440.png` | 1440 × 1200 gider yönetimi, gerçek özetler, filtreler ve hareket listesi | `3b172bb6330c03f7ba6f575bf1ad9f835d2bb2df24f3eb906288744852d1ed32` |
| `expense-form-desktop-1440.png` | 1440 × 1200 mevcut yeni gider formu | `6c95198af8f7239c5ca8fab5655903281fa2291823a27998658f48f249dd9742` |
| `expense-distribution-desktop-1440.png` | 1440 × 1200 gerçek hareket grubu dağılımı | `c561aad633d564dd98f82d462583815079ee656a27ac6bf48ab86877ac84904e` |
| `expenses-mobile-390.png` | 390 × 1200 mobil üst görünüm, kartlar ve filtreler | `253fd6fa5021b6c5f28bc4dd41bea711c7aa84e41f729c3befff7c778b994d00` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-expense-pilot`.
- Masaüstü ve mobilde tek `h1`, dört özet kartı ve belge düzeyinde `0` px yatay taşma.
- Toplam gider, bu ay, KDV, ödeme bağlantısı ve grup dağılımı yalnız gerçek scoped gider/kasa-banka kayıtlarından türetilir.
- Arama ve hareket grubu filtresi gerçek belge, şantiye, cari, açıklama ve grup alanlarında çalışır.
- Yeni gider kaydı mevcut şantiye, KDV, ödeme hesabı, kasa/banka hareketi ve ledger fişi davranışlarını korur; görsel kontrol sırasında kayıt veya ödeme mutasyonu gönderilmedi.
- Production build doğrulandı; şema, migration, veri ve action/service sözleşmelerinde değişiklik yoktur.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Çek dilimine geçilmez.