# Production Tenant Envanter Canlı Preflight Sözleşmesi v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: DİLİM 3B KOD HAZIR / READ-ONLY DB CREDENTIAL VE CANLI RUN BEKLİYOR

## Amaç ve sınır

Bu sözleşme P-B08 Dilim 3A manifest çekirdeğini gerçek Prisma ve Cloudflare R2
salt-okunur adapter'larına bağlar. Manuel GitHub Actions workflow'u exact tenant
kimliği için DB sayımlarını ve R2 nesne başlıklarını doğrulayabilir; ancak bu
dilimde workflow çalıştırılmaz, credential/provider kaynağı oluşturulmaz ve
production verisi okunmaz.

## Ayrı salt-okunur DB kimliği

Workflow mevcut `PRODUCTION_DATABASE_URL` secret'ını kullanmaz. Yalnız bu iş
için `PRODUCTION_TENANT_INVENTORY_DATABASE_URL` secret'ı beklenir. Bu bağlantının
PostgreSQL rolü:

- yalnız hedef production DB'ye `CONNECT`, `public` şemasına `USAGE` ve gerekli
  tablolara `SELECT` yetkisi taşımalıdır;
- `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, DDL, migration ve role yönetimi
  yetkisi taşımamalıdır;
- `default_transaction_read_only=on` ile açılmalıdır.

Prisma adapter'ı her koşuda `transaction_read_only=on` değerini ilk kapı olarak
doğrular. Değer `on` değilse model sayımı başlamadan fail-closed durur. Rolün
oluşturulması ve secret'ın GitHub Actions'a kaydedilmesi ayrı provider onayıdır.

## Prisma envanteri

DB okuması tek `REPEATABLE READ` transaction içinde yapılır:

- onaylı katalogdaki 90 doğrudan tenant modelinde exact `tenantId` sayımı;
- `Tenant` yaşam döngüsü durumu ve sürümü;
- `revokedAt=null` ve `expiresAt > generatedAt` olan aktif auth session sayısı;
- `status=ACTIVE` legal hold sayısı;
- silinmiş metadata dâhil tenant'ın bütün `DocumentFile` storage key ve byte
  değerleri.

Schema drift, eksik Prisma delegate, bilinmeyen yaşam döngüsü, geçersiz sayı ve
JavaScript güvenli tam sayı sınırını aşan byte değeri koşuyu durdurur. Adapter
satır içeriğini manifest veya log'a taşımaz.

## R2 envanteri

Workflow mevcut document bucket `Object Read` credential'ını kullanır. R2
adapter'ı DB'den türetilen exact ve normalize edilmiş anahtarlar için yalnız
`HeadObject` çağırır. Bucket/prefix listeleme, `GetObject`, nesne gövdesi okuma,
yazma ve silme yoktur. Tekrar eden anahtar, eksik nesne, bilinmeyen head sonucu
ve DB/R2 byte uyuşmazlığı fail-closed blocker'dır. Storage key'ler manifest veya
çıktıya yazılmaz.

## Workflow kapıları ve güvenli çıktı

`.github/workflows/production-tenant-inventory-preflight.yml`:

- yalnız manuel `workflow_dispatch` kullanır; schedule yoktur;
- yalnız `refs/heads/main`, exact GitHub SHA, exact tenant kimliği ve
  `production-tenant-inventory-preflight` confirmation ile çalışır;
- `contents: read` izni ve `noa-production-recovery` concurrency kilidi kullanır;
- bağımlılıkları `--ignore-scripts` ile kurar, ardından Prisma client'ı DB
  mutasyonu olmadan üretir;
- yalnız aggregate model/doküman sayıları, yaşam döngüsü özeti, checksum,
  saklama sürümü ve blocker kodlarını loglar; manifest artifact'ı yüklemez.

Manifest mevcut hesap kapatma değerlendirme çekirdeğine bağlanır. Bu aşamada
`backupDeletionReplayReady=false` bilinçli olarak korunur; sonuçta erişim
dondurma, purge ve destructive delete izinleri daima `false` kalır. Başarılı job
yalnız DB/R2 envanter bütünlüğünü kanıtlar, hesap kapatma yetkisi vermez.

## Bu dilimde yapılmayanlar ve sonraki kapılar

- Production/staging DB veya R2 okunmadı/değiştirilmedi.
- Neon rolü ya da GitHub secret'ı oluşturulmadı.
- Workflow dispatch edilmedi; manifest veya export paketi üretilmedi.
- Tenant durumu, oturum, legal hold, backup, purge veya silme değiştirilmedi.

Sıradaki ayrı onay kapıları sırasıyla dedicated Neon read-only rolü/credential,
GitHub Actions secret kaydı ve exact tenant kimliğiyle ilk canlı salt-okunur
preflight koşusudur. DB/R2 silme manifesti ve backup silme-tekrar yürütücüsü daha
sonraki bağımsız dilimdir.
