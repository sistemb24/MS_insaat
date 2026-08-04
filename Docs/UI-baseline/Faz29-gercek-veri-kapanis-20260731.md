# Faz 29 — Müşteri Tipi Sözlüğü Gerçek Veri ve Kapanış

> Tarih: 31.07.2026
> Durum: Tamamlandı
> RFC: `Docs/RFC-F29-01-musteri-tipi-sozlugu.md`

## Uygulanan kapsam

- Şirket kapsamlı ve dönemden bağımsız `CustomerType` modeli ile
  `20260731080000_add_customer_types` migration'ı eklendi.
- Mevcut `EntityRecord.payload.customerType` alanı ve müşteri kartları
  taşınmadan, yönetilen tipler tüm dönemlerdeki mevcut kart değerleriyle
  federatif birleştirildi.
- Türkçe uyumlu normalizasyon, normalize tekrar koruması, optimistic revision,
  kullanıcı/firma kapsamlı idempotency ve admin-only mutation uygulandı.
- Audit yalnız aksiyon, durum ve revizyon geçişini taşır; tip adı, açıklama ve
  request key içermez.
- `/ayarlar` yönetim paneli ile `/musteriler` filtre, yeni/düzenle seçimi ve
  CSV/XLSX satır doğrulaması aynı effective sözlüğe bağlandı.
- Create, update ve toplu import server action'ları istemci sonucuna
  güvenmeden müşteri tipi sözleşmesini yeniden uygular.

## İzole PostgreSQL kabulü

`npm run customer-type:acceptance:verify` şu kapsamda tekrar çalıştırılabilir:

- tenant: `tenant-noa-demo`
- company: `company-f29-kabul-20260731`
- period: `period-f29-kabul-20260731`
- admin/accounting/viewer kabul oturumları

Sonuç:

- iki farklı dönemdeki iki `Kamu İştiraki` kullanımı tek federatif değer olarak
  keşfedildi,
- `Kurumsal` ile keşfedilmiş `Kamu İştiraki` yönetilen tipe dönüştürüldü,
- aynı request key retry'sı yeni mutation veya audit üretmedi,
- normalize duplicate, stale revision ve yetkisiz roller reddedildi,
- kapalı dönem admin yazımı ile firma ve dönem bağımsız okuma geçti,
- `Kamu İştiraki` pasifleştirildiğinde iki mevcut müşteri kartı değişmedi,
- üç başarılı mutation üç redacted audit üretti,
- yabancı firma, müşteri kartı ve finans/ledger/stok yan etkisi `0` kaldı.

## Gerçek UI kabulü

- Yönetici `/ayarlar`: `Kurumsal` ve `Kamu İştiraki`, kullanım sayısı `2`,
  aktif/pasif durumları ve yönetim kontrolleri gerçek F29 kapsamında görüldü.
- `/musteriler`: sözlük adları filtrede sunuldu; `Kamu İştiraki` filtresi
  yalnız `MUS-F29-01` aktif dönem kaydını gösterdi.
- Yeni müşteri formunda yalnız aktif `Kurumsal` seçeneği sunuldu; pasif
  `Kamu İştiraki` yeni atamadan dışlandı.
- Koyu tema `data-theme=dark` ve `color-scheme: dark` ile doğrulandı.
- 390 px viewport kabulünde belge ve body genişliği eşit kaldı; sayfa düzeyinde
  yatay taşma oluşmadı.
- Tarayıcı konsolunda hata veya uyarı görülmedi.

## Kalite kapıları

- `npm test`: 314 dosya / 1.743 test geçti.
- `npm run type-check`: geçti.
- `npm run db:validate`: geçti; 60 migration güncel.
- `npm run lint`: uyarısız geçti.
- `npm run build`: Next.js 16.2.9 ile 77 sayfa üretildi.
- `git diff --check`: geçti.

## Korunan sınırlar

Genel lookup motoru, müşteri tipi hiyerarşisi/çoklu etiket, tip bazlı
vergi/KDV/muhasebe/abonelik davranışı, mevcut müşteri backfill'i, yeni API
endpoint'i, satış/tahsilat yaşam döngüsü, granular RBAC, dış CRM ve gerçek
sağlayıcı durumları değiştirilmedi.
