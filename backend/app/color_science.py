"""Research-grounded colour engine.

How a palette is built
----------------------
1. HUE comes from cross-cultural colour–emotion *associations*:
   Jonauskaite et al. (2020), Psychological Science 31(10) — 4,598 people, 30 nations,
   12 colour terms x 20 emotions, global similarity r = .88. Strongest links:
   joy -> yellow, orange, pink; amusement -> orange; sadness -> black, grey;
   anger -> red; fear -> black; relief -> white; disappointment -> grey.
   Pride/contentment had no strong universal colour.
2. SATURATION follows the emotion's AROUSAL: saturation is the colour property most
   strongly tied to felt arousal (Wilms & Oberfeld, 2018, Psychological Research 82;
   Valdez & Mehrabian, 1994, J. Exp. Psych: General 123).
3. LIGHTNESS follows VALENCE: brighter colours are rated more pleasant (same sources).
   Darker + more saturated colours read as more dominant (Valdez & Mehrabian, 1994).
4. The "lift" palette moves towards a more pleasant, moderate-arousal state:
   higher lightness, MEDIUM saturation (rated most pleasant by Wilms & Oberfeld),
   cool hues for high-arousal negative moods (blue = least arousing hue in that study),
   joy hues for low-arousal negative moods.

Emotion coordinates (valence, arousal, dominance in 0..1) are approximate positions on
Russell's (1980) circumplex / Warriner et al. (2013) word norms.

These are average tendencies, not rules: individual and cultural differences exist, and
the studies measure associations and ratings — they do not show that wearing a colour
changes your mood. The app says so to the user.
"""

from __future__ import annotations

import colorsys
from dataclasses import dataclass

# --------------------------------------------------------------------------- data
PAD: dict[str, tuple[float, float, float]] = {
    "happy": (0.90, 0.55, 0.70),
    "excited": (0.80, 0.90, 0.65),
    "calm": (0.75, 0.15, 0.60),
    "confident": (0.80, 0.60, 0.90),
    "tired": (0.35, 0.10, 0.30),
    "sad": (0.10, 0.25, 0.20),
    "anxious": (0.20, 0.80, 0.20),
    "angry": (0.15, 0.90, 0.65),
}

# Hue anchors in degrees; None = achromatic (black/grey/white family)
HUES: dict[str, list[float | None]] = {
    "happy": [48, 30, 340],        # yellow, orange, pink (joy)
    "excited": [28, 8, 48],        # orange (amusement), red-orange, yellow
    "calm": [205, 150, None],      # soft blue, green, white (relief)
    "confident": [232, 352, None], # deep blue/red + black: dominance = dark & saturated
    "tired": [38, 215, None],      # muted warm sand, soft blue, grey
    "sad": [None, 220, 230],       # grey/black, blue-grey (sadness)
    "anxious": [None, 260, 200],   # black/charcoal (fear), muted violet, blue
    "angry": [0, None, 215],       # red (anger), black, cool blue
}

# Achromatic anchors resolve to a tinted neutral using this hue
NEUTRAL_HUE = {"calm": 40, "confident": 230, "tired": 30, "sad": 220, "anxious": 240, "angry": 220}

CITATIONS = {
    "jonauskaite": "Jonauskaite et al., 2020, Psychological Science",
    "wilms": "Wilms & Oberfeld, 2018, Psychological Research",
    "valdez": "Valdez & Mehrabian, 1994, J. of Experimental Psychology: General",
}

ASSOC_TEXT = {
    "tr": {
        "happy": "Sarı, turuncu ve pembe; 30 ülkeden 4.598 kişinin katıldığı çalışmada neşeyle en çok eşleştirilen renkler.",
        "excited": "Turuncu, eğlence ve coşkuyla en sık eşleştirilen renk; kırmızıya yakın tonlar enerjiyi artırıyor.",
        "calm": "Rahatlama en çok beyazla eşleştiriliyor; düşük doygunluklu mavi ve yeşiller en az uyarıcı tonlar arasında.",
        "confident": "Gurur için evrensel bir renk bulunmadı; bu yüzden güç algısıyla ilişkili koyu ve doygun tonlar kullanıldı.",
        "tired": "Yorgunluk düşük enerji demek; bu yüzden düşük doygunluklu, yumuşak tonlar seçildi.",
        "sad": "Hüzün, ülkeler genelinde en çok siyah ve griyle eşleştiriliyor.",
        "anxious": "Korku en çok siyahla eşleştiriliyor; kaygının yüksek enerjisini yumuşatmak için tonlar düşük doygunlukta tutuldu.",
        "angry": "Öfke, kültürler arasında en tutarlı biçimde kırmızıyla eşleştiriliyor.",
    },
    "en": {
        "happy": "Yellow, orange and pink are the colours most linked to joy in a study of 4,598 people across 30 countries.",
        "excited": "Orange is the colour most linked to amusement; tones closer to red add energy.",
        "calm": "Relief is most linked to white; low-saturation blues and greens are among the least arousing tones.",
        "confident": "No universal colour was found for pride, so dark, saturated tones linked to a sense of dominance are used.",
        "tired": "Tiredness means low energy, so soft, low-saturation tones are used.",
        "sad": "Across countries, sadness is most linked to black and grey.",
        "anxious": "Fear is most linked to black; tones are kept low in saturation to soften anxious energy.",
        "angry": "Anger is linked to red more consistently than any other emotion–colour pair across cultures.",
    },
}


