from __future__ import annotations

from typing import Any

from app.agent.prompts import ANALYSIS_PROMPT
from app.llm import complete_json
from app.rag.categories import fetch_categories, normalize_category
from app.rag.schemas import ProductFilters, QueryAnalysis

HISTORY_TURNS = 6
DEFERRED_INTENTS = {"cart_action", "order_action"}
RETRIEVAL_INTENTS = {"product_search", "product_question", "compare", "policy"}


def recent_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for item in history or []:
        role = str(item.get("role") or "")
        content = str(item.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            rows.append({"role": role, "content": content})
    return rows[-HISTORY_TURNS:]


def format_history(history: list[dict[str, Any]] | None) -> str:
    rows = recent_history(history)
    if not rows:
        return "(none)"
    lines = []
    for item in rows:
        label = "User" if item["role"] == "user" else "Assistant"
        lines.append(f"{label}: {item['content']}")
    return "\n".join(lines)


def _fallback_analysis(message: str, history: list[dict[str, Any]] | None) -> QueryAnalysis:
    prior = [item["content"] for item in recent_history(history) if item["role"] == "user"]
    standalone = message.strip()
    if prior and len(standalone.split()) <= 6:
        standalone = f"{prior[-1]} | follow-up: {standalone}"
    return QueryAnalysis(
        intent="product_search",
        standalone_query=standalone or message,
        filters=ProductFilters(),
        needs_retrieval=True,
    )


def analyze_query(
    message: str,
    history: list[dict[str, Any]] | None = None,
    *,
    categories: list[str] | None = None,
) -> QueryAnalysis:
    valid = categories if categories is not None else fetch_categories()
    prompt = ANALYSIS_PROMPT.format(
        categories=", ".join(valid) if valid else "(none loaded)",
        history=format_history(history),
        message=(message or "").strip(),
    )
    try:
        analysis = complete_json(prompt, QueryAnalysis)
    except Exception:
        analysis = _fallback_analysis(message, history)

    filters = analysis.filters
    filters.category = normalize_category(filters.category, valid)
    analysis.filters = filters
    if analysis.intent in DEFERRED_INTENTS:
        analysis.needs_retrieval = False
    elif analysis.intent == "chitchat":
        analysis.needs_retrieval = False
    elif analysis.intent in RETRIEVAL_INTENTS:
        analysis.needs_retrieval = True
    if not analysis.standalone_query.strip():
        analysis.standalone_query = (message or "").strip() or "product search"
    return analysis


__all__ = [
    "DEFERRED_INTENTS",
    "HISTORY_TURNS",
    "RETRIEVAL_INTENTS",
    "analyze_query",
    "format_history",
    "recent_history",
]
