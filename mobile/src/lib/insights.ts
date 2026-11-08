import { EMOTIONS } from './catalog';
import { type Family, familyOf } from './prefs';
import type { EmotionKey, Entry } from './types';

const DAY = 86400000;
const POSITIVE: EmotionKey[] = ['happy', 'excited', 'calm', 'confident'];

export interface WeekSummary {
  start: number; // Monday 00:00
  end: number;
  readings: number;
  days: number; // distinct days with a reading
  worn: number;
  mix: { key: EmotionKey; share: number }[]; // averaged emotion shares, sorted
  top: EmotionKey | null;
  positive: number; // 0..1 share of pleasant emotions
  colors: Family[]; // most worn / chosen colour families
}

export function weekStart(offsetWeeks = 0, now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - offsetWeeks * 7);
  return d.getTime();
}

export function summarizeWeek(entries: Entry[], offsetWeeks = 0, now = new Date()): WeekSummary {
  const start = weekStart(offsetWeeks, now);
  const end = start + 7 * DAY;
  const list = entries.filter((e) => e.createdAt >= start && e.createdAt < end);
  const sums = Object.fromEntries(EMOTIONS.map((k) => [k, 0])) as Record<EmotionKey, number>;
  for (const e of list) for (const x of e.rec.emotions) sums[x.key] = (sums[x.key] ?? 0) + x.score;
  const n = Math.max(1, list.length);
  const mix = EMOTIONS.map((key) => ({ key, share: sums[key] / n }))
    .filter((m) => m.share > 0)
    .sort((a, b) => b.share - a.share);

  // Colours: what was actually worn first, then hearted/liked, then the in-tune outfit.
  const fam = new Map<Family, number>();
  for (const e of list) {
    const idx = e.worn ?? e.favorite ?? Number(Object.keys(e.feedback ?? {}).find((k) => e.feedback?.[Number(k)] === 'like') ?? 0);
    const weight = e.worn !== null && e.worn !== undefined ? 3 : e.favorite !== null ? 2 : 1;
    for (const it of e.rec.outfits[idx]?.items ?? []) {
      if (it.slot === 'accessory') continue;
      const f = familyOf(it.color_hex);
      fam.set(f, (fam.get(f) ?? 0) + weight);
    }
  }
  const colors = [...fam.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f]) => f);

  return {
    start,
    end,
    readings: list.length,
    days: new Set(list.map((e) => new Date(e.createdAt).toDateString())).size,
    worn: list.filter((e) => e.worn !== null && e.worn !== undefined).length,
    mix,
    top: mix[0]?.key ?? null,
    positive: list.length ? POSITIVE.reduce((a, k) => a + sums[k], 0) / n : 0,
    colors,
  };
}
