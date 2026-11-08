# Sensea'nın renk motoru: neye dayanıyor, neye dayanmıyor?

Paletler elle seçilmiyor. `app/color_science.py` bunları üç araştırma bulgusundan hesaplıyor. Bu belge iç kullanım içindir; uygulamada kaynakça gösterilmiyor. (API yanıtındaki `color_notes` alanı hâlâ üretiliyor ama uygulama onu kullanmıyor.)

## 1. Ton (hangi renk): kültürler arası duygu–renk ilişkileri

**Jonauskaite ve ark. (2020), Psychological Science 31(10).** 30 ülkeden 4.598 kişi, 12 renk adını 20 duyguyla eşleştirdi. Ülkeler arasındaki ortalama benzerlik r = .88 çıktı, yani ilişkiler büyük ölçüde evrensel. En güçlü eşleşmeler:

| Duygu | Renk |
|---|---|
| Neşe | Sarı, turuncu, pembe |
| Eğlence | Turuncu |
| Hüzün | Siyah, gri |
| Öfke | Kırmızı |
| Korku | Siyah |
| Rahatlama | Beyaz |
| Hayal kırıklığı | Gri |

Gurur ve memnuniyet için güçlü bir evrensel renk bulunamadı. Bu yüzden "Özgüvenli" için aşağıdaki baskınlık kuralı kullanılıyor.

## 2. Doygunluk ve açıklık: uyarılma ve hoşluk

- **Wilms & Oberfeld (2018), Psychological Research 82.** Ton, doygunluk ve parlaklık ayrı ayrı değiştirilip ölçüldü. Bulgular:
  - Algılanan uyarılmayı en güçlü belirleyen özellik doygunluk.
  - Parlaklık arttıkça renkler daha hoş bulunuyor.
  - En hoş bulunan doygunluk düzeyi ortadaki düzey.
  - Tonlar arasında en az uyarıcı olan mavi.
- **Valdez & Mehrabian (1994), J. of Experimental Psychology: General 123(4).** Açıklık hoşluğu artırıyor. Koyu ve doygun renkler daha "baskın" algılanıyor.

## Motor bunları nasıl uyguluyor?

1. Her duygunun yaklaşık bir **hoşluk / uyarılma / baskınlık** konumu var. Bu konumlar Russell'ın (1980) duygu çemberine ve Warriner ve ark.'nın (2013) kelime normlarına göre yaklaşık olarak belirlendi.
2. Kullanıcının duygu karışımı bu değerlerin ağırlıklı ortalamasına çevriliyor. Ardından:
   - **Ton**, baskın duygunun Jonauskaite eşleşmelerinden geliyor.
   - **Doygunluk** uyarılmaya göre ayarlanıyor: `0.25 + 0.65 × uyarılma`.
   - **Açıklık** hoşluğa göre ayarlanıyor. Baskınlık yüksekse renk biraz koyulaşıyor.
   - Kaygıda doygunluk kasıtlı olarak düşük tutuluyor. Amaç yüksek enerjiyi büyütmemek.
3. **Moral yükselt** paleti daha hoş ve orta enerjili bir hedefe yöneliyor:
   - Renkler daha açık ve orta doygunlukta.
   - Öfke ve kaygı gibi yüksek enerjili olumsuz duygularda serin tonlar (mavi, yeşil) kullanılıyor.
   - Hüzün ve yorgunluk gibi düşük enerjili olumsuz duygularda neşe tonları (sarı, turuncu) kullanılıyor.
4. Claude kombini kurarken bu hazır paletleri kullanıyor. Kendi renk hikâyesini uydurmuyor.

## Dürüst sınırlar

- Bu bulgular **ilişki ve değerlendirme** ölçüyor. Yani insanlar kırmızıyı öfkeyle eşleştiriyor, ama kırmızı bir şey görünce öfkelendikleri anlamına gelmiyor. Jonauskaite ve ark. bunu kendileri vurguluyor.
- **Belirli bir rengi giymenin ruh halini değiştirdiği kanıtlanmış değil.** "Moral yükselt" ifadesi bu yüzden bir iddia değil, bir öneri.
- Giysilerin düşünce ve duyguları etkilediğini öne süren "enclothed cognition" alanında kanıtlar karışık. Horton, Adam & Galinsky'nin (2023/2025, PSPB) meta-analizine göre erken çalışmaların tekrarlanabilirliği zayıf, 2015 sonrası çalışmalar ise daha güçlü.
- Bireysel ve kültürel farklar var. Örneğin Mısır'ın küresel örüntüye benzerliği r = .68 ile en düşüktü.
- Duygu koordinatları yaklaşık değerler; ölçülmüş kişisel veriler değil.

Mağaza metinlerinde "bilimsel olarak kanıtlanmış", "terapi", "ruh halini iyileştirir" gibi ifadeler kullanma. Önerilen ifade: **"renk–duygu araştırmalarından ilham alan öneriler"**.

## Kaynaklar

- Jonauskaite, D. ve ark. (2020). Universal patterns in color-emotion associations are further shaped by linguistic and geographic proximity. *Psychological Science, 31*(10). https://doi.org/10.1177/0956797620948810
- Wilms, L. & Oberfeld, D. (2018). Color and emotion: effects of hue, saturation, and brightness. *Psychological Research, 82*, 896–914. https://doi.org/10.1007/s00426-017-0880-8
- Valdez, P. & Mehrabian, A. (1994). Effects of color on emotions. *Journal of Experimental Psychology: General, 123*(4), 394–409. https://pubmed.ncbi.nlm.nih.gov/7996122/
- Horton, C. B., Adam, H. & Galinsky, A. D. (2025). Evaluating the evidence for enclothed cognition: z-curve and meta-analyses. *Personality and Social Psychology Bulletin, 51*(2).
