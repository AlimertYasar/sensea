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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.clickable
import com.example.emotionapp.theme.*

@Composable
fun SignupScreen(
    onStart: () -> Unit,
    onLogin: () -> Unit
) {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        visible = true
    }

    // 🌈 Background glow
    val background = Brush.verticalGradient(
        listOf(
            BackgroundLight,
            BackgroundLight.copy(alpha = 0.95f)
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(background)
    ) {

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            Spacer(Modifier.height(24.dp))

            // 🔮 LOGO
            AnimatedVisibility(
                visible = visible,
                enter = slideInVertically(
                    initialOffsetY = { -it },
                    animationSpec = tween(900, easing = FastOutSlowInEasing)
                ) + fadeIn()
            ) {
                Text(
                    text = "EmotionApp",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = PurplePrimary
                )
            }

            Spacer(Modifier.height(48.dp))

            // 🖼 MOCK CARDS (visual blocks)
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn(tween(1000)) + scaleIn(initialScale = 0.9f)
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    CardMock(height = 180.dp)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        CardMock(Modifier.weight(1f))
                        CardMock(Modifier.weight(1f))
                    }
                }
            }

            Spacer(Modifier.height(48.dp))

            // 📝 TITLE
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn(tween(1000, delayMillis = 300))
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Let your feelings",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimaryLight,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = "dictate your fashion.",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = PurplePrimary,
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Text(
                text = "EmotionApp analyzes your text to curate outfits that express your inner self perfectly.",
                color = TextPrimaryLight,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(Modifier.height(32.dp))

            // 🚀 CTA
            AnimatedVisibility(
                visible = visible,
                enter = scaleIn(
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
                ) + fadeIn()
            ) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {

                    Button(
                        onClick = onStart,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PurplePrimary
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                    ) {
                        Text(
                            text = "Start Your Journey →",
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    Text(
                        text = "I already have an account",
                        color = TextGray,
                        modifier = Modifier.clickable { onLogin() }
                    )
                }
            }
        }
    }
}

@Composable
private fun CardMock(
    modifier: Modifier = Modifier,
    height: Dp = 140.dp
) {
    Box(
        modifier = modifier
            .height(height)
            .background(
                brush = Brush.verticalGradient(
                    listOf(
                        PurplePrimary.copy(alpha = 0.6f),
                        PurplePrimary.copy(alpha = 0.2f)
                    )
                ),
                shape = RoundedCornerShape(20.dp)
            )
    )
}
