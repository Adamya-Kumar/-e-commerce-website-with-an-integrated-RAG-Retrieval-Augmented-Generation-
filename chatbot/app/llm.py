from __future__ import annotations

import ast
import json
import re
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from pydantic import BaseModel, ValidationError

from app.config import settings

LLM_TIMEOUT_SECONDS = 20.0

CompleteJsonFn = Callable[[str, type[BaseModel]], BaseModel | dict[str, Any]]
CompleteTextFn = Callable[[str], str]

_complete_json: CompleteJsonFn | None = None
_complete_text: CompleteTextFn | None = None


def set_llm_hooks(
    complete_json: CompleteJsonFn | None = None,
    complete_text: CompleteTextFn | None = None,
) -> None:
    """Replace Groq calls. Used by tests with a fake LLM."""
    global _complete_json, _complete_text
    _complete_json = complete_json
    _complete_text = complete_text


def extract_text(content: Any) -> str:
    """Pull visible text out of Groq/LangChain message payloads."""
    if content is None:
        return ""
    if isinstance(content, str):
        stripped = content.strip()
        if stripped.startswith(("{", "[", "'")):
            parsed: Any = None
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                try:
                    parsed = ast.literal_eval(stripped)
                except (ValueError, SyntaxError):
                    parsed = None
            if parsed is not None and not isinstance(parsed, str):
                return extract_text(parsed)
        return stripped
    if isinstance(content, dict):
        if "text" in content:
            return extract_text(content.get("text"))
        parts = [extract_text(content.get(key)) for key in ("content", "message")]
        return "\n".join(part for part in parts if part).strip()
    if isinstance(content, list):
        parts = [extract_text(part) for part in content]
        return "\n".join(part for part in parts if part).strip()
    inner = getattr(content, "content", None)
    if inner is not None and inner is not content:
        return extract_text(inner)
    text_attr = getattr(content, "text", None)
    if isinstance(text_attr, str):
        return text_attr.strip()
    return ""


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


def _groq_model(model_id: str) -> Any:
    from langchain_groq import ChatGroq

    return ChatGroq(
        model=model_id,
        groq_api_key=settings.groq_api_key,
        temperature=0,
        timeout=LLM_TIMEOUT_SECONDS,
        max_retries=1,
    )


def _gemini_model(model_id: str) -> Any:
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=model_id,
        google_api_key=settings.google_api_key,
        temperature=0,
        timeout=LLM_TIMEOUT_SECONDS,
        max_retries=1,
    )


def _provider_models(model_id: str | None = None) -> list[Any]:
    """Groq is the primary chat model. Gemini is used only when Groq is unavailable."""
    models: list[Any] = []
    requested = (model_id or "").strip()
    requested_is_gemini = "gemini" in requested.lower()

    groq_id = settings.groq_chat_model if requested_is_gemini or not requested else requested
    if settings.groq_api_key and groq_id and not requested_is_gemini:
        models.append(_groq_model(groq_id))

    gemini_id = requested if requested_is_gemini else settings.gemini_chat_model
    if settings.google_api_key and gemini_id:
        models.append(_gemini_model(gemini_id))

    if not models:
        raise RuntimeError(
            "No chat model is configured. Set GROQ_API_KEY and GROQ_CHAT_MODEL, "
            "or GOOGLE_API_KEY and GEMINI_CHAT_MODEL."
        )
    return models


def _invoke_model(model: Any, prompt: str) -> Any:
    with ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(model.invoke, prompt).result(timeout=LLM_TIMEOUT_SECONDS)


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

    last_error: Exception | None = None
    for model in _provider_models(model_id):
        try:
            return _complete_json_with_model(model, prompt, schema)
        except Exception as exc:
            last_error = exc
    raise last_error or RuntimeError("Chat model failed.")


def _complete_json_with_model(model: Any, prompt: str, schema: type[BaseModel]) -> BaseModel:
    structured = getattr(model, "with_structured_output", None)
    if callable(structured):
        try:
            bound = structured(schema)
            result = _invoke_model(bound, prompt)
            if isinstance(result, schema):
                return result
            return schema.model_validate(result)
        except (ValidationError, ValueError, TypeError):
            pass

    raw = _invoke_model(model, prompt)
    content = extract_text(getattr(raw, "content", raw))
    return schema.model_validate(_parse_json_object(content))


def conversational_chat_model(model_id: str | None = None) -> Any:
    """Primary conversational chat model. Groq is first; Gemini is the fallback."""
    return _provider_models(model_id)[0]


def complete_chat(
    system: str,
    history: list[dict[str, Any]] | None,
    user_text: str,
    *,
    model_id: str | None = None,
) -> str:
    """Reply with the conversational chat model, keeping earlier turns as messages."""
    if _complete_text is not None:
        turns = []
        for item in history or []:
            role = str(item.get("role") or "user")
            content = str(item.get("content") or "").strip()
            if content:
                turns.append(f"{role}: {content}")
        transcript = "\n".join(turns) if turns else "(none)"
        prompt = f"{system}\n\nConversation:\n{transcript}\n\nUser:\n{user_text}"
        return extract_text(_complete_text(prompt))

    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

    messages: list[Any] = [SystemMessage(content=system)]
    for item in history or []:
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        if item.get("role") == "assistant":
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))
    messages.append(HumanMessage(content=user_text))

    last_error: Exception | None = None
    for model in _provider_models(model_id):
        try:
            raw = _invoke_model(model, messages)
            text = extract_text(getattr(raw, "content", raw))
            if text:
                return text
            raise RuntimeError("Empty model output.")
        except Exception as exc:
            last_error = exc
    raise last_error or RuntimeError("Chat model failed.")


def complete_text(prompt: str, *, model_id: str | None = None) -> str:
    if _complete_text is not None:
        return extract_text(_complete_text(prompt))

    last_error: Exception | None = None
    for model in _provider_models(model_id):
        try:
            raw = _invoke_model(model, prompt)
            text = extract_text(getattr(raw, "content", raw))
            if text:
                return text
            raise RuntimeError("Empty model output.")
        except Exception as exc:
            last_error = exc
    raise last_error or RuntimeError("Chat model failed.")


__all__ = [
    "complete_chat",
    "complete_json",
    "complete_text",
    "conversational_chat_model",
    "extract_text",
    "set_llm_hooks",
]
