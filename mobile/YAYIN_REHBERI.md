# Sensea yayın rehberi (Windows'tan, Mac olmadan)

## 0. Hesaplar

| Hesap | Ücret | Not |
|---|---|---|
| Google Play Console | 25 $ (tek sefer) | Kimlik doğrulaması birkaç gün sürebilir |
| Apple Developer Program | 99 $/yıl | Bireysel kayıt; D-U-N-S sadece şirket için gerekir |
| Expo (expo.dev) | Ücretsiz | EAS Build / Submit için |
| Anthropic Console | Kullanım kadar | API anahtarı + **aylık harcama limiti koy** |
| fal.ai | Kullanım kadar (~0,03 $/görsel) | Premium AI fotoğraflar + **harcama limiti koy** |
| RevenueCat | Aylık ~2.500 $ gelire kadar ücretsiz | Abonelikleri iki mağazada yönetir |
| Render.com (veya Fly/Railway) | ~7 $/ay (kalıcı disk için) | Backend sunucusu |

## 1. Backend'i yayına al

`backend/README.md` dosyasındaki adımları izle. Sonunda iki şeyin olmalı:

- API adresi, örneğin `https://sensea-api.onrender.com`
- Gizlilik politikası adresi: `https://sensea-api.onrender.com/privacy`. Mağazalar bu URL'yi zorunlu istiyor.

## 2. Uygulamayı EAS'e bağla

```powershell
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # app.json'a projectId ekler
```

`eas.json` içindeki `EXPO_PUBLIC_API_URL` değerlerini (iki tane var) kendi API adresinle değiştir. Backend'de `SENSEA_APP_KEY` kullanıyorsan aynı değeri `EXPO_PUBLIC_APP_KEY` olarak ekle.

Paket adı `com.alimertyasar.sensea` olarak ayarlandı. Eski `com.example.emotionapp` Play Store'da kabul edilmez. Paket adını yayından sonra değiştiremezsin, o yüzden şimdi karar ver.

## 3. Android → Google Play

```powershell
npx eas-cli@latest build -p android --profile preview      # telefona kurulacak APK (deneme)
npx eas-cli@latest build -p android --profile production   # Play Store için .aab
```

Play Console'da sırasıyla:

1. **Uygulama oluştur.** Ad: Sensea. Varsayılan dil Türkçe. Uygulama türü: ücretsiz.
2. **Uygulama içeriği bölümünü doldur:**
   - Gizlilik politikası URL'si.
   - Reklam yok.
   - Hedef kitle 13+.
   - İçerik derecelendirme anketi.
   - **Veri güvenliği (Data safety)** için aşağıdaki tablo.
3. **Kapalı test:** Yeni kişisel hesaplarda üretime çıkmadan önce **en az 12 test kullanıcısıyla 14 gün** kapalı test zorunlu. Arkadaşlarının Gmail adreslerini ekle ve 14 gün boyunca uygulamayı gerçekten kullanmalarını sağla.
4. 14 gün dolunca Play Console'dan üretim erişimi için başvurursun.

Yüklemeyi EAS ile de yapabilirsin: `npx eas-cli@latest submit -p android`. Bunun için Google Cloud'da bir servis hesabı JSON anahtarı gerekir. EAS adım adım anlatıyor. İlk yüklemeyi Play Console'dan elle yapmak daha kolay.

Veri güvenliği formu için önerilen cevaplar:

| Soru | Cevap |
|---|---|
| Veri topluyor musunuz? | Evet: "Uygulama etkinliği → Diğer kullanıcı içeriği" (yazılan metin), işlevsellik amacıyla |
| Saklanıyor mu? | Hayır, sadece işleniyor ("ephemeral processing") |
| Konum | Yaklaşık konum cihazda kullanılır, sunucuya gönderilmez. "Toplanmıyor" işaretlenebilir. İçin rahat etmezse "Yaklaşık konum, işlevsellik, paylaşılmıyor" seç |
| Şifreli aktarım | Evet (HTTPS) |
| Silme talebi | Hesap yok, veriler cihazda tutuluyor |

## 4. iOS → App Store (Mac'siz)

