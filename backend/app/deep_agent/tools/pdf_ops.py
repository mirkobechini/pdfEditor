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

        # PRIORITÀ AL MATCH ESATTO: `scheda-1726` e `scheda_1726` sono file
        # DISTINTI (Mirko 19/10), quindi NON vanno normalizzati nello stesso
        # match. Solo se il nome esatto non esiste proviamo un fallback che
        # normalizza underscore<->trattino (perché l'LLM scrive scheda_1726
        # mentre il file reale è scheda-1726) — ma se il fallback genera più
        # candidati, dichiariamo AMBIGUITÀ invece di indovinare.
        def _no_ext(s: str) -> str:
            s = (s or "").lower().strip()
            if s.endswith(".pdf"):
                s = s[:-4]
            return s

        name = token.lower()
        if not name.endswith(".pdf"):
            name += ".pdf"

        # 1) match esatto (case-insensitive, con/senza .pdf)
        exact = [d for d in docs if _no_ext(d.original_filename) == _no_ext(name)]
        # 2) fallback: normalizza underscore<->trattino SOLO se non c'è esatto
        if not exact:
            norm_token = _no_ext(name).replace("_", "-").replace(" ", "-")
            fuzzy = [
                d
                for d in docs
                if _no_ext(d.original_filename).replace("_", "-").replace(" ", "-")
                == norm_token
            ]
            exact = fuzzy

        matches = exact
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


def _resolve_workspace_pdf_path(token: str) -> Path:
    """Risolve un NOME file all'id reale del PDF nella WORKSPACE (fisico su disco).

    fix 19/10 (test Mirko): `elenca_workspace` elenca i file FISICI della cartella
    workspace, ma `merge_pdfs` li cercava nel BACKEND (pdf_documents) -> i file
    della workspace non erano lì -> "PDF ... not found". Ora il tool opera sui file
    fisici. Match esatto per primo (scheda-1726 e scheda_1726 sono DISTINTI);
    fallback _<->- solo se l'esatto non esiste; ambiguità se più candidati.
    """
    from app.deep_agent.tools.workspace import _root as ws_root
    root = ws_root()
    if root is None:
        raise ValueError("workspace non configurata")
    if not root.is_dir():
        raise ValueError("workspace non trovata")
    t = (token or "").strip().strip('"').strip("'")
    if not t:
        raise ValueError("nome file PDF vuoto")
    name = t if t.lower().endswith(".pdf") else f"{t}.pdf"
    def _norm(s: str) -> str:
        return (s or "").lower().strip().replace("_", "-").replace(" ", "-")
    exact = [f for f in root.glob("*.pdf") if f.name.lower() == name.lower()]
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        liste = ", ".join(f.name for f in exact)
        raise ValueError(f"PDF di '{token}' ambiguo ({len(exact)} file): {liste}. Usa il nome esatto.")
    # Nessun match esatto: il fallback normalizzato (_<->-, spazi) trova file col
    # nome DIVERSO. NON eseguiamo da soli (Mirko 19/10: scheda-1726 e scheda_1726
    # possono essere file diversi) -> chiediamo conferma all'utente.
    fuzzy = [f for f in root.glob("*.pdf") if _norm(f.name) == _norm(name)]
    if len(fuzzy) == 1:
        raise ValueError(
            f"Non ho trovato '{t}' nel workspace; esiste '{fuzzy[0].name}'. "
            "Se intendevi questo file, conferma e riprova col nome esatto."
        )
    if len(fuzzy) > 1:
        liste = ", ".join(f.name for f in fuzzy)
        raise ValueError(f"PDF di '{t}' ambiguo ({len(fuzzy)} file): {liste}. Usa il nome esatto.")
    raise ValueError(f"PDF {token} not found nel workspace")


def merge_pdfs(pdf_ids: str | list[str], output_name: str = "") -> str:
    """Unisce più PDF (della WORKSPACE, file fisici) in uno.

    - pdf_ids: stringa di nomi/id separati da virgola OPPURE lista (almeno 2)
    - output_name: (opzionale) nome DESIDERATO per il file risultante. Se vuoto,
      viene usato il default "<a>_<b>_uniti.pdf".
    Il risultato viene salvato nella cartella output/ del workspace.
    """
    if isinstance(pdf_ids, list):
        ids = [str(i).strip() for i in pdf_ids if str(i).strip()]
    else:
        ids = [i.strip() for i in str(pdf_ids).split(",") if i.strip()]
    if len(ids) < 2:
        return "Errore: servono almeno 2 PDF da unire"
    try:
        paths = [_resolve_workspace_pdf_path(i) for i in ids]
    except ValueError as e:
        return f"Errore: {e}"
    import fitz
    from app.deep_agent.tools.workspace import _root as ws_root
    root = ws_root()
    out = fitz.open()
    try:
        for p in paths:
            doc = fitz.open(p)
            out.insert_pdf(doc)
            doc.close()
        # nome di output: se richiesto dall'utente usiamo quello, altrimenti default
        if output_name and output_name.strip():
            base = output_name.strip()
            if not base.lower().endswith(".pdf"):
                base += ".pdf"
            merged_name = base
        else:
            merged_name = "_".join(p.stem for p in paths) + "_uniti.pdf"
        merged_dir = root / "output"
        merged_dir.mkdir(parents=True, exist_ok=True)
        target = merged_dir / merged_name
        # Fix 3 (20/10, domanda di Mirko): se il file esiste già, NON sovrascrivere
        # in silenzio — aggiungiamo un suffisso _2, _3, ... così non si perde il
        # risultato precedente.
        final_name = merged_name
        if target.exists():
            stem = target.stem  # es. scheda-1726_temp_uniti
            n = 2
            while (merged_dir / f"{stem}_{n}.pdf").exists():
                n += 1
            final_name = f"{stem}_{n}.pdf"
            target = merged_dir / final_name
        out.save(str(target))
        out.close()
        return f"✓ PDF uniti in: {final_name}"
    except Exception as e:
        return f"Errore durante l'unione: {e}"


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