@dataclass
class Swatch:
    hex: str
    name: str


# --------------------------------------------------------------------------- helpers
def _hex(h: float, s: float, l: float) -> str:
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, max(0, min(1, l)), max(0, min(1, s)))
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))


def hex_to_hls(hx: str) -> tuple[float, float, float]:
    hx = hx.lstrip("#")
    r, g, b = (int(hx[i : i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, l, s


def color_distance(a: str, b: str) -> float:
    """Perceptual-ish distance (weighted RGB, 'redmean')."""
    a, b = a.lstrip("#"), b.lstrip("#")
    r1, g1, b1 = (int(a[i : i + 2], 16) for i in (0, 2, 4))
    r2, g2, b2 = (int(b[i : i + 2], 16) for i in (0, 2, 4))
    rm = (r1 + r2) / 2
    return ((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2) ** 0.5


HUE_NAMES = [  # (upper bound, en, tr)
    (12, "red", "kırmızı"), (24, "coral", "mercan"), (40, "orange", "turuncu"), (52, "amber", "kehribar"),
    (66, "yellow", "sarı"), (90, "lime", "fıstık yeşili"), (150, "green", "yeşil"), (178, "teal", "camgöbeği"),
    (200, "sky blue", "gök mavisi"), (228, "blue", "mavi"), (250, "indigo", "çivit"), (280, "violet", "mor"),
    (318, "orchid", "orkide"), (345, "pink", "pembe"), (361, "red", "kırmızı"),
]


def name_for(hx: str, locale: str) -> str:
    h, l, s = hex_to_hls(hx)
    tr = locale == "tr"
    if s < 0.12 or (l > 0.93) or (l < 0.1):
        warm = 15 <= h <= 70 and s >= 0.05
        if l > 0.9:
            return "Kırık beyaz" if tr else "Off-white"
        if l > 0.75:
            return ("Yulaf" if tr else "Oat") if warm else ("Sis grisi" if tr else "Mist grey")
        if l > 0.5:
            return ("Kum beji" if tr else "Sand") if warm else ("Taş grisi" if tr else "Stone grey")
        if l > 0.28:
            return ("Vizon" if tr else "Taupe") if warm else ("Arduvaz" if tr else "Slate")
        if l > 0.14:
            return ("Espresso" if tr else "Espresso") if warm else ("Antrasit" if tr else "Charcoal")
        return "Mürekkep siyahı" if tr else "Ink black"
    base = next(n for n in HUE_NAMES if h < n[0])
    word = base[2] if tr else base[1]
    if l > 0.78:
        mod = "Açık" if tr else "Pale"
    elif l < 0.3:
        mod = "Koyu" if tr else "Deep"
    elif s < 0.35:
        mod = "Tozlu" if tr else "Dusty"
    elif s > 0.7:
        mod = "Canlı" if tr else "Vivid"
    else:
        mod = "Yumuşak" if tr else "Soft"
    return f"{mod} {word}"


def _sat(arousal: float) -> float:
    return 0.25 + 0.65 * arousal  # saturation tracks arousal


def _light(valence: float, dominance: float) -> float:
    return 0.32 + 0.4 * valence - 0.12 * (dominance - 0.5)  # lightness tracks valence


# --------------------------------------------------------------------------- palettes
def blend_pad(mix: list[tuple[str, float]]) -> tuple[float, float, float]:
    top = [(k, w) for k, w in mix if w >= 0.08][:3] or mix[:1]
    tot = sum(w for _, w in top)
    return tuple(sum(PAD[k][i] * w for k, w in top) / tot for i in range(3))  # type: ignore[return-value]


def _chromatic(h: float | None, emo: str, s: float, l: float) -> tuple[float, float, float]:
    if h is None:  # achromatic anchor -> tinted neutral, keep it dark-ish (black/grey family)
        return NEUTRAL_HUE.get(emo, 230), 0.08, min(l, 0.3)
    return h, s, l


def in_tune_palette(mix: list[tuple[str, float]], locale: str) -> list[Swatch]:
    dom = mix[0][0]
    v, a, d = blend_pad(mix)
    s, l = _sat(a), _light(v, d)
    if dom == "anxious":
        s = min(s, 0.4)  # don't amplify anxious arousal: keep it muted
    hues = HUES[dom]
    second = mix[1][0] if len(mix) > 1 and mix[1][1] >= 0.2 else None

    colours = [
        _chromatic(hues[0], dom, min(s, 0.82), min(max(l, 0.25), 0.68)),
        _chromatic(HUES[second][0] if second else hues[1], second or dom, min(s * 0.9, 0.78), min(max(l + 0.06, 0.25), 0.72)),
        _chromatic(hues[2] if len(hues) > 2 else hues[1], dom, s * 0.7, min(l + 0.12, 0.78)),
    ]
    nh = NEUTRAL_HUE.get(dom, hues[0] or 30)
    colours.append((nh, 0.12 + 0.1 * a, 0.9 if v > 0.5 else 0.82))   # light neutral (relief -> white)
    colours.append((nh, 0.15, 0.16 if d > 0.5 or v < 0.4 else 0.24))  # dark neutral (dominance / black)
    return _to_swatches(colours, locale)


def lift_palette(mix: list[tuple[str, float]], locale: str) -> list[Swatch]:
    dom = mix[0][0]
    v, a, d = PAD[dom]
    target_v = max(v, 0.75)
    if v < 0.5 and a >= 0.6:      # angry, anxious -> calm it down: cool hues, lower arousal
        hues, target_a = [205, 160, 230], 0.35
    elif v < 0.5:                  # sad, tired -> brighten: joy hues, a bit more energy
        hues, target_a = [48, 30, 205], 0.55
    else:                          # already positive -> gentle energy boost
        hues, target_a = [HUES[dom][0] or 48, 30, 340], min(0.75, a + 0.15)
    s = min(0.6, _sat(target_a))   # medium saturation was rated most pleasant
    l = _light(target_v, d)
    colours = [(hues[0], s, l), (hues[1], s * 0.85, l + 0.05), (hues[2], s * 0.6, l + 0.15),
               (hues[0], 0.12, 0.92), (225, 0.3, 0.2)]
    return _to_swatches(colours, locale)


def _to_swatches(colours, locale) -> list[Swatch]:
    out: list[Swatch] = []
    for h, s, l in colours:
        hx = _hex(h, s, l)
        if any(color_distance(hx, o.hex) < 40 for o in out):
            hx = _hex(h + 18, s, min(l + 0.1, 0.92))
        out.append(Swatch(hx, name_for(hx, locale)))
    return out


def color_notes(mix: list[tuple[str, float]], locale: str) -> list[str]:
    dom = mix[0][0]
    v, a, _ = blend_pad(mix)
    tr = locale == "tr"
    notes = [ASSOC_TEXT[locale][dom] + f" ({CITATIONS['jonauskaite']})"]
    if a >= 0.6:
        notes.append(("Enerjin yüksek; bu yüzden renk doygunluğu yüksek tutuldu. Doygunluk, algılanan uyarılmayla en güçlü ilişkili renk özelliği."
                      if tr else "Your energy is high, so saturation is kept high; saturation is the colour property most tied to felt arousal.")
                     + f" ({CITATIONS['wilms']})")
    elif a <= 0.35:
        notes.append(("Enerjin düşük; bu yüzden düşük doygunluklu, sakin tonlar seçildi."
                      if tr else "Your energy is low, so calmer, low-saturation tones are used.") + f" ({CITATIONS['wilms']})")
    notes.append(("Moral yükselt kombininde tonlar daha açık ve orta doygunlukta; açık renkler daha hoş, orta doygunluk ise en hoş bulunan düzey."
                  if tr else "The Lift outfit uses lighter tones at medium saturation; lighter colours are rated more pleasant and medium saturation the most pleasant.")
                 + f" ({CITATIONS['valdez']}; {CITATIONS['wilms']})")
    return notes


# --------------------------------------------------------------------------- colour families
# Coarse names users think in ("I never wear orange"). Mirrored in the app (src/lib/prefs.ts).
FAMILIES = ["black", "white", "grey", "beige", "brown", "navy", "red", "orange", "yellow", "green", "blue", "purple", "pink"]

NEUTRAL_FALLBACKS = ["#1C1C22", "#F4F2EE", "#9A9AA0", "#D8C7A8", "#1F2A44", "#6B4A34"]


def family_of(hx: str) -> str:
    h, l, s = hex_to_hls(hx)
    if l < 0.16:
        return "black"
    if l > 0.9 and s < 0.35:
        return "white"
    if s < 0.12:
        return "grey"
    if 18 <= h <= 55 and s < 0.45 and l > 0.6:
        return "beige"
    if 10 <= h <= 45 and l < 0.42:
        return "brown"
    if 200 <= h <= 250 and l < 0.3:
        return "navy"
    if h < 15 or h >= 345:
        return "red"
    if h < 40:
        return "orange"
    if h < 70:
        return "yellow"
    if h < 170:
        return "green"
    if h < 250:
        return "blue"
    if h < 300:
        return "purple"
    return "pink"


def avoid_safe(hx: str, avoid: set[str], options: list[str]) -> str:
    """Return hx if allowed, else the closest allowed option (palette first, then neutrals)."""
    if not avoid or family_of(hx) not in avoid:
        return hx
    allowed = [o for o in options + NEUTRAL_FALLBACKS if family_of(o) not in avoid]
    return min(allowed, key=lambda o: color_distance(o, hx)) if allowed else hx
