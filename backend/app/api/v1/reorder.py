from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_pdf_service, verify_feature_access
from app.models.user import User
from app.schemas.pdf import PdfResponse, ReorderRequest, RemovePagesRequest
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/{pdf_id}/reorder", response_model=PdfResponse)
def reorder_pdf_pages(
    pdf_id: str,
    req: ReorderRequest,
    current_user: User = Depends(verify_feature_access("reorder_pages")),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Reorder pages of a PDF document."""
    if len(req.page_order) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 pages are required for reordering",
        )

    try:
        pdf = service.reorder(pdf_id, current_user.id, req.page_order)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)


@router.post("/{pdf_id}/remove-pages", response_model=PdfResponse)
def remove_pdf_pages(
    pdf_id: str,
    req: RemovePagesRequest,
    current_user: User = Depends(verify_feature_access("remove_pages")),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Remove specific pages from a PDF document."""
    if len(req.page_numbers) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one page number is required",
        )

    try:
        pdf = service.remove_pages(pdf_id, current_user.id, req.page_numbers)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)