# NOA İnşaat — HTML Şablon Özellik ve Gap Kaydı

> Faz: 1
> Tarih: 18.07.2026
> Durum: Tamamlandı
> Karar ilkesi: Mevcut domain/read-model yeterliyse yeni Prisma alanı veya model eklenmez.

## 1. Sınıflandırma

| Kod | Anlam | Onay gereksinimi |
|---|---|---|
| V1 | Görsel/token/layout | Onaylı master plan sınırında uygulanabilir |
| V2 | Mevcut veriyle UX davranışı | Dikey dilim + test + görsel kabul |
| F1 | Mevcut action/service/model ile gerçek işlev | Dikey dilim + domain regresyonu |
| F2 | Yeni kalıcı veri veya iş kuralı | Mini-RFC + ayrı kullanıcı onayı |

## 2. Özellik Gap Matrisi

| # | Özellik/desen | Sınıf | Mevcut proje kanıtı | Karar | Hedef faz |
|---:|---|---|---|---|---|
| 1 | Ortak renk/type/spacing sistemi | V1 | `globals.css` token tabanı; 76 şablonda aynı değerler | Semantic token + legacy alias olarak uygula | 2 |
| 2 | Material ikonlu navigasyon | V1, V2 | `navigationItems`; mevcut text kısaltmaları | Yerel ikon kaydı; route/RBAC aynı kalır | 2–3 |
| 3 | 260 px sidebar + 64 px header | V1, V2 | `AppShell`, session/context/notification | Tek AppShell v2; şablon shell'lerini at | 3 |
| 4 | Mobil sidebar drawer | V2 | Mevcut sidebar mobilde gizli | Focus/escape/return sözleşmeli drawer | 3 |
| 5 | Profil avatarı | V1 | Kullanıcı adı/rol mevcut; fotoğraf alanı yok | Baş harf avatarı; DB değişikliği yok | 3 |
| 6 | Global arama | F2 | Ortak scoped search service/index yok | Header'da gösterme; ayrı mini-RFC beklet | 8 adayı |
| 7 | Dashboard özet/trend/aktivite | V1, V2, F1 | `DashboardSurface` gerçek invoice/expense/payment/tender verisi | Yalnız gerçek karşılaştırma ve aktiviteyi göster | 4 |
| 8 | Firmalar dashboard | V1, V2, F1 | Dashboard müşteri/tedarikçi/taşeron dönem filtresi mevcut | Mevcut read-model'i şablon düzenine taşı | 4 |
| 9 | Şantiye finans analiz panosu | V1, V2, F1 | `SiteManagementSurface` invoice/expense/progress data alıyor | Yeni model yok; scoped aggregate | 5/7 |
| 10 | Ortak entity liste/filter/action | V1, V2, F1 | `EntityListSurface`, `CounterpartyManagementSurface` | Müşteriler pilotunda canonical yap | 4 |
| 11 | Entity import/export | V2, F1 | `importEntityRowsAction`; mevcut tablo/export desenleri | Gerçek action varsa göster; sahte export yok | 4–5 |
| 12 | Cari hesap ekstresi | V1, V2, F1 | Counterparty statement + `LedgerSurface` | Aynı scoped detay panelinde birleştir | 4–5 |
| 13 | İhale Kanban/liste toggle | V1, V2, F1 | `TenderManagementSurface`, durum alanları | Gerçek aynı satır setinin iki görünümü | 4 |
| 14 | İhale analiz panosu | V1, V2, F1 | Tender dates/status/values ve BOQ özetleri | Türetilmiş read-model; yeni tablo yok | 4/7 |
| 15 | İhale kârlılık simülasyonu | V1, V2, F1 | `calculateTenderBoqSimulation`, `TenderBoqLine` | Mevcut hesap çekirdeğini yeni UX'e bağla | 4/7 |
| 16 | Üç sekmeli yeni ihale formu | V1, V2, F1 | Tender create/update/BOQ action'ları | Canonical form; state ve validation korunur | 4 |
| 17 | Doküman klasör/list/grid/çöp | V1, V2, F1 | `DocumentCenterSurface` ve actions | Genişletilmiş şablon düzenine taşı | 5 |
| 18 | Dosya yükleme modalı | V1, V2, F1 | `createDocumentFileAction` | Gerçek dialog/focus ve mevcut action | 5 |
| 19 | Bildirim merkezi/tercihler | V1, V2, F1 | `Notification`, `NotificationPreference` | Liste + ayarlar alt görünümü | 5 |
| 20 | Audit günlüğü filtre/detay | V1, V2, F1 | `AuditLog`, read repository, Settings audit listeleri | Yeni model yok; tenant scoped read-model | 5/7 |
| 21 | Kullanıcı daveti | V1, V2, F1 | `UserInvitation`, create/resend/revoke/accept | Settings drawer olarak uygula | 5/7 |
| 22 | Rol ve yetki matrisi | V1, V2, F1 | `AppUserScopeAccess`, user management actions | Mevcut rol sözleşmesinin izin verdiği kapsam | 5/7 |
| 23 | Banka entegrasyon ayarları | V1, V2, F1 | `BankIntegrationConnection`, sandbox test/sync | Sandbox sınırı görünür; gerçek bağlantı yok | 5 |
| 24 | Banka manuel eşleştirme | V1, V2, F1 | Candidate/suggestion, approve/reopen/partial match actions | Mevcut ledger/idempotency guard'larıyla UX dönüşümü | 5/7 |
| 25 | Banka recovery/mutabakat panoları | V1, V2, F1 | Bank audit read-model ve issue filtreleri | Settings içinde gerçek operasyon paneli | 5/7 |
| 26 | Kasa/Banka hareket workspace'i | V1, V2, F1 | `CashBankMovement`, virman, source/reversal/ledger | Ana finansal tablo pilotu | 4–5 |
| 27 | Araç bakım/servis takvimi | V1, V2, F1 | `maintenanceDueDate`, insurance/inspection tarihleri | Mevcut alanlardan takvim; yeni maintenance modeli yok | 5 |
| 28 | Canlı araç/GPS haritası | F2 | Gerçek Arvento erişimi/konum akışı yok | Çalışıyor gibi gösterme; ayrı dış entegrasyon onayı olmadan yok | Kapsam dışı |
| 29 | E-Fatura yönetim görünümü | V1, V2, F1 | Mevcut status planı ve webhook audit görünümü | Yalnız UI; provider/domain genişlemesi yok | 5 |
| 30 | Fatura/irsaliye birleşik workspace | V1, V2, F1 | Purchase/sales/delivery surfaces ve actions | Mevcut kesinleştirme/ödeme/ters kayıt korunur | 5 |
| 31 | Çek yönetimi | V1, V2, F1 | `Cheque`, collect action, ledger bağlantısı | Şablon tablo/toolbar düzeni | 5 |
| 32 | Stok kartı/hareket/minimum stok | V1, V2, F1 | Entity stock cards, `StockMovement`, `StockMinimumSetting` | Tek workspace; gerçek hareket guard'ları | 5 |
| 33 | Personel/zimmet/bordro workspace | V1, V2, F1 | Entity personel, `PersonnelAssetAssignment`, `PayrollAccrual` | Mevcut üç yüzeyi ortak desenle birleştir | 5 |
| 34 | Puantaj yoğun grid | V1, V2, F1 | `Timesheet`, `TimesheetLine`, current surface | Detaylı cetvel canonical | 5 |
| 35 | Puantaj dosya aktarımı | V1, V2, F1/F2 | Mevcut import davranışı; kalıcı staging modeli yok | Parse/validate/import F1; staging/geçmiş F2 | 5/8 adayı |
| 36 | Rapor merkezi | V1, V2, F1 | `ReportsSurface` gerçek read-model'ler | Gerçek rapor/filtre varsa göster | 5 |
| 37 | PDF/Excel/print butonları | V2, F1 | Bazı gerçek export/print davranışları var | Yalnız çalışan çıktı; print standardıyla | 5–9 |
| 38 | Hakediş proje/sözleşme/poz | V1, V2, F1 | `ConstructionProject`, `ConstructionContractItem` | Hakediş workspace'e taşı | 6 |
| 39 | Hakediş zinciri/onay/finalize | V1, V2, F1 | `ConstructionProgressPayment`, approval events/actions | Mevcut durum zinciri aynen korunur | 6 |
| 40 | Genel ve demir metraj föyleri | V1, V2, F1 | `ConstructionMeasurementSheet/Line`, GENERAL/REBAR | Şablon editörlerine bağla | 6 |
| 41 | Yeşil Defter ve miktar kontrol | V1, V2, F1 | Measurement reconciliation + snapshot/report | Adımlı UX; yeni tablo yok | 6 |
| 42 | İmalat çarşafı | V1, V2, F1 | Snapshot, report summary ve metraj satırları | Salt-okunur/rapor görünümü | 6 |
| 43 | Tutanaklı işler | V1, V2, F1 | `ConstructionExtraWork` ve actions | Mevcut create/delete/summary | 6 |
| 44 | Kesinti hareketleri | V1, V2, F1 | `ConstructionDeductionMovement` ve actions | Mevcut hareket form/listesi | 6 |
| 45 | Kesinti hesaplama kuralları/şablonları | F2 | Kalıcı rule/template modeli yok | Ayrı mini-RFC; mevcut hareket modeline sıkıştırma | 8 adayı |
| 46 | Birim fiyat revizyonu | V1, V2, F1 | `ConstructionContractItemPriceRevision` | Geçmiş snapshot yeniden fiyatlanmadan | 6 |
| 47 | Hakediş muhasebe bağlantısı | V1, V2, F1 | `ConstructionAccountingLink`, ledger belge görünümü | İç ledger bağlantısı; dış sync yok | 6/7 |
| 48 | Poz bazlı geçici simülasyon | V1, V2, F1 | Mevcut ölçüm/hesap helper'ları | Kaydetmeden hesaplanabilir | 6/7 |
| 49 | Kalıcı simülasyon senaryosu/geçmişi | F2 | Senaryo modeli yok | Mini-RFC olmadan DB alanı/modeli yok | 8 adayı |
| 50 | Toplu metraj parse/önizleme | V1, V2, F1 | XLSX bağımlılığı ve import script desenleri | Dry-run validation + onaylı import | 6/7 |
| 51 | Kalıcı import staging/geçmişi | F2 | Staging/job modeli yok | Mini-RFC ve veri yaşam döngüsü kararı | 8 adayı |
| 52 | Dark tema | V1, V2 | 50/76 şablonda parçalı dark class | Light parity sonrası tek semantic tema | 9 |
| 53 | Reduced motion | V2 | Şablonlarda yok | Global standard + component test | 2/9 |
| 54 | Erişilebilir modal/table/form | V2 | Şablon semantiği yetersiz; projede kısmi aria kullanımı | Ortak primitive'lerin zorunlu sözleşmesi | 2–9 |

