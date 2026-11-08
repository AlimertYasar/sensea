import * as Sentry from '@sentry/react-native';

import { API_URL, DEV_TIER } from './api';
import { useStore } from './store';

// Crash reporting (Sentry) + anonymous product analytics (our own backend counters).
// Both are privacy-first: no user text, photos or identifiers are ever attached.

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const sentryEnabled = !!DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeBreadcrumb: (b) => (b.category === 'console' || b.category === 'xhr' || b.category === 'fetch' ? null : b),
    beforeSend: (event) => {
      delete event.request; // never ship request bodies (could contain the user's text)
      delete event.user;
      return event;
    },
  });
}

export const wrapRoot = <P extends Record<string, unknown>>(C: React.ComponentType<P>) => (DSN ? Sentry.wrap(C) : C);

export function reportError(e: unknown) {
  if (DSN) Sentry.captureException(e);
}

export type EventName =
  | 'app_open' | 'onboarding_done' | 'recommend' | 'result_view' | 'outfit_like' | 'outfit_dislike' | 'outfit_worn'
  | 'outfit_saved' | 'share_card' | 'render' | 'paywall_view' | 'purchase_start' | 'purchase_done' | 'wardrobe_add'
  | 'prefs_changed' | 'error' | 'swap' | 'reminder_on' | 'weekly_view' | 'anchor_outfit';

/** Fire-and-forget anonymous counter: only the event name (and tier, added server-side) is stored. */
export function track(name: EventName) {
  const { installId } = useStore.getState();
  fetch(`${API_URL}/v1/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Install-Id': installId,
      ...(process.env.EXPO_PUBLIC_APP_KEY ? { 'X-Sensea-Key': process.env.EXPO_PUBLIC_APP_KEY } : {}),
      ...(DEV_TIER ? { 'X-Dev-Tier': DEV_TIER } : {}),
    },
    body: JSON.stringify({ name }),
  }).catch(() => {});
}
