package com.example.emotionapp.profile

enum class StylePreference(
    val displayName: String,
    val description: String
) {

    CASUAL(
        displayName = "Casual",
        description = "Rahat ve günlük stil"
    ),

    SPORTY(
        displayName = "Sporty",
        description = "Aktif ve enerjik kombinler"
    ),

    OLD_MONEY(
        displayName = "Old Money",
        description = "Zamansız ve şık görünüm"
    ),

    CLASSIC(
        displayName = "Classic",
        description = "Dengeli, sade ve zamansız kombinler"
    ),

    MINIMAL(
        displayName = "Minimal",
        description = "Az parça, temiz ve modern görünüm"
    ),

    STREETWEAR(
        displayName = "Streetwear",
        description = "Rahat, trend odaklı ve özgür stil"
    )
}
