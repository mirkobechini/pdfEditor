"""Tests for edge cases across multiple modules."""

import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi import status
from sqlalchemy import create_engine, inspect

from app.core.config import settings
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.main import app as fastapi_app

class TestPdfMergeSplitEdgeCases:
    """Test pdf_merge_split_service.py edge cases."""

    def test_merge_requires_at_least_two(self, db_session):
        """merge should raise if less than 2 PDFs."""
        from app.services.pdf_merge_split_service import PdfMergeSplitService
        service = PdfMergeSplitService(db_session)
        with pytest.raises(ValueError, match="At least 2 PDFs"):
            service.merge(["single-id"], "user-id")

    def test_split_invalid_range_format(self, client, pro_headers, sample_pdf_content):
        """split_by_ranges should raise for invalid range format."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{pdf_id}/split",
            headers=pro_headers,
            json={"mode": "range", "ranges": ["invalid"]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_split_range_out_of_bounds(self, client, pro_headers, sample_pdf_content):
        """split_by_ranges should raise for out of bounds range."""
        from tests.conftest import upload_pdf
        pdf_id = upload_pdf(client, pro_headers, sample_pdf_content)

        response = client.post(
            f"/pdfs/{pdf_id}/split",
            headers=pro_headers,
            json={"mode": "range", "ranges": ["1-999"]},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

