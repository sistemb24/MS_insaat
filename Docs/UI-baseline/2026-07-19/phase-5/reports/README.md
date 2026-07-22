# Faz 5 — Raporlar Görsel Baseline

Tarih: 19.07.2026
Route: `/raporlar`
Oturum: `demo-accounting`
Kaynak: production build (`next start -p 3022`)

## Kayıtlar

| Dosya | Kapsam | SHA-256 |
|---|---|---|
| `reports-desktop-1440.png` | 1440 × 1200 Rapor Merkezi, filtre çalışma alanı, rapor kartları ve gerçek tablolar | `24418d5d789d38def6d63b0855f09baff28f64100f3aeabbf25e58213d733cd3` |
| `reports-expense-filter-desktop-1440.png` | 1440 × 1200 gerçek Gider kaynak filtresi uygulanmış rapor kapsamı | `62859710bab0b64e1bea36eb685ee09b973e6540c3e9c73cfa4e55fd4f826a22` |
| `reports-mobile-390.png` | 390 × 1200 mobil Rapor Merkezi, kartlar ve filtreler | `42c25db7f8423a6f60885710a42b243229120788b8ce7ca6fd3df35863c320b4` |

## Doğrulanan sözleşmeler

- AppShell varyantı: `v2-reports-pilot`.
- Masaüstü ve mobilde tek `h1`, dört çalışan rapor kısayolu ve belge düzeyinde `0` px yatay taşma.
- Kaynak, tarih aralığı ve cari filtresi; özet, canlı tablolar, CSV indirmeleri ve yazdırma kapsamına birlikte uygulanır.
- Kısayollar şantiye kârlılık, operasyon özeti ve cari ekstre bölümlerine gerçek sayfa içi bağlantılar verir.
- Kasa/banka, çek, fatura, gider, hakediş, puantaj ve maaş değerleri mevcut scoped read-modelden türetilir; görsel kontrol sırasında mutasyon gönderilmedi.
- Production build doğrulandı; şema, migration, veri ve rapor service/export sözleşmelerinde değişiklik yoktur.

Bu baseline kullanıcı görsel kabulü bekler. Kabul edilmeden Faz 5 Stok/Depo dilimine geçilmez.
