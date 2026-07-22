# Faz 6 — Proje, sözleşme ve poz listesi görsel kabul kaydı

Kaynak şablonlar:

- `stitch_HTML_sablonlar/hakedi_pro_proje_bilgileri.html`
- `stitch_HTML_sablonlar/hakedi_pro_proje_bilgileri_ve_s_zle_me_detaylar.html`
- `stitch_HTML_sablonlar/hakedi_pro_i_kalemleri_ve_poz_listesi.html`
- `stitch_HTML_sablonlar/hakedi_pro_yeni_poz_ekle_formu_yan_panel.html`
- `stitch_HTML_sablonlar/Mobil_Dosyalar/hakedi_pro_proje_bilgileri_mobil.html`

Production build, gerçek muhasebe demo oturumu ve `/hakedis` route'u ile
19.07.2026 tarihinde kaydedildi.

## Baz çizgileri

- `desktop-hakedis-pro.png`: 1440 × 1000 Hakediş Pro genel görünümü.
- `desktop-contract-items.png`: ilk projenin sözleşme ve poz çalışma alanı.
- `mobile-hakedis-pro.png`: 390 × 844 mobil genel görünüm.

## Doğrulama

- `data-shell-variant="v2-progress-payment-pilot"`: 1
- `data-hakedis-pro-workspace="project-contract-items"`: 1
- `h1`: 1
- Hakediş Pro bölüm kısayolu: 2
- Görünür sözleşme poz tablosu: 1
- Masaüstü belge yatay taşması: 0 px
- Mobil belge yatay taşması: 0 px
- Production demo verisi: 5 proje, 4 açık proje, 13 sözleşme pozu
- Production sözleşme toplamı: 48.400.000,00 TL
- Sayfa başlığı: `Hakediş | NOA İnşaat`

Görsel doğrulamada proje, poz, fiyat revizyonu veya hakediş mutasyonu
gönderilmedi. Görünüm yalnız mevcut `ConstructionProject` ve
`ConstructionContractItem` alanlarını kullanır; şablondaki ek tarih/idare
alanları için yeni DB modeli üretilmedi.
