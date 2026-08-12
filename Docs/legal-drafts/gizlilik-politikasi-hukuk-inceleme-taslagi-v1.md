# Gizlilik Politikası — Hukuk İnceleme Taslağı v1

Belge kimliği: `gizlilik-politikasi`
Taslak sürümü: `2026-08-11.a-draft`
Hazırlanma tarihi: 11.08.2026
Durum: **Bağlayıcı olmayan hukuk inceleme taslağı — yayımlanamaz**

> Bu taslak NOA İnşaat Yönetimi'nin mevcut teknik davranışını açıklamak için
> hazırlanmıştır. KVKK aydınlatma metninin yerine geçmez. Hukuk danışmanı nihai
> rol, aktarım, saklama ve başvuru kararlarını onaylamadan yayımlanamaz.

## 1. Hakkımızda

NOA İnşaat Yönetimi, **MS İNŞAAT** markası/kaydı altında sunulması planlanan
tenant/firma/dönem kapsamlı B2B inşaat yönetim yazılımıdır.

- Tam hizmet sağlayıcı unvanı/türü: **[HUKUK ONAYI GEREKİR]**
- Tam adres: **[HUKUK ONAYI GEREKİR]**
- İletişim: **info@msinsaat.com**
- KVKK başvuru kanalı: **[AYRICA ONAYLANACAK]**

Müşteri tenantın kendi çalışanı, müşterisi, tedarikçisi veya saha personeli
hakkında girdiği veriler bakımından tarafların veri sorumlusu/veri işleyen
rolleri müşteri sözleşmesinde ayrıca belirlenmelidir.

## 2. Topladığımız bilgiler

Hizmetin kullanılan modüllerine göre şu bilgi grupları işlenebilir:

- hesap, ad, e-posta, parola hash'i, rol ve erişim kapsamları;
- tenant, firma, dönem, proje ve lokasyon kayıtları;
- müşteri/tedarikçi iletişim, vergi ve ticari işlem bilgileri;
- fatura, banka, çek, gider, hakediş, bordro ve diğer finans kayıtları;
- personel kodu/adı, izin, avans, transfer, çalışma/ücret ve saha atamaları;
- İSG eğitim, katılım, ekipman, denetim, bulgu ve iş kazası içerikleri;
- kullanıcı tarafından yüklenen dosyalar ve metadata;
- destek ticket'ları ve mesajları;
- audit, güvenlik, rate-limit, oturum, IP/user-agent ve olay kayıtları;
- backup ve recovery için gerekli şifreli/erişimi sınırlı kopyalar.

İSG veya yüklenen doküman içeriği sağlık bilgisi ya da başka özel nitelikli
kişisel veri barındırabilir. Müşteri bu tür verileri yalnız uygun yetki, hukuki
sebep ve ek güvenlik tedbirleriyle işlemelidir. Platform rolü ve talimat sınırı
**hukuk incelemesine tabidir**.

## 3. Public site ve formlar

Mevcut sürümde public iletişim formu mesaj teslim etmez ve kişisel veri
kaydetmez. Newsletter aboneliği ve self-servis hesap oluşturma kapalıdır.
Pazarlama e-postası/SMS'i, ödeme formu veya çalışan üçüncü taraf analitik aracı
bulunmamaktadır.

Bu kabiliyetlerden biri açılırsa politika ve faaliyet bazlı KVKK aydınlatması
veri toplanmadan önce güncellenmelidir.

## 4. Çerezler ve oturum

Public marketing sayfaları için analitik veya reklam çerezi tespit edilmemiştir.
Kimliği doğrulanmış uygulama kullanımında yalnız hizmetin çalışması ve güvenliği
için zorunlu oturum çerezleri kullanılır:

| Çerez | Amaç | Teknik süre/özellik |
|---|---|---|
| `noa-session-id` | Tenant kullanıcısı oturumunu ve erişim kapsamını doğrulama | En fazla 8 saat; HttpOnly, production'da Secure, SameSite=Lax |
| `noa-super-admin-session` | Süper Admin oturumunu doğrulama | En fazla 2 saat; HttpOnly, production'da Secure, SameSite=Strict; `/super-admin` kapsamı |

Zorunlu çerez engellenirse giriş gerektiren özellikler çalışmayabilir. Analitik,
reklam veya tercih çerezi ileride eklenirse çerez envanteri, hukuki sebep ve
gerekirse tercih/rıza arayüzü yayın öncesinde ayrıca hazırlanmalıdır.

## 5. Bilgileri neden kullanıyoruz

