from __future__ import annotations

import pytest

from app.config import settings
from app.llm import set_llm_hooks

settings.postgres_url = ""
settings.google_api_key = ""
settings.service_key = settings.service_key or "test-secret"


@pytest.fixture(autouse=True)
def isolate_external_services(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "postgres_url", "", raising=False)
    monkeypatch.setattr(settings, "google_api_key", "", raising=False)
    monkeypatch.setattr(
        "app.rag.analyze.fetch_categories",
        lambda **_kwargs: ["laptops", "phones", "audio", "wearables"],
    )
    yield
    set_llm_hooks(None, None)
