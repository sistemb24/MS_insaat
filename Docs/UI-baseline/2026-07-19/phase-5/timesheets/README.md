# Puantaj — görsel baseline

- Kaynak şablonlar: `noa_i_n_aat_puantaj_cetveli.html`,
  `noa_i_n_aat_puantaj_cetveli_veri_giri_i.html` ve
  `noa_i_n_aat_puantaj_aktar_m_ve_fazla_mesai.html`.
- Ortam: production build, gerçek `demo-accounting` oturumu, 19.07.2026.
- `desktop.png`: 1440 × 1100; tek `H1`, v2 kabuk, gerçek çalışma günü/mesai/
  net ödeme özeti ve puantaj cetveli doğrulandı.
- `desktop-saved-filter.png`: kesinleşen durum filtresi 6 kaydın 4'ünü
  görünür kıldı; üst sayaç ve liste aynı kapsamı kullandı.
- `mobile.png`: 390 × 844; başlık, özet kartları ve filtreler tek sütuna
  akıyor, belge düzeyinde yatay taşma yok.

Görsel kontrol sırasında mutasyon gönderilmedi. Puantaj oluşturma,
kesinleştirme/iptal, audit, RBAC ve Personel içindeki maaş tahakkuku bağlantısı
değiştirilmeden korunmuştur.
