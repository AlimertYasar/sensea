"""Rule-based engine used when no API key is configured or the LLM call fails.

It is intentionally simple but still: understands Turkish + English (with
suffixes), returns proportional emotion scores and builds two varied outfits.
"""

from __future__ import annotations

import hashlib
import random
import re
import uuid

from .catalog import EMOTIONS
from .color_science import color_distance, in_tune_palette, lift_palette
from .postprocess import filter_palette, finalize
from .schemas import Recommendation, RecommendRequest, Swatch, WardrobeItem

# --------------------------------------------------------------------------- lexicon
# Stems are matched as word prefixes so Turkish suffixes work ("yorgun" -> "yorgunum").
LEXICON: dict[str, list[str]] = {
    "happy": [
        "mutlu", "sevin", "neşe", "keyif", "harika", "süper", "iyiyim", "iyi hissed", "memnun", "şükür",
        "güzel", "gülümse", "happy", "glad", "joy", "great", "good", "cheerful", "delighted", "grateful",
        "thankful", "lovely", "wonderful", "amazing", "😊", "😄", "😁", "🙂", "🥰", "❤",
    ],
    "excited": [
        "heyecan", "sabırsız", "coşku", "enerjik", "hevesl", "can atıyor", "bayılıyorum", "çılgın", "parti",
        "excited", "thrilled", "pumped", "hyped", "can't wait", "cant wait", "eager", "energetic", "🤩", "🎉", "🔥",
    ],
    "calm": [
        "sakin", "huzur", "rahat", "dingin", "sessiz", "normal", "idare", "fena değil", "dengeli",
        "calm", "relaxed", "peaceful", "chill", "fine", "okay", "serene", "balanced", "😌",
    ],
    "confident": [
        "özgüven", "güçlü", "kendimden emin", "eminim", "hazırım", "başar", "gurur", "iddialı", "kararlı",
        "confident", "strong", "proud", "ready", "powerful", "determined", "bold", "unstoppable", "💪", "😎",
    ],
    "tired": [
        "yorgun", "yoruldu", "yorul", "bitkin", "uykusuz", "uyku", "tükendi", "tükenmiş", "halsiz", "enerjim yok",
        "bıkkın", "tired", "exhausted", "sleepy", "drained", "burnt out", "burned out", "worn out", "fatigued",
        "😴", "🥱",
    ],
    "sad": [
        "üzgün", "üzül", "mutsuz", "kötü", "hüzün", "ağla", "kırgın", "yalnız", "boşluk", "moralim", "keder",
        "özledim", "sad", "down", "unhappy", "lonely", "cry", "depressed", "blue", "heartbroken", "miss",
        "😢", "😭", "😔",
    ],
    "anxious": [
        "kaygı", "endişe", "gergin", "stres", "panik", "korku", "korkuyorum", "tedirgin", "huzursuz", "sınav",
        "anxious", "nervous", "worried", "stressed", "panic", "scared", "afraid", "overwhelmed", "tense",
        "😰", "😟",
    ],
    "angry": [
        "sinir", "kızgın", "kızdım", "kızıyorum", "öfke", "deliriyorum", "bıktım", "nefret", "gıcık",
        "angry", "mad", "furious", "annoyed", "pissed", "irritated", "hate", "frustrated", "😡", "😠", "🤬",
    ],
}

# single-word inputs the user may tap as chips
DIRECT = {
    **{e: e for e in EMOTIONS},
    "mutlu": "happy", "heyecanlı": "excited", "sakin": "calm", "özgüvenli": "confident",
    "yorgun": "tired", "üzgün": "sad", "kaygılı": "anxious", "sinirli": "angry",
}

BOOSTERS = {"çok", "aşırı", "acayip", "cidden", "fazla", "so", "very", "really", "extremely", "super", "too"}
NEGATORS_AFTER = {"değil", "değilim", "degil"}
NEGATORS_BEFORE = {"not", "never", "isn't", "dont", "don't", "hiç"}

CRISIS = [
    "intihar", "kendimi öldür", "ölmek istiyorum", "yaşamak istemiyorum", "kendime zarar", "canıma kıy",
    "suicide", "kill myself", "want to die", "end my life", "self harm", "self-harm", "hurt myself",
]

