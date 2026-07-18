# PostgreSQL / Prisma Kurulum Notu

Bu not, NOA İnşaat Yönetim SaaS projesinin yerel PostgreSQL kurulumunu açıklar.

## Yerel DB Bilgisi

Kullanılacak yerel PostgreSQL veritabanı:

- DB adı: `insaatMuhasebe`
- Kullanıcı: `postgres`
- Şifre: `123456`
- Host: `localhost`
- Port: `5432`

Connection string:

```text
postgresql://postgres:123456@localhost:5432/insaatMuhasebe?schema=public
```

Bu değer `.env` içinde `DATABASE_URL` olarak tanımlıdır. `.env` dosyası `.gitignore` kapsamındadır.

## Komutlar

DB yoksa oluştur:

```bash
pnpm db:create
```

Prisma schema doğrula:

```bash
pnpm db:validate
```

Prisma Client üret:

```bash
pnpm db:generate
```

Migration uygula:

```bash
pnpm db:migrate
```

Varsayılan Tanımlar kayıtlarını ve örnek alış faturası kaydını ekle:

```bash
pnpm db:seed
```

Geliştirme ortamında hızlı schema push gerektiğinde:

```bash
pnpm db:push
```

## İlk Modelleme Kararı

İlk kalıcı adapter `EntityRecord` modeli ile generic kayıt yapısı kullanır:

- `tenantId`
- `companyId`
- `periodId`
- `slug`
- `code`
- `data` JSON
- audit alanları

Bu karar Tanımlar modülleri için bilinçlidir. Şantiye, tedarikçi, taşeron, personel ve kasa/banka ekranları farklı kolonlara sahip olduğu için ilk aşamada ortak CRUD davranışı tek tabloda güvenceye alınır.

Fatura modülü için ilk normalize işlem tabloları eklendi:

- `PurchaseInvoice`: alış faturası başlığı, kapsam, cari/şantiye bağlantısı, toplamlar ve audit alanları.
- `PurchaseInvoiceLine`: stok/hizmet satırları, miktar, birim fiyat, iskonto, KDV ve satır toplamları.

Hakediş modülü için ilk normalize işlem tabloları eklendi:

- `ProgressPayment`: hakediş başlığı, cari/şantiye bağlantısı, hakediş tipi, kesinti oranı, toplamlar ve durum alanları.
- `ProgressPaymentLine`: hakediş imalat/hizmet satırları, miktar, birim, birim fiyat, KDV ve satır toplamları.

Puantaj modülü için ilk normalize işlem tabloları eklendi:

- `Timesheet`: puantaj başlığı, şantiye/taşeron bağlantısı, ay, yıl, toplam gün/mesai/tutarlar ve durum alanları.
- `TimesheetLine`: personel satırı, çalışma günü, mesai, yevmiye, kesinti ve satır toplamları.

Maaş tahakkuku modülü için puantaj kaynaklı ilk normalize işlem tabloları eklendi:

- `PayrollAccrual`: maaş tahakkuku başlığı, kaynak puantaj bağlantısı, şantiye/taşeron, ay, yıl, toplamlar ve durum alanları.
- `PayrollAccrualLine`: personel satırı, çalışma günü, mesai, brüt, avans/borç kesintisi ve net satır toplamı.

Stok/Depo bakiyesi için bu dilimde ayrı stok hareketi veya stok kartı bakiye tablosu açılmadı; `/stok-depo`, kesinleşmiş `PurchaseInvoiceLine` verisinden depo bazlı okuma modeli üretir. Minimum stok uyarı eşiği için ayrıca `StockMinimumSetting` tablosu açılmıştır.

Gider modülü için ilk normalize işlem tablosu eklendi:

- `Expense`: şantiye/proje gider başlığı, hareket grubu, ödeme hesabı, cari, KDV/toplam ve durum alanları.
- Gider kaydı aynı işlemde `CashBankMovement` üzerinde `sourceType=expense`, `movementType=Gider Ödemesi`, `direction=Çıkış` hareketi üretir.

Çek modülü için ilk normalize işlem tablosu eklendi:

- `Cheque`: gelen/firma çek yönü, evrak no, çek no, banka, keşideci/cari, vade, tutar, durum ve audit alanları.

Kasa/banka modülü için ilk normalize hareket tablosu eklendi:

- `CashBankMovement`: hesap kodu/adı, hareket tarihi, hareket tipi, giriş/çıkış yönü, tutar, kaynak belge bağlantısı ve audit alanları.
- `CashBankMovement` aynı tablo üzerinde çek tahsilatı, manuel tahsilat/ödeme, virman, maaş tahakkuku ödeme ve gider ödeme hareketlerini `sourceType/sourceId/movementType` tekilliğiyle taşır.

Raporlar için bu dilimde yeni normalize tablo açılmadı; `/raporlar`, mevcut `PurchaseInvoice`, `ProgressPayment`, `Timesheet`, `CashBankMovement` ve `Cheque` kayıtlarından salt okunur operasyon özeti üretir.

Oturum kapsamı için kalıcı session tablosu eklendi:

