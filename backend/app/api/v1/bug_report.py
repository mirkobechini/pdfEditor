from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.pdf import BugReportRequest, BugReportResponse, BugReportStatusUpdate
from app.services.bug_report_service import BugReportService

router = APIRouter(tags=["bugs"])


def get_bug_service(db: Session = Depends(get_db)) -> BugReportService:
    return BugReportService(db)


@router.post("/bugs", response_model=BugReportResponse, status_code=http_status.HTTP_201_CREATED)
def create_bug_report(
    req: BugReportRequest,
    current_user: User = Depends(get_current_user),
    service: BugReportService = Depends(get_bug_service),
) -> BugReportResponse:
    """Submit a bug report (authenticated users only)."""
    report = service.create(
        user_id=current_user.id,
        title=req.title,
        description=req.description,
        page_url=req.page_url,
        platform=req.platform,
        app_version=req.app_version,
        os_info=req.os_info,
    )
    return BugReportResponse.model_validate(report)


@router.get("/admin/bugs")
def list_bug_reports(
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: BugReportService = Depends(get_bug_service),
) -> dict:
    """List bug reports (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    reports = service.get_all(status=status_filter, skip=skip, limit=limit)
    return {
        "items": [BugReportResponse.model_validate(r) for r in reports],
        "total": len(reports),
    }


@router.put("/admin/bugs/{bug_id}/status", response_model=BugReportResponse)
def update_bug_report_status(
    bug_id: str,
    req: BugReportStatusUpdate,
    current_user: User = Depends(get_current_user),
    service: BugReportService = Depends(get_bug_service),
) -> BugReportResponse:
    """Update bug report status (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    try:
        report = service.update_status(bug_id, req.status)
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not report:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Bug report not found",
        )

    return BugReportResponse.model_validate(report)


@router.get("/bugs/my", response_model=list[BugReportResponse])
def get_my_bug_reports(
    current_user: User = Depends(get_current_user),
    service: BugReportService = Depends(get_bug_service),
) -> list[BugReportResponse]:
    """Get bug reports submitted by the current user."""
    reports = service.get_by_user_id(current_user.id)
    return [BugReportResponse.model_validate(r) for r in reports]


@router.get("/bugs/search", response_model=list[BugReportResponse])
def search_bug_reports(
    q: str = Query(..., min_length=2, description="Search query"),
    current_user: User = Depends(get_current_user),
    service: BugReportService = Depends(get_bug_service),
) -> list[BugReportResponse]:
    """Search open bug reports by title or description."""
    reports = service.search(q)
    return [BugReportResponse.model_validate(r) for r in reports]


@router.post("/bugs/{bug_id}/vote", response_model=BugReportResponse)
def vote_bug_report(
    bug_id: str,
    current_user: User = Depends(get_current_user),
    service: BugReportService = Depends(get_bug_service),
) -> BugReportResponse:
    """Increment vote count for a bug report."""
    report = service.vote(bug_id, current_user.id)
    if not report:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Bug report not found",
        )
    return BugReportResponse.model_validate(report)