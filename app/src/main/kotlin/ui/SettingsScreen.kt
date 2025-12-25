package com.example.emotionapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help // YENİ IMPORT
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.OpenInNew
// import androidx.compose.material.icons.filled.Help <-- BU SİLİNDİ
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.emotionapp.theme.*
import com.example.emotionapp.viewmodel.MainViewModel

@Composable
fun SettingsScreen(vm: MainViewModel) {

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp)
    ) {

        Text(
            text = "Settings",
            color = TextPrimaryDark,
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(8.dp)
        )

        Spacer(Modifier.height(16.dp))

        SettingsGroup("Preferences") {
            SettingsItem(Icons.Default.Notifications, "Notifications")
            SettingsItem(Icons.Default.Palette, "Style Profile")
            SettingsItem(Icons.Default.Lock, "Privacy & Security")
        }

        Spacer(Modifier.height(20.dp))

        SettingsGroup("Support") {
            // DÜZELTME BURADA YAPILDI: Icons.AutoMirrored.Filled.Help
            SettingsItem(Icons.AutoMirrored.Filled.Help, "Help Center", external = true)
            SettingsItem(Icons.Default.Info, "About")
        }

        Spacer(Modifier.height(32.dp))

        Button(
            onClick = { },
            colors = ButtonDefaults.buttonColors(
                containerColor = SurfaceDark
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            Spacer(Modifier.width(8.dp))
            Text("Log Out", color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(24.dp))

        Text(
            text = "EmotionApp v1.0.0",
            color = TextGray,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
    }
}

/* ---------- HELPERS ---------- */

@Composable
fun SettingsGroup(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Text(
        text = title.uppercase(),
        color = TextGray,
        modifier = Modifier.padding(start = 8.dp, bottom = 6.dp)
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SurfaceDark, RoundedCornerShape(18.dp))
    ) {
        content()
    }
}

@Composable
fun SettingsItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    external: Boolean = false
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {

        Icon(icon, contentDescription = null, tint = Primary)

        Spacer(Modifier.width(12.dp))

        Text(
            title,
            color = TextPrimaryDark,
            modifier = Modifier.weight(1f)
        )

        Icon(
            if (external) Icons.AutoMirrored.Filled.OpenInNew else Icons.AutoMirrored.Filled.OpenInNew,
            contentDescription = null,
            tint = TextGray
        )
    }

    HorizontalDivider(color = TextGray.copy(alpha = 0.15f))
}