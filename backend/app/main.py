from __future__ import annotations

import asyncio
import logging
import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from . import images
from .entitlements import LIMITS, Usage, resolve_tier
from .fallback import CRISIS, recommend_fallback, tr_lower
from .llm import MODEL, llm_enabled, recommend_with_llm, tag_with_llm
from .fallback import swap_fallback
from .llm import swap_with_llm
from .postprocess import validate_swap
from .schemas import (MeResponse, Recommendation, RecommendRequest, RenderRequest, RenderResponse, SwapRequest,
                      SwapResponse, TagRequest, TagResponse)

log = logging.getLogger("sensea")
logging.basicConfig(level=logging.INFO)

APP_KEY = os.getenv("SENSEA_APP_KEY", "")
BURST_LIMIT = int(os.getenv("SENSEA_RATE_LIMIT", "30"))  # any request type, per client per window
BURST_WINDOW_S = int(os.getenv("SENSEA_RATE_WINDOW", "600"))

app = FastAPI(title="Sensea API", version="2.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("SENSEA_CORS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_hits: dict[str, deque[float]] = defaultdict(deque)
_usage: Usage | None = None


def usage() -> Usage:
    global _usage
    if _usage is None:
        _usage = Usage()
    return _usage


def _burst(client_id: str) -> None:
    now = time.monotonic()
    q = _hits[client_id]
    while q and now - q[0] > BURST_WINDOW_S:
        q.popleft()
    if len(q) >= BURST_LIMIT:
        raise HTTPException(status_code=429, detail="RATE_LIMITED")
    q.append(now)


async def _context(request: Request, x_sensea_key: str | None, x_install_id: str | None, x_dev_tier: str | None):
    if APP_KEY and x_sensea_key != APP_KEY:
        raise HTTPException(status_code=401, detail="UNAUTHORIZED")
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0]
    user = (x_install_id or "").strip()[:64] or f"ip:{ip}"
    _burst(user)
    tier = await resolve_tier(x_install_id, x_dev_tier)
    return user, tier


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "ai" if llm_enabled() else "fallback",
        "model": MODEL if llm_enabled() else None,
        "renders": "fal" if images.render_enabled() else "demo",
    }


@app.get("/v1/me", response_model=MeResponse)
async def me(request: Request, x_sensea_key: str | None = Header(default=None),
             x_install_id: str | None = Header(default=None), x_dev_tier: str | None = Header(default=None)):
    user, tier = await _context(request, x_sensea_key, x_install_id, x_dev_tier)
    lim = LIMITS[tier]
    u = usage()
    return MeResponse(
        tier=tier,
        daily_left=u.left(user, "recommend_day", lim["recommend_day"]) if tier == "free" else None,
        renders_left=u.left(user, "render_month", lim["render_month"]),
        tags_left=u.left(user, "tag_month", lim["tag_month"]),
    )


@app.post("/v1/recommend", response_model=Recommendation)
async def recommend(req: RecommendRequest, request: Request, x_sensea_key: str | None = Header(default=None),
                    x_install_id: str | None = Header(default=None), x_dev_tier: str | None = Header(default=None)):
    user, tier = await _context(request, x_sensea_key, x_install_id, x_dev_tier)
    if not usage().take(user, "recommend_day", LIMITS[tier]["recommend_day"]):
        raise HTTPException(status_code=429, detail="DAILY_LIMIT")
    if tier != "plus":
        req.wardrobe = None  # wardrobe outfits are a Premium Plus feature
        req.anchor_ids = None

    # Privacy: never log the user's text.
    rec: Recommendation
    if llm_enabled():
        try:
            rec = await recommend_with_llm(req, tier)
        except Exception as exc:  # network, quota, malformed output...
            log.warning("LLM failed, using fallback: %s", type(exc).__name__)
            rec = recommend_fallback(req, tier)
    else:
        rec = recommend_fallback(req, tier)

    if any(c in tr_lower(req.text) for c in CRISIS):
        rec.wellbeing_concern = True
    return rec


@app.post("/v1/swap", response_model=SwapResponse)
async def swap(req: SwapRequest, request: Request, x_sensea_key: str | None = Header(default=None),
               x_install_id: str | None = Header(default=None), x_dev_tier: str | None = Header(default=None)):
    """Replace one piece of an outfit, keeping the rest."""
    user, tier = await _context(request, x_sensea_key, x_install_id, x_dev_tier)
    if req.index >= len(req.outfit.items):
        raise HTTPException(status_code=422, detail="BAD_INDEX")
    if not usage().take(user, "swap_day", LIMITS[tier]["swap_day"]):
        raise HTTPException(status_code=429, detail="SWAP_LIMIT")
    if tier != "plus":
        req.wardrobe = None
    item = None
    if llm_enabled():
        try:
            item = validate_swap(await swap_with_llm(req), req)
        except Exception as exc:
            log.warning("swap LLM failed: %s", type(exc).__name__)
    for attempt in range(4):  # fallback, retrying with new seeds until it yields a valid, different piece
        if item:
            break
        req.seed += attempt
        item = validate_swap(swap_fallback(req), req)
    if not item:
        usage().give_back(user, "swap_day")
        raise HTTPException(status_code=422, detail="NO_ALTERNATIVE")
    return SwapResponse(item=item)


