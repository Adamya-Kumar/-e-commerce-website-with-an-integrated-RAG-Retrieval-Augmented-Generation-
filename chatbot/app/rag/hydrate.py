from __future__ import annotations

from typing import Any

from app.clients.express import ExpressClient, ToolError


def _image_url(product: dict[str, Any]) -> str | None:
    images = product.get("images") or []
    if images and isinstance(images[0], dict):
        return images[0].get("url")
    if images and isinstance(images[0], str):
        return images[0]
    return product.get("imageUrl") or product.get("image")


def _live_card(product: dict[str, Any], retrieved: dict[str, Any]) -> dict[str, Any]:
    stock = int(product.get("stock") or 0)
    return {
        "id": product.get("id") or retrieved.get("id"),
        "slug": product.get("slug") or retrieved.get("slug"),
        "title": product.get("title") or retrieved.get("title"),
        "brand": product.get("brand") or retrieved.get("brand"),
        "category": retrieved.get("category") or product.get("category"),
        "price_paise": int(product.get("price") or 0),
        "stock": stock,
        "in_stock": stock > 0,
        "image": _image_url(product),
        "reason": retrieved.get("reason") or retrieved.get("document", "")[:160],
    }


async def hydrate_products(
    candidates: list[dict[str, Any]],
    *,
    token: str | None = None,
    client: ExpressClient | None = None,
) -> list[dict[str, Any]]:
    """Replace FAISS prices/stock/images with a fresh Express GET /api/products/:slug."""
    express = client or ExpressClient(token=token)
    hydrated: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in candidates:
        slug = str(item.get("slug") or "").strip()
        if not slug or slug in seen:
            continue
        seen.add(slug)
        try:
            payload = await express.aget(f"/api/products/{slug}")
        except ToolError:
            continue
        except RuntimeError:
            try:
                payload = express.get(f"/api/products/{slug}")
            except ToolError:
                continue
        product = payload.get("data") if isinstance(payload, dict) else payload
        if not isinstance(product, dict):
            continue
        if product.get("isActive") is False:
            continue
        hydrated.append(_live_card(product, item))
    return hydrated


__all__ = ["hydrate_products"]
