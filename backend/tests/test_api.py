import os

os.environ.pop("ANTHROPIC_API_KEY", None)
os.environ["SENSEA_RATE_LIMIT"] = "100000"
os.environ["SENSEA_FREE_DAILY"] = "100000"
os.environ["SENSEA_DEV_TIERS"] = "1"
import tempfile  # noqa: E402

os.environ["SENSEA_DB"] = os.path.join(tempfile.mkdtemp(), "usage.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.catalog import GARMENTS  # noqa: E402
from app.main import app  # noqa: E402
from app.postprocess import finalize  # noqa: E402
from app.schemas import RecommendRequest  # noqa: E402

client = TestClient(app)


def post(**kw):
    body = {"text": "çok yorgunum ama biraz da heyecanlıyım", "style": "casual", "fit": "unisex", "locale": "tr", **kw}
    return client.post("/v1/recommend", json=body)


def test_health():
    assert client.get("/health").json()["engine"] == "fallback"


def test_mixed_turkish_emotions_are_proportional():
    r = post()
    assert r.status_code == 200, r.text
    data = r.json()
    scores = {e["key"]: e["score"] for e in data["emotions"]}
    assert abs(sum(scores.values()) - 1) < 1e-6
    top2 = {e["key"] for e in data["emotions"][:2]}
    assert top2 == {"tired", "excited"}


def test_negation():
    data = post(text="hiç mutlu değilim, çok üzgünüm").json()
    assert data["dominant"] == "sad"


def test_english_and_single_word():
    assert post(text="so anxious about tomorrow", locale="en").json()["dominant"] == "anxious"
    assert post(text="Özgüvenli").json()["dominant"] == "confident"


def test_outfits_are_complete_and_valid():
    for style in ["casual", "sporty", "old_money", "classic", "minimal", "streetwear"]:
        for fit in ["menswear", "womenswear", "unisex"]:
            for w in [None, {"temp_c": 3, "condition": "rain"}, {"temp_c": 30, "condition": "clear"}]:
                body = {"style": style, "fit": fit}
                if w:
                    body["weather"] = w
                data = post(**body).json()
                assert len(data["outfits"]) == 2
                for o in data["outfits"]:
                    slots = [i["slot"] for i in o["items"]]
                    assert "shoes" in slots
                    assert "one_piece" in slots or ("top" in slots and "bottom" in slots)
                    for i in o["items"]:
                        assert i["type"] in GARMENTS
                        if fit == "menswear":
                            assert i["type"] not in {"dress", "skirt", "heels", "blouse", "necklace"}
                    if w and w["temp_c"] <= 5:
                        assert "outer" in slots


def test_two_outfits_differ():
    data = post().json()
    a = {i["type"] for i in data["outfits"][0]["items"]}
    b = {i["type"] for i in data["outfits"][1]["items"]}
    assert a != b


def test_crisis_flag():
    assert post(text="artık yaşamak istemiyorum").json()["wellbeing_concern"] is True
    assert post(text="harika bir gün").json()["wellbeing_concern"] is False


def test_validation():
    assert post(text="   ").status_code == 422
    assert post(text="x" * 601).status_code == 422
    assert post(style="goth").status_code == 422


def test_finalize_repairs_bad_llm_output():
    req = RecommendRequest(text="hi", fit="menswear", locale="en")
    raw = {
        "emotions": {"happy": 3, "sad": 1, "angry": "x"},
        "intensity": 7,
        "mood_summary": "ok",
        "palette": [{"hex": "fff", "name": "white"}, {"hex": "nope", "name": "bad"}],
        "outfits": [
            {"title": "A", "vibe": "v", "why": "w", "tip": "t", "items": [
                {"slot": "top", "type": "tshirt", "name": "Tee", "color_hex": "#123456", "color_name": "c"},
                {"slot": "bottom", "type": "skirt", "name": "Skirt", "color_hex": "#123456", "color_name": "c"},
                {"slot": "bottom", "type": "jeans", "name": "Jeans", "color_hex": "zzz", "color_name": "c"},
                {"slot": "hat", "type": "fedora", "name": "Hat", "color_hex": "#123456", "color_name": "c"},
            ]},
            {"title": "B", "vibe": "v", "why": "w", "tip": "t", "items": [
                {"slot": "top", "type": "tshirt", "name": "Tee", "color_hex": "#123456", "color_name": "c"},
            ]},
        ],
    }
    rec = finalize(raw, req, source="ai", rec_id="x")
    assert rec.dominant == "happy" and rec.emotions[0].score == 0.75
    assert rec.intensity == 1
    assert len(rec.palette) == 5 and len(rec.lift_palette) == 5 and rec.color_notes
    assert len(rec.outfits) == 1  # second outfit was incomplete
    types = [i.type for i in rec.outfits[0].items]
    assert "skirt" not in types and "fedora" not in types and "sneakers" in types


def test_rate_limit():
    import app.main as m
    old = m.BURST_LIMIT
    m.BURST_LIMIT = 2
    try:
        h = {"X-Install-Id": "rl-test"}
        body = {"text": "mutluyum"}
        codes = [client.post("/v1/recommend", json=body, headers=h).status_code for _ in range(3)]
        assert codes == [200, 200, 429]
    finally:
        m.BURST_LIMIT = old


def test_llm_path_with_fake_client(monkeypatch):
    import asyncio
    from types import SimpleNamespace

    import app.llm as llm

    payload = {
        "emotions": {"happy": 0.1, "excited": 0.5, "calm": 0, "confident": 0, "tired": 0.4, "sad": 0, "anxious": 0, "angry": 0},
        "intensity": 0.7,
        "mood_summary": "Yorgun ama heyecanlı.",
        "palette": [{"hex": "#FF6A3D", "name": "Mercan"}, {"hex": "#A7A3B8", "name": "Lavanta"}, {"hex": "#F4F4F5", "name": "Kırık beyaz"}, {"hex": "#1E1B4B", "name": "Gece"}],
        "outfits": [
            {"title": "Yumuşak Enerji", "vibe": "rahat ama canlı", "why": "w", "tip": "t", "items": [
                {"slot": "top", "type": "knit", "name": "Triko", "color_hex": "#A7A3B8", "color_name": "Lavanta"},
                {"slot": "bottom", "type": "jeans", "name": "Jean", "color_hex": "#1E1B4B", "color_name": "Gece"},
                {"slot": "shoes", "type": "sneakers", "name": "Sneaker", "color_hex": "#F4F4F5", "color_name": "Beyaz"},
                {"slot": "accessory", "type": "bag", "name": "Çanta", "color_hex": "#FF6A3D", "color_name": "Mercan"},
            ]},
            {"title": "Akşam Kıvılcımı", "vibe": "parlak", "why": "w", "tip": "t", "items": [
                {"slot": "one_piece", "type": "dress", "name": "Elbise", "color_hex": "#FF6A3D", "color_name": "Mercan"},
                {"slot": "shoes", "type": "heels", "name": "Topuklu", "color_hex": "#1E1B4B", "color_name": "Gece"},
                {"slot": "outer", "type": "jacket", "name": "Ceket", "color_hex": "#1E1B4B", "color_name": "Gece"},
            ]},
        ],
        "wellbeing_concern": False,
    }

    class FakeMessages:
        async def create(self, **kw):
            assert kw["tool_choice"]["name"] == "submit_recommendation"
            assert "<user_text>" in kw["messages"][0]["content"]
            return SimpleNamespace(content=[SimpleNamespace(type="tool_use", input=payload)])

    monkeypatch.setattr(llm, "_get_client", lambda: SimpleNamespace(messages=FakeMessages()))
    req = RecommendRequest(text="yorgunum ama heyecanlıyım", fit="womenswear")
    rec = asyncio.run(llm.recommend_with_llm(req))
    assert rec.source == "ai" and rec.dominant == "excited"
    assert len(rec.outfits) == 2 and rec.outfits[1].items[0].slot == "outer"


# ------------------------------------------------------------------ colour science
def test_palettes_follow_research_rules():
    from app.color_science import hex_to_hls, in_tune_palette, lift_palette

    red_h, _, red_s = hex_to_hls(in_tune_palette([("angry", 1.0)], "en")[0].hex)
    assert (red_h < 15 or red_h > 345) and red_s > 0.6          # anger -> saturated red
    yellow_h, _, _ = hex_to_hls(in_tune_palette([("happy", 1.0)], "en")[0].hex)
    assert 35 <= yellow_h <= 60                                    # joy -> yellow
    _, sad_l, _ = hex_to_hls(in_tune_palette([("sad", 1.0)], "en")[0].hex)
    _, lift_l, _ = hex_to_hls(lift_palette([("sad", 1.0)], "en")[0].hex)
    assert lift_l > sad_l                                          # lift = lighter (valence)
    _, _, calm_s = hex_to_hls(in_tune_palette([("calm", 1.0)], "en")[0].hex)
    _, _, exc_s = hex_to_hls(in_tune_palette([("excited", 1.0)], "en")[0].hex)
    assert exc_s > calm_s                                          # arousal -> saturation
    _, _, anx_s = hex_to_hls(in_tune_palette([("anxious", 1.0)], "en")[1].hex)
    assert anx_s <= 0.45                                           # anxious stays muted


def test_recommendation_has_research_notes():
    data = post(text="çok sinirliyim").json()
    assert data["dominant"] == "angry"
    assert any("Jonauskaite" in n for n in data["color_notes"])
    assert len(data["lift_palette"]) == 5


# ------------------------------------------------------------------ tiers & quotas
def test_free_daily_limit():
    import app.main as m

    old = m.LIMITS["free"]["recommend_day"]
    m.LIMITS["free"]["recommend_day"] = 2
    try:
        h = {"X-Install-Id": "daily-test"}
        codes = [client.post("/v1/recommend", json={"text": "mutluyum"}, headers=h).status_code for _ in range(3)]
        assert codes == [200, 200, 429]
        r = client.post("/v1/recommend", json={"text": "mutluyum"}, headers=h)
        assert r.json()["detail"] == "DAILY_LIMIT"
    finally:
        m.LIMITS["free"]["recommend_day"] = old


def _outfit():
    return post().json()["outfits"][0]


def test_render_requires_premium_and_counts_quota():
    body = {"outfit": _outfit(), "fit": "womenswear", "dominant": "tired"}
    assert client.post("/v1/render", json=body, headers={"X-Install-Id": "r1"}).status_code == 402
    h = {"X-Install-Id": "r2", "X-Dev-Tier": "premium"}
    r = client.post("/v1/render", json=body, headers=h)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["image"].startswith("data:image/jpeg;base64,") and j["provider"] == "demo"
    me = client.get("/v1/me", headers=h).json()
    assert me["tier"] == "premium" and me["renders_left"] == j["remaining"]


def test_render_prompt_mentions_pieces_and_refs():
    from app.images import build_prompt
    from app.schemas import Outfit

    o = Outfit(**_outfit())
    p = build_prompt(o, "menswear", "sad", with_refs=True)
    assert o.items[0].name in p and "reference photos" in p and "a young adult man" in p


def _png_b64(color):
    import base64
    import io

    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (200, 260), color).save(buf, "JPEG")
    return base64.b64encode(buf.getvalue()).decode()


