# Faz 5 — Şantiyeler Görsel Baseline

Tarih: 19.07.2026
Route: `/santiyeler`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3016`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `sites-pilot-desktop-1440.png` | 1440 × 1200 üst görünüm, gerçek özetler ve finans tablosu | `833e1e7cd96494e8d3d7a12cf8157d8ac295bf9a1c1608b927c1a88fc3fe587f` |
| `sites-pilot-desktop-cards-1440.png` | Şantiye kart araçları, filtreler ve gerçek kayıt tablosu | `f45d2b7cd855eca72f5fa20fddcc6982a23c0bbb9090faeaa954cefb5b4bf478` |
| `sites-pilot-desktop-form-1440.png` | Yeni şantiye kayıt paneli | `e879ab7bab415cf1eedb81b16dd2c45b9fb278c3a9c786d54e3103da3a0d0a6f` |
| `sites-pilot-mobile-390.png` | 390 × 1200 mobil üst görünüm ve özetler | `61f054d4159c3cb35f06e71be10557172791e3815a4de93a2407517da5184bb5` |
| `sites-pilot-mobile-cards-390.png` | Mobil finans/kart tabloları ve kontrollü yatay kaydırma | `e593468b76c7360cfb1cc0790708923c27c7b8f20582fd4d4ee55af78945d755` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-site-pilot`.
- Masaüstü ve mobilde tek `h1` ve belge düzeyinde `0` px yatay taşma.
- Dört özet kartı, yedi gerçek şantiye kartı ve sekiz hareketli finans satırı demo oturumundan okunur.
- Gelir, gider, alış faturası, taşeron hakedişi ve net sonuç mevcut finans read-model'inden gelir.
- Negatif ve pozitif net sonuçlar ayrı durum tonlarıyla gösterilir.
- `/hakedis` ve `/giderler` bağlantıları mevcut gerçek route'lara gider.
- Yeni şantiye paneli altı mevcut alanı kullanır; ilk alan `Kodu` odağı alır.
- Şantiye kart CRUD, import/export, durum filtresi ve arama davranışları korunur.
- Görseller sırasında şantiye veya finansal mutasyon gönderilmedi.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Faturalar/İrsaliye dilimine geçilmez.
