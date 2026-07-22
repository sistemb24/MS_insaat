# Faz 5 — Ayarlar görsel kabul kaydı

Kaynak şablonlar:

- `stitch_HTML_sablonlar/noa_i_n_aat_ayarlar.html`
- `stitch_HTML_sablonlar/Mobil_Dosyalar/noa_i_n_aat_ayarlar_mobil.html`

Production build, gerçek muhasebe demo oturumu ve `/ayarlar` route'u ile
19.07.2026 tarihinde kaydedildi.

## Baz çizgileri

- `desktop-settings.png`: 1440 × 1000 masaüstü, tam sayfa.
- `desktop-user-filter.png`: aktif kullanıcı aramasında `Muhasebe` filtresi
  uygulanmış masaüstü, tam sayfa.
- `mobile-settings.png`: 390 × 844 mobil görünür alan.

## Doğrulama

- `data-shell-variant="v2-settings-pilot"`: 1
- `data-settings-workspace="true"`: 1
- `h1`: 1
- Ayarlar çalışma alanı kısa yolu: 4
- Masaüstü belge yatay taşması: 0 px
- Mobil belge yatay taşması: 0 px
- Kullanıcı filtresinde görünür satır: 1
- Sayfa başlığı: `Ayarlar | NOA İnşaat`

Görsel doğrulamada ayar, kullanıcı, rol, banka, Arvento veya ledger mutasyonu
gönderilmedi. Banka ve Arvento bağlantıları mevcut sandbox sınırında tutuldu;
gerçek dış servis bağlantısı varmış gibi gösterilmedi. Tamamlanmış API Yönetimi
ve e-Fatura yüzeyleri bu dilimde değiştirilmedi.
