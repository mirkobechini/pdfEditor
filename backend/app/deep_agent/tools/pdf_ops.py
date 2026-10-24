"""Tool agente — operazioni PDF reali del Deep Agent (T5a).

Espone all'LLM le funzionalità dell'app (split, sign, annotate, ocr, compress,
convert, merge) come tool che operano sui FILE FISICI della WORKSPACE, NON sui
documenti del database backend.

ADR (fix #1034, riprodotto da Mirko 24/10): il deep agent desktop lavora sui
file della workspace (il DB è per la futura versione web). `merge_pdfs` è stato
il primo tool convertito (pattern di riferimento): risolve i file con
`_resolve_workspace_pdf_path` e salva i risultati in `output/` del workspace.
Tutti gli altri tool seguono ora lo stesso pattern — niente SessionLocal, niente
PdfService/PdfMergeSplitService. I messaggi di esito sono sintetici per l'agente
('✓ ...'), i ValueError diventano 'Errore: ...'.

Nota: `set_current_user_id` resta chiamato dalla rotta /mind/chat (per
compatibilità), ma i tool non aprono più la sessione DB.
"""

from __future__ import annotations

import base64
import io
from contextvars import ContextVar
from pathlib import Path

# Utente corrente del Deep Agent, impostato dalla rotta /mind/chat con l'utente
# autenticato della sessione. Mantenuto per compatibilità della rotta: i tool
# workspace non lo usano più (operano sui file fisici).
_CURRENT_USER_ID: ContextVar[str | None] = ContextVar("deep_agent_current_user", default=None)


def set_current_user_id(user_id: str | None) -> None:
    """Imposta l'utente corrente per l'esecuzione dei tool (chiamato da /mind/chat).

    Conservato per compatibilità della rotta; i tool workspace non ne hanno
    più bisogno (lavorano sui file fisici, non sul DB).
    """
    _CURRENT_USER_ID.set(user_id)


# ---------------------------------------------------------------------------
# Helpers workspace (import lazy per far funzionare il monkeypatch di _root nei test)
# ---------------------------------------------------------------------------

def _resolve_root() -> Path:
    """Ritorna la root della workspace fisica (sul disco)."""
    from app.deep_agent.tools.workspace import _root
    root = _root()
    if root is None:
        raise ValueError("workspace non configurata")
    if not root.is_dir():
        raise ValueError("workspace non trovata")
    return root


def _output_dir(root: Path) -> Path:
    """Ritorna la cartella output/ del workspace, creandola se serve."""
    out = root / "output"
    out.mkdir(parents=True, exist_ok=True)
    return out


def _unique_pdf_path(directory: Path, name: str) -> Path:
    """Ritorna un path in `directory` che NON esista ancora.

    Se `name` esiste già aggiungiamo un suffisso _2, _3, ... così non si
    sovrascrive mai in silenzio un risultato precedente (pattern di merge_pdfs).
    """
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    target = directory / name
    if not target.exists():
        return target
    stem = Path(name).stem
    n = 2
    while (directory / f"{stem}_{n}.pdf").exists():
        n += 1
    return directory / f"{stem}_{n}.pdf"


# ---------------------------------------------------------------------------
# Split
# ---------------------------------------------------------------------------

def split_pdf(pdf_id: str, mode: str = "every", ranges: str | None = None) -> str:
    """Separa un PDF della WORKSPACE in più parti.

    - pdf_id: nome del file PDF nella workspace (es. "scheda-1726.pdf")
    - mode: "every" (una pagina per parte) oppure "range"
    - ranges: obbligatorio se mode="range", formato "1-3,5-7"
    Le parti vengono salvate in output/ del workspace.
    """
    if mode == "range" and not ranges:
        return "Errore: mode='range' richiede ranges (es. '1-3,5-7')"
    import fitz
    try:
        path = _resolve_workspace_pdf_path(pdf_id)
        root = _resolve_root()
        out_dir = _output_dir(root)
        doc = fitz.open(path)
        results: list[str] = []
        try:
            if mode == "range":
                parsed = [r.strip() for r in ranges.split(",") if r.strip()]
                for r in parsed:
                    parts = r.split("-")
                    if len(parts) != 2:
                        raise ValueError(f"Range non valido: {r}. Usa 'inizio-fine'")
                    start, end = int(parts[0]), int(parts[1])
                    if start < 1 or end > doc.page_count or start > end:
                        raise ValueError(
                            f"Range {r} non valido: il PDF ha {doc.page_count} pagine"
                        )
                    out = fitz.open()
                    out.insert_pdf(doc, from_page=start - 1, to_page=end - 1)
                    target = _unique_pdf_path(out_dir, f"{path.stem}_pages_{r}.pdf")
                    out.save(str(target))
                    out.close()
                    results.append(target.name)
            else:
                for page_num in range(doc.page_count):
                    out = fitz.open()
                    out.insert_pdf(doc, from_page=page_num, to_page=page_num)
                    target = _unique_pdf_path(out_dir, f"{path.stem}_page_{page_num + 1}.pdf")
                    out.save(str(target))
                    out.close()
                    results.append(target.name)
        finally:
            doc.close()
        return f"✓ PDF diviso in {len(results)} parti: {', '.join(results)}"
    except ValueError as e:
        return f"Errore: {e}"
    except Exception as e:
        return f"Errore durante lo split: {e}"


