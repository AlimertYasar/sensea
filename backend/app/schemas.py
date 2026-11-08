from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

EmotionKey = Literal["happy", "excited", "calm", "confident", "tired", "sad", "anxious", "angry"]
Style = Literal["casual", "sporty", "old_money", "classic", "minimal", "streetwear"]
Fit = Literal["menswear", "womenswear", "unisex"]
Occasion = Literal["everyday", "work", "date", "sport", "night_out", "travel"]
Locale = Literal["tr", "en"]
Condition = Literal["clear", "cloudy", "rain", "snow", "fog", "storm", "wind"]
Slot = Literal["top", "outer", "bottom", "one_piece", "shoes", "accessory"]
Tier = Literal["free", "premium", "plus"]
Warmth = Literal["light", "medium", "warm"]

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _norm_hex(v: str) -> str:
    v = v.strip()
    if not v.startswith("#"):
        v = "#" + v
    if not HEX_RE.match(v):
        raise ValueError(f"invalid hex colour {v}")
    return v.upper()


class Weather(BaseModel):
    temp_c: float = Field(ge=-60, le=60)
    condition: Condition = "clear"


class WardrobeItem(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    slot: Slot
    type: str = Field(max_length=20)
    name: str = Field(max_length=60)
    color_hex: str
    color_name: str = Field(default="", max_length=30)
    warmth: Warmth = "medium"
    days_since_worn: Optional[int] = Field(default=None, ge=0, le=3650)  # None = never worn
    wear_count: int = Field(default=0, ge=0, le=100000)

    _hex = field_validator("color_hex")(classmethod(lambda cls, v: _norm_hex(v)))


ColorFamily = Literal["black", "white", "grey", "beige", "brown", "navy", "red", "orange", "yellow", "green", "blue", "purple", "pink"]


class Prefs(BaseModel):
    """Hard constraints (avoid_*) from the profile and soft taste learned from feedback."""
    avoid_colors: list[ColorFamily] = Field(default_factory=list, max_length=13)
    avoid_types: list[str] = Field(default_factory=list, max_length=32)
    liked_colors: list[ColorFamily] = Field(default_factory=list, max_length=6)
    disliked_colors: list[ColorFamily] = Field(default_factory=list, max_length=6)
    liked_types: list[str] = Field(default_factory=list, max_length=8)
    disliked_types: list[str] = Field(default_factory=list, max_length=8)


class RecommendRequest(BaseModel):
    text: str = Field(min_length=1, max_length=600)
    style: Style = "casual"
    styles: Optional[list[Style]] = Field(default=None, max_length=3)  # blend of up to 3 styles
    fit: Fit = "unisex"
    occasion: Occasion = "everyday"
    locale: Locale = "tr"
    weather: Optional[Weather] = None
    wardrobe: Optional[list[WardrobeItem]] = Field(default=None, max_length=250)
    prefs: Optional[Prefs] = None
    anchor_ids: Optional[list[str]] = Field(default=None, max_length=2)  # wardrobe pieces that must be worn

    @field_validator("text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("text is empty")
        return v

    @property
    def style_mix(self) -> list[str]:
        """The styles to blend, in priority order (deduplicated)."""
        out: list[str] = []
        for s in (self.styles or [self.style]):
            if s not in out:
                out.append(s)
        return out or [self.style]


class EmotionScore(BaseModel):
    key: EmotionKey
    score: float = Field(ge=0, le=1)


class Swatch(BaseModel):
    hex: str
    name: str

    _hex = field_validator("hex")(classmethod(lambda cls, v: _norm_hex(v)))


class OutfitItem(BaseModel):
    slot: Slot
    type: str
    name: str
    color_hex: str
    color_name: str
    wardrobe_id: Optional[str] = None  # set when the piece comes from the user's wardrobe

    _hex = field_validator("color_hex")(classmethod(lambda cls, v: _norm_hex(v)))


class Outfit(BaseModel):
    title: str
    vibe: str
    items: list[OutfitItem] = Field(min_length=3, max_length=7)
    why: str
    tip: str


class Recommendation(BaseModel):
    id: str
    source: Literal["ai", "fallback"]
    tier: Tier = "free"
    dominant: EmotionKey
    intensity: float = Field(ge=0, le=1)
    emotions: list[EmotionScore]
    mood_summary: str
    palette: list[Swatch] = Field(min_length=3, max_length=5)       # "in tune" palette
    lift_palette: list[Swatch] = Field(default_factory=list, max_length=5)
    color_notes: list[str] = Field(default_factory=list)            # research basis, shown in the app
    outfits: list[Outfit] = Field(min_length=1, max_length=2)
    uses_wardrobe: bool = False
    wellbeing_concern: bool = False


# ---- premium: realistic render ---------------------------------------------------
class RenderRef(BaseModel):
    wardrobe_id: str = Field(max_length=40)
    image_b64: str = Field(max_length=700_000)  # ~500 KB jpeg, resized on device


class RenderRequest(BaseModel):
    outfit: Outfit
    fit: Fit = "unisex"
    dominant: EmotionKey = "calm"
    locale: Locale = "tr"
    refs: Optional[list[RenderRef]] = Field(default=None, max_length=4)


class RenderResponse(BaseModel):
    image: str  # data:image/jpeg;base64,...
    provider: str
    remaining: int


# ---- premium plus: wardrobe tagging -----------------------------------------------
class TagRequest(BaseModel):
    image_b64: str = Field(min_length=100, max_length=700_000)
    locale: Locale = "tr"


class TagResponse(BaseModel):
    slot: Slot
    type: str
    name: str
    color_hex: str
    color_name: str
    warmth: Warmth = "medium"
    needs_review: bool = False
    cutout: Optional[str] = None  # data:image/png;base64 with the background removed (when available)

    _hex = field_validator("color_hex")(classmethod(lambda cls, v: _norm_hex(v)))


class MeResponse(BaseModel):
    tier: Tier
    daily_left: Optional[int]
    renders_left: int
    tags_left: int


# ---- swap a single piece ------------------------------------------------------------
class SwapRequest(BaseModel):
    outfit: Outfit
    index: int = Field(ge=0, le=6)
    dominant: EmotionKey = "calm"
    palette: list[Swatch] = Field(min_length=1, max_length=5)
    style: Style = "casual"
    styles: Optional[list[Style]] = Field(default=None, max_length=3)
    fit: Fit = "unisex"
    occasion: Occasion = "everyday"
    locale: Locale = "tr"
    weather: Optional[Weather] = None
    prefs: Optional[Prefs] = None
    wardrobe: Optional[list[WardrobeItem]] = Field(default=None, max_length=250)
    seed: int = 0  # changes on every tap so repeated swaps give different pieces

    @property
    def style_mix(self) -> list[str]:
        out: list[str] = []
        for s in (self.styles or [self.style]):
            if s not in out:
                out.append(s)
        return out or [self.style]


class SwapResponse(BaseModel):
    item: OutfitItem
