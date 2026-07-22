# Faz 4 — Kasa/Banka Görsel Baseline

Tarih: 18.07.2026
Route: `/kasa-banka`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3013`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `cash-bank-pilot-desktop-1440.png` | 1440 × 1200 üst görünüm, özetler ve hesap bakiyeleri | `deece059ab544ce5b1fdc67602faff1d9b65728baa2f1efee8853027e1f37f22` |
| `cash-bank-pilot-desktop-movement-form-1440.png` | Manuel tahsilat/ödeme formu | `ffafdbd15ff2daa626936d2897e046bba4f0235d231f9d2342838ffc070b093d` |
| `cash-bank-pilot-desktop-transfer-form-1440.png` | Çift taraflı virman formu | `e7d6ea61f0f4616d96788a5178460723d3eb4317dcaf6fc32ec65c50d4f02300` |
| `cash-bank-pilot-desktop-movements-1440.png` | Gerçek hareket ve muhasebe fişi tablosu | `dc3259896869df09dddfebe332e99c61d36272878329f1567207b4ed1151c65c` |
| `cash-bank-pilot-mobile-390.png` | 390 × 1200 mobil üst görünüm | `9c802036444e236d568c24655f02e6b0b0cfce631a5b034865bd9bad7150a0e9` |
| `cash-bank-pilot-mobile-movements-390.png` | Mobil hareket tablosu ve kontrollü tablo kaydırması | `fc9ce93b811bb74dff95d826b11cf33539d8713afb5fd1466420e8599c3ef3c5` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-cash-bank-pilot`.
- Masaüstü ve mobilde tek `h1`.
- Belge düzeyinde yatay taşma: `0` px; geniş finans tabloları kendi panelinde kaydırılır.
- Dört özet kartı, 19 gerçek hareket satırı ve iki aktif hesap demo oturumundan okunur.
- Manuel hareket formunda `Evrak No` odağı ve kilitli `TL` işlem para birimi doğrulandı.
- Virman paneli, iki hesaplı çift hareket sözleşmesini korur.
- Görseller sırasında finansal mutasyon gönderilmedi.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 route dönüşümüne geçilmez.
