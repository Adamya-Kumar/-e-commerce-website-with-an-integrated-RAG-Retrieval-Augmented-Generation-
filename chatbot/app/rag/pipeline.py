from __future__ import annotations

import asyncio
from typing import Any

from app.agent.prompts import CART_ORDER_DEFERRED
from app.config import settings
from app.rag.analyze import DEFERRED_INTENTS, analyze_query
from app.rag.express_search import merge_product_hits, search_express_products
from app.rag.generate import generate_answer
from app.rag.hydrate import hydrate_products
from app.rag.rerank import rerank_candidates
from app.rag.retrieval import retrieve_policies, retrieve_products
from app.rag.schemas import ProductFilters, QueryAnalysis

PipelineResult = dict[str, Any]


def _analysis_from_state(raw: dict[str, Any] | QueryAnalysis) -> QueryAnalysis:
    if isinstance(raw, QueryAnalysis):
        return raw
    return QueryAnalysis.model_validate(raw)


def stage_analyze(
    message: str,
    history: list[dict[str, Any]] | None = None,
) -> QueryAnalysis:
    return analyze_query(message, history)


def stage_retrieve(analysis: QueryAnalysis) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not analysis.needs_retrieval or analysis.intent in DEFERRED_INTENTS:
        return [], []
    if analysis.intent == "chitchat":
        return [], []
    query = analysis.standalone_query
    if analysis.intent == "policy":
        return [], retrieve_policies(query)
    faiss_hits = retrieve_products(query, filters=analysis.filters, k=settings.retrieve_k)
    express_hits = search_express_products(query, filters=analysis.filters, limit=8)
    products = merge_product_hits(query, faiss_hits, express_hits, limit=8)
    policies: list[dict[str, Any]] = []
    if analysis.intent in {"product_question", "compare"}:
        policies = []
    return products, policies


def stage_rerank(
    analysis: QueryAnalysis,
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if analysis.intent == "policy" or not candidates:
        return candidates
    if all(float(item.get("score") or 0) >= 1 for item in candidates):
        return candidates[:5]
    return rerank_candidates(analysis.standalone_query, candidates)


async def stage_hydrate(
    candidates: list[dict[str, Any]],
    user: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    token = (user or {}).get("token")
    return await hydrate_products(candidates, token=token)


def stage_generate(
    message: str,
    history: list[dict[str, Any]] | None,
    analysis: QueryAnalysis,
    products: list[dict[str, Any]],
    policies: list[dict[str, Any]],
) -> str:
    if analysis.intent in DEFERRED_INTENTS:
        return CART_ORDER_DEFERRED
    return generate_answer(
        message,
        history,
        products,
        policies,
        intent=analysis.intent,
        match_query=analysis.standalone_query,
    )


async def run_stages(
    message: str,
    history: list[dict[str, Any]] | None = None,
    user: dict[str, Any] | None = None,
) -> PipelineResult:
    analysis = await asyncio.to_thread(stage_analyze, message, history)
    from app.rag.conversation import opening_reply

    clarifying = opening_reply(message, history, analysis)
    if clarifying:
        return {
            "answer": clarifying,
            "products": [],
            "policies": [],
            "filters_used": analysis.filters.model_dump(exclude_none=True),
            "analysis": analysis.model_dump(),
        }
    candidates, policies = await asyncio.to_thread(stage_retrieve, analysis)
    ranked = await asyncio.to_thread(stage_rerank, analysis, candidates)
    try:
        products = await asyncio.wait_for(stage_hydrate(ranked, user), timeout=8)
    except TimeoutError:
        products = []
    if not products and ranked:
        products = ranked
    if analysis.intent == "policy" and not policies:
        policies = await asyncio.to_thread(retrieve_policies, analysis.standalone_query)
    answer = await asyncio.to_thread(
        stage_generate,
        message,
        history,
        analysis,
        products,
        policies,
    )
    if not (answer or "").strip():
        from app.agent.prompts import CART_ORDER_DEFERRED, NOT_FOUND_ANSWER

        if analysis.intent in DEFERRED_INTENTS:
            answer = CART_ORDER_DEFERRED
        else:
            answer = NOT_FOUND_ANSWER
    return {
        "answer": answer,
        "products": products,
        "policies": policies,
        "filters_used": analysis.filters.model_dump(exclude_none=True),
        "analysis": analysis.model_dump(),
    }


async def answer_query(
    message: str,
    history: list[dict[str, Any]] | None = None,
    user: dict[str, Any] | None = None,
    thread_id: str | None = None,
) -> PipelineResult:
    del thread_id
    return await run_stages(message, history, user)


def answer_query_sync(
    message: str,
    history: list[dict[str, Any]] | None = None,
    user: dict[str, Any] | None = None,
) -> PipelineResult:
    return asyncio.run(answer_query(message, history, user))


def answer_rag_question(query: str, filters: dict[str, Any] | None = None) -> dict[str, Any]:
    """Standalone RAG helper used by /chat/rag-test (no live Express hydrate)."""
    from app.agent.prompts import NOT_FOUND_ANSWER

    history: list[dict[str, Any]] = []
    analysis = stage_analyze(query or "", history)
    if filters:
        merged = analysis.filters.model_dump()
        merged.update(filters)
        analysis.filters = ProductFilters.model_validate(merged)
        analysis.needs_retrieval = True
    candidates, policies = stage_retrieve(analysis)
    ranked = stage_rerank(analysis, candidates)
    if not ranked and not policies:
        return {
            "answer": NOT_FOUND_ANSWER,
            "products": [],
            "policies": [],
            "filters": analysis.filters.model_dump(exclude_none=True),
        }
    return {
        "answer": stage_generate(query or "", history, analysis, ranked, policies),
        "products": ranked,
        "policies": policies,
        "filters": analysis.filters.model_dump(exclude_none=True),
    }


__all__ = [
    "answer_query",
    "answer_query_sync",
    "answer_rag_question",
    "run_stages",
    "stage_analyze",
    "stage_generate",
    "stage_hydrate",
    "stage_rerank",
    "stage_retrieve",
]
