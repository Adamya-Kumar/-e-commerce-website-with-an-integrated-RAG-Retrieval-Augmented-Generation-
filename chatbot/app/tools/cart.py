from __future__ import annotations

from typing import Any

from app.clients.express import ExpressClient
from app.config import settings


def _normalize_cart(payload: Any) -> dict[str, Any]:
    cart = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(cart, dict):
        return {"items": [], "total": 0}
    return cart


def list_addresses(token: str | None = None) -> dict[str, Any]:
    """List saved delivery addresses for the authenticated user."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).get("/api/addresses")
    addresses = data.get("data") if isinstance(data, dict) else []
    if not isinstance(addresses, list):
        addresses = []
    return {"ok": True, "addresses": addresses, "ui_card": {"type": "addresses", "addresses": addresses}}


def get_cart(token: str | None = None) -> dict[str, Any]:
    """Read the current cart for the authenticated user."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).get("/api/cart")
    cart = _normalize_cart(data)
    return {"ok": True, "cart": cart, "ui_card": {"type": "cart", "cart": cart}}


def add_to_cart(product_id: str, qty: int = 1, token: str | None = None) -> dict[str, Any]:
    """Add one or more units of a product to the cart."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).post(
        "/api/cart/items",
        json={"productId": product_id, "qty": int(qty)},
    )
    cart = _normalize_cart(data)
    return {"ok": True, "cart": cart, "ui_card": {"type": "cart", "cart": cart}}


def update_cart_item(product_id: str, qty: int, token: str | None = None) -> dict[str, Any]:
    """Update the quantity for an existing cart line."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).patch(
        f"/api/cart/items/{product_id}",
        json={"qty": int(qty)},
    )
    cart = _normalize_cart(data)
    return {"ok": True, "cart": cart, "ui_card": {"type": "cart", "cart": cart}}


def remove_from_cart(product_id: str, token: str | None = None) -> dict[str, Any]:
    """Remove a product line from the cart."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).delete(
        f"/api/cart/items/{product_id}"
    )
    cart = _normalize_cart(data)
    return {"ok": True, "cart": cart, "ui_card": {"type": "cart", "cart": cart}}


def clear_cart(token: str | None = None) -> dict[str, Any]:
    """Clear the entire cart after user confirmation."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).delete("/api/cart")
    cart = _normalize_cart(data)
    return {"ok": True, "cart": cart, "ui_card": {"type": "cart", "cart": cart}}


__all__ = ["list_addresses", "get_cart", "add_to_cart", "update_cart_item", "remove_from_cart", "clear_cart"]