## 3. F2 Adayları — Ayrı Onay Kapısı

### F2-01 — Global scoped arama

Karar verilmesi gerekenler:

- Hangi entity/domain türleri aranacak.
- Tenant/firma/dönem ve rol filtreleri.
- PostgreSQL indeks/FTS veya ayrı read-model seçimi.
- Sonuç sıralama, highlight ve yetkisiz sonuç sızıntısı.
- Audit gerekip gerekmediği.

Bu kararlar olmadan header arama input'u gösterilmeyecektir.

### F2-02 — Kesinti kuralı ve şablonu

> Durum (22.07.2026): Docs/RFC-F8-01-kesinti-kurallari.md kapsamındaki
> domain, şema/repository, önizleme/uygulama, UI ve gerçek veri kabul dilimleri
> tamamlandı. F2-02 artık uygulanan işlevdir; kural tabanı bu RFC sınırı dışında
> otomatik genişletilmez.

Mevcut `ConstructionDeductionMovement` gerçekleşmiş hareketi tutar; tekrar kullanılabilir kural tanımı değildir. Olası yeni model ancak şu ihtiyaç kanıtlanırsa değerlendirilir:

- Oran/sabit tutar ve hesap tabanı.
- Geçerlilik tarihi ve revizyon.
- Proje/sözleşme kapsamı.
- Uygulama sırası, tavan/taban ve vergi etkisi.
- Üretilen hareket ile kural revizyonu arasındaki snapshot ilişkisi.