@app.post("/v1/render", response_model=RenderResponse)
async def render(req: RenderRequest, request: Request, x_sensea_key: str | None = Header(default=None),
                 x_install_id: str | None = Header(default=None), x_dev_tier: str | None = Header(default=None)):
    user, tier = await _context(request, x_sensea_key, x_install_id, x_dev_tier)
    if tier == "free":
        raise HTTPException(status_code=402, detail="PREMIUM_REQUIRED")
    limit = LIMITS[tier]["render_month"]
    if not usage().take(user, "render_month", limit):
        raise HTTPException(status_code=429, detail="RENDER_LIMIT")
    refs = req.refs if tier == "plus" else None
    try:
        image, provider = await images.render(req.outfit, req.fit, req.dominant, refs)
    except Exception as exc:
        usage().give_back(user, "render_month")
        log.warning("render failed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="RENDER_FAILED") from exc
    return RenderResponse(image=image, provider=provider, remaining=usage().left(user, "render_month", limit))


@app.post("/v1/wardrobe/tag", response_model=TagResponse)
async def tag(req: TagRequest, request: Request, x_sensea_key: str | None = Header(default=None),
              x_install_id: str | None = Header(default=None), x_dev_tier: str | None = Header(default=None)):
    user, tier = await _context(request, x_sensea_key, x_install_id, x_dev_tier)
    if tier != "plus":
        raise HTTPException(status_code=402, detail="PLUS_REQUIRED")
    if not usage().take(user, "tag_month", LIMITS[tier]["tag_month"]):
        raise HTTPException(status_code=429, detail="TAG_LIMIT")
    try:
        if llm_enabled():
            res, cutout = await asyncio.gather(tag_with_llm(req.image_b64, req.locale), images.remove_background(req.image_b64))
            if res is None:
                usage().give_back(user, "tag_month")
                raise HTTPException(status_code=422, detail="NOT_A_GARMENT")
        else:
            res, cutout = images.tag_locally(req.image_b64, req.locale), await images.remove_background(req.image_b64)
        res.cutout = cutout
        return res
    except HTTPException:
        raise
    except Exception as exc:
        log.warning("tagging failed: %s", type(exc).__name__)
        try:
            return images.tag_locally(req.image_b64, req.locale)
        except Exception:
            usage().give_back(user, "tag_month")
            raise HTTPException(status_code=422, detail="BAD_IMAGE") from exc


EVENTS = {
    "app_open", "onboarding_done", "recommend", "result_view", "outfit_like", "outfit_dislike", "outfit_worn",
    "outfit_saved", "share_card", "render", "swap", "reminder_on", "weekly_view", "anchor_outfit", "paywall_view", "purchase_start", "purchase_done", "wardrobe_add",
    "prefs_changed", "error",
}
ADMIN_KEY = os.getenv("SENSEA_ADMIN_KEY", "")


class EventIn(BaseModel):
    name: str = Field(max_length=40)


@app.post("/v1/events", status_code=204)
async def event(ev: EventIn, request: Request, x_sensea_key: str | None = Header(default=None),
                x_install_id: str | None = Header(default=None), x_dev_tier: str | None = Header(default=None)):
    """Anonymous counter. Only the event name and the subscription tier are recorded."""
    _, tier = await _context(request, x_sensea_key, x_install_id, x_dev_tier)
    if ev.name in EVENTS:
        usage().count_event(ev.name, tier)


@app.get("/v1/stats")
def stats(days: int = 30, x_admin_key: str | None = Header(default=None)):
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=404)
    return usage().event_stats(min(max(days, 1), 365))


