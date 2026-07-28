# RFC-F14-01 — İSG Operasyon Çekirdeği

> Durum: **Faz 14 tamamlandı — İSG operasyon çekirdeği kabul edildi**
> Tarih: 28.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 10, 17.3 ve 20.2

## 1. Amaç

NOA'ya, şantiye ve personel bağlamında operasyonel iş sağlığı ve güvenliği
(İSG) kayıtlarını yönetebilecek ilk dikey modül eklenir. İlk sürüm; iş kazası,
İSG eğitimi/katılımı, saha denetimi/bulgusu ve KKD zimmetini aynı scoped,
denetlenebilir yüzeyde birleştirir.

Bu çalışma resmi SGK/İSG beyanı, hukuki uygunluk değerlendirmesi veya elektronik
bildirim sistemi değildir. Amaç; şirket içi operasyon kaydı, takip ve aksiyon
görünürlüğüdür.

## 2. Mevcut altyapıyla uyum

İlk modül mevcut `TenantScope` sözleşmesindeki tenant/firma/dönem izolasyonunu,
`admin` ve `accounting` yazma rolünü, `viewer` salt-okunur erişimini; `AuditLog`,
personel varlık zimmeti ve `ConstructionProject` bağlamını yeniden kullanır.
Yeni genel shell, ikinci dosya saklama sistemi veya bağımsız finansal hareket
motoru oluşturulmaz.

| İSG ihtiyacı | İlk karşılık | Sınır |
|---|---|---|
| İş kazası | `WorkAccident` operasyon kaydı | Resmi bildirim/SGK gönderimi yok. |
| Eğitim | `SafetyTraining` ve katılım satırları | Sertifika doğrulama veya dış LMS yok. |
| Denetim | `SafetyInspection` ve `SafetyFinding` | Mobil çevrimdışı senkron yok. |
| KKD zimmeti | `PPEIssuance`, personel zimmet deseni | Stok/depo otomatik düşümü yok. |

## 3. Önerilen varsayımlar

1. Faz 14 yalnız operasyonel İSG kaydı ve takibi sağlar; resmi kurum beyanı, hukuki süre hesabı ve otomatik uyum kararı kapsam dışıdır.
2. Tüm kalıcı kayıtlar tenant, firma ve dönem kapsamına bağlıdır; proje/şantiye veya personel bağlantısı yalnız aynı kapsamda seçilebilir.
3. İlk sürümde iş kazası, eğitim/katılım, denetim/bulgu ve KKD zimmeti için additive Prisma modelleri kullanılır; mevcut personel, proje ve finans tabloları geriye dönük değiştirilmez.
4. `admin` ve `accounting` oluşturma/güncelleme/kapanış yapabilir; `viewer` yalnız kapsam içi okur. Yeni bir İSG rolü ilk sürümde eklenmez.
5. Her oluşturma, durum değişimi ve kapanış merkezi audit kaydı üretir; kişisel sağlık detayı, serbest belge içeriği veya hassas notlar audit metadata'ya yazılmaz.
6. İş kazası başlangıçta `draft → recorded → closed` yaşam döngüsünü; denetim bulgusu `open → resolved` yaşam döngüsünü kullanır. Silme yerine kontrollü kapanış/iptal tercih edilir.
7. Eğitim katılımı aynı eğitim-personel çifti için tekildir; KKD zimmeti aynı personel/ekipman teslimi için idempotent oluşturulur ve iade tarihiyle kapanır.
8. İlk kullanıcı arayüzü ortak AppShell altında liste, filtre, detay/drawer ve açık aksiyon planı standartlarını kullanır; mobil offline, kamera ve dosya yükleme sonraki faza kalır.
9. İSG kaydı otomatik bordro, puantaj, stok düşümü, ceza, görev veya bildirim üretmez; ilerideki çapraz modül etkileri ayrı RFC ile kararlaştırılır.
10. İlk gerçek kabul yalnız ayrılmış test tenant/firma/döneminde yapılır; demo/E2E verisi, tamamlanmış Faz 8–12 kabul kayıtları ve F13 sandbox sınırı korunur.

## 4. Veri yaşam döngüsü ve sınırlar

