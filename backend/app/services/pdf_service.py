from sqlalchemy.orm import Session

from app.core.storage import save_pdf, validate_pdf, get_pdf_path, delete_pdf
from app.models.pdf import PdfDocument
from app.repositories.pdf_repo import PdfRepository
from app.schemas.pdf import PdfListResponse, PdfResponse


class PdfService:
    """Business logic for PDF operations."""

    def __init__(self, db: Session):
        self.repo = PdfRepository(db)

    def upload(self, filename: str, content: bytes) -> PdfDocument:
        """Validate, save to disk, and create DB record."""
        # Validate PDF
        if not validate_pdf(content):
            raise ValueError("Invalid PDF file")

        # Save to storage
        file_uuid = save_pdf(content)

        # Get page count with PyMuPDF
        import fitz

        doc = fitz.open(stream=content, filetype="pdf")
        page_count = doc.page_count
        doc.close()

        # Create DB record
        pdf = PdfDocument(
            original_filename=filename,
            storage_filename=f"{file_uuid}.pdf",
            file_size=len(content),
            page_count=page_count,
        )
        return self.repo.create(pdf)

    def get_by_id(self, pdf_id: str) -> PdfDocument | None:
        return self.repo.get_by_id(pdf_id)

    def get_all(self, skip: int = 0, limit: int = 100) -> PdfListResponse:
        items = self.repo.get_all(skip=skip, limit=limit)
        total = self.repo.count()
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

    def delete(self, pdf_id: str) -> bool:
        """Delete a PDF from DB and disk. Returns True if deleted."""
        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            return False
        self.repo.delete(pdf)
        delete_pdf(pdf.id)
        return True

    def merge(self, pdf_ids: list[str]) -> PdfDocument:
        """Merge multiple PDFs into one. Returns the new PDF document."""
        import fitz

        if len(pdf_ids) < 2:
            raise ValueError("At least 2 PDFs are required to merge")

        # Load all source PDFs and collect page counts for the record
        source_docs: list[fitz.Document] = []
        total_pages = 0
        source_names: list[str] = []

        for pid in pdf_ids:
            pdf = self.repo.get_by_id(pid)
            if not pdf:
                # Close any already-opened docs
                for d in source_docs:
                    d.close()
                raise ValueError(f"PDF {pid} not found")

            content = self.get_file_content(pdf)
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
        )
        return self.repo.create(pdf)

    def split_by_ranges(self, pdf_id: str, ranges: list[str]) -> list[PdfDocument]:
        """Split a PDF by page ranges (e.g. ['1-3', '5-7'])."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
                )
                results.append(self.repo.create(new_pdf))
        finally:
            source.close()

        return results

    def split_every_page(self, pdf_id: str) -> list[PdfDocument]:
        """Split a PDF into one file per page."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
                )
                results.append(self.repo.create(new_pdf))
        finally:
            source.close()

        return results

    def reorder(self, pdf_id: str, page_order: list[int]) -> PdfDocument:
        """Reorder pages of a PDF. page_order is 1-based."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
        )
        return self.repo.create(new_pdf)

    def remove_pages(self, pdf_id: str, page_numbers: list[int]) -> PdfDocument:
        """Remove specific pages from a PDF. page_numbers is 1-based."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
        )
        return self.repo.create(new_pdf)

    def replace_text(
        self,
        pdf_id: str,
        search: str,
        replace: str,
        occurrence: int | None = None,
    ) -> PdfDocument:
        """Find and replace text in a PDF. If occurrence is None, replaces all."""
        import fitz

        if not search.strip():
            raise ValueError("Search text cannot be empty")

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
        )
        return self.repo.create(new_pdf)

    def extract_text(self, pdf_id: str, page: int | None = None) -> tuple[str, int]:
        """Extract text from a PDF. If page is None, extracts from all pages."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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

    def get_metadata(self, pdf_id: str) -> dict:
        """Get PDF metadata."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
        self, pdf_id: str, updates: dict
    ) -> PdfDocument:
        """Update PDF metadata. Creates a new file preserving original content."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
        )
        return self.repo.create(new_pdf)

    def export_pdf(
        self, pdf_id: str, fmt: str
    ) -> tuple[bytes, str]:
        """Export a PDF to another format. Returns (content, media_type)."""
        import fitz

        pdf = self.repo.get_by_id(pdf_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")

        content = self.get_file_content(pdf)
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
                import io

                buf = io.BytesIO()
                page = source[0]  # First page only for single image export
                ext = "jpeg" if fmt in ("jpg", "jpeg") else "png"
                pix = page.get_pixmap(dpi=150)
                pix.save(buf, ext)
                result = buf.getvalue()
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

    def import_file_to_pdf(self, filename: str, content: bytes) -> PdfDocument:
        """Import a file and convert it to PDF."""
        import fitz

        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

        if ext == "txt":
            text = content.decode("utf-8", errors="replace")
            doc = fitz.open()
            page = doc.insert_page(-1, width=612, height=792)
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
        )
        return self.repo.create(pdf)