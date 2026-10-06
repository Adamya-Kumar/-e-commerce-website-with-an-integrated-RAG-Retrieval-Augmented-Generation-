from __future__ import annotations

from typing import Any

PROMPT_INJECTION_PATTERNS = (
    "ignore previous instructions",
    "ignore all previous instructions",
    "override the system prompt",
    "developer prompt",
    "system prompt",
    "bypass safety",
    "reveal your hidden instructions",
    "pretend to be",
    "act as if",
)

OFF_TOPIC_WORDS = (
    "politics",
    "medical advice",
    "legal advice",
    "hate",
    "violence",
    "self-harm",
    "spam",
)


def guard_input(message: str | None, *, is_guest: bool = False, page_context: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = (message or "").strip()
    if not payload:
        return {"ok": False, "message": "Please enter a shopping or store-help question."}

    if len(payload) > 2000:
        return {"ok": False, "message": "Your message is too long. Please keep it under 2,000 characters."}

    lowered = payload.lower()
    if any(pattern in lowered for pattern in PROMPT_INJECTION_PATTERNS):
        return {
            "ok": False,
            "message": "I can help with shopping, catalog questions, shipping, returns, and order support. Please keep the request on-store help.",
        }

    if any(word in lowered for word in OFF_TOPIC_WORDS):
        return {
            "ok": False,
            "message": "I can help with shopping and store support only. Please ask about products, pricing, shipping, or returns.",
        }

    if "ask about something unrelated" in lowered or "not shopping" in lowered:
        return {
            "ok": False,
            "message": "I can help only with shopping, product questions, shipping, and store policies.",
        }

    if is_guest:
        readonly_prompt = "I can answer product and policy questions for guests. To view or change cart or order data, please log in."
        if any(keyword in lowered for keyword in ("cart", "orders", "cancel", "return", "place order", "checkout")):
            return {"ok": False, "message": readonly_prompt}

    return {"ok": True, "message": payload}
