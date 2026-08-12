# KVKK Aydınlatma Metni — Hukuk İnceleme Taslağı v1

Belge kimliği: `kvkk-aydinlatma`
Taslak sürümü: `2026-08-11.a-draft`
Hazırlanma tarihi: 11.08.2026
Durum: **Bağlayıcı olmayan hukuk inceleme taslağı — yayımlanamaz**

> Bu metin hukuki görüş veya onaylı aydınlatma metni değildir. Köşeli parantezli
> alanlar ile `HUKUK KARARI` işaretleri yetkili hukuk danışmanı tarafından
> tamamlanmadan, veri işleme envanteri ve provider sözleşmeleriyle
> karşılaştırılmadan production sayfasına alınamaz.

## 1. Veri sorumlusu

6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu:

- Kayıtlı ad: **MS İNŞAAT**
- Tam hukuki unvan ve işletme/şirket türü: **[HUKUK ONAYI GEREKİR]**
- MERSİS/VKN: **[HUKUK ONAYI GEREKİR]**
- Adres: **[Atakum-Samsun kaydı tam açık tebligat adresiyle tamamlanmalı]**
- Varsa temsilci: **[HUKUK KARARI]**
- Veri sorumlusu kaydında belirtilen kişi: **Murat Saygı**
- Genel iletişim e-postası: **info@msinsaat.com**
- KEP ve/veya KVKK başvuru kanalı: **[HUKUK ONAYI GEREKİR]**

`info@msinsaat.com` adresinin her başvuru yöntemi bakımından geçerli olduğu bu
taslakla kabul edilmez. İlgili kişi başvuru kanalları 8'inci bölümde ayrıca
onaylanmalıdır.

## 2. Kapsam ve rol ayrımı

NOA İnşaat Yönetimi, inşaat işletmelerinin tenant/firma/dönem kapsamlı işlerini
yönetmesine yönelik B2B SaaS uygulamasıdır. Platform işletmecisinin aşağıdaki
faaliyetlerde veri sorumlusu mu yoksa müşteri tenant adına veri işleyen mi olduğu
tek bir genel cümleyle belirlenemez.

**HUKUK KARARI:** Aşağıdaki rol matrisi müşteri sözleşmesi, fiilî veri akışı ve
VERBİS envanteriyle eşleştirilmelidir:

| Faaliyet | Taslak rol değerlendirmesi |
|---|---|
| Platform hesabı, erişim güvenliği, faturalama ve platform audit'i | Platform işletmecisi veri sorumlusu adayı |
| Tenantın girdiği çalışan, müşteri, tedarikçi, proje ve finans verileri | Tenant veri sorumlusu / platform veri işleyen modeli adayı |
| Süper Admin güvenlik ve incident kayıtları | Platform işletmecisi veri sorumlusu adayı |
| Yasal yükümlülük, uyuşmazlık ve platform savunma kayıtları | Platform işletmecisi veri sorumlusu adayı |

## 3. İlgili kişi ve veri kategorileri

Ürünün mevcut şeması ve aktif kabiliyetlerine göre aşağıdaki kategoriler
işlenebilir. Nihai metin, yalnız gerçek müşteri kullanımında bulunan faaliyetleri
içermeli; kullanılmayan kategori yayımlanmamalıdır.

| İlgili kişi/faaliyet | İşlenebilecek veri kategorileri |
|---|---|
| Tenant yöneticisi ve kullanıcıları | Ad, e-posta, rol/yetki, tenant/firma/dönem kapsamı, parola hash'i, oturum ve erişim kayıtları |
| Süper Admin | Ad, e-posta, parola hash'i, oturum, son etkinlik, IP adresi ve user-agent |
| Firma/müşteri/tedarikçi muhatapları | Unvan/ad, vergi ve iletişim/adres bilgileri, ticari işlem ve belge bilgileri |
| Personel ve saha çalışanları | Personel kodu/adı, saha/atama, izin, avans, transfer, çalışma süresi, ücret ve kesinti kayıtları |
| İSG süreçlerindeki kişiler | Eğitim/katılım, ekipman, denetim, bulgu ve iş kazası kayıtları; içerik sağlık verisi barındırabiliyorsa özel nitelikli veri |
| Proje ve finans muhatapları | Sözleşme, hakediş, fatura, çek, banka hareketi, gider, bordro ve muhasebe bağlantıları |
| Destek muhatapları | Kullanıcı kimliği, ticket konusu, mesaj içeriği ve işlem zamanları |
| Dokümanlarda yer alan kişiler | Tenant tarafından yüklenen dosyanın içeriği, metadata'sı ve sınıflandırması |
| Site ziyaretçisi | Teknik istek/güvenlik logları; giriş yapılırsa zorunlu oturum çerezi |

