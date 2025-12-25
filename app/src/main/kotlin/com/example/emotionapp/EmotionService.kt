package com.example.emotionapp

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface EmotionService {
    @POST("predict")
    fun getEmotion(@Body request: EmotionRequest): Call<EmotionResponse>
}
