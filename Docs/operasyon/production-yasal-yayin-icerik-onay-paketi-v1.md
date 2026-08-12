# Production Yasal Yayın İçerik Onay Paketi v1

Tarih: 11.08.2026
Paket sürümü: `legal-publication-input-2026-08-11.a`
Durum: Sahip içerik kabulü tamam; teknik yayın uygulaması/indexing kapalı

## Amaç ve sınır

Bu paket `/kvkk`, `/gizlilik` ve `/kullanim-kosullari` sayfalarının gerçek,
sürümlü ve hukukça onaylı içerikle taslaktan çıkarılması için gerekli girdileri
tek yerde toplar. Hukuki hüküm üretmez ve mevcut teknik/operasyon kararlarını
kendiliğinden yasal uygunluk beyanına dönüştürmez.

Onaylı nihai metinler sağlanana kadar mevcut `LegalDraftNotice`, sayfa bazlı
`noindex` metadata'sı, global `X-Robots-Tag`, robots `Disallow: /` ve boş sitemap
korunur. Bu paket indexing veya kullanıcı trafiği açma yetkisi vermez.

## Doğrulanmış teknik ve kurumsal girdiler

| Girdi | Mevcut kayıt | Yayın kararı |
|---|---|---|
| Production origin | `https://insaatyonet.com`; apex ve `www` DNS/TLS/HTTP kabulü tamam | TEKNİK KABUL TAMAM |
| Kayıtlı yayın kimliği | `MS İNŞAAT`; Atakum-Samsun | KISMİ — tam hukuki unvan/tür ve açık tebligat adresi gerekli |
| İletişim | `info@msinsaat.com` | KISMİ — KVKK başvuru yöntemi olarak kullanılabilirliği hukukça doğrulanmalı |
| Veri sorumlusu kaydı | Murat Saygı | KISMİ — gerçek/tüzel kişi veri sorumlusu ve varsa temsilci ayrımı kesinleştirilmeli |
| Önceki onay tarihi kaydı | 05.08.2026 | YALNIZ KİMLİK GİRDİSİ — nihai üç metnin içerik onayı değildir |
| Runtime ve veri bölgeleri | Vercel `fra1`; Neon AWS Frankfurt; R2 EU; Sentry DE | TEKNİK KAYIT — alıcı rolü ve yurt dışı aktarım güvencesi hukukça eşlenmeli |
| Saklama kararları | `2026-08-09.a`; dokuz kategori | TEKNİK/OPERASYON KARARI — metin karşılığı hukukça onaylanmalı |
| İlgili kişi yanıt hedefi | En geç 30 gün; hesap kapatma sözleşmesinde kayıtlı | OPERASYON KARARI — resmi başvuru kanalı ve yanıt prosedürü eksik |

## KVKK aydınlatma metni zorunlu onay matrisi

Kişisel Verileri Koruma Kurumunun Aydınlatma Tebliği uyarınca nihai metin,
faaliyet bazında aşağıdaki alanları açık, belirli ve yanıltıcı olmayan ifadelerle
eşlemelidir. Gizlilik politikası tek başına aydınlatma metni yerine geçmez.

| Kimlik | Hukuk sahibinden beklenen exact girdi |
|---|---|
| `LEG-01` | Veri sorumlusunun tam hukuki kimliği, türü, varsa temsilcisi, MERSİS/VKN ve tam açık adres |
| `LEG-02` | İlgili kişi grupları: tenant yöneticisi/kullanıcısı, çalışan/personel, tedarikçi, müşteri, ziyaretçi ve destek muhatabı için kapsam kararı |
| `LEG-03` | Her faaliyet için işlenen veri kategorileri; özel nitelikli personel/sağlık verisinin ayrı gösterimi |
| `LEG-04` | Her faaliyet için belirli işleme amacı; olası veya muğlak amaç listesi kullanılmaması |
| `LEG-05` | Her amaç için 6698 sayılı Kanunun 5 veya 6'ncı maddesindeki exact işleme şartı/hukuki sebep |
| `LEG-06` | Verinin ilgili kişiden veya üçüncü kişiden hangi otomatik/otomatik olmayan yöntemle elde edildiği |
| `LEG-07` | Her alıcı grubu ve aktarım amacı; Vercel, Neon, Cloudflare R2, Sentry ve gerekli diğer sağlayıcıların veri sorumlusu/veri işleyen rolü |
| `LEG-08` | Yurt dışı aktarım ülkeleri, veri kategorileri ve Kanunun 9'uncu maddesindeki exact güvence/istisna; standart sözleşme kullanılıyorsa imza ve Kuruma bildirim kanıtı |
| `LEG-09` | Kanunun 11'inci maddesindeki haklar ve veri sorumlusuna başvuru yöntemi |
| `LEG-10` | Metin kimliği, sürüm, onaylayan hukuk sahibi, onay tarihi, yürürlük tarihi ve değişiklik kaydı |

