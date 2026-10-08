from __future__ import annotations

import re
from typing import Any

import httpx

from app.config import settings
from app.rag.budget import budget_tokens
from app.rag.schemas import ProductFilters

_STOPWORDS = {
    "a",
    "an",
    "the",
    "me",
    "my",
    "some",
    "good",
    "suggest",
    "show",
    "please",
    "under",
    "for",
    "and",
    "or",
    "with",
    "to",
    "of",
    "in",
    "on",
    "best",
    "range",
    "rupees",
    "rupee",
    "rs",
    "inr",
    "ones",
    "help",
    "find",
    "looking",
    "want",
    "need",
    "buy",
    "get",
    "can",
    "you",
    "what",
    "is",
    "which",
    "one",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "who",
    "follow",
    "followup",
    "just",
    "give",
    "product",
    "brand",
    "any",
    "budget",
    "between",
    "only",
}

_IGNORED_BRANDS = {"any", "all", "none", "na", "n/a", "whatever"}


def search_tokens(query: str, category: str | None = None) -> list[str]:
    cat_bits: set[str] = set()
    if category:
        for part in str(category).lower().replace("-", " ").split():
            token = "".join(ch for ch in part if ch.isalnum())
            if not token:
                continue
            cat_bits.add(token)
            if token.endswith("s") and len(token) > 3:
                cat_bits.add(token[:-1])
            else:
                cat_bits.add(f"{token}s")
    prices = budget_tokens(query)
    tokens: list[str] = []
    seen: set[str] = set()
    normalized = re.sub(r"[:/|]+", " ", query or "").lower().replace("-", " ")
    for raw in normalized.split():
        token = "".join(ch for ch in raw if ch.isalnum())
        if len(token) <= 1 or token in _STOPWORDS or token in seen or token in cat_bits or token in prices:
            continue
        seen.add(token)
        tokens.append(token)
    return tokens


def query_terms(query: str) -> set[str]:
    terms = set()
    normalized = re.sub(r"[:/|]+", " ", query or "").lower().replace("-", " ")
    for raw in normalized.split():
        token = "".join(ch for ch in raw if ch.isalnum())
        if len(token) > 1 and token not in _STOPWORDS:
            terms.add(token)
            if token.endswith("s") and len(token) > 3:
                terms.add(token[:-1])
    return terms


def hit_matches_query(hit: dict[str, Any], query: str) -> bool:
    terms = query_terms(query) - budget_tokens(query)
    if not terms:
        return True
    blob = " ".join(
        str(hit.get(key) or "")
        for key in ("title", "brand", "category", "document", "slug", "reason")
    ).lower()
    return any(term in blob for term in terms)


def _to_hit(product: dict[str, Any]) -> dict[str, Any]:
    images = product.get("images") or []
    image = None
    if images and isinstance(images[0], dict):
        image = images[0].get("url")
    elif images and isinstance(images[0], str):
        image = images[0]
    category = product.get("category")
    category_slug = category.get("slug") if isinstance(category, dict) else category
    title = str(product.get("title") or "")
    return {
        "id": product.get("id"),
        "slug": product.get("slug"),
        "title": title,
        "brand": product.get("brand"),
        "category": category_slug,
        "document": f"{title} {product.get('brand') or ''} {product.get('description') or ''}",
        "price_paise": int(product.get("price") or 0),
        "in_stock": int(product.get("stock") or 0) > 0,
        "image": image or product.get("imageUrl"),
        "stock": int(product.get("stock") or 0),
        "score": 1.0,
    }


def search_express_products(
    query: str,
    filters: ProductFilters | dict[str, Any] | None = None,
    limit: int = 8,
) -> list[dict[str, Any]]:
    data = filters.model_dump(exclude_none=True) if isinstance(filters, ProductFilters) else dict(filters or {})
    if str(data.get("brand") or "").strip().lower() in _IGNORED_BRANDS:
        data.pop("brand", None)
    text = " ".join(search_tokens(query, data.get("category")))
    has_filter = any(
        data.get(key) is not None
        for key in ("category", "brand", "min_price_paise", "max_price_paise", "in_stock")
    )
    if not text and not has_filter:
        return []
    params: dict[str, Any] = {
        "limit": limit,
        "sort": "relevance",
    }
    if text:
        params["q"] = text
    if data.get("category"):
        params["category"] = data["category"]
    if data.get("brand"):
        params["brand"] = data["brand"]
    if data.get("min_price_paise") is not None:
        params["minPrice"] = int(data["min_price_paise"])
    if data.get("max_price_paise") is not None:
        params["maxPrice"] = int(data["max_price_paise"])
    if data.get("in_stock") is True:
        params["inStock"] = "true"

    url = f"{str(settings.express_base_url).rstrip('/')}/api/products"

    def load(search_params: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url, params=search_params)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError:
            return []
        rows = payload.get("data") if isinstance(payload, dict) else []
        if not isinstance(rows, list):
            return []
        return [_to_hit(row) for row in rows if isinstance(row, dict) and row.get("slug")]

    hits = load(params)
    if not hits and text and has_filter:
        narrowed = {key: value for key, value in params.items() if key != "q"}
        hits = load(narrowed)
    return hits


def merge_product_hits(
    query: str,
    faiss_hits: list[dict[str, Any]],
    express_hits: list[dict[str, Any]],
    limit: int,
) -> list[dict[str, Any]]:
    relevant_express = [hit for hit in express_hits if hit_matches_query(hit, query)]
    relevant_faiss = [hit for hit in faiss_hits if hit_matches_query(hit, query)]
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for hit in relevant_express + relevant_faiss:
        slug = str(hit.get("slug") or "")
        if not slug or slug in seen:
            continue
        seen.add(slug)
        merged.append(hit)
        if len(merged) >= limit:
            break
    return merged


__all__ = [
    "hit_matches_query",
    "merge_product_hits",
    "query_terms",
    "search_express_products",
    "search_tokens",
]
