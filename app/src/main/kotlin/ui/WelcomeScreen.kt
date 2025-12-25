package com.example.emotionapp.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.emotionapp.theme.*
import kotlinx.coroutines.delay

@Composable
fun WelcomeScreen(
    onContinue: () -> Unit
) {
    var startAnim by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        delay(200)
        startAnim = true
    }

    val bgGradient = Brush.verticalGradient(
        listOf(
            BackgroundLight,
            BackgroundLight.copy(alpha = 0.95f)
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgGradient),
        contentAlignment = Alignment.Center
    ) {

        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            // 🔥 LOGO
            AnimatedVisibility(
                visible = startAnim,
                enter = slideInVertically(
                    initialOffsetY = { -it },
                    animationSpec = tween(900, easing = FastOutSlowInEasing)
                ) + fadeIn()
            ) {
                Text(
                    text = "EmotionApp",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Primary
                )
            }

            Spacer(Modifier.height(16.dp))

            // ✨ SUBTITLE
            AnimatedVisibility(
                visible = startAnim,
                enter = fadeIn(
                    animationSpec = tween(800, delayMillis = 400)
                ) + scaleIn(
                    initialScale = 0.9f,
                    animationSpec = tween(800, delayMillis = 400)
                )
            ) {
                Text(
                    text = "Duygundan kombine",
                    fontSize = 16.sp,
                    color = TextGray
                )
            }

            Spacer(Modifier.height(48.dp))

            // 🚀 CTA BUTTON
            AnimatedVisibility(
                visible = startAnim,
                enter = scaleIn(
                    animationSpec = spring(
                        dampingRatio = Spring.DampingRatioMediumBouncy
                    )
                ) + fadeIn()
            ) {
                Button(
                    onClick = onContinue,
                    shape = RoundedCornerShape(999.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Primary
                    ),
                    modifier = Modifier
                        .height(52.dp)
                        .padding(horizontal = 32.dp)
                ) {
                    Text(
                        text = "Başlayalım",
                        fontWeight = FontWeight.Bold,
                        color = TextPrimaryLight
                    )
                }
            }
        }
    }
}