- `AppSession`: opak session id, tenant/firma/dönem/kullanıcı ilişkileri, rol, lisans etiketi ve opsiyonel son kullanma tarihi.
- `AppCredential`: kullanıcı e-postası, PBKDF2 parola hash'i ve varsayılan session bağlantısı.
- `noa-session-id` cookie'si sadece `AppSession.id` değerini taşır; tenant veya rol bilgisi cookie payload'ına yazılmaz.

Maaş tahakkuku puantajdan türeyen ayrı normalize işlem tablosuna taşındı; ödeme hareketi `CashBankMovement` üzerinde `sourceType=payroll-accrual` olarak izlenir ve aktif kasa/banka hesap seçiminden beslenir. Seçilen hesap server action içinde aktif `EntityRecord` satırlarına karşı yeniden doğrulanır. Sonraki adımlar resmi bordro ve personel borç/alacak entegrasyonu olacaktır.

## Uygulama Katmanı

- `prisma/schema.prisma`: Prisma 7 formatındaki schema.
- `prisma.config.ts`: `DATABASE_URL` ve migration yolu.
- `src/lib/prisma.ts`: Prisma Client singleton ve PostgreSQL adapter.
- `src/lib/entity-prisma-repository.ts`: `EntityCrudRepository` için Prisma adapter.
- `src/lib/purchase-invoice-prisma-repository.ts`: alış faturası başlık/satır adapter'ı.
- `src/lib/progress-payment-prisma-repository.ts`: hakediş başlık/satır adapter'ı.
- `src/lib/timesheet-prisma-repository.ts`: puantaj başlık/satır adapter'ı.
- `src/lib/payroll-accrual-prisma-repository.ts`: maaş tahakkuku başlık/satır adapter'ı.
- `src/lib/cheque-prisma-repository.ts`: çek portföyü adapter'ı.
- `src/lib/cash-bank-movement-prisma-repository.ts`: kasa/banka hareket adapter'ı.
- `src/lib/expense-prisma-repository.ts`: gider kaydı adapter'ı.
- `src/lib/cash-bank-account-selection.ts`: kasa/banka hesap seçimini aktif tanım satırlarına göre çözen küçük domain helper'ı.
- `src/lib/stock-depot-service.ts`: kesinleşmiş alış faturası satırlarından stok/depo okuma modeli ve depo özeti üretir.
- `src/lib/reports-service.ts`: fatura, hakediş, puantaj, maaş tahakkuku, kasa/banka ve çek kayıtlarından P0 operasyon raporu okuma modeli üretir.
- `src/lib/session-scope-prisma-repository.ts`: `AppSession` için aktif scope adapter'ı.
- `src/lib/credential-prisma-repository.ts`: `AppCredential` için e-posta tabanlı credential adapter'ı.
- `src/lib/session-options.ts`: aktif session kayıtlarını üst bar seçici seçeneklerine dönüştürür.
- `src/app/actions/session-actions.ts`: doğrulanmış session id için `noa-session-id` cookie'sini günceller.
- `src/app/actions/entity-actions.ts`: Server action katmanı.
- `src/app/actions/cash-bank-actions.ts`: Kasa/banka hareket okuma action katmanı.
- `src/app/actions/cheque-actions.ts`: Çek server action katmanı.
- `src/app/actions/purchase-invoice-actions.ts`: Fatura server action katmanı.
- `src/app/actions/progress-payment-actions.ts`: Hakediş server action katmanı.
- `src/app/actions/timesheet-actions.ts`: Puantaj server action katmanı.
- `src/app/actions/payroll-accrual-actions.ts`: Maaş tahakkuku ve seçilen kasa/banka hesabıyla ödeme hareketi server action katmanı.
- `src/app/actions/expense-actions.ts`: Gider kaydı, aktif kasa/banka hesabı doğrulaması ve otomatik ödeme hareketi server action katmanı.
- `src/components/stock-depot-surface.tsx`: fatura kaynaklı depo girişleri ve depo stok özeti yüzeyi.
- `src/components/progress-payment-surface.tsx`: hakediş faturası liste/form ve toplam yüzeyi.
- `src/components/timesheet-surface.tsx`: puantaj liste/form, toplam ve işlem geçmişi yüzeyi.
- `src/components/payroll-accrual-surface.tsx`: `/personel` altında puantajdan maaş tahakkuku üretim, ödeme durumu ve ödeme hesabı seçim yüzeyi.
- `src/components/expense-surface.tsx`: `/giderler` altında gider kayıt formu, şantiye/hareket grubu ve ödeme hesabı yüzeyi.
- `src/components/reports-surface.tsx`: operasyon özeti ve son hareketler rapor yüzeyi.
- `src/components/dashboard-surface.tsx`: rapor okuma modelini kullanan ana dashboard operasyon özeti yüzeyi.
- `src/app/[module]/page.tsx`: Tanımlar route'larını Prisma-backed server action verisiyle açar.
- `scripts/ensure-postgres-database.mjs`: Local DB oluşturma script'i.
- `scripts/seed-default-entities.ts`: Ekran görüntüsü/video analizinden gelen ilk Tanımlar, örnek alış faturası, hakediş, puantaj ve demo session kayıtlarını DB'ye idempotent şekilde ekler.

