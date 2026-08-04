# RFC-F19-01 — Bilgi Merkezi ve Duyuru Akışı

> Durum: **Tamamlandı — beş uygulama dilimi ve kapanış kabulü geçti**
> Tarih: 30.07.2026
> Kaynak: `Docs/NOA-insaat-yeni-moduller-genisletme-plani.md` Bölüm 9.5,
> 9.8, 15.5 ve 17.3; `Parsek/Parsek-Bilgi Merkezi.png`

## 1. Amaç

NOA'ya; şirket içi duyuru, planlı bakım, ürün/iş akışı güncellemesi ve haber
içeriklerinin tek, aranabilir ve mobil uyumlu akışta yayımlanabileceği ilk
Bilgi Merkezi dikeyi eklenir.

Kaynak Parsek ekranındaki kategori filtreleri, kart hiyerarşisi, yeni etiketi,
tarih ve detay aksiyonu NOA tasarım sistemiyle yeniden kurulur. Bu ilk sürüm,
NOA platform operatörü veya merkezi yayın servisi varmış gibi davranmaz.
İçerikler aktif tenant/firma/dönem kapsamındaki admin tarafından yayımlanan
**şirket duyuruları** olarak açıkça etiketlenir.

## 2. Mevcut altyapıyla uyum

Çalışma; mevcut `TenantScope`, aktif oturum, rol kararları, merkezi `AuditLog`,
AppShell, module route, modal/drawer, responsive kart ve print standartlarını
yeniden kullanır. Mevcut `/bildirimler` kişiye yönelik operasyon bildirimidir;
Bilgi Merkezi çok kullanıcıya görünür yayın akışıdır ve iki model birbirine
karıştırılmaz.

| İhtiyaç | Faz 19 ilk karşılığı | Sınır |
|---|---|---|
| Yayın | Scoped `Announcement` | Platformlar arası/global yayın yok. |
| Kategoriler | Duyuru, bakım, güncelleme, haber | Serbest kategori yok. |
| Yönetim | Admin için taslak, yayımla, arşivle | Onay kurulu veya zamanlayıcı worker yok. |
| Okuma | Tüm doğrulanmış roller için yayımlanmış içerik | Kişisel hedefleme ve okundu bilgisi yok. |
| UI | Kart akışı, filtre, arama, detay deep-link'i | Ayrı CMS veya zengin metin editörü yok. |

## 3. Önerilen varsayımlar

1. Faz 19 ilk sürümü tenant içi Bilgi Merkezi'dir. Platform operatörü,
   tenantlar arası merkezi yayın veya gerçek “NOA platform duyurusu” varmış
   gibi gösterilmez; imza **Şirket Duyurusu** olur.
2. Her duyuru `tenantId + companyId + periodId` aktif kapsamını taşır. Yanlış
   tenant, firma veya dönem kaydı okunamaz, yayımlanamaz ya da arşivlenemez.
3. Tek additive `Announcement` Prisma modeli eklenir. Mevcut `Notification`,
   bildirim tercihleri, dokümanlar ve Faz 8–18 verileri backfill edilmez.
4. Kategoriler `ANNOUNCEMENT`, `MAINTENANCE`, `UPDATE` ve `NEWS`; öncelikler
   `NORMAL` ve `IMPORTANT` ile sınırlıdır. UI renk yanında kategori ve öncelik
   metni gösterir.
5. Yaşam döngüsü `DRAFT → PUBLISHED → ARCHIVED` olarak yalnız ileri ilerler.
   Yalnız `admin` taslak oluşturabilir, taslağı düzenleyebilir, yayımlayabilir
   ve yayımlanmış kaydı arşivleyebilir. Fiziksel silme ve yeniden yayımlama yoktur.
6. `accounting` ve `viewer` yalnız `PUBLISHED` kayıtları okuyabilir; admin
   aktif kapsamın taslak/yayımlanmış/arşivlenmiş kayıtlarını görür. Kapalı
   dönemde okuma sürer, tüm yönetim mutasyonları fail-closed reddedilir.
7. Başlık, kısa özet ve düz metin içerik doğrulanır; HTML, Markdown yürütme,
   dosya eki, dış medya gömme ve kullanıcı girdili bağlantı ilk sürümde yoktur.
   `YENİ` etiketi `publishedAt` üzerinden ilk 14 gün için türetilir.
8. Oluşturma, taslak güncelleme, yayımlama ve arşivleme request key ile
   idempotenttir. Audit yalnız işlem, entity kimliği, kategori, öncelik ve
   güvenli durum geçişini taşır; başlık, özet ve içerik metadata'ya yazılmaz.
9. UI `/bilgi-merkezi` altında kategori/durum filtreleri, arama, kart akışı ve
   `/bilgi-merkezi?announcement=<id>` detay deep-link'i sağlar. Admin
   kontrolleri yetkisiz kullanıcı DOM'una eklenmez; mobil, tema, boş/hata ve
   print standartları korunur.
10. Yayımlama otomatik `Notification`, e-posta, SMS veya push üretmez. İlk
    gerçek kabul yalnız ayrılmış test tenant/firma/döneminde yapılır; Faz
    8–18 kabul kayıtları ve sağlayıcı bekleyen Faz 13 sınırı değişmez.