def test_wardrobe_tagging_is_plus_only():
    body = {"image_b64": _png_b64((200, 30, 40)), "locale": "tr"}
    assert client.post("/v1/wardrobe/tag", json=body, headers={"X-Dev-Tier": "premium"}).status_code == 402
    r = client.post("/v1/wardrobe/tag", json=body, headers={"X-Dev-Tier": "plus", "X-Install-Id": "t1"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["needs_review"] is True
    from app.color_science import color_distance
    assert color_distance(j["color_hex"], "#C81E28") < 60


WARDROBE = [
    {"id": "w1", "slot": "top", "type": "knit", "name": "Gri triko", "color_hex": "#9A9AA0", "color_name": "Gri"},
    {"id": "w2", "slot": "top", "type": "tshirt", "name": "Sarı tişört", "color_hex": "#F2C230", "color_name": "Sarı"},
    {"id": "w3", "slot": "bottom", "type": "jeans", "name": "Mavi jean", "color_hex": "#3B5B8C", "color_name": "Mavi"},
    {"id": "w4", "slot": "bottom", "type": "trousers", "name": "Siyah pantolon", "color_hex": "#1C1C22", "color_name": "Siyah"},
    {"id": "w5", "slot": "shoes", "type": "sneakers", "name": "Beyaz sneaker", "color_hex": "#F4F4F4", "color_name": "Beyaz"},
    {"id": "w6", "slot": "shoes", "type": "boots", "name": "Kahve bot", "color_hex": "#5A3B28", "color_name": "Kahve"},
]


def test_outfits_from_wardrobe_for_plus_only():
    body = {"text": "çok mutluyum", "wardrobe": WARDROBE}
    plus = client.post("/v1/recommend", json=body, headers={"X-Dev-Tier": "plus", "X-Install-Id": "p1"}).json()
    assert plus["uses_wardrobe"] is True
    first = plus["outfits"][0]["items"]
    tops = [i for i in first if i["slot"] == "top"]
    assert tops and tops[0]["wardrobe_id"] == "w2"     # yellow tee is closest to the joy palette
    ids = [i["wardrobe_id"] for o in plus["outfits"] for i in o["items"] if i["wardrobe_id"]]
    assert len(ids) == len(set(ids))                    # no piece reused across outfits
    r = client.post("/v1/recommend", json=body, headers={"X-Dev-Tier": "premium", "X-Install-Id": "p2"})
    assert r.status_code == 200, r.text
    prem = r.json()
    assert prem["uses_wardrobe"] is False


def test_llm_wardrobe_ids_are_mapped_to_real_items():
    req = RecommendRequest(text="x", wardrobe=WARDROBE, locale="tr")
    raw = {
        "emotions": {"happy": 1},
        "outfits": [{"title": "A", "vibe": "v", "why": "w", "tip": "t", "items": [
            {"wardrobe_id": "w2", "slot": "top", "type": "shirt", "name": "wrong name", "color_hex": "#000000", "color_name": "x"},
            {"wardrobe_id": "w3", "slot": "bottom", "type": "jeans", "name": "Jean", "color_hex": "#000000", "color_name": "x"},
            {"wardrobe_id": "nope", "slot": "shoes", "type": "loafers", "name": "Loafer önerisi", "color_hex": "#7A4E2D", "color_name": "Taba"},
        ]}],
    }
    rec = finalize(raw, req, source="ai", rec_id="x", tier="plus", wardrobe=req.wardrobe)
    items = {i.slot: i for i in rec.outfits[0].items}
    assert items["top"].name == "Sarı tişört" and items["top"].type == "tshirt" and items["top"].color_hex == "#F2C230"
    assert items["shoes"].wardrobe_id is None and items["shoes"].type == "loafers"   # unknown id -> suggestion


def test_wardrobe_mode_suggests_at_most_one_missing_piece():
    body = {"text": "mutluyum", "wardrobe": WARDROBE}
    for i in range(5):
        r = client.post("/v1/recommend", json={**body, "text": f"mutluyum {i}"},
                        headers={"X-Dev-Tier": "plus", "X-Install-Id": "s1"}).json()
        for o in r["outfits"]:
            assert sum(1 for it in o["items"] if not it["wardrobe_id"]) <= 1


# ------------------------------------------------------------------ preferences
def test_avoided_colours_and_types_never_appear():
    from app.color_science import family_of

    prefs = {"avoid_colors": ["yellow", "orange", "pink"], "avoid_types": ["tshirt", "sneakers", "jeans"]}
    for i in range(6):
        r = post(text=f"çok mutluyum {i}", style="casual", prefs=prefs).json()
        for sw in r["palette"] + r["lift_palette"]:
            assert family_of(sw["hex"]) not in prefs["avoid_colors"], sw
        for o in r["outfits"]:
            for it in o["items"]:
                assert it["type"] not in prefs["avoid_types"], it
                assert family_of(it["color_hex"]) not in prefs["avoid_colors"], it


def test_llm_output_is_filtered_by_prefs():
    req = RecommendRequest(text="x", locale="en", prefs={"avoid_colors": ["red"], "avoid_types": ["skirt"]})
    raw = {"emotions": {"angry": 1}, "outfits": [{"title": "A", "vibe": "v", "why": "w", "tip": "t", "items": [
        {"slot": "top", "type": "shirt", "name": "Red shirt", "color_hex": "#D02020", "color_name": "Red"},
        {"slot": "bottom", "type": "skirt", "name": "Skirt", "color_hex": "#222222", "color_name": "x"},
        {"slot": "bottom", "type": "trousers", "name": "Trousers", "color_hex": "#222222", "color_name": "x"},
    ]}]}
    rec = finalize(raw, req, source="ai", rec_id="x")
    types = [i.type for i in rec.outfits[0].items]
    assert "skirt" not in types and "trousers" in types
    from app.color_science import family_of
    assert all(family_of(i.color_hex) != "red" for i in rec.outfits[0].items)
    assert all(family_of(s.hex) != "red" for s in rec.palette)


def test_prompt_includes_preferences():
    from app.llm import _user_prompt
    req = RecommendRequest(text="x", prefs={"avoid_colors": ["orange"], "liked_types": ["blazer"]})
    p = _user_prompt(req)
    assert "NEVER use these colour families: orange" in p and "blazer" in p


def test_anonymous_events_and_protected_stats():
    import app.main as m
    assert client.post("/v1/events", json={"name": "recommend"}, headers={"X-Install-Id": "e1"}).status_code == 204
    assert client.post("/v1/events", json={"name": "not_allowed"}).status_code == 204  # silently ignored
    assert client.get("/v1/stats").status_code == 404
    m.ADMIN_KEY = "secret"
    try:
        rows = client.get("/v1/stats", headers={"X-Admin-Key": "secret"}).json()
        names = {r["name"] for r in rows}
        assert "recommend" in names and "not_allowed" not in names
        assert all(set(r) == {"day", "name", "tier", "count"} for r in rows)
    finally:
        m.ADMIN_KEY = ""


def test_multiple_styles_are_blended():
    from app.fallback import WARDROBE
    from app.llm import _user_prompt

    req = RecommendRequest(text="mutluyum", style="minimal", styles=["streetwear", "classic"])
    assert req.style_mix == ["streetwear", "classic"]
    assert "Style: streetwear + classic (blend" in _user_prompt(req)
    r = post(text="mutluyum ve enerjik", styles=["streetwear", "classic"], fit="menswear").json()
    names = {i["name"] for o in r["outfits"] for i in o["items"]}
    street = {p[2] for ps in WARDROBE["streetwear"].values() for p in ps}
    classic = {p[2] for ps in WARDROBE["classic"].values() for p in ps}
    assert names & street and names & classic          # first outfit leads streetwear, second classic
    assert post(styles=["a"]).status_code == 422
    assert post(styles=["casual", "sporty", "minimal", "classic"]).status_code == 422


def _swap_body(rec, index, **extra):
    o = rec["outfits"][0]
    body = {"outfit": o, "index": index, "dominant": rec["dominant"], "palette": rec["palette"],
            "style": "casual", "fit": "unisex", "locale": "tr", "seed": 1}
    body.update(extra)
    return body


def test_swap_replaces_one_piece_in_same_slot():
    rec = post().json()
    o = rec["outfits"][0]
    for idx, piece in enumerate(o["items"]):
        r = client.post("/v1/swap", json=_swap_body(rec, idx), headers={"X-Install-Id": f"sw{idx}"})
        assert r.status_code == 200, r.text
        new = r.json()["item"]
        assert new["slot"] == piece["slot"]
        assert (new["name"], new["color_hex"]) != (piece["name"], piece["color_hex"])
        assert GARMENTS[new["type"]] == piece["slot"]


def test_swap_respects_avoided_types_and_bad_index():
    rec = post().json()
    o = rec["outfits"][0]
    idx = next(i for i, it in enumerate(o["items"]) if it["slot"] == "shoes")
    prefs = {"avoid_types": ["boots", "loafers", "sandals"]}
    for seed in range(5):
        r = client.post("/v1/swap", json=_swap_body(rec, idx, prefs=prefs, seed=seed), headers={"X-Install-Id": "sw-av"})
        assert r.status_code == 200, r.text
        assert r.json()["item"]["type"] not in prefs["avoid_types"]
    r = client.post("/v1/swap", json=_swap_body(rec, 6), headers={"X-Install-Id": "sw-bad"})
    assert r.status_code == 422


def test_swap_uses_wardrobe_for_plus():
    body = {"text": "mutluyum", "wardrobe": WARDROBE}
    h = {"X-Dev-Tier": "plus", "X-Install-Id": "sw-p"}
    rec = client.post("/v1/recommend", json=body, headers=h).json()
    o = rec["outfits"][0]
    idx = next(i for i, it in enumerate(o["items"]) if it["slot"] == "top")
    r = client.post("/v1/swap", json=_swap_body(rec, idx, wardrobe=WARDROBE), headers=h)
    item = r.json()["item"]
    assert item["wardrobe_id"] and item["wardrobe_id"] != o["items"][idx]["wardrobe_id"]


def test_anchor_piece_is_in_every_outfit():
    body = {"text": "çok mutluyum", "wardrobe": WARDROBE, "anchor_ids": ["w4"]}
    rec = client.post("/v1/recommend", json=body, headers={"X-Dev-Tier": "plus", "X-Install-Id": "an1"}).json()
    for o in rec["outfits"]:
        assert any(i["wardrobe_id"] == "w4" for i in o["items"])


def test_recently_worn_pieces_are_deprioritised():
    wr = [dict(w) for w in WARDROBE]
    wr[1]["days_since_worn"] = 1   # yellow tee worn yesterday
    wr[1]["wear_count"] = 9
    wr[0]["days_since_worn"] = 40
    rec = client.post("/v1/recommend", json={"text": "çok mutluyum", "wardrobe": wr},
                      headers={"X-Dev-Tier": "plus", "X-Install-Id": "rc1"}).json()
    top = next(i for i in rec["outfits"][0]["items"] if i["slot"] == "top")
    assert top["wardrobe_id"] != "w2"


def test_tag_has_no_cutout_without_fal_key():
    r = client.post("/v1/wardrobe/tag", json={"image_b64": _png_b64((20, 30, 200)), "locale": "en"},
                    headers={"X-Dev-Tier": "plus", "X-Install-Id": "t9"})
    assert r.status_code == 200 and r.json()["cutout"] is None