Resmî dayanaklar:

- Aydınlatma Tebliği:
  https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig
- Aydınlatma yükümlülüğü:
  https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-
- Yurt dışına aktarım rejimi:
  https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim

## İlgili kişi başvuru kanalı kararı

`info@msinsaat.com` adresinin yalnız yayınlanması, her başvuru bakımından geçerli
teslim kanalı olduğu sonucunu üretmez. Hukuk sahibi aşağıdaki yöntemlerden
hangilerinin destekleneceğini ve kimlik doğrulama/yanıt prosedürünü onaylamalıdır:

- tam posta/tebligat adresine yazılı ve imzalı başvuru;
- varsa KEP adresi;
- güvenli elektronik imza veya mobil imza;
- ilgili kişinin sistemde daha önce kayıtlı e-posta adresi;
- ileride açılırsa amaca yönelik doğrulanmış başvuru uygulaması.

Başvuru formunda zorunlu alanlar, vekâlet kontrolü, güvenli cevap kanalı,
ücret/masraf koşulu ve en geç 30 günlük yanıt işletimi ayrıca kabul edilmelidir.

Resmî dayanaklar:

- Başvuru hakkı: https://www.kvkk.gov.tr/Icerik/2062/Basvuru-Hakki
- Başvuru usulü kamuoyu duyurusu:
  https://www.kvkk.gov.tr/Icerik/6938/Kurumumuza-Yapilan-Sikayetlerin-Usul-Sartlarina-Iliskin-Kamuoyu-Duyurusu

## Gizlilik politikası onay matrisi

Gizlilik politikası, KVKK aydınlatma metnini kopyalamak yerine ürünün gerçek
teknik davranışını anlaşılır biçimde açıklamalıdır:

1. uygulama, auth/session, audit/güvenlik, finans, personel/İSG, doküman,
   entegrasyon, destek ve backup veri kategorileri;
2. zorunlu cookie/session kullanımı ve varsa analitik/pazarlama araçlarının
   kapalı/açık durumu;
3. tenant ile platform arasındaki veri sorumlusu/veri işleyen rol ayrımı;
4. sağlayıcı/alıcı grupları, bölgeler ve yurt dışı aktarım mekanizmaları;
5. `2026-08-09.a` saklama/imha kararları ve legal hold sınırı;
6. güvenlik tedbirlerinin garanti veya mutlak güvenlik iddiasına dönüşmemesi;
7. ilgili kişi başvuru kanalı, sürüm ve yürürlük bilgisi.

## Kullanım koşulları ticari karar matrisi

Koddan veya infrastructure'dan türetilemeyecek aşağıdaki kararlar ürün sahibi ve
hukuk sahibi tarafından exact metinle onaylanmalıdır:

- sözleşmenin tarafı olan tam hukuki kişi ve temsil yetkisi;
- hizmet kapsamı, hesap/tenant yetkisi ve kullanıcı sorumlulukları;
- plan, ücret, vergi, faturalama, yenileme, cayma/iptal ve iade koşulları;
- destek saatleri, SLA olup olmadığı, bakım ve hizmet değişikliği sınırı;
- müşteri verisinin mülkiyeti, platforma verilen sınırlı işleme lisansı ve export;
- yasak kullanım, hesap askıya alma/kapatma ve legal hold etkisi;
- fikrî mülkiyet, üçüncü taraf hizmetleri, garanti/taahhüt sınırı ve sorumluluk;
- yürürlükteki hukuk, yetkili mahkeme/uyuşmazlık yöntemi;
- sürüm değişikliği, bildirim ve yürürlük mekanizması.

