package com.example.emotionapp.outfits

import com.example.emotionapp.profile.StylePreference

object OutfitRepository {

    fun getOutfitsForEmotionAndStyle(
        emotion: String,
        style: StylePreference
    ): List<Outfit> {

        return when (style) {


            StylePreference.CASUAL ->
                casualOutfits(emotion)

            StylePreference.SPORTY ->
                sportyOutfits(emotion)

            StylePreference.OLD_MONEY ->
                oldMoneyOutfits(emotion)

            StylePreference.CLASSIC ->
                classicOutfits(emotion)

            StylePreference.MINIMAL ->
                minimalOutfits(emotion)

            StylePreference.STREETWEAR ->
                streetwearOutfits(emotion)
        }
    }

    /* ---------- CASUAL ---------- */

    private fun casualOutfits(emotion: String): List<Outfit> =
        listOf(
            Outfit(
                title = "Günlük Casual",
                top = "Basic tişört",
                bottom = "Jean",
                shoes = "Sneaker",
                description = "Her ana uygun sade stil."
            )
        )

    /* ---------- SPORTY ---------- */

    private fun sportyOutfits(emotion: String): List<Outfit> =
        listOf(
            Outfit(
                title = "Sportif Stil",
                top = "Dry-fit tişört",
                bottom = "Eşofman altı",
                shoes = "Koşu ayakkabısı",
                description = "Aktif ve enerjik bir görünüm."
            )
        )

    /* ---------- OLD MONEY ---------- */

    private fun oldMoneyOutfits(emotion: String): List<Outfit> =
        listOf(
            Outfit(
                title = "Old Money Şıklığı",
                top = "Polo yaka triko",
                bottom = "Kumaş pantolon",
                shoes = "Loafer",
                description = "Zamansız, sofistike ve net."
            )
        )

    /* ---------- CLASSIC ---------- */

    private fun classicOutfits(emotion: String): List<Outfit> =
        listOf(
            Outfit(
                title = "Classic Stil",
                top = "Beyaz gömlek",
                bottom = "Kumaş pantolon",
                shoes = "Deri ayakkabı",
                description = "Dengeli, sade ve zamansız kombin."
            )
        )

    /* ---------- MINIMAL ---------- */

    private fun minimalOutfits(emotion: String): List<Outfit> =
        listOf(
            Outfit(
                title = "Minimal Stil",
                top = "Düz tişört",
                bottom = "Sade kesim pantolon",
                shoes = "Temiz sneaker",
                description = "Az parça, net çizgiler."
            )
        )

    /* ---------- STREETWEAR ---------- */

    private fun streetwearOutfits(emotion: String): List<Outfit> =
        listOf(
            Outfit(
                title = "Streetwear Stil",
                top = "Oversize hoodie",
                bottom = "Bol kesim pantolon",
                shoes = "Chunky sneaker",
                description = "Rahat, özgür ve trend odaklı."
            )
        )
}