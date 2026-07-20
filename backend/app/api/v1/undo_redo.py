"""API endpoints for undo/redo operations on PDFs."""

from fastapi import APIRouter, Depends, status

from app.core.errors import error_response, ErrorCode
from app.api.deps import get_current_user, get_pdf_service
from app.models.user import User
from app.schemas.pdf import PdfResponse
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/{pdf_id}/undo", response_model=PdfResponse)
def undo_pdf(
    pdf_id: str,
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Undo the last modification on a PDF."""
    try:
        pdf = service.undo(pdf_id, current_user.id)
    except ValueError as e:
        raise error_response(ErrorCode.VALIDATION_ERROR, str(e), status_code=status.HTTP_400_BAD_REQUEST)
    return PdfResponse.model_validate(pdf)


@router.post("/{pdf_id}/redo", response_model=PdfResponse)
def redo_pdf(
    pdf_id: str,
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Redo the last undone operation on a PDF."""
    try:
        pdf = service.redo(pdf_id, current_user.id)
    except ValueError as e:
        raise error_response(ErrorCode.VALIDATION_ERROR, str(e), status_code=status.HTTP_400_BAD_REQUEST)
    return PdfResponse.model_validate(pdf)