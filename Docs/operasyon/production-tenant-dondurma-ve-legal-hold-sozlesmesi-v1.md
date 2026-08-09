# Production Tenant Dondurma ve Legal Hold Sözleşmesi v1

Tarih: 09.08.2026

Karar sahibi: Murat Saygı

Durum: Uygulama sözleşmesi hazır; production additive migration doğrulandı,
canlı mutation yüzeyi kapalı

## Amaç

Bu sözleşme tenant erişimini geri alınabilir biçimde dondurmak ve veri imhasını
engelleyen legal hold kayıtlarını erişim yaşam döngüsünden bağımsız yönetmek için
additive veri modelini tanımlar. Fiziksel silme, purge, export, zamanlayıcı veya
provider işlemi bu kapsamda değildir.

## Yaşam döngüsü

- `ACTIVE`: İnsan ve makine erişimlerine izin verilen tek durumdur.
- `FROZEN`: Yeni giriş, mevcut oturum, kapsam değiştirme, API anahtarı ve webhook
  erişimleri fail-closed engellenir.
- `CLOSURE_PENDING`: Hesap kapatma hazırlığıdır ve erişim bakımından `FROZEN`
  gibi davranır.
- Her geçiş `lifecycleVersion` ile optimistic concurrency kullanır.
- Geçiş, aktif tenant auth session kayıtlarının iptali ve
  `TenantLifecycleEvent` kaydı aynı transaction içinde yapılır.
- `operationId` tekrarları yeni mutasyon üretmez; mevcut olay tekrar sonucu
  olarak döner.

İzinli geçişler:

| Başlangıç | Hedef | Olay |
| --- | --- | --- |
| `ACTIVE` | `FROZEN` | `FREEZE` |
| `FROZEN` | `ACTIVE` | `UNFREEZE` |
| `ACTIVE` veya `FROZEN` | `CLOSURE_PENDING` | `BEGIN_CLOSURE` |
| `CLOSURE_PENDING` | `ACTIVE` veya `FROZEN` | `CANCEL_CLOSURE` |

## Legal hold

- Legal hold, tenant yaşam döngüsünden bağımsızdır; erişim dondurmayı engellemez.
- Aktif legal hold hesap kapatma preflight'ında imha ve purge için blocker'dır.
- Kayıtlar `ACTIVE` veya `RELEASED` durumundadır ve fiziksel olarak silinmez.
- Serbest metin yerine güvenli `reasonCode` ve harici `referenceId` kullanılır.
- İnceleme tarihi onaylı 90 günlük periyodik imha aralığından türetilir.
- Yerleştirme ve kaldırma işlemleri ayrı `TenantLegalHoldEvent` kayıtlarıyla aynı
  transaction içinde izlenir; kaldırma optimistic `version` kontrolü gerektirir.

## Yetki ve görünürlük

Repository sözleşmesi yalnız doğrulanmış Super Admin credential kimliği kabul
eder. Şu an dışa açık bir mutation route veya form eklenmemiştir; ileride
eklenecek her Server Action kendi içinde `requireSuperAdminSession` ile yeniden
kimlik ve yetki doğrulaması yapmak zorundadır. Super Admin tenant listesi yalnız
yaşam döngüsü durumu, sürümü ve aktif legal hold sayısını gösterir.

## Fail-closed erişim yüzeyleri

- Credential login için erişilebilir scope sorguları yalnız `ACTIVE` tenantları
  döndürür.
- Mevcut auth session çözümlemesi tenant durumunu her istekte yeniden denetler.
- Scope switch hedefi yalnız `ACTIVE` tenant olabilir.
- Bearer API anahtarı bulma ve rate-limit tüketimi yalnız `ACTIVE` tenant için
  başarılı olur.
- Webhook endpoint listeleme, sayma ve lifecycle sorguları yalnız `ACTIVE`
  tenant için sonuç döndürür; böylece teslim planı hedef üretmez.
- Bilinmeyen durum değerleri erişime açılmaz.

## Migration ve geri dönüş

Migration additive'dir. Mevcut tenantlar varsayılan `ACTIVE` ve sürüm `1` ile
uyumlu kalır. Uygulama kodu geri alınırsa ek kolon ve tablolar eski kodu
engellemez; şema geri alma sırasında veri kaybı yaratacak `DROP` uygulanmaz.
Staging migration provası ve production migration birbirinden ayrı açık onay
kapılarıdır. Ayrı onaylı production backup/migration yürütmesinde
`20260809180000_add_tenant_lifecycle_and_legal_holds` migration'ı aynı-release
backup doğrulamasından sonra uygulandı; production envanteri 68/68 migration ve
117 tabloya ulaştı. Migration öncesi backup izole geçici DB'ye 67 migration/114
tablo olarak geri yüklendi ve geçici kaynak temizlendi. Bu kanıt staging
migration'ı veya herhangi bir tenant yaşam döngüsü/legal hold mutasyonunu kapsamaz.

## Bu dilimde yapılmayanlar

- Staging migration çalıştırılmadı; production'da yukarıdaki tek additive
  migration dışında şema işlemi yapılmadı.
- Tenant durumu ya da legal hold kaydı oluşturulmadı/değiştirilmedi.
- Oturum, API anahtarı veya webhook canlı ortamda iptal edilmedi.
- Purge, tenant silme, export, R2, backup, DNS/TLS veya provider işlemi yapılmadı.
