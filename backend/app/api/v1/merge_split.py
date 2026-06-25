from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_pdf_service, verify_feature_access
from app.models.user import User
from app.schemas.pdf import (
    MergeRequest,
    PdfListResponse,
    PdfResponse,
    SplitRequest,
    SplitResponse,
)
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/merge", response_model=PdfResponse, status_code=status.HTTP_201_CREATED)
def merge_pdfs(
    req: MergeRequest,
    current_user: User = Depends(verify_feature_access("merge_pdf")),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Merge multiple PDFs into one document."""
    if len(req.pdf_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 PDF IDs are required to merge",
        )

    try:
        pdf = service.merge(req.pdf_ids)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)


@router.post("/{pdf_id}/split", response_model=SplitResponse)
def split_pdf(
    pdf_id: str,
    req: SplitRequest,
    current_user: User = Depends(verify_feature_access("split_pdf")),
    service: PdfService = Depends(get_pdf_service),
) -> SplitResponse:
    """Split a PDF by range or into individual pages."""
    if req.mode not in ("range", "every"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mode must be 'range' or 'every'",
        )

    if req.mode == "range":
        if not req.ranges or len(req.ranges) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ranges are required when mode is 'range'",
            )
        try:
            results = service.split_by_ranges(pdf_id, req.ranges)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
    else:
        try:
            results = service.split_every_page(pdf_id)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

    return SplitResponse(
        items=[PdfResponse.model_validate(p) for p in results]
    )