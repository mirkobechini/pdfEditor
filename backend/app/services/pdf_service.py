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