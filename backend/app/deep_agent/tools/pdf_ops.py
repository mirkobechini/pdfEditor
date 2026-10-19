"""Tool agente — operazioni PDF reali del backend (T5a).

Espone all'LLM le funzionalità dell'app (split, merge) come tool avvolgendo
il servizio PdfMergeSplitService già esistente. La sessione DB è aperta da
SessionLocal (sidecar locale); l'utente è risolto dalla config/env per poter
operare sui PDF del backend (in locale il sidecar usa un utente dedicato).

NOTA: sono funzioni "di integrazione" — aprono la sessione, chiamano il
servizio e restituiscono una stringa sintetica per l'agente, mai un oggetto.
"""

from __future__ import annotations

import base64
import os
from contextvars import ContextVar

from app.core.database import SessionLocal
from app.services.pdf_merge_split_service import PdfMergeSplitService
from app.services.pdf_service import PdfService
from app.repositories.user_repo import UserRepository

# Utente corrente del Deep Agent, impostato dalla rotta /mind/chat con l'utente
# autenticato della sessione (fix 16/10: il merge falliva perché i tool usavano
# solo env PDFMIND_USER_ID o admin@pdfeditor.local, non l'utente reale loggato).
_CURRENT_USER_ID: ContextVar[str | None] = ContextVar("deep_agent_current_user", default=None)


def set_current_user_id(user_id: str | None) -> None:
    """Imposta l'utente corrente per l'esecuzione dei tool (chiamato da /mind/chat)."""
    _CURRENT_USER_ID.set(user_id)


def _current_user_id() -> str:
    """Risolve l'id utente per le operazioni a valle.

    Priorità:
    1. utente autenticato della sessione (impostato da /mind/chat)
    2. env `PDFMIND_USER_ID`
    3. il super-admin di default (`admin@pdfeditor.local`) quando esiste
    """
    session_user = _CURRENT_USER_ID.get()
    if session_user:
        return session_user
    env = os.environ.get("PDFMIND_USER_ID", "").strip()
    if env:
        return env
    db = SessionLocal()
    try:
        admin = UserRepository(db).get_by_email(os.environ.get("PDFMIND_SUPER_ADMIN_EMAIL", "admin@pdfeditor.local"))
        if admin:
            return admin.id
        # fix 19/10: sidecar locale MONOUTENTE — la ContextVar dell'utente di
        # sessione può NON arrivare nel thread dei tool. Come ultima risorsa
        # risolviamo il PRIMO utente reale (non-guest) del DB: è l'utente loggato
        # della sidecar desktop, a cui appartengono i PDF. Evita il fallimento
        # "Nessun utente risolto... PDFMIND_USER_ID".
        from sqlalchemy import select
        from app.models.user import User as UserModel
        u = db.execute(
            select(UserModel)
            .where(UserModel.is_guest.is_(False))
            .order_by(UserModel.created_at.asc())
            .limit(1)
        ).scalar_one_or_none()
        if u is not None:
            return u.id
    finally:
        db.close()
    raise ValueError(
        "Nessun utente risolto per le operazioni PDF dell'agente: "
        "imposta PDFMIND_USER_ID oppure esiste admin@pdfeditor.local"
    )


def _resolve_pdf_id(token: str, user_id: str) -> str:
    """Risolve il nome file (es. "scheda-1726") all'id reale del PDF per l'utente.

    Bug 14 real bias (fix 19/10): i tool app (merge/split/...) ricevevano dall'LLM
    il NOME del file che vede nella workspace, ma il servizio cerca per id backend.
    Se il token è già un UUID lo usiamo; altrimenti lo risolviamo contro i PDF
    dell'utente per original_filename (con o senza .pdf, case-insensitive).
    Se è ambiguo -> errore chiaro; se non trovato -> ValueError che diventa "Errore:".
    """
    token = (token or "").strip().strip('"').strip("'")
    if not token:
        raise ValueError("nome file/id del PDF vuoto")
    from uuid import UUID
    try:
        UUID(token)
        return token
    except (ValueError, AttributeError):
        pass
    db = SessionLocal()
    try:
        from app.repositories.pdf_repo import PdfRepository
        docs = PdfRepository(db).get_all_by_user(user_id)
        name = token.lower()
        if not name.endswith(".pdf"):
            name += ".pdf"
        base = name[:-4]
        exact = [d for d in docs if (d.original_filename or "").lower() == name]
        partial = [d for d in docs if (d.original_filename or "").lower().startswith(base)] if not exact else []
        matches = exact or partial
        if len(matches) == 1:
            return matches[0].id
        if len(matches) > 1:
            liste = ", ".join((d.original_filename or d.id) for d in matches)
            raise ValueError(f"PDF di '{token}' ambiguo ({len(matches)} file): {liste}. Usa l'id.")
        raise ValueError(f"PDF {token} not found")
    finally:
        db.close()


def split_pdf(pdf_id: str, mode: str = "every", ranges: str | None = None) -> str:
    """Separa un PDF in più parti.

    - pdf_id: id del PDF nel backend oppure il NOME del file (es. "scheda-1726.pdf")
    - mode: "every" (una pagina per parte) oppure "range"
    - ranges: obbligatorio se mode="range", formato "1-3,5-7"
    """
    if mode == "range" and not ranges:
        return "Errore: mode='range' richiede ranges (es. '1-3,5-7')"
    db = SessionLocal()
    try:
        service = PdfMergeSplitService(db)
        user_id = _current_user_id()
        resolved = _resolve_pdf_id(pdf_id, user_id)
        if mode == "range":
            parsed = [r.strip() for r in ranges.split(",") if r.strip()]
            results = service.split_by_ranges(resolved, user_id, parsed)
        else:
            results = service.split_every_page(resolved, user_id)
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
        # fix 19/10: l'LLM passa i NOMI file della workspace -> risolviamo a id reali
        resolved_ids = [_resolve_pdf_id(i, user_id) for i in ids]
        doc = service.merge(resolved_ids, user_id)
        return f"✓ PDF uniti in: {doc.original_filename}"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()


