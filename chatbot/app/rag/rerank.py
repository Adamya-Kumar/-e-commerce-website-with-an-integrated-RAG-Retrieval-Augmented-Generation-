from __future__ import annotations

from typing import Any

from app.agent.prompts import RERANK_PROMPT
from app.config import settings
from app.llm import complete_json
from app.rag.schemas import RerankScores

RERANK_TOP_N = 5
RERANK_SKIP_AT_OR_BELOW = 3


def _candidate_block(items: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for index, item in enumerate(items, start=1):
        title = item.get("title") or item.get("slug") or item.get("id")
        snippet = str(item.get("document") or "")[:400]
        lines.append(f"{index}. slug={item.get('slug')} title={title}\n{snippet}")
    return "\n\n".join(lines)


def rerank_candidates(
    query: str,
    candidates: list[dict[str, Any]],
    *,
    enabled: bool | None = None,
    min_score: float | None = None,
) -> list[dict[str, Any]]:
    """Keep the top 5 candidates at or above the min score. Skip when 3 or fewer."""
    if not candidates:
        return []

    use_rerank = settings.rerank_enabled if enabled is None else enabled
    threshold = settings.rerank_min_score if min_score is None else min_score

    if not use_rerank or len(candidates) <= RERANK_SKIP_AT_OR_BELOW:
        return candidates[:RERANK_TOP_N]

    prompt = RERANK_PROMPT.format(query=query, candidates=_candidate_block(candidates))
    try:
        parsed = complete_json(prompt, RerankScores, model_id=settings.rerank_model_id or None)
        scores = list(parsed.scores)
        if len(scores) != len(candidates):
            raise ValueError("Rerank score count did not match candidates.")
        ranked = [
            {**item, "rerank_score": float(score)}
            for item, score in zip(candidates, scores, strict=True)
        ]
        ranked.sort(key=lambda item: item["rerank_score"], reverse=True)
        return [item for item in ranked if item["rerank_score"] >= threshold][:RERANK_TOP_N]
    except Exception:
        return candidates[:RERANK_TOP_N]


__all__ = ["RERANK_SKIP_AT_OR_BELOW", "RERANK_TOP_N", "rerank_candidates"]
