# Faz 6 — Genel/Demir Metraj Veri Girişi

Bu klasör, `/hakedis` sayfasındaki genel/demir metraj çalışma alanının production
build üzerinde ve gerçek muhasebe demo oturumuyla alınan görsel kabul paketidir.
Görsel doğrulama sırasında veri mutasyonu gönderilmemiştir.

## Görseller

- `desktop-general-measurement.png`: Gerçek `GEN-1` genel metraj föyü, 2 satır ve toplam 6 metraj.
- `desktop-rebar-measurement.png`: Production verisindeki gerçek demir metraj boş durumu.
- `mobile-general-measurement.png`: 390 × 844 genel metraj çalışma alanı.
- `mobile-rebar-measurement.png`: 390 × 844 demir metraj boş durumu.

## Doğrulanan kabul ölçütleri

- Genel ve demir metraj sekmeleri aynı, erişilebilir çalışma alanında açılıyor.
- Kesinleşmiş hakediş verisi salt okunur; taslak/iade durumunda düzenleme davranışı testle korunuyor.
- Mevcut snapshot, durum guard'ı, idempotency, ledger ve kapsam sözleşmeleri değişmiyor.
- Masaüstü ve mobil belge düzeyinde yatay taşma yok; sayfada tek `h1` bulunuyor.
- Tarayıcı konsolunda hata yok.
- Yeni DB alanı, migration veya sahte demo kaydı eklenmedi.
