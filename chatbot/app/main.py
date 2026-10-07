from __future__ import annotations

import asyncio
import hmac
import json
from collections import defaultdict
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agent.graph import initialize_agent_runtime
from app.config import settings
from app.db.sessions import (
    apply_schema,
    history_for_session,
    latest_session_for_user,
    normalize_session_id,
    persist_message,
    persist_session,
)
from app.rag.ingest import ingest_full, ingest_product, validate_service_key
from app.rag.pipeline import answer_query, answer_rag_question

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Spark Commerce chatbot. POST /chat is an SSE stream. Events: token (text delta), "
        "ui_card (type products), done, error, cancelling (client disconnect)."
    ),
)

THREAD_LOCKS: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)


class ChatRequest(BaseModel):
    thread_id: str | None = None
    message: str = ""
    page_context: dict[str, Any] | None = Field(default=None)


def _normalize_user_id(request: Request) -> str | None:
    user_id = request.headers.get("X-User-Id")
    return str(user_id).strip() or None if user_id else None


def _validate_chat_service_key(request: Request) -> None:
    expected = settings.service_key
    actual = request.headers.get("X-Service-Key")

    if not expected:
        raise HTTPException(status_code=500, detail="Service key is not configured.")

    if not actual or not hmac.compare_digest(actual, expected):
        raise HTTPException(status_code=401, detail="Invalid service key.")


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


def _chunk_text(text: str, size: int = 24) -> list[str]:
    if not text:
        return []
    return [text[index : index + size] for index in range(0, len(text), size)]


@app.on_event("startup")
def startup_event() -> None:
    apply_schema()
    initialize_agent_runtime()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/gemini")
def gemini_health() -> dict[str, str | bool]:
    return {
        "status": "ok" if settings.has_gemini_credentials else "missing-config",
        "configured": settings.has_gemini_credentials,
    }


@app.post("/chat", response_class=StreamingResponse)
async def chat_stream(request: Request, payload: ChatRequest) -> StreamingResponse:
    """SSE chat. Events: token, ui_card, done, error, cancelling."""
    _validate_chat_service_key(request)

    thread_id = normalize_session_id(payload.thread_id)
    user_id = _normalize_user_id(request)
    message = payload.message or ""
    title = message[:80] if message else "New chat"
    history = history_for_session(thread_id)
    persist_session(thread_id, user_id=user_id, title=title)
    persist_message(thread_id, role="user", content=message, ui_cards=[])

    async def event_stream() -> AsyncIterator[str]:
        lock = THREAD_LOCKS[thread_id]
        async with lock:
            if await request.is_disconnected():
                yield _sse("cancelling", {"status": "cancelling", "thread_id": thread_id})
                return

            try:
                result = await answer_query(
                    message,
                    history,
                    {"id": user_id} if user_id else {"id": None, "role": "guest"},
                    thread_id=thread_id,
                )
            except Exception as exc:
                if await request.is_disconnected():
                    yield _sse("cancelling", {"status": "cancelling", "thread_id": thread_id})
                    return
                yield _sse("error", {"message": str(exc) or "The chatbot hit an issue."})
                return

            answer = str(result.get("answer") or "")
            products = result.get("products") or []
            ui_cards: list[dict[str, Any]] = []
            if products:
                ui_cards.append({"type": "products", "products": products})

            for part in _chunk_text(answer):
                if await request.is_disconnected():
                    yield _sse("cancelling", {"status": "cancelling", "thread_id": thread_id})
                    return
                yield _sse("token", {"text": part})
                await asyncio.sleep(0)

            if await request.is_disconnected():
                yield _sse("cancelling", {"status": "cancelling", "thread_id": thread_id})
                return

            if ui_cards:
                yield _sse("ui_card", ui_cards[0])

            persist_message(thread_id, role="assistant", content=answer, ui_cards=ui_cards)
            yield _sse("done", {"status": "ok", "thread_id": thread_id})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/chat/confirm")
def chat_confirm(request: Request, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    _validate_chat_service_key(request)
    body = payload or {}
    return {
        "status": "ok",
        "approve": bool(body.get("approve")),
        "confirm_id": body.get("confirm_id"),
        "thread_id": body.get("thread_id"),
    }


@app.get("/chat/sessions/latest")
def latest_chat_session(request: Request) -> dict[str, Any]:
    _validate_chat_service_key(request)
    user_id = _normalize_user_id(request)
    session = latest_session_for_user(user_id)
    if session is None:
        return {"id": None, "user_id": user_id, "messages": []}
    return {
        "id": session["id"],
        "user_id": session.get("user_id"),
        "messages": session.get("messages", []),
    }


@app.post("/chat/rag-test")
def rag_test_route(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    query = ""
    filters = None
    if payload:
        query = str(payload.get("query") or payload.get("message") or "")
        filters = payload.get("filters")
    return answer_rag_question(query, filters=filters)


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
