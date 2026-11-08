"""Claude-powered emotion reading + outfit generation (one call), and wardrobe photo tagging."""

from __future__ import annotations

import json
import os
import uuid
from functools import lru_cache

from anthropic import AsyncAnthropic

from .catalog import EMOTIONS, GARMENTS, OCCASIONS, SLOTS, STYLE_BRIEFS
from .color_science import PAD, in_tune_palette, lift_palette
from .postprocess import finalize
from .schemas import Recommendation, RecommendRequest, TagResponse

MODEL = os.getenv("SENSEA_MODEL", "claude-haiku-5-5")
VISION_MODEL = os.getenv("SENSEA_VISION_MODEL", MODEL)
TIMEOUT_S = float(os.getenv("SENSEA_LLM_TIMEOUT", "30"))

_client: AsyncAnthropic | None = None


def llm_enabled() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(timeout=TIMEOUT_S, max_retries=1)
    return _client


_ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "wardrobe_id": {"type": ["string", "null"], "description": "id of the user's own piece, or null for a suggested piece"},
        "slot": {"type": "string", "enum": SLOTS},
        "type": {"type": "string", "enum": list(GARMENTS.keys())},
        "name": {"type": "string", "description": "Specific piece, e.g. 'Oversized linen shirt'. Max 40 chars."},
        "color_hex": {"type": "string", "description": "#RRGGBB"},
        "color_name": {"type": "string", "description": "Evocative colour name, max 20 chars."},
    },
    "required": ["slot", "type", "name", "color_hex", "color_name"],
}

_OUTFIT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "2-4 word name for the look."},
        "vibe": {"type": "string", "description": "3-6 words describing the feeling of the look."},
        "items": {"type": "array", "items": _ITEM_SCHEMA, "minItems": 4, "maxItems": 6},
        "why": {"type": "string", "description": "1-2 sentences: why these colours and pieces fit this mood."},
        "tip": {"type": "string", "description": "One concrete styling tip, max 1 sentence."},
    },
    "required": ["title", "vibe", "items", "why", "tip"],
}

TOOL = {
    "name": "submit_recommendation",
    "description": "Return the emotion reading and two outfit suggestions.",
    "input_schema": {
        "type": "object",
        "properties": {
            "emotions": {
                "type": "object",
                "description": "Share of each emotion in the text, 0-1. Should add up to ~1.",
                "properties": {k: {"type": "number"} for k in EMOTIONS},
                "required": EMOTIONS,
            },
            "intensity": {"type": "number", "description": "How strongly the feelings are expressed, 0-1."},
            "mood_summary": {
                "type": "string",
                "description": "One warm sentence reflecting the mood back, max 22 words. Not therapy, no advice.",
            },
            "outfits": {"type": "array", "items": _OUTFIT_SCHEMA, "minItems": 2, "maxItems": 2},
            "wellbeing_concern": {
                "type": "boolean",
                "description": "True ONLY if the text suggests self-harm, suicidal thoughts or immediate danger.",
            },
        },
        "required": ["emotions", "intensity", "mood_summary", "outfits", "wellbeing_concern"],
    },
}


@lru_cache(maxsize=1)
def _palette_table() -> str:
    rows = {}
    for e in PAD:
        rows[e] = {
            "in_tune": [s.hex for s in in_tune_palette([(e, 1.0)], "en")],
            "lift": [s.hex for s in lift_palette([(e, 1.0)], "en")],
        }
    return json.dumps(rows)


