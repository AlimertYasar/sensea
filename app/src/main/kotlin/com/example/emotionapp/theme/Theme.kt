package com.example.emotionapp.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

@Composable
fun EmotionAppTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) {
            darkColorScheme(
                primary = Primary,
                background = BackgroundDark,
                surface = SurfaceDark,
                onPrimary = Color.White,
                onBackground = Color.White,
                onSurface = Color.White
            )
        } else {
            lightColorScheme(
                primary = Primary,
                background = BackgroundLight,
                surface = Color.White,
                onPrimary = Color.White,
                onBackground = TextPrimaryLight,
                onSurface = TextPrimaryLight
            )
        },
        typography = Typography,
        content = content
    )
}
