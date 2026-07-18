# Platform Giriş Bilgileri (NOA İnşaat Yönetimi)

Bu doküman, test ve geliştirme süreçlerinde kullanılabilecek, veritabanına varsayılan olarak tanımlanmış (seed işlemiyle eklenen) tüm panel ve platform giriş linkleri ile örnek şifreleri içermektedir.

**ÖNEMLİ NOT:** Veritabanını güncel verilerle başlatmak için aşağıdaki komutları kullanın:

```bash
# Bağımlılıkları yükleyin
pnpm install

# Veritabanı şemasını senkronize edin
pnpm db:push

# Prisma Client oluşturun
pnpm db:generate

# Seed işlemini çalıştırın
pnpm db:seed
```

Bu komut veritabanını 3 firma, yeni kullanıcılar, yetkiler, örnek veriler (faturalar, hakedişler, puantajlar, cariler vb.) ile günceller.

---

## İÇİNDEKİLER

1. [Kullanıcı Panelleri ve Giriş Bilgileri](#kullanıcı-panelleri-ve-giriş-bilgileri)
2. [Tenant / Firma / Dönem Kapsamı](#tenant--firma--dönem-kapsamı)
3. [Örnek Test Verileri](#örnek-test-verileri)
4. [Platform Modülleri](#platform-modülleri)
5. [Teknik Altyapı](#teknik-altyapı)
6. [Güvenlik Notları](#güvenlik-notları)

---

## Kullanıcı Panelleri ve Giriş Bilgileri

Test ortamında aktif olarak oluşturulan kullanıcı rolleri ve giriş bilgileri aşağıdadır.

### Firma 1: DEMO İNŞAAT

| Kullanıcı | Rol | E-Posta | Şifre | Session ID |
|-----------|-----|---------|-------|------------|
| Ahmet Yılmaz | `admin` | `ahmet.yilmaz@noa.local` | `Ahmet123!` | `demo-ahmet` |
| Ayşe Demir | `accounting` | `ayse.demir@noa.local` | `Ayse123!` | `demo-ayse` |
| Mehmet Kaya | `accounting` | `mehmet.kaya@noa.local` | `Mehmet123!` | `demo-mehmet` |
| Muhasebe Kullanıcısı | `accounting` | `muhasebe@noa.local` | `Demo123!` | `demo-accounting` |
| Salt Okur | `viewer` | `viewer@noa.local` | `Demo123!` | `demo-viewer` |

### Firma 2: AKDENİZ İNŞAAT LTD. ŞTİ.

| Kullanıcı | Rol | E-Posta | Şifre | Session ID |
|-----------|-----|---------|-------|------------|
| Zeynep Arslan | `admin` | `admin@akdeniz-insaat.local` | `Akdeniz123!` | `demo-akdeniz-admin` |
| Ali Yıldırım | `accounting` | `muhasebe@akdeniz-insaat.local` | `Akdeniz123!` | `demo-akdeniz-muhasebe` |
| Can Özdemir | `viewer` | `saha@akdeniz-insaat.local` | `Akdeniz123!` | `demo-akdeniz-saha` |

### Firma 3: ANADOLU YAPI A.Ş.

| Kullanıcı | Rol | E-Posta | Şifre | Session ID |
|-----------|-----|---------|-------|------------|
| Murat Korkmaz | `admin` | `admin@anadolu-yapi.local` | `Anadolu123!` | `demo-anadolu-admin` |
| Elif Çelik | `accounting` | `muhasebe@anadolu-yapi.local` | `Anadolu123!` | `demo-anadolu-muhasebe` |
| Serhat Aydın | `viewer` | `saha@anadolu-yapi.local` | `Anadolu123!` | `demo-anadolu-saha` |

---

## Tenant / Firma / Dönem Kapsamı

Seed verilerinin bağlı olduğu varsayılan kapsam:

| Alan | Firma 1 | Firma 2 | Firma 3 |
|------|---------|---------|---------|
| **Tenant ID** | `tenant-noa-demo` | `tenant-noa-demo` | `tenant-noa-demo` |
| **Tenant Adı** | `NOA Demo Tenant` | `NOA Demo Tenant` | `NOA Demo Tenant` |
| **Firma ID** | `company-demo-insaat` | `company-akdeniz-insaat` | `company-anadolu-insaat` |
| **Firma Adı** | `DEMO İNŞAAT` | `AKDENİZ İNŞAAT LTD. ŞTİ.` | `ANADOLU YAPI A.Ş.` |
| **Dönem ID** | `period-2026` | `period-akdeniz-2026` | `period-anadolu-2026` |
| **Dönem Etiketi** | `2026` | `2026` | `2026` |
| **Abonelik Planı** | `Kurumsal` | `Kurumsal` | `Kurumsal` |
| **Kullanıcı Limiti** | 75 | 75 | 75 |
| **Depolama** | 100 GB | 100 GB | 100 GB |
| **Yıllık Ücret** | 202.800 TL | 202.800 TL | 202.800 TL |

---

## Abonelik Planları

Sistemde tanımlı abonelik planları ve özellikleri:

| Plan | Aylık Ücret | Yıllık Ücret | Kullanıcı | Depolama | Durum |
|------|-------------|--------------|-----------|----------|-------|
| **Starter** | 2.990 TL | 35.880 TL | 5 | 5 GB | Aktif |
| **Profesyonel** | 4.990 TL | 59.880 TL | 15 | 15 GB | Aktif |
| **Enterprise** | 9.990 TL | 119.880 TL | 50 | 100 GB | Aktif |

### Plan Modülleri

| Modül | Starter | Profesyonel | Enterprise |
|-------|---------|-------------|------------|
| Dashboard | ✅ | ✅ | ✅ |
| Şantiyeler | ✅ | ✅ | ✅ |
| Tedarikçiler | ✅ | ✅ | ✅ |
| Taşeronlar | ✅ | ✅ | ✅ |
| Personel | ✅ | ✅ | ✅ |
| Kasa/Banka | ✅ | ✅ | ✅ |
| Giderler | ✅ | ✅ | ✅ |
| Stok/Depo | ✅ | ✅ | ✅ |
| Faturalar | ✅ | ✅ | ✅ |
| Hakediş | ✅ | ✅ | ✅ |
| Puantaj | ✅ | ✅ | ✅ |
| Raporlar | ✅ | ✅ | ✅ |
| Ayarlar | ✅ | ✅ | ✅ |
| Çek | ❌ | ✅ | ✅ |
| Müşteriler | ❌ | ✅ | ✅ |
| Döküman Merkezi | ❌ | ✅ | ✅ |
| İhale Yönetimi | ❌ | ❌ | ✅ |
| Banka Entegrasyonu | ❌ | ❌ | ✅ |
| Arvento Filo Takip | ❌ | ❌ | ✅ |
| AI Analiz | ❌ | ❌ | ✅ |

---

## Örnek Test Verileri

Her 3 firma için sistem seed edildiğinde aşağıdaki gerçekçi veriler otomatik olarak oluşturulur (toplam 24 entity + 4 fatura + 3 hakediş + 3 puantaj/firma).

### Şantiye / Projeler (5 kayıt/firma)
| Kod | Tanım | Yetkili | Proje Tutarı |
|-----|-------|---------|-------------|
| SANT-0001 | ŞİRKET MERKEZ ŞANTİYESİ | Ana Kullanıcı | 0,00 TL |
| SANT-0002 | ANTALYA KONYAALTI 120 KONUT PROJESİ | Hasan Çelik | 45.750.000,00 TL |
| SANT-0003 | İSTANBUL KARTAL İŞ MERKEZİ İNŞAATI | Fatma Özkan | 82.500.000,00 TL |
| SANT-0004 | ANKARA ÇANKAYA REZİDANS PROJESİ | Emre Aydın | 37.200.000,00 TL |
| SANT-0005 | İZMİR BORNOVA KENTSEL DÖNÜŞÜM | Baran Tekin | 63.400.000,00 TL |

### Tedarikçiler (5 kayıt/firma)
| Kod | Tanım | Kategori | Bakiye |
|-----|-------|----------|--------|
| TED-0001 | ÖRNEK TEDARİKÇİ | Malzeme | 0,00 TL |
| TED-0002 | YAPI MALZEMELERİ A.Ş. | Malzeme | -1.622.250,00 TL |
| TED-0003 | GÜVEN NAKLİYAT LTD. ŞTİ. | Hizmet | -259.200,00 TL |
| TED-0004 | ENERJİ ELEKTRİK A.Ş. | Gider | -52.668,00 TL |
| TED-0005 | ANADOLU ÇELİK SANAYİ A.Ş. | Malzeme | -890.400,00 TL |

### Taşeronlar (5 kayıt/firma)
| Kod | Tanım | Yetkili | Sözleşme No |
|-----|-------|---------|-------------|
| TAS-0001 | ŞİRKETİN TAŞERONU | Ali Koç | SZL-2026-001 |
| TAS-0002 | DOĞAN YAPI TAŞERONLUK LTD. ŞTİ. | Kemal Doğan | SZL-2026-002 |
| TAS-0003 | YILDIZ ELEKTRİK TESİSAT | Serkan Yıldız | SZL-2026-003 |
| TAS-0004 | MARMARA BETON SANTRALİ A.Ş. | Hüseyin Demir | SZL-2026-004 |
| TAS-0005 | EGE ÇATI KAPLAMA LTD. ŞTİ. | Oğuz Şahin | SZL-2026-005 |

### Personel (5 kayıt/firma)
| Kod | İsim | Görev | Şantiye |
|-----|------|-------|---------|
| PER-0001 | MEHMET YILMAZ | KALFA | ŞİRKET MERKEZ ŞANTİYESİ |
| PER-0002 | AYŞE DEMİR | MUHASEBE | ŞİRKET MERKEZ ŞANTİYESİ |
| PER-0003 | HASAN ÇELİK | SAHA MÜHENDİSİ | ANTALYA KONYAALTI 120 KONUT PROJESİ |
| PER-0004 | FATMA ÖZKAN | PROJE MÜDÜRESİ | İSTANBUL KARTAL İŞ MERKEZİ İNŞAATI |
| PER-0005 | EMİR AKIN | ELEKTRİK TEKNİSYENİ | ANKARA ÇANKAYA REZİDANS PROJESİ |

### Kasa/Banka Hesapları (5 kayıt/firma)
| Kod | Tanım | Tip | Döviz | Bakiye |
|-----|-------|-----|-------|--------|
| KASA-0001 | MERKEZ KASA | Kasa | TL | 24.350,00 TL |
| KASA-0002 | GARANTİ BANKASI TİCARİ HESAP | Banka | TL | 1.872.640,00 TL |
| KASA-0003 | İŞ BANKASI DÖVİZ HESABI | Banka | USD | 48.200,00 USD |
| KASA-0004 | ŞANTİYE KASA | Kasa | TL | 8.750,00 TL |
| KASA-0005 | QNB FİNANSBANK EUR HESAP | Banka | EUR | 32.150,00 EUR |

### Stok Kartları (5 kayıt/firma)
| Kod | Tanım | Stok Grubu | Üretici | Birim |
|-----|-------|-----------|---------|-------|
| STK-0001 | Çimento Torba | Kaba İnşaat | Akdeniz Çimento | Adet |
| STK-0002 | Demir Çubuk | Demir | Anadolu Çelik | Kg |
| STK-0003 | Gaz Beton | Duvar | Yapı Blok | Adet |
| STK-0004 | Seramik Karo | İnce İşçilik | Kalebodur | m2 |
| STK-0005 | Alüminyum Doğrama | Cephe | SCHÜCO | m2 |

### Alış Faturaları (4 kayıt/firma)
| Belge No | Tarih | Tedarikçi | Açıklama |
|----------|-------|-----------|----------|
| FAT-0006 | 23.06.2026 | ÖRNEK TEDARİKÇİ | NOA alış faturası demo akışı |
| FAT-2026-001 | 01.06.2026 | YAPI MALZEMELERİ A.Ş. | Temel betonu ve demir alımı |
| FAT-2026-002 | 15.06.2026 | GÜVEN NAKLİYAT LTD. ŞTİ. | Hafriyat taşıma bedeli |
| FAT-2026-003 | 25.06.2026 | ENERJİ ELEKTRİK A.Ş. | Şantiye elektrik faturası |

### Hakediş Faturaları (3 kayıt/firma)
| Belge No | Tarih | Taşeron | Şantiye | Açıklama |
|----------|-------|---------|---------|----------|
| HAK-0001 | 27.06.2026 | ŞİRKETİN TAŞERONU | Merkez Şantiye | Kaba inşaat ve ince işçilik |
| HAK-0002 | 30.06.2026 | DOĞAN YAPI TAŞERONLUK LTD. ŞTİ. | Antalya Projesi | Sıva, mantolama ve boya |
| HAK-0003 | 01.07.2026 | YILDIZ ELEKTRİK TESİSAT | İstanbul İş Merkezi | Elektrik tesisat, pano, aydınlatma |

### Puantajlar (3 kayıt/firma)
| Belge No | Dönem | Taşeron | Şantiye | Personel Sayısı |
|----------|-------|---------|---------|-----------------|
| PNT-2026-06-001 | Haz 2026 | ŞİRKETİN TAŞERONU | Merkez Şantiye | 2 kişi |
| PNT-2026-07-001 | Tem 2026 | DOĞAN YAPI TAŞERONLUK | Antalya Projesi | 3 kişi |
| PNT-2026-06-002 | Haz 2026 | YILDIZ ELEKTRİK TESİSAT | İstanbul İş Merkezi | 2 kişi |

---

## Platform Modülleri

Sistemde tanımlı tüm navigasyon modülleri ve durumları:

### P0 - Çekirdek Modüller (Aktif)
| Modül | Route | Açıklama |
|-------|-------|----------|
| Dashboard | `/` | Nakit, vade, şantiye ve operasyon özetleri |
| Şantiyeler | `/santiyeler` | Şantiye kartları, gelir/gider ve analiz |
| Tedarikçiler | `/tedarikciler` | Tedarikçi kartları, alış faturası ve ekstre |
| Taşeronlar | `/taseronlar` | Taşeron hesapları, hakediş ve ödeme |
| Personel | `/personel` | Personel kartları, ödeme ve zimmet |
| Kasa/Banka | `/kasa-banka` | Kasa, banka, virman ve nakit akışı |
| Giderler | `/giderler` | Şantiye gideri, ödeme aracı ve masraf analizi |
| Stok/Depo | `/stok-depo` | Stok kartları, depo ve şantiye hareketleri |
| Faturalar | `/faturalar` | Alış, satış, irsaliye ve PDF önizleme |
| Hakediş | `/hakedis` | Hakediş faturası, onay ve çıktı |
| Çek | `/cek` | Gelen çek, firma çeki, tahsil ve ciro |
| Puantaj | `/puantaj` | Aylık puantaj grid'i ve maaş hazırlığı |
| Raporlar | `/raporlar` | Ekstre, hareket toplamları ve şantiye raporu |
| Ayarlar | `/ayarlar` | Firma parametreleri, yetki ve audit |

### P1 - Planlanan Modüller
| Modül | Route | Açıklama |
|-------|-------|----------|
| Müşteriler | `/musteriler` | Müşteri cari kartları, satış faturası ve ekstre |
| İhale Yönetimi | `/ihale-yonetimi` | İhale listesi, analiz panosu, teklif ve durum takibi |
| Döküman Merkezi | `/dokuman-merkezi` | Sistem klasörleri, dosya yükleme ve evrak bağlantıları |

---

## Teknik Altyapı

| Bileşen | Teknoloji |
|---------|-----------|
| **Framework** | Next.js 16.2.9 |
| **Dil** | TypeScript 5.x |
| **Veritabanı** | PostgreSQL (Prisma ORM 7.8) |
| **Paket Yöneticisi** | pnpm |
| **Styling** | Tailwind CSS 4 |
| **Test** | Vitest 4.1 |
| **Runtime** | Node.js |

### Yararlı Komutlar

```bash
# Geliştirme sunucusu
pnpm dev

# Tip kontrolü
pnpm type-check

# Lint kontrolü
pnpm lint

# Testleri çalıştır
pnpm test

# Veritabanı şemasını doğrula
pnpm db:validate

# Prisma Client yeniden oluştur
pnpm db:generate

# Seed verilerini yükle
pnpm db:seed
```

---

## Güvenlik Notları

> **ÖNEMLI:**
> - Sistemdeki tüm şifreler güvenli bir şekilde hash'lenerek (`createPasswordHash` ile) veritabanında saklanmaktadır.
> - `pnpm db:seed` komutunu prodüksiyon ortamında çalıştırmamaya dikkat edin, test verilerini üretim ortamına eklemeyin.
> - Kullanıcı rolleri: `admin` (tam yetki), `accounting` (finansal işlemler), `viewer` (salt-okunur).

---

**Son Güncelleme:** 10 Temmuz 2026 — 3 firma (DEMO İNŞAAT/Enterprise, AKDENİZ İNŞAAT/Pro, ANADOLU YAPI/Pro), 5'er örnek veri, 11 kullanıcı, 11 session ve 3 abonelik planı ile güncellenmiştir.
