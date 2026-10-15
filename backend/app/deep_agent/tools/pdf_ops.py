"""Tool agente — operazioni PDF reali del backend (T5a).

Espone all'LLM le funzionalità dell'app (split, merge) come tool avvolgendo
il servizio PdfMergeSplitService già esistente. La sessione DB è aperta da
SessionLocal (sidecar locale); l'utente è risolto dalla config/env per poter
operare sui PDF del backend (in locale il sidecar usa un utente dedicato).

NOTA: sono funzioni "di integrazione" — aprono la sessione, chiamano il
servizio e restituiscono una stringa sintetica per l'agente, mai un oggetto.
"""

from __future__ import annotations

import os

from app.core.database import SessionLocal
from app.services.pdf_merge_split_service import PdfMergeSplitService
from app.repositories.user_repo import UserRepository


def _current_user_id() -> str:
    """Risolve l'id utente per le operazioni a valle.

    Priorit: env `PDFMIND_USER_ID`; altrimenti il super-admin di default
    (`admin@pdfeditor.local`) quando esiste. In locale il sidecar opera sempre
    su questo utente dedicato.
    """
    env = os.environ.get("PDFMIND_USER_ID", "").strip()
    if env:
        return env
    db = SessionLocal()
    try:
        admin = UserRepository(db).get_by_email(os.environ.get("PDFMIND_SUPER_ADMIN_EMAIL", "admin@pdfeditor.local"))
        if admin:
            return admin.id
    finally:
        db.close()
    raise ValueError(
        "Nessun utente risolto per le operazioni PDF dell'agente: "
        "imposta PDFMIND_USER_ID oppure esiste admin@pdfeditor.local"
    )


def split_pdf(pdf_id: str, mode: str = "every", ranges: str | None = None) -> str:
    """Separa un PDF in più parti.

    - pdf_id: id del PDF nel backend
    - mode: "every" (una pagina per parte) oppure "range"
    - ranges: obbligatorio se mode="range", formato "1-3,5-7"
    """
    if mode == "range" and not ranges:
        return "Errore: mode='range' richiede ranges (es. '1-3,5-7')"
    db = SessionLocal()
    try:
        service = PdfMergeSplitService(db)
        user_id = _current_user_id()
        if mode == "range":
            parsed = [r.strip() for r in ranges.split(",") if r.strip()]
            results = service.split_by_ranges(pdf_id, user_id, parsed)
        else:
            results = service.split_every_page(pdf_id, user_id)
        names = [r.original_filename for r in results]
        return f"✓ PDF diviso in {len(results)} parti: {', '.join(names)}"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()


def merge_pdfs(pdf_ids: str) -> str:
    """Unisce più PDF in uno.

    - pdf_ids: lista di id separati da virgola (almeno 2)
    """
    ids = [i.strip() for i in pdf_ids.split(",") if i.strip()]
    if len(ids) < 2:
        return "Errore: servono almeno 2 PDF da unire"
    db = SessionLocal()
    try:
        service = PdfMergeSplitService(db)
        user_id = _current_user_id()
        doc = service.merge(ids, user_id)
        return f"✓ PDF uniti in: {doc.original_filename}"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()
