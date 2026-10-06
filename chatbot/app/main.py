from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request

from app.config import settings
from app.rag.ingest import ingest_full, ingest_product, validate_service_key
from app.rag.retrieval import answer_rag_question

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Spark Commerce chatbot service scaffold.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/gemini")
def gemini_health() -> dict[str, str | bool]:
    return {
        "status": "ok" if settings.has_gemini_credentials else "missing-config",
        "configured": settings.has_gemini_credentials,
    }


@app.post("/chat/rag-test")
def rag_test_route(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    query = ""
    if payload:
        query = str(payload.get("query") or payload.get("message") or "")
    return answer_rag_question(query)


@app.get("/chat/rag-test")
def rag_test_get(query: str | None = None) -> dict[str, Any]:
    return answer_rag_question(query or "")


@app.post("/ingest/product")
def ingest_product_route(payload: dict[str, Any], request: Request) -> dict[str, Any]:
    validate_service_key(request)

    product = payload.get("product")
    if product is None:
        return {"status": "error", "detail": "Product payload is required."}

    action = payload.get("action")
    return ingest_product(product, action=action)


@app.post("/ingest/full")
def ingest_full_route(request: Request) -> dict[str, Any]:
    validate_service_key(request)
    return ingest_full()


# test route to verify that the app is running and can be reached