def sign_pdf(
    pdf_id: str,
    signature_image_b64: str,
    page_number: int = 1,
    x: float = 0.0,
    y: float = 0.0,
    width: float = 200.0,
    height: float = 80.0,
) -> str:
    """Applica una firma (immagine) a un PDF del backend.

    - pdf_id: id del PDF
    - signature_image_b64: immagine PNG/JPEG codificata in base64
    - page_number: pagina (1-based) da firmare
    - x, y, width, height: posizione e dimensione della firma in punti PDF
    """
    if not signature_image_b64:
        return "Errore: manca l'immagine della firma (signature_image_b64)"
    if page_number < 1:
        return "Errore: page_number deve essere >= 1"
    if width <= 0 or height <= 0:
        return "Errore: width e height devono essere positivi"
    try:
        sig = base64.b64decode(signature_image_b64)
    except Exception:
        return "Errore: la firma non è base64 valida"
    if not sig:
        return "Errore: la firma è vuota"
    db = SessionLocal()
    try:
        user_id = _current_user_id()
        doc = PdfService(db).sign_pdf(
            pdf_id,
            user_id,
            sig,
            page_number,
            x,
            y,
            width,
            height,
        )
        return f"✓ PDF firmato: {doc.original_filename}"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()


def annotate_pdf(
    pdf_id: str,
    annotation_type: str,
    rect: str,
    page_number: int = 1,
    color: str = "#FFFF00",
    content: str | None = None,
) -> str:
    """Aggiunge un'annotazione (highlight/underline/...) a un PDF.

    - pdf_id: id del PDF
    - annotation_type: highlight | underline | strikeout | text | free_text | draw
    - rect: "x0,y0,x1,y1" (coordinate in punti PDF, origine alto-sinistra)
    - page_number: pagina (1-based)
    - color: colore esadecimale (default #FFFF00)
    - content: testo (richiesto per text/free_text)
    """
    if annotation_type not in ("highlight", "underline", "strikeout", "text", "free_text", "draw"):
        return "Errore: tipo annotazione non valido (highlight|underline|strikeout|text|free_text|draw)"
    try:
        parts = [float(p.strip()) for p in rect.split(",")]
    except Exception:
        return "Errore: rect deve essere 'x0,y0,x1,y1' numerico"
    if len(parts) != 4:
        return "Errore: rect deve avere esattamente 4 valori [x0, y0, x1, y1]"
    db = SessionLocal()
    try:
        user_id = _current_user_id()
        doc = PdfService(db).add_annotation(
            pdf_id,
            user_id,
            page_number,
            annotation_type,
            tuple(parts),
            color=color,
            content=content,
        )
        return f"✓ Annotazione {annotation_type} aggiunta a: {doc.original_filename}"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()


def ocr_pdf(pdf_id: str, language: str = "eng") -> str:
    """Esegue l'OCR su un PDF scansionato e lo rende ricercabile.

    - pdf_id: id del PDF
    - language: codice lingua Tesseract (es. eng, ita)
    """
    if not pdf_id.strip():
        return "Errore: manca pdf_id"
    db = SessionLocal()
    try:
        user_id = _current_user_id()
        pdf, chars, already_searchable = PdfService(db).ocr_pdf(pdf_id, user_id, language=language)
        if already_searchable:
            return f"✓ PDF già dotato di testo: {pdf.original_filename} (nessuna modifica)"
        return f"✓ OCR completato su {pdf.original_filename} ({chars} caratteri riconosciuti)"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()


def compress_pdf(pdf_id: str, quality: str = "medium", overwrite: bool = False) -> str:
    """Comprime un PDF riducendo le dimensioni.

    - pdf_id: id del PDF
    - quality: low | medium | high
    - overwrite: se True sostituisce l'originale, altrimenti crea una nuova copia
    """
    if quality not in ("low", "medium", "high"):
        return "Errore: quality deve essere low | medium | high"
    db = SessionLocal()
    try:
        user_id = _current_user_id()
        doc = PdfMergeSplitService(db).compress(
            pdf_id,
            user_id,
            quality=quality,
            overwrite=overwrite,
        )
        return f"✓ PDF compresso: {doc.original_filename}"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()


def convert_docx_to_pdf(filename: str, content_b64: str) -> str:
    """Converte un documento DOCX in PDF (come nuova importazione).

    - filename: nome del file (es. relazione.docx)
    - content_b64: contenuto del DOCX codificato in base64
    """
    if not filename.lower().endswith(".docx"):
        return "Errore: supportati solo file .docx"
    if not content_b64:
        return "Errore: manca il contenuto del file"
    try:
        import base64 as _b64
        content = _b64.b64decode(content_b64)
    except Exception:
        return "Errore: content_b64 non è base64 valido"
    db = SessionLocal()
    try:
        user_id = _current_user_id()
        doc = PdfService(db).import_file_to_pdf(filename, content, user_id)
        return f"✓ Convertito in PDF: {doc.original_filename}"
    except ValueError as e:
        return f"Errore: {e}"
    finally:
        db.close()
