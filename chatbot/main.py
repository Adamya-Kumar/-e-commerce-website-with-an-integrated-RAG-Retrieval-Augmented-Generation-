"""Uvicorn entry so `uvicorn main:app` works from the chatbot folder."""

from app.main import app

__all__ = ["app"]
