# Audit Log Altyapı Notu

Bu not, P0 muhasebe hareketleri için başlatılan merkezi audit log yaklaşımını açıklar. Amaç eski masaüstü pencere görünümünü değil, kritik iş akışlarının izlenebilirliğini korumaktır.

## Kapsam

İlk bağlı modüller `Faturalar`, `Giderler`, `Çek İşlemleri`, `Hakediş`, `Puantaj` ve `Maaş Tahakkuku` alanlarıdır. Aşağıdaki aksiyonlar audit kaydı üretir:

- `purchase-invoice.create`
- `purchase-invoice.update`
- `purchase-invoice.post`
- `purchase-invoice.cancel`
- `expense.create`
- `cheque.create`
- `cheque.collect`
- `progress-payment.create`
- `progress-payment.post`
- `progress-payment.cancel`
- `timesheet.create`
- `timesheet.post`
- `timesheet.cancel`
- `payroll-accrual.create`
- `payroll-accrual.post`
- `payroll-accrual.cancel`

Kayıt, mutasyon başarıyla tamamlandıktan sonra yazılır. Yetki reddi, validasyon hatası, bulunamayan kayıt ve idempotent tekrar çağrılar audit kaydı üretmez.

## Veri Modeli

`AuditLog` tablosu şu alanlarla tenant/firma/dönem bağlamını korur:

- `tenantId`, `companyId`, `periodId`
- `actorUserId`
- `action`
- `entityType`, `entityId`, `entityLabel`
- `metadata` JSONB
- `occurredAt`, `createdAt`

İndeksler üç sorgu ailesini destekler:

- Dönem bazlı audit akışı: `tenantId/companyId/periodId/occurredAt`
- Belge bazlı iz: `tenantId/entityType/entityId`
- Kullanıcı bazlı iz: `tenantId/actorUserId/occurredAt`

## P0 Para Birimi Metadata Sözleşmesi

P0 finans sözleşmesine göre audit metadata içinde `currency` anahtarı varsa değer merkezi olarak P0 işlem para birimi olan `TL` değerine normalize edilir. Bu kural hem audit kaydı yazılırken hem de eski/elle girilmiş audit kayıtları okunurken `AuditLogPrismaRepository` içinde uygulanır.

Bu karar özellikle çek geçmişi ve ileride metadata içine para birimi taşıyacak diğer hareketler için güvenlik sınırıdır. Çek servis katmanı audit metadata para birimini doğrudan `TL` üretir; audit repository de okuma/yazma sınırında aynı değeri tekrar garanti eder. Form, servis ve finans repository katmanları zaten `TL` üretse bile audit JSONB alanı ayrı bir sızıntı kanalı olarak bırakılmaz. Çoklu dövizli audit metadata P1 kur/döviz yönetimi açıldığında ayrı sözleşmeyle ele alınmalıdır.

## Fatura Metadata Sözleşmesi

Fatura audit metadata alanı ilk etapta şu bilgileri taşır:

- `documentNo`
- `statusFrom`, `statusTo`
- `counterpartyCode`, `counterpartyName`
- `siteCode`, `siteName`
- `grandTotal`
- `lineCount`

Bu yapı rapor, belge geçmişi paneli ve ilerideki denetim ekranı için yeterli ilk izleme yüzeyini sağlar.

## Gider Metadata Sözleşmesi

Gider audit metadata alanı ilk etapta şu bilgileri taşır:

- `documentNo`
- `siteCode`, `siteName`
- `movementGroup`
- `counterpartyName`
- `grandTotal`
- `currency`
- `paymentAccountCode`, `paymentAccountName`

Bu yapı gider belgesi, şantiye maliyet kırılımı, cari ekstre ve kasa/banka ödeme hareketi arasındaki bağı denetlenebilir kılar. Gider kaydı P0 içinde doğrudan `Kaydedildi` oluştuğu için ayrı kesinleştirme audit aksiyonu yoktur; ilk kayıt aksiyonu aynı zamanda ödeme hareketinin iş olayını temsil eder.

## Çek Metadata Sözleşmesi

Çek audit metadata alanı ilk etapta şu bilgileri taşır:

- `documentNo`
- `checkNo`
- `direction`
- `bankName`
- `drawerName`
- `dueDate`
- `amount`
- `currency`
- `statusFrom`, `statusTo`

Bu yapı çek portföyü, tahsil geçmişi, vade raporları ve ileride eklenecek çek bordrosu akışı için ilk izleme sözleşmesini sağlar.

## Hakediş Metadata Sözleşmesi

Hakediş audit metadata alanı ilk etapta şu bilgileri taşır:

