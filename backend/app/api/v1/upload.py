from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user, get_pdf_service
from app.core.errors import error_response, ErrorCode
from app.core.config import settings
from app.core.errors import error_response, ErrorCode
from app.core.sanitize import sanitize_filename
from app.models.user import User
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
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
) -> PdfListResponse:
    """List all PDF documents owned by the current user."""
    return service.get_all(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@router.post("/upload", response_model=PdfResponse, status_code=status.HTTP_201_CREATED)
def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Upload a PDF file."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise error_response(ErrorCode.INVALID_FILE_TYPE, "Only PDF files are allowed")

    # Enforce upload size limit before reading into memory
    max_bytes = _get_max_upload_bytes()
    if file.size is not None and file.size >= max_bytes:
        raise error_response(ErrorCode.UPLOAD_TOO_LARGE, f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB", status_code=413)

    # Read file in chunks to avoid loading the entire file into RAM
    # (e.g. a 50MB file would allocate 50MB even if later rejected)
    content = bytearray()
    chunk_size = 1024 * 1024  # 1MB chunks
    while True:
        chunk = file.file.read(chunk_size)
        if not chunk:
            break
        content.extend(chunk)
        if len(content) >= max_bytes:
            raise error_response(ErrorCode.UPLOAD_TOO_LARGE, f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB", status_code=413)

    try:
        pdf = service.upload(
            filename=file.filename,
            content=content,
            user_id=current_user.id,
        )
    except ValueError:
        raise error_response(ErrorCode.INVALID_PDF, "Invalid PDF file")

    return PdfResponse.model_validate(pdf)


@router.get("/{pdf_id}", response_model=PdfResponse)
def get_pdf(
    pdf_id: str,
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Get PDF metadata by ID (must be owned by current user)."""
    pdf = service.get_by_id(pdf_id)
    if not pdf or pdf.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found",
        )
    return PdfResponse.model_validate(pdf)


@router.get("/{pdf_id}/download")
def download_pdf(
    pdf_id: str,
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
):
    """Download a PDF file by ID (must be owned by current user)."""
    pdf = service.get_by_id(pdf_id)
    if not pdf or pdf.user_id != current_user.id:
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
            "Content-Disposition": f'attachment; filename="{sanitize_filename(pdf.original_filename)}"',
        },
    )


@router.delete("/{pdf_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pdf(
    pdf_id: str,
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
):
    """Delete a PDF file by ID (must be owned by current user)."""
    if not service.delete(pdf_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF not found",
        )