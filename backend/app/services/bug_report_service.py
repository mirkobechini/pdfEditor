from sqlalchemy.orm import Session

from app.models.bug_report import BugReport
from app.repositories.bug_report_repo import BugReportRepository


class BugReportService:
    """Business logic for bug reports."""

    VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}

    def __init__(self, db: Session):
        self.repo = BugReportRepository(db)

    def create(
        self,
        user_id: str,
        title: str,
        description: str,
        page_url: str | None = None,
        platform: str | None = None,
        app_version: str | None = None,
        os_info: str | None = None,
    ) -> BugReport:
        report = BugReport(
            user_id=user_id,
            title=title,
            description=description,
            page_url=page_url,
            platform=platform,
            app_version=app_version,
            os_info=os_info,
        )
        return self.repo.create(report)

    def get_all(self, status: str | None = None, skip: int = 0, limit: int = 100) -> list[BugReport]:
        return self.repo.get_all(status=status, skip=skip, limit=limit)

    def get_by_user_id(self, user_id: str) -> list[BugReport]:
        return self.repo.get_by_user_id(user_id)

    def search(self, query: str) -> list[BugReport]:
        """Search open bug reports by text."""
        return self.repo.search_by_text(query)

    def vote(self, report_id: str, user_id: str) -> BugReport | None:
        """Increment vote count for a bug report."""
        report = self.repo.get_by_id(report_id)
        if not report:
            return None
        return self.repo.increment_vote(report_id)

    def update_status(self, report_id: str, new_status: str) -> BugReport | None:
        if new_status not in self.VALID_STATUSES:
            raise ValueError(f"Invalid status '{new_status}'. Valid: {', '.join(sorted(self.VALID_STATUSES))}")
        return self.repo.update_status(report_id, new_status)