# Faz 5 — Çek Görsel Baseline

Tarih: 19.07.2026
Route: `/cek`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3021`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `cheques-desktop-1440.png` | 1440 × 1200 çek yönetimi, gerçek özetler, arama, durum filtresi ve portföy listesi | `519907b8f7fe6682c20dcdbc4d7237ac4e38e699b93a84025d1ba3f57fa9359f` |
| `cheque-form-desktop-1440.png` | 1440 × 1200 mevcut yeni gelen çek formu | `e6012fde08795fecd56341e6be5d9efe6c0663aba123185b10923e9387ce9b98` |
| `cheques-mobile-390.png` | 390 × 1200 mobil üst görünüm, kartlar, filtreler ve portföy listesi | `3ebfe33922e19efc9db2f91d9ea674efebf8db4b8d59c47eafc28ec0b1daf99e` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-cheque-pilot`.
- Masaüstü ve mobilde tek `h1` ve belge düzeyinde `0` px yatay taşma.
- Portföy/tahsil toplamları, portföy adedi ve 30 gün içindeki vade yalnız gerçek scoped çek kayıtlarından türetilir.
- Evrak no, çek no, banka ve cari araması ile durum filtresi aynı gerçek satır seti üzerinde çalışır.
- Yeni çek, seçili kasa/banka hesabına tahsil, hareket, ledger fişi, audit ve yetki davranışlarını korur; görsel kontrol sırasında mutasyon gönderilmedi.
- Production build doğrulandı; şema, migration, veri ve action/service sözleşmelerinde değişiklik yoktur.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Raporlar dilimine geçilmez.