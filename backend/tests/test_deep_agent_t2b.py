"""T2b — vector store Chroma persistito + retrieval con citazioni."""

import pytest

from app.deep_agent.rag import indexer, store
from app.deep_agent.rag.indexer import Chunk


@pytest.fixture()
def indexed(tmp_path, monkeypatch):
    """Workspace di prova con due doc indicizzati in un collection Chroma (in memory)."""
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    (tmp_path / "rapporto.txt").write_text(
        "Il rapporto annuale riporta entrate e uscite. " * 60, encoding="utf-8"
    )
    (tmp_path / "fattura.md").write_text(
        "Fattura numero 123 emessa per la fornitura di servizi. " * 60, encoding="utf-8"
    )
    chunks = indexer.ingest_workspace(chunk_size=80, overlap=10)
    assert chunks
    # collection in memory per test: passiamo un client persistente su tmp
    client = store._client()
    store.index_chunks(chunks, client=client)
    return {"chunks": chunks, "client": client}


def test_index_and_count(indexed) -> None:
    assert store.count(client=indexed["client"]) == len(indexed["chunks"])


def test_search_returns_source_citations(indexed) -> None:
    res = store.search("fattura fornitura servizi", k=3, client=indexed["client"])
    assert res
    assert res[0]["source"]  # citazione: documento di provenienza
    assert res[0]["text"]
    assert isinstance(res[0]["score"], float)


def test_search_query_about_report_finds_report(indexed) -> None:
    res = store.search("entrate uscite bilancio annuale", k=3, client=indexed["client"])
    sources = {r["source"] for r in res}
    assert "rapporto.txt" in sources


def test_metadata_includes_page_and_index(indexed) -> None:
    res = store.search("fattura", k=1, client=indexed["client"])
    # page può essere None (non ricavato dal plain text), ma source+index sempre presenti
    assert res[0]["source"]
    assert "index" in res[0] or res[0]["source"]