| Varlık | Temel alanlar | İlk yaşam döngüsü |
|---|---|---|
| `WorkAccident` | proje, personel, olay tarihi, sınıflama, özet, durum | taslak → kaydedildi → kapandı |
| `SafetyTraining` | eğitim adı/türü, eğitmen, tarih, süre, sonraki tarih | taslak → planlandı → tamamlandı |
| `SafetyTrainingAttendance` | eğitim, personel, katılım durumu | eğitim-personel bazında tekil |
| `SafetyInspection` | proje, denetleyen, tarih, checklist özeti | taslak → tamamlandı |
| `SafetyFinding` | denetim, kategori, risk seviyesi, sorumlu, hedef tarih | açık → çözüldü |
| `PPEIssuance` | personel, KKD tipi, teslim/iade tarihi, durum | teslim edildi → iade edildi |

Serbest metin alanları doğrulanmış uzunluk sınırına sahip olur. Doküman bağlantısı
ve fotoğraf, mevcut Doküman Merkezi sözleşmesi doğrulanmadan bu modellerde
sahiplenilmez.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain çekirdeği | DTO, doğrulama, durum geçişleri, izin ve idempotency kuralları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve repository | Altı additive model, scoped repository ve migration | Backfill yok; yanlış scope sıfır. |
| 3 — Action ve audit | Rol/kapalı dönem guard'ları, mutation ve güvenli audit | Hassas metadata sızmaz; fail-closed. |
| 4 — İSG merkezi UI | Liste/filtre/detay/form, erişilebilir modal/drawer ve deep-link | Viewer yazamaz; mobil/tema/print kabulü. |
| 5 — İzole gerçek veri ve kapanış | Ayrılmış kabul kaydı, audit/scope/idempotency ve tam kapılar | Diğer modül ve F13 değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem, kapalı dönem ve yetkisiz rol hiçbir kayıt yazmadan reddedilir.
- Eğitim katılımı ve KKD zimmetinde duplicate denemesi ikinci kayıt, audit veya yan etki oluşturmaz.
- İş kazası ve bulgu kapanışı yalnız geçerli yaşam döngüsü geçişleriyle yapılır; ilişkili kayıtlar silinmez.
- UI; boş/yükleniyor/hata durumları, klavye odağı, yalnız renge dayanmayan durum işaretleri ve mobil taşma denetimini karşılar.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`, `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

SGK/İSG-KATİP veya başka kurum entegrasyonu, e-imza, hukuki raporlama, kamera/
offline mobil kayıt, sağlık verisi, otomatik bordro/puantaj/ceza, stok düşümü,
canlı bildirim worker'ı ve dış eğitim platformu entegrasyonu bu RFC'nin dışında
kalır.

## 8. Uygulama onayı

Faz 14 uygulamasına geçmek için kullanıcı Bölüm 3'teki on varsayımı onaylar.
Onay sonrası yalnız Dilim 1 Domain çekirdeğiyle başlanır; her sonraki dilim
bağımsız kabulden sonra ilerler.

### Onay ve Dilim 1 kapanış kaydı — 28.07.2026

Kullanıcı Bölüm 3'teki on varsayımı onayladı. `src/lib/workplace-safety.ts`,
iş kazası, eğitim, denetim, bulgu ve KKD için saf DTO/doğrulama sözleşmelerini;
geçerli takvim tarihi, metin sınırları, ileri yaşam döngüsü geçişleri,
eğitim-personel ve KKD teslimi idempotency anahtarlarını ve role/kapalı dönem
izin kararını içerir. `src/lib/workplace-safety.test.ts` hedefli paketi 11
testle geçti. Prisma şeması, migration, repository, action, UI ve gerçek veri
bu dilimde değişmedi.

### Dilim 2 kapanış kaydı — 28.07.2026

`SafetyWorkAccident`, `SafetyTraining`, `SafetyTrainingAttendance`,
`SafetyInspection`, `SafetyFinding` ve `SafetyPpeIssuance` additive Prisma
modelleri; tenant/firma/dönem foreign key'leri, kapsam indeksleri, eğitim-
personel ve scoped KKD idempotency tekillikleriyle eklendi.
`20260728214500_add_workplace_safety_core` migration'ı yerel
`insaatMuhasebe` geliştirme veritabanına başarıyla uygulandı; backfill veya
mevcut uygulama verisi değişikliği yapılmadı. `src/lib/workplace-safety-prisma-
repository.ts`, tüm alt yüzeyler için scope zorunlu overview okuması ve
create/update sözleşmelerini sağlar. Hedefli domain/repository paketi 14
testle, Prisma validate ve type-check ile geçti. Server action, audit, UI ve
izole gerçek İSG kabulü sonraki dilimlere bırakıldı.

