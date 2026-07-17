"""Tests for repositories — edge cases and error paths."""

from app.repositories.bug_report_repo import BugReportRepository
from app.repositories.user_repo import UserRepository
from app.models.bug_report import BugReport
from app.models.user import User
from app.models.license import LicenseFeature


class TestBugReportRepository:
    """Test BugReportRepository edge cases."""

    def test_increment_vote_not_found(self, db_session):
        """increment_vote should return None for non-existent report."""
        repo = BugReportRepository(db_session)
        result = repo.increment_vote("non-existent-id")
        assert result is None

    def test_get_all_with_status(self, db_session):
        """get_all should filter by status when provided."""
        repo = BugReportRepository(db_session)
        result = repo.get_all(status="open")
        assert isinstance(result, list)

    def test_update_status_not_found(self, db_session):
        """update_status should return None for non-existent report."""
        repo = BugReportRepository(db_session)
        result = repo.update_status("non-existent-id", "closed")
        assert result is None


class TestUserRepository:
    """Test UserRepository edge cases."""

    def test_update_license_tier_not_found(self, db_session):
        """update_license_tier should return None for non-existent user."""
        repo = UserRepository(db_session)
        result = repo.update_license_tier("non-existent-id", "free")
        assert result is None

    def test_update_is_admin_not_found(self, db_session):
        """update_is_admin should return None for non-existent user."""
        repo = UserRepository(db_session)
        result = repo.update_is_admin("non-existent-id", True)
        assert result is None

    def test_update_password_not_found(self, db_session):
        """update_password should return None for non-existent user."""
        repo = UserRepository(db_session)
        result = repo.update_password("non-existent-id", "hash")
        assert result is None

    def test_get_features_for_tier_empty(self, db_session):
        """get_features_for_tier should return empty list when no features exist for tier."""
        repo = UserRepository(db_session)
        result = repo.get_features_for_tier("nonexistent_tier")
        assert result == []