from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.rag.retrieval import extract_filters


client = TestClient(app)


def test_extract_filters_parses_category_price_and_stock() -> None:
    filters = extract_filters("Best laptop under 60000 for coding in stock")

    assert filters["category"] == "laptops"
    assert filters["max_price_paise"] == 6000000
    assert filters["in_stock"] is True


def test_rag_test_returns_honest_not_found() -> None:
    response = client.post(
        "/chat/rag-test",
        json={"query": "Tell me about the Spark Jetstream X9 laptop"},
    )

    assert response.status_code == 200
    assert "I don't have that" in response.json()["answer"]
    assert response.json()["products"] == []


def test_rag_test_uses_policy_context_for_policy_questions(monkeypatch) -> None:
    monkeypatch.setattr(settings, "google_api_key", "test-key")
    monkeypatch.setattr(settings, "gemini_embed_model", "embedding-test")

    def fake_embed_query(_query: str):
        return [0.1, 0.2, 0.3]

    monkeypatch.setattr("app.rag.retrieval.require_embedding_model", lambda: type("Model", (), {"embed_query": staticmethod(fake_embed_query)})())

    response = client.post("/chat/rag-test", json={"query": "What is the return policy?"})

    assert response.status_code == 200
    assert "return" in response.json()["answer"].lower()
    assert response.json()["policies"]
