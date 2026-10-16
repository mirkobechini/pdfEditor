"""Workspace file system — ADR Decisione 3: fase 1 solo lettura documenti, scrittura SOLO in output/.

T-B (16/10): se la workspace non è configurata (env/config/prefs vuoti), i tool
rispondono "workspace non configurata" — mai più cartella fittizia.
"""

from pathlib import Path

from app.deep_agent.config import resolve_workspace


def _root() -> Path | None:
    """Ritorna la root del workspace, o None se non configurata."""
    ws = resolve_workspace()
    return Path(ws) if ws else None


def _in_root(p: Path, root: Path) -> bool:
    try:
        p.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def elenca_workspace() -> str:
    """Elenca i file del workspace (sola lettura)."""
    r = _root()
    if r is None:
        return "workspace non configurata"
    if not r.is_dir():
        return "workspace non trovata"
    rows = [str(f.relative_to(r)) for f in sorted(r.rglob("*")) if f.is_file()]
    return "\n".join(rows) if rows else "workspace vuoto"


def leggi_workspace(rel: str) -> str:
    """Legge un file di testo dal workspace in sola lettura (path relativo)."""
    r = _root()
    if r is None:
        return "workspace non configurata"
    f = (r / rel).resolve()
    if not _in_root(f, r) or not f.is_file():
        return "file non consentito o inesistente"
    return f.read_text(errors="ignore")[:8000]


def scrivi_output(nome: str, contenuto: str) -> str:
    """Scrive un file SOLO nella cartella output/ del workspace."""
    r = _root()
    if r is None:
        return "scrittura non consentita: workspace non configurata"
    f = (r / "output" / nome).resolve()
    if not _in_root(f, r) or f.parent != (r / "output").resolve():
        return "scrittura non consentita: solo in output/"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(contenuto)
    return f"scritto: {f.relative_to(r)}"
