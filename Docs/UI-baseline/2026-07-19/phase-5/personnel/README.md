# Personel — görsel baseline

- Kaynak şablonlar: `noa_i_n_aat_personel_y_netimi.html` ve
  `noa_i_n_aat_personel_ve_maa_y_netimi.html`.
- Ortam: production build, gerçek `demo-accounting` oturumu, 19.07.2026.
- `desktop.png`: 1440 × 1100; tek `H1` (`Personel Yönetimi`), v2 kabuk ve
  gerçek personel/şantiye/bordro ödeme özetleri doğrulandı.
- `mobile.png`: 390 × 844; üst çalışma alanı ve özet kartları tek sütuna
  akıyor, yatay belge taşması yok.

Görsel kontrol sırasında mutasyon gönderilmedi. Personel kartı, zimmet ve maaş
tahakkuku yüzeyleri mevcut server action, tenant/firma/dönem kapsamı ve audit/
ledger davranışlarını değiştirmeden korunmuştur.
