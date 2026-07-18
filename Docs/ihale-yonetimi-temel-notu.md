# İhale Yönetimi Temel Yüzey Notu

Tarih: 01.07.2026

Bu dilim P1-S3 `İhale Yönetimi — Temel` işinin ilk, güvenli başlangıcıdır. Amaç eski ekranın pencere görünümünü birebir taşımak değil; ekran görüntülerinde görülen iş akışını yeni SaaS kabuğuna yerleştirmektir.

## Kapsam

- P1 menüye `İhale Yönetimi` eklendi.
- `/ihale-yonetimi` rotası aktif hale getirildi.
- İhale read-model servisi eklendi: durum sayaçları, kazanma oranı, toplam ihale, kazanılan değer, sözleşme bedeli, yaklaşan son teklif ve süresi dolan açık ihale hesaplanır.
- İhale yüzeyi eklendi: analiz kartları, durum sayaçları, toolbar başlangıcı, ihale listesi ve uyarı paneli.
- Liste kolonları planla uyumludur: NO/İKN, Başlık, İhale Makamı, Durum, Son Teklif, Yaklaşık Bedel, İşlemler.
- `+ Yeni İhale` ile 3 sekmeli form iskeleti açılır.
- Sekme 1 `Genel & Takvim` ve Sekme 2 `Maliyet & Teklif` alanları bağlandı.
- Başlık zorunlu validasyonuyla, BOQ/Poz tamamlanmadan `Hazırlanıyor` taslağı oluşturulur.
- Kalıcı kayıt hattı eklendi: Prisma `Tender` modeli, `createTenderPrismaRepository`, `createTenderService`, `listTendersAction` ve `createTenderAction`.
- `tender.create` audit kaydı, tenant/firma/dönem kapsamı, role guard ve aynı dönem içinde duplicate ihale no kontrolü eklendi.
- Local PostgreSQL `insaatMuhasebe` veritabanı `prisma db push` ile `Tender` modeli için senkronlandı.
- Durum geçiş hattı eklendi: `Takip -> Hazırlanıyor -> Sunuldu -> Kazanıldı/Kaybedildi/İptal` sırası servis tarafından korunur.
- İhale listesinde yalnız izinli sonraki durum aksiyonları görünür; geçişler `transitionTenderStatusAction` üzerinden kalıcı kaynağa yazılır.
- `tender.status.transition` audit kaydı `statusFrom` ve `statusTo` metadata'sı ile tutulur; `viewer` rolü durum geçişi yapamaz.
- Durum sayaçları tıklanabilir liste filtresi olarak çalışır; aktif durum tekrar tıklanınca tüm listeye dönülür.
- `Analiz Panosu` / `Listeye Dön` toolbar geçişi bağlandı; analiz görünümünde açık/sonuçlanan/süresi dolan ihale özeti, durum dağılımı ve en çok ihale açan kurumlar görünür.
- P1-S4 başlangıcı olarak `BOQ / Poz` sekmesi canlı satır editörüne dönüştürüldü: Poz, İş Kalemi, Birim, Miktar, Malzeme, İşçilik, Ekipman, Taşeron, Nakliye ve Birim Teklif alanları girilebilir.
- BOQ satırlarından Toplam Maliyet, BOQ Teklif Toplamı, Önerilen Teklif, Kâr ve Kâr Oranı anlık hesaplanır.
- P1-S4 kalıcı başlangıcı eklendi: Prisma `TenderBoqLine` modeli, nested `Tender.lines` ilişkisi, repository create/update/list mapping'i, yeni ihale kaydında BOQ satırlarının kalıcı yazımı ve `tender.create` audit metadata'sında BOQ toplamları.
- Mevcut ihale satırında `BOQ` aksiyonu ile BOQ editörü açılır; satır ekleme, satır kopyalama, satır silme ve `BOQ Kaydet` ile kalıcı güncelleme yapılır.
- `updateTenderBoqAction` ve `createTenderService().updateBoq` hattı eklendi; BOQ update işlemi `tender.boq.update` audit kaydı üretir ve BOQ toplamlarını metadata'da taşır.
- BOQ toplamı teklif bedeline otomatik değil, kullanıcı kontrollü `BOQ Toplamını Teklife Aktar` aksiyonu ile taşınır. Yeni ihale formunda `Bizim Teklif Bedeli` alanı güncellenir; mevcut ihale BOQ editöründe aktarım `BOQ Kaydet` ile kalıcı kaynağa yazılır ve audit metadata'sında önceki teklif bedeli korunur.
- Kazanılmış ve henüz şantiyeye bağlanmamış ihale satırında `Şantiye Aç` aksiyonu görünür. `İhaleden Şantiye Oluştur` paneli şantiye kodu, adı, yetkili ve proje tutarı alanlarıyla `santiyeler` tanım kartı oluşturur; ihale kaydı `convertedSiteCode`, `convertedSiteName`, `convertedToSiteAt` alanlarıyla bağlanır.
- `convertTenderToSiteAction` önce ihalenin `Kazanıldı` durumunda ve daha önce bağlanmamış olduğunu doğrular; dönüşüm `tender.site.convert` audit kaydı üretir ve `/`, `/ihale-yonetimi`, `/santiyeler` rotalarını revalidate eder.
- Local PostgreSQL `insaatMuhasebe` veritabanı `TenderBoqLine` modeli için `prisma db push` ile senkronlandı.

## Bilerek Ertelenenler

- İhale düzenleme, pasife alma veya iptal davranışı.
- Kazanılan ihalenin şantiye kartına bağlandıktan sonra detaylı gelir/gider bütçesi, depo ve ekip atama açılışı.
- Ana dashboard üzerinde yaklaşan son teklif bandı.

## Kod Referansları

- `src/lib/tender-service.ts`
- `src/lib/tender-prisma-repository.ts`
- `src/app/actions/tender-actions.ts`
- `src/components/tender-management-surface.tsx`
- `src/lib/navigation.ts`
- `src/app/[module]/page.tsx`
- `prisma/schema.prisma`

## Test Referansları

- `src/lib/tender-service.test.ts`
- `src/lib/tender-prisma-repository.test.ts`
- `src/components/tender-management-surface.test.tsx`
- `src/components/app-shell.test.tsx`
