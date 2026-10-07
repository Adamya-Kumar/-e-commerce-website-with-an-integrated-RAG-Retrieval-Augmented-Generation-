from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings
from app.db.sessions import IN_MEMORY_CHAT_SESSIONS
from app.llm import set_llm_hooks
from app.main import app
from app.rag.schemas import QueryAnalysis


def _fake_json(prompt: str, schema, **_kwargs):
    text = prompt.lower().split("current user message:")[-1]
    if "return policy" in text:
        return QueryAnalysis(intent="policy", standalone_query="return policy", needs_retrieval=True)
    if "cart" in text or "order" in text:
        return QueryAnalysis(intent="cart_action", standalone_query="cart", needs_retrieval=False)
    return QueryAnalysis(
        intent="product_search",
        standalone_query="best laptop under 60000 for coding",
        needs_retrieval=True,
    )


def test_chat_stream_emits_sse_events(monkeypatch) -> None:
    monkeypatch.setattr(settings, "service_key", "test-secret", raising=False)
    monkeypatch.setattr("app.rag.analyze.fetch_categories", lambda **_k: ["laptops"])
    monkeypatch.setattr("app.rag.pipeline.retrieve_products", lambda *_a, **_k: [])
    monkeypatch.setattr("app.rag.pipeline.retrieve_policies", lambda *_a, **_k: [])
    set_llm_hooks(complete_json=_fake_json, complete_text=lambda *_a, **_k: "No matches.")
    try:
        with TestClient(app) as test_client:
            response = test_client.post(
                "/chat",
                json={
                    "thread_id": "11111111-1111-1111-1111-111111111111",
                    "message": "Show me laptops under 50k",
                    "page_context": {"type": "home"},
                },
                headers={"X-Service-Key": "test-secret"},
            )
            assert response.status_code == 200
            assert response.headers["content-type"].startswith("text/event-stream")
            body = "".join(response.iter_text())
            assert "event: token" in body
            assert "event: done" in body
    finally:
        set_llm_hooks(None, None)


def test_latest_chat_session_returns_user_messages(monkeypatch) -> None:
    monkeypatch.setattr(settings, "service_key", "test-secret", raising=False)
    monkeypatch.setattr("app.rag.analyze.fetch_categories", lambda **_k: ["laptops"])
    monkeypatch.setattr("app.rag.pipeline.retrieve_products", lambda *_a, **_k: [])
    monkeypatch.setattr("app.rag.pipeline.retrieve_policies", lambda *_a, **_k: [])
    IN_MEMORY_CHAT_SESSIONS.clear()
    set_llm_hooks(complete_json=_fake_json, complete_text=lambda *_a, **_k: "Saved reply.")
    try:
        with TestClient(app) as test_client:
            post_response = test_client.post(
                "/chat",
                json={
                    "thread_id": "22222222-2222-2222-2222-222222222222",
                    "message": "Show me laptops under 50k",
                    "page_context": {"type": "product", "slug": "acer-aspire-5"},
                },
                headers={"X-Service-Key": "test-secret", "X-User-Id": "user-456"},
            )
            assert post_response.status_code == 200
            "".join(post_response.iter_text())

            latest_response = test_client.get(
                "/chat/sessions/latest",
                headers={"X-Service-Key": "test-secret", "X-User-Id": "user-456"},
            )
            assert latest_response.status_code == 200
            payload = latest_response.json()
            assert payload["user_id"] == "user-456"
            assert len(payload["messages"]) >= 2
    finally:
        set_llm_hooks(None, None)


def test_chat_emits_cancelling_when_disconnected(monkeypatch) -> None:
    monkeypatch.setattr(settings, "service_key", "test-secret", raising=False)

    class DisconnectRequest:
        headers = {"X-Service-Key": "test-secret"}

        async def is_disconnected(self) -> bool:
            return True

    from app.main import ChatRequest, chat_stream

    async def run() -> str:
        response = await chat_stream(
            DisconnectRequest(),  # type: ignore[arg-type]
            ChatRequest(thread_id="33333333-3333-3333-3333-333333333333", message="hi"),
        )
        chunks: list[str] = []
        async for chunk in response.body_iterator:
            chunks.append(chunk if isinstance(chunk, str) else chunk.decode())
        return "".join(chunks)

    import asyncio

    body = asyncio.run(run())
    assert "event: cancelling" in body
