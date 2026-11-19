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


def elenca_workspace(cartella: str = "") -> str:
    """Elenca file e cartelle del workspace (sola lettura).

    Fix 20/10 (Mirko): mostra TUTTI i file (anche quelli dentro output/ e altre
    sottocartelle) e rende esplicite le cartelle, così l'utente vede tutto il
    contenuto e distingue subito cos'è una cartella.

    Fix 23/10 (Mirko): se l'utente chiede una cartella SPECIFICA (es. "elenca
    i file in/su output"), passare QUESTO parametro (es. cartella="output")
    per elencare SOLO quella sottocartella invece di tutto il workspace.
    """
    r = _root()
    if r is None:
        return "workspace non configurata"
    if not r.is_dir():
        return "workspace non trovata"
    # se è richiesta una sottocartella specifica, limitiamo la ricerca lì
    base = r
    if cartella and cartella.strip():
        base = r / cartella.strip().strip("/")
        if not base.is_dir():
            return f"cartella '{cartella}' non trovata nel workspace"
    files = sorted(f for f in base.rglob("*") if f.is_file())
    if not files:
        # Fix 23/10 (test Mirko): se è stata filtrata una cartella specifica, il
        # "vuoto" riguarda QUELLA cartella, non l'intero workspace.
        if cartella and cartella.strip():
            return f"cartella {cartella.strip().strip('/')}/ vuota"
        return "workspace vuoto"
    # raggruppa per directory relativa
    by_dir: dict[str, list[str]] = {}
    for f in files:
        rel_dir = str(f.parent.relative_to(r))
        name = f.name
        # se è un file direttamente nella root, lo elenchiamo nella "root"
        if rel_dir == ".":
            by_dir.setdefault("(radice)", []).append(name)
        else:
            by_dir.setdefault(rel_dir, []).append(name)
    lines = []
    for d in sorted(by_dir):
        if d == "(radice)":
            lines.append("Cartella radice:")
        else:
            lines.append(f"Cartella {d}/:")
        for name in by_dir[d]:
            lines.append(f"  - {name}")
    return "\n".join(lines)


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


def elimina_file(nome: str) -> str:
    """Elimina un file dal workspace — SOLO dalla cartella output/ (mai i sorgenti).

    Come gli altri tool operativi, il file va indicato col semplice nome (es.
    'scheda-1726_temp_uniti.pdf'); la risoluzione fa match esatto prima, poi
    ignora underscore/trattini e l'estensione se manca. L'eliminazione è
    SEMPRE preceduta da conferma HITL (interrupt_on=True).
    """
    from difflib import get_close_matches as _gcm
    r = _root()
    if r is None:
        return "eliminazione non consentita: workspace non configurata"
    out = (r / "output")
    if not out.is_dir():
        return "nessun file da eliminare: cartella output/ non esiste"
    t = (nome or "").strip().strip('"').strip("'")
    if not t:
        return "nome file vuoto"
    # candidati: tutti i file in output/
    files = [f for f in out.iterdir() if f.is_file()]
    if not files:
        return "nessun file da eliminare in output/"
    target = None
    want = t if t.lower().endswith(".pdf") else f"{t}.pdf"
    lower = {f.name.lower(): f for f in files}
    # 1) match esatto (case-insensitive)
    if want.lower() in lower:
        target = lower[want.lower()]
    else:
        # 2) match ignorando underscore/trattini e con o senza estensione
        def _norm(s: str) -> str:
            return (s or "").lower().replace("_", "-").replace(" ", "-")
        norm_map = {_norm(f.name): f for f in files}
        if _norm(want) in norm_map:
            target = norm_map[_norm(want)]
        else:
            # 3) fuzzy (es. 'scheda_1726' vs 'scheda-1726_temp_uniti.pdf')
            cand = _gcm(_norm(want), list(norm_map), n=1, cutoff=0.6)
            if cand and len(norm_map) <= 1:
                target = norm_map[cand[0]]
            elif cand:
                return (
                    f"ambiguità: più file simili a '{t}' in output/ "
                    f"({', '.join(sorted(f.name for f in files))}). "
                    "Indica il nome esatto."
                )
    if target is None:
        return f"file '{t}' non trovato in output/ (file presenti: {', '.join(sorted(f.name for f in files))})"
    target.unlink()
    return f"✓ eliminato: output/{target.name}"


def elimina_tutti_in_output() -> str:
    """Elimina TUTTI i file nella cartella output/ del workspace (mai i sorgenti).

    Tool BULK (fix 22/10, Mirko): "elimina tutti i file nella cartella output"
    ora è un'operazione unica con una SOLA conferma HITL, invece di far indovinare
    al modello un nome-file per volta (prima non eliminava nulla). Elimina solo
    dalla cartella output/ — i sorgenti nella root restano intatti.
    """
    r = _root()
    if r is None:
        return "eliminazione non consentita: workspace non configurata"
    out = (r / "output")
    if not out.is_dir():
        return "nessun file da eliminare: cartella output/ non esiste"
    files = [f for f in out.iterdir() if f.is_file()]
    if not files:
        return "nessun file da eliminare in output/"
    names = sorted(f.name for f in files)
    for f in files:
        f.unlink()
    return f"✓ eliminati {len(files)} file da output/: {', '.join(names)}"

