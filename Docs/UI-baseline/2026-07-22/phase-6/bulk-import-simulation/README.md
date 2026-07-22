# Faz 6 — Toplu Aktarım ve Simülasyon Adayları

Bu baz çizgileri 22.07.2026 tarihinde production build (`next start -p 3116`)
üzerinde, muhasebe demo oturumunda ve gerçek `E2E-HAK-002` read-model verisiyle
kaydedildi.

- CSV önizleme: 2 satır; 1 hazır, 1 bilinmeyen poz
- Simülasyon pozu: `BETON-C30`
- Mevcut kümülatif: 15 m³
- Önerilen miktar: 10 m³
- Yeni kümülatif: 25 m³
- Kalan sözleşme: 75 m³
- Tahmini dönem tutarı: 15.000,00 TL
- Masaüstü viewport: 1440 × 1000
- Mobil viewport: 390 × 844
- Belge düzeyinde yatay taşma: 0
- `h1` sayısı: 1
- Tarayıcı konsol hatası: yok
- Server action / DB mutasyonu: gönderilmedi

Dosyalar:

- `desktop-import-simulation.jpg`
- `mobile-import-simulation.jpg`
- `mobile-simulation-result.jpg`
- `sample-metraj-preview.csv`

XLSX ayrıştırma, kalıcı sütun eşleme ve toplu DB yazımı bu dilimde uygulanmadı.
Bu özellikler audit, idempotency, transaction ve rollback tasarımıyla birlikte
ayrı F2 mini-RFC ve kullanıcı onayı gerektirir.
