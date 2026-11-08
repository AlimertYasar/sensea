import type { EmotionKey, Fit, Occasion, Slot, Style } from './types';

export const EMOTIONS: EmotionKey[] = ['happy', 'excited', 'calm', 'confident', 'tired', 'sad', 'anxious', 'angry'];

// Emotion -> signature colour, from cross-cultural colour–emotion associations
// (Jonauskaite et al., 2020): joy-yellow, amusement-orange, relief-white/light,
// sadness-grey, fear-black/dark, anger-red. Pride has no universal colour, so a dark
// saturated tone (dominance; Valdez & Mehrabian, 1994) is used. Saturation follows
// arousal, lightness follows valence (Wilms & Oberfeld, 2018).
export const EMOTION_COLOR: Record<EmotionKey, string> = {
  happy: '#FFC93C',
  excited: '#FF7A2F',
  calm: '#A9D3E6',
  confident: '#4F46E5',
  tired: '#A39FB0',
  sad: '#6B7690',
  anxious: '#5A5470',
  angry: '#E03131',
};

export const GARMENT_SLOTS: Record<string, Slot> = {
  tshirt: 'top', longsleeve: 'top', shirt: 'top', polo: 'top', blouse: 'top', tank: 'top', knit: 'top', hoodie: 'top',
  cardigan: 'outer', jacket: 'outer', blazer: 'outer', coat: 'outer', puffer: 'outer',
  jeans: 'bottom', trousers: 'bottom', shorts: 'bottom', skirt: 'bottom', joggers: 'bottom',
  dress: 'one_piece',
  sneakers: 'shoes', boots: 'shoes', loafers: 'shoes', heels: 'shoes', sandals: 'shoes',
  bag: 'accessory', cap: 'accessory', beanie: 'accessory', scarf: 'accessory', watch: 'accessory',
  sunglasses: 'accessory', belt: 'accessory', necklace: 'accessory',
};

export const STYLES: Style[] = ['casual', 'sporty', 'old_money', 'classic', 'minimal', 'streetwear'];
export const FITS: Fit[] = ['womenswear', 'menswear', 'unisex'];
export const OCCASIONS: Occasion[] = ['everyday', 'work', 'date', 'sport', 'night_out', 'travel'];

// Signature garment + palette shown on each style card
export const STYLE_PREVIEW: Record<Style, { garments: string[]; colors: string[] }> = {
  casual: { garments: ['tshirt', 'jeans', 'sneakers'], colors: ['#F2E8D5', '#5A7BA6', '#FFFFFF'] },
  sporty: { garments: ['hoodie', 'joggers', 'sneakers'], colors: ['#3F4A5A', '#20242C', '#E9F0F5'] },
  old_money: { garments: ['polo', 'trousers', 'loafers'], colors: ['#F3EDE2', '#C9B79C', '#7A4E2D'] },
  classic: { garments: ['blazer', 'trousers', 'loafers'], colors: ['#24304A', '#5C6370', '#2B1D14'] },
  minimal: { garments: ['tshirt', 'trousers', 'sneakers'], colors: ['#EDEDED', '#1F1F1F', '#F7F7F7'] },
  streetwear: { garments: ['hoodie', 'joggers', 'cap'], colors: ['#E85D3A', '#4B4F3A', '#141414'] },
};
