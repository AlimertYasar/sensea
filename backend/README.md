# Sensea API v2.1

Bu servis, kullanıcının yazdığı metinden duygu karışımını çıkarır ve iki kişiye özel kombin önerir.

- **Renk paletleri araştırmaya dayalı olarak hesaplanır.** Ayrıntılar için `RENK_BILIMI.md` dosyasına bak.
- **Abonelik seviyeleri:** Ücretsiz, Premium ve Premium Plus.

| Özellik | Ücretsiz | Premium | Premium Plus |
|---|---|---|---|
| Kombin önerisi | Günde 5 | Sınırsız (günde 60'a kadar) | Sınırsız (günde 100'e kadar) |
| Renk hikâyesi + kaynaklar | ✓ | ✓ | ✓ |
| Gerçekçi AI fotoğraf | – | Ayda 30 | Ayda 100 |
| Dijital gardırop (fotoğrafla, otomatik tanı) | – | – | Ayda 400 fotoğraf |
| Kombinler kendi kıyafetlerinden | – | – | ✓ |
| AI fotoğraf kendi parçalarınla | – | – | ✓ |

Limitlerin hepsi ortam değişkeniyle değiştirilebilir (`.env.example`).

## Kişiselleştirme

`/v1/recommend` isteğindeki `prefs` alanı iki tür bilgi taşır:

| Tür | Alanlar | Nereden gelir | Nasıl uygulanır |
|---|---|---|---|
| **Kesin kurallar** | `avoid_colors`, `avoid_types` | Profildeki "Hiç önerme" | Son işlemde zorunlu filtre: yasak parçalar çıkarılır, yasak renk ailesindeki tonlar en yakın izinli tona çevrilir, paletler de aynı kurala uyar. |
| **Yumuşak tercihler** | `liked_*`, `disliked_*` | Beğendim, beğenmedim, giydim ve kaydet sinyalleri (cihazda hesaplanır) | Claude'a bilgi olarak verilir; yedek motor beğenilen parçaları tercih eder. |

Renk aileleri 13 tane: siyah, beyaz, gri, bej, kahve, lacivert, kırmızı, turuncu, sarı, yeşil, mavi, mor, pembe. Bunları belirleyen `family_of()` fonksiyonu uygulamadaki `prefs.ts` ile aynı.

## Kullanılan servisler

- **Claude (Anthropic):** Duygu analizi, kombin önerisi ve gardırop fotoğrafı tanıma. Anahtar yoksa kural tabanlı yedek motor devreye girer.
- **fal.ai (FLUX.2 [pro]):** Gerçekçi kombin fotoğrafları. Anahtar yoksa üzerinde "DEMO" yazan bir görsel döner. Premium Plus'ta kullanıcının kendi kıyafet fotoğrafları referans olarak gönderilir.
- **RevenueCat:** Kullanıcının abonelik seviyesini (`premium` / `plus`) sunucu tarafında doğrular.
- **SQLite:** Kullanım sayaçlarını tutar. Yayında kalıcı bir diskte durmalı.

Kullanıcı metni ve fotoğrafları sunucuda saklanmaz ve loglanmaz.

## Yerelde çalıştırma (Windows / PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-dev.txt
$env:SENSEA_DEV_TIERS="1"            # sadece geliştirmede: uygulama Premium/Plus'ı deneyebilsin
$env:ANTHROPIC_API_KEY="sk-ant-..."  # opsiyonel
$env:FAL_KEY="..."                   # opsiyonel
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest -q                            # 24 test
```

## Uç noktalar

| Yöntem | Yol | Seviye | Açıklama |
|---|---|---|---|
| GET | `/health` | – | Hangi motorların açık olduğu |
| GET | `/v1/me` | hepsi | Seviye ve kalan haklar |
| POST | `/v1/recommend` | hepsi | Duygu analizi + 2 kombin. Plus'ta gardıropla (`anchor_ids` ile "bu parçayla kombin", giyilme geçmişiyle rotasyon) |
| POST | `/v1/swap` | hepsi | Kombindeki tek parçayı değiştirir (ücretsiz günde 15, ücretli 300) |
| POST | `/v1/render` | Premium+ | Kombinin gerçekçi fotoğrafı (`data:image/jpeg`) |
| POST | `/v1/wardrobe/tag` | Plus | Kıyafet fotoğrafından tür, ad, renk, kalınlık + arka planı temizlenmiş PNG (`cutout`, FAL_KEY varsa) |
| POST | `/v1/events` | hepsi | Anonim olay sayacı (sadece olay adı + seviye) |
| GET | `/v1/stats` | admin | Günlük olay sayıları (`X-Admin-Key`) |
| GET | `/privacy` | – | Mağazalar için gizlilik politikası |

Her istekte uygulama `X-Install-Id` başlığını gönderir. Bu değer RevenueCat'teki `app_user_id` ile aynıdır, yani sunucu aboneliği hesap gerektirmeden doğrulayabilir.

Hata kodları:

| Kod | Anlamı |
|---|---|
| `429 DAILY_LIMIT` | Ücretsiz günlük hak bitti |
| `402 PREMIUM_REQUIRED` / `PLUS_REQUIRED` | Özellik bu seviyede yok |
| `429 RENDER_LIMIT` / `TAG_LIMIT` | Aylık kota doldu |

## Maliyet tahmini

Fiyatlar değişir; aşağıdakiler kabaca hesaplanmış değerler. Güncel fiyatları sağlayıcı sayfalarından kontrol et.

| İşlem | Yaklaşık maliyet |
|---|---|
| Bir kombin (Claude Haiku) | ~0,005 $ |
| Bir AI fotoğraf (FLUX.2 pro, 768×1024) | ~0,03 $ |
| Bir gardırop etiketi | ~0,003 $ |
| Bir parça değiştirme (Claude Haiku, kısa) | ~0,002 $ |
| Arka plan temizleme (BiRefNet, fal.ai) | düşük; güncel fiyatı fal.ai model sayfasından kontrol et |

En kötü durumda, kotasını tamamen dolduran kullanıcının aylık maliyeti:

- **Premium:** 30 fotoğraf yaklaşık 0,9 $, artı kombinler, toplam ~1,5 $.
- **Plus:** 100 fotoğraf yaklaşık 3 $, artı etiketler, toplam ~4,5 $.

Mağaza komisyonu küçük işletme programında %15. Önerilen fiyatlar Premium için 3,99–4,99 $/ay, Plus için 7,99–9,99 $/ay. Türkiye fiyatlarını mağazada ayrı belirleyebilirsin.

**Anthropic ve fal.ai panellerinde aylık harcama limiti koymayı unutma.**

## Yayına alma (Render)

Reponun kökündeki `render.yaml` dosyası (`rootDir: backend`) Docker servisini ve 1 GB kalıcı diski tanımlar. Kalıcı disk ücretli planda var; ücretsiz planda da çalışır ama her deploy'da kotalar sıfırlanır.

Girmen gereken ortam değişkenleri:

- `ANTHROPIC_API_KEY`
- `FAL_KEY`
- `REVENUECAT_SECRET_KEY`
- `SENSEA_CONTACT_EMAIL`

**Yayında `SENSEA_DEV_TIERS` asla `1` olmamalı.**
