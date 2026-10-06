from __future__ import annotations

import hmac
import json
import sqlite3
import threading
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterator

try:
    import psycopg
except ModuleNotFoundError:  # pragma: no cover - fallback for minimal local environments
    psycopg = None

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.agent.graph import initialize_agent_runtime
from app.config import settings
from app.rag.ingest import ingest_full, ingest_product, validate_service_key
from app.rag.retrieval import answer_rag_question

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Spark Commerce chatbot service scaffold.",
)

THREAD_LOCKS: defaultdict[str, threading.Lock] = defaultdict(threading.Lock)
IN_MEMORY_CHAT_SESSIONS: dict[str, dict[str, Any]] = {}


def _read_schema_sql() -> str:
    schema_path = Path(__file__).resolve().parent / "db" / "schema.sql"
    return schema_path.read_text(encoding="utf-8")


def _read_sqlite_schema_sql() -> str:
    return """
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NULL,
        title TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        ui_cards TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
    """


def _ensure_sqlite_chat_db() -> sqlite3.Connection:
    db_path = Path(settings.faiss_dir) / "chat_sessions.sqlite3"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.executescript(_read_sqlite_schema_sql())
    connection.commit()
    return connection


def _ensure_chat_db() -> None:
    if not settings.postgres_url or psycopg is None:
        _ensure_sqlite_chat_db()
        return

    try:
        with psycopg.connect(settings.postgres_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(_read_schema_sql())
    except Exception:
        _ensure_sqlite_chat_db()


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


def _persist_session(session_id: str, *, user_id: str | None, title: str) -> dict[str, Any]:
    session = IN_MEMORY_CHAT_SESSIONS.setdefault(session_id, {"id": session_id, "user_id": user_id, "title": title, "messages": []})
    session["user_id"] = user_id
    if title and not session.get("title"):
        session["title"] = title

    try:
        _ensure_chat_db()
        if settings.postgres_url and psycopg is not None:
            try:
                with psycopg.connect(settings.postgres_url) as connection:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (%s, %s, %s, NOW(), NOW()) ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, title = EXCLUDED.title, updated_at = NOW()",
                            (session_id, user_id, title),
                        )
            except Exception:
                pass
        else:
            with sqlite3.connect(Path(settings.faiss_dir) / "chat_sessions.sqlite3") as connection:
                connection.execute(
                    "INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, title = excluded.title, updated_at = CURRENT_TIMESTAMP",
                    (session_id, user_id, title),
                )
    except Exception:
        pass

    return session


def _persist_message(session_id: str, *, role: str, content: str, ui_cards: list[dict[str, Any]] | None = None) -> None:
    session = IN_MEMORY_CHAT_SESSIONS.setdefault(session_id, {"id": session_id, "user_id": None, "title": "", "messages": []})
    message = {"id": uuid.uuid4().hex, "role": role, "content": content, "ui_cards": ui_cards or []}
    session.setdefault("messages", []).append(message)

    try:
        _ensure_chat_db()
        if settings.postgres_url and psycopg is not None:
            try:
                with psycopg.connect(settings.postgres_url) as connection:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "INSERT INTO chat_messages (id, session_id, role, content, ui_cards, created_at) VALUES (%s, %s, %s, %s, %s, NOW())",
                            (message["id"], session_id, role, content, json.dumps(ui_cards or [])),
                        )
            except Exception:
                pass
        else:
            with sqlite3.connect(Path(settings.faiss_dir) / "chat_sessions.sqlite3") as connection:
                connection.execute(
                    "INSERT INTO chat_messages (id, session_id, role, content, ui_cards, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                    (message["id"], session_id, role, content, json.dumps(ui_cards or [])),
                )
    except Exception:
        pass


