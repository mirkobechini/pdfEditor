"""RAG — T2a: ingest + chunking dei documenti della workspace.

Niente vector store in questa tranche. Leggiamo i PDF/text della workspace,
li spezziamo in chunk (con overlap) e salviamo i chunk su disco come JSON
in una cartella `.mind_index/` accanto alla workspace. Operazione di SOLA
lettura sui file originali: non li modifichiamo mai.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

try:
    import fitz  # PyMuPDF
except Exception:  # noqa: BLE001
    fitz = None  # type: ignore

from app.deep_agent.config import resolve_workspace

INDEX_DIR = ".mind_index"


class Chunk:
    """Un singolo chunk testuale con metadati di provenienza."""

    def __init__(self, text: str, source: str, page: int | None, index: int):
        self.text = text
        self.source = source
        self.page = page
        self.index = index

    def to_dict(self) -> dict:
        return {"text": self.text, "source": self.source, "page": self.page, "index": self.index}


def _workspace() -> Path:
    return Path(resolve_workspace() or ".")


def _workspace_missing() -> bool:
    """True se la workspace non è configurata."""
    return not resolve_workspace()


def extract_text(path: Path) -> str:
    """Estrae il testo da un PDF (PyMuPDF) o da un file di testo."""
    if path.suffix.lower() == ".pdf":
        if fitz is None:
            from pypdf import PdfReader

            r = PdfReader(str(path))
            return "\n".join((pg.extract_text() or "") for pg in r.pages)
        doc = fitz.open(path)
        try:
            return "\n".join(page.get_text() for page in doc)
        finally:
            doc.close()
    return path.read_text(encoding="utf-8", errors="replace")


def chunk_text(text: str, chunk_size: int = 1200, overlap: int = 150) -> list[str]:
    """Spezza un testo in chunk approssimati per dimensione, con overlap tra chunk."""
    if not text.strip():
        return []
    words = text.split()
    if len(words) <= chunk_size:
        return [text]
    out: list[str] = []
    i = 0
    while i < len(words):
        window = words[i : i + chunk_size]
        out.append(" ".join(window))
        i += chunk_size - overlap
    return out


def ingest_file(path: Path, chunk_size: int = 1200, overlap: int = 150) -> list[Chunk]:
    """Estrae e spezza un singolo file in chunk con metadati."""
    text = extract_text(path)
    rel = str(path.relative_to(_workspace())) if path.is_relative_to(_workspace()) else path.name
    chunks = chunk_text(text, chunk_size, overlap)
    return [
        Chunk(text=c, source=rel, page=None, index=n) for n, c in enumerate(chunks)
    ]


def ingest_workspace(chunk_size: int = 1200, overlap: int = 150) -> list[Chunk]:
    """Indicizza tutti i PDF/text della workspace (non ricorsivo, solo root)."""
    if _workspace_missing():
        return []
    ws = _workspace()
    if not ws.is_dir():
        return []
    chunks: list[Chunk] = []
    for f in sorted(ws.iterdir()):
        if f.is_file() and f.suffix.lower() in {".pdf", ".txt", ".md"}:
            chunks.extend(ingest_file(f, chunk_size, overlap))
    return chunks


def save_index(chunks: list[Chunk], index_dir: Path | None = None) -> Path:
    """Salva i chunk su disco come JSON (senza toccare i file originali)."""
    target = index_dir or (_workspace() / INDEX_DIR)
    target.mkdir(parents=True, exist_ok=True)
    out = target / "chunks.json"
    out.write_text(json.dumps([c.to_dict() for c in chunks], ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def load_index(index_dir: Path | None = None) -> list[Chunk]:
    """Ricarica i chunk dall'indice su disco."""
    target = index_dir or (_workspace() / INDEX_DIR)
    fp = target / "chunks.json"
    if not fp.exists():
        return []
    data = json.loads(fp.read_text(encoding="utf-8"))
    return [Chunk(**d) for d in data]