### F2-03 — Kalıcı simülasyon senaryosu

İlk sürüm client/server hesaplama sonucu olarak geçici çalışabilir. Kaydetme, karşılaştırma, paylaşma veya onay akışı istenirse model/RBAC/audit gerekir.

> Uygulama durumu (23.07.2026): `RFC-F11-01` onaylandı. Öneri yalnız
> Hakediş Pro poz bazlı metraj simülasyonunu; normalize scenario/revision/line
> snapshot'ları, iç karşılaştırma, admin onayı ve arşiv yaşam döngüsüyle ele
> alır. İhale BOQ, gerçek metraja aktarım, public paylaşım ve import staging
> kapsam dışıdır. Dilim 1 Domain Çekirdeği ve Dilim 2 Şema/Repository
> tamamlandı. Üç normalize tablo additive migration ile eklendi; repository
> scope, append-only revizyon, concurrency ve idempotency kurallarını 13 yeni
> testle doğrular. Gerçek simülasyon verisi yoktur. Sıradaki bağımsız dilim
> Server Action ve Audit'tir.
>
> Dilim 3 (23.07.2026): Session scope + abonelik + dönem + RBAC kontrollü
> list/detail/create/revise/clone/approve/archive/compare action'ları ve atomik
> merkezi audit tamamlandı. Create/revise sunucuda yeniden hesaplanır;
> idempotent retry audit çoğaltmaz. Sıradaki dilim Hakediş Pro UI'dır.
>
> Dilim 4 (23.07.2026): Mevcut geçici hesap korunarak kalıcı kaydetme, geçmiş,
> append-only revizyon, klon, karşılaştırma, admin onay/arşiv, stale-source
> uyarısı ve `/hakedis?senaryo=<id>` iç deep-link UI'sı tamamlandı. Viewer
> mutasyon kontrolleri DOM'a eklenmez. Gerçek raporda yazmasız görsel ön kabul
> geçti; sıradaki dilim Gerçek Veri ve Kapanış'tır.
>
> Dilim 5 (23.07.2026): İki gerçek demo senaryosu dört append-only revizyonla
> oluşturuldu; A onaylandı, B arşivlendi. Accounting/admin/viewer, deep-link,
> compare, audit/scope izolasyonu, source mutabakatı, mobil/desktop, light/dark,
> print ve odak kabulü geçti. `npm run hakedis:scenario:verify` kapanış
> mutabakatını kalıcılaştırır. RFC-F11-01 ve F2-03 tamamlandı.

