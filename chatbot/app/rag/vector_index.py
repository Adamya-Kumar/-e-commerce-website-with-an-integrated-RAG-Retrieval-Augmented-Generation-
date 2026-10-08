from __future__ import annotations

from pathlib import Path

import numpy as np


class NumpyVectorIndex:
    """Inner-product index with the small FAISS surface this app uses."""

    def __init__(self, matrix: np.ndarray, ids: np.ndarray) -> None:
        self.matrix = np.asarray(matrix, dtype=np.float32)
        self.ids = np.asarray(ids, dtype=np.int64)
        self.ntotal = int(self.ids.shape[0])

    def search(self, query: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
        vectors = np.asarray(query, dtype=np.float32)
        if vectors.ndim == 1:
            vectors = vectors.reshape(1, -1)
        if self.ntotal == 0 or k <= 0:
            empty_scores = np.zeros((vectors.shape[0], 0), dtype=np.float32)
            empty_ids = np.zeros((vectors.shape[0], 0), dtype=np.int64)
            return empty_scores, empty_ids

        take = min(int(k), self.ntotal)
        scores = vectors @ self.matrix.T
        if take == self.ntotal:
            order = np.argsort(-scores, axis=1)
        else:
            partial = np.argpartition(-scores, kth=take - 1, axis=1)[:, :take]
            row = np.arange(scores.shape[0])[:, None]
            rank = np.argsort(-scores[row, partial], axis=1)
            order = partial[row, rank]
        chosen = order[:, :take]
        row = np.arange(scores.shape[0])[:, None]
        return scores[row, chosen].astype(np.float32), self.ids[chosen]


def normalize_l2(matrix: np.ndarray) -> None:
    vectors = np.asarray(matrix, dtype=np.float32)
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors /= norms


def save_index(path: Path, matrix: np.ndarray, ids: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(path, matrix=np.asarray(matrix, dtype=np.float32), ids=np.asarray(ids, dtype=np.int64))


def load_index(path: Path) -> NumpyVectorIndex | None:
    if not path.exists():
        return None
    with np.load(path) as payload:
        return NumpyVectorIndex(payload["matrix"], payload["ids"])
