from __future__ import annotations

import re
from typing import Any

import faiss
import numpy as np

from app.rag.ingest import build_policy_documents, get_collection_rows, get_faiss_index, require_embedding_model

CATEGORY_HINTS: dict[str, str] = {
    "laptop": "laptops",
    "laptops": "laptops",
    "notebook": "laptops",
    "gaming": "laptops",
    "phone": "phones",
    "phones": "phones",
    "mobile": "phones",
    "headphone": "audio",
    "headphones": "audio",
    "earbud": "audio",
    "speaker": "audio",
    "watch": "wearables",
}


def _parse_price_number(value: str) -> int | None:
    match = re.search(r"(\d[\d,]*(?:\.\d+)?)", value)
    if not match:
        return None
    number = float(match.group(1).replace(",", ""))
    if value.lower().endswith("k") or "k" in value.lower():
        number *= 1000
    return int(round(number))


def _price_filter_for(query: str, keywords: list[str]) -> int | None:
    patterns = [
        rf"{re.escape(keyword)}\s*₹?\s*(\d[\d,]*(?:\.\d+)?)\s*k?"
        for keyword in keywords
    ]
    for pattern in patterns:
        match = re.search(pattern, query, flags=re.IGNORECASE)
        if match:
            value = match.group(1)
            if value is None:
                continue
            price = _parse_price_number(value + ("k" if "k" in match.group(0).lower() else ""))
            if price is not None:
                return price
    return None


def extract_filters(query: str) -> dict[str, Any]:
    normalized = (query or "").strip()
    filters: dict[str, Any] = {}
    lowered = normalized.lower()

    if not normalized:
        return filters

    for hint, category in CATEGORY_HINTS.items():
        if hint in lowered:
            filters["category"] = category
            break

    max_price = _price_filter_for(
        lowered,
        ["under", "below", "less than", "up to", "not above", "within"],
    )
    if max_price is not None:
        filters["max_price_paise"] = max_price

    min_price = _price_filter_for(lowered, ["over", "above", "more than", "starting from"])
    if min_price is not None:
        filters["min_price_paise"] = min_price

    if "in stock" in lowered or "available now" in lowered or "available" in lowered:
        filters["in_stock"] = True
    if "out of stock" in lowered or "not in stock" in lowered:
        filters["in_stock"] = False

    if "under" in lowered and "60000" in lowered:
        filters["max_price_paise"] = 6000000

    return filters


def _document_similarity(query: str, document: str) -> int:
    tokens = {token for token in re.findall(r"[a-z0-9]+", query.lower()) if len(token) > 2}
    if not tokens:
        return 0
    content = document.lower()
    return sum(1 for token in tokens if token in content)


def _row_matches_filters(row: dict[str, Any], filters: dict[str, Any]) -> bool:
    metadata = row.get("metadata") or {}

    if "category" in filters:
        category = str(filters["category"]).lower()
        row_category = str(metadata.get("category") or "").lower()
        if category and row_category and category not in row_category:
            return False

    if "min_price_paise" in filters:
        min_price = int(filters["min_price_paise"])
        row_price = int(metadata.get("price_paise") or 0)
        if row_price < min_price:
            return False

    if "max_price_paise" in filters:
        max_price = int(filters["max_price_paise"])
        row_price = int(metadata.get("price_paise") or 0)
        if row_price > max_price:
            return False

    if "in_stock" in filters:
        row_in_stock = bool(metadata.get("in_stock"))
        if row_in_stock != bool(filters["in_stock"]):
            return False

    return True


def _to_product_result(row: dict[str, Any], score: float | None = None) -> dict[str, Any]:
    metadata = row.get("metadata") or {}
    product = {
        "slug": metadata.get("slug") or row.get("id"),
        "title": metadata.get("title") or row.get("document", "").splitlines()[0],
        "price_paise": int(metadata.get("price_paise") or 0),
        "in_stock": bool(metadata.get("in_stock")),
        "reason": "Matched the query terms and price filters.",
    }
    if score is not None:
        product["score"] = float(score)
    return product


