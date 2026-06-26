from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_pdf_service, verify_feature_access
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.pdf import PdfResponse
from app.services.pdf_service import PdfService

router = APIRouter(prefix="/pdfs", tags=["pdfs"])

# Supported export/import formats
EXPORT_FORMATS = {"txt", "png", "jpg", "jpeg", "svg"}
IMPORT_EXTENSIONS = {"txt", "png", "jpg", "jpeg", "gif", "bmp"}

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


def _check_license_for_format(
    current_user: User,
    db: Session,
    fmt_key: str,
    feature_map: dict[str, str],
):
    """Verify that the current user's license covers a specific format."""
    if current_user.is_admin:
        return
    feature_key = feature_map.get(fmt_key)
    if not feature_key:
        return
    repo = UserRepository(db)
    features = repo.get_features_for_tier(current_user.license_tier)
    enabled_keys = {f.feature_key for f in features if f.enabled}
    if feature_key not in enabled_keys:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"License tier '{current_user.license_tier}' does not "
                f"include '{feature_key}'. Upgrade to access this feature."
            ),
        )


@router.post("/{pdf_id}/export")
def export_pdf(
    pdf_id: str,
    fmt: str = Query(..., description="Export format: txt, png, jpg, svg"),
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
    db: Session = Depends(get_db),
):
    """Export a PDF to another format."""
    fmt = fmt.lower()
    if fmt not in EXPORT_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported format '{fmt}'. Supported: {', '.join(sorted(EXPORT_FORMATS))}",
        )

    _check_license_for_format(current_user, db, fmt, EXPORT_FEATURE_MAP)

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
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", response_model=PdfResponse, status_code=status.HTTP_201_CREATED)
def import_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: PdfService = Depends(get_pdf_service),
    db: Session = Depends(get_db),
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

    _check_license_for_format(current_user, db, ext, IMPORT_FEATURE_MAP)

    content = file.file.read()

    try:
        pdf = service.import_file_to_pdf(file.filename, content, current_user.id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PdfResponse.model_validate(pdf)