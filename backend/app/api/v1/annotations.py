"""Endpoint for adding annotations to PDFs."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.errors import error_response, ErrorCode
from app.api.deps import check_feature_access, get_current_user, get_db, get_pdf_service
from app.models.user import User
from app.schemas.pdf import AnnotationRequest, PdfResponse
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/{pdf_id}/annotations", response_model=PdfResponse)
def add_annotation(
    pdf_id: str,
    req: AnnotationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Add an annotation to a PDF page (embedded in the PDF)."""
    check_feature_access(current_user, db, "annotations")

    if req.page < 1:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            "Page number must be >= 1",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if len(req.rect) != 4:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            "rect must have exactly 4 values [x0, y0, x1, y1]",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        pdf = service.add_annotation(
            pdf_id,
            current_user.id,
            req.page,
            req.type,
            tuple(req.rect),
            color=req.color,
            content=req.content,
            points=[(p[0], p[1]) for p in req.points] if req.points else None,
            opacity=req.opacity,
        )
    except ValueError as e:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return PdfResponse.model_validate(pdf)