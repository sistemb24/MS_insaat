# NOA Insaat Yonetim SaaS

Modern, cok kiracili ve SaaS tabanli insaat on muhasebe / operasyon yonetimi uygulamasi.

Bu repo, eski NOA masaustu/pencere gorunumunu birebir kopyalamayi degil, ekran goruntuleri ve video kaynaklarindan cikarilan is akisini modern web uygulamasi olarak yeniden kurmayi hedefler. Ana ilke:

> Yeni SaaS urunde birebir korunmasi gereken sey eski pencere gorunumu degil, is akisidir.

## Mevcut Durum

Tamamlanan ilk gelistirme dilimi:

- Next.js App Router, TypeScript, Tailwind ve pnpm tabanli proje iskeleti kuruldu.
- `Docs`, `NOA-insaat-SS gorseller` ve `stitch_HTML_sablonlar` kaynak klasorleri korunarak uygulama dosyalari yanlarina eklendi.
- Yogun ERP/SaaS kullanimina uygun merkezi tema tokenlari ve uygulama kabugu olusturuldu.
- Ust bar, sol navigasyon, firma/donem/kullanici baglami ve modul shell standardi eklendi.
- P0 modul rotalari acildi: dashboard, santiyeler, tedarikciler, taseronlar, personel, kasa/banka, stok/depo, faturalar, hakedis, cek, puantaj, raporlar, ayarlar.
- Tanımlar standardi icin ilk is listesi yuzeyi baslatildi: santiyeler, tedarikciler, taseronlar, personel, kasa/banka.
- Tanımlar ekranlarinda ilk CRUD davranis standardi eklendi: arama, secim, yeni kayit, duzenleme, pasiflestirme, yenileme ve temel validasyon.
- Tenant/firma/donem kapsami icin ilk SaaS veri siniri eklendi; Tanımlar satirlari scope ve audit metadata'si ile hazirlaniyor.
- Tanımlar icin server-side CRUD sozlesmesi ve demo bellek ici repository adapter'i eklendi.
- Yerel PostgreSQL `insaatMuhasebe` DB, Prisma schema, migration ve Prisma repository adapter'i eklendi.
- Tanımlar UI CRUD akisi server action + Prisma repository hattina baglandi.
- Tanımlar UI server action loading/error durumlari form validasyonundan ayrildi.
- Ilk P0 islem modulu olarak Faturalar baslatildi: alis faturasi domain hesaplari, Prisma baslik/satir tablolari, server action ve `/faturalar` liste yuzeyi eklendi.
- `pnpm db:seed` artik Tanımlar ornekleriyle birlikte idempotent `FAT-0006` alis faturasi demo kaydini da ekler.
- Faturalar icin ilk alis faturasi form editoru eklendi: tedarikci/santiye lookup, cok satirli grid, iskonto/depo/aciklama alanlari, anlik toplam ve PostgreSQL'e kaydetme akisi.
- Faturalar hareket listesinden mevcut alis faturasini secip ayni formda duzenleme ve PostgreSQL'e guncelleme akisi eklendi.
- Faturalar hareket listesinden mevcut alis faturasini fiziksel silmeden `Iptal` durumuna alma akisi eklendi; iptal kayitlar listede kalir ama metrik toplamlarina dahil edilmez.
- Faturalar hareket listesinden `Taslak` alis faturasini `Kaydedildi` durumuna kesinlestirme akisi eklendi; kaydedilen kayit duzenlemeye ve tekrar kesinlestirmeye kapatilir.
- Fatura mutasyonlari ilk rol/yetki kontrolune baglandi: `admin` ve `accounting` islem yapabilir, `viewer` salt-okur kalir.
- Tenant/firma/donem/kullanici/rol bilgisi sayfa, shell ve server action katmaninda opak `noa-session-id` cookie'si ve PostgreSQL `AppSession` kaydindan uretilen aktif session scope sinirina alindi.
- `pnpm db:seed` artik `demo-accounting` ve `demo-viewer` session kayitlarini da idempotent olusturur.
- Ust bar aktif session secicisi eklendi; `AppSession` kayitlari arasinda server action ile gecis yapilip ayni sayfa yeni scope ile yeniden acilir.
- `/giris` sayfasi ve ust bar `Cikis` aksiyonu eklendi; demo `AppSession` kayitlariyla giris/cikis iskeleti hazirlandi.
- `AppCredential` modeli, PBKDF2 parola hash altyapisi ve demo e-posta/sifre girisi eklendi.
- Ust bar session secicisi aktif kullanicinin kendi `AppSession` izin listesiyle sinirlandi; baska kullaniciya ait session'a gecis server action tarafinda reddedilir.

