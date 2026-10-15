"""T2a — RAG ingest + chunking della workspace (senza vector store).

Verifichiamo: estrazione testo, chunking con overlap, ingest di una workspace
di prova, salvataggio/ricarica dell'indice JSON senza toccare i file originali.
"""

import json
from pathlib import Path

from app.deep_agent.rag import indexer


def test_chunk_text_short_text_no_split() -> None:
    assert indexer.chunk_text("ciao mondo") == ["ciao mondo"]


def test_chunk_text_long_splits_with_overlap() -> None:
    text = " ".join(f"parola{i}" for i in range(100))
    chunks = indexer.chunk_text(text, chunk_size=30, overlap=5)
    assert len(chunks) > 1
    # l'overlap produce chunk sovrapposti (controlliamo che due chunk condividano testo)
    tokens0 = set(chunks[0].split())
    tokens1 = set(chunks[1].split())
    assert tokens0 & tokens1


def test_chunk_text_empty() -> None:
    assert indexer.chunk_text("   ") == []


def test_extract_text_txt(tmp_path) -> None:
    f = tmp_path / "nota.txt"
    f.write_text("riga uno\nriga due", encoding="utf-8")
    assert "riga uno" in indexer.extract_text(f)


def test_ingest_file_keeps_source_and_index(tmp_path) -> None:
    f = tmp_path / "doc.md"
    f.write_text("contenuto di prova per il chunking" * 20, encoding="utf-8")
    chunks = indexer.ingest_file(f, chunk_size=20, overlap=3)
    assert chunks
    assert chunks[0].source == "doc.md"
    assert chunks[0].index == 0
    assert all(c.index == n for n, c in enumerate(chunks))


def test_ingest_and_save_load_workspace(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path))
    (tmp_path / "a.txt").write_text(("parola " * 500), encoding="utf-8")
    (tmp_path / "b.md").write_text(("altro " * 300), encoding="utf-8")
    # file originale non deve essere modificato
    a_before = (tmp_path / "a.txt").read_text()

    chunks = indexer.ingest_workspace(chunk_size=120, overlap=20)
    assert len(chunks) > 0
    idx_path = indexer.save_index(chunks, index_dir=tmp_path / ".mind_index")
    assert idx_path.exists()

    # verifica JSON valido e che i file originali siano intatti
    data = json.loads(idx_path.read_text(encoding="utf-8"))
    assert data and "text" in data[0]
    assert (tmp_path / "a.txt").read_text() == a_before

    # ricarica
    loaded = indexer.load_index(index_dir=tmp_path / ".mind_index")
    assert len(loaded) == len(chunks)
    assert loaded[0].source


def test_ingest_workspace_missing_dir(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("PDFMIND_WORKSPACE", str(tmp_path / "nonexistent"))
    assert indexer.ingest_workspace() == []


def test_load_index_missing(tmp_path) -> None:
    assert indexer.load_index(index_dir=tmp_path / "nope") == []