1. App Store Connect'te **Uygulamalar → +**. Bundle ID: `com.alimertyasar.sensea`. Yoksa EAS ilk build'de oluşturur.
2. Build ve yükleme:
   ```powershell
   npx eas-cli@latest build -p ios --profile production    # Apple girişini ister, sertifikaları kendisi oluşturur
   npx eas-cli@latest submit -p ios                         # App Store Connect'e yükler
   ```
3. **TestFlight** ile bir iPhone'da dene. Kendininki olmak zorunda değil, arkadaşının telefonu da olur.
4. **App Privacy** bölümü: "User Content – Other" (yazılan metin). Kullanıcıya bağlı değil, takip için kullanılmıyor.
5. **İnceleme notu.** Şunu yazabilirsin:
   > No login required. Type how you feel on the Today tab (e.g. "tired but excited for tonight") and tap "Create my outfit". The app returns an AI-generated mood reading and two outfit suggestions. It is a style assistant, not a health app.
6. **Ekran görüntüleri:** 6.9" iPhone boyutunda (1320×2868) en az 3 tane. Android için en az 2 ekran görüntüsü yeterli.

Apple'ın en sık reddettiği nedenler ve uygulamanın durumu:

- **4.2 Minimum işlevsellik:** v2 bunu karşılıyor. Kişisel AI önerisi, günlük ve takvim var.
- **5.1.1 Hesap silme:** Hesap olmadığı için gerekmiyor.
- **Sağlık iddiası:** Uygulama metinlerinde "terapi", "tedavi", "depresyon tespiti" gibi ifadeler kullanma.

## 5. Abonelikler (Premium / Premium Plus)

Dijital abonelikler iki mağazada da **mağazanın kendi ödeme sistemiyle** satılmak zorunda (Apple 3.1.1 ve Google Play Billing). Kodda RevenueCat kullanılıyor; iki mağazayı tek yerden yönetiyor ve sunucu aboneliği doğrulayabiliyor.

### 5.1 Ürünleri oluştur

Her iki mağazada aynı ürün kimliklerini kullan:

| Ürün kimliği | Seviye | Önerilen fiyat |
|---|---|---|
| `sensea_premium_monthly` | Premium | 3,99–4,99 $/ay |
| `sensea_premium_yearly` | Premium (isteğe bağlı) | 29,99–39,99 $/yıl |
| `sensea_plus_monthly` | Premium Plus | 7,99–9,99 $/ay |
| `sensea_plus_yearly` | Premium Plus (isteğe bağlı) | 59,99–79,99 $/yıl |

Kimliklerde `plus` geçmesi önemli; uygulama seviyeyi buradan anlıyor.

Mağaza tarafındaki adımlar:

- **App Store Connect:**
  1. *Anlaşmalar, Vergi ve Banka* bölümünde ücretli uygulama sözleşmesini imzala, banka ve vergi bilgilerini gir. Bunu yapmadan abonelik satamazsın.
  2. *Abonelikler* bölümünde "Sensea" adlı tek bir abonelik grubu aç. Plus'ı Premium'un üst seviyesi olarak sırala.
- **Play Console:**
  1. Ödeme profili (merchant account) oluştur.
  2. *Gelir elde etme → Abonelikler* bölümünde ürünleri ekle. Abonelik ürünleri için önce içinde billing kütüphanesi olan bir build yüklemen gerekir; kapalı test build'i yeterli.
- **Küçük işletme programına başvur.** Apple Small Business Program ve Google'ın abonelik oranı ile komisyon %30 yerine %15 olur.

### 5.2 RevenueCat

1. Proje aç, iOS ve Android uygulamalarını ekle. iOS için App Store Connect API anahtarı, Android için Play servis hesabı gerekir; RevenueCat adım adım anlatıyor.
2. **Entitlements** bölümünde `premium` ve `plus` adlı iki entitlement oluştur.
   - Premium ürünlerini → `premium` entitlement'ına bağla.
   - Plus ürünlerini → hem `plus` hem `premium` entitlement'ına bağla.
3. **Offerings** bölümünde `default` offering'e tüm paketleri ekle.
4. Anahtarları yerleştir:
   - Uygulama: `eas.json` → `production.env` içine `EXPO_PUBLIC_RC_IOS_KEY` ve `EXPO_PUBLIC_RC_ANDROID_KEY` (public SDK anahtarları).
   - Backend: Render'da `REVENUECAT_SECRET_KEY` (secret anahtar).

