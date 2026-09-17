"""Endpoint for signing PDFs with a signature image."""

import base64

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.errors import error_response, ErrorCode
from app.api.deps import check_feature_access, get_current_user, get_db, get_pdf_service
from app.models.user import User
from app.schemas.pdf import PdfResponse, SignRequest
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/{pdf_id}/sign", response_model=PdfResponse)
def sign_pdf(
    pdf_id: str,
    req: SignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Sign a PDF by inserting a signature image onto a page."""
    check_feature_access(current_user, db, "sign_pdf")

    if req.page_number < 1:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            "Page number must be >= 1",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if req.width <= 0 or req.height <= 0:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            "Width and height must be positive",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        signature_image = base64.b64decode(req.signature_image_b64)
    except Exception:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            "Invalid base64 signature image",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if not signature_image:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            "Signature image cannot be empty",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        pdf = service.sign_pdf(
            pdf_id,
            current_user.id,
            signature_image,
            req.page_number,
            req.x,
            req.y,
            req.width,
            req.height,
        )
    except ValueError as e:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return PdfResponse.model_validate(pdf)