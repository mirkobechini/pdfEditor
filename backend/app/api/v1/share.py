"""Endpoints for sharing PDFs via public links."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import error_response, ErrorCode
from app.core.limiter import limiter
from app.api.deps import get_current_user, get_db, get_pdf_service
from app.core.security import get_password_hash, verify_password
from app.models.share_link import ShareLink
from app.models.user import User
from app.schemas.share import (
    ShareAccessRequest,
    ShareInfoResponse,
    ShareLinkCreate,
    ShareLinkResponse,
)
from app.services.pdf_service import PdfService

router = APIRouter(tags=["share"])


def _sanitize_filename(name: str) -> str:
    return "".join(c for c in name if c.isalnum() or c in "._- ").strip() or "document.pdf"


@router.post("/pdfs/{pdf_id}/share", response_model=ShareLinkResponse)
def create_share_link(
    pdf_id: str,
    req: ShareLinkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
) -> ShareLinkResponse:
    """Create a shareable link for a PDF owned by the current user."""
    pdf = service.get_by_id(pdf_id)
    if not pdf or pdf.user_id != current_user.id:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "PDF not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    token = str(uuid.uuid4()).replace("-", "")
    expires_at = None
    if req.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=req.expires_in_days)

    link = ShareLink(
        pdf_id=pdf.id,
        token=token,
        password_hash=get_password_hash(req.password) if req.password else None,
        expires_at=expires_at,
        created_by=current_user.id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    url = f"{settings.FRONTEND_URL}/share/{token}"
    return ShareLinkResponse(
        id=link.id,
        pdf_id=link.pdf_id,
        token=link.token,
        url=url,
        has_password=bool(link.password_hash),
        expires_at=link.expires_at,
        created_at=link.created_at,
    )


@router.get("/share/{token}", response_model=ShareInfoResponse)
def get_share_info(
    token: str,
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
) -> ShareInfoResponse:
    """Public info about a shared PDF (no auth required)."""
    link = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not link:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "Share link not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise error_response(
            ErrorCode.NOT_FOUND,
            "Share link has expired",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    pdf = service.get_by_id(link.pdf_id)
    if not pdf:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "PDF not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return ShareInfoResponse(
        token=link.token,
        filename=pdf.original_filename,
        has_password=bool(link.password_hash),
        expires_at=link.expires_at,
    )


@router.post("/share/{token}/download")
@limiter.limit("10/minute")
def download_shared_pdf(
    request: Request,
    token: str,
    req: ShareAccessRequest,
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
):
    """Public download of a shared PDF (password required if set).

    Rate-limited per IP: this is a public, unauthenticated endpoint, and a
    password-protected link's password is otherwise guessable by brute force.
    """
    link = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not link:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "Share link not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise error_response(
            ErrorCode.NOT_FOUND,
            "Share link has expired",
            status_code=status.HTTP_404_NOT_FOUND,
        )
    if link.password_hash:
        if not req.password or not verify_password(req.password, link.password_hash):
            raise error_response(
                ErrorCode.INVALID_CREDENTIALS,
                "Invalid password",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

    pdf = service.get_by_id(link.pdf_id)
    if not pdf:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "PDF not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    content = service.get_file_content(pdf)
    if not content:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "PDF file not found on disk",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return StreamingResponse(
        iter([content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{_sanitize_filename(pdf.original_filename)}"',
        },
    )


@router.delete("/pdfs/{pdf_id}/share/{token}")
def revoke_share_link(
    pdf_id: str,
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
):
    """Revoke a share link (owner only)."""
    pdf = service.get_by_id(pdf_id)
    if not pdf or pdf.user_id != current_user.id:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "PDF not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    link = db.query(ShareLink).filter(
        ShareLink.token == token, ShareLink.pdf_id == pdf_id
    ).first()
    if not link:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "Share link not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    db.delete(link)
    db.commit()
    return {"ok": True}


@router.get("/pdfs/{pdf_id}/shares", response_model=list[ShareLinkResponse])
def list_share_links(
    pdf_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service: PdfService = Depends(get_pdf_service),
) -> list[ShareLinkResponse]:
    """List all share links for a PDF (owner only)."""
    pdf = service.get_by_id(pdf_id)
    if not pdf or pdf.user_id != current_user.id:
        raise error_response(
            ErrorCode.NOT_FOUND,
            "PDF not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    links = db.query(ShareLink).filter(ShareLink.pdf_id == pdf_id).all()
    return [
        ShareLinkResponse(
            id=l.id,
            pdf_id=l.pdf_id,
            token=l.token,
            url=f"{settings.FRONTEND_URL}/share/{l.token}",
            has_password=bool(l.password_hash),
            expires_at=l.expires_at,
            created_at=l.created_at,
        )
        for l in links
    ]