LIFT = {
    "sad": "happy", "tired": "excited", "anxious": "calm", "angry": "calm",
    "happy": "excited", "excited": "confident", "calm": "happy", "confident": "excited",
}


def tr_lower(s: str) -> str:
    return s.replace("I", "ı").replace("İ", "i").lower()


def read_emotions(text: str) -> tuple[dict[str, float], float]:
    t = tr_lower(text)
    if t.strip() in DIRECT:
        scores = {e: 0.0 for e in EMOTIONS}
        scores[DIRECT[t.strip()]] = 1.0
        return scores, 0.6

    tokens = re.findall(r"[\w']+|[^\w\s]", t)
    scores = {e: 0.0 for e in EMOTIONS}
    hits = 0
    for emo, stems in LEXICON.items():
        for stem in stems:
            for m in re.finditer(re.escape(stem), t):
                start = m.start()
                # must start at a word boundary (emoji are fine anywhere)
                if stem[0].isalnum() and start > 0 and t[start - 1].isalnum():
                    continue
                before = t[:start].split()[-2:]
                after = t[m.end():].split()[:2]
                if any(w in NEGATORS_AFTER for w in after) or any(w in NEGATORS_BEFORE for w in before):
                    continue
                weight = 1.6 if any(w in BOOSTERS for w in before) else 1.0
                scores[emo] += weight
                hits += 1

    if hits == 0:
        scores["calm"] = 1.0
        return scores, 0.25

    for e in scores:
        scores[e] += 0.05  # a little background so mixes stay proportional
    exclaim = min(t.count("!"), 3) * 0.08
    intensity = min(1.0, 0.35 + 0.12 * hits + exclaim + 0.1 * sum(w in BOOSTERS for w in tokens))
    return scores, intensity


