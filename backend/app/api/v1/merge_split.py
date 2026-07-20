from fastapi import APIRouter, Depends, status

from app.core.errors import error_response, ErrorCode
from app.api.deps import get_current_user, get_merge_split_service, verify_feature_access
from app.models.user import User
from app.schemas.pdf import (
    MergeRequest,
    PdfListResponse,
    PdfResponse,
    SplitRequest,
    SplitResponse,
)
from app.services.pdf_merge_split_service import PdfMergeSplitService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/merge", response_model=PdfResponse, status_code=status.HTTP_201_CREATED)
def merge_pdfs(
    req: MergeRequest,
    current_user: User = Depends(verify_feature_access("merge_pdf")),
    service: PdfMergeSplitService = Depends(get_merge_split_service),
) -> PdfResponse:
    """Merge multiple PDFs into one document."""
    if len(req.pdf_ids) < 2:
        raise error_response(ErrorCode.MERGE_TOO_FEW, "At least 2 PDF IDs are required to merge")

    try:
        pdf = service.merge(req.pdf_ids, current_user.id)
    except ValueError:
        raise error_response(ErrorCode.MERGE_TOO_FEW, "At least 2 PDFs are required to merge")

    return PdfResponse.model_validate(pdf)


@router.post("/{pdf_id}/split", response_model=SplitResponse)
def split_pdf(
    pdf_id: str,
    req: SplitRequest,
    current_user: User = Depends(verify_feature_access("split_pdf")),
    service: PdfMergeSplitService = Depends(get_merge_split_service),
) -> SplitResponse:
    """Split a PDF by range or into individual pages."""
    if req.mode not in ("range", "every"):
        raise error_response(ErrorCode.VALIDATION_ERROR, "Mode must be 'range' or 'every'")

    if req.mode == "range":
        if not req.ranges or len(req.ranges) == 0:
            raise error_response(ErrorCode.SPLIT_INVALID_RANGE, "Ranges are required when mode is 'range'")
        try:
            results = service.split_by_ranges(pdf_id, current_user.id, req.ranges)
        except ValueError:
            raise error_response(ErrorCode.SPLIT_INVALID_RANGE, "Invalid page range specified")
    else:
        try:
            results = service.split_every_page(pdf_id, current_user.id)
        except ValueError:
            raise error_response(ErrorCode.SPLIT_INVALID_RANGE, "Invalid page range specified")

    return SplitResponse(
        items=[PdfResponse.model_validate(p) for p in results]
    )