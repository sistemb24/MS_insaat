# RFC-F24-01 — Kalıcı Finans Ayarları

> Durum: **Tamamlandı — Dilim 1–5**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-modul-gelistirme-plani.md` Bölüm 3A,
> 4.4, 17.2 ve 20.2; mevcut `settings-contract`, gider, fatura ve hakediş
> sözleşmeleri

## 1. Amaç

NOA'nın `/ayarlar` çalışma alanında salt-okunur gösterilen finans
varsayımlarından güvenle değiştirilebilen ilk dar kümeyi kalıcılaştırmak ve
yeni gider/fatura/hakediş taslaklarının varsayılan KDV oranını aktif
tenant/firma/dönem tercihinden almasını sağlamak.

Bu faz çoklu döviz, kur farkı, KDV dahil hesaplama motoru veya geçmiş finansal
kayıtların yeniden hesaplanması değildir. Mevcut muhasebe ve belge yaşam
döngülerini değiştirmeden yalnız yeni taslak başlangıç değerini ve KDV
dağılımı sunum tercihini yönetir.

## 2. Neden sıradaki çalışma

- Faz 23 ile ana genişletme planındaki sağlayıcıdan bağımsız operasyon
  modülleri tamamlandı.
- Faz 13 Open Banking gerçek sağlayıcı/ürün ve resmi sandbox bilgisine;
  Arvento canlı bağlantısı gerçek erişim bilgilerine bağlıdır.
- “Davet Et & Kazan” yeni tenant edinim akışı ile ödül/indirim politikasını
  gerektirir ve şirket içi kullanıcı davetiyle birleştirilemez.
- Gelişmiş XLSX sayfa seçimi ve one-to-one kolon eşleme mevcut kodda
  çalışmaktadır; yeni bir faz açacak çekirdek boşluk değildir.
- Buna karşılık ana plan, finans ayarlarının kalıcı yazımını açıkça ayrı ayar
  servisi dilimine bırakır. Varsayılan KDV bugün hâlâ process-wide statik
  sözleşmeden okunmaktadır.

## 3. Önerilen varsayımlar

1. Faz 24 yalnız **kalıcı finans varsayımları** dikeyidir. İlk yazılabilir
   alanlar `defaultVatRate` ve `showVatBreakdown` olur. Firma unvanı/adresi,
   lokasyon modu, rol matrisi ve bildirim tercihleri bu faza alınmaz.
2. Ayar kaydı `tenantId + companyId + periodId` kapsamında tekildir. Başka
   tenant, firma veya dönem ayarı okunamaz ve uygulanamaz.
3. Yeni additive, typed bir Prisma modeli ve migration kullanılır. Generic
   JSON ayar torbası oluşturulmaz. Mevcut dönemlere backfill yapılmaz; kayıt
   yoksa bugünkü güvenli `%20` ve `showVatBreakdown=true` fallback'i korunur.
4. `defaultVatRate`, `0..100` aralığında en fazla iki ondalıklı sayıdır.
   `showVatBreakdown` boolean'dır. NaN, sonsuz, negatif veya yüzü aşan değer
   reddedilir.
5. `baseCurrency=TRY`, işlem para birimi `TL`,
   `multiCurrencyEnabled=false` ve `vatMode=excluded` değiştirilemez. Faz 24
   kur, çoklu döviz veya KDV dahil hesaplama davranışı açmaz.
6. Kalıcı KDV oranı yalnız **yeni** gider, alış/satış faturası ve klasik
   hakediş satırı başlangıcında varsayılan olur. Kullanıcının açıkça girdiği
   satır oranı korunur; taslak, kesinleşmiş, iptal veya geçmiş kayıtlar
   yeniden hesaplanmaz.
7. Domain servisleri ve repository'ler mevcut kayıtlardaki KDV oranını veya
   toplamları ayara bakarak sonradan değiştirmez. Ayar, taslak oluşturma
   bağlamına server tarafından taşınır; global mutable singleton kullanılmaz.
8. Tüm roller aktif scope ayarını okuyabilir. Yalnız `admin`, açık dönemde
   optimistic revision ve idempotent request key ile değiştirebilir;
   `accounting`, `viewer` ve kapalı dönem yazımı fail-closed reddedilir.
9. Başarılı değişiklik tek güvenli audit olayı üretir. Audit eski/yeni KDV
   oranı, KDV dağılımı ve revision bilgisini taşıyabilir; request key,
   kullanıcı girdisi açıklaması veya başka finansal kayıt ayrıntısı taşımaz.
10. `/ayarlar` yüzeyi mevcut AppShell ve tasarım tokenlarını korur;
    yükleniyor, fallback, hata, başarı, concurrency, 390 px mobil, açık/koyu
    tema ve print-safe durumları sağlar. İzole gerçek veri kabulü ayarın
    yalnız kendi scope'undaki yeni taslak varsayımlarını etkilediğini ve audit
    dışında yan etki üretmediğini doğrular.

## 4. Domain ve veri sözleşmesi

Önerilen ayar snapshot'ı:

- `id`
- `tenantId`, `companyId`, `periodId`
- `defaultVatRate`
- `showVatBreakdown`
- `revisionNo`
- `lastMutationKey`
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

Okuma sonucu her zaman tam bir effective ayar döndürür. Kalıcı satır yoksa
`source=fallback`, varsa `source=persisted` olarak işaretlenir. Böylece
consumer yüzeyler kaydın varlığını tahmin etmez.

## 5. Tüketici sınırı

İlk tüketiciler:

- Giderler: yeni gider formu KDV oranı,
- Faturalar: yeni alış/satış faturası satırı KDV oranı,
- Klasik Hakediş: yeni satır KDV oranı,
- Ayarlar: effective değer ve kaynağı, admin düzenleme formu.

Hakediş Pro hesap motoru, import staging, bordro, kasa/banka, çek, ledger,
raporların geçmiş toplamları ve API response sözleşmeleri değiştirilmez.

## 6. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain Çekirdeği | Typed ayar, fallback, validasyon, rol/dönem, revision ve idempotency kararları | Saf testler; şema/repository/UI değişmez. |
| 2 — Şema ve Repository | Additive model, migration, scoped effective read ve optimistic upsert | Backfill yok; yanlış scope görünmez. |
| 3 — Server Action ve Audit | Oturum/scope guard'lı okuma/yazma action'ları ve güvenli audit | Admin-only mutation; retry audit çoğaltmaz. |
| 4 — Ayarlar UI ve Tüketiciler | `/ayarlar` formu ve yeni gider/fatura/hakediş taslaklarına server-supplied default | Geçmiş kayıtlar ve explicit satır oranları değişmez. |
| 5 — İzole Gerçek Veri ve Kapanış | Ayrılmış scope, fallback/persisted, rol, concurrency, tüketici ve tam kalite kabulü | Komşu domain hareketi/audit dışı yan etki yok. |

## 7. Kabul kriterleri

- Ayar yokken mevcut `%20` davranışı değişmez.
- Persisted ayar yalnız aynı tenant/firma/dönemde okunur.
- Admin açık dönemde geçerli değer kaydedebilir; diğer roller ve kapalı dönem
  yazamaz.
- Aynı request key ikinci mutation veya audit üretmez.
- Eski revision ile yazım reddedilir ve mevcut değer korunur.
- Yeni taslaklar aktif KDV varsayılanını alır.
- Kullanıcının açıkça belirlediği satır KDV oranı ayarla ezilmez.
- Mevcut/geçmiş kayıtların KDV oranı ve toplamı değişmez.
- Çoklu döviz ve KDV dahil hesap modu açılmaz.
- UI mobil, tema, print ve erişilebilir hata/başarı durumlarını korur.
- Tam kapılar `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 8. Kapsam dışı

