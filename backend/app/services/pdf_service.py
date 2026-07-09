from sqlalchemy.orm import Session
import time

from app.core.config import settings
from app.core.storage import (
    save_pdf,
    validate_pdf,
    get_pdf_path,
    get_file_content,
    delete_pdf,
    save_snapshot,
    get_latest_snapshot,
    pop_latest_snapshot,
    clear_snapshots,
)
from app.models.pdf import PdfDocument
from app.repositories.pdf_repo import PdfRepository
from app.schemas.pdf import PdfListResponse, PdfResponse


# In-memory password cache for password-protected PDFs (never persisted to disk)
# Each entry is (password, timestamp); auto-expires after 30 minutes
_password_cache: dict[str, tuple[str, float]] = {}
_PASSWORD_CACHE_TTL = 1800  # 30 minutes in seconds


def _get_cached_password(pdf_id: str) -> str | None:
    """Return cached password if not expired, cleaning up expired entries."""
    if pdf_id in _password_cache:
        password, timestamp = _password_cache[pdf_id]
        if time.time() - timestamp < _PASSWORD_CACHE_TTL:
            return password
        del _password_cache[pdf_id]
    return None


def _cache_password(pdf_id: str, password: str) -> None:
    """Cache a password with current timestamp."""
    # Cleanup expired entries on every cache write (lazy cleanup)
    expired = [k for k, (_, ts) in _password_cache.items() if time.time() - ts >= _PASSWORD_CACHE_TTL]
    for k in expired:
        del _password_cache[k]
    _password_cache[pdf_id] = (password, time.time())


