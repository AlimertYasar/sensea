package com.example.emotionapp.ui

import android.graphics.BitmapFactory
import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.emotionapp.outfits.Outfit
import com.example.emotionapp.profile.StylePreference
import com.example.emotionapp.theme.*
import com.example.emotionapp.viewmodel.MainViewModel
import kotlin.math.roundToInt

@Composable
fun OutfitsScreen(vm: MainViewModel) {

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp)
    ) {

        Text(
            text = "Bugünün Kombinleri",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = TextPrimaryDark
        )

        Spacer(Modifier.height(12.dp))

        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(24.dp),
            contentPadding = PaddingValues(bottom = 120.dp)
        ) {
            items(vm.outfits) { outfit ->
                OutfitCard(outfit = outfit, vm = vm)
            }
        }
    }
}

@Composable
fun OutfitCard(
    outfit: Outfit,
    vm: MainViewModel
) {
    var offsetX by remember { mutableStateOf(0f) }

    ElevatedCard(
        modifier = Modifier
            .fillMaxWidth()
            .offset { IntOffset(offsetX.roundToInt(), 0) }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDrag = { change, dragAmount ->
                        change.consume()
                        offsetX += dragAmount.x
                    },
                    onDragEnd = {
                        when {
                            offsetX > 200 -> {
                                vm.wearOutfit(outfit)
                                vm.dismissOutfit(outfit)
                            }
                            offsetX < -200 -> vm.dismissOutfit(outfit)
                            else -> offsetX = 0f
                        }
                    }
                )
            },
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = SurfaceDark)
    ) {
        Column {

            val e = vm.emotion
            if (e != null) {

                val styleKey = when (vm.stylePreference) {
                    StylePreference.CASUAL -> "casual"
                    StylePreference.SPORTY -> "sporty"
                    StylePreference.OLD_MONEY -> "oldmoney"
                    StylePreference.CLASSIC -> "classic"
                    StylePreference.MINIMAL -> "minimal"
                    StylePreference.STREETWEAR -> "streetwear"
                }

                val imageName = "${vm.persona}_${styleKey}_${e}.png"

                AssetImage(
                    imageName = imageName,
                    persona = vm.persona,
                    emotion = e
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    text = outfit.title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimaryDark
                )

                Spacer(Modifier.height(6.dp))

                Text(
                    text = outfit.description,
                    fontSize = 14.sp,
                    color = TextGray
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {

                Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                    IconButton(onClick = { vm.toggleFavorite(outfit) }) {
                        Icon(
                            imageVector =
                                if (outfit.isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                            contentDescription = null,
                            tint = if (outfit.isFavorite) Primary else TextGray
                        )
                    }

                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Share, null, tint = TextGray)
                    }
                }

                Button(
                    onClick = {
                        vm.wearOutfit(outfit)
                        vm.dismissOutfit(outfit)
                    },
                    shape = RoundedCornerShape(999.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Giy", color = TextPrimaryLight)
                }
            }
        }
    }
}

@Composable
fun AssetImage(
    imageName: String,
    persona: String,
    emotion: String
) {
    val context = LocalContext.current

    val bitmap = remember(imageName, persona, emotion) {
        try {
            val personaKey = persona.lowercase()

            val personaFolder =
                if (personaKey == "baris") "examples_baris" else "examples_ece"

            val emotionFolder = "${personaKey}_${emotion.lowercase()}"
            val path = "images/$personaFolder/$emotionFolder/$imageName"

            Log.d("ASSET_IMAGE", "Trying to load: $path")

            context.assets.open(path).use {
                BitmapFactory.decodeStream(it)
            }
        } catch (e: Exception) {
            Log.e("ASSET_IMAGE", "FAILED: $imageName", e)
            null
        }
    }

    bitmap?.let {
        Image(
            bitmap = it.asImageBitmap(),
            contentDescription = null,
            contentScale = ContentScale.FillWidth,
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight()
        )
    }
}