### 5.3 Test

- Satın alma **Expo Go'da ve web'de çalışmaz.** Development build gerekir:
  ```powershell
  npx eas-cli@latest build -p android --profile development
  ```
- Ürünler hazır olmadan Premium ekranlarını denemek için:
  - `.env` dosyasında `EXPO_PUBLIC_DEV_TIER=plus` yap.
  - Backend'i `SENSEA_DEV_TIERS=1` ile çalıştır.
  - **Yayın build'inde ikisi de boş veya kapalı olmalı.**
- iOS'ta sandbox test hesabıyla, Android'de lisans test kullanıcısıyla gerçek satın alma akışını dene.

### 5.4 Mağaza incelemesi için

- **Paywall gereklilikleri:** Paywall ekranında fiyat, dönem, otomatik yenileme metni, kullanım koşulları ve gizlilik bağlantıları, ayrıca "Satın alımları geri yükle" butonu zaten var. Apple bunları zorunlu tutuyor.
- **Apple incelemesi:** İnceleme notuna abonelikleri açıkla. Gerekirse inceleyici için sandbox satın alma yeterli.
- **App Privacy / Data safety formlarına şunları ekle:**
  - "Fotoğraflar" (gardırop, işleniyor ama saklanmıyor).
  - "Satın alma geçmişi" (RevenueCat).

## 6. Çökme raporları ve istatistikler

**Sentry:** sentry.io'da ücretsiz bir React Native projesi aç.

1. DSN değerini `eas.json` dosyasındaki `EXPO_PUBLIC_SENTRY_DSN` alanına yaz.
2. Kaynak eşlemelerini (okunabilir hata satırları) yüklemek için EAS'te `SENTRY_AUTH_TOKEN` secret'ını tanımla. Ardından `eas.json` dosyasındaki `SENTRY_DISABLE_AUTO_UPLOAD` değerini `false` yap.

**İstatistik:**

1. Backend'de `SENSEA_ADMIN_KEY` tanımla.
2. Günlük olay sayılarını şu komutla görürsün:
   ```bash
   curl -H "X-Admin-Key: <anahtar>" https://<api>/v1/stats
   ```
3. Göreceğin olaylar: açılış, kombin, beğeni, paylaşım, paywall görüntüleme, satın alma ve diğerleri.

**Mağaza formlarına ekle:**

- "Uygulama etkinliği (ürün etkileşimi), anonim, analiz amacıyla".
- "Kilitlenme günlükleri ve tanılama, Sentry".
- İkisi de kullanıcıya bağlı değil, takip için kullanılmıyor.

## 7. Güncellemeler

- Sadece JS/TS değişikliklerinde mağaza incelemesine girmeden güncelleme yayınlayabilirsin: `npx eas-cli@latest update --branch production`. Bunun için önce `npx expo install expo-updates` ve `eas update:configure` çalıştırman gerekir.
- Native değişikliklerde (yeni kütüphane, izin vb.) yeni build alıp `version` değerini artırman gerekir.

## Yayından önce kontrol listesi

- [ ] Backend canlı. `/health` çağrısında `"engine": "ai"` görünüyor.
- [ ] Anthropic ve fal.ai'de harcama limiti ayarlı.
- [ ] Mağaza ürünleri, RevenueCat entitlement'ları ve anahtarlar hazır. Sandbox'ta satın alma denendi.
- [ ] `EXPO_PUBLIC_DEV_TIER` boş, backend'de `SENSEA_DEV_TIERS` kapalı.
- [ ] `eas.json` içindeki API URL'leri doğru.
- [ ] `/privacy` sayfasındaki e-posta senin (`SENSEA_CONTACT_EMAIL`).
- [ ] Android: 12 test kullanıcısı × 14 gün tamamlandı.
- [ ] Mağaza metinleri `store/listing.md` dosyasından kopyalandı.
- [ ] Gerçek telefonda sabah hatırlatması ve haftalık özet bildirimi denendi (Expo Go'da Android'de bildirimler sınırlı; development build ile dene).
- [ ] Ekran görüntüleri alındı. Bunun için gerçek cihazda, AI açıkken birkaç güzel örnek hazırla.
