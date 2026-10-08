from __future__ import annotations

import re
from typing import Any

from app.agent.prompts import ANALYSIS_PROMPT
from app.llm import complete_json
from app.rag.budget import parse_budget
from app.rag.categories import fetch_categories, normalize_category
from app.rag.schemas import ProductFilters, QueryAnalysis

HISTORY_TURNS = 6
DEFERRED_INTENTS = {"cart_action", "order_action"}
RETRIEVAL_INTENTS = {"product_search", "product_question", "compare", "policy"}
_REFINEMENT_MARKERS = (
    "cheaper",
    "those",
    "them",
    "similar",
    "same ones",
    "in stock",
    "more expensive",
    "the first",
    "the second",
    "the third",
    "another one",
    "show cheaper",
    "which one",
    "which is",
    "which of",
    "what's best",
    "whats best",
    "what is best",
    "this best",
    "is best",
    "best one",
    "recommend",
    "compare",
    "better",
    "among these",
    "of these",
    "of them",
    "this one",
    "that one",
    "these ones",
)
_COMPARE_MARKERS = (
    "which one",
    "which is",
    "which of",
    "what's best",
    "whats best",
    "what is best",
    "this best",
    "is best",
    "best one",
    "compare",
    "better",
    "recommend",
)


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


_NEW_SEARCH_PREFIXES = (
    "suggest",
    "show me",
    "find me",
    "find ",
    "search",
    "i want",
    "i need",
    "looking for",
)


def _product_terms(message: str) -> set[str]:
    from app.rag.budget import budget_tokens

    return _content_terms(message) - budget_tokens(message)


def is_budget_follow_up(message: str, history: list[dict[str, Any]] | None) -> bool:
    """A later turn that only adds a budget, such as 'under 60000'."""
    if not parse_budget(message or ""):
        return False
    if _product_terms(message):
        return False
    return bool(prior_product_query(history))


def is_refinement(message: str) -> bool:
    text = (message or "").strip().lower()
    if not text:
        return False
    is_follow_up = any(marker in text for marker in _REFINEMENT_MARKERS)
    if any(text.startswith(prefix) for prefix in _NEW_SEARCH_PREFIXES):
        return is_follow_up and any(
            marker in text
            for marker in ("cheaper", "those", "them", "similar", "same ones", "the first", "the second", "another one")
        )
    return is_follow_up


def prior_product_query(history: list[dict[str, Any]] | None) -> str:
    users = [item["content"] for item in recent_history(history) if item["role"] == "user"]
    for content in reversed(users):
        if not is_refinement(content):
            return content
    return users[-1] if users else ""


def _content_terms(text: str) -> set[str]:
    from app.rag.express_search import query_terms

    return query_terms(text)


def _category_in_text(category: str | None, text: str) -> bool:
    if not category:
        return False
    lowered = text.lower()
    stems = {category.lower(), category.lower().replace("-", " ")}
    extra = set()
    for stem in stems:
        if stem.endswith("s") and len(stem) > 3:
            extra.add(stem[:-1])
    stems.update(extra)
    return any(stem and stem in lowered for stem in stems)


def _fallback_analysis(message: str, history: list[dict[str, Any]] | None) -> QueryAnalysis:
    standalone = (message or "").strip()
    if is_refinement(standalone):
        prior = [item["content"] for item in recent_history(history) if item["role"] == "user"]
        if prior:
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

    current = (message or "").strip()
    lowered = current.lower()
    follow_up = is_refinement(current) or is_budget_follow_up(current, history)
    if current and not follow_up:
        analysis.standalone_query = current
        category = normalize_category(analysis.filters.category, valid)
        if category and not _category_in_text(category, lowered):
            category = None
        if category is None:
            for slug in valid:
                if _category_in_text(slug, lowered):
                    category = slug
                    break
        brand = analysis.filters.brand
        if brand and str(brand).lower() not in lowered:
            brand = None
        has_price = bool(re.search(r"\d", current))
        analysis.filters = ProductFilters(
            category=category,
            brand=brand,
            min_price_paise=analysis.filters.min_price_paise if has_price else None,
            max_price_paise=analysis.filters.max_price_paise if has_price else None,
            in_stock=analysis.filters.in_stock,
        )
    else:
        prior = prior_product_query(history)
        if prior:
            rewritten = analysis.standalone_query or ""
            if not _content_terms(prior).intersection(_content_terms(rewritten)):
                analysis.standalone_query = f"{prior}. Follow-up: {current}"
            grounded = f"{prior} {current}"
            category = normalize_category(analysis.filters.category, valid)
            if category and not _category_in_text(category, grounded):
                category = None
            if category is None:
                for slug in valid:
                    if _category_in_text(slug, grounded):
                        category = slug
                        break
            brand = analysis.filters.brand
            if brand and str(brand).lower() not in grounded.lower():
                brand = None
            has_price = bool(re.search(r"\d", grounded))
            analysis.filters = ProductFilters(
                category=category,
                brand=brand,
                min_price_paise=analysis.filters.min_price_paise if has_price else None,
                max_price_paise=analysis.filters.max_price_paise if has_price else None,
                in_stock=analysis.filters.in_stock,
            )
            if any(marker in lowered for marker in _COMPARE_MARKERS):
                analysis.intent = "compare"
                analysis.standalone_query = prior
        elif _content_terms(current):
            analysis.standalone_query = current
            category = normalize_category(analysis.filters.category, valid)
            if category and not _category_in_text(category, lowered):
                category = None
            if category is None:
                for slug in valid:
                    if _category_in_text(slug, lowered):
                        category = slug
                        break
            brand = analysis.filters.brand
            if brand and str(brand).lower() not in lowered:
                brand = None
            has_price = bool(re.search(r"\d", current))
            analysis.filters = ProductFilters(
                category=category,
                brand=brand,
                min_price_paise=analysis.filters.min_price_paise if has_price else None,
                max_price_paise=analysis.filters.max_price_paise if has_price else None,
                in_stock=analysis.filters.in_stock,
            )
        else:
            analysis.intent = "chitchat"
            analysis.needs_retrieval = False
            analysis.standalone_query = current
            analysis.filters = ProductFilters()

    if analysis.intent in DEFERRED_INTENTS:
        analysis.needs_retrieval = False
    elif analysis.intent == "chitchat":
        analysis.needs_retrieval = False
    elif analysis.intent in RETRIEVAL_INTENTS:
        analysis.needs_retrieval = True
    if not analysis.standalone_query.strip():
        analysis.standalone_query = current or "product search"

    budget_text = current
    if any(word in lowered for word in ("cheaper", "more expensive")):
        budget_text = current
    elif follow_up:
        budget_text = f"{prior_product_query(history)} {current}".strip()
    budget = parse_budget(budget_text)
    if budget:
        analysis.filters = analysis.filters.model_copy(update=budget)
    if re.search(r"\bin stock\b", f"{budget_text} {current}", re.IGNORECASE):
        analysis.filters.in_stock = True
    if str(analysis.filters.brand or "").strip().lower() in {"any", "all", "none", "na", "n/a", "whatever"}:
        analysis.filters.brand = None
    return analysis


__all__ = [
    "DEFERRED_INTENTS",
    "HISTORY_TURNS",
    "RETRIEVAL_INTENTS",
    "analyze_query",
    "format_history",
    "is_budget_follow_up",
    "is_refinement",
    "recent_history",
]
