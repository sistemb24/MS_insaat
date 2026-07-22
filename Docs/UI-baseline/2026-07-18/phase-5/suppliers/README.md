# Faz 5 — Tedarikçiler Görsel Baseline

Tarih: 18.07.2026
Route: `/tedarikciler`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3014`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `suppliers-pilot-desktop-1440.png` | 1440 × 1200 üst görünüm, gerçek özetler ve cari kart listesi | `e8925664572afba75d84a9b29a57a7f88c86f4370ccddd56af6bc33e6a1560d4` |
| `suppliers-pilot-desktop-form-1440.png` | Yeni tedarikçi kayıt paneli | `ec03b18999075f1397adbbe6c3a37ff323e46f2df3ac932e370ec44c1832b85f` |
| `suppliers-pilot-desktop-statement-1440.png` | Cari tahsilat/ödeme ve hesap ekstresi | `40e5c8f8430de3a085e0c5cb9c6e314336fabde6fd9caeb3ef7c95208ca2e74e` |
| `suppliers-pilot-mobile-390.png` | 390 × 1200 mobil üst görünüm | `ba89ae477c92c91086f2e47ec5594da18988bb5ca5dc03268f2e0b3eb9154730` |
| `suppliers-pilot-mobile-list-390.png` | Mobil filtre ve kontrollü cari kart tablosu | `c3e3389564d0360df4f0c88827ca694b0e997783b7f5f24e03071b2a4c5d9881` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-supplier-pilot`.
- Masaüstü ve mobilde tek `h1` ve belge düzeyinde `0` px yatay taşma.
- Dört özet kartı, beş gerçek tedarikçi ve 33 gerçek cari hareket demo oturumundan okunur.
- Kategori, durum ve metin filtreleri gerçek aynı satır setinde çalışır.
- `/faturalar` alış faturası bağlantısı gerçek route'a gider.
- Yeni tedarikçi paneli yedi mevcut alanı kullanır; ilk alan `Kodu` odağı alır.
- Seçili tedarikçinin gerçek kasa/banka tahsilat/ödeme paneli ve hesap ekstresi korunur.
- Görseller sırasında cari veya finansal mutasyon gönderilmedi.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Taşeronlar dilimine geçilmez.
