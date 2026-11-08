import type { Profile } from './store';
import type { Entry } from './types';

// Colour families users think in ("I never wear orange"). Mirrors family_of() in the
// backend (app/color_science.py) so both sides classify colours identically.
export const FAMILIES = [
  'black', 'white', 'grey', 'beige', 'brown', 'navy', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink',
] as const;
export type Family = (typeof FAMILIES)[number];

export const FAMILY_SWATCH: Record<Family, string> = {
  black: '#1C1C22', white: '#F4F2EE', grey: '#9A9AA0', beige: '#D8C7A8', brown: '#6B4A34', navy: '#1F2A44',
  red: '#C8323C', orange: '#E8742C', yellow: '#F2C230', green: '#3E8E5E', blue: '#3A6FD8', purple: '#7B4FC9', pink: '#E89AB5',
};

function hls(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, l, 0];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue *= 60;
  return [hue, l, s];
}

export function familyOf(hex: string): Family {
  const [h, l, s] = hls(hex);
  if (l < 0.16) return 'black';
  if (l > 0.9 && s < 0.35) return 'white';
  if (s < 0.12) return 'grey';
  if (h >= 18 && h <= 55 && s < 0.45 && l > 0.6) return 'beige';
  if (h >= 10 && h <= 45 && l < 0.42) return 'brown';
  if (h >= 200 && h <= 250 && l < 0.3) return 'navy';
  if (h < 15 || h >= 345) return 'red';
  if (h < 40) return 'orange';
  if (h < 70) return 'yellow';
  if (h < 170) return 'green';
  if (h < 250) return 'blue';
  if (h < 300) return 'purple';
  return 'pink';
}

const top = (m: Map<string, number>, n: number, min = 1.5) =>
  [...m.entries()].filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

/** Hard constraints from the profile + soft taste learned from likes, dislikes and worn outfits. */
export function buildPrefs(entries: Entry[], profile: Profile) {
  const colorScore = new Map<string, number>();
  const typeScore = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  for (const e of entries.slice(0, 80)) {
    const signals: [number, number][] = [];
    for (const [idx, v] of Object.entries(e.feedback ?? {})) signals.push([Number(idx), v === 'like' ? 1 : -1]);
    if (e.worn != null) signals.push([e.worn, 1.5]);
    if (e.favorite != null) signals.push([e.favorite, 0.5]);
    for (const [idx, w] of signals) {
      for (const it of e.rec.outfits[idx]?.items ?? []) {
        bump(colorScore, familyOf(it.color_hex), w);
        bump(typeScore, it.type, w);
      }
    }
  }
  const neg = (m: Map<string, number>) => new Map([...m].map(([k, v]) => [k, -v]));
  return {
    avoid_colors: profile.avoidColors,
    avoid_types: profile.avoidTypes,
    liked_colors: top(colorScore, 4),
    disliked_colors: top(neg(colorScore), 4),
    liked_types: top(typeScore, 6),
    disliked_types: top(neg(typeScore), 6),
  };
}