# --------------------------------------------------------------------------- wardrobe
# (type, english, turkish, tags)  tags: f = womenswear only, hot / cold = temperature gates
P = tuple[str, str, str, str]
WARDROBE: dict[str, dict[str, list[P]]] = {
    "casual": {
        "top": [("tshirt", "Relaxed cotton tee", "Rahat pamuklu tişört", ""), ("knit", "Soft crewneck knit", "Yumuşak bisiklet yaka triko", "cold"),
                ("longsleeve", "Waffle long sleeve", "Waffle dokulu uzun kollu", ""), ("shirt", "Oxford shirt", "Oxford gömlek", ""),
                ("blouse", "Flowy cotton blouse", "Dökümlü pamuk bluz", "f")],
        "bottom": [("jeans", "Straight-leg jeans", "Düz kesim jean", ""), ("trousers", "Chino trousers", "Chino pantolon", ""),
                   ("shorts", "Linen shorts", "Keten şort", "hot"), ("skirt", "Denim midi skirt", "Kot midi etek", "f")],
        "one_piece": [("dress", "Cotton midi dress", "Pamuklu midi elbise", "f")],
        "outer": [("jacket", "Denim jacket", "Kot ceket", ""), ("cardigan", "Chunky cardigan", "Kalın örgü hırka", ""),
                  ("coat", "Wool coat", "Yün kaban", "cold")],
        "shoes": [("sneakers", "Canvas sneakers", "Kanvas sneaker", ""), ("boots", "Suede ankle boots", "Süet bot", "cold"),
                  ("sandals", "Leather sandals", "Deri sandalet", "hot")],
        "accessory": [("bag", "Canvas tote", "Kanvas çanta", ""), ("cap", "Washed cap", "Yıkanmış şapka", ""), ("watch", "Simple watch", "Sade saat", "")],
    },
    "sporty": {
        "top": [("tshirt", "Dry-fit tee", "Dry-fit tişört", ""), ("hoodie", "Zip hoodie", "Fermuarlı kapüşonlu", ""), ("tank", "Training tank", "Antrenman atleti", "hot")],
        "bottom": [("joggers", "Tapered joggers", "Dar paça eşofman altı", ""), ("shorts", "Running shorts", "Koşu şortu", "hot")],
        "one_piece": [],
        "outer": [("jacket", "Light windbreaker", "Hafif rüzgarlık", ""), ("puffer", "Packable puffer", "Katlanabilir şişme mont", "cold")],
        "shoes": [("sneakers", "Cushioned runners", "Yastıklı koşu ayakkabısı", "")],
        "accessory": [("cap", "Sport cap", "Spor şapka", ""), ("watch", "Sport watch", "Spor saat", ""), ("bag", "Gym bag", "Spor çantası", "")],
    },
    "old_money": {
        "top": [("polo", "Knitted polo", "Örgü polo", ""), ("knit", "Cashmere crewneck", "Kaşmir triko", "cold"), ("shirt", "Linen shirt", "Keten gömlek", ""),
                ("blouse", "Silk blouse", "İpek bluz", "f")],
        "bottom": [("trousers", "Pleated trousers", "Pileli pantolon", ""), ("shorts", "Tailored shorts", "Kumaş şort", "hot"),
                   ("skirt", "Pleated midi skirt", "Pileli midi etek", "f")],
        "one_piece": [("dress", "Knit polo dress", "Triko polo elbise", "f")],
        "outer": [("blazer", "Structured blazer", "Yapılı blazer", ""), ("coat", "Wool overcoat", "Yün palto", "cold"),
                  ("cardigan", "Cable-knit cardigan", "Saç örgülü hırka", "")],
        "shoes": [("loafers", "Suede loafers", "Süet loafer", "")],
        "accessory": [("watch", "Leather-strap watch", "Deri kordon saat", ""), ("belt", "Leather belt", "Deri kemer", ""),
                      ("sunglasses", "Tortoise sunglasses", "Kaplumbağa desen gözlük", ""), ("necklace", "Pearl necklace", "İnci kolye", "f")],
    },
    "classic": {
        "top": [("shirt", "Crisp poplin shirt", "Poplin gömlek", ""), ("knit", "Merino turtleneck", "Merino balıkçı yaka", "cold"), ("blouse", "Tie-neck blouse", "Fular yaka bluz", "f")],
        "bottom": [("trousers", "Tailored trousers", "Kumaş pantolon", ""), ("jeans", "Slim straight jeans", "Düz kesim ince jean", "")],
        "one_piece": [("dress", "Wrap dress", "Kruvaze elbise", "f")],
        "outer": [("blazer", "Tailored blazer", "Kesimli blazer", ""), ("coat", "Trench coat", "Trençkot", "")],
        "shoes": [("loafers", "Leather loafers", "Deri loafer", ""), ("boots", "Chelsea boots", "Chelsea bot", "cold"), ("heels", "Block heels", "Kalın topuklu", "f")],
        "accessory": [("watch", "Steel watch", "Çelik saat", ""), ("belt", "Leather belt", "Deri kemer", ""), ("bag", "Structured leather bag", "Deri çanta", "")],
    },
    "minimal": {
        "top": [("tshirt", "Heavyweight boxy tee", "Kalın kumaş boxy tişört", ""), ("knit", "Fine-gauge knit", "İnce örgü triko", ""), ("shirt", "Collarless shirt", "Hakim yaka gömlek", "")],
        "bottom": [("trousers", "Wide-leg trousers", "Bol paça pantolon", ""), ("jeans", "Raw denim", "Ham denim", ""), ("skirt", "Column skirt", "Düz kesim etek", "f")],
        "one_piece": [("dress", "Slip dress", "Saten askılı elbise", "f")],
        "outer": [("coat", "Clean-line coat", "Sade kesim kaban", "cold"), ("jacket", "Minimal overshirt", "Minimal gömlek ceket", "")],
        "shoes": [("sneakers", "Minimal leather sneakers", "Minimal deri sneaker", ""), ("boots", "Sleek boots", "Sade bot", "cold")],
        "accessory": [("watch", "Slim watch", "İnce saat", ""), ("bag", "Simple crossbody", "Sade çapraz çanta", "")],
    },
    "streetwear": {
        "top": [("hoodie", "Oversized hoodie", "Oversize kapüşonlu", ""), ("tshirt", "Graphic oversized tee", "Baskılı oversize tişört", ""),
                ("longsleeve", "Layered long sleeve", "Katmanlı uzun kollu", "")],
        "bottom": [("joggers", "Cargo pants", "Kargo pantolon", ""), ("jeans", "Baggy jeans", "Baggy jean", ""), ("shorts", "Mesh shorts", "File şort", "hot")],
        "one_piece": [],
        "outer": [("jacket", "Varsity jacket", "Kolej ceketi", ""), ("puffer", "Cropped puffer", "Kısa şişme mont", "cold")],
        "shoes": [("sneakers", "Chunky sneakers", "Kalın tabanlı sneaker", ""), ("boots", "Combat boots", "Postal", "cold")],
        "accessory": [("cap", "Six-panel cap", "Altı panel şapka", ""), ("beanie", "Ribbed beanie", "Fitilli bere", "cold"),
                      ("bag", "Crossbody sling", "Çapraz bel çantası", ""), ("sunglasses", "Shield sunglasses", "Kalkan gözlük", "")],
    },
}