Ödeme sağlayıcısı, e-Fatura teslimatı, açık self-servis kayıt, gerçek iletişim
formu, newsletter, SMS/e-posta teslimatı veya dış entegrasyon canlı değilken
metin bunları çalışır hizmet gibi gösteremez.

## Nihai içerik teslim formatı

Her belge ayrı Markdown veya düz metin artifact'ı olarak aşağıdaki başlıkla
teslim edilmelidir:

```text
Belge kimliği: kvkk-aydinlatma | gizlilik-politikasi | kullanim-kosullari
Sürüm: YYYY-MM-DD.x
Onaylayan hukuk sahibi: ...
Onay tarihi: YYYY-MM-DD
Yürürlük tarihi: YYYY-MM-DD
Resmi başvuru/iletişim kanalı: ...
Nihai gövde: ...
```

Hukuk incelemesine sunulacak bağlayıcı olmayan ilk taslaklar:

- `Docs/legal-drafts/kvkk-aydinlatma-metni-hukuk-inceleme-taslagi-v1.md`
- `Docs/legal-drafts/gizlilik-politikasi-hukuk-inceleme-taslagi-v1.md`
- `Docs/legal-drafts/kullanim-kosullari-hukuk-inceleme-taslagi-v1.md`

Danışman inceleme/yanıt handoff'u:

- `Docs/legal-drafts/hukuk-danismani-inceleme-handoff-v1.md`

Handoff, `sistemb24@gmail.com` adresine Gmail mesaj/thread
`19ff13ba7beee88e` ile gönderildi. Ek bundle SHA-256 değeri
`38C1B1A4C92CB01970BEE51ABBE260818C433E1BA310A13F1F7989D4E2E24CFF`tir.
Danışmanın `19ff141dbe01ce81` mesajındaki yalnız “onaylıyorum” yanıtı; üç belge
için ayrı karar, nihai tam metin, sürüm, onaylayan rolü, onay/yürürlük tarihleri
ve işaretli kararları içermediğinden teknik yayın kabulü değildir. Exact yanıt
formatı netleştirme mesajı `19ff1426c87924f2` ile aynı thread'de yeniden
istenmiştir.

12.08.2026 tarihinde kullanıcı cevapları tamamlanmış kabul etme veya asistanın
muhafazakâr biçimde düzenlemesi yetkisini verdi. Bağımsız hukuk danışmanı onayı
iddia edilmeden Murat Saygı'nın platform sahibi ve veri/hukuk karar sahibi
sıfatıyla exact kararları
`Docs/operasyon/production-yasal-yayin-sahip-kabul-karari-20260812.md` içinde
kaydedildi. `2026-08-12.a` sürümlü üç production yayın adayı
`Docs/legal-approved/` altında hazırdır.

Bu dosyalardaki köşeli parantezli alanlar ve `HUKUK KARARI` işaretleri
tamamlanmadan nihai içerik teslimi oluşmaz.

## Teknik uygulama kapısı

Üç sahip-kabul gövdesi ve exact kararlar tamamlandı. Ayrı kod/PR diliminde:

1. sürümlü, statik ve tipli legal document sözleşmesi oluşturulur;
2. üç route sabit taslak bileşeninden onaylı kendi belgesine geçirilir;
3. sürüm, yürürlük tarihi ve resmi başvuru kanalı görünür hale getirilir;
4. yasal route'ların sayfa bazlı `noindex` davranışı korunur;
5. taslak metnin sızmadığı ve onaysız ortamda fail-closed kaldığı test edilir;
6. hedefli testler ve tam repository kalite kapıları çalıştırılır;
7. staging/production yayın ve indexing ayrı açık onaylarda tutulur.

## Kapanış kararı

Kullanıcının açık onayıyla yalnız hukuk danışmanı incelemesine yönelik üç
bağlayıcı olmayan taslak hazırlandı. Provider sözleşmesi veya aktarım güvencesi
varsayılmadı, production environment değiştirilmedi ve hiçbir uygulama sayfası
taslaktan çıkarılmadı. Sıradaki dış kapı hukuk sahibinin işaretli kararları
tamamlayıp üç nihai belge gövdesini bu paket üzerinden onaylamasıdır.
