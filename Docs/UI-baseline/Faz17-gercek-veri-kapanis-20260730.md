# Faz 17 — Mobil İSG Kontrol Listeleri: İzole Gerçek Veri ve Kapanış

Tarih: 30.07.2026

## İzole kabul kapsamı

Kabul yalnız `tenant-noa-demo` altında ayrılmış aşağıdaki kapsamda çalıştırıldı:

| Kayıt | Kimlik / açıklama |
|---|---|
| Firma | `company-f17-kabul-20260730` — F17 Mobil İSG Kabul Şirketi |
| Dönem | `period-f17-kabul-20260730` — F17 Kabul 2026 |
| Proje | `F17-KABUL-20260730` — F17 İzole Mobil İSG Kabul Projesi |
| Oturum | `session-f17-kabul-accounting-20260730` — Muhasebe / Kurumsal |
| Şablon | F17 Mobil Saha Kontrolü — 3 madde |

Fixture; canlı sağlayıcı, resmi kurum bağlantısı, kamera, konum, sağlık verisi
ve dış entegrasyon içermez.

## Veri ve iş akışı kabulü

`npm run checklist:acceptance:verify` art arda iki kez çalıştırıldı. Tek aktif
şablon, tek tamamlanmış yürütme ve üç yanıt (`PASS`, `FAIL`,
`NOT_APPLICABLE`) korundu. Uygunsuz yanıt, aynı kapsamda önceden bulunan açık
İSG bulgusuna yalnız açık servis aksiyonuyla bağlandı.

- Yürütme, yanıt, bulgu bağlantısı ve tamamlama tekrarları idempotent kaldı.
- Merkezi audit tam olarak 7 kayıt taşıdı: şablon oluşturma, yürütme başlatma,
  üç yanıt, mevcut bulgu bağlantısı ve yürütme tamamlama.
- Audit metadata serbest kontrol notu, şablon/madde metni veya sağlık ayrıntısı
  taşımadı.
- Yanlış firma, dönem ve proje okumaları `0` döndü.
- Kasa/banka, gider, yevmiye, bordro, stok ve puantaj etkileri `0` kaldı.
- Gerçek Prisma kabulü sırasında bulunan `templateItemId → checklistItemId`
  eşleme kusuru repository'de düzeltildi ve regresyon testi eklendi.

Faz 8/11/12 ile Faz 14–16 kabul komutları F17 sonrasında tekrar başarıyla
çalıştı:

```text
npm run hakedis:scenario:verify
npm run hakedis:import:scenario:verify
npm run isg:acceptance:verify
npm run fleet:acceptance:verify
npm run tire:acceptance:verify
```

## Gerçek UI kabulü

Kimliği doğrulanmış F17 muhasebe oturumunda gerçek kayıtla `/isg` ve
`/isg?checklist=F17-KABUL-20260730%3A%3Achecklist-run%3A%3A001` doğrulandı.

- 1440×900 masaüstünde koyu ve açık temada global yatay taşma görülmedi.
- Deep-link; doğru şablon, üç metinli yanıt durumu, notlar, bulgu bağlantısı ve
  altı görünür yürütme audit olayını açtı.
- Ham proje kimliği yerine `F17-KABUL-20260730 · F17 İzole Mobil İSG Kabul
  Projesi` kullanıcı etiketi gösterildi ve aramaya katıldı.
- 390×844 mobil görünümde çekmece kullanılabilir genişlikte tek kolon kaldı;
  global yatay taşma oluşmadı.
- Mobil liste tablosu 720 px iç genişliğini 341 px kendi kaydırma kabında
  tuttu; belge genişliğini büyütmedi.
- Print sözleşmesinde yeni kayıt kontrolleri gizlenirken kontrol tablosu görünür
  kaldı.
- Gerçek Salt Okur oturumunda “Salt okunur erişim” gösterildi; yeni şablon ve
  yeni saha kontrolü düğmeleri DOM'a eklenmedi.
- Tarayıcı konsolunda hata veya uyarı görülmedi; deep-link kapanışı sorgu
  parametresini `/isg` olarak temizledi.

## Kalite kapıları

```text
npm test                 # 255 dosya / 1490 test
npm run type-check
npm run db:validate
npm run lint
npm run build            # 75 statik sayfa üretimi
git diff --check
```

## Kapanış

Faz 17; domain, additive şema/migration, scoped repository, server action ve
audit, mobil UI, izole gerçek veri, idempotency, tema/responsive/print ve tam
regresyon kabulüyle tamamlandı. Offline/PWA, fotoğraf/video, konum, elektronik
imza, otomatik bulgu/bildirim, finans/stok/bordro/puantaj hareketi ve dış
sağlayıcılar kapsam dışında kaldı.
