"""Tests for model __repr__ methods and model instantiation."""

import uuid
from datetime import datetime, timezone

from app.models.user import User
from app.models.pdf import PdfDocument
from app.models.bug_report import BugReport
from app.models.license import LicenseFeature


class TestUserModel:
    """Test User model __repr__."""

    def test_user_repr(self):
        """User __repr__ should show id and email."""
        user = User(
            id=str(uuid.uuid4()),
            email="test@test.com",
            hashed_password="hash",
            full_name="Test",
        )
        rep = repr(user)
        assert "User" in rep
        assert "test@test.com" in rep
        assert user.id in rep


class TestPdfDocumentModel:
    """Test PdfDocument model __repr__."""

    def test_pdf_document_repr(self):
        """PdfDocument __repr__ should show id and filename."""
        pdf = PdfDocument(
            id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            original_filename="test.pdf",
            storage_filename="uuid.pdf",
            file_size=100,
            page_count=1,
        )
        rep = repr(pdf)
        assert "PdfDocument" in rep
        assert "test.pdf" in rep
        assert pdf.id in rep


class TestBugReportModel:
    """Test BugReport model __repr__."""

    def test_bug_report_repr(self):
        """BugReport __repr__ should show id, title, and status."""
        report = BugReport(
            id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            title="Test bug",
            description="Something broke",
            status="open",
        )
        rep = repr(report)
        assert "BugReport" in rep
        assert "Test bug" in rep
        assert "open" in rep


class TestLicenseFeatureModel:
    """Test LicenseFeature model __repr__."""

    def test_license_feature_repr(self):
        """LicenseFeature __repr__ should show tier and key."""
        feature = LicenseFeature(
            id=str(uuid.uuid4()),
            tier="free",
            feature_key="export_pdf",
            enabled=True,
        )
        rep = repr(feature)
        assert "LicenseFeature" in rep
        assert "free" in rep
        assert "export_pdf" in rep