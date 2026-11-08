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

/** Wardrobe as the API expects it, including wear history so the AI rotates pieces. */
export function wardrobePayload(wardrobe: WardrobeItem[], entries: Entry[]): WardrobePayload[] {
  const stats = wearStats(entries);
  return wardrobe.map(({ id, slot, type, name, color_hex, color_name, warmth }) => ({
    id,
    slot,
    type,
    name,
    color_hex,
    color_name,
    warmth,
    days_since_worn: daysSince(stats[id]?.lastWornAt ?? null),
    wear_count: stats[id]?.count ?? 0,
  }));
}