### F2-04 — Import staging ve geçmiş

İlk sürüm dosyayı parse eder, doğrulama raporu üretir ve kullanıcı onayından sonra mevcut create action'larına aktarır. Kalıcı dosya/job/satır hata geçmişi istenirse yaşam döngüsü, PII, dosya saklama ve rollback mini-RFC'si gerekir.

> Planlama kapısı (23.07.2026): `RFC-F12-01-kalici-import-staging-gecmisi.md`
> hazırlandı. Öneri yalnız Hakediş Pro metraj CSV'sini; kalıcı batch/satır/event
> geçmişi, sunucu doğrulaması, açık onay, idempotent ve all-or-nothing metraj
> uygulamasıyla ele alır. Dosya byte'ı, XLSX, genel import motoru, dış storage,
> worker ve destructive rollback kapsam dışıdır. 10 varsayım kullanıcı onayı
> bekler; onaydan önce şema veya uygulama değişikliği yapılmayacaktır.
>
> Dilim 1 (23.07.2026): 10 varsayım onaylandı. Strict UTF-8 CSV parser'ı,
> 2 MiB/500 satır sınırı, sürümlü mapping, normalize satır/hata DTO'ları,
> formula nötrleştirme, SHA-256, tam scope idempotency, lifecycle ve RBAC
> çekirdeği 25 hedefli testle tamamlandı. Şema/repository/UI/veri değişmedi.
>
> Dilim 2 (23.07.2026): Normalize batch/row/event şeması ve migration
> uygulandı. Full-scope repository create/list/detail/validate/apply/cancel,
> kaynak sürümü, idempotency, optimistic status, row-line bağlantısı ve mevcut
> snapshot hesabıyla all-or-nothing apply sağlar. Tablolar `0/0/0`; gerçek
> import yazılmadı.
>
> Dilim 3 (23.07.2026): Scoped list/detail ve upload/validate/apply/cancel
> Server Action'ları eklendi. Abonelik, oturum, tam scope, rol ve dönem
> guard'ları uygulanır; CSV sunucuda byte'tan yeniden parse edilir. Event ve
> güvenli merkezi audit aynı transaction'dadır; idempotent terminal retry
> geçmişi veya metrajı çoğaltmaz. UI/gerçek veri değişmedi.
>
> Dilim 4 (23.07.2026): Kalıcı import UI, satır/hata/event görünümü, açık apply
> onayı, geçmiş, oluşan föy bağlantısı ve `/hakedis?import=<id>` deep-link'i
> tamamlandı. Viewer kalıcı paneli DOM'a almaz; responsive, tema, print, odak ve
> yazmasız tarayıcı kabulü geçti. Sırada Gerçek Veri ve Kapanış vardır.
>
> Dilim 5 (28.07.2026): Gerçek kabul yalnız `F12-KABUL-20260728 / F12-HAK-001`
> izole taslak kaynağında tamamlandı. Geçerli CSV `CREATED → VALIDATED →
> APPLIED` ile `3.5 m3 / 3.500 TL` sonucuna ulaştı; create/apply retry'ları
> idempotenttir. Hatalı CSV tek `ITEM_NOT_FOUND` taslak satırında kaldı ve
> metraj yazmadı. Dört merkezi audit, güvenli metadata, sıfır cross-scope,
> gerçek deep-link/UI/tema/mobil/print/erişilebilirlik kabulü ve
> `npm run hakedis:import:scenario:verify` doğrulaması geçti. RFC-F12-01 ve
> F2-04 tamamlandı.

