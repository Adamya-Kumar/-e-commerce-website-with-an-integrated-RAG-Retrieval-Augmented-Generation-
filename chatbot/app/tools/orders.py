from __future__ import annotations

from typing import Any

from app.clients.express import ExpressClient
from app.config import settings


def _normalize_payload(payload: Any) -> dict[str, Any]:
    data = payload.get("data") if isinstance(payload, dict) else payload
    if not isinstance(data, dict):
        return {"id": None}
    return data


def list_orders(token: str | None = None) -> dict[str, Any]:
    """List recent orders for the logged-in customer."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).get("/api/orders")
    rows = data.get("data") if isinstance(data, dict) else []
    if not isinstance(rows, list):
        rows = []
    return {"ok": True, "orders": rows, "ui_card": {"type": "orders", "orders": rows}}


def get_order(order_id: str, token: str | None = None) -> dict[str, Any]:
    """Fetch a single order record by id."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).get(f"/api/orders/{order_id}")
    order = _normalize_payload(data)
    return {"ok": True, "order": order, "ui_card": {"type": "order", "order": order}}


def place_order(address_id: str, token: str | None = None) -> dict[str, Any]:
    """Place a COD order using the selected address."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).post(
        "/api/orders",
        json={"addressId": address_id},
    )
    order = _normalize_payload(data)
    return {"ok": True, "order": order, "ui_card": {"type": "order", "order": order}}


def cancel_order(order_id: str, reason: str = "", token: str | None = None) -> dict[str, Any]:
    """Cancel an order after confirmation by the user."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).post(
        f"/api/orders/{order_id}/cancel",
        json={"reason": reason} if reason else {},
    )
    order = _normalize_payload(data)
    return {"ok": True, "order": order, "ui_card": {"type": "order", "order": order}}


def request_return(order_id: str, reason: str = "", token: str | None = None) -> dict[str, Any]:
    """Request a return for a delivered order."""
    data = ExpressClient(base_url=str(settings.express_base_url), token=token).post(
        f"/api/orders/{order_id}/return",
        json={"reason": reason} if reason else {},
    )
    order = _normalize_payload(data)
    return {"ok": True, "order": order, "ui_card": {"type": "order", "order": order}}


__all__ = ["list_orders", "get_order", "place_order", "cancel_order", "request_return"]
