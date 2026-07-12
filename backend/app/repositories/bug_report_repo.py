from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.bug_report import BugReport


class BugReportRepository:
    """Repository for BugReport database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, report: BugReport) -> BugReport:
        self.db.add(report)
        self.db.flush()
        self.db.refresh(report)
        return report

    def get_by_id(self, report_id: str) -> BugReport | None:
        return self.db.query(BugReport).filter(BugReport.id == report_id).first()

    def get_by_user_id(self, user_id: str) -> list[BugReport]:
        return (
            self.db.query(BugReport)
            .filter(BugReport.user_id == user_id)
            .order_by(BugReport.created_at.desc())
            .all()
        )

    def search_by_text(self, query: str) -> list[BugReport]:
        """Search open bug reports by title or description."""
        return (
            self.db.query(BugReport)
            .filter(
                BugReport.status.in_(["open", "in_progress"]),
                or_(
                    BugReport.title.ilike(f"%{query}%"),
                    BugReport.description.ilike(f"%{query}%"),
                ),
            )
            .order_by(BugReport.report_count.desc(), BugReport.created_at.desc())
            .limit(10)
            .all()
        )

    def increment_vote(self, report_id: str) -> BugReport | None:
        """Increment report_count for a bug report."""
        report = self.get_by_id(report_id)
        if not report:
            return None
        report.report_count = (report.report_count or 1) + 1
        self.db.flush()
        self.db.refresh(report)
        return report

    def get_all(
        self, status: str | None = None, skip: int = 0, limit: int = 100
    ) -> list[BugReport]:
        query = self.db.query(BugReport).order_by(BugReport.created_at.desc())
        if status:
            query = query.filter(BugReport.status == status)
        return query.offset(skip).limit(limit).all()

    def update_status(self, report_id: str, new_status: str) -> BugReport | None:
        report = self.get_by_id(report_id)
        if not report:
            return None
        report.status = new_status
        self.db.flush()
        self.db.refresh(report)
        return report