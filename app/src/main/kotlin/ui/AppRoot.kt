package com.example.emotionapp.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.emotionapp.viewmodel.MainViewModel
import com.example.emotionapp.viewmodel.MainViewModelFactory


@OptIn(ExperimentalAnimationApi::class)
@Composable
fun AppRoot() {

    val context = LocalContext.current
    val navController = rememberNavController()

    val vm: MainViewModel = viewModel(
        factory = MainViewModelFactory(context)
    )

    // ✅ Bottom bar'ı signup/welcome/login ekranlarında gizle
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    val showBottomBar = currentRoute !in listOf("signup", "welcome", "login")

    Scaffold(
        bottomBar = {
            if (showBottomBar) BottomTabs(navController)
        }
    ) { padding ->

        NavHost(
            navController = navController,
            startDestination = "signup", // ✅ İŞTE startDestination BURAYA yazılır (NavHost içine)
            modifier = Modifier.padding(padding)
        ) {

            // ✅ SIGNUP (ilk ekran)
            composable(
                route = "signup",
                enterTransition = { fadeIn(tween(250)) },
                exitTransition = { fadeOut(tween(250)) }
            ) {
                SignupScreen(
                    onStart = {
                        // ✅ Signup sonrası WELCOME'e git
                        navController.navigate("welcome") {
                            popUpTo("signup") { inclusive = true } // geriyle signup'a dönmesin
                        }
                    },
                    onLogin = {
                        navController.navigate("login")
                    }
                )
            }

            // ✅ WELCOME (signup sonrası)
            composable(
                route = "welcome",
                enterTransition = { fadeIn(tween(250)) },
                exitTransition = { fadeOut(tween(250)) }
            ) {
                WelcomeScreen(
                    onContinue = {
                        navController.navigate("home") {
                            popUpTo("welcome") { inclusive = true } // geriyle welcome'a dönmesin
                        }
                    }
                )
            }

            // (opsiyonel) LOGIN - şimdilik boş
            composable(
                route = "login",
                enterTransition = { fadeIn(tween(250)) },
                exitTransition = { fadeOut(tween(250)) }
            ) {
                // İstersen sonra gerçek LoginScreen ekleriz
                LoginPlaceholder(
                    onBack = { navController.popBackStack() }
                )
            }

            // ✅ HOME
            composable(
                route = "home",
                enterTransition = { fadeIn(tween(250)) },
                exitTransition = { fadeOut(tween(250)) }
            ) {
                HomeScreen(
                    vm = vm,
                    onGoOutfits = { navController.navigate("outfits") }
                )
            }

            // ✅ OUTFITS
            composable(
                route = "outfits",
                enterTransition = { fadeIn(tween(250)) },
                exitTransition = { fadeOut(tween(250)) }
            ) {
                OutfitsScreen(vm = vm)
            }

            composable("profile") { ProfileScreen(vm = vm) }
            composable("settings") { SettingsScreen(vm = vm) }
        }
    }
}

/** Şimdilik basit placeholder */
@Composable
private fun LoginPlaceholder(onBack: () -> Unit) {
    androidx.compose.material3.Text("Login (sonra yapılacak)")
}
