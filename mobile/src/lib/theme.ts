import { useColorScheme } from 'react-native';

import { useStore } from './store';

// Sensea design tokens.
// Dark plum night base (kept from v1 for brand continuity), a chalk-lilac "board"
// that outfits are laid on, and emotion colours as the only loud colours.

export type Palette = {
  scheme: 'dark' | 'light';
  bg: string;
  surface: string;
  surfaceHigh: string;
  line: string;
  text: string;
  textDim: string;
  textFaint: string;
  brand: string;
  brandSoft: string;
  board: string; // surface outfits are laid on
  paper: string; // photo frames on the board
  boardInk: string;
  danger: string;
};

// All text colours pass WCAG AA (>= 4.5:1) on bg and surface.
export const DARK: Palette = {
  scheme: 'dark',
  bg: '#191022',
  surface: '#231630',
  surfaceHigh: '#2E1F3E',
  line: '#3B2A4F',
  text: '#F4EFFA',
  textDim: '#B3A2CB',
  textFaint: '#9C8BB3',
  brand: '#7F13EC',
  brandSoft: '#A774FF',
  board: '#2B1E3A',
  paper: '#3B2C4D',
  boardInk: '#2A1B38',
  danger: '#FF8A8E',
};

export const LIGHT: Palette = {
  scheme: 'light',
  bg: '#F7F3FA',
  surface: '#FFFFFF',
  surfaceHigh: '#EFE8F6',
  line: '#E2D8EC',
  text: '#1D1427',
  textDim: '#5B4B6E',
  textFaint: '#6F5F82',
  brand: '#7F13EC',
  brandSoft: '#6A10C7',
  board: '#FFFFFF',
  paper: '#FFFFFF',
  boardInk: '#2A1B38',
  danger: '#B42318',
};

/** Current palette, following Profile > Appearance (dark | light | system). */
export function useColors(): Palette {
  const pref = useStore((s) => s.profile.appearance);
  const system = useColorScheme();
  const scheme = pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;
  return scheme === 'light' ? LIGHT : DARK;
}

/** Theme-aware styles: `const useStyles = makeStyles((C) => StyleSheet.create({ ... }))`. */
export function makeStyles<T>(fn: (c: Palette) => T) {
  const cache = new Map<string, T>();
  return function useStyles(): T {
    const c = useColors();
    let s = cache.get(c.scheme);
    if (s === undefined) {
      s = fn(c);
      cache.set(c.scheme, s);
    }
    return s;
  };
}

export const F = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayMed: 'BricolageGrotesque_500Medium',
  body: 'Figtree_400Regular',
  bodyMed: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

// Type scale (roughly 1.25 ratio from 15)
export const T = {
  hero: { fontFamily: F.display, fontSize: 36, lineHeight: 40, letterSpacing: -0.8 },
  h1: { fontFamily: F.display, fontSize: 29, lineHeight: 33, letterSpacing: -0.5 },
  h2: { fontFamily: F.displayBold, fontSize: 22, lineHeight: 27, letterSpacing: -0.2 },
  h3: { fontFamily: F.displayBold, fontSize: 18, lineHeight: 23 },
  body: { fontFamily: F.body, fontSize: 16, lineHeight: 24 },
  bodySemi: { fontFamily: F.bodySemi, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  smallSemi: { fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20 },
  tiny: { fontFamily: F.bodyMed, fontSize: 12, lineHeight: 16 },
} as const;

export const R = { chip: 999, input: 18, card: 22, board: 26, swatch: 30 } as const;

export const S = { gutter: 20, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;

// ---- colour helpers -------------------------------------------------------
function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function toHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
export const shade = (hex: string, t: number) => mix(hex, '#000000', t);
export const tint = (hex: string, t: number) => mix(hex, '#FFFFFF', t);
export function luminance(hex: string) {
  const [r, g, b] = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const readableOn = (hex: string) => (luminance(hex) > 0.45 ? '#1A1222' : '#FFFFFF');
export const withAlpha = (hex: string, a: number) =>
  `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
