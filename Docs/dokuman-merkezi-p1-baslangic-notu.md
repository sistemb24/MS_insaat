# Döküman Merkezi P1 Başlangıç Notu

Bu dilim P1-S5 `Döküman / Evrak Merkezi` işinin güvenli başlangıcıdır. Amaç eski masaüstü pencere düzenini kopyalamak değil, ekran görüntülerindeki merkezi evrak iş akışını SaaS kabuğunda başlatmaktır.

## Kapsam

- `/dokuman-merkezi` route'u P1 menüye eklendi.
- `Döküman / Evrak Merkezi` yüzeyi açıldı.
- Kullanılan/toplam depo göstergesi `0 MB / 5 GB` olarak gösterilir.
- `+5GB · ₺790/ay`, `Yeni Klasör`, `Dosya Yükle` aksiyonları görünür.
- `Yeni Klasör` aksiyonu klasör adı ve erişim seçimi formunu açar.
- `Dosya Yükle` aksiyonu hedef klasör ve `Dosya Seç` alanı ile yerel yükleme taslağı oluşturur.
- `Dosyalarım`, `Yıldızlı`, `Son Kullanılan`, `Çöp Kutusu` sekmeleri görünür; dosya silme aksiyonu kalıcı `deletedAt` server action akışıyla dosyayı aktif listeden çıkarır, `Çöp Kutusu` sekmesine taşır ve `Geri Al` aksiyonu dosyayı aktif listeye döndürür.
- `Tümü`, `Resimler`, `PDF`, `Dökümanlar`, `Tablolar` dosya türü filtreleri görünür ve yüklenen dosya listesine uygulanır.
- Izgara ve liste görünümü arasında geçiş yapılabilir.
- Plan sırasındaki 13 sistem klasörü `SİSTEM` rozetiyle gösterilir.
- Yüklenen dosya taslağı listede dosya adı, tür, klasör, boyut ve yükleyen bilgisiyle görünür.

## Veri Sözleşmesi

Sistem klasörü sözleşmesi `src/lib/document-center-service.ts` içinde read-model olarak tutulur. Kalıcı metadata Prisma modelleriyle açıldı; dosya binary içeriği için geliştirme ortamında local storage adapter köprüsü eklendi.

Sistem klasörleri:

- silinemez: `canDelete=false`
- yeniden adlandırılamaz: `canRename=false`
- herkese açık başlangıç erişimi taşır: `accessLevel=public`
- dosya sayısı ve boyut değerleri sonraki kalıcı dosya diliminde dolacaktır

Kullanıcı klasörü oluşturma sözleşmesi `createDocumentUserFolder` helper'ı ile korunur:

- boş klasör adı reddedilir
- mevcut sistem veya kullanıcı klasörü adıyla çakışan ad reddedilir
- `Herkes` seçimi `accessLevel=public` üretir
- `Belirli kullanıcı/rol` seçimi `accessLevel=restricted` üretir
- kullanıcı klasörleri `isSystem=false`, `canDelete=true`, `canRename=true` taşır

Dosya yükleme taslak sözleşmesi `createDocumentFileDraft` ve `insertDocumentFileIntoFolder` helper'ları ile korunur:

- tek dosya için maksimum boyut `5MB`
- dosya türü `image`, `pdf`, `document`, `spreadsheet`, `other` olarak MIME/uzantı üzerinden sınıflandırılır
- dosya türü filtresi `Resimler=image`, `PDF=pdf`, `Dökümanlar=document`, `Tablolar=spreadsheet`, `Tümü=hepsi` eşleşmesiyle çalışır
- geçerli dosya hedef klasörün `fileCount` ve `sizeBytes` sayaçlarını artırır
- sistem klasörleri silinemez kalır; dosya ekleme sayaç akışı sistem klasörüne de yapılabilir

Kalıcı metadata başlangıcı `DocumentFolder` / `DocumentFile` Prisma modelleri, `createDocumentCenterService` ve `createDocumentCenterPrismaRepository` ile açıldı:

- `listDocumentCenterAction`, aktif tenant/firma/dönem scope'unu okur ve sistem klasörlerini DB'de idempotent garanti eder
- klasör ve dosya metadata kayıtları tenant/company/period alanlarıyla scope'a bağlanır
- dosya metadata yazımı `storageKey`, MIME tipi, tür, boyut ve hedef klasör bilgisini saklayacak sözleşmeye sahiptir
- dosya metadata'sı opsiyonel linkedModule, linkedRecordId ve linkedRecordLabel alanlarıyla fatura, gider, hakediş, ihale, kasa/banka, personel, puantaj veya şantiye gibi kaynak kayıtlarla ilişkilendirilebilir; /dokuman-merkezi yükleme paneli bu bağlantıyı Bağlı Modül + Evrak No / Kayıt alanlarıyla alır ve dosya listesinde Bağlantı kolonu olarak gösterir
- dosya metadata oluşturma hedef klasör sayaçlarını artırır ve `document.file.create` audit kaydı üretir

UI server action ve storage bağlantısı:

- `/dokuman-merkezi` route'u `createDocumentFileAction` fonksiyonunu `DocumentCenterSurface` bileşenine persistence prop'u olarak geçirir
- `Dosya Seç` akışı client tarafında 5MB validasyonunu yaptıktan sonra seçilen dosyayı `FormData` ile server action'a gönderir
- server action aktif tenant/firma/dönem kapsamını doğrular, sistem klasörlerini idempotent garanti eder, hedef klasörü kontrol eder ve dosya içeriğini local storage adapter'a yazar
- local geliştirme storage kökü varsayılan olarak `.noa-storage/documents` altında çalışır; `NOA_DOCUMENT_STORAGE_DIR` env değeriyle değiştirilebilir
- `storageKey` üretimi `src/lib/document-storage-key.ts` içinde ortak helper olarak tutulur; UI ve server action aynı güvenli path sözleşmesini kullanır
- server action başarılı dönerse UI, action'dan gelen kalıcı `DocumentFileRow` satırını listeye ekler ve klasör sayaçlarını günceller
- server action hata dönerse hata mesajı `role=status` alanında gösterilir ve dosya listeye eklenmez
- `moveDocumentFileToTrashAction`, aktif tenant/firma/dönem scope'u ile dosya metadata kaydına `deletedAt` yazar; aktif dosya listesi `deletedAt=null`, çöp kutusu listesi `deletedAt!=null` koşuluyla ayrılır
- UI, server'dan gelen `trashedFiles` listesini yalnızca `Çöp Kutusu` sekmesinde gösterir; yeni silme aksiyonu başarısız olursa aktif listeyi değiştirmeden hata mesajı verir
- `restoreDocumentFileFromTrashAction`, yalnız `deletedAt!=null` durumundaki dosyayı scoped olarak `deletedAt=null` yapar; UI `Geri Al` aksiyonuyla dosyayı çöp listesinden çıkarıp `Dosyalarım` listesine döndürür
- `purgeExpiredTrash`, varsayılan 30 günlük bekletme eşiğine göre `deletedAt` tarihi eski olan dosya metadata kayıtlarını scoped olarak kalıcı temizler ve storage cleanup için `purgedStorageKeys` listesini döndürür
- local storage adapter `deleteObject` destekler; `cleanupDocumentStorageObjects` helper'ı purge çıktısındaki storage key listesini fiziksel dosya temizliğine bağlar ve eksik dosyalarda idempotent çalışır
- `createDocumentFileMetadataAction` geriye dönük test ve ara entegrasyon yolu olarak korunur; asıl yükleme yolu binary içerikli `createDocumentFileAction` akışıdır

## Bilinçli Sınırlar

- cloud object storage (S3/R2/Azure Blob) henüz bağlı değil; local adapter geliştirme köprüsüdür
- yeni kullanıcı klasörü oluşturma UI akışı kalıcı veritabanına yazmaz
- dosya yükleme UI akışı server action'a bağlıdır; metadata DB'ye, binary içerik local adapter'a yazılır
- local storage yazımı/silmesi ile DB metadata işlemleri aynı transaction içinde değildir; üretim object storage diliminde orphan cleanup/compensation stratejisi eklenecektir
- dosya indirme, paylaşma ve kilitleme aksiyonları yok
- çöp kutusu kalıcı soft-delete, geri alma, 30 gün eşiğine göre metadata temizleme çekirdeği ve local storage fiziksel silme helper'ı tamamlandı; production scheduler ve bulut object storage adapter işi yok
- diğer modül kayıtlarına bağlama başlangıcı tamamlandı; bu dilim dosya metadata'sında kaynak modül/kayıt referansını taşır, gelişmiş kayıt arama/seçici sonraki UX diliminde derinleşecektir
- diğer modül kayıtlarına gerçek evrak bağlantısı yok

