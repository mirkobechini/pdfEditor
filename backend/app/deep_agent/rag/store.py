"""RAG — T2b: vector store Chroma persistito + retrieval con citazioni.

Usiamo Chroma persistente (locale, nessun servizio esterno — offline-first).
Embedding: di default l'aturan embedding locale di Chroma (all-MiniLM-L6-v2,
onnxruntime, gira senza rete); chi ha un provider LLM configurato può passare
una funzione embedding personalizzata in futuro (T1 multi-provider).

Ogni chunk viene salvato con metadati source + page + index, così il retrieval
può citare il documento di provenienza (esigenza "RAG risponde citando i file").
"""

from __future__ import annotations

import os
from pathlib import Path

import chromadb

from app.deep_agent.rag.indexer import Chunk, _workspace

INDEX_COLLECTION = "pdf_workspace"
PERSIST_DIR = ".mind_chroma"


def _client() -> chromadb.ClientAPI:
    persist = _workspace() / PERSIST_DIR
    persist.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(persist))


def _coll(client: chromadb.ClientAPI):
    return client.get_or_create_collection(
        INDEX_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )


def index_chunks(chunks: list[Chunk], client: chromadb.ClientAPI | None = None) -> int:
    """Carica i chunk nel collection Chroma, salvando metadati source/page/index."""
    c = _coll(client or _client())
    # upsert: sostituisce per id (source#index)
    ids = [f"{ch.source}#{ch.index}" for ch in chunks]
    docs = [ch.text for ch in chunks]
    metas = [{"source": ch.source, "page": ch.page, "index": ch.index} for ch in chunks]
    c.upsert(ids=ids, documents=docs, metadatas=metas)
    return len(chunks)


def search(query: str, k: int = 5, client: chromadb.ClientAPI | None = None) -> list[dict]:
    """Cerca i k chunk più rilevanti e li restituisce con source/pagina (citazioni)."""
    c = _coll(client or _client())
    res = c.query(query_texts=[query], n_results=k, include=["documents", "metadatas", "distances"])
    out: list[dict] = []
    ids = (res.get("ids") or [[]])[0]
    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]
    for i in range(len(docs or [])):
        out.append(
            {
                "id": ids[i] if i < len(ids) else "",
                "text": docs[i],
                "source": (metas[i] or {}).get("source") if i < len(metas) else None,
                "page": (metas[i] or {}).get("page") if i < len(metas) else None,
                "score": 1.0 - (dists[i] if i < len(dists) else 0.0),
            }
        )
    return out


def count(client: chromadb.ClientAPI | None = None) -> int:
    """Numero di documenti indicizzati (chunk)."""
    c = _coll(client or _client())
    return c.count()
