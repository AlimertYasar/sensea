# Sensea (Expo / React Native)

Nasıl hissettiğini yazarsın; Sensea bunu bir duygu karışımına, bir renk hikâyesine ve stiline uygun iki kombine dönüştürür. Tek kod tabanından hem Android'e hem iOS'a çıkar.

## Neler var

- **Bugün:** Serbest metin yazma alanı, tek dokunuşla eklenen duygu çipleri, etkinlik seçimi ve isteğe bağlı hava durumu.
- **Sonuç ekranı:**
  - "Duygu kumaşı": duygu karışımından üretilen, her okumada farklı bir renk dokusu.
  - Duyguların yüzdeleri ve 4–5 renklik palet.
  - İki kombin: **Uyumlu** ve **Moral yükselt**. Kıyafetler, önerilen renklerle çizilmiş SVG'ler olarak "flat-lay" düzeninde gösterilir.
  - Parça listesi, "neden bu kombin" açıklaması, stil ipucu, kaydetme ve paylaşma.
  - Her parçanın yanındaki karıştır butonu yalnızca o parçayı değiştirir; kombinin geri kalanı ve renk uyumu korunur (`/v1/swap`).
- **Günlük:** Haftalık duygu özeti (bu hafta / geçen hafta: duygu karışımı, en baskın duygu, keyifli duygulardaki değişim, haftanın renkleri), son 5 haftanın renkli duygu takvimi, geçmiş kayıtlar ve kaydedilen kombinler.
- **Hatırlatmalar:** Seçilen saatte sabah bildirimi ve pazar akşamı haftalık özet bildirimi. Sadece telefonda planlanır (`expo-notifications`); profilden açılıp kapanır.
- **Profil:** Ad, 6 stil, kesim tercihi (kadın/erkek/unisex), dil (TR/EN/otomatik), hava durumu izni, gizlilik ve geçmişi temizleme.
- **Renk bilimi:** Paletler, renk–duygu araştırmalarından (Jonauskaite ve ark. 2020; Wilms & Oberfeld 2018; Valdez & Mehrabian 1994) hesaplanır. Kaynaklar uygulamada gösterilmez. Ayrıntılar backend'deki `RENK_BILIMI.md` dosyasında.
- **Premium:** Kombinin gerçekçi AI fotoğrafı (ayda 30) ve sınırsız öneri.
- **Premium Plus:**
  - Gardırop sekmesinde kıyafetlerini fotoğraflarsın; Sensea tür ve rengini tanır.
  - Fotoğrafın arka planı otomatik temizlenir (fal.ai BiRefNet); parça flat-lay'de çizimler gibi tahtaya yerleşir.
  - Kombinler senin parçalarından kurulur; uzun süredir giymediklerin öne çıkar, son 2 günde giydiklerin geri planda kalır.
  - Her parçanın kaç kez giyildiği görünür, "Bir süredir giymediklerin" satırı ve "Bununla kombin oluştur" butonu o parçayı içeren iki kombin hazırlar.
  - AI fotoğraflar kendi kıyafetlerinle üretilir (ayda 100).
- **Kişiselleştirme:**
  - Her kombinde beğendim, beğenmedim ve bunu giydim butonları var. Bu sinyallerden sevdiğin ve sevmediğin renk ve parçalar hesaplanıp öneriye yön veriyor.
  - Profildeki "Hiç önerme" bölümünde seçilen renk aileleri ve parçalar hiçbir kombinde yer almıyor. Bu kural backend'de kesin filtre olarak uygulanıyor.
- **Paylaşım kartı:** Kombin ve duygu kumaşı 1080×1920 story görseli olarak paylaşılıyor. Web'de metin olarak paylaşılıyor.
- **Tema:** Koyu, açık ve sistem seçenekleri var. Tüm metinler WCAG AA kontrast oranını karşılıyor.
- **Yükleme anı:** Ruh hali okunurken boyanan kumaş animasyonu gösteriliyor. Cihazda "hareketi azalt" ayarı açıksa animasyon duruyor.
- **İzleme:**
  - Sentry ile çökme raporları alınıyor. `EXPO_PUBLIC_SENTRY_DSN` boşsa kapalı.
  - Backend'de anonim, günlük olay sayaçları tutuluyor (`/v1/events`, `/v1/stats`).
- **Abonelik altyapısı:** Paywall ekranı ve RevenueCat ile App Store / Google Play abonelikleri. Kurulum `YAYIN_REHBERI.md` dosyasının 5. bölümünde.
- **Diğer:**
  - Hesap yok, veriler sadece cihazda tutulur.
  - Zor bir dönem sinyali verildiğinde destek kartı çıkar.

## Windows'ta geliştirme

```powershell
cd mobile
npm install
copy .env.example .env     # EXPO_PUBLIC_API_URL'i ayarla
npx expo start
```

- **Premium'u denemek:** `.env` dosyasında `EXPO_PUBLIC_DEV_TIER=plus` yap ve backend'i `SENSEA_DEV_TIERS=1` ile başlat. Gerçek satın alma için development build gerekir.
- **Telefonda:** Play Store veya App Store'dan **Expo Go**'yu indir ve QR kodu okut. Kullanılan tüm kütüphaneler Expo Go'da çalışır.
  - Telefon ve PC aynı Wi-Fi'da olmalı.
  - `.env` içinde `EXPO_PUBLIC_API_URL=http://<PC'nin IP'si>:8000` olmalı. IP'yi `ipconfig` ile bulabilirsin.
  - Backend'i `--host 0.0.0.0` ile başlat.
- **Android emülatörü:** `a` tuşuna bas. API adresi `http://10.0.2.2:8000` olarak kalabilir.
- **Tarayıcıda hızlı bakış:** `w` tuşuna bas.

Kontroller:

```powershell
npx tsc --noEmit
npx expo-doctor
```

## Klasör yapısı

```
src/app/                 Ekranlar (expo-router)
  _layout.tsx            Fontlar, onboarding yönlendirmesi
  onboarding.tsx         3 adımlı karşılama
  (tabs)/index.tsx       Bugün
  (tabs)/journal.tsx     Günlük + takvim
  (tabs)/profile.tsx     Profil / ayarlar
  result/[id].tsx        Sonuç ekranı
  privacy.tsx            Gizlilik
src/components/
  garments.tsx           32 kıyafet tipi için SVG çizimler
  OutfitBoard.tsx        Flat-lay kompozisyon
  MoodSwatch.tsx         Duygu kumaşı görseli
  DyeLoader.tsx          Bekleme animasyonu
  ShareCard.tsx          Story paylaşım kartı
  StylePicker.tsx, ui.tsx
src/lib/                 tema (açık/koyu), i18n (TR/EN), api, store, tercihler (prefs.ts), izleme (monitoring.ts), hava durumu
store/                   Mağaza metinleri, Play ikon (512) ve feature graphic (1024x500)
```

Yeni bir kıyafet tipi eklersen iki yeri birlikte güncelle: backend'de `app/catalog.py` içindeki `GARMENTS` sözlüğü ve buradaki `garments.tsx`.

Yayınlama adımları için `YAYIN_REHBERI.md` dosyasına bak.