class PdfService:
    """Business logic for PDF operations."""

    def __init__(self, db: Session):
        self.repo = PdfRepository(db)

    def _get_user_pdf(self, pdf_id: str, user_id: str) -> PdfDocument:
        """Get a PDF owned by the given user, or raise ValueError."""
        pdf = self.repo.get_by_id_and_user(pdf_id, user_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")
        return pdf

    def _create_snapshot(self, pdf_id: str, user_id: str) -> None:
        """Save a snapshot of the PDF before a modification."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        content = self._read_file_with_password(pdf_id, user_id)
        if content:
            save_snapshot(pdf_id, content)

    def _read_file_with_password(self, pdf_id: str, user_id: str) -> bytes:
        """Read file content, unlocking with cached password if needed."""
        pdf = self._get_user_pdf(pdf_id, user_id)
        content = self.get_file_content(pdf)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")
        if pdf.is_password_protected and pdf_id in _password_cache:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            if doc.needs_pass:
                doc.authenticate(_get_cached_password(pdf_id))
                content = doc.tobytes()
            doc.close()
        return content

    def upload(self, filename: str, content: bytes, user_id: str) -> PdfDocument:
        """Validate, save to disk, and create DB record."""
        # Validate PDF
        if not validate_pdf(content):
            raise ValueError("Invalid PDF file")

        # Get page count and check encryption with PyMuPDF
        import fitz

        doc = fitz.open(stream=content, filetype="pdf")
        page_count = doc.page_count
        is_encrypted = bool(doc.needs_pass)
        doc.close()

        # Enforce page limit (skip for encrypted — can't verify without password)
        if not is_encrypted and page_count > settings.MAX_PAGE_COUNT:
            raise ValueError(
                f"PDF has {page_count} pages. Maximum allowed is {settings.MAX_PAGE_COUNT}"
            )

        # Save to storage
        file_uuid = save_pdf(content)

        # Create DB record
        pdf = PdfDocument(
            original_filename=filename,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(content),
            page_count=page_count if not is_encrypted else 0,
            is_password_protected=is_encrypted,
            user_id=user_id,
        )
        return self.repo.create(pdf)

    def get_by_id(self, pdf_id: str) -> PdfDocument | None:
        return self.repo.get_by_id(pdf_id)

    def get_all(self, user_id: str, skip: int = 0, limit: int = 100) -> PdfListResponse:
        items = self.repo.get_all_by_user(user_id, skip=skip, limit=limit)
        total = self.repo.count_by_user(user_id)
        return PdfListResponse(
            items=[PdfResponse.model_validate(p) for p in items],
            total=total,
        )

    def get_file_content(self, pdf: PdfDocument) -> bytes | None:
        """Read the PDF file from disk."""
        # storage_filename is "{uuid}.pdf", get_pdf_path expects the UUID
        file_uuid = pdf.storage_filename.replace(".pdf", "")
        path = get_pdf_path(file_uuid)
        return path.read_bytes() if path else None

    def delete(self, pdf_id: str, user_id: str) -> bool:
        """Delete a PDF from DB and disk. Returns True if deleted."""
        try:
            pdf = self._get_user_pdf(pdf_id, user_id)
        except ValueError:
            return False
        self.repo.delete(pdf)
        # storage_filename is "{uuid}.pdf" — extract UUID for delete_pdf
        file_uuid = pdf.storage_filename.replace(".pdf", "")
        delete_pdf(file_uuid)
        return True

    def merge(self, pdf_ids: list[str], user_id: str) -> PdfDocument:
        """Merge multiple PDFs into one. Returns the new PDF document."""
        import fitz

        if len(pdf_ids) < 2:
            raise ValueError("At least 2 PDFs are required to merge")

        # Load all source PDFs and collect page counts for the record
        source_docs: list[fitz.Document] = []
        total_pages = 0
        source_names: list[str] = []

        for pid in pdf_ids:
            pdf = self._get_user_pdf(pid, user_id)

            content = self._read_file_with_password(pid, user_id)
            if not content:
                for d in source_docs:
                    d.close()
                raise ValueError(f"PDF {pid} file not found on disk")

            doc = fitz.open(stream=content, filetype="pdf")
            source_docs.append(doc)
            total_pages += doc.page_count
            source_names.append(pdf.original_filename)

        # Create output document and insert all pages
        output = fitz.open()
        for doc in source_docs:
            output.insert_pdf(doc)

        output_bytes = output.tobytes()
        output.close()

        for d in source_docs:
            d.close()

        # Save merged file
        file_uuid = save_pdf(output_bytes)
        merge_name = f"merged_{'_'.join(n.replace('.pdf', '') for n in source_names)}.pdf"

        pdf = PdfDocument(
            original_filename=merge_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(output_bytes),
            page_count=total_pages,
            user_id=user_id,
        )
        return self.repo.create(pdf)

    def split_by_ranges(self, pdf_id: str, user_id: str, ranges: list[str]) -> list[PdfDocument]:
        """Split a PDF by page ranges (e.g. ['1-3', '5-7'])."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        results: list[PdfDocument] = []

        try:
            for r in ranges:
                parts = r.split("-")
                if len(parts) != 2:
                    raise ValueError(f"Invalid range: {r}. Use format 'start-end'")
                start = int(parts[0]) - 1  # Convert to 0-based
                end = int(parts[1])  # end is exclusive in insert_pdf

                if start < 0 or end > source.page_count or start >= end:
                    raise ValueError(
                        f"Invalid range {r}: PDF has {source.page_count} pages"
                    )

                output = fitz.open()
                output.insert_pdf(source, from_page=start, to_page=end - 1)
                out_bytes = output.tobytes()
                output.close()

                file_uuid = save_pdf(out_bytes)
                range_name = f"{pdf.original_filename.replace('.pdf', '')}_pages_{r}.pdf"

                new_pdf = PdfDocument(
                    original_filename=range_name,
                    storage_filename=f"{file_uuid}.pdf",
                    file_size=len(out_bytes),
                    page_count=end - start,
                    user_id=user_id,
                )
                results.append(self.repo.create(new_pdf))
        finally:
            source.close()

        return results

    def split_every_page(self, pdf_id: str, user_id: str) -> list[PdfDocument]:
        """Split a PDF into one file per page."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        results: list[PdfDocument] = []

        try:
            for page_num in range(source.page_count):
                output = fitz.open()
                output.insert_pdf(source, from_page=page_num, to_page=page_num)
                out_bytes = output.tobytes()
                output.close()

                file_uuid = save_pdf(out_bytes)
                page_name = f"{pdf.original_filename.replace('.pdf', '')}_page_{page_num + 1}.pdf"

                new_pdf = PdfDocument(
                    original_filename=page_name,
                    storage_filename=f"{file_uuid}.pdf",
                    file_size=len(out_bytes),
                    page_count=1,
                    user_id=user_id,
                )
                results.append(self.repo.create(new_pdf))
        finally:
            source.close()

        return results

    def reorder(self, pdf_id: str, user_id: str, page_order: list[int]) -> PdfDocument:
        """Reorder pages of a PDF. page_order is 1-based."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        if len(page_order) != source.page_count:
            source.close()
            raise ValueError(
                f"page_order must contain exactly {source.page_count} pages, "
                f"got {len(page_order)}"
            )

        # Convert 1-based to 0-based
        zero_based = [p - 1 for p in page_order]

        # Validate all indices are valid
        for idx in zero_based:
            if idx < 0 or idx >= source.page_count:
                source.close()
                raise ValueError(f"Page number {idx + 1} is out of range")

        # select() reorders/selects pages from the document
        source.select(zero_based)
        out_bytes = source.tobytes()
        source.close()

        file_uuid = save_pdf(out_bytes)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_reordered.pdf"

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(out_bytes),
            page_count=len(page_order),
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def remove_pages(self, pdf_id: str, user_id: str, page_numbers: list[int]) -> PdfDocument:
        """Remove specific pages from a PDF. page_numbers is 1-based."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")

        # Validate page numbers
        for p in page_numbers:
            if p < 1 or p > source.page_count:
                source.close()
                raise ValueError(
                    f"Page {p} is out of range. PDF has {source.page_count} pages"
                )

        # Convert to 0-based and build list of pages to KEEP
        remove_set = set(p - 1 for p in page_numbers)
        keep_pages = [i for i in range(source.page_count) if i not in remove_set]

        if len(keep_pages) == 0:
            source.close()
            raise ValueError("Cannot remove all pages")

        source.select(keep_pages)
        out_bytes = source.tobytes()
        source.close()

        file_uuid = save_pdf(out_bytes)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_pages_removed.pdf"

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(out_bytes),
            page_count=len(keep_pages),
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def replace_text(
        self,
        pdf_id: str,
        user_id: str,
        search: str,
        replace: str,
        occurrence: int | None = None,
    ) -> PdfDocument:
        """Find and replace text in a PDF. If occurrence is None, replaces all."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        if not search.strip():
            raise ValueError("Search text cannot be empty")

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        total_replacements = 0

        try:
            for page_num in range(source.page_count):
                page = source[page_num]
                rects = page.search_for(search)

                if not rects:
                    continue

                for rect in rects:
                    if occurrence is not None and total_replacements >= occurrence:
                        break

                    # Redact the found text area
                    page.add_redact_annot(rect, fill=None)
                    page.apply_redactions()
                    # Insert replacement text
                    fontsize = rect.y1 - rect.y0 - 2
                    if fontsize < 6:
                        fontsize = 10
                    page.insert_text(
                        (rect.x0, rect.y0 + 1),
                        replace,
                        fontname="helv",
                        fontsize=fontsize,
                    )
                    total_replacements += 1

                if occurrence is not None and total_replacements >= occurrence:
                    break

            out_bytes = source.tobytes()
        finally:
            source.close()

        file_uuid = save_pdf(out_bytes)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_text_replaced.pdf"

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(out_bytes),
            page_count=pdf.page_count,
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def extract_text(self, pdf_id: str, user_id: str, page: int | None = None) -> tuple[str, int]:
        """Extract text from a PDF. If page is None, extracts from all pages."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")

        try:
            if page is not None:
                if page < 1 or page > source.page_count:
                    raise ValueError(
                        f"Page {page} is out of range. PDF has {source.page_count} pages"
                    )
                text = source[page - 1].get_text()
            else:
                text_parts = []
                for page_num in range(source.page_count):
                    text_parts.append(source[page_num].get_text())
                text = "\n---\n".join(text_parts)

            return text, source.page_count
        finally:
            source.close()

    def get_metadata(self, pdf_id: str, user_id: str) -> dict:
        """Get PDF metadata."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        try:
            meta = source.metadata
            return {
                "title": meta.get("title"),
                "author": meta.get("author"),
                "subject": meta.get("subject"),
                "keywords": meta.get("keywords"),
            }
        finally:
            source.close()

    def update_metadata(
        self, pdf_id: str, user_id: str, updates: dict
    ) -> PdfDocument:
        """Update PDF metadata. Creates a new file preserving original content."""
        self._create_snapshot(pdf_id, user_id)
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")
        try:
            new_meta = dict(source.metadata)
            # Update only provided fields
            for key in ("title", "author", "subject", "keywords"):
                if key in updates and updates[key] is not None:
                    new_meta[key] = updates[key]

            source.set_metadata(new_meta)
            out_bytes = source.tobytes()
        finally:
            source.close()

        file_uuid = save_pdf(out_bytes)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_metadata_updated.pdf"

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(out_bytes),
            page_count=pdf.page_count,
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def export_pdf(
        self, pdf_id: str, user_id: str, fmt: str
    ) -> tuple[bytes, str]:
        """Export a PDF to another format. Returns (content, media_type)."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        source = fitz.open(stream=content, filetype="pdf")

        try:
            if fmt == "txt":
                text_parts = []
                for page_num in range(source.page_count):
                    text_parts.append(source[page_num].get_text())
                result = "\n---\n".join(text_parts).encode("utf-8")
                media_type = "text/plain"
                filename = f"{pdf.original_filename.replace('.pdf', '')}.txt"

            elif fmt in ("png", "jpg", "jpeg"):
                ext = "jpeg" if fmt in ("jpg", "jpeg") else "png"
                page = source[0]  # First page only for single image export
                pix = page.get_pixmap(dpi=150)
                result = pix.tobytes(ext)
                media_type = f"image/{ext}"
                filename = f"{pdf.original_filename.replace('.pdf', '')}.{ext}"

            elif fmt == "svg":
                page = source[0]
                svg = page.get_svg_image()
                result = svg.encode("utf-8")
                media_type = "image/svg+xml"
                filename = f"{pdf.original_filename.replace('.pdf', '')}.svg"

            else:
                raise ValueError(f"Unsupported format: {fmt}")

            return result, media_type, filename
        finally:
            source.close()

    def import_file_to_pdf(self, filename: str, content: bytes, user_id: str) -> PdfDocument:
        """Import a file and convert it to PDF."""
        import fitz

        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        if ext == "txt":
            text = content.decode("utf-8", errors="replace")
            doc = fitz.open()
            page_idx = doc.insert_page(-1, width=612, height=792)
            page = doc[page_idx]
            page.insert_text((50, 100), text, fontname="helv", fontsize=11)
            pdf_bytes = doc.tobytes()
            doc.close()

        elif ext in ("png", "jpg", "jpeg", "gif", "bmp"):
            doc = fitz.open(stream=content, filetype=ext)
            pdf_bytes = doc.tobytes()
            doc.close()

        else:
            raise ValueError(f"Unsupported import format: {ext}")

        # Validate and save
        if not validate_pdf(pdf_bytes):
            raise ValueError("Conversion produced an invalid PDF")

        file_uuid = save_pdf(pdf_bytes)
        doc_fitz = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = doc_fitz.page_count
        doc_fitz.close()

        pdf = PdfDocument(
            original_filename=filename,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(pdf_bytes),
            page_count=page_count,
            user_id=user_id,
        )
        return self.repo.create(pdf)

    def unlock(self, pdf_id: str, user_id: str, password: str) -> PdfDocument:
        """Try to unlock a password-protected PDF. Returns the PDF if successful."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)

        if not pdf.is_password_protected:
            return pdf  # Not encrypted, nothing to do

        content = self.get_file_content(pdf)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        doc = fitz.open(stream=content, filetype="pdf")
        try:
            if not doc.needs_pass:
                # File was flagged but isn't actually encrypted anymore
                pdf.is_password_protected = False
                self.repo.db.flush()
                return pdf

            auth = doc.authenticate(password)
            if auth == 0:
                raise ValueError("Incorrect password")
        finally:
            doc.close()

        # Cache the password in memory
        _cache_password(pdf_id, password)
        return pdf

    def undo(self, pdf_id: str, user_id: str) -> PdfDocument:
        """Undo the last modification: restore the most recent snapshot."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        content = get_latest_snapshot(pdf_id)
        if not content:
            raise ValueError("Nothing to undo")

        # Save current state as redo candidate, then restore snapshot
        save_snapshot(f"{pdf_id}_redo", self._read_file_with_password(pdf_id, user_id))
        pop_latest_snapshot(pdf_id)  # remove the snapshot we just read

        file_uuid = save_pdf(content)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_restored.pdf"

        # Count actual pages with fitz instead of using len(content) (bytes)
        page_count = fitz.open(stream=content, filetype="pdf").page_count

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(content),
            page_count=page_count,
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def redo(self, pdf_id: str, user_id: str) -> PdfDocument:
        """Redo the last undone operation: restore from redo stack."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        content = get_latest_snapshot(f"{pdf_id}_redo")
        if not content:
            raise ValueError("Nothing to redo")

        pop_latest_snapshot(f"{pdf_id}_redo")

        file_uuid = save_pdf(content)
        new_name = f"{pdf.original_filename.replace('.pdf', '')}_restored.pdf"

        # Count actual pages with fitz instead of using len(content) (bytes)
        page_count = fitz.open(stream=content, filetype="pdf").page_count

        new_pdf = PdfDocument(
            original_filename=new_name,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(content),
            page_count=page_count,
            user_id=user_id,
        )
        return self.repo.create(new_pdf)

    def protect(self, pdf_id: str, user_id: str, password: str) -> PdfDocument:
        """Protect a PDF with a password (encryption)."""
        import fitz

        pdf = self._get_user_pdf(pdf_id, user_id)
        self._create_snapshot(pdf_id, user_id)

        content = self._read_file_with_password(pdf_id, user_id)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")

        doc = fitz.open(stream=content, filetype="pdf")
        try:
            # Encrypt with AES-256
            output_bytes = doc.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, user_pw=password)
        finally:
            doc.close()

        file_uuid = save_pdf(output_bytes)

        # Update the existing PDF record with encrypted content
        pdf.storage_filename = f"{file_uuid}.pdf"
        pdf.file_size = len(output_bytes)
        pdf.is_password_protected = True

        # Cache the password in memory
        _cache_password(pdf_id, password)

        return self.repo.update(pdf)