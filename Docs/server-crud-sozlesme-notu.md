# Server CRUD Sözleşme Notu

Bu not, Tanımlar modüllerinin kalıcı CRUD yapısına geçmeden önceki server-side sözleşmesini açıklar.

## Amaç

Tanımlar ekranlarında oluşan iş akışını doğrudan UI state'e hapsetmemek gerekir. Bu yüzden ilk server-side CRUD sözleşmesi eklendi:

- listeleme,
- yeni kayıt oluşturma,
- kayıt düzenleme,
- kayıt pasifleştirme,
- tenant/firma/dönem kapsam validasyonu,
- audit metadata güncelleme.

Bu sözleşme bugün bellek içi demo repository ile çalışır. Veritabanı eklendiğinde aynı interface Prisma/Postgres adapter'ına taşınacaktır.

## Katmanlar

`src/lib/entities.ts`

Tanımlar domain kurallarını içerir: kolonlar, kod üretimi, draft, validasyon, kaydetme, arama ve pasifleştirme.

`src/lib/tenant-scope.ts`

SaaS kapsamını içerir: tenant, firma, dönem, kullanıcı, scope key ve audit metadata.

`src/lib/entity-crud-service.ts`

Server-side CRUD sözleşmesini ve repository interface'ini içerir. UI veya route kodu bu katmanı çağırır; domain kurallarını tekrar yazmaz.

`src/app/actions/entity-actions.ts`

Next.js server action adaptörüdür. Demo scope'u kullanır ve artık Prisma repository hattına bağlıdır.

`src/app/[module]/page.tsx`

Tanımlar modüllerinde ilk listeyi server action üzerinden okur ve client Tanımlar yüzeyine CRUD action'larını prop olarak geçirir.

## Kalıcı Repository Hattı

Prisma adapter `EntityCrudRepository` interface'ini uygular. UI, service veya action katmanı Prisma detaylarını bilmez.

Mevcut akış:

1. Route aktif Tanımlar modülünü çözer.
2. `listEntityRowsAction` aktif tenant/firma/dönem kapsamını garanti eder.
3. Prisma repository `EntityRecord` tablosundan scoped kayıtları okur.
4. Client yüzey `create/update/deactivate/list` server action prop'ları ile çalışır.
5. Kaydetme ve pasifleştirme sonrası dönen satır UI tablosuna işlenir.

Varsayılan demo kayıtları `pnpm db:seed` ile eklenir. Seed komutu mevcut kayıt olan modülleri atlar; kullanıcının oluşturduğu Tanımlar kayıtlarını ezmez.

## UI Durumları

Tanımlar ekranı server action davranışını kullanıcıya açık gösterir:

- işlem sürerken toolbar ve ilgili butonlar kilitlenir,
- `Sunucu işlemi sürüyor: ...` mesajı gösterilir,
- form validasyon hataları form kapsamında kalır,
- server action hataları ayrı `Sunucu işlemi tamamlanamadı` panelinde gösterilir,
- başarısız server action seçili satırı veya mevcut listeyi kaybettirmez.

## Geçici Demo Repository

Bellek içi repository sadece geliştirme zemini içindir. Kararları temsil eder, kalıcı veri katmanı değildir.

Korunan kararlar:

- scope dışındaki kayıtlar listelenmez,
- kod benzersizliği aktif scope içinde kontrol edilir,
- kayıt silinmez, pasif yapılır,
- yeni ve güncellenen kayıtlar audit metadata taşır,
- bilinmeyen modül ve eksik scope kontrollü hata döndürür.

## Sonraki Adım

Tanımlar için ORM/veritabanı kararı uygulandı ve Prisma adapter devreye alındı. Bu sözleşmenin sonraki teknik adımları:

1. Server action'ların demo scope yerine oturum scope'undan beslenmesi.
2. Tanımlar lookup verilerinin Faturalar, Hakediş ve Gider formlarında kontrollü seçici olarak kullanılması.
3. Aynı loading/error standardının işlem modüllerindeki kaydet/onay/iptal akışlarına yayılması.
4. Audit log ve yetki kontrolünün repository/service sınırında zorunlu hale getirilmesi.
