import type { WardrobePayload } from './api';
import type { Entry, WardrobeItem } from './types';

const DAY = 86400000;

export interface WearStat {
  count: number;
  lastWornAt: number | null;
}

/** How often and when each wardrobe piece was worn, from outfits marked "I wore this". */
export function wearStats(entries: Entry[]): Record<string, WearStat> {
  const out: Record<string, WearStat> = {};
  for (const e of entries) {
    if (e.worn === null || e.worn === undefined) continue;
    const o = e.rec.outfits[e.worn];
    if (!o) continue;
    for (const it of o.items) {
      if (!it.wardrobe_id) continue;
      const s = (out[it.wardrobe_id] ??= { count: 0, lastWornAt: null });
      s.count += 1;
      s.lastWornAt = Math.max(s.lastWornAt ?? 0, e.createdAt);
    }
  }
  return out;
}

export function daysSince(ts: number | null, now = Date.now()) {
  return ts === null ? null : Math.max(0, Math.floor((now - ts) / DAY));
}

/** Pieces that deserve a comeback: not worn for 30+ days, or never worn and added 14+ days ago. */
export function forgotten(wardrobe: WardrobeItem[], stats: Record<string, WearStat>, now = Date.now()) {
  return wardrobe
    .filter((w) => {
      const s = stats[w.id];
      if (s?.lastWornAt) return now - s.lastWornAt >= 30 * DAY;
      return now - w.createdAt >= 14 * DAY;
    })
    .sort((a, b) => (stats[a.id]?.lastWornAt ?? a.createdAt) - (stats[b.id]?.lastWornAt ?? b.createdAt));
}

/** The API accepts at most this many pieces per request. */
export const MAX_WARDROBE_SENT = 250;

/**
 * Wardrobe as the API expects it, including wear history so the AI rotates pieces.
 * Big wardrobes are trimmed to MAX_WARDROBE_SENT: anchored pieces first, then the ones
 * not worn for the longest time (never worn counts as longest), so rotation still works.
 */
export function wardrobePayload(wardrobe: WardrobeItem[], entries: Entry[], keep: string[] = []): WardrobePayload[] {
  const stats = wearStats(entries);
  const all = wardrobe.map(({ id, slot, type, name, color_hex, color_name, warmth }) => ({
    id,
    slot,
    type,
    name: name.slice(0, 60),
    color_hex,
    color_name: (color_name || '').slice(0, 30),
    warmth,
    days_since_worn: daysSince(stats[id]?.lastWornAt ?? null),
    wear_count: stats[id]?.count ?? 0,
  }));
  if (all.length <= MAX_WARDROBE_SENT) return all;
  const rank = (w: WardrobePayload) => (keep.includes(w.id) ? Infinity : (w.days_since_worn ?? 1e6));
  return [...all].sort((a, b) => rank(b) - rank(a)).slice(0, MAX_WARDROBE_SENT);
}
