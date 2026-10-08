from __future__ import annotations

import re
from typing import Any

from app.rag.budget import parse_budget
from app.rag.schemas import QueryAnalysis

_GREETING = re.compile(
    r"^(?:hi|hello|hey|hii|good morning|good afternoon|good evening|namaste)[!.?\s]*$",
    re.IGNORECASE,
)
_ANY_BUDGET = re.compile(r"\b(?:any budget|no budget|show all|whatever the price)\b", re.IGNORECASE)


def _budget_known(message: str, history: list[dict[str, Any]] | None, analysis: QueryAnalysis) -> bool:
    if analysis.filters.min_price_paise is not None or analysis.filters.max_price_paise is not None:
        return True
    if parse_budget(message or ""):
        return True
    for item in history or []:
        if item.get("role") == "user" and parse_budget(str(item.get("content") or "")):
            return True
    return False


def opening_reply(
    message: str,
    history: list[dict[str, Any]] | None,
    analysis: QueryAnalysis,
) -> str | None:
    """Greet, or ask for the missing product or budget before searching."""
    text = (message or "").strip()
    if _GREETING.match(text):
        return (
            "Hi! I can help you find something in the store. "
            "What are you looking for, and what budget should I stay under?"
        )
    if analysis.intent != "product_search":
        return None
    if _ANY_BUDGET.search(text):
        return None
    if not analysis.filters.category:
        return None
    if _budget_known(text, history, analysis):
        return None
    label = analysis.filters.category.replace("-", " ")
    return (
        f"Hi! I can look up {label} for you. "
        "What budget should I stay under, and is this for work, study, or everyday use?"
    )


__all__ = ["opening_reply"]
