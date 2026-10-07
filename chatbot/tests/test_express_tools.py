from __future__ import annotations

import asyncio

import pytest

from app.clients.express import ExpressClient, ToolError
from app.tools.cart import add_to_cart, clear_cart, get_cart, list_addresses
from app.tools.catalog import search_products
from app.tools.orders import cancel_order, get_order, list_orders, place_order, request_return
from app.tools.policy import get_policy


class FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self.payload = payload
        self.text = str(payload)

    @property
    def is_error(self) -> bool:
        return self.status_code >= 400

    def json(self) -> dict:
        return self.payload


@pytest.mark.parametrize(
    ("method", "endpoint", "kwargs", "expected_message"),
    [
        ("get", "/api/cart", {}, "Only 2 left in stock"),
        ("post", "/api/orders", {"json": {"addressId": "addr_1"}}, "Please log in to continue"),
    ],
)
def test_express_client_maps_api_errors(method: str, endpoint: str, kwargs: dict, expected_message: str, monkeypatch):
    async def fake_request(self, method_name, path, **request_kwargs):
        assert method_name == method.upper()
        assert path == endpoint
        return FakeResponse(409, {"error": {"message": expected_message}})

    monkeypatch.setattr("app.clients.express.httpx.AsyncClient.request", fake_request)

    client = ExpressClient(base_url="http://example.test", token="secret")
    with pytest.raises(ToolError, match=expected_message):
        asyncio.run(client.request(method.upper(), endpoint, **kwargs))


def test_search_products_hydrates_live_data(monkeypatch):
    def fake_retrieval(query, filters=None, k=8):
        return [{"slug": "aero-laptop", "title": "Aero Laptop", "price_paise": 490000, "in_stock": True}]

    def fake_get(self, path, **kwargs):
        assert path == "/api/products"
        return {"data": [{"slug": "aero-laptop", "name": "Aero Laptop", "price": 490000, "stock": 4}]}

    monkeypatch.setattr("app.tools.catalog.retrieve_products", fake_retrieval)
    monkeypatch.setattr("app.tools.catalog.ExpressClient.get", fake_get)

    result = search_products("best laptop under 60000")

    assert result["ok"] is True
    assert result["items"][0]["slug"] == "aero-laptop"
    assert result["items"][0]["price_paise"] == 490000
    assert result["ui_card"]["type"] == "products"


def test_cart_and_order_tools_return_ui_cards(monkeypatch):
    def fake_get(self, path, **kwargs):
        return {"data": {"items": [{"productId": "sku_1", "qty": 2}], "total": 3000}}

    def fake_post(self, path, **kwargs):
        return {"data": {"id": "ord_123", "status": "placed"}}

    def fake_delete(self, path, **kwargs):
        return {"data": {"items": [], "total": 0}}

    monkeypatch.setattr("app.tools.cart.ExpressClient.get", fake_get)
    monkeypatch.setattr("app.tools.cart.ExpressClient.post", fake_post)
    monkeypatch.setattr("app.tools.cart.ExpressClient.delete", fake_delete)
    monkeypatch.setattr("app.tools.orders.ExpressClient.post", fake_post)
    monkeypatch.setattr("app.tools.orders.ExpressClient.get", fake_get)

    assert list_addresses()["ui_card"]["type"] == "addresses"
    assert get_cart()["ui_card"]["type"] == "cart"
    assert add_to_cart("sku_1", qty=2)["ui_card"]["type"] == "cart"
    assert clear_cart()["ui_card"]["type"] == "cart"
    assert list_orders()["ui_card"]["type"] == "orders"
    assert get_order("ord_123")["ui_card"]["type"] == "order"
    assert place_order("addr_1")["ui_card"]["type"] == "order"
    assert cancel_order("ord_123", "Changed my mind")["ui_card"]["type"] == "order"
    assert request_return("ord_123", "Defective")["ui_card"]["type"] == "order"


def test_policy_tool_uses_local_retrieval(monkeypatch):
    monkeypatch.setattr(
        "app.tools.policy.retrieve_policies",
        lambda query, k=4: [{"document": "Returns are accepted within 7 days", "score": 0.9}],
    )

    result = get_policy("return policy")

    assert result["ok"] is True
    assert "7 days" in result["policy"]["document"]
    assert result["ui_card"]["type"] == "policy"
