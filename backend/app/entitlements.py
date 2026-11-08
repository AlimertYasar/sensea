"""Subscription tiers (via RevenueCat) and usage quotas (SQLite).

Tiers
  free     daily outfit limit, illustrated flat-lay only
  premium  unlimited* outfits + realistic AI renders (monthly quota)
  plus     everything in premium + wardrobe (photo tagging, outfits from your clothes,
           renders that use your own pieces as references)

The app identifies users by a random install id which is also the RevenueCat
app_user_id, so entitlements can be checked server-side without accounts.
"""

from __future__ import annotations

import os
import sqlite3
import threading
import time
from datetime import datetime, timezone

import httpx

RC_SECRET = os.getenv("REVENUECAT_SECRET_KEY", "")
DEV_TIERS = os.getenv("SENSEA_DEV_TIERS", "") == "1"  # lets the X-Dev-Tier header choose a tier (testing only!)

LIMITS = {
    "free": {"recommend_day": int(os.getenv("SENSEA_FREE_DAILY", "5")), "render_month": 0, "tag_month": 0,
             "swap_day": int(os.getenv("SENSEA_FREE_SWAPS", "15"))},
    "premium": {"recommend_day": int(os.getenv("SENSEA_PREMIUM_DAILY", "60")),
                "render_month": int(os.getenv("SENSEA_PREMIUM_RENDERS", "30")), "tag_month": 0, "swap_day": 300},
    "plus": {"recommend_day": int(os.getenv("SENSEA_PLUS_DAILY", "100")),
             "render_month": int(os.getenv("SENSEA_PLUS_RENDERS", "100")),
             "tag_month": int(os.getenv("SENSEA_PLUS_TAGS", "400")), "swap_day": 300},
}

_cache: dict[str, tuple[float, str]] = {}
_CACHE_S = 300


async def resolve_tier(user_id: str | None, dev_tier: str | None = None) -> str:
    if DEV_TIERS and dev_tier in LIMITS:
        return dev_tier
    if not user_id or not RC_SECRET:
        return "free"
    hit = _cache.get(user_id)
    if hit and time.monotonic() - hit[0] < _CACHE_S:
        return hit[1]
    tier = "free"
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            r = await client.get(
                f"https://api.revenuecat.com/v1/subscribers/{user_id}",
                headers={"Authorization": f"Bearer {RC_SECRET}"},
            )
        if r.status_code == 200:
            ents = r.json().get("subscriber", {}).get("entitlements", {})
            now = datetime.now(timezone.utc)

            def active(name: str) -> bool:
                e = ents.get(name)
                if not e:
                    return False
                exp = e.get("expires_date")
                return exp is None or datetime.fromisoformat(exp.replace("Z", "+00:00")) > now

            tier = "plus" if active("plus") else "premium" if active("premium") else "free"
    except httpx.HTTPError:
        # RevenueCat unreachable: keep the last known tier rather than locking paying users out
        return hit[1] if hit else "free"
    _cache[user_id] = (time.monotonic(), tier)
    return tier


class Usage:
    """Tiny persistent counter store. Point SENSEA_DB at a persistent disk in production."""

    def __init__(self, path: str | None = None):
        self.path = path or os.getenv("SENSEA_DB", "sensea_usage.db")
        self._lock = threading.Lock()
        self._db = sqlite3.connect(self.path, check_same_thread=False)
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS usage (user TEXT, kind TEXT, period TEXT, n INTEGER, PRIMARY KEY (user, kind, period))"
        )
        # Anonymous product analytics: daily counts per event name and tier. No user ids, no content.
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS events (day TEXT, name TEXT, tier TEXT, n INTEGER, PRIMARY KEY (day, name, tier))"
        )
        self._db.commit()

    @staticmethod
    def period(kind: str) -> str:
        now = datetime.now(timezone.utc)
        return now.strftime("%Y-%m-%d") if kind.endswith("_day") else now.strftime("%Y-%m")

    def used(self, user: str, kind: str) -> int:
        row = self._db.execute(
            "SELECT n FROM usage WHERE user=? AND kind=? AND period=?", (user, kind, self.period(kind))
        ).fetchone()
        return row[0] if row else 0

    def take(self, user: str, kind: str, limit: int) -> bool:
        """Atomically consume one unit; False if the limit is reached."""
        with self._lock:
            n = self.used(user, kind)
            if n >= limit:
                return False
            self._db.execute(
                "INSERT INTO usage (user, kind, period, n) VALUES (?, ?, ?, 1) "
                "ON CONFLICT(user, kind, period) DO UPDATE SET n = n + 1",
                (user, kind, self.period(kind)),
            )
            self._db.commit()
            return True

    def give_back(self, user: str, kind: str) -> None:
        with self._lock:
            self._db.execute(
                "UPDATE usage SET n = MAX(0, n - 1) WHERE user=? AND kind=? AND period=?", (user, kind, self.period(kind))
            )
            self._db.commit()

    def left(self, user: str, kind: str, limit: int) -> int:
        return max(0, limit - self.used(user, kind))

    def count_event(self, name: str, tier: str) -> None:
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with self._lock:
            self._db.execute(
                "INSERT INTO events (day, name, tier, n) VALUES (?, ?, ?, 1) "
                "ON CONFLICT(day, name, tier) DO UPDATE SET n = n + 1",
                (day, name, tier),
            )
            self._db.commit()

    def event_stats(self, days: int = 30) -> list[dict]:
        rows = self._db.execute(
            "SELECT day, name, tier, n FROM events WHERE day >= date('now', ?) ORDER BY day DESC, name",
            (f"-{days} day",),
        ).fetchall()
        return [{"day": d, "name": n, "tier": t, "count": c} for d, n, t, c in rows]
