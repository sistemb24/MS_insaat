# Faz 21 — Personel Avans Yönetimi: İzole Gerçek Veri ve Kapanış

Tarih: 30.07.2026

## İzole kabul kapsamı

Kabul yalnız `tenant-noa-demo` altında ayrılmış şu kapsamda çalıştırıldı:

| Kayıt | Kimlik / açıklama |
|---|---|
| Firma | `company-f21-kabul-20260730` — F21 Personel Avans Kabul Şirketi |
| Dönem | `period-f21-kabul-20260730` — F21 Kabul 2026 (açık) |
| Personel 1 | `F21-PER-001` — F21 Ayşe Demir |
| Personel 2 | `F21-PER-002` — F21 Mehmet Kaya |
| Kasa | `F21-KASA-001` — F21 Merkez Kasa |
| Kaynak bordro | `F21-BRD-2026-08` — 3.000 TL mevcut avans kesintisi |
| Avanslar | Birer `SETTLED`, `REJECTED`, `CANCELLED` ve `DRAFT` |

Fixture banka API'si, IBAN doğrulama, dış bordro sağlayıcısı, faiz, taksit,
vergi veya yasal kesinti motoru içermez.

## Veri ve iş akışı kabulü

`npm run advance:acceptance:verify` art arda iki kez çalıştırıldı.

- Dört avans ve iki append-only mahsup aynı kimlik ve durumlarda kaldı.
- 3.000 TL onaylı avans için tek `Avans Ödemesi` kasa çıkışı üretildi.
- Dengeli yevmiyede 135 Personel Avansları 3.000 TL borç, seçilen kasa hesabı
  3.000 TL alacak yazıldı.
- Aynı ödeme request key'i ikinci kasa/banka hareketi veya yevmiye üretmedi.
- 1.000 TL kısmi ve 2.000 TL son mahsup açık bakiyeyi sıfırlayıp talebi
  `SETTLED` yaptı.
- Kaynak bordro satırındaki `advanceDeduction` 3.000 TL olarak değişmeden
  kaldı; mahsup ikinci yevmiye üretmedi.
- Merkezi audit tam 16 kayıtta kaldı ve serbest açıklama, hesap adı veya
  request key taşımadı.
- Yanlış firma/dönem, viewer yönetici işlemi, admin finans ödemesi ve kapalı
  dönem mutasyonu fail-closed reddedildi.
- Gider, bildirim, stok ve puantaj etkileri sıfır kaldı.

## UI kabulü ve tarayıcı kısıtı

`/personel?advance=<id>` yüzeyi için bileşen testleri:

- Gerçek iş akışı sayaçlarını, açık personel alacağını ve kartları doğrular.
- Admin deep-link'inde yalnız yönetici onay/red kontrollerini doğrular.
- Accounting deep-link'inde yalnız finans kontrollerini doğrular.
- Salt-okur DOM'unda hiçbir mutation kontrolü bulunmadığını doğrular.
- 390 px uyumlu tek kolon sınıfları, yerel kaydırma, tema token'ları,
  `print:hidden` mutation/form kontrolleri ve print-safe kart/detay yapısı kod
  sözleşmesinde korunur.

In-app browser, yerel URL'ye gezinmeyi güvenlik politikası nedeniyle reddetti.
Bu politika aşılmadı ve ekran görüntüsü üretildiği iddia edilmedi. İnteraktif
masaüstü/mobil ekran görüntüsü kabulünün yerine bileşen testleri, TypeScript,
lint ve 77 sayfalık production build kanıtı kullanıldı.

## Kalite kapıları

Faz 8/11/12 ile Faz 14–20 kabul komutları Faz 21 migration'ı sonrasında
yeniden başarıyla çalıştı:

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
npm run advance:acceptance:verify
```

Tam kapılar:

```text
npm test                                                # 275 dosya / 1602 test
npm run type-check
npm run db:validate
npx prisma migrate status --schema prisma/schema.prisma # 53 migration, güncel
npm run lint
npm run build                                           # 77 sayfa
git diff --check
```

## Kapanış

Faz 21; domain, additive şema/migration, scope ve optimistic revision duyarlı
repository, atomik avans ödemesi/yevmiye transaction'ı, mevcut bordro
kesintisini değiştirmeyen append-only mahsup, Server Action ve içeriksiz audit,
responsive UI, gerçek veri, idempotency, deep-link, print ve rol sınırıyla
tamamlandı. Çalışan self-service, banka ödeme emri, döviz, faiz/taksit, yasal
kesinti motoru, otomatik bordro değişikliği ve dış sağlayıcılar kapsam dışında
kaldı.