### F2-05 — Gerçek dış entegrasyonlar

Open Banking, Arvento, GİB, ödeme sağlayıcısı veya outbound webhook worker erişimi/kimlik bilgisi yoktur. Şablondaki sync/map/status kontrolleri gerçek bağlantı varmış gibi gösterilmeyecektir.

28.07.2026 tarihinde `Docs/RFC-F13-01-saglayici-onayli-dis-entegrasyon-kapisi.md`
ile provider-bağımsız onay kapısı hazırlandı ve on varsayım kullanıcı tarafından
onaylandı. Tek sağlayıcı ve tek operasyon seçimi, resmi sandbox sözleşmesi ve
güvenli credential teslim yöntemi beklenir; bu kayıt uygulama, dış çağrı veya
şema genişletmesi anlamına gelmez.

## 4. Bu Fazda Reddedilen Şema Genişletmeleri

| Öneri | Karar | Gerekçe |
|---|---|---|
| `AppUser.avatarUrl` | Eklenmez | Baş harf avatarı yeterli; kalıcı iş ihtiyacı yok. |
| Genel `theme` alanı | Eklenmez | Dark tema kararı Faz 9; önce client preference/SSR stratejisi. |
| Yeni firma dashboard tablosu | Eklenmez | Mevcut işlem verilerinden türetilebilir. |
| Yeni şantiye finans tablosu | Eklenmez | Mevcut fatura/gider/hakediş/hareket read-model'i yeterli. |
| Yeni ihale simülasyon tablosu | Eklenmez | Mevcut BOQ ve hesap helper'ı yeterli; kalıcı senaryo ayrı F2. |
| Yeni audit modeli | Eklenmez | `AuditLog` mevcut. |
| Yeni manuel banka eşleştirme modeli | Eklenmez | `BankTransaction`, `BankLedgerEntry` ve actions mevcut. |
| Yeni bakım takvimi modeli | Eklenmez | İlk takvim mevcut araç tarih alanlarından üretilebilir. |
| Yeni hakediş muhasebe link modeli | Eklenmez | `ConstructionAccountingLink` mevcut. |
| Yeni metraj/yeşil defter modeli | Eklenmez | `ConstructionMeasurementSheet/Line` ve snapshot altyapısı mevcut. |

## 5. Risk ve Kontrol Kaydı

| Risk | Kontrol |
|---|---|
| Şablon control'ünü çalışır sanmak | Her control action/service/model kanıtına bağlanır. |
| Büyük surface'lerde davranış kaybı | Küçük alt panel dilimi + hedefli test + tam kapılar. |
| Global token değişiminin tüm sayfaları bozması | Additive semantic token + legacy alias + pilot allowlist. |
| İkinci sidebar/header üretmek | Yalnız AppShell global shell; Hakediş Pro content-only. |
| Sahte dış entegrasyon durumu | Sandbox/plan etiketi görünür; gerçek bağlantı iddiası yok. |
| DB şemasını görsel input'a göre büyütmek | F2 mini-RFC zorunlu; mevcut read-model öncelikli. |
| Responsive tabloda finansal bağlam kaybı | Domain bazlı kolon önceliği; gerekirse yatay scroll. |
| Şablon erişilebilirlik eksiklerini taşımak | Template Standard v1 semantiği şablondan üstündür. |

## 6. Faz 1 Kararı

