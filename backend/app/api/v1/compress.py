from fastapi import APIRouter, Depends, status

from app.core.errors import error_response, ErrorCode
from app.api.deps import get_current_user, get_merge_split_service
from app.models.user import User
from app.schemas.pdf import CompressRequest, PdfResponse
from app.services.pdf_merge_split_service import PdfMergeSplitService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/{pdf_id}/compress", response_model=PdfResponse)
def compress_pdf(
    pdf_id: str,
    req: CompressRequest,
    current_user: User = Depends(get_current_user),
    service: PdfMergeSplitService = Depends(get_merge_split_service),
) -> PdfResponse:
    """Compress a PDF by re-encoding images and removing redundant data.

    The user can choose the quality level (low/medium/high), the output
    filename, and whether to overwrite the original or create a new document.
    """
    try:
        pdf = service.compress(
            pdf_id,
            current_user.id,
            quality=req.quality,
            output_filename=req.output_filename,
            overwrite=req.overwrite,
        )
    except ValueError as e:
        raise error_response(
            ErrorCode.PDF_NOT_FOUND,
            str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return PdfResponse.model_validate(pdf)