from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel, ValidationError

from app.config import settings

CompleteJsonFn = Callable[[str, type[BaseModel]], BaseModel | dict[str, Any]]
CompleteTextFn = Callable[[str], str]

_complete_json: CompleteJsonFn | None = None
_complete_text: CompleteTextFn | None = None


def set_llm_hooks(
    complete_json: CompleteJsonFn | None = None,
    complete_text: CompleteTextFn | None = None,
) -> None:
    """Replace Gemini calls. Used by tests with a fake LLM."""
    global _complete_json, _complete_text
    _complete_json = complete_json
    _complete_text = complete_text


def _parse_json_object(raw: str) -> dict[str, Any]:
    text = (raw or "").strip()
    if not text:
        raise ValueError("Empty model output.")
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, flags=re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            text = text[start : end + 1]
    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise ValueError("Model output was not a JSON object.")
    return payload


def _chat_model(model_id: str | None = None) -> Any:
    from langchain_google_genai import ChatGoogleGenerativeAI

    chosen = model_id or settings.gemini_chat_model
    if not settings.google_api_key or not chosen:
        raise RuntimeError("Gemini chat settings are missing.")
    return ChatGoogleGenerativeAI(
        model=chosen,
        google_api_key=settings.google_api_key,
        temperature=0,
    )


def complete_json(
    prompt: str,
    schema: type[BaseModel],
    *,
    model_id: str | None = None,
) -> BaseModel:
    if _complete_json is not None:
        result = _complete_json(prompt, schema)
        if isinstance(result, schema):
            return result
        return schema.model_validate(result)

    model = _chat_model(model_id)
    structured = getattr(model, "with_structured_output", None)
    if callable(structured):
        try:
            result = structured(schema).invoke(prompt)
            if isinstance(result, schema):
                return result
            return schema.model_validate(result)
        except (ValidationError, ValueError, TypeError):
            pass

    raw = model.invoke(prompt)
    content = getattr(raw, "content", raw)
    if isinstance(content, list):
        content = "".join(str(part) for part in content)
    return schema.model_validate(_parse_json_object(str(content)))


def complete_text(prompt: str, *, model_id: str | None = None) -> str:
    if _complete_text is not None:
        return _complete_text(prompt)

    model = _chat_model(model_id)
    raw = model.invoke(prompt)
    content = getattr(raw, "content", raw)
    if isinstance(content, list):
        content = "".join(str(part) for part in content)
    return str(content).strip()


__all__ = ["complete_json", "complete_text", "set_llm_hooks"]
