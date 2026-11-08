import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform } from 'react-native';

import { ApiError, type ApiErrorCode, recommend } from './api';
import { useLocale, useT } from './i18n';
import { useStore } from './store';
import type { Entry, Occasion, Style, WardrobeItem } from './types';
import { reportError, track } from './monitoring';
import { buildPrefs } from './prefs';
import { getWeather } from './weather';
import { wardrobePayload } from './wear';

/** Calls the API, stores the result as a journal entry and returns its id. */
export function useGenerate() {
  const t = useT();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);

  async function generate(
    text: string,
    occasion: Occasion,
    styleOverride?: Style | null,
    anchorIds?: string[],
  ): Promise<string | null> {
    const { profile, installId, addEntry, tier, wardrobe, entries } = useStore.getState();
    const clean = text.trim();
    if (!clean) {
      setError(t.emptyText);
      return null;
    }
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const weather = profile.useWeather ? await getWeather(false) : null;
      const anchors = tier === 'plus' ? (anchorIds ?? []).filter((a) => wardrobe.some((w) => w.id === a)) : [];
      const sendWardrobe = tier === 'plus' && (anchors.length > 0 || (profile.useWardrobe && wardrobeReady(wardrobe)));
      const rec = await recommend(
        {
          text: clean,
          style: styleOverride ?? profile.style,
          styles: styleOverride ? [styleOverride] : profile.styles,
          fit: profile.fit,
          occasion,
          locale,
          ...(weather ? { weather } : {}),
          prefs: buildPrefs(entries, profile),
          ...(sendWardrobe ? { wardrobe: wardrobePayload(wardrobe, entries) } : {}),
          ...(anchors.length ? { anchor_ids: anchors } : {}),
        },
        installId,
      );
      const entry: Entry = {
        id: rec.id || Math.random().toString(36).slice(2),
        createdAt: Date.now(),
        text: clean,
        occasion,
        style: styleOverride ?? profile.style,
        weather: weather ?? undefined,
        rec,
        favorite: null,
      };
      addEntry(entry);
      track(anchors.length ? 'anchor_outfit' : 'recommend');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return entry.id;
    } catch (e) {
      const code: ApiErrorCode = e instanceof ApiError ? e.code : 'server';
      setErrorCode(code);
      if (code === 'server') reportError(e);
      setError(
        code === 'network' ? t.errNetwork
        : code === 'rate' ? t.errRate
        : code === 'daily' ? t.errDaily
        : code === 'invalid' ? t.emptyText
        : t.errGeneric,
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { generate, loading, error, errorCode, setError };
}

/** Enough pieces to build a whole outfit from the wardrobe. */
export function wardrobeReady(w: WardrobeItem[]) {
  const has = (slot: string) => w.some((i) => i.slot === slot);
  return has('shoes') && (has('one_piece') || (has('top') && has('bottom')));
}
