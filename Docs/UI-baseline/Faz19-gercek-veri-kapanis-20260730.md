# Faz 19 — Bilgi Merkezi: İzole Gerçek Veri ve Kapanış

Tarih: 30.07.2026

## İzole kabul kapsamı

Kabul yalnız `tenant-noa-demo` altında ayrılmış şu kapsamda çalıştırıldı:

| Kayıt | Kimlik / açıklama |
|---|---|
| Firma | `company-f19-kabul-20260730` — F19 Bilgi Merkezi Kabul Şirketi |
| Dönem | `period-f19-kabul-20260730` — F19 Kabul 2026 (açık) |
| Admin oturumu | `session-f19-kabul-admin-20260730` — Ahmet Yılmaz |
| Salt-okur oturumu | `session-f19-kabul-viewer-20260730` — Muhasebe Kullanıcısı |
| Duyuru 1 | `F19-KABUL-20260730::announcement::001` — önemli güncelleme, `PUBLISHED`, revizyon 3 |
| Duyuru 2 | `F19-KABUL-20260730::announcement::002` — planlı bakım, `PUBLISHED`, revizyon 2 |
| Duyuru 3 | `F19-KABUL-20260730::announcement::003` — geçmiş haber, `ARCHIVED`, revizyon 3 |
| Duyuru 4 | `F19-KABUL-20260730::announcement::004` — yönetici taslağı, `DRAFT`, revizyon 1 |

Fixture platform operatörü, tenantlar arası yayın, otomatik bildirim,
e-posta/SMS/push, ek veya dış yayın servisi içermez.

## Veri ve iş akışı kabulü

`npm run announcement:acceptance:verify` geliştirme sırasında ve kapanış
regresyonunda tekrar çalıştırıldı.

- Admin dört scoped kaydı; salt-okur yalnız iki `PUBLISHED` kaydı gördü.
- Merkezi audit tam olarak dokuz kayıtta kaldı: dört create, bir taslak
  update, üç publish ve bir archive.
- Audit metadata başlık, özet, içerik veya request key taşımadı.
- Aynı request key ikinci mutation veya audit üretmedi. Arşivlenmiş kayda ait
  eski publish isteğinin yeniden oynatılması da monotonic yaşam döngüsünü
  bozmadan idempotent başarı döndürdü; bu gerçek kabulde bulunan sınır durumu
  service regresyon testine alındı.
- Yanlış firma/dönem scope'u, salt-okurun taslak okuması ve yazımı ile kapalı
  dönemde admin yazımı fail-closed reddedildi.
- `Notification`, kasa/banka, gider, yevmiye, bordro, stok ve puantaj
  etkileri `0` kaldı.

## Gerçek UI kabulü

Kimliği doğrulanmış admin ve salt-okur oturumlarında
`/bilgi-merkezi?announcement=F19-KABUL-20260730%3A%3Aannouncement%3A%3A001`
deep-link'i gerçek Prisma verisiyle doğrulandı.

- Admin dört kartı, sayaçları, taslak düzenleme/yayımlama ve yayımlanmış kayıt
  arşivleme kontrollerini gördü.
- Salt-okur yalnız iki yayımlanmış kartı ve detayını gördü; yeni duyuru,
  düzenleme, yayımlama ve arşivleme kontrolleri DOM'a eklenmedi.
- İki yeni yayında `YENİ` rozeti, eski arşiv kaydında 1 Temmuz tarihi doğru
  gösterildi.
- Masaüstünde açık ve koyu tema ile 390×844 mobil kart ve detay çekmecesi
  denetlendi; global yatay taşma görülmedi.
- Print sözleşmesinde mutation/kapama kontrolleri gizlenirken kartlar ve detay
  içeriği görünür kaldı.
- Tarayıcı konsolunda hata veya uyarı görülmedi.

## Kalite kapıları

Faz 8/11/12 ile Faz 14–18 kabul komutları Faz 19 sonrasında yeniden başarıyla
çalıştı:

```text
npm run hakedis:scenario:verify
npm run hakedis:import:scenario:verify
npm run isg:acceptance:verify
npm run checklist:acceptance:verify
npm run fleet:acceptance:verify
npm run tire:acceptance:verify
npm run support:acceptance:verify
npm run announcement:acceptance:verify
```

Tam kapılar:

```text
npm test                                                # 265 dosya / 1548 test
npm run type-check
npm run db:validate
npx prisma migrate status --schema prisma/schema.prisma # 51 migration, güncel
npm run lint
npm run build                                           # 77 sayfa
git diff --check
```

## Kapanış

Faz 19; domain, additive şema/migration, scope ve durum duyarlı repository,
Server Action ve içeriksiz audit, responsive UI, gerçek veri, idempotency,
deep-link, tema/print ve rol sınırıyla tamamlandı. Platform geneli yayın,
kişisel hedefleme/okundu analitiği, yorum, zengin metin, dosya eki, otomatik
bildirim, zamanlayıcı ve dış yayın servisleri kapsam dışında kaldı.
