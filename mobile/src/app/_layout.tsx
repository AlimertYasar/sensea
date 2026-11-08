import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { track, wrapRoot } from '@/lib/monitoring';
import { useLocale } from '@/lib/i18n';
import { listenForTaps, syncReminders } from '@/lib/notifications';
import { initPurchases } from '@/lib/purchases';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});


function RootLayout() {
  const C = useColors();
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.profile.onboarded);
  const ready = fontsLoaded && hydrated;

  const installId = useStore((s) => s.installId);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!hydrated) return;
    initPurchases(installId);
    track('app_open');
  }, [hydrated, installId]);

  // Keep scheduled reminders in line with settings and language (also re-done after app updates).
  const locale = useLocale();
  const reminderOn = useStore((s) => s.profile.reminderOn);
  const reminderHour = useStore((s) => s.profile.reminderHour);
  const reminderMinute = useStore((s) => s.profile.reminderMinute);
  const weeklyOn = useStore((s) => s.profile.weeklyOn);
  useEffect(() => {
    if (!hydrated) return;
    syncReminders({ reminderOn, reminderHour, reminderMinute, weeklyOn, locale });
  }, [hydrated, reminderOn, reminderHour, reminderMinute, weeklyOn, locale]);

  useEffect(() => {
    if (!ready || !onboarded) return;
    return listenForTaps((url) => router.navigate(url as never));
  }, [ready, onboarded]);

  const theme = useMemo(() => {
    const base = C.scheme === 'light' ? DefaultTheme : DarkTheme;
    return { ...base, colors: { ...base.colors, background: C.bg, card: C.bg, primary: C.brandSoft, text: C.text, border: C.line } };
  }, [C]);

  if (!ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={C.scheme === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="result/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="wardrobe/add" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default wrapRoot(RootLayout);
