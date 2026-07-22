# Bordro — görsel baseline

- Kaynak şablon: `noa_i_n_aat_personel_ve_maa_y_netimi.html`.
- Ortam: production build, gerçek `demo-accounting` oturumu, 19.07.2026.
- `desktop-workspace.png`: 1440 × 1100; bordro başlığı, net/kesinti özeti,
  gerçek tahakkuk kartları, filtreler ve ödeme listesi doğrulandı.
- `desktop-paid-filter-workspace.png`: Ödenmiş filtresi iki gerçek maaş ödeme
  hareketini gösterdi; seçili filtre, özet ve liste aynı scoped kayıt kümesini
  kullandı.
- `mobile-workspace.png`: 390 × 844; bordro başlığı ve finans özetleri tek
  sütuna akıyor, belge düzeyinde yatay taşma yok.

Görsel kontrol sırasında mutasyon gönderilmedi. Tahakkuk oluşturma,
kesinleştirme/iptal, kasa/banka ödeme hareketi, ledger ve audit akışları
değiştirilmeden korunmuştur.