# ---------------------------------------------------------------------------
# Resolver workspace (condiviso con merge_pdfs — NON toccare)
# ---------------------------------------------------------------------------

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
    # Fix 22/10 (test Mirko): il merge salva il risultato in `output/` del workspace,
    # quindi al merge successivo il file appena creato non era trovato (il resolver
    # cercava solo nella root). Ora i candidati includono anche la sottocartella output/.
    all_pdfs = list(root.glob("*.pdf"))
    out_dir = root / "output"
    if out_dir.is_dir():
        all_pdfs += list(out_dir.glob("*.pdf"))
    exact = [f for f in all_pdfs if f.name.lower() == name.lower()]
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        liste = ", ".join(str(f.relative_to(root)) for f in exact)
        raise ValueError(f"PDF di '{token}' ambiguo ({len(exact)} file): {liste}. Usa il nome esatto.")
    # Nessun match esatto: il fallback normalizzato (_<->-, spazi) trova file col
    # nome DIVERSO. NON eseguiamo da soli (Mirko 19/10: scheda-1726 e scheda_1726
    # possono essere file diversi) -> chiediamo conferma all'utente.
    fuzzy = [f for f in all_pdfs if _norm(f.name) == _norm(name)]
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


# ---------------------------------------------------------------------------
# Sign
# ---------------------------------------------------------------------------

