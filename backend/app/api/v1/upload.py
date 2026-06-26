from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_pdf_service
from app.core.config import settings
from app.schemas.pdf import PdfListResponse, PdfResponse
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

def _get_max_upload_bytes() -> int:
    """Return the maximum upload size in bytes."""
    return settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.get("", response_model=PdfListResponse)
def list_pdfs(
    skip: int = 0,
    limit: int = 100,
    service: PdfService = Depends(get_pdf_service),
) -> PdfListResponse:
    """List all uploaded PDF documents."""
    return service.get_all(skip=skip, limit=limit)


@router.post("/upload", response_model=PdfResponse, status_code=status.HTTP_201_CREATED)
def upload_pdf(
    file: UploadFile = File(...),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Upload a PDF file."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed",
        )

    # Enforce upload size limit before reading into memory
    max_bytes = _get_max_upload_bytes()
    if file.size is not None and file.size >= max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    content = file.file.read()

    # Also check after reading (covers cases where Content-Length header is missing)
    if len(content) >= max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    try:
        pdf = service.upload(filename=file.filename, content=content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)


@router.get("/{pdf_id}", response_model=PdfResponse)
def get_pdf(
    pdf_id: str,
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Get PDF metadata by ID."""
    pdf = service.get_by_id(pdf_id)
    if not pdf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found",
        )
    return PdfResponse.model_validate(pdf)


@router.get("/{pdf_id}/download")
def download_pdf(
    pdf_id: str,
    service: PdfService = Depends(get_pdf_service),
):
    """Download a PDF file by ID."""
    pdf = service.get_by_id(pdf_id)
    if not pdf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found",
        )

    content = service.get_file_content(pdf)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF file not found on disk",
        )

    return StreamingResponse(
        iter([content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{pdf.original_filename}"',
        },
    )


@router.delete("/{pdf_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pdf(
    pdf_id: str,
    service: PdfService = Depends(get_pdf_service),
):
    """Delete a PDF file by ID."""
    if not service.delete(pdf_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found",
        )