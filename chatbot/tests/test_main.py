from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

client = TestClient(app)


def test_health_route_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_stream_emits_sse_events(monkeypatch) -> None:
    monkeypatch.setattr(settings, "service_key", "test-secret", raising=False)

    with TestClient(app) as test_client:
        response = test_client.post(
            "/chat",
            json={
                "thread_id": "thread-stream-1",
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


def test_latest_chat_session_returns_user_messages(monkeypatch) -> None:
    monkeypatch.setattr(settings, "service_key", "test-secret", raising=False)

    with TestClient(app) as test_client:
        post_response = test_client.post(
            "/chat",
            json={
                "thread_id": "thread-session-1",
                "message": "Show me laptops under 50k",
                "page_context": {"type": "product", "slug": "acer-aspire-5"},
            },
            headers={"X-Service-Key": "test-secret", "X-User-Id": "user-456"},
        )
        assert post_response.status_code == 200

        latest_response = test_client.get(
            "/chat/sessions/latest",
            headers={"X-Service-Key": "test-secret", "X-User-Id": "user-456"},
        )

        assert latest_response.status_code == 200
        payload = latest_response.json()
        assert payload["user_id"] == "user-456"
        assert len(payload["messages"]) >= 2
