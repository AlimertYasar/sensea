export type EmotionKey = 'happy' | 'excited' | 'calm' | 'confident' | 'tired' | 'sad' | 'anxious' | 'angry';
export type Style = 'casual' | 'sporty' | 'old_money' | 'classic' | 'minimal' | 'streetwear';
export type Fit = 'menswear' | 'womenswear' | 'unisex';
export type Occasion = 'everyday' | 'work' | 'date' | 'sport' | 'night_out' | 'travel';
export type Locale = 'tr' | 'en';
export type Condition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog' | 'storm' | 'wind';
export type Slot = 'top' | 'outer' | 'bottom' | 'one_piece' | 'shoes' | 'accessory';

export interface Weather {
  temp_c: number;
  condition: Condition;
}

export interface OutfitItem {
  slot: Slot;
  type: string;
  name: string;
  color_hex: string;
  color_name: string;
  wardrobe_id?: string | null;
}

export interface Outfit {
  title: string;
  vibe: string;
  items: OutfitItem[];
  why: string;
  tip: string;
}

export type Tier = 'free' | 'premium' | 'plus';
export type Warmth = 'light' | 'medium' | 'warm';

export interface Swatch {
  hex: string;
  name: string;
}

export interface Recommendation {
  id: string;
  source: 'ai' | 'fallback';
  tier?: Tier;
  dominant: EmotionKey;
  intensity: number;
  emotions: { key: EmotionKey; score: number }[];
  mood_summary: string;
  palette: Swatch[];
  lift_palette?: Swatch[];
  color_notes?: string[];
  outfits: Outfit[];
  uses_wardrobe?: boolean;
  wellbeing_concern: boolean;
}

export interface Entry {
  id: string;
  createdAt: number;
  text: string;
  occasion: Occasion;
  style: Style;
  weather?: Weather;
  rec: Recommendation;
  favorite: number | null; // index of favourited outfit
  renders?: Record<number, string>; // outfit index -> local image uri (Premium)
  feedback?: Record<number, 'like' | 'dislike'>;
  worn?: number | null; // index of the outfit the user actually wore
}

export interface WardrobeItem {
  id: string;
  slot: Slot;
  type: string;
  name: string;
  color_hex: string;
  color_name: string;
  warmth: Warmth;
  photoUri: string;
  cutoutUri?: string; // background removed (PNG), used on the outfit board
  createdAt: number;
}