TEXT = {
    "tr": {
        "summary": {
            "happy": "İçinde güneşli bir hava var; bunu dışarıya da taşıyalım.",
            "excited": "Enerjin yüksek, bir şeyler olacakmış gibi hissediyorsun.",
            "calm": "Dengeli ve sakin bir yerdesin; sade bir uyum yakışır.",
            "confident": "Kendinden eminsin; bugün dikkat çekmekten çekinme.",
            "tired": "Biraz yorgun hissediyorsun; bugün rahatlık öncelik.",
            "sad": "Biraz ağır bir gün gibi; yumuşak dokular iyi gelebilir.",
            "anxious": "Zihnin biraz kalabalık; tanıdık ve rahat parçalar seç.",
            "angry": "İçinde biraz gerginlik var; net çizgiler ve serin tonlar dengeler.",
        },
        "titles": ["Uyumlu Ton", "Ruh Hali Yükselt"],
        "vibes": ["Hissettiğinle aynı frekansta", "Hafif bir enerji dokunuşu"],
        "why": "{emo} hissine eşlik eden {c1} ve {c2} tonları, {style} çizgisinde bir araya geliyor.",
        "tips": [
            "Tek bir renkli parçayı yüzüne yakın taşı; ilk o fark edilir.",
            "Kolları bir kez kıvır; kombine rahat bir hava katar.",
            "Aksesuarları tek renkte tut; bütün görünüm toparlanır.",
            "Katmanlarda farklı dokular kullan; aynı renkte bile derinlik verir.",
        ],
        "emo": {"happy": "Mutluluk", "excited": "Heyecan", "calm": "Sakinlik", "confident": "Özgüven",
                "tired": "Yorgunluk", "sad": "Hüzün", "anxious": "Kaygı", "angry": "Öfke"},
    },
    "en": {
        "summary": {
            "happy": "There's sunshine in how you feel; let's wear it on the outside too.",
            "excited": "Your energy is up, like something good is about to happen.",
            "calm": "You're in a steady, quiet place; easy harmony suits you today.",
            "confident": "You feel sure of yourself; today is a day to be seen.",
            "tired": "You're running a little low; comfort comes first today.",
            "sad": "It feels like a heavy day; soft textures can help.",
            "anxious": "Your mind feels busy; reach for familiar, easy pieces.",
            "angry": "There's some tension in you; clean lines and cool tones balance it.",
        },
        "titles": ["In Tune", "Gentle Lift"],
        "vibes": ["Matching how you feel", "A small spark of energy"],
        "why": "{c1} and {c2} keep company with your {emo} mood, put together in a {style} way.",
        "tips": [
            "Keep the one coloured piece close to your face; it's what people notice first.",
            "Roll the sleeves once for an easier, lived-in feel.",
            "Keep accessories in one tone so the look holds together.",
            "Mix textures in your layers to add depth, even in one colour.",
        ],
        "emo": {"happy": "happy", "excited": "excited", "calm": "calm", "confident": "confident",
                "tired": "tired", "sad": "low", "anxious": "anxious", "angry": "tense"},
    },
}

STYLE_WORDS = {
    "tr": {"casual": "rahat", "sporty": "sportif", "old_money": "old money", "classic": "klasik", "minimal": "minimal", "streetwear": "sokak stili"},
    "en": {"casual": "casual", "sporty": "sporty", "old_money": "old money", "classic": "classic", "minimal": "minimal", "streetwear": "streetwear"},
}


def _allowed(piece: P, req: RecommendRequest) -> bool:
    tags = piece[3]
    if "f" in tags and req.fit != "womenswear":
        return False
    temp = req.weather.temp_c if req.weather else None
    if "hot" in tags and (temp is None or temp < 24):
        return False
    if "cold" in tags and (temp is None or temp > 14):
        return False
    return True