PRIVACY_HTML = """<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sensea Gizlilik Politikası / Privacy Policy</title>
<style>body{font-family:system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 20px;line-height:1.6;color:#221a2b}h1{font-size:28px}h2{font-size:18px;margin-top:28px}</style></head><body>
<h1>Sensea Gizlilik Politikası</h1>
<p>Sensea hesap oluşturmanı istemez. Adın, stil tercihin ve duygu günlüğün yalnızca cihazında saklanır.</p>
<h2>İşlenen veriler</h2><p>Kombin önerisi için yazdığın metin, stil/kesim/etkinlik tercihlerin ve (izin verdiysen) sıcaklık ile hava tipi sunucumuza gönderilir. Premium Plus'ta gardırop parçalarının adı, türü ve rengi de gönderilir. Metin, öneriyi üretmek için Anthropic'in Claude API'si ile işlenir; sunucumuzda saklanmaz ve kayıt altına alınmaz. Kötüye kullanımı önlemek için cihazına özel rastgele bir kimlik ve IP adresi geçici olarak (en fazla 1 saat, yalnızca bellekte) kullanılır.</p>
<h2>Hatırlatmalar</h2><p>Sabah hatırlatması ve haftalık özet bildirimleri yalnızca telefonunda planlanır; sunucumuz üzerinden geçmez.</p>
<h2>Premium özellikler</h2><p>Gerçekçi görsel oluşturduğunda kombin açıklaması (ve Premium Plus'ta seçtiğin gardırop fotoğrafları) görseli üretmek için fal.ai'ye gönderilir; görsel doğrudan cihazına döner ve bizde saklanmaz. Gardıroba fotoğraf eklediğinde fotoğraf, türünü ve rengini belirlemek için Anthropic'in Claude API'siyle, arka planını temizlemek için fal.ai ile işlenir ve saklanmaz; fotoğrafların yalnızca cihazında durur.</p>
<h2>Abonelikler</h2><p>Ödemeler Apple App Store veya Google Play üzerinden yapılır; kart bilgilerin bize ulaşmaz. Abonelik durumunu doğrulamak için RevenueCat kullanılır ve ona yalnızca rastgele uygulama kimliğin ile satın alma bilgisi iletilir.</p>
<h2>Kullanım istatistikleri ve hata raporları</h2><p>Uygulamanın nasıl kullanıldığını anlamak için yalnızca olay adları (ör. “kombin oluşturuldu”) ve abonelik seviyesi günlük toplam sayılar olarak kaydedilir; kimlik, metin veya içerik kaydedilmez. Uygulama çökerse, teknik hata raporu (cihaz modeli, işletim sistemi, hata ayrıntısı) Sentry'e gönderilir; yazdığın metinler ve fotoğraflar bu rapora eklenmez.</p>
<h2>Konum</h2><p>Hava durumu özelliği açıksa yaklaşık konumun yalnızca cihazından Open-Meteo'ya hava durumu sorgusu için kullanılır; sunucumuza gönderilmez.</p>
<h2>Silme</h2><p>Uygulamadaki Profil &gt; Geçmişi temizle ile verilerini silebilir, uygulamayı kaldırarak tüm verileri kaldırabilirsin.</p>
<h2>Çocuklar</h2><p>Sensea 13 yaş altı çocuklara yönelik değildir.</p>
<h2>İletişim</h2><p>CONTACT_EMAIL</p>
<hr><h1>Privacy Policy (English)</h1>
<p>Sensea does not require an account. Your name, style preference and mood journal are stored only on your device.</p>
<h2>Data we process</h2><p>To create a recommendation, the text you write, your style/fit/occasion choices and (if you allow it) temperature and weather conditions are sent to our server and processed with Anthropic's Claude API. Your text is not stored or logged on our server. A random per-install identifier and your IP address are used temporarily (in memory, at most 1 hour) to prevent abuse.</p>
<h2>Reminders</h2><p>Morning reminders and weekly summary notifications are scheduled on your phone only and never pass through our server.</p>
<h2>Premium features</h2><p>When you create a realistic image, the outfit description (and, on Premium Plus, the wardrobe photos you choose) is sent to fal.ai to generate it; the image is returned straight to your device and not stored by us. When you add a wardrobe photo, it is processed with Anthropic's Claude API to detect its type and colour and with fal.ai to remove the background, and is not stored; your photos stay on your device.</p>
<h2>Subscriptions</h2><p>Payments are handled by the Apple App Store or Google Play; we never see your card details. RevenueCat is used to verify subscription status and receives only your random app identifier and purchase information.</p>
<h2>Usage statistics and crash reports</h2><p>To understand how the app is used, only event names (e.g. “outfit created”) and subscription tier are stored as daily totals; no identifiers, text or content are recorded. If the app crashes, a technical report (device model, OS, error details) is sent to Sentry; your text and photos are never included.</p>
<h2>Location</h2><p>If weather is on, your approximate location is used on your device only to request the weather from Open-Meteo; it is never sent to our server.</p>
<h2>Deletion</h2><p>Use Profile &gt; Clear history in the app, or uninstall the app to remove all data.</p>
<h2>Children</h2><p>Sensea is not directed at children under 13.</p>
<h2>Contact</h2><p>CONTACT_EMAIL</p>
</body></html>"""


@app.get("/privacy", response_class=HTMLResponse)
def privacy():
    return PRIVACY_HTML.replace("CONTACT_EMAIL", os.getenv("SENSEA_CONTACT_EMAIL", "contact@example.com"))
