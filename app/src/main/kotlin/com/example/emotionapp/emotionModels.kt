package com.example.emotionapp

data class EmotionRequest(
    val text: String
)

data class EmotionScore(
    val label: String,
    val score: Float
)

data class EmotionResponse(
    val dominant_emotion: String? = null,
    val top_emotions: List<EmotionScore> = emptyList(),

    // invalid / error durumları
    val error: String? = null,
    val message: String? = null
)
