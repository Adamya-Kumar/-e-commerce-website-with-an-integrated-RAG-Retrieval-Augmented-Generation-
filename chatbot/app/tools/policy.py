from __future__ import annotations

from typing import Any

from app.rag.retrieval import retrieve_policies


def get_policy(topic: str, k: int = 4) -> dict[str, Any]:
    """Search the policy/FAQ index for the closest matching content."""
    rows = retrieve_policies(topic or "", k=k)
    if not rows:
        return {
            "ok": True,
            "policy": {"document": "I couldn't find a relevant policy answer.", "score": 0.0},
            "ui_card": {"type": "policy", "document": "I couldn't find a relevant policy answer."},
        }

    policy = rows[0]
    document = str(policy.get("document") or "No policy details found.")
    return {
        "ok": True,
        "policy": {"document": document, "score": float(policy.get("score") or 0.0)},
        "ui_card": {"type": "policy", "document": document},
    }


__all__ = ["get_policy"]
