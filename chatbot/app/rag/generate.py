from __future__ import annotations

from typing import Any

from app.agent.prompts import CHITCHAT_ANSWER, GENERATE_PROMPT, NOT_FOUND_ANSWER
from app.llm import complete_text
from app.rag.analyze import format_history


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
) -> str:
    if intent == "chitchat" and not products and not policies:
        try:
            return complete_text(
                GENERATE_PROMPT.format(
                    history=format_history(history),
                    message=message,
                    context="(chitchat; no catalog data)",
                    products="(none)",
                )
            ) or CHITCHAT_ANSWER
        except Exception:
            return CHITCHAT_ANSWER

    if not products and not policies:
        return NOT_FOUND_ANSWER

    prompt = GENERATE_PROMPT.format(
        history=format_history(history),
        message=message,
        context=_format_context(products, policies),
        products=_format_products(products),
    )
    try:
        answer = complete_text(prompt).strip()
    except Exception:
        answer = ""
    if not answer:
        if products:
            names = ", ".join(str(item.get("title") or item.get("slug")) for item in products[:3])
            return f"Here are options that match: {names}."
        snippet = str(policies[0].get("document") or "").strip()
        return snippet[:280] or NOT_FOUND_ANSWER
    return answer


__all__ = ["generate_answer"]
