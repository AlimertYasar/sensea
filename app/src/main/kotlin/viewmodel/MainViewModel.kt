package com.example.emotionapp.viewmodel

import android.content.Context
import android.util.Log
import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.emotionapp.*
import com.example.emotionapp.outfits.Outfit
import com.example.emotionapp.outfits.OutfitRepository
import com.example.emotionapp.profile.StyleDataStore
import com.example.emotionapp.profile.StylePreference
import kotlinx.coroutines.launch
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class MainViewModel(private val context: Context) : ViewModel() {

    var inputText by mutableStateOf("")
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var showOutfitPrompt by mutableStateOf(false)

    var persona by mutableStateOf("baris")

    var stylePreference by mutableStateOf(StylePreference.CASUAL)
        private set

    init {
        viewModelScope.launch {
            StyleDataStore.getStyle(context).collect {
                stylePreference = it
            }
        }
    }

    fun updateStyle(newStyle: StylePreference) {
        stylePreference = newStyle

        viewModelScope.launch {
            StyleDataStore.saveStyle(context, newStyle)
        }

        // 🔥 EĞER HALİHAZIRDA BİR DUYGU VARSA
        // 🔥 KOMBİNLERİ YENİ STİLE GÖRE YENİDEN ÜRET
        emotion?.let {
            outfits = OutfitRepository.getOutfitsForEmotionAndStyle(
                it,
                stylePreference
            )
        }
    }

    var dominantEmotion by mutableStateOf<String?>(null)
        private set

    var topEmotions by mutableStateOf<List<EmotionScore>>(emptyList())
        private set

    var emotion by mutableStateOf<String?>(null)
        private set

    var outfits by mutableStateOf<List<Outfit>>(emptyList())

    private val service =
        ApiClient.getClient().create(EmotionService::class.java)

    fun analyze() {
        val text = inputText.trim()
        if (text.isEmpty()) {
            error = "Please enter something."
            return
        }

        loading = true
        error = null
        showOutfitPrompt = false

        service.getEmotion(EmotionRequest(text))
            .enqueue(object : Callback<EmotionResponse> {

                override fun onResponse(
                    call: Call<EmotionResponse>,
                    response: Response<EmotionResponse>
                ) {
                    loading = false
                    val body = response.body()

                    if (!response.isSuccessful || body == null) {
                        error = "API error (${response.code()})"
                        return
                    }

                    if (body.error != null) {
                        error = body.message ?: "Invalid input."
                        dominantEmotion = null
                        topEmotions = emptyList()
                        emotion = null
                        return
                    }

                    dominantEmotion = body.dominant_emotion
                    topEmotions = body.top_emotions
                    emotion = dominantEmotion

                    Log.d("EMOTION_API", "Dominant=$dominantEmotion")
                    topEmotions.forEach {
                        Log.d("EMOTION_API", "${it.label}=${it.score}")
                    }

                    outfits = emptyList()
                    showOutfitPrompt = true
                }

                override fun onFailure(call: Call<EmotionResponse>, t: Throwable) {
                    loading = false
                    error = t.message
                }
            })
    }

    fun generateOutfits() {
        val e = emotion ?: return
        outfits = OutfitRepository.getOutfitsForEmotionAndStyle(e, stylePreference)
    }

    fun resetPrompt() {
        showOutfitPrompt = false
    }

    fun dismissOutfit(outfit: Outfit) {
        outfits = outfits.filterNot { it == outfit }
    }

    fun wearOutfit(outfit: Outfit) {
        outfits = outfits.filterNot { it == outfit }
    }

    fun toggleFavorite(outfit: Outfit) {
        outfits = outfits.map {
            if (it == outfit) it.copy(isFavorite = !it.isFavorite)
            else it
        }
    }
}