def _system_prompt() -> str:
    return f"""You are Sensea, a stylist who dresses people according to how they feel.

STEP 1 - Read the emotion.
The user writes freely, usually in Turkish or English, sometimes with slang, emoji or a single word.
Distribute their feeling across exactly these 8 emotions: {", ".join(EMOTIONS)}.
Mixed feelings are normal ("yorgunum ama heyecanlıyım" -> tired + excited). Scores sum to 1.
If the text says nothing about feelings, lean towards calm with low intensity.

STEP 2 - Use the research-based colour palettes below (do not invent your own colour story).
They come from cross-cultural colour–emotion associations (hue) and the finding that saturation
tracks arousal and lightness tracks pleasantness. Per emotion, 5 swatches:
[accent, second accent, third accent, light neutral, dark neutral].
{_palette_table()}
- Outfit 1 "in tune": colours from the DOMINANT emotion's in_tune palette; you may take one accent
  from the second emotion's in_tune palette if it is strong (>= 0.2).
- Outfit 2 "lift": colours from the dominant emotion's lift palette.
- Classic denim blue, white, black and neutrals may be added for wearability. Stay close to the swatches.

STEP 3 - Build TWO complete outfits in the user's style.
Style briefs: {json.dumps(STYLE_BRIEFS)}
- Each outfit: either top+bottom or one_piece, plus shoes, optionally outer and 1-2 accessories. 4-6 items.
- Use only these garment types (slot in brackets): {json.dumps(GARMENTS)}.
- menswear -> no dress/skirt/heels/blouse/necklace unless they own it; womenswear -> anything; unisex -> gender-neutral.
- Respect weather when given: cold (<10C) needs outer layer, rain -> boots/coat, hot (>26C) -> light fabrics, no coats.
- Respect the occasion: {", ".join(OCCASIONS)}.

WARDROBE MODE (only when a <wardrobe> list is given):
- Build both outfits from the user's own pieces, referencing them by "wardrobe_id" and copying their type/slot/colour.
- Choose owned pieces whose colours are closest to the palette for that outfit.
- At most ONE suggested piece the user does not own per outfit (wardrobe_id null), only if it clearly completes the look.
- Never use the same owned piece in both outfits if alternatives exist.
- When pieces suit equally well, prefer ones not worn for a while (high days_since_worn, or null = never worn);
  avoid pieces worn in the last 2 days.

Write every human-readable field in the requested language. Be specific and fresh: avoid repeating
the same pieces for both outfits. Never diagnose, never give medical advice.
Always answer by calling the submit_recommendation tool."""


def _user_prompt(req: RecommendRequest) -> str:
    lang = "Turkish" if req.locale == "tr" else "English"
    weather = f"{req.weather.temp_c:.0f}C, {req.weather.condition}" if req.weather else "unknown"
    parts = [
        f"Language: {lang}\nStyle: {' + '.join(req.style_mix)}"
        + (" (blend these styles naturally; the first one leads)" if len(req.style_mix) > 1 else "")
        + f"\nFit: {req.fit}\nOccasion: {req.occasion}\nWeather: {weather}",
    ]
    if req.prefs:
        p = req.prefs
        lines = []
        if p.avoid_colors:
            lines.append(f"NEVER use these colour families: {', '.join(p.avoid_colors)}.")
        if p.avoid_types:
            lines.append(f"NEVER use these garment types: {', '.join(p.avoid_types)}.")
        if p.liked_colors or p.liked_types:
            lines.append(f"They tend to like: {', '.join(p.liked_colors + p.liked_types)}.")
        if p.disliked_colors or p.disliked_types:
            lines.append(f"They tend to dislike: {', '.join(p.disliked_colors + p.disliked_types)}.")
        if lines:
            parts.append("User preferences:\n" + "\n".join(lines))
    if req.wardrobe:
        compact = [{"id": w.id, "slot": w.slot, "type": w.type, "name": w.name, "color": w.color_hex, "warmth": w.warmth,
                    "days_since_worn": w.days_since_worn, "times_worn": w.wear_count}
                   for w in req.wardrobe]
        parts.append(f"<wardrobe>\n{json.dumps(compact, ensure_ascii=False)}\n</wardrobe>")
        if req.anchor_ids:
            parts.append(f"BOTH outfits MUST include the wardrobe pieces with these ids: {', '.join(req.anchor_ids)}. "
                         "Build the rest of each look around them.")
    parts.append(f"How the user feels:\n<user_text>\n{req.text}\n</user_text>")
    return "\n\n".join(parts)


async def recommend_with_llm(req: RecommendRequest, tier: str = "free") -> Recommendation:
    client = _get_client()
    msg = await client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=_system_prompt(),
        tools=[TOOL],
        tool_choice={"type": "tool", "name": "submit_recommendation"},
        messages=[{"role": "user", "content": _user_prompt(req)}],
    )
    block = next((b for b in msg.content if b.type == "tool_use"), None)
    if block is None:
        raise RuntimeError("model did not return a tool call")
    raw = block.input if isinstance(block.input, dict) else json.loads(block.input)
    return finalize(raw, req, source="ai", rec_id=uuid.uuid4().hex[:12], tier=tier, wardrobe=req.wardrobe)


