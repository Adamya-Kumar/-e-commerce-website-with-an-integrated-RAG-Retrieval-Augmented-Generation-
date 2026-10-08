from __future__ import annotations

import time
from typing import Any

import httpx

from app.config import settings

_CACHE_TTL_SECONDS = 300.0
_cached_at = 0.0
_cached_slugs: list[str] = []
_cached_names: dict[str, str] = {}


def _parse_categories(payload: Any) -> list[dict[str, str]]:
    rows = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        return []
    parsed: list[dict[str, str]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        slug = str(row.get("slug") or "").strip().lower()
        name = str(row.get("name") or slug).strip()
        if slug:
            parsed.append({"slug": slug, "name": name})
    return parsed


def fetch_categories(*, force: bool = False) -> list[str]:
    """Return cached category slugs from Express GET /api/categories."""
    global _cached_at, _cached_slugs, _cached_names
    now = time.monotonic()
    if not force and _cached_slugs and now - _cached_at < _CACHE_TTL_SECONDS:
        return list(_cached_slugs)

    url = f"{str(settings.express_base_url).rstrip('/')}/api/categories"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            response.raise_for_status()
            payload = response.json()
        rows = _parse_categories(payload)
        _cached_slugs = [row["slug"] for row in rows]
        _cached_names = {row["slug"]: row["name"] for row in rows}
        _cached_at = now
        return list(_cached_slugs)
    except httpx.HTTPError:
        return list(_cached_slugs)


def normalize_category(value: str | None, valid_slugs: list[str] | None = None) -> str | None:
    if not value:
        return None
    needle = value.strip().lower()
    slugs = valid_slugs if valid_slugs is not None else _cached_slugs
    names = _cached_names
    for slug in slugs:
        if needle == slug or needle == names.get(slug, "").lower():
            return slug
        if needle in slug or slug in needle:
            return slug
    return None


def reset_category_cache() -> None:
    global _cached_at, _cached_slugs, _cached_names
    _cached_at = 0.0
    _cached_slugs = []
    _cached_names = {}


__all__ = ["fetch_categories", "normalize_category", "reset_category_cache"]
