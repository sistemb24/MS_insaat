# Faz 20 — Personel İzin Yönetimi: İzole Gerçek Veri ve Kapanış

Tarih: 30.07.2026

## İzole kabul kapsamı

Kabul yalnız `tenant-noa-demo` altında ayrılmış şu kapsamda çalıştırıldı:

| Kayıt | Kimlik / açıklama |
|---|---|
| Firma | `company-f20-kabul-20260730` — F20 Personel İzin Kabul Şirketi |
| Dönem | `period-f20-kabul-20260730` — F20 Kabul 2026 (açık) |
| Admin oturumu | `session-f20-kabul-admin-20260730` — Ahmet Yılmaz |
| Muhasebe oturumu | `session-f20-kabul-accounting-20260730` — Muhasebe Kullanıcısı |
| Salt-okur oturumu | `session-f20-kabul-viewer-20260730` — Muhasebe Kullanıcısı |
| Personel 1 | `F20-PER-001` — F20 Ayşe Demir |
| Personel 2 | `F20-PER-002` — F20 Mehmet Kaya |
| Bakiye | 2026, açılış 14, kullanılan 3, kalan 11 gün |
| İzinler | Birer `APPROVED`, `REJECTED`, `CANCELLED` ve çakışma nedeniyle `DRAFT` |

Fixture SGK/e-Devlet, resmî tatil, dış İK servisi, yasal hak ediş motoru veya
otomatik bordro/puantaj üretimi içermez.

## Veri ve iş akışı kabulü

`npm run leave:acceptance:verify` art arda iki kez çalıştırıldı.

- Dört izin ile tek yıllık bakiye aynı kimlik ve durumlarda kaldı.
- Onaylanan yıllık izin üç kullanılan gün üretip kalan bakiyeyi 11 yaptı.
- Çakışan izin onaya gönderilmedi ve taslak kaldı.
- Merkezi audit tam olarak 13 kayıtta kaldı: bir bakiye kaydı, dört create, bir
  update, üç submit, iki approve, bir reject ve bir cancel.
- Audit metadata serbest açıklama, sağlık ayrıntısı, belge veya request key
  taşımadı.
- Aynı request key ikinci kayıt, geçiş, bakiye etkisi veya audit üretmedi.
- Yanlış firma/dönem, viewer mutation, accounting bakiye işlemi ve kapalı
  dönem mutation'ı fail-closed reddedildi.
- `Notification`, kasa/banka, gider, yevmiye, bordro, stok ve puantaj etkileri
  `0` kaldı.

## Gerçek UI kabulü

Admin, muhasebe ve salt-okur oturumlarında
`/personel?leave=F20-KABUL-20260730%3A%3Aemployee-leave%3A%3A001`
deep-link'i gerçek Prisma verisiyle doğrulandı.

- Admin dört izin kartı, bakiye tablosu, bakiye/yeni izin ve uygun yaşam
  döngüsü kontrollerini gördü.
- Muhasebe yeni izin, taslak düzenleme ve onaya gönderme kontrollerini gördü;
  bakiye ve onay/red kontrollerini görmedi.
- Salt-okur dört kaydı ve detayı gördü; hiçbir mutation kontrolü DOM'a
  eklenmedi.
- 1440×900 masaüstünde açık/koyu tema ve 390×844 mobil detay/listede global
  yatay taşma görülmedi. Geniş tablolar kendi kaydırma kabında kaldı.
- Print sözleşmesinde formlar, mutation ve kapatma kontrolleri gizlenirken
  kartlar, bakiye tablosu ve detay içeriği görünür kaldı.
- Tarayıcı konsolunda hata veya uyarı görülmedi.

## Kalite kapıları

Faz 8/11/12 ile Faz 14–19 kabul komutları Faz 20 sonrasında yeniden başarıyla
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
npm run leave:acceptance:verify
```

Tam kapılar:

```text
npm test                                                # 270 dosya / 1578 test
npm run type-check
npm run db:validate
npx prisma migrate status --schema prisma/schema.prisma # 52 migration, güncel
npm run lint
npm run build                                           # 77 sayfa
git diff --check
```

## Kapanış

Faz 20; domain, additive şema/migration, scope ve optimistic revision duyarlı
repository, atomik izin-bakiye transaction'ı, Server Action ve içeriksiz
audit, responsive UI, gerçek veri, idempotency, deep-link, tema/print ve rol
sınırıyla tamamlandı. Çalışan self-service, yasal hak ediş, SGK/e-Devlet,
resmî tatil, otomatik puantaj/bordro/bildirim ve dış İK servisleri kapsam
dışında kaldı.
