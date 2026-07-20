"""Endpoint for unlocking password-protected PDFs."""

from fastapi import APIRouter, Depends, status

from app.core.errors import error_response, ErrorCode
from app.api.deps import get_current_user, get_pdf_service
from app.models.user import User
from app.schemas.pdf import PdfResponse, UnlockRequest
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/{pdf_id}/unlock", response_model=PdfResponse)
def unlock_pdf(
    pdf_id: str,
    req: UnlockRequest,
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Unlock a password-protected PDF. If successful, returns PDF metadata."""
    if not req.password.strip():
        raise error_response(ErrorCode.VALIDATION_ERROR, "Password cannot be empty", status_code=status.HTTP_400_BAD_REQUEST)

    try:
        pdf = service.unlock(pdf_id, current_user.id, req.password)
    except ValueError as e:
        raise error_response(ErrorCode.INVALID_CREDENTIALS, str(e), status_code=status.HTTP_403_FORBIDDEN)

    return PdfResponse.model_validate(pdf)


@router.post("/{pdf_id}/protect", response_model=PdfResponse)
def protect_pdf(
    pdf_id: str,
    req: UnlockRequest,
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Protect a PDF with password encryption."""
    if not req.password.strip():
        raise error_response(ErrorCode.VALIDATION_ERROR, "Password cannot be empty", status_code=status.HTTP_400_BAD_REQUEST)

    try:
        pdf = service.protect(pdf_id, current_user.id, req.password)
    except ValueError as e:
        raise error_response(ErrorCode.VALIDATION_ERROR, str(e), status_code=status.HTTP_400_BAD_REQUEST)

    return PdfResponse.model_validate(pdf)
