"""Incident Memory — FAISS-based RAG for storing and retrieving past diagnoses."""

import os
import json
import numpy as np
from datetime import datetime

MEMORY_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "memory")
INDEX_PATH = os.path.join(MEMORY_DIR, "faiss.index")
DOCS_PATH = os.path.join(MEMORY_DIR, "documents.json")

# Lazy-loaded globals
_index = None
_documents = []
_embedder = None


def _get_embedder():
    """Lazy-load the sentence transformer model."""
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def _ensure_dir():
    os.makedirs(MEMORY_DIR, exist_ok=True)


def _load_index():
    """Load or create the FAISS index."""
    global _index, _documents
    import faiss

    _ensure_dir()

    if os.path.exists(INDEX_PATH) and os.path.exists(DOCS_PATH):
        _index = faiss.read_index(INDEX_PATH)
        with open(DOCS_PATH, "r") as f:
            _documents = json.load(f)
    else:
        # 384 = dimension of all-MiniLM-L6-v2
        _index = faiss.IndexFlatIP(384)
        _documents = []


def _save_index():
    import faiss
    _ensure_dir()
    faiss.write_index(_index, INDEX_PATH)
    with open(DOCS_PATH, "w") as f:
        json.dump(_documents, f, indent=2)


def search_similar(query: str, top_k: int = 3) -> list[dict]:
    """Search for similar past incidents."""
    global _index, _documents
    if _index is None:
        _load_index()

    if _index.ntotal == 0:
        return []

    embedder = _get_embedder()
    query_vec = embedder.encode([query], normalize_embeddings=True)
    scores, indices = _index.search(np.array(query_vec, dtype="float32"), min(top_k, _index.ntotal))

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx >= 0 and score > 0.3:  # Relevance threshold
            doc = _documents[idx].copy()
            doc["similarity"] = float(score)
            results.append(doc)
    return results


def store_incident(input_text: str, diagnosis: dict):
    """Store a completed diagnosis in memory for future retrieval."""
    global _index, _documents
    if _index is None:
        _load_index()

    # Build a rich text representation for embedding
    verdict = diagnosis.get("verdict", {})
    text = f"""Problem: {input_text[:500]}
Root Cause: {verdict.get('winning_hypothesis', 'unknown')}
Reasoning: {verdict.get('reasoning', '')}
Confidence: {verdict.get('overall_confidence', 0)}"""

    embedder = _get_embedder()
    vec = embedder.encode([text], normalize_embeddings=True)

    _index.add(np.array(vec, dtype="float32"))
    _documents.append({
        "input_summary": input_text[:300],
        "diagnosis": diagnosis,
        "timestamp": datetime.now().isoformat(),
    })
    _save_index()


def get_recent_incidents(limit: int = 10) -> list[dict]:
    """Return the most recently stored incidents (newest first), trimmed for the UI."""
    global _documents
    if _index is None:
        _load_index()

    recent = list(reversed(_documents))[:limit]
    out = []
    for doc in recent:
        diag = doc.get("diagnosis", {})
        verdict = diag.get("verdict", {})
        out.append({
            "input_summary": doc.get("input_summary", ""),
            "timestamp": doc.get("timestamp", ""),
            "title": diag.get("title", "") or (diag.get("winning_hypothesis", {}) or {}).get("title", ""),
            "severity": diag.get("severity", ""),
            "tags": diag.get("tags", []),
            "confidence": verdict.get("overall_confidence", 0),
            "root_cause": verdict.get("winning_hypothesis", ""),
        })
    return out


def get_memory_stats() -> dict:
    """Return basic stats about incident memory."""
    global _index
    if _index is None:
        _load_index()
    return {
        "total_incidents": _index.ntotal,
        "memory_dir": MEMORY_DIR,
    }
