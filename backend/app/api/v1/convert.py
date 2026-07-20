from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import check_feature_access, get_current_user, get_db, get_pdf_service
from app.core.errors import error_response, ErrorCode
from app.core.config import settings
from app.core.sanitize import sanitize_filename
from app.models.user import User
from app.schemas.pdf import PdfResponse
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

# Supported export/import formats
EXPORT_FORMATS = {"txt", "png", "jpg", "jpeg", "svg"}
IMPORT_EXTENSIONS = {"txt", "png", "jpg", "jpeg", "gif", "bmp"}

# MIME type validation map for import
IMPORT_MIME_MAP: dict[str, set[str]] = {
    "txt": {"text/plain", "text/plain; charset=utf-8"},
    "png": {"image/png"},
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "gif": {"image/gif"},
    "bmp": {"image/bmp", "image/x-ms-bmp"},
}

EXPORT_FEATURE_MAP = {
    "txt": "export_txt",
    "png": "export_png",
    "jpg": "export_jpg",
    "jpeg": "export_jpg",
    "svg": "export_svg",
}

IMPORT_FEATURE_MAP = {
    "txt": "import_txt",
    "png": "import_images",
    "jpg": "import_images",
    "jpeg": "import_images",
    "gif": "import_images",
    "bmp": "import_images",
}


@router.post("/{pdf_id}/export")
def export_pdf(
    pdf_id: str,
    fmt: str = Query(..., description="Export format: txt, png, jpg, svg"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
):
    """Export a PDF to another format."""
    fmt = fmt.lower()
    if fmt not in EXPORT_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{fmt}'. Supported: {', '.join(sorted(EXPORT_FORMATS))}",
        )

    feature_key = EXPORT_FEATURE_MAP.get(fmt)
    if feature_key:
        check_feature_access(current_user, db, feature_key)

    try:
        result, media_type, filename = service.export_pdf(pdf_id, current_user.id, fmt)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return Response(
        content=result,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{sanitize_filename(filename)}"'},
    )


@router.post("/import", response_model=PdfResponse, status_code=status.HTTP_201_CREATED)
def import_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
) -> PdfResponse:
    """Import a file and convert it to PDF."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in IMPORT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(IMPORT_EXTENSIONS))}",
        )

    feature_key = IMPORT_FEATURE_MAP.get(ext)
    if feature_key:
        check_feature_access(current_user, db, feature_key)

    # Validate MIME type
    if ext in IMPORT_MIME_MAP and file.content_type:
        allowed_mimes = IMPORT_MIME_MAP[ext]
        if file.content_type not in allowed_mimes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid content type '{file.content_type}' for '.{ext}' files. Expected one of: {', '.join(allowed_mimes)}",
            )

    # Validate file size before reading
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = file.file.read(max_bytes + 1)
    if len(content) >= max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    try:
        pdf = service.import_file_to_pdf(file.filename, content, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)