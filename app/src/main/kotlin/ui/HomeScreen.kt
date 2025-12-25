package com.example.emotionapp.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoFixHigh
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.emotionapp.EmotionScore
import com.example.emotionapp.viewmodel.MainViewModel
import com.example.emotionapp.theme.*

@Composable
fun HomeScreen(
    vm: MainViewModel,
    onGoOutfits: () -> Unit
) {
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
    ) {

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 24.dp)
                .padding(bottom = 120.dp)
        ) {

            /* HEADER */
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {

                Row(verticalAlignment = Alignment.CenterVertically) {

                    Box(modifier = Modifier.size(40.dp)) {

                        Box(
                            modifier = Modifier
                                .matchParentSize()
                                .clip(CircleShape)
                                .background(TextGray.copy(alpha = 0.3f))
                                .border(2.dp, Primary.copy(alpha = 0.3f), CircleShape)
                        )

                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .align(Alignment.BottomEnd)
                                .background(OnlineGreen, CircleShape)
                                .border(2.dp, BackgroundDark, CircleShape)
                        )
                    }

                    Spacer(Modifier.width(12.dp))

                    Text(
                        text = "EmotionApp",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                IconButton(
                    onClick = { },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.08f))
                ) {
                    Icon(
                        imageVector = Icons.Default.History,
                        contentDescription = null,
                        tint = TextGray
                    )
                }
            }

            /* TITLE */
            Text(
                text = "How are you feeling right now?",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = 38.sp,
                color = Color.White
            )

            Spacer(Modifier.height(12.dp))

            Text(
                text = "Describe your mood, and we'll match your style.",
                fontSize = 16.sp,
                color = Color.Gray
            )

            Spacer(Modifier.height(24.dp))

            /* TEXTAREA */
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(SurfaceDark)
                    .padding(20.dp)
            ) {
                BasicTextField(
                    value = vm.inputText,
                    onValueChange = { vm.inputText = it },
                    textStyle = TextStyle(
                        color = Color.White,
                        fontSize = 18.sp,
                        lineHeight = 28.sp
                    ),
                    cursorBrush = SolidColor(Primary),
                    modifier = Modifier.fillMaxSize(),
                    decorationBox = { innerTextField ->
                        if (vm.inputText.isEmpty()) {
                            Text(
                                text = "I'm feeling a bit adventurous but also want to stay cozy...",
                                color = TextGray.copy(alpha = 0.7f),
                                fontSize = 18.sp
                            )
                        }
                        innerTextField()
                    }
                )

                Icon(
                    imageVector = Icons.Default.EditNote,
                    contentDescription = null,
                    tint = Primary.copy(alpha = 0.4f),
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .size(32.dp)
                )
            }

            Spacer(Modifier.height(16.dp))

            /* RESULT (dominant) */
            if (vm.dominantEmotion != null) {
                EmotionResultCard(
                    dominantEmotion = vm.dominantEmotion!!,
                    originalText = vm.inputText
                )
            }

            /* TOP 3 (mutlaka görünecek) */
            if (vm.topEmotions.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                TopEmotionsCard(vm.topEmotions)
            }

            Spacer(Modifier.height(16.dp))

            /* PROMPT */
            AnimatedVisibility(
                visible = vm.showOutfitPrompt,
                enter = fadeIn() + expandVertically()
            ) {
                ElevatedCard(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.elevatedCardColors(containerColor = SurfaceDark),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(16.dp)) {

                        Text(
                            text = "Bu baskın duyguya göre kombin önereyim mi?",
                            color = TextPrimaryDark
                        )

                        Spacer(Modifier.height(12.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {

                            Button(
                                onClick = {
                                    vm.generateOutfits()
                                    vm.resetPrompt()
                                    onGoOutfits()
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary)
                            ) {
                                Text("Evet", color = TextPrimaryDark)
                            }

                            OutlinedButton(
                                onClick = { vm.resetPrompt() },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Hayır", color = TextPrimaryDark)
                            }
                        }
                    }
                }
            }
        }

        /* BOTTOM CTA */
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Transparent,
                            BackgroundDark.copy(alpha = 0.85f),
                            BackgroundDark
                        )
                    )
                )
                .padding(24.dp)
        ) {
            Button(
                onClick = { vm.analyze() },
                enabled = !vm.loading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                if (vm.loading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(22.dp)
                    )
                } else {
                    Icon(Icons.Default.AutoFixHigh, null)
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = "Analiz Et",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun EmotionResultCard(
    dominantEmotion: String,
    originalText: String
) {
    val emoji = when (dominantEmotion.lowercase()) {
        "happy" -> "😊"
        "excited" -> "🔥"
        "sad" -> "😔"
        "angry" -> "😠"
        "calm" -> "😌"
        "anxious" -> "😨"
        "confident" -> "😎"
        else -> "✨"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text("Mood analysis", color = TextGray, fontSize = 11.sp)

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(emoji, fontSize = 22.sp)
                Spacer(Modifier.width(8.dp))
                Text(
                    dominantEmotion.replaceFirstChar { it.uppercase() },
                    fontWeight = FontWeight.Bold,
                    color = TextPrimaryDark
                )
            }

            Text(
                text = "Based on: \"$originalText\"",
                color = TextGray,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun TopEmotionsCard(emotions: List<EmotionScore>) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = SurfaceDark)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = "Top 3 emotions",
                color = TextPrimaryDark,
                fontWeight = FontWeight.Bold
            )

            emotions.take(3).forEach { e ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = e.label.replaceFirstChar { it.uppercase() },
                        color = TextGray
                    )
                    Text(
                        text = "%${(e.score * 100).toInt()}",
                        color = TextPrimaryDark,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
    }
}
