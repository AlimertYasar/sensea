package com.example.emotionapp.profile

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("user_prefs")

object StyleDataStore {

    private val STYLE_KEY = stringPreferencesKey("style_preference")

    fun getStyle(context: Context) =
        context.dataStore.data.map { prefs ->
            StylePreference.valueOf(
                prefs[STYLE_KEY] ?: StylePreference.CASUAL.name
            )
        }

    suspend fun saveStyle(context: Context, style: StylePreference) {
        context.dataStore.edit { prefs ->
            prefs[STYLE_KEY] = style.name
        }
    }
}
