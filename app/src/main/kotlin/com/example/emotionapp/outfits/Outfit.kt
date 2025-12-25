package com.example.emotionapp.outfits

import java.util.UUID

data class Outfit(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String,
    val top: String,
    val bottom: String,
    val shoes: String,
    var isFavorite: Boolean = false,
    var isWorn: Boolean = false,
    var matchScore: Int = 0
)