### Dilim 3 kapanış kaydı — 28.07.2026

`src/app/actions/workplace-safety-actions.ts`, her İSG çağrısında aktif oturum
kapsamını yeniden çözer ve `ensureTenantScope` ile tenant/firma/dönem
önkoşulunu uygular. Yazma aksiyonları, proje veya personel sorgusundan önce
`admin`/`accounting` rolü ile açık dönem koşulunu fail-closed denetler; proje ve
personel referansları yalnız bu aktif kapsamda doğrulanır. İş kazası, eğitim,
katılım, denetim, bulgu ve KKD oluşturma/durum geçişleri, ortak service
katmanından merkezi audit'e gider. Audit metadata yalnız işlem/durum/operasyon
kimliklerini taşır; kaza ve bulgu gibi serbest hassas özetler kaydedilmez.
Kapsam içi İSG audit okuması altı tanımlı entity türüyle sınırlandı. UI,
revalidation, backfill ve gerçek İSG kaydı bu dilimde değiştirilmedi. Domain,
repository, service ve action hedefli paketi 4 dosya/22 testle ve type-check
ile geçti. Sıradaki bağımsız dilim **İSG merkezi UI**'dır.

### Dilim 4 uygulama kaydı — 28.07.2026

`/isg` AppShell route'u, aktif kapsam içindeki İSG Merkezi'ni açar.
`WorkplaceSafetySurface`; iş kazası, eğitim, saha denetimi, bulgu ve KKD
kayıtlarını tek tabloda arama/tür filtresiyle gösterir; seçili kaydı
`/isg?isg=<id>` deep-link'iyle erişilebilir drawer'da açar. Admin/accounting
için oluşturma formları, yaşam döngüsü aksiyonları ve eğitim katılımı görünür;
viewer veya kapalı dönem bağlamında mutation kontrolleri DOM'a alınmaz. Drawer
klavye odağı, Escape ile kapanış, canlı bildirim, metinli durum rozeti,
responsive yatay tablo ve print sınıflarını kullanır. Lookup action'ı açık
projeler ile aktif personeli yine tenant/firma/dönem scope'unda döndürür.
Component/action/domain/repository/service hedefli paketi 5 dosya/26 testle,
type-check ve lint ile geçti. Oturum gerektiren gerçek tarayıcı görsel kabulü
aktif demo oturumu ile ayrıca tamamlanacaktır; gerçek İSG kaydı yazılmadı.

### Dilim 4 kapanış kaydı — 28.07.2026

Aktif demo muhasebe oturumunda `/isg` ekranı 1440 × 900 light/dark ve 390 ×
844 dark kabulünden geçti; body yatay taşma üretmedi, mobil tablo kendi scroll
kabında kaldı. Yeni iş kazası formu, etiketli alanlar ve scope içi lookup'larla
açılıp kapatıldı; kayıt gönderilmedi. Viewer mutation DOM sınırı component
testiyle, print-safe sınıfları da UI sözleşmesiyle doğrulandı. Ayrıntılı kabul
kaydı `Docs/UI-baseline/Faz14-isg-ui-kabul-20260728.md` içindedir. Dilim 4
tamamlandı; gerçek İSG kabulü ve kapanış sıradadır.

### Dilim 5 kapanış kaydı — 28.07.2026

İzole kabul, `tenant-noa-demo` altında yalnız
`company-f14-kabul-20260728` / `period-f14-kabul-20260728` kapsamına yazıldı.
`F14-KABUL-20260728` projesinde iş kazası `CLOSED`, eğitim `COMPLETED`, tek
katılım, denetim `COMPLETED`, bulgu `RESOLVED` ve KKD zimmeti `RETURNED`
durumuna ulaştı. Aynı kabul ikinci kez çalıştırıldığında kayıt/audit artışı
oluşmadı; idempotent katılım ve KKD tekrarları korundu. Merkezi audit'te yalnız
13 beklenen İSG aksiyonu bulundu; yanlış firma/dönem/proje ve kasa-banka,
bordro, stok, puantaj yan etkileri sıfır kaldı. Faz 11 ve Faz 12 kabul
doğrulayıcıları sonrasında da başarılıdır. Tekrarlanabilir kabul komutu
`npm run isg:acceptance:verify`; ayrıntılı kayıt
`Docs/UI-baseline/Faz14-gercek-veri-kapanis-20260728.md` içindedir.
