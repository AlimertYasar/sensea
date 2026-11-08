"""Realistic outfit renders (Premium) + local helpers for wardrobe photos.

Provider: fal.ai (FLUX.2 [pro] by default). Swap models with env vars; any fal text-to-image
endpoint that accepts `prompt` + `image_size` works. When the request carries wardrobe photos
(Premium Plus) the edit endpoint is used so the render follows the user's real clothes.
Without FAL_KEY a clearly-labelled demo image is returned so the app flow can be tested.
"""

from __future__ import annotations

import base64
import io
import os

import httpx
from PIL import Image, ImageDraw, ImageFilter

from .color_science import name_for
from .schemas import Outfit, RenderRef, TagResponse

FAL_KEY = os.getenv("FAL_KEY", "")
FAL_MODEL = os.getenv("SENSEA_IMAGE_MODEL", "fal-ai/flux-2-pro")
FAL_EDIT_MODEL = os.getenv("SENSEA_IMAGE_EDIT_MODEL", "fal-ai/flux-2-pro/edit")
FAL_BG_MODEL = os.getenv("SENSEA_BG_MODEL", "fal-ai/birefnet/v2")

# Settings carried over from the original Sensea image prompts, softened where needed.
SCENES = {
    "happy": "a sunny botanical garden with blooming flowers and bright greenery, warm natural light",
    "excited": "a colourful evening street festival with soft bokeh lights",
    "calm": "a minimalist beige living room with soft morning sunlight and wooden furniture",
    "confident": "a modern glass-walled office lobby with clean architectural lines",
    "tired": "a cosy bedroom corner with a warm reading lamp and soft blankets, early evening",
    "sad": "a quiet room by a large window on a rainy grey day, soft diffused light",
    "anxious": "a calm, quiet park path in soft overcast light",
    "angry": "a city street at dusk with cool blue light and gentle motion blur in the background",
}

PERSON = {
    "menswear": "a young adult man",
    "womenswear": "a young adult woman",
    "unisex": "a young adult with an androgynous style",
}


def render_enabled() -> bool:
    return bool(FAL_KEY)


def build_prompt(outfit: Outfit, fit: str, dominant: str, with_refs: bool) -> str:
    pieces = "; ".join(f"{i.name} in {name_for(i.color_hex, 'en').lower()} ({i.color_hex})" for i in outfit.items)
    ref = (" The garments must match the reference photos exactly in cut, colour and details." if with_refs else "")
    return (
        f"Editorial full-body fashion photograph of {PERSON.get(fit, PERSON['unisex'])} wearing: {pieces}.{ref} "
        f"Setting: {SCENES.get(dominant, SCENES['calm'])}. Natural relaxed pose, head-to-toe framing, "
        "35mm lens, realistic fabric texture and skin, shallow depth of field, magazine quality. "
        "No text, no logos, no watermark."
    )


async def render(outfit: Outfit, fit: str, dominant: str, refs: list[RenderRef] | None) -> tuple[str, str]:
    """Returns (data URI, provider name)."""
    prompt = build_prompt(outfit, fit, dominant, bool(refs))
    if not FAL_KEY:
        return demo_image(outfit, dominant), "demo"
    body: dict = {
        "prompt": prompt,
        "image_size": {"width": 768, "height": 1024},
        "output_format": "jpeg",
        "sync_mode": True,  # image comes back inline; nothing is stored on fal's side
        "safety_tolerance": "2",
    }
    model = FAL_MODEL
    if refs:
        model = FAL_EDIT_MODEL
        body["image_urls"] = [r.image_b64 if r.image_b64.startswith("data:") else f"data:image/jpeg;base64,{r.image_b64}" for r in refs]
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"https://fal.run/{model}", json=body, headers={"Authorization": f"Key {FAL_KEY}"})
        r.raise_for_status()
        url = r.json()["images"][0]["url"]
        if url.startswith("data:"):
            return url, "fal"
        img = await client.get(url)
        img.raise_for_status()
        return "data:image/jpeg;base64," + base64.b64encode(img.content).decode(), "fal"


def demo_image(outfit: Outfit, dominant: str) -> str:
    """Placeholder used in development: vertical card with the outfit colours."""
    w, h = 768, 1024
    im = Image.new("RGB", (w, h), "#EFE8F6")
    d = ImageDraw.Draw(im)
    band = h // max(1, len(outfit.items))
    for i, it in enumerate(outfit.items):
        d.rectangle([0, i * band, w, (i + 1) * band], fill=it.color_hex)
    im = im.filter(ImageFilter.GaussianBlur(40))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([40, h - 150, w - 40, h - 40], radius=28, fill="#191022")
    d.text((70, h - 120), "DEMO - set FAL_KEY for real AI renders", fill="#F4EFFA")
    d.text((70, h - 90), f"{outfit.title} / {dominant}", fill="#B3A2CB")
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def tag_locally(image_b64: str, locale: str) -> TagResponse:
    """Fallback tagger without AI: dominant colour of the centre of the photo; type must be reviewed."""
    data = image_b64.split(",", 1)[1] if image_b64.startswith("data:") else image_b64
    im = Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")
    cw, ch = im.size
    im = im.crop((cw // 4, ch // 4, cw * 3 // 4, ch * 3 // 4)).resize((64, 64))
    q = im.quantize(colors=4)
    palette = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    idx = counts[0][1]
    r, g, b = palette[idx * 3: idx * 3 + 3]
    hx = "#{:02X}{:02X}{:02X}".format(r, g, b)
    cname = name_for(hx, locale)
    return TagResponse(slot="top", type="tshirt", name=cname, color_hex=hx, color_name=cname, needs_review=True)


async def remove_background(image_b64: str) -> str | None:
    """Cut the garment out of its background (Premium Plus wardrobe). Returns a PNG data URI or None."""
    if not FAL_KEY:
        return None
    uri = image_b64 if image_b64.startswith("data:") else f"data:image/jpeg;base64,{image_b64}"
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"https://fal.run/{FAL_BG_MODEL}",
                json={"image_url": uri, "output_format": "png", "sync_mode": True, "refine_foreground": True},
                headers={"Authorization": f"Key {FAL_KEY}"},
            )
            r.raise_for_status()
            url = r.json()["image"]["url"]
            if url.startswith("data:"):
                return url
            img = await client.get(url)
            img.raise_for_status()
            return "data:image/png;base64," + base64.b64encode(img.content).decode()
    except Exception:
        return None
