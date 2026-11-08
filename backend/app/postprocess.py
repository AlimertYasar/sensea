"""Turn raw (LLM or fallback) output into a validated Recommendation.

The model is good but not perfect: this layer normalises scores, repairs colours,
drops unknown garment types, maps wardrobe pieces back to the user's real items and
guarantees every outfit is wearable. Palettes and their research notes are computed
here deterministically (never by the LLM), so citations can't be hallucinated.
"""

from __future__ import annotations

from .catalog import EMOTIONS, GARMENTS
from .color_science import avoid_safe, color_notes, family_of, in_tune_palette, lift_palette, name_for
from .schemas import HEX_RE, Outfit, OutfitItem, Recommendation, RecommendRequest, Swatch, WardrobeItem

SLOT_ORDER = {"outer": 0, "top": 1, "one_piece": 1, "bottom": 2, "shoes": 3, "accessory": 4}
MENSWEAR_BLOCK = {"dress", "skirt", "heels", "blouse", "necklace"}


def _clip(s: object, n: int) -> str:
    s = str(s or "").strip()
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _hex(v: object) -> str | None:
    s = str(v or "").strip()
    if s and not s.startswith("#"):
        s = "#" + s
    if len(s) == 4:  # #abc -> #aabbcc
        s = "#" + "".join(c * 2 for c in s[1:])
    return s.upper() if HEX_RE.match(s) else None


def normalise_emotions(raw: dict) -> list[tuple[str, float]]:
    scores = {}
    for k in EMOTIONS:
        try:
            scores[k] = max(0.0, float(raw.get(k, 0) or 0))
        except (TypeError, ValueError):
            scores[k] = 0.0
    total = sum(scores.values())
    if total <= 0:
        scores = {k: 0.0 for k in EMOTIONS}
        scores["calm"] = 1.0
        total = 1.0
    ranked = sorted(((k, v / total) for k, v in scores.items()), key=lambda kv: kv[1], reverse=True)
    rounded = [(k, round(v, 3)) for k, v in ranked]
    drift = round(1 - sum(v for _, v in rounded), 3)
    rounded[0] = (rounded[0][0], round(rounded[0][1] + drift, 3))
    return rounded


def _repair_outfit(raw: dict, req: RecommendRequest, fallback_colour: Swatch,
                   wardrobe: dict[str, WardrobeItem], palette: list[Swatch] | None = None) -> Outfit | None:
    avoid_c = set(req.prefs.avoid_colors) if req.prefs else set()
    avoid_t = set(req.prefs.avoid_types) if req.prefs else set()
    options = [p.hex for p in (palette or [])]
    items: list[OutfitItem] = []
    seen_slots: dict[str, int] = {}
    used_ids: set[str] = set()
    for it in raw.get("items") or []:
        if not isinstance(it, dict):
            continue
        wid = it.get("wardrobe_id")
        owned = wardrobe.get(str(wid)) if wid else None
        if owned and owned.id in used_ids:
            continue
        if owned:  # trust the user's own data over the model's description
            gtype, slot = owned.type, owned.slot
            name, hx, cname = owned.name, owned.color_hex, owned.color_name or owned.name
        else:
            gtype = str(it.get("type", "")).strip().lower()
            if gtype not in GARMENTS:
                continue
            if gtype in avoid_t:
                continue
            slot = GARMENTS[gtype]
            name = _clip(it.get("name") or gtype, 48)
            hx = _hex(it.get("color_hex")) or fallback_colour.hex
            cname = _clip(it.get("color_name") or "", 24) or fallback_colour.name
            safe = avoid_safe(hx, avoid_c, options)
            if safe != hx:  # user never wears this colour family: swap to the closest allowed tone
                hx, cname = safe, name_for(safe, req.locale)
        if req.fit == "menswear" and gtype in MENSWEAR_BLOCK and not owned:
            continue
        limit = 2 if slot == "accessory" else 1
        if seen_slots.get(slot, 0) >= limit:
            continue
        seen_slots[slot] = seen_slots.get(slot, 0) + 1
        if owned:
            used_ids.add(owned.id)
        items.append(OutfitItem(slot=slot, type=gtype if gtype in GARMENTS else "tshirt", name=name,
                                color_hex=hx, color_name=cname, wardrobe_id=owned.id if owned else None))

    has = set(seen_slots)
    if "one_piece" in has and ("top" in has or "bottom" in has):
        items = [i for i in items if i.slot != "one_piece"]
        has.discard("one_piece")
    if "one_piece" not in has and not ("top" in has and "bottom" in has):
        return None
    if "shoes" not in has:
        shoe = next((t for t in ("sneakers", "loafers", "boots", "sandals") if t not in avoid_t), "sneakers")
        hx = avoid_safe("#F5F5F4", avoid_c, options)
        name = {"sneakers": ("Sneaker", "Sneakers"), "loafers": ("Loafer", "Loafers"), "boots": ("Bot", "Boots"),
                "sandals": ("Sandalet", "Sandals")}[shoe][0 if req.locale == "tr" else 1]
        items.append(OutfitItem(slot="shoes", type=shoe, name=name, color_hex=hx, color_name=name_for(hx, req.locale)))

    items.sort(key=lambda i: SLOT_ORDER[i.slot])
    return Outfit(
        title=_clip(raw.get("title"), 40) or "Sensea",
        vibe=_clip(raw.get("vibe"), 60),
        items=items[:7],
        why=_clip(raw.get("why"), 280),
        tip=_clip(raw.get("tip"), 180),
    )


