"""Endpoint for unlocking password-protected PDFs."""

from fastapi import APIRouter, Depends, HTTPException, status

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be empty",
        )

    try:
        pdf = service.unlock(pdf_id, current_user.id, req.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)
