# Dashboard P0 Operasyon Özeti Notu

Bu not ana dashboard'un ilk çalışan SaaS dilimini açıklar. İlke, eski masaüstü pencere görünümünü birebir kopyalamak değil, kullanıcının açılışta firma/dönem operasyon durumunu hızlıca görmesini sağlamaktır.

## Kapsam

Bu dilimde yeni tablo, migration veya ayrı dashboard snapshot yapısı açılmadı. `/`, mevcut rapor okuma modelini kullanır:

- `PurchaseInvoice`
- `ProgressPayment`
- `Timesheet`
- `PayrollAccrual`
- `CashBankMovement`
- `Cheque`

Gösterilen alanlar:

- `Rapor Para Birimi`
- `Alış Fatura Borcu`
- `Ödenen Fatura`
- `Ödeme Bekleyen Fatura`
- `Hakediş Toplamı`
- `Ödenen Hakediş`
- `Ödeme Bekleyen Hakediş`
- `Tahsil Edilen Hakediş Geliri`
- `Tahsilat Bekleyen Hakediş Geliri`
- `Puantaj Net`
- `Maaş Tahakkuku`
- `Ödenen Maaş`
- `Ödeme Bekleyen Maaş`
- `Kasa/Banka Net`
- `Portföy Çek`
- `Vadesi Geçen Çek`
- `Son Hareketler`
- `Hızlı Modül Geçişleri`
- `Dashboard Özetini Yazdır`
- `İhale Uyarıları`

## Veri Sözleşmesi

Dashboard hesapları `src/lib/reports-service.ts` içindeki `summarizeOperationalReports` sözleşmesini tekrar kullanır. Böylece `/raporlar` ve `/` farklı hesaplama kuralları üretmez.

Son Hareketler satırları rapor servisinin ürettiği stabil ctivityRows[].id değerini React liste kimliği olarak kullanır. Bu id kaynak kayıt id'sinden türetilir; aynı kaynak id yanlışlıkla iki kez gelirse servis deterministik #2, #3 sonekiyle satır kimliğini benzersizleştirir. Böylece açılış dashboard'u tutar+tarih gibi çakışabilir görünen değerlerle liste anahtarı üretmez.

İhale uyarıları `src/lib/tender-service.ts` içindeki `summarizeTenderDashboardAlerts` sözleşmesini kullanır. Bu read-model, `/ihale-yonetimi` listesinin tamamını kopyalamaz; yalnız açılış ekranında karar gerektiren yaklaşan son teklif, sonuç bekleyen teklif ve bu ay kazanma oranı bilgisini üretir.

`/raporlar` filtreli analiz rolündedir. `/` ise aynı kaynağın açılış ekranı özetidir.

## P0 Para Birimi Sözleşmesi

Dashboard, `/raporlar` ile aynı `summarizeOperationalReports` okuma modelini kullanır ve P0 seviyede tüm para değerlerini `TL` formatıyla gösterir. Ayrı bir döviz kolonu, kur dönüşümü veya çoklu para birimi widget'ı üretmez.

Fatura, hakediş, çek ve kasa/banka kaynaklarında eski/elle girilmiş döviz değerleri ilgili repository okuma/yazma sınırlarında normalize edilir. Audit geçmişi tarafında metadata içindeki `currency` anahtarı da `AuditLogPrismaRepository` tarafından `TL` değerine çevrilir; bu yüzden dashboard son hareketler ve operasyon özetinde P0 dışı para birimi sinyali taşınmaz. Açılış özeti, rapor servisinin `currency` alanını `Rapor Para Birimi` metriği olarak gösterir ve bu değer P0 işlem para birimi olan `TL` değerinden gelir.

## İş Akışı Kararı

NOA iş akışında kullanıcı uygulamayı açtığında önce dönem/firma bağlamını, sonra operasyon durumunu görmek ister. Bu yüzden ana ekran:

- kesinleşmiş alış fatura borcunu öne çıkarır
- alış faturalarının kasa/banka `Fatura Ödemesi` hareketine göre ödenen ve ödeme bekleyen tutarlarını ayırır
- kesinleşmiş hakediş toplamını görünür yapar
- taşeron/tedarikçi hakedişlerinin kasa/banka `Hakediş Ödemesi` hareketine göre ödenen ve ödeme bekleyen tutarlarını ayırır
- şantiye geliri hakedişlerinin kasa/banka `Hakediş Tahsilatı` hareketine göre tahsil edilen ve tahsilat bekleyen tutarlarını ayırır
- kesinleşmiş puantaj net işçilik yükünü görünür yapar
- kesinleşmiş maaş tahakkuku yükümlülüğünü görünür yapar
- maaş tahakkuklarının kasa/banka `Maaş Ödemesi` hareketine göre ödenen ve ödeme bekleyen tutarlarını ayırır
- kasa/banka net hareketini gösterir
- portföydeki çek toplamını görünür tutar
- vadesi geçmiş çek riskini ayrı metrik olarak gösterir
- son fatura, hakediş, puantaj, maaş tahakkuku, kasa/banka ve çek hareketlerini aynı tabloda toplar
- P0 işlem ekranlarına hızlı geçiş verir
- ihale iş akışında 7 gün içinde son teklif tarihi gelen açık ihaleleri, `Sunuldu` durumunda sonucu bekleyen süresi geçmiş ihaleleri ve bu ay kazanma oranını açılışta görünür yapar
- `Dashboard Özetini Yazdır` aksiyonu açılış operasyon özetini ve son hareket kapsamını tarayıcı yazdırma akışına gönderir

Bu karar, eski pencere görünümünü değil iş akışını korur.

## Bilinçli Sınırlar

- grafik yok
- canlı bildirim yok
- kullanıcıya göre özelleştirilebilir widget yok
- rapor filtreleri dashboard'a taşınmadı
- yeni dashboard snapshot tablosu yok
- rol bazlı metrik gizleme henüz yok
- P0 yazdırma davranışı özel PDF veya snapshot üretmez; mevcut açılış özeti için tarayıcı `print` akışını kullanır

Bu sınırlar MVP için bilinçlidir. Önce açılış ekranının mevcut hareket kaynaklarından doğru, testli ve tekrar kullanılabilir özet üretmesi sağlanmıştır.

## Doğrulama

Eklenen test:

- `src/components/dashboard-surface.test.tsx`

Kapsanan davranış:

- operasyon metrikleri rapor okuma modelinden render edilir
- fatura ödeme kırılımı dashboard üzerinde ödenen ve ödeme bekleyen tutarlar olarak render edilir
- hakediş ödeme kırılımı dashboard üzerinde ödenen ve ödeme bekleyen tutarlar olarak render edilir
- şantiye geliri hakediş tahsilat kırılımı dashboard üzerinde tahsil edilen ve tahsilat bekleyen tutarlar olarak render edilir
- maaş ödeme kırılımı dashboard üzerinde ödenen ve ödeme bekleyen tutarlar olarak render edilir
- son hareketler fatura, hakediş, puantaj, maaş tahakkuku, kasa/banka ve çek kaynaklarıyla gösterilir
- dashboard para değerleri P0 işlem para birimi olan `TL` formatıyla gösterilir ve `Rapor Para Birimi` metriği `TL` olarak görünür
- hızlı modül geçişleri ilgili P0 route'lara işaret eder
- kullanıcı `Dashboard Özetini Yazdır` aksiyonuyla açılış operasyon özetini yazdırma akışına gönderir
- `İhale Uyarıları` bandı yaklaşan son teklifleri, sonucu bekleyen `Sunuldu` ihaleleri ve bu ay kazanma oranını render eder