def filter_palette(palette: list[Swatch], req: RecommendRequest) -> list[Swatch]:
    """Swap swatches in colour families the user avoids for the closest allowed tone."""
    avoid = set(req.prefs.avoid_colors) if req.prefs else set()
    if not avoid:
        return palette
    out: list[Swatch] = []
    others = [p.hex for p in palette if family_of(p.hex) not in avoid]
    for p in palette:
        hx = avoid_safe(p.hex, avoid, others)
        if any(o.hex == hx for o in out):
            continue
        out.append(p if hx == p.hex else Swatch(hex=hx, name=name_for(hx, req.locale)))
    return out if len(out) >= 3 else out + [Swatch(hex=h, name=name_for(h, req.locale)) for h in ("#1C1C22", "#F4F2EE", "#9A9AA0") if all(o.hex != h for o in out) and family_of(h) not in avoid][: 3 - len(out)]


def finalize(raw: dict, req: RecommendRequest, *, source: str, rec_id: str, tier: str = "free",
             wardrobe: list[WardrobeItem] | None = None) -> Recommendation:
    emotions = normalise_emotions(raw.get("emotions") or {})
    dominant = emotions[0][0]
    tune = filter_palette([Swatch(hex=s.hex, name=s.name) for s in in_tune_palette(emotions, req.locale)], req)
    lift = filter_palette([Swatch(hex=s.hex, name=s.name) for s in lift_palette(emotions, req.locale)], req)

    by_id = {w.id: w for w in (wardrobe or [])}
    raws = [r for r in (raw.get("outfits") or []) if isinstance(r, dict)]
    outfits = []
    for i, r in enumerate(raws[:2]):
        pal = tune if i == 0 else lift
        o = _repair_outfit(r, req, pal[0], by_id, pal)
        if o:
            outfits.append(o)
    if not outfits:
        raise ValueError("no usable outfit in model output")

    # "Build an outfit with this piece": make sure anchored wardrobe pieces are really in every outfit
    anchors = [by_id[a] for a in (req.anchor_ids or []) if a in by_id]
    for o in outfits:
        for a in anchors:
            if any(i.wardrobe_id == a.id for i in o.items):
                continue
            slots = {i.slot for i in o.items}
            if a.slot in ("top", "bottom") and "one_piece" in slots:
                continue
            piece = OutfitItem(slot=a.slot, type=a.type if a.type in GARMENTS else "tshirt", name=a.name,
                               color_hex=a.color_hex, color_name=a.color_name or a.name, wardrobe_id=a.id)
            o.items = [i for i in o.items if i.slot != a.slot] + [piece]
            if a.slot == "one_piece":
                o.items = [i for i in o.items if i.slot not in ("top", "bottom")]
            o.items.sort(key=lambda i: SLOT_ORDER[i.slot])

    try:
        intensity = min(1.0, max(0.0, float(raw.get("intensity", 0.5))))
    except (TypeError, ValueError):
        intensity = 0.5

    return Recommendation(
        id=rec_id,
        source=source,  # type: ignore[arg-type]
        tier=tier,  # type: ignore[arg-type]
        dominant=dominant,  # type: ignore[arg-type]
        intensity=round(intensity, 2),
        emotions=[{"key": k, "score": v} for k, v in emotions],
        mood_summary=_clip(raw.get("mood_summary"), 200),
        palette=tune,
        lift_palette=lift,
        color_notes=color_notes(emotions, req.locale),
        outfits=outfits,
        uses_wardrobe=any(i.wardrobe_id for o in outfits for i in o.items),
        wellbeing_concern=bool(raw.get("wellbeing_concern", False)),
    )


def validate_swap(raw: dict, req) -> OutfitItem | None:
    """Check a replacement piece (from Claude or the fallback) before it reaches the app."""
    target = req.outfit.items[req.index]
    avoid_c = set(req.prefs.avoid_colors) if req.prefs else set()
    avoid_t = set(req.prefs.avoid_types) if req.prefs else set()
    in_use = {i.wardrobe_id for j, i in enumerate(req.outfit.items) if i.wardrobe_id and j != req.index}
    owned = {w.id: w for w in (req.wardrobe or [])}
    wid = raw.get("wardrobe_id")
    if wid and wid in owned and owned[wid].slot == target.slot and wid not in in_use and wid != target.wardrobe_id:
        w = owned[wid]
        return OutfitItem(slot=w.slot, type=w.type if w.type in GARMENTS else "tshirt", name=w.name,
                          color_hex=w.color_hex, color_name=w.color_name or w.name, wardrobe_id=w.id)
    gtype = str(raw.get("type", "")).lower()
    if gtype not in GARMENTS or GARMENTS[gtype] != target.slot or gtype in avoid_t:
        return None
    if req.fit == "menswear" and gtype in MENSWEAR_BLOCK:
        return None
    hx = _hex(raw.get("color_hex"))
    if not hx:
        return None
    name = _clip(raw.get("name"), 48)
    safe = avoid_safe(hx, avoid_c, [p.hex for p in req.palette])
    cname = _clip(raw.get("color_name"), 24) if safe == hx else name_for(safe, req.locale)
    same = name.lower() == target.name.lower() and safe == target.color_hex.upper()
    if not name or same:
        return None
    return OutfitItem(slot=target.slot, type=gtype, name=name, color_hex=safe, color_name=cname or name_for(safe, req.locale))
