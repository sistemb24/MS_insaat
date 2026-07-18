# Bildirim Merkezi P1 Başlangıç Notu

Tarih: 02.07.2026

## Kapsam

P1-S6 Bildirim Merkezi + Bildirim Ayarları diliminde ilk uygulanabilir yüzey açıldı. Bu dilimde eski ekranın pencere görünümü değil, iş akışı korunarak kategori bazlı bildirim yönetimi, istatistikler, kayıt yönlendirme linkleri ve üst bar okunmamış sayacı kuruldu.

## Uygulanan Akışlar

- `src/lib/notification-center-service.ts` içinde 13 bildirim kategorisi planla uyumlu şekilde tanımlandı: Masraf Yönetimi, Avans Yönetimi, Transfer İşlemleri, Stok Yönetimi, Araç Yönetimi, Risk Limitleri, Vade Bildirimleri, Sözleşme Yönetimi, Board & Görevler, Tedarik & Satın Alma, Bütçe Yönetimi, İnsan Kaynakları, Destek Sistemi.
- Bildirim read-model'i toplam, okunmamış, bugün ve bu hafta sayaçlarını üretir.
- Öncelik dağılımı Düşük / Normal / Yüksek / Kritik olarak hesaplanır.
- Kategori aç/kapat seçimi aktif bildirim listesini ve sayaçları anlık daraltır.
- Her bildirim `targetHref` ve `targetLabel` ile ilgili modül kaydına bağlanır.
- `AppShell` üst barında okunmamış bildirim sayısı `/bildirimler` linkiyle gösterilir.
- Sol navigasyona P1 `Bildirimler` modülü eklendi.
- `/bildirimler` route'u özel `NotificationCenterSurface` yüzeyine bağlandı.

## Bilinçli Sınırlar

- Kullanıcı kategori tercihleri artık Prisma `NotificationPreference` tablosuna yazılır; checkbox değişimi `setNotificationPreferenceAction` üzerinden tenant/user scoped kalıcı tercihe dönüşür.
- Bildirim kayıtları artık Prisma `Notification` tablosundan okunur; `listNotificationCenterAction` seed bildirimleri idempotent upsert eder ve kullanıcı okundu durumunu korur.
- Okundu/okunmadı akışı `markNotificationAsReadAction` ile `readAt` alanına yazılır; üst bar sayaçları DB kaynaklı read-model üzerinden hesaplanır.
- Email ve tarayıcı push yöntemleri plan gereği sonraki P1/P2 entegrasyon dilimlerine bırakılmıştır.

## Test Kanıtı

- `src/lib/notification-center-service.test.ts` servis kategori, filtre, istatistik ve üst bar sayaç hesaplarını kapsar.
- `src/components/notification-center-surface.test.tsx` kategori toggle, istatistik kartları, ilgili kayıt linki ve `AppShell` okunmamış sayaç davranışını kapsar.
- `src/lib/notification-center-prisma-repository.test.ts` Prisma repository'nin scope filtrelerini, preference upsert sözleşmesini ve okundu güncellemesini kapsar.

## 02.07.2026 Persistence Güncellemesi

- `prisma/schema.prisma` içine `Notification` ve `NotificationPreference` modelleri eklendi.
- `/bildirimler` rotası artık `listNotificationCenterAction` çıktısıyla açılır.
- Ana sayfa ve modül shell üst barı `getNotificationUnreadCountAction` ile DB kaynaklı okunmamış sayıyı alır.
- Kategori tercihleri ve okundu işaretleme server action üzerinden revalidate edilir.

## 02.07.2026 Domain Üretim Güncellemesi

- `createOperationalNotificationRows` üreticisi eklendi.
- Çek işlemlerinde `Portföyde` durumundaki ve vadesi 7 gün içinde gelen kayıtlar `Vade Bildirimleri` kategorisinden bildirim üretir.
- Taşeron kartlarında `contractEndDate` değeri 30 gün içinde olan aktif kayıtlar `Sözleşme Yönetimi` kategorisinden bildirim üretir.
- Stok/Depo özetinde `StockMinimumSetting` kayıtlarının altına düşen stoklar `Stok Yönetimi` kategorisinden bildirim üretir. `/stok-depo` özet satırındaki minimum miktar girişi bu eşiği PostgreSQL'e kalıcı yazar.
- Üretilen domain bildirimleri `ensureGeneratedNotifications` ile idempotent upsert edilir; kullanıcı daha önce okundu işaretlediyse `readAt` korunur.

## 02.07.2026 Stok Minimum Ayar Güncellemesi

- `prisma/schema.prisma` içine `StockMinimumSetting` modeli eklendi.
- `src/lib/stock-minimum-setting-service.ts` minimum stok ayarlarını tenant/firma/dönem kapsamında doğrular, normalize eder ve bildirim eşiğine dönüştürür.
- `src/lib/stock-minimum-setting-prisma-repository.ts` aktif ayarları scope içinde listeler ve deterministik id ile upsert eder.
- `src/app/actions/stock-minimum-setting-actions.ts` `/stok-depo` yüzeyinden minimum miktar kaydını alır; `/stok-depo`, `/bildirimler`, ana sayfa ve modül shell cache'ini yeniler.
- `listNotificationCenterAction` artık pilot kod bazlı eşik yerine `StockMinimumSetting` kayıtlarını kullanır.

## 02.07.2026 Stok Kartı Kaynak Güncellemesi

- `stok-kartlari` tanımı minimum stok bildirimi için varsayılan kaynak haline getirildi.
- `buildStockMinimumThresholdsFromStockCards` aktif stok kartlarında `Varsayılan Depo` ve `Minimum Miktar` dolu olan satırları bildirim eşiğine dönüştürür.
- `mergeStockMinimumThresholds`, stok kartı eşiklerini temel alır; `/stok-depo` satır içi `StockMinimumSetting` kaydı aynı depo/stok kimliğinde varsa kart değerini override eder.
- Bildirim Merkezi böylece önce stok kartı iş akışına, sonra kullanıcı tarafından satır özelinde güncellenmiş minimum ayara bakar.
