from __future__ import annotations

from fastapi.testclient import TestClient

from app.llm import set_llm_hooks
from app.main import app
from app.rag.analyze import analyze_query
from app.rag.schemas import QueryAnalysis

client = TestClient(app)


def test_extract_filters_parses_category_price_and_stock(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.rag.analyze.fetch_categories",
        lambda **_kwargs: ["laptops", "phones", "audio"],
    )

    def complete_json(prompt: str, schema, **_kwargs):
        assert schema is QueryAnalysis
        return QueryAnalysis.model_validate(
            {
                "intent": "product_search",
                "standalone_query": "best laptop under 60000 for coding in stock",
                "filters": {
                    "category": "laptops",
                    "max_price_paise": 6_000_000,
                    "in_stock": True,
                },
                "needs_retrieval": True,
            }
        )

    set_llm_hooks(complete_json=complete_json, complete_text=lambda *_a, **_k: "")
    try:
        analysis = analyze_query("Best laptop under 60000 for coding in stock")
        assert analysis.filters.category == "laptops"
        assert analysis.filters.max_price_paise == 6000000
        assert analysis.filters.in_stock is True
    finally:
        set_llm_hooks(None, None)


def test_rag_test_returns_honest_not_found(monkeypatch) -> None:
    monkeypatch.setattr("app.rag.analyze.fetch_categories", lambda **_k: ["laptops"])
    monkeypatch.setattr("app.rag.pipeline.retrieve_products", lambda *_a, **_k: [])
    monkeypatch.setattr("app.rag.pipeline.retrieve_policies", lambda *_a, **_k: [])

    def complete_json(prompt: str, schema, **_kwargs):
        return QueryAnalysis(
            intent="product_search",
            standalone_query="Spark Jetstream X9 laptop",
            needs_retrieval=True,
        )

    set_llm_hooks(complete_json=complete_json, complete_text=lambda *_a, **_k: "")
    try:
        response = client.post(
            "/chat/rag-test",
            json={"query": "Tell me about the Spark Jetstream X9 laptop"},
        )
    finally:
        set_llm_hooks(None, None)

    assert response.status_code == 200
    assert "I don't have that" in response.json()["answer"]
    assert response.json()["products"] == []


def test_rag_test_uses_policy_context_for_policy_questions(monkeypatch) -> None:
    monkeypatch.setattr("app.rag.analyze.fetch_categories", lambda **_k: ["laptops"])

    def complete_json(prompt: str, schema, **_kwargs):
        return QueryAnalysis(
            intent="policy",
            standalone_query="return policy",
            needs_retrieval=True,
        )

    set_llm_hooks(complete_json=complete_json, complete_text=lambda *_a, **_k: "")
    try:
        response = client.post("/chat/rag-test", json={"query": "What is the return policy?"})
    finally:
        set_llm_hooks(None, None)

    assert response.status_code == 200
    assert "return" in response.json()["answer"].lower()
    assert response.json()["policies"]
