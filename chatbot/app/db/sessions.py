from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import settings

try:
    import psycopg
except ModuleNotFoundError:  # pragma: no cover
    psycopg = None

IN_MEMORY_CHAT_SESSIONS: dict[str, dict[str, Any]] = {}


def schema_sql() -> str:
    return (Path(__file__).resolve().parent / "schema.sql").read_text(encoding="utf-8")


def normalize_session_id(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return str(uuid.uuid4())
    try:
        return str(uuid.UUID(raw))
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, raw))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _memory_session(session_id: str, user_id: str | None, title: str) -> dict[str, Any]:
    session = IN_MEMORY_CHAT_SESSIONS.setdefault(
        session_id,
        {
            "id": session_id,
            "user_id": user_id,
            "title": title,
            "messages": [],
            "updated_at": _now(),
        },
    )
    session["user_id"] = user_id
    if title and not session.get("title"):
        session["title"] = title
    session["updated_at"] = _now()
    return session


def apply_schema() -> None:
    if not settings.postgres_url or psycopg is None:
        return
    statements = [part.strip() for part in schema_sql().split(";") if part.strip()]
    try:
        with psycopg.connect(settings.postgres_url) as connection:
            with connection.cursor() as cursor:
                for statement in statements:
                    cursor.execute(statement)
            connection.commit()
    except Exception:
        return


def persist_session(session_id: str, *, user_id: str | None, title: str) -> dict[str, Any]:
    session = _memory_session(session_id, user_id, title)
    if not settings.postgres_url or psycopg is None:
        return session
    try:
        with psycopg.connect(settings.postgres_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
                    VALUES (%s, %s, %s, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        title = COALESCE(EXCLUDED.title, chat_sessions.title),
                        updated_at = NOW()
                    """,
                    (session_id, user_id, title),
                )
            connection.commit()
    except Exception:
        pass
    return session


def persist_message(
    session_id: str,
    *,
    role: str,
    content: str,
    ui_cards: list[dict[str, Any]] | None = None,
) -> None:
    session = IN_MEMORY_CHAT_SESSIONS.setdefault(
        session_id,
        {"id": session_id, "user_id": None, "title": "", "messages": [], "updated_at": _now()},
    )
    message = {
        "id": str(uuid.uuid4()),
        "role": role,
        "content": content,
        "ui_cards": ui_cards or [],
    }
    session.setdefault("messages", []).append(message)
    session["updated_at"] = _now()

    if not settings.postgres_url or psycopg is None:
        return
    try:
        with psycopg.connect(settings.postgres_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO chat_messages (id, session_id, role, content, ui_cards, created_at)
                    VALUES (%s, %s, %s, %s, %s::jsonb, NOW())
                    """,
                    (message["id"], session_id, role, content, json.dumps(ui_cards or [])),
                )
                cursor.execute(
                    "UPDATE chat_sessions SET updated_at = NOW() WHERE id = %s",
                    (session_id,),
                )
            connection.commit()
    except Exception:
        pass


def latest_session_for_user(user_id: str | None) -> dict[str, Any] | None:
    if not user_id:
        return None

    memory = [
        value
        for value in IN_MEMORY_CHAT_SESSIONS.values()
        if value.get("user_id") == user_id
    ]
    if memory:
        memory.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
        return memory[0]

    if not settings.postgres_url or psycopg is None:
        return None
    try:
        with psycopg.connect(settings.postgres_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, title FROM chat_sessions
                    WHERE user_id = %s
                    ORDER BY updated_at DESC
                    LIMIT 1
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None
                session_id = str(row[0])
                cursor.execute(
                    """
                    SELECT id, role, content, ui_cards
                    FROM chat_messages
                    WHERE session_id = %s
                    ORDER BY created_at ASC
                    """,
                    (session_id,),
                )
                messages = []
                for item in cursor.fetchall():
                    cards = item[3]
                    if isinstance(cards, str):
                        cards = json.loads(cards)
                    messages.append(
                        {
                            "id": str(item[0]),
                            "role": item[1],
                            "content": item[2],
                            "ui_cards": cards or [],
                        }
                    )
                return {
                    "id": session_id,
                    "user_id": str(row[1]) if row[1] is not None else None,
                    "title": row[2],
                    "messages": messages,
                }
    except Exception:
        return None


def _history_rows(session: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"role": item["role"], "content": item["content"]}
        for item in session.get("messages", [])
        if item.get("role") in {"user", "assistant"} and item.get("content")
    ]


def _postgres_session(session_id: str) -> dict[str, Any] | None:
    if not settings.postgres_url or psycopg is None:
        return None
    try:
        with psycopg.connect(settings.postgres_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, user_id, title FROM chat_sessions
                    WHERE id = %s
                    """,
                    (session_id,),
                )
                row = cursor.fetchone()
                if row is None:
                    return None
                cursor.execute(
                    """
                    SELECT id, role, content, ui_cards
                    FROM chat_messages
                    WHERE session_id = %s
                    ORDER BY created_at ASC
                    """,
                    (session_id,),
                )
                messages = []
                for item in cursor.fetchall():
                    cards = item[3]
                    if isinstance(cards, str):
                        cards = json.loads(cards)
                    messages.append(
                        {
                            "id": str(item[0]),
                            "role": item[1],
                            "content": item[2],
                            "ui_cards": cards or [],
                        }
                    )
                return {
                    "id": str(row[0]),
                    "user_id": str(row[1]) if row[1] is not None else None,
                    "title": row[2],
                    "messages": messages,
                    "updated_at": _now(),
                }
    except Exception:
        return None


def history_for_session(session_id: str) -> list[dict[str, str]]:
    session = IN_MEMORY_CHAT_SESSIONS.get(session_id)
    if session and session.get("messages"):
        return _history_rows(session)
    loaded = _postgres_session(session_id)
    if loaded and loaded.get("messages"):
        IN_MEMORY_CHAT_SESSIONS[session_id] = loaded
        return _history_rows(loaded)
    if session:
        return _history_rows(session)
    return []
