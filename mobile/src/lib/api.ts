import { Platform } from 'react-native';

import type {
  Fit,
  Locale,
  Occasion,
  Outfit,
  OutfitItem,
  Recommendation,
  Slot,
  Style,
  Tier,
  Warmth,
  Weather,
} from './types';

// Set EXPO_PUBLIC_API_URL in .env (see .env.example). For the Android emulator with
// a local backend use http://10.0.2.2:8000, for a real phone use your PC's LAN IP.
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL).replace(/\/$/, '');
const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY;
// Development only: lets you test Premium/Plus before store products exist.
// Works only if the backend runs with SENSEA_DEV_TIERS=1. Never set this in production builds.
export const DEV_TIER = (process.env.EXPO_PUBLIC_DEV_TIER || '') as Tier | '';

export type ApiErrorCode = 'network' | 'rate' | 'daily' | 'quota' | 'premium' | 'plus' | 'invalid' | 'not_garment' | 'server';

export class ApiError extends Error {
  constructor(public code: ApiErrorCode) {
    super(code);
  }
}

async function call<T>(path: string, installId: string, body?: unknown, timeoutMs = 45000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Install-Id': installId,
        ...(APP_KEY ? { 'X-Sensea-Key': APP_KEY } : {}),
        ...(DEV_TIER ? { 'X-Dev-Tier': DEV_TIER } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('network');
  } finally {
    clearTimeout(timer);
  }
  if (res.ok) return (await res.json()) as T;
  let detail = '';
  try {
    detail = (await res.json()).detail ?? '';
  } catch {}
  if (res.status === 429) throw new ApiError(detail === 'DAILY_LIMIT' ? 'daily' : detail.endsWith('_LIMIT') ? 'quota' : 'rate');
  if (res.status === 402) throw new ApiError(detail === 'PLUS_REQUIRED' ? 'plus' : 'premium');
  if (res.status === 422) throw new ApiError(detail === 'NOT_A_GARMENT' ? 'not_garment' : 'invalid');
  throw new ApiError('server');
}

export interface WardrobePayload {
  id: string;
  slot: Slot;
  type: string;
  name: string;
  color_hex: string;
  color_name: string;
  warmth: Warmth;
  days_since_worn?: number | null;
  wear_count?: number;
}

export type Prefs = {
  avoid_colors: string[];
  avoid_types: string[];
  liked_colors: string[];
  disliked_colors: string[];
  liked_types: string[];
  disliked_types: string[];
};

export interface RecommendInput {
  text: string;
  style: Style;
  styles?: Style[];
  fit: Fit;
  occasion: Occasion;
  locale: Locale;
  weather?: Weather;
  wardrobe?: WardrobePayload[];
  anchor_ids?: string[];
  prefs?: Prefs;
}

export const recommend = (input: RecommendInput, installId: string) =>
  call<Recommendation>('/v1/recommend', installId, input);

export interface RenderInput {
  outfit: Outfit;
  fit: Fit;
  dominant: string;
  locale: Locale;
  refs?: { wardrobe_id: string; image_b64: string }[];
}

export const renderOutfit = (input: RenderInput, installId: string) =>
  call<{ image: string; provider: string; remaining: number }>('/v1/render', installId, input, 150000);

export interface TagResult {
  slot: Slot;
  type: string;
  name: string;
  color_hex: string;
  color_name: string;
  warmth: Warmth;
  needs_review: boolean;
  cutout?: string | null; // PNG data URI with the background removed
}

export const tagGarment = (image_b64: string, locale: Locale, installId: string) =>
  call<TagResult>('/v1/wardrobe/tag', installId, { image_b64, locale }, 60000);

export interface SwapInput {
  outfit: Outfit;
  index: number;
  dominant: string;
  palette: { hex: string; name: string }[];
  style: Style;
  styles?: Style[];
  fit: Fit;
  occasion: Occasion;
  locale: Locale;
  weather?: Weather;
  prefs?: Prefs;
  wardrobe?: WardrobePayload[];
  seed: number;
}

export const swapPiece = (input: SwapInput, installId: string) =>
  call<{ item: OutfitItem }>('/v1/swap', installId, input, 30000);

export const getMe = (installId: string) =>
  call<{ tier: Tier; daily_left: number | null; renders_left: number; tags_left: number }>('/v1/me', installId);
