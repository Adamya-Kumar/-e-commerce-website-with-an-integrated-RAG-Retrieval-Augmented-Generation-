from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Intent = Literal[
    "product_search",
    "product_question",
    "compare",
    "policy",
    "cart_action",
    "order_action",
    "chitchat",
]


class ProductFilters(BaseModel):
    category: str | None = None
    brand: str | None = None
    min_price_paise: int | None = None
    max_price_paise: int | None = None
    in_stock: bool | None = None


class QueryAnalysis(BaseModel):
    intent: Intent
    standalone_query: str = Field(min_length=1)
    filters: ProductFilters = Field(default_factory=ProductFilters)
    needs_retrieval: bool = True


class RerankScores(BaseModel):
    scores: list[float]


__all__ = ["Intent", "ProductFilters", "QueryAnalysis", "RerankScores"]
