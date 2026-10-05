from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.rag.ingest import (
    build_policy_documents,
    build_product_document,
    get_collection_records,
    get_faiss_index,
    ingest_product_documents,
)


def test_build_product_document_has_expected_metadata() -> None:
    product = {
        "id": "prod-001",
        "title": "Acer Aspire 5",
        "slug": "acer-aspire-5",
        "brand": "Acer",
        "category": "laptops",
        "description": "Slim laptop for work and study.",
        "tags": ["work", "student"],
        "attributes": {"ram": "16GB", "storage": "512GB SSD"},
        "price": 54900,
        "stock": 12,
    }

    document = build_product_document(product)

    assert document["id"] == "prod-001"
    assert document["metadata"]["price_paise"] == 54900
    assert document["metadata"]["in_stock"] is True
    assert "Acer Aspire 5" in document["document"]
    assert document["metadata"]["category"] == "laptops"


def test_build_policy_documents_include_store_rules() -> None:
    documents = build_policy_documents()

    assert len(documents) >= 5
    assert any("free shipping" in doc["document"].lower() for doc in documents)
    assert any("7 days" in doc["document"] for doc in documents)
    assert any("cash on delivery" in doc["document"].lower() for doc in documents)


def test_product_ingestion_upserts_and_removes_stale_rows(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(settings, "faiss_dir", str(tmp_path))
    monkeypatch.setattr(
        "app.rag.ingest._embed_texts",
        lambda texts: [[float(index), 1.0] for index, _ in enumerate(texts)],
    )

    first = ingest_product_documents(
        [{"id": "prod-1", "title": "First laptop"}, {"id": "prod-2", "title": "Second laptop"}]
    )
    second = ingest_product_documents([{"id": "prod-2", "title": "Updated laptop"}])

    assert first == {"count": 2, "deleted": 0}
    assert second == {"count": 1, "deleted": 1}
    rows = get_collection_records("products")
    assert len(rows) == 1
    assert rows[0]["id"] == "prod-2"
    assert rows[0]["metadata"]["product_id"] == "prod-2"
    assert "Updated laptop" in rows[0]["document"]
    assert get_faiss_index("products").ntotal == 1


def test_ingest_product_route_requires_service_key(monkeypatch) -> None:
    monkeypatch.setattr(settings, "service_key", "spark-chatbot-key")
    client = TestClient(app)
    seen = {"calls": []}

    def fake_ingest(product, action=None):
        seen["calls"].append((product, action))
        return {"status": "upserted", "product_id": product["id"]}

    monkeypatch.setattr("app.main.ingest_product", fake_ingest)

    forbidden = client.post(
        "/ingest/product",
        json={"product": {"id": "prod-100", "title": "Notebook"}},
        headers={"X-Service-Key": "wrong-key"},
    )
    assert forbidden.status_code == 401

    allowed = client.post(
        "/ingest/product",
        json={"product": {"id": "prod-100", "title": "Notebook"}},
        headers={"X-Service-Key": "spark-chatbot-key"},
    )
    assert allowed.status_code == 200
    assert allowed.json()["status"] == "upserted"
    assert seen["calls"][0][0]["id"] == "prod-100"