Çoklu döviz, döviz kuru sağlayıcısı, kur farkı muhasebesi, KDV dahil fiyat
motoru, tevkifat/istisna/özel matrah, vergi dönemi takvimi, geçmiş belge
recalculation/backfill, firma unvan/adres/vergi ayarları, lokasyon modu
değişikliği, rol matrisi düzenleme, bildirim/e-posta/push ayarları, yeni API
endpoint'i ve dış entegrasyon bu RFC'nin dışındadır.

## 9. Onay kapısı

Bölüm 3'teki on varsayım ve Faz 24 dilimlerinin yeniden onay istenmeden
tamamlanması kullanıcı tarafından 30.07.2026 tarihinde onaylandı.

## 10. Tamamlanma kaydı

- **Dilim 1 — Domain Çekirdeği:** Typed effective ayar/fallback sözleşmesi,
  iki ondalıklı `0..100` KDV validasyonu, admin/açık dönem yazım kararı,
  optimistic revision ve içeriksiz idempotency anahtarı tamamlandı.
- **Dilim 2 — Şema ve Repository:** Additive `FinanceSetting` modeli ve
  `20260731030000_add_finance_settings` migration'ı eklendi. Okuma/yazma
  tenant, firma ve dönemle tam scoped; backfill yapılmadı.
- **Dilim 3 — Server Action ve Audit:** Oturum ve aktif scope guard'lı okuma
  ile admin-only yazma action'ları eklendi. Başarılı mutation tek güvenli
  audit üretir; retry audit çoğaltmaz ve request key audit'e yazılmaz.
- **Dilim 4 — Ayarlar UI ve Tüketiciler:** `/ayarlar` effective kaynağı ve
  revision'ı gösteren düzenleme formuna kavuştu. Yeni gider, alış/satış
  faturası ve klasik hakediş satırları server-supplied KDV varsayılanını
  kullanır; explicit ve mevcut satırlar korunur.
- **Dilim 5 — İzole Gerçek Veri ve Kapanış:** Ayrılmış F24 kapsamında
  fallback, `%18`/kapalı dağılım kaydı, retry, stale revision, rol, kapalı
  dönem, yabancı scope ve yan etki kabulü geçti. Masaüstü, 390 px mobil,
  açık/koyu tema ve salt-okur UI doğrulandı. Ayrıntı
  `Docs/UI-baseline/Faz24-gercek-veri-kapanis-20260730.md` içindedir.
