package com.example.emotionapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.emotionapp.profile.StylePreference
import com.example.emotionapp.theme.*
import com.example.emotionapp.viewmodel.MainViewModel

@Composable
fun ProfileScreen(vm: MainViewModel) {

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {

        Spacer(Modifier.height(24.dp))

        Box(
            modifier = Modifier
                .size(96.dp)
                .background(PurpleGlow, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "A",
                fontSize = 36.sp,
                color = TextPrimaryDark
            )
        }

        Spacer(Modifier.height(16.dp))

        Text(
            text = "Alimert",
            color = TextPrimaryDark,
            style = MaterialTheme.typography.titleLarge
        )

        Spacer(Modifier.height(6.dp))

        Text(
            text = "Current Mood: ${vm.dominantEmotion ?: "—"}",
            color = TextGray,
            fontSize = 14.sp
        )

        Spacer(Modifier.height(24.dp))

        Text(
            text = "Persona",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimaryDark
        )

        Spacer(Modifier.height(8.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {

            PersonaChip(
                label = "Ece",
                selected = vm.persona == "ece",
                onClick = { vm.persona = "ece" }
            )

            PersonaChip(
                label = "Barış",
                selected = vm.persona == "baris",
                onClick = { vm.persona = "baris" }
            )
        }

        Spacer(Modifier.height(18.dp))

        StyleSelectionSection(
            selectedStyle = vm.stylePreference,
            onStyleSelected = { vm.updateStyle(it) }
        )

        Spacer(Modifier.height(32.dp))

        Button(
            onClick = { },
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark)
        ) {
            Icon(Icons.Default.Edit, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Edit Profile", color = TextPrimaryDark)
        }
    }
}

@Composable
private fun StyleSelectionSection(
    selectedStyle: StylePreference,
    onStyleSelected: (StylePreference) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {

        Text(
            text = "Style Preference",
            color = TextPrimaryDark,
            style = MaterialTheme.typography.titleMedium
        )

        Spacer(Modifier.height(12.dp))

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            StyleRow(
                styles = listOf(
                    StylePreference.CASUAL,
                    StylePreference.SPORTY,
                    StylePreference.OLD_MONEY
                ),
                selectedStyle = selectedStyle,
                onStyleSelected = onStyleSelected
            )

            StyleRow(
                styles = listOf(
                    StylePreference.CLASSIC,
                    StylePreference.MINIMAL,
                    StylePreference.STREETWEAR
                ),
                selectedStyle = selectedStyle,
                onStyleSelected = onStyleSelected
            )
        }
    }
}

@Composable
private fun StyleRow(
    styles: List<StylePreference>,
    selectedStyle: StylePreference,
    onStyleSelected: (StylePreference) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        styles.forEach { style ->
            StyleChip(
                style = style,
                selected = style == selectedStyle,
                onClick = { onStyleSelected(style) },
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun StyleChip(
    style: StylePreference,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) Primary else ChipDark)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = style.displayName,
            color = if (selected) TextPrimaryLight else TextGray,
            fontSize = 14.sp
        )
    }
}

@Composable
fun PersonaChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (selected) Primary else SurfaceDark
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            color = if (selected) TextPrimaryLight else TextGray,
            fontWeight = FontWeight.Medium
        )
    }
}
