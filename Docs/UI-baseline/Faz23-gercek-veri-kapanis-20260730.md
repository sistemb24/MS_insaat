# Faz 23 — İzole Gerçek Veri ve Kapanış

> Tarih: 30.07.2026
> Durum: Tamamlandı
> Kapsam: İK Operasyon Dashboard

## Uygulanan dikey

- `/personel` çalışma alanına salt-okunur İK Operasyon Dashboard eklendi.
- Personel kartı, izin, avans, transfer, İSG eğitimi/katılımı ve puantaj verileri tek scoped read-model içinde birleştirildi.
- Personel KPI'ları, aktif şantiye dağılımı, bekleyen iş kuyruğu, yaklaşan izin/eğitim ve taslak puantaj listeleri sağlandı.
- Dashboard serbest not, tutar, sağlık/iletişim/banka bilgisi ve request key taşımaz; mutation, audit, bildirim veya revalidation üretmez.
- İzin, avans ve transfer kayıtları mevcut kaynak deep-link'lerine; eğitim `/isg`, puantaj `/puantaj` rotasına yönlenir.
- Aynı `/personel` rotasındaki deep-link navigasyonunda değişen `initialLeaveId`, `initialAdvanceId` ve `initialTransferId` prop'ları istemci state'ine güvenli biçimde senkronlandı. Yerel kapatma davranışı yeniden açma döngüsü üretmez.
- Yeni Prisma modeli, migration veya backfill eklenmedi; mevcut 54 migration korundu.

## İzole kabul verisi

Kabul senaryosu yalnız aşağıdaki kapsamı kullanır:

- Tenant: `tenant-noa-demo`
- Firma: `company-f23-kabul-20260730`
- Dönem: `period-f23-kabul-20260730`
- Komut: `npm run hr-dashboard:acceptance:verify`

İki ardışık repository okuması birebir aynı snapshot'ı üretti:

- 4 toplam, 3 aktif, 1 pasif ve bugün izinli 1 personel,
- F23 Kuzey Şantiyesi'nde 2 aktif personel ve 1 atanmamış aktif personel,
- 1 izin, dört ayrı avans aşaması ve 1 transferden oluşan 6 bekleyen iş,
- 1 yaklaşan onaylı izin,
- 2 kayıtlı katılımlı 1 yaklaşan İSG eğitimi,
- 1 taslak puantaj.

Yabancı firma/dönem scope'u tamamen boş kaldı. Dashboard okuması öncesi ve sonrası audit sayısı `0 → 0` olarak korundu. Snapshot içinde kabul kaynağındaki gizli not, `12.500` tutarı veya request key bulunmadığı doğrulandı.

## UI kabulü

Yerel in-app browser ile gerçek F23 accounting oturumunda:

- KPI ve tüm federatif listelerin izole veriyle eşleştiği,
- izin, avans ve transfer deep-link'lerinin doğru ayrıntı panelini açtığı,
- 390 px mobil görünümde `bodyScrollWidth=375`, dashboard `scrollWidth=clientWidth=343` olduğu ve yatay taşma bulunmadığı,
- açık/koyu tema tokenlarının uygulandığı,
- dashboard DOM'unda mutation kontrolü bulunmadığı,
- tarayıcı konsolunda warning/error olmadığı

doğrulandı. Geçici viewport, tema ve oturum değişiklikleri test sonunda geri alındı. Print-safe sınıfları bileşen sözleşme testi ve production build içinde doğrulandı.

## Kalite kapıları

- Hedefli dashboard paketi: 4 dosya / 18 test
- Personel kaynak yüzeyleriyle hedefli regresyon: 4 dosya / 20 test
- `npm test`: 284 dosya / 1.656 test
- `npm run type-check`: geçti
- `npm run db:validate`: geçti
- `prisma migrate status`: 54 migration, şema güncel
- `npm run lint`: geçti
- `npm run build`: geçti, 77 sayfa
- `git diff --check`: kapanış dokümanları sonrası ayrıca doğrulandı

## Ürün sınırları

Dashboard yasal izin hak edişi, SGK/e-Devlet bildirimi, performans puanı, eğitim hedef kitle matrisi veya puantaj zorunluluk takvimi üretmez. Kaynak modelde bulunmayan “eksik eğitim” ya da “açılmamış puantaj” alarmı uydurulmaz.

Faz 23 tamamlandı.