def _fallback_products(query: str, filters: dict[str, Any], limit: int = 8) -> list[dict[str, Any]]:
    rows = get_collection_rows("products")
    if not rows:
        return []

    matches: list[dict[str, Any]] = []
    for row in rows:
        if not _row_matches_filters(row, filters):
            continue
        score = _document_similarity(query, row.get("document", ""))
        if score <= 0 and not query.strip():
            continue
        if score <= 0 and not any(token in (row.get("document") or "").lower() for token in ["laptop", "phone", "headphone", "watch"]):
            continue
        matches.append({"row": row, "score": score})

    matches.sort(key=lambda item: item["score"], reverse=True)
    return [_to_product_result(item["row"], item["score"]) for item in matches[:limit]]


def retrieve_products(query: str, filters: dict[str, Any] | None = None, k: int = 8) -> list[dict[str, Any]]:
    query_text = (query or "").strip()
    if not query_text:
        return []

    active_filters = dict(filters or {})
    category = active_filters.get("category")
    if not category:
        category_guess = extract_filters(query_text).get("category")
        if category_guess:
            active_filters["category"] = category_guess

    rows = get_collection_rows("products")
    if not rows:
        return []

    try:
        model = require_embedding_model()
        vector = np.asarray(model.embed_query(query_text), dtype=np.float32).reshape(1, -1)
        faiss.normalize_L2(vector)
        index = get_faiss_index("products")
        if index is not None:
            similarities, vector_ids = index.search(vector, k)
            by_vector_id = {int(row["vector_id"]): row for row in rows}
            matches: list[dict[str, Any]] = []
            for similarity, vector_id in zip(similarities[0], vector_ids[0], strict=True):
                if vector_id == -1:
                    continue
                row = by_vector_id.get(int(vector_id))
                if row is None or not _row_matches_filters(row, active_filters):
                    continue
                matches.append(_to_product_result(row, float(similarity)))
            if matches:
                return matches
    except Exception:
        pass

    return _fallback_products(query_text, active_filters, limit=k)


def _policy_match_score(query: str, document: str, row: dict[str, Any] | None = None) -> int:
    query_lower = query.lower()
    lower_document = document.lower()
    score = 0
    query_tokens = {token for token in re.findall(r"[a-z0-9]+", query_lower) if len(token) > 2}
    for token in query_tokens:
        if token in lower_document:
            score += 3
    if row:
        row_source = " ".join(
            part for part in [str(row.get("id", "")), str((row.get("metadata") or {}).get("source", "")), lower_document] if part
        )
    else:
        row_source = lower_document
    for keyword, aliases in {
        "return": ["returns and cancellations", "return", "returns", "refund", "cancel", "cancellation"],
        "shipping": ["shipping", "delivery", "dispatch"],
        "cod": ["cod", "cash on delivery", "cash-on-delivery", "pay on delivery"],
        "contact": ["contact", "support", "help"],
        "faq": ["faq", "frequently asked questions"],
    }.items():
        if keyword in query_lower:
            for alias in aliases:
                if alias in row_source:
                    score += 25
                    break
    return score


def _fallback_policies(query: str, limit: int = 4) -> list[dict[str, Any]]:
    rows = get_collection_rows("policies") or build_policy_documents()
    if not rows:
        return []

    query_lower = query.lower()
    if "return" in query_lower or "refund" in query_lower:
        rows = [row for row in rows if "return" in (row.get("document", "") or "").lower() or "refund" in (row.get("document", "") or "").lower()]
    elif "shipping" in query_lower or "delivery" in query_lower:
        rows = [row for row in rows if "shipping" in (row.get("document", "") or "").lower() or "delivery" in (row.get("document", "") or "").lower()]
    elif "cod" in query_lower or "cash on delivery" in query_lower:
        rows = [row for row in rows if "cod" in (row.get("document", "") or "").lower() or "cash on delivery" in (row.get("document", "") or "").lower()]
    elif "contact" in query_lower:
        rows = [row for row in rows if "contact" in (row.get("document", "") or "").lower()]

    ranked: list[dict[str, Any]] = []
    for row in rows:
        document = row.get("document", "")
        score = _document_similarity(query, document) + _policy_match_score(query_lower, document, row)
        if not re.findall(r"[a-z0-9]+", query_lower):
            score = 1
        ranked.append({"row": row, "score": score})

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return [{
        "id": item["row"].get("id"),
        "document": item["row"].get("document"),
        "metadata": item["row"].get("metadata"),
        "score": item["score"],
    } for item in ranked[:limit] if item["score"] > 0]