Public iletişim formu ve newsletter aboneliği mevcut sürümde teslimat yapmaz ve
kişisel veri kaydetmez. Self-servis kayıt, gerçek parola sıfırlama teslimatı,
ödeme sağlayıcısı, SMS/e-posta pazarlama ve canlı dış sağlayıcı entegrasyonları
çalışır kabiliyet gibi gösterilemez.

## 4. İşleme amaçları ve hukuki sebepler

Aşağıdaki sebepler yalnız hukuk danışmanının faaliyet bazlı incelemesine sunulan
adaylardır; nihai hukuki sebep beyanı değildir.

| Faaliyet/amaç | Hukuki sebep adayı — hukukça kesinleştirilecek |
|---|---|
| Hesap ve yetki yönetimi; SaaS hizmetinin sunulması | Sözleşmenin kurulması/ifasıyla doğrudan ilgili olma |
| Güvenli giriş, rate limit, audit, kötüye kullanım önleme | Meşru menfaat ve/veya hukuki yükümlülük; denge testi gerekli |
| Ticari/finansal belge ve mevzuat kayıtları | Kanunlarda açıkça öngörülme ve hukuki yükümlülük |
| Destek ve hizmet iletişimi | Sözleşmenin ifası ve/veya meşru menfaat |
| Hukuki talep, uyuşmazlık ve legal hold | Bir hakkın tesisi, kullanılması veya korunması |
| İş sağlığı/güvenliği ve sağlıkla ilişkili kayıtlar | Kanunun 6'ncı maddesi kapsamında özel nitelikli veri şartı ve ek tedbirler ayrıca belirlenmeli |
| İsteğe bağlı pazarlama/analitik | Mevcut sürümde kapalı; açılırsa aydınlatmadan ayrı açık rıza/ileti izni analizi gerekli |

Amaçlar; SaaS hizmetini işletme, tenant/firma/dönem kapsamını koruma, proje ve
işletme kayıtlarını kullanıcı talimatıyla işleme, bilgi güvenliğini sağlama,
destek taleplerini sonuçlandırma, yasal yükümlülükleri yerine getirme ve hakları
koruma ile sınırlandırılmalıdır. “Her türlü amaç” gibi muğlak ifadeler
kullanılamaz.

## 5. Toplama yöntemleri

Veriler;

- yetkili kullanıcıların web arayüzüne girdiği bilgiler ve yüklediği dosyalar;
- tenant yöneticisinin oluşturduğu kullanıcı/rol/kapsam kayıtları;
- kimlik doğrulama, oturum, güvenlik ve audit sırasında otomatik üretilen
  teknik kayıtlar;
- kullanıcı tarafından başlatılan import, webhook veya entegrasyon işlemleri;
- sözleşme, destek ve hukuki süreçlerde iletilen kayıtlar

aracılığıyla tamamen veya kısmen otomatik yollarla; gerekli hâllerde bir veri
kayıt sisteminin parçası olan otomatik olmayan yollarla elde edilebilir.

**HUKUK KARARI:** Üçüncü kişiden elde edilen personel/muhatap verilerinde
aydınlatmanın zamanı ve sorumlusu tenant–platform rolüne göre belirlenmelidir.

## 6. Alıcı grupları ve aktarım amaçları

| Alıcı grubu | Taslak amaç ve durum |
|---|---|
| Yetkili tenant kullanıcıları | Tenant kapsamındaki iş süreçlerinin yürütülmesi; RBAC ile sınırlandırılır |
| Hosting ve serverless hizmeti — Vercel | Uygulamanın `fra1` bölgesinde çalıştırılması; veri işleyen rolü/sözleşmesi doğrulanmalı |
| Veritabanı — Neon | AWS Frankfurt `eu-central-1` PostgreSQL saklama/işleme; rol ve alt işleyenler doğrulanmalı |
| Obje/backup storage — Cloudflare R2 | EU jurisdiction private doküman ve backup saklama; rol ve alt işleyenler doğrulanmalı |
| Monitoring — Sentry | DE region redacted error/incident telemetrisi; işlenen alanlar ve alt işleyenler doğrulanmalı |
| GitHub Actions | Yetkili backup/recovery ve alarm workflow'ları; log/artifact veri kapsamı doğrulanmalı |
| Yetkili kamu kurumları ve yargı mercileri | Yasal yükümlülük veya hakların tesisi/kullanılması/korunmasıyla sınırlı |
| Hukuk, mali müşavirlik ve denetim danışmanları | Sözleşme/gizlilik yükümlülüğü ve gerekli veri minimizasyonuyla sınırlı |

