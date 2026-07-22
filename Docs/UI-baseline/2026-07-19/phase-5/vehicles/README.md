# Faz 5 — Araçlar görsel kabul kaydı

Kaynak şablonlar:

- `stitch_HTML_sablonlar/noa_i_n_aat_ara_ve_filo_y_netimi.html`
- `stitch_HTML_sablonlar/noa_i_n_aat_ara_filo_takip_operasyon.html`
- `stitch_HTML_sablonlar/noa_i_n_aat_ara_bak_m_ve_servis_takvimi.html`
- `stitch_HTML_sablonlar/Mobil_Dosyalar/noa_i_n_aat_ara_ve_filo_y_netimi_mobil.html`

Production build, gerçek muhasebe demo oturumu ve `/araclar` route'u ile
19.07.2026 tarihinde kaydedildi.

## Baz çizgileri

- `desktop-vehicles.png`: 1440 × 1000 masaüstü, tam sayfa.
- `desktop-maintenance-filter.png`: bakım uyarısı filtresi seçili masaüstü,
  tam sayfa.
- `mobile-vehicles.png`: 390 × 844 mobil görünür alan.

## Doğrulama

- `data-shell-variant="v2-vehicle-fleet-pilot"`: 1
- `data-vehicle-fleet-workspace="true"`: 1
- `h1`: 1
- Araç çalışma alanı kısa yolu: 3
- Masaüstü belge yatay taşması: 0 px
- Mobil belge yatay taşması: 0 px
- Bakım filtresinde görünür uyarı satırı: 1
- Sayfa başlığı: `Araçlar | NOA İnşaat`

Görsel doğrulamada araç kartı, aktivasyon/pasife alma veya başka bir mutasyon
gönderilmedi. Arvento görünümü sandbox read-model olarak tutuldu; canlı GPS
bağlantısı ya da gerçek harici entegrasyon varmış gibi gösterilmedi.