## 4. Veri yaşam döngüsü ve erişim

| Durum | Admin görünürlüğü | Accounting/viewer görünürlüğü | İzinli işlem |
|---|---|---|---|
| `DRAFT` | Evet | Hayır | Düzenle, yayımla |
| `PUBLISHED` | Evet | Evet | Arşivle |
| `ARCHIVED` | Evet | Hayır | Salt okunur |

Taslak başlık, özet, içerik, kategori ve öncelik alanları yayımlanmadan önce
düzenlenebilir. Yayımlama anı sunucuda damgalanır. Yayımlanmış içerik değişmez;
düzeltme gereksinimi ayrı yeni taslak/yayın olarak ele alınır. Bu yaklaşım
görülen içeriğin sonradan sessizce değiştirilmesini engeller.

## 5. Uygulama dilimleri

| Dilim | Çıktı | Kabul sınırı |
|---|---|---|
| 1 — Domain çekirdeği | DTO, metin/kategori/öncelik/durum, izin ve idempotency kuralları | Saf testler; şema/UI/veri değişmez. |
| 2 — Şema ve repository | Additive model, migration ve scoped/status-aware repository | Backfill yok; yanlış scope sıfır. |
| 3 — Server Action ve audit | Oturum/rol/dönem guard'ları; create/update/publish/archive | İçerik audit'e sızmaz; fail-closed. |
| 4 — Bilgi Merkezi UI | Kart akışı, filtre, admin formu ve detay deep-link'i | Mobil/tema/print; rol DOM sınırı. |
| 5 — İzole gerçek veri ve kapanış | Ayrılmış admin/viewer kabulü, idempotency ve tam kapılar | Faz 8–18/F13 değişmez. |

## 6. Kabul kriterleri

- Yanlış tenant/firma/dönem bir duyuruyu okuyamaz veya değiştiremez.
- Accounting/viewer taslak ya da arşivlenmiş içeriği göremez.
- Viewer/admin rol sınırı UI görünürlüğüyle değil Server Action'da da uygulanır.
- Yayımlanmış içerik düzenlenemez; yaşam döngüsü geri alınamaz veya atlanamaz.
- Aynı request key ikinci duyuru, durum geçişi veya audit üretmez.
- Audit başlık, özet veya içerik taşımaz.
- Yayımlama mevcut `Notification` tablosuna veya finans/operasyon alanlarına
  yan etki üretmez.
- UI; kaynak ekranın kategori akışını NOA standardında, 390 px mobilde global
  taşma olmadan ve print-safe biçimde karşılar.
- Tam kalite kapıları `npm test`, `npm run type-check`, `npm run db:validate`,
  `npm run lint`, `npm run build` ve `git diff --check` ile geçer.

## 7. Kapsam dışı

Tenantlar arası platform duyurusu, ayrı platform operatörü konsolu, kişisel
hedef kitle/segment, okundu bilgisi ve okunma analitiği, yorum/beğeni, e-posta,
SMS, push, otomatik bildirim, zamanlayıcı worker, zengin metin/HTML, dosya eki,
Doküman Merkezi bağlantısı, dış RSS/haber servisi ve yapay zekâ içerik üretimi
bu RFC'nin dışındadır.

## 8. Uygulama onayı ve kapanış

Kullanıcı 30.07.2026 tarihinde Bölüm 3'teki on varsayımı ve Faz 19'un tüm
dilimlerinin tekrar onay alınmadan tamamlanmasını onayladı.

- **Dilim 1 — Domain Çekirdeği:** Duyuru DTO'ları, metin/kategori/öncelik
  sınırları, rol ve kapalı dönem kararları, yalnız ileri yaşam döngüsü,
  içeriksiz idempotency anahtarları ve 14 günlük `YENİ` kararı saf domain
  sözleşmesinde tamamlandı.
- **Dilim 2 — Şema ve Repository:** Additive `Announcement` modeli,
  `20260730230000_add_announcement_center` migration'ı ve scope/status
  duyarlı, optimistic revision kullanan repository tamamlandı. Backfill
  yapılmadı.
- **Dilim 3 — Server Action ve Audit:** Aktif oturum/scope her çağrıda yeniden
  doğrulandı; admin create/update/publish/archive akışı, kapalı dönem reddi,
  idempotency ve içerik taşımayan merkezi audit tamamlandı.
- **Dilim 4 — Bilgi Merkezi UI:** `/bilgi-merkezi` kart akışı, arama ve
  filtreler, admin formları, rol DOM sınırı, detay deep-link'i, mobil, tema ve
  print sözleşmeleri AppShell'e eklendi.
- **Dilim 5 — İzole Gerçek Veri ve Kapanış:** Ayrılmış F19 kapsamında admin
  dört, salt-okur iki yayımlanmış kayıt gördü; dokuz audit olayı, tekrar
  çalıştırma, yanlış scope/rol/kapalı dönem ve sıfır çapraz modül yan etkisi
  doğrulandı. Gerçek UI kabulü ve tam kalite kapıları geçti.

Ayrıntılı kabul kanıtı
`Docs/UI-baseline/Faz19-gercek-veri-kapanis-20260730.md` içindedir. Faz 19
tamamlanmıştır.
