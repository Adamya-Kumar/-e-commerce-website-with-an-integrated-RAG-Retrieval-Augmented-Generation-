from __future__ import annotations

from fastapi import FastAPI

from app.config import settings

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


# test route to verify that the app is running and can be reached