## Kaynak Kullanim Ilkesi

`stitch_HTML_sablonlar` klasorundeki HTML dosyalari uygulamaya statik olarak kopyalanmaz. Bu dosyalar:

- ortak navigasyon ritmi,
- toolbar ve liste davranislari,
- tablo yogunlugu,
- dashboard bolumleme mantigi,
- puantaj ve operasyon ekranlarindaki form/liste dengesi

icin referans olarak kullanilir.

Ilk analiz notu:

- `Docs/html-sablon-entegrasyon-notu.md`
- `Docs/tanimlar-crud-davranis-notu.md`
- `Docs/tenant-firma-donem-kapsam-notu.md`
- `Docs/server-crud-sozlesme-notu.md`
- `Docs/postgresql-prisma-kurulum-notu.md`
- `Docs/fatura-islem-modulu-notu.md`

## Ana Klasorler

- `src/app`: Next.js App Router sayfalari ve route iskeleti.
- `src/components`: App shell, modul yuzeyleri ve ortak UI bilesenleri.
- `src/lib`: Navigasyon, modul icerigi ve domain tanimlari.
- `Docs`: Plan, analiz ve uygulama karar dokumanlari.
- `NOA-insaat-SS gorseller`: Eski uygulama ekran goruntusu kaynaklari.
- `stitch_HTML_sablonlar`: Modern UI sablon havuzu / referans HTML kaynaklari.

## Komutlar

Gelisme sunucusu:

```bash
pnpm dev
```

Testler:

```bash
pnpm test
```

TypeScript kontrolu:

```bash
pnpm type-check
```

Lint:

```bash
pnpm lint
```

Production build:

```bash
pnpm build
```

Yerel PostgreSQL DB olusturma ve migration:

```bash
pnpm db:create
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Demo giris hesaplari:

- `muhasebe@noa.local` / `Demo123!`
- `viewer@noa.local` / `Demo123!`

`npm run dev` başlamadan önce demo seed idempotent olarak çalışır. Varsayılan
`DEMO İNŞAAT` kullanıcısı `Kurumsal` planla başlar; geliştirme ortamında tüm
modül erişimleri açık olur. Bu otomatik seed yalnız `dev` komutuna bağlıdır.

## Gelistirme Sirasi

Sıradaki mantikli adimlar:

1. `AppSession` izin listesini ayri firma/donem yetki tablosuna donusturmek ve gercek auth provider entegrasyonuna baglamak.
2. Iptal edilmis ve kaydedilmis faturalar icin rapor filtreleri ve cikti davranisini netlestirmek.
3. Raporlama ve belge ciktisi ihtiyaclarini modul bazinda belirlemek.
4. Yetki, audit log ve onay akisi standartlarini uygulama geneline yaymak.
5. Hareket grubu, resmi belge ve doviz/kur alanlarini fatura formuna acmak.

## Tasarim Notu

Uygulama, eski NOA urununun operasyonel hafizasini korurken modern SaaS beklentilerine gore davranmalidir:

- daha net navigasyon,
- daha hizli liste/arama/islem akisları,
- daha guclu veri butunlugu,
- cok kullanicili ve cok firmali yapi,
- masaustu yogunlugunu kaybetmeyen responsive web deneyimi.
# MS_insaat