İnternet bankacılığı, Arvento, GİB/e-Fatura, ödeme, SMTP/SMS ve benzeri dış
sağlayıcılar gerçek production entegrasyonu açılmadan aktif alıcı gibi
gösterilmemelidir.

## 7. Yurt dışına aktarım

Vercel, Neon, Cloudflare, Sentry ve GitHub gibi yabancı merkezli sağlayıcıların
Avrupa bölgesi seçimi tek başına 6698 sayılı Kanunun 9'uncu maddesine uygun
aktarım güvencesi değildir.

**HUKUK ONAYI GEREKİR:** Her sağlayıcı için aktarım taraflarının rolü, ülke,
veri kategorisi, alt işleyenler ve aşağıdaki exact mekanizmalardan hangisinin
uygulandığı kaydedilmelidir:

- yeterlilik kararı;
- standart sözleşme ve süresinde Kurum bildirimi;
- bağlayıcı şirket kuralları;
- Kurul onaylı taahhütname;
- yalnız arızi hâllerde Kanundaki uygun istisna.

Geçerli mekanizma kanıtlanmadan “veriler yalnız Türkiye'de/AB'de tutulur” veya
“yurt dışına aktarılmaz” beyanı yayımlanamaz.

## 8. Saklama ve imha

Mevcut operasyon kararı `2026-08-09.a` sürümüdür. Özet olarak kimlik/iletişim,
auth, audit/güvenlik, finans, personel/İSG, doküman, entegrasyon, destek ve backup
kategorileri ayrı süre ve imha kurallarına bağlıdır. Finans/ticari kayıtlar için
10 yıl, bazı personel/İSG kayıtları için 10 veya en az 15 yıl, audit için 3 yıl,
destek için 2 yıl ve günlük backuplar için 30 gün kayıtlıdır.

Aktif legal hold imhayı durdurabilir. İşleme şartları ortadan kalktığında veri,
uygulanabilir mevzuat ve kategori kararına göre silinir, yok edilir veya anonim
hale getirilir. **HUKUK KARARI:** Bu sürelerin her biri gerçek veri envanteri ve
mevzuatla nihai metin öncesinde yeniden doğrulanmalıdır.

## 9. İlgili kişinin hakları ve başvuru

İlgili kişiler Kanunun 11'inci maddesi kapsamında kişisel verilerinin işlenip
işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanımı öğrenme,
aktarılan üçüncü kişileri bilme, düzeltme, şartları varsa silme/yok etme,
bildirim, münhasıran otomatik analiz sonucuna itiraz ve kanuna aykırı işlem
nedeniyle zararın giderilmesini talep etme haklarına sahiptir.

Başvuru yöntemleri:

- Yazılı başvuru adresi: **[TAM ADRES VE MUHATAP HUKUKÇA ONAYLANACAK]**
- KEP adresi: **[VARSA EKLENECEK]**
- Kayıtlı e-posta yöntemi: **[info@msinsaat.com için kapsam ve doğrulama prosedürü onaylanacak]**
- Güvenli elektronik/mobil imza kanalı: **[HUKUK/OPERASYON KARARI]**

Başvuruda gerekli kimlik ve iletişim bilgileri ile talep konusu bulunmalıdır.
Başvurular talebin niteliğine göre en kısa sürede ve en geç 30 gün içinde
sonuçlandırılır; güvenli yanıt ve varsa ücret koşulları mevzuata göre uygulanır.

## 10. Sürüm ve onay

- Nihai sürüm: **[YYYY-MM-DD.x]**
- Hukuk sahibi/onaylayan: **[AD, ROL]**
- Onay tarihi: **[YYYY-MM-DD]**
- Yürürlük tarihi: **[YYYY-MM-DD]**
- Önceki sürüm ve değişiklik özeti: **[VARSA]**

Bu alanlar tamamlanmadan taslak “Yayına hazır değil” durumundan çıkarılamaz.
