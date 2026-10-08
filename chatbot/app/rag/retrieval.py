from __future__ import annotations

import re
from typing import Any

import numpy as np

from app.config import settings
from app.rag.ingest import (
    build_policy_documents,
    get_collection_rows,
    get_faiss_index,
    require_embedding_model,
)
from app.rag.vector_index import normalize_l2
from app.rag.schemas import ProductFilters


def _token_overlap(query: str, document: str) -> int:
    tokens = {token for token in re.findall(r"[a-z0-9]+", query.lower()) if len(token) > 1}
    if not tokens:
        return 0
    content = document.lower()
    return sum(1 for token in tokens if token in content)


def _filters_dict(filters: ProductFilters | dict[str, Any] | None) -> dict[str, Any]:
    if filters is None:
        return {}
    if isinstance(filters, ProductFilters):
        return filters.model_dump(exclude_none=True)
    return {key: value for key, value in filters.items() if value is not None}


def row_matches_filters(row: dict[str, Any], filters: dict[str, Any]) -> bool:
    metadata = row.get("metadata") or {}

    category = str(filters.get("category") or "").strip().lower()
    if category:
        row_category = str(metadata.get("category") or "").lower()
        if row_category and category not in row_category and row_category not in category:
            return False

    brand = str(filters.get("brand") or "").strip().lower()
    if brand:
        row_brand = str(metadata.get("brand") or "").lower()
        if row_brand and brand not in row_brand and row_brand not in brand:
            return False

    if filters.get("min_price_paise") is not None:
        if int(metadata.get("price_paise") or 0) < int(filters["min_price_paise"]):
            return False

    if filters.get("max_price_paise") is not None:
        if int(metadata.get("price_paise") or 0) > int(filters["max_price_paise"]):
            return False

    if "in_stock" in filters and filters["in_stock"] is not None:
        if bool(metadata.get("in_stock")) != bool(filters["in_stock"]):
            return False

    return True


def _to_product_hit(row: dict[str, Any], score: float) -> dict[str, Any]:
    metadata = row.get("metadata") or {}
    title_line = (row.get("document") or "").splitlines()[0] if row.get("document") else ""
    return {
        "id": row.get("id"),
        "slug": metadata.get("slug") or row.get("id"),
        "title": metadata.get("title") or title_line,
        "brand": metadata.get("brand"),
        "category": metadata.get("category"),
        "document": row.get("document") or "",
        "price_paise": int(metadata.get("price_paise") or 0),
        "in_stock": bool(metadata.get("in_stock")),
        "score": float(score),
    }


def _embed_query(query: str) -> np.ndarray:
    model = require_embedding_model()
    vector = np.asarray(model.embed_query(query), dtype=np.float32).reshape(1, -1)
    normalize_l2(vector)
    return vector


def _search_collection(
    collection: str,
    query: str,
    k: int,
    filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    rows = get_collection_rows(collection)
    if not rows:
        return []

    active_filters = filters or {}
    try:
        vector = _embed_query(query)
        index = get_faiss_index(collection)
        if index is None:
            raise RuntimeError("FAISS index is not available.")
        search_k = min(max(k * 4, k), len(rows))
        similarities, vector_ids = index.search(vector, search_k)
        by_vector_id = {int(row["vector_id"]): row for row in rows}
        matches: list[dict[str, Any]] = []
        for similarity, vector_id in zip(similarities[0], vector_ids[0], strict=True):
            if int(vector_id) == -1:
                continue
            row = by_vector_id.get(int(vector_id))
            if row is None or not row_matches_filters(row, active_filters):
                continue
            matches.append(_to_product_hit(row, float(similarity)))
            if len(matches) >= k:
                break
        return matches
    except Exception:
        ranked: list[dict[str, Any]] = []
        for row in rows:
            if not row_matches_filters(row, active_filters):
                continue
            score = _token_overlap(query, row.get("document") or "")
            if score <= 0:
                continue
            ranked.append(_to_product_hit(row, float(score)))
        ranked.sort(key=lambda item: item["score"], reverse=True)
        return ranked[:k]


def retrieve_products(
    query: str,
    filters: ProductFilters | dict[str, Any] | None = None,
    k: int | None = None,
) -> list[dict[str, Any]]:
    query_text = (query or "").strip()
    if not query_text:
        return []
    limit = k if k is not None else settings.retrieve_k
    return _search_collection("products", query_text, limit, _filters_dict(filters))


def retrieve_policies(query: str, k: int = 8) -> list[dict[str, Any]]:
    query_text = (query or "").strip()
    if not query_text:
        return []
    ranked: list[dict[str, Any]] = []
    for row in build_policy_documents():
        source = str((row.get("metadata") or {}).get("source") or "")
        source_label = source.replace(".md", "").replace("-", " ")
        document = row.get("document") or ""
        score = _token_overlap(query_text, f"{source_label} {document}")
        if any(token in source_label for token in re.findall(r"[a-z0-9]+", query_text.lower()) if len(token) > 2):
            score += 5
        if score <= 0:
            continue
        ranked.append(
            {
                "id": row.get("id"),
                "document": document,
                "metadata": row.get("metadata") or {},
                "score": float(score),
            }
        )
    ranked.sort(key=lambda item: item["score"], reverse=True)
    if ranked:
        return ranked[:k]
    hits = _search_collection("policies", query_text, k)
    return [
        {
            "id": item.get("id"),
            "document": item.get("document"),
            "metadata": {
                "category": item.get("category"),
                "slug": item.get("slug"),
            },
            "score": item.get("score"),
        }
        for item in hits
    ]


__all__ = ["retrieve_policies", "retrieve_products", "row_matches_filters"]
