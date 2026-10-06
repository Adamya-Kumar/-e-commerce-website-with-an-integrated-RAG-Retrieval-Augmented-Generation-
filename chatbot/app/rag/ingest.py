from __future__ import annotations

import argparse
import hmac
import json
import re
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Any, Iterable

import faiss
import httpx
import numpy as np
from fastapi import HTTPException, Request
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from app.config import settings

POLICY_FILES = (
    "shipping.md",
    "returns.md",
    "cod.md",
    "faq.md",
    "contact.md",
)


def _connect_database() -> sqlite3.Connection:
    data_dir = Path(settings.faiss_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(data_dir / "documents.sqlite3")
    connection.row_factory = sqlite3.Row
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            vector_id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection TEXT NOT NULL,
            id TEXT NOT NULL,
            document TEXT NOT NULL,
            metadata TEXT NOT NULL,
            embedding BLOB NOT NULL,
            UNIQUE (collection, id)
        )
        """
    )
    connection.commit()
    return connection


def get_collection_rows(name: str) -> list[dict[str, Any]]:
    with closing(_connect_database()) as connection:
        rows = connection.execute(
            "SELECT vector_id, id, document, metadata FROM documents WHERE collection = ? ORDER BY vector_id",
            (name,),
        ).fetchall()
    return [
        {
            "vector_id": row["vector_id"],
            "id": row["id"],
            "document": row["document"],
            "metadata": json.loads(row["metadata"]),
        }
        for row in rows
    ]


def get_collection_records(name: str) -> list[dict[str, Any]]:
    rows = get_collection_rows(name)
    return [{"id": row["id"], "document": row["document"], "metadata": row["metadata"]} for row in rows]


def get_faiss_index(name: str) -> Any | None:
    index_path = Path(settings.faiss_dir) / f"{name}.faiss"
    if not index_path.exists():
        return None
    return faiss.read_index(str(index_path))


def _rebuild_faiss_index(name: str) -> None:
    with closing(_connect_database()) as connection:
        rows = connection.execute(
            "SELECT vector_id, embedding FROM documents WHERE collection = ? ORDER BY vector_id",
            (name,),
        ).fetchall()

    index_path = Path(settings.faiss_dir) / f"{name}.faiss"
    if not rows:
        index_path.unlink(missing_ok=True)
        return

    vectors = [np.frombuffer(row["embedding"], dtype=np.float32) for row in rows]
    dimension = vectors[0].size
    if any(vector.size != dimension for vector in vectors):
        raise ValueError(f"Embeddings in the {name} collection have different dimensions.")

    matrix = np.vstack(vectors).astype(np.float32, copy=False)
    faiss.normalize_L2(matrix)
    index = faiss.IndexIDMap2(faiss.IndexFlatIP(dimension))
    index.add_with_ids(matrix, np.asarray([row["vector_id"] for row in rows], dtype=np.int64))
    faiss.write_index(index, str(index_path))


def _upsert_documents(
    table_name: str,
    documents: list[dict[str, Any]],
    embeddings: list[list[float]],
) -> None:
    rows = [
        (
            table_name,
            document["id"],
            document["document"],
            json.dumps(document["metadata"], sort_keys=True),
            np.asarray(embedding, dtype=np.float32).tobytes(),
        )
        for document, embedding in zip(documents, embeddings, strict=True)
    ]
    with closing(_connect_database()) as connection:
        with connection:
            connection.executemany(
                """
                INSERT INTO documents (collection, id, document, metadata, embedding)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (collection, id) DO UPDATE SET
                    document = excluded.document,
                    metadata = excluded.metadata,
                    embedding = excluded.embedding
                """,
                rows,
            )
    _rebuild_faiss_index(table_name)


def _delete_documents(collection: str, ids: list[str]) -> None:
    if not ids:
        return
    placeholders = ", ".join("?" for _ in ids)
    with closing(_connect_database()) as connection:
        with connection:
            connection.execute(
                f"DELETE FROM documents WHERE collection = ? AND id IN ({placeholders})",
                (collection, *ids),
            )
    _rebuild_faiss_index(collection)


def require_embedding_model() -> GoogleGenerativeAIEmbeddings:
    if not settings.google_api_key or not settings.gemini_embed_model:
        raise RuntimeError(
            "Gemini embedding settings are missing. Set GOOGLE_API_KEY and GEMINI_EMBED_MODEL."
        )

    return GoogleGenerativeAIEmbeddings(
        model=settings.gemini_embed_model,
        google_api_key=settings.google_api_key,
    )


def validate_service_key(request: Request) -> None:
    expected = settings.service_key
    actual = request.headers.get("X-Service-Key")

    if not expected:
        raise HTTPException(status_code=500, detail="Service key is not configured.")

    if not actual or not hmac.compare_digest(actual, expected):
        raise HTTPException(status_code=401, detail="Invalid service key.")


def _normalize_product_id(product: dict[str, Any]) -> str:
    for key in ("id", "_id", "slug", "title", "name"):
        value = product.get(key)
        if value is not None:
            return str(value)
    raised = json.dumps(product, default=str, sort_keys=True)
    return f"product:{abs(hash(raised))}"


def build_product_document(product: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(product, dict):
        raise ValueError("Product payload must be a dictionary.")

    product_id = _normalize_product_id(product)
    title = str(product.get("title") or "Untitled product")
    category = str(product.get("category") or product.get("categoryName") or "uncategorized")
    brand = str(product.get("brand") or "Unknown brand")
    description = str(product.get("description") or "")
    tags = product.get("tags") or []
    attributes = product.get("attributes") or {}

    if isinstance(attributes, dict):
        attribute_text = "; ".join(f"{key}: {value}" for key, value in attributes.items())
    else:
        attribute_text = str(attributes)

    payload_parts = [
        title,
        description,
        f"Brand: {brand}",
        f"Category: {category}",
        f"Tags: {', '.join(str(tag) for tag in tags) if tags else 'none'}",
        attribute_text,
    ]
    document = "\n".join(part for part in payload_parts if part)
    price_paise = int(product.get("price") or 0)
    stock = int(product.get("stock") or 0)

    metadata = {
        "type": "product",
        "product_id": product_id,
        "slug": str(product.get("slug") or product_id),
        "category": category,
        "brand": brand,
        "price_paise": price_paise,
        "in_stock": stock > 0,
    }

    return {"id": product_id, "document": document, "metadata": metadata}


def _chunk_policy_text(
    title: str,
    text: str,
    chunk_size: int = 1000,
    overlap: int = 180,
) -> list[str]:
    blocks = [block.strip() for block in re.split(r"\n\s*\n+", text.strip()) if block.strip()]
    if not blocks:
        return [title]

    chunks: list[str] = []
    current = ""

    for block in blocks:
        if len(current) + len(block) < chunk_size:
            current = f"{current}\n\n{block}".strip()
            continue

        if current:
            chunks.append(current.strip())
            current = block[:overlap] + "\n\n" + block[overlap:]
        else:
            current = block

    if current:
        chunks.append(current.strip())

    final_chunks: list[str] = []
    for chunk in chunks:
        if not chunk:
            continue
        final_chunks.append(f"{title}\n\n{chunk}")

    return final_chunks or [f"{title}\n\n{text.strip()}"]


def build_policy_documents() -> list[dict[str, Any]]:
    collection: list[dict[str, Any]] = []
    knowledge_dir = Path(__file__).resolve().parents[2] / "knowledge"

    for filename in POLICY_FILES:
        file_path = knowledge_dir / filename
        if not file_path.exists():
            continue

        title = filename.rsplit(".", 1)[0].replace("-", " ").title()
        content = file_path.read_text(encoding="utf-8")
        for index, chunk in enumerate(_chunk_policy_text(title, content)):
            collection.append(
                {
                    "id": f"policy:{filename}:{index}",
                    "document": chunk,
                    "metadata": {"type": "policy", "source": filename},
                }
            )

    return collection


def _embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    model = require_embedding_model()
    if len(texts) == 1:
        embedded = model.embed_query(texts[0])
        return [embedded]
    return model.embed_documents(texts)


def ingest_product_documents(products: Iterable[dict[str, Any]]) -> dict[str, Any]:
    product_list = list(products)
    if not product_list:
        return {"count": 0, "deleted": 0}

    documents = [build_product_document(product) for product in product_list]
    current_ids = {doc["id"] for doc in documents}

    existing_ids = {
        str(row["metadata"].get("product_id") or row["id"])
        for row in get_collection_records("products")
        if row.get("metadata", {}).get("type") == "product"
    }
    stale_ids = sorted(existing_ids - current_ids)
    if stale_ids:
        _delete_documents("products", stale_ids)

    embeddings = _embed_texts([doc["document"] for doc in documents])
    _upsert_documents("products", documents, embeddings)

    return {"count": len(documents), "deleted": len(stale_ids)}


def ingest_policy_documents() -> dict[str, Any]:
    documents = build_policy_documents()
    if not documents:
        return {"count": 0}

    embeddings = _embed_texts([doc["document"] for doc in documents])
    _upsert_documents("policies", documents, embeddings)
    return {"count": len(documents)}


def fetch_exported_products(limit: int = 100) -> list[dict[str, Any]]:
    export_url = f"{str(settings.express_base_url).rstrip('/')}/api/internal/products/export"
    headers = {}
    if settings.service_key:
        headers["X-Service-Key"] = settings.service_key

    rows: list[dict[str, Any]] = []
    cursor: str | None = None

    while True:
        params: dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor

        response = httpx.get(export_url, params=params, headers=headers, timeout=30.0)
        response.raise_for_status()
        payload = response.json()
        batch = payload.get("data") or payload.get("products") or []
        if not isinstance(batch, list):
            break

        rows.extend(batch)
        has_more = bool(payload.get("hasMore") or payload.get("meta", {}).get("hasMore"))
        next_cursor = (
            payload.get("nextCursor")
            or payload.get("cursor")
            or payload.get("meta", {}).get("nextCursor")
        )
        if not has_more or not next_cursor:
            break
        cursor = str(next_cursor)

    return rows


def ingest_product(product: dict[str, Any], action: str | None = None) -> dict[str, Any]:
    if product is None:
        raise HTTPException(status_code=400, detail="Product payload is required.")

    action_name = (action or "").lower()
    product_id = _normalize_product_id(product)
    if (
        action_name == "delete"
        or product.get("deleted") is True
        or product.get("isActive") is False
    ):
        _delete_documents("products", [product_id])
        return {"status": "deleted", "product_id": product_id}

    details = build_product_document(product)
    embeddings = _embed_texts([details["document"]])
    _upsert_documents("products", [details], embeddings)
    return {"status": "upserted", "product_id": product_id}


def ingest_full(limit: int = 100) -> dict[str, Any]:
    products = fetch_exported_products(limit=limit)
    product_summary = ingest_product_documents(products)
    policy_summary = ingest_policy_documents()
    return {
        "status": "ok",
        "products": product_summary["count"],
        "policies": policy_summary["count"],
        "deleted": product_summary["deleted"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest Spark Commerce products and policy docs into FAISS."
    )
    parser.add_argument(
        "--full", action="store_true", help="Fetch the export endpoint and reindex everything."
    )
    parser.add_argument("--limit", type=int, default=100, help="Page size for product export.")
    args = parser.parse_args()

    if args.full:
        result = ingest_full(limit=args.limit)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
