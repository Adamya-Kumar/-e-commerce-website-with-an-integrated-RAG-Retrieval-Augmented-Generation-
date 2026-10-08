from app.llm import set_llm_hooks
from app.rag.admin_chat import answer_admin_sync, format_shop_snapshot


def test_shop_snapshot_converts_paise_to_rupees() -> None:
    text = format_shop_snapshot(
        {
            "stats": {
                "revenue_paise": 250000,
                "orders_count": 4,
                "new_customers": 1,
                "orders_by_status": {"placed": 2},
                "low_stock": [{"title": "boAt Airdopes", "brand": "boAt", "stock": 2}],
            },
            "recent_orders": [
                {
                    "id": "ord-1",
                    "status": "placed",
                    "total_paise": 129900,
                    "items": [{"title": "boAt Airdopes", "qty": 1}],
                }
            ],
        }
    )
    assert "₹2,500" in text
    assert "boAt Airdopes" in text
    assert "₹1,299" in text


def test_admin_answer_uses_snapshot() -> None:
    set_llm_hooks(
        complete_json=lambda *_args, **_kwargs: None,
        complete_text=lambda prompt, **_kwargs: "Low stock: boAt Airdopes, 2 left."
        if "boAt Airdopes" in prompt
        else "missing",
    )
    try:
        answer = answer_admin_sync(
            "Which products are low on stock?",
            [],
            {
                "stats": {
                    "revenue_paise": 0,
                    "orders_count": 0,
                    "new_customers": 0,
                    "orders_by_status": {},
                    "low_stock": [{"title": "boAt Airdopes", "brand": "boAt", "stock": 2}],
                },
                "recent_orders": [],
            },
        )
    finally:
        set_llm_hooks(None, None)
    assert "boAt Airdopes" in answer