def _pick(rng: random.Random, pieces: list[P], req: RecommendRequest, avoid: set[str]) -> P | None:
    prefs = req.prefs
    banned = set(prefs.avoid_types) if prefs else set()
    ok = [p for p in pieces if _allowed(p, req) and p[0] not in banned]
    fresh = [p for p in ok if p[0] not in avoid] or ok
    if prefs:  # soft taste from feedback: skip disliked pieces, favour liked ones
        fresh = [p for p in fresh if p[0] not in prefs.disliked_types] or fresh
        liked = [p for p in fresh if p[0] in prefs.liked_types]
        if liked and rng.random() < 0.6:
            fresh = liked
    return rng.choice(fresh) if fresh else None


def _closest_owned(slot: str, target: str, owned: list[WardrobeItem], used: set[str], req: RecommendRequest) -> WardrobeItem | None:
    temp = req.weather.temp_c if req.weather else None
    cands = [w for w in owned if w.slot == slot and w.id not in used]
    if temp is not None:  # skip obviously wrong warmth
        cands = [w for w in cands if not (temp >= 24 and w.warmth == "warm") and not (temp <= 8 and w.warmth == "light")] or cands
    return min(cands, key=lambda w: color_distance(w.color_hex, target) + recency_penalty(w), default=None)


def recency_penalty(w: WardrobeItem) -> float:
    """Prefer pieces that haven't been worn for a while; avoid repeating yesterday's clothes."""
    d = w.days_since_worn
    if d is None:
        return -15.0  # never worn yet: nudge it in
    if d <= 2:
        return 160.0
    if d >= 21:
        return -25.0
    return 0.0


def _build_outfit(rng: random.Random, req: RecommendRequest, emo: str, idx: int, avoid: set[str],
                  pal: list, owned: list[WardrobeItem], used: set[str]) -> dict:
    lang = req.locale
    mix_styles = req.style_mix
    # each outfit leans on one style of the blend so two outfits show the range
    lead = mix_styles[idx % len(mix_styles)]
    wardrobe = {slot: list(WARDROBE[lead][slot]) + [p for st in mix_styles if st != lead for p in WARDROBE[st][slot]
                                                     if rng.random() < 0.35] for slot in WARDROBE[lead]}
    name_i = 2 if lang == "tr" else 1
    temp = req.weather.temp_c if req.weather else None
    items: list[dict] = []

    suggestions = 0
    anchors = {w.slot: w for w in owned if req.anchor_ids and w.id in req.anchor_ids}

    def add(slot: str, sw, optional: bool = False) -> bool:
        nonlocal suggestions
        w = anchors.get(slot) or (_closest_owned(slot, sw.hex, owned, used, req) if owned else None)
        if owned and not w and optional and suggestions >= 1:
            return False  # wardrobe mode: at most one piece the user doesn't own
        if owned and not w:
            suggestions += 1
        if w:
            if w.id not in (req.anchor_ids or []):
                used.add(w.id)  # anchors may appear in both outfits
            items.append({"slot": slot, "type": w.type, "name": w.name, "color_hex": w.color_hex,
                          "color_name": w.color_name or w.name, "wardrobe_id": w.id})
            return True
        p = _pick(rng, wardrobe[slot], req, avoid)
        if p:
            avoid.add(p[0])
            items.append({"slot": slot, "type": p[0], "name": p[name_i], "color_hex": sw.hex, "color_name": sw.name})
            return True
        return False

    owns_dress = any(w.slot == "one_piece" and w.id not in used for w in owned)
    owns_separates = any(w.slot == "top" for w in owned) and any(w.slot == "bottom" for w in owned)
    if "one_piece" in anchors:
        use_dress = True
    elif "top" in anchors or "bottom" in anchors:
        use_dress = False
    elif owned:
        use_dress = owns_dress and (not owns_separates or rng.random() < 0.35)
    else:
        use_dress = req.fit == "womenswear" and bool(wardrobe["one_piece"]) and rng.random() < 0.35
    if use_dress:
        add("one_piece", pal[0])
    else:
        add("top", pal[0])
        add("bottom", pal[4] if idx == 0 else pal[3])
    cold = temp is not None and temp <= 14
    if "outer" in anchors or cold or (temp is None and rng.random() < 0.5) or (req.weather and req.weather.condition in {"rain", "wind", "storm"}):
        add("outer", pal[1], optional=not cold and "outer" not in anchors)
    add("shoes", pal[3] if idx == 0 else pal[4])
    add("accessory", pal[2], optional="accessory" not in anchors)

    t = TEXT[lang]
    c1 = items[0]["color_name"]
    c2 = items[1]["color_name"] if len(items) > 1 else pal[1].name
    return {
        "title": t["titles"][idx],
        "vibe": t["vibes"][idx],
        "items": items,
        "why": t["why"].format(emo=t["emo"][emo].lower() if lang == "en" else t["emo"][emo], c1=c1, c2=c2.lower(), style=" / ".join(STYLE_WORDS[lang][st] for st in req.style_mix)),
        "tip": rng.choice(t["tips"]),
    }