def _get_latest_session_for_user(user_id: str | None) -> dict[str, Any] | None:
    if not user_id:
        return None

    session = next(
        (
            value
            for value in sorted(IN_MEMORY_CHAT_SESSIONS.values(), key=lambda item: item.get("updated_at") or "", reverse=True)
            if value.get("user_id") == user_id
        ),
        None,
    )
    if session is not None:
        return session

    try:
        _ensure_chat_db()
        if settings.postgres_url and psycopg is not None:
            with psycopg.connect(settings.postgres_url) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT id, user_id, title FROM chat_sessions WHERE user_id = %s ORDER BY updated_at DESC LIMIT 1",
                        (user_id,),
                    )
                    row = cursor.fetchone()
                    if row is None:
                        return None
                    session_id = str(row[0])
                    cursor.execute(
                        "SELECT role, content, ui_cards FROM chat_messages WHERE session_id = %s ORDER BY created_at ASC",
                        (session_id,),
                    )
                    messages = [
                        {"role": item[0], "content": item[1], "ui_cards": json.loads(item[2]) if item[2] else []}
                        for item in cursor.fetchall()
                    ]
                    return {"id": session_id, "user_id": user_id, "title": row[2], "messages": messages}
        else:
            with sqlite3.connect(Path(settings.faiss_dir) / "chat_sessions.sqlite3") as connection:
                row = connection.execute(
                    "SELECT id, title FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
                    (user_id,),
                ).fetchone()
                if row is None:
                    return None
                session_id = row[0]
                rows = connection.execute(
                    "SELECT role, content, ui_cards FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC",
                    (session_id,),
                ).fetchall()
                return {
                    "id": session_id,
                    "user_id": user_id,
                    "title": row[1],
                    "messages": [
                        {"role": item[0], "content": item[1], "ui_cards": json.loads(item[2]) if item[2] else []}
                        for item in rows
                    ],
                }
    except Exception:
        pass

    return None


def _stream_response_text(message: str, page_context: Any) -> str:
    if not message:
        return "I can help with product questions, shipping, returns, and order guidance."

    context = page_context or {}
    product_hint = context.get("slug") or context.get("product_slug") or ""
    page_type = context.get("type") or context.get("page_type") or ""
    if product_hint:
        return f"I can help with {product_hint}. For this page, I can answer product questions, compare options, and help you add the right item to the cart."
    if page_type == "cart":
        return "I can review your cart, suggest updates, and help with checkout if you're ready."
    if page_type == "orders":
        return "I can check order status, returns, and cancellation windows for your purchases."
    return f"I can help with that: {message[:160]}"


def _chunk_text(text: str, size: int = 24) -> Iterator[str]:
    for index in range(0, len(text), size):
        yield text[index : index + size]


@app.on_event("startup")
def startup_event() -> None:
    initialize_agent_runtime()
    _ensure_chat_db()


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
def chat_stream(request: Request, payload: dict[str, Any] | None = None) -> StreamingResponse:
    """Stream a chat reply using SSE events: token, tool_start, ui_card, confirmation_request, done, and error."""
    _validate_chat_service_key(request)

    payload = payload or {}
    thread_id = str(payload.get("thread_id") or uuid.uuid4())
    user_id = _normalize_user_id(request)
    message = str(payload.get("message") or "")
    page_context = payload.get("page_context") or {}
    title = message[:80] if message else "New chat"

    session = _persist_session(thread_id, user_id=user_id, title=title)
    _persist_message(thread_id, role="user", content=message, ui_cards=[])

    async def event_stream() -> Iterator[str]:
        lock = THREAD_LOCKS[thread_id]
        response_text = _stream_response_text(message, page_context)
        ui_cards = [{"type": "products", "payload": {"count": 0, "summary": "Product suggestions are available in the live agent."}}]

        with lock:
            if await request.is_disconnected():
                return

            yield "event: tool_start\ndata: {\"name\": \"agent_runtime\"}\n\n"
            for part in _chunk_text(response_text):
                if await request.is_disconnected():
                    return
                yield f"event: token\ndata: {json.dumps({'text': part})}\n\n"

            if await request.is_disconnected():
                return

            yield f"event: ui_card\ndata: {json.dumps({'type': 'products', 'payload': ui_cards[0]['payload']})}\n\n"
            yield f"event: done\ndata: {json.dumps({'status': 'ok', 'thread_id': thread_id})}\n\n"

        session["updated_at"] = __import__("datetime").datetime.utcnow().isoformat()
        _persist_message(thread_id, role="assistant", content=response_text, ui_cards=ui_cards)

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


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
    session = _get_latest_session_for_user(user_id)
    if session is None:
        return {"id": None, "user_id": user_id, "messages": []}
    return {"id": session["id"], "user_id": session["user_id"], "messages": session.get("messages", [])}


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
