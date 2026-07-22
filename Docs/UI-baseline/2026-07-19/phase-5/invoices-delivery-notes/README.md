# Faz 5 — Faturalar/İrsaliye Görsel Baseline

Tarih: 19.07.2026
Route: `/faturalar`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3017`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `invoices-purchase-desktop-1440.png` | 1440 × 1200 alış faturası üst görünüm, özetler ve gerçek hareket listesi | `46c9d290ea5aa8a98bcc761ee0fcbecab36e3c8910285482aee9ee73c682915a` |
| `invoices-sales-desktop-1440.png` | 1440 × 1200 satış faturası sekmesi | `faf05fb113d556a53aaf86bbae5e41d445402c1c805e410a5163b1f67bf438e3` |
| `delivery-notes-desktop-1440.png` | 1440 × 1200 alış irsaliyeleri, stok giriş durumu ve audit geçmişi | `2d9d6412fd81366d0bfda04a34846ca255276ceb56cc581256c2b728d5c3544c` |
| `invoice-form-desktop-1440.png` | 1440 × 1200 yeni alış faturası formu | `831c4f72841006d5e62612f973c3d2c9367fdf097d10f9e6835f95d44f9b3a38` |
| `invoices-mobile-390.png` | 390 × 1200 mobil üst görünüm, kartlar ve yatay sekmeler | `2efd31aa3539d386ebbd4d83b09189eb214a5fe2dbbc083d5a28cd2608607501` |
| `delivery-notes-mobile-390.png` | 390 × 1200 mobil alış irsaliyeleri | `6a89b62208b368a7405010522145f6f5db75523bc94eed68bc29b5a019460090` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-invoice-pilot`.
- Masaüstü ve mobilde tek `h1`, üç belge sekmesi ve belge düzeyinde `0` px yatay taşma.
- Özetler gerçek alış/satış faturaları ile kesinleşmiş alış irsaliyelerinden türetilir; iptal faturalar hacme katılmaz.
- Alış faturası, satış faturası ve alış irsaliyesindeki mevcut oluşturma, düzenleme, kesinleştirme, iptal, ödeme/tahsilat, PDF, stok giriş ve audit davranışları korunur.
- Yeni alış faturası formu mevcut fatura alanlarını ve satır grid'ini kullanır; görsel kontrol sırasında kaydetme/mutasyon yapılmadı.
- Production build doğrulandı; şema, migration, veri ve action/service sözleşmelerinde değişiklik yoktur.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Giderler dilimine geçilmez.
