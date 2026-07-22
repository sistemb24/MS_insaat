# Faz 6 — İmalat Çarşafı, Yeşil Defter ve Miktar Kontrolü

Bu klasör, `/hakedis` sayfasındaki kesinleşmiş `E2E-HAK-002` raporunun production
build ve gerçek muhasebe demo oturumuyla alınan görsel kabul paketidir. Görsel
doğrulama sırasında veri mutasyonu gönderilmemiştir.

## Görseller

- `desktop-green-book.png` ve `mobile-green-book.png`: Kümülatif miktar, bakiye ve ilerleme durumu.
- `desktop-manufacturing-sheet.png` ve `mobile-manufacturing-sheet.png`: Önceki/cari/kümülatif imalat tutarları.
- `desktop-quantity-control.png` ve `mobile-quantity-control.png`: Sözleşme miktar kontrolü ve temiz durum.

## Doğrulanan gerçek veri

- 2 sözleşme pozu ve 2 hareket gören poz.
- Toplam 18 kümülatif miktar.
- 65.000,00 TL önceki, 32.500,00 TL cari ve 97.500,00 TL kümülatif imalat.
- 552.500,00 TL sözleşme bakiyesi.
- Sözleşme miktarını aşan poz bulunmuyor.

## Kabul ölçütleri

- Üç görünüm bağımsız ve erişilebilir rapor sekmeleri olarak açılıyor.
- Mevcut `greenBook` ve `manufacturingSheet` snapshot read-model'leri kullanılıyor.
- Masaüstü ve mobil belge düzeyinde yatay taşma yok; geniş tablolar kendi içinde kayıyor.
- Sayfada tek `h1` bulunuyor ve tarayıcı konsolunda hata yok.
- Yeni DB alanı, migration, API veya sahte demo kaydı eklenmedi.
