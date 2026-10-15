"""Tool famiglia documenti (profilo user + dev). Solo operazioni sui file, mai azioni distruttive."""

import os
import re
from pathlib import Path

from pypdf import PdfReader

from app.deep_agent.config import resolve_workspace

_DT = re.compile(r"\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b")


def _resolve(p: str) -> Path:
    root = Path(resolve_workspace())
    if p == "/workspace":
        return root
    if p.startswith("/workspace/"):
        p = p[len("/workspace/"):]
    cand = Path(p)
    if cand.is_absolute():
        if cand.exists():
            return cand
        return root / Path(p.lstrip("/"))
    return root / cand


def _read(path: str) -> str:
    p = _resolve(path)
    try:
        r = PdfReader(p)
        return "\n".join((pg.extract_text() or "") for pg in r.pages)
    except Exception:
        return p.read_text(encoding="utf-8", errors="replace")


def _lines_set(path: str) -> set[str]:
    return {l.strip() for l in _read(path).splitlines() if l.strip()}


def elenca_file(cartella: str) -> str:
    """Elenca i file nella cartella data, con dimensione — nulla viene modificato.
    Se passi una stringa come 'workspace' o '/workspace', usa la cartella workspace attuale."""
    p = _resolve(cartella)
    if not p.is_dir():
        return "cartella non trovata"
    rows = [f"{f.name} ({f.stat().st_size} B)" for f in sorted(p.iterdir()) if f.is_file()]
    return "\n".join(rows) if rows else "cartella vuota"


def leggi_pdf(path: str) -> str:
    """Estrae il testo di un PDF (prima pagina se molto lungo). Passa il nome del file:
    se il percorso non esiste, il file viene cercato nella cartella workspace.
    Per file di testo (non PDF) usa leggi_workspace."""
    txt = _read(path)
    return txt[:8000] + ("…" if len(txt) > 8000 else "")


def riassumi_pdf(path: str) -> str:
    """Restituisce un riassunto breve di un PDF: conteggio pagine, caratteri e prime righe."""
    try:
        r = PdfReader(_resolve(path))
    except Exception:
        return "file non leggibile come PDF: usa leggi_workspace per i file di testo"
    txt = "\n".join((pg.extract_text() or "") for pg in r.pages)
    lines = [l.strip() for l in txt.splitlines() if l.strip()]
    head = "\n".join(lines[:6]) or "(documento senza testo estraibile)"
    return f"pagine: {len(r.pages)} · parole: {len(txt.split())}\n{head}"


def estrai_date(path: str) -> str:
    """Estrae le date (gg/mm/aaaa) presenti in un file e le restituisce in lista.
    Passa il nome del file (es. 'nota.txt'): se il percorso non esiste, il file viene
    cercato automaticamente nella cartella workspace. Funziona con PDF e file di testo."""
    txt = _read(path)
    dates = sorted(set(_DT.findall(txt)))
    return ", ".join(dates) if dates else "nessuna data trovata"


def confronta_versioni(a: str, b: str) -> str:
    """Confronta due PDF e riporta le righe aggiunte/rimosse tra le versioni."""
    la, lb = _lines_set(a), _lines_set(b)
    add = sorted(lb - la)
    rem = sorted(la - lb)
    return (
        f"righe uguali: {len(la & lb)} · aggiunte: {len(add)} · rimosse: {len(rem)}\n"
        f"+ {add[:5]}\n- {rem[:5]}"
    )