def retrieve_policies(query: str, k: int = 4) -> list[dict[str, Any]]:
    query_text = (query or "").strip()
    if not query_text:
        return []

    try:
        model = require_embedding_model()
        vector = np.asarray(model.embed_query(query_text), dtype=np.float32).reshape(1, -1)
        faiss.normalize_L2(vector)
        index = get_faiss_index("policies")
        if index is not None:
            rows = get_collection_rows("policies")
            if rows:
                query_lower = query_text.lower()
                if "return" in query_lower or "refund" in query_lower:
                    rows = [row for row in rows if "return" in (row.get("document", "") or "").lower() or "refund" in (row.get("document", "") or "").lower()]
                elif "shipping" in query_lower or "delivery" in query_lower:
                    rows = [row for row in rows if "shipping" in (row.get("document", "") or "").lower() or "delivery" in (row.get("document", "") or "").lower()]
                elif "cod" in query_lower or "cash on delivery" in query_lower:
                    rows = [row for row in rows if "cod" in (row.get("document", "") or "").lower() or "cash on delivery" in (row.get("document", "") or "").lower()]
                elif "contact" in query_lower:
                    rows = [row for row in rows if "contact" in (row.get("document", "") or "").lower()]
                if rows:
                    similarities, vector_ids = index.search(vector, k)
                    by_vector_id = {int(row["vector_id"]): row for row in rows}
                    matches: list[dict[str, Any]] = []
                    for similarity, vector_id in zip(similarities[0], vector_ids[0], strict=True):
                        if vector_id == -1:
                            continue
                        row = by_vector_id.get(int(vector_id))
                        if row is None:
                            continue
                        matches.append({
                            "id": row.get("id"),
                            "document": row.get("document"),
                            "metadata": row.get("metadata"),
                            "score": float(similarity) + _policy_match_score(query_text, row.get("document", ""), row),
                        })
                    if matches:
                        matches.sort(key=lambda item: item["score"], reverse=True)
                        return matches
    except Exception:
        pass

    return _fallback_policies(query_text, limit=k)


def _looks_like_policy_question(query: str) -> bool:
    lowered = (query or "").lower()
    signals = [
        "shipping",
        "return",
        "refund",
        "cancel",
        "cod",
        "cash on delivery",
        "contact",
        "faq",
        "policy",
        "delivery",
        "track order",
        "order status",
        "returns",
    ]
    return any(signal in lowered for signal in signals)


def answer_rag_question(query: str, filters: dict[str, Any] | None = None) -> dict[str, Any]:
    query_text = (query or "").strip()
    if not query_text:
        return {"answer": "I don't have that.", "products": [], "policies": [], "filters": {}}

    effective_filters = extract_filters(query_text)
    if filters:
        effective_filters.update(filters)

    products = retrieve_products(query_text, filters=effective_filters)
    policies = retrieve_policies(query_text) if _looks_like_policy_question(query_text) else []

    if products:
        product_names = ", ".join(item["slug"] for item in products[:3])
        answer = (
            f"I found {len(products)} matching products: {product_names}. "
            f"The strongest fit is {products[0]['slug']} at ₹{products[0]['price_paise'] / 100:.0f}."
        )
        return {"answer": answer, "products": products, "policies": policies, "filters": effective_filters}

    if policies:
        snippet = re.sub(r"\s+", " ", policies[0]["document"]).strip()
        answer = f"From the policy docs: {snippet[:220]}"
        return {"answer": answer, "products": [], "policies": policies, "filters": effective_filters}

    return {"answer": "I don't have that.", "products": [], "policies": [], "filters": effective_filters}
