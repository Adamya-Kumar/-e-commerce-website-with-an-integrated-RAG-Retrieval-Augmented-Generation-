from __future__ import annotations

from typing import Any

from app.agent.prompts import (
    CHITCHAT_ANSWER,
    GENERATE_SYSTEM,
    GENERATE_USER,
    NOT_FOUND_ANSWER,
)
from app.llm import complete_chat, extract_text
from app.rag.analyze import is_refinement, recent_history
from app.rag.express_search import hit_matches_query, query_terms


def _format_products(products: list[dict[str, Any]]) -> str:
    if not products:
        return "(none)"
    lines = []
    for item in products:
        rupees = int(item.get("price_paise") or 0) / 100
        stock = "in stock" if item.get("in_stock") else "out of stock"
        lines.append(
            f"- {item.get('title')} (slug: {item.get('slug')}) ₹{rupees:.0f}, {stock}"
        )
    return "\n".join(lines)


def _format_context(products: list[dict[str, Any]], policies: list[dict[str, Any]]) -> str:
    chunks: list[str] = []
    for item in products:
        chunks.append(f"PRODUCT {item.get('slug')}: {item.get('reason') or ''}")
    for item in policies:
        chunks.append(f"POLICY: {item.get('document') or ''}")
    return "\n\n".join(chunks) if chunks else "(no retrieved documents)"


def generate_answer(
    message: str,
    history: list[dict[str, Any]] | None,
    products: list[dict[str, Any]],
    policies: list[dict[str, Any]],
    *,
    intent: str | None = None,
    match_query: str | None = None,
) -> str:
    if intent == "chitchat" and is_refinement(message):
        return (
            "Which products should I compare? Ask me to show a product first, "
            "then I can tell you which one is the best."
        )
    if intent == "chitchat" and not products and not policies:
        try:
            return (
                extract_text(
                    complete_chat(
                        GENERATE_SYSTEM,
                        recent_history(history),
                        GENERATE_USER.format(
                            message=message,
                            context="(chitchat; no catalog data)",
                            products="(none)",
                        ),
                    )
                )
                or CHITCHAT_ANSWER
            )
        except Exception:
            return CHITCHAT_ANSWER

    lookup = (match_query or message or "").strip()
    matched = [item for item in products if hit_matches_query(item, lookup)]
    if query_terms(lookup) and not matched:
        products = []
    else:
        products = matched or products

    if not products and not policies:
        return NOT_FOUND_ANSWER

    user_turn = GENERATE_USER.format(
        message=message,
        context=_format_context(products, policies),
        products=_format_products(products),
    )
    try:
        answer = extract_text(complete_chat(GENERATE_SYSTEM, recent_history(history), user_turn))
    except Exception:
        answer = ""
    if not answer:
        if products and intent == "compare":
            priced = [item for item in products if item.get("in_stock")] or products
            pick = min(priced, key=lambda item: int(item.get("price_paise") or 0))
            names = ", ".join(str(item.get("title") or item.get("slug")) for item in products[:3])
            rupees = int(pick.get("price_paise") or 0) / 100
            return (
                f"Among {names}, {pick.get('title')} is the best value "
                f"at ₹{rupees:,.0f}."
            )
        if products:
            names = ", ".join(str(item.get("title") or item.get("slug")) for item in products[:3])
            return f"Hi! Here are options that match: {names}."
        terms = query_terms(message)
        ranked = sorted(
            policies,
            key=lambda item: sum(
                1
                for term in terms
                if term
                in f"{item.get('id') or ''} {item.get('document') or ''}".lower()
            ),
            reverse=True,
        )
        snippet = str((ranked[0] if ranked else {}).get("document") or "").strip()
        return snippet[:280] or NOT_FOUND_ANSWER
    return answer


__all__ = ["generate_answer"]
