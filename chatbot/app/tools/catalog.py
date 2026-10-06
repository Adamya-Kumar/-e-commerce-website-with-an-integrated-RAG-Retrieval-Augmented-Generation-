from __future__ import annotations

from typing import Any

from app.clients.express import ExpressClient
from app.config import settings
from app.rag.retrieval import retrieve_products


def _compact_product(product: dict[str, Any]) -> dict[str, Any]:
    slug = product.get("slug") or product.get("name") or product.get("id") or "unknown"
    title = product.get("title") or product.get("name") or slug
    price_value = product.get("price_paise")
    if price_value is None:
        price_value = product.get("price")
    if price_value is None:
        price_value = product.get("unitPrice") or 0
    stock_value = product.get("stock")
    if stock_value is None:
        stock_value = product.get("in_stock")
    if stock_value is None:
        stock_value = product.get("available") or 0

    return {
        "slug": slug,
        "title": title,
        "price_paise": int(price_value),
        "in_stock": bool(stock_value),
    }


def _ui_card(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {"type": "products", "items": items}


def search_products(
    query: str,
    category: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    in_stock: bool | None = None,
    token: str | None = None,
) -> dict[str, Any]:
    """Search the catalog for products that match the user query and hydrate live pricing/stock."""
    search_filters: dict[str, Any] = {}
    if category:
        search_filters["category"] = category
    if min_price is not None:
        search_filters["min_price_paise"] = int(min_price)
    if max_price is not None:
        search_filters["max_price_paise"] = int(max_price)
    if in_stock is not None:
        search_filters["in_stock"] = bool(in_stock)

    retrieve_products(query or "", filters=search_filters, k=8)

    params: dict[str, Any] = {"q": query or ""}
    if category:
        params["category"] = category
    if min_price is not None:
        params["minPrice"] = int(min_price)
    if max_price is not None:
        params["maxPrice"] = int(max_price)
    if in_stock is not None:
        params["inStock"] = "true" if in_stock else "false"

    data = ExpressClient(base_url=str(settings.express_base_url), token=token).get(
        "/api/products",
        params=params,
    )
    rows = data.get("data") if isinstance(data, dict) else []
    if not isinstance(rows, list):
        rows = []
    items = [_compact_product(item) for item in rows]
    return {"ok": True, "items": items, "ui_card": _ui_card(items)}


def get_product(slug: str, token: str | None = None) -> dict[str, Any]:
    """Fetch a product by slug from the live Express catalog."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).get(f"/api/products/{slug}")
    payload = data.get("data") if isinstance(data, dict) else data
    product = payload if isinstance(payload, dict) else {}
    compact = _compact_product(product)
    return {"ok": True, "product": compact, "ui_card": {"type": "product", "product": compact}}


__all__ = ["search_products", "get_product"]
