"""Tool famiglia manutenzione (SOLO profilo dev, sempre read-only). Mai modifiche: solo lettura di stato/repo/log/API."""

import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path


def git_status(path: str) -> str:
    """Riporta lo stato del repository git nella cartella data (solo lettura)."""
    r = subprocess.run(["git", "-C", str(path), "status", "--short"], capture_output=True, text=True)
    return r.stdout.strip() or "pulito"


def leggi_log(servizio: str) -> str:
    """Legge le ultime righe del log di un servizio dalla cartella logs/ (solo lettura)."""
    base = Path(os.environ.get("PDFMIND_LOGS", "logs"))
    f = base / f"{servizio}.log"
    if not f.exists():
        return "log non trovato"
    lines = f.read_text(errors="ignore").splitlines()
    return "\n".join(lines[-40:]) if lines else "(vuoto)"


def api_status(url: str) -> str:
    """Interroga un endpoint HTTP/API e riporta codice e latenza (solo lettura)."""
    t0 = time.time()
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return f"{r.status} · {int((time.time() - t0) * 1000)}ms"
    except Exception as e:  # noqa: BLE001
        return f"errore: {type(e).__name__}"


def leggi_issue(repo: str, n: int) -> str:
    """Legge l'issue GitHub N del repo 'owner/repo' (solo lettura, API pubblica)."""
    url = f"https://api.github.com/repos/{repo}/issues/{n}"
    req = urllib.request.Request(url, headers={"User-Agent": "pdfmind", "Accept": "application/vnd.github+json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            d = json.load(r)
        return f"#{d.get('number')} [{d.get('state')}] {d.get('title')}\n{d.get('body') or ''}"[:2000]
    except Exception as e:  # noqa: BLE001
        return f"errore: {type(e).__name__}"