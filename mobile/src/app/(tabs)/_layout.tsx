import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useT } from '@/lib/i18n';
import { F, useColors } from '@/lib/theme';

export default function TabsLayout() {
  const C = useColors();
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.textFaint,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.line, ...(Platform.OS === 'web' ? { height: 64 } : null) },
        tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: 12 },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t.tabToday, tabBarIcon: ({ color }) => <Feather name="edit-3" size={22} color={color as string} /> }}
      />
      <Tabs.Screen
        name="journal"
        options={{ title: t.tabJournal, tabBarIcon: ({ color }) => <Feather name="calendar" size={22} color={color as string} /> }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{ title: t.tabWardrobe, tabBarIcon: ({ color }) => <Feather name="layers" size={22} color={color as string} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t.tabProfile, tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color as string} /> }}
      />
    </Tabs>
  );
}
