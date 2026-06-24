from sqlalchemy.orm import Session

from app.models.bug_report import BugReport
from app.repositories.user_repo import UserRepository


class BugReportService:
    """Business logic for bug reports."""

    VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}

    def __init__(self, db: Session):
        self.db = db

    def create(
        self, user_id: str, title: str, description: str, page_url: str | None = None
    ) -> BugReport:
        report = BugReport(
            user_id=user_id,
            title=title,
            description=description,
            page_url=page_url,
        )
        self.db.add(report)
        self.db.flush()
        self.db.refresh(report)
        return report

    def get_all(self, status: str | None = None, skip: int = 0, limit: int = 100) -> list[BugReport]:
        query = self.db.query(BugReport).order_by(BugReport.created_at.desc())
        if status and status in self.VALID_STATUSES:
            query = query.filter(BugReport.status == status)
        return query.offset(skip).limit(limit).all()

    def update_status(self, report_id: str, new_status: str) -> BugReport | None:
        if new_status not in self.VALID_STATUSES:
            raise ValueError(f"Invalid status '{new_status}'. Valid: {', '.join(sorted(self.VALID_STATUSES))}")
        report = self.db.query(BugReport).filter(BugReport.id == report_id).first()
        if not report:
            return None
        report.status = new_status
        self.db.flush()
        self.db.refresh(report)
        return report