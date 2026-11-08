"""Shared vocabulary between the backend and the mobile app.

Every key here has a twin in the app (src/lib/catalog.ts). If you add a garment
type, also add its drawing in the app (src/components/garments.tsx).
"""

EMOTIONS = ["happy", "excited", "calm", "confident", "tired", "sad", "anxious", "angry"]

STYLES = ["casual", "sporty", "old_money", "classic", "minimal", "streetwear"]

FITS = ["menswear", "womenswear", "unisex"]

OCCASIONS = ["everyday", "work", "date", "sport", "night_out", "travel"]

WEATHER_CONDITIONS = ["clear", "cloudy", "rain", "snow", "fog", "storm", "wind"]

SLOTS = ["top", "outer", "bottom", "one_piece", "shoes", "accessory"]

# garment type -> slot it belongs to
GARMENTS: dict[str, str] = {
    "tshirt": "top",
    "longsleeve": "top",
    "shirt": "top",
    "polo": "top",
    "blouse": "top",
    "tank": "top",
    "knit": "top",
    "hoodie": "top",
    "cardigan": "outer",
    "jacket": "outer",
    "blazer": "outer",
    "coat": "outer",
    "puffer": "outer",
    "jeans": "bottom",
    "trousers": "bottom",
    "shorts": "bottom",
    "skirt": "bottom",
    "joggers": "bottom",
    "dress": "one_piece",
    "sneakers": "shoes",
    "boots": "shoes",
    "loafers": "shoes",
    "heels": "shoes",
    "sandals": "shoes",
    "bag": "accessory",
    "cap": "accessory",
    "beanie": "accessory",
    "scarf": "accessory",
    "watch": "accessory",
    "sunglasses": "accessory",
    "belt": "accessory",
    "necklace": "accessory",
}

STYLE_BRIEFS = {
    "casual": "relaxed everyday pieces: tees, knits, straight jeans, clean sneakers",
    "sporty": "athleisure: performance fabrics, joggers, zip layers, runners, caps",
    "old_money": "quiet luxury: fine knits, linen, pleated trousers, loafers, muted heritage colors",
    "classic": "timeless tailoring: crisp shirts, blazers, trench coats, leather shoes",
    "minimal": "few pieces, clean lines, monochrome or tonal palettes, no logos",
    "streetwear": "oversized silhouettes, hoodies, cargos, chunky sneakers, graphic or bold accents",
}

# Colour palettes are computed in color_science.py from published colour–emotion research.
