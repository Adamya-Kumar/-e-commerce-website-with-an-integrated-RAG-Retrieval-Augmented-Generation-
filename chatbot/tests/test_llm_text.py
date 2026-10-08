from app.llm import complete_text, extract_text, set_llm_hooks


def test_extract_text_from_gemini_payload() -> None:
    payload = {
        "type": "text",
        "text": "Here is an option that fits your budget:\n\n* **LV Bag** – ₹1,000",
        "extras": {"signature": "Ev4LCvsLAWkUfRNKWAkM9IhxDjQbbOg+TXThjyqejVH"},
    }
    text = extract_text(payload)
    assert "LV Bag" in text
    assert "signature" not in text
    assert "Ev4LCvs" not in text


def test_extract_text_from_python_repr() -> None:
    raw = str(
        {
            "type": "text",
            "text": "Here is an option that fits your budget.",
            "extras": {"signature": "abc123signature"},
        }
    )
    text = extract_text(raw)
    assert text == "Here is an option that fits your budget."
    assert "signature" not in text


def test_groq_is_tried_before_gemini(monkeypatch) -> None:
    set_llm_hooks(None, None)

    class Primary:
        content = ""

    class Fallback:
        content = "answered by gemini"

    order: list[str] = []

    def providers(_model_id=None):
        return [Primary(), Fallback()]

    def invoke(model, _prompt):
        order.append(type(model).__name__)
        if isinstance(model, Primary):
            raise RuntimeError("groq unavailable")
        return model

    monkeypatch.setattr("app.llm._provider_models", providers)
    monkeypatch.setattr("app.llm._invoke_model", invoke)
    assert complete_text("which earbuds are best") == "answered by gemini"
    assert order == ["Primary", "Fallback"]