# ---------------------------------------------------------------- wardrobe tagging (vision)
TAG_TOOL = {
    "name": "tag_garment",
    "description": "Describe the single main clothing item or accessory in the photo.",
    "input_schema": {
        "type": "object",
        "properties": {
            "is_garment": {"type": "boolean", "description": "False if the photo does not show a clothing item/accessory."},
            "type": {"type": "string", "enum": list(GARMENTS.keys())},
            "name": {"type": "string", "description": "Short specific name, e.g. 'Cropped denim jacket'. Max 40 chars."},
            "color_hex": {"type": "string", "description": "Main fabric colour as #RRGGBB (ignore background)."},
            "color_name": {"type": "string", "description": "Colour name, max 20 chars."},
            "warmth": {"type": "string", "enum": ["light", "medium", "warm"]},
        },
        "required": ["is_garment", "type", "name", "color_hex", "color_name", "warmth"],
    },
}


async def tag_with_llm(image_b64: str, locale: str) -> TagResponse | None:
    lang = "Turkish" if locale == "tr" else "English"
    data = image_b64.split(",", 1)[1] if image_b64.startswith("data:") else image_b64
    msg = await _get_client().messages.create(
        model=VISION_MODEL,
        max_tokens=400,
        tools=[TAG_TOOL],
        tool_choice={"type": "tool", "name": "tag_garment"},
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}},
                {"type": "text", "text": f"Tag this clothing item for a wardrobe app. Write name and color_name in {lang}."},
            ],
        }],
    )
    block = next((b for b in msg.content if b.type == "tool_use"), None)
    if block is None:
        raise RuntimeError("no tool call")
    r = block.input
    if not r.get("is_garment", True):
        return None
    gtype = r.get("type") if r.get("type") in GARMENTS else "tshirt"
    return TagResponse(slot=GARMENTS[gtype], type=gtype, name=str(r.get("name", ""))[:48], color_hex=r.get("color_hex", "#808080"),
                       color_name=str(r.get("color_name", ""))[:24], warmth=r.get("warmth", "medium"))


# ---------------------------------------------------------------- swap a single piece
SWAP_TOOL = {
    "name": "swap_piece",
    "description": "Return one replacement piece for the outfit.",
    "input_schema": _ITEM_SCHEMA,
}


async def swap_with_llm(req) -> dict:
    target = req.outfit.items[req.index]
    lang = "Turkish" if req.locale == "tr" else "English"
    others = [f"{i.name} ({i.slot}, {i.color_hex})" for j, i in enumerate(req.outfit.items) if j != req.index]
    allowed = {k: v for k, v in GARMENTS.items() if v == target.slot}
    lines = [
        f"Language: {lang}\nStyle: {' + '.join(req.style_mix)}\nFit: {req.fit}\nOccasion: {req.occasion}\nMood: {req.dominant}",
        f"Outfit: {req.outfit.title}. Keep these pieces: {'; '.join(others)}.",
        f"The user wants to REPLACE: {target.name} ({target.type}, {target.color_hex}).",
        f"Suggest ONE different piece for the same slot ({target.slot}); types allowed: {', '.join(allowed)}.",
        f"Use a colour from this palette or a wearable neutral: {', '.join(p.hex for p in req.palette)}.",
        "It must clearly differ from the replaced piece (type or colour) and work with the rest of the outfit.",
    ]
    if req.weather:
        lines.append(f"Weather: {req.weather.temp_c:.0f}C, {req.weather.condition}.")
    if req.prefs and (req.prefs.avoid_colors or req.prefs.avoid_types):
        lines.append(f"NEVER use colour families {req.prefs.avoid_colors} or types {req.prefs.avoid_types}.")
    used = {i.wardrobe_id for i in req.outfit.items if i.wardrobe_id}
    owned = [w for w in (req.wardrobe or []) if w.slot == target.slot and w.id not in used]
    if owned:
        lines.append("Pick from the user's own pieces (set wardrobe_id), prefer ones not worn for a while: " + json.dumps(
            [{"id": w.id, "type": w.type, "name": w.name, "color": w.color_hex, "days_since_worn": w.days_since_worn}
             for w in owned], ensure_ascii=False))
    lines.append(f"Variation seed: {req.seed}")
    msg = await _get_client().messages.create(
        model=MODEL,
        max_tokens=300,
        tools=[SWAP_TOOL],
        tool_choice={"type": "tool", "name": "swap_piece"},
        messages=[{"role": "user", "content": "\n".join(lines)}],
    )
    block = next((b for b in msg.content if b.type == "tool_use"), None)
    if block is None:
        raise RuntimeError("no tool call")
    return dict(block.input)
