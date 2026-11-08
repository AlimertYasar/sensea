# Sensea

Sensea, nasıl hissettiğini yazdığında duygularını okuyan ve renk–duygu araştırmalarına dayanan bir paletle sana kombin öneren bir stil uygulaması.

*Sensea reads how you feel from a few words and suggests outfits in colours that match your mood, based on colour–emotion research.*

## Repo yapısı

| Klasör | İçerik |
|---|---|
| [`mobile/`](mobile) | iOS + Android uygulaması: Expo (React Native), TypeScript, expo-router |
| [`backend/`](backend) | API: FastAPI, Claude ile duygu analizi ve kombin, fal.ai ile gerçekçi görseller |
| `render.yaml` | Backend'in Render'a yayınlanması (Blueprint) |
| `Sensea-Baslat.bat` | Windows'ta backend ve Expo'yu tek tıkla başlatır |

## Özellikler

- Serbest metinden oransal duygu analizi (8 duygu, Türkçe ve İngilizce)
- Araştırmaya dayalı renk motoru: "Uyumlu" ve "Moral yükselt" paletleri
- Stil (en fazla 3), kesim, etkinlik ve hava durumuna göre iki kombin
- Tek parçayı değiştirme, beğeni/giydim geri bildirimi, "hiç önerme" tercihleri
- Duygu günlüğü, haftalık duygu özeti, sabah hatırlatması
- **Premium:** kombinin gerçekçi AI fotoğrafı
- **Premium Plus:** dijital gardırop (fotoğraftan tanıma, arka plan temizleme), kendi kıyafetlerinden kombin, giyilme takibi

## Hızlı başlangıç (Windows)

```bat
git clone https://github.com/AlimertYasar/sensea.git
cd sensea

:: backend
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env

:: mobil
cd ..\mobile
npm install
copy .env.example .env
```

Sonra `Sensea-Baslat.bat` dosyasını çalıştır ve telefondaki Expo Go ile QR kodu okut. Ayrıntılar: [`mobile/README.md`](mobile/README.md), [`backend/README.md`](backend/README.md), yayın adımları: [`mobile/YAYIN_REHBERI.md`](mobile/YAYIN_REHBERI.md).

> API anahtarları ve token'lar `.env` dosyalarında ya da ortam değişkenlerinde durur; repoya hiçbir zaman girmez.

## Eski sürüm

İlk Android (Kotlin / Jetpack Compose) sürümü [`v1-android`](https://github.com/AlimertYasar/sensea/tree/v1-android) dalında duruyor.