def _palette(pal: list, req: RecommendRequest) -> list:
    """Palette with avoided colour families swapped out, always 5 swatches long."""
    out = filter_palette([Swatch(hex=p.hex, name=p.name) for p in pal], req)
    while len(out) < 5:
        out.append(out[len(out) % len(out)])
    return out


def recommend_fallback(req: RecommendRequest, tier: str = "free") -> Recommendation:
    scores, intensity = read_emotions(req.text)
    total = sum(scores.values()) or 1
    mix = sorted(((k, v / total) for k, v in scores.items()), key=lambda kv: kv[1], reverse=True)
    dominant = mix[0][0]
    seed = int(hashlib.sha256(f"{req.text}|{'+'.join(req.style_mix)}|{req.fit}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    owned = list(req.wardrobe or [])

    avoid: set[str] = set()
    used: set[str] = set()
    outfits = [
        _build_outfit(rng, req, dominant, 0, avoid, _palette(in_tune_palette(mix, req.locale), req), owned, used),
        _build_outfit(rng, req, LIFT[dominant], 1, avoid, _palette(lift_palette(mix, req.locale), req), owned, used),
    ]
    raw = {
        "emotions": scores,
        "intensity": intensity,
        "mood_summary": TEXT[req.locale]["summary"][dominant],
        "outfits": outfits,
        "wellbeing_concern": any(c in tr_lower(req.text) for c in CRISIS),
    }
    return finalize(raw, req, source="fallback", rec_id=uuid.uuid4().hex[:12], tier=tier, wardrobe=owned)


# --------------------------------------------------------------------------- swap one piece
def swap_fallback(req) -> dict:
    """Replace outfit.items[index] with a different piece for the same slot."""
    rng = random.Random(req.seed * 7919 + req.index)
    target = req.outfit.items[req.index]
    slot = target.slot
    others = [i for j, i in enumerate(req.outfit.items) if j != req.index]
    in_use = {i.wardrobe_id for i in others if i.wardrobe_id} | ({target.wardrobe_id} if target.wardrobe_id else set())
    palette = [p.hex for p in req.palette] or [target.color_hex]
    name_i = 2 if req.locale == "tr" else 1

    owned = [w for w in (req.wardrobe or []) if w.slot == slot and w.id not in in_use]
    if owned:
        ranked = sorted(owned, key=lambda w: min(color_distance(w.color_hex, p) for p in palette) + recency_penalty(w))
        w = rng.choice(ranked[:2])
        return {"slot": slot, "type": w.type, "name": w.name, "color_hex": w.color_hex,
                "color_name": w.color_name or w.name, "wardrobe_id": w.id}

    banned = set(req.prefs.avoid_types) if req.prefs else set()
    pool = [p for st in req.style_mix for p in WARDROBE[st].get(slot, [])]
    pool = [p for p in pool if _allowed(p, req) and p[0] not in banned and p[name_i] != target.name] or \
           [p for st in WARDROBE for p in WARDROBE[st].get(slot, []) if p[0] not in banned and p[name_i] != target.name]
    different_type = [p for p in pool if p[0] != target.type]
    piece = rng.choice(different_type or pool)
    colours = [c for c in palette if c.upper() != target.color_hex.upper()] or palette
    hx = rng.choice(colours)
    from .color_science import name_for
    return {"slot": slot, "type": piece[0], "name": piece[name_i], "color_hex": hx, "color_name": name_for(hx, req.locale)}