- `documentNo`
- `statusFrom`, `statusTo`
- `paymentType`
- `counterpartyCode`, `counterpartyName`
- `siteCode`, `siteName`
- `grandTotal`
- `lineCount`

Bu yapı hakediş faturası geçmişi, şantiye/cari analizleri ve ileride eklenecek onay merkezi için ilk izleme sözleşmesini sağlar.

## Kasa/Banka Hareket İzi

Çek tahsili sırasında oluşan `CashBankMovement` kaydı bu dilimde ayrı bir audit aksiyonu üretmez. Kaynak işlem `cheque.collect` audit kaydıdır; kasa/banka hareketi ise aynı iş olayının finansal sonucu olarak `sourceType`, `sourceId` ve `sourceLabel` alanlarıyla izlenir.

Bu karar iki nedenle bilinçlidir:

- İlk MVP'de aynı kullanıcı aksiyonunu iki ayrı audit olayı gibi göstermemek.
- Kasa/banka hareketini raporlanabilir finansal kayıt, audit log'u ise kullanıcı aksiyon izi olarak ayrı tutmak.

## Maaş Tahakkuku Metadata Sözleşmesi

Maaş tahakkuku audit metadata alanı ilk etapta şu bilgileri taşır:

- `documentNo`
- `sourceTimesheetNo`
- `statusFrom`, `statusTo`
- `year`, `month`
- `netTotal`
- `lineCount`

Bu yapı puantajdan maaş tahakkukuna dönüşüm izini, tahakkuk kesinleştirme/iptal geçmişini ve ileride eklenecek ödeme/bordro kontrol ekranını destekler.

## Görünürlük

Fatura sayfası `purchase-invoice`, çek sayfası `cheque`, hakediş sayfası `progress-payment` audit kayıtlarını server tarafında tenant/firma/dönem filtresiyle okur ve belge id'sine göre gruplayarak `İşlem Geçmişi` bölümünde gösterir.

İlk görünüm bilinçli olarak salt okunurdur:

- Belge no ve fatura/çek bağlamı gösterilir.
- Aksiyon kullanıcı dostu etikete çevrilir: oluşturuldu, güncellendi, kesinleştirildi, iptal edildi.
- `statusFrom -> statusTo` geçişi gösterilir.
- Tarih/saat kullanıcı yerel saatine göre formatlanır.

Mutation sonrası audit kaydı PostgreSQL'e yazılır ve route revalidate edilir. Client tarafında mevcut satır optimistik olarak güncellenir; yeni audit geçmişinin görünmesi için sonraki server render veya yenileme yeterlidir. Bu, ilk MVP için canlı stream karmaşıklığı eklemeden izlenebilirlik sağlar.

## Genişletme Kuralı

Yeni P0 hareket modülleri eklenirken aynı kural korunmalıdır:

1. Mutasyon tek bir server-side servis üzerinden geçmeli.
2. Yetki ve validasyon başarısızsa audit yazılmamalı.
3. Veri gerçekten değiştiyse audit yazılmalı.
4. İdempotent tekrar çağrı mevcut sonucu döndürmeli ve ikinci audit üretmemeli.
5. Metadata insan tarafından okunabilir belge bilgilerini ve raporlamaya yarayan sayısal özetleri içermeli.
6. Metadata içinde para birimi tutulacaksa P0'da kaynak değer ne olursa olsun audit okuma/yazma adapter'ı `TL` değerini döndürmeli.

Sıradaki aday modüller çek bordrosu/ciro detayları, stok/depo hareketleri ve maaş ödeme/bordro adımlarıdır. Gider kaydı `expense.create` aksiyonuyla kapsama alınmıştır. Puantaj ilk işlem diliminde `timesheet.create`, `timesheet.post` ve `timesheet.cancel`; maaş tahakkuku ise `payroll-accrual.create`, `payroll-accrual.post` ve `payroll-accrual.cancel` audit aksiyonlarıyla kapsama alındı.
## Demo Seed

`pnpm db:seed`, mevcut `FAT-0006` demo alış faturası için `purchase-invoice.create`, mevcut `HAK-0001` demo hakedişi için `progress-payment.create` audit hareketini idempotent olarak oluşturur.

Bu davranış iki sorunu çözer:

- Yeni kurulumda fatura ve hakediş işlem geçmişi panelleri boş kalmaz.
- Daha önce seed edilmiş veritabanlarında eksik demo audit izleri güvenli şekilde tamamlanır.

Seed ikinci kez çalıştırıldığında aynı fatura veya hakediş için ikinci audit kaydı üretmez; sonuçlar `purchaseInvoiceAuditLogs.skipped` ve `progressPaymentAuditLogs.skipped` altında raporlanır.
