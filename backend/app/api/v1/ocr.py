"""Endpoint for running OCR on scanned PDFs."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.errors import error_response, ErrorCode
from app.core.tesseract import OcrUnavailableError
from app.api.deps import check_feature_access, get_current_user, get_db, get_pdf_service
from app.models.user import User
from app.schemas.pdf import OcrRequest, OcrResponse, PdfResponse
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])


@router.post("/{pdf_id}/ocr", response_model=OcrResponse)
def ocr_pdf(
    pdf_id: str,
    req: OcrRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
) -> OcrResponse:
    """Run OCR on a scanned PDF and return a searchable PDF."""
    check_feature_access(current_user, db, "ocr")

    try:
        pdf, character_count, already_searchable = service.ocr_pdf(
            pdf_id,
            current_user.id,
            language=req.language,
        )
    except OcrUnavailableError as e:
        # tesseract binary not installed → clear 503, not a generic 400/500
        raise error_response(
            ErrorCode.OCR_UNAVAILABLE,
            str(e),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except ValueError as e:
        raise error_response(
            ErrorCode.VALIDATION_ERROR,
            str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    except EnvironmentError as e:
        # pytesseract raises TesseractNotFoundError (subclass of EnvironmentError)
        # when the `tesseract` binary is not installed on the system.
        raise error_response(
            ErrorCode.OCR_UNAVAILABLE,
            f"OCR is unavailable: {e}",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return OcrResponse(
        pdf=PdfResponse.model_validate(pdf),
        character_count=character_count,
        already_searchable=already_searchable,
    )