def sign_pdf(
    pdf_id: str,
    signature_image_b64: str,
    page_number: int = 1,
    x: float = 0.0,
    y: float = 0.0,
    width: float = 200.0,
    height: float = 80.0,
) -> str:
    """Applica una firma (immagine) a un PDF della WORKSPACE.

    - pdf_id: nome del file PDF nella workspace
    - signature_image_b64: immagine PNG/JPEG codificata in base64
    - page_number: pagina (1-based) da firmare
    - x, y, width, height: posizione e dimensione della firma in punti PDF
    Il risultato viene salvato in output/ come <base>_firmato.pdf.
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
    import fitz
    try:
        path = _resolve_workspace_pdf_path(pdf_id)
        root = _resolve_root()
        out_dir = _output_dir(root)
        doc = fitz.open(path)
        try:
            if page_number > doc.page_count:
                raise ValueError(f"Pagina {page_number} fuori range (1-{doc.page_count})")
            page = doc[page_number - 1]
            try:
                page.insert_image(
                    fitz.Rect(x, y, x + width, y + height),
                    stream=sig,
                )
            except Exception as e:
                raise ValueError(f"Immagine firma non valida: {e}")
            target = _unique_pdf_path(out_dir, f"{path.stem}_firmato.pdf")
            doc.save(str(target))
        finally:
            doc.close()
        return f"✓ PDF firmato: {target.name}"
    except ValueError as e:
        return f"Errore: {e}"
    except Exception as e:
        return f"Errore durante la firma: {e}"


# ---------------------------------------------------------------------------
# Annotate
# ---------------------------------------------------------------------------

def _parse_points(points: str) -> list:
    """Parsa punti "x,y x,y x,y ..." in una lista di fitz.Point."""
    import fitz
    pts = []
    for token in points.split():
        try:
            px, py = (float(p.strip()) for p in token.split(","))
        except Exception:
            raise ValueError("points deve essere 'x,y x,y x,y ...' numerico")
        pts.append(fitz.Point(px, py))
    if len(pts) < 2:
        raise ValueError("points richiede almeno 2 punti")
    return pts


def annotate_pdf(
    pdf_id: str,
    annotation_type: str,
    rect: str,
    page_number: int = 1,
    color: str = "#FFFF00",
    content: str | None = None,
    points: str | None = None,
) -> str:
    """Aggiunge un'annotazione (highlight/underline/...) a un PDF della WORKSPACE.

    - pdf_id: nome del file PDF nella workspace
    - annotation_type: highlight | underline | strikeout | text | free_text | draw
    - rect: "x0,y0,x1,y1" (coordinate in punti PDF, origine alto-sinistra)
    - page_number: pagina (1-based)
    - color: colore esadecimale (default #FFFF00)
    - content: testo (richiesto per text/free_text)
    - points: (solo draw, opzionale) "x,y x,y x,y ..." — se assente usa gli angoli
      del rect come polilinea
    Il risultato viene salvato in output/ come <base>_annotato.pdf.
    """
    if annotation_type not in ("highlight", "underline", "strikeout", "text", "free_text", "draw"):
        return "Errore: tipo annotazione non valido (highlight|underline|strikeout|text|free_text|draw)"
    try:
        parts = [float(p.strip()) for p in rect.split(",")]
    except Exception:
        return "Errore: rect deve essere 'x0,y0,x1,y1' numerico"
    if len(parts) != 4:
        return "Errore: rect deve avere esattamente 4 valori [x0, y0, x1, y1]"
    import fitz
    try:
        path = _resolve_workspace_pdf_path(pdf_id)
        root = _resolve_root()
        out_dir = _output_dir(root)
        doc = fitz.open(path)
        try:
            if page_number < 1 or page_number > doc.page_count:
                raise ValueError(f"Pagina {page_number} fuori range (1-{doc.page_count})")
            page = doc[page_number - 1]
            rect_obj = fitz.Rect(*parts)

            if annotation_type == "highlight":
                annot = page.add_highlight_annot(rect_obj)
            elif annotation_type == "underline":
                annot = page.add_underline_annot(rect_obj)
            elif annotation_type == "strikeout":
                annot = page.add_strikeout_annot(rect_obj)
            elif annotation_type in ("text", "free_text"):
                annot = page.add_freetext_annot(rect_obj, content or "", fontsize=11)
            elif annotation_type == "draw":
                if points:
                    pts = _parse_points(points)
                else:
                    pts = [rect_obj.tl, rect_obj.tr, rect_obj.br, rect_obj.bl]
                annot = page.add_polyline_annot(pts)
            else:
                raise ValueError("tipo annotazione non valido")

            # Colore hex → rgb 0-1 (best-effort, come il servizio originale)
            try:
                ch = color.lstrip("#")
                r = int(ch[0:2], 16) / 255
                g = int(ch[2:4], 16) / 255
                b = int(ch[4:6], 16) / 255
                annot.set_colors(stroke=(r, g, b))
            except Exception:
                pass
            # rigenera l'appearance stream (fix come nel servizio: senza update()
            # l'annotazione conserva l'aspetto di default)
            annot.update()

            target = _unique_pdf_path(out_dir, f"{path.stem}_annotato.pdf")
            doc.save(str(target))
        finally:
            doc.close()
        return f"✓ Annotazione {annotation_type} aggiunta a: {target.name}"
    except ValueError as e:
        return f"Errore: {e}"
    except Exception as e:
        return f"Errore durante l'annotazione: {e}"


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------

def ocr_pdf(pdf_id: str, language: str = "eng") -> str:
    """Esegue l'OCR su un PDF scansionato della WORKSPACE e lo rende ricercabile.

    - pdf_id: nome del file PDF nella workspace
    - language: codice lingua Tesseract (es. eng, ita)
    Se il PDF ha già un text layer risponde 'già dotato di testo'. Altrimenti
    rende ogni pagina e inserisce il testo come layer invisibile. Richiede il
    binario tesseract (app.core.tesseract.configure_tesseract); il risultato
    viene salvato in output/ come <base>_ocr.pdf.
    """
    if not pdf_id.strip():
        return "Errore: manca pdf_id"
    import fitz
    from app.core.tesseract import configure_tesseract
    try:
        path = _resolve_workspace_pdf_path(pdf_id)
        root = _resolve_root()
        out_dir = _output_dir(root)
        doc = fitz.open(path)
        try:
            has_text = any(doc[i].get_text().strip() for i in range(doc.page_count))
            if has_text:
                return f"✓ PDF già dotato di testo: {path.name} (nessuna modifica)"

            if not configure_tesseract():
                return (
                    "Errore: OCR non disponibile: il binario tesseract non è installato "
                    "su questo sistema. Installalo o contatta l'amministratore."
                )

            import pytesseract
            from PIL import Image

            character_count = 0
            for page_num in range(doc.page_count):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                text = pytesseract.image_to_string(img, lang=language, config="--psm 3")
                stripped = text.strip()
                if stripped:
                    character_count += len(stripped)
                    page.insert_textbox(
                        fitz.Rect(0, 0, page.rect.width, page.rect.height),
                        text,
                        fontsize=1,
                        color=(1, 1, 1),
                        render_mode=3,  # testo invisibile
                        overlay=True,
                    )

            target = _unique_pdf_path(out_dir, f"{path.stem}_ocr.pdf")
            doc.save(str(target))
            return f"✓ OCR completato su {target.name} ({character_count} caratteri riconosciuti)"
        finally:
            doc.close()
    except ValueError as e:
        return f"Errore: {e}"
    except Exception as e:
        return f"Errore durante l'OCR: {e}"


# ---------------------------------------------------------------------------
# Compress
# ---------------------------------------------------------------------------

def compress_pdf(pdf_id: str, quality: str = "medium", overwrite: bool = False) -> str:
    """Comprime un PDF della WORKSPACE riducendo le dimensioni.

    - pdf_id: nome del file PDF nella workspace
    - quality: low | medium | high
    - overwrite: se True sostituisce l'originale, altrimenti crea una copia
      compressed_<base>.pdf in output/.
    """
    if quality not in ("low", "medium", "high"):
        return "Errore: quality deve essere low | medium | high"
    import fitz

    # Parametri identici a pdf_merge_split_service.compress
    params = {
        "low": {"garbage": 3, "deflate": True, "clean": True},
        "medium": {
            "garbage": 4,
            "deflate": True,
            "clean": True,
            "deflate_images": True,
            "deflate_fonts": True,
        },
        "high": {
            "garbage": 4,
            "deflate": True,
            "clean": True,
            "deflate_images": True,
            "deflate_fonts": True,
            "compression_effort": 9,
        },
    }
    compress_params = params.get(quality, params["medium"])
    try:
        path = _resolve_workspace_pdf_path(pdf_id)
        source = fitz.open(path)
        try:
            out_bytes = source.tobytes(**compress_params)
        finally:
            source.close()
        if overwrite:
            path.write_bytes(out_bytes)
            return f"✓ PDF compresso (sovrascritto): {path.name}"
        root = _resolve_root()
        out_dir = _output_dir(root)
        target = _unique_pdf_path(out_dir, f"compressed_{path.name}")
        target.write_bytes(out_bytes)
        return f"✓ PDF compresso: {target.name}"
    except ValueError as e:
        return f"Errore: {e}"
    except Exception as e:
        return f"Errore durante la compressione: {e}"


# ---------------------------------------------------------------------------
# Convert DOCX → PDF (salva in ROOT della workspace, non nel DB)
# ---------------------------------------------------------------------------

def _docx_to_pdf_bytes(content: bytes) -> bytes:
    """Converte contenuto DOCX in bytes PDF (stessa logica di
    PdfService._convert_docx_to_pdf, senza toccare il DB)."""
    from docx import Document
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    try:
        doc = Document(io.BytesIO(content))
    except Exception as e:
        raise ValueError(f"File DOCX non valido: {e}")

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 20 * mm
    y = height - margin
    line_height = 14

    def new_page_if_needed():
        nonlocal y
        if y < margin:
            c.showPage()
            y = height - margin

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            y -= line_height
            continue
        font_size = 11
        try:
            if para.style and para.style.font and para.style.font.size:
                font_size = para.style.font.size.pt
        except Exception:
            pass
        c.setFont("Helvetica", font_size)
        max_chars = int((width - 2 * margin) / (font_size * 0.5))
        words = text.split()
        line = ""
        for word in words:
            candidate = f"{line} {word}".strip()
            if len(candidate) > max_chars:
                new_page_if_needed()
                c.drawString(margin, y, line)
                y -= line_height
                line = word
            else:
                line = candidate
        if line:
            new_page_if_needed()
            c.drawString(margin, y, line)
            y -= line_height

    c.showPage()
    c.save()
    return buffer.getvalue()


def convert_docx_to_pdf(filename: str, content_b64: str) -> str:
    """Converte un documento DOCX in PDF e lo salva nella ROOT della workspace.

    - filename: nome del file (es. relazione.docx)
    - content_b64: contenuto del DOCX codificato in base64
    """
    if not filename.lower().endswith(".docx"):
        return "Errore: supportati solo file .docx"
    if not content_b64:
        return "Errore: manca il contenuto del file"
    try:
        content = base64.b64decode(content_b64)
    except Exception:
        return "Errore: content_b64 non è base64 valido"
    try:
        root = _resolve_root()
        pdf_bytes = _docx_to_pdf_bytes(content)
        stem = filename.rsplit(".", 1)[0]
        target = _unique_pdf_path(root, f"{stem}.pdf")
        target.write_bytes(pdf_bytes)
        return f"✓ Convertito in PDF: {target.name}"
    except ValueError as e:
        return f"Errore: {e}"
    except Exception as e:
        return f"Errore durante la conversione: {e}"