- 76 şablonun tamamı V1/V2/F1/F2 kapsamında sınıflandırıldı.
- Faz 2 için yeni Prisma migration gerekmiyor.
- İlk işlevsel genişlemelerin çoğu mevcut F1 altyapısıyla yapılabilir.
- Proje içi kalıcı veri modeli adayları yalnız global arama, kesinti kuralları, kalıcı simülasyon ve kalıcı import staging için ayrı F2 karar kapısında tutulur.
- Gerçek dış entegrasyonlar F2-05 kapısında ve mevcut master planın dışında kalır; API/e-Fatura/webhook domainleri yeniden açılmaz.

## 7. Faz 7 F1 Kapanış Güncellemesi — 22.07.2026

Faz 7 kapanış denetiminde aşağıdaki F1 gruplarının gerçek action/read-model,
görünür UI ve regresyon testi üçlüsüyle tamamlandığı doğrulandı:

| Grup | Durum | Ana kanıt |
|---|---|---|
| Audit filtre ve detay | Tamamlandı | `LedgerSurface`, scoped audit action/read-model |
| Banka manuel/kısmi eşleştirme ve recovery | Tamamlandı | `SettingsSurface`, bank integration service/actions |
| Firma ve şantiye finans panoları | Tamamlandı | `DashboardSurface`, ortak şantiye kârlılık read-model'i |
| Hakediş muhasebe bağlantısı | Tamamlandı | Hakediş Pro Muhasebe sekmesi ve gerçek ledger satırları |
| Bildirim tercihleri, rol ve davet | Tamamlandı | Bildirim Merkezi ve Ayarlar kullanıcı yönetimi panelleri |
| Kârlılık ve durum analizleri | Tamamlandı | Raporlar, ihale analizi ve şantiye kârlılık görünümü |

Yedi yüzey test dosyasındaki 74 kapanış testi geçti. Yeni F1 boşluğu bulunmadı;
tamamlanmış Faz 5/6 yüzeyleri yeniden tasarlanmadı. Bu kayıtla Faz 7 kapanır.
F2-01–F2-05 kararları Faz 8'de ayrı mini-RFC ve kullanıcı onayı gerektirmeye
devam eder.

## 8. Faz 9 Nihai Gap Durumu

| F2 kapısı | Nihai durum |
|---|---|
| F2-01 Global scoped arama | Tamamlandı. `RFC-F10-01` Dilim 1–5 kapandı; 55 kayıt/scope ve en kötü p95 18,47 ms ile migration gerekmiyor. |
| F2-02 Kesinti kuralı ve şablonu | RFC-F8-01 sınırında tamamlandı ve gerçek veriyle kabul edildi. |
| F2-03 Kalıcı simülasyon senaryosu | Tamamlandı. `RFC-F11-01` Dilim 1–5 kapandı; gerçek veri, rol, deep-link, audit/scope ve görsel kabul geçti. |
| F2-04 Kalıcı import staging/geçmişi | Tamamlandı. `RFC-F12-01` Dilim 1–5 kapandı; izole gerçek CSV kabulü, idempotency, audit/scope, deep-link ve görsel kabul `npm run hakedis:import:scenario:verify` ile kalıcılaştırıldı. |
| F2-05 Gerçek dış entegrasyonlar | Dilim 0 açık; Open Banking salt-okunur hareket önizlemesi ve on varsayım onaylandı. Belirli sağlayıcı, resmi sandbox sözleşmesi, güvenli credential teslimi ve kabul scope'u olmadan sandbox/plan sınırı korunur. |

Faz 9 kapanışı bu bekleyen kapıları otomatik olarak onaylamaz. Yeni işlev talebi ilgili mini-RFC, veri yaşam döngüsü, RBAC, audit ve migration kararıyla ayrı bir fazda ele alınır.

F2-01 uygulaması onaylı sınırda başladı. Domain tipleri, sorgu hazırlama,
ranking, limitler, navigasyon sonuçları, federatif Prisma repository, aktif
oturum kapsamlı server action ve ortak AppShell command dialog'u tamamlandı.
Kaynaklar, hassas veri istisnaları, performans eşiği ve rollback kararı
`Docs/RFC-F10-01-global-scoped-arama.md` içinde tanımlıdır. Fatura, çek ve
ihale deep-link'leri ile gerçek veri/rol/responsive/tema kabulü tamamlandı.
Üç scope ve 720 örnekte en yüksek hacim 55, en kötü p95 18,47 ms ölçüldü;
10.000/300 ms eşikleri geçildi. FTS/GIN, projection ve migration açılmadan
F2-01 kapandı.
