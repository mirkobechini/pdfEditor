"""Tool famiglia documenti (profilo user + dev). Solo operazioni sui file, mai azioni distruttive."""

import os
import re
from pathlib import Path

from pypdf import PdfReader

from app.deep_agent.config import resolve_workspace

_DT = re.compile(r"\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b")


def _resolve(p: str) -> Path:
    """Risolve un percorso SEMPRE dentro la workspace (fix 09/11).

    Prima un percorso assoluto esterno (es. `D:/Mirko/Desktop/x.pdf`) veniva
    usato se esisteva, altrimenti concatenato alla root producendo un path senza
    senso e un FileNotFoundError che l'utente vedeva come "errore del provider".
    Ora: si usa solo il nome file e si cerca nella workspace.
    """
    ws = resolve_workspace()
    if not ws:
        # workspace non configurata: nessuna root reale (evita cartella fittizia/CWD)
        return Path("/__workspace_non_configurata__")
    root = Path(ws)
    if not p:
        return root
    if p == "/workspace":
        return root
    if p.startswith("/workspace/"):
        p = p[len("/workspace/"):]
    cand = Path(p)
    if cand.is_absolute():
        if cand.exists():
            return cand
        return root / cand.name
    return root / cand


def _available_files(root: Path, limit: int = 12) -> str:
    """Elenco breve dei file disponibili, per un messaggio d'errore utile."""
    try:
        names = sorted(f.name for f in root.iterdir() if f.is_file())
    except OSError:
        return ""
    if not names:
        return ""
    more = "" if len(names) <= limit else f" (+{len(names) - limit} altri)"
    return ", ".join(names[:limit]) + more


def _read(path: str) -> str:
    """Legge un PDF o un file di testo dalla workspace.

    Non solleva eccezioni: se il file non c'è risponde con un messaggio utile
    (nome cercato + file disponibili), cosi' l'agente puo' correggersi invece di
    far esplodere lo stream con un traceback (fix 09/11, Mirko).
    """
    p = _resolve(path)
    # 09/11: i tool di LETTURA restano sandbox alla workspace — un percorso
    # assoluto fuori (anche se esiste) non va letto.
    ws_root = resolve_workspace()
    if ws_root:
        try:
            inside = p.resolve().is_relative_to(Path(ws_root).resolve())
        except Exception:  # noqa: BLE001
            inside = False
        if not inside:
            return (f"file fuori dalla workspace non accessibile: {Path(path).name}"
                    ". I tool di lettura operano solo sui file nella workspace.")
    if not p.exists() or not p.is_file():
        root = resolve_workspace()
        avail = _available_files(Path(root)) if root else ""
        _name = str(path).replace("\\", "/").rstrip("/").split("/")[-1]
        msg = f"file non trovato nella workspace: {_name}"
        if avail:
            msg += f". File disponibili: {avail}"
        else:
            msg += ". La workspace non contiene file: carica o crea il file prima."
        if Path(path).is_absolute():
            msg += " (i percorsi assoluti fuori dalla workspace non sono accessibili)"
        return msg
    try:
        r = PdfReader(p)
        return "\n".join((pg.extract_text() or "") for pg in r.pages)
    except Exception:
        try:
            return p.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            return f"file non leggibile ({type(e).__name__}): {p.name}"


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