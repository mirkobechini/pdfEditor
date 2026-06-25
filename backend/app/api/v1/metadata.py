from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_pdf_service, verify_feature_access
from app.models.user import User
from app.schemas.pdf import MetadataResponse, PdfResponse, UpdateMetadataRequest
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.get("/{pdf_id}/metadata", response_model=MetadataResponse)
def get_pdf_metadata(
    pdf_id: str,
    service: PdfService = Depends(get_pdf_service),
) -> MetadataResponse:
    """Get PDF metadata (title, author, subject, keywords)."""
    try:
        meta = service.get_metadata(pdf_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return MetadataResponse(**meta)


@router.put("/{pdf_id}/metadata", response_model=PdfResponse)
def update_pdf_metadata(
    pdf_id: str,
    req: UpdateMetadataRequest,
    current_user: User = Depends(verify_feature_access("edit_metadata")),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Update PDF metadata. Only provided fields are changed."""
    updates = req.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one metadata field must be provided",
        )

    try:
        pdf = service.update_metadata(pdf_id, updates)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)