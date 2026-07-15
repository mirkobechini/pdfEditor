"""Merge and split PDF operations — extracted from pdf_service.py."""

import fitz
from sqlalchemy.orm import Session

from app.core.storage import save_pdf, get_pdf_path
from app.models.pdf import PdfDocument
from app.repositories.pdf_repo import PdfRepository


class PdfMergeSplitService:
    """Business logic for merging and splitting PDFs."""

    def __init__(self, db: Session):
        self.repo = PdfRepository(db)

    def _get_user_pdf(self, pdf_id: str, user_id: str) -> PdfDocument:
        pdf = self.repo.get_by_id_and_user(pdf_id, user_id)
        if not pdf:
            raise ValueError(f"PDF {pdf_id} not found")
        return pdf

    def _get_file_content(self, pdf: PdfDocument) -> bytes | None:
        file_uuid = pdf.storage_filename.replace(".pdf", "")
        path = get_pdf_path(file_uuid)
        return path.read_bytes() if path else None

    def merge(self, pdf_ids: list[str], user_id: str) -> PdfDocument:
        """Merge multiple PDFs into one."""
        if len(pdf_ids) < 2:
            raise ValueError("At least 2 PDFs are required to merge")

        source_docs: list[fitz.Document] = []
        total_pages = 0
        source_names: list[str] = []

        try:
            for pid in pdf_ids:
                pdf = self._get_user_pdf(pid, user_id)
                content = self._get_file_content(pdf)
                if not content:
                    raise ValueError(f"PDF {pid} file not found on disk")
                doc = fitz.open(stream=content, filetype="pdf")
                source_docs.append(doc)
                total_pages += doc.page_count
                source_names.append(pdf.original_filename)

            output = fitz.open()
            for doc in source_docs:
                output.insert_pdf(doc)
            output_bytes = output.tobytes()
            output.close()
        finally:
            for d in source_docs:
                d.close()

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
        """Split a PDF by page ranges."""
        pdf = self._get_user_pdf(pdf_id, user_id)
        content = self._get_file_content(pdf)
        if not content:
            raise ValueError(f"PDF {pdf_id} file not found on disk")
        source = fitz.open(stream=content, filetype="pdf")
        results: list[PdfDocument] = []
        try:
            for r in ranges:
                parts = r.split("-")
                if len(parts) != 2:
                    raise ValueError(f"Invalid range: {r}. Use format 'start-end'")
                start = int(parts[0]) - 1
                end = int(parts[1])
                if start < 0 or end > source.page_count or start >= end:
                    raise ValueError(f"Invalid range {r}: PDF has {source.page_count} pages")
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
        pdf = self._get_user_pdf(pdf_id, user_id)
        content = self._get_file_content(pdf)
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