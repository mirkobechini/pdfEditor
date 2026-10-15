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

from app.core.database import SessionLocal
from app.services.pdf_merge_split_service import PdfMergeSplitService
from app.services.pdf_service import PdfService
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
