import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Locale } from './types';

// Local notifications only: scheduled on the phone, nothing goes through a server.
const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const TEXT = {
  tr: {
    morningTitle: 'Bugün nasıl hissediyorsun?',
    morningBody: [
      'Birkaç kelime yaz, renklerini birlikte bulalım.',
      'Güne nasıl başladın? Kombinin hazır olsun.',
      'Ruh haline uyan renkler seni bekliyor.',
    ],
    weeklyTitle: 'Haftalık duygu özetin hazır',
    weeklyBody: 'Bu hafta en çok ne hissettin, hangi renkleri giydin? Bir bak.',
  },
  en: {
    morningTitle: 'How are you feeling today?',
    morningBody: [
      'Write a few words and we will find your colours.',
      'How did your day start? Let your outfit match it.',
      'Colours that fit your mood are waiting.',
    ],
    weeklyTitle: 'Your weekly mood summary is ready',
    weeklyBody: 'What did you feel most this week, and which colours did you wear? Take a look.',
  },
};

export async function ensurePermission(): Promise<boolean> {
  if (isWeb) return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export interface ReminderSettings {
  reminderOn: boolean;
  reminderHour: number;
  reminderMinute: number;
  weeklyOn: boolean;
  locale: Locale;
}

/** Re-create all scheduled reminders from the current settings (idempotent). */
export async function syncReminders(s: ReminderSettings) {
  if (isWeb) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!s.reminderOn && !s.weeklyOn) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: s.locale === 'tr' ? 'Hatırlatmalar' : 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const L = TEXT[s.locale];
    if (s.reminderOn) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: L.morningTitle,
          body: L.morningBody[new Date().getDate() % L.morningBody.length],
          data: { url: '/' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: s.reminderHour,
          minute: s.reminderMinute,
          channelId: 'reminders',
        },
      });
    }
    if (s.weeklyOn) {
      await Notifications.scheduleNotificationAsync({
        content: { title: L.weeklyTitle, body: L.weeklyBody, data: { url: '/journal' } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: 1, // Sunday
          hour: 19,
          minute: 0,
          channelId: 'reminders',
        },
      });
    }
  } catch {
    // Expo Go on some platforms or missing permission: reminders are best-effort
  }
}

/** Open the screen a tapped notification points to. Returns an unsubscribe function. */
export function listenForTaps(open: (url: string) => void) {
  if (isWeb) return () => {};
  const handle = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
