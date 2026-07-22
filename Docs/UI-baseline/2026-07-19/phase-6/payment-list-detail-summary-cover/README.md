# Faz 6 — Hakediş listesi, detay, özet ve kapak görsel kabul kaydı

Bu baseline, `/hakedis` route'undaki ikinci Hakediş Pro dilimini production
build ve gerçek `demo-accounting` kapsamı üzerinden belgeler.

## Kaydedilen görünümler

- `desktop-payment-list.png`: 1440 × 1000 gerçek proje hakediş zincirleri.
- `desktop-payment-cover.png`: seçili E2E hakedişinin kapak görünümü.
- `desktop-payment-summary.png`: dönem ve projection mali icmali.
- `desktop-payment-detail.png`: Yeşil Defter ve İmalat Çarşafı detayı.
- `mobile-payment-cover.png`: 390 × 844 mobil liste ve kapak çalışma alanı.

## Doğrulanan gerçek veriler

- Proje: 5 toplam, 4 açık.
- Sözleşme pozu: 13.
- Sözleşme toplamı: 48.400.000,00 TL.
- Seçili belge: `E2E-HAK-002`, kesinleşmiş 2 nolu hakediş.
- Bu dönem brüt: 32.500,00 TL.
- Kümülatif brüt: 97.500,00 TL.
- Dönem net ödenecek: 30.875,00 TL.

## Kabul ölçütleri

- Kapak, Özet, Detay ve Rapor/Audit sekmeleri aynı gerçek rapor read-model'ini kullanır.
- Tek `h1` korunur.
- 1440 px ve 390 px belge düzeyinde yatay taşma yoktur.
- Tarayıcı konsolunda hata yoktur.
- Görsel doğrulamada oluşturma, onay, iade veya kesinleştirme mutasyonu gönderilmemiştir.
- Şema, migration ve mevcut action/service/repository sözleşmeleri değiştirilmemiştir.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden genel/demir metraj
veri girişi dilimine geçilmez.
