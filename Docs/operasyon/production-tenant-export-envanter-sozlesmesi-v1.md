# Production Tenant Export ve Envanter Sözleşmesi v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: DİLİM 3A TAMAMLANDI / DİLİM 3B ADAPTER KODU HAZIR

## Amaç ve sınır

Bu sözleşme P-B08 hesap kapatma preflight'ı için tenant kapsamlı, salt-okunur ve
tekrarlanabilir envanter manifestinin yerel çekirdeğini tanımlar. Bu dilim yalnız
model sınıflandırması, manifest üretimi, fail-closed doğrulama ve ilerideki
adapter'ların portlarını içerir. Production DB/R2 erişimi, export dosyası, route,
workflow, hesap dondurma, legal hold mutasyonu, purge veya silme içermez.

## Ölçülen model kapsamı

`prisma/schema.prisma` içinde 116 model vardır. Bunların doğrudan `tenantId`
alanı taşıyan 90 tanesi aşağıdaki dokuz onaylı saklama kategorisine tam bir kez
atanmıştır:

| Kategori | Model sayısı |
| --- | ---: |
| Kimlik ve iletişim | 5 |
| Kimlik doğrulama ve erişim | 7 |
| Audit ve güvenlik | 4 |
| Finans ve muhasebe | 41 |
| Personel | 19 |
| Dokümanlar | 4 |
| Entegrasyonlar ve webhook'lar | 4 |
| Destek ve iletişim | 6 |
| Backup'lar | 0 |
| **Toplam** | **90** |

`Tenant` kök kaydı yaşam döngüsü snapshot'ında ayrıca okunur. Doğrudan
`tenantId` taşımayan 26 global, tenant-kökü, geri çevrilemez hash-scope veya
tenant ilişkili alt model açık allowlist ve gerekçe koduyla izlenir; bu modeller
katalog içine örtük biçimde alınmaz. Prisma şemasına model eklenmesi/çıkarılması,
doğrudan tenant modelinin tekrar sınıflandırılması veya sınıflandırılmadan
bırakılması testte fail-closed durur.

## Manifest sözleşmesi

`src/lib/production-tenant-inventory.ts` aşağıdaki güvenli alanlardan canonical
JSON üretir ve bu JSON'un SHA-256 checksum'ını ekler:

- şema sürümü, `2026-08-09.a` saklama politikası sürümü, güvenli tenant/release
  kimlikleri ve ISO üretim zamanı;
- tenant yaşam döngüsü durumu/sürümü ile aktif oturum ve legal hold sayıları;
- 90 modelin kayıt sayısı ve dokuz kategorinin onaylı `decisionId`, model ve
  kayıt toplamları;
- doküman metadata, storage key, `HeadObject` ile doğrulanmış nesne sayıları ve
  toplam byte değeri;
- değişmez `readOnly=true` işareti.

Manifest satır içeriği, doküman anahtarı, dosya adı, e-posta, kişi adı veya başka
kişisel veri taşımaz. Eksik, tekrar eden veya bilinmeyen model; güvenli olmayan
kimlik; geçersiz sayı; yaşam döngüsü hatası; `DocumentFile`/metadata ya da
metadata/storage/head uyuşmazlığı manifest üretimini durdurur.

## DB ve R2 okuma kuralı

Bu dilimde `ProductionTenantInventoryRepositoryPort` ve
`ProductionTenantObjectHeadPort` interface olarak tanımlanmıştır. Dilim 3B'de
hazırlanan gerçek salt-okunur adapter:

1. tüm DB sayımlarını exact `tenantId` kapsamıyla yapar;
2. doküman nesne anahtarlarını tenant kapsamlı `DocumentFile` metadata'sından
   türetir;
3. mevcut R2 anahtarları tenant prefix'i taşımadığı için bucket'ı tenant prefix'i
   ile listelemeye güvenmez;
4. yalnız türetilen kesin anahtarlar için `HeadObject` çalıştırır; nesne gövdesini
   okumaz ve anahtarları manifest/kanıta yazmaz.

## Bu dilimde yapılmayanlar ve sonraki kapı

- Production veya staging DB/R2 kaynağı okunmadı/değiştirilmedi.
- Export paketi, workflow, schedule, API route veya kullanıcı arayüzü eklenmedi.
- Tenant durumu, oturum, legal hold, backup veya provider kaynağı değiştirilmedi.
- Preflight, purge ve destructive delete yetkisi üretilmedi.

Dilim 3B uygulama ve canlı çalıştırma kapıları
`Docs/operasyon/production-tenant-envanter-canli-preflight-sozlesmesi-v1.md`
içindedir. Dedicated read-only DB credential ve ilk canlı koşu ayrı onay bekler.
