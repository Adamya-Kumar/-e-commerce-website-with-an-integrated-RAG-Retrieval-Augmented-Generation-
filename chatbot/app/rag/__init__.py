"""RAG ingestion utilities for the Spark Commerce chatbot."""

from app.rag.ingest import (
    fetch_exported_products,
    ingest_full,
    ingest_policy_documents,
    ingest_product_documents,
)

__all__ = [
    "fetch_exported_products",
    "ingest_full",
    "ingest_policy_documents",
    "ingest_product_documents",
]
