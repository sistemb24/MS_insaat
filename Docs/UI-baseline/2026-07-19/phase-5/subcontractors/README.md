# Faz 5 — Taşeronlar Görsel Baseline

Tarih: 19.07.2026
Route: `/taseronlar`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3015`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `subcontractors-pilot-desktop-1440.png` | 1440 × 1200 üst görünüm, gerçek özetler ve taşeron cari kart listesi | `7982d873d32461f22fd259bf874a4e44f7bdd0e76aa3c1188092ceb189c9fbee` |
| `subcontractors-pilot-desktop-form-1440.png` | Yeni taşeron kayıt ve sözleşme alanları paneli | `e410e7479e716e4b8adc85fd2b91edd9b54a842c87f70cd0b786844e9eabdb7f` |
| `subcontractors-pilot-desktop-statement-1440.png` | Taşeron tahsilat/ödeme ve hesap ekstresi | `ceb9906f1224c263392635dce562ea0b049d19fdae167dcd23b2146da100f843` |
| `subcontractors-pilot-mobile-390.png` | 390 × 1200 mobil üst görünüm | `2d1f1c930473f0463357b0aa1c1368595bd182bedb8639929334aeba05970422` |
| `subcontractors-pilot-mobile-list-390.png` | Mobil sözleşme/durum filtreleri ve kontrollü cari kart tablosu | `71f57fa65c5760bb97d75c63c1bc4ba7cb16b3b5d72e63ec899e592c4d7061c0` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-subcontractor-pilot`.
- Masaüstü ve mobilde tek `h1` ve belge düzeyinde `0` px yatay taşma.
- Dört özet kartı, dört gerçek taşeron ve 33 gerçek cari hareket demo oturumundan okunur.
- Sözleşmeli/sözleşmesiz, durum ve metin filtreleri aynı gerçek satır setinde çalışır.
- `/hakedis` bağlantısı mevcut gerçek hakediş route'una gider.
- Yeni taşeron paneli dokuz mevcut alanı kullanır; ilk alan `Kodu` odağı alır.
- Seçili taşeronun gerçek kasa/banka tahsilat/ödeme paneli ve hesap ekstresi korunur.
- Görseller sırasında cari, hakediş veya finansal mutasyon gönderilmedi.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Şantiyeler dilimine geçilmez.