Bu sınırlar bilinçlidir. Önce sistem klasörleri, görünüm akışı, kullanıcı klasörü ve 5MB sınırı olan dosya seçme iş akışı testli şekilde açıldı; kalıcı klasör/yükleme/yetki işleri bu zeminin üzerine eklenecektir.

## Doğrulama

Eklenen testler:

- `src/lib/document-center-service.test.ts`
- `src/lib/document-storage-key.test.ts`
- `src/lib/document-storage.test.ts`
- `src/lib/document-center-prisma-repository.test.ts`
- `src/components/document-center-surface.test.tsx`

Kapsanan davranış:

- plan sırasındaki 13 sistem klasörü üretilir
- sistem klasörleri silinemez ve yeniden adlandırılamaz
- açılış yüzeyi depo göstergesi, aksiyonlar, sekmeler ve dosya türü filtrelerini gösterir
- dosya türü filtreleri yüklenen dosya tablosunu tür bazında daraltır
- seçili dosya türünde eşleşme yoksa kullanıcıya boş durum mesajı gösterilir
- dosya tablosundaki `Sil` aksiyonu persistence varsa `moveFileToTrash` server action sözleşmesini çağırır, dosyayı aktif listeden çıkarır ve `Çöp Kutusu` sekmesinde gösterir; çöp sekmesindeki `Geri Al` aksiyonu `restoreFileFromTrash` sözleşmesini çağırır
- ızgara görünümünde sistem klasörleri `SİSTEM` rozetiyle görünür
- liste görünümüne geçiş sistem rozetlerini kaybetmez
- yeni kullanıcı klasörü klasör adı ve erişim seçimiyle oluşturulur
- boş ve mükerrer klasör adları servis helper'ında reddedilir
- dosya seçme akışı 5MB sınırına kadar dosya taslağı oluşturur
- büyük dosya `Dosya boyutu 5MB sınırını aşamaz.` hatasıyla reddedilir
- yüklenen dosya taslağı hedef klasör sayaçlarını ve depo özetini günceller
- persistence servis testleri sistem klasörlerinin scope bazlı ve idempotent oluştuğunu kanıtlar
- Prisma repository testleri folder upsert, scoped list, file metadata create ve sayaç increment mapping'ini doğrular
- UI persistence testi `Dosya Seç` akışının `createFileMetadata` server action sözleşmesine doğru değerleri gönderdiğini ve dönen kalıcı dosyayı listelediğini doğrular
- UI FormData persistence testi `Dosya Seç` akışının gerçek `File` içeriğini `createFile` server action sözleşmesine taşıdığını doğrular
- UI çöp kutusu persistence testi `Sil` aksiyonunun `moveFileToTrash` sözleşmesini çağırdığını, `Geri Al` aksiyonunun `restoreFileFromTrash` sözleşmesini çağırdığını ve server'dan gelen silinmiş dosyaların yalnızca `Çöp Kutusu` sekmesinde göründüğünü doğrular
- servis/repository soft-delete, restore ve purge testleri `deletedAt` yazımını/temizlenmesini, aktif liste ile çöp listesi ayrımını, 30 gün eşiğini, tenant/firma/dönem scoped update/delete koşulunu ve `purgedStorageKeys` -> storage cleanup köprüsünü doğrular
- dosya bağlantı testleri upload sırasında seçilen modül/kayıt bilgisinin servis sonucuna, Prisma create/read mapping'ine, server action `FormData` akışına ve dosya listesi `Bağlantı` kolonuna taşındığını doğrular
- local storage testleri dosya içeriğinin güvenli local root altında yazılıp okunabildiğini, fiziksel silinebildiğini, eksik dosya silmenin idempotent olduğunu ve `../` gibi path escape denemelerinin reddedildiğini doğrular
- storage key testi Türkçe karakterli klasör/dosya adlarından deterministik ve güvenli `document-center/...` anahtarı üretildiğini doğrular

