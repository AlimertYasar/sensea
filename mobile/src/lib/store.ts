import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Entry, Fit, Locale, OutfitItem, Style, Tier, WardrobeItem } from './types';

export interface Profile {
  name: string;
  style: Style; // lead style (= styles[0]), kept for older code paths
  styles: Style[]; // 1–3 styles to blend
  fit: Fit;
  locale: Locale | null; // null = follow device
  useWeather: boolean;
  useWardrobe: boolean; // Premium Plus: build outfits from my clothes
  appearance: 'dark' | 'light' | 'system';
  avoidColors: string[]; // colour families never to suggest
  avoidTypes: string[]; // garment types never to suggest
  reminderOn: boolean; // daily "how do you feel?" notification
  reminderHour: number;
  reminderMinute: number;
  weeklyOn: boolean; // Sunday evening weekly summary notification
  onboarded: boolean;
}

interface State {
  installId: string;
  profile: Profile;
  entries: Entry[];
  wardrobe: WardrobeItem[];
  tier: Tier; // cached; the server always re-checks
  hydrated: boolean;
  setProfile: (p: Partial<Profile>) => void;
  setTier: (t: Tier) => void;
  addEntry: (e: Entry) => void;
  toggleFavorite: (id: string, outfitIndex: number) => void;
  setRender: (id: string, outfitIndex: number, uri: string) => void;
  setFeedback: (id: string, outfitIndex: number, v: 'like' | 'dislike' | null) => void;
  setWorn: (id: string, outfitIndex: number) => void;
  replaceItem: (id: string, outfitIndex: number, itemIndex: number, item: OutfitItem) => void;
  clearHistory: () => void;
  addWardrobeItem: (w: WardrobeItem) => void;
  updateWardrobeItem: (id: string, patch: Partial<WardrobeItem>) => void;
  removeWardrobeItem: (id: string) => void;
}

const MAX_ENTRIES = 300;

const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useStore = create<State>()(
  persist(
    (set) => ({
      installId: randomId(),
      profile: {
        name: '',
        style: 'casual',
        styles: ['casual'],
        fit: 'unisex',
        locale: null,
        useWeather: false,
        useWardrobe: true,
        appearance: 'dark',
        avoidColors: [],
        avoidTypes: [],
        reminderOn: false,
        reminderHour: 8,
        reminderMinute: 0,
        weeklyOn: false,
        onboarded: false,
      },
      entries: [],
      wardrobe: [],
      tier: 'free',
      hydrated: false,
      setProfile: (p) =>
        set((s) => {
          const next = { ...s.profile, ...p };
          if (p.styles?.length) next.style = p.styles[0];
          else if (p.style) next.styles = [p.style];
          return { profile: next };
        }),
      setTier: (tier) => set({ tier }),
      addEntry: (e) => set((s) => ({ entries: [e, ...s.entries].slice(0, MAX_ENTRIES) })),
      toggleFavorite: (id, idx) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, favorite: e.favorite === idx ? null : idx } : e)),
        })),
      setRender: (id, idx, uri) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, renders: { ...(e.renders ?? {}), [idx]: uri } } : e)),
        })),
      setFeedback: (id, idx, v) =>
        set((s) => ({
          entries: s.entries.map((e) => {
            if (e.id !== id) return e;
            const fb = { ...(e.feedback ?? {}) };
            if (v) fb[idx] = v;
            else delete fb[idx];
            return { ...e, feedback: fb };
          }),
        })),
      setWorn: (id, idx) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, worn: e.worn === idx ? null : idx } : e)) })),
      replaceItem: (id, oi, ii, item) =>
        set((s) => ({
          entries: s.entries.map((e) => {
            if (e.id !== id) return e;
            const outfits = e.rec.outfits.map((o, i) =>
              i === oi ? { ...o, items: o.items.map((it, j) => (j === ii ? item : it)) } : o,
            );
            const renders = { ...(e.renders ?? {}) };
            delete renders[oi]; // the photo no longer matches the outfit
            return { ...e, rec: { ...e.rec, outfits, uses_wardrobe: outfits.some((o) => o.items.some((x) => x.wardrobe_id)) }, renders };
          }),
        })),
      clearHistory: () => set({ entries: [] }),
      addWardrobeItem: (w) => set((s) => ({ wardrobe: [w, ...s.wardrobe] })),
      updateWardrobeItem: (id, patch) =>
        set((s) => ({ wardrobe: s.wardrobe.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      removeWardrobeItem: (id) => set((s) => ({ wardrobe: s.wardrobe.filter((w) => w.id !== id) })),
    }),
    {
      name: 'sensea-v2',
      version: 6,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ installId, profile, entries, wardrobe, tier }) => ({ installId, profile, entries, wardrobe, tier }),
      migrate: (persisted: any) => ({
        ...persisted,
        wardrobe: persisted?.wardrobe ?? [],
        tier: persisted?.tier ?? 'free',
        profile: {
          useWardrobe: true,
          appearance: 'dark',
          avoidColors: [],
          avoidTypes: [],
          reminderOn: false,
          reminderHour: 8,
          reminderMinute: 0,
          weeklyOn: false,
          ...(persisted?.profile ?? {}),
          styles: persisted?.profile?.styles ?? [persisted?.profile?.style ?? 'casual'],
        },
      }),
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

export const newId = randomId;