Bilgiler; hesabı ve yetki kapsamını işletmek, kullanıcı talimatıyla tenant iş
süreçlerini yürütmek, finans/personel/proje/doküman kayıtlarını saklamak,
güvenliği ve tenant izolasyonunu korumak, destek vermek, backup/recovery
yapabilmek, yasal yükümlülükleri yerine getirmek ve hakları korumak için
kullanılır.

Veriler otomatik karar yoluyla kişi hakkında hukuki veya benzeri önemli sonuç
üreten profil çıkarma amacıyla kullanılmaz. **HUKUK/ÜRÜN KONTROLÜ:** Yeni AI,
analitik veya otomatik karar kabiliyeti eklenirse bu ifade yeniden incelenir.

## 6. Hizmet sağlayıcılar ve aktarımlar

Mevcut production topolojisi şu teknik sağlayıcıları içerir:

- Vercel — uygulama runtime/hosting, `fra1`;
- Neon — PostgreSQL, AWS Frankfurt `eu-central-1`;
- Cloudflare R2 — private runtime ve backup bucket'ları, EU jurisdiction;
- Sentry — redacted monitoring/incident telemetrisi, DE region;
- GitHub Actions — yetkili CI, backup/recovery ve alarm workflow'ları.

Sağlayıcı bölgeleri verinin hiçbir koşulda başka ülkeye erişilebilir veya
aktarılabilir olmadığı garantisini vermez. Her sağlayıcının sözleşmesi, alt
işleyenleri, veri kategorileri ve 6698 sayılı Kanunun 9'uncu maddesindeki aktarım
mekanizması hukuk danışmanı tarafından onaylanmalıdır.

Open Banking, Arvento, GİB/e-Fatura, ödeme, SMTP/SMS ve diğer dış sağlayıcılar
gerçek production bağlantısı açılmadığı sürece aktif veri alıcısı değildir.

## 7. Saklama ve silme

Veriler tek bir genel süreyle tutulmaz. Mevcut `2026-08-09.a` karar kataloğu;
kimlik/iletişim, auth, audit/güvenlik, finans, personel/İSG, doküman,
entegrasyon, destek ve backup için ayrı süreler öngörür. Günlük backuplar 30 gün
tutulur; finans/ticari kayıtlar, personel/İSG kayıtları ve audit kanıtları ilgili
mevzuat ve onaylı kategori kararına göre daha uzun tutulabilir.

Hesap kapanışı önce erişimin dondurulmasını gerektirebilir; aktif legal hold,
kanuni saklama yükümlülüğü veya uyuşmazlık varsa fiziksel imha ertelenebilir.
Şartları oluşan veri silinir, yok edilir veya anonim hale getirilir. Kesin
sürelerin nihai hukuk metni öncesinde doğrulanması gerekir.

## 8. Güvenlik

Tenant/firma/dönem izolasyonu, rol tabanlı erişim, HttpOnly/Secure oturum,
parola hash'i, private storage, redacted monitoring, audit kayıtları, şifreli
secret yüzeyleri ve backup/recovery kontrolleri uygulanır. Bu tedbirler riskleri
azaltır; hiçbir internet hizmeti mutlak güvenlik garantisi veremez.

Güvenlik olayı yönetimi ve ilgili kişi/Kurum bildirimi, olayın kapsamı ve
uygulanabilir mevzuata göre yetkili ekip tarafından yürütülmelidir.

## 9. Haklar ve tercihler

İlgili kişiler KVKK kapsamındaki haklarını onaylı başvuru kanalı üzerinden
kullanabilir. Tenant tarafından kontrol edilen personel/müşteri verilerinde ilk
muhatap ve tarafların sorumluluğu müşteri sözleşmesindeki rol matrisine göre
belirlenmelidir.

- Yazılı adres: **[TAM ADRES]**
- KEP: **[VARSA]**
- Kayıtlı e-posta yöntemi: **[HUKUKÇA ONAYLANACAK]**
- Genel iletişim: **info@msinsaat.com**

## 10. Değişiklikler ve yürürlük

- Nihai sürüm: **[YYYY-MM-DD.x]**
- Hukuk sahibi/onaylayan: **[AD, ROL]**
- Onay tarihi: **[YYYY-MM-DD]**
- Yürürlük tarihi: **[YYYY-MM-DD]**
- Önemli değişiklik bildirim yöntemi: **[HUKUK/ÜRÜN KARARI]**

Bu alanlar tamamlanmadan taslak production sayfasına alınamaz.
