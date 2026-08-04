# Faz 18 — Destek Talebi Merkezi: İzole Gerçek Veri ve Kapanış

Tarih: 30.07.2026

## İzole kabul kapsamı

Kabul yalnız `tenant-noa-demo` altında ayrılmış aşağıdaki kapsamda çalıştırıldı:

| Kayıt | Kimlik / açıklama |
|---|---|
| Firma | `company-f18-kabul-20260730` — F18 Destek Merkezi Kabul Şirketi |
| Dönem | `period-f18-kabul-20260730` — F18 Kabul 2026 (kapalı) |
| Requester oturumu | `session-f18-kabul-viewer-20260730` — Salt Okur |
| Admin oturumu | `session-f18-kabul-admin-20260730` — Yönetici |
| Talep 1 | `F18-KABUL-20260730::ticket::001` — `RESOLVED` |
| Talep 2 | `F18-KABUL-20260730::ticket::002` — `CLOSED` |

Fixture canlı NOA platform desteği, e-posta/SMS, dosya eki, SLA, otomatik
bildirim veya dış helpdesk bağlantısı içermez.

## Veri ve iş akışı kabulü

`npm run support:acceptance:verify` art arda iki kez ve kapanış regresyonunda
bir kez daha çalıştırıldı. İki talep, dört append-only mesaj ve durumlar aynı
kaldı.

- Merkezi audit tam olarak 9 kayıt taşıdı: iki talep oluşturma, iki yanıt ve
  beş ileri durum geçişi.
- Audit metadata konu, mesaj gövdesi veya kullanıcı request key'i taşımadı.
- Aynı request key ikinci mutation veya audit üretmedi.
- Yanlış firma/dönem scope'u, başka requester ve kapalı talebe yanıt
  fail-closed reddedildi.
- Kasa/banka, gider, yevmiye, bordro, stok ve puantaj etkileri `0` kaldı.
- Gerçek Prisma kabulünde nested mesaj yazımının bileşik ilişkide zaten
  sağlanan scope alanlarını tekrar göndermesi hatası bulundu. Repository
  yalnız mesaj alanlarını yazacak şekilde düzeltildi ve regresyon testi
  eklendi.

Faz 8/11/12 ile Faz 14–17 kabul komutları Faz 18 sonrasında yeniden başarıyla
çalıştı:

```text
npm run hakedis:scenario:verify
npm run hakedis:import:scenario:verify
npm run isg:acceptance:verify
npm run checklist:acceptance:verify
npm run fleet:acceptance:verify
npm run tire:acceptance:verify
```

## Gerçek UI kabulü

Kimliği doğrulanmış admin ve requester oturumlarında
`/destek-merkezi?ticket=F18-KABUL-20260730%3A%3Aticket%3A%3A001` ile kapalı
talep deep-link'i doğrulandı.

- 1440×900 masaüstünde açık ve koyu temada global yatay taşma görülmedi.
- Liste iki talebi, doğru durum/öncelik/tür etiketlerini ve dört mesajı gerçek
  veriden gösterdi.
- Admin sıradaki durum geçişini görürken requester yalnız kendi taleplerini,
  yeni talep ve açık talebe yanıt kontrollerini gördü; admin geçiş düğmesi
  requester DOM'una eklenmedi.
- `CLOSED` talepte yanıt formu gizlendi ve açıklayıcı kapanış metni gösterildi.
- 390×844 mobil görünümde detay çekmecesi tek kolon kaldı; 760 px tablo,
  341 px kendi kaydırma kabında tutuldu ve belgeyi genişletmedi.
- Print sözleşmesinde mutation ve kapatma kontrolleri gizlenirken destek
  tablosu ve konuşma içeriği görünür kaldı.
- Tarayıcı konsolunda hata veya uyarı görülmedi.

## Kalite kapıları

```text
npm test                                             # 260 dosya / 1518 test
npm run type-check
npm run db:validate
npx prisma migrate status --schema prisma/schema.prisma  # 50 migration, güncel
npm run lint
npm run build                                        # 76 sayfa
git diff --check
```

## Kapanış

Faz 18; domain, additive şema/migration, owner-aware repository, Server Action
ve güvenli audit, responsive UI, izole gerçek veri, idempotency, deep-link,
tema/print ve tam regresyon kabulüyle tamamlandı. Canlı destek operatörü,
gerçek zamanlı chat, e-posta/SMS, ek, SLA, otomatik atama/eskalasyon,
bildirimler ve dış helpdesk sağlayıcıları kapsam dışında kaldı.
